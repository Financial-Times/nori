const {prompt} = require('enquirer');
const got = require('got');
const isUrl = require('is-url');

exports.command = 'tako';
exports.desc = 'get a list of repos from a tako instance';
exports.input = [];
exports.output = 'repos';

exports.arguments = [{
	name: 'url',
	validate: input => isUrl(input) || 'Please enter a valid URL',
	type: 'text',
}, {
	name: 'token',
	type: 'text',
}, {
	name: 'topic',
	type: 'text',
}];

exports.handler = ({url, token, topic}) => got(`${url}/tako/repositories`, {
	json: true,
	headers: token && {
		authorization: `Bearer ${token}`
	},
	query: {topic}
}).then(
	({body}) => body.repositories
);