#!/usr/bin/env node

const operationToYargsCommand = require('./lib/operation-to-yargs-command')
const State = require('./lib/state')
const config = require('./lib/config')

require('yargs')
	.option('json', {
		describe: 'output JSON-formatted data',
		type: 'boolean',
		global: true,
	})
	.option('state-file', {
		alias: 'f',
		describe: 'path to a file containing JSON-formatted nori output',
		type: 'string',
		global: true,
	})
	.middleware(config)
	.middleware(State.middleware)
	.command(require('./interactive'))
	.commandDir('commands', { visit: operationToYargsCommand })
	.demandCommand()
	.strict()
	.help()
	.showHelpOnFail(false).argv
