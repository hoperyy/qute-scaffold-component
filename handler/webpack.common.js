module.exports = (finalConfig) => {
    const { commonJs, srcDir, distDir, taskName, replace, webpackConfig, hashStatic, afterBuild } = finalConfig;

    const webpack = require('webpack');
    const path = require('path');
    const fs = require('fs');
    const fse = require('fs-extra');
    const merge = require('webpack-merge');
    const WebpackOnBuildPlugin = require('on-build-webpack');
    const PluginNoop = require('./plugins/plugin-noop');
    const PluginClean = require('./plugins/plugin-clean');

    let commonWebpackConfig = merge({
            entry: require('./utils/util-get-entry-obj')(finalConfig),
            output: {
                path: path.join(distDir, '/'),
                filename: hashStatic ? '[name].[chunkhash].js' : '[name].js',
                publicPath: '/',
                chunkFilename: hashStatic ? '[name].[chunkhash].js' : '[name].js',
            },
            module: {
                rules: [{
                    test: /\.(jpg|png|gif)$/,
                    use: 'url-loader?name=img/[hash].[ext]&limit=8000',
                    enforce: 'post'
                }, {
                    test: /\.(woff|svg|eot|ttf)\??.*$/,
                    use: 'url-loader?name=img/[hash].[ext]&limit=10',
                    enforce: 'post'
                }, {
                    test: /\.js$/,
                    loader: 'babel-loader',
                    enforce: 'post',
                    exclude: {
                        test: [
                            path.join(srcDir, 'node_modules'),
                            path.join(__dirname, '../node_modules')
                        ],
                    }
                }, {
                    test: /\.[(js)(vue)(vuex)(tpl)(html)]$/,
                    enforce: 'pre',
                    exclude: /(node_modules|bower_components)/,
                    loader: require('./utils/util-get-replace-loader')(replace, taskName),
                }],
            },
            resolve: {
                modules: [
                    path.resolve(srcDir, 'node_modules/'),
                    path.resolve(__dirname, '../node_modules/'),
                ],
                extensions: ['.js', '.json', '.vue']
            },
            resolveLoader: {
                modules: [
                    path.resolve(srcDir, 'node_modules/'),
                    path.resolve(__dirname, '../node_modules/'),
                ],
            },
            plugins: [
                new PluginClean({
                    distDir
                }),
                new WebpackOnBuildPlugin(() => {
                    if (afterBuild) {
                        afterBuild(distDir);
                    }
                }),
                hashStatic ? new webpack.HashedModuleIdsPlugin() : new PluginNoop()
            ],
        }, webpackConfig);

    return commonWebpackConfig;
};
