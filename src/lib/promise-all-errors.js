const allSettled = require('promise.allsettled')

// like Promise.all, but waits for every promise to complete even if one errors
module.exports = (promises) =>
	allSettled(promises).then((results) => {
		const failures = results
			.filter((result) => result.status === 'rejected')
			.map((result) => result.reason)

		if (failures.length) {
			const firstError = failures[0]

			firstError.successes = results
				.filter((result) => result.status === 'fulfilled')
				.map((result) => result.value)

			firstError.failures = failures

			throw firstError
		}

		return results
	})
