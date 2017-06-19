const _ = require('lodash');
const electron = require('electron');
const Path = require('path');
const request = require('request');
const windowStateKeeper = require('electron-window-state');

const api = require('../api');
const config = require('../config');

const {BrowserWindow, shell, dialog} = electron;

let mainWindow;

exports.internalUrl = (
  process.env.NODE_ENV === 'development' ?
    process.env.ELECTRON_START_URL
  :
    `file://${Path.resolve(Path.join(__dirname, '..', '..', 'build', 'index.html'))}`
);

exports.getMainWindow = () => {
  return mainWindow;
}

exports.createWindow = ({targetWindow, host, showSettings}) => {
  const {screen} = electron;
  const size = screen.getPrimaryDisplay().workAreaSize;

  let mainWindowState = windowStateKeeper({
    defaultWidth: parseInt(size.width * 0.98),
    defaultHeight: parseInt(size.height * 0.96),
  });

  // Create the browser window.
  mainWindow = targetWindow || new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    center: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#3B99FC',
    webPreferences: {
      webSecurity: false,
      preload: Path.resolve(Path.join(__dirname, '..', 'browser', 'index.js')),
    },
  });

  mainWindowState.manage(mainWindow);

  if (showSettings) {
    mainWindow.loadURL(exports.internalUrl);
  } else {
    console.log('loading stoplight from', host.appHost)
    request({
      method: 'get',
      uri: host.appHost,
    }, function (error, response, body) {
      if (error) {
        console.log('load stoplight error', error); // Print the error if one occurred
        config.data.set('hostError', String(error));
        mainWindow.loadURL(exports.internalUrl);
      } else {
        config.data.set('hostError', null);
        mainWindow.loadURL(host.appHost);
      }
    });
  }

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

  // Add prompt before quiting an app if onbeforeunload event is fired.
  // This event is supported by electron 1.7.3 and above
  // https://github.com/electron/electron/issues/2579
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Quit', 'Stay'],
      title: 'Are you sure?',
      message: 'You have unsaved changes. Do you want to quit?',
      defaultId: 0,
      cancelId: 1
    });

    if (choice === 0) {
      event.preventDefault()
    }
  });
};
