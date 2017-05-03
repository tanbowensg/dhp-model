import Rx from 'rxjs/Rx';
// import _ from 'lodash';
import registryApi from '../api/registry.js';
// import RegistryClass from '../factory/registry.js').Registry;
import hub from './hub.js';
const registriesVm$$ = new Rx.BehaviorSubject().filter(v => v);

// 一收到 socket，就直接去拿列表，并且格式化
const registries$ = hub.registries$.concatMap(() => Rx.Observable.fromPromise(registryApi.list()));
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
