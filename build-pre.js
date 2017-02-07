const fs = require('fs-extra');
const f = require('fs');
const request = require('request');
const AdmZip = require('adm-zip');

fs.removeSync('build-tmp');
fs.removeSync('dist');
fs.mkdirsSync('build-tmp');
fs.mkdirsSync('build-tmp/prism');

const proxyMap = {
  mac: {
    x64: {
      source: 'prism_darwin_amd64',
      target: 'prism',
    },
    ia32: {
      source: 'prism_darwin_386',
      target: 'prism',
    },
  },
  linux: {
    x64: {
      source: 'prism_linux_amd64',
      target: 'prism',
    },
    ia32: {
      source: 'prism_linux_386',
      target: 'prism',
    },
  },
  win: {
    x64: {
      source: 'prism_windows_amd64.exe',
      target: 'prism.exe',
    },
    ia32: {
      source: 'prism_windows_386.exe',
      target: 'prism.exe',
    },
  },
};

const mkProxyFiles = (os, arch) => {
  const buildPath = `build-tmp/${os}/${arch}/proxy`;

  // copy the correct binary over
  const proxyDetails = proxyMap[os][arch];
  fs.copySync(`build-tmp/prism/bundle/${proxyDetails.source}`, `${buildPath}/${proxyDetails.target}`);

  f.chmodSync(`${buildPath}/${proxyDetails.target}`, '777');
};


const mkFiles = () => {
  mkProxyFiles('mac', 'x64');
  mkProxyFiles('mac', 'ia32');
  mkProxyFiles('linux', 'x64');
  mkProxyFiles('linux', 'ia32');
  mkProxyFiles('win', 'x64');
  mkProxyFiles('win', 'ia32');
};

// Fetch the latest prism binaries, unzip them, and save them to build-tmp/prism
// When that is done, call mkFiles to begin the copy / preparation process
console.log('HTTP: Fetching latest digest.');
request({
  url: 'https://api.github.com/repos/stoplightio/prism/releases/latest',
  headers: {
    'User-Agent': 'request',
  },
}, (err, resp, body) => {
  const zipUrl = `https://github.com/stoplightio/prism/releases/download/${JSON.parse(body).tag_name}/bundle.zip`;
  console.log('HTTP: Fetching latest zip.', zipUrl);
  request(zipUrl)
    .pipe(fs.createWriteStream('build-tmp/prism/bundle.zip'))
    .on('close', () => {
      console.log('ZIP: Opening latest zip.');
      const zip = new AdmZip('build-tmp/prism/bundle.zip');
      zip.extractAllTo('build-tmp/prism', true);
      console.log('ZIP: Opened!');
      mkFiles();
    });
});
