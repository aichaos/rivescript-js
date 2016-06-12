TestCase = require("./test-base")

################################################################################
# Object Macro Tests
################################################################################

exports.test_js_objects = (test) ->
  bot = new TestCase(test, """
    > object nolang
        return "Test w/o language."
    < object

    > object wlang javascript
        return "Test w/ language."
    < object

    > object reverse javascript
        var msg = args.join(" ");
        console.log(msg);
        return msg.split("").reverse().join("");
    < object

    > object broken javascript
        return "syntax error
    < object

    > object foreign perl
        return "Perl checking in!"
    < object

    + test nolang
    - Nolang: <call>nolang</call>

    + test wlang
    - Wlang: <call>wlang</call>

    + reverse *
    - <call>reverse <star></call>

    + test broken
    - Broken: <call>broken</call>

    + test fake
    - Fake: <call>fake</call>

    + test perl
    - Perl: <call>foreign</call>
  """)
  bot.reply("Test nolang", "Nolang: Test w/o language.")
  bot.reply("Test wlang", "Wlang: Test w/ language.")
  bot.reply("Reverse hello world.", "dlrow olleh")
  bot.reply("Test broken", "Broken: [ERR: Object Not Found]")
  bot.reply("Test fake", "Fake: [ERR: Object Not Found]")
  bot.reply("Test perl", "Perl: [ERR: Object Not Found]")
  test.done()

exports.test_disabled_js_language = (test) ->
  bot = new TestCase(test, """
    > object test javascript
        return 'JavaScript here!'
    < object

    + test
    - Result: <call>test</call>
  """)
  bot.reply("test", "Result: JavaScript here!")
  bot.rs.setHandler("javascript", undefined)
  bot.reply("test", "Result: [ERR: No Object Handler]")
  test.done()

exports.test_get_variable = (test) ->
  bot = new TestCase(test, """
    ! var test_var = test

    > object test_get_var javascript
        var uid   = rs.currentUser();
        var name  = "test_var";
        return rs.getVariable(uid, name);
    < object

    + show me var
    - <call> test_get_var </call>
  """)
  bot.reply("show me var", "test")
  test.done()

exports.test_js_string_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + hello
    - hello <call>helper <star></call>
  """)

  input = "hello there"

  bot.rs.setSubroutine("helper", ["return 'person';"])
  bot.reply("hello", "hello person")
  test.done()

exports.test_function_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello person<call>helper <star></call>
  """)

  input = "my name is Rive"

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(rs, bot.rs)
    test.equal(args.length, 1)
    test.equal(args[0], "rive")
    test.done()
  )

  bot.reply(input, "hello person")

exports.test_function_in_setSubroutine_return_value = (test) ->
  bot = new TestCase(test, """
    + hello
    - hello <call>helper <star></call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    "person"
  )

  bot.reply("hello", "hello person")
  test.done()

exports.test_arguments_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello <call>helper <star> 12</call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(args.length, 2)
    test.equal(args[0], "thomas edison")
    test.equal(args[1], "12")
    args[0]
  )

  bot.reply("my name is thomas edison", "hello thomas edison")
  test.done()

exports.test_quoted_strings_arguments_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello <call>helper <star> 12 "another param"</call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(args.length, 3)
    test.equal(args[0], "thomas edison")
    test.equal(args[1], "12")
    test.equal(args[2], "another param")
    args[0]
  )

  bot.reply("my name is thomas edison", "hello thomas edison")
  test.done()

exports.test_arguments_with_funky_spacing_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello <call> helper <star>   12   "another  param" </call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(args.length, 3)
    test.equal(args[0], "thomas edison")
    test.equal(args[1], "12")
    test.equal(args[2], "another  param")
    args[0]
  )

  bot.reply("my name is thomas edison", "hello thomas edison")
  test.done()

exports.test_promises_in_objects = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>helperWithPromise <star></call> with a <call>anotherHelperWithPromise</call>
  """)

  input = "my name is Rive"

  bot.rs.setSubroutine("helperWithPromise", (rs, args) ->
    return new rs.Promise((resolve, reject) ->
      resolve("stranger")
    )
  )

  bot.rs.setSubroutine("anotherHelperWithPromise", (rs) ->
    return new rs.Promise((resolve, reject) ->
      setTimeout () ->
        resolve("delay")
      , 1000
    )
  )

  bot.rs.replyAsync(bot.username, input).then (reply) ->
    test.equal(reply, "hello there stranger with a delay")
    test.done()

exports.test_replyAsync_supports_callbacks = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>asyncHelper</call>
  """)

  input = "my name is Rive"

  bot.rs.setSubroutine("asyncHelper", (rs, args) ->
    return new rs.Promise((resolve, reject) ->
      resolve("stranger")
    )
  )

  bot.rs.replyAsync(bot.username, input, null, (error, reply) ->
    test.ok(!error)
    test.equal(reply, "hello there stranger")
    test.done()
  )

exports.test_use_reply_with_async_subroutines = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>asyncHelper</call>
  """)

  bot.rs.setSubroutine("asyncHelper", (rs, args) ->
    return new rs.Promise((resolve, reject) ->
      resolve("stranger")
    )
  )

  bot.reply("my name is Rive", "hello there [ERR: Using async routine with reply: use replyAsync instead]")
  test.done()

exports.test_errors_in_async_subroutines_with_callbacks = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>asyncHelper</call>
  """)

  errorMessage = "Something went terribly wrong"

  bot.rs.setSubroutine("asyncHelper", (rs, args) ->
    return new rs.Promise((resolve, reject) ->
      reject(new Error(errorMessage))
    )
  )

  bot.rs.replyAsync(bot.username, "my name is Rive", null, (error, reply) ->
    test.ok(error)
    test.equal(error.message, errorMessage)
    test.ok(!reply)
    test.done()
  )

exports.test_errors_in_async_subroutines_with_promises = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>asyncHelper</call>
  """)

  errorMessage = "Something went terribly wrong"

  bot.rs.setSubroutine("asyncHelper", (rs, args) ->
    return new rs.Promise((resolve, reject) ->
      reject(new Error(errorMessage))
    )
  )

  bot.rs.replyAsync(bot.username, "my name is Rive").catch (error) ->
    test.ok(error)
    test.equal(error.message, errorMessage)
    test.done()

exports.test_async_and_sync_subroutines_together = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>asyncHelper</call><call>exclaim</call>
  """)


  bot.rs.setSubroutine("exclaim", (rs, args) ->
    return "!"
  )

  bot.rs.setSubroutine("asyncHelper", (rs, args) ->
    return new rs.Promise((resolve, reject) ->
      resolve("stranger")
    )
  )

  bot.rs.replyAsync(bot.username, "my name is Rive").then (reply) ->
    test.equal(reply, "hello there stranger!")
    test.done()

exports.test_stringify_with_objects = (test) ->
  bot = new TestCase(test, """
    > object hello javascript
      return \"Hello\";
    < object
    + my name is *
    - hello there<call>exclaim</call>
    ^ and i like continues
  """)

  bot.rs.setSubroutine("exclaim", (rs) ->
    return "!"
  )

  src = bot.rs.stringify()
  expect = '! version = 2.0\n! local concat = none\n\n> object hello javascript\n\treturn "Hello";\n< object\n\n> object exclaim javascript\n\treturn "!";\n< object\n\n+ my name is *\n- hello there<call>exclaim</call>and i like continues\n'
  test.equal(src, expect)
  test.done()
