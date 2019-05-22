/* eslint-disable no-console */

const assert = require('assert');
const fs = require('mz/fs');
const path = require('path');
const git = require('@financial-times/git');

const { GitProcess } = require('dugite');
const constructDugiteExecArgs = require('@financial-times/git/src/helpers/construct-dugite-exec-args');
const handleDugiteExecResult = require('@financial-times/git/src/helpers/handle-dugite-exec-result');

const runProcess = require('../lib/run-process');

exports.args = [
	{ type: 'text', name: 'script', message: 'path to a script' },
	{ type: 'text', name: 'branch', message: 'branch to create' },
];

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.script
 * @param {string} argv.repos
 * @param {string} argv.branch
 */
exports.handler = async ({ script, branch }, state) => {
	const scriptPath = path.resolve(script);

	if (!(await fs.exists(scriptPath))) {
		assert(false, `Script does not exist: ${scriptPath}`);
	}

	try {
		await fs.access(scriptPath, fs.constants.X_OK);
	} catch (_) {
		assert(false, `Script is not executable (try \`chmod +x\`): ${scriptPath}`);
	}

	console.warn(`-- Script: ${scriptPath}`);
	console.warn(`-- Target(s):\n\n   ${state.repos.map(({ name }) => name).join('\n   ')}`);

	// must be serial until https://github.com/Financial-Times/tooling-helpers/issues/74
	// is resolved (or, add workingDirectory to all the options of the git methods)
	for (const repository of state.repos) {
		console.warn('\n===\n');

		git.defaults({ workingDirectory: repository.clone });

		try {
			await git.createBranch({ name: branch });
			await git.checkoutBranch({ name: branch });
			console.warn(`-- Created and checked out new branch in local repository: ${branch}`);

			const contextForScript = {
				TRANSFORMATION_RUNNER_RUNNING: true,
				// TRANSFORMATION_RUNNER_TARGET: remoteUrl, // TODO do we need this? and the other variables?
				TRANSFORMATION_RUNNER_TARGET_NAME: repository.name,
			};

			const scriptEnv = {
				...process.env,
				...contextForScript
			};

			console.warn(`-- Running script against local repository...\n`);

			const scriptOutput = await runProcess(
				scriptPath,
				{
					cwd: repository.clone,
					env: scriptEnv
				}
			);

			console.warn(scriptOutput);

			repository.localBranch = branch;
		} catch (error) {
			console.warn(new Error(`Error running script for '${repository.name}': ${error.message}`));
			throw error;
		}
	}
};

//TODO: this should be part of @financial-times/git
async function deleteBranch({ branch, workingDirectory }) {
	const dugiteExecArgs = constructDugiteExecArgs({
		command: 'branch',
		options: {
			'-D': true
		},
		positional: [
			branch
		]
	});

	const dugiteExecResult = await GitProcess.exec(dugiteExecArgs, workingDirectory)

	return handleDugiteExecResult({ dugiteExecResult, dugiteExecArgs });
}

exports.undo = (_, state) => (
	Promise.all(state.repos.map(async repo => {
		await deleteBranch({ branch: repo.localBranch, workingDirectory: repo.clone });

		delete repo.localBranch;
	}))
);

exports.command = 'run-script';
exports.desc = 'runs a script in a branch against all cloned repositories';
exports.input = ['clones'];
exports.output = 'localBranches';

