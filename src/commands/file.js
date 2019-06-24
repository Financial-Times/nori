const fs = require('mz/fs')
const path = require('path')

exports.command = 'file'
exports.desc = 'get a list of repos from a file'
exports.input = []
exports.output = 'repos'

exports.args = [
	{
		name: 'file',
		type: 'text',
		message: 'path to a text file of repositories',
		validate: async input => {
			try {
				const stat = await fs.lstat(path.resolve(input))

				if (!stat.isFile()) {
					return 'Please enter a path to a text file containing a line-separated list of repositories'
				}
			} catch (error) {
				return 'Please enter a path to a text file containing a line-separated list of repositories'
			}

			return true
		},
	},
]

exports.handler = async ({ file }, state) => {
	const contents = await fs.readFile(file, 'utf8')

	state.repos = contents
		.split('\n')
		.map(line => {
			if (!line) return

			const [owner, name] = line.split('/')
			return { owner, name }
		})
		.filter(Boolean)
}

exports.undo = (_, state) => {
	delete state.repos
}
