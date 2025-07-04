const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: './dist',
        port: 8080,
        hot: true,
        open: true,
        host: '0.0.0.0', // モバイルデバイスからアクセス可能にする
    },
}); 