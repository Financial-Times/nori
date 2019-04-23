module.exports = name => expect.objectContaining({
	command: expect.stringMatching(name),
	desc: expect.any(String),
	args: expect.arrayContaining([
		expect.objectContaining({
			name: expect.any(String),
			type: expect.any(String),
			message: expect.any(String),
		})
	]),
	handler: expect.any(Function),
	output: expect.any(String),

	// note: input should be an array. the elements in the array should be strings
	input: expect.any(Array),
})
