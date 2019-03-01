#!/usr/bin/env node

/* eslint-disable no-console */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');
const mkdirp = util.promisify(require('mkdirp'));
const git = require('@financial-times/git');

const runProcess = require('../lib/run-process');

const exists = (...args) => util.promisify(fs.access)(...args).then(() => true, () => false);

/**
 * yargs builder function.
 *
 * @param {import('yargs/yargs').Yargs} yargs - Instance of yargs
 */
const builder = (yargs) => {

    return yargs
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

const workspacePath = path.join(process.env.HOME, '.config/transformation-runner-workspace');

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

    if(!(await exists(scriptPath))) {
        assert(false, `Script does not exist: ${scriptPath}`);
    }

    if(!(await exists(scriptPath, fs.constants.X_OK))) {
        assert(false, `Script is not executable (try \`chmod +x\`): ${scriptPath}`);
    }

    await mkdirp(workspacePath);

    // TODO konmari logging
    console.log(`-- Script: ${scriptPath}`);
    console.log(`-- Target(s):\n\n   ${targets.join('\n   ')}`);

    const branches = [];

    // TODO parallel
    for (let repository of targets) {
        console.log('\n===\n');

        const repositoryName = repository.split('/').pop().replace('.git', '');
        const cloneDirectory = path.join(workspacePath, repositoryName);

        git.defaults({ workingDirectory: cloneDirectory });

        try {
            if(await exists(cloneDirectory)) {
                console.log(`-- Updating local clone: ${repository}`);
                await git.checkoutBranch({ name: 'master' });
                // TODO reset & pull
                console.log(`-- Repository '${repositoryName}' updated in ${cloneDirectory}`);
            } else {
                console.log(`-- Cloning repository locally: ${repository}`);
                await git.clone({ origin: 'origin', repository });
                console.log(`-- Repository '${repositoryName}' cloned locally to ${cloneDirectory}`);
            }

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

            // TODO don't push if no changes
            console.log(`-- Pushing branch ${branch} to remote 'origin'`);
            await git.push({ repository: 'origin', refspec: branch });

            branches.push(branch);
        } catch (error) {
            console.error(new Error(`Error running script for '${repository}': ${error.message}`));
            throw error;
        }

        return branches;
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
