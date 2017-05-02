import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function list({ nodeId } = {}) {
  console.log('重新拿了 网络 列表');
  const nodePrefix = nodeId ? `api/nodes/${nodeId}/docker/` : '';
  return get(`${API_URL}/${nodePrefix}networks`);
}

export default {
  list,
};
