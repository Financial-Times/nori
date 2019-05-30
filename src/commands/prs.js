const octokit = require('../lib/octokit');

exports.command = 'prs';
exports.desc = 'create Github pull requests for pushed branches';

exports.input = ['repos', 'branches'];
exports.output = 'prs';

exports.args = [{
	type: 'form',
	name: 'templates',
	message: 'Pull Request details',
	choices: [
		{ name: 'title' },
		{ name: 'body' },
	],
	validate: templates => {
		if (!templates.title) {
			return 'Please provide a Pull Request title';
		}
		return true
	}
}];

exports.handler = async ({ templates: { title, body }, githubAccessToken }, state) => {
	const titleTemplate = new Function('repo', `return \`${title.replace(/`/g, '\\`')}\``);
	const bodyTemplate = new Function('repo', `return \`${body.replace(/`/g, '\\`')}\``);

	await Promise.all(state.repos.map(async repo => {
		if (repo.remoteBranch) {
			repo.pr = await octokit(githubAccessToken).pulls.create({
				owner: repo.owner,
				repo: repo.name,
				head: repo.remoteBranch,
				base: 'master',
				title: titleTemplate(repo),
				body: bodyTemplate(repo)
			}).then(response => response.data);
		}
	}));
};

exports.undo = ({ prs, githubAccessToken }) => (
	Promise.all(prs.map(async pr => {
		await octokit(githubAccessToken).issues.createComment({
			owner: pr.head.repo.owner.login,
			repo: pr.head.repo.name,
			number: pr.number,
			body: 'automatically closed 🤖' //TODO prompt for template?
		});

		await octokit(githubAccessToken).pulls.update({
			owner: pr.head.repo.owner.login,
			repo: pr.head.repo.name,
			number: pr.number,
			state: 'closed'
		});
	}))
);
