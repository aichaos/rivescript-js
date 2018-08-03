'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _uglifyjsWebpackPlugin = require('uglifyjs-webpack-plugin');

var _uglifyjsWebpackPlugin2 = _interopRequireDefault(_uglifyjsWebpackPlugin);

var _progressBarWebpackPlugin = require('progress-bar-webpack-plugin');

var _progressBarWebpackPlugin2 = _interopRequireDefault(_progressBarWebpackPlugin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var projectRoot = _path2.default.resolve(__dirname, '../');

exports.default = {
  entry: ["babel-polyfill", "./src/rivescript.js"],
  output: {
    filename: "rivescript.js",
    path: _path2.default.resolve(__dirname, "dist"),
    library: "RiveScript"
  },
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [{
      test: /\.js$/,
      loader: "babel-loader",
      include: projectRoot,
      exclude: /node_modules/
    }, {
      test: /\.js$/,
      loader: 'eslint-loader',
      include: projectRoot,
      exclude: /node_modules/,
      enforce: 'pre',
      options: {
        formatter: require('eslint-friendly-formatter')
      }
    }]
  },
  plugins: [new _progressBarWebpackPlugin2.default({
    format: '[Webpack] Building Rivescript [:bar] ' + _chalk2.default.yellow.bold(':percent') + ' (:elapsed seconds)',
    clear: true
  }), new _webpack2.default.LoaderOptionsPlugin({
    minimize: true
  }), new _uglifyjsWebpackPlugin2.default({
    parallel: true,
    uglifyOptions: {
      ie8: false,
      ecma: 8,
      warnings: false,
      output: {
        comments: false,
        beautify: false // debug true
      }
    },
    test: /\.js$/
  })].filter(Boolean),
  node: {
    fs: "empty"
  },
  target: "web",
  performance: { // Keep false or webpack will complain
    hints: false // See https://github.com/webpack/webpack/issues/3486
  }
};
