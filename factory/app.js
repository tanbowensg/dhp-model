const _ = require('lodash');

class App {
  constructor(app) {
    this._init(app);
  }

  _init(app) {
  // {
  //   name: String,
  //   images: String,
  // }
    this.name = app.Name;
    // this.images = this.images(app);
  }

  /*（需要服务）
   * 所有的镜像，拼成字符串
   * @param {Object} app
   * return String
   */
  // images(app) {
  //   return _.map(app.Services, 'info.image.image').join('、');
  // }

  // 更新时间（需要服务）
  // updateAt(app) {
  //   let time = 0;
  //   _.forEach(app.Services, serv => {
  //     const value = serv.info.updatedAt.valueOf();
  //     if (value > time.valueOf()) {
  //       time = serv.info.updatedAt;
  //     }
  //   })
  //   return time
  // }
}

exports.App = App;
