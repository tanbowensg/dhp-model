// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const _ = require('lodash');
const appApi = require('../api/app.js');
const AppClass = require('../factory/app.js').App;
const ServiceClass = require('../factory/service.js').Service;
const tasks$ = require('./task.stream.js').tasks$;

const app$ = new Rx.BehaviorSubject();


// 把格式化好的服务塞到应用里
function addServicesToApp(app) {
  const services = _.map(app.Services, serv => new ServiceClass(serv));
  const newApp = _.clone(app);
  newApp.Services = services;
  return newApp;
}

// 把 tasks 塞到应用里
function addTasksToApp(app, tasks) {
  const appTasks = _.chain(app.Services)
    .map('ID')
    // 这里就不对每个 task 重新发请求了，直接用 taskList 里的数据
    .map(serviceId => _.find(tasks, { serviceId }))
    .value();
  app.tasks = appTasks;
  return app;
}

function getApps() {
  Rx.Observable.fromPromise(appApi.list())
    // 塞 task
    // 这边理想情况是先 concatMap，然后再 combineLatest，然后一个个塞 task，和服务一样
    // 但是我遇到了问题，subject 和 Observable 的 combineLatest 好像和预期不同
    // 而且 subject 不会 complete，所以不能用 toArray。，所以暂时这样。————博文
    .combineLatest(tasks$, (apps, tasks) => {
      return _.map(apps, app => addTasksToApp(app, tasks));
    })
    // 塞服务
    .map(apps => _.map(apps, addServicesToApp))
    // 格式化
    .map(apps => _.map(apps, app => new AppClass(app)))
    .subscribe(apps => {
      app$.next(apps);
    }, rej => {
      console.log(rej);
    });
}

/**
 * 重启应用
 * @param {String} appName
 */
function restart(appName) {
  return appApi.restart(appName)
    .then(res => {
      getApps();
      return res;
    });
}

/**
 * 停止应用
 * @param {String} appName
 */
function stop(appName) {
  return appApi.stop(appName)
    .then(res => {
      getApps();
      return res;
    });
}



exports.getApps = getApps;
exports.restart = restart;
exports.stop = stop;
exports.app$ = app$;
