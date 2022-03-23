import { Operation } from './lib/types'

export default {
	file: require('./commands/file'),
	'team-repos': require('./commands/team-repos'),
	'graphql-repos': require('./commands/graphql-repos'),
	'filter-repo-name': require('./commands/filter-repo-name'),
	clone: require('./commands/clone'),
	'run-script': require('./commands/run-script'),
	'push-branches': require('./commands/push-branches'),
	prs: require('./commands/prs'),
	'get-project': require('./commands/get-project'),
	'create-project': require('./commands/create-project'),
	'add-to-project': require('./commands/add-to-project'),
} as Record<string, Operation>
