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
	try {
		const policyPath = path.join(BASE_DIR, 'policies');
		await fs.mkdir(policyPath, { recursive: true });
		const files = await fs.readdir(policyPath);
		const policyFiles = files.filter((f) => f.startsWith('policy-') && f.endsWith('.rego'));
		const policyNumbers = policyFiles
			.map((f) => parseInt(f.match(/policy-(\d+)\.rego/)?.[1] || '0'))
			.filter((n) => !isNaN(n))
			.sort((a, b) => a - b);

		let nextNumber = 1;
		for (let i = 1; i <= maxPoilicies; i++) {
			if (!policyNumbers.includes(i)) {
				nextNumber = i;
				break;
			}
		}
		nextNumber = policyNumbers.length >= maxPoilicies ? maxPoilicies : nextNumber;
		const filename = `policy-${nextNumber}.rego`;
		const filePath = path.join(policyPath, filename);
		await fs.writeFile(filePath, req.body.content);
		res.json({ success: true, message: 'Policy saved', filename });
	} catch (error) {
		console.error('❌ save Policy failed:', error.message);
		res.status(500).json({ success: false, error: error.message });
	}
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
app.get('/policy/get', async (req, res) => {
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
		console.log(`🏹 Apache Bench: ${parallelRequests} requests × ${iterations} iterations`);

		for (let i = 0; i < 1; i++) {
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

				await fs.unlink(requestFile);
				res.json({ success: true, stats: stdout });
			} catch (error) {
				await fs.unlink(requestFile).catch(() => {});
				throw error;
			}
		}

		// setTimeout(() => {
		// 	res.json({ success: true, stats: [] });
		// }, 3000);
	} catch (error) {
		console.error('❌ Load Test Error:', error);
		res.status(500).json({ success: false, error: error.message });
	}
});
