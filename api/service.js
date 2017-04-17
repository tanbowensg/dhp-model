const util = require('../util.js')

function appList(params, configs) {
	return util.get('https://192.168.100.205/api/apps', configs)
}

exports.appList = appList
