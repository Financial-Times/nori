const teamRepos = require('../../src/commands/team-repos')
const { bizOps } = require('../../src/lib/bizops')
const { fs } = require('memfs')

beforeAll(() => {
	fs.readFile = jest.fn()
})

afterAll(() => {
	jest.clearAllMocks()
})

test('`team-repos` command correctly sets state.repos with the data from bizops', async () => {
	const data = {
		teams: [
			{
				repositories: [{ name: 'n-messaging-client' }],
			},
			{
				repositories: [{ name: 'fruit-machine' }],
			},
		],
	}
	bizOps.graphQL = {
		get: jest.fn().mockReturnValue(data),
	}

	const teams = ['platforms', 'apps']
	const state = {}
	await teamRepos.handler({ teams }, state)
	expect(state.repos).toEqual([
		{ owner: 'Financial-Times', name: 'n-messaging-client' },
		{ owner: 'Financial-Times', name: 'fruit-machine' },
	])
})

test('getCodeNames correctly gets the code names of teams', async () => {
	const data = {
		teams: [{ code: 'platforms' }, { code: 'apps' }],
	}
	bizOps.graphQL = {
		get: jest.fn().mockReturnValue(data),
	}

	const names = await teamRepos.args[0].choices()
	expect(names).toEqual(['platforms', 'apps'])
})

test('getCodeNames throws an error if there is an issue with bizops', async () => {
	bizOps.graphQL = {
		get: jest.fn().mockRejectedValue(new Error('api is down')),
	}

	await expect(teamRepos.args[0].choices()).rejects.toThrow('api is down')
})

test('`team-repos` undo removes repos from state', () => {
	const state = {
		repos: [{ owner: 'owner', name: 'repo' }],
	}

	teamRepos.undo({}, state)

	expect(state).toEqual({})
})
