import Rx from 'rxjs/Rx';
import _ from 'lodash';
import registryApi from '../api/registry.js';
// import RegistryClass from '../factory/registry.js').Registry;
import hub from './hub.js';
const registriesVm$$ = new Rx.BehaviorSubject().filter(v => v);

// 再拿其他的镜像工程
const registries$ = hub.registries$
  .concatMap(() => {
    return Rx.Observable.zip(
      // 内置的镜像工场
      Rx.Observable.fromPromise(registryApi.getBuildinRegistry()),
      // 除了内置的以外的镜像工场
      Rx.Observable.fromPromise(registryApi.list()),
      (buildin, others) => {
        // 最后拼起来
        const result = _.clone(others);
        result.unshift(buildin);
        return result;
      });
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
