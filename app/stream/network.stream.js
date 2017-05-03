// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import networkApi from '../api/network.js';
import hub from './hub.js';
import { Network as NetworkClass } from '../factory/network.js';
const networksVm$$ = new Rx.BehaviorSubject().filter(v => v);

/**
 * 网络分类
 * @param {Array} networks
 * @return {
    all: {Array},
    user: {Array},
    virtual: {Array},
    local: {Array},
  };
 */
function classifyNetworks(networks) {
  const result = {
    all: [],
    user: [],
    virtual: [],
    local: [],
  };
  networks.forEach(net => {
    if (!(net.name === 'host' || net.name === 'none'
      || net.name === 'dce_default' || net.name === 'docker_gwbridge')) {
      result.user.push(net);

      if (net.Scope === 'local') {
        result.local.push(net);
      } else {
        result.virtual.push(net);
      }
    }
  });
  result.all = result.local.concat(result.virtual);
  return result;
}

// 一收到 socket，就直接去拿列表，并且格式化
const networks$ = hub.networks$.concatMap(() => Rx.Observable.fromPromise(networkApi.list()))
  // 格式化
  .map(networks => _.map(networks, network => new NetworkClass(network)))
  .map(classifyNetworks);

networks$.subscribe(networksVm$$);

networksVm$$.subscribe(networks => {
  console.log('网络数量', networks.all.length);
});

export {
  networks$,
  networksVm$$,
};
