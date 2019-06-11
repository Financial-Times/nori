#!/usr/bin/env node

/* eslint-disable no-console */

const assert = require('assert')
const fs = require('mz/fs')
const path = require('path')
const git = require('@financial-times/git')
const rmfr = require('rmfr')

const { workspacePath } = require('../lib/constants')
const runProcess = require('../lib/run-process')

exports.args = [
	{ type: 'text', name: 'script', message: 'path to a script' },
	{ type: 'text', name: 'branch', message: 'branch to create' },
]

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.script
 * @param {string} argv.repos
 * @param {string} argv.branch
 */
exports.handler = async ({ script, branch }, state) => {
	if (state.repos.length === 0) {
		throw new Error('No repos specified')
	}

	const scriptPath = path.resolve(script)

	if (!(await fs.exists(scriptPath))) {
		assert(false, `Script does not exist: ${scriptPath}`)
	}

	try {
		await fs.access(scriptPath, fs.constants.X_OK)
	} catch (_) {
		assert(false, `Script is not executable (try \`chmod +x\`): ${scriptPath}`)
	}

	console.warn(`-- Script: ${scriptPath}`)
	console.warn(
		`-- Target(s):\n\n   ${state.repos.map(({ name }) => name).join('\n   ')}`,
	)

	// must be serial until https://github.com/Financial-Times/tooling-helpers/issues/74
	// is resolved (or, add workingDirectory to all the options of the git methods)
	for (const repository of state.repos) {
		console.warn('\n===\n')

		const cloneDirectory = path.join(workspacePath, repository.name)
		const remoteUrl = `git@github.com:${repository.owner}/${
			repository.name
		}.git`

		git.defaults({ workingDirectory: cloneDirectory })

		try {
			if (await fs.exists(cloneDirectory)) {
				console.warn(`-- Updating local clone: ${repository.name}`)
				await git.checkoutBranch({ name: 'master' })
				console.warn(
					`-- Repository '${repository.name}' updated in ${cloneDirectory}`,
				)
			} else {
				console.warn(`-- Cloning repository locally: ${remoteUrl}`)
				await git.clone({ origin: 'origin', repository: remoteUrl })
				console.warn(
					`-- Repository '${
						repository.name
					}' cloned locally to ${cloneDirectory}`,
				)
			}

			await git.createBranch({ name: branch })
			await git.checkoutBranch({ name: branch })
			console.warn(
				`-- Created and checked out new branch in local repository: ${branch}`,
			)

			const contextForScript = {
				TRANSFORMATION_RUNNER_RUNNING: true,
				TRANSFORMATION_RUNNER_TARGET: remoteUrl,
				TRANSFORMATION_RUNNER_TARGET_NAME: repository.name,
			}

			const scriptEnv = {
				...process.env,
				...contextForScript,
			}

			console.warn(`-- Running script against local repository...\n`)

			const scriptOutput = await runProcess(scriptPath, {
				cwd: cloneDirectory,
				env: scriptEnv,
			})

			console.warn(scriptOutput)
			console.warn(`-- Pushing branch ${branch} to remote 'origin'`)
			await git.push({ repository: 'origin', refspec: branch })

			repository.remoteBranch = branch
		} catch (error) {
			console.warn(
				new Error(
					`Error running script for '${repository.name}': ${error.message}`,
				),
			)
			throw error
		}
	}
}

exports.undo = ({ branch }, state) => {
	Promise.all(
		state.repos.map(async repo => {
			const cloneDirectory = path.join(workspacePath, repo.name)
			// the git push syntax is localbranch:remotebranch. without the colon,
			// they're the same. with nothing before the colon, it's "push nothing
			// to the remote branch", i.e. delete it.
			await git.push({
				workingDirectory: cloneDirectory,
				repository: 'origin',
				refspec: `:${branch}`,
			})

			// i say we take off and nuke the whole site from orbit. it's the only way to be sure
			await rmfr(cloneDirectory)

			delete repo.remoteBranch
		}),
	)
}

exports.command = 'run-script'
exports.desc = 'clone repositories and run a script against them'
exports.input = ['repos']
exports.output = 'branches'
