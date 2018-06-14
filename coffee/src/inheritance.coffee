# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/

##
# Topic inheritance functions.
#
# These are helper functions to assist with topic inheritance and includes.
##

##
# string[] getTopicTriggers (RiveScript rs, string topic, object triglvl,
#                            int depth, int inheritance, int inherited)
#
# Recursively scan through a topic and retrieve a listing of all triggers in
# that topic and in all included/inherited topics. Some triggers will come out
# with an {inherits} tag to signify inheritance depth.
#
# * topic: The name of the topic
# * thats: Boolean, are we getting replies with %Previous or not?
# * triglvl: reference to this._topics or this._thats
# * depth: recursion depth counter
#
# Each "trigger" returned from this function is actually an array, where index
# 0 is the trigger text and index 1 is the pointer to the trigger's data within
# the original topic structure.
##
getTopicTriggers = (rs, topic, thats, depth, inheritance, inherited) ->
  # Initialize default triggers.
  if not thats?
    thats = false
  if not depth?
    depth = 0
  if not inheritance?
    inheritance = 0
  if not inherited?
    inherited = 0

  # Break if we're in too deep.
  if depth > rs._depth
    rs.warn "Deep recursion while scanning topic inheritance (gave up in topic #{topic})!"
    return []

  # Keep in mind here that there is a difference between 'includes' and
  # 'inherits' -- topics that inherit other topics are able to OVERRIDE
  # triggers that appear in the inherited topic. This means that if the top
  # topic has a trigger of simply '*', then NO triggers are capable of
  # matching in ANY inherited topic, because even though * has the lowest
  # priority, it has an automatic priority over all inherited topics.
  #
  # The getTopicTriggers method takes this into account. All topics that
  # inherit other topics will have their triggers prefixed with a fictional
  # {inherits} tag, which would start at {inherits=0} and increment if this
  # topic has other inheriting topics. So we can use this tag to make sure
  # topics that inherit things will have their triggers always be on top of
  # the stack, from inherits=0 to inherits=n.

  # Important info about the depth vs. inheritance params to this function:
  # depth increments by 1 each time this function recursively calls itself.
  # inheritance increments by 1 only when this topic inherits another topic.
  #
  # This way, '> topic alpha includes beta inherits gamma' will have this
  # effect:
  #  alpha and beta's triggers are combined together into one matching pool,
  #  and then those triggers have higher priority than gamma's.
  #
  # The inherited option is true if this is a recursive call, from a topic
  # that inherits other topics. This forces the {inherits} tag to be added to
  # the triggers. This only applies when the top topic 'includes' another
  # topic.
  rs.say "Collecting trigger list for topic #{topic} (depth=#{depth}; " \
        + "inheritance=#{inheritance}; inherited=#{inherited})"

  # Topic doesn't exist?
  if not rs._topics[topic]?
    rs.warn "Inherited or included topic '#{topic}' doesn't exist or " \
      + "has no triggers"
    return []

  # Collect an array of triggers to return.
  triggers = []

  # Get those that exist in this topic directly.
  inThisTopic = []
  if not thats
    # The non-that structure is: {topics}->[ array of triggers ]
    if rs._topics[topic]?
      for trigger in rs._topics[topic]
        inThisTopic.push [trigger.trigger, trigger]
  else
    # The 'that' structure is: {topic}->{cur trig}->{prev trig}->{trigger info}
    if rs._thats[topic]?
      for curTrig of rs._thats[topic]
        continue unless rs._thats[topic].hasOwnProperty curTrig
        for previous of rs._thats[topic][curTrig]
          continue unless rs._thats[topic][curTrig].hasOwnProperty previous
          pointer = rs._thats[topic][curTrig][previous]
          inThisTopic.push [pointer.trigger, pointer]

  # Does this topic include others?
  if Object.keys(rs._includes[topic]).length > 0
    # Check every included topic.
    for includes of rs._includes[topic]
      continue unless rs._includes[topic].hasOwnProperty includes
      rs.say "Topic #{topic} includes #{includes}"
      triggers.push.apply(triggers, getTopicTriggers(
        rs, includes, thats, depth+1, inheritance+1, false
      ))

  # Does this topic inherit others?
  if Object.keys(rs._inherits[topic]).length > 0
    # Check every inherited topic
    for inherits of rs._inherits[topic]
      continue unless rs._inherits[topic].hasOwnProperty inherits
      rs.say "Topic #{topic} inherits #{inherits}"
      triggers.push.apply(triggers, getTopicTriggers(
        rs, inherits, thats, depth+1, inheritance+1, true
      ))

  # Collect the triggers for *this* topic. If this topic inherits any other
  # topics, it means that this topic's triggers have higher priority than
  # those in any inherited topics. Enforce this with an {inherits} tag.
  if Object.keys(rs._inherits[topic]).length > 0 or inherited
    for trigger in inThisTopic
      rs.say "Prefixing trigger with {inherits=#{inheritance}} #{trigger}"
      triggers.push.apply(triggers, [
        ["{inherits=#{inheritance}}#{trigger[0]}", trigger[1]]
      ])
  else
    triggers.push.apply(triggers, inThisTopic)

  return triggers

##
# string[] getTopicTree (RiveScript rs, string topic, int depth)
#
# Given a topic, this returns an array of every topic related to it (all the
# topics it includes or inherits, plus all the topics included or inherited
# by those topics, and so on). The array includes the original topic, too.
getTopicTree = (rs, topic, depth) ->
  # Default depth
  if not depth?
    depth = 0

  # Break if we're in too deep.
  if depth > rs._depth
    rs.warn "Deep recursion while scanning topic tree!"
    return []

  # Collect an array of all topics.
  topics = [topic]

  for includes of rs._topics[topic].includes
    continue unless rs._topics[topic].includes.hasOwnProperty includes
    topics.push.apply(topics, getTopicTree(rs, includes, depth+1))

  for inherits of rs._topics[topic].inherits
    continue unless rs._topics[topic].inherits.hasOwnProperty inherits
    topics.push.apply(topics, getTopicTree(rs, inherits, depth+1))

  return topics

exports.getTopicTriggers = getTopicTriggers
exports.getTopicTree     = getTopicTree
