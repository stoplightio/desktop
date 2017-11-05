const Path = require("path");
const os = require("os");
const fs = require("fs-extra");
const electron = require("electron");
const fileWatcher = require("chokidar");

const { ipcRenderer, remote, clipboard } = electron;
const { app, Menu, shell, dialog } = remote;
const dataPath = app.getPath("appData");

const config = remote.require("./utils/config");
const api = remote.require("./utils/api");

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
  env: process.env,
  config: config.data,
  ipc: ipcRenderer,
  path: Path,
  menu: Menu,
  proxyPath: Path.join(__dirname, "proxy"),
  version: app.getVersion(),
  events: {
    onOpenFile: null, // app must implement this to hook into file open events
    onOpenUrl: null, // app must implement this to hook into url open events
    onOpenAbout: null // app must implement this to hook into open about
  }
};

app.on("open-file", (e, path) => {
  if (Electron.events.onOpenFile) {
    Electron.events.onOpenFile(e, path);
  }
});
app.on("open-url", (e, url) => {
  if (Electron.events.onOpenUrl) {
    Electron.events.onOpenUrl(e, url);
  }
});

// BUILD APP MENU

let mainSubmenu = [
  {
    label: "Check for Updates",
    click: function() {
      if (Electron.events.onOpenAbout) {
        Electron.events.onOpenAbout();
      }

      if (process.platform !== "linux") {
        ipcRenderer.send("updater.check");
      }
    }
  },
  {
    type: "separator"
  },
  {
    label: "Preferences",
    submenu: [
      {
        label: "Hosts Configuration",
        click() {
          ipcRenderer.send("app.showSettings");
        }
      }
    ]
  },
  {
    type: "separator"
  },
  {
    role: "quit"
  }
];

if (process.platform === "darwin") {
  mainSubmenu = [
    {
      label: "About Stoplight",
      click: function() {
        if (Electron.events.onOpenAbout) {
          Electron.events.onOpenAbout();
        }
      }
    },
    {
      label: "Check for Updates",
      click: function() {
        if (Electron.events.onOpenAbout) {
          Electron.events.onOpenAbout();
        }

        if (process.platform !== "linux") {
          ipcRenderer.send("updater.check");
        }
      }
    },
    {
      type: "separator"
    },
    {
      label: "Preferences",
      submenu: [
        {
          label: "Hosts Configuration",
          click() {
            ipcRenderer.send("app.showSettings");
          }
        }
      ]
    },
    {
      type: "separator"
    },
    {
      role: "services",
      submenu: []
    },
    {
      type: "separator"
    },
    {
      role: "hide"
    },
    {
      role: "hideothers"
    },
    {
      role: "unhide"
    },
    {
      type: "separator"
    },
    {
      role: "quit"
    }
  ];
}

const template = [
  {
    label: app.getName(),
    submenu: mainSubmenu
  },
  {
    label: "File",
    submenu: [
      {
        label: "Open...",
        accelerator: "CmdOrCtrl+o",
        click() {
          dialog.showOpenDialog(
            {
              properties: ["openFile"],
              filters: [
                { name: "JSON Files", extensions: ["json"] },
                { name: "YAML Files", extensions: ["yaml", "yml"] }
              ]
            },
            filePaths => {
              if (filePaths) {
                if (Electron.events.onOpenFile) {
                  Electron.events.onOpenFile(null, filePaths[0]);
                }
              }
            }
          );
        }
      }
    ]
  },
  {
    label: "Edit",
    submenu: [
      {
        role: "undo"
      },
      {
        role: "redo"
      },
      {
        type: "separator"
      },
      {
        label: "Back",
        accelerator: "CmdOrCtrl+[",
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents && contents.canGoBack()) {
            contents.goBack();
          }
        }
      },
      {
        label: "Forward",
        accelerator: "CmdOrCtrl+]",
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents && contents.canGoForward()) {
            contents.goForward();
          }
        }
      },
      {
        type: "separator"
      },
      {
        label: "Copy Current URL to Clipboard",
        accelerator: "CmdOrCtrl+Shift+C",
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents) {
            const url = contents.getURL();
            if (url) {
              clipboard.writeText(url);
              new Notification("Copied!", {
                title: "Copied!",
                body: url
              });
            }
          }
        }
      },
      {
        label: "Open Current URL in Browser",
        accelerator: "CmdOrCtrl+Shift+O",
        click(item, focusedWindow) {
          const contents = focusedWindow ? focusedWindow.webContents : null;
          if (contents) {
            const url = contents.getURL();
            if (url) {
              shell.openExternal(url);
            }
          }
        }
      },
      {
        type: "separator"
      },
      {
        role: "cut"
      },
      {
        role: "copy"
      },
      {
        role: "paste"
      },
      {
        role: "pasteandmatchstyle"
      },
      {
        role: "delete"
      },
      {
        role: "selectall"
      }
    ]
  },
  {
    label: "View",
    submenu: [
      {
        role: "reload"
      },
      {
        role: "toggledevtools"
      },
      {
        type: "separator"
      },
      {
        role: "resetzoom"
      },
      {
        role: "zoomin"
      },
      {
        role: "zoomout"
      },
      {
        type: "separator"
      },
      {
        role: "togglefullscreen"
      }
    ]
  },
  {
    role: "window",
    submenu: [
      {
        role: "minimize"
      },
      {
        role: "close"
      }
    ]
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click() {
          shell.openExternal("https://help.stoplight.io");
        }
      }
    ]
  }
];

if (process.platform === "darwin") {
  // Edit menu.
  template[2].submenu.push(
    {
      type: "separator"
    },
    {
      label: "Speech",
      submenu: [
        {
          role: "startspeaking"
        },
        {
          role: "stopspeaking"
        }
      ]
    }
  );

  // Window menu.
  template[4].submenu = [
    {
      label: "Close",
      accelerator: "CmdOrCtrl+W",
      role: "close"
    },
    {
      label: "Minimize",
      accelerator: "CmdOrCtrl+M",
      role: "minimize"
    },
    {
      label: "Zoom",
      role: "zoom"
    },
    {
      type: "separator"
    },
    {
      label: "Bring All to Front",
      role: "front"
    }
  ];
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// DEV TOOLS LOGGING

ipcRenderer.on("console.log", (...args) => {
  console.log.apply(console, args.slice(1));
});

ipcRenderer.on("console.error", (...args) => {
  console.error.apply(console, args.slice(1));
});

// CHROME EXTENSIONS

// There's an issue w electron that they are fixing right now,
// but it will work soon.
if (process.env.NODE_ENV === "development") {
  // remote.require('browser-window').removeDevToolsExtension("New React Developer Tools")
  // remote.require('browser-window').addDevToolsExtension(require('path').join(__dirname, '..', 'extensions', 'react-devtools', 'shells', 'chrome'))
}
