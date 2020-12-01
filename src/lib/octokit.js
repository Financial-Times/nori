const { Octokit } = require('@octokit/rest')
const { throttling } = require('@octokit/plugin-throttling')
const { retry } = require('@octokit/plugin-retry')
const OctokitInstance = Octokit.plugin([throttling, retry])

let client

module.exports = token => {
	if (!client) {
		client = new OctokitInstance({
			previews: ['inertia-preview'],
			auth: `token ${token}`,
			throttle: {
				onRateLimit: (retryAfter, options) => {
					// Only retry once.
					if (options.request.retryCount === 0) {
						return true
					}
				},
				onAbuseLimit: () => {},
			},
		})
	}

	return client
}
