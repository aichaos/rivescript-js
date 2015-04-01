# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/
"use strict"

# Brain logic for RiveScript
utils = require("./utils")
inherit_utils = require("./inheritence")

##
# Brain (RiveScript master)
#
# Create a Brain object which handles the actual process of fetching a reply.
##
class Brain
  constructor: (master) ->
    @master = master
    @strict = master._strict
    @utf8   = master._utf8

    # Private variables only relevant to the reply-answering part of RiveScript.
    @_currentUser = null # The current user asking for a message

  # Proxy functions
  say: (message) ->
    @master.say message
  warn: (message, filename, lineno) ->
    @master.warn message, filename, lineno


  ##
  # string reply (string user, string msg[, scope])
  #
  ##
  reply: (user, msg, scope) ->
    @say "Asked to reply to [#{user}] #{msg}"

    # Store the current user's ID.
    @_currentUser = user

    # Format their message.
    msg   = @formatMessage(msg)
    reply = ""

    # If the BEGIN block exists, consult it first.
    if @master._topics.__begin__
      begin = @_getReply(user, "request", "begin", 0, scope)

      # OK to continue?
      if begin.indexOf("{ok}") > -1
        reply = @_getReply(user, msg, "normal", 0, scope)
        begin = begin.replace(/\{ok\}/g, reply)

      reply = begin
      reply = @processTags(user, msg, reply, [], [], 0, scope)
    else
      reply = @_getReply(user, msg, "normal", 0, scope)

    # Save their reply history
    @master._users[user].__history__.input.pop()
    @master._users[user].__history__.input.unshift(msg)
    @master._users[user].__history__.reply.pop()
    @master._users[user].__history__.reply.unshift(reply)

    # Unset the current user ID.
    @_currentUser = undefined

    return reply

  ##
  # string _getReply (string user, string msg, string context, int step, scope)
  #
  # The internal reply method. DO NOT CALL THIS DIRECTLY.
  #
  # * user, msg and scope are the same as reply()
  # * context = "normal" or "begin"
  # * step = the recursion depth
  ##
  _getReply: (user, msg, context, step, scope) ->
    # Needed to sort replies?
    if not @master._sorted.topics
      @warn "You forgot to call sortReplies()!"
      return "ERR: Replies Not Sorted"

    # Initialize the user's profile?
    if not @master._users[user]
      @master._users[user] = {"topic": "random"}

    # Collect data on this user.
    topic     = @master._users[user].topic
    stars     = []
    thatstars = [] # For %Previous
    reply     = ""

    # Avoid letting them fall into a missing topic.
    if not @master._topics[topic]
      @warn "User #{user} was in an empty topic named '#{topic}'"
      topic = @master._users[user].topic = "random"

    # Avoid deep recursion.
    if step > @master._depth
      return "ERR: Deep Recursion Detected"

    # Are we in the BEGIN block?
    if context is "begin"
      topic = "__begin__"

    # Initialize this user's history.
    if not @master._users[user].__history__
      @master._users[user].__history__ = {
        "input": [
          "undefined", "undefined", "undefined", "undefined", "undefined",
          "undefined", "undefined", "undefined", "undefined", "undefined"
        ]
        "reply": [
          "undefined", "undefined", "undefined", "undefined", "undefined",
          "undefined", "undefined", "undefined", "undefined", "undefined"
        ]
      }

    # More topic sanity checking.
    if not @master._topics[topic]
      # This was handled before, which would mean topic=random and it doesn't
      # exist. Serious issue!
      return "ERR: No default topic 'random' was found!"

    # Create a pointer for the matched data when we find it.
    matched        = null
    matchedTrigger = null
    foundMatch     = false

    # See if there were any %Previous's in this topic, or any topic related
    # to it. This should only be done the first time -- not during a recursive
    # redirection. This is because in a redirection, "lastreply" is still gonna
    # be the same as it was the first time, resulting in an infinite loop!
    if step is 0
      allTopics = [topic]
      if @master._topics[topic].includes or @master._topics[topic].inherits
        # Get ALL the topics!
        allTopics = inherit_utils.getTopicTree(@master, topic)

      # Scan them all.
      for top in allTopics
        @say "Checking topic #{top} for any %Previous's"

        if @master._sorted.thats[top]
          # There's one here!
          @say "There's a %Previous in this topic!"

          # Do we have history yet?
          lastReply = @master._users[user].__history__.reply[0]

          # Format the bot's last reply the same way as the human's.
          lastReply = @formatMessage(lastReply, true)
          @say "Last reply: #{lastReply}"

          # See if it's a match
          for trig in @master._sorted.thats[top]
            pattern = trig[0]
            botside = @triggerRegexp(user, pattern)
            @say "Try to match lastReply (#{lastReply}) to #{botside}"

            # Match?
            match = lastReply.match(new RegExp("^#{botside}$"))
            if match
              # Huzzah! See if OUR message is right too.
              @say "Bot side matched!"
              thatstars = match # Collect the bot stars in case we need them
              thatstars.shift()

              # Compare the triggers to the user's message.
              userSide = trig[1]
              regexp = @triggerRegexp(user, userSide.trigger)
              @say "Try to match \"#{msg}\" against #{userSide.trigger} (#{regexp})"

              # If the trigger is atomic, we don't need to bother with the regexp engine.
              isAtomic = utils.isAtomic(userSide.trigger)
              isMatch  = false
              if isAtomic
                if msg is regexp
                  isMatch = true
              else
                match = msg.match(new RegExp("^#{regexp}$"))
                if match
                  isMatch = true

                  # Get the stars
                  stars = match
                  if stars.length >= 1
                    stars.shift()

              # Was it a match?
              if isMatch
                # Keep the trigger pointer.
                matched = userSide
                foundMatch = true
                matchedTrigger = userSide.trigger
                break

    # Search their topic for a match to their trigger.
    if not foundMatch
      @say "Searching their topic for a match..."
      for trig in @master._sorted.topics[topic]
        pattern = trig[0]
        regexp = @triggerRegexp(user, pattern)
        @say "Try to match \"#{msg}\" against #{pattern} (#{regexp})"

        # If the trigger is atomic, we don't need to bother with the regexp engine.
        isAtomic = utils.isAtomic(pattern)
        isMatch  = false
        if isAtomic
          if msg is regexp
            isMatch = true
        else
          # Non-atomic triggers always need the regexp.
          match = msg.match(new RegExp("^#{regexp}$"))
          if match
            # The regexp matched!
            isMatch = true

            # Collect the stars
            stars = []
            if match.length > 1
              for i in [1..match.length]
                stars.push match[i]

        # A match somehow?
        if isMatch
          @say "Found a match!"

          # Keep the pointer to this trigger's data.
          matched = trig[1]
          foundMatch = true
          matchedTrigger = pattern
          break

    # Store what trigger they matched on. If their matched trigger is undefined,
    # this will be too, which is great.
    @master._users[user].__lastmatch__ = matchedTrigger

    # Did we match?
    if matched
      for nil in [1] # A single loop so we can break out early
        # See if there are any hard redirects.
        if matched.redirect?
          @say "Redirecting us to #{matched.redirect}"
          redirect = @processTags(user, msg, matched.redirect, stars, thatstars, step, scope)
          @say "Pretend user said: #{redirect}"
          reply = @_getReply(user, redirect, context, step+1, scope)
          break

        # Check the conditionals.
        for row in matched.condition
          halves = row.split(/\s*=>\s*/)
          if halves and halves.length is 2
            condition = halves[0].match(/^(.+?)\s+(==|eq|!=|ne|<>|<|<=|>|>=)\s+(.*?)$/)
            if condition
              left = utils.strip(condition[1])
              eq   = condition[2]
              right = utils.strip(condition[3])
              potreply = utils.strip(halves[1])

              # Process tags all around
              left  = @processTags(user, msg, left, stars, thatstars, step, scope)
              right = @processTags(user, msg, right, stars, thatstars, step, scope)

              # Defaults?
              if left.length is 0
                left = "undefined"
              if right.length is 0
                right = "undefined"

              @say "Check if #{left} #{eq} #{right}"

              # Validate it
              passed = false
              if eq is "eq" or eq is "=="
                if left is right
                  passed = true
              else if eq is "ne" or eq is "!=" or eq is "<>"
                if left isnt right
                  passed = true
              else
                # Dealing with numbers here
                try
                  left = parseInt left
                  right = parseInt right
                  if eq is "<" and left < right
                    passed = true
                  else if eq is "<=" and left <= right
                    passed = true
                  else if eq is ">" and left > right
                    passed = true
                  else if eq is ">=" and left >= right
                    passed = true
                catch e
                  @warn "Failed to evaluate numeric condition!"

              # OK?
              if passed
                reply = potreply
                break

        # Have our reply yet?
        if reply isnt undefined and reply.length > 0
          break

        # Process weights in the replies.
        bucket = []
        for rep in matched.reply
          weight = 1
          match = rep.match(/\{weight=(\d+?)\}/i)
          if match
            weight = match[1]
            if weight <= 0
              @warn "Can't have a weight <= 0!"
              weight = 1

          for i in [0..weight]
            bucket.push rep

        # Get a random reply.
        choice = parseInt(Math.random() * bucket.length)
        reply  = bucket[choice]
        break

    # Still no reply?
    if not foundMatch
      reply = "ERR: No Reply Matched"
    else if reply is undefined or reply.length is 0
      reply = "ERR: No Reply Found"

    @say "Reply: #{reply}"

    # Process tags for the BEGIN block.
    if context is "begin"
      # The BEGIN block can set {topic} and user vars.

      # Topic setter
      match = reply.match(/\{topic=(.+?)\}/i)
      giveup = 0
      while match
        giveup++
        if giveup >= 50
          @warn "Infinite loop looking for topic tag!"
          break
        name = match[1]
        @master._users[user].topic = name
        reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "")
        match = reply.match(/\{topic=(.+?)\}/i)

      # Set user vars
      match = reply.match(/<set (.+?)=(.+?)>/i)
      giveup = 0
      while match
        giveup++
        if giveup >= 50
          @warn "Infinite loop looking for set tag!"
          break
        name = match[1]
        value = match[2]
        @master._users[user][name] = value
        reply = reply.replace(new RegExp("<set " + utils.quotemeta(name) + "=" + utils.quotemeta(value) + ">", "ig"), "")
        match = reply.match(/<set (.+?)=(.+?)>/i)
    else
      # Process all the tags.
      reply = @processTags(user, msg, reply, stars, thatstars, step, scope)

    return reply

  ##
  # string formatMessage (string msg)
  #
  # Format a user's message for safe processing.
  ##
  formatMessage: (msg, botreply) ->
    # Lowercase it.
    msg = "" + msg
    msg = msg.toLowerCase()

    # Run substitutions and sanitize what's left.
    msg = @substitute(msg, "sub")

    # In UTF-8 mode, only strip metacharcters and HTML brackets (to protect
    # against obvious XSS attacks).
    if @utf8
      msg = msg.replace(/[\\<>]+/, "")

      # For the bot's reply, also strip common punctuation.
      if botreply?
        msg = msg.replace(/[.?,!;:@#$%^&*()]/, "")
    else
      # For everything else, strip all non-alphanumerics
      msg = utils.stripNasties(msg, @utf8)

    return msg

  ##
  # string triggerRegexp (string user, string trigger)
  #
  # Prepares a trigger for the regular expression engine.
  ##
  triggerRegexp: (user, regexp) ->
    # If the trigger is simply '*' then the * needs to become (.*?)
    # to match the blank string too.
    regexp = regexp.replace(/^\*$/, "<zerowidthstar>")

    # Simple replacements.
    regexp = regexp.replace(/\*/g, "(.+?)")   # Convert * into (.+?)
    regexp = regexp.replace(/#/g,  "(\\d+?)") # Convert # into (\d+?)
    regexp = regexp.replace(/_/g,  "(\\w+?)") # Convert _ into (\w+?)
    regexp = regexp.replace(/\{weight=\d+\}/g, "") # Remove {weight} tags
    regexp = regexp.replace(/<zerowidthstar>/g, "(.*?)")

    # Optionals.
    match = regexp.match(/\[(.+?)\]/)
    giveup = 0
    while match
      if giveup++ > 50
        @warn "Infinite loop when trying to process optionals in a trigger!"
        return ""

      parts = match[1].split("|")
      opts  = []
      for p in parts
        opts.push "\\s*#{p}\\s*"
      opts.push "\\s*"

      # If this optional had a star or anything in it, make it non-matching.
      pipes = opts.join("|")
      pipes = pipes.replace(new RegExp(utils.quotemeta("(.+?)"), "g"),   "(?:.+?)")
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\d+?)"), "g"), "(?:\\d+?)")
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\w+?)"), "g"), "(?:\\w+?)")

      regexp = regexp.replace(new RegExp("\\s*\\[" + utils.quotemeta(match[1]) + "\\]\\s*"),
        "(?:#{pipes})")
      match = regexp.match(/\[(.+?)\]/)

    # _ wildcards can't match numbers! Quick note on why I did it this way:
    # the initial replacement above (_ => (\w+?)) needs to be \w because the
    # square brackets in [A-Za-z] will confuse the optionals logic just above.
    # So then we switch it back down here.
    regexp = regexp.replace(/\\w/, "[A-Za-z]")

    # Filter in arrays.
    giveup = 0
    while regexp.indexOf("@") > -1
      if giveup++ > 50
        break

      match = regexp.match(/\@(.+?)\b/)
      if match
        name = match[1]
        rep  = ""
        if @master._array[name]
          rep = "(?:" + @master._array[name].join("|") + ")"
        regexp = regexp.replace(new RegExp("@" + utils.quotemeta(name) + "\\b"), rep)

    # Filter in bot variables.
    giveup = 0
    while regexp.indexOf("<bot") > -1
      if giveup++ > 50
        break

      match = regexp.match(/<bot (.+?)>/i)
      if match
        name = match[1]
        rep  = ''
        if @master._var[name]
          rep = utils.stripNasties(@master._var[name])
        regexp = regexp.replace(new RegExp("<bot " + utils.quotemeta(name) + ">"), rep.toLowerCase())

    # Filter in user variables.
    giveup = 0
    while regexp.indexOf("<get") > -1
      if giveup++ > 50
        break

      match = regexp.match(/<get (.+?)>/i)
      if match
        name = match[1]
        rep  = 'undefined'
        if typeof(@master._users[user][name]) isnt "undefined"
          rep = @master._users[user][name]
        regexp = regexp.replace(new RegExp("<get " + utils.quotemeta(name) + ">", "ig"), rep.toLowerCase())

    # Filter in input/reply tags.
    giveup = 0
    regexp = regexp.replace(/<input>/i, "<input1>")
    regexp = regexp.replace(/<reply>/i, "<reply1>")
    while regexp.indexOf("<input") > -1 or regexp.indexOf("<reply") > -1
      if giveup++ > 50
        break

      for type in ["input", "reply"]
        for i in [1..9]
          if regexp.indexOf("<#{type}#{i}>") > -1
            regexp = regexp.replace(new RegExp("<#{type}#{i}>", "g"),
              @master._users[user].__history__[type][i])

    return regexp

  ##
  # string processTags (string user, string msg, string reply, string[] stars,
  #                     string[] botstars, int step, scope)
  #
  # Process tags in a reply element.
  ##
  processTags: (user, msg, reply, st, bst, step, scope) ->
    # Prepare the stars and botstars.
    stars = [""]
    stars.push.apply(stars, st)
    botstars = [""]
    botstars.push.apply(botstars, bst)
    if stars.length is 1
      stars.push "undefined"
    if botstars.length is 1
      botstars.push "undefined"

    # Tag shortcuts.
    reply = reply.replace(/<person>/ig,    "{person}<star>{/person}")
    reply = reply.replace(/<@>/ig,         "{@<star>}")
    reply = reply.replace(/<formal>/ig,    "{formal}<star>{/formal}")
    reply = reply.replace(/<sentence>/ig,  "{sentence}<star>{/sentence}")
    reply = reply.replace(/<uppercase>/ig, "{uppercase}<star>{/uppercase}")
    reply = reply.replace(/<lowercase>/ig, "{lowercase}<star>{/lowercase}")

    # Weight and star tags.
    reply = reply.replace(/\{weight=\d+\}/ig, "") # Remove {weight}s
    reply = reply.replace(/<star>/ig, stars[1])
    reply = reply.replace(/<botstar>/ig, botstars[1])
    for i in [1..stars.length]
      reply = reply.replace(new RegExp("<star#{i}>", "ig"), stars[i])
    for i in [1..botstars.length]
      reply = reply.replace(new RegExp("<botstar#{i}>", "ig"), botstars[i])

    # <input> and <reply>
    reply = reply.replace(/<input>/ig, @master._users[user].__history__.input[0])
    reply = reply.replace(/<reply>/ig, @master._users[user].__history__.reply[0])
    for i in [1..9]
      if reply.indexOf("<input#{i}>") > -1
        reply = reply.replace(new RegExp("<input#{i}>", "ig"),
          @master._users[user].__history__.input[i])
      if reply.indexOf("<reply#{i}>") > -1
        reply = reply.replace(new RegExp("<reply#{i}>", "ig"),
          @master._users[user].__history__.reply[i])

    # <id> and escape codes
    reply = reply.replace(/<id>/ig, user)
    reply = reply.replace(/\\s/ig, " ")
    reply = reply.replace(/\\n/ig, "\n")
    reply = reply.replace(/\\#/ig, "#")

    # {random}
    match = reply.match(/\{random\}(.+?)\{\/random\}/i)
    giveup = 0
    while match
      if giveup++ > @master._depth
        @warn "Infinite loop looking for random tag!"
        break

      random = []
      text   = match[1]
      if text.indexOf("|") > -1
        random = text.split("|")
      else
        random = text.split(" ")

      output = random[ parseInt(Math.random() * random.length) ]

      reply = reply.replace(new RegExp("\\{random\\}" + utils.quotemeta(text) + "\\{\\/random\\}", "ig")
        output)
      match = reply.match(/\{random\}(.+?)\{\/random\}/i)

    # Person substitutions & string formatting
    formats = ["person", "formal", "sentence", "uppercase", "lowercase"]
    for type in formats
      match = reply.match(new RegExp("{#{type}}(.+?){/#{type}}", "i"))
      giveup = 0
      while match
        giveup++
        if giveup >= 50
          @warn "Infinite loop looking for #{type} tag!"
          break

        content = match[1]
        if type is "person"
          replace = @substitute content, "person"
        else
          replace = utils.stringFormat type, content

        reply = reply.replace(new RegExp("{#{type}}" + utils.quotemeta(content) + "{/#{type}}", "ig"), replace)
        match = reply.match(new RegExp("{#{type}}(.+?){/#{type}}", "i"))

    # Handle all variable-related tags with an iterative regexp approach, to
    # allow for nesting of tags in arbitrary ways (think <set a=<get b>>)
    # Dummy out the <call> tags first, because we don't handle them right here.
    reply = reply.replace(/<call>/ig, "{__call__}")
    reply = reply.replace(/<\/call>/ig, "{/__call__}")
    while true
      # This regexp will match a <tag> which contains no other tag inside it,
      # i.e. in the case of <set a=<get b>> it will match <get b> but not the
      # <set> tag, on the first pass. The second pass will get the <set> tag,
      # and so on.
      match = reply.match(/<([^<]+?)>/)
      if not match
        break # No remaining tags!

      match = match[1]
      parts = match.split(" ", 2)
      tag   = parts[0].toLowerCase()
      data  = ""
      if parts.length > 1
        data = parts[1]
      insert = ""

      # Handle the tags.
      if tag is "bot" or tag is "env"
        # <bot> and <env> tags are similar
        target = if tag is "bot" then @master._var else @master._global
        if data.indexOf("=") > -1
          # Assigning a variable
          parts = data.split("=", 2)
          @say "Set #{tag} variable #{parts[0]} = #{parts[1]}"
          target[parts[0]] = parts[1]
        else
          # Getting a bot/env variable
          insert = target[data] or "undefined"
      else if tag is "set"
        # <set> user vars
        parts = data.split("=", 2)
        @say "Set uservar #{parts[0]} = #{parts[1]}"
        @master._users[user][parts[0]] = parts[1]
      else if tag is "add" or tag is "sub" or tag is "mult" or tag is "div"
        # Math operator tags
        parts = data.split("=")
        name  = parts[0]
        value = parts[1]

        # Initialize the variable?
        if typeof(@master._users[user][name]) isnt "undefined"
          @master._users[user][name] = 0

        # Sanity check
        value = parseInt(value)
        if isNaN(value)
          insert = "[ERR: Math can't '#{tag}' non-numeric value '#{value}']"
        else if isNaN(parseInt(@master._users[user][name]))
          insert = "[ERR: Math can't '#{tag}' non-numeric user variable '#{name}']"
        else
          result = parseInt(@master._users[user][name])
          if tag is "add"
            result += value
          else if tag is "sub"
            result -= value
          else if tag is "mult"
            result *= value
          else if tag is "div"
            if value is 0
              insert = "[ERR: Can't Divide By Zero]"
            else
              result /= value

          # No errors?
          if insert is ""
            @master._users[user][name] = result
      else if tag is "get"
        insert = if typeof(@master._users[user][data] isnt "undefined") \
          then @master._users[user][data] \
          else "undefined"
      else
        # Unrecognized tag, preserve it
        insert = "\x00#{match}\x01"

      reply = reply.replace(new RegExp("<#{match}>"), insert)

    # Recover mangled HTML-like tags
    reply = reply.replace(/\x00/g, "<")
    reply = reply.replace(/\x01/g, ">")

    # Topic setter
    match = reply.match(/\{topic=(.+?)\}/i)
    giveup = 0
    while match
      giveup++
      if giveup >= 50
        @warn "Infinite loop looking for topic tag!"
        break

      name = match[1]
      @master._users[user].topic = name
      reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "")
      match = reply.match(/\{topic=(.+?)\}/i) # Look for more

    # Inline redirector
    match = reply.match(/\{@(.+?)\}/)
    giveup = 0
    while match
      giveup++
      if giveup >= 50
        @warn "Infinite loop looking for redirect tag!"
        break

      target = match[1]
      @say "Inline redirection to: #{target}"
      subreply = @_getReply(user, target, "normal", step+1, scope)
      reply = reply.replace(new RegExp("\\{@" + utils.quotemeta(target) + "\\}", "i"), subreply)
      match = reply.match(/\{@(.+?)\}/)

    # Object caller
    reply = reply.replace(/\{__call__\}/g, "<call>")
    reply = reply.replace(/\{\/__call__\}/g, "</call>")
    match = reply.match(/<call>(.+?)<\/call>/i)
    giveup = 0
    while match
      giveup++
      if giveup >= 50
        @warn "Infinite loop looking for call tag!"
        break

      text  = utils.strip(match[1])
      parts = text.split(/\s+/)
      obj   = parts.unshift()
      args  = parts

      # Do we know this object?
      output = ""
      if @master._objlangs[obj]
        # We do. Do we have a handler for it?
        lang = @master._objlangs[obj]
        if @master._handlers[lang]
          # We do.
          output = @master._handlers[lang].call(this, obj, args, scope)
        else
          output = "[ERR: No Object Handler]"
      else
        output = "[ERR: Object Not Found]"

      reply = reply.replace(new RegExp("<call>" + utils.quotemeta(match[1]) + "</call>", "i"), output)
      match = reply.match(/<call>(.+?)<\/call>/i)

    return reply

  ##
  # string substitute (string msg, string type)
  #
  # Run substitutions against a message. `type` is either "sub" or "person" for
  # the type of substitution to run.
  substitute: (msg, type) ->
    result = ""

    # Safety checking.
    if not @master._sorted[type]
      @master.warn "You forgot to call sortReplies()!"
      return ""

    # Get the substitutions map.
    subs = if type is "sub" then @master._sub else @master._person

    # Make placeholders each time we substitute something.
    ph = []
    pi = 0

    for pattern in @master._sorted[type]
      result = subs[pattern]
      qm     = utils.quotemeta pattern

      # Make a placeholder.
      ph.push result
      placeholder = "\x00#{pi}\x00"
      pi++

      # Run substitutions.
      msg = msg.replace(new RegExp("^#{qm}$", "g"),           placeholder)
      msg = msg.replace(new RegExp("^#{qm}(\\W+)", "g"),      "#{placeholder}$1")
      msg = msg.replace(new RegExp("(\\W+)#{qm}(\\W+)", "g"), "$1#{placeholder}$2")
      msg = msg.replace(new RegExp("(\\W+)#{qm}$", "g"),      "$1#{placeholder}")

    # Convert the placeholders back in.
    tries = 0
    while msg.indexOf("\x00") > -1
      tries++
      if tries > 50
        @warn "Too many loops in substitution placeholders!"
        break

      match = msg.match("\\x00(.+?)\\x00")
      if match
        cap = parseInt(match[1])
        result = ph[cap]
        msg = msg.replace(new RegExp("\x00#{cap}\x00", "g"), result)

    return msg


module.exports = Brain
