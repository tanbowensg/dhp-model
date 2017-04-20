// 这是一个集线器，也是一个数据池
const appStream = require('./app.stream.js');
const serviceStream = require('./service.stream.js');
const taskStream = require('./task.stream.js');
const hub = {
  apps$: appStream.app$,
  services$: serviceStream.services$,
  tasks$: taskStream.tasks$,
};

serviceStream.getServices();
appStream.getApps();
taskStream.getTasks();

exports.hub = hub;
