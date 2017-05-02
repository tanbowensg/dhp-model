const util = require('../util/util.js');
const API_URL = require('../constant/constant.js').API_URL;

function list({ nodeId } = {}) {
  console.log('重新拿了 网络 列表');
  const nodePrefix = nodeId ? `api/nodes/${nodeId}/docker/` : '';
  return util.get(`${API_URL}/${nodePrefix}networks`)
}

exports.list = list;
