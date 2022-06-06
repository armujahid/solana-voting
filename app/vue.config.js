const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        })
    ],
    resolve: {
        fallback: {
            crypto: false,
            fs: false,
            assert: false,
            process: false,
            util: false,
            path: false,
            stream: false,
        }
    }
 }
})
