// 这是一个集线器，也是一个数据池
const Rx = require('rxjs/Rx');

// const appStream = require('./app.stream.js');
// const serviceStream = require('./service.stream.js');
// const taskStream = require('./task.stream.js');
const infoStream = require('./info.stream.js');
const socketio = require('../util/socket.js');

const JobClass = require('../factory/job.js').Job;

const appApi = require('../api/app.js');

// 此乃一切 Observable 和 Subject 起点，故名 alpha ———— 博文
const alpha$ = new Rx.BehaviorSubject().filter(v => v);
// socket 紧跟在 alpha 之后
const socket$ = new Rx.Subject().map(job => new JobClass(job));

// 但是有些 API 先于 alpha 存在（比如 apiInfo），因此它们叫 zero。
// 但是它们不变不灭，也不需要被感知。 ———— 博文
(function zero() {
  Rx.Observable.combineLatest(infoStream.getApiInfo())
    // 下面是个数组，由于现在只有一个元素，所以就简单点来吧
    .map(array => {
      return array[0]
    })
    .subscribe(alpha$);
})();

alpha$.subscribe(apiInfo => {
  socketio.connect(apiInfo.StreamRoom)
  socketio.bind('observable', job => {
    socket$.next(job);
  });
});

const hub = {
  apps$: socket$.filter(job => job.Entity.ObjectType === 'Application'),
  services$: socket$.filter(job => job.Entity.ObjectType === 'Service'),
  tasks$: socket$.filter(job => job.Entity.ObjectType === 'Task'),
};

exports.hub = hub;
