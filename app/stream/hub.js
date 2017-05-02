// 这是一个集线器，也是一个数据池
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import { getApiInfo } from './info.stream.js';
import socketio from '../util/socket.js';

// 此乃一切 Observable 和 Subject 起点，故名 alpha ———— 博文
const α$$ = new Rx.BehaviorSubject().filter(v => v);
// hub 是事件的转发器。收到 socket 推送的 job 后，hub 来转发给那些该更新的 Observable
// 一 Observable 之下，万 Observable 之上。
const hub$$ = new Rx.Subject()
  // hub 作为 socket 的转发器。因为实际要刷新的数据类型，并不总是等于 socket 推送过来的类型。
  .map(job => {
    if (job === 'all') {
      return ['app', 'service', 'task', 'network', 'container', 'registry'];
    }
    switch (_.get(job, 'Entity.ObjectType')) {
      case 'Application':
      case 'Service':
      case 'Task':
        return ['app', 'service', 'task', 'container'];
      default:
    }
  });

// 这些都是分管各个数据的 Observable，它们都能独当一面，但是都受 hub 号令。
const services$$ = hub$$.filter(jobs => jobs.includes('service'));
const containers$$ = hub$$.filter(jobs => jobs.includes('container'));
const tasks$$ = hub$$.filter(jobs => jobs.includes('task'));
const networks$$ = hub$$.filter(jobs => jobs.includes('task'));
const apps$$ = hub$$.filter(jobs => jobs.includes('app'));
const registries$$ = hub$$.filter(jobs => jobs.includes('registry'));

// ————————————————从下面开始，整个应用的数据就开始初始化了————————————————————

// 有些 API 先于 alpha 存在（比如 apiInfo），因此它们叫 zero。
// 但是它们不变不灭，也不需要被感知。alpha 会负责转达和保存它们的信息。 ———— 博文
(function zero() {
  Rx.Observable.combineLatest(getApiInfo())
    // 下面是个数组，由于现在只有一个元素，所以就简单点来吧
    .map(array => {
      return array[0];
    })
    .subscribe(α$$);
})();

// 启动 socket
α$$.subscribe(apiInfo => {
  // socket$
  Rx.Observable.create(observer => {
    // 由于一开始没有 job 推送，为了初始化整个数据池，先手动推送一个 init job
    socketio.connect(apiInfo.StreamRoom);
    socketio.bind('observable', job => {
      observer.next(job);
    });
    // 初始化一下
    observer.next('all');
  })
  // job 暂时是不需要格式化的
  // .map(job => new JobClass(job))
  .subscribe(hub$$);
});

export default {
  α$$,
  apps$$,
  services$$,
  tasks$$,
  networks$$,
  containers$$,
  registries$$,
};
