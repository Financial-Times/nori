const fs = require('mz/fs')
const { validateFile } = require('../lib/file-validation')

exports.command = 'file'
exports.desc = 'get a list of repos from a file'
exports.input = []
exports.output = 'repos'

exports.args = [
	{
		name: 'file',
		type: 'text',
		message: 'path to a text file of repositories',
		validate: (state) =>
			validateFile(
				state,
				['.txt'],
				'Please enter a path to a text file containing a line-separated list of repositories',
			),
	},
]

exports.handler = async ({ file }, state) => {
	const contents = await fs.readFile(file, 'utf8')

	state.repos = contents
		.split('\n')
		.map((line) => {
			if (!line) return

			if (line.startsWith('https://github.com')) {
				line = line.substring(19)
			}

			const [owner, name] = line.split('/')

			if (!owner || !name) {
				throw new Error('file contents are in an incorrect format')
			}

			return { owner, name }
		})
		.filter(Boolean)
}

exports.undo = (_, state) => {
	delete state.repos
}
