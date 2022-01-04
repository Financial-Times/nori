const path = require('path')
const fs = require('mz/fs')

exports.validateFile = async (input, fileExtension, errMessage) => {
	try {
		const stat = await fs.lstat(path.resolve(input))

		if (!stat.isFile() || !fileExtension.includes(path.extname(input))) {
			return errMessage
		}
	} catch (error) {
		return errMessage
	}

	return true
}
