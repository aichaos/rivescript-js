// Learning Example
// See the accompanying README.md for details.

// Run this demo: `node bot.js`

require("babel-polyfill");
var readline = require("readline");

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");

// Create a prototypical class for our own chatbot.
var MyBot = function(onReady) {
	var self = this;
	self.rs = new RiveScript({
		utf8: true,
	});

	// Load the replies and process them.
	self.rs.loadFile([
		"../brain/begin.rive",
		"../brain/clients.rive",
		"../brain/myself.rive",
		"./macro.rive", // the self-learning JavaScript macro itself
		"./star.rive",  // our * trigger
	]).then(function() {
			// learned.rive might not exist, try to load it anyway while
			// steamrolling the errors. If you cared more you could get
			// fs.stat() out.
			self.rs.loadFile("learned.rive").then(function() {
				self.rs.sortReplies();
				onReady();
			}).catch(function() {
				self.rs.sortReplies();
				onReady();
			});
		}).catch(function(err) {
			console.error(err);
		});

	// This is a function for delivering the message to a user. Its actual
	// implementation could vary; for example if you were writing an IRC chatbot
	// this message could deliver a private message to a target username.
	self.sendMessage = function(username, message) {
		// This just logs it to the console like "[Bot] message"
		console.log("[Bot] "+message);
	};

	// This is a function for a user requesting a reply. It just proxies through
	// to RiveScript.
	self.getReply = function(username, message) {
		// When we call RiveScript's getReply(), we pass `self` as the scope
		// variable which points back to this AsyncBot object. This way the
		// object macro can call `this.sendMessage()` to asynchronously send
		// a response to the user.
		return self.rs.reply(username, message, self);
	}
};

// Create and run the example bot.
var bot = new MyBot(function() {
	// Drop into an interactive shell to get replies from the user.
	// If this were something like an IRC bot, it would have a message
	// handler from the server for when a user sends a private message
	// to the bot's nick.
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.setPrompt("> ");
	rl.prompt();
	rl.on("line", function(cmd) {
		// If this was an IRC bot, imagine "nick" came from the server as the
		// sending user's IRC nickname.
		nick = "Soandso";
		console.log("[" + nick + "] " + cmd);

		// Handle commands.
		if (cmd === "/quit") {
			process.exit(0);
		} else {
			// For better results, the JavaScript host of the bot can store the
			// user's full, original message in a variable. The bot can then
			// learn the reply keeping the original punctuation and formatting.
			bot.rs.setUservar(nick, "origMessage", cmd).then(function() {
				bot.getReply(nick, cmd).then(function(reply) {
					bot.sendMessage(nick, reply);
					rl.prompt();
				});
			}).catch(function(err) {
				bot.sendMessage(nick, "Error: " + err);
				rl.prompt();
			});
		}
	}).on("close", function() {
		process.exit(0);
	});
});
