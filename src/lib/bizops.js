const { BizOpsClient } = require('@financial-times/biz-ops-client')

exports.bizOps = new BizOpsClient({
	apiKey: process.env.BIZ_OPS_API_KEY,
	systemCode: 'check-repos',
})
