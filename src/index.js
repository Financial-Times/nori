#!/usr/bin/env node

const operationToYargsCommand = require('./lib/operation-to-yargs-command');
const stateFiles = require('./lib/state-files');

require('yargs')
	.option('json', {
		describe: 'output JSON-formatted data',
		type: 'boolean',
		global: true,
	})
	.usage(
		'$0 <command> [stateFile]',
		'stateFile: path to a file containing JSON-formatted nori output, or "-" for standard input (e.g. piping)',
	)
	.middleware(stateFiles.middleware.parsePositional)
	.middleware(stateFiles.middleware.load)
	.command(require('./interactive'))
	.commandDir('commands', { visit: operationToYargsCommand })
	.demandCommand()
	.strict()
	.help()
	.showHelpOnFail(false)
	.argv;
