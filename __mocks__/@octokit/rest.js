module.exports = function Octokit() {
	return {
		paginate: jest.fn().mockImplementation(async args => {
			if (args === 'mock listForOrg.endpoint.merge data') {
				return [{ number: 137, id: 'mock project id' }]
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
		},
		pulls: {
			create: jest.fn().mockResolvedValue({
				data: { id: 'mock pr id' },
			}),
			update: jest.fn(),
		},
		issues: {
			createComment: jest.fn(),
		},
	}
}

// Return the Octokit instance for calls to plugin.
module.exports.plugin = () => module.exports
