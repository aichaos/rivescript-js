// RiveScript.js
// https://www.rivescript.com/

// This code is released under the MIT License.
// See the "LICENSE" file for more information.

// Brain logic for RiveScript

"use strict";

const utils = require("./utils");
const inherit_utils = require("./inheritance");

/**
Brain (RiveScript master)

Create a Brain object which handles the actual process of fetching a reply.
*/
class Brain {
	constructor(master) {
		var self = this;

		self.master = master;
		self.strict = master._strict;
		self.utf8   = master._utf8;

		// Private variables only relevant to the reply-answering part of RiveScript.
		self._currentUser = null; // The current user asking for a message
	}

	// Proxy functions
	say(message) {
		return this.master.say(message);
	}
	warn(message, filename, lineno) {
		return this.master.warn(message, filename, lineno);
	}

	/**
	async reply (string user, string msg[, scope])

	Fetch a reply for the user. This returns a Promise that may be awaited on.
	*/
	async reply(user, msg, scope) {
		var self = this;

		self.say(`Asked to reply to [${user}] ${msg}`);

		// Store the current user's ID.
		self._currentUser = user;

		// Format their message.
		msg = self.formatMessage(msg);
		let reply = "";

		// Set initial match to be undefined
		await self.master._session.set(user, {
			__initialmatch__: null
		});

		// If the BEGIN block exists, consult it first.
		if (self.master._topics.__begin__) {
			let begin = (await self._getReply(user, "request", "begin", 0, scope));

			// OK to continue?
			if (begin.indexOf("{ok}") > -1) {
				reply = (await self._getReply(user, msg, "normal", 0, scope));
				begin = begin.replace(/\{ok\}/g, reply);
			}

			reply = (await self.processTags(user, msg, begin, [], [], 0, scope));
		} else {
			reply = (await self._getReply(user, msg, "normal", 0, scope));
		}

		// Save their reply history
		let history = (await self.master._session.get(user, "__history__"));
		if (history == "undefined") { // purposeful typecast
			history = newHistory();
		}
		try {
			// If modifying it fails, the data was bad, and reset it.
			history.input.pop();
			history.input.unshift(msg);
			history.reply.pop();
			history.reply.unshift(reply);
		} catch(e) {
			history = newHistory();
		}
		await self.master._session.set(user, {
			__history__: history
		});

		// Unset the current user ID.
		self._currentUser = null;

		return reply;
	}

	/**
	async _getReply (string user, string msg, string context, int step, scope)

	The internal reply method. DO NOT CALL THIS DIRECTLY.

	* user, msg and scope are the same as reply()
	* context = "normal" or "begin"
	* step = the recursion depth
	* scope = the call scope for object macros
	*/
	async _getReply(user, msg, context, step, scope) {
		var self = this;

		// Needed to sort replies?
		if (!self.master._sorted.topics) {
			self.warn("You forgot to call sortReplies()!");
			return "ERR: Replies Not Sorted";
		}

		// Collect data on this user.
		let topic = (await self.master.getUservar(user, "topic"));
		if (topic === null || topic === "undefined") {
			topic = "random";
		}

		let stars = [];
		let thatstars = []; // For %Previous
		let reply = "";

		// Avoid letting them fall into a missing topic.
		if (!self.master._topics[topic]) {
			self.warn(`User ${user} was in an empty topic named '${topic}'`);
			topic = "random";
			await self.master.setUservar(user, "topic", topic);
		}

		// Avoid deep recursion.
		if (step > self.master._depth) {
			return self.master.errors.deepRecursion;
		}

		// Are we in the BEGIN block?
		if (context === "begin") {
			topic = "__begin__";
		}

		// Initialize this user's history.
		let history = (await self.master._session.get(user, "__history__"));
		if (history == "undefined") { // purposeful typecast
			history = newHistory();
			await self.master._session.set(user, {
				__history__: history
			});
		}

		// More topic sanity checking.
		if (!self.master._topics[topic]) {
			// This was handled before, which would mean topic=random and it doesn't
			// exist. Serious issue!
			return "ERR: No default topic 'random' was found!";
		}

		// Create a pointer for the matched data when we find it.
		let matched = null;
		let matchedTrigger = null;
		let foundMatch = false;

		// See if there were any %Previous's in this topic, or any topic related
		// to it. This should only be done the first time -- not during a recursive
		// redirection. This is because in a redirection, "lastreply" is still gonna
		// be the same as it was the first time, resulting in an infinite loop!
		if (step === 0) {
			let allTopics = [topic];
			if (self.master._topics[topic].includes || self.master._topics[topic].inherits) {
				// Get ALL the topics!
				allTopics = inherit_utils.getTopicTree(self.master, topic);
			}

			// Scan them all.
			for (let j = 0, len = allTopics.length; j < len; j++) {
				let top = allTopics[j];
				self.say(`Checking topic ${top} for any %Previous's`);
				if (self.master._sorted.thats[top].length) {
					// There's one here!
					self.say("There's a %Previous in this topic!");

					// Do we have history yet?
					let lastReply = history.reply ? history.reply[0] : "undefined";

					// Format the bot's last reply the same way as the human's.
					lastReply = self.formatMessage(lastReply, true);
					self.say(`Last reply: ${lastReply}`);

					// See if it's a match
					for (let k = 0, len1 = self.master._sorted.thats[top].length; k < len1; k++) {
						let trig = self.master._sorted.thats[top][k];
						let pattern = trig[1].previous;
						let botside = (await self.triggerRegexp(user, pattern));

						self.say(`Try to match lastReply (${lastReply}) to ${botside}`);

						// Match?
						let match = lastReply.match(new RegExp(`^${botside}$`));
						if (match) {
							// Huzzah! See if OUR message is right too.
							self.say("Bot side matched!");

							thatstars = match; // Collect the bot stars in case we need them
							thatstars.shift();

							// Compare the triggers to the user's message.
							let userSide = trig[1];
							let regexp = (await self.triggerRegexp(user, userSide.trigger));
							self.say(`Try to match "${msg}" against ${userSide.trigger} (${regexp})`);

							// If the trigger is atomic, we don't need to bother with the regexp engine.
							let isAtomic = utils.isAtomic(userSide.trigger);
							let isMatch = false;
							if (isAtomic) {
								if (msg === regexp) {
									isMatch = true;
								}
							} else {
								let match = msg.match(new RegExp(`^${regexp}$`));
								if (match) {
									isMatch = true;
									// Get the stars
									stars = match;
									if (stars.length >= 1) {
										stars.shift();
									}
								}
							}

							// Was it a match?
							if (isMatch) {
								// Keep the trigger pointer.
								matched = userSide;
								foundMatch = true;
								matchedTrigger = userSide.trigger;
								break;
							}
						}
					}
				} else {
					self.say("No %Previous in this topic!");
				}
			}
		}

		// Search their topic for a match to their trigger.
		if (!foundMatch) {
			self.say("Searching their topic for a match...");
			for (let l = 0, len = self.master._sorted.topics[topic].length; l < len; l++) {
				let trig = self.master._sorted.topics[topic][l];
				let pattern = trig[0];
				let regexp = (await self.triggerRegexp(user, pattern));

				self.say(`Try to match "${msg}" against ${pattern} (${regexp})`);

				// If the trigger is atomic, we don't need to bother with the regexp engine.
				let isAtomic = utils.isAtomic(pattern);
				let isMatch = false;
				if (isAtomic) {
					if (msg === regexp) {
						isMatch = true;
					}
				} else {
					// Non-atomic triggers always need the regexp.
					let match = msg.match(new RegExp(`^${regexp}$`));
					if (match) {
						// The regexp matched!
						isMatch = true;

						// Collect the stars
						stars = [];
						if (match.length > 1) {
							for (let i = 1, len = match.length; i < len; i++) {
								stars.push(match[i]);
							}
						}
					}
				}

				// A match somehow?
				if (isMatch) {
					self.say("Found a match!");

					// Keep the pointer to this trigger's data.
					matched = trig[1];
					foundMatch = true;
					matchedTrigger = pattern;
					break;
				}
			}
		}

		// Store what trigger they matched on. If their matched trigger is undefined,
		// this will be too, which is great.
		await self.master._session.set(user, {__lastmatch__: matchedTrigger});
		let lastTriggers = [];
		if (step === 0) {
			await self.master._session.set(user, {
				// Store initial matched trigger. Like __lastmatch__, this can be undefined.
				__initialmatch__: matchedTrigger,

				// Also initialize __last_triggers__ which will keep all matched triggers
				__last_triggers__: lastTriggers
			});
		}

		// Did we match?
		if (matched) {
			// Keep the current match
			lastTriggers.push(matched);
			await self.master._session.set(user, {__last_triggers__: lastTriggers});

			// A single loop so we can break out early
			for (let n = 0; n < 1; n++) {
				// See if there are any hard redirects.
				if (matched.redirect != null) {
					self.say(`Redirecting us to ${matched.redirect}`);
					let redirect = (await self.processTags(user, msg, matched.redirect, stars, thatstars, step, scope));

					self.say(`Pretend user said: ${redirect}`);
					reply = (await self._getReply(user, redirect, context, step + 1, scope));
					break;
				}

				// Check the conditionals.
				for (let o = 0, len4 = matched.condition.length; o < len4; o++) {
					let row = matched.condition[o];
					let halves = row.split(/\s*=>\s*/);
					if (halves && halves.length === 2) {
						let condition = halves[0].match(/^(.+?)\s+(==|eq|!=|ne|<>|<|<=|>|>=)\s+(.*?)$/);
						if (condition) {
							let left = utils.strip(condition[1]);
							let eq = condition[2];
							let right = utils.strip(condition[3]);
							let potreply = halves[1].trim();

							// Process tags all around
							left = (await self.processTags(user, msg, left, stars, thatstars, step, scope));
							right = (await self.processTags(user, msg, right, stars, thatstars, step, scope));

							// Defaults?
							if (left.length === 0) {
								left = "undefined";
							}
							if (right.length === 0) {
								right = "undefined";
							}

							self.say(`Check if ${left} ${eq} ${right}`);

							// Validate it
							let passed = false;
							if (eq === "eq" || eq === "==") {
								if (left === right) {
									passed = true;
								}
							} else if (eq === "ne" || eq === "!=" || eq === "<>") {
								if (left !== right) {
									passed = true;
								}
							} else {
								try {
									// Dealing with numbers here
									left = parseInt(left);
									right = parseInt(right);
									if (eq === "<" && left < right) {
										passed = true;
									} else if (eq === "<=" && left <= right) {
										passed = true;
									} else if (eq === ">" && left > right) {
										passed = true;
									} else if (eq === ">=" && left >= right) {
										passed = true;
									}
								} catch (error) {
									e = error;
									self.warn("Failed to evaluate numeric condition!");
								}
							}

							// OK?
							if (passed) {
								reply = potreply;
								break;
							}
						}
					}
				}

				// Have our reply yet?
				if (reply !== null && reply.length > 0) {
					break;
				}

				// Process weights in the replies.
				let bucket = [];
				for (let q = 0, len5 = matched.reply.length; q < len5; q++) {
					let rep = matched.reply[q];
					let weight = 1;
					let match = rep.match(/\{weight=(\d+?)\}/i);
					if (match) {
						weight = match[1];
						if (weight <= 0) {
							self.warn("Can't have a weight <= 0!");
							weight = 1;
						}
					}

					for (let i = 0; i < weight; i++) {
						bucket.push(rep);
					}
				}

				// Get a random reply.
				let choice = parseInt(Math.random() * bucket.length);
				reply = bucket[choice];
				break;
			}
		}

		// Still no reply?
		if (!foundMatch) {
			reply = self.master.errors.replyNotMatched;
		} else if (reply === void 0 || reply.length === 0) {
			reply = self.master.errors.replyNotFound;
		}

		self.say(`Reply: ${reply}`);

		// Process tags for the BEGIN block.
		if (context === "begin") {
			// The BEGIN block can set {topic} and user vars.

			// Topic setter
			let match = reply.match(/\{topic=(.+?)\}/i);
			let giveup = 0;
			while (match) {
				giveup++;
				if (giveup >= 50) {
					self.warn("Infinite loop looking for topic tag!");
					break;
				}

				let name = match[1];
				await self.master.setUservar(user, "topic", name);
				reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "");
				match = reply.match(/\{topic=(.+?)\}/i);
			}

			// Set user vars
			match = reply.match(/<set (.+?)=(.+?)>/i);
			giveup = 0;
			while (match) {
				giveup++;
				if (giveup >= 50) {
					self.warn("Infinite loop looking for set tag!");
					break;
				}

				let name = match[1];
				let value = match[2];

				await self.master.setUservar(user, name, value);
				reply = reply.replace(new RegExp("<set " + utils.quotemeta(name) + "=" + utils.quotemeta(value) + ">", "ig"), "");
				match = reply.match(/<set (.+?)=(.+?)>/i);
			}
		} else {
			// Process all the tags.
			reply = self.processTags(user, msg, reply, stars, thatstars, step, scope);
		}
		return reply;
	}

	/**
	string formatMessage (string msg)

	Format a user's message for safe processing.
	*/
	formatMessage(msg, botreply) {
		var self = this;

		// Lowercase it.
		msg = "" + msg;
		msg = msg.toLowerCase();

		// Run substitutions and sanitize what's left.
		msg = self.substitute(msg, "sub");

		// In UTF-8 mode, only strip metacharcters and HTML brackets (to protect
		// against obvious XSS attacks).
		if (self.utf8) {
			msg = msg.replace(/[\\<>]+/, "");

			if (self.master.unicodePunctuation != null) {
				msg = msg.replace(self.master.unicodePunctuation, "");
			}

			// For the bot's reply, also strip common punctuation.
			if (botreply != null) {
				msg = msg.replace(/[.?,!;:@#$%^&*()]/, "");
			}
		} else {
			// For everything else, strip all non-alphanumerics
			msg = utils.stripNasties(msg, self.utf8);
		}

		// cut leading and trailing blanks once punctuation dropped office
		msg = msg.trim();
		msg = msg.replace(/\s+/g, " ");
		return msg;
	}

	/**
	async triggerRegexp (string user, string trigger)

	Prepares a trigger for the regular expression engine.
	*/
	async triggerRegexp(user, regexp) {
		var self = this;

		// If the trigger is simply '*' then the * needs to become (.*?)
		// to match the blank string too.
		regexp = regexp.replace(/^\*$/, "<zerowidthstar>");

		// Simple replacements.
		regexp = regexp.replace(/\*/g, "(.+?)"); // Convert * into (.+?)
		regexp = regexp.replace(/#/g, "(\\d+?)"); // Convert # into (\d+?)
		regexp = regexp.replace(/_/g, "(\\w+?)"); // Convert _ into (\w+?)
		regexp = regexp.replace(/\s*\{weight=\d+\}\s*/g, ""); // Remove {weight} tags
		regexp = regexp.replace(/<zerowidthstar>/g, "(.*?)");
		regexp = regexp.replace(/\|{2,}/, '|'); // Remove empty entities
		regexp = regexp.replace(/(\(|\[)\|/g, '$1'); // Remove empty entities from start of alt/opts
		regexp = regexp.replace(/\|(\)|\])/g, '$1'); // Remove empty entities from end of alt/opts

		// UTF-8 mode special characters.
		if (self.utf8) {
			regexp = regexp.replace(/\\@/, "\\u0040"); // @ symbols conflict w/ arrays
		}

		// Optionals.
		let match = regexp.match(/\[(.+?)\]/);
		let giveup = 0;
		while (match) {
			if (giveup++ > 50) {
				self.warn("Infinite loop when trying to process optionals in a trigger!");
				return "";
			}

			// The resulting regexp needs to work in two scenarios:
			// 1) The user included the optional word(s) in which case they must be
			//    in the message surrounded by a space or a word boundary (e.g. the
			//    end or beginning of their message)
			// 2) The user did not include the word, meaning the whole entire set of
			//    words should be "OR'd" with a word boundary or one or more spaces.
			//
			// The resulting regexp ends up looking like this, for a given input
			// trigger of: what is your [home|office] number
			// what is your(?:(?:\s|\b)+home(?:\s|\b)+|(?:\s|\b)+office(?:\s|\b)+|(?:\b|\s)+)number
			//
			// See https://github.com/aichaos/rivescript-js/issues/48

			let parts = match[1].split("|");
			let opts = [];
			for (let j = 0, len = parts.length; j < len; j++) {
				let p = parts[j];
				opts.push(`(?:\\s|\\b)+${p}(?:\\s|\\b)+`);
			}

			// If this optional had a star or anything in it, make it non-matching.
			let pipes = opts.join("|");
			pipes = pipes.replace(new RegExp(utils.quotemeta("(.+?)"), "g"), "(?:.+?)");
			pipes = pipes.replace(new RegExp(utils.quotemeta("(\\d+?)"), "g"), "(?:\\d+?)");
			pipes = pipes.replace(new RegExp(utils.quotemeta("(\\w+?)"), "g"), "(?:\\w+?)");

			// Temporarily dummy out the literal square brackets so we don't loop forever
			// thinking that the [\s\b] part is another optional.
			pipes = pipes.replace(/\[/g, "__lb__").replace(/\]/g, "__rb__");
			regexp = regexp.replace(new RegExp("\\s*\\[" + utils.quotemeta(match[1]) + "\\]\\s*"), `(?:${pipes}|(?:\\b|\\s)+)`);
			match = regexp.match(/\[(.+?)\]/);
		}

		// Restore the literal square brackets.
		regexp = regexp.replace(/__lb__/g, "[").replace(/__rb__/g, "]");

		// _ wildcards can't match numbers! Quick note on why I did it this way:
		// the initial replacement above (_ => (\w+?)) needs to be \w because the
		// square brackets in [\s\d] will confuse the optionals logic just above.
		// So then we switch it back down here. Also, we don't just use \w+ because
		// that matches digits, and similarly [A-Za-z] doesn't work with Unicode,
		// so this regexp excludes spaces and digits instead of including letters.
		regexp = regexp.replace(/\\w/, "[^\\s\\d]");

		// Filter in arrays.
		giveup = 0;
		while (regexp.indexOf("@") > -1) {
			if (giveup++ > 50) {
				break;
			}
			let match = regexp.match(/\@(.+?)\b/);
			if (match) {
				let name = match[1];
				let rep = "";
				if (self.master._array[name]) {
					rep = "(?:" + self.master._array[name].join("|") + ")";
				}
				regexp = regexp.replace(new RegExp("@" + utils.quotemeta(name) + "\\b"), rep);
			}
		}

		// Filter in bot variables.
		giveup = 0;
		while (regexp.indexOf("<bot") > -1) {
			if (giveup++ > 50) {
				break;
			}
			let match = regexp.match(/<bot (.+?)>/i);
			if (match) {
				let name = match[1];
				let rep = '';
				if (self.master._var[name]) {
					rep = utils.stripNasties(self.master._var[name], self.utf8);
				}
				regexp = regexp.replace(new RegExp("<bot " + utils.quotemeta(name) + ">"), rep.toLowerCase());
			}
		}
		// Filter in user variables.
		giveup = 0;
		while (regexp.indexOf("<get") > -1) {
			if (giveup++ > 50) {
				break;
			}

			let match = regexp.match(/<get (.+?)>/i);
			if (match) {
				let name = match[1];
				let rep = (await self.master.getUservar(user, name));
				regexp = regexp.replace(new RegExp("<get " + utils.quotemeta(name) + ">", "ig"), rep.toLowerCase());
			}
		}
		// Filter in input/reply tags.
		giveup = 0;
		regexp = regexp.replace(/<input>/i, "<input1>");
		regexp = regexp.replace(/<reply>/i, "<reply1>");
		let history = (await self.master._session.get(user, "__history__"));
		if (history == "undefined") { // purposeful typecast
			history = newHistory();
		}
		while (regexp.indexOf("<input") > -1 || regexp.indexOf("<reply") > -1) {
			if (giveup++ > 50) {
				break;
			}
			let ref = ["input", "reply"];
			for (let k = 0, len1 = ref.length; k < len1; k++) {
				let type = ref[k];
				for (let i = 1; i <= 9; i++) {
					if (regexp.indexOf(`<${type}${i}>`) > -1) {
						let value = self.formatMessage(history[type][i-1], type==="reply");
						regexp = regexp.replace(new RegExp(`<${type}${i}>`, "g"), value);
					}
				}
			}
		}

		// Recover escaped Unicode symbols.
		if (self.utf8 && regexp.indexOf("\\u") > -1) {
			regexp = regexp.replace(/\\u([A-Fa-f0-9]{4})/, function(match, grp) {
				return String.fromCharCode(parseInt(grp, 16));
			});
		}

		// Prevent accidental wildcard match due to double-pipe (e.g. /hi||hello/)
		regexp = regexp.replace(/\|{2,}/mg, '|');
		return regexp;
	}

	/**
	string processTags (string user, string msg, string reply, string[] stars,
	                    string[] botstars, int step, scope)

	Process tags in a reply element.
	*/
	async processTags(user, msg, reply, st, bst, step, scope) {
		var self = this;

		// Prepare the stars and botstars.
		let stars = [""];
		stars.push.apply(stars, st);
		let botstars = [""];
		botstars.push.apply(botstars, bst);
		if (stars.length === 1) {
			stars.push("undefined");
		}
		if (botstars.length === 1) {
			botstars.push("undefined");
		}

		// Turn arrays into randomized sets.
		let match = reply.match(/\(@([A-Za-z0-9_]+)\)/i);
		let giveup = 0;
		while (match) {
			if (giveup++ > self.master._depth) {
				self.warn("Infinite loop looking for arrays in reply!");
				break;
			}

			let name = match[1];
			let result;
			if (self.master._array[name]) {
				result = "{random}" + self.master._array[name].join("|") + "{/random}";
			} else {
				// Dummy it out so we can reinsert it later.
				result = `\x00@${name}\x00`;
			}

			reply = reply.replace(new RegExp("\\(@" + utils.quotemeta(name) + "\\)", "ig"), result);
			match = reply.match(/\(@([A-Za-z0-9_]+)\)/i);
		}

		// Restore literal arrays that didn't exist.
		reply = reply.replace(/\x00@([A-Za-z0-9_]+)\x00/g, "(@$1)");

		// Tag shortcuts.
		reply = reply.replace(/<person>/ig, "{person}<star>{/person}");
		reply = reply.replace(/<@>/ig, "{@<star>}");
		reply = reply.replace(/<formal>/ig, "{formal}<star>{/formal}");
		reply = reply.replace(/<sentence>/ig, "{sentence}<star>{/sentence}");
		reply = reply.replace(/<uppercase>/ig, "{uppercase}<star>{/uppercase}");
		reply = reply.replace(/<lowercase>/ig, "{lowercase}<star>{/lowercase}");

		// Weight and star tags.
		reply = reply.replace(/\{weight=\d+\}/ig, ""); // Remove {weight}s
		reply = reply.replace(/<star>/ig, stars[1]);
		reply = reply.replace(/<botstar>/ig, botstars[1]);
		for (let i = 1, len = stars.length; i <= len; i++) {
			reply = reply.replace(new RegExp(`<star${i}>`, "ig"), stars[i]);
		}
		for (let i = 1, len = botstars.length; i <= len; i++) {
			reply = reply.replace(new RegExp(`<botstar${i}>`, "ig"), botstars[i]);
		}

		// <input> and <reply>
		let history = (await self.master._session.get(user, "__history__"));
		if (history == "undefined") { // purposeful typecast for `undefined` too
			history = newHistory();
		}
		reply = reply.replace(/<input>/ig, history.input ? history.input[0] : "undefined");
		reply = reply.replace(/<reply>/ig, history.reply ? history.reply[0] : "undefined");
		for (let i = 1; i <= 9; i++) {
			if (reply.indexOf(`<input${i}>`) > -1) {
				reply = reply.replace(new RegExp(`<input${i}>`, "ig"), history.input[i-1]);
			}
			if (reply.indexOf(`<reply${i}>`) > -1) {
				reply = reply.replace(new RegExp(`<reply${i}>`, "ig"), history.reply[i-1]);
			}
		}

		// <id> and escape codes
		reply = reply.replace(/<id>/ig, user);
		reply = reply.replace(/\\s/ig, " ");
		reply = reply.replace(/\\n/ig, "\n");
		reply = reply.replace(/\\#/ig, "#");

		// {random}
		match = reply.match(/\{random\}(.+?)\{\/random\}/i);
		giveup = 0;
		while (match) {
			if (giveup++ > self.master._depth) {
				self.warn("Infinite loop looking for random tag!");
				break;
			}

			let random = [];
			let text = match[1];
			if (text.indexOf("|") > -1) {
				random = text.split("|");
			} else {
				random = text.split(" ");
			}

			let output = random[parseInt(Math.random() * random.length)];
			reply = reply.replace(new RegExp("\\{random\\}" + utils.quotemeta(text) + "\\{\\/random\\}", "ig"), output);
			match = reply.match(/\{random\}(.+?)\{\/random\}/i);
		}

		// Person substitutions & string formatting
		let formats = ["person", "formal", "sentence", "uppercase", "lowercase"];
		for (let m = 0, len = formats.length; m < len; m++) {
			let type = formats[m];
			match = reply.match(new RegExp(`{${type}}(.+?){/${type}}`, "i"));
			giveup = 0;
			while (match) {
				giveup++;
				if (giveup >= 50) {
					self.warn(`Infinite loop looking for ${type} tag!`);
					break;
				}

				let content = match[1];
				let replace;
				if (type === "person") {
					replace = self.substitute(content, "person");
				} else {
					replace = utils.stringFormat(type, content);
				}

				reply = reply.replace(new RegExp(`{${type}}` + utils.quotemeta(content) + `{/${type}}`, "ig"), replace);
				match = reply.match(new RegExp(`{${type}}(.+?){/${type}}`, "i"));
			}
		}

		// Handle all variable-related tags with an iterative regexp approach, to
		// allow for nesting of tags in arbitrary ways (think <set a=<get b>>)
		// Dummy out the <call> tags first, because we don't handle them right here.
		reply = reply.replace(/<call>/ig, "«__call__»");
		reply = reply.replace(/<\/call>/ig, "«/__call__»");
		while (true) {
			// This regexp will match a <tag> which contains no other tag inside it,
			// i.e. in the case of <set a=<get b>> it will match <get b> but not the
			// <set> tag, on the first pass. The second pass will get the <set> tag,
			// and so on.
			match = reply.match(/<([^<]+?)>/);
			if (!match) {
				break; // No remaining tags!
			}

			match = match[1];
			let parts = match.split(" ");
			let tag = parts[0].toLowerCase();
			let data = "";
			if (parts.length > 1) {
				data = parts.slice(1).join(" ");
			}
			let insert = "";

			// Handle the tags.
			if (tag === "bot" || tag === "env") {
				// <bot> and <env> tags are similar
				let target = tag === "bot" ? self.master._var : self.master._global;
				if (data.indexOf("=") > -1) {
					// Assigning a variable
					parts = data.split("=", 2);
					self.say(`Set ${tag} variable ${parts[0]} = ${parts[1]}`);
					target[parts[0]] = parts[1];
				} else {
					// Getting a bot/env variable
					insert = target[data] || "undefined";
				}
			} else if (tag === "set") {
				// <set> user vars
				parts = data.split("=", 2);
				self.say(`Set uservar ${parts[0]} = ${parts[1]}`);
				await self.master.setUservar(user, parts[0], parts[1]);
			} else if (tag === "add" || tag === "sub" || tag === "mult" || tag === "div") {
				// Math operator tags
				parts = data.split("=");
				let name = parts[0];
				let value = parts[1];

				// Initialize the variable?
				let existingValue = (await self.master.getUservar(user, name));
				if (existingValue === "undefined") {
					existingValue = 0;
				}

				// Sanity check
				value = parseInt(value);
				if (isNaN(value)) {
					insert = `[ERR: Math can't '${tag}' non-numeric value '${value}']`;
				} else if (isNaN(parseInt(existingValue))) {
					insert = `[ERR: Math can't '${tag}' non-numeric user variable '${name}']`;
				} else {
					let result = parseInt(existingValue);
					if (tag === "add") {
						result += value;
					} else if (tag === "sub") {
						result -= value;
					} else if (tag === "mult") {
						result *= value;
					} else if (tag === "div") {
						if (value === 0) {
							insert = "[ERR: Can't Divide By Zero]";
						} else {
							result /= value;
						}
					}

					// No errors?
					if (insert === "") {
						await self.master.setUservar(user, name, result);
					}
				}
			} else if (tag === "get") {
				insert = (await self.master.getUservar(user, data));
			} else {
				// Unrecognized tag, preserve it
				insert = `\x00${match}\x01`;
			}
			reply = reply.replace(new RegExp(`<${utils.quotemeta(match)}>`), insert);
		}

		// Recover mangled HTML-like tags
		reply = reply.replace(/\x00/g, "<");
		reply = reply.replace(/\x01/g, ">");

		// Topic setter
		match = reply.match(/\{topic=(.+?)\}/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				self.warn("Infinite loop looking for topic tag!");
				break;
			}

			let name = match[1];
			await self.master.setUservar(user, "topic", name);
			reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "");
			match = reply.match(/\{topic=(.+?)\}/i); // Look for more
		}

		// Inline redirector
		match = reply.match(/\{@([^\}]*?)\}/);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				self.warn("Infinite loop looking for redirect tag!");
				break;
			}

			let target = utils.strip(match[1]);
			self.say(`Inline redirection to: ${target}`);

			let subreply = (await self._getReply(user, target, "normal", step + 1, scope));
			reply = reply.replace(new RegExp("\\{@" + utils.quotemeta(match[1]) + "\\}", "i"), subreply);
			match = reply.match(/\{@([^\}]*?)\}/);
		}

		// Object caller
		reply = reply.replace(/«__call__»/g, "<call>");
		reply = reply.replace(/«\/__call__»/g, "</call>");
		match = reply.match(/<call>([\s\S]+?)<\/call>/);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				self.warn("Infinite loop looking for call tags!");
				break;
			}

			let parts = utils.trim(match[1]).split(" ");
			let output = self.master.errors.objectNotFound;
			let obj = parts[0];

			// Make the args shell-like.
			let args = [];
			if (parts.length > 1) {
				args = utils.parseCallArgs(parts.slice(1).join(" "));
			}

			// Do we know self object?
			if (obj in self.master._objlangs) {
				// We do, but do we have a handler for that language?
				let lang = self.master._objlangs[obj];
				if (lang in self.master._handlers) {
					try {
						// We do.
						output = (await self.master._handlers[lang].call(self.master, obj, args, scope));
					} catch (error) {
						if (error != undefined) {
							self.warn(error);
						}
						output = "[ERR: Error raised by object macro]";
					}
				} else {
					output = "[ERR: No Object Handler]";
				}
			}
			reply = reply.replace(match[0], output);
			match = reply.match(/<call>(.+?)<\/call>/);
		}
		return reply;
	}

	/**
	string substitute (string msg, string type)

	Run substitutions against a message. `type` is either "sub" or "person" for
	the type of substitution to run.
	*/
	substitute(msg, type) {
		var self = this;

		// Safety checking.
		if (!self.master._sorted[type]) {
			self.master.warn("You forgot to call sortReplies()!");
			return "";
		}

		// Get the substitutions map.
		let subs = type === "sub" ? self.master._sub : self.master._person;

		// Get the max number of words in sub/person to minimize interations
		let maxwords = type === "sub" ? self.master._submax : self.master._personmax;
		let result = "";

		// Take the original message with no punctuation
		var pattern;
		if (self.master.unicodePunctuation != null) {
			pattern = msg.replace(self.master.unicodePunctuation, "");
		} else {
			pattern = msg.replace(/[.,!?;:]/g, "");
		}

		let tries = 0;
		let giveup = 0;
		let subgiveup = 0;

		// Look for words/phrases until there is no "spaces" in pattern
		while (pattern.indexOf(" ") > -1) {
			giveup++;
			// Give up if there are too many substitutions (for safety)
			if (giveup >= 1000) {
				self.warn("Too many loops when handling substitutions!");
				break;
			}

			let li = utils.nIndexOf(pattern, " ", maxwords);
			let subpattern = pattern.substring(0, li);

			// If finds the pattern in sub object replace and stop to look
			result = subs[subpattern];
			if (result !== undefined) {
				msg = msg.replace(subpattern, result);
			} else {
				// Otherwise Look for substitutions in a subpattern
				while (subpattern.indexOf(" ") > -1) {
					subgiveup++;

					// Give up if there are too many substitutions (for safety)
					if (subgiveup >= 1000) {
						self.warn("Too many loops when handling substitutions!");
						break;
					}

					li = subpattern.lastIndexOf(" ");
					subpattern = subpattern.substring(0, li);

					// If finds the subpattern in sub object replace and stop to look
					result = subs[subpattern];
					if (result !== undefined) {
						msg = msg.replace(subpattern, result);
						break;
					}

					tries++;
				}
			}

			let fi = pattern.indexOf(" ");
			pattern = pattern.substring(fi + 1);
			tries++;
		}

		// After all loops, see if just one word is in the pattern
		result = subs[pattern];
		if (result !== undefined) {
			msg = msg.replace(pattern, result);
		}

		return msg;
	}
};

function newHistory() {
	return {
		input: ["undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined"],
		reply: ["undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined"]
	};
}

module.exports = Brain;
