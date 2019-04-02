const fs = require('mz/fs');
const path = require('path');
const operations = require('../operations');
const getStdin = require('get-stdin');
const util = require('util');
const mkdirp = util.promisify(require('mkdirp'));
const {workspacePath, noriExtension} = require('./constants');

/**
 * returns the last elements from the array that meet the predicate
 * e.g. takeWhileLast([1, 2, 3, 2, 3, 4, 5], n => n > 2) returns [3, 4, 5]
 *
 * @template T
 * @param {Array<T>} array
 * @param {function(T): Boolean} predicate
 * @returns {Array<T>}
 */
const takeWhileLast = (array, predicate) => (
	array.length && predicate(array[array.length - 1]) // if the function returns true on the last item
		? takeWhileLast(                                // keep looking back in the array
			array.slice(0, -1),
			predicate
		).concat(                                       // and add the last item back on the end
			array.slice(-1)
		)
		: []                                            // otherwise, stop looking and discard the last item
);

const read = file => file === '-' ? getStdin() : fs.readFile(file, 'utf8');

module.exports = class State {
	static async middleware({ stateFile, state, createStateFile = false }) {
		await mkdirp(workspacePath);

		const stateContainer = state && state.fileName
			? state
			: new State({ fileName: stateFile });

		if(createStateFile) {
			await stateContainer.save();
		}

		await stateContainer.load();

		return {
			state: stateContainer,
			...stateContainer.state.data
		};
	}

	static async getSortedFiles() {
		await mkdirp(workspacePath);

		const stateFiles = (
			await fs.readdir(workspacePath)
		).filter(
			file => file.endsWith(noriExtension)
		);

		return (await Promise.all(
			stateFiles.map(async stateFile => {
				const {mtime} = await fs.stat(
					path.join(workspacePath, stateFile)
				);

				return {
					stateFile,
					mtime, // time the file was last modified as a javascript Date
				};
			})
		)).sort(
			({mtime: a}, {mtime: b}) => b - a
		);
	}

	constructor({
		fileName,
		state = { data: {}, steps: [] }
	}) {
		this.state = state;
		this.fileName = fileName;
	}

	async load() {
		if(this.fileName) {
			const content = await read(this.fileName);
			try {
				this.state = JSON.parse(content);
			} catch(_) {
				throw new Error(`${this.fileName === '-' ? 'Standard input' : this.fileName} couldn't be parsed as JSON`);
			}
		}
	}

	async save() {
		const spacing = process.stdout.isTTY ? 2 : null;
		const serialised = JSON.stringify(this.state, null, spacing);

		if(this.fileName === '-' || !process.stdout.isTTY) {
			process.stdout.write(serialised);
		} else if(this.fileName) {
			await fs.writeFile(
				this.fileName,
				serialised
			);
		}
	}

	async appendOperation(operation, args, data) {
		this.state.steps.push({name: operation.command, args});
		this.state.data[operation.output] = data;
		await this.save();
	}

	isValidOperation(operation) {
		const lastStep = this.state.steps[this.state.steps.length - 1];
		const operationCanTakeLastOutput = lastStep
			? operation.input.includes(
				operations[lastStep.name].output
			)
			: operation.input.length === 0;

		const dataHasInputs = operation.input.every(type => type in this.state.data);
		const dataHasOutput = operation.output in this.state.data;
		const isFilter = operation.input.includes(operation.output);

		// allow an operation if:
		//   - the output of the last operation is one of the inputs
		//     - or if there was no last operation, there are no inputs
		//   - the state.data has all the inputs
		//   - the data doesn't have the output (i.e. this operation hasn't already been run)
		//     - *unless* the operation has the same output as one of the inputs (i.e. it can be run multiple times on the same data)
		return operationCanTakeLastOutput && dataHasInputs && (!dataHasOutput || isFilter);
	}

	async unwindOperation(operation) {
		this.state.steps.pop();
		delete this.state.data[operation.output];

		const stepsToReplay = takeWhileLast(
			this.state.steps,
			step => operations[step.name].output === operation.output
		);

		this.state.steps.splice(this.state.steps.length - stepsToReplay.length, stepsToReplay.length);

		await this.save();
		return stepsToReplay;
	}
}
