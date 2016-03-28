TestCase = require("./test-base")

################################################################################
# RiveScript API Tests
################################################################################

exports.test_load_directory_recursively = (test) ->
  bot = new TestCase(test, """
    + *
    - No, this failed.
  """)

  bot.rs.loadDirectory('./test/fixtures', ->
    bot.rs.sortReplies()
    bot.reply("Did the root directory rivescript load?", "Yes, the root directory rivescript loaded.")
    bot.reply("Did the recursive directory rivescript load?", "Yes, the recursive directory rivescript loaded.")
    test.done()
  , ->
    test.equal(true, false) # Throw error
  )

exports.test_default_error_messages = (test) ->
  bot = new TestCase(test, """
    + condition only
    * <get name> == Aiden => Your name is Aiden!

    + recursion
    - {@recursion}

    + impossible object
    - Here we go: <call>unhandled</call>

    > object unhandled rust
      return "Hello world"
    < object
  """)

  DEF_NOT_FOUND = "ERR: No Reply Found"
  DEF_NOT_MATCH = "ERR: No Reply Matched"
  DEF_NO_OBJECT = "[ERR: Object Not Found]"
  DEF_RECURSION = "ERR: Deep Recursion Detected"

  bot.reply("condition only", DEF_NOT_FOUND)
  bot.reply("hello bot", DEF_NOT_MATCH)
  bot.reply("impossible object", "Here we go: #{DEF_NO_OBJECT}")
  bot.reply("recursion", DEF_RECURSION)

  # Set some error handlers manually, one at a time.
  bot.rs.errors.replyNotFound = "I didn't find a reply!"
  bot.reply("condition only", "I didn't find a reply!")
  bot.reply("hello bot", DEF_NOT_MATCH)
  bot.reply("impossible object", "Here we go: #{DEF_NO_OBJECT}")
  bot.reply("recursion", DEF_RECURSION)

  bot.rs.errors.replyNotMatched = "I don't even know what to say to that!"
  bot.reply("condition only", "I didn't find a reply!")
  bot.reply("hello bot", "I don't even know what to say to that!")
  bot.reply("impossible object", "Here we go: #{DEF_NO_OBJECT}")
  bot.reply("recursion", DEF_RECURSION)

  bot.rs.errors.objectNotFound = "I can't handle this object!"
  bot.reply("condition only", "I didn't find a reply!")
  bot.reply("hello bot", "I don't even know what to say to that!")
  bot.reply("impossible object", "Here we go: I can't handle this object!")
  bot.reply("recursion", DEF_RECURSION)

  bot.rs.errors.deepRecursion = "I'm going too far down the rabbit hole."
  bot.reply("condition only", "I didn't find a reply!")
  bot.reply("hello bot", "I don't even know what to say to that!")
  bot.reply("impossible object", "Here we go: I can't handle this object!")
  bot.reply("recursion", "I'm going too far down the rabbit hole.")

  test.done()

exports.test_error_constructor_configuration = (test) ->
  bot = new TestCase(test, """
    + condition only
    * <get name> == Aiden => Your name is Aiden!

    + recursion
    - {@recursion}

    + impossible object
    - Here we go: <call>unhandled</call>

    > object unhandled rust
      return "Hello world"
    < object
  """, {
    errors:
      replyNotFound: "I didn't find a reply!"
      replyNotMatched: "I don't even know what to say to that!"
      objectNotFound: "I can't handle this object!"
      deepRecursion: "I'm going too far down the rabbit hole."
  })

  bot.reply("condition only", "I didn't find a reply!")
  bot.reply("hello bot", "I don't even know what to say to that!")
  bot.reply("impossible object", "Here we go: I can't handle this object!")
  bot.reply("recursion", "I'm going too far down the rabbit hole.")

  test.done()
