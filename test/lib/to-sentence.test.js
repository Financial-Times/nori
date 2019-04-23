const toSentence = require('../../src/lib/to-sentence');

test('should return only string untouched', () => {
	expect(
		toSentence(['foo'])
	).toEqual(
		'foo'
	);
});

test('should join two strings with and', () => {
	expect(
		toSentence(['foo', 'bar'])
	).toEqual(
		'foo and bar'
	);
});

test('should join more than two strings with commas and and', () => {
	expect(
		toSentence(['foo', 'bar', 'baz', 'quux'])
	).toEqual(
		'foo, bar, baz, and quux'
	);
});
