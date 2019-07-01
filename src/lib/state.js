const fs = require('mz/fs')
const path = require('path')
const operations = require('../operations')
const getStdin = require('get-stdin')
const util = require('util')
const mkdirp = util.promisify(require('mkdirp'))
const { workspacePath, noriExtension } = require('./constants')
const { prompt } = require('enquirer')
const types = require('./types')
const { produce } = require('immer')
const NoriError = require('./error')

/**
 * returns the last elements from the array that meet the predicate
 * e.g. takeWhileLast([1, 2, 3, 2, 3, 4, 5], n => n > 2) returns [3, 4, 5]
 *
 * @template T
 * @param {Array<T>} array
 * @param {function(T): Boolean} predicate
 * @returns {Array<T>}
 */
const takeWhileLast = (array, predicate) =>
	array.length && predicate(array[array.length - 1]) // if the function returns true on the last item
		? takeWhileLast(
				// keep looking back in the array
				array.slice(0, -1),
				predicate,
		  ).concat(
				// and add the last item back on the end
				array.slice(-1),
		  )
		: [] // otherwise, stop looking and discard the last item

// read from standard input if it's a pipe, or the provided filename if not
const read = file =>
	process.stdin.isTTY ? fs.readFile(file, 'utf8') : getStdin()

// format JSON for humans (interactive terminals) or machines
const serialise = state => {
	const spacing = process.stdout.isTTY ? 2 : null
	return JSON.stringify(state, null, spacing)
}

module.exports = class State {
	static async middleware({ stateFile, state, createStateFile = false }) {
		await mkdirp(workspacePath)

		if (stateFile) {
			const problems = []
			if (!process.stdin.isTTY) {
				problems.push('reading state from standard input')
			}

			if (!process.stdout.isTTY) {
				problems.push('piping state to another command or file')
			}

			if (problems.length) {
				throw new NoriError(
					`--state-file is incompatible with ${problems.join(' or ')}`,
				)
			}
		}

		const stateContainer =
			state && state.fileName ? state : new State({ fileName: stateFile })

		if (
			!createStateFile &&
			stateContainer.fileName &&
			!(await fs.exists(stateContainer.fileName))
		) {
			const message = `state file '${stateContainer.fileName}' doesn't exist`

			const create = process.stdin.isTTY
				? (await prompt({
						name: 'create',
						message: `${message}. create it?`,
						type: 'confirm',
				  })).create
				: false

			if (create) {
				createStateFile = true
			} else {
				throw new NoriError(message)
			}
		}

		if (createStateFile) {
			await stateContainer.save()
		}

		await stateContainer.load()

		return { state: stateContainer }
	}

	static async getSortedFiles() {
		await mkdirp(workspacePath)

		const stateFiles = (await fs.readdir(workspacePath)).filter(file =>
			file.endsWith(noriExtension),
		)

		return (await Promise.all(
			stateFiles.map(async stateFile => {
				const { mtime } = await fs.stat(path.join(workspacePath, stateFile))

				return {
					stateFile,
					mtime, // time the file was last modified as a javascript Date
				}
			}),
		)).sort(({ mtime: a }, { mtime: b }) => b - a)
	}

	constructor({ fileName, state = { data: {}, steps: [] } }) {
		this.state = state
		this.fileName = fileName
	}

	async load() {
		if (this.fileName || !process.stdin.isTTY) {
			const content = await read(this.fileName)
			try {
				this.state = JSON.parse(content)
			} catch (_) {
				throw new NoriError(
					`${
						process.stdin.isTTY ? this.fileName : 'Standard input'
					} couldn't be parsed as JSON`,
				)
			}
		}
	}

	async save() {
		const serialised = serialise(this.state)

		if (this.fileName) {
			await fs.writeFile(this.fileName, serialised)
		}

		return serialised
	}

	addData(data) {
		Object.assign(this.state.data, data)
	}

	async runSingleOperation(operation, args) {
		const formatter = args.json ? serialise : types[operation.output].format
		const serialisedState = await this.runStep(operation, args)
		const data = types[operation.output].getFromState(this.state.data)

		if (!process.stdout.isTTY) {
			// eslint-disable-next-line no-console
			console.log(serialisedState)
		} else {
			// eslint-disable-next-line no-console
			console.log(formatter(data))
		}
	}

	async runStep(operation, args) {
		// produce, from immer, lets handlers modify the state as a mutable
		// object safely. the updated copy is then stored as the new state
		try {
			this.state.data = await produce(this.state.data, async draft => {
				await operation.handler(args, draft)
			})
			this.state.steps.push({ name: operation.command, args })
			return this.save()
		} catch (error) {
			// save on error so the state file is definitely up to date
			await this.save()
			throw error
		}
	}

	async undo(args) {
		const undoneStep = this.state.steps[this.state.steps.length - 1]
		const stepsToUndo = takeWhileLast(
			this.state.steps,
			step =>
				operations[step.name].output === operations[undoneStep.name].output,
		)

		this.state.data = await produce(this.state.data, async draft => {
			for (const step of stepsToUndo.slice().reverse()) {
				const operation = operations[step.name]
				if (operation.undo) {
					await operation.undo(Object.assign({}, step.args, args), draft)
				}
			}
		})

		this.state.steps.splice(
			this.state.steps.length - stepsToUndo.length,
			stepsToUndo.length,
		)

		await this.save()

		// replay all but the last undone step
		for (const step of stepsToUndo.slice(0, -1)) {
			await this.runStep(operations[step.name], step.args)
		}
	}

	isValidOperation(operation) {
		/*
		an operation should only be available if we have the right data for it, i.e.
		if all of its inputs are the output of a previous operation.

		if the operation isn't a filter (i.e. it has different output to its inputs),
		it should only be available if something that outputs the same as it hasn't
		been run already (i
		*/

		const previousOutputs = new Set(
			this.state.steps.map(step => operations[step.name].output),
		)

		const hasAllInputs = operation.input.every(type =>
			previousOutputs.has(type),
		)
		const isFilter = operation.input.includes(operation.output)
		const doesntHaveOutput = !previousOutputs.has(operation.output)

		return hasAllInputs && (isFilter || doesntHaveOutput)
	}

	shortPreview() {
		const stepOutputs = [
			...new Set(this.state.steps.map(step => operations[step.name].output)),
		]

		const outputPreviews = stepOutputs
			.map(type => {
				const data = types[type].getFromState(this.state.data)
				return types[type].shortPreview(data)
			})
			.filter(Boolean)

		return outputPreviews.join(' ∙ ')
	}
}
