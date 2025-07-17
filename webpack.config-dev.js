const path = require('path');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const BundleTrackerDev = require('webpack-bundle-tracker');
const ErrorOverlayPlugin = require('error-overlay-webpack-plugin');
const DotenvDev = require('dotenv-webpack');

module.exports = {
  mode: 'development',
  context: __dirname,

  entry: [
    'babel-polyfill',
    'webpack-hot-middleware/client?reload=true&path=/__webpack_hmr',
    path.resolve(__dirname, 'js/index.js')
  ],

  devServer: {
    hot: true
  },

  output: {
    crossOriginLoading: 'anonymous',
    path: path.resolve('./bundles'),
    filename: '[name]-[hash].js',
    publicPath: 'http://localhost:3030/bundles/'
  },

  devtool: 'cheap-module-source-map',

  stats: {
    errorDetails: true,
    colors: true,
    modules: true,
    reasons: true
  },

  plugins: [
    new BundleTrackerDev({ filename: './webpack-stats.json', trackAssets: true }),
    new ErrorOverlayPlugin(),
    new webpack.NamedModulesPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new DotenvDev(),
    new ReactRefreshWebpackPlugin()
  ],

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [path.resolve(__dirname, 'js'), path.resolve(__dirname, 'node_modules/ketcher-core')],
        use: {
          loader: 'babel-loader',
          options: {
            compact: false,
            cacheDirectory: true,
            presets: [
              [
                '@babel/preset-env',
                {
                  useBuiltIns: 'usage',
                  corejs: 3
                }
              ],
              '@babel/preset-react'
            ],
            plugins: [
              [
                '@babel/plugin-transform-runtime',
                {
                  corejs: false,
                  helpers: true,
                  regenerator: true,
                  useESModules: false
                }
              ],
              '@babel/plugin-proposal-optional-chaining',
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-syntax-dynamic-import',
              require.resolve('react-refresh/babel')
            ].filter(Boolean)
          }
        }
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(jpe?g|png|gif|woff|woff2|eot|ttf|svg)(\?[a-z0-9=.]+)?$/,
        loader: 'url-loader?limit=100000'
      }
    ]
  },

  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx']
  },

  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};
