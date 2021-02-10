const { merge } = require('webpack-merge')
const path = require('path')
const webpack = require('webpack')
const webpackConfig = require('@nextcloud/webpack-vue-config')

const config = {
	entry: {
		submit: path.resolve(path.join('src', 'submit.js')),
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				use: 'url-loader',
			},
		],
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				moment: {
					test: /[\\/]node_modules[\\/](moment)[\\/]/,
					name: 'moment',
					chunks: 'all',
				},
			},
		},
	},
}

module.exports = merge(config, webpackConfig)
