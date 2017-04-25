const util = require('../util/util.js');
const API_URL = require('../constant/constant.js').API_URL;

function list() {
  return util.get(`${API_URL}/tasks`);
}

function appTasks(appName) {
  return util.get(`${this.API_URL}/api/apps/${appName}/tasks`);
}

exports.list = list;
exports.appTasks = appTasks;
