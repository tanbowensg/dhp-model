class Service {
    constructor(data, $q, serviceService, userService, tenantService, applicationService, $filter, taskService, TaskModel) {
        'ngInject'
        this.$q = $q
        this.serviceService = serviceService
        this.userService = userService
        this.tenantService = tenantService
        this.applicationService = applicationService
        this.$filter = $filter
        this.taskService = taskService
        this.TaskModel = TaskModel
        // 一个 Service 的默认数据结构
        // 注释的 key-value 是合法但不必须的数据
        const defaultServiceSchema = {
            // Service 的创建时间和最后更新时间
            CreatedAt: '', // ISO-8601 String
            UpdatedAt: '', // ISO-8601 String

            // Service 的当前版本号
            // Index 的值会用于在更新 Service 时作为 Query String 的查询参数 「version」的值
            Version: {
                Index: 0, // Number
            },

            // 上次更新操作的结果
            UpdateStatus: {
                CompletedAt: '', // ISO-8601 String
                StartedAt: '', // ISO-8601 String
            },

            Endpoint: {
                Spec: {},
            },

            // Service 的 Unique ID (RO)
            ID: '',

            // 创建或更新时需要递交的参数部分
            Spec: {
                EndpointSpec: {
                    Mode: 'vip',
                },

                Mode: {
                    Replicated: {
                        Replicas: 1,
                    },
                },

                // Service 的可读名称，没有人为指定时会自动生成
                Name: '',

                TaskTemplate: {
                    ContainerSpec: {
                        Image: '',
                    },
                    Placement: {},
                    Resources: {
                        Limits: {},
                        Reservations: {},
                    },
                    RestartPolicy: {
                        Condition: 'any',
                        MaxAttempts: 0,
                    },
                },
                UpdateConfig: {
                    FailureAction: 'pause',
                    Parallelism: 1,
                },
            },
        }

        // 把以下划线开头的属性当作私有属性，禁止从外部调用
        this._data = data || defaultServiceSchema
        this.ORIGINAL_IMAGE_NAME = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Image', '')

        // 只读属性
        this.info = {}

        // 外部可调用的方法
        this.methods = {}

        // DCE 用于系统识别的私有标签的名称
        // 对用户不可见
        this.reservedLabels = {}
        PRIVATE_LABELS.forEach(label => {
            this.reservedLabels[label] = ''
        })

        this.moment = moment
        this.activate()
    }

    // 以下的方法都是以双下划线开头, 表示它们是给「私有方法」使用的「私有方法」

    /*
     * Service 的标签中有专门用于后端系统识别的私有标签，
     * 比如 `io.daocloud.dce.owner`, 这类标签不能暴露到前端。
     *
     * Service 原始的标签（包括对用户不可见的私有标签）
     *
     * @param {object} originalLabels - 包含有私有方法的标签键值对
     * @return {object} filteredLabels - 不包含私有方法的标签键值对
     */
    __filterLabels(originalLabels) {
        const filteredLabels = {}

        angular.forEach(originalLabels, (val, key) => {
            if (this.reservedLabels.hasOwnProperty(key)) {
                this.reservedLabels[key] = val
                return
            }

            filteredLabels[key] = val
        })

        return filteredLabels
    }

    /**
     * 与 _filterLabels 的作用相反
     * 这个方法将私有标签补全到当前的标签列表
     *
     * 副作用: 参数对象和返回值
     *
     * @param {object} labels - 不包含私有方法的标签键值对
     * @return {object} mergedLabels - 包含有私有方法的标签键值对
     */
    __completeLabels(labels) {
        const mergedLabels = labels

        // 合并私有标签但忽略其中的空标签
        angular.forEach(this.reservedLabels, (val, key) => {
            if (!val) return
            mergedLabels[key] = val
        })

        return mergedLabels
    }

    activate() {
        this.info = {
            // originalImageName: this.ORIGINAL_IMAGE_NAME,
            spec: this.spec(),
            // createdAt: this.createdAt(),
            // updatedAt: this.updatedAt(),
            // labels: this.labels(),
            // version: this.version(),
            // id: this.id(),
            // name: this.name(),
            // image: this.image(),
            // hostname: this.hostname(),
            // mode: this.mode(),
            // modeValue: this.modeValue(),
            // resources: this.resources(),
            // appName: this.appName(),
            // updateConfig: this.updateConfig(), // 用于「灰度发布」的设置
            // containerSpec: this.containerSpec(),
            // hostsMapping: this.hostsMapping(), // 域名映射
            // endpoint: this.endpoint(),
            // constraints: this.constraints(),
            // schedulePolicy: this.constraints(), // alias
            // ports: this.ports(),
            // networks: this.networks(),
            // dnsConfig: this.dnsConfig(),
            // highAvail: this.highAvail(),
            // healthCheck: this.healthCheck(),
            // storage: this.getStorageConfig(),
            // fsMounts: this.getFSMounts(),
            // linkedVolumes: this.getLinkedVolumes(),
            // logDriver: this.getLogDriverConfig(),
        }

        this.info.isRunning = this.isRunning() // 判断该服务是否正在运行中
        this.info.isStopped = this.isStopped() // 判断该服务是否已停止
        this.info.isSystem = this.isSystem() // 判断该服务是否是系统服务，其下的服务只要有一个是系统服务就算是系统服务
        this.info.inRunningMenu = this.inRunningMenu() // 判断该服务是否正在运行中，不包含系统服务，用于列表归类
        this.info.inStoppedMenu = this.inStoppedMenu() // 判断该服务是否已停止，不包含系统服务，用于列表归类

        this.methods = {
            scale: this._scale.bind(this),
            start: this._start.bind(this),
            restart: this._restart.bind(this),
            stop: this._stop.bind(this),
            delete: this._delete.bind(this),
            updateImage: this._updateImage.bind(this),
            updateMode: this.updateMode.bind(this),
            updateHighAvailConfig: this.updateHighAvailConfig.bind(this),
            updateUpdateConfig: this.updateUpdateConfig.bind(this),
            updateResourcesConfig: this.updateResourcesConfig.bind(this),
            updateContainerConfig: this.updateContainerConfig.bind(this),
            updateSchedulePolicy: this.updateSchedulePolicy.bind(this),
            updateStorageConfig: this.updateStorageConfig.bind(this),
            updateNetworkConfig: this.updateNetworkConfig.bind(this),
            updateHostsConfig: this.updateHostsConfig.bind(this),
            updateDNSConfig: this.updateDNSConfig.bind(this),
            updateHostname: this.updateHostname.bind(this),
            updateLBConfig: this.updateLBConfig.bind(this),
            updateHealthCheckConfig: this.updateHealthCheckConfig.bind(this),
            setName: this._setName.bind(this),
            updateAllLabels: this.updateAllLabels.bind(this),
            updateLogDriverConfig: this.updateLogDriverConfig.bind(this),
            updateName: this.updateName.bind(this),
            create: this.create.bind(this),
            updateSpec: this.updateSpec.bind(this),
            getTasks: this.tasks.bind(this), // 任务状态
        }

        // 可读可写属性
        this.replicas = this.info.mode.replicas
    }

    // 获取最终暴露的属性和方法
    get() {
        // 等待权限取到后才能返回
        const promise = {
            permission: this.permission(),
        }
        return this.$q.all(promise).then(res => {
            this.info.permission = res.permission
            return {
                info: this.info,
                methods: this.methods,
                replicas: this.replicas,
            }
        })
    }

    // 采用函数调用的方式是为了避免这些值被意外修改
    // updatedAt, version 方法的目的同此。
    spec() {
        return this._data.Spec
    }

    createdAt() {
        return this.moment(this._data.CreatedAt)
    }

    updatedAt() {
        return this.moment(this._data.UpdatedAt)
    }

    version() {
        return this._data.Version.Index
    }

    id() {
        return this._data.ID
    }

    name() {
        return this._data.Spec.Name
    }

    ports() {
        return this._data.Endpoint.Ports
    }

    /**
     * 读取 Service 的标签
     */
    labels() {
        const originalLabels = _.get(this._data, 'Spec.Labels', {})
        return this.__filterLabels(originalLabels)
    }

    /**
     * 镜像相关的信息
     *
     * 参考: https://github.com/docker/distribution/blob/b6e0cfbdaa1ddc3a17c95142c7bf6e42c5567370/reference/reference.go
     *
     * @return {Object} result
     * @return {String} result.registry
     * @return {String} result.imgName - 比如 daocloud.io/daocloud/ubuntu:12.04 中的 'ubuntu'
     * @return {String} result.image - imgName 属性的别名
     * @return {String} result.name - 去掉版本信息的镜像地址全称, 参考文档
     * @return {String} result.tag
     * @return {String} result.digest
     * @return {String} result.url
     * @return {String} result.fullname - deprecated attribute, use 'name' instead
     */
    image() {
        const imageAddr = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Image', '')
        const _image = parseImageAddress(imageAddr)
        return _image
    }

    /**
     * 获取 Hosname
     */
    hostname() {
        return _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Hostname', '')
    }

    /**
     * 获取日志驱动相关信息
     */
    getLogDriverConfig() {
        // 默认的日志驱动为 json-file
        const name = _.get(this._data, 'Spec.TaskTemplate.LogDriver.Name', 'json-file')
        const options = _.get(this._data, 'Spec.TaskTemplate.LogDriver.Options', {})
        const alternatives = [{
            value: 'json-file',
            name: 'json-file',
        }, {
            value: 'syslog',
            name: 'syslog',
        }, {
            value: 'journald',
            name: 'journald',
        }, {
            value: 'gelf',
            name: 'gelf',
        }, {
            value: 'fluentd',
            name: 'fluentd',
        }, {
            value: 'awslogs',
            name: 'awslogs',
        }, {
            value: 'splunk',
            name: 'splunk',
        }, {
            value: 'etwlogs',
            name: 'etwlogs',
        }, {
            value: 'none',
            name: 'none',
        }, ] // 可选的日志驱动名称

        return { name, options, alternatives }
    }

    /**
     * @returns {Object} result
     * @returns {Boolean} result.global
     * @returns {Number} result.replicas
     */
    mode() {
        const result = {}
        result.global = this._data.Spec.Mode.Global !== undefined
        if (!result.global) {
            result.replicas = this._data.Spec.Mode.Replicated.Replicas
        }

        return result
    }

    // 'global' or 'replicated'
    modeValue() {
        return this.mode().global ? 'global' : 'replicated'
    }

    /**
     * 根据标签判断是否是系统服务
     */
    isSystem() {
        return !!this.reservedLabels['io.daocloud.dce.system']
    }

    /**
     * 判断该服务是否正在运行中
     * 不包含系统 Service （系统服务算在 system 统计范畴中）
     */
    isRunning() {
        return this.info.mode.global || this.info.mode.replicas
    }

    /**
     * 判断服务是否已停止
     */
    isStopped() {
        return !this.info.mode.global && this.info.mode.replicas === 0
    }

    /**
     * 判断该服务是否正在运行中
     * 不包含系统 Service （系统服务算在 system 统计范畴中）
     */
    inRunningMenu() {
        return (this.info.mode.global || this.info.mode.replicas) && !this.reservedLabels['io.daocloud.dce.system']
    }

    /**
     * 判断服务是否已停止
     */
    inStoppedMenu() {
        return (!this.info.mode.global && this.info.mode.replicas === 0) && !this.reservedLabels['io.daocloud.dce.system']
    }

    /**
     * 资源占用及分配详情
     * About CPU.shares http://stackoverflow.com/a/26842597/2609042
     * Resource requirements which apply to each individual container created as part of the service.
     *
     * @returns {Object}
     */
    resources() {
        const result = {}

        // 处理之前的数据
        result.cpuLimitRaw = _.get(this._data, 'Spec.TaskTemplate.Resources.Limits.NanoCPUs', 0)
        result.cpuReservationRaw = _.get(this._data, 'Spec.TaskTemplate.Resources.Reservations.NanoCPUs', 0)
        result.memLimitRaw = _.get(this._data, 'Spec.TaskTemplate.Resources.Limits.MemoryBytes', 0)
        result.memReservationRaw = _.get(this._data, 'Spec.TaskTemplate.Resources.Reservations.MemoryBytes', 0)

        result.memLimitUnit = 'MB'
        result.memReservationUnit = 'MB'
        result.cpuLimit = result.cpuLimitRaw / 1e9
        result.cpuReservation = result.cpuReservationRaw / 1e9
        result.memLimit = result.memLimitRaw / UNITS[result.memLimitUnit]
        result.memReservation = result.memReservationRaw / UNITS[result.memReservationUnit]

        return result
    }

    /**
     * 用于灰度发布的设置
     */
    updateConfig() {
        const result = {}

        // https://docs.docker.com/engine/reference/api/docker_remote_api_v1.24/#/inspect-a-task
        result.parallelism = _.get(this._data, 'Spec.UpdateConfig.Parallelism', 0)
        result.failureAction = _.get(this._data, 'Spec.UpdateConfig.FailureAction', 'pause') // pause or continue
        result.delay = _.get(this._data, 'Spec.UpdateConfig.Delay', 0) / 1e6 // 单位 秒
        result.period = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.StopGracePeriod', 0) / 1e6 // 单位 秒

        // parallelism 候选值，用于 SELECT 组件
        result.parallelisms = [{
            value: 0, // unlimitted
            name: '不限并发数',
        }, {
            value: 1, // rolling
            name: '滚动发布',
        }, {
            value: 2,
            name: '2 个',
        }, {
            value: 3,
            name: '3 个',
        }, {
            value: 4,
            name: '4 个',
        }, {
            value: 5,
            name: '5 个',
        }, {
            value: 6,
            name: '6 个',
        }, {
            value: 7,
            name: '7 个',
        }, {
            value: 8,
            name: '8 个',
        }, {
            value: 9,
            name: '9 个',
        }, {
            value: 10,
            name: '10 个',
        }, ]

        // failureAction 候选值, 用于 SELECT 组件
        // 用于 tasks 遇到错误时执行的动作
        result.failureActions = [{
            value: 'continue',
            name: '继续', // 继续更新
        }, {
            value: 'pause',
            name: '暂停', // 暂停更新
        }, ]

        return result
    }

    /**
     * 根据 target 变量，更新标签，加上所需特殊的标签
     */
    updateTargetLabels(tenant, username, appName, target, templateName) {
        const labels = _.get(this._data, target, {})

        if (tenant) {
            // 资源所属的租户标签
            labels['io.daocloud.dce.authz.tenant'] = tenant
        }

        // 资源的创建人标签
        labels['io.daocloud.dce.authz.owner'] = username

        // 所属应用标签
        labels['com.docker.stack.namespace'] = appName

        if (templateName) {
            // 来自所选的应用模板
            labels['io.daocloud.dce.template'] = templateName
        }

        _.set(this._data, target, labels)
    }

    /**
     * 在创建和更新的时候，需要将所有的 label 都设置
     */
    updateAllLabels(tenant, username, appName, templateName) {
        // 容器标签变量字符串
        const conLablesValStr = 'Spec.TaskTemplate.ContainerSpec.Labels'
        // 存储卷变量字符串
        const mountsValStr = 'Spec.TaskTemplate.ContainerSpec.Mounts'
        // 在创建和更新的时候，需要将所有的 label 都设置
        this.updateTargetLabels(tenant, username, appName, 'Spec.Labels', templateName)
        this.updateTargetLabels(tenant, username, appName, conLablesValStr, templateName)
        const mounts = _.get(this._data, mountsValStr, [])
        _.forEach(mounts, (item, index) => {
            if (item.Type === 'volume') {
                this.updateTargetLabels(tenant, username, appName, `${mountsValStr}[${index}].VolumeOptions.Labels`, templateName)
            }
        })
    }

    /**
     * 获取容器配置
     */
    containerSpec() {
        const result = {}
        // 命令、命令参数
        const _cmd = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Command', [])
        const _args = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Args', [])
        result.cmd = shellQuote.quote(_cmd)
        result.args = shellQuote.quote(_args)

        result.envs = {}
        const _envsList = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Env', [])
        _envsList.map(item => {
            // 考虑 value 中也带有 ‘=’ 的情况
            const index = item.indexOf('=')
            const [envKey, envVal] = [item.substring(0, index), item.substring(index + 1)]
            result.envs[envKey] = envVal
        })

        result.user = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.User', '')

        const _groups = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Groups', []) || []
        result.groups = _groups.length ? _groups.join(' ') : ''

        result.dir = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Dir', '')

        result.labels = this.__filterLabels(_.get(this._data, 'Spec.Labels', {}))
        result.containerLabels = this.__filterLabels(_.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Labels', {}))

        result.tty = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.TTY', false)

        return result
    }

    /**
     * 获取域名映射的配置
     */
    hostsMapping() {
        const hosts = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Hosts', []) || []
        const result = {}
        hosts.forEach(h => {
            const [domain, ip] = h.split(' ')
            result[domain] = ip
        })

        return result
    }

    /**
     * 获取「存储卷」配置项的内容
     */
    getStorageConfig() {
        const _mountsList = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Mounts', [])
        const mounts = _mountsList.map(m => {
            const driver = _.get(m, 'VolumeOptions.DriverConfig.Name', '')
            const driverOpts = _.get(m, 'VolumeOptions.DriverConfig.Options', {})
            const labels = _.get(m, 'VolumeOptions.Labels', {})
            const noCopy = _.get(m, 'VolumeOptions.NoCopy', false)
            return {
                type: m.Type,
                source: m.Source,
                target: m.Target,
                readOnly: m.ReadOnly,
                driver,
                noCopy,
                labels,
                driverOpts,
            }
        })

        return mounts
    }

    /**
     * 获取本地文件系统映射的配置
     */
    getFSMounts() {
        const storages = this.getStorageConfig()
        const fsMounts = storages.filter(item => item.type === 'bind')
        return fsMounts
    }

    /**
     * 获取关联的存储卷的配置
     */
    getLinkedVolumes() {
        const storages = this.getStorageConfig()
        const volumes = storages.filter(item => item.type === 'volume')
        return volumes
    }

    // 权限
    permission() {
        // 创建 app 没有 Labels 字段
        if (!this._data.Spec.Labels) return { write: true }

        return this.userService.getUserInfo()
            .then(res => {
                if (res.IsAdmin) {
                    return { write: true }
                }
                const tenant = this._data.Spec.Labels['io.daocloud.dce.authz.tenant']
                return this.tenantService.getUserPermissionToTenant(tenant)
                    .then(perm => {
                        if (perm === 'full_control' || perm === 'restricted_control') {
                            return { write: true }
                        }
                        return { write: false }
                    })
            })
    }

    /**
     * 获取高可用部分的设定
     *
     * RestartPolicy - 重启策略
     * Specification for the restart policy which applies to containers created as part of this service.
     *  - Condition – Condition for restart (none, on-failure, or any).
     *  - Delay – Delay between restart attempts.
     *  - Attempts – Maximum attempts to restart a given container before giving up (default value is 0, which is ignored).
     *  - Window – Windows is the time window used to evaluate the restart policy (default value is 0, which is unbounded).*
     */
    highAvail() {
        const _restartPolicy = _.get(this._data, 'Spec.TaskTemplate.RestartPolicy', {})
        const mode = this.mode()

        const result = {
            // 活跃节点 'multi' or 'single'
            activeNode: mode.global || mode.replicas > 1 ? 'multi' : 'single',
            condition: _restartPolicy.Condition || 'any',
            delay: _restartPolicy.Delay / 1e6 || 0,
            maxAttempts: _restartPolicy.MaxAttempts || 0,
            window: _restartPolicy.Window / 1e6 || 0,
            conditions: [{
                value: 'none',
                name: '永不重启', // label
            }, {
                value: 'on-failure', // context: https://github.com/docker/docker/pull/27062
                name: '遇到错误时重启',
            }, {
                value: 'any',
                name: '退出时重启',
            }, ],
        }

        return result
    }

    /**
     * 获取健康检查的设定
     */
    healthCheck() {
        const _healthCheck = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.Healthcheck', {})
        const result = {
            cmd: '',
            activate: true,
            test: _.get(_healthCheck, 'Test', []),
            interval: (_.get(_healthCheck, 'Interval', 0) || 0) / 1e9,
            timeout: (_.get(_healthCheck, 'Timeout', 0) || 0) / 1e9,
            retries: _.get(_healthCheck, 'Retries', 0),
        }

        const prefix = result.test[0] || ''

        switch (prefix) {
            case 'NONE':
                result.activate = false
                result.cmd = result.test[1] || ''
                break

            case 'CMD':
            case 'CMD-SHELL':
                result.cmd = result.test[1] || ''
                break

            default:
                break
        }

        return result
    }

    /**
     * 获取 DNS 配置
     */
    dnsConfig() {
        const dnsConfig = _.get(this._data, 'Spec.TaskTemplate.ContainerSpec.DNSConfig', {})

        // array
        const result = {
            nameservers: _.get(dnsConfig, 'Nameservers', []),
            options: _.get(dnsConfig, 'Options', []),
            search: _.get(dnsConfig, 'Search', []),
        }

        // csv
        result.nameserversText = result.nameservers.join(' ')
        result.optionsText = result.options.join(' ')
        result.searchText = result.search.join(' ')

        return result
    }

    /**
     * 1.24 的 API 中有多处 Endpoint 相关信息，
     * 然而暂时无法确定哪一处才是可靠的，
     * 所以这里做了很多 fallback 的处理，
     * 确保尽可能返回有效的数据而不会抛异常
     */
    endpoint() {
        // default
        const result = {}

        // TODO VirtualIPs 真的是从这个字段里获得的吗？
        const _virtualIPs = _.get(this._data, 'Endpoint.VirtualIPs', [])
        const _ports = _.get(this._data, 'Spec.EndpointSpec.Ports', [])

        // DNSRR is the default network mode
        // https://docs.docker.com/engine/userguide/networking/default_network/configure-dns/#/configure-container-dns
        result.mode = _.get(this._data, 'Spec.EndpointSpec.Mode', 'dnsrr')

        // 统一变量命名规则: camelCase
        result.ports = _ports.map(port => ({
            protocol: port.Protocol,
            publishedPort: port.PublishedPort,
            targetPort: port.TargetPort,
            publishMode: port.PublishMode,
        }))

        // 开放端口 - 非负载均衡端口
        result.openPorts = result.ports.filter(p => p.publishMode === 'host')

        // 负载均衡端口
        result.lbPorts = result.ports.filter(p => p.publishMode === 'ingress')

        result.virtualIPs = _virtualIPs.map(item => ({
            addr: item.Addr,
            networkId: item.networkId,
        }))

        return result
    }

    /**
     * 获取 Service 关联的网络 ID 及别名
     * https://github.com/docker/docker/blob/37302bbb3f4889e9de2a95d5ea018acdab9e4447/vendor/src/github.com/docker/engine-api/types/swarm/network.go
     *
     * 自 Docker 1.13 起 Networks 配置向里移一层
     * https://github.com/docker/docker/blob/48a9e53d70472bebad908b273351d8a07939a764/api/types/swarm/service.go#L28
     */
    networks() {
        const oldNetworks = _.get(this._data, 'Spec.Networks', [])
        const newNetworks = _.get(this._data, 'Spec.TaskTemplate.Networks', [])

        const networksIndexed = {}
        oldNetworks.forEach((aliases, target) => {
            if (!networksIndexed[target]) {
                networksIndexed[target] = aliases
            }
        })

        newNetworks.forEach(({ Aliases, Target }) => {
            if (!networksIndexed[Target]) {
                networksIndexed[Target] = Aliases
                return
            }

            // 合并旧的配置
            networksIndexed[Target] = _.concat(networksIndexed[Target], Aliases)
        })

        const networks = []
        angular.forEach(networksIndexed, (aliases, target) => {
            networks.push({
                Target: target,
                Aliases: aliases,
            })
        })

        return networks.map(net => ({ id: net.Target, aliases: net.Aliases }))
    }

    /**
     * @param {Array} networks - [{target: <String>, aliases: <Array>], [{target: <String>, aliases: <Array>], ...]
     */
    updateNetworkConfig(networks) {
        _.set(this._data.Spec, 'TaskTemplate.Networks', networks.map(net => {
            return {
                Target: net.target,
                Aliases: net.aliases,
            }
        }))
    }

    /**
     * 获取具体的各个限制条件的详情
     * doc: https://docs.docker.com/engine/reference/commandline/service_create/#/specify-service-constraints
     *
     * 当前的限制比较简单，只是单纯的相等性判断，即 key===value
     */
    constraints() {
        const result = {
            nodeId: '', // 指定的主机
            nodeLabel: '', // 指定的主机标签, 只允许指定一个标签
        }

        const constraints = _.get(this._data, 'Spec.TaskTemplate.Placement.Constraints', [])

        constraints.forEach(p => {
            if (p.startsWith('node.id == ')) {
                result.nodeId = p.split('==')[1].trim()
            }

            // like "node.lables.labelName === labelValue"
            if (p.startsWith('node.labels.')) {
                result.nodeLabel = p.substring(12).trim()
                // like "labelName === lableValue"
            }

            // some other constraints
        })

        return result
    }

    /**
     * 应用名
     */
    appName() {
        const labels = _.get(this._data, 'Spec.Labels', {})
        const isSystem = !!labels['io.daocloud.dce.system']
        const appName = labels['com.docker.stack.namespace']
        if (isSystem) return ''
        return appName || this._data.Spec.Name
    }

    _setName(name) {
        this._data.Spec.Name = name
        this.info.name = this.name()
    }

    /**
     * 水平扩展 Service
     *
     * @private
     */
    _delete() {
        return this.serviceService.delete(this.info.id)
    }

    /**
     * 水平扩展 Service
     *
     * @private
     */
    _scale(replicas) {
        const params = this._data.Spec
        params.Mode.Replicated.Replicas = replicas
        return this._apiUpdate(params)
    }

    // 启动
    // 停止的普通服务才能启动
    _start() {
        const mode = this.mode()
        if (!mode.global) {
            return this._scale(1)
        }
    }

    /**
     * 重启

     * 如果不支持 ForceUpdate 参数, 就使用原来的停止-启动的方式来实现重启功能
     *
     *  1. 先将服务 scale 成 0 个
     *  2. 将服务 scale 回原来的 replicas 数，并且至少 scale 至 1 个
     */
    _restart() {
        const params = this._data.Spec
        let forceUpdate = _.get(params, 'TaskTemplate.ForceUpdate')

        if (typeof forceUpdate !== 'undefined') { // 支持 ForceUpdate 参数
            forceUpdate += 1
            _.set(params, 'TaskTemplate.ForceUpdate', forceUpdate)
            return this._apiUpdate(params)
        }

        // 不支持 ForceUpdate 参数 (docker 版本低于 1.13)
        const mode = this.mode()
        const replicas = mode.replicas || 1

        if (!mode.global) {
            // 普通服务才能重启，全局服务不能重启
            return this._scale(0).then(() => {
                return this._scale(replicas)
            })
        }
    }

    // 停止
    // 普通服务才能停止
    _stop() {
        const mode = this.mode()
        if (!mode.global) {
            return this._scale(0)
        }
    }

    /**
     * 更新「高可用」的设置
     */
    updateHighAvailConfig(config) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.RestartPolicy.Condition', config.condition)
        _.set(params, 'TaskTemplate.RestartPolicy.Delay', config.delay * 1e6)
        _.set(params, 'TaskTemplate.RestartPolicy.MaxAttempts', config.maxAttempts)
        _.set(params, 'TaskTemplate.RestartPolicy.Window', config.window * 1e6)
        return this._apiUpdate(params)
    }

    /**
     * 更新「灰度发布」的设置
     * 接收的参数需要与 updateConfig 方法返回值结构一致
     */
    updateUpdateConfig(config) {
        const params = this._data.Spec
        _.set(params, 'UpdateConfig.Parallelism', config.parallelism)
        _.set(params, 'UpdateConfig.Delay', config.delay * 1e6)
        _.set(params, 'UpdateConfig.FailureAction', config.failureAction)
        _.set(params, 'TaskTemplate.ContainerSpec.StopGracePeriod', config.period * 1e6)
        return this._apiUpdate(params)
    }

    /**
     * 更新计算资源的配置
     */
    updateResourcesConfig(config) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.Resources.Limits.NanoCPUs', config.cpuLimit * 1e9)
        _.set(params, 'TaskTemplate.Resources.Reservations.NanoCPUs', config.cpuReservation * 1e9)
        _.set(params, 'TaskTemplate.Resources.Reservations.MemoryBytes', config.memReservation * UNITS[config.memReservationUnit])
        _.set(params, 'TaskTemplate.Resources.Limits.MemoryBytes', config.memLimit * UNITS[config.memLimitUnit])

        return this._apiUpdate(params)
    }

    /**
     * 更新容器配置
     */
    updateContainerConfig(config) {
        const params = this._data.Spec

        // 这里需要过滤空字符串
        config.groups = config.groups.split(/\s+/).filter(i => i)

        // 这里将只应用到服务对应的容器上
        _.set(params, 'TaskTemplate.ContainerSpec.Labels', this.__completeLabels(config.containerLabels))

        // 这个标签将只被应用到 Service 本身上
        _.set(params, 'Labels', this.__completeLabels(config.labels))

        // 更新命令
        // const argList = config.cmd.split(' ').map(arg => arg.trim()).filter(arg => arg.length)
        // _cmd 可能为 null，但是 Command 和 Args 参数中的元素都必须是有意义的字符串
        const _cmd = shellQuote.parse(config.cmd)
        const _args = shellQuote.parse(config.args)
        _.set(params, 'TaskTemplate.ContainerSpec.Command', _cmd)
        _.set(params, 'TaskTemplate.ContainerSpec.Args', _args)

        // 如果 User 或 Groups 为空，需要省去这个字段，否则会导致服务无法启动
        if (config.user) {
            // 更新用户(容器启动后命令以何用户身份执行)
            _.set(params, 'TaskTemplate.ContainerSpec.User', config.user)
        } else {
            _.set(params, 'TaskTemplate.ContainerSpec.User', undefined)
        }

        if (angular.isArray(config.groups) && config.groups.length) {
            // 更新用户组设定
            _.set(params, 'TaskTemplate.ContainerSpec.Groups', config.groups)
        } else {
            _.set(params, 'TaskTemplate.ContainerSpec.Groups', undefined)
        }

        // 更新工作目录
        _.set(params, 'TaskTemplate.ContainerSpec.Dir', config.dir)

        // 更新 TTY
        _.set(params, 'TaskTemplate.ContainerSpec.TTY', config.tty)

        // 更新环境变量
        const _envs = []
        angular.forEach(config.envs, (v, k) => _envs.push(`${k}=${v}`))
        _.set(params, 'TaskTemplate.ContainerSpec.Env', _envs)

        return this._apiUpdate(params)
    }

    /**
     * 更新负载均衡的设置
     *
     * 更新 VIP 模式下的端口映射
     * 关于 Ports 参数的格式文档里写得比较含糊，可以从下面的 engine-api 项目中了解其定义的方式
     * https://github.com/docker/engine-api/blob/b54bc2593fe368a3a1ad9b3ad5afae3215c8eb54/types/swarm/network.go#L27
     */
    updateLBConfig(config) {
        const params = this._data.Spec
        _.set(params, 'EndpointSpec.Mode', config.mode)
        _.set(params, 'EndpointSpec.Ports', []) // ports can't be used with dnsrr mode

        if (config.mode === 'vip') {
            params.EndpointSpec.Ports = config.ports.map(port => ({
                Name: port.name,
                PublishedPort: port.publishedPort * 1,
                TargetPort: port.targetPort * 1,
                PublishMode: port.publishMode,
                Protocol: port.protocol,
            }))
        }

        return this._apiUpdate(params)
    }

    /**
     * 更新 DNS 的配置选项
     */
    updateDNSConfig(config) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.ContainerSpec.DNSConfig.Nameservers', config.nameservers)
        _.set(params, 'TaskTemplate.ContainerSpec.DNSConfig.Search', config.search)
        _.set(params, 'TaskTemplate.ContainerSpec.DNSConfig.Options', config.options)

        return this._apiUpdate(params)
    }

    /**
     * 更新域名映射的配置
     *
     * @params {array} hosts - like: ['example.com 8.8.8.8', 'www.example.com 1.2.3.4']
     */
    updateHostsConfig(hosts = []) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.ContainerSpec.Hosts', hosts)

        return this._apiUpdate(params)
    }

    /**
     * 更新 Hostname
     */
    updateHostname(hostname) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.ContainerSpec.Hostname', hostname)

        return this._apiUpdate(params)
    }

    /**
     * 更新健康检查的设置
     */
    updateHealthCheckConfig(config) {
        const params = this._data.Spec
        let test // 健康检查选项及命令

        if (config.activate) {
            test = ['CMD-SHELL', config.cmd]
        } else {
            test = ['NONE', config.cmd]
        }

        _.set(params, 'TaskTemplate.ContainerSpec.Healthcheck.Test', test)
        _.set(params, 'TaskTemplate.ContainerSpec.Healthcheck.Interval', config.interval * 1e9)
        _.set(params, 'TaskTemplate.ContainerSpec.Healthcheck.Timeout', config.timeout * 1e9)
        _.set(params, 'TaskTemplate.ContainerSpec.Healthcheck.Retries', config.retries)

        return this._apiUpdate(params)
    }

    /**
     * 「调度策略」设置
     *
     * 指定主机
     * 更新 TaskTemplate.Placement 参数
     * doc: https://docs.docker.com/engine/reference/commandline/service_create/#/specify-service-constraints
     *
     * @param {string} config.nodeId - 指定的主机 ID
     * @private
     */
    updateSchedulePolicy(config) {
        const params = this._data.Spec

        const oldConstraints = _.get(params, 'TaskTemplate.Placement.Constraints', [])

        // 覆盖原有的限制条件
        const newConstraints = oldConstraints.map(p => {
            if (p.startsWith('node.id ==')) {
                // config.nodeId 为空时，表示不指定主机，这时需要删除已存在的 constraints 条件
                p = config.nodeId ? `node.id == ${config.nodeId}` : ''
            }

            if (p.startsWith('node.labels.')) {
                p = config.nodeLabel ? `node.labels.${config.nodeLabel}` : '' // 替换规则
            }
            return p
        }).filter(i => i) // 只保留有意义的约束条件

        // 创建新的限制条件
        const hasSpecifiedNode = _.find(newConstraints, (c) => c.startsWith('node.id =='))
        if (!hasSpecifiedNode && config.nodeId) {
            newConstraints.push(`node.id == ${config.nodeId}`)
        }
        const hasSpecifiedLabel = _.find(newConstraints, (c) => c.startsWith('node.labels.'))
        if (!hasSpecifiedLabel && config.nodeLabel) {
            newConstraints.push(`node.labels.${config.nodeLabel}`)
        }

        _.set(params, 'TaskTemplate.Placement.Constraints', newConstraints)

        return this._apiUpdate(params)
    }

    /**
     * 更新 「存储卷」的设定
     * "ReadOnly": true,
     * "Source": "web-data",
     * "Target": "/usr/share/nginx/html",
     * "Type": "volume",
     * "VolumeOptions": {
     *   "NoCopy": false,
     *   "DriverConfig": {
     *   },
     *   "Labels": {
     *     "com.example.something": "something-value"
     *   }
     * }
     */
    updateStorageConfig(mounts) {
        const params = this._data.Spec
        const newMounts = mounts.map(mnt => {
            const result = {}
            result.Target = mnt.containerRoute
            result.Source = mnt.hostRoute
            result.ReadOnly = mnt.permission === 'ro'
            result.Type = mnt.type || 'bind' // 默认是文件系统间的映射

            if (mnt.noCopy !== undefined) {
                _.set(result, 'VolumeOptions.NoCopy', mnt.noCopy)
            }

            // volume options
            if (mnt.labels) {
                _.set(result, 'VolumeOptions.Labels', mnt.labels)
            }

            if (mnt.driver) {
                _.set(result, 'VolumeOptions.DriverConfig.Name', mnt.driver)
            }

            if (mnt.driverOpts) {
                _.set(result, 'VolumeOptions.DriverConfig.Options', mnt.driverOpts)
            }

            return result
        })

        _.set(params, 'TaskTemplate.ContainerSpec.Mounts', newMounts)

        return this._apiUpdate(params)
    }

    /**
     * 更新日志驱动的设置
     */
    updateLogDriverConfig(config) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.LogDriver.Name', config.name)
        _.set(params, 'TaskTemplate.LogDriver.Options', config.options)
        return this._apiUpdate(params)
    }

    /**
     * 更新镜像
     */
    _updateImage(image, auth) {
        const params = this._data.Spec
        _.set(params, 'TaskTemplate.ContainerSpec.Image', image)
        return this._apiUpdate(params, auth)
    }

    /**
     * 更新服务名称
     *
     * @param {String} name - 服务的新名字
     */
    updateName(name) {
        const params = this._data.Spec
        params.Name = name
        return this._apiUpdate(params)
    }

    /**
     * 更新服务 Spec
     *
     * @param {Object} spec - 服务的 Spec 参数
     */
    updateSpec(spec, { tenant, username, appName, templateName } = {}) {
        _.set(this._data, 'Spec', spec)
        this.updateAllLabels(tenant, username, appName, templateName)
        const params = _.get(this._data, 'Spec', {})
        return this._apiUpdate(params)
    }

    /**
     * 执行更新操作
     * 在执行更新操作前先获取该服务的最新 version 号
     */
    _apiUpdate(params, auth) {
        // 如果当前对象没有一个有效的 version 值，说明这是一个用户创建的 Service
        // 将拒绝执行更新操作，而是把更改的结果保存到临时变量，然后通过其他方法执行创建动作
        if (!this.info.version) return

        return this.serviceService.getDetail(this.info.id)
            .then(res => {
                const latestVersion = res.Version.Index
                return this.serviceService.update(this.info.id, params, latestVersion, auth)
            })
    }

    /**
     * 设置扩展模式
     *
     * @param {string} mode - 'global' or 'replicas'
     * @param {number} replicas - mode 为 「global」时忽略此值
     */
    updateMode(mode, replicas) {
        const params = this._data.Spec

        if (mode === 'global') {
            params.Mode = {
                Global: {},
            }
        } else {
            params.Mode = {
                Replicated: {
                    Replicas: replicas,
                },
            }
        }
    }

    /**
     * 创建服务
     *
     * @params {object} auth - 镜像认证信息
     * @params {string} appName - 可选，如果提供该参数则表示向应用添加服务
     */
    create(auth, appName) {
        const params = this._data.Spec

        if (!params.Labels) {
            params.Labels = {}
        }

        if (this.info.logDriver.name === 'json-file' && _.isEmpty(this.info.logDriver.options)) {
            this.methods.updateLogDriverConfig({
                name: 'json-file',
                options: {
                    'max-file': '3',
                    'max-size': '100m',
                },
            })
        }

        // 设置应用名
        if (appName) {
            const authData = angular.copy(auth, {})
            authData.registry = this.image().registry
            params.Labels['com.docker.stack.namespace'] = appName

            // Create as an app
            return this.applicationService.create({
                appName,
                services: [params],
                auths: [authData],
            })
        }

        return this.serviceService.create(params, auth)
    }

    // 处理任务数据，得到任务 progress bar 所需数据（copy from service-list.directive.controller.js）
    _taskProgress(taskList, serviceMode, serviceName) {
        const tasks = taskList.map(t => new this.TaskModel(t, {
            serviceName,
        }))

        // 正在运行中的 Tasks
        const runningTasks = tasks.filter(task => task.info.status.state === 'running')
        const runningTasksNum = runningTasks.length

        // 正常情况下预计会达到的状态是运行中的 Tasks
        // Mode 是 「Global」与 Mode 是「Replicated」 的统计方式要区分开
        const desiredRunningTasksNum = serviceMode.global ?
            tasks.filter(task => task.info.desiredState !== 'shutdown').length :
            serviceMode.replicas

        return { runningTasksNum, desiredRunningTasksNum, tasks }
    }

    // 任务状态
    tasks(service) {
        return this.taskService.list()
            .then(res => res.filter(t => t.ServiceID === this._data.ID))
            .then(tasks => {
                const data = this._taskProgress(tasks, this.info.mode, this.info.name)
                service.info.tasks = data
            })
    }
}
