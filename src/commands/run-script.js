#!/usr/bin/env node

/* eslint-disable no-console */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');

const git = require('@financial-times/git');
const runProcess = require('../lib/run-process');

const fsAccess = util.promisify((...args) => fs.access(...args));
const fsLstat = util.promisify((...args) => fs.lstat(...args));

/**
 * yargs builder function.
 *
 * @param {import('yargs/yargs').Yargs} yargs - Instance of yargs
 */
const builder = (yargs) => {

    return yargs
        .option('workspace', {
            alias: 'w',
            describe: 'Path to a workspace directory',
            demandOption: true,
            type: 'string'
        })
        .option('script', {
            alias: 's',
            describe: 'Path to a script',
            demandOption: true,
            type: 'string'
        })
        .option('targets', {
            describe: 'Target repositories (separate multiple targets with a space)',
            demandOption: true,
            type: 'array'
        })
        .option('branch', {
            alias: 'b',
            describe: 'Name for the git branch to create',
            demandOption: true,
            type: 'string'
        });
};

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.workspace
 * @param {string} argv.script
 * @param {string} argv.targets
 * @param {string} argv.branch
 */
const handler = async ({ workspace, script, targets, branch }) => {

    if (targets.length === 0) {
        throw new Error('No targets specified');
    }

    const workspacePath = path.resolve(workspace);
    await fsAccess(workspacePath).catch(
        () => assert(false, `Workspace directory path does not exist: ${workspacePath}`)
    );
    const workspacePathIsDirectory = (await fsLstat(workspacePath)).isDirectory();
    assert(workspacePathIsDirectory, `Workspace directory path is not a directory: ${workspacePath}`);

    const scriptPath = path.resolve(script);
    await fsAccess(scriptPath).catch(
        () => assert(false, `Script does not exist: ${scriptPath}`)
    );

    await fsAccess(scriptPath, fs.constants.X_OK).catch(
        () => assert(false, `Script is not executable (try \`chmod +x\`): ${scriptPath}`)
    );

    console.log(`-- Workspace directory: ${workspacePath}`);
    console.log(`-- Script: ${scriptPath}`);
    console.log(`-- Target(s):\n\n   ${targets.join('\n   ')}`);

    for (let repository of targets) {
        console.log('\n===\n');

        const repositoryName = repository.split('/').pop().replace('.git', '');
        const cloneDirectory = `${workspacePath}/${repositoryName}`;

        git.defaults({ workingDirectory: cloneDirectory });

        try {
            console.log(`-- Cloning repository locally: ${repository}`);
            await git.clone({ origin: 'origin', repository });
            console.log(`-- Repository '${repositoryName}' cloned locally to ${cloneDirectory}`);

            await git.createBranch({ name: branch });
            await git.checkoutBranch({ name: branch });
            console.log(`-- Created and checked out new branch in local repository: ${branch}`);

            const contextForScript = {
                TRANSFORMATION_RUNNER_RUNNING: true,
                TRANSFORMATION_RUNNER_TARGET: repository,
                TRANSFORMATION_RUNNER_TARGET_NAME: repositoryName,
            };

            const scriptEnv = {
                ...process.env,
                ...contextForScript
            };

            console.log(`-- Running script against local repository...\n`);

            const scriptOutput  = await runProcess(
                scriptPath,
                {
                    cwd: cloneDirectory,
                    env: scriptEnv
                }
            );

            console.log(scriptOutput);

            console.log(`-- Pushing branch ${branch} to remote 'origin'`);
            await git.push({ repository: 'origin', refspec: branch });

        } catch (error) {
            console.error(new Error(`Error running script for '${repository}': ${error.message}`));
        }
    }
};

/**
 * @see https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 */
module.exports = {
	command: 'run-script',
	desc: 'Run a script against repositories',
	builder,
	handler,
};
