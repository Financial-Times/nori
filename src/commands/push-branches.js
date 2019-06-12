const git = require('@financial-times/git')

exports.handler = async (_, state) =>
	Promise.all(
		state.repos.map(async repo => {
			await git.push({
				repository: 'origin',
				refspec: repo.localBranch,
				workingDirectory: repo.clone,
			})
			repo.remoteBranch = repo.localBranch
		}),
	)

exports.undo = (_, state) => {
	Promise.all(
		state.repos.map(async repo => {
			// the git push syntax is localbranch:remotebranch. without the colon,
			// they're the same. with nothing before the colon, it's "push nothing
			// to the remote branch", i.e. delete it.
			await git.push({
				workingDirectory: repo.clone,
				repository: 'origin',
				refspec: `:${repo.remoteBranch}`,
			})

			delete repo.remoteBranch
		}),
	)
}

exports.command = 'push-branches'
exports.desc = 'push local branches to their remotes'
exports.input = ['clones', 'localBranches']
exports.output = 'remoteBranches'
exports.args = []
