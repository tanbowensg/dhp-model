import { ApiService } from './api.service';
import { mapKeys, camelCase, size, forEach, find } from '../../../../helpers/lodash';

export class NetworkService extends ApiService {
  constructor(AppConfig, $timeout, $http, $filter, $q, state, userService) {
    'ngInject';
    super(AppConfig, $timeout, $http, $q);
    this.$filter = $filter;
    this.state = state;
    this.userService = userService;

    this.networkList = {};
    this.size = size;
    this.forEach = forEach;
    this.counts = {
      all: 0,
      virtual: 0,
      local: 0,
      user: 0,
    };

    this.list();
    this.userService.getUserInfo()
      .then(userInfo => {
        this.userInfo = userInfo;
      });
  }

  listOrigin(nodeId) {
    const nodePrefix = nodeId ? `api/nodes/${nodeId}/docker/` : '';
    return this.$http.get(`${this.API_URL}/${nodePrefix}networks`)
      .then(res => res.data);
  }

  list(nodeId) {
    return this.listOrigin(nodeId)
      .then(res => {
        const networks = {
          all: [],
          user: [],
          virtual: [],
          local: [],
        };

        res.forEach(net => {
          if (net.Driver === 'overlay') {
            net.names = {
              net: net.Name,
              node: '全局',
              app: this.$filter('nameFilter')(net.Name, 'app'),
            };
          } else {
            net.names = {
              net: this.$filter('nameFilter')(net.Name, 'full'),
              node: this.$filter('nameFilter')(net.Name, 'host'),
              app: this.$filter('nameFilter')(net.Name, 'app'),
            };
          }
          if (!(net.names.net === 'host' || net.names.net === 'none'
            || net.names.net === 'dce_default' || net.names.net === 'docker_gwbridge')) {
            networks.user.push(angular.extend({}, net));

            if (net.Scope === 'local') {
              networks.local.push(angular.extend({}, net));
            } else {
              networks.virtual.push(angular.extend({}, net));
            }
          }
        });

        networks.all = networks.local.concat(networks.virtual);

        this.counts.all = networks.all.length;
        this.counts.user = networks.user.length;
        this.counts.virtual = networks.virtual.length;
        this.counts.local = networks.local.length;

        return angular.copy(networks, this.networkList);
      });
  }

  /**
   * 创建新网络
   *
   * @param {object} arg - 参数对象
   * @param {Boolean} internal - Internal 选项
   * @param {Boolean} ipv6 - EnableIPV6 选项
   * @param {string} subnet - IPAM.Config.Subnet
   * @param {string} gateway - IPAM.Config.Gateway
   * node {string} - 指定用某一台主机的 docker 的 API 创建，用 IP
   */
  create(args, node) {
    const ipamConfig = {};
    // shortest form: 0.0.0.0/0
    if (angular.isString(args.subnet) && args.subnet.length >= 9) {
      ipamConfig.Subnet = args.subnet;
    }

    if (angular.isString(args.gateway) && args.gateway.length >= 9) {
      ipamConfig.Gateway = args.gateway;
    }

    if (angular.isString(args.ipRange)) {
      ipamConfig.IPRange = args.ipRange;
    }

    if (angular.isString(args.aux)) {
      ipamConfig.AuxiliaryAddresses = {};
      this.forEach(args.aux.split(' '), val => {
        ipamConfig.AuxiliaryAddresses[val.split('=')[0]] = val.split('=')[1];
      });
    }

    const params = {
      Name: args.name || '',
      Driver: args.driver || 'bridge',
      EnableIPv6: args.ipv6,
      Internal: args.internal,
      Options: args.options || {},
      CheckDuplicate: true, // 此处为检查重名，默认应该为 true
      Attachable: args.attachable,
      Labels: args.labels || {},
      IPAM: {
        Driver: 'default',
        Options: {},
        Config: this.size(ipamConfig) ? [ipamConfig] : [],
      },
    };

    if (args.ipsec) {
      params.Options.encrypted = '';
    }

    if (args.parent) {
      params.Options.parent = args.parent;
    }

    if (!this.userInfo.isAdmin) {
      params.Labels['io.daocloud.dce.authz.tenant'] = this.state.actions.getTenant();
      params.Labels['io.daocloud.dce.authz.owner'] = this.userInfo.Name;
    }

    if (node) {
      return this.$http.post(`${this.API_URL}/api/nodes/${node}/docker/networks/create`, params)
        .then(res => res.data);
    }
    return this.$http.post(`${this.API_URL}/networks/create`, params)
      .then(res => res.data);
  }

  remove(id) {
    if (!id) {
      return false;
    }

    return this.$http.delete(`${this.API_URL}/networks/${id}`);
  }

  connect({ id, containerID, aliases, ipv4, ipv6 }) {
    if (!id || !containerID) {
      const deferred = this.$q.defer();
      deferred.reject({
        data: '缺少必要的参数',
      });
      return deferred.promise;
    }

    const params = {
      Container: containerID,
      EndpointConfig: {
        IPAMConfig: {
          IPv4Address: ipv4,
          IPv6Address: ipv6,
        },
      },
    };
    if (aliases) {
      params.EndpointConfig.Aliases = aliases;
    }
    // params = this.serialize(params);

    return this.$http({
      method: 'POST',
      url: `${this.API_URL}/networks/${id}/connect`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: params,
    });
  }

  disconnect({ id, containerID, force = false }) {
    if (!id || !containerID) {
      return false;
    }

    const params = {
      Container: containerID,
      Force: force,
    };

    // params = this.serialize(params);

    return this.$http.post(`${this.API_URL}/networks/${id}/disconnect`, params);
  }

  count() {
    return this.$http.get(`${this.API_URL}/api/networks-utils/counts`);
  }

  getNetworkContainers(networkdId) {
    const params = {
      NetworkId: networkdId,
    };
    return this.$http.get(`${this.API_URL}/api/networks-utils/containers`, { params })
      .then(res => res.data);
  }

  detailOrigin(id) {
    return this.$http.get(`${this.API_URL}/networks/${id}`);
  }

  inspect(id) {
    return this.detailOrigin(id)
      .then(res => res.data)
      .then(res => {
        return this.getNetworkContainers(res.Id)
          .then(cons => {
            res.Containers = cons;
            return res;
          });
      })
      .then(res => {
        const detail = mapKeys(res, (val, key) => camelCase(key));
        // detail.host = detail.engine.Addr || '-';
        // detail.ip = detail.engine.IP || '-';
        detail.gateway = detail.ipam.Config[0] ? detail.ipam.Config[0].Gateway : '-';
        detail.subnet = detail.ipam.Config[0] ? detail.ipam.Config[0].Subnet : '-';
        // detail.options.encrypted 如果存在的话，应该是''，表示开启 IPSec的意思
        detail.encrypted = detail.options.hasOwnProperty('encrypted');
        // 有一个极为尴尬的事情是: 主机名字在拿详情的时候是没有的，只有在拿网络列表时才有。。。
        // 所以要从列表里找到主机塞进去
        const targetNetwork = find(this.networkList.all, { Id: detail.id });
        if (targetNetwork && targetNetwork.names.node) {
          detail.node = targetNetwork.names.node;
        }
        delete detail.options.encrypted;
        return detail;
      });
  }

  // 用于获取多个网络的详情
  listById(ids) {
    // 处理参数，将数组拼接成字符串
    let param = '[';
    angular.forEach(ids, id => {
      param += `"${id}",`;
    });
    param = `${param.substring(0, param.length - 1)}]`;
    return this.$http.get(`${this.API_URL}/networks?filters={"id":${param}}`);
  }
}
