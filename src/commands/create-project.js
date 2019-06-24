const getOctokit = require('../lib/octokit')
const toSentence = require('../lib/to-sentence')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const getConfig = require('../lib/config')

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

exports.handler = async ({ projectData }, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')
	const octokit = getOctokit(githubAccessToken)

	logger.log('project', {
		message: `creating project ${styles.branch(
			projectData.name,
		)} in ${styles.repo(projectData.org)}`,
	})
	const { data: project } = await octokit.projects.createForOrg(projectData)

	logger.log('project', {
		message: `creating columns for ${styles.branch(projectData.name)}`,
	})
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

	logger.log('project', {
		status: 'done',
		message: `created project ${styles.url(project.html_url)}`,
	})

	state.project = project
}

exports.undo = async (_, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')
	await logger.logPromise(
		getOctokit(githubAccessToken).projects.update({
			project_id: state.project.id,
			state: 'closed',
		}),
		`closing project ${styles.url(state.project.html_url)}`,
	)

	delete state.project
}
