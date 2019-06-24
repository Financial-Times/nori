const { fs, vol } = require('memfs')
const util = require('util')
const path = require('path')

const runScript = require('../../src/commands/run-script')

jest.mock('fs', () => {
	const { fs } = require('memfs')
	jest.spyOn(fs, 'access')
	return fs
})

jest.mock('../../src/lib/run-process')

const runProcess = require('../../src/lib/run-process')

afterEach(() => {
	vol.reset()
	fs.access.mockReset()
	jest.clearAllMocks()
})

test('errors when `script` does not exist', async () => {
	vol.fromJSON({
		hello: {},
	})
	const scriptArg = runScript.args.find(arg => arg.name === 'script')

	await expect(scriptArg.verify('somefile.js')).resolves.toMatch(
		/somefile.js does not exist/i,
	)
})

test('errors when `script` is not executable', async () => {
	vol.fromJSON({
		hello: {},
		'transformation.js': 'Some transformation script',
	})

	// memfs does not currently implement permissions, so directly mock fs.access
	fs.access.mockImplementation(
		util.callbackify(async (file, mode) => {
			if (file.endsWith('transformation.js') && mode === fs.constants.X_OK) {
				throw new Error(`Error: EACCES: permission denied, access '${file}'`)
			}
		}),
	)

	const scriptArg = runScript.args.find(arg => arg.name === 'script')

	await expect(scriptArg.verify('transformation.js')).resolves.toMatch(
		/transformation.js is not executable/i,
	)
})

test('runs script', async () => {
	vol.fromJSON({
		hello: {},
		'transformation.js': 'Some transformation script',
	})

	fs.access.mockImplementation(util.callbackify(async () => undefined))

	await runScript.handler(
		{
			workspace: 'hello',
			script: 'transformation.js',
		},
		{
			repos: [{ owner: 'Financial-Times', name: 'next-search-page' }],
		},
	)

	expect(runProcess).toBeCalledWith(
		path.resolve('transformation.js'),
		expect.any(Object),
	)
})
