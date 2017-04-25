// 自定义图标的 label
const CUSTOM_ICON_LABEL = 'io.daocloud.dce.icon';

// 这些 label 需要对用户隐藏掉
const PRIVATE_LABELS = [
  'io.daocloud.dce.authz.owner',
  'io.daocloud.dce.authz.tenant',
  'com.docker.stack.namespace',
  'io.daocloud.dce.volume.opt.type',
  'io.daocloud.dce.volume.opt.o',
  'io.daocloud.dce.volume.opt.device',
  'io.daocloud.dce.version',
  'io.daocloud.dce.updated-at',
  'io.daocloud.dce.system',
  'io.daocloud.dce.project',
  'io.daocloud.dce.job',
  'io.daocloud.dce.template',
  'com.docker.swarm.constraints',
  'com.docker.swarm.id',
  'com.docker.swarm.reschedule-policies',
  CUSTOM_ICON_LABEL,
];

const API_URL = 'http://192.168.100.205';

const REGISTRY_CONSTANT = {
  // 特殊的 namespace 表示‘空’
  spNamespace: 'none__',
  spNamespaceShow: '(空)',
  allNamespace: 0, // 不用 null 的原因是在 dao-select 中 null 为没有值的情况
  DCERegName: 'buildin-registry',
  providerIconMap: {
    Git: 'git',
    svn: 'subversion',
    GitLab: 'gitlab',
    GitHub: 'github',
    upload: 'upload',
  },
};

exports.PRIVATE_LABELS = PRIVATE_LABELS;
exports.API_URL = API_URL;
