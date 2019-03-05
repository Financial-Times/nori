/* {
	name: 'ebi',
	input: 'repos',
	output: 'repos',
	prompt: () => prompt([{
		name: 'type',
		type: 'select',
		choices: Object.keys(ebi),
	}, {
		name: 'query',
		type: 'text',
	}]),
	get: ({type, query}, {repos}) => {
		const ebiCommand = ebi[type];
		const yargs = ebiCommand.builder(subYargs(query.split(/ +/)));
		console.log(yargs.argv);
		return repos;
	},
}, */