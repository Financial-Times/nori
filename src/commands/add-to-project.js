const getOctokit = require('../lib/octokit')
const logger = require('../lib/logger')

exports.command = 'add-to-project'
exports.desc = 'add pull requests to a Github project'

exports.input = ['prs', 'project']
exports.output = 'projectCards'
exports.args = state => [
	{
		type: 'select',
		name: 'column',
		message: 'Column to add cards to',
		choices: state.project.columns.map(column => ({
			message: column.name,
			name: column.id,
		})),
	},
]

exports.handler = async ({ column, githubAccessToken }, state) => {
	const octokit = getOctokit(githubAccessToken)

	await Promise.all(
		state.repos.map(async repo => {
			if (repo.pr) {
				logger.log(`add to project ${repo.pr.html_url}`, {
					message: `creating card for ${repo.pr.html_url}`,
				})

				repo.card = await octokit.projects
					.createCard({
						column_id: column,
						content_id: repo.pr.id,
						content_type: 'PullRequest',
					})
					.then(response => {
						logger.log(`add to project ${repo.pr.html_url}`, {
							status: 'done',
							message: `created card for ${repo.pr.html_url}`,
						})
						return response.data
					})
					.catch(error => {
						logger.log(`add to project ${repo.pr.html_url}`, {
							status: 'fail',
							message: `error creating card for ${repo.pr.html_url}`,
							error,
						})
					})
			}
		}),
	)
}

exports.undo = async ({ githubAccessToken }, state) => {
	const octokit = getOctokit(githubAccessToken)
	await Promise.all(
		state.repos.map(async repo => {
			if (repo.card) {
				logger.log(`undo project ${repo.pr.html_url}`, {
					message: `deleting card for ${repo.pr.html_url}`,
				})
				await octokit.projects.deleteCard({
					card_id: repo.card.id,
				})
				logger.log(`undo project ${repo.pr.html_url}`, {
					status: 'done',
					message: `deleted card for ${repo.pr.html_url}`,
				})

				delete repo.card
			}
		}),
	)
}
