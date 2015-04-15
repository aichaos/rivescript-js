#!/usr/bin/env coffee

readline   = require "readline"
RiveScript = require "./lib/rivescript"
CoffeeObjectHandler = require "./lib/lang/coffee"

brain = "eg/brain"

bot = new RiveScript({ debug: false })
bot.setHandler("coffee", new CoffeeObjectHandler())
#bot.loadFile("test.rive", (batch_num) ->
bot.loadDirectory(brain, (batch_num) ->
  bot._debug = true
  bot.sortReplies()

  console.log("=== topics ===")
  console.log(JSON.stringify(bot._topics, null, 2));
  console.log("=== thats ===")
  console.log(JSON.stringify(bot._thats, null, 2));
  console.log("=== sorted ===")
  console.log(JSON.stringify(bot._sorted, null, 2));
  for topic of bot._sorted.topics
    console.log "TOPIC: #{topic}"
    for trig in bot._sorted.topics[topic]
      console.log "\t- #{trig[0]}"
  console.log "=== sorted (thats) ==="
  console.log JSON.stringify(bot._sorted.thats, null, 2)

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.setPrompt("You> ")
  rl.prompt()
  rl.on "line", (cmd) ->
    if cmd is "help"
      return
    else if cmd is "/quit"
      process.exit(0);
    else
      reply = bot.reply("localuser", cmd);
      console.log("Bot>", reply);

    rl.prompt();
  .on "close", ->
    process.exit(0);
)
