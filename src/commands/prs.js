const octokit = require('../lib/octokit');

exports.command = 'prs';
exports.desc = 'create Github pull requests for pushed branches';

exports.input = ['repos', 'branches'];
exports.output = 'prs';

exports.args = [{
	type: 'form',
	name: 'templates',
	choices: [
		{name: 'title'},
		{name: 'body'},
	]
}];

exports.handler = ({templates: {title, body}, repos, branches}) => {
	const titleTemplate = new Function('repo', 'branch', `return \`${title}\``);
	const bodyTemplate = new Function('repo', 'branch', `return \`${body}\``);

	return Promise.all(branches.map((branch, index) => {
		const repo = repos[index];
		return octokit.pulls.create({
			owner: repo.owner,
			repo: repo.name,
			head: branch,
			base: 'master',
			title: titleTemplate(repo, branch),
			body: bodyTemplate(repo, branch)
		}).then(response => response.data);
	}))
};

exports.undo = async ({prs}) => (
	Promise.all(prs.map(async pr => {
		await octokit.issues.createComment({
			owner: pr.head.repo.owner.login,
			repo: pr.head.repo.name,
			number: pr.number,
			body: 'automatically closed 🤖' //TODO prompt for template?
		});

		await octokit.pulls.update({
			owner: pr.head.repo.owner.login,
			repo: pr.head.repo.name,
			number: pr.number,
			state: 'closed'
		});
	}))
);
