TestCase = require("./test-promises-base")

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
  bot.replyPromisified("Hello bot", "Hello human.")
  .then -> bot.replyPromisified("What are you?", "I am a RiveScript bot.")
  .then -> test.done()

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
  bot.replyPromisified("my name is Bob", "Nice to meet you, bob.")
  .then -> bot.replyPromisified("bob told me to say hi", "Why did bob tell you to say hi?")
  .then -> bot.replyPromisified("i am 5 years old", "A lot of people are 5.")
  .then -> bot.replyPromisified("i am five years old", "Say that with numbers.")
  .then -> bot.replyPromisified("i am twenty five years old", "Say that with fewer words.")
  .then -> test.done()

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
  bot.replyPromisified("What are you?", "I am a robot.")
  .then -> bot.replyPromisified("What is you?", "I am a robot.")

  .then -> bot.replyPromisified("What is your home phone number?", "It is 555-1234.")
  .then -> bot.replyPromisified("What is your home number?", "It is 555-1234.")
  .then -> bot.replyPromisified("What is your cell phone number?", "It is 555-1234.")
  .then -> bot.replyPromisified("What is your office number?", "It is 555-1234.")

  .then -> bot.replyPromisified("Can you ask me a question?", "Why is the sky blue?")
  .then -> bot.replyPromisified("Please ask me a question?", "Why is the sky blue?")
  .then -> bot.replyPromisified("Ask me a question.", "Why is the sky blue?")

  .then -> bot.replyPromisified("aa", "Matched.")
  .then -> bot.replyPromisified("bb", "Matched.")
  .then -> bot.replyPromisified("aa bogus", "Matched.")
  .then -> bot.replyPromisified("aabogus", "ERR: No Reply Matched")
  .then -> bot.replyPromisified("bogus", "ERR: No Reply Matched")

  .then -> bot.replyPromisified("hi Aiden", "Matched.")
  .then -> bot.replyPromisified("hi bot how are you?", "Matched.")
  .then -> bot.replyPromisified("yo computer what time is it?", "Matched.")
  .then -> bot.replyPromisified("yoghurt is yummy", "ERR: No Reply Matched")
  .then -> bot.replyPromisified("hide and seek is fun", "ERR: No Reply Matched")
  .then -> bot.replyPromisified("hip hip hurrah", "ERR: No Reply Matched")
  .then -> test.done()

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
  bot.replyPromisified("What color is my red shirt?", "Your shirt is red.")
  .then -> bot.replyPromisified("What color is my blue car?", "Your car is blue.")
  .then -> bot.replyPromisified("What color is my pink house?", "ERR: No Reply Matched")
  .then -> bot.replyPromisified("What color is my dark blue jacket?", "Your jacket is dark blue.")
  .then -> bot.replyPromisified("What color was Napoleoan's white horse?", "It was white.")
  .then -> bot.replyPromisified("What color was my red shirt?", "It was red.")
  .then -> bot.replyPromisified("I have a blue car.", "Tell me more about your car.")
  .then -> bot.replyPromisified("I have a cyan car.", "ERR: No Reply Matched")
  .then -> test.done()

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
  bot.replyPromisified("Hello robot.", "Hi there!")
  .then -> bot.replyPromisified("Hello or something.", "Hi there!")
  .then -> bot.replyPromisified("Can you run a Google search for Node", "Sure!")
  .then -> bot.replyPromisified("Can you run a Google search for Node or something", "Or something. Sure!")
  .then -> bot.replyPromisified("something", "Weighted something")
  .then -> bot.replyPromisified("nothing", "Weighted nothing")
  .then -> bot.replyPromisified("everything", "Weighted everything")
  .then -> bot.replyPromisified("blank", "Weighted blank")
  .then -> test.done()

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
  bot.replyPromisified("Hey!", "Oh hello there.")
  .then -> bot.replyPromisified("sup", "Oh hello there.")
  .then -> bot.replyPromisified("Bye!", "Anything else?")
  .then -> bot.replyPromisified("Love you", "Anything else?")
  .then -> test.done()

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
  bot.replyPromisified("Hey!", "Oh hello there.")
  .then -> bot.replyPromisified("sup", "Oh hello there.")
  .then -> bot.replyPromisified("that's nice to hear", "Oh nice!")
  .then -> bot.replyPromisified("so good", "Oh nice!")
  .then -> bot.replyPromisified("You're hot!", "Purrfect.")
  .then -> bot.replyPromisified("Bye!", "Anything else?")
  .then -> bot.replyPromisified("Love you", "Anything else?")
  .then -> test.done()


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
  bot.replyPromisified("Bot say hey to me", "Oh hello there.")
  .then -> bot.replyPromisified("bot w hi to me", "Oh hello there.")
  .then -> bot.replyPromisified("dog be nice to me", "Oh nice!")
  .then -> bot.replyPromisified("Dog don't be good to me", "Oh nice!")
  .then -> bot.replyPromisified("Cat should not feel warm to me", "Purrfect.")
  .then -> bot.replyPromisified("Bye!", "Anything else?")
  .then -> bot.replyPromisified("Love you", "Anything else?")
  .then -> test.done()


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
  bot.replyPromisified("Test One: hi", "Test1 array match")
  .then -> bot.replyPromisified("Test Two: yeah", "Multi-array match")
  .then -> test.done()
