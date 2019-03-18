const fs = require('mz/fs');
const path = require('path');

exports.command = 'file';
exports.desc = 'get a list of repos from a file';
exports.input = [];
exports.output = 'repos';

exports.arguments = [{
	name: 'file',
	type: 'text',
	message: 'path to a text file of repositories',
	validate: async input => (
		await fs.exists(path.resolve(input))
	) || 'Please enter a path to a text file containing a line-separated list of repositories'
}];

exports.handler = async ({file}) => {
	const contents = await fs.readFile(file, 'utf8');
	return contents.split('\n').map(line => {
		if(!line) return;

		const [owner, name] = line.split('/');
		return {owner, name};
	}).filter(Boolean);
};
