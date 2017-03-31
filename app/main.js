const _ = require('lodash');
const electron = require('electron');
const autoUpdater = require('electron-auto-updater').autoUpdater;
const Path = require('path');
const os = require('os');
const url = require('url');
const request = require('request');

const pjson = require('./package.json');
const PrismServer = require('./utils/prism');
const api = require('./utils/api');

const {app, ipcMain, BrowserWindow, dialog, shell} = electron;

// Set base process vars
process.env.NODE_ENV = process.env.NODE_ENV || pjson.environment || 'development';
switch (process.env.NODE_ENV) {
  case 'production':
    process.env.SL_HOST = 'https://scenarios.stoplight.io';
    process.env.SL_API_HOST = 'https://api-next.stoplight.io';
    process.env.PRISM_PORT = 4020;
    break;
  case 'staging':
    process.env.SL_HOST = 'https://next-staging.stoplight.io';
    process.env.SL_API_HOST = 'https://api-next-staging.stoplight.io';
    process.env.PRISM_PORT = 4015;
    break;
  default:
    process.env.SL_HOST = 'http://localhost:3100';
    process.env.SL_API_HOST = 'http://localhost:3030';
    process.env.PRISM_PORT = 4025;
    break;
}

// API

api.start();

// LOGGING

// Be very careful with use of arguments property below. It is very
// easy to leak!
//
// https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
let mainWindow = null;

const _log = function(baseArgs, args) {
  if (mainWindow && mainWindow !== null) {
    mainWindow.webContents.send.apply(mainWindow.webContents, baseArgs.concat([].slice.call(args)));
  }

  // garbage
  baseArgs = undefined;
  args = undefined;
};

// This function sends messages to the mainWindow, to log stuff in developer tools
const browserLoggerBaseArgs = ['console.log'];
const browserLogger = function() {
  if (mainWindow && mainWindow !== null) {
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
  if (mainWindow && mainWindow !== null) {
    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
      // i is always valid index in the arguments object
      args[i] = arguments[i];
    }
    _log(browserLoggerBaseArgs, args);
    _log(proxyLoggerBaseArgs, args);
  }
};

// END LOGGING

PrismServer.setLogger(proxyLogger);
api.setLogger(browserLogger);

// Report crashes to our server.
// https://github.com/atom/electron/blob/master/docsapi/crash-reporter.md
// require('crash-reporter').start()

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});

// Shutdown the servers on quit
let serversStopped = false;
app.on('will-quit', (event) => {
  if (!serversStopped) {
    event.preventDefault();
    PrismServer.stop(() => {
      serversStopped = true;
      setTimeout(() => {
        app.quit();
      }, 100);
    });
  }
});


const windows = require('./utils/windows');
const hosts = require('./utils/hosts');
const config = require('./utils/config');

let host;
try {
  host = config.currentHost();
  hosts.initHost({app, host});
} catch (e) {
  config.data.set('hostError', String(e));
}

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', () => {
  windows.createWindow({host});
});

ipcMain.on('app.relaunch', () => {
  app.relaunch();
  app.quit();
});

ipcMain.on('app.showSettings', () => {
  windows.createWindow({targetWindow: windows.getMainWindow(), host, showSettings: true});
})

//
// Events available to the browser
//

ipcMain.on('proxy.start', (event, options, env) => {
  try {
    PrismServer.start(options, () => {
      event.sender.send('proxy.start.resolve');
    }, (code) => {
      if (windows.getMainWindow()) {
        windows.getMainWindow().webContents.send('proxy.stopped', code);
      }
    });
  } catch (e) {
    console.log('error initializing proxy server', e);
    event.sender.send('proxy.start.reject');
  }
});

ipcMain.on('proxy.stop', (event) => {
  try {
    PrismServer.stop(() => {
      event.sender.send('proxy.stop.resolve');
    });
  } catch (e) {
    console.log('error stopping proxy', e);
    event.sender.send('proxy.stop.reject');
  }
});

ipcMain.on('setTitle', (event, title) => {
  if (windows.getMainWindow()) {
    windows.getMainWindow().setTitle(title);
  }
});

ipcMain.on('setTitle', (event, title) => {
  if (windows.getMainWindow()) {
    windows.getMainWindow().setTitle(title);
  }
});

// AUTO UPDATE

let manualUpdateCheck = false;
let cancelUpdateChecks = false;

autoUpdater.on('error', (e, m) => {
  browserLogger('updater error', e, m);
  manualUpdateCheck = false;

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.error' , e, m);
  }
});
autoUpdater.on('checking-for-update', (e, m) => {
  browserLogger('updater checking-for-update', e, m);

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.checking-for-update' , e, m);
  }
});
autoUpdater.on('update-available', (e, m) => {
  browserLogger('update-available', e, m);
  cancelUpdateChecks = true;

  if (manualUpdateCheck) {
    dialog.showMessageBox(windows.getMainWindow(), {
      type: 'info',
      buttons: ['OK'],
      message: 'New Version Available!',
      detail: 'It\'s downloading now, and we\'ll let you know when it\'s ready.',
    });
  }
  manualUpdateCheck = false;

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.update-available' , e, m);
  }
});
autoUpdater.on('update-not-available', (e, m) => {
  browserLogger('updater update-not-available', e, m);
  if (manualUpdateCheck) {
    dialog.showMessageBox(windows.getMainWindow(), {
      type: 'info',
      buttons: ['OK'],
      message: 'Thumbs Up',
      detail: `Stoplight v${app.getVersion()} is the latest version available.`,
    });
  }
  manualUpdateCheck = false;

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.update-not-available' , e, m);
  }
});
autoUpdater.on('update-downloaded', (e, rNotes, rName, rDate, updateUrl) => {
  browserLogger('updater update-downloaded', e, rNotes, rName, rDate, updateUrl);

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.update-downloaded', e, rNotes, rName, rDate, updateUrl);
  }
});

let lastCheck;
const checkForUpdates = () => {
  if (cancelUpdateChecks) {
    return;
  }

  lastCheck = new Date();
  autoUpdater.checkForUpdates();
};

if (process.env.NODE_ENV !== 'development' && process.platform !== 'linux') {
  checkForUpdates();
  setInterval(() => {
    checkForUpdates();
  }, 1000 * 60 * 30);

  app.on('browser-window-focus', () => {
    const now = new Date();

    // auto check at most once every 5 minutes
    if (lastCheck && now.getTime() - lastCheck.getTime() < 300000) {
      return;
    }

    checkForUpdates();
  });
}

ipcMain.on('updater.check', (event) => {
  manualUpdateCheck = true;
  checkForUpdates();
});

ipcMain.on('updater.install', (event) => {
  autoUpdater.quitAndInstall();
});

// OAUTH

ipcMain.on('open.oauth.window', (event, provider, url) => {
  let authWindow = new BrowserWindow({
    width: 1020,
    height: 666,
    center: true,
    show: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: `${provider} Authorization`,
    webPreferences: {
      devTools: false,
      nodeIntegration: false,
    }
  });

  authWindow.loadURL(url);
  authWindow.show();

  authWindow.webContents.on('did-get-redirect-request', (e, oldUrl, newUrl) => {
    if (newUrl.indexOf('access_token') !== -1) {
      event.sender.send('oauth.token.ready', newUrl);
      authWindow.close();
    }
  });

  authWindow.on('closed', () => {
    event.sender.send('oauth.token.ready');
    authWindow = null;
  });
});

// DEEP LINKING

app.setAsDefaultProtocolClient('stoplight');

app.on('open-url', function (event, url) {
  if (windows.getMainWindow()) {
    windows.getMainWindow().show();
  }
});
