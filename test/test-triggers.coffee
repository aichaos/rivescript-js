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

    // Test that spaces before or after the {weight} tag are gobbled up along
    // with the {weight} tag itself.

    + something{weight=100}
    - Weighted something

    + something
    - Unweighted something

    + nothing {weight=100}
    - Weighted nothing

    + nothing
    - Unweighted nothing

    + {weight=100}everything
    - Weighted everything

    + everything
    - Unweighted everything

    + {weight=100}   blank
    - Weighted blank

    + blank
    - Unweighted blank
  """)
  bot.reply("Hello robot.", "Hi there!")
  bot.reply("Hello or something.", "Hi there!")
  bot.reply("Can you run a Google search for Node", "Sure!")
  bot.reply("Can you run a Google search for Node or something", "Or something. Sure!")
  bot.reply("something", "Weighted something")
  bot.reply("nothing", "Weighted nothing")
  bot.reply("everything", "Weighted everything")
  bot.reply("blank", "Weighted blank")
  test.done()

exports.test_empty_piped_arrays = (test) ->
  errors = []
  expected_errors = [
    'Syntax error: Piped arrays can\'t begin or end with a | at stream() line 1 near ! array hello = hi|hey|sup|yo| (in topic random)'
    'Syntax error: Piped arrays can\'t begin or end with a | at stream() line 2 near ! array something = |something|some thing (in topic random)'
    'Syntax error: Piped arrays can\'t include blank entries at stream() line 3 near ! array nothing = nothing||not a thing (in topic random)'
  ]

  console.error = (text)->
    errors.push(text)

  bot = new TestCase(test, """
    ! array hello = hi|hey|sup|yo|
    ! array something = |something|some thing
    ! array nothing = nothing||not a thing

    + [*] @hello [*]
    - Oh hello there.

    + *
    - Anything else?
  """)

  # Check that errors were thrown
  test.deepEqual(errors, expected_errors)

  # We also fix these, so these should also work
  bot.reply("Hey!", "Oh hello there.")
  bot.reply("sup", "Oh hello there.")
  bot.reply("Bye!", "Anything else?")
  bot.reply("Love you", "Anything else?")
  test.done()

exports.test_empty_piped_alternations = (test) ->
  errors = []
  expected_errors = [
    'Syntax error: Piped alternations can\'t begin or end with a | at stream() line 1 near + [*] (hi|hey|sup|yo|) [*] (in topic random)'
    'Syntax error: Piped alternations can\'t begin or end with a | at stream() line 4 near + [*] (|good|great|nice) [*] (in topic random)'
    'Syntax error: Piped alternations can\'t include blank entries at stream() line 7 near + [*] (mild|warm||hot) [*] (in topic random)'
  ]

  console.error = (text)->
    errors.push(text)

  bot = new TestCase(test, """
    + [*] (hi|hey|sup|yo|) [*]
    - Oh hello there.

    + [*] (|good|great|nice) [*]
    - Oh nice!

    + [*] (mild|warm||hot) [*]
    - Purrfect.

    + *
    - Anything else?
  """)

  # Check that errors were thrown
  test.deepEqual(errors, expected_errors)

  # We also fix these, so these should also work
  bot.reply("Hey!", "Oh hello there.")
  bot.reply("sup", "Oh hello there.")
  bot.reply("that's nice to hear", "Oh nice!")
  bot.reply("so good", "Oh nice!")
  bot.reply("You're hot!", "Purrfect.")
  bot.reply("Bye!", "Anything else?")
  bot.reply("Love you", "Anything else?")
  test.done()


exports.test_empty_piped_optionals = (test) ->
  errors = []
  expected_errors = [
    'Syntax error: Piped optionals can\'t begin or end with a | at stream() line 1 near + bot [*] [hi|hey|sup|yo|] [*] to me (in topic random)'
    'Syntax error: Piped optionals can\'t begin or end with a | at stream() line 4 near + dog [*] [|good|great|nice] [*] to me (in topic random)'
    'Syntax error: Piped optionals can\'t include blank entries at stream() line 7 near + cat [*] [mild|warm||hot] [*] to me (in topic random)'
  ]

  console.error = (text)->
    errors.push(text)

  bot = new TestCase(test, """
    + bot [*] [hi|hey|sup|yo|] [*] to me
    - Oh hello there.

    + dog [*] [|good|great|nice] [*] to me
    - Oh nice!

    + cat [*] [mild|warm||hot] [*] to me
    - Purrfect.

    + *
    - Anything else?
  """)

  # Check that errors were thrown
  test.deepEqual(errors, expected_errors)

  # We also fix these, so these should also work
  bot.reply("Bot say hey to me", "Oh hello there.")
  bot.reply("bot w hi to me", "Oh hello there.")
  bot.reply("dog be nice to me", "Oh nice!")
  bot.reply("Dog don't be good to me", "Oh nice!")
  bot.reply("Cat should not feel warm to me", "Purrfect.")
  bot.reply("Bye!", "Anything else?")
  bot.reply("Love you", "Anything else?")
  test.done()


exports.test_empty_piped_missing_arrays = (test) ->
  # Test case where an array reference is missing, and check that
  # compiled regexp does not render as accidental wildcard of `||`
  bot = new TestCase(test, """
    ! array test1 = hi|hey|sup|yo
    ! array test2 = yes|yeah|yep
    ! array test3 = bye|goodbye||byebye

    // This trigger has an array reference that does not exist
    // Check that new code prevents accidental double-pipe wildcard match
    // e.g.  /hi|hey|sup|yo||bye|goodbye|byebye/
    // should become  /hi|hey|sup|yo|bye|goodbye|byebye/
    + [*] (@test2|@test4|@test3) [*]
    - Multi-array match

    // Normal array trigger
    + [*] (@test1) [*]
    - Test1 array match

  """)

  # We also fix these, so these should also work
  bot.reply("Test One: hi", "Test1 array match")
  bot.reply("Test Two: yeah", "Multi-array match")
  test.done()
