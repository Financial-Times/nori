const config = {
	env: {
		es6: true,
		node: true,
		jest: true
	},
	parserOptions: {
		ecmaVersion: 2017,
		sourceType: 'module',
		ecmaVersion: 2018
	},
	rules: {
		eqeqeq: 2,
		'guard-for-in': 2,
		'new-cap': 0,
		'no-caller': 2,
		'no-console': 2,
		'no-extend-native': 2,
		'no-irregular-whitespace': 2,
		'no-loop-func': 2,
		'no-undef': 2,
		'no-underscore-dangle': 0,
		'no-unused-vars': 2,
		'no-var': 2,
		'one-var': [2, 'never']
	},
	globals: {},
	plugins: ['no-only-tests'],
	extends: ['prettier'],
	overrides: [
		{
			files: ['test/**/*.js'],
			rules: {
				'no-only-tests/no-only-tests': 2
			}
		}
	],
	settings: {}
};

module.exports = config;
