const {prompt} = require('enquirer');
const types = require('./types');
const toSentence = require('./to-sentence');
const operations = require('../operations');

function enquirerToYargs(arg) {
	const option = {
		// alias: arg.name[0], how can we make sure this is unique?
		describe: arg.message,
		coerce: arg.result,
	}

	switch(arg.type) {
		case 'text': {
			option.type = 'string';
			break;
		}
		case 'confirm': {
			option.type = 'boolean';
			break;
		}
		case 'list': {
			option.type = 'array';
			break;
		}
		case 'select': {
			option.type = 'string';
			option.choices = arg.choices.map(choice => choice.name || choice);
			break;
		}
	}

	return option;
}

const enquirerValidate = arg => async argv => {
	if(arg.validate) {
		const maybeMessage = await arg.validate(argv[arg.name]);
		if(typeof maybeMessage === 'string') {
			throw new Error(maybeMessage);
		}
	}

	return {};
};

const promptMissingArgs = operation => async argv => {
	if(!argv.state.isValidOperation(operation)) {
		const validCommands = Object.keys(operations).filter(key => argv.state.isValidOperation(operations[key]));
		const message = `'${operation.command}' isn't valid for the provided state. ${validCommands.length ? `Valid commands are ${toSentence(validCommands.map(cmd => `'${cmd}'`))}` : ''}`;
		throw new Error(message);
	}

	const argsFromInputTypes = operation.input.map(
		type => Object.assign({name: type}, types[type].argument)
	);

	const allArgs = operation.args.concat(argsFromInputTypes);
	const missingArgs = allArgs.filter(
		arg => !(arg.name in argv)
	);

	if(missingArgs.length) {
		if(process.stdin.isTTY) {
			return await prompt(missingArgs);
		} else {
			throw new Error(`Command '${operation.command}' requires arguments ${toSentence(missingArgs.map(arg => `'${arg.name}'`))}`);
		}
	}

	return {};
};

const operationToYargsCommand = operation => Object.assign({}, operation, {
	builder(yargs) {
		if(operation.input) {
			operation.input.forEach(type => yargs
				.option(type, enquirerToYargs(types[type].argument))
			);
		}

		if(operation.args) {
			operation.args.forEach(arg => yargs
				.option(arg.name, enquirerToYargs(arg))
				.middleware(enquirerValidate(arg))
			);

			yargs.middleware(promptMissingArgs(operation));
		}

		return yargs;
	},

	async handler({state, ...args}) {
		const result = await operation.handler(args);

		if(state.fileName || !process.stdout.isTTY) {
			await state.appendOperation(operation, args, result);
		} else {
			console.log( //eslint-disable-line no-console
				args.json
					? JSON.stringify(result, null, 2)
					: types[operation.output].format(result)
			);
		}
	}
});

module.exports = operationToYargsCommand;
