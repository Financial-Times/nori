#!/usr/bin/env node

const {prompt} = require('enquirer');
const fs = require('mz/fs');
const path = require('path');
const relativeDate = require('tiny-relative-date');
const toSentence = require('array-to-sentence');
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

async function getResume() {
	let steps = [];
	let data = {};
	let resume = 'new';
	let run;

	const previousRuns = (await fs.readdir(workspacePath)).filter(
		file => file.endsWith('.json')
	);

	const modifiedTimes = await Promise.all(
		previousRuns.map(run =>
			fs.stat(
				path.join(workspacePath, run)
			).then(stat => stat.mtime)
		)
	);

	const sortedRuns = previousRuns.map(
		(run, index) => ({run, modified: modifiedTimes[index]})
	).sort(
		({modified: a}, {modified: b}) => b - a
	);

	if(previousRuns.length) {
		({resume} = await prompt({
			name: 'resume',
			type: 'select',
			choices: sortedRuns.map(
				({run, modified}) => ({
					name: run,
					message: `${run} (${relativeDate(modified)})`,
				})
			).concat(
				{role: 'separator'},
				{name: 'new'},
				{name: 'edit'},
			),
		}));
	}

	if(resume === 'edit') {
		const {toDelete, confirm} = await prompt([{
			type: 'multiselect',
			name: 'toDelete',
			choices: sortedRuns.map(({run}) => run)
		}, {
			type: 'confirm',
			name: 'confirm',
			message: ({answers: {toDelete}}) => `delete ${toSentence(toDelete)}`,
			skip() {
				// should be first argument to skip, see https://github.com/enquirer/enquirer/issues/105
				return this.state.answers.toDelete.length === 0;
			}
		}]);

		if(confirm) {
			await Promise.all(
				toDelete.map(
					run => fs.unlink(
						path.join(workspacePath, run)
					)
				)
			);
		}

		return getResume();
	}

	if(resume === 'new') {
		const {name} = await prompt({
			name: 'name',
			type: 'text',
		});

		run = path.join(workspacePath, name + '.json');
	} else {
		run = path.join(workspacePath, resume);
		({steps, data} = JSON.parse(
			await fs.readFile(run, 'utf8')
		));
	}

	return {run, steps, data};
}

const takeWhileLast = (array, func) => (
	array.length && func(array[array.length - 1])
		? takeWhileLast(array.slice(0, -1), func).concat(array.slice(-1))
		: []
)

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
	const {run, steps, data} = await getResume();

	const persist = () => fs.writeFile(
		run,
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
				{name: 'done', hint: `your work is autosaved as ${path.basename(run)}`}
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
