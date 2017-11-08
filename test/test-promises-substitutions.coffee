TestCase = require("./test-promises-base")

################################################################################
# Substitution Tests
################################################################################

exports.test_substitutions = (test) ->
  bot = new TestCase(test, """
    + whats up
    - nm.

    + what is up
    - Not much.
  """)
  bot.replyPromisified("whats up", "nm.")
  .then -> bot.replyPromisified("what's up?", "nm.")
  .then -> bot.replyPromisified("what is up?", "Not much.")
  .then ->
    bot.extend("""
      ! sub whats  = what is
      ! sub what's = what is
    """)
    bot.replyPromisified("whats up", "Not much.")
    .then -> bot.replyPromisified("what's up?", "Not much.")
    .then -> bot.replyPromisified("What is up?", "Not much.")
  .then -> test.done()

exports.test_person_substitutions = (test) ->
  bot = new TestCase(test, """
    + say *
    - <person>
  """)
  bot.replyPromisified("say I am cool", "i am cool")
  .then -> bot.replyPromisified("say You are dumb", "you are dumb")
  .then ->
    bot.extend("""
        ! person i am    = you are
        ! person you are = I am
    """)
    bot.replyPromisified("say I am cool", "you are cool")
    .then -> bot.replyPromisified("say You are dumb", "I am dumb")
  .then -> test.done()
