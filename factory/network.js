// const _ = require('lodash');
const moment = require('moment');
const nameFilter = require('../util/util.js').nameFilter;
const filterLabels = require('../util/util.js').filterLabels;

class Network {
  constructor(network) {
    this._init(network);
  }

  _init(network) {
    this.name = this._name(network);
    this.node = this._node(network);
    this.app = this._app(network);
    this.scope = network.scope;
    this.id = network.Id;
    this.containers = network.containers;
    this.ipam = network.IPAM;
    this.driver = network.Driver;
    this.enableIPv6 = network.EnableIPv6;
    this.attachable = network.Attachable;
    this.internal = network.Internal;
    this.options = network.Options;
    this.Created = moment(network.Created);
    this.labels = filterLabels(network.Labels);
  }

  /**
   * 名字
   * @param {Object} network
   * @return {String}
   */
  _name(network) {
    if (network.Driver === 'overlay') {
      return network.Name;
    }
    return nameFilter(network.Name, 'full');
  }

  /**
   * 主机
   * @param {Object} network
   * @return {String}
   */
  _node(network) {
    if (network.Driver === 'overlay') {
      return '全局';
    }
    return nameFilter(network.Name, 'host');
  }

  /**
   * 应用
   * @param {Object} network
   * @return {String}
   */
  _app(network) {
    return nameFilter(network.Name, 'app');
  }
}

exports.Network = Network;
