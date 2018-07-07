// Example of using RiveScript as a router.
//
// See the README.md for information.

require("babel-polyfill");
var RiveScript = require("../../lib/rivescript"),
	readline = require("readline");

// Import an external module that the object macros may use.
var Controllers = require("./controllers");

// This is our data structure where we map triggers into object macro
// functions. This is just one way you could organize your program.
var replies = {
	// The top-level keys are named after the object macro that handles
	// the triggers.
	math: {
		// List of triggers that will route to this macro
		triggers: [
			"[*] what is # * [by|to|and] #",
			"[*] * # [by|to|from|and] #"
		],

		// The args for the `<call>` tag: we send all the captured
		// wildcards into the object macro.
		args: '"<star1>" "<star2>" "<star3>"',

		// The object macro function itself.
		handler: function(rs, args) {
			// This function is invoked by messages such as:
			//   what is 5 subtracted by 2
			//   add 6 to 7
			if (args[0].match(/^\d+$/)) {
				// They used the first form, with a number.
				return Controllers.doMath(args[1], args[0], args[2]);
			}
			else {
				// The second form, first word being the operation.
				return Controllers.doMath(args[0], args[1], args[2]);
			}
		}
	},

	// Another example, for completion's sake.
	reverse: {
		triggers: [
			"say * in reverse",
			"say * to me (backward|backwards|in reverse|reversed)",
			"reverse *"
		],
		args: "<star1>",
		handler: function(rs, args) {
			var text = args.join(" ");

			// Another example of using that imported module.
			var reversed = Controllers.doReverse(text);

			return reversed;
		}
	},

	// If you want your wildcard `*` trigger to be dynamically handled too.
	// Also note that this one *directly* uses our controller function as the
	// object macro, if you like that way of routing triggers instead of
	// defining all your inline functions here.
	wildcard: {
		triggers: ["*"],
		args: "<star>",
		handler: Controllers.doWildcard
	}
}

// Now with all your triggers ("routes") and handlers configured as in the
// above, we can programmatically load them into RiveScript: both the object
// macro handlers themselves, and the triggers that `<call>` those macros.
//
// This part of the code wouldn't change even as you add more triggers and
// handlers in the above structure.
var rs = new RiveScript({utf8: true});
for (var callable in replies) {
	if (!replies.hasOwnProperty(callable)) continue;

	// Map the trigger texts to the `<call>` command for the callable.
	for (var i in replies[callable].triggers) {
		rs.stream("+ " + replies[callable].triggers[i] + "\n"
			+ "- <call>" + callable + " " + replies[callable].args + "</call>\n"
		);
	}

	// Register the JavaScript object macro.
	rs.setSubroutine(callable, replies[callable].handler);
}

// If you wanted to combine the above router-controller style system with
// a "normal" RiveScript bot (using normal .rive files from disk), you could
// easily insert your own `rs.loadFile()` or `rs.loadDirectory()` calls around
// this part of the source. This example wants to stay "pure" and doesn't
// include any "normal" replies, but the two approaches can be mixed and matched
// with no problems!

// Finally, sort all those dynamically passed triggers.
rs.sortReplies();

// For this example, we'll chat with the bot in the terminal, so start a
// readline loop for the interactive session (like in shell.js):
console.log("Note: type `/quit` to exit.");
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.setPrompt("You> ");
rl.prompt();
rl.on("line", function(cmd) {
	// Handle commands.
	if (cmd === "/quit") {
		process.exit(0);
	} else {
		// Get a reply from the bot.
		rs.reply("localuser", cmd).then(function(reply) {
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
