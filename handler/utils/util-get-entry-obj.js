const getEntryObj = ({ srcDir, polyfill }) => {
    // entry.vendor 优先使用用户配置的 vendor，覆盖式
    const fs = require('fs');
    const path = require('path');

    const entryFiles = {};

    let pageDir = require('./util-get-page-dir')(srcDir);
    const logUtil = require('./util-log');

    if (!pageDir) {
        logUtil.warn('no entry file found: ./src/pages/**/index.js');
        process.exit(1);
        return;
    }

    fs.readdirSync(pageDir).forEach((fileName) => {
        const dirpath = path.join(pageDir, fileName);
        const indexJsFile = path.join(dirpath, 'index.js');
        const indexHtmlFile = path.join(dirpath, 'index.html');
        const dirname = path.basename(dirpath);

        // 如果 js 文件不存在
        if (!fs.existsSync(indexJsFile)) {
            return;
        }

        if (polyfill) {
            entryFiles[`${dirname}/index`] = [
                'babel-polyfill',
                indexJsFile
            ];
        } else {
            entryFiles[`${dirname}/index`] = [
                indexJsFile
            ];
        }
    });

    return entryFiles;
};

module.exports = getEntryObj;
