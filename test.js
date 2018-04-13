const test = require('tape');
const { spawn } = require('child_process');
const { join } = require('path');
const FIRSTBLOCK_HASH = '000008a42c7fdbaa5c55af0dfda426bfb17fa151874823204a3131b4865b691e';
test('core', tape => {
	tape.plan(1);
	const core = spawn('node', [join(process.cwd(), 'dist/core.js'), 'olivia']);
	core.stdout.on('data', data => {
		const message = data.toString();
		console.log(message);
		if (message.includes(FIRSTBLOCK_HASH)) {
			tape.ok(true);
			core.kill('SIGTERM');
		}
	});

	core.stderr.on('data', data => {
		console.log(data.toString());
	});
});
