const pushBranches = require('../../src/commands/push-branches')
const { workspacePath } = require('../../src/lib/constants')
const git = require('@financial-times/git')
const path = require('path')
const { vol } = require('memfs')
const fs = require('mz/fs')

jest.mock('fs', () => require('memfs').fs)

describe('push branches', () => {
	test('pushes the local branch to the remote', async () => {
		await pushBranches.handler(
			{},
			{
				repos: [
					{ owner: 'org', name: 'repo1', localBranch: 'branch1' },
					{ owner: 'org', name: 'repo2', localBranch: 'branch2' },
				],
			},
		)

		expect(git.push).toHaveBeenCalledWith({
			repository: 'origin',
			refspec: 'branch1',
			workingDirectory: path.join(workspacePath, 'repo1'),
		})

		expect(git.push).toHaveBeenCalledWith({
			repository: 'origin',
			refspec: 'branch2',
			workingDirectory: path.join(workspacePath, 'repo2'),
		})
	})
})

describe('undoing push', () => {
	afterEach(() => {
		vol.reset()
	})

	beforeAll(() => {
		vol.fromJSON({
			'clone/path': {},
		})

		return pushBranches.undo(
			{},
			{
				repos: [{ owner: 'org', name: 'repo1', remoteBranch: 'branch1' }],
			},
		)
	})

	test('should delete clone folder', async () => {
		expect(git.push).toHaveBeenCalledWith({
			repository: 'origin',
			refspec: ':branch1',
			workingDirectory: path.join(workspacePath, 'repo1'),
		})
	})
})
