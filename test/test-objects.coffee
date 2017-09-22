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
  await bot.reply("Test nolang", "Nolang: Test w/o language.")
  await bot.reply("Test wlang", "Wlang: Test w/ language.")
  await bot.reply("Reverse hello world.", "dlrow olleh")
  await bot.reply("Test broken", "Broken: [ERR: Object Not Found]")
  await bot.reply("Test fake", "Fake: [ERR: Object Not Found]")
  await bot.reply("Test perl", "Perl: [ERR: Object Not Found]")
  test.done()

exports.test_disabled_js_language = (test) ->
  bot = new TestCase(test, """
    > object test javascript
        return 'JavaScript here!'
    < object

    + test
    - Result: <call>test</call>
  """)
  await bot.reply("test", "Result: JavaScript here!")
  bot.rs.setHandler("javascript", undefined)
  await bot.reply("test", "Result: [ERR: No Object Handler]")
  test.done()

exports.test_get_variable = (test) ->
  bot = new TestCase(test, """
    ! var test_var = test

    > object test_get_var javascript
        var name  = "test_var";
        return rs.getVariable(name);
    < object

    + show me var
    - <call> test_get_var </call>
  """)
  await bot.reply("show me var", "test")
  test.done()

exports.test_uppercase_call = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        * <bot mood> == happy => {sentence}{ok}{/sentence}
        * <bot mood> == angry => {uppercase}{ok}{/uppercase}
        * <bot mood> == sad   => {lowercase}{ok}{/lowercase}
        - {ok}
    < begin

    > object test javascript
        return "The object result.";
    < object

    // Not much we can do about this part right now... when uppercasing the
    // whole reply the name of the macro is also uppercased. *shrug*
    > object TEST javascript
        return "The object result.";
    < object

    + *
    - Hello there. <call>test <star></call>
  """)
  await bot.reply("hello", "Hello there. The object result.")

  bot.rs.setVariable("mood", "happy")
  await bot.reply("hello", "Hello there. The object result.")

  bot.rs.setVariable("mood", "angry")
  await bot.reply("hello", "HELLO THERE. THE OBJECT RESULT.")

  bot.rs.setVariable("mood", "sad")
  await bot.reply("hello", "hello there. the object result.")

  test.done()

exports.test_objects_in_conditions = (test) ->
  bot = new TestCase(test, """
    // Normal synchronous object that returns an immediate response.
    > object test_condition javascript
      return args[0] === "1" ? "true" : "false";
    < object

    // Asynchronous object that returns a promise. This isn't supported
    // in a conditional due to the immediate/urgent nature of the result.
    > object test_async_condition javascript
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(args[0] === "1" ? "true" : "false");
        }, 10);
      });
    < object

    + test sync *
    * <call>test_condition <star></call> == true  => True.
    * <call>test_condition <star></call> == false => False.
    - Call failed.

    + test async *
    * <call>test_async_condition <star></call> == true  => True.
    * <call>test_async_condition <star></call> == false => False.
    - Call failed.

    + call sync *
    - Result: <call>test_condition <star></call>

    + call async *
    - Result: <call>test_async_condition <star></call>
  """)
  # First, make sure the sync object works.
  await bot.reply("call sync 1", "Result: true")
  await bot.reply("call sync 0", "Result: false")
  await bot.reply("call async 1", "Result: true")

  # Test the synchronous object in a conditional.
  await bot.reply("test sync 1", "True.")
  await bot.reply("test sync 2", "False.")
  await bot.reply("test sync 0", "False.")
  await bot.reply("test sync x", "False.")

  # Test the async object on its own and then in a conditional. This code looks
  # ugly, but `test.done()` must be called only when all tests have resolved
  # so we have to nest a couple of the promise-based tests this way.
  bot.rs.reply(bot.username, "call async 1").then((reply) ->
    test.equal(reply, "Result: true")
    bot.rs.reply(bot.username, "test async 1").then((reply) ->
      test.equal(reply, "True.")
      test.done()
    )
  )

exports.test_line_breaks_in_call = (test) ->
  bot = new TestCase(test, """
    > object macro javascript
      var a = args.join("; ");
      return a;
    < object

    // Variables with newlines aren't expected to interpolate, because
    // tag processing only happens in one phase.
    ! var name = name with\\nnew line

    + test literal newline
    - <call>macro "argumentwith\\nnewline"</call>

    + test botvar newline
    - <call>macro "<bot name>"</call>
  """)
  await bot.reply("test literal newline", "argumentwith\nnewline")
  await bot.reply("test botvar newline", "name with\\nnew line")
  test.done()

exports.test_js_string_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + hello
    - hello <call>helper <star></call>
  """)

  input = "hello there"

  bot.rs.setSubroutine("helper", ["return 'person';"])
  await bot.reply("hello", "hello person")
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

  await bot.reply(input, "hello person")

exports.test_function_in_setSubroutine_return_value = (test) ->
  bot = new TestCase(test, """
    + hello
    - hello <call>helper <star></call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    "person"
  )

  await bot.reply("hello", "hello person")
  test.done()

exports.test_arguments_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello <call>helper "<star>" 12</call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(args.length, 2)
    test.equal(args[0], "thomas edison")
    test.equal(args[1], "12")
    args[0]
  )

  await bot.reply("my name is thomas edison", "hello thomas edison")
  test.done()

exports.test_quoted_strings_arguments_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello <call>helper "<star>" 12 "another param"</call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(args.length, 3)
    test.equal(args[0], "thomas edison")
    test.equal(args[1], "12")
    test.equal(args[2], "another param")
    args[0]
  )

  await bot.reply("my name is thomas edison", "hello thomas edison")
  test.done()

exports.test_arguments_with_funky_spacing_in_setSubroutine = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello <call> helper "<star>"   12   "another  param" </call>
  """)

  bot.rs.setSubroutine("helper", (rs, args) ->
    test.equal(args.length, 3)
    test.equal(args[0], "thomas edison")
    test.equal(args[1], "12")
    test.equal(args[2], "another  param")
    args[0]
  )

  await bot.reply("my name is thomas edison", "hello thomas edison")
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
      , 10
    )
  )

  bot.rs.reply(bot.username, input).then (reply) ->
    test.equal(reply, "hello there stranger with a delay")
    test.done()

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

  await bot.reply("my name is Rive", "hello there stranger")
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

  bot.rs.reply(bot.username, "my name is Rive").then (reply) ->
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
