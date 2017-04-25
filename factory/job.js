const _ = require('lodash');
const moment = require('moment');
const JOB_I18N = require('../constant/i18n.js').JOB;

class Job {
  constructor(job) {
    this._init(job);
  }

  _init(job) {
    _.merge(this, job);
    this.name = this._name(job);
    this.entity = this._entity(job);
    this.state = JOB_I18N.state[job.State];
    this.reason = this._reason(job);
    this.time = this._time(job);
  }

  // 任务名字
  _name(job) {
    if (JOB_I18N.name.hasOwnProperty(job.Name)) {
      return JOB_I18N.name[job.Name];
    }
    let name = job.Name.split('.').reverse().join('');
    _.forEach(JOB_I18N.nameFragment, (zh, en) => {
      name = name.replace(en, zh);
    });
    return name;
  }

  // 任务目标
  _entity(job) {
    if (JOB_I18N.entity.hasOwnProperty(job.Entity.ObjectType)) {
      return JOB_I18N.entity[job.Entity.ObjectType];
    }
    return job.Entity.ObjectType;
  }

  // 任务发起者
  _reason(job) {
    switch (job.Reason.ObjectType) {
      case 'User':
        job.Reason.taskInitiator = job.Reason.UserName;
        break;
      case 'System':
        job.Reason.taskInitiator = '系统';
        break;
      case 'Schedule':
        job.Reason.taskInitiator = '定时任务';
        break;
      default:
        job.Reason.taskInitiator = job.Reason.ObjectType;
    }
    return job.Reason;
  }

  // 任务时间
  _time(job) {
    const start = job.CreatedAt * 1000;
    const end = job.FinishedAt * 1000;
    return {
      start: moment(start).fromNow(),
      finish: end ? moment(end).fromNow() : 'till now',
      cost: end ? `${Math.abs(moment.duration(end - start, 'ms').seconds())} 秒`
        : `${Math.abs(moment.duration(moment() * 1000 - start, 'ms').seconds())} 秒`,
    };
  }
}

exports.Job = Job;
