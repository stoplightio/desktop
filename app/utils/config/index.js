const Config = require("electron-config");
const _ = require("lodash");

exports.data = new Config({
  name:
    process.env.NODE_ENV === "production"
      ? "config"
      : `config-${process.env.NODE_ENV}`,
  defaults: {
    activeHost: 0,
    hosts: [
      {
        name: "stoplight",
        appHost: process.env.SL_HOST,
        apiHost: process.env.SL_API_HOST,
        proxy: {
          url: "",
          bypass: "",
          user: "",
          pass: ""
        }
      }
    ]
  }
});

exports.currentHost = () => {
  const hosts = _.get(exports.data, "store.hosts", []);
  const activeHost = exports.data.store.activeHost || 0;
  return hosts[activeHost] || hosts[0];
};
