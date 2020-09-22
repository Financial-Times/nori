/**
 * Exports all tasks for this transformation.
 */
module.exports = {
	updatePackageJsonEngines: require('./update-package-json-engines'),
	updateNvmrc: require('./update-nvmrc'),
	updateCircleciConfig: require('./update-circleci-config'),
}
