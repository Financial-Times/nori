module.exports = {
	repos: {
		getFromState: state => state.repos,
		exists: repos => repos && repos.length > 0,
		format: repos =>
			repos
				.map(repo => `https://github.com/${repo.owner}/${repo.name}`)
				.join('\n'),
		shortPreview: repos =>
			`${repos.length} repositor${repos.length > 1 ? 'ies' : 'y'}`,
	},

	branches: {
		getFromState: state =>
			state.repos && state.repos.map(repo => repo.remoteBranch).filter(Boolean),
		exists: branches => branches && branches.length > 0,
		format: branches => branches.join('\n'),
		shortPreview: branches =>
			`${branches.length} remote branch${branches.length > 1 ? 'es' : ''}`,
	},

	prs: {
		getFromState: state =>
			state.prs && state.prs.map(repo => repo.remoteBranch).filter(Boolean),
		exists: prs => prs && prs.length > 0,
		format: prs => prs.map(pr => pr.html_url).join('\n'),
		shortPreview: prs =>
			`${prs.length} pull request${prs.length > 1 ? 's' : ''}`,
	},

	project: {
		getFromState: state => state.project,
		exists: project => Boolean(project),
		format: project => project.html_url,
		shortPreview: project => project.html_url,
	},
}
