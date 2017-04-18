const http = require('http')

function cutUrl (url) {
  // remove http
  const nohttp = url.split('//')[1];
  const host = nohttp.split('/')[0];
  const path = '/' + nohttp.split('/').slice(1, 99999).join('/');
  return { host, path };
}

function get (url, configs) {
  return new Promise((resolve, reject) => {
    const hostPath = cutUrl(url)
    const options = {
      hostname: hostPath.host,
      path: hostPath.path,
      headers: configs ? configs.headers : null,
    };
    http.get(options, res => {
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

exports.get = get;
exports.parseImageAddress = parseImageAddress;
