const getEntryObj = ({ srcDir, polyfill }) => {
    // entry.vendor 优先使用用户配置的 vendor，覆盖式
    const fs = require('fs');
    const path = require('path');

    const entryFiles = {};
    const logUtil = require('./util-log');

    const indexJsFile = path.join(srcDir, 'src/index.js');

    if (!fs.existsSync(indexJsFile)) {
        logUtil.warn('no entry file found: ./src/index.js');
        process.exit(1);
        return;
    }

    if (polyfill) {
        entryFiles[`index`] = [
            'babel-polyfill',
            indexJsFile
        ];
    } else {
        entryFiles[`index`] = [
            indexJsFile
        ];
    }

    console.log(entryFiles);

    return entryFiles;
};

module.exports = getEntryObj;
