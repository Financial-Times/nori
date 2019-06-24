const {
	validateTakoHostname,
	formatTakoHostname,
} = require('../../src/lib/is-tako-hostname')

test('should return hostname manipulated into correct format', () => {
	expect(
		validateTakoHostname('https://customer-products.in.ft.com/tako'),
	).toEqual(true)

	expect(
		formatTakoHostname('https://customer-products.in.ft.com/tako'),
	).toEqual('customer-products.in.ft.com')
})

test('should return hostname manipulated into correct format', () => {
	expect(
		validateTakoHostname('https://customer-products.in.ft.com/tako'),
	).toEqual(true)

	expect(
		formatTakoHostname('https://customer-products.in.ft.com/tako/repositories'),
	).toEqual('customer-products.in.ft.com')
})

test('should return hostname manipulated into correct format', () => {
	expect(
		validateTakoHostname('https://customer-products.in.ft.com/tako'),
	).toEqual(true)

	expect(
		formatTakoHostname(
			'https://https://customer-products.in.ft.com/tako/repositories',
		),
	).toEqual('customer-products.in.ft.com')
})

test('should return instruction to edit hostname', () => {
	expect(
		validateTakoHostname('https://customer-products.in.ft.com/tako'),
	).toEqual(true)

	expect(formatTakoHostname('customer-products.in.ft.com/tako/')).toEqual(
		'customer-products.in.ft.com',
	)
})

test('should proceed', () => {
	expect(
		validateTakoHostname('https://customer-products.in.ft.com/tako'),
	).toEqual(true)

	expect(formatTakoHostname('customer-products.in.ft.com')).toEqual(
		'customer-products.in.ft.com',
	)
})

test('requests a different hostname', () => {
	expect(validateTakoHostname('https:customer-products.in')).toEqual(
		'Please enter a valid Tako hostname, e.g. "customer-products-tako.in.ft.com"',
	)
})
