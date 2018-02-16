const Path = require('path');

// Setup environment variables
const pjson = require('./package.json');
process.env.NODE_ENV = process.env.NODE_ENV || pjson.environment || 'development';
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({
    path: Path.resolve(__dirname, 'development.env'),
  });
} else {
  require('dotenv').config({
    path: Path.resolve(__dirname, '.env'),
  });
}

const _ = require('lodash');
const electron = require('electron');
const os = require('os');
const url = require('url');
const request = require('request');

const windowUtils = require('./utils/windows');
const networkingUtils = require('./utils/networking');
const configUtils = require('./utils/config');
const prismUtils = require('./utils/prism');
const sessionUtils = require('./utils/session');
const oauthUtils = require('./utils/oauth');

const { app, ipcMain, BrowserWindow, dialog, shell, session, protocol } = electron;

configUtils.init();
networkingUtils.init({ app });

// LOGGING

// Be very careful with use of arguments property below. It is very
// easy to leak!
//
// https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments

const _log = function(baseArgs, args) {
  if (windowUtils.getMainWindow()) {
    windowUtils
      .getMainWindow()
      .webContents.send.apply(
        windowUtils.getMainWindow().webContents,
        baseArgs.concat([].slice.call(args))
      );
  }

  // garbage
  baseArgs = undefined;
  args = undefined;
};

// This function sends messages to the mainWindow, to log stuff in developer tools
const browserLoggerBaseArgs = ['console.log'];
const browserLogger = function() {
  if (windowUtils.getMainWindow()) {
    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
      // i is always valid index in the arguments object
      args[i] = arguments[i];
    }
    _log(browserLoggerBaseArgs, args);
  }
};

const proxyLoggerBaseArgs = ['proxy.log'];
const proxyLogger = function() {
  if (windowUtils.getMainWindow()) {
    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
      // i is always valid index in the arguments object
      args[i] = arguments[i];
    }
    _log(browserLoggerBaseArgs, args);
    _log(proxyLoggerBaseArgs, args);
  }
};

prismUtils.setLogger(proxyLogger);

// END LOGGING

// Quit when all windowUtils are closed.
app.on('window-all-closed', () => {
  app.quit();
});

// Shutdown the servers on quit
let serversStopped = false;
app.on('will-quit', event => {
  if (!serversStopped) {
    event.preventDefault();
    prismUtils.stop(() => {
      serversStopped = true;
      setTimeout(() => {
        app.quit();
      }, 200);
    });
  }
});

app.setAsDefaultProtocolClient('stoplight');
protocol.registerStandardSchemes(['stoplight'], { secure: true });
app.on('ready', () => {
  protocol.registerFileProtocol(
    'stoplight',
    (request, callback) => {
      if (!request || !request.url) {
        return callback(Path.normalize(`${__dirname}/index.html`));
      }

      /**
       * Take out the fake "host".
       *
       * stoplight://stoplight.io/foo/bar -> /foo/bar
       */
      let url = request.url.split('stoplight.local')[1];

      /**
       * If not asset url, then its an app route so we just render the index file.
       *
       * App route: stoplight://stoplight.io/users/foo
       * Asset: stoplight://stoplight.io/js/foo.js (note period in url)
       */
      const firstPart = url ? url.split('/')[1] : '';
      if (
        !firstPart ||
        !['index.html', 'css', 'static', 'js', 'fonts', 'uploads', 'images'].includes(firstPart)
      ) {
        return callback(Path.normalize(`${__dirname}/index.html`));
      }

      callback(Path.normalize(`${__dirname}/build/${url}`));
    },
    err => {
      if (err) console.error('Failed to register protocol', err);
    }
  );

  oauthUtils.init();
  windowUtils.createWindow({ app, logger: browserLogger });

  sessionUtils.init({ app, logger: browserLogger }, () => {
    windowUtils.loadApp();
  });
});

ipcMain.on('app.relaunch', () => {
  app.relaunch();
  app.quit();
});

ipcMain.on('app.showSettings', () => {
  if (windowUtils.getMainWindow()) {
    windowUtils.getMainWindow().webContents.send('route.settings');
  }
});

//
// Events available to the browser
//

ipcMain.on('proxy.start', (event, options, env) => {
  try {
    prismUtils.start(
      options,
      err => {
        if (err) {
          prismUtils.log('error starting prism server', e);
          event.sender.send('proxy.start.reject');
        } else {
          event.sender.send('proxy.start.resolve');
        }
      },
      code => {
        if (windowUtils.getMainWindow()) {
          windowUtils.getMainWindow().webContents.send('proxy.stopped', code);
        }
      }
    );
  } catch (e) {
    prismUtils.log('error starting prism server', e);
    event.sender.send('proxy.start.reject');
  }
});

ipcMain.on('proxy.stop', event => {
  try {
    prismUtils.stop(() => {
      event.sender.send('proxy.stop.resolve');
    });
  } catch (e) {
    prismUtils.log('error stopping prism', e);
    event.sender.send('proxy.stop.reject');
  }
});

// DEEP LINKING
app.on('open-url', function(event, url) {
  if (windowUtils.getMainWindow()) {
    windowUtils.getMainWindow().show();
  }
});
