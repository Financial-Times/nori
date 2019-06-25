#!/usr/bin/env node

const { prompt } = require('enquirer')
const fs = require('mz/fs')
const path = require('path')
const relativeDate = require('tiny-relative-date')
const types = require('./lib/types')
const State = require('./lib/state')
const operations = require('./operations')
const { workspacePath, noriExtension } = require('./lib/constants')
const toSentence = require('./lib/to-sentence')
const c = require('ansi-colors')
const art = require('./lib/art')

const promptStateFile = ({ stateFiles }) =>
	prompt([
		{
			name: 'selectedStateFile',
			message: 'resume a session',
			type: 'select',
			choices: stateFiles
				.map(({ stateFile, mtime }) => ({
					name: stateFile,
					message: `${stateFile.replace(noriExtension, '')} (${relativeDate(
						mtime,
					)})`,
				}))
				.reverse()
				.concat(
					{ role: 'separator' },
					{ name: 'new' },
					{ name: 'edit', message: 'delete existing sessions' },
				),
			initial: 'new',
			skip() {
				return stateFiles.length === 0
			},
		},
		{
			name: 'newStateFile',
			message: 'create a session',
			type: 'text',
			validate(fileName) {
				if (this.skipped || fileName) {
					return true
				}

				return 'Please enter a session name'
			},
			result: fileName =>
				fileName.endsWith(noriExtension) ? fileName : fileName + noriExtension,
			skip() {
				// this.state.answers should be first argument to skip
				// see https://github.com/enquirer/enquirer/issues/105
				return this.state.answers.selectedStateFile !== 'new'
			},
		},
		{
			type: 'multiselect',
			message: 'select sessions to delete (space to select)',
			name: 'toDelete',
			choices:
				// causes a weird unresolved promise when it's skipped and the
				// array is empty https://github.com/enquirer/enquirer/issues/128
				stateFiles.length
					? stateFiles.map(({ stateFile }) => stateFile)
					: ['no'],
			skip() {
				return this.state.answers.selectedStateFile !== 'edit'
			},
		},
		{
			type: 'confirm',
			name: 'confirmDelete',
			message: ({ answers: { toDelete } }) =>
				`really delete ${toSentence(toDelete)}?`,
			skip() {
				return (
					this.state.answers.selectedStateFile !== 'edit' ||
					this.state.answers.toDelete.length === 0
				)
			},
		},
	])

const welcomeMessage = `
${c.bold('Welcome to Nori!')} You'll be guided
through some steps to discover
repositories and make changes on
them. First, give your session a
memorable name, so you can come
back to it later.
`

async function getStateFile({ stateFile }) {
	if (!stateFile) {
		const stateFiles = await State.getSortedFiles()
		const firstRun = stateFiles.length === 0

		if (firstRun) {
			// eslint-disable-next-line no-console
			console.log(welcomeMessage)
		}

		const {
			selectedStateFile,
			newStateFile,
			toDelete,
			confirmDelete,
		} = await promptStateFile({ stateFiles })

		if (selectedStateFile === 'edit') {
			if (confirmDelete) {
				await Promise.all(
					toDelete.map(file => fs.unlink(path.join(workspacePath, file))),
				)
			}

			// re-run this function to display the prompt again
			return getStateFile({ stateFile })
		}

		const stateFileName =
			selectedStateFile === 'new' ? newStateFile : selectedStateFile

		return {
			stateFile: path.join(workspacePath, stateFileName),
			createStateFile: selectedStateFile === 'new',
			firstRun,
		}
	}
}

exports.builder = yargs => {
	// eslint-disable-next-line no-console
	console.log(art.banner)

	return yargs.middleware(getStateFile).middleware(State.middleware)
}

const promptOperation = ({ state }) =>
	prompt({
		name: 'choice',
		message: 'available operations',
		type: 'select',
		header: state.shortPreview(),
		choices: Object.values(operations)
			.map(operation => ({
				name: operation.command,
				message: operation.desc,
				disabled: state.isValidOperation(operation) ? false : '', // empty string to hide "(disabled)" message
			}))
			.concat([
				{ role: 'separator' },
				{ name: 'preview' },
				{
					name: 'undo',
					message: 'undo last step',
					disabled: state.state.steps.length > 0 ? false : '',
				},
				{
					name: 'done',
					hint: `your work is autosaved as ${path.basename(state.fileName)}`,
				},
			]),
	})

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.workspace
 * @param {string} argv.script
 * @param {string} argv.targets
 * @param {string} argv.branch
 */
exports.handler = async function({ state, ...argv }) {
	// save the state file so it gets created if it's new
	// or its last modified time gets updated if it's not
	await state.save()

	while (true) {
		const { choice } = await promptOperation({ state })

		if (choice in operations) {
			const operation = operations[choice]
			const promptArgs =
				typeof operation.args === 'function'
					? await operation.args(state.state.data)
					: operation.args

			const args = Object.assign({}, argv, await prompt(promptArgs))

			try {
				await state.runStep(operation, args)
			} catch (error) {
				// print error and allow user to continue
				// eslint-disable-next-line no-console
				console.error(error.stack || error.message || error.toString())
			}
		} else if (choice === 'preview') {
			for (const step of state.state.steps) {
				const type = operations[step.name].output
				console.log(`${c.gray('─────')} ${type}`) // eslint-disable-line no-console
				// eslint-disable-next-line no-console
				console.log(
					types[type].format(types[type].getFromState(state.state.data)),
				)
			}
			console.log(c.gray('─────')) // eslint-disable-line no-console
		} else if (choice === 'undo') {
			await state.undo(argv)
		} else if (choice === 'done') {
			break
		}
	}
}

exports.command = ['*', 'interactive']
exports.desc = 'interactively build steps of a transformation'
