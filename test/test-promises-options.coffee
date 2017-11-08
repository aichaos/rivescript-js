TestCase = require("./test-base")

################################################################################
# Parser option tests
################################################################################

exports.test_concat = (test) ->
  bot = new TestCase(test, """
    // Default concat mode = none
    + test concat default
    - Hello
    ^ world!

    ! local concat = space
    + test concat space
    - Hello
    ^ world!

    ! local concat = none
    + test concat none
    - Hello
    ^ world!

    ! local concat = newline
    + test concat newline
    - Hello
    ^ world!

    // invalid concat setting is equivalent to 'none'
    ! local concat = foobar
    + test concat foobar
    - Hello
    ^ world!

    // the option is file scoped so it can be left at
    // any setting and won't affect subsequent parses
    ! local concat = newline
  """)
  bot.extend("""
    // concat mode should be restored to the default in a
    // separate file/stream parse
    + test concat second file
    - Hello
    ^ world!
  """)

  bot.reply("test concat default", "Helloworld!")
  bot.reply("test concat space", "Hello world!")
  bot.reply("test concat none", "Helloworld!")
  bot.reply("test concat newline", "Hello\nworld!")
  bot.reply("test concat foobar", "Helloworld!")
  bot.reply("test concat second file", "Helloworld!")

  test.done()

exports.test_concat_with_conditionals = (test) ->
  # Newline
  bot = new TestCase(test, """
    ! local concat = newline

    + test *
    * <star1> == a => First A line
    ^ Second A line
    ^ Third A line
    - First B line
    ^ Second B line
    ^ Third B line
  """)

  bot.reply("test a", "First A line\nSecond A line\nThird A line")
  bot.reply("test b", "First B line\nSecond B line\nThird B line")

  # Space
  bot = new TestCase(test, """
    ! local concat = space

    + test *
    * <star1> == a => First A line
    ^ Second A line
    ^ Third A line
    - First B line
    ^ Second B line
    ^ Third B line
  """)

  bot.reply("test a", "First A line Second A line Third A line")
  bot.reply("test b", "First B line Second B line Third B line")

  # No concat
  bot = new TestCase(test, """
    + test *
    * <star1> == a => First A line
    ^ Second A line
    ^ Third A line
    - First B line
    ^ Second B line
    ^ Third B line
  """)

  bot.reply("test a", "First A lineSecond A lineThird A line")
  bot.reply("test b", "First B lineSecond B lineThird B line")

  test.done()

exports.test_concat_space_with_conditionals = (test) ->
  bot = new TestCase(test, """
    ! local concat = newline

    + test *
    * <star1> == a => First A line
    ^ Second A line
    ^ Third A line
    - First B line
    ^ Second B line
    ^ Third B line
  """)

  bot.reply("test a", "First A line\nSecond A line\nThird A line")
  bot.reply("test b", "First B line\nSecond B line\nThird B line")
  test.done()

exports.test_concat_newline_stringify = (test) ->
  bot = new TestCase(test, """
    ! local concat = newline

    + test *
    - First B line
    ^ Second B line
    ^ Third B line

    + status is *
    * <star1> == good => All good!
    ^ Congrats!
    ^ Have fun!
    * <star1> == bad => Oh no.
    ^ That sucks.
    ^ Try again.
    - I didn't get that.
    ^ What did you say?

    > topic a_cool_topic
      + hello
      - Oh hi there.
      ^ Do you liek turtles?
    < topic

  """)

  src = bot.rs.stringify()
  expect = '! version = 2.0\n! local concat = none\n\n+ test *\n- First B line\\nSecond B line\\nThird B line\n\n+ status is *\n* <star1> == good => All good!\\nCongrats!\\nHave fun!\n* <star1> == bad => Oh no.\\nThat sucks.\\nTry again.\n- I didn\'t get that.\\nWhat did you say?\n\n> topic a_cool_topic\n\n\t+ hello\n\t- Oh hi there.\\nDo you liek turtles?\n\n< topic\n'
  test.equal(src, expect)
  test.done()

exports.test_force_case = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human!

    // Note the capital "I", this would raise a parse error normally.
    + I am # years old
    - <set age=<star>>A lot of people are <get age>.

    + enter topic
    - Enter topic via topic tag.{topic=CapsTopic}

    > topic CapsTopic
        + *
        - The topic worked!{topic=random}
    < topic
  """, { forceCase: true })

  bot.reply("hello bot", "Hello human!")
  bot.reply("i am 5 years old", "A lot of people are 5.")
  bot.reply("I am 6 years old", "A lot of people are 6.")
  bot.rs.setUservar("localuser", "topic", "CapsTopic")
  bot.reply("hello", "The topic worked!")
  bot.reply("enter topic", "Enter topic via topic tag.")
  bot.reply("hello", "The topic worked!")
  test.done()

exports.test_no_force_case = (test) ->
  bot = new TestCase(test, "")
  try
    bot.extend("""
      + I am # years old
      - <set age=<star>>A lot of people are <get age>.
    """)
  catch e
    # An exception was expected here.
    test.equal(e, "Syntax error: Triggers may only contain lowercase letters, numbers, and these symbols: ( | ) [ ] * _ # { } < > = at stream() line 1 near + I am # years old")

  test.done()
