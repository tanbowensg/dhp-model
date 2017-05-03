// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import serviceApi from '../api/service.js';
import { Service as ServiceClass } from '../factory/service.js';

import hub from './hub.js';
const servicesVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 一收到 socket，就直接去拿列表，并且格式化
const services$ = hub.services$.concatMap(() => Rx.Observable.fromPromise(serviceApi.list()))
  // 格式化
  .map(services => _.map(services, service => new ServiceClass(service)));

services$.subscribe(servicesVm$$);

servicesVm$$.subscribe(services => {
  console.log('服务数量', services.length);
});

export {
  services$,
  servicesVm$$,
};
