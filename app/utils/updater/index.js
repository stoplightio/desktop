const { ipcMain } = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;

const windows = require('../windows');

autoUpdater.autoDownload = false;
autoUpdater.fullChangelog = true;

let hasInitted = false;
let manualUpdateCheck = false;
let lastCheck;

const shouldCheck = () => {
  const now = new Date();

  if (manualUpdateCheck) return true;

  // auto check at most once every 5 minutes
  if (lastCheck && now.getTime() - lastCheck.getTime() < 300000) {
    return false;
  }

  return true;
}

autoUpdater.on('download-progress', progressObj => {
  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.download-progress', progressObj);
  }
});

autoUpdater.on('error', err => {
  manualUpdateCheck = false;

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.error', err);
  }
});

autoUpdater.on('checking-for-update', () => {
  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.checking-for-update');
  }
});

autoUpdater.on('update-available', info => {
  manualUpdateCheck = false;

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.update-available', info);
  }
});

autoUpdater.on('update-not-available', info => {
  manualUpdateCheck = false;

  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.update-not-available', info);
  }
});

autoUpdater.on('update-downloaded', info => {
  if (windows.getMainWindow()) {
    windows.getMainWindow().webContents.send('updater.update-downloaded', info);
  }
});

exports.checkForUpdates = () => {
  if (!shouldCheck()) {
    return;
  }

  lastCheck = new Date();

  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    console.log('checkForUpdates failed', e);
  }
};

exports.init = ({ app, logger }) => {
  if (hasInitted) return;

  hasInitted = true;

  if (process.platform !== 'linux') {
    exports.checkForUpdates();

    setInterval(() => {
      exports.checkForUpdates();
    }, 1000 * 60 * 30);

    app.on('browser-window-focus', () => {
      const now = new Date();

      // auto check at most once every 5 minutes
      if (lastCheck && now.getTime() - lastCheck.getTime() < 300000) {
        return;
      }

      exports.checkForUpdates();
    });
  }

  ipcMain.on('updater.check', event => {
    manualUpdateCheck = true;

    if (logger) {
      logger('updater.check');
    }

    exports.checkForUpdates();
  });

  ipcMain.on('updater.install', event => {
    if (logger) {
      logger('updater.install');
    }

    autoUpdater.quitAndInstall();
  });

  ipcMain.on('updater.download', event => {
    if (logger) {
      logger('updater.download');
    }

    autoUpdater.downloadUpdate();
  });
};
