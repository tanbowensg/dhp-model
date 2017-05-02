import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

// 获取镜像工场列表
function list() {
  console.log('重新拿了 registry 列表');
  return get(`${API_URL}/api/integrations?Catalog=registry`);
}

// 获取内置的镜像工场
function getBuildinRegistry() {
  return get(`${API_URL}/api/settings/buildin-registry`);
}

export default {
  list,
  getBuildinRegistry,
};
