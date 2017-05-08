// 这是一个集线器，也是一个数据池
import Rx from 'rxjs/Rx';
import _ from 'lodash';

// hub 是事件的转发器。收到 socket 推送的 job 后，hub 来转发给那些该更新的 Observable
// 一 Observable 之下，万 Observable 之上。
const hub$$ = new Rx.Subject()
  // hub 作为 socket 的转发器。因为实际要刷新的数据类型，并不总是等于 socket 推送过来的类型。
  .map(job => {
    if (job === 'all') {
      return ['app', 'service', 'task', 'network', 'container', 'registry', 'repository'];
    }
    switch (_.get(job, 'Entity.ObjectType')) {
      case 'Application':
      case 'Service':
      case 'Task':
        return ['app', 'service', 'task', 'container'];
      default:
    }
  });
const services$ = hub$$.filter(jobs => jobs.includes('service'));
const containers$ = hub$$.filter(jobs => jobs.includes('container'));
const tasks$ = hub$$.filter(jobs => jobs.includes('task'));
const networks$ = hub$$.filter(jobs => jobs.includes('task'));
const apps$ = hub$$.filter(jobs => jobs.includes('app'));
const registries$ = hub$$.filter(jobs => jobs.includes('registry'));

export default {
  hub$$,
  services$,
  containers$,
  tasks$,
  networks$,
  apps$,
  registries$,
};
