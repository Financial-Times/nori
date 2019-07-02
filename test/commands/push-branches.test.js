const pushBranches = require('../../src/commands/push-branches')
const git = require('@financial-times/git')

describe('push branches', () => {
	test('pushes the local branch to the remote', async () => {
		git.listBranches.mockResolvedValue([])

		await pushBranches.handler(
			{},
			{
				repos: [
					{
						owner: 'org',
						name: 'repo1',
						localBranch: 'branch1',
						clone: 'path/to/repo1',
					},
					{
						owner: 'org',
						name: 'repo2',
						localBranch: 'branch2',
						clone: 'path/to/repo2',
					},
				],
			},
		)

		expect(git.push).toHaveBeenCalledWith({
			repository: 'origin',
			refspec: 'branch1:branch1',
			workingDirectory: 'path/to/repo1',
		})

		expect(git.push).toHaveBeenCalledWith({
			repository: 'origin',
			refspec: 'branch2:branch2',
			workingDirectory: 'path/to/repo2',
		})
	})
})

describe('undoing push', () => {
	beforeAll(() => {
		return pushBranches.undo(
			{},
			{
				repos: [
					{
						owner: 'org',
						name: 'repo1',
						remoteBranch: 'branch1',
						clone: 'path/to/repo1',
					},
				],
			},
		)
	})

	test('should delete clone folder', async () => {
		expect(git.push).toHaveBeenCalledWith({
			repository: 'origin',
			refspec: ':branch1',
			workingDirectory: 'path/to/repo1',
		})
	})
})
