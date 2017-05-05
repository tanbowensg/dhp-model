import io from 'socket.io-client';
import { API_URL } from '../constant/constant.js';
import { Job as JobClass } from '../factory/job.js';

let socket;
const callbackCancellers = {};
// 连接到任务的 socket.io
function connect(streamRoom) {
  socket = io(`${API_URL}/`, {
    path: '/stream/socket.io',
  });
  socket.on('connect', () => {
    socket.emit('enter_room', streamRoom);
  });
}

// 收到任务更新推送的回调
// 每次绑定回调都要传递一个字符串 action 作为唯一标识，以免重复绑定相同回调。
function bind(action, callback) {
  if (!callbackCancellers.hasOwnProperty(action)) {
    const socketFunc = job => {
      job = new JobClass(job);
      callback(job);
    };
    socket.on('job_update', socketFunc);
    // 返回一个函数，用来解除这个事件的监听
    const canceller = () => {
      socket.removeListener('job_update', socketFunc);
    };
    callbackCancellers[action] = canceller;
  } else {
    // 如果尝试绑定相同名字的回调，会弹出警告
    console.warn(`'${action}' is already binded, please offJobUpdate it before you rebind it.`);
  }
}

function unbind(action) {
  if (callbackCancellers[action]) {
    callbackCancellers[action]();
    delete callbackCancellers[action];
  }
}

export default {
  connect,
  bind,
  unbind,
};
