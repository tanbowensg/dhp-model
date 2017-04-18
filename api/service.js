const util = require('../util.js');

function list() {
  return util.get('https://192.168.100.205/services');
}

function detail(serviceId) {
  return util.get(`https://192.168.100.205/services/${serviceId}`);
}

exports.list = list;
exports.detail = detail;
