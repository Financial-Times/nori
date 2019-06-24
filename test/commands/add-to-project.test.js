const addToProject = require('../../src/commands/add-to-project')
const getOctokit = require('../../src/lib/octokit')

const githubAccessToken = 'mock access token'
const octokit = getOctokit(githubAccessToken)

jest.mock('../../src/lib/config.js', () => () => ({
	githubAccessToken: 'mock access token',
}))

describe('adding to project', () => {
	beforeAll(() =>
		addToProject.handler(
			{
				column: 1,
				githubAccessToken,
			},
			{
				project: {
					columns: [{ id: 1, name: 'To do' }],
				},
				repos: [
					{ pr: { id: 'pull request 1' } },
					{ pr: { id: 'pull request 2' } },
					{ pr: { id: 'pull request 3' } },
				],
			},
		),
	)

	test('adds every Pull Request to the board', async () => {
		expect(octokit.projects.createCard).toHaveBeenCalledWith({
			column_id: 1,
			content_id: 'pull request 1',
			content_type: 'PullRequest',
		})

		expect(octokit.projects.createCard).toHaveBeenCalledWith({
			column_id: 1,
			content_id: 'pull request 2',
			content_type: 'PullRequest',
		})

		expect(octokit.projects.createCard).toHaveBeenCalledWith({
			column_id: 1,
			content_id: 'pull request 3',
			content_type: 'PullRequest',
		})
	})
})

test('undo archives cards and removes data from state', async () => {
	const state = {
		project: { id: 'mock project id' },
		repos: [{ card: { id: 1 }, pr: {} }, { card: { id: 2 }, pr: {} }],
	}

	await addToProject.undo({ githubAccessToken }, state)

	expect(octokit.projects.deleteCard).toHaveBeenCalledWith({
		card_id: 1,
	})

	expect(octokit.projects.deleteCard).toHaveBeenCalledWith({
		card_id: 2,
	})

	expect(state.repos).toEqual([{ pr: {} }, { pr: {} }])
})
