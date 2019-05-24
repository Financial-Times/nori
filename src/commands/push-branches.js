const path = require('path');
const git = require('@financial-times/git');

const { workspacePath } = require('../lib/constants');

exports.handler = async (_, state) => Promise.all(
	state.repos.map(async repo => {
		const cloneDirectory = path.join(workspacePath, repo.name);
		await git.push({ repository: 'origin', refspec: repo.localBranch, workingDirectory: cloneDirectory });
		repo.remoteBranch = repo.localBranch;
	})
);

exports.undo = (_, state) => {
	Promise.all(state.repos.map(async repo => {
		const cloneDirectory = path.join(workspacePath, repo.name);
		// the git push syntax is localbranch:remotebranch. without the colon,
		// they're the same. with nothing before the colon, it's "push nothing
		// to the remote branch", i.e. delete it.
		await git.push({
			workingDirectory: cloneDirectory,
			repository: 'origin',
			refspec: `:${repo.remoteBranch}`
		});

		delete repo.remoteBranch;
	}))
};

exports.command = 'push-branches';
exports.desc = 'push local branches to their remotes';
exports.input = ['repos', 'localBranches'];
exports.output = 'remoteBranches';
exports.args = [];
