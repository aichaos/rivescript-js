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
    constructor: (test, code, opts) ->
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
    # Remove a single topic from the bot
    #
    # @param string: Name of the topic to remove
    ##
    purgeTopic: (topic) ->
        @rs.removeTopic(topic)
        @rs.sortReplies()

    ##
    # Reply assertion: check if the answer to the message is what you expected.
    #
    # @param message: The user's input message.
    # @param expected: The expected response.
    ##
    reply: (message, expected) ->
        reply = @rs.reply(this.username, message)
        @test.equal(reply, expected, "Failed responding to '" + message + "' Expected '" + expected + "' got '" + reply + "'")

    ##
    # Random reply assertion: check if the answer is in a set of acceptable
    # answers.
    #
    # @param message: The user's input message.
    # @param expected: Array of expected responses.
    ##
    replyRandom: (message, expected) ->
      reply = @rs.reply(this.username, message)
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
        value = @rs.getUservar(@username, name);
        @test.equal(value, expected);
    
    ##
    # User variable dump assertion.
    #
    # @param expected: The expected value of all data
    ##
    uservars: (expected) ->
        value = @rs.getUservars(@username)
        @test.deepEqual(value, expected)

    ##
    # Bot variable assertion.
    #
    # @param name: The variable name.
    # @param expected: The expected value of that name.
    ##
    botvar: (name, expected) ->
        value = @rs.getBotvar(name)
        @test.equal(value, expected)
    
    ##
    # Bot variable dump assertion.
    #
    # @param expected: The expected value of all data
    ##
    botvars: (expected) ->
        value = @rs.getBotvars()
        @test.deepEqual(value, expected)

module.exports = TestCase
