const getOctokit = require('../lib/octokit')
const toSentence = require('../lib/to-sentence')

exports.command = 'create-project'
exports.desc = 'create a Github project board'

exports.input = []
exports.output = 'project'

exports.args = [
	{
		name: 'projectData',
		message: 'GitHub project details',
		type: 'form',
		choices: [{ name: 'name' }, { name: 'org' }],
		validate: projectData => {
			const messages = [
				!projectData.name && 'a project name',
				!projectData.org && 'a GitHub organisation to create the project in',
			].filter(Boolean)

			if (messages.length) {
				return `Please provide ${toSentence(messages)}`
			}
			return true
		},
	},
]

exports.handler = async ({ projectData, githubAccessToken }, state) => {
	const octokit = getOctokit(githubAccessToken)
	const { data: project } = await octokit.projects.createForOrg(projectData)

	// do these in series so they're in the right order on the board
	project.columns = [
		await octokit.projects.createColumn({
			project_id: project.id,
			name: 'To do',
		}),
		await octokit.projects.createColumn({
			project_id: project.id,
			name: 'In progress',
		}),
		await octokit.projects.createColumn({
			project_id: project.id,
			name: 'Done',
		}),
	].map(column => column.data)

	state.project = project
}

exports.undo = async ({ githubAccessToken }, state) => {
	await getOctokit(githubAccessToken).projects.update({
		project_id: state.project.id,
		state: 'closed',
	})

	delete state.project
}