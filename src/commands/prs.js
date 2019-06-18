const octokit = require('../lib/octokit')
const toSentence = require('../lib/to-sentence')

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

exports.handler = async (
	{ templates: { title, body }, githubAccessToken },
	state,
) => {
	const titleTemplate = new Function(
		'repo',
		`return \`${title.replace(/`/g, '\\`')}\``,
	)
	const bodyTemplate = new Function(
		'repo',
		`return \`${body.replace(/`/g, '\\`')}\``,
	)

	await Promise.all(
		state.repos.map(async repo => {
			if (repo.remoteBranch) {
				repo.pr = await octokit(githubAccessToken)
					.pulls.create({
						owner: repo.owner,
						repo: repo.name,
						head: repo.remoteBranch,
						base: 'master',
						title: titleTemplate(repo),
						body: bodyTemplate(repo),
					})
					.then(response => response.data)
			}
		}),
	)
}

exports.undo = ({ githubAccessToken }, state) =>
	Promise.all(
		state.repos.map(async repo => {
			await octokit(githubAccessToken).issues.createComment({
				owner: repo.pr.head.repo.owner.login,
				repo: repo.pr.head.repo.name,
				issue_number: repo.pr.number,
				body: 'automatically closed 🤖', //TODO prompt for template?
			})

			await octokit(githubAccessToken).pulls.update({
				owner: repo.pr.head.repo.owner.login,
				repo: repo.pr.head.repo.name,
				pull_number: repo.pr.number,
				state: 'closed',
			})

			delete repo.pr
		}),
	)
