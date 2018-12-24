const fs = require('fs');
const path = require('path');
const logUtil = require('./util-log');

const checkHtmlCountEquals = (srcDir, distDir) => {
    const entryPagesDir = require('./util-get-page-dir')(srcDir);

    let srcHtmlCount = 0;
    fs.readdirSync(entryPagesDir).forEach(dirname => {
        if (fs.existsSync(path.join(entryPagesDir, dirname, 'index.html'))) {
            srcHtmlCount++;
        }
    });

    let buildHtmlCount = 0;
    require('recursive-readdir-sync')(distDir).forEach(filepath => {
        if (/\.html$/.test(filepath)) {
            buildHtmlCount++;
        }
    });

    if (buildHtmlCount >= srcHtmlCount) {
        return true;
    }

    return false;
};

let remindLogDelayTimer;
let intervalTimer;
module.exports = ({ taskName, srcDir, distDir, port }) => {
    clearInterval(intervalTimer);

    intervalTimer = setInterval(() => {
        if (fs.existsSync(distDir) && checkHtmlCountEquals(srcDir, distDir)) {
            clearInterval(intervalTimer);
            clearTimeout(remindLogDelayTimer);

            remindLogDelayTimer = setTimeout(() => {
                // 遍历 build 目录
                const pagesDir = path.join(distDir, 'pages');
                if (fs.existsSync(pagesDir) && fs.statSync(pagesDir)) {
                    const pages = fs.readdirSync(pagesDir);

                    if (pages.length === 0) {
                        logUtil.warn('没有检测到页面信息，若需添加页面到当前项目目录，可参考路径：./src/index/index.html');
                    } else if (pages.length === 1) {
                        pages.map(pagePath => logUtil.log(`http://127.0.0.1:${port}/pages/${pagePath}`));
                    } else {
                        pages.map((pagePath, index) => logUtil.log(`[${index}] http://127.0.0.1:${port}/pages/${pagePath}`));
                    }
                }
                clearTimeout(remindLogDelayTimer);
            }, 2000);
        }
    }, 1000);
};
