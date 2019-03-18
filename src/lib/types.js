module.exports = {
	repos: {
		argument: {
			type: 'list',
			result: repos => repos.map(repo => {
				const [match, owner, name] = repo.match(/(.+?)\/(.+?)(?:.git)?$/) || [false];
				if(match) {
					return {owner, name};
				}

				throw new Error(`${repo} is not a valid repository`);
			})
		},
		format: repos => repos.map(repo => `https://github.com/${repo.owner}/${repo.name}`).join('\n'),
		shortPreview: repos => repos ? `${repos.length} repositor${repos.length > 1 ? 'ies' : 'y'}` : false,
	},

	branches: {
		argument: {type: 'list'},
		format: result => result.join('\n'),
		shortPreview: branches => branches ? `${branches.length} branch${branches.length > 1 ? 'es' : ''}` : false,
	},

	// TODO idk get from github api maybe? what's the best thing to input here a url?
	prs: {
		argument: {type: 'list'},
		format: result => result.map(pr => pr.html_url).join('\n'),
		shortPreview: prs => prs ? `${prs.length} pull request${prs.length > 1 ? 's' : ''}` : false,
	},

	project: {
		argument: {type: 'list'},
		format: result => result.html_url,
		shortPreview: project => project ? project.html_url : false,
	},
};
