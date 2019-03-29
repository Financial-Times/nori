#!/usr/bin/env node

const operationToYargsCommand = require('./lib/operation-to-yargs-command');
const stateFiles = require('./lib/state-files');

require('yargs')
	.option('json', {
		describe: 'output JSON-formatted data',
		type: 'boolean',
		global: true,
	})
	.option('state-file', {
		alias: 'f',
		describe: 'path to a file containing JSON-formatted nori output, or "-" for standard input (e.g. piping)',
		type: 'string',
		global: true,
		coerce(stateFile) {
			if(stateFile === '-' || !process.stdin.isTTY) {
				return '/dev/stdin';
			}
		},
	})
	.middleware(stateFiles.middleware.load)
	.command(require('./interactive'))
	.commandDir('commands', { visit: operationToYargsCommand })
	.demandCommand()
	.strict()
	.help()
	.showHelpOnFail(false)
	.argv;
