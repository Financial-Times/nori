const fs = require('mz/fs');

exports.load = async stateFile => JSON.parse(
	await fs.readFile(stateFile, 'utf8')
);

exports.save = ({stateFile, state}) => fs.writeFile(
	stateFile,
	JSON.stringify(state, null, 2)
);

exports.middleware = {
	async load({stateFile, state}) {
		if(stateFile) {
			try {
				state = await exports.load(stateFile);
			} catch(_) {}
		}

		if(!state) {
			state = {
				data: {},
				steps: []
			};
		}

		return Object.assign(
			{state},
			state.data
		);
	}
};
