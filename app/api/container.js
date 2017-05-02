import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function list({ nodeId } = {}) {
  console.log('重新拿了 容器 列表');
  const nodePrefix = nodeId ? `api/nodes/${nodeId}/docker/` : '';
  return get(`${API_URL}/${nodePrefix}containers/json`);
}

// function detail(appName, configs) {
//   return util.get(`${API_URL}/api/apps/${appName}`, configs);
// }

export default {
  list,
};
