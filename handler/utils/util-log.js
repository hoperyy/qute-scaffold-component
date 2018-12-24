module.exports = {
    log(content) {
        console.log(`${'[qute vue]'.green} ${content}`);
    },
    warn(content) {
        console.log(`${'[qute vue]'.yellow} ${content}`);
    },
    error(content) {
        console.log(`${'[qute vue]'.red} ${content}`);
    }
};