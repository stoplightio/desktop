const { BrowserWindow, ipcMain, session } = require('electron');

function getPopupSize(provider) {
  switch (provider) {
    case 'github':
      return { width: 1020, height: 644 };
    default:
      return { width: 1020, height: 644 };
  }
}

exports.init = () => {
  ipcMain.on('open.oauth.window', (event, { provider, url, param }) => {
    const winSize = getPopupSize(provider);
    const authWindow = new BrowserWindow({
      width: winSize.width,
      height: winSize.height,
      center: true,
      show: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: `${provider} Authorization`,
      webPreferences: {
        devTools: false,
        nodeIntegration: false,
      },
      session: session.fromPartition('persist:main', { cache: false }),
    });

    authWindow.loadURL(url);
    authWindow.show();

    let finalUrl;

    authWindow.on('closed', () => {
      event.sender.send('close.oauth.window', finalUrl);
    });

    authWindow.webContents.on('did-get-redirect-request', (e, oldUrl, newUrl) => {
      if (newUrl.indexOf(param) !== -1) {
        finalUrl = newUrl;
        authWindow.close();
      }
    });

    authWindow.webContents.on('will-navigate', (e, url) => {
      if (url.indexOf(param) !== -1) {
        finalUrl = url;
        authWindow.close();
      }
    });
  });
};
