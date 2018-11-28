#!/usr/bin/env node

const assert = require('assert');
const path = require('path');

const { Git } = require('@financial-times/tooling-helpers').git;
const runProcess = require('./lib/run-process');

(async () => {

    assert(process.argv[2], 'First argument must be a workspace directory');
    assert(process.argv[3], 'Second argument must be a path to the transformation directory');
    assert(process.argv[4], 'Third argument must be targets - if multiple, must be comma separated');

    const workspaceDirectory = process.argv[2];
    const transformationPath = process.argv[3];
    const targets = (process.argv[4]) ? process.argv[4].split(',') : [];

    if (targets.length === 0) {
        throw new Error('No targets specified');
    }

    const fullTransformationPath = path.resolve(`${process.cwd()}/${transformationPath}`);
    const transformationConfig = require(fullTransformationPath);

    console.log(`-- Workspace directory: ${workspaceDirectory}`);
    console.log(`-- Transformation: ${transformationConfig.name}`);
    console.log(`-- Target(s):\n\n   ${targets.join('\n   ')}`);

    for (let repository of targets) {

        console.log('\n===\n');
        console.log(`-- Cloning repository: ${repository}`);

        const repositoryName = repository.split('/').pop();
        const cloneDirectory = `${workspaceDirectory}/${repositoryName}`;

        const git = new Git();
        const gitRepo = await git.clone({ repository, directory: cloneDirectory });

        console.log(`-- Repository cloned to ${cloneDirectory}`);
        console.log(`-- Running transformation against clone of repository: ${repositoryName} (${cloneDirectory})\n`);

        try {
            const contextForTransformation = {
                TRANSFORMER_RUNNING: true,
                TRANSFORMER_TARGET: repository,
            };

            const transformationCommandEnv = {
                ...process.env,
                ...contextForTransformation
            };

            const processOutput  = await runProcess(
                // TODO: Allow this to work with one-liner commands
                `${fullTransformationPath}/${transformationConfig.command}`,
                {
                    cwd: gitRepo.workingDirectory,
                    env: transformationCommandEnv
                }
            );

            console.log(processOutput);
        } catch (err) {
            console.error(new Error(`Error running transformation for '${repository}': ${err.message}`));
        }

    }

})();
