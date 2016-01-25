// Post-install script to support doing an npm install from a git URL, for
// example `npm install git://github.com/aichaos/rivescript-js`

var child_process = require("child_process"),
	fs = require("fs"),
	path = require("path");

function postinstall() {
	// If the lib/ folder already exists, don't do anything. It means they
	// installed the package from `npm` normally and don't need to build
	// any scripts.
	var fsExists = fs.exists || path.exists;
	fsExists(path.join(__dirname, "lib"), function(exists) {
		if (exists) return;

		var grunt = path.join.apply(null, ["node_modules", "grunt-cli", "bin", "grunt"]);
		var cmd = "node " + grunt + " dist";
		console.log("Execute:", cmd);
		child_process.exec(cmd, function(error, stdout, stderr) {
			if (error != null) {
				return process.stderr.write(stderr.toString());
			}
			console.log(stdout.toString());
		});
	});
}

postinstall();
