const NODE_ENV = process.env.NODE_ENV || 'development';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: NODE_ENV === 'development' ? 'development' : 'production',

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules\/(?!(rss-parser)\/).*/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: 'template.html',
    }),
  ],
};

if (NODE_ENV === 'development') {
  module.exports.module.rules.push(
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    },
  );
}

if (NODE_ENV === 'production') {
  module.exports.plugins.push(
    new UglifyJsPlugin({
      uglifyOptions: {
        sourceMap: false,
        beautify: false,
        comments: false,
        mangle: {
          keep_fnames: true,
        },
        compress: {
          sequences: true,
          booleans: true,
          loops: true,
          unused: true,
          drop_console: true,
        },
      },
    }),
  );

  module.exports.plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  );

  module.exports.module.rules.push(
    {
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader',
      ],
    },
  );
}
