# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/

##
# Miscellaneous utility functions.
##

##
# string strip (string)
#
# Strip extra whitespace from both ends of the string, and remove
# line breaks anywhere in the string.
##
exports.strip = (text) ->
  text = text.replace(/^[\s\t]+/, "") \
             .replace(/[\s\t]+$/, "") \
             .replace(/[\x0D\x0A]+/, "")
  return text

##
# string trim (string)
#
# Compatible implementation of `String.prototype.trim()`. Strips whitespace
# from the beginning and end of the string, but doesn't remove any
# whitespace inside the string like `strip()` does.
##
exports.trim = (text) ->
  text = text.replace(/^[\x0D\x0A\s\t]+/, "") \
             .replace(/[\x0D\x0A\s\t]+$/, "")
  return text

##
# void extend (object a, object b)
#
# Combine the properties of both objects into one. The properties from
# object 'b' are inserted into 'a'.
##
exports.extend = (a, b) ->
  for attr, value of b
    continue unless b.hasOwnProperty attr
    a[attr] = value

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

##
# string stripNasties (string, bool utf8)
#
# Stip special characters out of a string.
##
exports.stripNasties = (string, utf8) ->
  if utf8
    # Allow most things in UTF8 mode.
    string = string.replace(/[\\<>]+/g, "")
    return string
  string = string.replace(/[^A-Za-z0-9 ]/g, "")
  return string

##
# string quotemeta (string)
#
# Escape a string for a regexp.
##
exports.quotemeta = (string) ->
  unsafe = "\\.+*?[^]$(){}=!<>|:".split("")
  for char in unsafe
    string = string.replace(new RegExp("\\#{char}", "g"), "\\#{char}")
  return string

##
# bool isAtomic (string trigger)
#
# Determine whether a trigger is atomic.
##
exports.isAtomic = (trigger) ->
  # Atomic triggers don't contain any wildcards or parenthesis or anything of
  # the sort. We don't need to test the full character set, just left brackets
  # will do.
  for special in ["*", "#", "_", "(", "[", "<", "@" ]
    if trigger.indexOf(special) > -1
      return false
  return true

##
# string stringFormat (string type, string)
#
# Formats a string according to one of the following types:
# - formal
# - sentence
# - uppercase
# - lowercase
##
exports.stringFormat = (type, string) ->
  if type is "uppercase"
    return string.toUpperCase()
  else if type is "lowercase"
    return string.toLowerCase()
  else if type is "sentence"
    string += ""
    first = string.charAt(0).toUpperCase()
    return first + string.substring(1)
  else if type is "formal"
    words = string.split(/\s+/)
    result = []
    for word in words
      first = word.charAt(0).toUpperCase()
      result.push(first + word.substring(1))
    return result.join(" ")
  return content

##
# object clone (object)
#
# Clone an object.
##
exports.clone = (obj) ->
  if obj is null or typeof(obj) isnt "object"
    return obj

  copy = obj.constructor()
  for key of obj
    continue unless obj.hasOwnProperty key
    copy[key] = exports.clone(obj[key])

  return copy

##
# boolean isAPromise (object)
#
# Determines if obj looks like a promise
##
exports.isAPromise = (obj) ->
  return obj and obj.then and obj.catch and obj.finally and
  typeof obj.then is 'function' and
  typeof obj.catch is 'function' and
  typeof obj.finally is 'function'

##
# int nIndexOf (string, string match, int index)
#
# Finds a match in a string at a given index
#
# Usage:
# string = "My name is Rive"
# match = " "
# index = 2
# return = 7
#
# Summary: It will look for a second space in the string
##
exports.nIndexOf = (string, match, index) ->
   return string.split(match, index).join(match).length
