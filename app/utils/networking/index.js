const _ = require('lodash');
const url = require('url');
const { dialog } = require('electron');

const windows = require('../windows');
const config = require('../config');

let hasShownNetworkingError;

exports.init = ({ app } = {}) => {
  // PROXY SERVERS

  const user = config.get('networking.proxy.user');
  const pass = config.get('networking.proxy.pass');

  // respect any explicitly set proxies
  const proxyUrl = config.get('networking.proxy.url');
  let parsedProxyUrl;
  if (proxyUrl) {
    try {
      parsedProxyUrl = url.parse(proxyUrl);

      if (!parsedProxyUrl.auth && user && pass) {
        parsedProxyUrl.auth = `${user}:${pass}`;
      }

      console.log('Using proxyUrl', url.format(parsedProxyUrl));
      process.env.HTTPS_PROXY = process.env.HTTP_PROXY = url.format(parsedProxyUrl);
      app.commandLine.appendSwitch(
        'proxy-server',
        parsedProxyUrl.protocol + '//' + parsedProxyUrl.host
      );
    } catch (e) {
      console.log('invalid proxyUrl', e);
    }
  }

  // respect explicitly set proxy bypass
  let bypassList = config.get('networking.proxy.bypass');
  if (bypassList) {
    bypassList = `stoplight.local;${bypassList.replace(/,/g, ';')}`;
  } else if (proxyUrl) {
    bypassList = 'stoplight.local;<local>';
  }
  if (bypassList) {
    console.log('Using bypassList', bypassList);
    process.env.NO_PROXY = bypassList;
    app.commandLine.appendSwitch('proxy-bypass-list', bypassList);
  }

  app.on('login', function(event, webContents, request, authInfo, callback) {
    event.preventDefault();

    if (request && request.url && request.url.match('stoplight.local/desktop')) {
      return;
    }

    const auth = _.get(parsedProxyUrl, 'auth', '');
    const authParts = (auth || '').split(':');
    const authUsername = _.first(authParts) || user;
    const authPassword = _.last(authParts) || pass;

    if (!authUsername || !authPassword) {
      console.log(
        'Your proxy requires basic auth, navigating to desktop preferences.',
        request.url
      );

      if (!hasShownNetworkingError) {
        hasShownNetworkingError = true;

        dialog.showErrorBox(
          'Network Error',
          'Your network proxy requires basic auth, and none provided. Please update the basic auth settings on the desktop preferences screen.'
        );

        const mainWindow = windows.getMainWindow();
        if (mainWindow) {
          mainWindow.loadURL(`stoplight://stoplight.local/desktop/settings/networking`);
        } else {
          console.log('Hmm, mainWindow not instantiated. Cannot navigate to preferences!');
        }
      }
    } else {
      callback(authUsername, authPassword);
    }
  });
};
