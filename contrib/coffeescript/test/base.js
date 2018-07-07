// Utility functions for the unit tests.
"use strict";

var RiveScript = require("rivescript"),
	CoffeeHandler = require("../index");

var TestCase = function(test, code, ready, opts) {
	var self = this;

	self.test     = test;
	self.username = "localuser";

	// Initialize RiveScript.
	self.rs = new RiveScript(opts);
	self.rs.setHandler("coffeescript", new CoffeeHandler(self.rs));
	self.rs.loadFile("test/fixtures/" + code).then(function() {
		self.rs.sortReplies();
		ready();
	}).catch(function(error) {
		console.error("Failed to load file: " + error);
	});

	// Reply assertion.
	self.reply = function(message, expected) {
		self.rs.reply(self.username, message).then(function(reply) {
			self.test.equal(reply, expected);
		});
	};
}

module.exports = TestCase;
