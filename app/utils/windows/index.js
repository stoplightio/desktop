const _ = require('lodash');
const electron = require('electron');
const Path = require('path');
const windowStateKeeper = require('electron-window-state');

const { BrowserWindow, shell, dialog } = electron;

const updaterUtils = require('../updater');

let mainWindow;

const isDev = process.env.NODE_ENV === 'development';

exports.getMainWindow = () => {
  return mainWindow;
};

exports.createWindow = ({ app, logger, targetWindow } = {}) => {
  const { screen } = electron;
  const size = screen.getPrimaryDisplay().workAreaSize;

  let mainWindowState = windowStateKeeper({
    defaultWidth: parseInt(size.width * 0.98),
    defaultHeight: parseInt(size.height * 0.96),
  });

  // Create the browser window.
  mainWindow =
    targetWindow ||
    new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      center: true,
      backgroundColor: '#1e2429',
      webPreferences: {
        webSecurity: false,
        nodeIntegration: false,
        preload: Path.resolve(Path.join(__dirname, '..', 'browser', 'index.js')),
      },
    });

  mainWindowState.manage(mainWindow);

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // Emitted when the window regains focus.
  mainWindow.on('focus', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window.focus');
    }
  });

  mainWindow.webContents.on('new-window', (e, url, frameName, disposition) => {
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

  mainWindow.webContents.on('did-finish-load', event => {
    updaterUtils.init({ app, logger });
  });

  // Add prompt before quiting an app if onbeforeunload event is fired.
  // This event is supported by electron 1.7.3 and above
  // https://github.com/electron/electron/issues/2579
  mainWindow.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Quit', 'Stay'],
      title: 'Are you sure?',
      message: 'You have unsaved changes. Do you want to quit without saving?',
      defaultId: 0,
      cancelId: 1,
    });

    if (choice === 0) {
      event.preventDefault();
    }
  });
};

exports.loadApp = () => {
  if (mainWindow) {
    if (isDev) {
      mainWindow.loadURL('http://localhost:3100');
    } else {
      mainWindow.loadURL('stoplight://stoplight.local');
    }
  } else {
    console.log('You must instantiate a mainWindow before calling loadApp');
  }
};
