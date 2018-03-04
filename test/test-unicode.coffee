TestCase = require("./test-base")

################################################################################
# Unicode Tests
################################################################################

exports.test_unicode = (test) ->
  bot = new TestCase(test, """
    ! sub who's = who is

    + äh
    - What's the matter?

    + ブラッキー
    - エーフィ

    // Make sure %Previous continues working in UTF-8 mode.
    + knock knock
    - Who's there?

    + *
    % who is there
    - <sentence> who?

    + *
    % * who
    - Haha! <sentence>!

    // And with UTF-8.
    + tëll më ä pöëm
    - Thërë öncë wäs ä män nämëd Tïm

    + more
    % thërë öncë wäs ä män nämëd tïm
    - Whö nëvër qüïtë lëärnëd höw tö swïm

    + more
    % whö nëvër qüïtë lëärnëd höw tö swïm
    - Hë fëll öff ä döck, änd sänk lïkë ä röck

    + more
    % hë fëll öff ä döck änd sänk lïkë ä röck
    - Änd thät wäs thë ënd öf hïm.
  """, {"utf8": true})

  bot.reply("äh", "What's the matter?")
  bot.reply("ブラッキー", "エーフィ")
  bot.reply("knock knock", "Who's there?")
  bot.reply("Orange", "Orange who?")
  bot.reply("banana", "Haha! Banana!")
  bot.reply("tëll më ä pöëm", "Thërë öncë wäs ä män nämëd Tïm")
  bot.reply("more", "Whö nëvër qüïtë lëärnëd höw tö swïm")
  bot.reply("more", "Hë fëll öff ä döck, änd sänk lïkë ä röck")
  bot.reply("more", "Änd thät wäs thë ënd öf hïm.")
  test.done()

exports.test_wildcards = (test) ->
  bot = new TestCase(test, """
    + my name is _
    - Nice to meet you, <star>.

    + i am # years old
    - A lot of people are <star> years old.

    + *
    - No match.
  """, {utf8: true})

  bot.reply("My name is Aiden", "Nice to meet you, aiden.")
  bot.reply("My name is Bảo", "Nice to meet you, bảo.")
  bot.reply("My name is 5", "No match.")

  bot.reply("I am five years old", "No match.")
  bot.reply("I am 5 years old", "A lot of people are 5 years old.")
  test.done()

# The ?Keyword works around `+ [*] keyword [*]` syntax not working with Unicode.
exports.test_unicode_keyword = (test) ->
  bot = new TestCase(test, """
    ? 你好
    - Matched 你好 keyword.

    ? пиво
    - Matched пиво keyword.

    ? some ascii
    - Matched some ascii keyword.
  """, {utf8: true})

  bot.reply("你好", "Matched 你好 keyword.")
  bot.reply("a 你好 b", "Matched 你好 keyword.")
  bot.reply("你好你好你好", "Matched 你好 keyword.")

  bot.reply("пиво", "Matched пиво keyword.")
  bot.reply("x пиво y", "Matched пиво keyword.")
  bot.reply("xпивоy", "Matched пиво keyword.")
  bot.reply("пивопивопиво", "Matched пиво keyword.")

  bot.reply("some ascii", "Matched some ascii keyword.")
  bot.reply("want some ascii?", "Matched some ascii keyword.")
  bot.reply("some ascii is ok", "Matched some ascii keyword.")
  bot.reply("send some ascii to me", "Matched some ascii keyword.")

  test.done()

exports.test_punctuation = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human!
  """, {"utf8": true})

  bot.reply("Hello bot", "Hello human!")
  bot.reply("Hello, bot!", "Hello human!")
  bot.reply("Hello: Bot", "Hello human!")
  bot.reply("Hello... bot?", "Hello human!")

  bot.rs.unicodePunctuation = new RegExp(/xxx/g)
  bot.reply("Hello bot", "Hello human!")
  bot.reply("Hello, bot!", "ERR: No Reply Matched")
  test.done()
