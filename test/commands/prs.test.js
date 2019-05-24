const prs = require('../../src/commands/prs');
const getOctokit = require('../../src/lib/octokit');

const githubAccessToken = 'mock access token';
const octokit = getOctokit(githubAccessToken);

test('correctly throws an error if given incorrect arguments', () => {
	const templatesArg = prs.args.find(arg => arg.name === 'templates');

	expect(templatesArg.validate({})).toBe('Please provide a Pull Request title');
	expect(templatesArg.validate({ title: 'foo' })).toBeTruthy();
});

describe('creating pull requests', () => {
	test('creates PRs for every repo, interpolating templates', async () => {
		await prs.handler({
			templates: {
				title: 'pull request title ${repo.name}',
				body: 'pull request body ${repo.name}'
			},
			githubAccessToken
		}, {
				repos: [
					{ owner: 'org', name: 'repo1', remoteBranch: 'branch1' },
					{ owner: 'org', name: 'repo2', remoteBranch: 'branch2' },
				],
			}
		)

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
		expect(prs.handler
			({
				templates: {
					title: 'pull request title ` ',
					body: 'pull request body'
				},
				githubAccessToken
			}, {
					repos: [
						{ owner: 'org', name: 'repo1', remoteBranch: 'branch1' },
					],
				}
			)).resolves.not.toThrow()
	});
});

describe('undoing pull requests', () => {
	const state = {
		repos: [
			{ pr: { head: { repo: { owner: { login: 'org' }, name: 'repo1' } }, number: 1 } },
			{ pr: { head: { repo: { owner: { login: 'org' }, name: 'repo2' } }, number: 2 } },
		]
	};

	beforeAll(() => prs.undo({ githubAccessToken }, state));

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

	test('removes PR data from state', () => {
		expect(state).toEqual({
			repos: [{}, {}]
		})
	});
});
