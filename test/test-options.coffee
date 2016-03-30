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

    > topic a_cool_topic
      + hello
      - Oh hi there.
      ^ Do you liek turtles?
    < topic

  """)

  src = bot.rs.stringify()
  expect = '! version = 2.0\n! local concat = none\n\n+ test *\n- First B line\n^ Second B line\n^ Third B line\n\n> topic a_cool_topic\n\n\t+ hello\n\t- Oh hi there.\n\t^ Do you liek turtles?\n\n< topic\n'
  test.equal(src, expect)
  test.done()
