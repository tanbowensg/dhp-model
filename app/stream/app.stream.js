// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import appApi from '../api/app.js';
import { App as AppClass, AppDetail as AppDetailClass } from '../factory/app.js';
import { tasksVm$$ } from './task.stream.js';
import { servicesVm$$ } from './service.stream.js';
import { networksVm$$ } from './network.stream.js';

import hub from './hub.js';

const appsVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 一收到 socket，就直接去拿列表
const apps$ = hub.apps$.concatMap(() => Rx.Observable.fromPromise(appApi.list()))
  .zip(tasksVm$$, servicesVm$$, (apps, tasks, services) => {
    return _.map(apps, app => new AppClass(app, tasks, services));
  });

apps$.subscribe(appsVm$$);

appsVm$$.subscribe(apps => {
  console.log('应用数量', apps.length);
}, rej => {
  console.log(rej);
});

/**
 * 获取应用详情
 * @param {String} appName
 * @return {Observable} app
 */
function getAppDetail(appName) {
  return appsVm$$.map(apps => _.find(apps, app => app.name === appName))
    .combineLatest(networksVm$$, (app, networks) => {
      console.log(networks.all.length)
      return new AppDetailClass(app, networks.all);
    });
}

export {
  apps$,
  appsVm$$,
  getAppDetail,
};
