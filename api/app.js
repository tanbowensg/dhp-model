const util = require('../util.js');

function appList(configs = {}) {
  return util.get('https://192.168.100.205/api/apps', configs);
}

function appDetail(appName, configs) {
  return util.get(`https://192.168.100.205/api/apps/${appName}`, configs);
}

exports.appList = appList;
exports.appDetail = appDetail;
