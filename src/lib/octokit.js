const Octokit = require('@octokit/rest')
	.plugin(require('@octokit/plugin-throttling'))
	.plugin(require('@octokit/plugin-retry'));

let client;

module.exports = token => {
	if(!client) {
		client = new Octokit({
			previews: ['inertia-preview'],
			auth: `token ${token}`,
			throttle: {
				onRateLimit: (retryAfter, options) => {
					// Only retry once.
					if (options.request.retryCount === 0) {
						return true;
					}
				},
				onAbuseLimit: () => {},
			}
		});
	}

	return client;
}
