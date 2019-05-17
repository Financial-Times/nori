module.exports = {
	repos: {
		argument: {
			type: 'list',
			result: repos => repos.map(repo => {
				const [match, owner, name] = repo.match(/(.+?)\/(.+?)(?:.git)?$/) || [false];
				if (match) {
					return { owner, name };
				}

				throw new Error(`${repo} is not a valid repository`);
			})
		},
		serialise: state => JSON.stringify(state.repos, null, 2),
		format: state => state.repos.map(repo => `https://github.com/${repo.owner}/${repo.name}`).join('\n'),
		shortPreview: state => state.repos ? `${state.repos.length} repositor${state.repos.length > 1 ? 'ies' : 'y'}` : false,
	},

	branches: {
		argument: { type: 'list' },
		serialise: state => JSON.stringify(state.repos.filter(repo => repo.remoteBranch), null, 2),
		format: state => state.repos.map(repo => repo.remoteBranch).filter(Boolean).join('\n'),
		shortPreview: state => {
			if (!state.repos) return false;

			const reposWithBranch = state.repos.filter(repo => 'remoteBranch' in repo)
			if (reposWithBranch.length === 0) return false;

			return `${reposWithBranch.length} remote branch${reposWithBranch.length > 1 ? 'es' : ''}`;
		}
	},

	prs: {
		argument: { type: 'list' },
		serialise: state => JSON.stringify(state.repos.filter(repo => repo.pr), null, 2),
		format: state => state.repos.map(repo => repo.pr && repo.pr.html_url).filter(Boolean).join('\n'),
		shortPreview: state => {
			if (!state.repos) return false;

			const reposWithPr = state.repos.filter(repo => 'pr' in repo)
			if (reposWithPr.length === 0) return false;

			return `${reposWithPr.length} pull request${reposWithPr.length > 1 ? 's' : ''}`;
		}
	},

	project: {
		argument: { type: 'list' },
		serialise: state => JSON.stringify(state.project, null, 2),
		format: state => state.project.html_url,
		shortPreview: state => state.project ? state.project.html_url : false,
	},
};
