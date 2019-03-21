exports.command = 'filter-repo-name';
exports.desc = 'filter repository name';

exports.input = ['repos'];
exports.output = 'repos';

exports.args = [{
	name: 'filter',
	type: 'text'
}];

exports.handler = ({filter, repos}) => repos.filter(repo => repo.name.match(new RegExp(filter)));
