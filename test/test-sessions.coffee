TestCase = require("./test-base")

################################################################################
# Session Handler Tests
################################################################################

exports.test_null_session = (test) ->
  # With a null session handler (implements no functions), user variables
  # can't be persisted.
  bot = new TestCase(test, """
    + my name is *
    - <set name=<formal>>Nice to meet you, <get name>.

    + who am i
    - Aren't you <get name>?

    + what did i just say
    - You just said: <input1>

    + what did you just say
    - I just said: <reply1>

    + i hate you
    - How mean!{topic=apology}

    > topic apology
      + *
      - Nope, I'm mad at you.
    < topic
  """, {sessionHandler: {}})
  bot.reply("my name is aiden", "Nice to meet you, undefined.")
  bot.reply("who am I?", "Aren't you undefined?")
  bot.reply("What did I just say?", "You just said: undefined")
  bot.reply("What did you just say?", "I just said: undefined")
  bot.reply("I hate you", "How mean!")
  bot.reply("My name is Aiden", "Nice to meet you, undefined.")
  test.done()

exports.test_freeze_thaw = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - <set name=<formal>>Nice to meet you, <get name>.

    + who am i
    - Aren't you <get name>?
  """)
  bot.reply("My name is Aiden", "Nice to meet you, Aiden.")
  bot.reply("Who am I?", "Aren't you Aiden?")

  bot.rs.freezeUservars("localuser")
  bot.reply("My name is Bob", "Nice to meet you, Bob.")
  bot.reply("Who am I?", "Aren't you Bob?")

  bot.rs.thawUservars("localuser")
  bot.reply("Who am I?", "Aren't you Aiden?")
  bot.rs.freezeUservars("localuser")

  bot.reply("My name is Bob", "Nice to meet you, Bob.")
  bot.reply("Who am I?", "Aren't you Bob?")
  bot.rs.thawUservars("localuser", "discard")
  bot.reply("Who am I?", "Aren't you Bob?")

  test.done()
