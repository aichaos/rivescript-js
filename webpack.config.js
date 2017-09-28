module.exports = {
	entry: "./lib/rivescript.js",
	output: {
		filename: "./dist/rivescript.js"
	},
	node: {
		fs: "empty"
	},
	target: "web"
}
