#!/usr/bin/env node

const assert = require('assert');
const path = require('path');

const { Git } = require('@financial-times/tooling-helpers').git;
const runProcess = require('./lib/run-process');

(async function main () {

    assert(process.argv[2], 'First argument must be a workspace directory');
    assert(process.argv[3], 'Second argument must be a path to the transformation directory');
    assert(process.argv[4], 'Third argument must be targets - if multiple, must be comma separated');

    const workspaceDirectory = process.argv[2];
    const transformationPath = path.resolve(process.argv[3]);

    let targets = (process.argv[4]) ? process.argv[4].split(',') : [];
    targets = targets.filter((value) => value);
    if (targets.length === 0) {
        throw new Error('No targets specified');
    }

    const transformationName = transformationPath.split('/').filter((value) => value).pop();
    const transformationConfig = require(transformationPath);

    let command = transformationConfig.command;
    const isRelativeScriptPath = (command.substring(0, 2) === './');
    if (isRelativeScriptPath) {
        command = `${transformationPath}/${command}`;
    }

    const gitBranchName = `transformation-${transformationName}`;

    console.log(`-- Workspace directory: ${workspaceDirectory}`);
    console.log(`-- Transformation: ${transformationConfig.name}`);
    console.log(`-- Target(s):\n\n   ${targets.join('\n   ')}`);

    for (let repository of targets) {
        console.log('\n===\n');

        const repositoryName = repository.split('/').pop();
        const cloneDirectory = `${workspaceDirectory}/${repositoryName}`;

        const git = new Git();

        try {
            console.log(`-- Cloning repository locally: ${repository}`);
            const gitRepo = await git.clone({ repository, directory: cloneDirectory });
            console.log(`-- Repository '${repositoryName}' cloned locally to ${cloneDirectory}`);

            await gitRepo.createBranchAndCheckout({ branch: gitBranchName });
            console.log(`-- Created and checked out new branch in local repository: ${gitBranchName}`);

            const contextForTransformation = {
                TRANSFORMATION_RUNNER_RUNNING: true,
                TRANSFORMATION_RUNNER_TARGET: repository,
                TRANSFORMATION_RUNNER_TARGET_NAME: repositoryName,
            };

            const transformationCommandEnv = {
                ...process.env,
                ...contextForTransformation
            };

            console.log(`-- Running transformation against local repository...\n`);

            const transformationOutput  = await runProcess(
                command,
                {
                    cwd: gitRepo.workingDirectory,
                    env: transformationCommandEnv
                }
            );

            console.log(transformationOutput);

            console.log(`-- Pushing branch ${gitBranchName} to remote 'origin'`);
            await gitRepo.pushCurrentBranchToRemote();

        } catch (err) {
            console.error(new Error(`Error running transformation for '${repository}': ${err.message}`));
        }
    }

})();
