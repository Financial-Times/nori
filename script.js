#!/usr/bin/env node

const git = require('@financial-times/git')

const tasks = require('./tasks')

const pinnedNodeVersion = '14.11'

async function main() {
	const workingDirectory = process.cwd()

	git.defaults({ workingDirectory })

	let taskResults = []

	taskResults.push(
		await tasks.updatePackageJsonEngines({
			git,
			workingDirectory,
			pinnedNodeVersion,
		}),
	)
	taskResults.push(
		await tasks.updateNvmrc({ git, workingDirectory, pinnedNodeVersion }),
	)
	taskResults.push(
		await tasks.updateCircleciConfig({
			git,
			workingDirectory,
			pinnedNodeVersion,
		}),
	)

	const changesToCommit = taskResults.some(({ madeChanges }) => madeChanges)
	if (!changesToCommit) {
		return false
	}

	const commitMessage = `Upgrade Node to v${pinnedNodeVersion}\n\nChanges:\n\n${taskResults
		.map(({ commitMessage }) => commitMessage)
		.join('\n')}`

	await git.commit({ message: commitMessage })
}

main()
