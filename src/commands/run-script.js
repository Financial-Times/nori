const fs = require('mz/fs')
const path = require('path')

const git = require('@financial-times/git')
const runProcess = require('../lib/run-process')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const incrementSuffix = require('../lib/increment-suffix')
const promiseAllErrors = require('../lib/promise-all-errors')

const formatBranch = v => `nori/${v}`

exports.args = [
	{
		type: 'text',
		name: 'script',
		message: 'path to a script',
		validate: async script => {
			const scriptPath = path.resolve(script)

			if (!(await fs.exists(scriptPath))) {
				return `${script} does not exist`
			}

			try {
				await fs.access(scriptPath, fs.constants.X_OK)
			} catch (_) {
				return `${script} is not executable. run \`chmod +x ${script}\` in your shell to make it executable`
			}

			return true
		},
	},
	{
		type: 'text',
		name: 'branch',
		format: formatBranch,
		result: formatBranch,
		message: 'branch to create',
	},
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
	const scriptPath = path.resolve(script)

	return promiseAllErrors(
		state.repos.map(async repository => {
			const repoLabel = `${repository.owner}/${repository.name}`

			try {
				// if the branch we're trying to create already exists, create `branch-1`
				// although actually a bunch of `branch-n` might already exist, so find
				// all of them, get the highest, increment its number and use _that_
				const branches = await git.listBranches({
					workingDirectory: repository.clone,
				})

				const repoBranch = incrementSuffix(branches, branch)

				logger.log(repoLabel, {
					message: `creating branch ${styles.branch(
						repoBranch,
					)} in ${styles.repo(repoLabel)}${
						branch !== repoBranch
							? ` (${styles.branch(branch)} already exists)`
							: ''
					}`,
				})

				await git.createBranch({
					name: repoBranch,
					workingDirectory: repository.clone,
				})
				await git.checkoutBranch({
					name: repoBranch,
					workingDirectory: repository.clone,
				})

				const contextForScript = {
					TRANSFORMATION_RUNNER_RUNNING: true,
					// TRANSFORMATION_RUNNER_TARGET: remoteUrl, // TODO do we need this? and the other variables?
					TRANSFORMATION_RUNNER_TARGET_NAME: repository.name,
				}

				const scriptEnv = {
					...process.env,
					...contextForScript,
				}

				logger.log(repoLabel, {
					message: `running ${styles.url(scriptPath)} in ${styles.repo(
						repoLabel,
					)}`,
				})

				const scriptOutput = await runProcess(scriptPath, {
					cwd: repository.clone,
					env: scriptEnv,
				})

				logger.log(repoLabel, {
					status: 'done',
					message: `run script in ${styles.repo(repoLabel)}:`,
				})

				// eslint-disable-next-line no-console
				console.warn(scriptOutput)

				repository.localBranch = repoBranch
			} catch (error) {
				logger.log(repoLabel, {
					status: 'fail',
					message: `error running script for ${styles.repo(repoLabel)}`,
					error,
				})

				throw error
			}
		}),
	)
}

exports.undo = (_, state) =>
	Promise.all(
		state.repos.map(async repo => {
			if (repo.localBranch) {
				// checkout central branch first because you can't delete the branch you're on
				await git.checkoutBranch({
					name: repo.centralBranch,
					workingDirectory: repo.clone,
				})

				logger.logPromise(
					await git.deleteBranch({
						branch: repo.localBranch,
						workingDirectory: repo.clone,
					}),
					`deleting branch ${styles.branch(repo.localBranch)} in ${styles.repo(
						`${repo.owner}/${repo.name}`,
					)}`,
				)

				delete repo.localBranch
			}
		}),
	)
exports.command = 'run-script'
exports.desc = 'run a script in a branch against all cloned repositories'
exports.input = ['clones']
exports.output = 'localBranches'
