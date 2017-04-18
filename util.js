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

exports.get = get;
