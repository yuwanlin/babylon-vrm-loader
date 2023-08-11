const { resolve } = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: resolve(__dirname, 'src', 'test', 'index'),
    output: {
        library: {
            name: 'babylon-vrm-loader',
            type: 'umd',
        },
        filename: '[name].js',
        path: resolve(__dirname, 'test'),
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                oneOf: [
                    {
                        resource: resolve(__dirname, 'src', 'index.ts'),
                        sideEffects: true,
                    },
                ],
            },
        ],
    },
    resolve: {
        modules: [resolve(__dirname, 'node_modules')],
        extensions: ['.js', '.ts'],
    },
    devServer: {
        static: {
            directory: resolve(__dirname, 'test'),
        },
        port: 8080,
        host: '0.0.0.0',
        https: true,
        client: {
            overlay: false,
        },
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name(_module, chunks, _cacheGroupKey) {
                        return `vendors~${chunks[0].name}`;
                    },
                },
            },
        },
    },
    target: 'web',
    plugins: [new NodePolyfillPlugin()],
};
