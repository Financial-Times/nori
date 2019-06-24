const tako = require('../../src/commands/tako')
const got = require('got')

jest.mock('got', () =>
	jest.fn(() =>
		Promise.resolve({
			body: { repositories: [{ owner: 'owner', name: 'name' }] },
		}),
	),
)

jest.mock('../../src/lib/config.js', () => () => ({
	takoHost: 'mock-tako-host',
	takoToken: 'mock-tako-token',
}))

test('calls the tako host you give it with the token and topic you give it', async () => {
	const topic = 'topic'

	await tako.handler(
		{
			topic,
		},
		{},
	)

	expect(got).toHaveBeenCalledWith(
		'https://mock-tako-host/tako/repositories',
		expect.objectContaining({
			headers: {
				authorization: `Bearer mock-tako-token`,
			},
			query: { topic },
		}),
	)
})

test('returns the repositories from tako', async () => {
	const state = {}
	await tako.handler({}, state)
	expect(state.repos).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				owner: 'owner',
				name: 'name',
			}),
		]),
	)
})

test('`tako` undo removes repos from state', () => {
	const state = {
		repos: [{ owner: 'owner', name: 'repo' }],
	}

	tako.undo({}, state)

	expect(state).toEqual({})
})
