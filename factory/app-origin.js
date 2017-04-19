// import * as _ from '../../helpers/lodash';
// import { isEmpty } from '../../helpers/object.js';

// 处理 App 相关字段
class App {
  constructor(data, applicationService, taskService,
    serviceService, tenantService, userService,
    TaskModel, $q, $filter, extensionPoints, networkService) {
    'ngInject';

    // 把以下划线开头的属性当作私有属性，禁止从外部调用
    this._data = data;
    this.applicationService = applicationService;
    this.taskService = taskService;
    this.serviceService = serviceService;
    this.tenantService = tenantService;
    this.userService = userService;
    this.TaskModel = TaskModel;
    this.$q = $q;
    this.$filter = $filter;
    this.extensionPoints = extensionPoints;
    this.networkService = networkService;
    this.map = _.map;
    this.groupBy = _.groupBy;
    this.filter = _.filter;

    this.activate();
  }

  activate() {
    // 只读属性
    this.info = {
      name: this.appName(), // 应用名
      services: this.services(), // 应用服务
      updatedAt: this.updatedAt(), // 更新时间
      servicesName: this.servicesName(), // 所有服务名
      images: this.images(), // 所有镜像
      servicesStateNum: this.servicesStateNum(), // 运行中、停止的服务数量
      hasAccessPoints: this.hasAccessPoints(), // 有没有接入点
      tenant: this.tenant(), // 所属租户，在已存在应用添加服务的时候需要使用该字段
      globalServices: this.globalServices(), // 应用是否含有全局服务
      allServicesAreGlobal: this.allServicesAreGlobal(), // 是否所有服务都是全局的
      appTemplate: this.appTemplate(), // 该应用所属于的应用模板
      ports: this.ports(), // 接入点
    };

    this.info.isRunning = this.isRunning(); // 判断该应用是否正在运行中，不包含系统应用
    this.info.isStopped = this.isStopped(); // 判断该应用是否已停止，不包含系统应用
    this.info.isSystem = this.isSystem(); // 判断该应用是否是系统应用，其下的服务只要有一个是系统服务就算是系统应用
    this.info.cpu = this.cpu(); // cpu 核数
    this.info.memory = this.memory(); // 内存

    this.methods = {
      up: this._up.bind(this), // 启动应用
      stop: this._stop.bind(this), // 停止应用
      remove: this._remove.bind(this), // 删除应用
      restart: this._restart.bind(this), // 重启应用
      getTasks: this.tasks.bind(this), // 任务状态
      getManageViews: this.manageViews.bind(this), // 获取详情页侧边栏扩展
      getNetworkName: this.networkName.bind(this), // 获取网络名称
    };
  }

  // 获取最终暴露的属性和方法
  get() {
    // 等待任务状态、权限取到后才能返回
    const promise = {
      // tasks: this.tasks(), // tasks 放在这里同步获取会使列表展现有点慢，所以放到下面异步获取了
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
  // 应用名
  appName() {
    return this._data.Name;
  }

  // 应用服务
  services() {
    return this._data.Services;
  }
  // 更新时间
  updatedAt() {
    let time = 0;
    angular.forEach(this._data.Services, serv => {
      const value = serv.info.updatedAt.valueOf();
      if (value > time.valueOf()) {
        time = serv.info.updatedAt;
      }
    });
    return time;
  }
  // 处理任务数据，得到任务 progress bar 所需数据（copy from service-list.directive.controller.js）
  _taskProgress(taskList, serviceMode, serviceName) {
    const tasks = taskList.map(t => new this.TaskModel(t, {
      serviceName,
    }));

    // 正在运行中的 Tasks
    const runningTasks = tasks.filter(task => task.info.status.state === 'running');
    const runningTasksNum = runningTasks.length;

    // 正常情况下预计会达到的状态是运行中的 Tasks
    // Mode 是 「Global」与 Mode 是「Replicated」 的统计方式要区分开
    const desiredRunningTasksNum = serviceMode.global ?
      tasks.filter(task => task.info.desiredState !== 'shutdown').length :
      serviceMode.replicas;

    return { runningTasksNum, desiredRunningTasksNum, tasks };
  }
  // 任务状态
  tasks(app, refreshAppDetail) {
    let promise;
    // 刷新某个应用，不用获取所有 tasks
    if (refreshAppDetail) {
    // 应用列表中为每个应用计算相应任务状态，可从缓存中获取
      const serviceIdList = this.map(this._data.Services, 'info.id');

      promise = this.taskService.list({
        service: serviceIdList,
      }, true);
    } else {
      promise = this.taskService.list()
      .then(res => {
        return this.filter(res, t => {
          return this.map(this._data.Services, 'info.id').indexOf(t.ServiceID) > -1;
        });
      });
    }

    return promise.then(tasks => {
      const ts = this.groupBy(tasks, 'ServiceID');
      const data = { runningTasksNum: 0, desiredRunningTasksNum: 0, tasks: [] };
      angular.forEach(ts, (v, k) => {
        const service = this._data.Services.find(s => s.info.id === k);
        const serviceMode = service.info.mode;
        const serviceName = service.info.name;

        const _data = this._taskProgress(v, serviceMode, serviceName);
        data.runningTasksNum += _data.runningTasksNum;
        data.desiredRunningTasksNum += _data.desiredRunningTasksNum;
        data.tasks = data.tasks.concat(_data.tasks);
      });

      if (app) {
        app.info.tasks = data;
      } else {
        return data;
      }
    });
  }
  // 获取网络名称
  networkName(app) {
    const promise = [];
    app.info.services.map(serv => {
      serv.info.networks.map(net => {
        const p = this.networkService.detailOrigin(net.id)
          .then(res => {
            net.name = res.data.Name;
          });
        promise.push(p);
      });
    });
    return this.$q.all(promise).then(() => app);
  }
  // 获取详情页侧边栏扩展
  manageViews(app) {
    return this.extensionPoints.getManageViews('Application', this.appName())
      .then(res => {
        if (app) {
          app.info.manageViews = res;
        } else {
          return res;
        }
      });
  }
  // 权限
  permission() {
    return this.userService.getUserInfo()
      .then(res => {
        if (res.IsAdmin) {
          return { write: true };
        }
        return this.tenantService.getUserPermissionToTenant(this._data.Tenant)
          .then(perm => {
            if (perm === 'admin' || perm === 'full_control' || perm === 'restricted_control') {
              return { write: true };
            }
            return { write: false };
          });
      });
  }
  // 所有服务名
  servicesName() {
    return this.map(this._data.Services, 'info.name').join('、');
  }
  // 所有镜像
  images() {
    return this.map(this._data.Services, 'info.image.image').join('、');
  }
  // 运行中、停止的服务数量
  servicesStateNum() {
    const num = {
      running: 0,
      stopped: 0,
      system: 0,
    };
    angular.forEach(this._data.Services, serv => {
      if (!serv.info.mode.replicas && !serv.info.mode.global) {
        num.stopped++;
      } else {
        num.running++;
      }
      if (serv.info.isSystem) {
        num.system++;
      }
    });
    return num;
  }
  // cpu 核数
  cpu() {
    if (this.info.isRunning === 0) {
      return '0 核';
    }
    let cpuNum = 0;
    let keepGoing = true;
    angular.forEach(this._data.Services, serv => {
      if (keepGoing) {
        const _cpu = serv.info.resources.cpuLimit;
        const _replicas = serv.info.mode.replicas;
        if (_cpu === 0) {
          keepGoing = false;
        } else {
          cpuNum += _cpu * (_replicas || 1);
        }
      }
    });
    return cpuNum ? `${parseFloat(cpuNum.toFixed(2))} 核` : '不限';
  }
  // 应用的内存限制
  memory() {
    if (this.info.isRunning === 0) {
      return '0 GB';
    }
    let memory = 0;
    let keepGoing = true;
    angular.forEach(this._data.Services, serv => {
      if (keepGoing) {
        const _memory = serv.info.resources.memLimitRaw;
        const _replicas = serv.info.mode.replicas;
        if (_memory === 0) {
          keepGoing = false;
        } else {
          memory += _memory * (_replicas || 1);
        }
      }
    });
    if (!memory) {
      return '不限';
    }
    return this.$filter('formatSize')(memory, 'B');
  }
  // 所属租户
  tenant() {
    return this._data.Tenant;
  }
  // 应用是否含有全局服务
  globalServices() {
    const global = [];
    angular.forEach(this._data.Services, serv => {
      if (serv.info.mode.global) {
        global.push(serv.info.name);
      }
    });
    return global;
  }
  // 有没有接入点
  hasAccessPoints() {
    return _.flatten(this._data.Services.map(v => v.info.ports)).some(v => v);
  }
  // 是否所有服务都是全局的
  allServicesAreGlobal() {
    return this._data.Services.length === this.globalServices().length;
  }
  // 该应用所属于的应用模板
  appTemplate() {
    let templateLabel = '';
    angular.forEach(this._data.Services, serv => {
      const _templateLabel = _.get(serv.info.spec, 'Labels[\'io.daocloud.dce.template\']', false);
      if (_templateLabel && !templateLabel) {
        templateLabel = _templateLabel;
      }
    });
    return templateLabel;
  }
  // 接入点
  ports() {
    const ports = [];
    angular.forEach(this._data.Services, serv => {
      angular.forEach(serv.info.ports, port => {
        ports.push({
          serv,
          port,
        });
      });
    });
    return ports;
  }
  // 判断该应用是否正在运行中，不包含系统应用
  isRunning() {
    return this.info.servicesStateNum.running && !this.info.servicesStateNum.system;
  }
  // 判断该应用是否已停止，不包含系统应用
  isStopped() {
    return !this.info.servicesStateNum.running && !this.info.servicesStateNum.system;
  }
  // 判断该应用是否是系统应用，其下的服务只要有一个是系统服务就算是系统应用
  isSystem() {
    return !!this.info.servicesStateNum.system;
  }
  // 启动应用
  _up() {
    return this.applicationService.up(this.appName());
  }
  // 停止应用
  _stop() {
    return this.applicationService.stop(this.appName());
  }
  // 删除应用
  _remove() {
    return this.applicationService.remove(this.appName());
  }
  // 重启应用
  _restart() {
    return this.applicationService.restart(this.appName());
  }
}

function AppModelFactory(applicationService, taskService,
  serviceService, tenantService, userService, TaskModel, $q,
  $filter, extensionPoints, networkService) {
  'ngInject';
  return function AppModel(data) {
    return new App(data, applicationService, taskService,
      serviceService, tenantService, userService, TaskModel,
      $q, $filter, extensionPoints, networkService);
  };
}

// 获取并处理应用 App 列表数据、给出各状态应用数统计、
// 定义共享数据、获取并调用 App 处理应用 App 详情数据、
// 监听事件，更新数据
class AppCollection {
  constructor($rootScope, $q, $filter, $location, $state, applicationService, AppModel,
   serviceService, tenantService, userService, taskService, settingsService,
   slideablePanelService, ServiceModel, TaskModel, extensionPoints) {
    'ngInject';

    this.scope = $rootScope.$new();
    this.$q = $q;
    this.$filter = $filter;
    this.$location = $location;
    this.$state = $state;
    this.applicationService = applicationService;
    this.AppModel = AppModel;
    this.serviceService = serviceService;
    this.tenantService = tenantService;
    this.userService = userService;
    this.taskService = taskService;
    this.settingsService = settingsService;
    this.slideablePanelService = slideablePanelService;
    this.ServiceModel = ServiceModel;
    this.TaskModel = TaskModel;
    this.extensionPoints = extensionPoints;

    this._activate();
  }

  _init() {
    // 获取各状态应用数初始化
    this._counts = {
      total: 0,
      running: 0,
      stopped: 0,
      system: 0,
    };

    // 应用列表数据池
    this._apps = {
      all: [],
    };

    // 应用详情数据池
    this._appDetail = {};
  }

  _activate() {
    this._init();
    this._listenEvent();
    this.getApps();
  }

  // 根据设置中的“是否显示系统应用”过滤“全部”列表
  _filterSystemApp(appList) {
    return this.settingsService.getCustomization()
      .then(res => {
        if (!res.WithSystemContainer) {
          return appList.filter(app => !app.info.isSystem);
        }
        return appList;
      });
  }

  // 处理其中的 Services 字段
  _manageAnService(service) {
    return new this.ServiceModel(service).get();
  }

  // 处理一个 app 的内部数据
  _manageAnApp(app) {
    const promise = [];
    angular.forEach(app.Services, serv => {
      promise.push(this._manageAnService(serv));
    });
    return this.$q.all(promise)
      .then(services => {
        app.Services = services;
        // 处理外层 App 相关字段
        return new this.AppModel(app).get();
      });
  }
  /**
   * 返回应用列表
   * @returns {Promise}
   */
  getApps({ nodeId, templateName, useCache } = {}, refreshTasks) {
    // useCache 只能在获取所有应用时用
    // 只有在应用列表页和镜像工场页才可能出现 useCache
    // 应用菜单内切换列表页面使用原有数据
    if (useCache && !isEmpty(this._apps.all) && this._apps.all[0].info.tasks) {
      return this.$q.when(this._apps.all);
    }
    this.appsParam = { nodeId, templateName };
    // 区分出主机详情中的应用列表
    if (nodeId) {
      this._apps[nodeId] = [];
    } else if (templateName) {
      this._apps[templateName] = [];
    }

    return this.applicationService.list(this.appsParam)
      .then(apps => {
        const promise = [];
        angular.forEach(apps, app => {
          promise.push(this._manageAnApp(app));
        });
        return this.$q.all(promise);
      })
      .then(collection => {
        // 统计分类数量，只有所有全部应用的列表数据才做统计
        if (!nodeId && !templateName) {
          this._getCount(collection);
        }
        return collection;
      })
      .then(collection => {
        // 根据设置中的“是否显示系统应用”过滤“全部”列表
        return this._filterSystemApp(collection);
      })
      .then(collection => {
        // 按最后更新时间倒序排列
        collection = collection.sort((a, b) => b.info.updatedAt - a.info.updatedAt);
        // 为了优化性能
        // 在应用列表页 或 取的是主机/应用模版/镜像工场页的应用列表，则获取任务状态
        // 每个应用取一次 task，发的请求太频繁，会请求阻塞
        // 未来应该要做分页，进一步优化
        const currentPath = this.$state.current.name;
        const onAppListPage = currentPath === 'app.application.list';
        const onImageDetailPage = currentPath === 'app.image-detail';

        if (onAppListPage || nodeId || templateName || onImageDetailPage) {
          // 区分出主机详情中的应用列表
          let oldData;
          if (nodeId) {
            oldData = this._apps[nodeId];
          } else if (templateName) {
            oldData = this._apps[templateName];
          } else {
            oldData = this._apps.all;
          }
          // 补全 app.info.tasks 这个字段，
          // 避免在操作了某一个应用后，页面因重新计算 collection 又要更新 tasks 列表的
          // 这段时间里缺少该字段，造成所有应用的任务一栏短暂空白
          collection.forEach(newApp => {
            const oldApp = oldData.filter(o => newApp.info.name === o.info.name)[0];
            if (oldApp && oldApp.info.tasks) {
              newApp.info.tasks = oldApp.info.tasks;
            }
          });
          // 任务状态
          // 抽出来异步获取是为了优化应用列表渲染速度
          this.taskService.list(null, refreshTasks)
            .then(() => {
              const p = [];
              collection.forEach(newApp => {
                p.push(newApp.methods.getTasks(newApp));
              });
              this.$q.all(p)
                .finally(() => {
                  // 等获取到所有应用任务后，再一次刷新列表，这样能避免很多次脏检查。
                  // 如果只修改app, 而不修改appCollection的话，那么这个修改是无法被watch到的。
                  if (nodeId) {
                    this._apps[nodeId] = angular.extend([], collection);
                  } else if (templateName) {
                    this._apps[templateName] = angular.extend([], collection);
                  } else {
                    this._apps.all = angular.extend([], collection);
                  }
                });
            });
        }

        // 获取按钮组的扩展
        this.extensionPoints.getActionsSets('Application')
          .then(res => {
            collection.forEach(app => {
              app.info.actionsSets = res;
            });
          });

        if (nodeId) {
          // 主机详情的应用列表
          this._apps[nodeId] = angular.extend([], collection);
          return this._apps[nodeId];
        } else if (templateName) {
          // 应用模版的应用列表
          this._apps[templateName] = angular.extend([], collection);
          return this._apps[templateName];
        }
        // 应用列表
        this._apps.all = angular.extend([], collection);
        return this._apps.all;
      });
  }

  // 统计分类数量
  _getCount(collection) {
    const { total, running, stopped, system } = collection.reduce((_counts, item) => {
      _counts.total += 1;
      if (!item.info.servicesStateNum.stopped && !item.info.servicesStateNum.system) _counts.running += 1;
      if (!item.info.servicesStateNum.running && !item.info.servicesStateNum.system) _counts.stopped += 1;
      if (item.info.servicesStateNum.system) _counts.system += 1;

      return _counts;
    }, {
      // initial values
      total: 0,
      running: 0,
      stopped: 0,
      system: 0,
    });
    angular.copy({ total, running, stopped, system }, this._counts);
  }
  // 获取各状态应用数
  count() {
    return this._counts;
  }
  // 获取应用详情
  getAppDetail(appName, refreshAppDetail) {
    this.appName = appName;

    return this.applicationService.inspect(appName)
      .then(app => {
        return this._manageAnApp(app);
      })
      .then(app => {
        // 应用详情-服务详情-关联的网络，网络名称需要另外根据 id 获取
        return app.methods.getNetworkName(app);
      })
      .then(detail => {
        if (!isEmpty(this._appDetail) && this._appDetail.info.name === detail.info.name) {
          detail.info.tasks = this._appDetail.info.tasks;
        }
        const app = angular.copy(detail, this._appDetail);

        // 任务状态
        // 抽出来异步获取是为了优化应用详情渲染速度
        app.methods.getTasks(app, refreshAppDetail)
          .then(() => {
            // 获取当前应用中各服务的任务状态
            app.info.services.map(serv => {
              return serv.methods.getTasks(serv)
                .then(() => {
                  // 更新服务详情侧滑框中的数据
                  if (this.slideablePanelService.show
                    && this.slideablePanelService.templateName === 'service-detail') {
                    const servId = this.slideablePanelService.panelInfo.data.info.id;
                    if (serv.info.id === servId) {
                      angular.copy(serv, this.slideablePanelService.panelInfo.data);
                    }
                  }
                });
            });
          });

        return app;
      })
      .then(app => {
        // 获取按钮组的扩展
        this.extensionPoints.getActionsSets('Application')
          .then(res => {
            app.info.actionsSets = res;
          });
        // 获取详情页侧边栏扩展
        app.methods.getManageViews(app);
        return app;
      });
  }

  // 更新服务详情侧滑框中的数据
  _updateAnService(servId) {
    this.getAppDetail(this.appName, true)
      .then(app => {
        const newData = app.info.services.find(res => res.info.id === servId);
        angular.copy(newData, this.slideablePanelService.panelInfo.data);

        // 由于获取 tasks 是异步的，新取得的 tasks 无法挂载到
        // “this.slideablePanelService.panelInfo.data.info.tasks” 上，
        // 所以需要 watch 一下
        const watcher = this.scope.$watch(() => newData.info.tasks, newTasks => {
          if (!newTasks) return;
          this.slideablePanelService.panelInfo.data.info.tasks = newTasks;
          watcher(); // 由于是一次性的 watch，销毁
        });
      });
  }

  // 监听事件，刷新应用列表或应用详情
  _listenEvent() {
    // 事件从 events.service.js 发出
    this.scope.$on('app::update', (e, appName) => {
      if (appName) {
        if (this.slideablePanelService.show
          && this.slideablePanelService.templateName === 'service-detail') {
          this._updateAnService(this.slideablePanelService.panelInfo.data.info.id);
        } else if (this.$state.current.name === 'app.application.detail' && this.$state.params.id === appName) {
          this.getAppDetail(appName, true);
        }
      } else {
        this.getApps(this.appsParam, true);
      }
    });
  }
}
