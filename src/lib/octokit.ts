import { Octokit } from '@octokit/rest'
import { throttling } from '@octokit/plugin-throttling'
import { retry } from '@octokit/plugin-retry'
const OctokitInstance = Octokit.plugin(throttling, retry)
const logger = require('../lib/logger')

const RETRY_LIMIT = 5

let client: Octokit

const labels = new Set()

const clearPendingMessages = (status = 'done') => {
	labels.forEach((label) => {
		logger.log(label, { status: status })
	})
	labels.clear()
}

const retryWrapper = (retryAfter: number, options: any, message: string) => {
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

module.exports = (token: string) => {
	if (!client) {
		client = new OctokitInstance({
			previews: ['inertia-preview'],
			auth: token,
			throttle: {
				onRateLimit: (retryAfter: number, options: any) =>
					retryWrapper(retryAfter, options, 'Hit GitHub API rate limit'),
				onAbuseLimit: (retryAfter: number, options: any) =>
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
