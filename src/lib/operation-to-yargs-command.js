const {prompt} = require('enquirer');
const fs = require('mz/fs');
const types = require('./lib/types');

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

const operationToYargsCommand = command => Object.assign({}, command, {
	builder: yargs => {
		if(command.input) {
			command.input.forEach(type => yargs
				.option(type, enquirerToYargs(types[type].argument))
			);

			yargs.middleware(async argv => {
				if(argv.stateFile) {
					const contents = await fs.readFile(argv.stateFile, 'utf8');
					const {data} = JSON.parse(contents);
					return Object.assign(
						{stateData: data}, // keep the original to prepend to json output later
						data
					);
				}
			});
		}

		if(command.args) {
			command.args.forEach(arg => yargs
				.option(arg.name, enquirerToYargs(arg))
				.middleware(enquirerValidate(arg))
			);

			yargs.middleware(async argv => {
				const missingArgs = command.args.concat(
					command.input.map(type => Object.assign({name: type}, types[type].argument))
				).filter(arg => !(arg.name in argv));

				if(missingArgs.length) {
					return await prompt(missingArgs);
				}

				return {}
			});
		}

		return yargs;
	},

	handler: async argv => {
		const result = await command.handler(argv);

		if(command.output) {
			if(argv.stateFile) {
				const fullData = JSON.stringify(
					{
						data: Object.assign(
							{}, argv.stateData,
							{[command.output]: result}
						)
					},
					null,
					// format nicely if the output is a terminal (ie a human)
					process.stdout.isTTY ? 2 : null
				);

				if(argv.stateFile === '/dev/stdin') {
					process.stdout.write(fullData);
				} else {
					await fs.writeFile(
						argv.stateFile,
						fullData
					);
				}
			} else {
				console.log( //eslint-disable-line no-console
					argv.json
						? JSON.stringify(result, null, 2)
						: types[command.output].format(result)
				);
			}
		}
	}
});

module.exports = operationToYargsCommand;
