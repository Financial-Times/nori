import octokit from '../lib/octokit';

export const command = 'project';
export const desc = 'create a Github project board and attach the pull requests to it';

export const input = ['prs'];
export const output = 'project';

export const args = [{
	name: 'projectData',
	type: 'form',
	choices: [
		{name: 'name'},
		{name: 'org'}
	]
}];

export const handler = async ({projectData, prs}) => {
	const {data: project} = await octokit.projects.createForOrg(projectData);
	const {data: todoColumn} = await octokit.projects.createColumn({project_id: project.id, name: 'To do'});
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

export const undo = ({project}) => octokit.projects.update({
	project_id: project.id,
	state: 'closed'
});
