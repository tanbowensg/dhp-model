const restify = require('restify');
const appApi = require('./api/app.js');

const AppFactory = require('./factory/app.js').AppFactory;

const server = restify.createServer();

server.use(restify.CORS({
  origins: ['*'], // defaults to ['*']
  credentials: true, // defaults to false
  headers: ['x-dce-access-token'],
}));

restify.CORS.ALLOW_HEADERS.push('x-dce-access-token')

server.on('MethodNotAllowed', (req, res) => {
  if (req.method.toUpperCase() === 'OPTIONS') {
    // Send the CORS headers
    res.header('Access-Control-Allow-Headers', restify.CORS.ALLOW_HEADERS.join(', '))
    res.send(204)
  } else {
    res.send(new restify.MethodNotAllowedError())
  }
});

server.get('/apps', (req, response, next) => {
  const configs = {
    headers: {
      'X-DCE-Access-Token': req.header('x-dce-access-token')
    }
  }
  return appApi.appList(null, configs)
  // .then(apps => {
  // 	function _manageAnService(service) {
  // 		return new ServiceFactory(service).get()
  // 	}

    // 	function _manageAnApp(app) {
    // 		const promise = []
    // 		app.Services.forEach(serv => {
    // 			promise.push(_manageAnService(serv))
    // 		})
    // 		return this.$q.all(promise)
    // 			.then(services => {
    // 				app.Services = services
    // 				// 处理外层 App 相关字段
    // 				return new this.AppModel(app).get()
    // 			})
    // 	}
    // 	const promises = []
    // 	apps.forEach(app => {
    // 		promises.push(_manageAnApp(app))
    // 	})
    // 	return this.$q.all(promises)
    // })
    .then(res => {
      const apps = res.map(a => {
        return new AppFactory(a)
      })
      response.send(apps)
      next()
    }, rej => {
      response.send(rej)
      next(rej)
    })
});

server.listen(4000, () => {
  console.log('%s listening at %s', server.name, server.url)
});
