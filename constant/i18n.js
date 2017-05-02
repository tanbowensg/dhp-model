const JOB = {
  name: {
    'CommonTask.CreateApp': '创建应用',
    'CommonTask.RunContainer': '创建容器',
    'CommonTask.BuildFlow': '构建镜像',
    'CommonTask.ContainerCp': '拷贝文件到容器',
    'CommonTask.ExportSupport': '运行客户支持',
    'CommonTask.Support': '运行客户支持',
    'CommonTask.GarbageCollect': '清理镜像缓存',
    'CommonTask.CommitPush': '从容器制作镜像',
    'Repository.AddTag': '添加镜像版本',
    'Repository.DeleteTag': '删除镜像版本',
  },
  nameFragment: {
    App: '应用',
    Container: '容器',
    Service: '服务',
    Namespace: '镜像空间',
    Repository: '镜像',
    Create: '创建',
    Start: '启动',
    Delete: '删除',
    Retrieve: '查看',
    Update: '更新',
    Stop: '停止',
    Restart: '重启',
    Pull: '拉取',
    Push: '推送',
    Continues: '持续',
    Deployment: '发布',
  },
  entity: {
    Application: '应用',
    Service: '服务',
    Repository: '镜像',
    Task: '任务',
    Container: '容器',
  },
  state: {
    Created: '创建',
    Cancelled: '取消',
    Running: '正在执行',
    Succeed: '已完成',
    Failed: '失败',
  },
  reason: {
    System: '系统',
    Schedule: '定时任务',
  },
};

const CONTAINER = {
  status: {
    created: '已创建',
    restarting: '重启中',
    running: '运行中',
    up: '运行中',
    paused: '已暂停',
    exited: '已停止',
    dead: '已损毁',
  },
};

exports.JOB = JOB;
exports.CONTAINER = CONTAINER;
