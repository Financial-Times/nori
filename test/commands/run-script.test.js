const yargs = require('yargs');
const mockFs = require('mock-fs');

const runScript = require('../../src/commands/run-script');

jest.mock('@financial-times/tooling-helpers');
const { git } = require('@financial-times/tooling-helpers');

const mockConsoleWarn = jest
    .spyOn(console, 'warn')
    .mockImplementation(message => message);

afterEach(() => {
    mockFs.restore();
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

    // yargs uses `console.warn` to raise errors about incorrect types for some arguments to the `command` method
    expect(mockConsoleWarn).not.toBeCalled();
});

test('errors when `targets` is an empty array', async () => {
    await expect(
        runScript.handler({
            targets: []
        })
    ).rejects.toThrowError(/no targets specified/i);
});

test('errors when `workspace` directory does not exist', async () => {
    await expect(
        runScript.handler({
            targets: ['git@github.com:Financial-Times/next-search-page'],
            workspace: 'hello'
        })
    ).rejects.toThrowError(/path does not exist/i);
});

test('errors when `workspace` is not a directory', async () => {
    mockFs({
        hello: 'some file contents'
    });
    await expect(
        runScript.handler({
            targets: ['git@github.com:Financial-Times/next-search-page'],
            workspace: 'hello'
        })
    ).rejects.toThrowError(/path is not a directory/i);
});

test('errors when `script` is empty', async () => {
    mockFs({
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
    mockFs({
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
    mockFs({
        hello: {},
        'transformation.js': 'Some transformation script'
    });
    await expect(
        runScript.handler({
            targets: ['git@github.com:Financial-Times/next-search-page'],
            workspace: 'hello',
            script: 'transformation.js'
        })
    ).rejects.toThrowError(/script is not executable/i);
});

// TODO: Add this when we have a proper logger
test.skip('runs script', async () => {
    mockFs({
        hello: {},
        'transformation.js': mockFs.file({
            mode: 0o0777,
            content: 'Some transformation script'
        })
    });
    await runScript.handler({
        targets: ['git@github.com:Financial-Times/next-search-page'],
        workspace: 'hello',
        script: 'transformation.js'
    });

    expect(git.defaults).toBeCalled();
});
