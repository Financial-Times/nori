#!/usr/bin/env node

require('yargs')
	.commandDir('commands')
	.demandCommand()
	.strict()
	.help()
	.argv;
