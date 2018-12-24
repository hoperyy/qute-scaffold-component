const fs = require('fs');
const path = require('path');
const co = require('co');
const request = require('request');

const getGitInfo = require('git-repo-info');

const logUtil = require('../utils/util-log');

const VCOLLECT_SCRIPT = `<script src="//assets.geilicdn.com/v-components/v-collect/9.8.0/index.js"></script>`;
const JSBRIDGE_SCRIPT = `<script src="//s.geilicdn.com/script/common/jsbridge.min.js"></script>`;
const FLEXIBLE_SCRIPT = `<script src="//assets.geilicdn.com/v-components/flexible/0.4.0/flexible.js"></script>`;

function insertDeveloperInfo(content, userDir) {
    // 为页面添加注释，标注当前页面的发布信息
    const scriptId = Date.now();

    const gitInfo = getGitInfo(userDir);

    const debugInfo = `
            <script id=${scriptId}>
            try { 
                console.v = {
                    info: ${JSON.stringify(gitInfo)}
                };
                document.body.removeChild(document.getElementById(${scriptId})); 
            } catch(err) {

            }
            </script>
        `;

    content = content.replace('</body>', `${debugInfo}</body>`);

    return content;
}

function waitTillFolderExists(folder) {
    return done => {
        const check = () => {
            if (global.quteCompilicationDone) {
                clearInterval(timer);
                done(null);
            }
        };
        
        const timer = setInterval(check, 1000);

        check();
    };
}

function removeComment(content) {
    const commentReg = /\<\!\-\-[\s\S]+?\-\-\>/i;
    return content.split(commentReg).join('');
}

function removeUselessDotScript(content) {
    let result = content;

    const scriptReg = /\<script[\s\S]+?\<\/script\>/g;

    const arr = result.match(scriptReg);

    if (arr) {
        arr.forEach((item) => {
            // 删除 spider
            if (/\<script[\s\S]+?src\=[\s\S]+?spider[\s\S]+?\<\/script\>/.test(item)) {
                result = result.split(item).join('');
            }

            // 删除 owl
            if (/\<script[\s\S]+?src\=[\s\S]+?owl\-collect[\s\S]+?\<\/script\>/.test(item)) {
                result = result.split(item).join('');
            }

            // 删除 path-tracker
            if (/\<script[\s\S]+?src\=[\s\S]+?path\-tracker[\s\S]+?\<\/script\>/.test(item)) {
                result = result.split(item).join('');
            }

            // 删除 v-collect 脚本
            if (/\<script[\s\S]+?src\=[\s\S]+?v\-collect[\s\S]+?\<\/script\>/.test(item)) {
                result = result.split(item).join('');
            }
        });
    }

    return result;
}

function shiftScriptInBody(content, scriptUrl) {
    let bodyIndex = content.indexOf('<body');

    if (bodyIndex === -1) {
        return content;
    }

    let htmlPart1Str = content.substring(0, bodyIndex);
    let bodyStr = content.substring(bodyIndex);

    const scriptIndex = bodyStr.indexOf('<script');

    let splitStr = '<script';

    if (scriptIndex === -1) {
        splitStr = '</body>';
    }

    const tempIndex = bodyStr.indexOf(splitStr);

    if (tempIndex !== -1) {
        bodyStr = `${bodyStr.substring(0, tempIndex)}${scriptUrl}\n${bodyStr.substring(tempIndex)}`;
    }

    return htmlPart1Str + bodyStr;
}

function pushScriptInBody(content, scriptUrl) {
    let bodyIndex = content.indexOf('</body>');

    if (bodyIndex === -1) {
        return content;
    }

    const resultStr = content.replace('</body>', `${scriptUrl}</body>`)

    return resultStr;
}

function pushCssLinkInHead(content, cssUrl) {
    let bodyIndex = content.indexOf('</head>');

    if (bodyIndex === -1) {
        return content;
    }

    const resultStr = content.replace('</head>', `${cssUrl}</head>`)

    return resultStr;
}

function _fetchResource(url) {
    return function(done) {
        request({ url, timeout: 20 * 1000 }, function (error, response, body) {
            if (error) {
                done(null, '');
                return;
            }
            done(null, body);
        });
    }
}

function _readLocalFile(filePath) {
    return (done) => {
        let max = 20;

        const timer = setInterval(() => {
            if (max-- <= 0) {
                clearInterval(timer);
            }

            if (fs.existsSync(filePath)) {
                done(null, fs.readFileSync(filePath, 'utf-8'));
                clearInterval(timer);
            }
        }, 1000);
    };
}

function* _inline(htmlContent, { rootReg, srcReg, replaceReg, inlineCallback, htmlFolder }) {
    const inlineReg = /\svinline\s/;

    let maxCount =  20;
    let subContent = htmlContent;
    let newHtmlContent = '';

    if (rootReg.test(subContent)) {
        while (subContent && (rootReg.test(subContent))) {
            // 最多 inline 20 个资源
            if (--maxCount <= 0) {
                break;
            }

            // 找到匹配的字符串
            const tagStr = subContent.match(rootReg)[0];

            const startIndex = subContent.indexOf(tagStr);

            // 以匹配到的字符串为界限，拆解 subContent 为 left / middle / right 三部分
            let left = subContent.substring(0, startIndex);
            let middle = tagStr;
            let right = subContent.substring(startIndex + tagStr.length);

            // left 部分直接充值
            newHtmlContent += left;

            // 处理 middle 部分
            if (srcReg.test(tagStr) && inlineReg.test(tagStr)) {
                let src = tagStr.match(srcReg)[0].replace(replaceReg, '').replace(/[\'\"]$/, '');

                let resourceContent;
                // 如果是相对路径
                if (/^\./.test(src)) {
                    resourceContent = yield _readLocalFile(path.join(htmlFolder, src));
                } else {
                    if (/^\/\//.test(src)) {
                        src = `https:${src}`;
                    } else if (!/^\/\//.test(src)) {
                        src = `https://${src}`;
                    }

                    resourceContent = yield _fetchResource(src);
                }

                // 从远程获取到内容后才会进行替换，否则不替换
                if (resourceContent) {
                    const inlineStr = inlineCallback(src, resourceContent);
                    middle = inlineStr;
                }
            }

            // 修正过的 middle 部分充值
            newHtmlContent += middle;

            // right 部分赋值给 subContent
            subContent = right;
        }
    }

    newHtmlContent += subContent;

    return newHtmlContent;
}

function inlineCss(htmlContent, htmlFolder) {
    return _inline(htmlContent, {
        rootReg: /\<link(\s)([\s\S]*?)\>/,
        srcReg: /href=[\'\"]\S+?(\.css)[\'\"]/,
        replaceReg: /^href=[\'\"]/,
        htmlFolder,
        inlineCallback: (src, content) => {
            return `<style type="text/css">/* inline from ${src} */\n${content || '/* inline failed by url: ' + src + ' */'}</style>`;
        }
    });
}

function inlineJs(htmlContent, htmlFolder) {
    return _inline(htmlContent, {
        rootReg: /\<script(\s)([\s\S]*?)\>/,
        srcReg: /src=[\'\"]\S+?(\.js)[\'\"]/,
        replaceReg: /^src=[\'\"]/,
        htmlFolder,
        inlineCallback: (src, content) => {
            return `<script type="text/javascript">/* inline from ${src} */\n${content || '/* inline failed by url: ' + src + ' */'}</script>`;
        }
    });
}

function processHtmlContent(htmlFolder, { CDN_URL, userDir, commonJs, hashStatic, callback }) {
    if (!fs.existsSync(htmlFolder)) {
        logUtil.warn(' html 文件不存在，跳过对 html 文件的处理');
        return;
    }

    const autoInsertJsAndCss = (pageName, content) => {
        // replace js
        const commonJsString = content.indexOf(`<script src="${CDN_URL}/common.js"></script>`) !== -1;
        const hasIndexJsString = content.indexOf(`<script src="${CDN_URL}/${pageName}/index.js"></script>`) !== -1;
        const autoJsReg = /\<\!-\-\s*auto\-js\s*\-\-\>/;
        const hasAutoJsComment = autoJsReg.test(content);
        if (hasAutoJsComment && !commonJsString && !hasIndexJsString) {
            if (commonJs) {
                content = content.replace(autoJsReg, `<script src="${CDN_URL}/common.js"></script><script src="${CDN_URL}/${pageName}/index.js"></script>`);
            } else {
                content = content.replace(autoJsReg, `<script src="${CDN_URL}/${pageName}/index.js"></script>`);
            }
        }

        // replace css
        const autoCssReg = /\<\!-\-\s*auto\-css\s*\-\-\>/;
        const hasIndexCssString = content.indexOf(`<link href="${CDN_URL}/${pageName}/index.css" rel="stylesheet" />`) !== -1;
        const hasAutoCssComment = autoCssReg.test(content);
        if (hasAutoCssComment && !hasIndexCssString) {
            content = content.replace(autoCssReg, `<link href="${CDN_URL}/${pageName}/index.css" rel="stylesheet" />`);
        }

        return content;
    };

    const insertVcollect = (content) => {
        const shouldInsertVcollect = /(auto\-vcollect)|(\<\!-\-\s*auto\-dot\s*\-\-\>)/.test(content);

        // vcollect 必须作为 body 下的第一个 script，因此最后添加
        if (shouldInsertVcollect) {
            content = removeUselessDotScript(content);
            content = shiftScriptInBody(content, VCOLLECT_SCRIPT)
        }

        return content;
    };

    const replaceWithHash = function* (content, pageName) {
        const staticFolder = path.join(htmlFolder, '../static');

        yield waitTillFolderExists(staticFolder);

        const currentPageStaticFolder = path.join(staticFolder, pageName);

        yield waitTillFolderExists(currentPageStaticFolder);

        if (!fs.existsSync(path.join(staticFolder, pageName))) {
            return '';
        }

        // hash 状态下 common.js 叫 vendor.js
        const vendorJsArr = fs.readdirSync(staticFolder).filter(file => /vendor\.[\w]+\.js/.test(file));
        const manifestJs = fs.readdirSync(staticFolder).filter(file => /manifest\.[\w]+\.js/.test(file))[0];
        const currentPageStaticJsArr = fs.readdirSync(path.join(staticFolder, pageName)).filter(file => /[\w]+\.js/.test(file));
        const currentPageStaticCssArr = fs.readdirSync(path.join(staticFolder, pageName)).filter(file => /[\w]+\.css/.test(file));

        const replace = (hashedArr, getToBeReplaced, getReplaced) => {
            hashedArr.forEach(hashedFileName => {
                const unhashedFileName = hashedFileName.replace(/\.[\w]+\./, '.');
                const strToBeReplaced = getToBeReplaced(unhashedFileName);

                while (content.indexOf(strToBeReplaced) !== -1) {
                    content = content.replace(strToBeReplaced, getReplaced(hashedFileName));
                }
            });
        };

        replace(vendorJsArr, unhashedFileName => `<script src="${CDN_URL}/common.js"`, hashedFileName => `<script>${fs.readFileSync(path.join(staticFolder, manifestJs), 'utf8')}</script><script src="${CDN_URL}/${hashedFileName}"`);
        replace(currentPageStaticJsArr, unhashedFileName => `src="${CDN_URL}/${pageName}/${unhashedFileName}"`, hashedFileName => `src="${CDN_URL}/${pageName}/${hashedFileName}"`);

        replace(currentPageStaticCssArr, unhashedFileName => `href="${CDN_URL}/${pageName}/${unhashedFileName}"`, hashedFileName => `href="${CDN_URL}/${pageName}/${hashedFileName}"`);

        return content;
    };

    const htmlFiles = [];
    fs.readdirSync(htmlFolder).map((filename) => {
        if (path.extname(filename) === '.html') {
            htmlFiles.push(filename);
        }
    });
    let pageCount = 0;
    htmlFiles.forEach((filename) => {
        co(function* () {
            const filePath = path.join(htmlFolder, filename);
            const pageName = path.basename(filename, '.html');
            let content = fs.readFileSync(filePath, 'utf8');

            content = autoInsertJsAndCss(pageName, content);

            // if (!/common\/jsbridge/.test(content)) {
            //     // 先禁用此功能
            //     //content = shiftScriptInBody(content, JSBRIDGE_SCRIPT);
            // }

            // if (!/v-components\/flexible/.test(content)) {
            //     //先禁用此功能
            //     // content = shiftScriptInBody(content, FLEXIBLE_SCRIPT);
            // }

            content = insertVcollect(content);

            // 删除注释
            content = removeComment(content);

            // 开发者信息的暴露
            content = insertDeveloperInfo(content, userDir);

            // 暂时不用
            // content = yield inlineCss(content, htmlFolder);

            // 暂时不用
            // content = yield inlineJs(content, htmlFolder);

            if (hashStatic) {
                const replaceResult = yield replaceWithHash(content, pageName);

                if (replaceResult) {
                    content = replaceResult;
                }
            }

            // 写入 html 文件
            fs.writeFileSync(filePath, content);

            pageCount++;
            if (callback && pageCount === htmlFiles.length) {
                callback();
            }
        });
    });
}

module.exports = processHtmlContent;

