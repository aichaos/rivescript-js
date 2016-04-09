TestCase = require("./test-base")

################################################################################
# Trigger Tests
################################################################################

exports.test_atomic_triggers = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human.

    + what are you
    - I am a RiveScript bot.
  """)
  bot.reply("Hello bot", "Hello human.")
  bot.reply("What are you?", "I am a RiveScript bot.")
  test.done()

exports.test_wildcard_triggers = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - Nice to meet you, <star>.

    + * told me to say *
    - Why did <star1> tell you to say <star2>?

    + i am # years old
    - A lot of people are <star>.

    + i am _ years old
    - Say that with numbers.

    + i am * years old
    - Say that with fewer words.
  """)
  bot.reply("my name is Bob", "Nice to meet you, bob.")
  bot.reply("bob told me to say hi", "Why did bob tell you to say hi?")
  bot.reply("i am 5 years old", "A lot of people are 5.")
  bot.reply("i am five years old", "Say that with numbers.")
  bot.reply("i am twenty five years old", "Say that with fewer words.")
  test.done()

exports.test_alternatives_and_optionals = (test) ->
  bot = new TestCase(test, """
    + what (are|is) you
    - I am a robot.

    + what is your (home|office|cell) [phone] number
    - It is 555-1234.

    + [please|can you] ask me a question
    - Why is the sky blue?

    + (aa|bb|cc) [bogus]
    - Matched.

    + (yo|hi) [computer|bot] *
    - Matched.
  """)
  bot.reply("What are you?", "I am a robot.")
  bot.reply("What is you?", "I am a robot.")

  bot.reply("What is your home phone number?", "It is 555-1234.")
  bot.reply("What is your home number?", "It is 555-1234.")
  bot.reply("What is your cell phone number?", "It is 555-1234.")
  bot.reply("What is your office number?", "It is 555-1234.")

  bot.reply("Can you ask me a question?", "Why is the sky blue?")
  bot.reply("Please ask me a question?", "Why is the sky blue?")
  bot.reply("Ask me a question.", "Why is the sky blue?")

  bot.reply("aa", "Matched.")
  bot.reply("bb", "Matched.")
  bot.reply("aa bogus", "Matched.")
  bot.reply("aabogus", "ERR: No Reply Matched")
  bot.reply("bogus", "ERR: No Reply Matched")

  bot.reply("hi Aiden", "Matched.")
  bot.reply("hi bot how are you?", "Matched.")
  bot.reply("yo computer what time is it?", "Matched.")
  bot.reply("yoghurt is yummy", "ERR: No Reply Matched")
  bot.reply("hide and seek is fun", "ERR: No Reply Matched")
  bot.reply("hip hip hurrah", "ERR: No Reply Matched")
  test.done()

exports.test_trigger_arrays = (test) ->
  bot = new TestCase(test, """
    ! array colors = red blue green yellow white
      ^ dark blue|light blue

    + what color is my (@colors) *
    - Your <star2> is <star1>.

    + what color was * (@colors) *
    - It was <star2>.

    + i have a @colors *
    - Tell me more about your <star>.
  """)
  bot.reply("What color is my red shirt?", "Your shirt is red.")
  bot.reply("What color is my blue car?", "Your car is blue.")
  bot.reply("What color is my pink house?", "ERR: No Reply Matched")
  bot.reply("What color is my dark blue jacket?", "Your jacket is dark blue.")
  bot.reply("What color was Napoleoan's white horse?", "It was white.")
  bot.reply("What color was my red shirt?", "It was red.")
  bot.reply("I have a blue car.", "Tell me more about your car.")
  bot.reply("I have a cyan car.", "ERR: No Reply Matched")
  test.done()

exports.test_weighted_triggers = (test) ->
  bot = new TestCase(test, """
    + * or something{weight=10}
    - Or something. <@>

    + can you run a google search for *
    - Sure!

    + hello *{weight=20}
    - Hi there!
  """)
  bot.reply("Hello robot.", "Hi there!")
  bot.reply("Hello or something.", "Hi there!")
  bot.reply("Can you run a Google search for Node", "Sure!")
  bot.reply("Can you run a Google search for Node or something", "Or something. Sure!")
  test.done()


exports.test_empty_piped_arrays = (test) ->
  bot = new TestCase(test, """
    ! array hello = hi|hey|sup|yo|

    + [*] @hello [*]
    - Oh hello there.

    + *
    - Anything else?
  """)
  bot.reply("Hey!", "Oh hello there.")
  bot.reply("sup", "Oh hello there.")
  bot.reply("Bye!", "Anything else?")
  bot.reply("Love you", "Anything else?")
  test.done()