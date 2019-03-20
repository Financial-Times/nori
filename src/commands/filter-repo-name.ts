
export const command = 'filter-repo-name';
export const desc = 'filter repository name';
export const input = ['repos'];
export const output = 'repos';
export const args = [{
	name: 'filter',
	type: 'text'
}];
export const handler = ({filter, repos}) => repos.filter(repo => repo.name.match(new RegExp(filter)));
