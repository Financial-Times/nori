const git = require('@financial-times/git')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const promiseAllErrors = require('../lib/promise-all-errors')
const incrementSuffix = require('../lib/increment-suffix')

exports.handler = async (_, state) =>
	promiseAllErrors(
		state.repos.map(async repo => {
			const branches = await git.listBranches({
				workingDirectory: repo.clone,
				remote: true,
			})
			const repoBranch = incrementSuffix(branches, repo.localBranch)

			await logger.logPromise(
				git.push({
					repository: 'origin',
					refspec: `${repo.localBranch}:${repoBranch}`,
					workingDirectory: repo.clone,
				}),
				`pushing ${styles.branch(repo.localBranch)} to ${styles.repo(
					`${repo.owner}/${repo.name}`,
				)}${
					repoBranch !== repo.localBranch
						? ` (as ${styles.branch(repoBranch)} because ${styles.branch(
								repo.localBranch,
						  )} already exists)`
						: ''
				}`,
			)

			repo.remoteBranch = repoBranch
		}),
	)

exports.undo = (_, state) =>
	promiseAllErrors(
		state.repos.map(async repo => {
			if (repo.remoteBranch) {
				// the git push syntax is localbranch:remotebranch. without the colon,
				// they're the same. with nothing before the colon, it's "push nothing
				// to the remote branch", i.e. delete it.
				await logger.logPromise(
					git.push({
						workingDirectory: repo.clone,
						repository: 'origin',
						refspec: `:${repo.remoteBranch}`,
					}),
					`deleting ${styles.branch(repo.remoteBranch)} on ${styles.repo(
						`${repo.owner}/${repo.name}`,
					)}`,
				)

				delete repo.remoteBranch
			}
		}),
	)

exports.command = 'push-branches'
exports.desc = 'push local branches to their remotes'
exports.input = ['clones', 'localBranches']
exports.output = 'remoteBranches'
exports.args = []
