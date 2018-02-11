const _ = require('lodash');
const url = require('url');

const windows = require('../windows');
const config = require('../config');

exports.initHost = ({ app, host } = {}) => {
  // PROXY SERVERS

  const user = _.get(host, 'proxy.user');
  const pass = _.get(host, 'proxy.pass');

  // respect any explicitly set proxies
  const proxyUrl = _.get(host, 'proxy.url');
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
  const bypassList = _.get(host, 'proxy.bypass');
  if (bypassList) {
    console.log('Using bypassList', bypassList);
    process.env.NO_PROXY = bypassList;
    app.commandLine.appendSwitch('proxy-bypass-list', bypassList.replace(/,/g, ';'));
  } else if (proxyUrl) {
    console.log('Using bypassList', '<local>');
    process.env.NO_PROXY = bypassList;
    app.commandLine.appendSwitch('proxy-bypass-list', '<local>');
  }

  app.on('login', function(event, webContents, request, authInfo, callback) {
    event.preventDefault();

    console.log('proxyUrl requires basic auth');

    const auth = _.get(parsedProxyUrl, 'auth', '');
    const authParts = (auth || '').split(':');
    const authUsername = _.first(authParts) || user;
    const authPassword = _.last(authParts) || pass;

    if (!authUsername || !authPassword) {
      const mainWindow = windows.getMainWindow();
      if (mainWindow) {
        config.data.set('hostError', 'Proxy requires basic auth, and none provided.');
        mainWindow.loadURL(windows.internalUrl);
      }
    } else {
      callback(authUsername, authPassword);
    }
  });
};
