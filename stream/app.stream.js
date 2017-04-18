// 这个 app 的流负责所有的 app 的格式化。
// 输入应该是后端发回来的 raw 的数据
// 返回的是可以直接供前端渲染的数据
const Rx = require('rxjs/Rx');
const appApi = require('../api/app.js');
const AppClass = require('../factory/app.js').App;

const app$ = new Rx.BehaviorSubject();

function getApps() {
  return appApi.appList()
    .then(res => {
      return res.map(app => {
        return new AppClass(app);
      });
    })
    .then(res => {
      app$.next(res);
    })
    .catch(rej => {
      console.log(rej);
    });
}

exports.getApps = getApps;
exports.app$ = app$;
