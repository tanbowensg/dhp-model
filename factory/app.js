const _ = require('lodash');
const formatSize = require('../util/util.js').formatSize;

// 注意：整个 App Class 都是依赖 Service Class 的，必须先处理服务，才能处理应用————博文
// 注意：还差一个租户————博文

// 几点注意事项
// 1、所有的处理的方法都必须是纯函数，至少在这个文件中是纯的
// 2、如果不是必要的话，禁止使用已经格式化好的某个数据去格式化另一个数据

/**
 * @param {Object} 原始 app
 * @param {Array} 全部的格式化好的 tasks
 * @param {Array} 全部的格式化好的 services
 */
class App {
  constructor(app, tasks, services) {
    this._init(app, tasks, services);
  }

  _init(app, tasks, services) {
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
  //   formatted: Bool
  // }
    this.name = app.Name;
    this.tasks = this._tasks(app, tasks);
    this.services = this._services(app, services);
    app.services = this.services; // 为了方便起见，把服务也暂时存到 app 里面
    this.updateAt = this._updateAt(app);
    this.servicesName = _.map(app.services, 'name').join('、');
    this.images = _.map(app.services, 'image.image').join('、');
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
    this.formatted = true;
  }

  /**
   * tasks
   * 依赖：app 的原始的 Services
   * @param {Object} app
   * @param {Array} 全部的 tasks
   * @return {Array} 应用的 tasks
   */
  _tasks(app, tasks) {
    return _.chain(app.Services)
      .map('ID')
      // 这里就不对每个 task 重新发请求了，直接用 taskList 里的数据
      .map(serviceId => _.find(tasks, { serviceId }))
      .value();
  }

  /**
   * 服务
   * 依赖：app 的原始的 Services
   * @param {Object} app
   * @param {Array} 全部的 services
   * @return {Array} 应用的 services
   */
  _services(app, services) {
    return _.map(app.Services, service => _.find(services, { id: service.ID }));
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
    _.forEach(app.services, serv => {
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
    return _.chain(app.services)
      .map(serv => serv.ports)
      .flatten()
      .some(v => v)
      .value();
    // _.flatten(app.services.map(serv => serv.ports)).some(v => v);
  }

  /* 更新时间
   * @param {Object} app
   * @return Date
   */
  _updateAt(app) {
    let time = 0;
    _.forEach(app.services, serv => {
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
    return _.chain(app.services)
      .filter(serv => serv.mode.global)
      .map('name')
      .value();
  }

  /**
   * 应用里的全局服务
   * 依赖：this._globalServices
   * @param {Object} app
   * @return {Bool}
   */
  _allServicesAreGlobal(app) {
    return app.services.length === this._globalServices(app).length;
  }

  /**
   * 应用模板
   * @param {Object} app
   * @return {String}
   */
  _appTemplate(app) {
    let templateLabel = '';
    _.forEach(app.services, serv => {
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
    return _.chain(app.services)
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
    _.forEach(app.services, serv => {
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
    _.forEach(app.services, serv => {
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

/**
 * 这个是应用的详情的格式化类
 * @param {Object} 列表格式化过的 app
 * @param {Array} 全部的格式化好的 网络
 * @param {Array} networks
 */
class AppDetail {
  constructor(app, networks) {
    this._init(app, networks);
  }

  _init(app, networks) {
    // 把 app 里的属性复制出来
    _.forEach(app, (val, key) => {
      this[key] = val;
    });
    // 把网络的名字塞到服务里
    this.services = this._networkName(app, networks);
  }

  /**
   * 给应用的服务的网络里添加网络的名称，因为本来只有 ID
   * 其实这里还可以加很多东西，甚至把网络列表里的所有内容塞进去，如果需要的话。
   * @param {Object} app
   * @return {Array} 服务
   */
  _networkName(app, networks) {
    return _.map(app.services, service => {
      _.forEach(service.networks, network => {
        network.name = _.find(networks, { id: network.id }).name;
      });
      return service;
    });
  }
}

exports.App = App;
exports.AppDetail = AppDetail;
