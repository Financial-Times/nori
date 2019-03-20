#!/usr/bin/env node

const operationToYargsCommand = require('./lib/operation-to-yargs-command')

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
		coerce: (input: string) => input === '-' ? '/dev/stdin' : input,
	})
	.commandDir('commands', { visit: operationToYargsCommand })
	.demandCommand()
	.strict()
	.help()
	.argv;
