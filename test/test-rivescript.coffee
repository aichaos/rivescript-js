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


exports.test_redirect_with_undefined_input = (test) ->
  # <@> test
  bot = new TestCase(test, """
    + test
    - {topic=test}{@hi}

    > topic test
      + hi
      - hello

      + *
      - {topic=random}<@>
    < topic

    + *
    - Wildcard "<star>"!
  """)

  bot.reply("test", "hello")
  bot.reply("?", "Wildcard \"\"!")


  # empty variable test
  bot = new TestCase(test, """
    ! var globaltest = set test name test

    + test
    - {topic=test}{@<get test_name>}

    + test without redirect
    - {topic=test}<get test_name>

    + set test name *
    - <set test_name=<star>>{@test}

    + get global test
    @ <bot globaltest>

    + get bad global test
    @ <bot badglobaltest>

    > topic test
      + test
      - hello <get test_name>!{topic=random}

      + *
      - {topic=random}<@>
    < topic

    + *
    - Wildcard "<star>"!
  """)

  # No variable set, should go through wildcard
  bot.reply("test", "Wildcard \"undefined\"!")
  bot.reply("test without redirect", "undefined")

  # Variable set, should respond with text
  bot.reply("set test name test", "hello test!")

  # Different variable set, should get wildcard
  bot.reply("set test name newtest", "Wildcard \"newtest\"!")

  # Test redirects using bot variable.
  bot.reply("get global test", "hello test!")
  bot.reply("get bad global test", "Wildcard \"undefined\"!")



  test.done()

exports.test_initialmatch = (test) ->
  bot = new TestCase(test, """
    ! array thanks = thanks|thank you

    + (hello|ni hao)
    @ hi

    + hi
    - Oh hi. {@phrase}

    + phrase
    - How are you?

    + good
    - That's great.

    + @thanks{weight=2}
    - No problem. {@phrase}

    + *
    - I don't know.
  """)
  bot.reply("Hello?", "Oh hi. How are you?")
  bot.uservar("__lastmatch__", "phrase")
  bot.uservar("__initialmatch__", "(hello|ni hao)")

  bot.reply("Good!", "That's great.")
  bot.uservar("__lastmatch__", "good")
  bot.uservar("__initialmatch__", "good")

  bot.reply("Thanks!", "No problem. How are you?")
  bot.uservar("__lastmatch__", "phrase")
  bot.uservar("__initialmatch__", "@thanks{weight=2}")

  test.done()


exports.test_valid_history = (test) ->
  bot = new TestCase(test, """
    + hello
    - Hi!

    + bye
    - Goodbye!
  """)

  bot.reply("Hello", "Hi!")

  # Intentionally set a bad history.
  bot.rs.setUservar(bot.username, "__history__", {"input": ["Hello"]})

  bot.reply("Bye!", "Goodbye!")

  test.done()
