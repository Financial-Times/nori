module.exports = function Octokit() {
	return {
		projects: {
			createForOrg: jest.fn().mockReturnValue(Promise.resolve({
				data: {
					id: 'mock project id'
				}
			})),
			createColumn: jest.fn().mockReturnValue(Promise.resolve({
				data: {
					id: 'mock column id'
				}
			})),
			createCard: jest.fn(),
			update: jest.fn(),
		},
		pulls: {
			create: jest.fn().mockReturnValue(Promise.resolve({
				data: { id: 'mock pr id' }
			})),
			update: jest.fn()
		},
		issues: {
			createComment: jest.fn()
		}
	}
}
