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
    test.equal(reply, "Hello human.")
    test.done()

exports.test_redirects_in_begin = (test) ->
    bot = new TestCase(test, """
        > begin
        + request
        * <get welcomed> == undefined => {@ hello}
        * <get welcomed> == 1 => {ok}
        - {ok}
        < begin

        + hello
        - <set welcomed=1>Hello human.

        + *
        - Hi Again
    """)

    bot.replyPromisified("I'm not welcomed yet", "Hello human.")
    .then (reply) -> bot.replyPromisified("Now I am welcomed", "Hi Again")
    .then ->
        bot = new TestCase(test, """
          > begin
           + request
           * <get welcomed> != 1 => {topic=intro}{ok}
           - {ok}
          < begin

          > topic intro
          + hello
          - <set welcomed=1>hi{topic=next}

          + *
          - not here
          < topic

          > topic next
          + next
          - in next

          + *
          - nope
          < topic
        """, "debug":true)
        bot.replyPromisified("hello", "hi")
        .then -> bot.replyPromisified("next", "in next")
    .then -> test.done()

