TestCase = require("./test-promises-base")

################################################################################
# Bot Variable Tests
################################################################################

exports.test_bot_variables = (test) ->
   bot = new TestCase(test, """
    ! var name = Aiden
    ! var age = 5

    + what is your name
    - My name is <bot name>.

    + how old are you
    - I am <bot age>.

    + what are you
    - I'm <bot gender>.

    + happy birthday
    - <bot age=6>Thanks!
   """)
   bot.replyPromisified("What is your name?", "My name is Aiden.")
   .then -> bot.replyPromisified("How old are you?", "I am 5.")
   .then -> bot.replyPromisified("What are you?", "I'm undefined.")
   .then -> bot.replyPromisified("Happy birthday!", "Thanks!")
   .then -> bot.replyPromisified("How old are you?", "I am 6.")
   .catch (err) -> test.ok(false, err.stack)
   .then -> test.done()

exports.test_global_variables = (test) ->
  bot = new TestCase(test, """
    ! global debug = false

    + debug mode
    - Debug mode is: <env debug>

    + set debug mode *
    - <env debug=<star>>Switched to <star>.
  """)
  bot.replyPromisified("Debug mode.", "Debug mode is: false")
  .then -> bot.replyPromisified("Set debug mode true", "Switched to true.")
  .then -> bot.replyPromisified("Debug mode?", "Debug mode is: true")
  .catch (err) -> test.ok(false, err.stack)
  .then -> test.done()
