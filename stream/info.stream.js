const Rx = require('rxjs/Rx');
const infoApi = require('../api/info.js');

const apiInfo$ = new Rx.BehaviorSubject().filter(v => v);

function getApiInfo() {
  Rx.Observable.fromPromise(infoApi.apiInfo())
    .subscribe(apiInfo => {
      apiInfo$.next(apiInfo);
    }, rej => {
      console.log(rej);
    });
}

exports.getApiInfo = getApiInfo;
exports.apiInfo$ = apiInfo$;
