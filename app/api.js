const express = require('express');
const bodyParser = require('body-parser');

let app, host, mainWindow, logger;

exports.getHost = () => {
  return host;
};

exports.setMainWindow = (w) => {
  mainWindow = w;
};

exports.setLogger = (l) => {
  logger = l;
};

exports.start = () => {
  if (!app) {
    app = express();
    const server = app.listen();
    const port = server.address().port;

    // Please don't make the limit smaller, we will not store a body that is actually 50 mb.  It is 50 for a reason right now.
    app.use(bodyParser.json({limit: '50mb'}));
    app.set('port', port);

    app.get('/v1/heartbeat', (req, res) => {
      res.send('I\'m alive!');
    });

    app.post('/v1/entries', (req, res) => {
      if (mainWindow) {
        mainWindow.webContents.send('entry.create', {
          model: req.body,
        });
      }

      res.sendStatus(201);
    });

    app.put('/v1/entries/:id', (req, res) => {
      if (mainWindow) {
        mainWindow.webContents.send('entry.update', {
          id: req.params.id,
          model: req.body,
        });
      }

      res.sendStatus(200);
    });

    app.post('/v1/test-runs', (req, res) => {
      if (mainWindow) {
        mainWindow.webContents.send('testRun.create', {
          model: req.body,
        });
      }

      res.sendStatus(201);
    });

    app.put('/v1/test-runs/:id', (req, res) => {
      if (mainWindow) {
        mainWindow.webContents.send('testRun.update', {
          id: req.params.id,
          model: req.body,
        });
      }

      res.sendStatus(200);
    });

    host = `http://127.0.0.1:${app.get('port')}`;
    console.log(`Starting API at ${host}`);
  }
};
