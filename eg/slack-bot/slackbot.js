"use strict";

// Example Slack bot for RiveScript-JS.
//
// To run this bot, edit config.js to fill in your Slack Auth token and other
// settings for the bot.

require("babel-polyfill");
var config = require("./config"),
	RiveScript = require("../../lib/rivescript"),
	Slack = require("slack-client");

var slack = new Slack(config.token, true, true);
var rs = new RiveScript();

rs.loadDirectory("../brain").then(function() {
	rs.sortReplies();
	slack.login();

	slack.on("error", function(err) {
		console.error("Slack error:", err);
	});

	slack.on("open", function() {
		console.log("Welcome to Slack. You are %s of %s",
			slack.self.name, slack.team.name);
	});

	slack.on("close", function() {
		console.warn("Disconnected from Slack.");
	});

	slack.on("message", function(data) {
		var user = data._client.users[data.user];
		var messageData = data.toJSON();
		var message = "";
		var reply = "";
		var channel;

		if (messageData && messageData.text) {
			message = "" + messageData.text.trim();
		}

		// Did they @mention us or start a message with our name?
		var matchAt = message.match(/<@(.*?)>/);
		var matchName = message.toLowerCase().indexOf(config.name) == 0;
		if ((matchAt && matchAt[1] === slack.self.id) || matchName) {
			message = message.replace(/<@(.*?)>:?/, "").trim();
			message = message.replace(
				new RegExp("^" + config.name.toLowerCase(), "i"), ""
			).trim();

			// Get the bot's reply.
			rs.reply(user.name, message).then(function(reply) {
				// Send it to the channel.
				channel = slack.getChannelGroupOrDMByID(messageData.channel);
				if (reply.length > 0) {
					channel.send(reply);
				}
			});
		} else if (messageData.channel[0] === "D") {
			// Direct message.
			rs.reply(user.name, message).then(function(reply) {
				channel = slack.getChannelGroupOrDMByName(user.name);
				if (reply.length > 0) {
					channel.send(reply);
				}
			});
		}
	});
}).catch(function(err) {
	console.error(err);
})
