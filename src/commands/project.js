const getOctokit = require('../lib/octokit');
const toSentence = require('../lib/to-sentence');

exports.command = 'project';
exports.desc = 'create a Github project board and attach the pull requests to it';

exports.input = ['prs'];
exports.output = 'project';

exports.args = [{
	name: 'projectData',
	message: 'GitHub project details',
	type: 'form',
	choices: [
		{ name: 'name' },
		{ name: 'org' }
	],
	validate: projectData => {
		const messages = [
			!projectData.name && 'a project name',
			!projectData.org && 'a GitHub organisation to create the project in'
		].filter(Boolean)

		if (messages.length) {
			return `Please provide ${toSentence(messages)}`;
		}
		return true
	}
}];

exports.handler = async ({ projectData, prs, githubAccessToken }) => {
	const octokit = getOctokit(githubAccessToken);
	const { data: project } = await octokit.projects.createForOrg(projectData);
	const { data: todoColumn } = await octokit.projects.createColumn({ project_id: project.id, name: 'To do' });
	await octokit.projects.createColumn({ project_id: project.id, name: 'In progress' });
	await octokit.projects.createColumn({ project_id: project.id, name: 'Done' });

	await Promise.all(
		prs.map(pr => octokit.projects.createCard({
			column_id: todoColumn.id,
			content_id: pr.id,
			content_type: 'PullRequest'
		}))
	);

	return project;
};

exports.undo = ({ project, githubAccessToken }) => getOctokit(githubAccessToken).projects.update({
	project_id: project.id,
	state: 'closed'
});
