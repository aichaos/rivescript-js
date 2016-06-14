"use strict";

var TestCase = require("./base");

exports.test_coffee_objects = function(test) {
	var bot = new TestCase(test, "objects.rive", function() {
		bot.reply("test base", "Test basic CoffeeScript");
		bot.reply("Reverse hello world.", "dlrow olleh");
		bot.reply("Test broken", "Broken: [ERR: Object Not Found]");
		bot.reply("Test fake", "Fake: [ERR: Object Not Found]");
		bot.reply("Test perl", "Perl: [ERR: Object Not Found]");
		test.done();
	});
};
