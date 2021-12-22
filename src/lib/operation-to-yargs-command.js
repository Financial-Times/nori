const { prompt } = require('enquirer')
const types = require('./types')
const toSentence = require('./to-sentence')
const operations = require('../operations')

const enquirerToYargs = yargs => arg => {
	const option = {
		// alias: arg.name[0], how can we make sure this is unique?
		describe: arg.message,
	}

	switch (arg.type) {
		case 'text': {
			option.type = 'string'
			break
		}
		case 'confirm': {
			option.type = 'boolean'
			break
		}
		case 'list': {
			option.type = 'array'
			break
		}
		case 'select': {
			option.type = 'string'
			if (typeof arg.choices === 'function') {
				// return immediately as arg.choices will be executed later in promptMissingArgs
				return
			}
			option.choices = arg.choices.map(choice => choice.name || choice)
			break
		}
	}

	yargs.option(arg.name, option)

	if (arg.result) {
		// we could use `yargs.coerce` here if we didn't have to support
		// async functions like enquirer's `result`
		yargs.middleware(async argv => ({
			[arg.name]: await arg.result(argv[arg.name]),
		}))
	}

	if (arg.validate) {
		yargs.middleware(async argv => {
			const maybeMessage = await arg.validate(argv[arg.name])

			// if an enquirer `validate` function returns a string,
			// that's an error to throw. so throw it
			if (typeof maybeMessage === 'string') {
				throw new Error(maybeMessage)
			}

			return {}
		})
	}

	return yargs
}

const errorOnInvalidOperation = operation => argv => {
	if (argv.state.fileName && !argv.state.isValidOperation(operation)) {
		const validCommands = Object.keys(operations).filter(key =>
			argv.state.isValidOperation(operations[key]),
		)

		const validMessage = validCommands.length
			? `Valid commands are ${toSentence(validCommands.map(cmd => `'${cmd}'`))}`
			: ''
		const message = `'${operation.command}' isn't valid for the provided state. ${validMessage}`

		throw new Error(message)
	}
}

const checkMissingState = operation => async argv => {
	const missingState = operation.input
		.map(name => ({ ...types[name], name }))
		.filter(
			type =>
				!type.exists(
					// check if this type is in the state we have
					type.getFromState(argv.state.state.data),
				),
		)

	return { missingState }
}

const promptMissingArgs = operation => async argv => {
	const missingArgs = operation.args.filter(arg => !(arg.name in argv))

	if (missingArgs.length) {
		if (process.stdin.isTTY) {
			return await prompt(missingArgs)
		} else {
			return { missingArgs }
		}
	}

	return {}
}

const errorOnMissing = operation => argv => {
	let messages = [
		argv.missingArgs &&
			argv.missingArgs.length &&
			`arguments ${toSentence(argv.missingArgs.map(arg => `'${arg.name}'`))}`,
		argv.missingState &&
			argv.missingState.length &&
			`state ${toSentence(argv.missingState.map(arg => `'${arg.name}'`))}`,
	].filter(Boolean)

	if (messages.length) {
		throw new Error(
			`Command '${operation.command}' requires ${toSentence(messages)}`,
		)
	}

	return {}
}

const operationToYargsCommand = operation =>
	Object.assign({}, operation, {
		builder(yargs) {
			if (operation.input) {
				yargs
					.middleware(errorOnInvalidOperation(operation))
					.middleware(checkMissingState(operation))
			}

			if (operation.args) {
				operation.args.forEach(enquirerToYargs(yargs))
				yargs.middleware(promptMissingArgs(operation))
			}

			return yargs.middleware(errorOnMissing(operation))
		},

		handler: ({ state, ...args }) => state.runSingleOperation(operation, args),
	})

module.exports = operationToYargsCommand
