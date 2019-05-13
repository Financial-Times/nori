const prs = require('../../src/commands/prs');
const expectOperation = require('../../test-utils/operation');
const getOctokit = require('../../src/lib/octokit');

const githubAccessToken = 'mock access token';
const octokit = getOctokit(githubAccessToken);

test('`prs` command module exports an operation object', () => {
	expect(prs).toEqual(
		expectOperation('prs')
	);
});

test('correctly throws an error if given incorrect arguments', () => {
	const templatesArg = prs.args.find(arg => arg.name === 'templates');

	expect(templatesArg.validate({})).toBe('Please provide a Pull Request title');
	expect(templatesArg.validate({ title: 'foo' })).toBeUndefined();
});

describe('creating pull requests', () => {
	test('creates PRs for every repo, interpolating templates', async () => {
		await prs.handler({
			templates: {
				title: 'pull request title ${repo.name}',
				body: 'pull request body ${repo.name}'
			},
			repos: [
				{owner: 'org', name: 'repo1'},
				{owner: 'org', name: 'repo2'},
			],
			branches: [
				'branch1',
				'branch2',
			],
			githubAccessToken
		})

		expect(octokit.pulls.create).toHaveBeenCalledWith({
			owner: 'org', repo: 'repo1', head: 'branch1', base: 'master',
			title: 'pull request title repo1',
			body: 'pull request body repo1',
		});

		expect(octokit.pulls.create).toHaveBeenCalledWith({
			owner: 'org', repo: 'repo2', head: 'branch2', base: 'master',
			title: 'pull request title repo2',
			body: 'pull request body repo2',
		});
	});

	test('doesn\'t error on backticks in string', () => {
		expect(prs.handler({
			templates: {
				title: 'pull request title ` ',
				body: 'pull request body'
			},
			repos: [
				{owner: 'org', name: 'repo1'},
			],
			branches: [
				'branch1',
			],
			githubAccessToken
		})).resolves.not.toThrow()
	});
});

describe('undoing pull requests', () => {
	beforeAll(() => prs.undo({
		prs: [
			{head: {repo: {owner: {login: 'org'}, name: 'repo1'}}, number: 1},
			{head: {repo: {owner: {login: 'org'}, name: 'repo2'}}, number: 2},
		],
		githubAccessToken
	}));

	test('comments on every PR', () => {
		expect(octokit.issues.createComment).toHaveBeenCalledWith({
			owner: 'org', repo: 'repo1', number: 1,
			body: 'automatically closed 🤖',
		});

		expect(octokit.issues.createComment).toHaveBeenCalledWith({
			owner: 'org', repo: 'repo2', number: 2,
			body: 'automatically closed 🤖',
		});
	});

	test('closes every PR', () => {
		expect(octokit.pulls.update).toHaveBeenCalledWith({
			owner: 'org', repo: 'repo1', number: 1,
			state: 'closed'
		});

		expect(octokit.pulls.update).toHaveBeenCalledWith({
			owner: 'org', repo: 'repo2', number: 2,
			state: 'closed'
		});
	});
});
