const git = require('../lib/git')
const logger = require('../lib/logger')
const styles = require('../lib/styles')
const promiseAllErrors = require('../lib/promise-all-errors')

exports.handler = async (_, state) =>
	promiseAllErrors(
		state.repos.map(async repo => {
			await logger.logPromise(
				git.push({
					repository: 'origin',
					refspec: repo.localBranch,
					workingDirectory: repo.clone,
				}),
				`pushing ${styles.branch(repo.localBranch)} to ${styles.repo(
					`${repo.owner}/${repo.name}`,
				)}`,
			)

			repo.remoteBranch = repo.localBranch
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
