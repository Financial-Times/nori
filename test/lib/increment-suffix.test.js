const incrementSuffix = require('../../src/lib/increment-suffix')

test('should return untouched if nothing matches', () => {
	expect(incrementSuffix(['things', 'that', 'dont', 'match'], 'this')).toBe(
		'this',
	)
})

test('should add a -1 to a single match', () => {
	expect(incrementSuffix(['it', 'does', 'match', 'this'], 'this')).toBe(
		'this-1',
	)
})

test(`should increment if there's another numbered match`, () => {
	expect(
		incrementSuffix(['it', 'does', 'match', 'this', 'and', 'this-10'], 'this'),
	).toBe('this-11')
})

test('should add another number if we asked for a number in the first place', () => {
	expect(incrementSuffix(['it', 'does', 'match', 'this-10'], 'this-10')).toBe(
		'this-10-1',
	)
})
