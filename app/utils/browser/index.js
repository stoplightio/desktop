const Path = require("path");
const os = require("os");
const fs = require("fs-extra");
const electron = require("electron");
const fileWatcher = require("chokidar");
const OAuth2 = require("simple-oauth2");
const shortid = require("shortid");
const _ = require("lodash");

const { ipcRenderer, remote, clipboard } = electron;
const { app, Menu, shell, dialog } = remote;
const dataPath = app.getPath("appData");

const config = remote.require("./utils/config");

const env = remote.process.env;
if (env.NODE_ENV === "development") {
  require("devtron").install();
}

const createOAuth2 = ({
  client_id,
  client_secret,
  access_token_url,
  authorize_url
}) =>
  OAuth2.create({
    client: {
      id: client_id,
      secret: client_secret
    },
    auth: {
      tokenHost: access_token_url,
      tokenPath: " ",
      authorizeHost: authorize_url,
      authorizePath: " "
    }
  });

// The values available to our dashboard
global.Electron = {
  fs,
  shell,
  dialog,
  fileWatcher,
  ipc: ipcRenderer,
  config: {
    get: config.get,
    set: config.set
  },
  events: {
    onOpenFile: null, // app must implement this to hook into file open events
    onOpenUrl: null, // app must implement this to hook into url open events
    onOpenAbout: null // app must implement this to hook into open about
  },
  env: {
    name: env.NODE_ENV,
    arch: os.arch(),
    platform: os.platform(),
    version: app.getVersion(),
    dataPath,
    http_proxy:
      env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy,
    no_proxy: env.NO_PROXY || env.no_proxy,
    http_proxy_user:
      env.HTTPS_PROXY_USER ||
      env.https_proxy_user ||
      env.HTTP_PROXY_USER ||
      env.http_proxy_user,
    http_proxy_pass:
      env.HTTPS_PROXY_PASS ||
      env.https_proxy_pass ||
      env.HTTP_PROXY_PASS ||
      env.http_proxy_pass
  },
  oauth: {
    //credentials: { scope, client_id, client_secret, access_token_url, authorize_url }
    getAuthorizeURL: credentials => {
      const oauth2instance = createOAuth2(credentials);

      return oauth2instance.authorizationCode.authorizeURL({
        scope: credentials.scope,
        state: shortid.generate()
      });
    },

    /**
     *
     * @param credentials - { code, scope, client_id, client_secret, access_token_url, authorize_url }
     * @return {Promise}
     */
    getAccessToken: credentials => {
      const oauth2instance = createOAuth2(credentials);

      return oauth2instance.authorizationCode.getToken({
        code: credentials.code
      });
    }
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
    click() {
      ipcRenderer.send("app.showSettings");
    }
  },
  {
    type: "separator"
  }
];

if (process.platform === "darwin") {
  mainSubmenu = mainSubmenu.concat([
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
    }
  ]);
} else {
  // linux or windows
}

mainSubmenu = mainSubmenu.concat([
  {
    role: "quit"
  }
]);

const template = [
  {
    label: app.getName(),
    submenu: mainSubmenu
  },
  // TODO once we support local git repos
  // {
  //   label: "File",
  //   submenu: [
  //     {
  //       label: "Open...",
  //       accelerator: "CmdOrCtrl+o",
  //       click() {
  //         dialog.showOpenDialog(
  //           {
  //             properties: ["openFile"],
  //             filters: [
  //               { name: "JSON Files", extensions: ["json"] },
  //               { name: "YAML Files", extensions: ["yaml", "yml"] }
  //             ]
  //           },
  //           filePaths => {
  //             if (filePaths) {
  //               if (Electron.events.onOpenFile) {
  //                 Electron.events.onOpenFile(null, filePaths[0]);
  //               }
  //             }
  //           }
  //         );
  //       }
  //     }
  //   ]
  // },
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
