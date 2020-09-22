#!/usr/bin/env node

const git = require('@financial-times/git')
const fs = require('fs')

async function run() {
	const workingDirectory = process.cwd()

	const [circleCiConfigFilename] = fs.readdirSync(
		`${workingDirectory}/.circleci`,
	)

	if (!circleCiConfigFilename) return

	const runbookFilepath = `${workingDirectory}/.circleci/${circleCiConfigFilename}`

	const runbookString = fs.readFileSync(runbookFilepath, 'utf-8')

	const regex = /container_config_lambda_node[0-9]+/g

	const occurrencesCount = (runbookString.match(regex) || []).length

	if (occurrencesCount !== 2) return

	const stuffToDeleteRegex = /[ ]{2}container_config_lambda_node[0-9]+: &container_config_lambda_node[0-9]+\n[ ]{4}working_directory: ~\/project\/build\n[ ]{4}docker:\n[ ]{6}- image: lambci\/lambda:build-nodejs[0-9]+\.[0-9x]+\n\n/

	const updatedRunbookString = runbookString.replace(stuffToDeleteRegex, '')

	fs.writeFileSync(runbookFilepath, updatedRunbookString)

	const message = 'Remove unused CircleCI Lambda Docker container'

	await git.add({
		files: runbookFilepath,
		workingDirectory,
	})

	await git.commit({
		message,
	})
}

run()
