TestCase = require("./test-base")

################################################################################
# BEGIN Block Tests
################################################################################

exports.test_no_begin_block = (test) ->
  bot = new TestCase(test, """
    + hello bot
    - Hello human.
  """)
  bot.reply("Hello bot", "Hello human.")
  test.done()

exports.test_simple_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        - {ok}
    < begin

    + hello bot
    - Hello human.
  """)
  bot.reply("Hello bot.", "Hello human.")
  test.done()

exports.test_blocked_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        - Nope.
    < begin

    + hello bot
    - Hello human.
  """)
  bot.reply("Hello bot.", "Nope.")
  test.done()

exports.test_conditional_begin_block = (test) ->
  bot = new TestCase(test, """
    > begin
        + request
        * <get met> == undefined => <set met=true>{ok}
        * <get name> != undefined => <get name>: {ok}
        - {ok}
    < begin

    + hello bot
    - Hello human.

    + my name is *
    - <set name=<formal>>Hello, <get name>.
  """)
  bot.reply("Hello bot.", "Hello human.")
  bot.uservar("met", "true")
  bot.uservar("name", "undefined")
  bot.reply("My name is bob", "Hello, Bob.")
  bot.uservar("name", "Bob")
  bot.reply("Hello Bot", "Bob: Hello human.")
  test.done()

################################################################################
# Bot Variable Tests
################################################################################

exports.test_bot_variables = (test) ->
   bot = new TestCase(test, """
    ! var name = Aiden
    ! var age = 5

    + what is your name
    - My name is <bot name>.

    + how old are you
    - I am <bot age>.

    + what are you
    - I'm <bot gender>.

    + happy birthday
    - <bot age=6>Thanks!
   """)
   bot.reply("What is your name?", "My name is Aiden.")
   bot.reply("How old are you?", "I am 5.")
   bot.reply("What are you?", "I'm undefined.")
   bot.reply("Happy birthday!", "Thanks!")
   bot.reply("How old are you?", "I am 6.")
   test.done()

exports.test_global_variables = (test) ->
  bot = new TestCase(test, """
    ! global debug = false

    + debug mode
    - Debug mode is: <env debug>

    + set debug mode *
    - <env debug=<star>>Switched to <star>.
  """)
  bot.reply("Debug mode.", "Debug mode is: false")
  bot.reply("Set debug mode true", "Switched to true.")
  bot.reply("Debug mode?", "Debug mode is: true")
  test.done()

################################################################################
# Substitution Tests
################################################################################

exports.test_substitutions = (test) ->
  bot = new TestCase(test, """
    + whats up
    - nm.

    + what is up
    - Not much.
  """)
  bot.reply("whats up", "nm.")
  bot.reply("what's up?", "nm.")
  bot.reply("what is up?", "Not much.")

  bot.extend("""
    ! sub whats  = what is
    ! sub what's = what is
  """)
  bot.reply("whats up", "Not much.")
  bot.reply("what's up?", "Not much.")
  bot.reply("What is up?", "Not much.")
  test.done()

exports.test_person_substitutions = (test) ->
  bot = new TestCase(test, """
    + say *
    - <person>
  """)
  bot.reply("say I am cool", "i am cool")
  bot.reply("say You are dumb", "you are dumb")

  bot.extend("""
      ! person i am    = you are
      ! person you are = I am
  """)
  bot.reply("say I am cool", "you are cool")
  bot.reply("say You are dumb", "I am dumb")
  test.done()

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

################################################################################
# Reply Tests
################################################################################

exports.test_previous = (test) ->
  bot = new TestCase(test, """
    ! sub who's  = who is
    ! sub it's   = it is
    ! sub didn't = did not

    + knock knock
    - Who's there?

    + *
    % who is there
    - <sentence> who?

    + *
    % * who
    - Haha! <sentence>!

    + *
    - I don't know.
  """)
  bot.reply("knock knock", "Who's there?")
  bot.reply("Canoe", "Canoe who?")
  bot.reply("Canoe help me with my homework?", "Haha! Canoe help me with my homework!")
  bot.reply("hello", "I don't know.")
  test.done()

exports.test_random = (test) ->
  bot = new TestCase(test, """
    + test random response
    - One.
    - Two.

    + test random tag
    - This sentence has a random {random}word|bit{/random}.
  """)
  bot.replyRandom("test random response", ["One.", "Two."])
  bot.replyRandom("test random tag", [
    "This sentence has a random word.",
    "This sentence has a random bit.",
  ])
  test.done()

exports.test_continuations = (test) ->
  bot = new TestCase(test, """
    + tell me a poem
    - There once was a man named Tim,\\s
    ^ who never quite learned how to swim.\\s
    ^ He fell off a dock, and sank like a rock,\\s
    ^ and that was the end of him.
  """)
  bot.reply("Tell me a poem.", "There once was a man named Tim,
      who never quite learned how to swim.
      He fell off a dock, and sank like a rock,
      and that was the end of him.")
  test.done()

exports.test_redirects = (test) ->
  bot = new TestCase(test, """
    + hello
    - Hi there!

    + hey
    @ hello

    + hi there
    - {@hello}
  """)
  bot.reply("hello", "Hi there!")
  bot.reply("hey", "Hi there!")
  bot.reply("hi there", "Hi there!")
  test.done()

exports.test_conditionals = (test) ->
  bot = new TestCase(test, """
    + i am # years old
    - <set age=<star>>OK.

    + what can i do
    * <get age> == undefined => I don't know.
    * <get age> >  25 => Anything you want.
    * <get age> == 25 => Rent a car for cheap.
    * <get age> >= 21 => Drink.
    * <get age> >= 18 => Vote.
    * <get age> <  18 => Not much of anything.

    + am i your master
    * <get master> == true => Yes.
    - No.
  """)
  age_q = "What can I do?"
  bot.reply(age_q, "I don't know.")

  ages =
      '16' : "Not much of anything."
      '18' : "Vote."
      '20' : "Vote."
      '22' : "Drink."
      '24' : "Drink."
      '25' : "Rent a car for cheap."
      '27' : "Anything you want."
  for age of ages
      if (!ages.hasOwnProperty(age))
          continue
      bot.reply("I am " + age + " years old.", "OK.")
      bot.reply(age_q, ages[age])

  bot.reply("Am I your master?", "No.")
  bot.rs.setUservar(bot.username, "master", "true")
  bot.reply("Am I your master?", "Yes.")
  test.done()

exports.test_embedded_tags = (test) ->
  bot = new TestCase(test, """
    + my name is *
    * <get name> != undefined => <set oldname=<get name>>I thought\\s
      ^ your name was <get oldname>?
      ^ <set name=<formal>>
    - <set name=<formal>>OK.

    + what is my name
    - Your name is <get name>, right?

    + html test
    - <set name=<b>Name</b>>This has some non-RS <em>tags</em> in it.
  """)
  bot.reply("What is my name?", "Your name is undefined, right?")
  bot.reply("My name is Alice.", "OK.")
  bot.reply("My name is Bob.", "I thought your name was Alice?")
  bot.reply("What is my name?", "Your name is Bob, right?")
  bot.reply("HTML Test", "This has some non-RS <em>tags</em> in it.")
  test.done()

exports.test_set_uservars = (test) ->
  bot = new TestCase(test, """
    + what is my name
    - Your name is <get name>.

    + how old am i
    - You are <get age>.
  """)
  bot.rs.setUservars(bot.username, {
      "name": "Aiden",
      "age": 5,
  })
  bot.reply("What is my name?", "Your name is Aiden.")
  bot.reply("How old am I?", "You are 5.")
  test.done()

exports.test_questionmark = (test) ->
  bot = new TestCase(test, """
    + google *
    - <a href="https://www.google.com/search?q=<star>">Results are here</a>
  """)
  bot.reply("google coffeescript",
    '<a href="https://www.google.com/search?q=coffeescript">Results are here</a>'
  )
  test.done()

exports.test_reply_arrays = (test) ->
  bot = new TestCase(test, """
    ! array greek = alpha beta gamma
    ! array test = testing trying
    ! array format = <uppercase>|<lowercase>|<formal>|<sentence>

    + test random array
    - Testing (@greek) array.

    + test two random arrays
    - {formal}(@test){/formal} another (@greek) array.

    + test nonexistant array
    - This (@array) does not exist.

    + test more arrays
    - I'm (@test) more (@greek) (@arrays).

    + test weird syntax
    - This (@ greek) shouldn't work, and neither should this @test.

    + random format *
    - (@format)
  """)
  bot.replyRandom("test random array", [
    "Testing alpha array.", "Testing beta array.", "Testing gamma array.",
  ])
  bot.replyRandom("test two random arrays", [
    "Testing another alpha array.", "Testing another beta array.",
    "Testing another gamma array.", "Trying another alpha array.",
    "Trying another beta array.", "Trying another gamma array.",
  ])
  bot.reply("test nonexistant array", "This (@array) does not exist.")
  bot.replyRandom("test more arrays", [
    "I'm testing more alpha (@arrays).", "I'm testing more beta (@arrays).",
    "I'm testing more gamma (@arrays).", "I'm trying more alpha (@arrays).",
    "I'm trying more beta (@arrays).", "I'm trying more gamma (@arrays)."
  ])
  bot.reply("test weird syntax", "This (@ greek) shouldn't work, and neither should this @test.")
  bot.replyRandom("random format hello world", [
    "HELLO WORLD", "hello world", "Hello World", "Hello world",
  ])
  test.done()

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


################################################################################
# Topic Tests
################################################################################

exports.test_punishment_topic = (test) ->
  bot = new TestCase(test, """
    + hello
    - Hi there!

    + swear word
    - How rude! Apologize or I won't talk to you again.{topic=sorry}

    + *
    - Catch-all.

    > topic sorry
        + sorry
        - It's ok!{topic=random}

        + *
        - Say you're sorry!
    < topic
  """)
  bot.reply("hello", "Hi there!")
  bot.reply("How are you?", "Catch-all.")
  bot.reply("Swear word!", "How rude! Apologize or I won't talk to you again.")
  bot.reply("hello", "Say you're sorry!")
  bot.reply("How are you?", "Say you're sorry!")
  bot.reply("Sorry!", "It's ok!")
  bot.reply("hello", "Hi there!")
  bot.reply("How are you?", "Catch-all.")
  test.done()

exports.test_topic_inheritance = (test) ->
  RS_ERR_MATCH = "ERR: No Reply Matched"
  bot = new TestCase(test, """
    > topic colors
        + what color is the sky
        - Blue.

        + what color is the sun
        - Yellow.
    < topic

    > topic linux
        + name a red hat distro
        - Fedora.

        + name a debian distro
        - Ubuntu.
    < topic

    > topic stuff includes colors linux
        + say stuff
        - \"Stuff.\"
    < topic

    > topic override inherits colors
        + what color is the sun
        - Purple.
    < topic

    > topic morecolors includes colors
        + what color is grass
        - Green.
    < topic

    > topic evenmore inherits morecolors
        + what color is grass
        - Blue, sometimes.
    < topic
  """)
  bot.rs.setUservar(bot.username, "topic", "colors")
  bot.reply("What color is the sky?", "Blue.")
  bot.reply("What color is the sun?", "Yellow.")
  bot.reply("What color is grass?", RS_ERR_MATCH)
  bot.reply("Name a Red Hat distro.", RS_ERR_MATCH)
  bot.reply("Name a Debian distro.", RS_ERR_MATCH)
  bot.reply("Say stuff.", RS_ERR_MATCH)

  bot.rs.setUservar(bot.username, "topic", "linux")
  bot.reply("What color is the sky?", RS_ERR_MATCH)
  bot.reply("What color is the sun?", RS_ERR_MATCH)
  bot.reply("What color is grass?", RS_ERR_MATCH)
  bot.reply("Name a Red Hat distro.", "Fedora.")
  bot.reply("Name a Debian distro.", "Ubuntu.")
  bot.reply("Say stuff.", RS_ERR_MATCH)

  bot.rs.setUservar(bot.username, "topic", "stuff")
  bot.reply("What color is the sky?", "Blue.")
  bot.reply("What color is the sun?", "Yellow.")
  bot.reply("What color is grass?", RS_ERR_MATCH)
  bot.reply("Name a Red Hat distro.", "Fedora.")
  bot.reply("Name a Debian distro.", "Ubuntu.")
  bot.reply("Say stuff.", '"Stuff."')

  bot.rs.setUservar(bot.username, "topic", "override")
  bot.reply("What color is the sky?", "Blue.")
  bot.reply("What color is the sun?", "Purple.")
  bot.reply("What color is grass?", RS_ERR_MATCH)
  bot.reply("Name a Red Hat distro.", RS_ERR_MATCH)
  bot.reply("Name a Debian distro.", RS_ERR_MATCH)
  bot.reply("Say stuff.", RS_ERR_MATCH)

  bot.rs.setUservar(bot.username, "topic", "morecolors")
  bot.reply("What color is the sky?", "Blue.")
  bot.reply("What color is the sun?", "Yellow.")
  bot.reply("What color is grass?", "Green.")
  bot.reply("Name a Red Hat distro.", RS_ERR_MATCH)
  bot.reply("Name a Debian distro.", RS_ERR_MATCH)
  bot.reply("Say stuff.", RS_ERR_MATCH)

  bot.rs.setUservar(bot.username, "topic", "evenmore")
  bot.reply("What color is the sky?", "Blue.")
  bot.reply("What color is the sun?", "Yellow.")
  bot.reply("What color is grass?", "Blue, sometimes.")
  bot.reply("Name a Red Hat distro.", RS_ERR_MATCH)
  bot.reply("Name a Debian distro.", RS_ERR_MATCH)
  bot.reply("Say stuff.", RS_ERR_MATCH)

  test.done()


################################################################################
# calculation (add,sub) tests
################################################################################

exports.test_addition = (test) ->
  bot = new TestCase(test, """
    + test counter
    - <set counter=0>counter set

    + show
    - counter = <get counter>

    + add
    - <add counter=1>adding

    + sub
    - <sub counter=1>subbing

    + div
    - <set counter=10>
    ^ <div counter=2>
    ^ divving

    + mult
    - <set counter=10>
    ^ <mult counter=2>
    ^ multing
  """)
  bot.reply("test counter", "counter set")
  bot.reply("show", "counter = 0")
  bot.reply("add", "adding")
  bot.reply("show", "counter = 1")
  bot.reply("sub", "subbing")
  bot.reply("show", "counter = 0")

  bot.reply("div", "divving")
  bot.reply("show", "counter = 5")

  bot.reply("mult", "multing")
  bot.reply("show", "counter = 20")

  test.done()

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

################################################################################
# Promise Tests
################################################################################

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
    test.ok(args.length is 1)
    test.equal(rs, bot.rs)
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

exports.test_promises_in_objects = (test) ->
  bot = new TestCase(test, """
    + my name is *
    - hello there <call>helperWithPromise <star></call> with a <call>anotherHelperWithPromise</call>
  """)

  input = "my name is Rive"

  bot.rs.setSubroutine("helperWithPromise", (rs, args) ->
    test.ok(args.length is 1)
    test.equal(args[0], "rive")
    return new rs.Promise((resolve, reject) ->
      resolve("stranger")
    )
  )

  bot.rs.setSubroutine("anotherHelperWithPromise", (rs, args) ->
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
  """)

  bot.rs.setSubroutine("exclaim", (rs, args) ->
    return "!"
  )

  src = bot.rs.stringify()
  expect = '! version = 2.0\n! local concat = none\n\n> object hello javascript\n\treturn "Hello";\n< object\n\n> object exclaim javascript\n\treturn "!";\n< object\n\n+ my name is *\n- hello there<call>exclaim</call>\n'
  test.equal(src, expect)
  test.done()


exports.load_directory_recursively = (test) ->
  bot = new TestCase(test, """
    + *
    - No, this failed.
  """)

  bot.rs.loadDirectory('./test/fixtures', ->
    bot.rs.sortReplies()
    bot.reply("Did the root directory rivescript load?", "Yes, the root directory rivescript loaded.")
    bot.reply("Did the recursive directory rivescript load?", "Yes, the recursive directory rivescript loaded.")
    test.done()
  , ->
    test.equal(true, false) # Throw error
  )

