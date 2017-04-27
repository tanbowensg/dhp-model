// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const _ = require('lodash');
const serviceApi = require('../api/service.js');
const ServiceClass = require('../factory/service.js').Service;

const hub = require('./hub.js');
const servicesVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 一收到 socket，就直接去拿列表，并且格式化
const services$ = hub.services$$.concatMap(() => Rx.Observable.fromPromise(serviceApi.list()))
  // 格式化
  .map(services => _.map(services, service => new ServiceClass(service)));

services$.subscribe(servicesVm$$);

servicesVm$$.subscribe(services => {
  console.log('服务数量', services.length)
});

exports.services$ = services$;
exports.servicesVm$$ = servicesVm$$;
