const util = require('../util.js')

function appList(params, configs) {
	return util.get('http://192.168.100.30/api/apps', configs)
}

exports.appList = appList
