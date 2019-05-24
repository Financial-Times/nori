const clone = require('../../src/commands/clone');
const expectOperation = require('../../test-utils/operation');
const { workspacePath } = require('../../src/lib/constants');
const git = require('@financial-times/git');
const path = require('path');
const { vol } = require('memfs');
const fs = require('mz/fs');

jest.mock('fs', () => require('memfs').fs);

test('`clone` command module exports an operation object', () => {
	expect(clone).toEqual(
		expectOperation('clone')
	);
});

describe('cloning repos', () => {
	test('clones every repo into workspace directory', async () => {
		await clone.handler({}, {
			repos: [
				{ owner: 'org', name: 'repo1' },
				{ owner: 'org', name: 'repo2' },
			],
		});

		expect(git.clone).toHaveBeenCalledWith({
			origin: 'origin',
			repo: 'git@github.com:org/repo1.git',
			workingDirectory: path.join(workspacePath, 'org/repo1'),
		});

		expect(git.clone).toHaveBeenCalledWith({
			origin: 'origin',
			repo: 'git@github.com:org/repo2.git',
			workingDirectory: path.join(workspacePath, 'org/repo2'),
		});
	});
});

describe('undoing clones', () => {
	afterEach(() => {
		vol.reset();
	});

	beforeAll(() => {
		vol.fromJSON({
			'clone/path': {}
		});

		return clone.undo({}, {
			repos: [
				{ owner: 'org', name: 'repo1', clone: 'clone/path' },
			]
		})
	});

	test('should delete clone folder', async () => {
		expect(fs.exists('clone/path')).resolves.toBe(false);
	});
});


