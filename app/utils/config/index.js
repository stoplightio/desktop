const Store = require('electron-store');
const _ = require('lodash');
const os = require('os');
const { app } = require('electron');

let config;
let defaults;
let envVariables = {
  NAME: process.env.NODE_ENV,
  ARCH: os.arch(),
  PLATFORM: os.platform(),
  APP_VERSION: app.getVersion(),
};
Object.assign(process.env, envVariables);

exports.get = path => {
  let value;

  if (config) {
    value = config.get(path);
  }

  return value || _.get(defaults, path);
};

exports.set = (path, value) => {
  if (config) {
    config.set(path, value);
  }
};

/**
 * These are the dotenv variables. They are tracked separately from process.env because
 * process.env has all sorts of other stuff that we don't want to work with.
 */
exports.setEnvVariables = ({ variables }) => {
  Object.assign(envVariables, variables);
};

/**
 * Pulls the config values back out into their environment variable equivalents, and merges
 * those values with the rest of the environment variables before returning the env object.
 */
exports.getEnvVariables = () => {
  let configVars = {};

  if (config) {
    configVars = {
      SL_PLATFORM_HOST: exports.get('networking.platformHost'),
      SL_APP_HOST: exports.get('networking.appHost'),
      SL_API_HOST: exports.get('networking.apiHost'),
      SL_EXPORTER_HOST: exports.get('networking.exporterHost'),
      SL_PRISM_HOST: exports.get('networking.prismHost'),
      SL_PUBS_HOST: exports.get('networking.pubsHost'),
      SL_PUBS_INGRESS: exports.get('networking.pubsIngress'),

      PROXY_URL: exports.get('networking.proxy.url'),
      PROXY_BYPASS: exports.get('networking.proxy.bypass'),
      PROXY_USER: exports.get('networking.proxy.user'),
      PROXY_PASS: exports.get('networking.proxy.pass'),

      PRISM_PORT: exports.get('prism.port'),

      GITHUB_CLIENT_ID: exports.get('integrations.github.clientId'),
      GA_KEY: exports.get('integrations.ga.key'),
    };
  }

  return Object.assign({}, envVariables, configVars);
};

exports.init = () => {
  // don't store defaults in config, so that not written to disk
  defaults = {
    networking: {
      platformHost: process.env.SL_APP_HOST || '',
      appHost: process.env.SL_APP_HOST || '',
      apiHost: process.env.SL_API_HOST || '',
      exporterHost: process.env.SL_EXPORTER_HOST || '',
      prismHost: process.env.SL_PRISM_HOST || '',
      pubsHost: process.env.SL_PUBS_HOST || '',
      pubsIngress: process.env.SL_PUBS_INGRESS || '',

      proxy: {
        url: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '',
        bypass: process.env.NO_PROXY || '',
        user: process.env.PROXY_USER || '',
        pass: process.env.PROXY_PASS || '',
      },
    },

    prism: {
      port: process.env.SL_PRISM_PORT,
    },

    integrations: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
      },

      ga: {
        key: process.env.GA_KEY || '',
      },
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
