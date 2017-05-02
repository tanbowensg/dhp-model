const util = require('../util/util.js');
const API_URL = require('../constant/constant.js').API_URL;

function list(configs = {}) {
  console.log('重新拿了 应用 列表')
  return util.get(`${API_URL}/api/apps`, configs);
}

function detail(appName, configs) {
  return util.get(`${API_URL}/api/apps/${appName}`, configs);
}

// 停止应用
function stop(appName) {
  return util.post(`${API_URL}/api/apps/${appName}/stop`);
}

// 重启应用
function restart(appName) {
  return util.post(`${API_URL}/api/apps/${appName}/restart`);
}

exports.list = list;
exports.detail = detail;
exports.stop = stop;
exports.restart = restart;
