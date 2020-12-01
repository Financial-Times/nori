exports.Octokit = function Octokit() {
	return {
		paginate: jest.fn().mockImplementation(async args => {
			switch (args) {
				case 'mock listForOrg.endpoint.merge data':
					return [{ number: 137, id: 'mock project id' }]
				case 'mock listCards.endpoint.merge data':
					return [{ number: 137, id: 'mock card id' }]
				case 'mock list.endpoint.merge data':
					// TODO: if this isn't empty prs assumes it's the
					// existing pr for this branch. how to test both cases
					return []
			}
		}),
		projects: {
			createForOrg: jest.fn().mockResolvedValue({
				data: {
					id: 'mock project id',
				},
			}),
			createColumn: jest.fn().mockResolvedValue({
				data: {
					id: 'mock column id',
				},
			}),
			createCard: jest.fn().mockResolvedValue({
				data: {
					id: 'mock card id',
				},
			}),
			deleteCard: jest.fn(),
			update: jest.fn(),
			listForOrg: Object.assign(jest.fn(), {
				endpoint: {
					merge: jest
						.fn()
						.mockReturnValue('mock listForOrg.endpoint.merge data'),
				},
			}),
			listColumns: jest
				.fn()
				.mockResolvedValue({ data: [{ id: 'mock column id' }] }),
			listCards: Object.assign(jest.fn(), {
				endpoint: {
					merge: jest
						.fn()
						.mockReturnValue('mock listCards.endpoint.merge data'),
				},
			}),
		},
		pulls: {
			create: jest.fn().mockResolvedValue({
				data: { id: 'mock pr id' },
			}),
			update: jest.fn(),
			list: Object.assign(jest.fn(), {
				endpoint: {
					merge: jest.fn().mockReturnValue('mock list.endpoint.merge data'),
				},
			}),
		},
		issues: {
			createComment: jest.fn(),
		},
	}
}

// Return the Octokit instance for calls to plugin.
exports.Octokit.plugin = () => exports.Octokit
