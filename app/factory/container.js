// const _ = require('lodash');
const parseImageAddress = require('../util/util.js').parseImageAddress;
const CONTAINER_I18N = require('../constant/i18n.js').CONTAINER;

// 这个是用来处理容器状态的字符串的
// https://github.com/docker/docker/blob/master/container/state.go#L123
// @params {string} lang - 要翻译成的语言, 候选值为 cn, en
function splitStatus(state, str, require, lang = 'en') {
  let words = str;
  let health;
  if (words.indexOf(' (health: starting)') > -1) {
    words = words.replace(' (health: starting)', '');
    health = 'starting';
  } else if (words.indexOf(' (healthy)') > -1) {
    words = words.replace(' (healthy)', '');
    health = 'healthy';
  } else if (words.indexOf(' (unhealthy)') > -1) {
    words = words.replace(' (unhealthy)', '');
    health = 'unhealthy';
  }
  words = words.split(' ');
  let sliceNum;
  let result;

  switch (state) {
    case 'exited':
      sliceNum = 2;
      break;
    case 'restarting':
      sliceNum = 2;
      break;
      // dead, created, up都属于默认情况，它们都没有状态码
    default:
      sliceNum = 1;
  }

  if (require === 'health') {
    return health;
  }

  if (require === 'status') {
    words = words.slice(0, sliceNum);
  } else {
    words = words.slice(sliceNum);
  }

  if (lang === 'cn' && require === 'status') {
    switch (state) {
      case 'created':
        result = `${CONTAINER_I18N.status.created}`;
        break;

      case 'restarting':
        result = `${CONTAINER_I18N.status.restarting}${words[1] || ''}`;
        break;

      case 'running':
      case 'up':
        result = `${CONTAINER_I18N.status.running}`;
        break;

      case 'paused':
        result = `${CONTAINER_I18N.status.paused}`;
        break;

      case 'exited':
        result = `${CONTAINER_I18N.status.exited}${words[1] || ''}`;
        break;

      case 'dead':
        result = `${CONTAINER_I18N.status.dead}`;
        break;

      default:
        result = words.join(' ');
        break;
    }
  } else if (lang === 'cn' && require === 'time') {
    // 如果处于 restarting 状态
    // 上次状态的持续时间就变得没有意义, 甚至会让人困惑
    if (state === 'restarting') {
      result = '';
    } else {
      const joined = words.join(' ');
      result = joined
        .replace('Less than a second', '1 秒')
        .replace('hours', '小时')
        .replace('minutes', '分钟')
        .replace('seconds', '秒')
        .replace('weeks', '周')
        .replace('days', '天')
        .replace('months', '月')
        .replace('years', '年')
        .replace('About', '大约')
        .replace(' a ', '1')
        .replace(' an ', '1')
        .replace('hour', '小时')
        .replace('minute', '分钟')
        .replace(' ago', '以前');
    }
  } else {
    result = words.join(' ');
  }

  return result;
}

class Container {
  constructor(container) {
    this._init(container);
  }

  _init(container) {
    this.name = this._name(container);
    this.node = this._node(container);
    this.app = container.Labels['com.docker.stack.namespace'] || '-';
    this.compose = container.Labels['com.docker.swarm.service.name'] || '-';
    this.serviceId = container.Labels['com.docker.swarm.service.id'] || '-';
    this.image = this._image(container);
    this.imageParsed = parseImageAddress(container.Image);
    // image URL 依赖 imageParsed
    this.imageURL = this.imageParsed.url;
    this.isSystem = !!container.Labels['io.daocloud.dce.system'];
    // TODO: 需要 registry ——博文
    // this._setAnImageUrl(container, this.registry);
    // item.imageParsed.isDCEReg = item.imageParsed.registry === DceRegInfo.Address;
    // item.imageParsed.DCERegName = REGISTRY_CONSTANT.DCERegName;

    // // 从 State 字段获取状态，从 Status 字段获取状态的持续时间
    // TODO：这个splitStatus方法有点乱，以后有机会重构一下 ——博文
    this.status = splitStatus(container.State, container.Status, 'status');
    this.statusTime = splitStatus(container.State, container.Status, 'time');
    this.statusCN = splitStatus(container.State, container.Status, 'status', 'cn');
    this.statusTimeCN = splitStatus(container.State, container.Status, 'time', 'cn');
    this.health = splitStatus(container.State, container.Status, 'health');
  }

  /**
   * 名字
   * @param {Object} container
   * @return {String}
   */
  _name(container) {
    // 原本的 Names 就是一个数组，里面有一个元素，很奇怪。
    // 原本名字的格式： /主机名/容器名。
    const name = container.Names[0];
    return name ? name.split('/')[2] : '-';
  }

  /**
   * 主机
   * @param {Object} container
   * @return {String}
   */
  _node(container) {
    // 主机信息原本也是在 Names 里的
    // 原本名字的格式： /主机名/容器名。
    const name = container.Names[0];
    return name ? name.split('/')[1] : '-';
  }

  /**
   * 镜像
   * @param {Object} container
   * @return {String}
   */
  _image(container) {
    const words = container.Image.split('/');

    if (words.length > 1 && words[0].indexOf('.') > -1) {
      words.splice(0, 1);
    }
    return words.join('/');
  }
}

exports.Container = Container;
