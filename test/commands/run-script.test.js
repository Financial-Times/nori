const yargs = require('yargs');
const {fs, vol} = require('memfs');
const util = require('util');

const runScript = require('../../src/commands/run-script');

const git = require('@financial-times/git');

jest.mock('fs', () => require('memfs').fs);

const mockConsoleWarn = jest
    .spyOn(console, 'warn')
    .mockImplementation(message => message);

let mockFsAccess;

beforeEach(() => {
    mockFsAccess = jest.spyOn(fs, 'access');
});

afterEach(() => {
    vol.reset();
    mockFsAccess.mockRestore();
    jest.clearAllMocks();
});

test('`run-script` command module exports an object that can be used by yargs', () => {
    expect(runScript).toEqual(
        expect.objectContaining({
            command: expect.stringMatching('run-script'),
            desc: expect.any(String),
            builder: expect.any(Function),
            handler: expect.any(Function)
        })
    );
});

test('yargs can load the `run-script` command without any errors or warnings', () => {
    expect(() => {
        yargs.command(
            runScript.command,
            runScript.desc,
            runScript.builder,
            runScript.handler
        ).argv;
    }).not.toThrow();

    // yargs uses `console.warn` to raise errors about incorrect types for some args to the `command` method
    expect(mockConsoleWarn).not.toBeCalled();
});

test('errors when `targets` is an empty array', async () => {
    await expect(
        runScript.handler({
            targets: []
        })
    ).rejects.toThrowError(/no targets specified/i);
});

test('errors when `script` is empty', async () => {
    vol.fromJSON({
        hello: {}
    });
    await expect(
        runScript.handler({
            targets: ['git@github.com:Financial-Times/next-search-page'],
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
            targets: ['git@github.com:Financial-Times/next-search-page'],
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
    mockFsAccess.mockImplementation(util.callbackify(async (file, mode) => {
        if(file.endsWith('transformation.js') && mode === fs.constants.X_OK) {
            throw new Error(`Error: EACCES: permission denied, access '${file}'`);
        }
    }));
    await expect(
        runScript.handler({
            targets: ['git@github.com:Financial-Times/next-search-page'],
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
    mockFsAccess.mockImplementation(util.callbackify(async () => undefined));
    await runScript.handler({
        targets: ['git@github.com:Financial-Times/next-search-page'],
        workspace: 'hello',
        script: 'transformation.js'
    });

    expect(git.defaults).toBeCalled();
});
