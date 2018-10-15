const fs = require('fs-extra');

const normalizeFileNames = (dir, names) => {
  const fileNames = fs.readdirSync(dir);
  for (const fileName of fileNames) {
    const parts = fileName.split('.');
    const ext = parts[parts.length - 1];

    // skip map files
    if (ext === 'map') {
      continue;
    }

    if (names.includes(parts[0])) {
      fs.moveSync(`${dir}/${fileName}`, `${dir}/js/${parts[0]}.${ext}`);
    }
  }
};

// cleanup the build folder
console.log('BUILD: Cleanup.');
fs.removeSync('app/build/index.html');
normalizeFileNames('app/build', ['index', 'runtime', 'vendors~index']);
