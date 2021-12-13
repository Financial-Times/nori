const { Octokit } = require('@octokit/rest')
const { throttling } = require('@octokit/plugin-throttling')
const { retry } = require('@octokit/plugin-retry')
const OctokitInstance = Octokit.plugin(throttling, retry)
const logger = require('../lib/logger')

const RETRY_LIMIT = 5

let client

const labels = new Set()

const clearPendingMessages = (status = 'done') => {
	labels.forEach(label => {
		logger.log(label, { status: status })
	})
	labels.clear()
}

const retryWrapper = (retryAfter, options, message) => {
	if (options.request.retryCount === RETRY_LIMIT) {
		clearPendingMessages('fail')
		return
	}
	const label = `${message}-${options.request.retryCount}`
	labels.add(label)
	logger.log(label, {
		status: 'pending',
		message: `${message}, retrying after ${retryAfter}s`,
	})
	return true
}

module.exports = token => {
	if (!client) {
		client = new OctokitInstance({
			previews: ['inertia-preview'],
			auth: token,
			throttle: {
				onRateLimit: (retryAfter, options) =>
					retryWrapper(retryAfter, options, 'Hit GitHub API rate limit'),
				onAbuseLimit: (retryAfter, options) =>
					retryWrapper(
						retryAfter,
						options,
						'Hit secondary GitHub API rate limit',
					),
			},
		})
	}

	return client
}

module.exports.clearPendingMessages = clearPendingMessages
