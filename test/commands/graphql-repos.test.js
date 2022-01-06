const { fs, vol } = require('memfs')
const { bizOps } = require('../../src/lib/bizops')

const graphql = require('../../src/commands/graphql-repos')

beforeAll(() => {
	fs.readFile = jest.fn()
	fs.access = jest.fn()
})

afterAll(() => {
	vol.reset()
	jest.clearAllMocks()
})

test('`graphql-repos` command correctly throws an error if the file extension is not .txt', async () => {
	vol.fromJSON({
		'existent.json': 'owner',
	})
	const result = await graphql.args[0].validate('existent.json')
	expect(result).toContain('ENOENT')
})

test('getRepositoryObject gets the correct data from nested repositories object', async () => {
	const data = {
		Team: {
			repositories: [{ name: 'platform-scripts' }],
		},
	}
	bizOps.graphQL = {
		get: jest.fn().mockReturnValue(data),
	}
	vol.fromJSON({
		'repos.graphql': `{
            Team(filter: { isActive: true, code: "platforms-customer-products" }) {
                repositories {
                    name
                }
            }
          }`,
	})

	const state = {}
	await graphql.handler({ file: 'repos.graphql' }, state)
	expect(state.repos).toEqual([
		{ owner: 'Financial-Times', name: 'platform-scripts' },
	])
})

test('getRepositoryObject correctly throws an error if repositories are not found', async () => {
	const data = {
		Teams: [
			{
				techLeads: [],
			},
			{
				techLeads: [],
			},
		],
	}
	bizOps.graphQL = {
		get: jest.fn().mockReturnValue(data),
	}
	vol.fromJSON({
		'repos.graphql': `{
            Teams {
              techLeads {
                name
              }
            }
        }`,
	})

	await expect(graphql.handler({ file: 'repos.graphql' }, {})).rejects.toThrow(
		new RegExp(`Please query for 'Repositories' or 'repositories'`),
	)
})

test('getRepositoryObject correctly throws an error if the repositories property is found but has a falsy value', async () => {
	const data = {
		Repositories: [],
	}
	bizOps.graphQL = {
		get: jest.fn().mockReturnValue(data),
	}
	vol.fromJSON({
		'repos.graphql': `{
            Repositories(filter: {code_contains: "notexist"}) {
                name
            }
        }`,
	})

	await expect(graphql.handler({ file: 'repos.graphql' }, {})).rejects.toThrow(
		'Your query returned 0 repositories, please try with another query',
	)
})

test('getRepositoryObject correctly throws an error if repositories are found but they do not contain names', async () => {
	const data = {
		Team: {
			repositories: [{ code: 'platform-scripts' }],
		},
	}
	bizOps.graphQL = {
		get: jest.fn().mockReturnValue(data),
	}

	vol.fromJSON({
		'repos.graphql': `{
            Team(filter: { isActive: true, code: "platforms-customer-products" }) {
                repositories {
                    code
                }
            }
          }`,
	})

	await expect(graphql.handler({ file: 'repos.graphql' }, {})).rejects.toThrow(
		new RegExp(
			'Your query returned 1 repository but did not return any repository name',
		),
	)
})

test('`graphql-repos` undo removes repos from state', () => {
	const state = {
		repos: [{ owner: 'owner', name: 'repo' }],
	}

	graphql.undo({}, state)

	expect(state).toEqual({})
})
