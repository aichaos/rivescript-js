// Scope Example
// See the accompanying README.md for details.

// Run this demo: `node bot.js`

require("babel-polyfill");
var readline = require("readline");

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");

// Create a prototypical class for our own chatbot.
var ScopedBot = function(onReady) {
	// Because `this` changes with each function call in JS, it's good practice
	// to alias it as `self` so that sub-functions can still refer to the parent
	// scope.
	var self = this;
	self.rs = new RiveScript();

	// Set some private instance attributes that the macro can read and edit.
	self.hello   = "Hello world";
	self.counter = 0;

	// Load the replies and process them.
	self.rs.loadFile("scope.rive").then(function() {
		self.rs.sortReplies();
		onReady();
	}).catch(function(err) {
		console.error(err);
	});

	// This is a function for a user requesting a reply. It just proxies through
	// to RiveScript.
	self.getReply = function(username, message) {
		// When we call RiveScript's getReply(), we pass `self` as the scope
		// variable which points back to this ScopedBot object. This way, JS
		// object macros from the RiveScript code are able to reference this
		// bot object using `this` and call other functions and variables.
		return self.rs.reply(username, message, self);
	};

	// This function is available on the `this` object to macros
	self.PrivateFunction = function() {
		return "It works!";
	};
};

// Create and run the example bot.
var bot = new ScopedBot(function() {
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
			}).catch(function(err) {
				console.log("Err>", err);
				rl.prompt();
			});
		}
	}).on("close", function() {
		process.exit(0);
	});
});
