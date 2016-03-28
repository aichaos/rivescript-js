TestCase = require("./test-base")

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
  bot.reply("whats up", "nm.")
  bot.reply("what's up?", "nm.")
  bot.reply("what is up?", "Not much.")

  bot.extend("""
    ! sub whats  = what is
    ! sub what's = what is
  """)
  bot.reply("whats up", "Not much.")
  bot.reply("what's up?", "Not much.")
  bot.reply("What is up?", "Not much.")
  test.done()

exports.test_person_substitutions = (test) ->
  bot = new TestCase(test, """
    + say *
    - <person>
  """)
  bot.reply("say I am cool", "i am cool")
  bot.reply("say You are dumb", "you are dumb")

  bot.extend("""
      ! person i am    = you are
      ! person you are = I am
  """)
  bot.reply("say I am cool", "you are cool")
  bot.reply("say You are dumb", "I am dumb")
  test.done()
