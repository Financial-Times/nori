const getOctokit = require('../lib/octokit')

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

exports.handler = async ({ projectUrl, githubAccessToken }, state) => {
	const [, org, number] = projectUrl.match(githubProjectURLRegex)

	const octokit = getOctokit(githubAccessToken)

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

	project.columns = (await octokit.projects.listColumns({
		project_id: project.id,
	})).data

	state.project = project
}

exports.undo = async (args, state) => {
	delete state.project
}
