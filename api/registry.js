const util = require('../util/util.js');
const API_URL = require('../constant/constant.js').API_URL;

// 获取镜像工场列表
function list() {
  return util.get(`${API_URL}/api/integrations?Catalog=registry`)
}

// 获取内置的镜像工场
function getBuildinRegistry() {
  return util.get(`${API_URL}/api/settings/buildin-registry`)
}

exports.list = list;
exports.getBuildinRegistry = getBuildinRegistry;
