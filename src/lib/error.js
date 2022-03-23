import { default as ErrorSubclass } from 'error-subclass'

// a custom subclass of Error for things thrown internally, so the logger
// knows it has a nice message and doesn't print the full stack trace
class NoriError extends ErrorSubclass {
	static get displayName() {
		return 'NoriError'
	}
}

export default NoriError
