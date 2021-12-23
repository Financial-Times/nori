const path = require('path')
const fs = require('mz/fs')

exports.validateFile = async (input, errMessage) => {
	try {
		const stat = await fs.lstat(path.resolve(input))

		if (!stat.isFile()) {
			return errMessage
		}
	} catch (error) {
		return errMessage
	}

	return true
}
