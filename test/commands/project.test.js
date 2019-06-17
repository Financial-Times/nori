const project = require('../../src/commands/project')
const getOctokit = require('../../src/lib/octokit')

const githubAccessToken = 'mock access token'
const octokit = getOctokit(githubAccessToken)

test('correctly throws an error if given incorrect arguments', () => {
	const projectDataArg = project.args.find(arg => arg.name === 'projectData')

	expect(projectDataArg.validate({})).toBe(
		'Please provide a project name and a GitHub organisation to create the project in',
	)
	expect(projectDataArg.validate({ name: 'foo' })).toBe(
		'Please provide a GitHub organisation to create the project in',
	)
	expect(projectDataArg.validate({ org: 'foo' })).toBe(
		'Please provide a project name',
	)
	expect(projectDataArg.validate({ name: 'foo', org: 'foo' })).toEqual(true)
})

describe('creating project board', () => {
	const projectData = { name: 'foo', org: 'foo' }

	beforeAll(() =>
		project.handler(
			{
				projectData,
				githubAccessToken,
			},
			{
				repos: [
					{ pr: { id: 'pull request 1' } },
					{ pr: { id: 'pull request 2' } },
					{ pr: { id: 'pull request 3' } },
				],
			},
		),
	)

	test('creates the project board', () => {
		expect(octokit.projects.createForOrg).toHaveBeenCalledWith(projectData)
	})

	test('adds columns to the board it created', async () => {
		const project_id = (await octokit.projects.createForOrg.mock.results[0]
			.value).data.id

		expect(octokit.projects.createColumn).toHaveBeenCalledWith({
			project_id,
			name: 'To do',
		})

		expect(octokit.projects.createColumn).toHaveBeenCalledWith({
			project_id,
			name: 'In progress',
		})

		expect(octokit.projects.createColumn).toHaveBeenCalledWith({
			project_id,
			name: 'Done',
		})
	})

	test('adds every Pull Request to the board it created', async () => {
		const column_id = (await octokit.projects.createColumn.mock.results[0]
			.value).data.id

		expect(octokit.projects.createCard).toHaveBeenCalledWith({
			column_id,
			content_id: 'pull request 1',
			content_type: 'PullRequest',
		})

		expect(octokit.projects.createCard).toHaveBeenCalledWith({
			column_id,
			content_id: 'pull request 2',
			content_type: 'PullRequest',
		})

		expect(octokit.projects.createCard).toHaveBeenCalledWith({
			column_id,
			content_id: 'pull request 3',
			content_type: 'PullRequest',
		})
	})
})

test('undo closes the project and removes data from state', async () => {
	const state = {
		project: { id: 'mock project id' },
	}

	await project.undo({ githubAccessToken }, state)

	expect(octokit.projects.update).toHaveBeenCalledWith({
		project_id: 'mock project id',
		state: 'closed',
	})

	expect(state).toEqual({})
})
