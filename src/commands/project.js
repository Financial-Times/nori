const github = require('@financial-times/github')({
    personalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
});

exports.command = 'project';
exports.desc = 'create a Github project board and attach the pull requests to it';

exports.input = ['prs'];
exports.output = 'project';

exports.arguments = [{
	name: 'projectData',
	type: 'form',
	choices: [
		{name: 'name'},
		{name: 'org'}
	]
}];

exports.handler = async ({projectData, prs}) => {
	const project = await github.createProject(projectData);
	const todoColumn = await github.createProjectColumn({project_id: project.id, name: 'To do'});
	await github.createProjectColumn({project_id: project.id, name: 'In progress'});
	await github.createProjectColumn({project_id: project.id, name: 'Done'});

	await Promise.all(
		prs.map(pr => github.createPullRequestCard({
			column_id: todoColumn.id,
			content_id: pr.id,
			content_type: 'PullRequest'
		}))
	);

	return project;
};
