#!/usr/bin/env node

const {prompt} = require('enquirer');
const fs = require('mz/fs');

function enquirerToYargs(arg) {
	const option = {
		// alias: arg.name[0],
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

const types = {
	repos: {
		argument: {
			type: 'list',
			result: repos => repos.map(repo => {
				const [match, owner, name] = repo.match(/(.+?)\/(.+?)(?:.git)?$/) || [false];
				if(match) {
					return {owner, name};
				}

				throw new Error(`${repo} is not a valid repository`);
			})
		},
		format: result => result.map(repo => `https://github.com/${repo.owner}/${repo.name}`).join('\n'),
	},
	branches: {
		argument: {type: 'list'},
		format: result => result.join('\n'),
	},
	// TODO idk get from github api maybe? what's the best thing to input here a url?
	prs: {
		argument: {type: 'list'},
		format: result => result.map(pr => pr.html_url).join('\n'),
	},
	project: {
		argument: {type: 'list'},
		format: result => result.html_url,
	},
};

const enquirerValidate = arg => async argv => {
	if(arg.validate) {
		const maybeMessage = await arg.validate(argv[arg.name]);
		if(typeof maybeMessage === 'string') {
			throw new Error(maybeMessage);
		}
	}

	return {};
};

require('yargs')
	.option('json', {
		describe: 'output JSON-formatted data',
		type: 'boolean',
		global: true,
	})
	.option('state-file', {
		describe: 'path to a file containing JSON-formatted nori output, or "-" for standard input (e.g. piping)',
		type: 'string',
		global: true,
		coerce: input => input === '-' ? '/dev/stdin' : input,
	})
	.commandDir('commands', {
		visit: command => Object.assign({}, command, {
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

				if(command.arguments) {
					command.arguments.forEach(arg => yargs
						.option(arg.name, enquirerToYargs(arg))
						.middleware(enquirerValidate(arg))
					);

					yargs.middleware(async argv => {
						const missingArgs = command.arguments.concat(
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
						const isPipe = argv.stateFile === '/dev/stdin';

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
						console.log(
							argv.json
								? JSON.stringify(result, null, 2)
								: types[command.output].format(result)
						);
					}
				}
			}
		})
	})
	.demandCommand()
	.strict()
	.help()
	.argv;
