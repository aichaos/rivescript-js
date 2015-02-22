# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/

# Topic inheritence functions.

##
# string[] getTopicTriggers (RiveScript rs, string topic, object triglvl,
#                            int depth, int inheritence, int inherited)
#
# Recursively scan through a topic and retrieve a listing of all triggers in
# that topic and in all included/inherited topics. Some triggers will come out
# with an {inherits} tag to signify inheritence depth.
#
# topic: The name of the topic
# triglvl: reference to this._topics or this._thats
# depth: recursion depth counter
##
getTopicTriggers = (rs, topic, depth, inheritence, inherited) ->
  # Initialize default triggers.
  if not depth?
    depth = 0
  if not inheritence?
    inheritence = 0
  if not inherited?
    inherited = 0

  # Break if we're in too deep.
  if depth > rs._depth
    rs.warn "Deep recursion while scanning topic inheritence!"
    return

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

  # Important info about the depth vs. inheritence params to this function:
  # depth increments by 1 each time this function recursively calls itself.
  # inheritence increments by 1 only when this topic inherits another topic.
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
  rs.say "Collecting trigger list for topic #{topic} (depth=#{depth};
        inheritence=#{inheritence}; inherited=#{inherited})"

  # Collect an array of triggers to return.
  triggers = []

  # Get those that exist in this topic directly.
  inThisTopic = []
  if rs._topics[topic]?
    for trigger in rs._topics[topic]
      inThisTopic.push trigger.trigger

  # Does this topic include others?
  if Object.keys(rs._includes[topic]).length > 0
    # Check every included topic.
    for includes of rs._includes[topic]
      rs.say "Topic #{topic} includes #{includes}"
      triggers.push.apply(triggers, getTopicTriggers(
        rs, includes, depth+1, inheritence+1, false
      ))

  # Does this topic inherit others?
  if Object.keys(rs._inherits[topic]).length > 0
    # Check every inherited topic
    for inherits of rs._inherits[topic]
      rs.say "Topic #{topic} inherits #{inherits}"
      triggers.push.apply(triggers, getTopicTriggers(
        rs, inherits, depth+1, inheritence+1, true
      ))

  # Collect the triggers for *this* topic. If this topic inherits any other
  # topics, it means that this topic's triggers have higher priority than
  # those in any inherited topics. Enforce this with an {inherits} tag.
  if Object.keys(rs._inherits[topic]).length > 0 or inherited
    for trigger in inThisTopic
      rs.say "Prefixing trigger with {inherits=#{inheritence}} #{trigger}"
      triggers.push.apply(triggers, ["{inherits=#{inheritence}}#{trigger}"])
  else
    triggers.push.apply(triggers, inThisTopic)

  return triggers

exports.getTopicTriggers = getTopicTriggers
