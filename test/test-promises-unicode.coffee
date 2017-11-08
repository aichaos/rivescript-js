TestCase = require("./test-promises-base")

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

  bot.replyPromisified("äh", "What's the matter?")
  .then -> bot.replyPromisified("ブラッキー", "エーフィ")
  .then -> bot.replyPromisified("knock knock", "Who's there?")
  .then -> bot.replyPromisified("Orange", "Orange who?")
  .then -> bot.replyPromisified("banana", "Haha! Banana!")
  .then -> bot.replyPromisified("tëll më ä pöëm", "Thërë öncë wäs ä män nämëd Tïm")
  .then -> bot.replyPromisified("more", "Whö nëvër qüïtë lëärnëd höw tö swïm")
  .then -> bot.replyPromisified("more", "Hë fëll öff ä döck, änd sänk lïkë ä röck")
  .then -> bot.replyPromisified("more", "Änd thät wäs thë ënd öf hïm.")
  .then -> test.done()

exports.test_wildcards = (test) ->
  bot = new TestCase(test, """
    + my name is _
    - Nice to meet you, <star>.

    + i am # years old
    - A lot of people are <star> years old.

    + *
    - No match.
  """, {utf8: true})

  bot.replyPromisified("My name is Aiden", "Nice to meet you, aiden.")
  .then -> bot.replyPromisified("My name is Bảo", "Nice to meet you, bảo.")
  .then -> bot.replyPromisified("My name is 5", "No match.")
  .then -> bot.replyPromisified("I am five years old", "No match.")
  .then -> bot.replyPromisified("I am 5 years old", "A lot of people are 5 years old.")
  .then -> test.done()

exports.test_punctuation = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human!
  """, {"utf8": true})

  bot.replyPromisified("Hello bot", "Hello human!")
  .then -> bot.replyPromisified("Hello, bot!", "Hello human!")
  .then -> bot.replyPromisified("Hello: Bot", "Hello human!")
  .then -> bot.replyPromisified("Hello... bot?", "Hello human!")
  .then ->
    bot.rs.unicodePunctuation = new RegExp(/xxx/g)
    bot.replyPromisified("Hello bot", "Hello human!")
    .then -> bot.replyPromisified("Hello, bot!", "ERR: No Reply Matched")
  .catch (err) -> test.ok(false, err.stack)
  .then -> test.done()
