const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpReplace = require('gulp-replace');
const rename = require('gulp-rename');
const htmlmin = require("gulp-htmlmin");
const processHtmlContent = require('./process-html-content');
const checkUpdateInHtml = require('../check-update/in-html');
const utilGetPageDir = require('../utils/util-get-page-dir');
const logUtil = require('../utils/util-log');

let writeHtmlDelayTimer = null;

const rewriteHtml = (dir, options) => {
    clearTimeout(writeHtmlDelayTimer);

    writeHtmlDelayTimer = setTimeout(() => {
        processHtmlContent(dir, options);
        checkUpdateInHtml(dir);
    }, 500);
};

function buildHtml(finalConfig) {
    const { srcDir, distDir, replace, taskName, onHtmlBuild } = finalConfig;

    let pagesDir = utilGetPageDir(srcDir);

    if (!pagesDir) {
        logUtil.error('\n\n项目中找不到页面入口 html 文件\n\n');
        return;
    }

    let stream = gulp.src([`!${path.join(pagesDir, '/**/*.tpl.html')}`, path.join(pagesDir, '/**/*.html')]);

    if (replace) {
        Object.keys(replace).forEach((key) => {
            stream = stream.pipe(gulpReplace(new RegExp(key.replace(/\$/g, '\\$'), 'g'), replace[key][taskName]));
        });
    }

    const buildPagesDir = path.join(distDir, 'pages');

    let pipeline = null;

    if (/build/.test(taskName)) {
        pipeline = stream.pipe(rename((_path) => {
            _path.basename = _path.dirname;
            _path.dirname = '';
        })).pipe(htmlmin({
            minifyJS: true,
            minifyCSS: true,
            collapseWhitespace: true,
            removeComments: false
            })).pipe(gulp.dest(buildPagesDir));
    } else {
        pipeline = stream.pipe(rename((_path) => {
            _path.basename = _path.dirname;
            _path.dirname = '';
        })).pipe(gulp.dest(buildPagesDir));
    }
    
    // build 目录的 html 文件生成后，添加一些通用脚本，比如埋点、jsbridge、flexible 等
    pipeline.on('end', () => {
        rewriteHtml(buildPagesDir, {
            ...finalConfig,
            CDN_URL: replace['$$_CDNURL_$$'][taskName],
            callback: () => {
                // 执行 onHtmlBuild 回调
                if (onHtmlBuild) {
                    if (fs.existsSync(path.join(distDir, 'pages'))) {
                        const htmlFiles = fs.readdirSync(path.join(distDir, 'pages')).filter(filename => /\.html$/.test(filename)).map(filename => path.join(distDir, 'pages', filename));
                        onHtmlBuild(htmlFiles);
                    }
                }
            }
        });
    });

}

function presetHtml(finalConfig) {
    const { srcDir, watch } = finalConfig;

    buildHtml(finalConfig);

    const pageDir = utilGetPageDir(srcDir);

    if (watch) {
        return htmlWatcher = gulp.watch([path.join(pageDir, '/**/*.html')], () => {
            buildHtml(finalConfig);
        });
    }

    return null;
}

module.exports = presetHtml;
