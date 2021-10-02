#!/usr/bin/env node

/******************************************************************************
 * Interactive RiveScript Shell for quickly testing your RiveScript bot.      *
 *                                                                            *
 * Requires Node 7 or greater with async/await support. This module can be    *
 * built and webpacked with Node <= 6 but this shell script won't run.        *
 *                                                                            *
 * Usage:                                                                     *
 * - If you cloned the repo from GitHub :                                     *
 *                   $ node shell.js /path/to/brain                           *
 * - If you installed locally as a project dependency via npm :               *
 *                   $ npx riveshell /path/to/brain                           *
 * - If you installed globally via npm :                                      *
 *                   $ riveshell /path/to/brain                               *
 ******************************************************************************/

var readline = require("readline"),
	fs = require("fs"),
	RiveScript = require("./src/rivescript");

//------------------------------------------------------------------------------
// Accept command line parameters.
//------------------------------------------------------------------------------

var opts = {
	debug: false,
	utf8: false,
	watch: false,
	brain: undefined
};

process.argv.slice(2).forEach(function(val, index, array) {

	if (val === "--debug") {
		opts.debug = true;
	}
	else if (val === "--utf8") {
		opts.utf8 = true;
	}
	else if (val === "--watch") {
		opts.watch = true;
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
	console.log("Usage: node shell.js [--debug --utf8 --watch] </path/to/brain>");
	process.exit(1);
}

//------------------------------------------------------------------------------
// Initialize the RiveScript bot and print the welcome banner.
//------------------------------------------------------------------------------

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// const { NullSessionManager } = require("./src/sessions");

var ready = false;
var bot = new RiveScript({
	debug:  opts.debug,
	utf8:   opts.utf8,
	concat: "newline",
	// sessionManager: new NullSessionManager()
});

if (opts.watch) {
	fs.watch(opts.brain, {recursive: false}, function() {
		console.log("");
		console.log('[INFO] Brain changed, reloading bot.');
		rl.prompt();
		loadBot();
	});
}


//--------------------------------------------------------------------------
// Drop into the interactive command shell.
//--------------------------------------------------------------------------

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


rl.setPrompt("You> ");
rl.prompt();
rl.on('line', async function(cmd) {
	// Handle commands.
	if (cmd === "/help") {
		help();
	} else if (cmd.indexOf("/data") === 0) {
		console.log(bot.getUservars("localuser"));
	} else if (cmd.indexOf("/eval ") === 0) {
		console.log(eval(cmd.replace("/eval ", "")));
	} else if (cmd.indexOf("/log ") === 0) {
		console.log(eval(cmd.replace("/log ", "")));
	} else if (cmd === "/quit") {
		process.exit(0);
	} else {
		// Get a reply from the bot.
		if (bot && ready) {
			var reply = await bot.reply("localuser", cmd);
			console.log("Bot>", reply);
		} else {
			console.log("ERR: Bot Not Ready Yet");
		}
	}

	rl.prompt();
}).on('close', function() {
	console.log("");
	process.exit(0);
});

bot.loadDirectory(opts.brain).then(() => {
	bot.sortReplies();
	ready = true;
}).catch((err) => {
	console.error("Loading error: " + err);
});

function help() {
	console.log("Supported commands:");
	console.log("/help        : Show this text.");
	console.log("/eval <code> : Evaluate JavaScript code.");
	console.log("/log <code>  : Shortcut to /eval console.log(code).");
	console.log("/quit        : Exit the program.");
}
