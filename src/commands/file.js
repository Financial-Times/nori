const {prompt} = require('enquirer');
const fs = require('mz/fs');

exports.command = 'file';
exports.desc = 'get a list of repos from a file';
exports.input = 'start';
exports.output = 'repos';

exports.prompt = () => prompt({
	name: 'file',
	type: 'text',
	validate: async input => (
		await fs.exists(path.resolve(input))
	) || 'Please enter a path to a text file containing a line-separated list of repositories'
});

exports.get = async ({file}) => {
	const contents = await fs.readFile(file, 'utf8');
	return contents.split('\n').map(line => {
		if(!line) return;

		const [owner, name] = line.split('/');
		return {owner, name};
	}).filter(Boolean);
};