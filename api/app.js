const util = require('../util.js');

function list(configs = {}) {
  return util.get('http://192.168.100.205/api/apps', configs);
}

function detail(appName, configs) {
  return util.get(`http://192.168.100.205/api/apps/${appName}`, configs);
}

// 停止应用
function stop(appName) {
  return util.post(`http://192.168.100.205/api/apps/${appName}/stop`);
}

// 重启应用
function restart(appName) {
  return util.post(`http://192.168.100.205/api/apps/${appName}/restart`);
}

exports.list = list;
exports.detail = detail;
exports.stop = stop;
exports.restart = restart;
