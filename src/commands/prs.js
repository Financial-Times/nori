const github = require('@financial-times/github')({
    personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
});

exports.command = 'prs';
exports.desc = 'create Github pull requests for pushed branches';

exports.input = ['repos', 'branches'];
exports.output = 'prs';

exports.arguments = [{
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

	// TODO what if not all the repos had a branch created
	return Promise.all(branches.map((branch, index) => {
		const repo = repos[index];
		return github.createPullRequest({
			owner: repo.owner,
			repo: repo.name,
			head: branch,
			base: 'master',
			title: titleTemplate(repo, branch),
			body: bodyTemplate(repo, branch)
		});
	}))
};
