const _ = require('lodash');
const moment = require('moment');
const shellQuote = require('shell-quote');
const parseImageAddress = require('../util/util.js').parseImageAddress;
const filterLabels = require('../util/util.js').filterLabels;

const UNITS = {
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
};

class Service {
  constructor(service) {
    this._init(service);
  }

  _init(service) {
    // {
    //   name: String,
    //   spec: Object,
    //   id: String,
    //   version: Number,
    //   appName: String,
    //   image: Object,
    //   originalImageName: String,
    //   hostname: String,
    //   createdAt: Date,
    //   updatedAt: Date,
    //   labels: Object,
    //   mode: Object,
    //   modeValue: String,
    //   resources: Object,
    //   updateConfig: Object,
    //   containerSpec: Object,
    //   hostsMapping: Object,
    //   endpoint: Object,
    //   ports: Object,
    //   constraints: Object,
    //   networks: Object,
    //   storage: Array,
    //   dnsConfig: Object,
    //   highAvail: Object,
    //   healthCheck: Object,
    //   fsMounts: Array,
    //   linkedVolumes: Array,
    //   logDriver: Object,
    //   isRunning: Bool,
    //   isStopped: Bool,
    //   isSystem: Bool,
    //   inRunningMenu: Bool,
    //   inStoppedMenu: Bool,
    // }
    const constraints = this._constraints(service);
    this.spec = service.Spec;
    this.name = service.Spec.Name;
    this.id = service.ID;
    this.version = service.Version.Index;
    this.appName = this._appName(service);
    this.image = this._image(service);
    this.originalImageName = this._originalImageName(service);
    this.hostname = this._hostname(service);
    this.createdAt = this._createdAt(service);
    this.updatedAt = this._updatedAt(service);
    this.labels = this._labels(service);
    this.mode = this._mode(service);
    this.modeValue = this._modeValue(service);
    this.resources = this._resources(service);
    this.updateConfig = this._updateConfig(service);
    this.containerSpec = this._containerSpec(service);
    this.hostsMapping = this._hostsMapping(service);
    this.endpoint = this._endpoint(service);
    // 注意：this.endpoint 里也有一个 ports，但那个是配置（spec）的 ports。
    // 而这个 ports 是实际运行时的端口情况
    // 具体区别就在于有没有 PublishedPort
    // ？？？但是还有有点疑惑的，以后可能要问一下 ———博文
    this.ports = service.Endpoint.Ports;
    // constraints 和 schedulePolicy 是一个东西，也许是历史遗留吧。————博文
    this.constraints = constraints;
    this.schedulePolicy = constraints;
    this.networks = this._networks(service);
    this.storage = this._storage(service);
    this.dnsConfig = this._dnsConfig(service);
    this.highAvail = this._highAvail(service);
    this.healthCheck = this._healthCheck(service);
    this.fsMounts = this._fsMounts(service);
    this.linkedVolumes = this._linkedVolumes(service);
    this.logDriver = this._logDriver(service);

    this.isRunning = this._isRunning(service); // 判断该服务是否正在运行中
    this.isStopped = this._isStopped(service); // 判断该服务是否已停止
    this.isSystem = this._isSystem(service); // 判断该服务是否是系统服务，其下的服务只要有一个是系统服务就算是系统服务
    this.inRunningMenu = this._inRunningMenu(service); // 判断该服务是否正在运行中，不包含系统服务，用于列表归类
    this.inStoppedMenu = this._inStoppedMenu(service); // 判断该服务是否已停止，不包含系统服务，用于列表归类

  }

  /**
   * 镜像的相关信息
   * 参考: https://github.com/docker/distribution/blob/b6e0cfbdaa1ddc3a17c95142c7bf6e42c5567370/reference/reference.go
   *
   * @param {Object} service
   * @return {Object}
   * @return {Object} result
   * @return {String} result.registry
   * @return {String} result.imgName - 比如 daocloud.io/daocloud/ubuntu:12.04 中的 'ubuntu'
   * @return {String} result.image - imgName 属性的别名
   * @return {String} result.name - 去掉版本信息的镜像地址全称, 参考文档
   * @return {String} result.tag
   * @return {String} result.digest
   * @return {String} result.url
   * @return {String} result.fullname - deprecated attribute, use 'name' instead
   */
  _image(service) {
    const imageAddr = _.get(service, 'Spec.TaskTemplate.ContainerSpec.Image', '')
    const _image = parseImageAddress(imageAddr);
    return _image;
  }

  /**
   * 原始镜像名称
   * @param {Object} service
   * @return {String}
   */
  _originalImageName(service) {
    return _.get(service, 'Spec.TaskTemplate.ContainerSpec.Image', '');
  }

  /**
   * 服务详情的网络里面的一个参数，设置了才有。不是主机名称。
   * @param {Object} service
   * @return {String}
   */
  _hostname(service) {
    return _.get(service, 'Spec.TaskTemplate.ContainerSpec.Hostname', '');
  }

  /**
   * 创建时间
   * @param {Object} service
   * @return {Date}
   */
  _createdAt(service) {
    return moment(service.CreatedAt);
  }

  /**
   * 更新时间
   * @param {Object} service
   * @return {Date}
   */
  _updatedAt(service) {
    return moment(service.UpdatedAt);
  }

  /**
   * 应用名
   * @param {Object} service
   * @return {String}
   */
  _appName(service) {
    const labels = _.get(service, 'Spec.Labels', {});
    const isSystem = !!labels['io.daocloud.dce.system'];
    if (isSystem) return '';
    const appName = labels['com.docker.stack.namespace'];
    return appName || service.Spec.Name;
  }

  /**
   * 标签
   * @param {Object} service
   * @return {object}
   */
  _labels(service) {
    const originalLabels = _.get(service, 'Spec.Labels', {})
    return filterLabels(originalLabels);
  }

  /**
   * 是否全局，扩展数量？？？这两个是否可以分开呢？
   * @param {Object} service
   * @returns {Object} result
   * @returns {Boolean} result.global
   * @returns {Number} result.replicas
   */
  _mode(service) {
    const result = {};
    result.global = !!service.Spec.Mode.Global;
    if (!result.global) {
      result.replicas = service.Spec.Mode.Replicated.Replicas;
    }

    return result;
  }

  /**
   * 是否是全局服务，还是普通服务
   * @param {Object} service
   * @returns {String} 'global' or 'replicated'
   */
  _modeValue(service) {
    return !!service.Spec.Mode.Global ? 'global' : 'replicated';
  }

  /**
   * CPU、内存的占用情况
   * @param {Object} service
   * @returns {Object}
   */
  _resources(service) {
    const result = {};
    // 处理之前的数据
    result.cpuLimitRaw = _.get(service, 'Spec.TaskTemplate.Resources.Limits.NanoCPUs', 0);
    result.cpuReservationRaw = _.get(service, 'Spec.TaskTemplate.Resources.Reservations.NanoCPUs', 0);
    result.memLimitRaw = _.get(service, 'Spec.TaskTemplate.Resources.Limits.MemoryBytes', 0);
    result.memReservationRaw = _.get(service, 'Spec.TaskTemplate.Resources.Reservations.MemoryBytes', 0);

    result.memLimitUnit = 'MB';
    result.memReservationUnit = 'MB';
    result.cpuLimit = result.cpuLimitRaw / 1e9;
    result.cpuReservation = result.cpuReservationRaw / 1e9;
    result.memLimit = result.memLimitRaw / UNITS[result.memLimitUnit];
    result.memReservation = result.memReservationRaw / UNITS[result.memReservationUnit];
    return result;
  }

  /**
   * 灰度发布的设置
   * 注意，原来这里面有一些用于 select 的选项，但是那些选项只有一个地方用到了，所以我把它们删掉了^_^
   * https://docs.docker.com/engine/reference/api/docker_remote_api_v1.24/#/inspect-a-task
   * @param {parallelism} service
   * @returns {Number} result.parallelism
   * @returns {String} result.failureAction  'pause' or 'continue'
   * @returns {Number} result.delay 单位是秒
   * @returns {Number} result.period 单位是秒
   * @returns {Object} result.parallelisms 被移除了！
   * @returns {Object} result.failureActions 被移除了！
   */
  _updateConfig(service) {
    const result = {};
    result.parallelism = _.get(service, 'Spec.UpdateConfig.Parallelism', 0);
    result.failureAction = _.get(service, 'Spec.UpdateConfig.FailureAction', 'pause');
    result.delay = _.get(service, 'Spec.UpdateConfig.Delay', 0) / 1e6;
    result.period = _.get(service, 'Spec.TaskTemplate.ContainerSpec.StopGracePeriod', 0) / 1e6;
    return result;
  }

  /**
   * 获取容器配置
   * @param {service} service
   * @return {Object}
   */
  _containerSpec(service) {
    // 命令
    function cmd(serv) {
      const _cmd = _.get(serv, 'Spec.TaskTemplate.ContainerSpec.Command', []);
      return shellQuote.quote(_cmd);
    }

    // 命令参数
    function args(serv) {
      const _args = _.get(serv, 'Spec.TaskTemplate.ContainerSpec.Args', []);
      return shellQuote.quote(_args);
    }

    // 组
    function groups(serv) {
      const _groups = _.get(serv, 'Spec.TaskTemplate.ContainerSpec.Groups', []) || [];
      return _groups.length ? _groups.join(' ') : '';
    }

    // 环境变量
    // return {Object} 键值对
    function envs(serv) {
      return _.chain(serv)
        .get('Spec.TaskTemplate.ContainerSpec.Env', [])
        .map(item => item.split('='))
        .fromPairs()
        .value();
    }

    return {
      cmd: cmd(service),
      args: args(service),
      groups: groups(service),
      envs: envs(service),
      user: _.get(service, 'Spec.TaskTemplate.ContainerSpec.User', ''),
      dir: _.get(service, 'Spec.TaskTemplate.ContainerSpec.Dir', ''),
      labels: filterLabels(_.get(service, 'Spec.Labels', {})),
      containerLabels: filterLabels(_.get(service, 'Spec.TaskTemplate.ContainerSpec.Labels', {})),
      tty: _.get(service, 'Spec.TaskTemplate.ContainerSpec.TTY', false),
    };
  }

  /**
   * 域名映射
   * @param {service} service
   * @return {Object} 键值对
   */
  _hostsMapping(service) {
    return _.chain(service)
      .get('Spec.TaskTemplate.ContainerSpec.Hosts', [])
      .map(h => h.split(' '))
      .fromPairs()
      .value();
  }

  /**
   * 端口信息
   * 1.24 的 API 中有多处 Endpoint 相关信息，
   * 然而暂时无法确定哪一处才是可靠的，
   * 所以这里做了很多 fallback 的处理，
   * 确保尽可能返回有效的数据而不会抛异常 ————安然
   * 注意：Endpoint 里的的端口信息是配置（spec）的端口信息，而不是实际的端口信息————博文
   * @param {Object} service
   * @return Object
   */
  _endpoint(service) {
    // TODO VirtualIPs 真的是从这个字段里获得的吗？————安然
    const _virtualIPs = _.get(service, 'Endpoint.VirtualIPs', []);
    const _ports = _.get(service, 'Endpoint.Spec.Ports', []);

    // 统一变量命名规则: camelCase
    const ports = _ports.map(port => ({
      protocol: port.Protocol,
      publishedPort: port.PublishedPort,
      targetPort: port.TargetPort,
      publishMode: port.PublishMode,
    }));
    const virtualIPs = _virtualIPs.map(item => ({
      addr: item.Addr,
      networkId: item.networkId,
    }));

    return {
      // DNSRR is the default network mode ————安然
      // https://docs.docker.com/engine/userguide/networking/default_network/configure-dns/#/configure-container-dns
      mode: _.get(service, 'Endpoint.Spec.Mode', 'dnsrr'),
      virtualIPs,
      ports,
      // 开放端口 - 非负载均衡端口
      openPorts: ports.filter(p => p.publishMode === 'host'),
      // 负载均衡端口
      lbPorts: ports.filter(p => p.publishMode === 'ingress'),
    };
  }

  /**
   * 限制条件，调度策略
   * doc: https://docs.docker.com/engine/reference/commandline/service_create/#/specify-service-constraints
   * 当前的限制比较简单，只是单纯的相等性判断，即 key===value
   * @param {Object} service
   * @return {Object} result
   * @return {String} result.nodeId 指定的主机
   * @return {String} result.nodeLabel 指定的主机标签, 只允许指定一个标签
   */
  _constraints(service) {
    const result = {
      nodeId: '',
      nodeLabel: '',
    };
    const constraints = _.get(service, 'Spec.TaskTemplate.Placement.Constraints', []);

    _.forEach(constraints, p => {
      if (p.startsWith('node.id == ')) {
        result.nodeId = p.split('==')[1].trim();
      }
      // 比如 "node.lables.labelName === labelValue"
      if (p.startsWith('node.labels.')) {
        // 比如 "labelName === lableValue"
        result.nodeLabel = p.substring(12).trim();
      }
    });
    return result;
  }

  /**
   * 网络
   * https://github.com/docker/docker/blob/37302bbb3f4889e9de2a95d5ea018acdab9e4447/vendor/src/github.com/docker/engine-api/types/swarm/network.go
   *
   * 自 Docker 1.13 起 Networks 配置向里移一层
   * https://github.com/docker/docker/blob/48a9e53d70472bebad908b273351d8a07939a764/api/types/swarm/service.go#L28
   * @param {Object} service
   * @return {Object} result
   */
  _networks(service) {
    const oldNetworks = _.get(service, 'Spec.Networks', []);
    const newNetworks = _.get(service, 'Spec.TaskTemplate.Networks', []);

    const networksIndexed = {};
    _.forEach(oldNetworks, (aliases, target) => {
      if (!networksIndexed[target]) {
        networksIndexed[target] = aliases;
      }
    });

    _.forEach(newNetworks, ({ Aliases, Target }) => {
      if (!networksIndexed[Target]) {
        networksIndexed[Target] = Aliases;
        return;
      }

      // 合并旧的配置
      networksIndexed[Target] = _.concat(networksIndexed[Target], Aliases)
    });

    const networks = [];
    _.forEach(networksIndexed, (aliases, target) => {
      networks.push({
        Target: target,
        Aliases: aliases,
      });
    });

    return networks.map(net => ({ id: net.Target, aliases: net.Aliases }));
  }

  /**
   * 存储
   * @param {Object} service
   * @return {Array}
   */
  _storage(service) {
    const _mountsList = _.get(service, 'Spec.TaskTemplate.ContainerSpec.Mounts', []);
    return _.map(_mountsList, m => {
      const driver = _.get(m, 'VolumeOptions.DriverConfig.Name', '');
      const driverOpts = _.get(m, 'VolumeOptions.DriverConfig.Options', {});
      const labels = _.get(m, 'VolumeOptions.Labels', {});
      const noCopy = _.get(m, 'VolumeOptions.NoCopy', false);
      return {
        type: m.Type,
        source: m.Source,
        target: m.Target,
        readOnly: m.ReadOnly,
        driver,
        noCopy,
        labels,
        driverOpts,
      };
    });
  }

  /**
   * DNS 配置
   * @param {Object} service
   * @return {Object} result
   */
  _dnsConfig(service) {
    // array
    const result = {
      nameservers: _.get(service, 'Spec.TaskTemplate.ContainerSpec.DNSConfig.Nameservers', []),
      options: _.get(service, 'Spec.TaskTemplate.ContainerSpec.DNSConfig.Options', []),
      search: _.get(service, 'Spec.TaskTemplate.ContainerSpec.DNSConfig.Search', []),
    };

    // csv
    result.nameserversText = result.nameservers.join(' ');
    result.optionsText = result.options.join(' ');
    result.searchText = result.search.join(' ');

    return result;
  }

  /**
   * 高可用
   * 注意：这个方法依赖 this.mode ————博文
   * RestartPolicy - 重启策略
   * Specification for the restart policy which applies to containers created as part of this service.
   *  - Condition – Condition for restart (none, on-failure, or any).
   *  - Delay – Delay between restart attempts.
   *  - Attempts – Maximum attempts to restart a given container before giving up (default value is 0, which is ignored).
   *  - Window – Windows is the time window used to evaluate the restart policy (default value is 0, which is unbounded).*
   * @param {Object} service
   * @return {Object}
   */
  _highAvail(service) {
    const _restartPolicy = _.get(service, 'Spec.TaskTemplate.RestartPolicy', {});
    const mode = this._mode(service);

    return {
      // 活跃节点 'multi' or 'single'
      activeNode: mode.global || mode.replicas > 1 ? 'multi' : 'single',
      condition: _restartPolicy.Condition || 'any',
      delay: _restartPolicy.Delay / 1e6 || 0, // 单位是秒
      maxAttempts: _restartPolicy.MaxAttempts || 0,
      window: _restartPolicy.Window / 1e6 || 0, // 单位是秒
      conditions: [{
        value: 'none',
        name: '永不重启', // label
      }, {
        value: 'on-failure', // context: https://github.com/docker/docker/pull/27062
        name: '遇到错误时重启',
      }, {
        value: 'any',
        name: '退出时重启',
      }],
    };
  }

  /**
   * 健康检查
   * @param {Object} service
   * @return {Object} result
   * @return {String} result.cmd
   * @return {Bool} result.activate
   * @return {Array} result.test
   * @return {Number} result.interval
   * @return {Number} result.timeout
   * @return {Number} result.retries
   */
  _healthCheck(service) {
    const _healthCheck = _.get(service, 'Spec.TaskTemplate.ContainerSpec.Healthcheck', {});
    const result = {
      cmd: '',
      activate: true,
      test: _.get(_healthCheck, 'Test', []),
      interval: (_.get(_healthCheck, 'Interval', 0) || 0) / 1e9,
      timeout: (_.get(_healthCheck, 'Timeout', 0) || 0) / 1e9,
      retries: _.get(_healthCheck, 'Retries', 0),
    };

    const prefix = result.test[0] || '';

    switch (prefix) {
      case 'NONE':
        result.activate = false;
        result.cmd = result.test[1] || '';
        break;
      case 'CMD':
      case 'CMD-SHELL':
        result.cmd = result.test[1] || '';
        break;
      default:
        break;
    }

    return result;
  }

  /**
   * 本地文件系统映射
   * 注意：依赖 this._storage ————博文
   * @param {Object} service
   * @return {Array} result
   */
  _fsMounts(service) {
    const storages = this._storage(service);
    return _.filter(storages, item => item.type === 'bind');
  }

  /**
   * 获取关联的存储卷的配置
   * 注意：依赖 this._storage ————博文
   * @param {Object} service
   * @return {Array} result
   */
  _linkedVolumes(service) {
    const storages = this._storage(service);
    return _.filter(storages, item => item.type === 'volume');
  }

  /**
   * 获取日志驱动相关信息
   * @param {Object} service
   * @return {Object} result
   * @return {String} result.name
   * @return {Object} result.option
   * @return {Array} result.alternatives 本来有的，被废除了，这东西应该放在 controller 里————博文
   */
  _logDriver(service) {
    // 默认的日志驱动为 json-file
    const name = _.get(service, 'Spec.TaskTemplate.LogDriver.Name', 'json-file');
    const options = _.get(service, 'Spec.TaskTemplate.LogDriver.Options', {});

    return { name, options };
  }

  /**
   * 根据标签判断是否是系统服务
   * @param {Object} service
   * @return {Bool}
   */
  _isSystem(service) {
    return !!_.get(service.Spec.Labels, 'io.daocloud.dce.system');
  }

  /**
   * 判断该服务是否正在运行中
   * 不包含系统 Service （系统服务算在 system 统计范畴中）
   * 注意：依赖 this._mode ————博文
   * @param {Object} service
   * @return {Bool}
   */
  _isRunning(service) {
    const mode = this._mode(service);
    return mode.global || mode.replicas;
  }

  /**
   * 判断服务是否已停止
   * 注意：依赖 this._mode ————博文
   * @param {Object} service
   * @return {Bool}
   */
  _isStopped(service) {
    const mode = this._mode(service);
    return !mode.global && mode.replicas === 0;
  }

  /**
   * 判断该服务是否正在运行中
   * 不包含系统 Service （系统服务算在 system 统计范畴中）
   * 注意：依赖 this._mode ————博文
   * @param {Object} service
   * @return {Bool}
   */
  _inRunningMenu(service) {
    const mode = this._mode(service);
    return (mode.global || mode.replicas) && !_.get(service.Spec.Labels, 'io.daocloud.dce.system');
  }

  /**
   * 判断服务是否已停止
   * 注意：依赖 this._mode ————博文
   * @param {Object} service
   * @return {Bool}
   */
  _inStoppedMenu(service) {
    const mode = this._mode(service);
    return (!mode.global && mode.replicas === 0) && !_.get(service.Spec.Labels, 'io.daocloud.dce.system');
  }
}

exports.Service = Service;
