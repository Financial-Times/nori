const fs = require('mz/fs')
const { BizOpsClient } = require('@financial-times/biz-ops-client')
const logger = require('../lib/logger')
const { validateFile } = require('../lib/file-validation')

exports.command = 'graphql-repos'
exports.desc = 'get a list of repos by executing the passed in graphql file'
exports.input = []
exports.output = 'repos'

exports.args = [
	{
		name: 'file',
		type: 'text',
		message: 'path to a .graphql | .txt file',
		validate: state =>
			validateFile(
				state,
				'Please enter a path to a file containing graphql query for repositories',
			),
	},
]

function getRepositoryObject(data) {
	let foundObject

	// recursively traverses the nested object with JSON.stringify
	JSON.stringify(data, (_, nestedObject) => {
		if (
			nestedObject &&
			(obj = nestedObject['repositories'] || nestedObject['Repositories'])
		) {
			foundObject = obj
			return
		}
		return nestedObject
	})

	if (foundObject === undefined) {
		throw Error(
			`Please query for 'Repositories' or 'repositories', for example:
            {
                Repositories(filter: {code_contains: "customer"}) {
                    name
                }
            } 
            another example:
            {
                Team(filter: { isActive: true, code: "platforms-customer-products" }) {
                    repositories {
                        name
                    }
                }
            }`,
		)
	}

	if (!foundObject || !foundObject.length) {
		throw Error(
			'Your query returned 0 repositories, please try with another query',
		)
	}

	const repos = []
	for (repo of foundObject) {
		const name = repo.name
		if (!name) {
			throw Error(
				`Your query returned ${foundObject.length} repositor${
					foundObject.length > 1 ? 'ies' : 'y'
				} but did not return any repository name. ` +
					`Please specify the property 'name' under Repositories / repositories.`,
			)
		}
		repos.push({ owner: 'Financial-Times', name: repo.name })
	}

	return repos
}

exports.handler = async ({ file }, state) => {
	//TODO: refactor to be instantiated in common area
	const bizOps = new BizOpsClient({
		apiKey: process.env.BIZ_OPS_API_KEY,
		systemCode: 'check-repos',
	})

	const query = await fs.readFile(file, 'utf8')
	const message = 'Executing graphQL query on bizops: \n' + query

	logger.log(message, { status: 'pending', message })
	const result = await bizOps.graphQL.get(query)
	logger.log(message, { status: 'done', message })

	state.repos = getRepositoryObject(result)
}

exports.undo = (_, state) => {
	delete state.repos
}
