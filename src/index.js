#!/usr/bin/env node

const {prompt} = require('enquirer');

function enquirerToYargs(arg) {
	const option = {
		// alias: arg.name[0],
		describe: arg.message,
		coerce: arg.yargsCoerce,
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
			type: 'array',
			coerce: repos => repos.map(repo => {
				const [match, owner, name] = repo.match(/(.+?)\/(.+?)(?:.git)$/) || [false];
				if(match) {
					return {owner, name};
				}

				throw new Error(`${repo} is not a valid repository`);
			})
		},
		format: result => result.map(repo => `https://github.com/${repo.owner}/${repo.name}`).join('\n'),
	},
	branches: {
		argument: {type: 'array'},
		format: result => result.join('\n'),
	},
	prs: {
		argument: {type: 'array'},
		format: result => result.map(pr => pr.html_url).join('\n'),
	},
	project: {
		argument: {type: 'array'},
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
	.commandDir('commands', {
		visit: command => Object.assign({}, command, {
			builder: yargs => {
				if(command.input) {
					command.input.forEach(type => yargs
						.option(type, types[type].argument)
					);
				}
			
				if(command.arguments) {
					command.arguments.forEach(arg => yargs
						.option(arg.name, enquirerToYargs(arg))
						.middleware(enquirerValidate(arg))
					);

					return yargs.middleware(async argv => {
						const missingArgs = command.arguments.filter(arg => !(arg.name in argv));
	
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
					console.log(
						argv.json
							? JSON.stringify(result, null, 2)
							: types[command.output].format(result)
					);
				}
			}
		})
	})
	.demandCommand()
	.strict()
	.help()
	.argv;
