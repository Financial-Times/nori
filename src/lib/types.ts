interface OperationType<T> {
	getFromState: (state: StateData) => T
	getInRepos: (state: StateData) => Repository[]
	exists: (op: T) => boolean
	format: (op: T) => string
	shortPreview: (op: T) => string
}

const operationTypes = {
	repos: {
		getFromState: (state) => state.repos,
		getInRepos: (state) => state.repos,
		exists: (repos) => repos && repos.length > 0,
		format: (repos) =>
			repos
				.map((repo) => `https://github.com/${repo.owner}/${repo.name}`)
				.join('\n'),
		shortPreview: (repos) =>
			`${repos.length} repositor${repos.length > 1 ? 'ies' : 'y'}`,
	} as OperationType<Repository[]>,

	remoteBranches: {
		getFromState: (state) =>
			state.repos &&
			state.repos.map((repo) => repo.remoteBranch).filter(Boolean),
		getInRepos: (state) => state.repos?.filter((repo) => repo.remoteBranch),
		exists: (remoteBranches) => remoteBranches && remoteBranches.length > 0,
		format: (remoteBranches) => remoteBranches.join('\n'),
		shortPreview: (remoteBranches) =>
			`${remoteBranches.length} remote branch${
				remoteBranches.length > 1 ? 'es' : ''
			}`,
	} as OperationType<Repository['remoteBranch'][]>,

	localBranches: {
		getFromState: (state) =>
			state.repos &&
			state.repos.map((repo) => repo.localBranch).filter(Boolean),
		getInRepos: (state) => state.repos?.filter((repo) => repo.localBranch),
		exists: (localBranches) => localBranches && localBranches.length > 0,
		format: (localBranches) => localBranches.join('\n'),
		shortPreview: (localBranches) =>
			`${localBranches.length} local branch${
				localBranches.length > 1 ? 'es' : ''
			}`,
	} as OperationType<Repository['localBranch'][]>,

	clones: {
		getFromState: (state) =>
			state.repos && state.repos.map((repo) => repo.clone).filter(Boolean),
		getInRepos: (state) => state.repos?.filter((repo) => repo.clone),
		exists: (clones) => clones && clones.length > 0,
		format: (clones) => clones.join('\n'),
		shortPreview: (clones) =>
			`${clones.length} cloned repo${clones.length > 1 ? 's' : ''}`,
	} as OperationType<Repository['clone'][]>,

	prs: {
		getFromState: (state) =>
			state.repos && state.repos.map((repo) => repo.pr).filter(Boolean),
		getInRepos: (state) => state.repos?.filter((repo) => repo.pr),
		exists: (prs) => prs && prs.length > 0,
		format: (prs) => prs.map((pr) => pr.html_url).join('\n'),
		shortPreview: (prs) =>
			`${prs.length} pull request${prs.length > 1 ? 's' : ''}`,
	} as OperationType<Repository['pr'][]>,

	project: {
		getFromState: (state) => state.project,
		getInRepos: () => [],
		exists: (project) => Boolean(project),
		format: (project) => project.html_url,
		shortPreview: (project) => project.html_url,
	} as OperationType<StateData['project']>,

	projectCards: {
		getFromState: (state) =>
			state.repos && state.repos.map((repo) => repo.card).filter(Boolean),
		getInRepos: (state) => state.repos?.filter((repo) => repo.card),
		exists: (cards) => cards && cards.length > 0,
		format: (cards) =>
			cards
				.map(
					(card) =>
						`${card.project_url.replace('api.github.com', 'github.com')}#card-${
							card.id
						}`,
				)
				.join('\n'),
		shortPreview: (cards) =>
			`${cards.length} card${cards.length > 1 ? 's' : ''}`,
	} as OperationType<Repository['card'][]>,
}

export type OperationNames = keyof typeof operationTypes

export interface Argument {
	name: string
	type: string
	message: string
	validate: (input: string) => Promise<boolean>
}
export type Arguments = Argument[]

export type ArgumentResults = {
	[name: string]: string
}

export interface Step {
	name: string
	args: ArgumentResults
}

import type { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import type { Octokit } from '@octokit/rest'

type PRData = GetResponseDataTypeFromEndpointMethod<Octokit['pulls']['create']>

export interface Repository {
	owner?: string
	name?: string
	centralBranch?: string
	clone?: string
	localBranch?: string
	remoteBranch?: string
	pr?: any
	card?: any
}

export interface StateData {
	repos?: Repository[]
	project?: any
}

export interface State {
	data: StateData
	steps: Step[]
}

export interface Operation {
	command: string
	desc: string
	input: OperationNames[]
	output: OperationNames
	args: Arguments
	handler: (args: ArgumentResults, state: StateData) => Promise<void>
	undo: (args: ArgumentResults, state: StateData) => Promise<void>
}

export default operationTypes
