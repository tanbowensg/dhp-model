import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

// 获取镜像工场列表
function list() {
  console.log('重新拿了 registry 列表');
  return get(`${API_URL}/api/integrations?Catalog=registry`);
}

// 获取内置的镜像工场
function getBuildinRegistry() {
  console.log('拿了内置的镜像工场')
  return get(`${API_URL}/api/settings/buildin-registry`);
}

// 获取一个镜像工场的 repository 列表
function getRegistryRepositories(registryName, namespace, WithRemote = 1) {
  // buildin-registry 的名字就叫 buildin-registry
  namespace = namespace ? `/${namespace}` : '';
  return get(`${API_URL}/api/registries/${registryName}/repositories${namespace}?WithRemote=${WithRemote}`);
}

export default {
  list,
  getBuildinRegistry,
  getRegistryRepositories,
};
