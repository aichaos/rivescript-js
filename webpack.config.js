const path = require("path");

module.exports = {
	entry: ["babel-polyfill", "./src/rivescript.js"],
	output: {
		filename: "rivescript.js",
		path: path.resolve(__dirname, "dist"),
		library: "RiveScript"
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				loader: "babel-loader"
			}
		]
	},
	node: {
		fs: "empty"
	},
	target: "web",
	mode: "development",
}
