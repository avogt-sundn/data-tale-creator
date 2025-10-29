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
const maxPoilicies = 4;

app.use(cors());
app.use(express.json({ limit: '500mb' }));

const POLICIES_DIR = path.join(__dirname, '../policies');
fs.mkdir(POLICIES_DIR, { recursive: true });

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
		const { teamCount = 5, minMembers = 8, maxMembers = 12, taskCount = 5 } = req.body;
		const generated = generateTestData(teamCount, minMembers, maxMembers, taskCount);
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
			`curl -X PUT http://localhost:8181/v1/data -H "Content-Type: application/json" -d @${tempFile} -w "%{http_code}" -s -o /dev/null`
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
function generateTestData(teamCount, minMembers, maxMembers, taskCount) {
	const aufgabenarten = ['aufgabenart-1', 'aufgabenart-2', 'aufgabenart-3', 'aufgabenart-4', 'aufgabenart-5'];
	const teams = {};
	for (let i = 0; i < teamCount; i++) {
		const memberCount = Math.floor(Math.random() * (maxMembers - minMembers)) + minMembers;
		const members = {};

		for (let j = 0; j < memberCount; j++) {
			const userId = `u-${j}`;
			members[userId] = {
				id: userId,
				name: `${faker.person.firstName()} ${faker.person.lastName()}`,
				email: faker.internet.email(),
				attributes: {
					aufgabenart: aufgabenarten[Math.floor(Math.random() * aufgabenarten.length)],
				},
				role: j === 0 ? 'HSB' : 'SB',
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
	for (let i = 0; i < taskCount; i++) {
		const taskId = `t-${i}`;
		tasks[taskId] = {
			id: taskId,
			title: `Task ${faker.lorem.words(3)}`,
			attributes: {
				aufgabenart: aufgabenarten[Math.floor(Math.random() * aufgabenarten.length)],
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
					)} -p ${requestFile} -T application/json http://localhost:8181/v1/data/${policyPath}`
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
		const avgP80 = (allResults.reduce((sum, r) => sum + r.p80ResponseTime, 0) / iterations).toFixed(2);
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
			p80ResponseTime: avgP80,
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

		console.log('✓ Load Test Complete:', finalStats);
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
		p80ResponseTime: percentiles.p80 || 0,
		p95ResponseTime: percentiles.p95 || 0,
		p99ResponseTime: percentiles.p99 || 0,
		requestsPerSecond: requestsPerSec.toFixed(2),
	};
}
async function getSampleResults(policyPath, inputs) {
	const results = [];
	for (const testInput of inputs) {
		const tempFile = path.join(__dirname, `temp-sample-${Date.now()}-${Math.random().toString(36).substring(7)}.json`);
		try {
			await fs.writeFile(tempFile, JSON.stringify(testInput));
			const { stdout } = await execPromise(
				`curl -X POST http://localhost:8181/v1/data/${policyPath} -H "Content-Type: application/json" -d @${tempFile} -s`
			);
			await fs.unlink(tempFile);
			const opaResult = JSON.parse(stdout);
			let allowed = null;

			if (opaResult.result && typeof opaResult.result === 'object') {
				allowed = opaResult.result.allow;
			} else if (typeof opaResult.result === 'boolean') {
				allowed = opaResult.result;
			}

			results.push({ allowed });
		} catch (error) {
			try {
				await fs.unlink(tempFile);
			} catch {}
		}
	}

	return results;
}
