import * as fs from 'mz/fs';
import * as path from 'path';

export const command = 'file';
export const desc = 'get a list of repos from a file';
export const input = [];
export const output = 'repos';

export const args = [{
	name: 'file',
	type: 'text',
	message: 'path to a text file of repositories',
	validate: async (input: string) => (
		await fs.exists(path.resolve(input))
	) || 'Please enter a path to a text file containing a line-separated list of repositories'
}];

export const handler = async ({file}: {file: string}) => {
	const contents: string = await fs.readFile(file, 'utf8');
	return contents.split('\n').map(line => {
		if(!line) return;

		const [owner, name] = line.split('/');
		return {owner, name};
	}).filter(Boolean);
};
