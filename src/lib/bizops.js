const { BizOpsClient } = require('@financial-times/biz-ops-client')
const logger = require('../lib/logger')

exports.bizOps = new BizOpsClient({
	apiKey: process.env.BIZ_OPS_API_KEY,
	systemCode: 'check-repos',
})

exports.bizOpsErrorHandler = function(error, message) {
	logger.log(message, { status: 'fail', message })
	if (error.message.includes('Forbidden') && !process.env.BIZ_OPS_API_KEY) {
		throw Error(`Please set the BIZ_OPS_API_KEY env variable. ${error}`)
	}
	throw error
}
