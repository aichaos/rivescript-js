TestCase = require("./test-promises-base")

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
  bot.replyPromisified("hello", "Hi there!")
  .then -> bot.replyPromisified("How are you?", "Catch-all.")
  .then -> bot.replyPromisified("Swear word!", "How rude! Apologize or I won't talk to you again.")
  .then -> bot.replyPromisified("hello", "Say you're sorry!")
  .then -> bot.replyPromisified("How are you?", "Say you're sorry!")
  .then -> bot.replyPromisified("Sorry!", "It's ok!")
  .then -> bot.replyPromisified("hello", "Hi there!")
  .then -> bot.replyPromisified("How are you?", "Catch-all.")
  .then -> test.done()

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
  bot.replyPromisified("What color is the sky?", "Blue.")
  .then -> bot.replyPromisified("What color is the sun?", "Yellow.")
  .then -> bot.replyPromisified("What color is grass?", RS_ERR_MATCH)
  .then -> bot.replyPromisified("Name a Red Hat distro.", RS_ERR_MATCH)
  .then -> bot.replyPromisified("Name a Debian distro.", RS_ERR_MATCH)
  .then -> bot.replyPromisified("Say stuff.", RS_ERR_MATCH)

  .then ->
    bot.rs.setUservar(bot.username, "topic", "linux")
    bot.replyPromisified("What color is the sky?", RS_ERR_MATCH)
    .then -> bot.replyPromisified("What color is the sun?", RS_ERR_MATCH)
    .then -> bot.replyPromisified("What color is grass?", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Name a Red Hat distro.", "Fedora.")
    .then -> bot.replyPromisified("Name a Debian distro.", "Ubuntu.")
    .then -> bot.replyPromisified("Say stuff.", RS_ERR_MATCH)
  .then -> 
    bot.rs.setUservar(bot.username, "topic", "stuff")
    bot.replyPromisified("What color is the sky?", "Blue.")
    .then -> bot.replyPromisified("What color is the sun?", "Yellow.")
    .then -> bot.replyPromisified("What color is grass?", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Name a Red Hat distro.", "Fedora.")
    .then -> bot.replyPromisified("Name a Debian distro.", "Ubuntu.")
    .then -> bot.replyPromisified("Say stuff.", '"Stuff."')
  .then ->
    bot.rs.setUservar(bot.username, "topic", "override")
    bot.replyPromisified("What color is the sky?", "Blue.")
    .then -> bot.replyPromisified("What color is the sun?", "Purple.")
    .then -> bot.replyPromisified("What color is grass?", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Name a Red Hat distro.", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Name a Debian distro.", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Say stuff.", RS_ERR_MATCH)
  .then ->
    bot.rs.setUservar(bot.username, "topic", "morecolors")
    bot.replyPromisified("What color is the sky?", "Blue.")
    .then -> bot.replyPromisified("What color is the sun?", "Yellow.")
    .then -> bot.replyPromisified("What color is grass?", "Green.")
    .then -> bot.replyPromisified("Name a Red Hat distro.", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Name a Debian distro.", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Say stuff.", RS_ERR_MATCH)
  .then ->
    bot.rs.setUservar(bot.username, "topic", "evenmore")
    bot.replyPromisified("What color is the sky?", "Blue.")
    .then -> bot.replyPromisified("What color is the sun?", "Yellow.")
    .then -> bot.replyPromisified("What color is grass?", "Blue, sometimes.")
    .then -> bot.replyPromisified("Name a Red Hat distro.", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Name a Debian distro.", RS_ERR_MATCH)
    .then -> bot.replyPromisified("Say stuff.", RS_ERR_MATCH)
  .catch (err) -> test.ok(false, err.stack)
  .then -> test.done()
