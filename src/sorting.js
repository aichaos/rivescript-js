// RiveScript.js
// https://www.rivescript.com/

// This code is released under the MIT License.
// See the "LICENSE" file for more information.

"use strict";

/**
Data sorting functions
*/

const utils = require("./utils");

/**
string[] sortTriggerSet (string[] triggers[, exclude_previous[, func say]])

Sort a group of triggers in an optimal sorting order. The `say` parameter is
a reference to RiveScript.say() or provide your own function (or not) for
debug logging from within this function.

This function has two use cases:

1. create a sort buffer for "normal" (matchable) triggers, which are triggers
   which are NOT accompanied by a %Previous tag.
2. create a sort buffer for triggers that had %Previous tags.

Use the `exclude_previous` parameter to control which one is being done.
This function will return a list of items in the format of
`[ "trigger text", trigger pointer ]` and it's intended to have no duplicate
trigger patterns (unless the source RiveScript code explicitly uses the
same duplicate pattern twice, which is a user error).
*/
exports.sortTriggerSet = function(triggers, exclude_previous, say) {
	var self = this;
	var match;

	if (say == null) {
		say = function(what) {};
	}
	if (exclude_previous == null) {
		exclude_previous = true;
	}

	// KEEP IN MIND: the `triggers` array is composed of array elements of the form
	// ["trigger text", pointer to trigger data]
	// So this code will use e.g. `trig[0]` when referring to the trigger text.

	// Create a priority map.
	let prior = {
		"0": []
	};

	// Sort triggers by their weights.
	for (let i = 0, len = triggers.length; i < len; i++) {
		let trig = triggers[i];

		// If we're excluding triggers with "previous" values, skip them here.
		if (exclude_previous && (trig[1].previous != null)) {
			continue;
		}

		match = trig[0].match(/\{weight=(\d+)\}/i);
		let weight = 0;
		if (match && match[1]) {
			weight = match[1];
		}
		if (prior[weight] == null) {
			prior[weight] = [];
		}
		prior[weight].push(trig);
	}

	// Keep a running list of sorted triggers for this topic.
	let running = [];
	let prior_sort = Object.keys(prior).sort(function(a, b) {
		return b - a;
	});
	for (let j = 0, len1 = prior_sort.length; j < len1; j++) {
		let p = prior_sort[j];
		say(`Sorting triggers with priority ${p}`);

		// So, some of these triggers may include an {inherits} tag, if they came
		// from a topic which inherits another topic. Lower inherits values mean
		// higher priority on the stack.
		let inherits = -1; // -1 means no {inherits} tag
		let highest_inherits = -1; // highest number seen so far

		// Loop through and categorize these triggers.
		let track = {};
		track[inherits] = initSortTrack();
		for (let k = 0, len2 = prior[p].length; k < len2; k++) {
			let trig = prior[p][k];
			let pattern = trig[0];
			say(`Looking at trigger: ${pattern}`);

			// See if it has an inherits tag.
			match = pattern.match(/\{inherits=(\d+)\}/i);
			if (match) {
				inherits = parseInt(match[1]);
				if (inherits > highest_inherits) {
					highest_inherits = inherits;
				}
				say(`Trigger belongs to a topic that inherits other topics. Level=${inherits}`);
				pattern = pattern.replace(/\{inherits=\d+\}/ig, "");
				trig[0] = pattern;
			} else {
				inherits = -1;
			}

			// If this is the first time we've seen this inheritance level,
			// initialize its sort track structure.
			if (track[inherits] == null) {
				track[inherits] = initSortTrack();
			}

			// Start inspecting the trigger's contents.
			if (pattern.indexOf("_") > -1) {
				// Alphabetic wildcard included.
				let cnt = utils.word_count(pattern);
				say(`Has a _ wildcard with ${cnt} words.`);
				if (cnt > 0) {
					if (track[inherits].alpha[cnt] == null) {
						track[inherits].alpha[cnt] = [];
					}
					track[inherits].alpha[cnt].push(trig);
				} else {
					track[inherits].under.push(trig);
				}
			} else if (pattern.indexOf("#") > -1) {
				// Numeric wildcard included.
				let cnt = utils.word_count(pattern);
				say(`Has a # wildcard with ${cnt} words.`);
				if (cnt > 0) {
					if (track[inherits].number[cnt] == null) {
						track[inherits].number[cnt] = [];
					}
					track[inherits].number[cnt].push(trig);
				} else {
					track[inherits].pound.push(trig);
				}
			} else if (pattern.indexOf("*") > -1) {
				// Wildcard included.
				let cnt = utils.word_count(pattern);
				say(`Has a * wildcard with ${cnt} words.`);
				if (cnt > 0) {
					if (track[inherits].wild[cnt] == null) {
						track[inherits].wild[cnt] = [];
					}
					track[inherits].wild[cnt].push(trig);
				} else {
					track[inherits].star.push(trig);
				}
			} else if (pattern.indexOf("[") > -1) {
				// Optionals included.
				let cnt = utils.word_count(pattern);
				say(`Has optionals with ${cnt} words.`);
				if (track[inherits].option[cnt] == null) {
					track[inherits].option[cnt] = [];
				}
				track[inherits].option[cnt].push(trig);
			} else {
				// Totally atomic
				let cnt = utils.word_count(pattern);
				say(`Totally atomic trigger with ${cnt} words.`);
				if (track[inherits].atomic[cnt] == null) {
					track[inherits].atomic[cnt] = [];
				}
				track[inherits].atomic[cnt].push(trig);
			}
		}

		// Move the no-{inherits} triggers to the bottom of the stack.
		track[highest_inherits + 1] = track['-1'];
		delete track['-1'];

		// Add this group to the sort track.
		let track_sorted = Object.keys(track).sort(function(a, b) {
			return a - b;
		});
		for (let l = 0, len3 = track_sorted.length; l < len3; l++) {
			let ip = track_sorted[l];
			say(`ip=${ip}`);

			const groups = ["atomic", "option", "alpha", "number", "wild"];
			// Sort each of the main kinds of triggers by their word counts.
			for (let m = 0, len4 = groups.length; m < len4; m++) {
				let kind = groups[m];
				let kind_sorted = Object.keys(track[ip][kind]).sort(function(a, b) {
					return b - a;
				});

				for (let n = 0, len5 = kind_sorted.length; n < len5; n++) {
					let wordcnt = kind_sorted[n];

					// Triggers with equal word lengths should be sorted by overall
					// trigger length.
					let sorted_by_length = track[ip][kind][wordcnt].sort(function(a, b) {
						return b.length - a.length;
					});
					running.push.apply(running, sorted_by_length);
				}
			}

			// Add the single wildcard triggers.
			let under_sorted = track[ip].under.sort(function(a, b) {
				return b.length - a.length;
			});
			let pound_sorted = track[ip].pound.sort(function(a, b) {
				return b.length - a.length;
			});
			let star_sorted = track[ip].star.sort(function(a, b) {
				return b.length - a.length;
			});
			running.push.apply(running, under_sorted);
			running.push.apply(running, pound_sorted);
			running.push.apply(running, star_sorted);
		}
	}

	return running;
};

/**
string[] sortList (string[] items)

Sort a list of strings by their word counts and lengths.
*/
exports.sortList = function(items) {
	var self = this;

	// Track by number of words.
	let track = {};

	// Loop through each item.
	for (let i = 0, len = items.length; i < len; i++) {
		let item = items[i];
		let cnt = utils.word_count(item, true);
		if (track[cnt] == null) {
			track[cnt] = [];
		}
		track[cnt].push(item);
	}

	// Sort them.
	let output = [];
	let sorted = Object.keys(track).sort(function(a, b) {
		return b - a;
	});
	for (let j = 0, len1 = sorted.length; j < len1; j++) {
		let count = sorted[j];
		let bylen = track[count].sort(function(a, b) {
			return b.length - a.length;
		});
		output.push.apply(output, bylen);
	}

	return output;
};

/**
private object initSortTrack ()

Returns a new object for keeping track of triggers for sorting.
*/
const initSortTrack = function() {
	return {
		atomic: {},
		option: {},
		alpha: {},
		number: {},
		wild: {},
		pound: [],
		under: [],
		star: []
	};
};
