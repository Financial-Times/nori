const getOctokit = require('../lib/octokit')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const getConfig = require('../lib/config')
const promiseAllErrors = require('../lib/promise-all-errors')

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

exports.handler = async ({ column, project }, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')

	const octokit = getOctokit(githubAccessToken)

	await promiseAllErrors(
		state.repos.map(async repo => {
			if (repo.pr) {
				repo.card = await logger
					.logPromise(
						octokit.projects
							.createCard({
								column_id: column,
								content_id: repo.pr.id,
								content_type: 'PullRequest',
							})
							.catch(error => {
								switch (error.status) {
									// Validation Failed. since we've made sure the data is valid
									// what this actually means is that a card exists for this PR.
									case 422: {
										const newError = new Error(
											`a card already exists for ${repo.owner}/${repo.name}#${
												repo.pr.number
											} in ${project.html_url}`,
										)
										newError.originalError = error
										throw newError
									}
								}

								throw error
							}),
						`creating card for ${styles.url(repo.pr.html_url)}`,
					)
					.then(response => response.data)
			}
		}),
	)
}

exports.undo = async (_, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')
	const octokit = getOctokit(githubAccessToken)
	await promiseAllErrors(
		state.repos.map(async repo => {
			if (repo.card) {
				await logger.logPromise(
					octokit.projects.deleteCard({ card_id: repo.card.id }),
					`deleting card for ${styles.url(repo.pr.html_url)}`,
				)

				delete repo.card
			}
		}),
	)
}
