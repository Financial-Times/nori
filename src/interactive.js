#!/usr/bin/env node

const {prompt} = require('enquirer');
const fs = require('mz/fs');
const path = require('path');
const relativeDate = require('tiny-relative-date');
const types = require('./lib/types');
const State = require('./lib/state');
const operations = require('./operations');
const {workspacePath, noriExtension} = require('./lib/constants');
const toSentence = require('./lib/to-sentence');

const promptStateFile = ({stateFiles}) => prompt([
	{
		name: 'stateFile',
		message: 'resume a session',
		type: 'select',
		choices: stateFiles.map(
			({stateFile, mtime}) => ({
				name: stateFile,
				message: `${stateFile.replace(noriExtension, '')} (${relativeDate(mtime)})`,
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
		message: 'create a session',
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
		message: 'select sessions to delete',
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
		message: ({answers: {toDelete}}) => `really delete ${toSentence(toDelete)}?`,
		skip() {
			return (
				this.state.answers.stateFile !== 'edit'
				|| this.state.answers.toDelete.length === 0
			);
		}
	},
]);

async function getStateFile({ stateFile }) {
	if(!stateFile) {
		const stateFiles = await State.getSortedFiles();
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
			return getStateFile({ stateFile });
		}

		const stateFileName = stateFile === 'new' ? newStateFile : stateFile;
		return {
			stateFile: path.join(workspacePath, stateFileName),
			createStateFile: true
		}
	}
}

exports.builder = yargs => yargs
	.middleware(getStateFile)
	.middleware(State.middleware);

async function runStep({state, operation, args}) {
	// get the keys from `data` that are present in
	// `operation.input`
	const dataArgs = operation.input.reduce(
		(args, type) => Object.assign(args, {
			[type]: state.state.data[type]
		}),
		{}
	);

	const stepData = await operation.handler(
		Object.assign(dataArgs, args)
	);

	await state.appendOperation(operation, args, stepData);
}

async function replay({state, steps}) {
	for(const step of steps) {
		await runStep({
			state,
			operation: operations[step.name],
			args: step.args,
		});
	}
}

const promptOperation = ({state}) => prompt({
	name: 'choice',
	message: 'available operations',
	type: 'select',
	header: Object.keys(state.state.data).map(
		type => types[type].shortPreview(state.state.data[type])
	).filter(Boolean).join(' ∙ '),
	choices: Object.values(operations).map(operation => ({
		name: operation.command,
		message: operation.desc,
		disabled: state.isValidOperation(operation) ? false : '', // empty string to hide "(disabled)" message
	})).concat([
		{role: 'separator'},
		{name: 'preview', },
		{name: 'undo', message: 'undo last step', disabled: state.state.steps.length > 0 ? false : ''},
		{name: 'done', hint: `your work is autosaved as ${path.basename(state.fileName)}`}
	]),
});

async function undo({ state }) {
	const undoneStep = state.state.steps[state.state.steps.length - 1];
	const undoneOperation = operations[undoneStep.name];

	if(undoneOperation.undo) {
		await undoneOperation.undo(state.state.data);
	}

	const stepsToReplay = await state.unwindOperation(undoneOperation);

	// if stepsToReplay is empty this will do nothing
	await replay({state, steps: stepsToReplay});
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
exports.handler = async function({ state, ...argv }) {
	// save the state file so it gets created if it's new
	// or its last modified time gets updated if it's not
	await state.save();

	while(true) {
		const {choice} = await promptOperation({state});

		if(choice in operations) {
			const operation = operations[choice];
			const args = Object.assign(
				{}, argv,
				await prompt(operation.args)
			);

			await runStep({ state, operation, args });
		} else if(choice === 'preview') {
			console.log(state.state.data); //eslint-disable-line no-console
		} else if(choice === 'undo') {
			await undo({state});
		} else if(choice === 'done') {
			break;
		}
	}
};

exports.command = ['*', 'interactive'];
exports.desc = 'interactively build steps of a transformation'
