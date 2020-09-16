const pushBranches = require('../../src/commands/push-branches')
const git = require('@financial-times/git')

describe('push branches', () => {
	test('pushes the local branch to the remote', async () => {
		git.listBranches.mockResolvedValue([])
		git.cherry.mockResolvedValue([
			'+ 7b79a0247085663de33b0c059d4a5f9c7dd604e4 initial commit',
		])

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

	test('skips pushing the local branch to the remote if no commits were made', async () => {
		git.listBranches.mockResolvedValue([])
		git.cherry.mockResolvedValue([])

		await pushBranches.handler(
			{},
			{
				repos: [
					{
						owner: 'org',
						name: 'repo1',
						localBranch: 'branch3',
						clone: 'path/to/repo1',
					},
					{
						owner: 'org',
						name: 'repo2',
						localBranch: 'branch4',
						clone: 'path/to/repo2',
					},
				],
			},
		)
		expect(git.push).not.toHaveBeenCalledWith({
			repository: 'origin',
			refspec: 'branch3:branch3',
			workingDirectory: 'path/to/repo1',
		})

		expect(git.push).not.toHaveBeenCalledWith({
			repository: 'origin',
			refspec: 'branch4:branch4',
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
