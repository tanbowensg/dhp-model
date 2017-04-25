const util = require('../util/util.js');
const API_URL = require('../constant/constant.js').API_URL;

function list() {
  return util.get(`${API_URL}/services`);
}

function detail(serviceId) {
  return util.get(`${API_URL}/services/${serviceId}`);
}

exports.list = list;
exports.detail = detail;
