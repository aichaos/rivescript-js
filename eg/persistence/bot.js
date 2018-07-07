// Persistence example.
// See the accompanying README.md for details.

// Run this demo: `node bot.js`

require("babel-polyfill");
var readline = require("readline"),
	fs = require("fs");

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");

// The meat of the logic is in here. This function gets a reply from the bot,
// and persists user data to disk as a local file named "./$USERNAME.json"
// where $USERNAME is the username.
function getReply(bot, username, message) {
	var filename = "./" + username + ".json";

	// See if the bot knows this user yet (in its current memory).
	var userData = bot.getUservars(username);
	if (!userData) {
		// See if a local file exists for stored user variables.
		try {
			var stats = fs.statSync(filename);
			if (stats) {
				var jsonText = fs.readFileSync(filename);
				userData = JSON.parse(jsonText);
				bot.setUservars(username, userData);
			}
		} catch(e) {}
	}

	// Wrap the reply promise so we can export user variables before
	// we return it up the stack.
	return new Promise(function(resolve, reject) {
		bot.reply(username, message).then(function(reply) {
			// Export user variables to disk.
			userData = bot.getUservars(username);
			fs.writeFile(filename, JSON.stringify(userData, null, 2), function(err) {
				if (err) {
					console.error("Failed to write file", filename, err);
				}
			});

			resolve(reply);
		}).catch(reject);
	})
}

var rs = new RiveScript();
rs.loadDirectory("../brain").then(function() {
	rs.sortReplies();

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question("Enter your username [default: soandso]: ", function(username) {
		if (!username) {
			username = "soandso";
		}

		console.log("Hello", username);
		console.log("Type /quit to quit.\n");

		rl.setPrompt("> ");
		rl.prompt();
		rl.on("line", function(cmd) {
			// Handle commands.
			if (cmd === "/quit") {
				process.exit(0);
			} else {
				// Get a reply from the bot.
				getReply(rs, username, cmd).then(function(reply) {
					console.log("Bot>", reply);
					rl.prompt();
				}).catch(function(err) {
					console.log("Err>", err);
					rl.prompt();
				});
			}
		}).on("close", function() {
			process.exit(0);
		});
	})
}).catch(function(err) {
	console.error(err);
});
