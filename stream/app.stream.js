// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const _ = require('lodash');
const appApi = require('../api/app.js');
const AppClass = require('../factory/app.js').App;
const ServiceClass = require('../factory/service.js').Service;
const services$ = require('./service.stream.js').services$;

const app$ = new Rx.BehaviorSubject();

function manageAppServices(app) {
  const services = _.map(app.Services, serv => new ServiceClass(serv));
  const newApp = _.clone(app);
  newApp.Services = services;
  return newApp;
}

function getApps() {
  Rx.Observable.fromPromise(appApi.list())
    .concatMap(apps => Rx.Observable.from(apps))
    .map(app => manageAppServices(app))
    .map(app => new AppClass(app))
    .toArray()
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
