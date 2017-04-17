// 这是一个集线器，也是一个数据池
const appStream = require('./app.stream.js');

const hub = {
  apps$: appStream.app$,
};

appStream.getApps();

exports.hub = hub;
