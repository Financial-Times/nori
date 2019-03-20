
module.exports = {
	command: 'filter-repo-name',
	desc: 'filter repository name',
	input: ['repos'],
	output: 'repos',
	args: [{
		name: 'filter',
		type: 'text'
	}],
	handler: ({filter, repos}) => repos.filter(repo => repo.name.match(new RegExp(filter)))
};
