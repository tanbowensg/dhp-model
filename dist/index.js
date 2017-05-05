'use strict';

var _restify = require('restify');

var _restify2 = _interopRequireDefault(_restify);

var _init = require('./stream/init.js');

var _init2 = _interopRequireDefault(_init);

var _hub = require('./stream/hub.js');

var _hub2 = _interopRequireDefault(_hub);

var _appStream = require('./stream/app.stream.js');

var _serviceStream = require('./stream/service.stream.js');

var _taskStream = require('./stream/task.stream.js');

var _networkStream = require('./stream/network.stream.js');

var _containerStream = require('./stream/container.stream.js');

var _registryStream = require('./stream/registry.stream.js');

var _repositoryStream = require('./stream/repository.stream.js');

var _auth = require('./stream/auth.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _init2.default)();

var server = _restify2.default.createServer();

server.use(_restify2.default.CORS({
  origins: ['*'], // defaults to ['*']
  credentials: true, // defaults to false
  headers: ['x-dce-access-token']
}));

_restify2.default.CORS.ALLOW_HEADERS.push('x-dce-access-token');

server.on('MethodNotAllowed', function (req, res) {
  if (req.method.toUpperCase() === 'OPTIONS') {
    // Send the CORS headers
    res.header('Access-Control-Allow-Headers', _restify2.default.CORS.ALLOW_HEADERS.join(', '));
    res.send(204);
  } else {
    res.send(new _restify2.default.MethodNotAllowedError());
  }
});

server.get('/apps', function (req, response, next) {
  var subscription = _appStream.appsVm$$.subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

server.get('/appdetail', function (req, response, next) {
  return (0, _appStream.getAppDetail)('prometheus').subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
});

// server.post('/apps/:appName/stop', (req, response, next) => {
//   return appStream.stop(req.params.appName)
//     .then(res => {
//       response.send(res);
//       next();
//     }, rej => {
//       response.send(rej);
//       next(rej);
//     });
// });

// server.post('/apps/:appName/restart', (req, response, next) => {
//   return appStream.restart(req.params.appName)
//     .then(res => {
//       response.send(res);
//       next();
//     }, rej => {
//       response.send(rej);
//       next(rej);
//     });
// });

server.get('/services', function (req, response, next) {
  var subscription = _serviceStream.servicesVm$$.subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

server.get('/tasks', function (req, response, next) {
  var subscription = _taskStream.tasksVm$$.subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

var apiInfo = void 0;
_hub2.default.α$$.subscribe(function (res) {
  apiInfo = res;
});
server.get('/api/info', function (req, response, next) {
  console.log(apiInfo);
  response.send(apiInfo);
  next();
});

var network = void 0;
_networkStream.networksVm$$.subscribe(function (res) {
  network = res;
});
server.get('/networks', function (req, response, next) {
  console.log(network);
  response.send(network);
  next();
});

var container = void 0;
_containerStream.containersVm$$.subscribe(function (res) {
  container = res;
});
server.get('/containers', function (req, response, next) {
  console.log(container);
  response.send(container);
  next();
});

var registry = void 0;
_registryStream.registriesVm$$.subscribe(function (res) {
  registry = res;
});
server.get('/registries', function (req, response, next) {
  console.log(registry);
  response.send(registry);
  next();
});

var repositories = void 0;
_repositoryStream.repositoriesVm$$.subscribe(function (res) {
  repositories = res;
});
server.get('/repositories', function (req, response, next) {
  console.log(repositories);
  response.send(repositories);
  next();
});

var auth = void 0;
_auth.auth$$.subscribe(function (res) {
  auth = res;
});
server.post('/login', function (req, response, next) {
  (0, _auth.login)('admin', 'admin');
  response.send(auth);
  next();
});

server.listen(4000, function () {
  console.log('%s listening at %s', server.name, server.url);
});