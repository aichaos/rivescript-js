#!/usr/bin/env coffee

################################################################################
# Interactive RiveScript Shell for quickly testing your RiveScript bot.        #
#                                                                              #
# This CoffeeScript version of the shell has support for executing object      #
# macros written in CoffeeScript (see eg/brain/coffee.rive).                   #
################################################################################

readline = require "readline"
fs = require "fs"
RiveScript = require "./src/rivescript"
CoffeeObjectHandler = require "./lib/lang/coffee"

################################################################################
# Accept command line parameters.
################################################################################

opts =
  debug: false
  utf8:  false
  watch: false
  brain: undefined

process.argv.slice(2).forEach((val, index, array) ->
  if val is "--debug"
    opts.debug = true
  else if val is "--utf8"
    opts.utf8 = true
  else if val is "--watch"
    opts.watch = true
  else if val.indexOf("-") is 0
    console.error "Unknown option: #{val}"
  else if opts.brain is undefined
    opts.brain = val
  else
    console.error "Extra parameter ignored: #{val}"
)

if opts.brain is undefined
  console.log "Usage: coffee shell.coffee [--debug --utf8 --watch] </path/to/brain>"
  process.exit 1

################################################################################
# Initialize the RiveScript bot and print the welcome banner.
################################################################################

rl = readline.createInterface
  input: process.stdin
  output: process.stdout

bot = null

loadingDone = (batchNumber) ->
  bot.sortReplies()
  bot.ready = true

loadingError = (error, batchNumber) ->
  console.error "Loading error: #{error}"

loadBot = ->
  bot = new RiveScript({
    debug: opts.debug
    utf8: opts.utf8
  })
  bot.ready = false
  bot.setHandler("coffee", new CoffeeObjectHandler())
  bot.loadDirectory(opts.brain, loadingDone, loadingError)

loadBot()

if opts.watch?
  fs.watch opts.brain, {recursive: false}, ->
    console.log ""
    console.log "[INFO] Brain changed, reloading bot."
    rl.prompt()
    loadBot()

##############################################################################
# Drop into the interactive command shell.
##############################################################################

console.log """
      .   .
     .:...::      RiveScript Interpreter (CoffeeScript)
    .::   ::.     Library Version: v#{bot.version()}
 ..:;;. ' .;;:..
    .  '''  .     Type '/quit' to quit.
     :;,:,;:      Type '/help' for more options.
     :     :

Using the RiveScript bot found in: #{opts.brain}
Type a message to the bot and press Return to send it.

"""

rl.setPrompt "You> "
rl.prompt()
rl.on "line", (cmd) ->
  if cmd is "/help"
    help()
  else if cmd.indexOf("/eval ") is 0
    eval(cmd.replace("/eval ", ""))
  else if cmd.indexOf("/log ") is 0
    console.log(eval(cmd.replace("/log ", "")))
  else if cmd is "/quit"
    process.exit 0
  else
    reply = if (bot and bot.ready) then bot.reply("localuser", cmd) else "ERR: Bot not ready yet"
    console.log "Bot> #{reply}"

  rl.prompt()
.on "close", () ->
  console.log ""
  process.exit 0

help = () ->
  console.log """Supported commands:
                 /help        : Show this text.
                 /eval <code> : Evaluate JavaScript code.
                 /log <code>  : Shortcut to /eval console.log(code)
                 /quit        : Exit the program."""
