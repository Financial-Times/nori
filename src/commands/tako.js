const getConfig = require('../lib/config')
const got = require('got')

exports.command = 'tako'
exports.desc = 'get a list of repos from a tako instance'
exports.input = []
exports.output = 'repos'

exports.args = [
	{
		name: 'topic',
		type: 'text',
		message: '(optional) GitHub topic to filter by',
	},
]

exports.handler = async ({ topic }, state) => {
	const { takoHost, takoToken } = await getConfig('takoHost', 'takoToken')

	state.repos = await got(`https://${takoHost}/tako/repositories`, {
		json: true,
		headers: takoToken && {
			authorization: `Bearer ${takoToken}`,
		},
		query: { topic },
	}).then(({ body }) => body.repositories)
}

exports.undo = (_, state) => {
	delete state.repos
}
