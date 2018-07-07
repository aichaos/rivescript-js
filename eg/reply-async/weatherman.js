// Asynchronous Objects Example
// See the accompanying README.md for details.

// Run this demo: `node weatherman.js`

require("babel-polyfill");
var readline = require("readline");
var request = require("request");
var colors = require('colors');

// Configuration: get an API key from http://openweathermap.org/appid and
// put it in this variable.
const APPID = 'change me';

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");
var rs = new RiveScript();

var getWeather = function(location, callback) {
	request.get({
		url: "http://api.openweathermap.org/data/2.5/weather",
		qs: {
			q: location,
			APPID: APPID
		},
		json: true
	}, function(error, response) {
		if (response.statusCode !== 200) {
			callback.call(this, response.body);
		} else {
			callback.call(this, null, response.body);
		}
	});
};


rs.setSubroutine("getWeather", function (rs, args)  {
	return new rs.Promise(function(resolve, reject) {
		getWeather(args.join(' '), function(error, data){
			if(error) {
				reject(error);
			} else {
				resolve(data.weather[0].description);
			}
		});
	});
});

rs.setSubroutine("checkForRain", function(rs, args) {
	return new rs.Promise(function(resolve, reject) {
		getWeather(args.join(' '), function(error, data){
			if(error) {
				console.error('');
				reject(error);
			} else {
				var rainStatus = data.rain ? 'yup :(' : 'nope';
				resolve(rainStatus);
			}
		});
	});
});

// Create a prototypical class for our own chatbot.
var AsyncBot = function(onReady) {
	var self = this;

	if (APPID === 'change me') {
		console.log('Error -- edit weatherman.js and provide the APPID for Open Weathermap.'.bold.yellow);
	}

	// Load the replies and process them.
	rs.loadFile("weatherman.rive").then(function() {
		rs.sortReplies();
		onReady();
	}).catch(function(err) {
		console.error(err);
	});

	// This is a function for delivering the message to a user. Its actual
	// implementation could vary; for example if you were writing an IRC chatbot
	// this message could deliver a private message to a target username.
	self.sendMessage = function(username, message) {
		// This just logs it to the console like "[Bot] @username: message"
		console.log(
			["[Brick Tamland]", message].join(": ").underline.green
		);
	};

	// This is a function for a user requesting a reply. It just proxies through
	// to RiveScript.
	self.getReply = function(username, message, callback) {
		return rs.reply(username, message, self);
	}
};

// Create and run the example bot.
var bot = new AsyncBot(function() {
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
			bot.getReply(nick, cmd).then(function(reply) {
				bot.sendMessage(nick, reply);
				rl.prompt();
			}).catch(function(err) {
				console.error(err);
				bot.sendMessage(nick, "Oops. The weather service is not cooperating!");
				rl.prompt();
			});
		}
	}).on("close", function() {
		process.exit(0);
	});
});
