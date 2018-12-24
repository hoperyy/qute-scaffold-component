
/**
 * @file qute scaffold entry file
 */

require('qute-scaffold-helper')(process)(({ userDir, srcDir, distDir, taskName, port }) => {
    require('colors');
    switch (taskName) {
        case 'dev-daily':
        case 'dev-pre':
        case 'dev-prod':
        case 'build-daily':
        case 'build-pre':
        case 'build-prod':
            break;
        default:
            console.log(`task ${taskName} is not supported. Task supported list:\n\n${[
                '-  dev-daily                  日常 - 调试 - 前后端分离的项目',
                '-  dev-pre                    预发 - 调试 - 前后端分离的项目',
                '-  dev-prod                   线上 - 调试 - 前后端分离的项目',
                '',
                '-  build-daily                日常 - 打包',
                '-  build-pre                  预发 - 打包',
                '-  build-prod                 线上 - 打包',
            ].join('\n')}\n`);
            process.exit(1);
            return;
    }

    if (/dev/.test(taskName)) {
        require('./handler/webpack.dev')({ userDir, srcDir, distDir, taskName, port });
    }

    if (/build/.test(taskName)) {
        require('./handler/webpack.prod')({ userDir, srcDir, distDir, taskName });
    }
});
