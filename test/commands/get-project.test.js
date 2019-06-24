const project = require('../../src/commands/get-project')
const getOctokit = require('../../src/lib/octokit')

const githubAccessToken = 'mock access token'
const octokit = getOctokit(githubAccessToken)

jest.mock('../../src/lib/config.js', () => () => ({
	githubAccessToken: 'mock access token',
}))

test('correctly throws an error if given incorrect arguments', () => {
	const projectUrlArg = project.args.find(arg => arg.name === 'projectUrl')

	expect(projectUrlArg.validate('not a github url')).toBe(
		'Please enter a valid GitHub organisation project URL',
	)
	expect(
		projectUrlArg.validate('https://github.com/orgs/org/projects/137'),
	).toEqual(true)
})

test('adds project board by number to state', async () => {
	const projectUrl = 'https://github.com/orgs/org/projects/137'

	const state = {}
	await project.handler(
		{
			projectUrl,
			githubAccessToken,
		},
		state,
	)

	expect(octokit.projects.listForOrg.endpoint.merge).toHaveBeenCalledWith({
		org: 'org',
	})

	expect(state).toEqual({
		project: {
			id: 'mock project id',
			number: 137,
			columns: [{ id: 'mock column id' }],
		},
	})
})

test('undo removes data from state', async () => {
	const state = {
		project: { id: 'mock project id' },
	}

	await project.undo({ githubAccessToken }, state)
	expect(state).toEqual({})
})
