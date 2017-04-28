// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const _ = require('lodash');
const appApi = require('../api/app.js');
const AppClass = require('../factory/app.js').App;
const ServiceClass = require('../factory/service.js').Service;
const tasksVm$$ = require('./task.stream.js').tasksVm$$;

const hub = require('./hub.js');

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

const appsVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 一收到 socket，就直接去拿列表
const apps$ = hub.apps$$.concatMap(() => Rx.Observable.fromPromise(appApi.list()))
    // 塞 task
    // 这边理想情况是先 concatMap，然后再 combineLatest，然后一个个塞 task，和服务一样
    // 但是我遇到了问题，subject 和 Observable 的 combineLatest 好像和预期不同
    // 而且 subject 不会 complete，所以不能用 toArray，所以暂时这样。————博文
    .zip(tasksVm$$, (apps, tasks) => {
      return _.map(apps, app => addTasksToApp(app, tasks));
    })
    // 塞服务
    .map(apps => _.map(apps, addServicesToApp))
    // 格式化
    .map(apps => _.map(apps, app => new AppClass(app)));

apps$.subscribe(appsVm$$);

appsVm$$.subscribe(apps => {
  console.log('应用数量', apps.length)
});

exports.apps$ = apps$;
exports.appsVm$$ = appsVm$$;
