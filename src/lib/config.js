const fs = require('mz/fs');
const {workspacePath} = require('./constants');
const path = require('path');
const {prompt} = require('enquirer');
const toSentence = require('./to-sentence');

const configVars = [{
	name: 'githubAccessToken',
	message: 'Github access token (https://github.com/settings/tokens/new?scopes=repo&description=Nori)',
	type: 'password'
},{
	name: 'takoHost',
	message: 'Tako hostname',
	type: 'text',
}, {
	name: 'takoToken',
	message: 'Tako access token',
	type: 'password'
}];

const configPath = path.join(workspacePath, 'config.json');

async function readConfig() {
	return JSON.parse(
		await fs.readFile(configPath, 'utf-8')
	);
}

function writeConfig(config) {
	return fs.writeFile(
		configPath,
		JSON.stringify(config)
	);
}

module.exports = async function getConfig() {
	let config = {};

	try {
		config = await readConfig();
	} catch(_) {}

	const missingVars = configVars.filter(
		configVar => !(configVar.name in config)
	);

	if(missingVars.length) {
		if(process.stdin.isTTY) {
			const promptConfig = await prompt(configVars);
			Object.assign(config, promptConfig);
			await writeConfig(config);
		} else {
			throw new Error(`Config vars ${toSentence(missingVars)} missing`);
		}
	}

	return config;
}