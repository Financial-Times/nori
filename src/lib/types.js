module.exports = {
	repos: {
		getFromState: state => state.repos,
		exists: repos => repos && repos.length > 0,
		format: repos => repos.map(repo => `https://github.com/${repo.owner}/${repo.name}`).join('\n'),
		shortPreview: repos => `${repos.length} repositor${repos.length > 1 ? 'ies' : 'y'}`,
	},

	remoteBranches: {
		getFromState: state => state.repos && state.repos.map(repo => repo.remoteBranch).filter(Boolean),
		exists: remoteBranches => remoteBranches && remoteBranches.length > 0,
		format: remoteBranches => remoteBranches.join('\n'),
		shortPreview: remoteBranches => `${remoteBranches.length} remote branch${remoteBranches.length > 1 ? 'es' : ''}`,
	},

	localBranches: {
		getFromState: state => state.repos && state.repos.map(repo => repo.localBranch).filter(Boolean),
		exists: localBranches => localBranches && localBranches.length > 0,
		format: localBranches => localBranches.join('\n'),
		shortPreview: localBranches => `${localBranches.length} local branch${localBranches.length > 1 ? 'es' : ''}`,
	},

	clones: {
		getFromState: state => state.repos && state.repos.map(repo => repo.clone).filter(Boolean),
		exists: clones => clones && clones.length > 0,
		format: clones => clones.join('\n'),
		shortPreview: clones => `${clones.length} cloned repo${clones.length > 1 ? 's' : ''}`,
	},

	prs: {
		getFromState: state => state.prs && state.prs.map(repo => repo.remoteBranch).filter(Boolean),
		exists: prs => prs && prs.length
			> 0,
		format: prs => prs.map(pr => pr.html_url).join('\n'),
		shortPreview: prs => `${prs.length} pull request${prs.length > 1 ? 's' : ''}`,
	},

	project: {
		getFromState: state => state.project,
		exists: project => Boolean(project),
		format: project => project.html_url,
		shortPreview: project => project.html_url,
	},
};
