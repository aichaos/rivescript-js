// This controllers module serves as an example for how multiple object
// macros can effectively do `require("./controllers")` without actually
// needing to keep importing it over and over again.

// Instead, the main bot program (`router.js`) imports this module one time,
// and defines all the object macros via `setSubroutine()` so they all have
// access to the global scope and can use the methods in this module.

// doMath takes a math operation and two numbers.
module.exports.doMath = function(oper, a, b) {
	a = parseFloat(a), b = parseFloat(b);

	if (oper.match(/^divided?$/)) {
		if (b != 0) {
			return a / b;
		}
		else {
			return "Zero divison error.";
		}
	}
	else if (oper.match(/^(multipl(?:ied|y)?|times)$/)) {
		return a * b;
	}
	else if (oper.match(/^add(?:ed)?$/)) {
		return a + b;
	}
	else if (oper.match(/^(subtract(?:ed)?|minus)$/)) {
		return a - b;
	}
	else {
		return "I don't know how to '" + oper + "' those numbers.";
	}
};

// doReverse takes a string of text and reverses it.
module.exports.doReverse = function(text) {
	return text.split("").reverse().join("");
};

// doWildcard suggests other messages for the user to try.
module.exports.doWildcard = function(rs, args) {
	var text = args.join(" ");

	// You could log the uncaught message somewhere to give the botmaster
	// some tips for new triggers to cover.
	console.log("[Captain's Log] Unhandled message: " + text);

	// Return a list of suggested messages for the user to try.
	return "No reply for that one. Try one of these:\n" +
		"   add 5 and 7\n" +
		"   what is 12 divided by 3\n" +
		"   reverse hello world\n" +
		"   say hi robot to me backwards";
}
