const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { faker } = require('@faker-js/faker');

const app = express();
const PORT = 3001;
const BASE_DIR = path.join(__dirname, '..');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

app.use(cors());
app.use(express.json({ limit: '500mb' }));

const POLICIES_DIR = path.join(__dirname, '../policies');
fs.mkdir(POLICIES_DIR, { recursive: true });

const OPA_BASE = 'http://localhost:8181';

app.listen(PORT, () => {
	console.log(`Server läuft auf http://localhost:${PORT}`);
});
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});
app.get('/docker/stats', async (req, res) => {
	try {
		const { stdout } = await execPromise(
			`docker stats --no-stream --format "{{.Container}},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}"`
		);
		const lines = stdout.trim().split('\n');
		const stats = lines.map((line) => {
			const [containerId, name, cpu, memUsage, memPerc, netIO, blockIO] = line.split(',');
			return {
				id: containerId,
				name: name || containerId,
				cpu,
				memUsage,
				memPerc,
				netIO,
				blockIO,
			};
		});
		res.json({ success: true, stats });
	} catch (error) {
		console.error('❌ get Docker stats failed:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
});
app.post('/generate', async (req, res) => {
	try {
		const { teamCount = 5, members = 10, taskCount = 5 } = req.body;
		const generated = generateTestData(teamCount, members, taskCount);
		res.json({ success: true, data: generated });
	} catch (error) {
		console.error('❌ Generate Data failed:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
});
app.post('/data/save', async (req, res) => {
	try {
		const filePath = path.join(BASE_DIR, 'generated', 'data.json');
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		const jsonString = JSON.stringify(req.body.data, null, 2);
		await fs.writeFile(filePath, jsonString);
		const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
		const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

		res.json({
			success: true,
			message: 'Succsfully saved',
			path: filePath,
			size: sizeInMB,
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});
app.post('/opa/load-data', async (req, res) => {
	try {
		const { data } = req.body;
		const jsonData = JSON.stringify(data);
		const tempFile = path.join(__dirname, 'temp-opa-data.json');
		console.log(`📦 Lade ${(Buffer.byteLength(jsonData) / 1024 / 1024).toFixed(2)} MB in OPA...`);
		await fs.writeFile(tempFile, jsonData);
		const { stdout, stderr } = await execPromise(
			`curl -X PUT ${OPA_BASE}/v1/data -H "Content-Type: application/json" -d @${tempFile} -w "%{http_code}" -s -o /dev/null`
		);
		const statusCode = parseInt(stdout.trim());
		await fs.unlink(tempFile);
		if (statusCode === 200 || statusCode === 204) {
			console.log('✓ Daten in OPA geladen');
			res.json({ success: true, message: 'Daten in OPA geladen' });
		} else {
			console.error(`HTTP ${statusCode}`);
			res.status(500).json({ success: false, error: `HTTP ${statusCode}` });
		}
	} catch (error) {
		console.error('Error:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
});
function generateTestData(teamCount, memberCount, taskCount) {
	const teams = {};
	for (let i = 1; i <= teamCount; i++) {
		const members = {};

		for (let j = 1; j <= memberCount; j++) {
			const userId = `user-${i}-${j}`;
			members[userId] = {
				id: userId,
				name: `${faker.person.firstName()} ${faker.person.lastName()}`,
				email: faker.internet.email(),
				attributes: {
					aufgabenart: 'aufgabenart-' + Math.floor(Math.random() * Math.max(10, Math.min(50, taskCount / 10))),
				},
				role: j === 1 ? 'HSB' : 'SB',
			};
		}
		const teamId = `team-${i}`;
		teams[teamId] = {
			id: teamId,
			name: `Team ${i}`,
			members: members,
		};
	}
	const tasks = {};
	for (let i = 1; i <= taskCount; i++) {
		const taskId = `task-${i}`;
		tasks[taskId] = {
			id: taskId,
			title: `Task ${faker.lorem.words(3)}`,
			attributes: {
				aufgabenart: 'aufgabenart-' + Math.floor(Math.random() * Math.max(10, Math.min(50, taskCount / 10))),
			},
		};
	}
	return { teams, tasks };
}
app.post('/policy/save', async (req, res) => {
	const { filename, content } = req.body;
	if (!filename || !content) {
		return res.status(400).json({ error: '❌ Filename und Content erforderlich' });
	}
	if (!filename.endsWith('.rego')) {
		return res.status(400).json({ error: '❌ Nur .rego Dateien erlaubt' });
	}

	const filepath = path.join(POLICIES_DIR, filename);
	await fs.writeFile(filepath, content, 'utf8');
	res.json({ success: true });
});
app.get('/policy/load/:filename', async (req, res) => {
	try {
		const filePath = path.join(BASE_DIR, 'policies', req.params.filename);
		const content = await fs.readFile(filePath, 'utf-8');
		res.json({ success: true, content });
	} catch (error) {
		console.error('❌ load Policy failed:', error.message);
		res.status(404).json({ success: false, error: 'Policy not found' });
	}
});
app.delete('/policy/delete/:filename', async (req, res) => {
	try {
		const filePath = path.join(BASE_DIR, 'policies', req.params.filename);
		await fs.unlink(filePath);
		res.json({ success: true, message: 'Policy deleted' });
	} catch (error) {
		console.error('❌ delete Policies failed:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
});
app.get('/policies', async (req, res) => {
	try {
		const folder = path.join(BASE_DIR, 'policies');
		const files = await fs.readdir(folder);
		res.json({ success: true, files: files });
	} catch (error) {
		console.error('❌ get Policies failed:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
});
app.post('/docker/restart/:containerId', async (req, res) => {
	try {
		const { containerId } = req.params;
		console.log(`🔄 Restarting container: ${containerId}`);

		const { stdout } = await execPromise(`docker restart ${containerId}`);

		console.log(`☑️ Container restarted: ${containerId}`);
		setTimeout(() => {
			res.json({ success: true, message: 'Container restarted' });
		}, 3000);
	} catch (error) {
		console.error('❌ Restart failed:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
});

app.post('/opa/load-test-ab', async (req, res) => {
	try {
		const { path: policyPath, inputs, parallelRequests = 1000, iterations = 1, concurrency = 100 } = req.body;
		if (!inputs || inputs.length === 0) {
			return res.status(400).json({ success: false, error: 'No inputs provided' });
		}
		console.log(`🏹 Apache Bench Load Test: ${parallelRequests} requests × ${iterations} iterations`);

		const allResults = [];
		const startTime = Date.now();

		for (let i = 0; i < iterations; i++) {
			console.log(`  Iteration ${i + 1}/${iterations}...`);

			const testInput = inputs[i];
			const requestFile = path.join(__dirname, `ab-request-${i}.json`);
			await fs.writeFile(requestFile, JSON.stringify(testInput));

			try {
				const { stdout } = await execPromise(
					`ab -n ${parallelRequests} -c ${Math.min(
						concurrency,
						parallelRequests
					)} -p ${requestFile} -T application/json ${OPA_BASE}/v1/data/${policyPath}`
				);

				const iterationStats = parseApacheBenchOutput(stdout);
				allResults.push(iterationStats);

				await fs.unlink(requestFile);
			} catch (error) {
				await fs.unlink(requestFile).catch(() => {});
				throw error;
			}
		}

		const totalDuration = (Date.now() - startTime) / 1000;

		// Totals über alle Iterationen
		const totalRequests = allResults.reduce((sum, r) => sum + r.totalRequests, 0);
		const successfulRequests = allResults.reduce((sum, r) => sum + r.successfulRequests, 0);
		const failedRequests = allResults.reduce((sum, r) => sum + r.failedRequests, 0);

		// Durchschnitt über alle Iterationen
		const avgResponseTime = (allResults.reduce((sum, r) => sum + parseFloat(r.avgResponseTime), 0) / iterations).toFixed(2);
		const minResponseTime = Math.min(...allResults.map((r) => r.minResponseTime));
		const maxResponseTime = Math.max(...allResults.map((r) => r.maxResponseTime));
		const avgP50 = (allResults.reduce((sum, r) => sum + r.p50ResponseTime, 0) / iterations).toFixed(2);
		const avgP66 = (allResults.reduce((sum, r) => sum + r.p66ResponseTime, 0) / iterations).toFixed(2);
		const avgP80 = (allResults.reduce((sum, r) => sum + r.p80ResponseTime, 0) / iterations).toFixed(2);
		const avgP90 = (allResults.reduce((sum, r) => sum + r.p90ResponseTime, 0) / iterations).toFixed(2);
		const avgP95 = (allResults.reduce((sum, r) => sum + r.p95ResponseTime, 0) / iterations).toFixed(2);
		const avgP99 = (allResults.reduce((sum, r) => sum + r.p99ResponseTime, 0) / iterations).toFixed(2);

		console.log('📊 Sampling for Allow/Deny...');
		const sampleResults = await getSampleResults(policyPath, inputs);

		const allowedCount = sampleResults.filter((r) => r.allowed === true).length;
		const deniedCount = sampleResults.filter((r) => r.allowed === false).length;
		const totalSampled = sampleResults.length;

		const estimatedAllowed = Math.round((allowedCount / totalSampled) * successfulRequests);
		const estimatedDenied = Math.round((deniedCount / totalSampled) * successfulRequests);

		const finalStats = {
			totalRequests: totalRequests,
			successfulRequests: successfulRequests,
			failedRequests: failedRequests,
			successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(2) : '0',
			avgResponseTime: avgResponseTime,
			minResponseTime: minResponseTime,
			maxResponseTime: maxResponseTime,
			p50ResponseTime: avgP50,
			p66ResponseTime: avgP66,
			p80ResponseTime: avgP80,
			p90ResponseTime: avgP90,
			p95ResponseTime: avgP95,
			p99ResponseTime: avgP99,
			requestsPerSecond: (totalRequests / totalDuration).toFixed(2),
			totalDuration: totalDuration.toFixed(2),
			allowedRequests: estimatedAllowed,
			deniedRequests: estimatedDenied,
			allowRate: totalSampled > 0 ? ((estimatedAllowed / successfulRequests) * 100).toFixed(2) : '0',
			denyRate: totalSampled > 0 ? ((estimatedDenied / successfulRequests) * 100).toFixed(2) : '0',
			iterations: iterations,
		};

		// console.log('✓ Load Test Complete:', finalStats);
		res.json({ success: true, stats: finalStats });
	} catch (error) {
		console.error('❌ Load Test Error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});
function parseApacheBenchOutput(output) {
	const lines = output.split('\n');
	const totalRequests = parseInt(lines.find((l) => l.includes('Complete requests:'))?.match(/:\s+(\d+)/)?.[1] || '0');
	const failedRequests = parseInt(lines.find((l) => l.includes('Failed requests:'))?.match(/:\s+(\d+)/)?.[1] || '0');
	const timePerRequest = parseFloat(lines.find((l) => l.includes('Time per request:') && l.includes('mean'))?.match(/:\s+([\d.]+)/)?.[1] || '0');
	const requestsPerSec = parseFloat(lines.find((l) => l.includes('Requests per second:'))?.match(/:\s+([\d.]+)/)?.[1] || '0');
	const percentiles = {};
	const percentileLine = lines.findIndex((l) => l.includes('Percentage of the requests served'));
	if (percentileLine >= 0) {
		for (let i = percentileLine + 1; i < lines.length; i++) {
			const match = lines[i].match(/(\d+)%\s+(\d+)/);
			if (match) {
				percentiles[`p${match[1]}`] = parseInt(match[2]);
			}
		}
	}

	return {
		totalRequests,
		successfulRequests: totalRequests - failedRequests,
		failedRequests,
		successRate: totalRequests > 0 ? (((totalRequests - failedRequests) / totalRequests) * 100).toFixed(2) : '0',
		avgResponseTime: timePerRequest.toFixed(2),
		minResponseTime: percentiles.p0 || 0,
		maxResponseTime: percentiles.p100 || 0,
		p50ResponseTime: percentiles.p50 || 0,
		p66ResponseTime: percentiles.p66 || 0,
		p80ResponseTime: percentiles.p80 || 0,
		p90ResponseTime: percentiles.p90 || 0,
		p95ResponseTime: percentiles.p95 || 0,
		p99ResponseTime: percentiles.p99 || 0,
		requestsPerSecond: requestsPerSec.toFixed(2),
	};
}

async function getSampleResults(policyPath, inputs) {
	const results = [];
	const start = Date.now();
	for (let i = 0; i < inputs.length; i++) {
		try {
			const response = await fetch(`${OPA_BASE}/v1/data/${policyPath}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(inputs[i]),
			});
			if (!response.ok) continue;
			const opaResult = await response.json();

			let allowed = null;

			if (typeof opaResult.result === 'boolean') {
				allowed = opaResult.result;
			} else if (opaResult.result && typeof opaResult.result === 'object') {
				// console.log('opaResult', opaResult);
				allowed = opaResult.result.allow;
			}

			results.push({ allowed });
		} catch (error) {}
	}
	console.log('Sampling Time', (Date.now() - start) / 1000);
	return results;
}
app.post('/opa/benchmark', async (req, res) => {
	let { policyPath, input, e2e, mem } = req.body;

	policyPath = policyPath.replace(/^v1\.data\./, '');

	try {
		const inputFile = path.join(__dirname, '../temp', `bench-input-${Date.now()}.json`);
		await fs.mkdir(path.dirname(inputFile), { recursive: true });
		await fs.writeFile(inputFile, JSON.stringify(input));

		const policyDir = path.join(__dirname, '../policies');
		const benchCommand = `opa bench -d "${policyDir}" -i "${inputFile}" "data.${policyPath}" ${e2e} ${mem} --format json`;
		console.log('Command:', benchCommand);

		exec(
			benchCommand,
			{
				timeout: 120000,
				maxBuffer: 50 * 1024 * 1024,
			},
			async (error, stdout, stderr) => {
				try {
					await fs.unlink(inputFile);
				} catch (e) {
					console.error('Cleanup error:', e);
				}

				if (error) {
					console.error('Benchmark error:', error);
					return res.json({
						success: false,
						message: `Benchmark failed: ${error.message}`,
						stderr: stderr,
					});
				}
				let parsed;
				try {
					const jsonOutput = JSON.parse(stdout);
					parsed = parseBenchOutput(jsonOutput);
				} catch (e) {
					console.error('JSON Parse error:', e);
				}

				res.json({
					success: true,
					results: parsed,
					rawOutput: stdout,
				});
			}
		);
	} catch (error) {
		res.json({
			success: false,
			message: `Error: ${error.message}`,
		});
	}
});

function parseBenchOutput(jsonData) {
	const N = jsonData.N || 0;
	const T = jsonData.T || 0;
	const MemBytes = jsonData.MemBytes || 0;
	const MemAllocs = jsonData.MemAllocs || 0;
	const nsPerOp = N > 0 ? T / N : 0;
	const bytesPerOp = N > 0 ? MemBytes / N : 0;
	const allocsPerOp = N > 0 ? MemAllocs / N : 0;
	const opsPerSecond = nsPerOp > 0 ? Math.round(1000000000 / nsPerOp) : 0;

	const results = {
		nsPerOp: nsPerOp,
		bytesPerOp: bytesPerOp,
		allocsPerOp: allocsPerOp,
		opsPerSecond: opsPerSecond,
		iterations: N,
		totalTimeNs: T,
		totalMemBytes: MemBytes,
		totalMemAllocs: MemAllocs,
		metrics: [],
	};

	for (const [key, value] of Object.entries(jsonData.Extra || {})) {
		results.metrics.push([key, value]);
	}

	return results;
}
