const git = require('@financial-times/git')
const logger = require('../lib/logger')

exports.handler = async (_, state) =>
	Promise.all(
		state.repos.map(async repo => {
			const repoLabel = `${repo.owner}/${repo.name}`
			logger.log(`push ${repoLabel}`, {
				message: `pushing ${repo.localBranch} to ${repoLabel}`,
			})
			await git.push({
				repository: 'origin',
				refspec: repo.localBranch,
				workingDirectory: repo.clone,
			})
			logger.log(`push ${repoLabel}`, {
				status: 'done',
				message: `pushed ${repo.localBranch} to ${repoLabel}`,
			})
			repo.remoteBranch = repo.localBranch
		}),
	)

exports.undo = (_, state) =>
	Promise.all(
		state.repos.map(async repo => {
			if (repo.remoteBranch) {
				const repoLabel = `${repo.owner}/${repo.name}`
				logger.log(`undo push ${repoLabel}`, {
					message: `deleting ${repo.remoteBranch} on ${repoLabel}`,
				})
				// the git push syntax is localbranch:remotebranch. without the colon,
				// they're the same. with nothing before the colon, it's "push nothing
				// to the remote branch", i.e. delete it.
				await git.push({
					workingDirectory: repo.clone,
					repository: 'origin',
					refspec: `:${repo.remoteBranch}`,
				})
				logger.log(`undo push ${repoLabel}`, {
					status: 'done',
					message: `deleted ${repo.remoteBranch} on ${repoLabel}`,
				})

				delete repo.remoteBranch
			}
		}),
	)

exports.command = 'push-branches'
exports.desc = 'push local branches to their remotes'
exports.input = ['clones', 'localBranches']
exports.output = 'remoteBranches'
exports.args = []
