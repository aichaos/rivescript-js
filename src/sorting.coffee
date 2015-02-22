# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/

# Data sorting functions

utils = require("./utils")

##
# string[] sortTriggerSet (string[] triggers[, func say])
#
# Sort a group of triggers in an optimal sorting order. The `say` parameter is
# a reference to RiveScript.say() or provide your own function (or not) for
# debug logging from within this function.
##
exports.sortTriggerSet = (triggers, say) ->
  if not say?
    say = ->
      return

  # Create a priority map.
  prior =
    "0": [] # Default priority = 0

  # Sort triggers by their weights.
  for trig in triggers
    match = trig.match(/\{weight=(\d+)\}/i)
    weight = 0
    if match and match[1]
      weight = match[1]

    if not prior[weight]?
      prior[weight] = []
    prior[weight].push trig

  # Keep a running list of sorted triggers for this topic.
  running = []
  prior_sort = Object.keys(prior).sort (a, b) ->
    return b - a

  for p in prior_sort
    say "Sorting triggers with priority #{p}"

    # So, some of these triggers may include an {inherits} tag, if they came
    # from a topic which inherits another topic. Lower inherits values mean
    # higher priority on the stack.
    inherits = -1         # -1 means no {inherits} tag
    highest_inherits = -1 # highest number seen so far

    # Loop through and categorize these triggers.
    track = {}
    track[inherits] = initSortTrack()

    for trig in prior[p]
      say "Looking at trigger: #{trig}"

      # See if it has an inherits tag.
      match = trig.match(/\{inherits=(\d+)\}/i)
      if match
        inherits = parseInt(match[1])
        if inherits > highest_inherits
          highest_inherits = inherits
        say "Trigger belongs to a topic that inherits other topics.
              Level=#{inherits}"
        trig = trig.replace(/\{inherits=\d+\}/ig, "")
      else
        inherits = -1

      # If this is the first time we've seen this inheritence level,
      # initialize its sort track structure.
      if not track[inherits]?
        track[inherits] = initSortTrack()

      # Start inspecting the trigger's contents.
      if trig.indexOf("_") > -1
        # Alphabetic wildcard included.
        cnt = utils.word_count trig
        say "Has a _ wildcard with #{cnt} words."
        if cnt > 1
          if not track[inherits].alpha[cnt]?
            track[inherits].alpha[cnt] = []
          track[inherits].alpha[cnt].push trig
        else
          track[inherits].under.push trig
      else if trig.indexOf("#") > -1
        # Numeric wildcard included.
        cnt = utils.word_count trig
        say "Has a # wildcard with #{cnt} words."
        if cnt > 1
          if not track[inherits].number[cnt]?
            track[inherits].number[cnt] = []
          track[inherits].number[cnt].push trig
        else
          track[inherits].pound.push trig
      else if trig.indexOf("*") > -1
        # Wildcard included.
        cnt = utils.word_count trig
        say "Has a * wildcard with #{cnt} words."
        if cnt > 1
          if not track[inherits].wild[cnt]?
            track[inherits].wild[cnt] = []
          track[inherits].wild[cnt].push trig
        else
          track[inherits].star.push trig
      else if trig.indexOf("[") > -1
        # Optionals included.
        cnt = utils.word_count trig
        say "Has optionals with #{cnt} words."
        if not track[inherits].option[cnt]?
          track[inherits].option[cnt] = []
        track[inherits].option[cnt].push trig
      else
        # Totally atomic
        cnt = utils.word_count trig
        say "Totally atomic trigger with #{cnt} words."
        if not track[inherits].atomic[cnt]?
          track[inherits].atomic[cnt] = []
        track[inherits].atomic[cnt].push trig

    # Move the no-{inherits} triggers to the bottom of the stack.
    track[ (highest_inherits + 1) ] = track['-1']
    delete track['-1']

    # Add this group to the sort track.
    track_sorted = Object.keys(track).sort (a, b) ->
      return a-b
    for ip in track_sorted
      say "ip=#{ip}"

      # Sort each of the main kinds of triggers by their word counts.
      for kind in ["atomic", "option", "alpha", "number", "wild"]
        kind_sorted = Object.keys(track[ip][kind]).sort (a, b) ->
          return b-a
        for wordcnt in kind_sorted
          # Triggers with equal word lengths should be sorted by overall
          # trigger length.
          sorted_by_length = track[ip][kind][wordcnt].sort (a, b) ->
            return b.length-a.length
          running.push.apply running, sorted_by_length

      # Add the single wildcard triggers.
      under_sorted = track[ip].under.sort (a, b) -> return b.length-a.length
      pound_sorted = track[ip].pound.sort (a, b) -> return b.length-a.length
      star_sorted  = track[ip].star.sort (a, b) -> return b.length-a.length

      running.push.apply running, under_sorted
      running.push.apply running, pound_sorted
      running.push.apply running, star_sorted

  return running

##
# string[] sortList (string[] items)
#
# Sort a list of strings by their word counts and lengths.
##
exports.sortList = (items) ->
  # Track by number of words.
  track = {}

  # Loop through each item.
  for item in items
    cnt = utils.word_count item, true
    if not track[cnt]?
      track[cnt] = []
    track[cnt].push item

  # Sort them.
  output = []
  sorted = Object.keys(track).sort (a, b) -> return b-a
  for count in sorted
    bylen = track[count].sort (a, b) -> return b.length-a.length
    output.push.apply output, bylen

  return output

##
# private object initSortTrack ()
#
# Returns a new object for keeping track of triggers for sorting.
##
initSortTrack = ->
  return {
    atomic: {} # Sort by number of whole words
    option: {} # Sort optionals by number of words
    alpha: {}  # Sort alpha wildcards by no. of words
    number: {} # Sort numeric wildcards by no. of words
    wild: {}   # Sort wildcards by no. of words
    pound: []  # Triggers of just '#'
    under: []  # Triggers of just '_'
    star: []   # Triggers of just '*'
  }
