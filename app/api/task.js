import { get } from '../util/util.js';
import { API_URL } from '../constant/constant.js';

function list() {
  console.log('重新拿了 task 列表');
  return get(`${API_URL}/tasks`);
}

function appTasks(appName) {
  return get(`${this.API_URL}/api/apps/${appName}/tasks`);
}

export default {
  list,
  appTasks,
};
