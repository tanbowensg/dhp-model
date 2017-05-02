/* TODO DELETE ACCRODING COMMENT */
/* global moment */
/* eslint-disable no-unused-vars */

import { parseImageAddress, volumeStringify } from '../../helpers/docker';
import * as _ from '../../helpers/lodash';
import moment from 'moment';
import { PRIVATE_LABELS } from '../../config/constant.js';
import { isEmpty } from '../../helpers/object.js';

const UNITS = {
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
};

/**
 * @param {object} data - container inspected information
 */
class Container {
  constructor(data, options) {
    'ngInject';

    // 一个 Container 的默认数据结构
    // 注释的 key-value 是合法但不必须的数据
    // 这份 default 是根据 compose 生成的精简 default
    this.defaultContainerSchema = {
      Image: '',
      HostConfig: {
        NetworkMode: 'bridge',
        AutoRemove: false, // 参数设置的时候没有，家辉提到可能需要默认
        Links: [], // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
        PortBindings: {},
        Binds: [],
        LogConfig: {
          Type: 'json-file',
          Config: {},
        },
        Dns: [],
        DnsOptions: [],
        DnsSearch: [],
        ExtraHosts: null,
        VolumesFrom: [], // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
      },
      // inspect 是这种数据格式，但是 create, update 的时候直接是 Config 里面的参数
      Config: {
        Labels: {},
        NetworkDisabled: false, // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
        StdinOnce: false, // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
        Env: [],
        Tty: false,
        AttachStderr: false, // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
        AttachStdin: false, // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
        AttachStdout: false, // ppt 最后精简数据里有该字段，但是参数设置的时候没有，需要注意一下
        OpenStdin: false,
      },
    };

    // 把以下划线开头的属性当作私有属性，禁止从外部调用
    // TODO 也许需要另外一种判断方式
    this._isCreate = !data; // 是否需要判断默认值
    this._data = data || this.defaultContainerSchema;
    this.$q = options.container.$q;
    this.state = options.container.state;
    this.containerService = options.container.containerService;
    this.userService = options.container.userService;
    this.tenantService = options.container.tenantService;

    // 只读属性
    this.info = {};

    // 外部可调用的方法
    this.methods = {};

    // DCE 用于系统识别的私有标签的名称
    // 对用户不可见
    this.reservedLabels = {};
    PRIVATE_LABELS.forEach(label => {
      this.reservedLabels[label] = '';
    });

    this.moment = moment;
    this.activate();
  }

  // 以下的方法都是以双下划线开头, 表示它们是给「私有方法」使用的「私有方法」

  /*
   * Container 的标签中有专门用于后端系统识别的私有标签，
   * 比如 `io.daocloud.dce.owner`, 这类标签不能暴露到前端。
   *
   * Container 原始的标签（包括对用户不可见的私有标签）
   *
   * @param {object} originalLabels - 包含有私有方法的标签键值对
   * @return {object} filteredLabels - 不包含私有方法的标签键值对
   */
  __filterLabels(originalLabels) {
    const filteredLabels = {};

    angular.forEach(originalLabels, (val, key) => {
      if (this.reservedLabels.hasOwnProperty(key)) {
        this.reservedLabels[key] = val;
        return;
      }

      filteredLabels[key] = val;
    });

    return filteredLabels;
  }

  /**
   * 与 _filterLabels 的作用相反
   * 这个方法将私有标签补全到当前的标签列表
   *
   * 副作用: 参数对象和返回值
   *
   * @param {object} labels - 不包含私有方法的标签键值对
   * @return {object} mergedLabels - 包含有私有方法的标签键值对
   */
  __completeLabels(labels) {
    const mergedLabels = labels;

    // 合并私有标签但忽略其中的空标签
    angular.forEach(this.reservedLabels, (val, key) => {
      if (!val) return;
      mergedLabels[key] = val;
    });

    return mergedLabels;
  }

  activate() {
    this.info = {
      image: this.image(),
      resources: this.resources(),
      constraints: this.constraints(),
      schedulePolicy: this.constraints(), // alias
      containerSpec: this.containerSpec(),
      healthCheck: this.healthCheck(),
      storage: this.getStorageConfig(),
      fsMounts: this.getFSMounts(),
      linkedVolumes: this.getLinkedVolumes(),
      network: this.network(),
      dnsConfig: this.dnsConfig(),
      hostname: this.hostname(),
      hostsMapping: this.hostsMapping(),
      logDriver: this.getLogDriverConfig(),
      name: this.name(),
      highAvail: this.highAvail(),
    };

    this.methods = {
      updateImage: this._updateImage.bind(this),
      updateResourcesConfig: this.updateResourcesConfig.bind(this),
      updateSchedulePolicy: this.updateSchedulePolicy.bind(this),
      updateContainerConfig: this.updateContainerConfig.bind(this),
      updateHealthCheckConfig: this.updateHealthCheckConfig.bind(this),
      updateStorageConfig: this.updateStorageConfig.bind(this),
      updateNetworkPorts: this.updateNetworkPorts.bind(this),
      updateNetworkMode: this.updateNetworkMode.bind(this),
      updateDNSConfig: this.updateDNSConfig.bind(this),
      updateHostname: this.updateHostname.bind(this),
      updateHostsConfig: this.updateHostsConfig.bind(this),
      updateLogDriverConfig: this.updateLogDriverConfig.bind(this),
      updateHighAvailConfig: this.updateHighAvailConfig.bind(this),
      updateAllLabels: this.updateAllLabels.bind(this),
      create: this.create.bind(this),
      up: this.up.bind(this),
    };
  }

  // 获取最终暴露的属性和方法
  get() {
    // 等待权限取到后才能返回
    const promise = {
      permission: this.permission(),
    };
    return this.$q.all(promise).then(res => {
      this.info.permission = res.permission;
      return {
        info: this.info,
        methods: this.methods,
      };
    });
  }

  // 采用函数调用的方式是为了避免这些值被意外修改
  name() {
    return this._data.Name;
  }

  /**
   * 镜像相关的信息
   *
   * 参考: https://github.com/docker/distribution/blob/b6e0cfbdaa1ddc3a17c95142c7bf6e42c5567370/reference/reference.go
   *
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
  image() {
    const imageAddr = _.get(this._data, 'Image', '');
    const _image = parseImageAddress(imageAddr);
    return _image;
  }

  /**
   * 资源占用及分配详情
   * About CPU.shares http://stackoverflow.com/a/26842597/2609042
   * Resource requirements which apply to each individual container created as part of the service.
   *
   * @returns {Object}
   */
  resources() {
    const result = {};
    const originData = this._data;

    // 处理之前的数据
    result.cpuLimitRaw = _.get(originData, 'HostConfig.CpuQuota', 0);
    result.memLimitRaw = _.get(originData, 'HostConfig.Memory', 0);
    result.memReservationRaw = _.get(originData, 'HostConfig.MemoryReservation', 0);

    result.memLimitUnit = 'GB';
    result.memReservationUnit = 'GB';
    result.cpuLimit = result.cpuLimitRaw / 1e5;
    result.memLimit = result.memLimitRaw / UNITS[result.memLimitUnit];
    result.memReservation = result.memReservationRaw / UNITS[result.memReservationUnit];

    return result;
  }

  /**
   * 获取具体的各个限制条件的详情
   * doc: https://docs.docker.com/swarm/scheduler/filter/
   *
   * 当前的限制比较简单，只是单纯的相等性判断，即 key===value
   */
  constraints() {
    const result = {
      nodeId: '', // 指定的主机
    };
    return result;
  }

  /**
   * 获取容器配置
   */
  containerSpec() {
    const result = {};
    const originData = this._data;
    const _cmd = _.get(originData, 'Config.Cmd', []);
    const _entrypoint = _.get(originData, 'Config.Entrypoint', []);
    // 启动命令
    result.cmd = _cmd.join(' ');
    // 入口命令
    result.entrypoint = _entrypoint.join(' ');
    // 环境变量
    result.envs = {};

    const _envsList = _.get(originData, 'Config.Env', []);
    _envsList.map(item => {
      // 考虑 value 中也带有 ‘=’ 的情况
      const index = item.indexOf('=');
      const [envKey, envVal] = [item.substring(0, index), item.substring(index + 1)];
      // 将除了指定主机或者指定主机标签以外的环境变量呈现出来
      if (!envKey.startsWith('constraint:node') && !envKey.startsWith('reschedule')) {
        result.envs[envKey] = envVal;
      }
    });

    // 容器标签
    result.labels = this.__filterLabels(_.get(originData, 'Config.Labels', {}));
    // 用户
    result.user = _.get(originData, 'Config.User', '');
    // 用户组
    const _groups = _.get(originData, 'HostConfig.GroupAdd', []);
    result.groups = _groups.join(' ');
    // 工作目录
    result.dir = _.get(originData, 'Config.WorkingDir', '');
    // 标准输入流
    result.openStdin = _.get(originData, 'Config.OpenStdin', false);
    // 控制台
    result.tty = _.get(originData, 'Config.Tty', '');
    // 只读模式
    result.readonlyRootfs = _.get(originData, 'HostConfig.ReadonlyRootfs', false);
    // 特权模式
    result.privileged = _.get(originData, 'HostConfig.Privileged', false);
    // PID 模式
    result.pidMode = _.get(originData, 'HostConfig.PidMode', '');

    return result;
  }

  /**
   * 获取健康检查的设定
   */
  healthCheck() {
    const _healthCheck = _.get(this._data, 'Config.Healthcheck', {});
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
   * 获取「存储卷」配置项的内容
   */
  getStorageConfig() {
    const originData = this._data;
    // TODO 需要完善
    const mounts = _.get(originData, 'HostConfig.Binds', []);
    return mounts;
  }

  /**
   * 获取本地文件系统映射的配置
   */
  getFSMounts() {
    const storages = this.getStorageConfig();
    const fsMounts = storages.filter(item => item.type === 'bind');
    return fsMounts;
  }

  /**
   * 获取关联的存储卷的配置
   */
  getLinkedVolumes() {
    const storages = this.getStorageConfig();
    const volumes = storages.filter(item => item.type === 'volume');
    return volumes;
  }

  /**
   * 网络设置，包括端口信息，网络模式
   */
  network() {
    // default
    const result = {};
    const originData = this._data;

    const _ports = _.get(originData, 'HostConfig.PortBindings', {});
    result.ports = [];
    _.forEach(_ports, (value, key) => {
      const [PublicPort, protocol] = key.split('/');
      _.forEach(value, (v) => {
        result.ports.push({
          PublicPort, // 容器端口
          protocol,
          PrivatePort: v.HostPort, // 主机端口
        });
      });
    });

    result.networkMode = _.get(originData, 'HostConfig.NetworkMode', '');

    return result;
  }

  /**
   * 获取 DNS 配置
   */
  dnsConfig() {
    const dnsConfig = _.get(this._data, 'HostConfig', {});

    // array
    const result = {
      nameservers: _.get(dnsConfig, 'Dns', []),
      options: _.get(dnsConfig, 'DnsOptions', []),
      search: _.get(dnsConfig, 'DnsSearch', []),
    };

    // csv
    result.nameserversText = result.nameservers.join(' ');
    result.optionsText = result.options.join(' ');
    result.searchText = result.search.join(' ');

    return result;
  }

  /**
   * 获取 Hostname
   */
  hostname() {
    return _.get(this._data, 'Config.Hostname', '');
  }

  /**
   * 获取域名映射的配置
   */
  hostsMapping() {
    const hosts = _.get(this._data, 'HostConfig.ExtraHosts', []) || [];
    const result = {};
    hosts.forEach(h => {
      const [domain, ip] = h.split(':');
      result[domain] = ip;
    });

    return result;
  }

  /**
   * 获取日志驱动相关信息
   */
  getLogDriverConfig() {
    const originData = this._data;
    // 默认的日志驱动为 json-file
    const name = _.get(originData, 'HostConfig.LogConfig.Type', 'json-file');
    const options = _.get(originData, 'HostConfig.LogConfig.Config', {});
    const alternatives = [
      {
        value: 'json-file',
        name: 'json-file',
      }, {
        value: 'syslog',
        name: 'syslog',
      }, {
        value: 'journald',
        name: 'journald',
      }, {
        value: 'gelf',
        name: 'gelf',
      }, {
        value: 'fluentd',
        name: 'fluentd',
      }, {
        value: 'awslogs',
        name: 'awslogs',
      }, {
        value: 'splunk',
        name: 'splunk',
      }, {
        value: 'etwlogs',
        name: 'etwlogs',
      }, {
        value: 'none',
        name: 'none',
      },
    ]; // 可选的日志驱动名称

    return { name, options, alternatives };
  }

  /**
   * 获取高可用部分的设定
   *
   * RestartPolicy - 重启策略
   */
  highAvail() {
    const originData = this._data;

    const _restartName = _.get(originData, 'HostConfig.RestartPolicy.Name', 'no');

    const result = {
      restart: _restartName || 'no',
      maxRetry: 0,
      reschedule: this.getReschedule(),
      restarts: [
        {
          name: '从不重启',
          value: 'no',
        },
        {
          name: '总是重启（包括手动停止）',
          value: 'always',
        },
        {
          name: '自动重启',
          value: 'unless-stopped',
        },
        {
          name: '异常时重启',
          value: 'on-failure',
        },
      ],
      reschedules: [
        {
          name: '不重新调度',
          value: '',
        },
        {
          name: '当主机故障时自动重新调度',
          value: 'on-node-failure',
        },
      ],
    };

    return result;
  }

  /**
   * 获取高可用中重调度策略的设定
   *
   * reschedule - 重调度策略
   */
  getReschedule() {
    let result = '';
    const originData = this._data;
    const envs = _.get(originData, 'Config.Env', []);
    _.forEach(envs, env => {
      if (env.startsWith('reschedule:')) {
        result = env.substring(11);
        return false;
      }
    });
    return result;
  }

  /**
   * 根据 target 变量，更新标签，加上所需特殊的标签
   */
  _updateTargetLabels(tenant, username, target) {
    const originData = this._data;

    const labels = _.get(originData, target, {});

    if (tenant) {
      // 资源所属的租户标签
      labels['io.daocloud.dce.authz.tenant'] = tenant;
    }

    // 资源的创建人标签
    labels['io.daocloud.dce.authz.owner'] = username;

    _.set(originData, target, labels);
  }

  /**
   * 在创建和更新的时候，需要将所有的 label 都设置
   */
  updateAllLabels(tenant, username) {
    // 在创建和更新的时候，需要将所有的 label 都设置
    this._updateTargetLabels(tenant, username, 'Config.Labels');
  }

  // 权限
  permission() {
    return this.userService.getUserInfo()
      .then(res => {
        if (res.IsAdmin) {
          return { write: true };
        }
        // 创建 container 时，直接使用当前租户
        const tenant = this._isCreate ? this.state.actions.getTenant() : this._data.Config.Labels['io.daocloud.dce.authz.tenant'];
        return this.tenantService.getUserPermissionToTenant(tenant)
          .then(perm => {
            if (perm === 'full_control' || perm === 'restricted_control') {
              return { write: true };
            }
            return { write: false };
          });
      });
  }

  /**
   * 设置数据，主要是判断是否需要这个数据
   *
   * @param {string} target - 需要设置的变量名字符串
   */
  _setData(check, params, target, value) {
    // setData 有可能在创建的时候调用该函数，还有可能在更新的时候调用该函数
    // 使用 this._isCreate 消除创建的时候有 default 的影响
    if (check || this._isCreate && this._hasDefault(target)) {
      _.set(params, target, value);
    } else {
      // 删除空的值，主要是为了防止创建或者更新的时候带上参数
      _.unset(params, target);
    }
  }

  /**
   * 判断 target 是否必要
   *
   * @param {string} target - 需要判断的变量名字符串
   */
  _hasDefault(target) {
    return _.has(this.defaultContainerSchema, target);
  }

  /**
   * 更新镜像
   */
  _updateImage(image, auth) {
    const params = {};
    this._setData(image, this._data, 'Image', image); // 更新原来的值
    this._setData(image, params, 'Image', image); // 获取更新的值
    return this._apiUpdate(params, auth);
  }

  // 更新容器名称
  updateName(name) {
    const params = {};
    this._setData(name, this._data, 'Name', name); // 更新原来的值
    this._setData(name, params, 'Name', name); // 获取更新的值
    return this._apiUpdate(params);
  }

  /**
   * 更新计算资源的配置
   * target 为目标更新内容
   * TODO 更新数据部分还需要修改，DCE 2.0.3 暂且不考虑 contianer detail 的 update
   */
  updateResourcesConfig(config, target) {
    const params = this._data;

    switch (target) {
      case 'cpuLimit':
        const CpuQuotaStr = 'HostConfig.CpuQuota';
        const CpuQuotaVal = config.cpuLimit * 1e5;
        this._setData(config.cpuLimit, params, CpuQuotaStr, CpuQuotaVal);
        break;
      case 'memReservation':
        const memReservationStr = 'HostConfig.MemoryReservation';
        const memReservationVal = config.memReservation * UNITS[config.memReservationUnit];
        this._setData(config.memReservation, params, memReservationStr, memReservationVal);
        break;
      case 'memLimit':
        const memLimitStr = 'HostConfig.Memory';
        const memLimitVal = config.memLimit * UNITS[config.memLimitUnit];
        this._setData(config.memLimit, params, memLimitStr, memLimitVal);
        break;
      default:
        break;
    }

    return this._apiUpdate(params);
  }

  /**
   * 「调度策略」设置
   *
   * 指定主机
   * 更新 Config.Env 参数
   *
   * @param {string} config.nodeName - 指定的主机 ID
   * @private
   */
  updateSchedulePolicy(config) {
    const params = {};
    this.info.constraints = config;
    this.info.schedulePolicy = config;

    return this._apiUpdate(params);
  }

  /**
   * 更新容器配置
   */
  updateContainerConfig(config) {
    const params = this._data;

    // 启动命令
    const _cmd = config.cmd.split(' ').map(arg => arg.trim()).filter(arg => arg.length);
    this._setData(_cmd.length, params, 'Config.Cmd', _cmd);

    // 入口命令
    const _entrypoint = config.entrypoint.split(' ').map(arg => arg.trim()).filter(arg => arg.length);
    this._setData(_entrypoint.length, params, 'Config.Entrypoint', _entrypoint);

    // 环境变量
    const _envs = [];
    angular.forEach(config.envs, (v, k) => _envs.push(`${k}=${v}`));
    this._setData(_envs.length, params, 'Config.Env', _envs);
    this.updateHighAvailConfig(this.info.highAvail);
    this.updateSchedulePolicy(this.info.schedulePolicy);

    // 容器标签
    this._setData(!isEmpty(config.labels), params, 'Config.Labels', this.__completeLabels(config.labels));
    // 用户
    this._setData(config.user, params, 'Config.User', config.user);
    // 用户组
    const _userGroup = config.groups.split(' ').map(arg => arg.trim()).filter(arg => arg.length);
    this._setData(_userGroup.length, params, 'HostConfig.GroupAdd', _userGroup);
    // 工作目录
    this._setData(config.dir, params, 'Config.WorkingDir', config.dir);
    // 标准输入流
    this._setData(true, params, 'Config.OpenStdin', config.openStdin);
    // 控制台
    this._setData(true, params, 'Config.Tty', config.tty);
    // 只读模式
    this._setData(true, params, 'HostConfig.ReadonlyRootfs', config.readonlyRootfs);
    // 特权模式
    this._setData(true, params, 'HostConfig.Privileged', config.privileged);
    // PID 模式
    this._setData(true, params, 'HostConfig.PidMode', config.pidMode);

    return this._apiUpdate(params);
  }

  /**
   * 更新健康检查的设置
   */
  updateHealthCheckConfig(config) {
    const params = this._data;
    let test;  // 健康检查选项及命令

    if (config.activate) {
      test = ['CMD-SHELL', config.cmd];
    } else {
      test = ['NONE', config.cmd];
    }

    this._setData(config.cmd, params, 'Config.Healthcheck.Test', test);
    this._setData(config.interval, params, 'Config.Healthcheck.Interval', config.interval * 1e9);
    this._setData(config.timeout, params, 'Config.Healthcheck.Timeout', config.timeout * 1e9);
    this._setData(config.retries, params, 'Config.Healthcheck.Retries', config.retries);

    return this._apiUpdate(params);
  }

  /**
   * 更新 「存储卷」的设定
   * "ReadOnly": true,
   * "Source": "web-data",
   * "Target": "/usr/share/nginx/html",
   * "Type": "volume",
   * "VolumeOptions": {
   *   "NoCopy": false,
   *   "DriverConfig": {
   *   },
   *   "Labels": {
   *     "com.example.something": "something-value"
   *   }
   * }
   */
  updateStorageConfig(volumes, driver) {
    const params = this._data;
    const newVolumes = volumes.map(vol =>
      volumeStringify(vol.hostRoute, vol.containerRoute, vol.permission));

    this._setData(newVolumes.length, params, 'HostConfig.Binds', newVolumes);
    _.set(params, 'HostConfig.VolumeDriver', '');  // docker 会自己判断 volume 类型

    return this._apiUpdate(params);
  }

  /**
   * 更新网络端口的设置
   *
   * 关于 Ports 参数的格式文档里写得比较含糊，可以从下面的 engine-api 项目中了解其定义的方式
   * https://github.com/docker/engine-api/blob/b54bc2593fe368a3a1ad9b3ad5afae3215c8eb54/types/swarm/network.go#L27
   */
  updateNetworkPorts(config) {
    const params = this._data;

    const exposedPorts = {};
    _.forEach(config.ports, v => {
      exposedPorts[`${v.PublicPort}/${v.protocol.toLowerCase()}`] = {};
    });

    this._setData(!isEmpty(exposedPorts), params, 'Config.ExposedPorts', exposedPorts);

    const portBindings = {};
    _.forEach(config.ports, v => {
      const key = `${v.PublicPort}/${v.protocol.toLowerCase()}`;
      if (!portBindings.hasOwnProperty(key)) {
        portBindings[key] = [];
      }
      portBindings[key].push({
        HostIp: '',
        HostPort: v.PrivatePort,
      });
    });

    this._setData(!isEmpty(portBindings), params, 'HostConfig.PortBindings', portBindings);

    return this._apiUpdate(params);
  }

  /**
   * 更新网络模式的设置
   */
  updateNetworkMode(config) {
    const params = this._data;
    _.set(params, 'HostConfig.NetworkMode', config.networkMode);

    return this._apiUpdate(params);
  }

  /**
   * 更新 DNS 的配置选项
   */
  updateDNSConfig(config) {
    const params = this._data;
    _.set(params, 'HostConfig.Dns', config.nameservers);
    _.set(params, 'HostConfig.DnsSearch', config.search);
    _.set(params, 'HostConfig.DnsOptions', config.options);

    return this._apiUpdate(params);
  }

  /**
   * 更新 Hostname
   */
  updateHostname(hostname) {
    const params = this._data;
    this._setData(hostname, params, 'Config.Hostname', hostname);
    return this._apiUpdate(params);
  }

  /**
   * 获取域名映射的配置
   */
  updateHostsConfig(hosts) {
    const params = this._data;
    const _hosts = hosts.length > 0 ? hosts : null;
    this._setData(true, params, 'HostConfig.ExtraHosts', _hosts);

    return this._apiUpdate(params);
  }

  /**
   * 更新日志驱动的设置
   */
  updateLogDriverConfig(config) {
    const params = this._data;
    this._setData(config.name, params, 'HostConfig.LogConfig.Type', config.name);
    this._setData(isEmpty(config.options), params, 'HostConfig.LogConfig.Config', config.options);
    return this._apiUpdate(params);
  }

  /**
   * 更新「高可用」的设置
   */
  updateHighAvailConfig(config) {
    const params = this._data;
    const originData = this._data;

    // 值为 no 时，不设置该字段
    this._setData(config.restart !== 'no', params, 'HostConfig.RestartPolicy.Name', config.restart);

    // 重启策略为 on-failure 时，一定需要最大重启次数，暂且默认为 0
    if (config.restart === 'on-failure') {
      this._setData(true, params, 'HostConfig.RestartPolicy.MaximumRetryCount', config.maxRetry);
    } else {
      // 重启策略非 on-failure 时，取消该字段
      _.unset(params, 'HostConfig.RestartPolicy.MaximumRetryCount');
    }

    const oldEnvs = _.get(originData, 'Config.Env', []);

    // 覆盖原有的 reschedule 条件
    const newEnvs = oldEnvs.map(p => {
      if (p.startsWith('reschedule:')) {
        if (config.reschedule) {
          // 当 config.reschedule 为空时去除 reschedule 环境变量
          return config.reschedule ? `reschedule:${config.reschedule}` : '';
        }
      }
      return p;
    }).filter(i => i); // 只保留有意义的约束条件

    // 创建新的 reschedule 条件
    const hasReschedule = _.find(newEnvs, (c) => c.startsWith('reschedule:'));
    if (!hasReschedule && config.reschedule) {
      newEnvs.push(`reschedule:${config.reschedule}`);
    }

    this._setData(newEnvs.length, params, 'Config.Env', newEnvs);

    return this._apiUpdate(params);
  }

  /**
   * 执行更新操作
   */
  _apiUpdate(params, auth) {
    // 如果当前对象没有一个有效的 name 值，说明这是一个用户创建的 Container
    // 将拒绝执行更新操作，而是把更改的结果保存到临时变量，然后通过其他方法执行创建动作
    if (!this.info.name) return;

    // return this.serviceService.getDetail(this.info.id)
    //   .then(res => {
    //     const latestVersion = res.Version.Index;
    //     return this.serviceService.update(this.info.id, params, latestVersion, auth);
    //   });
  }

  /**
   * 创建 Container
   */
  create(auth, name) {
    const containerConfig = this.getCreateParam();
    const constraints = this.info.constraints.nodeId ? `node.id==${this.info.constraints.nodeId}` : '';

    const params = {
      ContainerName: name,
      ContainerConfig: containerConfig,
      RegistryAuth: auth,
      Constraints: [],
    };

    if (constraints) {
      params.Constraints.push(constraints);
    }

    return this.containerService.create(params);
  }

  /**
   * 启动 Container
   */
  up(id) {
    return this.containerService.start({
      id,
    });
  }

  // 获取创建 Container 时的参数
  getCreateParam() {
    const config = angular.copy(this._data.Config);
    const params = angular.copy(this._data);
    delete params.Config;
    angular.merge(params, config);
    return params;
  }
}

export function ContainerModel() {
  'ngInject';

  return Container;
}
