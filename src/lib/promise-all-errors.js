// like Promise.all, but waits for every promise to complete even if one errors

const error = Symbol('error')

module.exports = promises =>
	Promise.all(
		// Promise.all can accept an iterable, but we need to map it,
		// so use Array.from instead of assuming Array and using .map
		Array.from(promises, promise =>
			promise.then(result => result, error => ({ [error]: error })),
		),
	).then(results => {
		const anyError = results.find(result => Boolean(result && result[error]))

		if (anyError) {
			// throw the first error, and attach the errors and successes to it as array properties
			anyError.successes = results.filter(result => !(result && result[error]))
			anyError.failures = results
				.map(result => result && result[error])
				.filter(Boolean)
			throw anyError
		}

		return results
	})
