const path = require('path');

module.exports = {
  target: "node",
  entry: {
    app: ["./dist/index.js"]
  },
  output: {
    path: path.resolve(__dirname, "./build"),
    filename: "script.js",
    libraryTarget: 'umd',
  },
  mode: 'development',
  // externals: [nodeExternals()],
};
