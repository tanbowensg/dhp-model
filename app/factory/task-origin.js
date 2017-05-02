/* global moment */
/* eslint-disable no-console */

/**
 * @param {object} data - task inspected information
 */
class Task {
  constructor(data, options) {
    // 把以下划线开头的属性当作私有属性，禁止从外部调用
    this._data = data;

    // 服务的名称
    this.serviceName = options.serviceName;

    this.containerService = options.containerService;

    // 只读属性
    this.info = {};

    this.moment = moment;

    this.initialize();
  }

  initialize() {
    this.info.slot = this.slot();
    this.info.desiredState = this._data.DesiredState;
    this.info.createdAt = this.createdAt();
    this.info.id = this.id();
    this.info.serviceId = this.serviceId();
    this.info.nodeId = this.nodeId();
    this.info.version = this.version();
    this.info.status = this.status();
    this.info.containerId = this.containerId();
    this.info.serviceName = this.serviceName;
    this.info.image = this.image();
    this.info.imgName = parseImageAddress(this.info.image).imgName;

    // 临时注释掉，因为在目前的使用中并没有用到 Container 详情里的数据
    // 如果有必要则直接取消这里的注释即可
    // this._getContainerDetail();
  }

  _getContainerDetail() {
    if (!this.info.containerId) return;
    if (this.info.desiredState === 'shutdown') return;
    if (this.info.status.category !== 'active') return;

    return this.containerService.inspect(this.info.containerId)
      .then(res => {
        this.info.containerInfo = res;
      });
  }

  // 采用函数调用的方式是为了避免这些值被意外修改
  // updatedAt, version 方法的目的同此。
  createdAt() {
    return this.moment(this._data.CreatedAt);
  }

  updatedAt() {
    return this.moment(this._data.UpdatedAt);
  }

  version() {
    return this._data.Version.Index;
  }

  id() {
    return this._data.ID;
  }

  serviceId() {
    return this._data.ServiceID;
  }

  nodeId() {
    return this._data.NodeID;
  }

  containerId() {
    if (this._data.Status &&
        this._data.Status.ContainerStatus &&
        this._data.Status.ContainerStatus.ContainerID) {
      return this._data.Status.ContainerStatus.ContainerID || '';
    }
  }

  // 获取镜像名称（包括tag 或 digest）
  // 默认返回空字符串
  image() {
    if (this._data.Spec &&
        this._data.Spec.ContainerSpec &&
        this._data.Spec.ContainerSpec.Image) {
      return this._data.Spec.ContainerSpec.Image || '';
    }

    return ''; // as default
  }

  slot() {
    return this._data.Slot;
  }

  /**
   * TODO
   * 这些值代表什么涵义 ?
   *  Doc: https://github.com/docker/engine-api/blob/master/types/swarm/task.go
   *
   * 可能的状态有:
   *
   *  Active
   *    - "running"
   *  Updating
   *    - "new"
   *    - "allocated"
   *    - "pending"
   *    - "assigned"
   *    - "accepted"
   *    - "preparing"
   *    - "ready"
   *    - "starting"
   *  Error
   *    - "failed"
   *    - "rejected"
   *  Inactive
   *    - "complete"
   *    - "shutdown"
   *

   */
  status() {
    const result = {};
    const CATEGORIES = {
      new: 'updating',
      allocated: 'updating',
      pending: 'updating',
      assigned: 'updating',
      accepted: 'updating',
      preparing: 'updating',
      ready: 'updating',
      starting: 'updating',
      running: 'active',
      complete: 'inactive',
      shutdown: 'inactive',
      failed: 'error',
      rejected: 'error',
    };

    result.message = this._data.Status.Message;
    result.error = this._data.Status.Err || '';
    result.state = this._data.Status.State;
    result.category = CATEGORIES[result.state];
    result.timestamp = this.moment(this._data.Status.Timestamp);
    result.desiredState = this._data.DesiredState;
    return result;
  }
}

export function TaskModel() {
  'ngInject';

  return Task;
}
