TestCase = require("./test-promises-base")

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
  bot.replyPromisified("test counter", "counter set")
  .then -> bot.replyPromisified("show", "counter = 0")
  .then -> bot.replyPromisified("add", "adding")
  .then -> bot.replyPromisified("show", "counter = 1")
  .then -> bot.replyPromisified("sub", "subbing")
  .then -> bot.replyPromisified("show", "counter = 0")
  .then -> bot.replyPromisified("div", "divving")
  .then -> bot.replyPromisified("show", "counter = 5")
  .then -> bot.replyPromisified("mult", "multing")
  .then -> bot.replyPromisified("show", "counter = 20")
  .catch (err) -> test.ok(false, err.stack)
  .then -> test.done()
