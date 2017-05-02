'use strict';

var _restify = require('restify');

var _restify2 = _interopRequireDefault(_restify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var α$$ = require('./app/stream/hub.js').α$$; // const restify = require('restify');

var appsVm$$ = require('./app/stream/app.stream.js').appsVm$$;
var getAppDetail = require('./app/stream/app.stream.js').getAppDetail;
var servicesVm$$ = require('./app/stream/service.stream.js').servicesVm$$;
var tasksVm$$ = require('./app/stream/task.stream.js').tasksVm$$;
var networksVm$$ = require('./app/stream/network.stream.js').networksVm$$;
var containersVm$$ = require('./app/stream/container.stream.js').containersVm$$;
var registriesVm$$ = require('./app/stream/registry.stream.js').registriesVm$$;

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
  var subscription = appsVm$$.subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

server.get('/appdetail', function (req, response, next) {
  return getAppDetail('prometheus').subscribe(function (res) {
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
  var subscription = servicesVm$$.subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

server.get('/tasks', function (req, response, next) {
  var subscription = tasksVm$$.subscribe(function (res) {
    response.send(res);
    next();
  }, function (rej) {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

var apiInfo = void 0;
α$$.subscribe(function (res) {
  apiInfo = res;
});
server.get('/api/info', function (req, response, next) {
  console.log(apiInfo);
  response.send(apiInfo);
  next();
});

var network = void 0;
networksVm$$.subscribe(function (res) {
  network = res;
});
server.get('/networks', function (req, response, next) {
  console.log(network);
  response.send(network);
  next();
});

var container = void 0;
containersVm$$.subscribe(function (res) {
  container = res;
});
server.get('/containers', function (req, response, next) {
  console.log(container);
  response.send(container);
  next();
});

var registry = void 0;
registriesVm$$.subscribe(function (res) {
  registry = res;
});
server.get('/registries', function (req, response, next) {
  console.log(registry);
  response.send(registry);
  next();
});

server.listen(4000, function () {
  console.log('%s listening at %s', server.name, server.url);
});