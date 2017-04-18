const _ = require('lodash');
const moment = require('moment');
const PRIVATE_LABELS = require('../constant.js').PRIVATE_LABELS;

// 几点注意事项
// 1、所有的处理的方法都必须是纯函数，至少在这个文件中是纯的
// 2、如果不是必要的话，禁止使用已经格式化好的某个数据去格式化另一个数据

/*
 * Service 的标签中有专门用于后端系统识别的私有标签，
 * 比如 `io.daocloud.dce.owner`, 这类标签不能暴露到前端。
 *
 * Service 原始的标签（包括对用户不可见的私有标签）
 *
 * @param {object} originalLabels - 包含有私有方法的标签键值对
 * @return {object}  不包含私有方法的标签键值对
 */
function filterLabels(originalLabels) {
  const filterdLabels = _.clone(originalLabels);
  _.forEach(PRIVATE_LABELS, privateLabel => {
    if (filterdLabels.hasOwnProperty(privateLabel)) {
      delete filterdLabels[privateLabel];
    }
  });
  return filterdLabels;
}

class Service {
  constructor(service) {
    this._init(service);
  }

  _init(service) {
    // {
    //   name: String,
    //   spec: Object,
    //   originalImageName: String,
    //   createdAt: Date,
    //   updatedAt: Date,
    // }
    // this.spec = service.Spec;
    this.name = service.Spec.Name;
    this.createdAt = this.createdAt(service);
    this.updatedAt = this.updatedAt(service);
    this.labels = this.labels(service);
    this.originalImageName = this.originalImageName(service);
  }

  /**
   * 原始镜像名称
   * @param {*} service
   * return String
   */
  originalImageName(service) {
    return _.get(service, 'Spec.TaskTemplate.ContainerSpec.Image', '')
  }

  /**
   * 创建时间
   * @param {*} service
   * return Date
   */
  createdAt(service) {
    return moment(service.CreatedAt);
  }

  /**
   * 更新时间
   * @param {*} service
   * return Date
   */
  updatedAt(service) {
    return moment(service.UpdatedAt);
  }

  /**
   * 标签
   * @param {*} service
   * return object
   */
  labels(service) {
    const originalLabels = _.get(service, 'Spec.Labels', {})
    return filterLabels(originalLabels);
  }
}

exports.Service = Service;
