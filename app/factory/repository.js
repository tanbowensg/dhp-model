import _ from 'lodash';
import moment from 'moment';
import { parseImageAddress } from '../util/util.js';
import { REPOSITORY } from '../constant/i18n.js';
import { REGISTRY_CONSTANT, CUSTOM_ICON_LABEL } from '../constant/constant.js';

class Repository {
  constructor(repository) {
    this._init(repository);
  }

  _init(repository) {
    this.name = repository.Name;
    this.fullName = repository.FullName;
    this.registryName = repository.RegistryName;
    this.shortDescription = repository.ShortDescription;
    this.longDescription = repository.LongtDescription;
    this.visibility = _.get(repository, 'Metadata.Visibility');
    this.hasBuildFlow = _.get(repository, 'Metadata.HasBuildFlow', false);
    this.nameComponents = parseImageAddress(repository.FullName);
    this.buildFlow = this._buildFlow(repository);
    this.lastBuild = this._lastBuild(repository);
    this.canWrite = this._canWrite(repository);
    this.isInDCEReg = repository.RegistryName === REGISTRY_CONSTANT.DCERegistryName;
    this.customIcon = _.get(repository, `Labels['${CUSTOM_ICON_LABEL}']`, '');
    // TODO: 还差一个 namespace
    // this.namespace = this._namespace(repository);
  }

  // // 镜像空间
  // _namespace() {
  //   return new RegNamespace({
  //     Name: this._data.Namespace,
  //     Metadata: {
  //       Visibility: this._data.Metadata.Visibility,
  //     },
  //   }).get();
  // }

  /**
   * 与源代码读取相关的一些属性
   * @param {Object} repository
   * @return {Object}
   */
  _buildFlow(repository) {
    // 源代码访问地址
    const sourceUrl = _.get(repository, 'Metadata.BuildFlow.SourceUrl', '');
    let authType = _.get(repository, 'Metadata.BuildFlow.AuthType', 'password');
    const buildFlowId = _.get(repository, 'Metadata.BuildFlow.BuildFlowId', '');
    const sourceProvider = _.get(repository, 'Metadata.BuildFlow.SourceProvider', 'empty');
    const sourceProviderIcon = sourceProvider ? `icon_${REGISTRY_CONSTANT.providerIconMap[sourceProvider]}` : '';
    const sourceProviderType = _.get(repository, 'Metadata.BuildFlow.SourceProviderType', 'git');
    const authUsername = _.get(repository, 'Metadata.BuildFlow.AuthUsername', '') || '';
    const authPassword = _.get(repository, 'Metadata.BuildFlow.AuthPassword', '') || '';
    const authPublicKey = _.get(repository, 'Metadata.BuildFlow.AuthPublicKey', '');

    if (authType === 'password' && !authUsername && !authPassword) {
      authType = 'blank';
    }

    return {
      sourceUrl,
      authType,
      buildFlowId,
      sourceProvider, // 如：github、gitlab 的 sourceProviderType 都是 git；而 sourceProvider 是 github、gitlab
      sourceProviderIcon,
      sourceProviderType,
      authUsername,
      authPassword,
      authPublicKey,

      auth: {
        type: authType,
        username: authUsername,
        password: authPassword,
        key: authPublicKey,
      },

      authMethods: [{
        id: 'key_pair',
        text: REPOSITORY.key_pair,
      }, {
        id: 'password',
        text: REPOSITORY.password,
      }, {
        id: 'blank', // 认证方法为 password，但用户名密码为空
        text: REPOSITORY.blank,
      }],
    };
  }

  /**
   * 最近一次构建的信息
   * @param {Object} repository
   * @return {Object}
   */
  _lastBuild(repository) {
    const lastBuild = {
      has: !!repository.Metadata.LastBuild,
    };

    if (!lastBuild.has) return lastBuild;

    // 构建状态
    lastBuild.status = _.camelCase(_.get(repository, 'Metadata.LastBuild.Status', null));

    // 构建创建时间
    const createdAt = _.get(repository, 'Metadata.LastBuild.CreatedAt', new Date().getTime() / 1000) * 1000;
    lastBuild.createdAt = createdAt ? moment(createdAt) : moment(new Date().getTime());

    // 构建正式开始时间
    const startedAt = _.get(repository, 'Metadata.LastBuild.StartedAt', new Date().getTime() / 1000) * 1000;
    lastBuild.startedAt = (startedAt || createdAt) ? moment(startedAt || createdAt) : moment(new Date().getTime());

    // 构建结束时间
    const endedAt = _.get(repository, 'Metadata.LastBuild.EndedAt', new Date().getTime() / 1000) * 1000;
    lastBuild.endedAt = (endedAt || startedAt || createdAt) ? moment(endedAt || startedAt || createdAt) : moment(new Date().getTime());

    // 所使用的 Dockerfile
    // note: Metadta.LastBuild.SourceDockerfile is deprecated since 2016-11-03 18:06
    lastBuild.dockerfile = _.get(repository, 'Metadata.SourceDockerfile');

    // (构建／等待)持续时间
    let duration = 0;
    if (endedAt) {
      duration = endedAt - startedAt;
    } else if (startedAt) {
      duration = startedAt - new Date().getTime();
    } else {
      duration = createdAt - new Date().getTime();
    }
    lastBuild.duration = moment.duration(duration).humanize();

    // 基础镜像名称
    lastBuild.appPlatformName = _.get(repository, 'Metadata.LastBuild.AppPlatformName');
    // 基础镜像镜像 tag
    lastBuild.appPlatformVersion = _.get(repository, 'Metadata.LastBuild.AppPlatformVersion');
    // 应用程序 URL
    lastBuild.sourceUrl = _.get(repository, 'Metadata.LastBuild.SourceUrl');
    // 镜像版本
    lastBuild.imageTag = _.get(repository, 'Metadata.LastBuild.ImageTag');

    return lastBuild;
  }

  /**
   * 是否可写
   * @param {Object} repository 
   * @return {Bool} 
   */
  _canWrite(repository) {
    // 是否是 DCE 镜像工场，只有 DCE 镜像工场才能显示推送镜像和删除等功能
    const isInDCERegistry = repository.RegistryName === REGISTRY_CONSTANT.DCERegistryName;
    // namespace 为非 DCE 镜像工场以及 DCE 镜像空间为全部的时候，当有镜像空间的时候，判断 scopes 的权限并且一定要在 DCE 镜像空间才判断
    const isScopesCanWrite = repository.Metadata.Scopes && repository.Metadata.Scopes.includes('namespace:write');
    return isInDCERegistry && isScopesCanWrite;
  }
}

export {
  Repository,
};
