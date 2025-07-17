const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

const config = require('./webpack.config-dev');
const compiler = webpack(config);
const app = express();
const PORT = process.env.PORT || 3030;

app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: { colors: true, chunks: false }
  })
);

app.use(
  webpackHotMiddleware(compiler, {
    path: '/__webpack_hmr',
    heartbeat: 2000
  })
);

app.use(express.static(path.resolve(__dirname, 'bundles')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dev server listening at http://localhost:${PORT}`);
});
