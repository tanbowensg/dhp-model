const util = require('../util/util.js');
const API_URL = require('../constant/constant.js').API_URL;

function apiInfo() {
  return util.get(`${API_URL}/api/info`)
    .then(res => {
      return res;
    });
}

exports.apiInfo = apiInfo;
