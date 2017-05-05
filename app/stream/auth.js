import Rx from 'rxjs/Rx';
import _ from 'lodash';
import infoApi from '../api/info.js';
import authApi from '../api/auth.js';

const token = {};

const auth$$ = new Rx.BehaviorSubject().filter(v => v);
const userInfo$$ = new Rx.BehaviorSubject().filter(v => v);

function annoymous() {
  auth$$.next('annoymous');
  userInfo$$.next('annoymous');
}

function _getUserInfo(name) {
  return authApi.getUserInfo(name)
    .then(res => {
      userInfo$$.next(res);
    });
}

function login(username, password) {
  return authApi.login(username, password)
    .then(res => {
      console.log(username, '登录成功')
      _.extend(token, res);
      auth$$.next(token);
      _getUserInfo(username);
      return res;
    })
    .catch(rej => {
      console.error('用户名密码错误', rej);
      return rej;
    });
}

// 测试是否需要登录
function tryToLogin() {
  // 先尝试性的发一个 apiInfo 请求，看看需不需要登录
  infoApi.apiInfo()
    .then(res => {
      // 不用登录，那是最好
      annoymous();
      return res;
    }, rej => {
      if (rej.statusCode === 401) {
        console.error('需要登录');
      } else {
        console.error('尝试登录阶段发生了未知错误', rej);
      }
    });
}

tryToLogin();

export {
  login,
  annoymous,
  token,
  auth$$,
  userInfo$$,
};
