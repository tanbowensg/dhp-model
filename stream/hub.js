// 这是一个集线器，也是一个数据池
const appStream = require('./app.stream.js');
const serviceStream = require('./service.stream.js');
const hub = {
  apps$: appStream.app$,
  services$: serviceStream.services$,
};

serviceStream.getServices();
appStream.getApps();

exports.hub = hub;
