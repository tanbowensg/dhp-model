import restify from 'restify';
import hub from './stream/hub.js';
import { appsVm$$, getAppDetail } from './stream/app.stream.js';
import { servicesVm$$ } from './stream/service.stream.js';
import { tasksVm$$ } from './stream/task.stream.js';
import { networksVm$$ } from './stream/network.stream.js';
import { containersVm$$ } from './stream/container.stream.js';
import { registriesVm$$ } from './stream/registry.stream.js';
import { repositoriesVm$$ } from './stream/repository.stream.js';

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
    res.send(new restify.MethodNotAllowedError());
  }
});

server.get('/apps', (req, response, next) => {
  const subscription = appsVm$$.subscribe(res => {
    response.send(res);
    next();
  }, rej => {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

server.get('/appdetail', (req, response, next) => {
  return getAppDetail('prometheus')
    .subscribe(res => {
      response.send(res);
      next();
    }, rej => {
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

server.get('/services', (req, response, next) => {
  const subscription = servicesVm$$.subscribe(res => {
    response.send(res);
    next();
  }, rej => {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

server.get('/tasks', (req, response, next) => {
  const subscription = tasksVm$$.subscribe(res => {
    response.send(res);
    next();
  }, rej => {
    response.send(rej);
    next(rej);
  });
  subscription.unsubscribe();
});

let apiInfo;
hub.α$$.subscribe(res => {
  apiInfo = res;
});
server.get('/api/info', (req, response, next) => {
  console.log(apiInfo);
  response.send(apiInfo);
  next();
});

let network;
networksVm$$.subscribe(res => {
  network = res;
});
server.get('/networks', (req, response, next) => {
  console.log(network);
  response.send(network);
  next();
});

let container;
containersVm$$.subscribe(res => {
  container = res;
});
server.get('/containers', (req, response, next) => {
  console.log(container);
  response.send(container);
  next();
});

let registry;
registriesVm$$.subscribe(res => {
  registry = res;
});
server.get('/registries', (req, response, next) => {
  console.log(registry);
  response.send(registry);
  next();
});

let repositories;
repositoriesVm$$.subscribe(res => {
  repositories = res;
});
server.get('/repositories', (req, response, next) => {
  console.log(repositories);
  response.send(repositories);
  next();
});

server.listen(4000, () => {
  console.log('%s listening at %s', server.name, server.url)
});
