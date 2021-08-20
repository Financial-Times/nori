const { Octokit } = require('@octokit/rest')
const { throttling } = require('@octokit/plugin-throttling')
const { retry } = require('@octokit/plugin-retry')
const OctokitInstance = Octokit.plugin(throttling, retry)

let client

const retryLimitOnce = (_retryAfter, options) => {
	// Only retry once.
	if (options.request.retryCount === 0) {
		return true
	}
}

module.exports = token => {
	if (!client) {
		client = new OctokitInstance({
			previews: ['inertia-preview'],
			auth: `token ${token}`,
			throttle: {
				onRateLimit: retryLimitOnce,
				onAbuseLimit: retryLimitOnce,
			},
		})
	}

	return client
}
