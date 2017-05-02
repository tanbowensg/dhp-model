import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function apiInfo() {
  return get(`${API_URL}/api/info`)
    .then(res => {
      return res;
    });
}

export default {
  apiInfo,
};
