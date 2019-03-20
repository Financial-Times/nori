import * as got from 'got';
import isUrl from 'is-url';

export const command = 'tako';
export const desc = 'get a list of repos from a tako instance';
export const input = [];
export const output = 'repos';

export const args = [{
	name: 'url',
	validate: (input: string) => isUrl(input) || 'Please enter a valid URL',
	type: 'text',
}, {
	name: 'token',
	type: 'text',
}, {
	name: 'topic',
	type: 'text',
}];

export const handler = ({url, token, topic}) => got(`${url}/tako/repositories`, {
	json: true,
	headers: token && {
		authorization: `Bearer ${token}`
	},
	query: {topic}
}).then(
	({body}) => body.repositories
);
