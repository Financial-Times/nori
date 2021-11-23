const { Octokit } = require('@octokit/rest')
const { throttling } = require('@octokit/plugin-throttling')
const { retry } = require('@octokit/plugin-retry')
const OctokitInstance = Octokit.plugin(throttling, retry)
const logger = require('../lib/logger')

let client

module.exports = token => {
	if (!client) {
		client = new OctokitInstance({
			previews: ['inertia-preview'],
			auth: token,
			throttle: {
				onRateLimit: retryAfter => {
					logger.log(
						`Hit GitHub API rate limit, retrying after ${retryAfter}s`,
						{
							status: 'pending',
							message: `Hit GitHub API rate limit, retrying after ${retryAfter}s`,
						},
					)
					return true
				},
				onAbuseLimit: retryAfter => {
					logger.log(
						`Hit secondary GitHub API rate limit, retrying after ${retryAfter}s`,
						{
							status: 'pending',
							message: `Hit secondary GitHub API rate limit, retrying after ${retryAfter}s`,
						},
					)
					return true
				},
			},
		})
	}

	return client
}
