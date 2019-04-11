// formats an array of strings ['foo', 'bar', 'baz'] as a
// comma-and-and separated string 'foo, bar, and baz'
const toSentence = words => {
	let string = words.slice(0, -1).join(', ');

	if (words.length > 2) {
		string += ',';
	}

	if (words.length > 1) {
		string += ' and ';
	}

	string += words[words.length - 1];

	return string;
};

module.exports = toSentence;
