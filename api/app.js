const util = require('../util.js');

function list(configs = {}) {
  return util.get('https://192.168.100.205/api/apps', configs);
}

function detail(appName, configs) {
  return util.get(`https://192.168.100.205/api/apps/${appName}`, configs);
}

exports.list = list;
exports.detail = detail;
