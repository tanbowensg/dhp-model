import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function list() {
  console.log('重新拿了 服务 列表');
  return get(`${API_URL}/services`);
}

function detail(serviceId) {
  return get(`${API_URL}/services/${serviceId}`);
}

export default {
  list,
  detail,
};
