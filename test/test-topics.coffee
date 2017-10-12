TestCase = require("./test-base")

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

exports.test_topic_inheritance = (test) ->
  bot = new TestCase(test, """
    > topic random
        + unrandom
        - {topic=unrandom}<@>
        + *
        - Random.
    < topic
  """)
  bot.reply('unrandom', 'Random.')
  bot.extend("""
    > topic unrandom
      + *
      - Unrandom.
    < topic
  """)
  bot.reply('unrandom', 'Unrandom.')
  bot.purgeTopic('unrandom')
  bot.reply('unrandom', 'Random.')
  test.done()
