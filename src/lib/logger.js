const Komatsu = require('komatsu')
const colour = require('ansi-colors')
const NoriError = require('./error')

class CustomKomatsu extends Komatsu {
	renderError(spinner) {
		// we'll print the message in place of the provided message, and the stack isn't useful
		if (spinner.error && spinner.error instanceof NoriError) {
			return ''
		}

		return super.renderError(spinner)
	}

	renderMessage(spinner) {
		// NoriErrors have messages nicely formatted by us so print that
		if (spinner.error && spinner.error instanceof NoriError) {
			return spinner.error.message
		}

		return colour[spinner.status === 'pending' ? 'grey' : 'white'](
			spinner.message,
		)
	}

	renderSpinner(spinner) {
		return `${this.renderSymbol(spinner)} ${this.renderMessage(
			spinner,
		)}${this.renderError(spinner)}`
	}

	log(promise, options) {
		if (process.env.NODE_ENV === 'test') {
			return promise
		}

		return super.log(promise, options)
	}
}

module.exports = new CustomKomatsu()
