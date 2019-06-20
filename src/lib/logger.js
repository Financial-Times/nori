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
}

module.exports = new CustomKomatsu()
