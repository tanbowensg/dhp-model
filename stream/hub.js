// 这是一个集线器，也是一个数据池
const Rx = require('rxjs/Rx');
const infoStream = require('./info.stream.js');
const socketio = require('../util/socket.js');
const JobClass = require('../factory/job.js').Job;

// 此乃一切 Observable 和 Subject 起点，故名 alpha ———— 博文
const α$$ = new Rx.BehaviorSubject().filter(v => v);
// socket 紧跟在 alpha 之后
const socket$$ = new Rx.Subject().map(job => (job === 'init' ? job : new JobClass(job)));

// 但是有些 API 先于 alpha 存在（比如 apiInfo），因此它们叫 zero。
// 但是它们不变不灭，也不需要被感知。 ———— 博文
(function zero() {
  Rx.Observable.combineLatest(infoStream.getApiInfo())
    // 下面是个数组，由于现在只有一个元素，所以就简单点来吧
    .map(array => {
      return array[0];
    })
    .subscribe(α$$);
})();

// 启动 socket
α$$.subscribe(apiInfo => {
  // 由于一开始没有 job 推送，为了初始化整个数据池，先手动推送一个 init job
  socket$$.next('init');
  socketio.connect(apiInfo.StreamRoom);
  socketio.bind('observable', job => {
    console.log(job.Entity.ObjectType)
    socket$$.next(job);
  });
});

exports.apps$$ = socket$$.filter(job => (job === 'init') || (job.Entity.ObjectType === 'Application'));
exports.services$$ = socket$$.filter(job => (job === 'init') || (job.Entity.ObjectType === 'Service'));
exports.tasks$$ = socket$$.filter(job => (job === 'init') || (job.Entity.ObjectType === 'Task'));
