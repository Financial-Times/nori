const { bizOps, bizOpsErrorHandler } = require('../lib/bizops')
const logger = require('../lib/logger')

exports.command = 'team-repos'
exports.desc = 'get all the repos that the specified team(s) owns'
exports.input = []
exports.output = 'repos'

async function getCodeNames() {
	const message = 'Fetching Teams from Bizops'
	const query = `{
        Teams(filter: { isActive: true, group: { code: "customerproducts" } }) {
            code,
        }
    }`
	logger.log(message, { status: 'pending', message })
	try {
		const result = await bizOps.graphQL.get(query)
		const codeNames = result.Teams.map(team => team.code)
		logger.log(message, { status: 'done', message })
		return codeNames
	} catch (error) {
		return bizOpsErrorHandler(error, message)
	}
}

exports.args = [
	{
		name: 'teams',
		type: 'select',
		multiple: true,
		choices: getCodeNames,
		message: 'select team(s) to retrieve all their repos (space to select)',
	},
]

exports.handler = async ({ teams }, state) => {
	const message = `Fetching repos of ${teams} from Bizops`
	const query = `{
        Teams(filter: { isActive: true, code_in: ${JSON.stringify(teams)} }) {
            repositories {
                name
            }
        }
    }`
	logger.log(message, { status: 'pending', message })

	const result = await bizOps.graphQL.get(query)

	logger.log(message, { status: 'done', message })

	state.repos = result.Teams.reduce((prevArray, team) => {
		return prevArray.concat(
			team.repositories.map(repo => {
				return { owner: 'Financial-Times', name: repo.name }
			}),
		)
	}, [])
}

exports.undo = (_, state) => {
	delete state.repos
}
