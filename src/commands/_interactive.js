#!/usr/bin/env node

const {prompt} = require('enquirer');
const fs = require('mz/fs');
const path = require('path');
const relativeDate = require('tiny-relative-date');
const types = require('../lib/types');

const workspacePath = path.join(process.env.HOME, '.config/transformation-runner-workspace');

const operations = {
	tako: require('./tako'),
	file: require('./file'),
	'filter-repo-name': require('./filter-repo-name'),
	'run-script': require('./run-script'),
	prs: require('./prs'),
	project: require('./project'),
};

const noriExtension = '.nori.json';

async function getSortedStateFiles() {
	const stateFiles = (
		await fs.readdir(workspacePath)
	).filter(
		file => file.endsWith(noriExtension)
	);

	const modifiedTimes = await Promise.all(
		stateFiles.map(run =>
			fs.stat(
				path.join(workspacePath, run)
			).then(
				stat => stat.mtime // time the file was last modified as a javascript Date
			)
		)
	);

	return stateFiles.map(
		(stateFile, index) => ({stateFile, modified: modifiedTimes[index]})
	).sort(
		({modified: a}, {modified: b}) => b - a
	);
}

const toSentence = words => {
	let string = words.slice(0, -1).join(', ');

	if(words.length > 1) {
		string += ' and ';
	}

	string += words[words.length - 1];

	return string;
}

async function getStateFile() {
	const stateFiles = await getSortedStateFiles();

	const {stateFile, newStateFile, toDelete, confirmDelete} = await prompt([
		{
			name: 'stateFile',
			type: 'select',
			choices: stateFiles.map(
				({stateFile, modified}) => ({
					name: stateFile,
					message: `${stateFile.replace(noriExtension, '')} (${relativeDate(modified)})`,
				})
			).reverse().concat(
				{role: 'separator'},
				{name: 'new'},
				{name: 'edit'},
			),
			initial: 'new',
			skip() {
				return stateFiles.length === 0;
			}
		},
		{
			name: 'newStateFile',
			type: 'text',
			result: fileName => path.join(workspacePath, fileName + noriExtension),
			skip() {
				// this.state.answers should be first argument to skip
				// see https://github.com/enquirer/enquirer/issues/105
				return this.state.answers.stateFile !== 'new'
			}
		},
		{
			type: 'multiselect',
			name: 'toDelete',
			choices: (
				// causes a weird unresolved promise when it's skipped and the
				// array is empty https://github.com/enquirer/enquirer/issues/128
				stateFiles.length
					? stateFiles.map(
						({stateFile}) => stateFile
					)
					: ['no']
			),
			skip() {
				return this.state.answers.stateFile !== 'edit';
			}
		},
		{
			type: 'confirm',
			name: 'confirmDelete',
			message: ({answers: {toDelete}}) => `delete ${toSentence(toDelete)}`,
			skip() {
				return (
					this.state.answers.stateFile !== 'edit'
					|| this.state.answers.toDelete.length === 0
				);
			}
		},
	]);

	if(stateFile === 'edit') {
		if(confirmDelete) {
			await Promise.all(
				toDelete.map(
					stateFile => fs.unlink(
						path.join(workspacePath, stateFile)
					)
				)
			);
		}

		// re-run this function to display the prompt again
		return getStateFile();
	}

	return stateFile === 'new' ? newStateFile : stateFile;
}

async function loadStateFile(stateFile) {
	try {
		return JSON.parse(
			await fs.readFile(stateFile, 'utf8')
		);
	} catch(_) {
		return {
			data: {},
			steps: []
		};
	}
}

/**
 * returns the last elements from the array that meet the predicate
 * e.g. takeWhileLast([1, 2, 3, 2, 3, 4, 5], n => n > 2) returns [3, 4, 5]
 *
 * @param {Array<T>} array
 * @param {T => Boolean} predicate
 * @returns {Array<T>}
 */
const takeWhileLast = (array, predicate) => (
	array.length && predicate(array[array.length - 1])
		? takeWhileLast(
			array.slice(0, -1),
			predicate
		).concat(
			array.slice(-1)
		)
		: []
);

/**
 * yargs handler function.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.workspace
 * @param {string} argv.script
 * @param {string} argv.targets
 * @param {string} argv.branch
 */
const handler = async () => {
	const stateFile = await getStateFile();
	const {steps, data} = await loadStateFile(stateFile);

	const persist = () => fs.writeFile(
		stateFile,
		JSON.stringify({steps, data}, null, 2)
	);

	async function runStep({operation, args}) {
		const dataArgs = operation.input.reduce(
			(args, type) => Object.assign(args, {
				[type]: data[type]
			}),
			{}
		);

		const stepData = await operation.handler(
			Object.assign(dataArgs, args)
		);

		if(operation.output) {
			steps.push({name: operation.command, args});
			data[operation.output] = stepData;
		}

		await persist();
	}

	async function replay(steps) {
		for(const step of steps) {
			await runStep({
				operation: operations[step.name],
				args: step.args,
			});
		}
	}

	while(true) {
		const header = Object.keys(data).map(
			type => types[type].shortPreview(data[type])
		).filter(Boolean).join(' ∙ ');

		const {thing} = await prompt({
			name: 'thing',
			message: 'what do',
			type: 'select',
			header,
			choices: Object.values(operations).map(({command, desc, input, output}) => {
				const dataHasInputs = input.every(type => type in data);
				const dataHasOutput = output in data;
				const isFilter = input.includes(output);

				// allow an operation if the data has all the inputs and the data doesn't
				// have the output (i.e. this operation hasn't already been run) *unless*
				// the operation has the same output as one of the inputs (i.e. it can be
				// run multiple times on the same data)
				const shouldAllowOperation = dataHasInputs && (!dataHasOutput || isFilter);

				return {
					name: command,
					message: desc,
					disabled: shouldAllowOperation ? false : '', // empty string to hide "(disabled)" message
				};
			}).concat([
				{role: 'separator'},
				{name: 'preview'},
				{name: 'undo', message: 'undo last step', disabled: steps.length > 0 ? false : ''},
				{name: 'done', hint: `your work is autosaved as ${path.basename(stateFile)}`}
			]),
		});

		if(thing === 'done') {
			break;
		} else if(thing === 'preview') {
			console.log(data); //eslint-disable-line no-console
		} else if(thing === 'undo') {
			const undoneStep = steps.pop(); // remove last operation
			const undoneOperation = operations[undoneStep.name];

			if(undoneOperation.undo) {
				await undoneOperation.undo(data);
			}

			delete data[undoneOperation.output]; // clear any output data. if it's a filter step we'll rebuild it

			const stepsToReplay = takeWhileLast(
				steps,
				step => operations[step.name].output === undoneOperation.output
			);

			steps.splice(steps.length - stepsToReplay.length, stepsToReplay.length);
			await persist();

			// if stepsToReplay is empty this will do nothing
			await replay(stepsToReplay);
		} else {
			await runStep({
				operation: operations[thing],
				args: await prompt(operations[thing].args),
			});
		}
	}
};

module.exports = {
	command: ['*', 'interactive'],
	desc: 'interactively build steps of a transformation',
	handler,
};
