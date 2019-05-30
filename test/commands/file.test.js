const { fs, vol } = require('memfs');
const expectOperation = require('../../test-utils/operation');

const file = require('../../src/commands/file');

jest.mock('fs', () => {
	const { fs } = require('memfs');
	jest.spyOn(fs, 'access');
	return fs;
});

afterEach(() => {
	vol.reset();
	fs.access.mockReset();
	jest.clearAllMocks();
});

test('`file` command module exports an operation object', () => {
	expect(file).toEqual(
		expectOperation('file')
	);
});

test('`file` command correctly throws an error if the file does not exist', async () => {
	vol.fromJSON({});
	await expect(file.handler({ file: 'non-existent.txt' }, {}))
		.rejects
		.toThrow('ENOENT: no such file or directory')
})

test('`file` command returns the correct data', async () => {
	vol.fromJSON({
		'repositories.txt': 'owner/repo'
	});

	const state = {}
	await file.handler({ file: 'repositories.txt' }, state)

	expect(state.repos).toEqual(
		[{ owner: 'owner', name: 'repo' }]
	);
});

test.todo('`file` command correctly throws an error if the file contents are in an incorrect format');

test('`file` undo removes repos from state', () => {
	const state = {
		repos: [{ owner: 'owner', name: 'repo' }]
	};

	file.undo({}, state);

	expect(state).toEqual({});
});
