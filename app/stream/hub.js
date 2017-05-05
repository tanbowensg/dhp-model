// 这是一个集线器，也是一个数据池
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import { auth$$, userInfo$$ } from './auth.js';
import infoApi from '../api/info.js';
import socketio from '../util/socket.js';

class Hub {
  constructor() {
    this.infoApi = infoApi;
    this.socketio = socketio;
    this.auth$$ = auth$$;
    this.userInfo$$ = userInfo$$;
    this._init();
  }

  _init() {
    // 此乃一切 Observable 和 Subject 起点，故名 alpha。 ———— 博文
    this.α$$ = new Rx.BehaviorSubject().filter(v => v);
    this.socket$$ = new Rx.Subject();
    // hub 是事件的转发器。收到 socket 推送的 job 后，hub 来转发给那些该更新的 Observable
    // 一 Observable 之下，万 Observable 之上。
    this.hub$$ = new Rx.Subject()
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
    this.services$ = this.hub$$.filter(jobs => jobs.includes('service'));
    this.containers$ = this.hub$$.filter(jobs => jobs.includes('container'));
    this.tasks$ = this.hub$$.filter(jobs => jobs.includes('task'));
    this.networks$ = this.hub$$.filter(jobs => jobs.includes('task'));
    this.apps$ = this.hub$$.filter(jobs => jobs.includes('app'));
    this.registries$ = this.hub$$.filter(jobs => jobs.includes('registry'));
  }

  // 启动数据层
  start() {
    // 获取到登录信息后（无论是已经登录了，还是不需要登录的情况），就开始发送请求获取必须的 api
    this._zero$ = this.auth$$.concatMap(() => {
      return Rx.Observable.combineLatest(
        Rx.Observable.fromPromise(infoApi.apiInfo()),
        this.userInfo$$,
        (apiInfo, userInfo) => {
          return [apiInfo, userInfo];
        });
    });

    // 用 α$$ 订阅所有前置的 api，如 apiInfo, userInfo 等等
    this._zero_ = this._zero$
      // 下面是个数组，由于现在只有一个元素，所以就简单点来吧
      .map(array => {
        return array[0];
      })
      .subscribe(this.α$$);

    // 当 α$$ 产生值以后，就启动 socket
    this.α$$.subscribe(apiInfo => {
      // 由于一开始没有 job 推送，为了初始化整个数据池，先手动推送一个 init job
      socketio.connect(apiInfo.StreamRoom);
      socketio.bind('observable', job => {
        this.socket$$.next(job);
      });
      // 初始化一下
      this.socket$$.next('all');
      // job 暂时是不需要格式化的
      // .map(job => new JobClass(job))
    });

    // 用 hub$$ 订阅 socket$$
    this.socket$$.subscribe(this.hub$$);
  }

  // 停止数据层
  stop() {
    this.α$$.complete();
    this.socket$$.complete();
    this.hub$$.complete();
  }
}

const hub$$ = new Hub();

export default hub$$;
