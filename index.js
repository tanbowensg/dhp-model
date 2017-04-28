const restify = require('restify');
const appApi = require('./api/app.js');
const α$$ = require('./stream/hub.js').α$$;
const appsVm$$ = require('./stream/app.stream.js').appsVm$$;
const servicesVm$$ = require('./stream/service.stream.js').servicesVm$$;
const tasksVm$$ = require('./stream/task.stream.js').tasksVm$$;
const networksVm$$ = require('./stream/network.stream.js').networksVm$$;

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
  const configs = {
    headers: {
      'X-DCE-Access-Token': req.header('x-dce-access-token'),
    },
  };
  return appApi.detail('drupal', configs)
    .then(res => {
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
α$$.subscribe(res => {
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

server.listen(4000, () => {
  console.log('%s listening at %s', server.name, server.url)
});
