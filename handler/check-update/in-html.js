const fs = require('fs');
const path = require('path');

function addCodes(htmlFolder) {
    return;
    
    const files = fs.readdirSync(htmlFolder);
    files.forEach((filename) => {
        if (path.extname(filename) !== '.html') {
            return;
        }

        const pageName = path.basename(filename, '.html');

        const filePath = path.join(htmlFolder, filename);

        let content = fs.readFileSync(filePath, 'utf8');

        content = insertDomInBody(content);

        // 写入 html 文件
        fs.writeFileSync(filePath, content);
    });
}


function insertDomInBody(content) {
    let bodyIndex = content.indexOf('</body>');

    if (bodyIndex === -1) {
        return content;
    }

    const resultStr = content.replace('</body>', `<div style="position: fixed; left: 0; top: 0; right: 0; height: 50px; line-height: 50px; font-size: 14px; text-align: center; background: yellow;">您当前使用的 flexible 版本过低，请使用 0.4.0 版本</div></body>`)

    return resultStr;
}

module.exports = addCodes;

