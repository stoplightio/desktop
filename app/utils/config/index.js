const Store = require('electron-store');
const _ = require('lodash');

let config;
let defaults;

exports.get = path => {
  let value;

  if (config) {
    value = config.get(path);
  }

  return value || _.get(defaults, path);
};

exports.set = (path, value) => {
  if (config) {
    config.set(path, JSON.parse(JSON.stringify(value)));
  }
};

exports.init = () => {
  // don't store defaults in config, so that not written to disk
  defaults = {
    networking: {
      apiHost: process.env.SL_API_HOST,
      exporterHost: process.env.SL_EXPORTER_HOST,
      prismHost: process.env.SL_PRISM_HOST,

      proxy: {
        url: '',
        bypass: '',
        user: '',
        pass: '',
      },
    },

    prism: {
      port: process.env.SL_PRISM_PORT,
    },
  };

  config = new Store({
    version: 1,

    name: process.env.NODE_ENV === 'production' ? 'config' : `config-${process.env.NODE_ENV}`,

    defaults: {},
  });

  // DEPRECATED, old settings

  const currentHost = () => {
    const activeHost = config.get('activeHost');
    if (!activeHost) {
      return;
    }

    const hosts = config.get('store.hosts') || [];

    return hosts[activeHost] || hosts[0];
  };

  const host = currentHost();
  if (host) {
    const setIfNotExists = (oldPath, newPath) => {
      const t = _.get(host, oldPath);
      if (t && !config.get(newPath)) {
        config.set(newPath, t);
      }
    };

    setIfNotExists('apiHost', 'networking.apiHost');
    setIfNotExists('proxy.url', 'networking.proxy.url');
    setIfNotExists('proxy.bypass', 'networking.proxy.bypass');
    setIfNotExists('proxy.user', 'networking.proxy.user');
    setIfNotExists('proxy.pass', 'networking.proxy.pass');
  }
};
