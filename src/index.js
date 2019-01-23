#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Git } = require('@financial-times/tooling-helpers');
const runProcess = require('./lib/run-process');

async function main () {

    assert(process.argv[2], 'First argument must be the path to a workspace directory');
    assert(process.argv[3], 'Second argument must be the path to a script');
    assert(process.argv[4], 'Third argument must be targets - if multiple, must be comma separated');
    assert(process.argv[5], 'Fourth argument must be a name for the git branch to create');
    assert(process.argv[6], 'Fifth argument must be a GitHub personal access token');

    const workspacePath = path.resolve(process.argv[2]);
    const workspacePathExists = fs.existsSync(workspacePath);
    assert(workspacePathExists, `Workspace directory path does not exist: ${workspacePath}`);
    const workspacePathIsDirectory = fs.lstatSync(workspacePath).isDirectory();
    assert(workspacePathIsDirectory, `Workspace directory path is not a directory: ${workspacePath}`);

    const scriptPath = path.resolve(process.argv[3]);
    const scriptExists = fs.existsSync(scriptPath);
    assert(scriptExists, `Script does not exist: ${scriptPath}`);
    try {
        fs.accessSync(scriptPath, fs.constants.X_OK);
    } catch (err) {
        assert(false, `Script is not executable (try \`chmod +x\`): ${scriptPath}`);
    }

    let targets = (process.argv[4]) ? process.argv[4].split(',') : [];
    targets = targets.filter((value) => value);
    if (targets.length === 0) {
        throw new Error('No targets specified');
    }

    const gitBranchName = process.argv[5];
    const githubPersonalAccessToken = process.argv[6];

    console.log(`-- Workspace directory: ${workspacePath}`);
    console.log(`-- Script: ${scriptPath}`);
    console.log(`-- Target(s):\n\n   ${targets.join('\n   ')}`);

    for (let repository of targets) {
        console.log('\n===\n');

        const repositoryName = repository.split('/').pop();
        const cloneDirectory = `${workspacePath}/${repositoryName}`;

        const git = new Git({
            credentials: {
                type: Git.CREDENTIAL_TYPE_GITHUB_OAUTH,
                token: githubPersonalAccessToken
            }
        });

        try {
            console.log(`-- Cloning repository locally: ${repository}`);
            const gitRepo = await git.clone({ repository, directory: cloneDirectory });
            console.log(`-- Repository '${repositoryName}' cloned locally to ${cloneDirectory}`);

            await gitRepo.createBranchAndCheckout({ branch: gitBranchName });
            console.log(`-- Created and checked out new branch in local repository: ${gitBranchName}`);

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
                    cwd: gitRepo.workingDirectory,
                    env: scriptEnv
                }
            );

            console.log(scriptOutput);

            console.log(`-- Pushing branch ${gitBranchName} to remote 'origin'`);
            await gitRepo.pushCurrentBranchToRemote();

        } catch (err) {
            console.error(new Error(`Error running script for '${repository}': ${err.message}`));
        }
    }

}

main();
