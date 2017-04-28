// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const _ = require('lodash');
const networkApi = require('../api/network.js');
const hub = require('./hub.js');
// const NetworkClass = require('../factory/network.js').Network;
const networksVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 一收到 socket，就直接去拿列表，并且格式化
const networks$ = hub.networks$$.concatMap(() => Rx.Observable.fromPromise(networkApi.list()))
  // 格式化
  // .map(networks => _.map(networks, network => new NetworkClass(network)));

networks$.subscribe(networksVm$$);

networksVm$$.subscribe(networks => {
  console.log('网络数量', networks.length);
});

exports.networks$ = networks$;
exports.networksVm$$ = networksVm$$;
