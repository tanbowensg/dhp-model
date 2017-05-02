// import _ from 'lodash';
import moment from 'moment';
import { parseImageAddress } from '../util/util.js';

class Task {
  constructor(task, { serviceName }) {
    this._init(task, serviceName);
  }

  _init(task, serviceName) {
    this.slot = task.Slot;
    this.desiredState = task.DesiredState;
    this.createdAt = moment(task.CreatedAt);
    this.id = task.ID;
    this.serviceId = task.ServiceID;
    this.nodeId = task.NodeID;
    this.version = task.Version.Index;
    this.status = this._status(task);
    this.containerId = this._containerId(task);
    this.serviceName = serviceName;
    this.image = this._image(task);
    // 注意：依赖 this._image
    this.imgName = parseImageAddress(this._image(task)).imgName;
  }

  _status(task) {
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

    result.message = task.Status.Message;
    result.error = task.Status.Err || '';
    result.state = task.Status.State;
    result.category = CATEGORIES[result.state];
    result.timestamp = moment(task.Status.Timestamp);
    result.desiredState = task.DesiredState;
    return result;
  }

  _containerId(task) {
    if (task.Status &&
        task.Status.ContainerStatus &&
        task.Status.ContainerStatus.ContainerID) {
      return task.Status.ContainerStatus.ContainerID || '';
    }
  }

  // 获取镜像名称（包括tag 或 digest）
  // 默认返回空字符串
  _image(task) {
    if (task.Spec &&
        task.Spec.ContainerSpec &&
        task.Spec.ContainerSpec.Image) {
      return task.Spec.ContainerSpec.Image || '';
    }

    return ''; // as default
  }
}

export {
  Task,
};
