TestCase = require("./test-base")

################################################################################
# BEGIN Block Tests
################################################################################

exports.test_no_begin_block = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human.
  """)
  bot.reply("Hello bot", "Hello human.")
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
  bot.reply("Hello bot.", "Hello human.")
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
  bot.reply("Hello bot.", "Nope.")
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
  bot.reply("Hello bot.", "Hello human.")
  bot.uservar("met", "true")
  bot.uservar("name", "undefined")
  bot.reply("My name is bob", "Hello, Bob.")
  bot.uservar("name", "Bob")
  bot.reply("Hello Bot", "Bob: Hello human.")
  test.done()
