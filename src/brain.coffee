# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/
"use strict"

# Brain logic for RiveScript
utils = require("./utils")
inherit_utils = require("./inheritance")
RSVP = require("rsvp")
q = require("q")
_ = require("lodash")

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
  # Promise reply (string user, string msg[, scope, skipBegin])
  #
  # Fetch a reply for the user, respecting hooks and using promises
  ##
  replyPromisified: (user, msg, scope, async, skipBegin, hooks = {}) ->
    @say "Asked to reply to [#{user}] #{msg}"

    # Store the current user's ID.
    @_currentUser = user

    # Format their message.
    msg   = @formatMessage(msg)
    promise = q(msg)

    # Set initial match to be undefined
    if @master.getUservars(user)
      @master._users[user].__initialmatch__ = undefined

    # If the BEGIN block exists, consult it first.
    if not skipBegin and @master._topics.__begin__
      promise = promise.then (reply) =>
        @say "Begin #{reply}"
        @_getReplyWithHooks(user, "request", "begin", 0, scope, hooks)
      .then (begin) =>
        @say "After Begin #{begin}"

        if !begin then return

        # OK to continue?
        if begin.indexOf("{ok}") > -1
          @_getReplyWithHooks(user, msg, "normal", 0, scope, hooks).then (reply) =>
            reply = begin.replace(/\{ok\}/g, reply)
            return @processTagsPromisified(user, msg, reply,  [], [], 0, scope, hooks)
        else
          return @processTagsPromisified(user, msg, begin,  [], [], 0, scope, hooks)
    else
      promise = promise.then (reply) =>
        @_getReplyWithHooks(user, reply, "normal", 0, scope, hooks)

    promise.then (reply) =>
      if reply?
        reply = @processCallTags(reply, scope, true, hooks)

      if not utils.isAPromise(reply)
        @onAfterReply(msg, user, reply)
      else
        return reply.then (result) =>
          @onAfterReply(msg, user, result)
          reply
      reply

  ##
  # Promise<string> _getReplyWithHooks 
  #
  # Get a reply and call hooks along the way
  ##
  _getReplyWithHooks: (user, msg, context, step, scope, hooks) ->
    @say "Reply: #{msg} step: #{step}"
    matchResults = @_getMatch(user, msg, context, step, scope)
    stars        = matchResults.stars
    thatstars    = matchResults.thatstars
    promise      = q()

    if matchResults.matched?
      # process tags in the afterMatch command
      if matchResults.matched and hooks.onAfterMatch?
        matchResults.matched.afterMatch = (@processTags(user, msg, row, stars, thatstars, step, scope) for row in matchResults.matched.afterMatch)
        matchResults.matched.afterMatch = (@processCallTags(row, scope, false, hooks) for row in matchResults.matched.afterMatch)
        promise = hooks.onAfterMatch(matchResults)

      promise.then =>
        @_getReplyPromisified(user, msg, context, step || 0, scope, matchResults, hooks)
    else
      q(@master.errors.replyNotMatched)

  ##
  # string _getReply (string user, string msg, string context, int step, scope)
  #
  # The internal reply method. DO NOT CALL THIS DIRECTLY.
  #
  # * user, msg and scope are the same as reply()
  # * context = "normal" or "begin"
  # * step = the recursion depth
  # * scope = the call scope for object macros
  # * matched = allow passing in a manual match
  ##
  _getReplyPromisified: (user, msg, context, step, scope, matchResults, hooks) ->

    # Avoid deep recursion.
    if step > @master._depth
      return @master.errors.deepRecursion

    # If we haven't passed in a manual match
    if !matchResults
      matchResults = @_getMatch(user, msg, context, step, scope)

    matched    = matchResults.matched
    stars      = matchResults.stars
    thatstars  = matchResults.thatstars
    foundMatch = Boolean(matched)

    @say "Reducing #{matched.condition}"
    _.reduce(matched.condition, (promise, condition) =>
      promise.then (result) =>
        halves = condition.split(/\s*=>\s*/)
        if result isnt false and halves.length is 2
          @_checkCondition(user, halves[0], msg, stars, thatstars, step, scope).then (result) =>
            if result is true
              matched.reply = [halves[1]]
              # break out of promise loop
              return false
        else
          return result
    , q()).then =>

      # Process tags for the BEGIN block.
      if context is "begin"
        # The BEGIN block can set {topic} and user vars.
        reply = _.get(matched, 'reply.0')

        @say "Matched in begin #{reply}"

        # Topic setter
        match = reply.match(/\{topic=(.+?)\}/i)
        giveup = 0
        while match
          giveup++
          if giveup >= 50
            @warn "Infinite loop looking for topic tag!"
            break
          name = match[1]
          @master.setUservar(user, "topic", name)
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
          @master.setUservar(user, name, value)
          reply = reply.replace(new RegExp("<set " + utils.quotemeta(name) + "=" + utils.quotemeta(value) + ">", "ig"), "")
          match = reply.match(/<set (.+?)=(.+?)>/i)
        return q(reply)

      # Did we match?
      if matched
        # Keep the current match
        @master._users[user].__last_triggers__.push matched

        # See if there are any hard redirects.
        if matched.redirect?
          @say "Redirecting us to #{matched.redirect}"
          return @processTagsPromisified(user, msg, matched.redirect, stars, thatstars, step, scope, hooks).then (redirect) =>
            # Execute and resolve *synchronous* <call> tags.
            redirect = @processCallTags(redirect, scope, false)
            @say "Pretend user said: #{redirect}"
            return @_getReplyWithHooks(user, redirect, context, step+1, scope, hooks)
        else
          length = _.get(matched, 'reply.length')
          
          if length is 1
            @say "Returning first reply #{matched.reply[0]}"
            return matched.reply[0]
          else if length  > 1
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
            return bucket[choice]
          else if _.get(matched, 'reply.length', 0) is 0
            return @master.errors.replyNotFound
      else
        return q(@master.errors.replyNotMatched)
    .then (reply) =>
      # begin tags are special and are handled above
      if context isnt "begin"
        @say "Processing tags #{reply}"
        @processTagsPromisified(user, msg, reply, stars, thatstars, step, scope, hooks)
      else
        return reply

  _checkCondition: (user, condition, msg, stars, thatstars, step, scope) ->
    @say "Check Condition #{condition}"
    condition = condition.match(/^(.+?)\s+(==|eq|!=|ne|<>|<|<=|>|>=)\s+(.*?)$/)
    passed    = false
    if condition
      left = utils.strip(condition[1])
      eq   = condition[2]
      right = utils.strip(condition[3])

      # Process tags all around
      left  = @processTags(user, msg, left, stars, thatstars, step, scope)
      right = @processTags(user, msg, right, stars, thatstars, step, scope)

      # Execute any <call> tags in the conditions. We explicitly send
      # `false` as the async parameter, because we can't run async
      # object macros in conditionals; we need the result NOW
      # for comparison.
      left  = @processCallTags(left, scope, false)
      right = @processCallTags(right, scope, false)

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
    q(passed)

  ##
  # string reply (string user, string msg[, scope])
  #
  # Fetch a reply for the user.
  ##
  reply: (user, msg, scope, async, skipBegin) ->
    @say "Asked to reply to [#{user}] #{msg}"

    # Store the current user's ID.
    @_currentUser = user

    # Format their message.
    msg   = @formatMessage(msg)
    reply = ""

    # Set initial match to be undefined
    if @master.getUservars(user)
      @master._users[user].__initialmatch__ = undefined

    # If the BEGIN block exists, consult it first.
    if not skipBegin and @master._topics.__begin__
      begin = @_getReply(user, "request", "begin", 0, scope)

      # OK to continue?
      if begin.indexOf("{ok}") > -1
        reply = @_getReply(user, msg, "normal", 0, scope)
        begin = begin.replace(/\{ok\}/g, reply)

      reply = begin
      reply = @processTags(user, msg, reply, [], [], 0, scope)
    else
      reply = @_getReply(user, msg, "normal", 0, scope)

    reply = @processCallTags(reply, scope, async)

    if not utils.isAPromise(reply)
      @onAfterReply(msg, user, reply)
    else
      reply.then (result) =>
        @onAfterReply(msg, user, result)

    return reply

  onAfterReply: (msg, user, reply) ->
    # Save their reply history
    @master._users[user].__history__.input.pop()
    @master._users[user].__history__.input.unshift(msg)
    @master._users[user].__history__.reply.pop()
    @master._users[user].__history__.reply.unshift(reply)

    # Unset the current user ID.
    @_currentUser = undefined

  ##
  # string|Promise processCallTags (string reply, object scope, bool async, object hooks)
  #
  # Process <call> tags in the preprocessed reply string.
  # If `async` is true, processCallTags can handle asynchronous subroutines
  # and it returns a promise, otherwise a string is returned.
  # Hooks are passed along so that they can be hadned off to redirects.
  ##
  processCallTags: (reply, scope, async, hooks) ->
    reply = reply.replace(/«__call__»/ig, "<call>")
    reply = reply.replace(/«\/__call__»/ig, "</call>")
    callRe = /<call>([\s\S]+?)<\/call>/ig
    argsRe = /«__call_arg__»([\s\S]*?)«\/__call_arg__»/ig

    giveup = 0
    matches = {}
    promises = []

    while true
      giveup++
      if giveup >= 50
        @warn "Infinite loop looking for call tag!"
        break

      match = callRe.exec(reply)

      if not match
        break

      text = utils.trim(match[1])

      # get subroutine name
      subroutineNameMatch = (/(\S+)/ig).exec(text)
      subroutineName = subroutineNameMatch[0]

      args = []

      # get arguments
      while true
        m = argsRe.exec(text)
        if not m
          break
        args.push(m[1])


      matches[match[1]] =
        text: text
        obj: subroutineName
        args: args

    # go through all the object calls and run functions
    for k,data of matches
      output = ""
      if @master._objlangs[data.obj]
        # We do. Do we have a handler for it?
        lang = @master._objlangs[data.obj]
        if @master._handlers[lang]
          # We do.
          output = @master._handlers[lang].call(@master, data.obj, data.args, scope, hooks)
        else
          output = "[ERR: No Object Handler]"
      else
        output = @master.errors.objectNotFound

      if async
        # If our output isn't a promise, wrap it
        if not utils.isAPromise(output)
          output = new RSVP.Promise((resolve)->resolve(output))
        promises.push
          promise: output
          text: k
        continue
      else if utils.isAPromise(output)
        output = "[ERR: Using async routine with reply: use replyAsync instead]"
    
      reply = @._replaceCallTags(k, output, reply)

    if not async
      return reply
    else
      # wait for all the promises to be resolved and
      # return a resulting promise with the final reply
      return new RSVP.Promise (resolve, reject) =>
        RSVP.all(p.promise for p in promises).then (results) =>
          for i in [0...results.length]
            reply = @_replaceCallTags(promises[i].text, results[i], reply)

          resolve(reply)
        .catch (reason) =>
          reject(reason)

  _replaceCallTags: (callSignature, callResult, reply) ->
    return reply.replace(new RegExp("<call>" + utils.quotemeta(callSignature) + "</call>", "i"), callResult)

  _parseCallArgsString: (args) ->
    # turn args string into a list of arguments
    result = []
    buff = ""
    insideAString = false
    spaceRe = /\s/ig
    doubleQuoteRe = /"/ig

    flushBuffer = () ->
      if buff.length isnt 0
        result.push(buff)
      buff = ""

    for c in args
      if c.match(spaceRe) and not insideAString
        flushBuffer()
        continue
      if c.match(doubleQuoteRe)
        if insideAString
          flushBuffer()
        insideAString = not insideAString
        continue
      buff = buff + c

    flushBuffer()

    return result

  _wrapArgumentsInCallTags: (reply) ->
    # wrap arguments inside <call></call> in «__call_arg__»«/__call_arg__»
    callRegEx = /<call>\s*(.*?)\s*<\/call>/ig
    callArgsRegEx = /<call>\s*[^\s]+ (.*)<\/call>/ig

    callSignatures = []

    while true
      match = callRegEx.exec(reply)

      if not match
        break

      originalCallSignature = match[0]
      wrappedCallSignature = originalCallSignature

      while true
        argsMatch = callArgsRegEx.exec(originalCallSignature)
        if not argsMatch
          break

        originalArgs = argsMatch[1]
        args = @_parseCallArgsString(originalArgs)
        wrappedArgs = []

        for a in args
          wrappedArgs.push "«__call_arg__»#{a}«/__call_arg__»"

        wrappedCallSignature = wrappedCallSignature.replace(originalArgs,
          wrappedArgs.join(' '))

      callSignatures.push
        original: originalCallSignature
        wrapped: wrappedCallSignature

    for cs in callSignatures
      reply = reply.replace cs.original, cs.wrapped

    reply

  _getMatch: (user, msg, context, step, scope) ->
    # Needed to sort replies?
    if not @master._sorted.topics
      @warn "You forgot to call sortReplies()!"
      return "ERR: Replies Not Sorted"

    # Initialize the user's profile?
    if not @master.getUservars(user)
      @master.setUservar(user, "topic", "random")

    # Collect data on this user.
    topic     = @master.getUservar(user, "topic")
    stars     = []
    thatstars = [] # For %Previous
    reply     = ""

    # Avoid letting them fall into a missing topic.
    if not @master._topics[topic]
      @warn "User #{user} was in an empty topic named '#{topic}'"
      topic = "random"
      @master.setUservar(user, "topic", topic)

    # Are we in the BEGIN block?
    if context is "begin"
      topic = "__begin__"

    # Initialize this user's history.
    if not @master._users[user].__history__
      @master._users[user].__history__ = {}

    # Update input &/or reply if given array is missing or empty
    if not @master._users[user].__history__.input || @master._users[user].__history__.input.length == 0
      @master._users[user].__history__.input = [
        "undefined", "undefined", "undefined", "undefined", "undefined",
        "undefined", "undefined", "undefined", "undefined", "undefined"
      ]
    if not @master._users[user].__history__.reply || @master._users[user].__history__.reply.length == 0
      @master._users[user].__history__.reply = [
        "undefined", "undefined", "undefined", "undefined", "undefined",
        "undefined", "undefined", "undefined", "undefined", "undefined"
      ]

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

        if @master._sorted.thats[top].length
          # There's one here!
          @say "There's a %Previous in this topic!"

          # Do we have history yet?
          lastReply = @master._users[user].__history__.reply[0] || "undefined"

          # Format the bot's last reply the same way as the human's.
          lastReply = @formatMessage(lastReply, true)
          @say "Last reply: #{lastReply}"

          # See if it's a match
          for trig in @master._sorted.thats[top]
            pattern = trig[1].previous
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
        else
          @say "No %Previous in this topic!"

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

    if step is 0
      # Store initial matched trigger. Like __lastmatch__, this can be undefined.
      @master._users[user].__initialmatch__ = matchedTrigger

      # Also initialize __last_triggers__ which will keep all matched triggers
      @master._users[user].__last_triggers__ = []

    return _.cloneDeep({
      matched: matched
      stars: stars
      thatstars: thatstars
    })


  ##
  # string _getReply (string user, string msg, string context, int step, scope)
  #
  # The internal reply method. DO NOT CALL THIS DIRECTLY.
  #
  # * user, msg and scope are the same as reply()
  # * context = "normal" or "begin"
  # * step = the recursion depth
  # * scope = the call scope for object macros
  # * matched = allow passing in a manual match
  ##
  _getReply: (user, msg, context, step, scope, matchResults) ->

    # Avoid deep recursion.
    if step > @master._depth
      return @master.errors.deepRecursion

    # If we haven't passed in a manual match
    if !matchResults
      matchResults = @_getMatch(user, msg, context, step, scope)

    matched = matchResults.matched
    stars = matchResults.stars
    thatstars = matchResults.thatstars
    foundMatch = Boolean(matched)

    # Did we match?
    if matched
      # Keep the current match
      @master._users[user].__last_triggers__.push matched

      for nil in [1] # A single loop so we can break out early
        # See if there are any hard redirects.
        if matched.redirect?
          @say "Redirecting us to #{matched.redirect}"
          redirect = @processTags(user, msg, matched.redirect, stars, thatstars, step, scope)

          # Execute and resolve *synchronous* <call> tags.
          redirect = @processCallTags(redirect, scope, false)

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
              potreply = halves[1].trim()

              # Process tags all around
              left  = @processTags(user, msg, left, stars, thatstars, step, scope)
              right = @processTags(user, msg, right, stars, thatstars, step, scope)

              # Execute any <call> tags in the conditions. We explicitly send
              # `false` as the async parameter, because we can't run async
              # object macros in conditionals; we need the result NOW
              # for comparison.
              left  = @processCallTags(left, scope, false)
              right = @processCallTags(right, scope, false)

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
      reply = @master.errors.replyNotMatched
    else if reply is undefined or reply.length is 0
      reply = @master.errors.replyNotFound

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
        @master.setUservar(user, "topic", name)
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
        @master.setUservar(user, name, value)
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
      if @master.unicodePunctuation?
        msg = msg.replace(@master.unicodePunctuation, "")

      # For the bot's reply, also strip common punctuation.
      if botreply?
        msg = msg.replace(/[.?,!;:@#$%^&*()]/, "")
    else
      # For everything else, strip all non-alphanumerics
      msg = utils.stripNasties(msg, @utf8)

    # cut leading and trailing blanks once punctuation dropped office
    msg = msg.trim()
    msg = msg.replace(/\s+/g, " ")
    return msg

  ##
  # string triggerRegexp (string user, string trigger)
  #
  # Prepares a trigger for the regular expression engine.
  ##
  triggerRegexp: (user, regexp) ->
    boundary = "(?:^|$|\\s|\\b)+"
    # If the trigger is simply '*' then the * needs to become (.*?)
    # to match the blank string too.
    regexp = regexp.replace(/^\*$/, "<zerowidthstar>")

    # Simple replacements.
    regexp = regexp.replace(/\*/g, "(.+?)")   # Convert * into (.+?)
    regexp = regexp.replace(/#/g,  "(\\d+?)") # Convert # into (\d+?)
    regexp = regexp.replace(/_/g,  "(\\w+?)") # Convert _ into (\w+?)
    regexp = regexp.replace(/\s*\{weight=\d+\}\s*/g, "") # Remove {weight} tags
    regexp = regexp.replace(/<zerowidthstar>/g, "(.*?)")
    regexp = regexp.replace(/\|{2,}/, '|') # Remove empty entities
    regexp = regexp.replace(/(\(|\[)\|/g, '$1') # Remove empty entities from start of alt/opts
    regexp = regexp.replace(/\|(\)|\])/g, '$1') # Remove empty entities from end of alt/opts

    # UTF-8 mode special characters.
    if @utf8
      regexp = regexp.replace(/\\@/, "\\u0040") # @ symbols conflict w/ arrays

    # Optionals.
    match = regexp.match(/\[(.+?)\]/)
    giveup = 0
    while match
      if giveup++ > 50
        @warn "Infinite loop when trying to process optionals in a trigger!"
        return ""

      # The resulting regexp needs to work in two scenarios:
      # 1) The user included the optional word(s) in which case they must be
      #    in the message surrounded by a space or a word boundary (e.g. the
      #    end or beginning of their message)
      # 2) The user did not include the word, meaning the whole entire set of
      #    words should be "OR'd" with a word boundary or one or more spaces.
      #
      # The resulting regexp ends up looking like this, for a given input
      # trigger of: what is your [home|office] number
      #
      # what is your(?:(?:\s|\b)+home(?:\s|\b)+|(?:\s|\b)+office(?:\s|\b)+|(?:\b|\s)+)number
      #
      # See https://github.com/aichaos/rivescript-js/issues/48

      parts = match[1].split("|")
      opts  = []
      for p in parts
        opts.push(boundary + p + boundary);

      # If this optional had a star or anything in it, make it non-matching.
      pipes = opts.join("|")
      pipes = pipes.replace(new RegExp(utils.quotemeta("(.+?)"), "g"),   "(?:.+?)")
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\d+?)"), "g"), "(?:\\d+?)")
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\w+?)"), "g"), "(?:\\w+?)")

      # Temporarily dummy out the literal square brackets so we don't loop forever
      # thinking that the [\s\b] part is another optional.
      pipes = pipes.replace(/\[/g, "__lb__").replace(/\]/g, "__rb__")

      regexp = regexp.replace(new RegExp("\\s*\\[" + utils.quotemeta(match[1]) + "\\]\\s*"),
        "(?:#{pipes}|" + boundary + ")")
      match = regexp.match(/\[(.+?)\]/)

    # Restore the literal square brackets.
    regexp = regexp.replace(/__lb__/g, "[").replace(/__rb__/g, "]")

    # _ wildcards can't match numbers! Quick note on why I did it this way:
    # the initial replacement above (_ => (\w+?)) needs to be \w because the
    # square brackets in [\s\d] will confuse the optionals logic just above.
    # So then we switch it back down here. Also, we don't just use \w+ because
    # that matches digits, and similarly [A-Za-z] doesn't work with Unicode,
    # so this regexp excludes spaces and digits instead of including letters.
    regexp = regexp.replace(/\\w/, "[^\\s\\d]")

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
        rep = @master.getUservar(user, name)
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

    # Recover escaped Unicode symbols.
    if @utf8 and regexp.indexOf("\\u") > -1
      regexp = regexp.replace(/\\u([A-Fa-f0-9]{4})/, (match, grp) ->
        return String.fromCharCode(parseInt(grp, 16))
      )

    # Prevent accidental wildcard match due to double-pipe (e.g. /hi||hello/)
    regexp = regexp.replace(/\|{2,}/mg, '|')

    return regexp

  ##
  # string processTags (string user, string msg, string reply, string[] stars,
  #                     string[] botstars, int step, scope)
  #
  # Process tags in a reply element.
  #
  # All the tags get processed here except for `<call>` tags which have
  # a separate subroutine (refer to `processCallTags` for more info)
  ##
  processTagsPromisified: (user, msg, reply, st, bst, step, scope, hooks) ->
    # Prepare the stars and botstars.
    stars = [""]
    stars.push.apply(stars, st)
    botstars = [""]
    botstars.push.apply(botstars, bst)
    if stars.length is 1
      stars.push "undefined"
    if botstars.length is 1
      botstars.push "undefined"

    # Turn arrays into randomized sets.
    match = reply.match(/\(@([A-Za-z0-9_]+)\)/i)
    giveup = 0
    while match
      if giveup++ > @master._depth
        @warn "Infinite loop looking for arrays in reply!"
        break

      name = match[1]
      if @master._array[name]
        result = "{random}" + @master._array[name].join("|") + "{/random}"
      else
        result = "\x00@#{name}\x00" # Dummy it out so we can reinsert it later.

      reply = reply.replace(new RegExp("\\(@" + utils.quotemeta(name) + "\\)", "ig")
        result)
      match = reply.match(/\(@([A-Za-z0-9_]+)\)/i)
    reply = reply.replace(/\x00@([A-Za-z0-9_]+)\x00/g, "(@$1)")

    # Wrap args inside call tags
    reply = @_wrapArgumentsInCallTags(reply)

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
    reply = reply.replace(/<input>/ig, @master._users[user].__history__.input[0] || "undefined")
    reply = reply.replace(/<reply>/ig, @master._users[user].__history__.reply[0] || "undefined")
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
    reply = reply.replace(/<call>/ig, "«__call__»")
    reply = reply.replace(/<\/call>/ig, "«/__call__»")

    while true
      # This regexp will match a <tag> which contains no other tag inside it,
      # i.e. in the case of <set a=<get b>> it will match <get b> but not the
      # <set> tag, on the first pass. The second pass will get the <set> tag,
      # and so on.
      match = reply.match(/<([^<]+?)>/)
      if not match
        break # No remaining tags!

      match = match[1]
      parts = match.split(" ")
      tag   = parts[0].toLowerCase()
      data  = ""
      if parts.length > 1
        data = parts.slice(1).join(" ")
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
        @master.setUservar(user, parts[0], parts[1])
      else if tag is "add" or tag is "sub" or tag is "mult" or tag is "div"
        # Math operator tags
        parts = data.split("=")
        name  = parts[0]
        value = parts[1]

        # Initialize the variable?
        if @master.getUservar(user, name) is "undefined"
          @master.setUservar(user, name, 0)

        # Sanity check
        value = parseInt(value)
        if isNaN(value)
          insert = "[ERR: Math can't '#{tag}' non-numeric value '#{value}']"
        else if isNaN(parseInt(@master.getUservar(user, name)))
          insert = "[ERR: Math can't '#{tag}' non-numeric user variable '#{name}']"
        else
          result = parseInt(@master.getUservar(user, name))
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
            @master.setUservar(user, name, result)
      else if tag is "get"
        insert = @master.getUservar(user, data)
      else
        # Unrecognized tag, preserve it
        insert = "\x00#{match}\x01"

      reply = reply.replace(new RegExp("<#{utils.quotemeta(match)}>"), insert)

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
      @master.setUservar(user, "topic", name)
      reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "")
      match = reply.match(/\{topic=(.+?)\}/i) # Look for more

    # Inline redirector
    redirects = reply.match(/\{@([^\}]*?)\}/g)
    _.reduce( redirects, (promise, redirect) =>
      promise.then =>
        match = redirect.match(/\{@([^\}]*?)\}/)
        target = utils.strip match[1]

        # Resolve any *synchronous* <call> tags right now before redirecting.
        target = @processCallTags(target, scope, false)

        @say "Inline redirection to: #{target}"
        @_getReplyWithHooks(user, target, "normal", step+1, scope, hooks).then (subreply) =>
          reply = reply.replace(new RegExp("\\{@" + utils.quotemeta(match[1]) + "\\}", "i"), subreply)
    , q(reply))

  ##
  # string processTags (string user, string msg, string reply, string[] stars,
  #                     string[] botstars, int step, scope)
  #
  # Process tags in a reply element.
  #
  # All the tags get processed here except for `<call>` tags which have
  # a separate subroutine (refer to `processCallTags` for more info)
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

    # Turn arrays into randomized sets.
    match = reply.match(/\(@([A-Za-z0-9_]+)\)/i)
    giveup = 0
    while match
      if giveup++ > @master._depth
        @warn "Infinite loop looking for arrays in reply!"
        break

      name = match[1]
      if @master._array[name]
        result = "{random}" + @master._array[name].join("|") + "{/random}"
      else
        result = "\x00@#{name}\x00" # Dummy it out so we can reinsert it later.

      reply = reply.replace(new RegExp("\\(@" + utils.quotemeta(name) + "\\)", "ig")
        result)
      match = reply.match(/\(@([A-Za-z0-9_]+)\)/i)
    reply = reply.replace(/\x00@([A-Za-z0-9_]+)\x00/g, "(@$1)")

    # Wrap args inside call tags
    reply = @_wrapArgumentsInCallTags(reply)

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
    reply = reply.replace(/<input>/ig, @master._users[user].__history__.input[0] || "undefined")
    reply = reply.replace(/<reply>/ig, @master._users[user].__history__.reply[0] || "undefined")
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
    reply = reply.replace(/<call>/ig, "«__call__»")
    reply = reply.replace(/<\/call>/ig, "«/__call__»")

    while true
      # This regexp will match a <tag> which contains no other tag inside it,
      # i.e. in the case of <set a=<get b>> it will match <get b> but not the
      # <set> tag, on the first pass. The second pass will get the <set> tag,
      # and so on.
      match = reply.match(/<([^<]+?)>/)
      if not match
        break # No remaining tags!

      match = match[1]
      parts = match.split(" ")
      tag   = parts[0].toLowerCase()
      data  = ""
      if parts.length > 1
        data = parts.slice(1).join(" ")
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
        @master.setUservar(user, parts[0], parts[1])
      else if tag is "add" or tag is "sub" or tag is "mult" or tag is "div"
        # Math operator tags
        parts = data.split("=")
        name  = parts[0]
        value = parts[1]

        # Initialize the variable?
        if @master.getUservar(user, name) is "undefined"
          @master.setUservar(user, name, 0)

        # Sanity check
        value = parseInt(value)
        if isNaN(value)
          insert = "[ERR: Math can't '#{tag}' non-numeric value '#{value}']"
        else if isNaN(parseInt(@master.getUservar(user, name)))
          insert = "[ERR: Math can't '#{tag}' non-numeric user variable '#{name}']"
        else
          result = parseInt(@master.getUservar(user, name))
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
            @master.setUservar(user, name, result)
      else if tag is "get"
        insert = @master.getUservar(user, data)
      else
        # Unrecognized tag, preserve it
        insert = "\x00#{match}\x01"

      reply = reply.replace(new RegExp("<#{utils.quotemeta(match)}>"), insert)

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
      @master.setUservar(user, "topic", name)
      reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "")
      match = reply.match(/\{topic=(.+?)\}/i) # Look for more

    # Inline redirector
    match = reply.match(/\{@([^\}]*?)\}/)
    giveup = 0
    while match
      giveup++
      if giveup >= 50
        @warn "Infinite loop looking for redirect tag!"
        break

      target = utils.strip match[1]

      # Resolve any *synchronous* <call> tags right now before redirecting.
      target = @processCallTags(target, scope, false)

      @say "Inline redirection to: #{target}"
      subreply = @_getReply(user, target, "normal", step+1, scope)
      reply = reply.replace(new RegExp("\\{@" + utils.quotemeta(match[1]) + "\\}", "i"), subreply)
      match = reply.match(/\{@([^\}]*?)\}/)

    return reply

  ##
  # string substitute (string msg, string type)
  #
  # Run substitutions against a message. `type` is either "sub" or "person" for
  # the type of substitution to run.
  substitute: (msg, type) ->

    # Safety checking.
    if not @master._sorted[type]
      @master.warn "You forgot to call sortReplies()!"
      return ""

    # Get the substitutions map.
    subs = if type is "sub" then @master._sub else @master._person

    # Get the max number of words in sub/person to minimize interations
    maxwords = if type is "sub" then @master._submax else @master._personmax

    result = ""

    # Take the original message with no punctuation
    if @master.unicodePunctuation?
      pattern = msg.replace(@master.unicodePunctuation, "")
    else
      pattern = msg.replace(/[.,!?;:]/g, "")

    tries = 0
    giveup = 0
    subgiveup = 0

    # Look for words/phrases until there is no "spaces" in pattern
    while pattern.indexOf(" ") > -1
      giveup++
      # Give up if there are too many substitutions (for safety)
      if giveup >= 1000
        @warn "Too many loops when handling substitutions!"
        break

      li = utils.nIndexOf(pattern, " ", maxwords)
      subpattern = pattern.substring(0, li)

      # If finds the pattern in sub object replace and stop to look
      result = subs[subpattern];
      if result!=undefined
          msg = msg.replace(subpattern, result)
      else
        # Otherwise Look for substitutions in a subpattern
        while subpattern.indexOf(" ") > -1
            subgiveup++
            # Give up if there are too many substitutions (for safety)
            if subgiveup >= 1000
                @warn("Too many loops when handling substitutions!")
                break

              li = subpattern.lastIndexOf(" ");
              subpattern = subpattern.substring(0, li);

              # If finds the subpattern in sub object replace and stop to look
              result = subs[subpattern];
              if result!=undefined
                  msg = msg.replace(subpattern, result)
                  break

              tries++;

      fi = pattern.indexOf(" ")
      pattern = pattern.substring(fi+1)
      tries++

    # After all loops, see if just one word is in the pattern
    result = subs[pattern]
    if result!=undefined
        msg = msg.replace(pattern, result)

    return msg

module.exports = Brain
