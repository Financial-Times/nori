const fs = require('mz/fs')
const { workspacePath } = require('./constants')
const path = require('path')
const { prompt } = require('enquirer')
const toSentence = require('./to-sentence')
const util = require('util')
const mkdirp = util.promisify(require('mkdirp'))
const colours = require('ansi-colors')

const configVars = [
	{
		name: 'githubAccessToken',
		message: `Github access token ${colours.grey.italic.underline(
			'https://github.com/settings/tokens/new?scopes=repo&description=Nori',
		)}`,
		type: 'password',
	}
]

const configPath = path.join(workspacePath, 'config.json')

async function readConfig() {
	return JSON.parse(await fs.readFile(configPath, 'utf-8'))
}

function writeConfig(config) {
	return fs.writeFile(configPath, JSON.stringify(config))
}

module.exports = async function getConfig(...keys) {
	let config = {}
	await mkdirp(workspacePath)

	try {
		config = await readConfig()
	} catch (_) {}

	const requestedVars = configVars.filter(configVar =>
		keys.includes(configVar.name),
	)

	const missingVars = requestedVars.filter(
		configVar => !(configVar.name in config),
	)

	if (missingVars.length) {
		if (process.stdin.isTTY) {
			const promptConfig = await prompt(missingVars)
			Object.assign(config, promptConfig)
			await writeConfig(config)
		} else {
			throw new Error(
				`Config vars ${toSentence(
					missingVars.map(missing => missing.name),
				)} missing`,
			)
		}
	}

	return config
}
