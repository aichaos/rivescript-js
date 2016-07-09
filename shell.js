#!/usr/bin/env node

/******************************************************************************
 * Interactive RiveScript Shell for quickly testing your RiveScript bot.      *
 *                                                                            *
 * Usage: node shell.js /path/to/brain                                        *
 ******************************************************************************/

var readline = require("readline"),
	RiveScript = require("./lib/rivescript");

//------------------------------------------------------------------------------
// Accept command line parameters.
//------------------------------------------------------------------------------

var opts = {
	debug: false,
	utf8: false,
	brain: undefined
};

process.argv.forEach(function(val, index, array) {
	if (index < 2) {
		return;
	}

	if (val === "--debug") {
		opts.debug = true;
	}
	else if (val === "--utf8") {
		opts.utf8 = true;
	}
	else if (val.indexOf("-") === 0) {
		console.error("Unknown option: %s", val);
	}
	else if (opts.brain === undefined) {
		opts.brain = val;
	}
	else {
		console.error("Extra parameter ignored: %s", val);
	}
});

if (opts.brain === undefined) {
	console.log("Usage: node shell.js [--debug --utf8] </path/to/brain>");
	process.exit(1);
}

//------------------------------------------------------------------------------
// Initialize the RiveScript bot and print the welcome banner.
//------------------------------------------------------------------------------

var bot = new RiveScript({
	debug: opts.debug,
	utf8:  opts.utf8,
});
bot.loadDirectory(opts.brain, loading_done, loading_error);

function loading_done(batch_num) {
	bot.sortReplies();

	console.log("      .   .       ");
	console.log("     .:...::      RiveScript Interpreter (JavaScript)");
	console.log("    .::   ::.     Library Version: v" + bot.version());
	console.log(" ..:;;. ' .;;:..  ");
	console.log("    .  '''  .     Type '/quit' to quit.");
	console.log("     :;,:,;:      Type '/help' for more options.");
	console.log("     :     :      ");
	console.log("");
	console.log("Using the RiveScript bot found in: " + opts.brain);
	console.log("Type a message to the bot and press Return to send it.");
	console.log("");

	//--------------------------------------------------------------------------
	// Drop into the interactive command shell.
	//--------------------------------------------------------------------------

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.setPrompt("You> ");
	rl.prompt();
	rl.on("line", function(cmd) {
		// Handle commands.
		if (cmd === "/help") {
			help();
		} else if (cmd.indexOf("/eval ") === 0) {
			eval(cmd.replace("/eval ", ""));
		} else if (cmd.indexOf("/log ") === 0) {
			console.log(eval(cmd.replace("/log ", "")));
		} else if (cmd === "/quit") {
			process.exit(0);
		} else {
			// Get a reply from the bot.
			var reply = bot.reply("localuser", cmd);
			console.log("Bot>", reply);
		}

		rl.prompt();
	}).on("close", function() {
		process.exit(0);
	});
}

function loading_error(error, loadBatch) {
	console.error("Loading error: " + error);
}

function help() {
	console.log("Supported commands:");
	console.log("/help        : Show this text.");
	console.log("/eval <code> : Evaluate JavaScript code.");
	console.log("/log <code>  : Shortcut to /eval console.log(code).");
	console.log("/quit        : Exit the program.");
}
