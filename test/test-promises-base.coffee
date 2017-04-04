# Utility functions for the unit tests.

RiveScript = require("../lib/rivescript")

##
# Base class for use with all test cases. Initializes a new RiveScript bot
# with a starting reply base and gets it ready for reply requests.
#
# @param test: The nodeunit test object.
# @param code: Initial source code to load (be mindful of newlines!)
# @param opts: Additional options to pass to RiveScript.
##
class TestCase
    constructor: (test, code, opts = {}) ->
        # this line will cause some tests to fail!
        # opts.debug = true
        @test = test
        @rs = new RiveScript(opts)
        @username = "localuser"
        @extend code

    ##
    # Stream additional code into the bot.
    #
    # @param code: RiveScript document source code.
    ##
    extend: (code) ->
        @rs.stream(code)
        @rs.sortReplies()

    ##
    # Reply assertion: check if the answer to the message is what you expected.
    #
    # @param message: The user's input message.
    # @param expected: The expected response.
    ##
    replyPromisified: (message, expected) ->
      @rs.replyPromisified(@username, message).then (reply) =>
         @test.equal(reply, expected)
         reply

    ##
    # Random reply assertion: check if the answer is in a set of acceptable
    # answers.
    #
    # @param message: The user's input message.
    # @param expected: Array of expected responses.
    ##
    replyRandomPromisified: (message, expected) ->
      @rs.replyPromisified(this.username, message).then (reply) =>
        for expect in expected
          if reply is expect
            @test.ok(true, "Reply matched one of the expected random outputs.")
            return
        @test.ok(false, "Reply (#{reply}) did not match any of the expected outputs.")

    ##
    # User variable assertion.
    #
    # @param name: The variable name.
    # @param expected: The expected value of that name.
    ##
    uservar: (name, expected) ->
        value = @rs.getUservar(@username, name)
        @test.equal(value, expected)

module.exports = TestCase
