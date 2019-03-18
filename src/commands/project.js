const octokit = require('../lib/octokit');

exports.command = 'project';
exports.desc = 'create a Github project board and attach the pull requests to it';

exports.input = ['prs'];
exports.output = 'project';

exports.args = [{
	name: 'projectData',
	type: 'form',
	choices: [
		{name: 'name'},
		{name: 'org'}
	]
}];

exports.handler = async ({projectData, prs}) => {
	const project = await octokit.projects.createForOrg(projectData);
	const todoColumn = await octokit.projects.createColumn({project_id: project.id, name: 'To do'});
	await octokit.projects.createColumn({project_id: project.id, name: 'In progress'});
	await octokit.projects.createColumn({project_id: project.id, name: 'Done'});

	await Promise.all(
		prs.map(pr => octokit.projects.createCard({
			column_id: todoColumn.id,
			content_id: pr.id,
			content_type: 'PullRequest'
		}))
	);

	return project;
};

exports.undo = ({project}) => octokit.projects.update({
	project_id: project.id,
	state: 'closed'
});
