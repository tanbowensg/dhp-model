const Rx = require('rxjs/Rx');
const taskApi = require('../api/task.js');
// const ServiceClass = require('../factory/service.js').Service;

const tasks$ = new Rx.BehaviorSubject().filter(v => v);

function getTasks() {
  return taskApi.list()
    // .then(res => {
    //   return res.map(service => {
    //     return new ServiceClass(service);
    //   });
    // })
    .then(res => {
      tasks$.next(res);
    })
    .catch(rej => {
      console.log(rej);
    });
}

exports.getTasks = getTasks;
exports.tasks$ = tasks$;
