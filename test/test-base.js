/* Utility functions for the unit tests. */

var RiveScript = require("../lib/rivescript");

/**
 * Base class for use with all test cases. Initializes a new RiveScript bot
 * with a starting reply base and gets it ready for reply requests.
 *
 * @param test: The nodeunit test object.
 * @param code: Initial source code to load (be mindful of newlines!)
 * @param opts: Additional options to pass to RiveScript.
 */
function TestCase(test, code, opts) {
    /* Base for all test cases. */
    this.test = test;
    this.rs = new RiveScript(opts);
    this.username = "localuser";
    this.extend(code);
};

/**
 * Stream additional code into the bot.
 *
 * @param code: RiveScript document source code.
 */
TestCase.prototype.extend = function(code) {
    /* Stream code into the bot. */
    this.rs.stream(code);
    this.rs.sortReplies();
};

/**
 * Reply assertion: check if the answer to the message is what you expected.
 *
 * @param message: The user's input message.
 * @param expected: The expected response.
 */
TestCase.prototype.reply = function(message, expected) {
    var reply = this.rs.reply(this.username, message);
    this.test.equal(reply, expected);
}

/**
 * User variable assertion.
 *
 * @param name: The variable name.
 * @param expected: The expected value of that name.
 */
TestCase.prototype.uservar = function(name, expected) {
    var value = this.rs.getUservar(this.username, name);
    this.test.equal(value, expected);
}

module.exports = TestCase;
