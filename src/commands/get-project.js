const getOctokit = require('../lib/octokit')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const getConfig = require('../lib/config')

exports.command = 'get-project'
exports.desc = 'get a Github project board'

exports.input = []
exports.output = 'project'

const githubProjectURLRegex = /^https:\/\/github.com\/orgs\/([^\/]+)\/projects\/(\d+)$/

exports.args = [
	{
		name: 'projectUrl',
		message: 'GitHub organisation project URL',
		type: 'text',
		choices: [{ name: 'name' }, { name: 'org' }],
		validate: url => {
			if (url.match(githubProjectURLRegex)) {
				return true
			}

			return 'Please enter a valid GitHub organisation project URL'
		},
	},
]

exports.handler = async ({ projectUrl }, state) => {
	const [, org, number] = projectUrl.match(githubProjectURLRegex)
	const { githubAccessToken } = await getConfig('githubAccessToken')
	const octokit = getOctokit(githubAccessToken)

	try {
		logger.log(projectUrl, {
			message: `loading project ${styles.url(projectUrl)}`,
		})
		const projects = await octokit.paginate(
			octokit.projects.listForOrg.endpoint.merge({ org }),
		)
		const project = projects.find(
			project => project.number === parseInt(number, 10),
		)

		if (!project) {
			throw new Error(
				`There's no project #${number} in ${org}. Check https://github.com/orgs/${org}/projects/${number}`,
			)
		}

		logger.log(projectUrl, {
			message: `loading columns for ${styles.url(projectUrl)}`,
		})

		project.columns = (await octokit.projects.listColumns({
			project_id: project.id,
		})).data

		logger.log(projectUrl, {
			status: 'done',
			message: `loaded project ${project}`,
		})

		state.project = project
	} catch (error) {
		logger.log(projectUrl, {
			status: 'fail',
			message: `error loading ${styles.url(projectUrl)}`,
			error,
		})

		throw error
	}
}

exports.undo = async (args, state) => {
	delete state.project
}
