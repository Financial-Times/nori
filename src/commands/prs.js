const getOctokit = require('../lib/octokit')
const toSentence = require('../lib/to-sentence')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const getConfig = require('../lib/config')
const promiseAllErrors = require('../lib/promise-all-errors')
const NoriError = require('../lib/error')

exports.command = 'prs'
exports.desc = 'create Github pull requests for pushed branches'

exports.input = ['repos', 'remoteBranches']
exports.output = 'prs'

exports.args = [
	{
		type: 'form',
		name: 'templates',
		message: 'Pull Request details',
		choices: [{ name: 'title' }, { name: 'body' }],
		validate: templates => {
			const { title, body } = templates
			const messages = [
				!title && 'a Pull Request title',
				!body && 'a Pull Request body',
			].filter(Boolean)

			if (messages.length) {
				return `Please provide ${toSentence(messages)}`
			}
			return true
		},
	},
]

exports.handler = async ({ templates: { title, body } }, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')
	const titleTemplate = new Function(
		'repo',
		`return \`${title.replace(/`/g, '\\`')}\``,
	)
	const bodyTemplate = new Function(
		'repo',
		`return \`${body.replace(/`/g, '\\`')}\``,
	)

	const octokit = getOctokit(githubAccessToken)

	await promiseAllErrors(
		state.repos.map(async repo => {
			if (repo.remoteBranch) {
				const [existingPr] = await octokit.paginate(
					octokit.pulls.list.endpoint.merge({
						owner: repo.owner,
						repo: repo.name,
						head: `${repo.owner}:${repo.remoteBranch}`,
					}),
				)

				if (existingPr) {
					logger.log(`${repo.owner}/${repo.name} PR`, {
						status: 'info',
						message: `using existing PR ${styles.url(
							existingPr.html_url,
						)} for ${styles.branch(repo.remoteBranch)} on ${styles.repo(
							`${repo.owner}/${repo.name}`,
						)}`,
					})
				}

				repo.pr =
					existingPr ||
					(await logger
						.logPromise(
							octokit.pulls.create({
								owner: repo.owner,
								repo: repo.name,
								head: repo.remoteBranch,
								base: 'master',
								title: titleTemplate(repo),
								body: bodyTemplate(repo),
							})`creating PR for ${styles.branch(
								repo.remoteBranch,
							)} on ${styles.repo(`${repo.owner}/${repo.name}`)}`,
						)
						.then(response => response.data))
			}
		}),
	)
}

exports.undo = async (_, state) => {
	const { githubAccessToken } = await getConfig('githubAccessToken')

	return promiseAllErrors(
		state.repos.map(async repo => {
			if (repo.pr) {
				logger.log(`undo pr ${repo.pr.html_url}`, {
					message: `closing ${styles.url(repo.pr.html_url)}`,
				})

				await getOctokit(githubAccessToken).issues.createComment({
					owner: repo.pr.head.repo.owner.login,
					repo: repo.pr.head.repo.name,
					issue_number: repo.pr.number,
					body: 'automatically closed 🤖', //TODO prompt for template?
				})

				await getOctokit(githubAccessToken).pulls.update({
					owner: repo.pr.head.repo.owner.login,
					repo: repo.pr.head.repo.name,
					pull_number: repo.pr.number,
					state: 'closed',
				})

				logger.log(`undo pr ${repo.pr.html_url}`, {
					status: 'done',
					message: `closed ${styles.url(repo.pr.html_url)}`,
				})

				delete repo.pr
			}
		}),
	)
}
