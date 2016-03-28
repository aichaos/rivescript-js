TestCase = require("./test-base")

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
