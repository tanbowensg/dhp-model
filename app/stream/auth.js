import Rx from 'rxjs/Rx';
import _ from 'lodash';
import infoApi from '../api/info.js';
import socketio from '../util/socket.js';
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
      console.log(username, '登录了');
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

export default {
  login,
  annoymous,
  token,
  auth$$,
  userInfo$$,
};
