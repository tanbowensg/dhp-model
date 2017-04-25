const Rx = require('rxjs/Rx');
const _ = require('lodash');
const taskApi = require('../api/task.js');
const TaskClass = require('../factory/task.js').Task;
const services$ = require('./service.stream.js').services$;

const tasks$ = new Rx.BehaviorSubject().filter(v => v);

function getTasks() {
  Rx.Observable.fromPromise(taskApi.list())
    // 由于 task 里面只有服务的 id，所以要从对应的服务列表中根据 id 查到名字，然后塞进去再格式化
    .combineLatest(services$, (tasks, services) => {
      const serviceIdNameMap = _.fromPairs(_.map(services, s => [s.id, s.name]));
      return _.map(tasks, task => {
        const serviceName = serviceIdNameMap[task.ServiceID];
        // 格式化 task
        return new TaskClass(task, { serviceName });
      });
    })
    .subscribe(tasks => {
      tasks$.next(tasks);
    }, rej => {
      console.log(rej);
    });
}

exports.getTasks = getTasks;
exports.tasks$ = tasks$;
