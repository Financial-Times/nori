const Octokit = require('@octokit/rest');

module.exports = new Octokit({
	previews: ['inertia-preview'],
	auth: `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`
});
