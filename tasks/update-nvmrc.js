const fs = require('fs')

/**
 * Updates `.nvmrc` if it exists and adds changes to git (no commit).
 */
module.exports = async ({ git, workingDirectory, pinnedNodeVersion }) => {
	let madeChanges = false
	let commitMessage = '- `.nvmrc` - '

	const nmvrcFilename = '.nvmrc'
	const nmvrcFilepath = `${workingDirectory}/${nmvrcFilename}`

	const nvmrcExists = fs.existsSync(nmvrcFilepath)

	if (nvmrcExists) {
		const oldNvmrcContents = fs.readFileSync(nmvrcFilepath, {
			encoding: 'utf8',
		})

		const pinnedNodeVersionRegExp = new RegExp(
			pinnedNodeVersion.replace('.', '.'),
		)
		const changeRequired = !oldNvmrcContents.match(pinnedNodeVersionRegExp)

		if (changeRequired) {
			fs.writeFileSync(nmvrcFilepath, `${pinnedNodeVersion}\n`)

			console.log(`-- update-nvmrc: \`.nvmrc\` has been overwritten`)
			commitMessage += `updated, previously: \`${oldNvmrcContents.trim()}\``

			await git.add({ files: nmvrcFilename })
			madeChanges = true
		} else {
			const noChange = `no change, already set to ${pinnedNodeVersion}`
			console.log(`-- update-nvmrc: \`.nvmrc\` ${noChange}`)
			commitMessage += noChange
		}
	} else {
		fs.writeFileSync(nmvrcFilepath, `${pinnedNodeVersion}\n`)

		const nvmrCreated = 'created'
		console.log(`-- create-nvmrc: \`.nvmrc\` ${nvmrCreated}`)
		commitMessage += nvmrCreated

		await git.add({ files: nmvrcFilename })
	}

	return { madeChanges, commitMessage }
}
