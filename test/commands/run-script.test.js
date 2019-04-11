const { fs, vol } = require('memfs');
const util = require('util');
const path = require('path');

const runScript = require('../../src/commands/run-script');

jest.mock('fs', () => {
	const { fs } = require('memfs');
	jest.spyOn(fs, 'access');
	return fs;
});

jest.mock('../../src/lib/run-process');

const runProcess = require('../../src/lib/run-process');

afterEach(() => {
	vol.reset();
	fs.access.mockReset();
	jest.clearAllMocks();
});

test('`run-script` command module exports an operation object', () => {
	expect(runScript).toEqual(
		expect.objectContaining({
			command: expect.stringMatching('run-script'),
			desc: expect.any(String),
			args: expect.arrayContaining([
				expect.objectContaining({
					name: expect.any(String),
					type: expect.any(String),
					message: expect.any(String),
				})
			]),
			handler: expect.any(Function),
			output: expect.any(String),
			input: expect.arrayContaining([
				expect.any(String)
			])
		})
	);
});

test('errors when `repos` is an empty array', async () => {
	await expect(
		runScript.handler({
			repos: []
		})
	).rejects.toThrowError(/no repos specified/i);
});

test('errors when `script` is empty', async () => {
	vol.fromJSON({
		hello: {}
	});
	await expect(
		runScript.handler({
			repos: [{ owner: 'Financial-Times', name: 'next-search-page' }],
			workspace: 'hello'
		})
	).rejects.toThrowError(/undefined/i);
});

test('errors when `script` does not exist', async () => {
	vol.fromJSON({
		hello: {}
	});
	await expect(
		runScript.handler({
			repos: [{ owner: 'Financial-Times', name: 'next-search-page' }],
			workspace: 'hello',
			script: 'somefile.js'
		})
	).rejects.toThrowError(/script does not exist/i);
});

test('errors when `script` is not executable', async () => {
	vol.fromJSON({
		hello: {},
		'transformation.js': 'Some transformation script'
	});

	// memfs does not currently implement permissions, so directly mock fs.access
	fs.access.mockImplementation(util.callbackify(async (file, mode) => {
		if (file.endsWith('transformation.js') && mode === fs.constants.X_OK) {
			throw new Error(`Error: EACCES: permission denied, access '${file}'`);
		}
	}));

	await expect(
		runScript.handler({
			repos: [{ owner: 'Financial-Times', name: 'next-search-page' }],
			workspace: 'hello',
			script: 'transformation.js'
		})
	).rejects.toThrowError(/script is not executable/i);
});

test('runs script', async () => {
	vol.fromJSON({
		hello: {},
		'transformation.js': 'Some transformation script'
	});

	fs.access.mockImplementation(util.callbackify(async () => undefined));

	await runScript.handler({
		repos: [{ owner: 'Financial-Times', name: 'next-search-page' }],
		workspace: 'hello',
		script: 'transformation.js'
	});

	expect(runProcess).toBeCalledWith(path.resolve('transformation.js'), expect.any(Object));
});
