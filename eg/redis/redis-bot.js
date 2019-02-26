/*
Example RiveScript bot that uses a Redis cache to store user variables.
*/

const RiveScript = require("../../src/rivescript"),
	RedisSessionManager = require("../../contrib/redis"),
	readline = require("readline");

async function main() {
	console.log(`Redis Session Manager Example

This script will connect to the Redis server at localhost:6379 and store
RiveScript user variables into keys with the prefix "rivescript/" followed
by their username. For example, the default username "soandso" would have
its user variables actively stored at the Redis key "rivescript/soandso".
`);
	let bot = new RiveScript({
		utf8: true,
		debug: false,
		sessionManager: new RedisSessionManager({
			prefix: "rivescript/"
		})
	});

	await bot.loadDirectory("../brain");
	bot.sortReplies();

	// Set up a command line interface to talk to the bot.
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.setPrompt("You> ");

	// Prompt the user for their username.
	rl.question("Enter any username for yourself> ", (username) => {
		if (!username) {
			console.log("No answer? I will call you 'soandso'");
			username = "soandso";
		}

		console.log(`
The example chatbot has been loaded and you will now enter a chat session
with it. Trying saying "hello" or "my name is ${username}"

Type "/help" for some commands to test the Redis system.
Type "/quit" to quit.

`);

		// Enter the main prompt loop.
		rl.setPrompt(`${username}> `);
		rl.prompt();
		rl.on("line", async (message) => {
			if (message === "/quit") {
				process.exit(0);
			} else if (message === "/help") {
				console.log(`Commands available:
/user <username>
    Dump the user variables for a specific username to console.
    Note: this data is coming from Redis!

/dump-users
    Dump all data about all users.

/reset [username]
    Reset user variables for a username, or if not provided, reset
    all variables. This will clear all "rivescript/*" keys from your
    Redis cache.

/quit
    Exit this program
`);
				rl.prompt();
			} else if (message.indexOf("/user ") === 0) {
				// "/user <username>": dump user variables
				let value = message.substring("/user ".length);
				console.log(`Uservars for ${value}:\n`);

				let data = await bot.getUservars(value);
				console.log(JSON.stringify(data, null, 2));
				rl.prompt();
			} else if (message.indexOf("/eval ") === 0) {
				// "/eval <code>": run arbitrary JS code
				let value = message.substring("/eval ".length);
				eval(value);
				rl.prompt();
			} else if (message.indexOf("/dump-users") === 0) {
				// "/dump-users" prints out getUservars() on all users.
				console.log(`Dump of all user variables in Redis`);

				let data = await bot.getUservars();
				console.log(JSON.stringify(data, null, 2));
				rl.prompt();
			} else if (message.indexOf("/reset") === 0) {
				// "/reset [username]": clear user vars for all users or one
				let username = message.substring("/reset ".length);

				await bot.clearUservars(username);

				if (username) {
					console.log(`Clear uservars for ${username}`);
				} else {
					console.log(`Clear all uservars`);
				}
				rl.prompt();
			} else {
				bot.reply(username, message).then((reply) => {
					console.log("Bot>", reply);
					rl.prompt();
					return;
				}).catch((err) => {
					console.error("Error>", err);
				});
			}
		});
	});
}

main();
