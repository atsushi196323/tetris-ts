const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            title: 'モバイル対応テトリス',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public/assets', to: 'assets', noErrorOnMissing: true }
            ]
        })
    ],
}; 