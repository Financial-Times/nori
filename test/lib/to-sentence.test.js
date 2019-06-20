const toSentence = require('../../src/lib/to-sentence')

test('should return only string untouched', () => {
	expect(toSentence(['quick'])).toEqual('quick')
})

test('should join two strings with and', () => {
	expect(toSentence(['quick', 'brown'])).toEqual('quick and brown')
})

test('should join more than two strings with commas and and', () => {
	expect(toSentence(['quick', 'brown', 'lazy', 'fox'])).toEqual(
		'quick, brown, lazy, and fox',
	)
})
