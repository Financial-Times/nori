const getOctokit = require('../lib/octokit')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const getConfig = require('../lib/config')
const promiseAllErrors = require('../lib/promise-all-errors')
const NoriError = require('../lib/error')

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

exports.handler = async ({ column }, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')

	const octokit = getOctokit(githubAccessToken)
	const allCards = (await logger.logPromise(
		Promise.all(
			state.project.columns.map(projectColumn =>
				octokit.paginate(
					octokit.projects.listCards.endpoint.merge({
						column_id: projectColumn.id,
					}),
				),
			),
		),
		`getting current cards in ${styles.url(state.project.html_url)}`,
	)).reduce((a, b) => a.concat(b)) // flatten

	await promiseAllErrors(
		state.repos.map(async repo => {
			if (repo.pr) {
				const existingCard = allCards.find(
					card => card.content_url === repo.pr.issue_url,
				)

				if (existingCard) {
					logger.log(`${repo.owner}/${repo.name} card`, {
						status: 'info',
						message: `using existing card in ${styles.url(
							state.project.html_url,
						)} for ${styles.repo(`${repo.owner}/${repo.name}`)}${styles.branch(
							`#${repo.pr.number}`,
						)}`,
					})
				}

				repo.card =
					existingCard ||
					(await logger
						.logPromise(
							octokit.projects.createCard({
								column_id: column,
								content_id: repo.pr.id,
								content_type: 'PullRequest',
							}),
							`creating card for ${styles.url(repo.pr.html_url)}`,
						)
						.then(response => response.data))
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
