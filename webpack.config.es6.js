import path from 'path'
import webpack from 'webpack'
import chalk from 'chalk'
import UglifyJSPlugin from 'uglifyjs-webpack-plugin'
import ProgressBarPlugin from 'progress-bar-webpack-plugin'

const projectRoot = path.resolve(__dirname, '../')

export default {
  entry: ["babel-polyfill", "./src/rivescript.js"],
  output: {
    filename: "rivescript.js",
    path: path.resolve(__dirname, "dist"),
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
      exclude: /node_modules/,
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
  plugins: [
    new ProgressBarPlugin({
      format: `[Webpack] Building Rivescript [:bar] ${chalk.yellow.bold(':percent')} (:elapsed seconds)`,
      clear: true
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new UglifyJSPlugin({
      parallel: true,
      uglifyOptions: {
        ie8: false,
        ecma: 8,
        warnings: false,
        output: {
          comments: false,
          beautify: false, // debug true
        }
      },
      test: /\.js$/
    }),
  ].filter(Boolean),
  node: {
    fs: "empty"
  },
  target: "web",
  performance: { // Keep false or webpack will complain
    hints: false // See https://github.com/webpack/webpack/issues/3486
  },
}
