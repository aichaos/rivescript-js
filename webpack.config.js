module.exports = {
	entry: "./lib.babel/rivescript.js",
	output: {
		filename: "./dist/rivescript.js"
	},
	node: {
		fs: "empty"
	},
	target: "web"
}
