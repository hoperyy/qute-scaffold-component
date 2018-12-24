
/**
 * @file qute scaffold entry file
 */

require('qute-scaffold-helper')(process)(({ userDir, srcDir, distDir, taskName, port }) => {
    require('colors');
    switch (taskName) {
        case 'dev':
        case 'dev-daily':
        case 'dev-pre':
        case 'dev-prod':
        case 'build':
        case 'build-daily':
        case 'build-pre':
        case 'build-prod':
            break;
        default:
            console.log(`task ${taskName} is not supported. Task supported list:\n\n${[
                '-  dev-daily',
                '-  dev-pre',
                '-  dev-prod',
                '',
                '-  build-daily',
                '-  build-pre',
                '-  build-prod',
            ].join('\n')}\n`);
            process.exit(1);
            return;
    }

    if (taskName === 'dev') {
        taskName = 'dev-daily';
    }
    if (taskName === 'build') {
        taskName = 'build-daily';
    }

    if (/dev/.test(taskName)) {
        require('./handler/webpack.dev')({ userDir, srcDir, distDir, taskName, port });
    }

    if (/build/.test(taskName)) {
        require('./handler/webpack.prod')({ userDir, srcDir, distDir, taskName });
    }
});
