const electron = require('electron');
const autoUpdater = require('electron-auto-updater').autoUpdater;
const Path = require('path');
const ProxyServer = require('./proxy');
const os = require('os');
const pjson = require('./package.json');
const api = require('./api');

const {app, ipcMain, BrowserWindow, dialog, shell} = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
let mainWindow = null;

// API

api.start();

// LOGGING

// Be very careful with use of arguments property below. It is very
// easy to leak!
//
// https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments

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

ProxyServer.setLogger(proxyLogger);
api.setLogger(browserLogger);

// Report crashes to our server.
// https://github.com/atom/electron/blob/master/docsapi/crash-reporter.md
// require('crash-reporter').start()

process.env.NODE_ENV = process.env.NODE_ENV || pjson.environment || 'development';
switch (process.env.NODE_ENV) {
  case 'production':
    process.env.SL_API_HOST = 'https://api.stoplight.io/v1';
    process.env.SL_HOST = 'https://app.stoplight.io';
    process.env.SL_UPDATE_HOST = 'https://download.stoplight.io';
    break;
  case 'staging':
    process.env.SL_API_HOST = 'https://api-staging.stoplight.io/v1';
    process.env.SL_HOST = 'https://app-staging.stoplight.io';
    process.env.SL_UPDATE_HOST = 'https://stoplight-download-staging.herokuapp.com';
    break;
  default:
    process.env.SL_API_HOST = 'http://localhost:3030';
    process.env.SL_HOST = 'http://localhost:3100';
    break;
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') {
  app.quit();
  // }
});

// Shutdown the servers on quit
let serversStopped = false;
app.on('will-quit', (event) => {
  if (!serversStopped) {
    event.preventDefault();
    ProxyServer.stop(() => {
      serversStopped = true;
      setTimeout(() => {
        app.quit();
      }, 100);
    });
  }
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', () => {
  const {screen} = electron;
  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: parseInt(size.width * 0.98),
    height: parseInt(size.height * 0.96),
    center: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      webSecurity: false,
      preload: Path.resolve(Path.join(__dirname, 'browser-setup.js')),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(process.env.SL_HOST);

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    api.setMainWindow(null);
  });

  api.setMainWindow(mainWindow);

  // Emitted when the window regains focus.
  mainWindow.on('focus', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window.focus');
    }
  });

  mainWindow.webContents.on('new-window', (e, url, frameName, disposition) => {
    // allow github auth through to normal electron popup so login/register works
    if (url.match('github.com/login/oauth/authorize')) {
      return;
    }

    if (disposition === 'foreground-tab') {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('swipe', (e, direction) => {
    if (!mainWindow) {
      return;
    }

    switch (direction) {
      case 'left':
        if (mainWindow && mainWindow.webContents.canGoBack()) {
          mainWindow.webContents.goBack();
        }
        break;
      case 'right':
        if (mainWindow && mainWindow.webContents.canGoForward()) {
          mainWindow.webContents.goForward();
        }
        break;
    }
  });
});

//
// Events available to the browser
//

ipcMain.on('proxy.start', (event, options, env) => {
  try {
    ProxyServer.start(options, () => {
      event.sender.send('proxy.start.resolve');
    }, (code) => {
      if (mainWindow) {
        mainWindow.webContents.send('proxy.stopped', code);
      }
    });
  } catch (e) {
    console.log('error initializing proxy server', e);
    event.sender.send('proxy.start.reject');
  }
});

ipcMain.on('proxy.stop', (event) => {
  try {
    ProxyServer.stop(() => {
      event.sender.send('proxy.stop.resolve');
    });
  } catch (e) {
    console.log('error stopping proxy', e);
    event.sender.send('proxy.stop.reject');
  }
});

ipcMain.on('setTitle', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

ipcMain.on('setTitle', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// AUTO UPDATE

let manualUpdateCheck = false;
let cancelUpdateChecks = false;

autoUpdater.on('error', (e, m) => {
  browserLogger('updater error', e, m);
  manualUpdateCheck = false;
});
autoUpdater.on('checking-for-update', (e, m) => {
  browserLogger('updater checking-for-update', e, m);
});
autoUpdater.on('update-available', (e, m) => {
  browserLogger('update-available', e, m);
  cancelUpdateChecks = true;

  if (manualUpdateCheck) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['OK'],
      message: 'How\'d you know?!',
      detail: 'There is a shiny new version of Stoplight available! It\'s downloading now, and we\'ll let you know when it\'s ready.',
    });
  }
  manualUpdateCheck = false;
});
autoUpdater.on('update-not-available', (e, m) => {
  browserLogger('updater update-not-available', e, m);
  if (manualUpdateCheck) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['OK'],
      message: 'Thumbs Up',
      detail: `Stoplight v${app.getVersion()} is the latest version available.`,
    });
  }
  manualUpdateCheck = false;
});
autoUpdater.on('update-downloaded', (e, rNotes, rName, rDate, updateUrl, quitAndUpdate) => {
  browserLogger('updater update-downloaded', e, rNotes, rName, rDate, updateUrl);

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['OK, Quit'],
    message: 'An update has been installed, please restart Stoplight.',
    detail: '',
  }, (response) => {
    // This isn't working..
    quitAndUpdate(); // doesn't work? have to manually quit app

    if (response === 0) {
      browserLogger('quitting..');
      setTimeout(() => {
        app.quit();
      }, 2000);
    }
  });
});

const platform = `${os.platform()}_${os.arch()}`;
const version = app.getVersion();

let lastCheck;
const checkForUpdates = () => {
  if (cancelUpdateChecks) {
    return;
  }

  lastCheck = new Date();
  autoUpdater.checkForUpdates();
};

if (process.env.SL_UPDATE_HOST && process.platform !== 'linux') {
  if (process.platform === 'darwin') {
    autoUpdater.setFeedURL(`${process.env.SL_UPDATE_HOST}/update/${platform}/${version}`);
  }

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
