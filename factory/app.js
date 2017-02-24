const _ = require('lodash')

class AppFactory {
	constructor(data) {
		this._data = data
		this.Services = data.Services
		this.activate()
	}

	activate() {
		// 只读属性
		this.info = {
			name: this.appName(), // 应用名
			// services: this.services(), // 应用服务
			// updatedAt: this.updatedAt(), // 更新时间
			// servicesName: this.servicesName(), // 所有服务名
			// images: this.images(), // 所有镜像

			// servicesStateNum: this.servicesStateNum(), // 运行中、停止的服务数量
			// hasAccessPoints: this.hasAccessPoints(), // 有没有接入点
			// cpu: this.cpu(), // cpu 核数
			// memory: this.memory(), // 内存
			// tenant: this.tenant(), // 所属租户，在已存在应用添加服务的时候需要使用该字段
			// globalServices: this.globalServices(), // 应用是否含有全局服务
			// allServicesAreGlobal: this.allServicesAreGlobal(), // 是否所有服务都是全局的
			// appTemplate: this.appTemplate(), // 该应用所属于的应用模板
		}

		// this.info.isRunning = this.isRunning() // 判断该应用是否正在运行中，不包含系统应用
		// this.info.isStopped = this.isStopped() // 判断该应用是否已停止，不包含系统应用
		// this.info.isSystem = this.isSystem() // 判断该应用是否是系统应用，其下的服务只要有一个是系统服务就算是系统应用
		this.methods = {
			up: this._up.bind(this), // 启动应用
			stop: this._stop.bind(this), // 停止应用
			remove: this._remove.bind(this), // 删除应用
			restart: this._restart.bind(this), // 重启应用
			getTasks: this.tasks.bind(this), // 任务状态
			getManageViews: this.manageViews.bind(this), // 获取详情页侧边栏扩展
		}
	}

	// 获取最终暴露的属性和方法
	get() {
		// 等待任务状态、权限取到后才能返回
		const promise = {
			// tasks: this.tasks(), // tasks 放在这里同步获取会使列表展现有点慢，所以放到下面异步获取了
			// permission: this.permission(),
		}
		return this.$q.all(promise).then(res => {
			// this.info.permission = res.permission
			return {
				info: this.info,
				methods: this.methods,
			}
		})
	}

	// 应用名
	appName() {
		return this._data.Name
	}

	// 应用服务
	services() {
		return this._data.Services
	}

	// 更新时间
	updatedAt() {
		let time = 0
		this._data.Services.forEach(serv => {
			const value = serv.info.updatedAt.valueOf()
			if (value > time.valueOf()) {
				time = serv.info.updatedAt
			}
		})
		return time
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
	tasks(app, refreshAppDetail) {
		let promise
		// 刷新某个应用，不用获取所有 tasks
		if (refreshAppDetail) {
			// 应用列表中为每个应用计算相应任务状态，可从缓存中获取
			const serviceIdList = this.map(this._data.Services, 'info.id')

			promise = this.taskService.list({
				service: serviceIdList,
			}, true)
		} else {
			promise = this.taskService.list()
				.then(res => {
					return this.filter(res, t => {
						return this.map(this._data.Services, 'info.id').indexOf(t.ServiceID) > -1
					})
				})
		}

		return promise.then(tasks => {
			const ts = this.groupBy(tasks, 'ServiceID')
			const data = { runningTasksNum: 0, desiredRunningTasksNum: 0, tasks: [] }
			angular.forEach(ts, (v, k) => {
				const service = this._data.Services.find(s => s.info.id === k)
				const serviceMode = service.info.mode
				const serviceName = service.info.name

				const _data = this._taskProgress(v, serviceMode, serviceName)
				data.runningTasksNum += _data.runningTasksNum
				data.desiredRunningTasksNum += _data.desiredRunningTasksNum
				data.tasks = data.tasks.concat(_data.tasks)
			})

			if (app) {
				app.info.tasks = data
			} else {
				return data
			}
		})
	}
	// 获取详情页侧边栏扩展
	manageViews(app) {
		return this.extensionPoints.getManageViews('Application', this.appName())
			.then(res => {
				if (app) {
					app.info.manageViews = res
				} else {
					return res
				}
			})
	}
	// 权限
	permission() {
		return this.userService.getUserInfo()
			.then(res => {
				if (res.IsAdmin) {
					return { write: true }
				}
				return this.tenantService.getUserPermissionToTenant(this._data.Tenant)
					.then(perm => {
						if (perm === 'full_control' || perm === 'restricted_control') {
							return { write: true }
						}
						return { write: false }
					})
			})
	}
	// 所有服务名
	servicesName() {
		return this.map(this._data.Services, 'info.name').join('、')
	}
	// 所有镜像
	images() {
		return this.map(this._data.Services, 'info.image.image').join('、')
	}
	// 运行中、停止的服务数量
	servicesStateNum() {
		const num = {
			running: 0,
			stopped: 0,
			system: 0,
		}
		this._data.Services.forEach(serv => {
			if (!serv.info.mode.replicas && !serv.info.mode.global) {
				num.stopped++
			} else {
				num.running++
			}
			if (serv.info.isSystem) {
				num.system++
			}
		})
		return num
	}
	// cpu 核数
	cpu() {
		let cpuNum = 0
		let keepGoing = true
		this._data.Services.forEach(serv => {
			if (keepGoing) {
				const _cpu = serv.info.resources.cpuLimit
				const _replicas = serv.info.mode.replicas
				if (_cpu === 0) {
					keepGoing = false
				} else {
					cpuNum += _cpu * (_replicas || 1)
				}
			}
		})
		return cpuNum ? `${parseFloat(cpuNum.toFixed(2))} 核` : '不限'
	}
	// 应用的内存限制
	memory() {
		let memory = 0
		let keepGoing = true
		this._data.Services.forEach(serv => {
			if (keepGoing) {
				const _memory = serv.info.resources.memLimitRaw
				const _replicas = serv.info.mode.replicas
				if (_memory === 0) {
					keepGoing = false
				} else {
					memory += _memory * (_replicas || 1)
				}
			}
		})
		if (!memory) {
			return '不限'
		}
		return this.$filter('formatSize')(memory, 'B')
	}
	// 所属租户
	tenant() {
		return this._data.Tenant
	}
	// 应用是否含有全局服务
	globalServices() {
		const global = []
		this._data.Services.forEach(serv => {
			if (serv.info.mode.global) {
				global.push(serv.info.name)
			}
		})
		return global
	}
		// 有没有接入点
	hasAccessPoints() {
		return _.flatten(this._data.Services.map(v => v.info.ports)).some(v => v)
	}
		// 是否所有服务都是全局的
	allServicesAreGlobal() {
		return this._data.Services.length === this.globalServices().length
	}
	// 该应用所属于的应用模板
	appTemplate() {
		let templateLabel = ''
		this._data.Services.forEach(serv => {
			const _templateLabel = _.get(serv.info.spec, 'Labels[\'io.daocloud.dce.template\']', false)
			if (_templateLabel && !templateLabel) {
				templateLabel = _templateLabel
			}
		})
		return templateLabel
	}
	// 判断该应用是否正在运行中，不包含系统应用
	isRunning() {
		return this.info.servicesStateNum.running && !this.info.servicesStateNum.system
	}
	// 判断该应用是否已停止，不包含系统应用
	isStopped() {
		return !this.info.servicesStateNum.running && !this.info.servicesStateNum.system
	}
	// 判断该应用是否是系统应用，其下的服务只要有一个是系统服务就算是系统应用
	isSystem() {
		return !!this.info.servicesStateNum.system
	}
	// 启动应用
	_up() {
		return this.applicationService.up(this.appName())
	}
	// 停止应用
	_stop() {
		return this.applicationService.stop(this.appName())
	}
	// 删除应用
	_remove() {
		return this.applicationService.remove(this.appName())
	}
	// 重启应用
	_restart() {
		return this.applicationService.restart(this.appName())
	}
}

exports.AppFactory = AppFactory
