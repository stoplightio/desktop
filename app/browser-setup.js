const Path = require('path');
const os = require('os');
const fs = require('fs-extra');
const electron = require('electron');
const fileWatcher = require('chokidar');

const {ipcRenderer, remote, clipboard} = electron;
const {app, Menu, shell, dialog} = remote;
const dataPath = app.getPath('appData');

const api = remote.require('./api');

// The values available to our dashboard
global.Electron = {
  app,
  dataPath,
  remote,
  os,
  fs,
  clipboard,
  shell,
  dialog,
  fileWatcher,
  ipc: ipcRenderer,
  path: Path,
  menu: Menu,
  proxyPath: Path.join(__dirname, 'proxy'),
  version: app.getVersion(),
  defaultProxyConfig: {
    port: '4020',
    forwardHost: 'http://localhost:3000',
    log: true,
    debug: true,
    learn: false,
    mock: {
      enabled: false,
      dynamic: false,
    },
    cors: false,
    logLocation: api.getHost(),
    blacklist: {
      headers: [],
      queryString: [],
    },
  },
};

// BUILD APP MENU

let mainSubmenu = [
  {
    label: 'Check for Updates',
    click: function() {
      if (process.platform === 'linux') {
        shell.openExternal('https://github.com/stoplightio/stoplight-app/releases/latest');
      } else {
        ipcRenderer.send('updater.check');
      }
    },
  },
  {
    type: 'separator',
  },
  {
    role: 'quit',
  },
];

if (process.platform === 'darwin') {
  mainSubmenu = [
    {
      role: 'about',
    },
    {
      label: 'Check for Updates',
      click: function() {
        if (process.platform === 'linux') {
          shell.openExternal('https://github.com/stoplightio/stoplight-app/releases/latest');
        } else {
          ipcRenderer.send('updater.check');
        }
      },
    },
    {
      type: 'separator',
    },
    {
      role: 'services',
      submenu: [],
    },
    {
      type: 'separator',
    },
    {
      role: 'hide',
    },
    {
      role: 'hideothers',
    },
    {
      role: 'unhide',
    },
    {
      type: 'separator',
    },
    {
      role: 'quit',
    },
  ];
}

const template = [
  {
    label: app.getName(),
    submenu: mainSubmenu,
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo',
      },
      {
        role: 'redo',
      },
      {
        type: 'separator',
      },
      {
        label: 'Back',
        accelerator: 'CmdOrCtrl+[',
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents && contents.canGoBack()) {
            contents.goBack();
          }
        },
      },
      {
        label: 'Forward',
        accelerator: 'CmdOrCtrl+]',
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents && contents.canGoForward()) {
            contents.goForward();
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Copy Current URL to Clipboard',
        accelerator: 'CmdOrCtrl+Shift+C',
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents) {
            const url = contents.getURL();
            if (url) {
              clipboard.writeText(url);
              new Notification('Copied!', {
                title: 'Copied!',
                body: url,
              });
            }
          }
        },
      },
      {
        label: 'Open Current URL in Browser',
        accelerator: 'CmdOrCtrl+O',
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents) {
            const url = contents.getURL();
            if (url) {
              shell.openExternal(url);
            }
          }
        },
      },
      {
        type: 'separator',
      },
      {
        role: 'cut',
      },
      {
        role: 'copy',
      },
      {
        role: 'paste',
      },
      {
        role: 'pasteandmatchstyle',
      },
      {
        role: 'delete',
      },
      {
        role: 'selectall',
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'reload',
      },
      {
        role: 'toggledevtools',
      },
      {
        type: 'separator',
      },
      {
        role: 'resetzoom',
      },
      {
        role: 'zoomin',
      },
      {
        role: 'zoomout',
      },
      {
        type: 'separator',
      },
      {
        role: 'togglefullscreen',
      },
    ],
  },
  {
    role: 'window',
    submenu: [
      {
        role: 'minimize',
      },
      {
        role: 'close',
      },
    ],
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click() {
          shell.openExternal('https://help.stoplight.io');
        },
      },
    ],
  },
];

if (process.platform === 'darwin') {
  // Edit menu.
  template[1].submenu.push(
    {
      type: 'separator',
    },
    {
      label: 'Speech',
      submenu: [
        {
          role: 'startspeaking',
        },
        {
          role: 'stopspeaking',
        },
      ],
    }
  );

  // Window menu.
  template[3].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close',
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize',
    },
    {
      label: 'Zoom',
      role: 'zoom',
    },
    {
      type: 'separator',
    },
    {
      label: 'Bring All to Front',
      role: 'front',
    },
  ];
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// DEV TOOLS LOGGING

ipcRenderer.on('console.log', (...args) => {
  console.log.apply(console, args.slice(1));
});

ipcRenderer.on('console.error', (...args) => {
  console.error.apply(console, args.slice(1));
});

// CHROME EXTENSIONS

// There's an issue w electron that they are fixing right now,
// but it will work soon.
if (process.env.NODE_ENV === 'development') {
  // remote.require('browser-window').removeDevToolsExtension("New React Developer Tools")
  // remote.require('browser-window').addDevToolsExtension(require('path').join(__dirname, '..', 'extensions', 'react-devtools', 'shells', 'chrome'))
}
