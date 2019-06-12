const getOctokit = require('../lib/octokit')

exports.command = 'add-to-project'
exports.desc = 'add pull requests to a Github project'

exports.input = ['prs', 'project']
exports.output = 'projectCards'
exports.args = state => [
	{
		type: 'list',
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
				repo.card = await octokit.projects.createCard({
					column_id: column,
					content_id: repo.pr.id,
					content_type: 'PullRequest',
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
				octokit.projects.updateCard({
					card_id: repo.card.id,
					archived: true,
				})

				delete repo.card
			}
		}),
	)
}
