const _ = require('lodash');
const http = require('http');
const PRIVATE_LABELS = require('../constant/constant.js').PRIVATE_LABELS;

function cutUrl(url) {
  // remove http
  const nohttp = url.split('//')[1];
  const host = nohttp.split('/')[0];
  const path = '/' + nohttp.split('/').slice(1, 99999).join('/');
  return { host, path };
}

function get(url, configs) {
  const hostPath = cutUrl(url);
  const options = {
    hostname: hostPath.host,
    path: hostPath.path,
    headers: configs ? configs.headers : null,
  };
  return new Promise((resolve, reject) => {
    const req = http.get(options, res => {
      let json = '';
      res.setEncoding('utf8');
      res.on('data', d => {
        json += d;
      });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const error = new Error();
          error.body = json;
          error.statusCode = res.statusCode;
          reject(error);
        } else {
          json = JSON.parse(json);
          resolve(json);
        }
      });
    });
    req.end();
  });
}

function post(url, params, configs) {
  const postData = JSON.stringify(params || {});
  const hostPath = cutUrl(url);

  const options = {
    hostname: hostPath.host,
    path: hostPath.path,
    port: 80,
    headers: configs ? configs.headers : {},
    method: 'POST',
  };
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let json = '';
      res.setEncoding('utf8');
      res.on('data', d => {
        json += d;
      });
      res.on('end', () => {
        json = JSON.parse(json);
        if (res.statusCode >= 400) {
          const error = new Error();
          error.body = json;
          error.statusCode = res.statusCode;
          reject(error);
        } else {
          resolve(json);
        }
      });
    });
    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
  });
}

// 剖析镜像地址
//
// 参考: https://github.com/docker/distribution/blob/b6e0cfbdaa1ddc3a17c95142c7bf6e42c5567370/reference/reference.go
function parseImageAddress(imgAddress) {
  const parsed = {
    origin: imgAddress,
    registry: '',
    nameSpace: '',
    imgName: '',
    name: '', // full reference without tag nor digest
    tag: '',
    digest: '',
    url: '',
  };

  const splitedAddress = imgAddress.split('/');

  // DEMO: docker pull daocloud.io/daocloud_prod/daocloud-dashboard-prod-https:latest
  if (splitedAddress.length === 3) {
    parsed.registry = splitedAddress[0];
    parsed.nameSpace = splitedAddress[1];
  } else if (splitedAddress.length === 2) {
    // DEMO: daocloud.io/python or localhost/python
    if (splitedAddress[0].indexOf('.') > -1 || splitedAddress[0] === 'localhost') {
      parsed.registry = splitedAddress[0];

    // DEMO: library/python
    } else {
      parsed.nameSpace = splitedAddress[0];
    }
  }

  const _name = splitedAddress.pop();
  // the first element in splitedName should be the image name with tag or digest
  if (_name.indexOf('@') > 0 && _name.indexOf(':') > 0) { // ubuntu:latest@xxxxx
    const [image, tag] = _name.split('@')[0].split(':');
    parsed.imgName = image;
    parsed.tag = tag || '';
  } else if (_name.indexOf('@') > 0) { // digest string has ':', so we detect '@' character first
    const [image, digest] = _name.split('@');
    parsed.imgName = image;
    parsed.digest = digest;
  } else {
    const [image, tag] = _name.split(':');
    parsed.imgName = image;
    parsed.tag = tag || '';
  }

  const daocloudNamespace = parsed.nameSpace ? `${parsed.nameSpace}/` : '';
  if (parsed.registry === 'daocloud.io') {
    // 三种情况：daocloud.io/mysql daocloud.io/library/mysql 这两种镜像访问控制为公开，还有一种镜像访问控制为公开拉取(pull 镜像无需验证)
    // 所以一定要带上 namespace
    parsed.url = `https://dashboard.daocloud.io/packages/repo/${daocloudNamespace}${parsed.imgName}`;
  } else if (!parsed.nameSpace) {
    parsed.url = `https://hub.docker.com/_/${parsed.imgName}`;
  } else {
    parsed.url = `https://hub.docker.com/r/${parsed.nameSpace}/${parsed.imgName}`;
  }

  parsed.name = [parsed.registry, parsed.nameSpace, parsed.imgName].filter(i => i).join('/');

  // 别名
  parsed.image = parsed.imgName;
  parsed.fullname = parsed.name; // @deprecated 弃用 不要在新代码中使用 fullname 属性, 使用 name 属性代替

  return parsed;
}

/**
 * 文件大小单位转换
 * 不足 1K 的以 B 为单位
 * 不足 1M 的以 K 为单位
 * 依次类推
 *
 * 不合法的输入值或单位将返回  '-'
 *
 * @param {String|Number} num - 转换前的数量
 * @param {string} unit - 输入值的单位
 */
function formatSize(num, unit, hodor) {
  const DEFAULT_STR = hodor || '-';
  const PRECISION = 1;
  const units = ['B', 'K', 'M', 'G', 'T', 'P'];
  if (typeof unit !== 'string') return DEFAULT_STR;
  if (units.indexOf(unit.toUpperCase()) < 0) return DEFAULT_STR;
  if (isNaN(parseFloat(num)) || !isFinite(num)) return DEFAULT_STR;

  if (unit.toUpperCase() === 'B' && num < 1024 ||
    unit.toUpperCase() === 'P' && num >= 1) {
    return `${num}${unit.toUpperCase()}`;
  }

  const inputUnintIndex = units.indexOf(unit.toUpperCase());

  if (num >= 1) {
    const relIndex = Math.floor(Math.log(num) / Math.log(1024));
    const number = (num / Math.pow(1024, Math.floor(relIndex))).toFixed(PRECISION);
    const outputUnit = units[relIndex + inputUnintIndex];
    return `${number}${outputUnit}`;
  }
  const number = (num * 1024).toFixed(PRECISION);
  const outputUnit = units[inputUnintIndex - 1];
  return `${number}${outputUnit}`;
}

// 处理形如"主机名/应用名_自己的名字"的名称字符串
function nameFilter(str, require) {
  let names = {};
  let hostName;
  let name2;
  let appName;
  let ownName;
  if (str.indexOf('/') > -1) {
    hostName = str.split('/')[0];
    name2 = str.split('/')[1];
  } else {
    hostName = '-';
    name2 = str;
  }

  if (name2.indexOf('_') > -1) {
    appName = name2.split('_')[0];
  } else {
    appName = '-';
  }

  ownName = name2;

  // 如果长度大于64，又没有 app 名字，那么它就是一个随机名字，应该截取
  if (ownName.length >= 64 && appName === '-') {
    ownName = ownName.slice(0, 8);
  }

  names = {
    app: appName,
    host: hostName,
    full: name2,
    own: ownName,
  };

  return names[require];
}

/*
 * Service 的标签中有专门用于后端系统识别的私有标签，
 * 比如 `io.daocloud.dce.owner`, 这类标签不能暴露到前端。
 *
 * Service 原始的标签（包括对用户不可见的私有标签）
 *
 * @param {object} originalLabels - 包含有私有方法的标签键值对
 * @return {object}  不包含私有方法的标签键值对
 */
function filterLabels(originalLabels) {
  const filterdLabels = _.clone(originalLabels);
  _.forEach(PRIVATE_LABELS, privateLabel => {
    if (filterdLabels.hasOwnProperty(privateLabel)) {
      delete filterdLabels[privateLabel];
    }
  });
  return filterdLabels;
}

exports.get = get;
exports.post = post;
exports.parseImageAddress = parseImageAddress;
exports.formatSize = formatSize;
exports.nameFilter = nameFilter;
exports.filterLabels = filterLabels;
