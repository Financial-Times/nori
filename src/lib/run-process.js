const spawn = require('child_process').spawn;

module.exports = function runProcess (processToRun, options = {}) {

	return new Promise((resolve, reject) => {

		const sh = spawn('sh', ['-c', processToRun], {
			env: options.env ? options.env : process.env,
			cwd: options.cwd ? options.cwd : process.cwd()
		});

		let output = '';

		sh.stdout.on('data', (data) => {
			output += data;
		});

		sh.stderr.on('data', (data) => {
			output += data;
		});

		sh.on('error', reject);

		sh.on('close', (code) => {
			if (code === 0) {
				resolve(output);
			} else {
				reject(new Error(output));
			}
		});

	});
}
