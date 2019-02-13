module.exports = {
	testEnvironment: "node",
	collectCoverage: true,
	collectCoverageFrom: [
		"**/src/**"
	],
	coverageDirectory: "test-results/coverage/",
	reporters: [
		"default",
		[
			"jest-junit",
			{
				outputDirectory: "test-results/jest/",
				outputName: "results.xml"
			}
		]
	],
};
