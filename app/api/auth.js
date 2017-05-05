import { get, post, toBase64 } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function login(username, password) {
  const authdata = toBase64(`${username}:${password}`);
  const url = `${API_URL}/api/login`;
  const headers = {
    Authorization: `Basic ${authdata}`,
  };

  return post(url, '', { headers });
}
// 获取用户个人信息
function getUserInfo(name) {
  return get(`${API_URL}/api/accounts/${name}`);
}

export default {
  login,
  getUserInfo,
};
