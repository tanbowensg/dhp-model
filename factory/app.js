const _ = require('lodash');
const formatSize = require('../util/util.js').formatSize;

// 注意：整个 App Class 都是依赖 Service Class 的，必须先处理服务，才能处理应用————博文
// 注意：还差一个租户————博文

class App {
  constructor(app) {
    this._init(app);
  }

  _init(app) {
  // {
  //   name: String,
  //   tasks: Array,
  //   services: Array,
  //   updateAt: Date,
  //   servicesName: String,
  //   images: String,
  //   hasAccessPoints: Bool,
  //   globalServices: Array,
  //   allServicesAreGlobal: Bool,
  //   appTemplate: String,
  //   ports: Bool,
  //   isRunning: Bool,
  //   isStopped: Bool,
  //   isSystem: Bool,
  //   ports: Array,
  //   cpu: String,
  //   memory: String,
  // }
    this.name = app.Name;
    this.tasks = app.tasks; // 这个是在 stream 里塞进去的
    this.services = app.Services;
    this.updateAt = this._updateAt(app);
    this.servicesName = _.map(app.Services, 'name').join('、');
    this.images = _.map(app.Services, 'image.image').join('、');
    this.servicesStateNum = this._servicesStateNum(app);
    this.hasAccessPoints = this._hasAccessPoints(app);
    this.globalServices = this._globalServices(app);
    this.allServicesAreGlobal = this._allServicesAreGlobal(app);
    this.appTemplate = this._appTemplate(app);
    this.ports = this._ports(app);
    this.isStopped = this._isStopped(app);
    this.isRunning = this._isRunning(app);
    this.isSystem = this._isSystem(app);
    this.cpu = this._cpu(app);
    this.memory = this._memory(app);
  }

  /* 运行中、停止的、系统的、服务数量
   * @param {Object} app
   * @return {Object} result
   * @return {Number} result.running
   * @return {Number} result.stopped
   * @return {Number} result.system
   */
  _servicesStateNum(app) {
    const result = {
      running: 0,
      stopped: 0,
      system: 0,
    };
    _.forEach(app.Services, serv => {
      if (!serv.mode.replicas && !serv.mode.global) {
        result.stopped++;
      } else {
        result.running++;
      }
      if (serv.isSystem) {
        result.system++;
      }
    });
    return result;
  }

  /**
   * 有没有接入点
   * @param { Object} app
   * @return {Bool}
   */
  _hasAccessPoints(app) {
    return _.chain(app.Services)
      .map(serv => serv.ports)
      .flatten()
      .some(v => v)
      .value();
    // _.flatten(app.Services.map(serv => serv.ports)).some(v => v);
  }

  /* 更新时间
   * @param {Object} app
   * @return Date
   */
  _updateAt(app) {
    let time = 0;
    _.forEach(app.Services, serv => {
      const value = serv.updatedAt.valueOf();
      if (value > time.valueOf()) {
        time = serv.updatedAt;
      }
    });
    return time;
  }

  /**
   * 应用里的全局服务
   * @param {Object} app
   * @return {Array}
   */
  _globalServices(app) {
    return _.chain(app.Services)
      .filter(serv => serv.mode.global)
      .map('name')
      .value()
  }

  /**
   * 应用里的全局服务
   * 依赖：this._globalServices
   * @param {Object} app
   * @return {Bool}
   */
  _allServicesAreGlobal(app) {
    // console.log(app.Services?'you':'meiyou')
    return app.Services.length === this._globalServices(app).length;
  }

  /**
   * 应用模板
   * @param {Object} app
   * @return {String}
   */
  _appTemplate(app) {
    let templateLabel = '';
    _.forEach(app.Services, serv => {
      const _templateLabel = _.get(serv.spec, 'Labels[\'io.daocloud.dce.template\']', false);
      if (_templateLabel && !templateLabel) {
        templateLabel = _templateLabel;
      }
    });
    return templateLabel;
  }

  /**
   * 接入点
   * @param {Object} app
   * @return {Array}
   */
  _ports(app) {
    return _.chain(app.Services)
      .map(serv => serv.ports)
      .flatten()
      .filter(v => !!v)
      .value();
  }

  /**
   * 判断该应用是否正在运行中，不包含系统应用
   * 依赖 this._servicesStateNum
   * @param {Object} app
   * @return {Bool}
   */
  _isRunning(app) {
    const stateNum = this._servicesStateNum(app);
    return stateNum.running && !stateNum.system;
  }

  /**
   * 判断该应用是否已停止，不包含系统应用
   * 依赖 this._servicesStateNum
   * @param {Object} app
   * @return {Bool}
   */
  _isStopped(app) {
    const stateNum = this._servicesStateNum(app);
    return !stateNum.running && !stateNum.system;
  }
  /**
   * 判断该应用是否是系统应用，其下的服务只要有一个是系统服务就算是系统应用
   * 依赖 this._servicesStateNum
   * @param {Object} app
   * @return {Bool}
   */
  _isSystem(app) {
    const stateNum = this._servicesStateNum(app);
    return !!stateNum.system;
  }

  /**
   * CPU 核数限制
   * 依赖 this._isRunning
   * @param {Object} app
   * @return {String}
   */
  _cpu(app) {
    if (!this._isRunning(app)) {
      return '0 核';
    }
    let cpuNum = 0;
    let unlimited = true;
    _.forEach(app.Services, serv => {
      if (unlimited) {
        const _cpu = serv.resources.cpuLimit;
        const _replicas = serv.mode.replicas;
        // cpu 等于零的话，代表不限。有一个服务不限，那么整个应用都不限了。
        if (_cpu === 0) {
          unlimited = false;
        } else {
          cpuNum += _cpu * (_replicas || 1);
        }
      }
    });
    return cpuNum ? `${parseFloat(cpuNum.toFixed(2))} 核` : '不限';
  }

  /**
   * 内存限制
   * 依赖 this._isRunning
   * @param {Object} app
   * @return {String}
   */
  _memory(app) {
    if (!this._isRunning(app)) {
      return '0 GB';
    }
    let memory = 0;
    let unlimited = true;
    _.forEach(app.Services, serv => {
      if (unlimited) {
        const _memory = serv.resources.memLimitRaw;
        const _replicas = serv.mode.replicas;
        // 内存等于零的话，代表不限。有一个服务不限，那么整个应用都不限了。
        if (_memory === 0) {
          unlimited = false;
        } else {
          memory += _memory * (_replicas || 1);
        }
      }
    });
    if (!memory) {
      return '不限';
    }
    return formatSize(memory, 'B');
  }
}

exports.App = App;
