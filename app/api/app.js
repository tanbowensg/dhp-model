import { get, post } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function list(configs = {}) {
  console.log('重新拿了 应用 列表')
  return get(`${API_URL}/api/apps`, configs);
}

function detail(appName, configs) {
  return get(`${API_URL}/api/apps/${appName}`, configs);
}

// 停止应用
function stop(appName) {
  return post(`${API_URL}/api/apps/${appName}/stop`);
}

// 重启应用
function restart(appName) {
  return post(`${API_URL}/api/apps/${appName}/restart`);
}

export default {
  list,
  detail,
  stop,
  restart,
};
