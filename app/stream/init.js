import hub from './hub.js';

// 整个应用的入口，调用 init，整个数据层就运行起来了
function init(username, password) {
  hub.zero(username, password);
}

export default init;
