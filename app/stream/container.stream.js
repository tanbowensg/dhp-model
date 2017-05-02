// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const _ = require('lodash');
const containerApi = require('../api/container.js');
const ContainerClass = require('../factory/container.js').Container;
const hub = require('./hub.js');
const containersVm$$ = new Rx.BehaviorSubject().filter(v => v);

// 一收到 socket，就直接去拿列表，并且格式化
const containers$ = hub.containers$$.concatMap(() => Rx.Observable.fromPromise(containerApi.list()))
  // 格式化
  .map(containers => _.map(containers, container => new ContainerClass(container)));

containers$.subscribe(containersVm$$);

containersVm$$.subscribe(containers => {
  console.log('容器数量', containers.length);
});

exports.containers$ = containers$;
exports.containersVm$$ = containersVm$$;
