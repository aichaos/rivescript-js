#!/usr/bin/env coffee

################################################################################
# Interactive RiveScript Shell for quickly testing your RiveScript bot.        #
#                                                                              #
# This CoffeeScript version of the shell has support for executing object      #
# macros written in CoffeeScript (see eg/brain/coffee.rive).                   #
################################################################################

readline = require "readline"
RiveScript = require "./src/rivescript"
CoffeeObjectHandler = require "./lib/lang/coffee"

################################################################################
# Accept command line parameters.
################################################################################

opts =
  debug: false
  utf8:  false
  brain: undefined

process.argv.forEach((val, index, array) ->
  if index < 2
    return

  if val is "--debug"
    opts.debug = true
  else if val is "--utf8"
    opts.utf8 = true
  else if val.indexOf("-") is 0
    console.error "Unknown option: #{val}"
  else if opts.brain is undefined
    opts.brain = val
  else
    console.error "Extra parameter ignored: #{val}"
)

if opts.brain is undefined
  console.log "Usage: coffee shell.coffee [--debug --utf8] </path/to/brain>"
  process.exit 1

################################################################################
# Initialize the RiveScript bot and print the welcome banner.
################################################################################

bot = new RiveScript({
  debug: opts.debug
  utf8: opts.utf8
})
bot.setHandler("coffee", new CoffeeObjectHandler())
bot.loadDirectory opts.brain, (batch_num) ->
  bot.sortReplies()

  console.log """RiveScript Interpreter (CoffeeScript) -- Interactive Mode
                ----------------------------------------------------------
                rivescript version: #{bot.version()}
                        Reply root: #{opts.brain}

                You are now chatting with the RiveScript bot. Type a message
                and press Return to send it. When finished, type '/quit' to
                exit the program. Type '/help' for other options."""

  ##############################################################################
  # Drop into the interactive command shell.
  ##############################################################################

  rl = readline.createInterface
    input: process.stdin
    output: process.stdout

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
      reply = bot.reply "localuser", cmd
      console.log "Bot> #{reply}"

    rl.prompt()
  .on "close", () ->
    process.exit 0

help = () ->
  console.log """Supported commands:
                 /help        : Show this text.
                 /eval <code> : Evaluate JavaScript code.
                 /log <code>  : Shortcut to /eval console.log(code)
                 /quit        : Exit the program."""
