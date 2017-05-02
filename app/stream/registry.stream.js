const Rx = require('rxjs/Rx');
const _ = require('lodash');
const registryApi = require('../api/registry.js');
// const RegistryClass = require('../factory/registry.js').Registry;
const hub = require('./hub.js');
const registriesVm$$ = new Rx.BehaviorSubject().filter(v => v);

// 一收到 socket，就直接去拿列表，并且格式化
const registries$ = hub.registries$$.concatMap(() => Rx.Observable.fromPromise(registryApi.getBuildinRegistry()))
  // 格式化
  // .map(registries => _.map(registries, registry => new RegistryClass(registry)));

registries$.subscribe(registriesVm$$);

registriesVm$$.subscribe(registries => {
  console.log('registry 数量', registries.length);
});

exports.registries$ = registries$;
exports.registriesVm$$ = registriesVm$$;
