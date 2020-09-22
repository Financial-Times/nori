const PackageJson = require('@financial-times/package-json')

/**
 * Updates `engines.node` field in `package.json` and adds changes to git (no commit).
 */
module.exports = async ({ git, workingDirectory, pinnedNodeVersion }) => {
	let madeChanges = false
	let commitMessage = '- `package.json` field `engines.node` - '

	const packageJsonFilename = 'package.json'
	const packageJsonFilepath = `${workingDirectory}/${packageJsonFilename}`

	const packageJson = new PackageJson({ filepath: packageJsonFilepath })

	const pinnedNodeVersionMajor = pinnedNodeVersion.substr(
		0,
		pinnedNodeVersion.lastIndexOf('.'),
	)

	packageJson.setField('engines', {
		node: `${pinnedNodeVersionMajor}.x`,
	})

	if (packageJson.hasChangesToWrite()) {
		packageJson.writeChanges()

		const lastChangelogEntry = packageJson.getChangelog.lastEntry()
		const packageJsonEnginesNodeWasSet =
			lastChangelogEntry.previousValue && lastChangelogEntry.previousValue.node
		if (packageJsonEnginesNodeWasSet) {
			const previousNodeVersion = lastChangelogEntry.previousValue.node
			commitMessage += `updated, previously: \`${previousNodeVersion}\``
		} else {
			commitMessage += 'added, did not previously exist'
		}

		console.log(
			`-- update-package-json-engines: \`engines.node\` field set in \`package.json\``,
		)

		await git.add({ files: packageJsonFilename })
		madeChanges = true
	} else {
		commitMessage += `no change, already \`${pinnedNodeVersionMajor}\``
		console.log(
			`-- update-package-json-engines: no change to \`engines.node\` field in \`package.json\``,
		)
	}

	return { madeChanges, commitMessage }
}
