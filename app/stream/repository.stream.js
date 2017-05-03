// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import registryApi from '../api/registry.js';
// 由于 repository 是 registry 的一个属性，所以就直接接在 registry 后面，不要 hub 了。
import { registries$ } from './registry.stream.js';
// import { Service as ServiceClass } from '../factory/service.js';

const repositoriesVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 每当拿到一个 registry 的时候，就去请求他的 repository。但其实 registry 不依赖 repository。
// TODO: 其实这里还不知道 registry 的名字是哪个属性，以后要改
const repositories$ = registries$.concatMap(registries => Rx.Observable.from(registries))
  .concatMap(registry => {
    const name = registry.Name ? registry.Name : 'buildin-registry';
    const p = registryApi.getRegistryRepositories(name)
      .then(repos => {
        registry.repos = repos;
        const result = {};
        result[name] = repos;
        return result;
      });
    return Rx.Observable.fromPromise(p);
  })
  .toArray();
  // 格式化
  // .map(repositories => _.map(repositories, service => new ServiceClass(service)));

repositories$.subscribe(repositoriesVm$$);

repositoriesVm$$.subscribe(repositories => {
  console.log('repository 的 registry 数量', repositories.length);
});

export {
  repositories$,
  repositoriesVm$$,
};
