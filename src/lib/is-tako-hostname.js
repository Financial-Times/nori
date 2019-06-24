// checks whether the hostname has been entered into the format that Nori expects, because Nori then interpolates it into the string it uses when calling Tako.

exports.validateTakoHostname = hostname => {
	if (/^https?:\/\/([\w\d\-]+\.)+\w{2,}(\/.+)?$/.test(hostname)) {
		if (/(https:\/\/)*([^\/]*)(\/.*)*/.test(hostname)) {
			return true
		}
	}
	return 'Please enter a valid Tako hostname, e.g. "customer-products-tako.in.ft.com"'
}

exports.formatTakoHostname = hostname => {
	return /(https:\/\/)*([^\/]*)(\/.*)*/.exec(hostname)[2]
}
