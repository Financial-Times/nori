#!/usr/bin/env node

const fs = require('fs')

const git = require('@financial-times/git')

async function run() {
	const workingDirectory = process.cwd()

	const [runbookFilename] = fs
		.readdirSync(workingDirectory)
		.filter(filename => /runbook\.md/i.test(filename))

	if (!runbookFilename) return

	const runbookFilepath = `${workingDirectory}/${runbookFilename}`

	const runbookString = fs.readFileSync(runbookFilepath, 'utf-8')

	const regex = /(## Supported By[\n]+)[a-z\-]+(\n[.*]*)/

	const updatedRunbookString = runbookString.replace(
		regex,
		'$1customer-products-ops-cops$2',
	)

	fs.writeFileSync(runbookFilepath, updatedRunbookString)

	const message =
		'Update Runbook "Supported By" team to customer-products-ops-cops'

	await git.add({
		files: runbookFilepath,
		workingDirectory,
	})

	await git.commit({
		message,
	})
}

run()
