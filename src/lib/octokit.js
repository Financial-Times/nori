const Octokit = require('@octokit/rest');

let client;

module.exports = token => {
	if(!client) {
		client = new Octokit({
			previews: ['inertia-preview'],
			auth: `token ${token}`
		});
	}

	return client;
}
