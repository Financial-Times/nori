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
		{name: 'title'},
		{name: 'body'},
	],
	validate: templates => {
		if(!templates.title) {
			return 'Please provide a Pull Request title';
		}
		return true
	}
}];

exports.handler = ({templates: {title, body}, repos, branches, githubAccessToken}) => {
	const titleTemplate = new Function('repo', 'branch', `return \`${title.replace(/`/g, '\\`')}\``);
	const bodyTemplate = new Function('repo', 'branch', `return \`${body.replace(/`/g, '\\`')}\``);

	return Promise.all(branches.map((branch, index) => {
		const repo = repos[index];
		return octokit(githubAccessToken).pulls.create({
			owner: repo.owner,
			repo: repo.name,
			head: branch,
			base: 'master',
			title: titleTemplate(repo, branch),
			body: bodyTemplate(repo, branch)
		}).then(response => response.data);
	}))
};

exports.undo = ({prs, githubAccessToken}) => (
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
