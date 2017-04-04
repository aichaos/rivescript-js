TestCase = require("./test-promises-base")

################################################################################
# BEGIN Block Tests
################################################################################

exports.test_no_begin_block = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human.
  """)
  bot.replyPromisified("Hello bot", "Hello human.").then ->
    test.done()

exports.test_simple_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        - {ok}
    < begin

    + hello bot
    - Hello human.
  """)
  bot.replyPromisified("Hello bot.", "Hello human.").then ->
    test.done()

exports.test_blocked_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        - Nope.
    < begin

    + hello bot
    - Hello human.
  """)
  bot.replyPromisified("Hello bot.", "Nope.").then ->
    test.done()

exports.test_conditional_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        * <get met> == undefined => <set met=true>{ok}
        * <get name> != undefined => <get name>: {ok}
        - {ok}
    < begin

    + hello bot
    - Hello human.

    + my name is *
    - <set name=<formal>>Hello, <get name>.
  """)
  bot.replyPromisified("Hello bot.", "Hello human.").then ->
    bot.uservar("met", "true")
    bot.uservar("name", "undefined")
    bot.replyPromisified("My name is bob", "Hello, Bob.")
  .then ->
    bot.uservar("name", "Bob")
    bot.replyPromisified("Hello Bot", "Bob: Hello human.")
  .then ->
    test.done()

exports.test_skip_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        - Nope.
    < begin

    + hello bot
    - Hello human.
  """)

  bot.rs.replyPromisified(bot.username, "Hello bot.", null, true).then (reply) ->
    test.equal(reply, "Hello human.");
    test.done()
