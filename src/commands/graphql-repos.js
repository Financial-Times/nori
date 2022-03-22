const fs = require('mz/fs')
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
		message:
			'path to a .graphql | .txt file containing graphql query for repositories',
		validate: state =>
			validateFile(
				state,
				['.graphql', '.txt'],
				'Please enter a path to a .graphql | .txt file containing graphql query for repositories',
			),
	},
]

function getRepositoryObject(data) {
	let foundObject

	// recursively traverses the nested object with JSON.stringify
	JSON.stringify(data, (_, nestedObject) => {
		let obj
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
			`Please query for 'repositories', for example:
            {
                repositories(where: {code_CONTAINS: "customer"}) {
                    name
                }
            } 
            another example:
            {
                teams(where: { isActive: true, code: "platforms-customer-products" }) {
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
	for (const repo of foundObject) {
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
	const { bizOps, bizOpsErrorHandler } = require('../lib/bizops')
	const query = await fs.readFile(file, 'utf8')
	const message = 'Executing graphQL query on bizops: \n' + query

	logger.log(message, { status: 'pending', message })

	try {
		const result = await bizOps.graphQL.get(query)
		logger.log(message, { status: 'done', message })
		state.repos = getRepositoryObject(result)
	} catch (error) {
		return bizOpsErrorHandler(error, message)
	}
}

exports.undo = (_, state) => {
	delete state.repos
}
