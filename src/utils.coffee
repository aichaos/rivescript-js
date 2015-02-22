# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/

# Miscellaneous utility functions.

##
# string strip (string)
#
# Strip extra whitespace from both ends of the string, and remove
# line breaks anywhere in the string.
##
exports.strip = (text) ->
  text = text.replace(/^[\s\t]+/, "") \
             .replace(/[\s\t]+$/, "") \
             .replace(/[\x0D\x0A]+/, "");
  return text

##
# void extend (object a, object b)
#
# Combine the properties of both objects into one. The properties from
# object 'b' are insert into 'a'.
##
exports.extend = (a, b) ->
  for attr, value of b
    a[attr] = value
    continue

##
# int word_count (string)
#
# Count the number of real words in a string.
##
exports.word_count = (trigger, all) ->
  words = []
  if all
    words = trigger.split /\s+/
  else
    words = trigger.split /[\s\*\#\_\|]+/

  wc = 0
  for word in words
    if word.length > 0
      wc++

  return wc
