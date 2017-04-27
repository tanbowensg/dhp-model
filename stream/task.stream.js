const Rx = require('rxjs/Rx');
const _ = require('lodash');
const taskApi = require('../api/task.js');
const TaskClass = require('../factory/task.js').Task;
const servicesVm$$ = require('./service.stream.js').servicesVm$$;

const hub = require('./hub.js');
const tasksVm$$ = new Rx.BehaviorSubject().filter(v => v);


// 一收到 socket，就直接去拿列表，然后加以格式化的 Observable
const tasks$ = hub.tasks$$.concatMap(() => Rx.Observable.fromPromise(taskApi.list()))
  // 由于 task 里面只有服务的 id，所以要从对应的服务列表中根据 id 查到名字，然后塞进去再格式化
  .combineLatest(servicesVm$$, (tasks, services) => {
    const serviceIdNameMap = _.fromPairs(_.map(services, s => [s.id, s.name]));
    return _.map(tasks, task => {
      const serviceName = serviceIdNameMap[task.ServiceID];
      // 格式化 task
      return new TaskClass(task, { serviceName });
    });
  });

tasks$.subscribe(tasksVm$$);

tasksVm$$.subscribe(tasks => {
  console.log('task数量', tasks.length)
});

exports.tasks$ = tasks$;
exports.tasksVm$$ = tasksVm$$;
