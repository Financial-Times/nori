const tako = require('../../src/commands/tako');
const got = require('got');

jest.mock('got', () => jest.fn(
	() => Promise.resolve({ body: { repositories: [{ owner: 'owner', name: 'name' }] } })
));

test('calls the tako host you give it with the token and topic you give it', () => {
	const takoHost = 'mock-tako-host';
	const takoToken = 'mock-tako-token';
	const topic = 'topic';

	tako.handler({
		takoHost, takoToken, topic
	});

	expect(got).toHaveBeenCalledWith(`https://${takoHost}/tako/repositories`, expect.objectContaining({
		headers: {
			authorization: `Bearer ${takoToken}`
		},
		query: { topic }
	}));
});

test('returns the repositories from tako', async () => {
	const state = {}
	await tako.handler({}, state);
	expect(state.repos).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				owner: 'owner',
				name: 'name',
			})
		])
	);
});

test('`tako` undo removes repos from state', () => {
	const state = {
		repos: [{ owner: 'owner', name: 'repo' }]
	};

	tako.undo({}, state);

	expect(state).toEqual({});
});
