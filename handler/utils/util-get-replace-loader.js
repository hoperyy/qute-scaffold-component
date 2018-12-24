const getReplaceLoader = (replace, taskName) => {
    const StringReplacePlugin = require('string-replace-webpack-plugin');
    const replacements = [];

    if (replace) {
        Object.keys(replace).forEach((key) => {
            replacements.push({
                pattern: new RegExp(key.replace(/\$/g, '\\$'), 'g'),
                replacement() {
                    return replace[key][taskName];
                },
            });
        });
    }

    return StringReplacePlugin.replace({ replacements });
};

module.exports = getReplaceLoader;
