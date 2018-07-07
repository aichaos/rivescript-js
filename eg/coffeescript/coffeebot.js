// CoffeeScript object macro example.
// See the accompanying README.md for details.

// Run this demo: `node coffeebot.js`
require("babel-polyfill");

var readline = require("readline");

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");

// Load the CoffeeScript handler module.
var RSCoffeeScript = require("rivescript-contrib-coffeescript");

// Create a prototypical class for our own chatbot.
var CoffeeBot = function(onReady) {
	var self = this;
	self.rs = new RiveScript();

	// Register the CoffeeScript handler.
	self.rs.setHandler("coffee", new RSCoffeeScript(self.rs));

	// Load the replies and process them.
	self.rs.loadFile("../brain/coffee.rive").then(function() {
		self.rs.sortReplies();
		onReady();
	});

	self.getReply = function(username, message) {
		return self.rs.reply(username, message, self);
	};
};

// Create and run the example bot.
var bot = new CoffeeBot(function() {
	// Set up a reader for the standard input for chatting with the bot in your
	// terminal window.
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.setPrompt("> ");
	rl.prompt();
	rl.on("line", function(cmd) {
		// Handle commands.
		if (cmd === "/quit") {
			process.exit(0);
		} else {
			// Get a reply from the bot.
			bot.getReply("soandso", cmd).then(function(reply) {
				console.log("Bot>", reply);
				rl.prompt();
			});
		}
	}).on("close", function() {
		process.exit(0);
	});
});
