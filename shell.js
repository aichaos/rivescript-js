#!/usr/bin/env node

/******************************************************************************
 * Interactive RiveScript Shell for quickly testing your RiveScript bot.      *
 *                                                                            *
 * Usage: node shell.js /path/to/brain                                        *
 ******************************************************************************/

var readline = require("readline"),
	fs = require("fs"),
	RiveScript = require("./lib/rivescript");

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


var bot = null;
function loadBot() {
	bot = new RiveScript({
		debug:   opts.debug,
		utf8:    opts.utf8,
		concat:  "newline",
	});
	bot.ready = false;
	bot.loadDirectory(opts.brain, loadingDone, loadingError);
}
loadBot();

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
rl.on('line', function(cmd) {
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
		var reply = (bot && bot.ready)
			? bot.reply("localuser", cmd)
			: "ERR: Bot Not Ready Yet";
		console.log("Bot>", reply);
	}
	
	rl.prompt();
}).on('close', function() {
	console.log("");
	process.exit(0);
});



function loadingDone(batchNumber) {
	bot.sortReplies();
	bot.ready = true;
}

function loadingError(error, batchNumber) {
	console.error("Loading error: " + error);
}

function help() {
	console.log("Supported commands:");
	console.log("/help        : Show this text.");
	console.log("/eval <code> : Evaluate JavaScript code.");
	console.log("/log <code>  : Shortcut to /eval console.log(code).");
	console.log("/quit        : Exit the program.");
}


