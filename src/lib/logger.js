const Komatsu = require('komatsu')
const colour = require('ansi-colors')

class CustomKomatsu extends Komatsu {
	renderMessage(spinner) {
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
