#!/usr/bin/env node

/* eslint-disable no-console */

import * as assert from 'assert';
import * as fs from 'mz/fs';
import * as path from 'path';
import * as util from 'util';
import * as _mkdirp from 'mkdirp';
import git from '@financial-times/git';

const mkdirp = util.promisify(_mkdirp);

import runProcess from '../lib/run-process';

export const args = [
	{type: 'text', name: 'script', message: 'path to a script'},
	{type: 'text', name: 'branch', message: 'branch to create'},
];

const workspacePath = path.join(process.env.HOME, '.config/transformation-runner-workspace');

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.script
 * @param {string} argv.repos
 * @param {string} argv.branch
 */
export const handler = async ({ script, repos, branch }) => {
	if(repos.length === 0) {
		throw new Error('No repos specified');
	}

	const scriptPath = path.resolve(script);

	if(!(await fs.exists(scriptPath))) {
		assert(false, `Script does not exist: ${scriptPath}`);
	}

	if(!(await fs.exists(scriptPath, fs.constants.X_OK))) {
		assert(false, `Script is not executable (try \`chmod +x\`): ${scriptPath}`);
	}

	await mkdirp(workspacePath);

	console.log(`-- Script: ${scriptPath}`);
	console.log(`-- Target(s):\n\n   ${repos.map(({name}) => name).join('\n   ')}`);

	const branches = [];

	for (let repository of repos) {
		console.log('\n===\n');

		const cloneDirectory = path.join(workspacePath, repository.name);
		const remoteUrl = `git@github.com:${repository.owner}/${repository.name}.git`;

		git.defaults({ workingDirectory: cloneDirectory });

		try {
			if(await fs.exists(cloneDirectory)) {
				console.log(`-- Updating local clone: ${repository.name}`);
				await git.checkoutBranch({ name: 'master' });
				console.log(`-- Repository '${repository.name}' updated in ${cloneDirectory}`);
			} else {
				console.log(`-- Cloning repository locally: ${remoteUrl}`);
				await git.clone({ origin: 'origin', repository: remoteUrl });
				console.log(`-- Repository '${repository.name}' cloned locally to ${cloneDirectory}`);
			}

			await git.createBranch({ name: branch });
			await git.checkoutBranch({ name: branch });
			console.log(`-- Created and checked out new branch in local repository: ${branch}`);

			const contextForScript = {
				TRANSFORMATION_RUNNER_RUNNING: true,
				TRANSFORMATION_RUNNER_TARGET: remoteUrl,
				TRANSFORMATION_RUNNER_TARGET_NAME: repository.name,
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

			branches.push(branch);
		} catch (error) {
			console.error(new Error(`Error running script for '${repository.name}': ${error.message}`));
			throw error;
		}
	}

	return branches;
};

export const command = 'run-script';
export const desc = 'clone repositories and run a script against them';
export const input = ['repos'];
export const output = 'branches';

