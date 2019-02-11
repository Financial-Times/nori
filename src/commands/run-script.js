#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');

const { Git } = require('@financial-times/tooling-helpers');
const runProcess = require('../lib/run-process');

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
        })
        .option('token', {
            describe: 'GitHub Personal Access Token (must have all repo scopes)',
            demandOption: true,
            type: 'string'
        })
};

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.workspace
 * @param {string} argv.script
 * @param {string} argv.targets
 * @param {string} argv.branch
 * @param {string} argv.token
 */
const handler = async ({ workspace, script, targets, branch, token }) => {

    if (targets.length === 0) {
        throw new Error('No targets specified');
    }

    const workspacePathExists = fs.existsSync(workspace);
    assert(workspacePathExists, `Workspace directory path does not exist: ${workspace}`);
    const workspacePathIsDirectory = fs.lstatSync(workspace).isDirectory();
    assert(workspacePathIsDirectory, `Workspace directory path is not a directory: ${workspace}`);

    const scriptExists = fs.existsSync(script);
    assert(scriptExists, `Script does not exist: ${script}`);
    try {
        fs.accessSync(script, fs.constants.X_OK);
    } catch (err) {
        assert(false, `Script is not executable (try \`chmod +x\`): ${script}`);
    }

    console.log(`-- Workspace directory: ${workspace}`);
    console.log(`-- Script: ${script}`);
    console.log(`-- Target(s):\n\n   ${targets.join('\n   ')}`);

    for (let repository of targets) {
        console.log('\n===\n');

        const repositoryName = repository.split('/').pop();
        const cloneDirectory = `${workspace}/${repositoryName}`;

        const git = new Git({
            credentials: {
                type: Git.CREDENTIAL_TYPE_GITHUB_OAUTH,
                token
            }
        });

        try {
            console.log(`-- Cloning repository locally: ${repository}`);
            const gitRepo = await git.clone({ repository, directory: cloneDirectory });
            console.log(`-- Repository '${repositoryName}' cloned locally to ${cloneDirectory}`);

            await gitRepo.createBranchAndCheckout({ branch });
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
                script,
                {
                    cwd: gitRepo.workingDirectory,
                    env: scriptEnv
                }
            );

            console.log(scriptOutput);

            console.log(`-- Pushing branch ${branch} to remote 'origin'`);
            await gitRepo.pushCurrentBranchToRemote();

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
