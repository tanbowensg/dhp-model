const Rx = require('rxjs/Rx');
const infoApi = require('../api/info.js');

const apiInfo$ = new Rx.BehaviorSubject().filter(v => v);

function getApiInfo() {
  const observable = Rx.Observable.fromPromise(infoApi.apiInfo());
  observable.subscribe(apiInfo => {
    apiInfo$.next(apiInfo);
  }, rej => {
    console.log(rej);
  });
  return observable;
}

exports.getApiInfo = getApiInfo;
exports.apiInfo$ = apiInfo$;
