// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
import Rx from 'rxjs/Rx';
import _ from 'lodash';
import registryApi from '../api/registry.js';
// 由于 repository 是 registry 的一个属性，所以就直接接在 registry 后面，不要 hub 了。
import { registriesVm$$ } from './registry.stream.js';
import { Repository as RepositoryClass } from '../factory/repository.js';
import { REGISTRY_CONSTANT } from '../constant/constant.js';

const repositoriesVm$$ = new Rx.BehaviorSubject().filter(v => v);
// 每当拿到一个 registry 的时候，就去请求他的 repository。但其实 registry 不依赖 repository。
const repositories$ = registriesVm$$.concatMap(registries => Rx.Observable.from(registries))
  .concatMap(registry => {
    // 如果没有名字的话，说明它是内置镜像工场
    const name = registry.Name ? registry.Name : REGISTRY_CONSTANT.DCERegistryName;
    const p = registryApi.getRegistryRepositories(name)
      .then(repos => [name, repos]);
    return Rx.Observable.fromPromise(p);
  })
  .map(([registryName, repos]) => {
    const formattedRepos = _.map(repos, repo => {
      return new RepositoryClass(repo);
    });
    return [registryName, formattedRepos];
  })
  .toArray()
  .map(_.fromPairs);

repositories$.subscribe(repositoriesVm$$);

repositoriesVm$$.subscribe(repositories => {
  console.log('拿到这两个 registry 的 repository 了', _.size(repositories));
});

export {
  repositories$,
  repositoriesVm$$,
};
