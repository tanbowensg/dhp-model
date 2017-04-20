const restify = require('restify');
const appApi = require('./api/app.js');
const appStream = require('./stream/app.stream.js');

const hub = require('./stream/hub.js').hub;

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
  hub.apps$.subscribe(res => {
    response.send(res);
    next();
  }, rej => {
    response.send(rej);
    next(rej);
  });
});

server.get('/appdetail', (req, response, next) => {
  const configs = {
    headers: {
      'X-DCE-Access-Token': req.header('x-dce-access-token'),
    },
  };
  return appApi.detail('sample14', configs)
    .then(res => {
      response.send(res);
      next();
    }, rej => {
      response.send(rej);
      next(rej);
    });
});

server.post('/apps/:appName/stop', (req, response, next) => {
  return appStream.stop(req.params.appName)
    .then(res => {
      response.send(res);
      next();
    }, rej => {
      response.send(rej);
      next(rej);
    });
});

server.post('/apps/:appName/restart', (req, response, next) => {
  return appStream.restart(req.params.appName)
    .then(res => {
      response.send(res);
      next();
    }, rej => {
      response.send(rej);
      next(rej);
    });
});

server.get('/services', (req, response, next) => {
  hub.services$.subscribe(res => {
    response.send(res);
    next();
  }, rej => {
    response.send(rej);
    next(rej);
  });
});

server.listen(4000, () => {
  console.log('%s listening at %s', server.name, server.url)
});
