TestCase = require("./test-promises-base")

################################################################################
# RiveScript API Tests
################################################################################

exports.test_load_directory_recursively = (test) ->
  bot = new TestCase(test, """
    + *
    - No, this failed.
  """)

  bot.rs.loadDirectory(require('path').join(__dirname, 'fixtures'), ->
    bot.rs.sortReplies()
    bot.replyPromisified("Did the root directory rivescript load?", "Yes, the root directory rivescript loaded.")
    .then -> bot.replyPromisified("Did the recursive directory rivescript load?", "Yes, the recursive directory rivescript loaded.")
    .then -> test.done()
  , (err) ->
    test.ok(false, err.stack) # Throw error
    test.done()
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

  bot.replyPromisified("condition only", DEF_NOT_FOUND)
  .then -> bot.replyPromisified("hello bot", DEF_NOT_MATCH)
  .then -> bot.replyPromisified("impossible object", "Here we go: #{DEF_NO_OBJECT}")
  .then -> bot.replyPromisified("recursion", DEF_RECURSION)

  # Set some error handlers manually, one at a time.
  .then -> 
    bot.rs.errors.replyNotFound = "I didn't find a reply!"
    bot.replyPromisified("condition only", "I didn't find a reply!")
  .then -> bot.replyPromisified("hello bot", DEF_NOT_MATCH)
  .then -> bot.replyPromisified("impossible object", "Here we go: #{DEF_NO_OBJECT}")
  .then -> bot.replyPromisified("recursion", DEF_RECURSION)
  .then -> 
    bot.rs.errors.replyNotMatched = "I don't even know what to say to that!"
    bot.replyPromisified("condition only", "I didn't find a reply!")
  .then -> bot.replyPromisified("hello bot", "I don't even know what to say to that!")
  .then -> bot.replyPromisified("impossible object", "Here we go: #{DEF_NO_OBJECT}")
  .then -> bot.replyPromisified("recursion", DEF_RECURSION)
  .then -> 
    bot.rs.errors.objectNotFound = "I can't handle this object!"
    bot.replyPromisified("condition only", "I didn't find a reply!")
  .then -> bot.replyPromisified("hello bot", "I don't even know what to say to that!")
  .then -> bot.replyPromisified("impossible object", "Here we go: I can't handle this object!")
  .then -> bot.replyPromisified("recursion", DEF_RECURSION)
  .then -> 
    bot.rs.errors.deepRecursion = "I'm going too far down the rabbit hole."
    bot.replyPromisified("condition only", "I didn't find a reply!")
  .then -> bot.replyPromisified("hello bot", "I don't even know what to say to that!")
  .then -> bot.replyPromisified("impossible object", "Here we go: I can't handle this object!")
  .then -> bot.replyPromisified("recursion", "I'm going too far down the rabbit hole.")
  .then -> test.done()

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

  bot.replyPromisified("condition only", "I didn't find a reply!")
  .then -> bot.replyPromisified("hello bot", "I don't even know what to say to that!")
  .then -> bot.replyPromisified("impossible object", "Here we go: I can't handle this object!")
  .then -> bot.replyPromisified("recursion", "I'm going too far down the rabbit hole.")
  .then -> test.done()


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

  bot.replyPromisified("test", "hello")
  .then -> bot.replyPromisified("?", "Wildcard \"\"!")
  .then -> 
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
    bot.replyPromisified("test", "Wildcard \"undefined\"!")
    .then -> bot.replyPromisified("test without redirect", "undefined")

    # Variable set, should respond with text
    .then -> bot.replyPromisified("set test name test", "hello test!")

    # Different variable set, should get wildcard
    .then -> bot.replyPromisified("set test name newtest", "Wildcard \"newtest\"!")

    # Test redirects using bot variable.
    .then -> bot.replyPromisified("get global test", "hello test!")
    .then -> bot.replyPromisified("get bad global test", "Wildcard \"undefined\"!")
  .then -> test.done()

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
  bot.replyPromisified("Hello?", "Oh hi. How are you?")
  .then -> 
    bot.uservar("__lastmatch__", "phrase")
    bot.uservar("__initialmatch__", "(hello|ni hao)")

    bot.replyPromisified("Good!", "That's great.")
  .then ->
    bot.uservar("__lastmatch__", "good")
    bot.uservar("__initialmatch__", "good")

    bot.replyPromisified("Thanks!", "No problem. How are you?")
  .then ->
    bot.uservar("__lastmatch__", "phrase")
    bot.uservar("__initialmatch__", "@thanks{weight=2}")
  .then -> test.done()


exports.test_valid_history = (test) ->
  bot = new TestCase(test, """
    + hello
    - Hi!

    + bye
    - Goodbye!
  """)

  bot.replyPromisified("Hello", "Hi!")
  .then ->
    # Intentionally set a bad history.
    bot.rs.setUservar(bot.username, "__history__", {"input": ["Hello"]})
    bot.replyPromisified("Bye!", "Goodbye!")
  .then -> test.done()
