const git = require('@financial-times/git')
const { GitProcess } = require('dugite')
const constructDugiteExecArgs = require('@financial-times/git/src/helpers/construct-dugite-exec-args')
const handleDugiteExecResult = require('@financial-times/git/src/helpers/handle-dugite-exec-result')

//TODO: these should be part of @financial-times/git
async function deleteBranch({ branch, workingDirectory }) {
	const dugiteExecArgs = constructDugiteExecArgs({
		command: 'branch',
		options: {
			'-D': true,
		},
		positional: [branch],
	})

	const dugiteExecResult = await GitProcess.exec(
		dugiteExecArgs,
		workingDirectory,
	)

	return handleDugiteExecResult({ dugiteExecResult, dugiteExecArgs })
}

async function listBranches({ workingDirectory, remote = false }) {
	const dugiteExecArgs = constructDugiteExecArgs({
		command: 'branch',
		options: {
			'-r': remote,
		},
		positional: [],
	})

	const dugiteExecResult = await GitProcess.exec(
		dugiteExecArgs,
		workingDirectory,
	)

	handleDugiteExecResult({ dugiteExecResult, dugiteExecArgs })

	return dugiteExecResult.stdout
		.split('\n')
		.map(line =>
			line
				.replace(/^\*/, '')
				.trim()
				.replace(/^origin(?:\/HEAD -> origin)?\//, ''),
		)
		.filter(Boolean)
}

module.exports = Object.assign(
	{
		deleteBranch,
		listBranches,
	},
	git,
)
