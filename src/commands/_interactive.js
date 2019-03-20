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

const promptStateFile = ({stateFiles}) => prompt([
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
		result: fileName => (
			fileName.endsWith(noriExtension)
				? fileName
				: fileName + noriExtension
		),
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

async function getStateFile() {
	const stateFiles = await getSortedStateFiles();
	const {stateFile, newStateFile, toDelete, confirmDelete} = await promptStateFile({stateFiles});

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

	const stateFileName = stateFile === 'new' ? newStateFile : stateFile;
	return path.join(workspacePath, stateFileName);
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
 * @template T
 * @param {Array<T>} array
 * @param {function(T): Boolean} predicate
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

const persist = ({stateFile, state}) => fs.writeFile(
	stateFile,
	JSON.stringify(state, null, 2)
);

async function runStep({stateFile, state, operation, args}) {
	// get the keys from `data` that are present in
	// `operation.input`
	const dataArgs = operation.input.reduce(
		(args, type) => Object.assign(args, {
			[type]: state.data[type]
		}),
		{}
	);

	const stepData = await operation.handler(
		Object.assign(dataArgs, args)
	);

	if(operation.output) {
		state.steps.push({name: operation.command, args});
		state.data[operation.output] = stepData;
	}

	await persist({state, stateFile});
}

async function replay({state, stateFile, steps}) {
	for(const step of steps) {
		await runStep({
			state,
			stateFile,
			operation: operations[step.name],
			args: step.args,
		});
	}
}

const promptOperation = ({state, stateFile}) => prompt({
	name: 'choice',
	message: 'what do',
	type: 'select',
	header: Object.keys(state.data).map(
		type => types[type].shortPreview(state.data[type])
	).filter(Boolean).join(' ∙ '),
	choices: Object.values(operations).map(({command, desc, input, output}) => {
		const dataHasInputs = input.every(type => type in state.data);
		const dataHasOutput = output in state.data;
		const isFilter = input.includes(output);

		// allow an operation if the state.data has all the inputs and the data doesn't
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
		{name: 'preview', },
		{name: 'undo', message: 'undo last step', disabled: state.steps.length > 0 ? false : ''},
		{name: 'done', hint: `your work is autosaved as ${path.basename(stateFile)}`}
	]),
});

async function undo({state, stateFile}) {
	const undoneStep = state.steps.pop(); // remove last operation
	const undoneOperation = operations[undoneStep.name];

	if(undoneOperation.undo) {
		await undoneOperation.undo(state.data);
	}

	delete state.data[undoneOperation.output]; // clear any output data. if it's a filter step we'll rebuild it

	const stepsToReplay = takeWhileLast(
		state.steps,
		step => operations[step.name].output === undoneOperation.output
	);

	state.steps.splice(state.steps.length - stepsToReplay.length, stepsToReplay.length);
	await persist({stateFile, state});

	// if stepsToReplay is empty this will do nothing
	await replay({state, stateFile, steps: stepsToReplay});
}

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
	const state = await loadStateFile(stateFile);

	// save the state file so it gets created if it's new
	// or its last modified time gets updated if it's not
	await persist({state, stateFile});

	while(true) {
		const {choice} = await promptOperation({state, stateFile});

		if(choice in operations) {
			const operation = operations[choice];
			const args = await prompt(operation.args);
			await runStep({ state, stateFile, operation, args });
		} else if(choice === 'preview') {
			console.log(state.data); //eslint-disable-line no-console
		} else if(choice === 'undo') {
			await undo({state, stateFile});
		} else if(choice === 'done') {
			break;
		}
	}
};

module.exports = {
	command: ['*', 'interactive'],
	desc: 'interactively build steps of a transformation',
	handler,
};
