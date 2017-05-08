import hub from './hub.js';
import Rx from 'rxjs/Rx';
import { auth$$, userInfo$$, login } from './auth.js';
import infoApi from '../api/info.js';
import socketio from '../util/socket.js';

const α$$ = new Rx.BehaviorSubject().filter(v => v);
const socket$$ = new Rx.Subject();
let socket_;

// 调用 init，整个数据层就运行起来了
function init(username, password) {
  // 登录
  login(username, password);
  // 获取到登录信息后（无论是已经登录了，还是不需要登录的情况），就开始发送请求获取必须的 api
  const zero$ = auth$$.concatMap(() => {
    return Rx.Observable.combineLatest(
      Rx.Observable.fromPromise(infoApi.apiInfo()),
      userInfo$$,
      (apiInfo, userInfo) => {
        return [apiInfo, userInfo];
      });
  });

  // 用 α$$ 订阅所有前置的 api，如 apiInfo, userInfo 等等
  zero$.map(array => {
    // 下面是个数组，由于现在只有一个元素，所以就简单点来吧
    return array[0];
  })
  .subscribe(α$$);

  // 当 α$$ 产生值以后，就启动 socket
  α$$.subscribe(apiInfo => {
    // 由于一开始没有 job 推送，为了初始化整个数据池，先手动推送一个 init job
    socketio.connect(apiInfo.StreamRoom);
    socketio.bind('observable', job => {
      socket$$.next(job);
    });
    // 在 subscribe 之前，先把之前的 subscripition 都 unsubscribe，以免重复登录
    if (socket_) {
      socket_.unsubscribe();
    }
    // 用 hub$$ 订阅 _socket$$
    socket_ = socket$$.subscribe(hub.hub$$);
    // 初始化一下
    socket$$.next('all');
    // job 暂时是不需要格式化的
    // .map(job => new JobClass(job))
  });
}

export {
  init,
  α$$,
};
