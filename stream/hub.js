// 这是一个集线器，也是一个数据池
const appStream = require('./app.stream.js');
const serviceStream = require('./service.stream.js');
const taskStream = require('./task.stream.js');
const infoStream = require('./info.stream.js');

const socketio = require('../util/socket.js');

const hub = {
  apps$: appStream.app$,
  services$: serviceStream.services$,
  tasks$: taskStream.tasks$,
  apiInfo$: infoStream.apiInfo$,
};


// 整个应用初始化的地方，有些 api 是要先于其他 api 调用的
function init(callback) {
  infoStream.getApiInfo();
  const socketio$$ = hub.apiInfo$.subscribe(info => {
    callback(info);
    socketio$$.unsubscribe();
  });
}

init(info => {
  socketio.connect(info.StreamRoom);
  socketio.bind('test', job => {
    console.log(job);
  });
  serviceStream.getServices();
  appStream.getApps();
  taskStream.getTasks();
});

// const reducers = {
//   appUpdate:
// }

exports.hub = hub;
