module.exports = function({ config, mode }) {
  config.module.rules.push({
    test: /\.stories\.jsx?$/,
    loaders: [
      {
        loader: require.resolve('@storybook/addon-storysource/loader'),
        options: { parser: 'javascript' },
      },
    ],
    enforce: 'pre',
  })

  return config
}
