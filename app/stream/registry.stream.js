import Rx from 'rxjs/Rx';
import _ from 'lodash';
import registryApi from '../api/registry.js';
// import RegistryClass from '../factory/registry.js').Registry;
import hub from './hub.js';
const registriesVm$$ = new Rx.BehaviorSubject().filter(v => v);

// 先去拿内置的镜像工场
const buildinRegistry = hub.registries$.concatMap(() => Rx.Observable.fromPromise(registryApi.getBuildinRegistry()))
  // .concatMap(() => {
  //   return Rx.Observable.fromPromise(registryApi.getRegistryRepositories('buildin-registry'));
  // });

// 再拿其他的镜像工程
const registries$ = Rx.Observable.zip(
  buildinRegistry,
  Rx.Observable.fromPromise(registryApi.list()),
  (buildin, others) => {
    // 最后拼起来
    const result = _.clone(others);
    result.unshift(buildin);
    return result;
  });
  // 格式化
  // .map(registries => _.map(registries, registry => new RegistryClass(registry)));


registries$.subscribe(registriesVm$$);

registriesVm$$.subscribe(registries => {
  console.log('registry 数量', registries.length);
});

export {
  registries$,
  registriesVm$$,
};
