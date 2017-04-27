// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const serviceApi = require('../api/service.js');
const ServiceClass = require('../factory/service.js').Service;

const hub = require('./hub.js');
// const services$ = new Rx.BehaviorSubject();
const services$ = new Rx.BehaviorSubject().filter(v => v);
// 一收到 socket，就直接去拿列表
hub.services$.concatMap(() => Rx.Observable.fromPromise(serviceApi.list()))
  .subscribe(services$);

services$.subscribe(services => {
  console.log('服务数量', services.length)
});


function getServices() {
  return serviceApi.list()
    .then(res => {
      return res.map(service => {
        return new ServiceClass(service);
      });
    })
    .then(res => {
      services$.next(res);
    })
    .catch(rej => {
      console.log(rej);
    });
}

exports.getServices = getServices;
exports.services$ = services$;
