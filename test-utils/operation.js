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
	input: expect.arrayContaining([
		expect.any(String)
	])
})
