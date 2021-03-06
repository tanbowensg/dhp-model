import Rx from 'rxjs/Rx';
import infoApi from '../api/info.js';

const apiInfo$ = new Rx.BehaviorSubject().filter(v => v);

function getApiInfo() {
  const observable = Rx.Observable.fromPromise(infoApi.apiInfo());
  observable.subscribe(apiInfo => {
    apiInfo$.next(apiInfo);
  }, rej => {
    console.error(rej);
  });
  return observable;
}

export {
  getApiInfo,
  apiInfo$,
};
