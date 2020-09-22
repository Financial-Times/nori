const fs = require('fs')

/**
 * Updates `.circleci/config.yml` and adds changes to git (no commit).
 */
module.exports = async ({ git, workingDirectory, pinnedNodeVersion }) => {
	let madeChanges = false
	let commitMessage =
		'- `.circleci/config.yml` Docker image for `container_config_node` - '

	const pinnedNodeVersionMajor = pinnedNodeVersion.substr(
		0,
		pinnedNodeVersion.lastIndexOf('.'),
	)

	const circleciNodeDockerImage = `circleci/node:${pinnedNodeVersionMajor}-browsers`
	const circleciNodeDockerLambdaImage = `lambci/lambda:build-nodejs${pinnedNodeVersionMajor}.x`
	const circleciNodeDockerImageName = `container_config_node${pinnedNodeVersionMajor}`
	const circleciNodeDockerLambdaImageName = `container_config_lambda_node${pinnedNodeVersionMajor}`

	const circleciConfigFilename = '.circleci/config.yml'
	const circleciConfigFilepath = `${workingDirectory}/${circleciConfigFilename}`

	let circleciConfig = fs.readFileSync(circleciConfigFilepath, {
		encoding: 'utf8',
	})

	let dockerImageChangeRequired
	let dockerLambdaImageChangeRequired
	let dockerImageNameChangeRequired
	let dockerLambdaImageNameChangeRequired
	let previousCircleciNodeDockerImage
	let previousCircleciNodeDockerImageVersion

	//---------------

	const dockerImageRegExp = /image\:\s+(circleci\/node\:([0-9\.]+)[^\n]+)/

	if (dockerImageRegExp.test(circleciConfig)) {
		;[
			,
			previousCircleciNodeDockerImage,
			previousCircleciNodeDockerImageVersion,
		] = circleciConfig.match(dockerImageRegExp)

		dockerImageChangeRequired =
			previousCircleciNodeDockerImageVersion !== pinnedNodeVersionMajor

		if (dockerImageChangeRequired)
			circleciConfig = circleciConfig.replace(
				dockerImageRegExp,
				`image: ${circleciNodeDockerImage}`,
			)
	}

	//---------------

	const dockerLambdaImageRegExp = /image\:\s+(lambci\/lambda:build-nodejs([0-9]+)[^\n]+)/

	if (dockerLambdaImageRegExp.test(circleciConfig)) {
		const [
			,
			previousCircleciNodeDockerLambdaImage,
			previousCircleciNodeDockerLambdaImageVersion,
		] = circleciConfig.match(dockerLambdaImageRegExp)

		dockerLambdaImageChangeRequired =
			previousCircleciNodeDockerLambdaImageVersion !== pinnedNodeVersionMajor

		if (dockerLambdaImageChangeRequired)
			circleciConfig = circleciConfig.replace(
				dockerLambdaImageRegExp,
				`image: ${circleciNodeDockerLambdaImage}`,
			)
	}

	//---------------

	const dockerImageNameRegExp = /container_config_node([0-9]+)/g

	if (dockerImageNameRegExp.test(circleciConfig)) {
		const [
			,
			previousCircleciNodeDockerImageName,
			previousCircleciNodeDockerImageNameVersion,
		] = circleciConfig.match(dockerImageNameRegExp)

		dockerImageNameChangeRequired =
			previousCircleciNodeDockerImageNameVersion !== pinnedNodeVersionMajor

		if (dockerImageNameChangeRequired)
			circleciConfig = circleciConfig.replace(
				dockerImageNameRegExp,
				circleciNodeDockerImageName,
			)
	}

	//---------------

	const dockerLambdaImageNameRegExp = /container_config_lambda_node([0-9]+)/g

	if (dockerLambdaImageNameRegExp.test(circleciConfig)) {
		const [
			,
			previousCircleciNodeDockerLambdaImageName,
			previousCircleciNodeDockerLambdaImageNameVersion,
		] = circleciConfig.match(dockerLambdaImageNameRegExp)

		dockerLambdaImageNameChangeRequired =
			previousCircleciNodeDockerLambdaImageNameVersion !==
			pinnedNodeVersionMajor

		if (dockerLambdaImageNameChangeRequired)
			circleciConfig = circleciConfig.replace(
				dockerLambdaImageNameRegExp,
				circleciNodeDockerLambdaImageName,
			)
	}

	//---------------

	const changeRequired =
		dockerImageChangeRequired ||
		dockerLambdaImageChangeRequired ||
		dockerImageNameChangeRequired ||
		dockerLambdaImageNameChangeRequired

	if (changeRequired) {
		fs.writeFileSync(circleciConfigFilepath, circleciConfig)

		console.log(
			`-- update-circleci-config: \`.circleci/config.yml\` has been updated`,
		)
		commitMessage += `Docker updated, previously: \`${previousCircleciNodeDockerImage}\``

		await git.add({ files: circleciConfigFilename })
		madeChanges = true
	} else {
		const noChange = `no change, already set to ${circleciNodeDockerImage}`
		console.log(
			`-- update-circleci-config: \`.circleci/config.yml\` ${noChange}`,
		)
		commitMessage += noChange
	}

	return { madeChanges, commitMessage }
}
