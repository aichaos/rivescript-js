# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/
"use strict"

##
# JSObjectHandler (RiveScript master)
#
# JavaScript Language Support for RiveScript Macros. This support is enabled by
# default in RiveScript.js; if you don't want it, override the `javascript`
# language handler to null, like so:
#
# ```javascript
#    bot.setHandler("javascript", null);
# ```
##
class JSObjectHandler
  constructor: (master) ->
    @_master  = master
    @_objects = {}

  ##
  # void load (string name, string[]|function code)
  #
  # Called by the RiveScript object to load JavaScript code.
  ##
  load: (name, code) ->
    if typeof code is "function"
      # If code is just a js function, store the reference as is
      @_objects[name] = code
    else
      # We need to make a dynamic JavaScript function.
      source = "this._objects[\"" + name + "\"] = function(rs, args) {\n" \
        + code.join("\n") \
        + "}\n"

      try
        eval source
      catch e
        @_master.warn "Error evaluating JavaScript object: " + e.message

  ##
  # string call (RiveScript rs, string name, string[] fields)
  #
  # Called by the RiveScript object to execute JavaScript code.
  ##
  call: (rs, name, fields, scope) ->
    # We have it?
    if not @_objects[name]
      return @_master.errors.objectNotFound

    # Call the dynamic method.
    func = @_objects[name]
    reply = ""
    try
      reply = func.call(scope, rs, fields)
    catch e
      reply = "[ERR: Error when executing JavaScript object: #{e.message}]"

    # Allow undefined responses.
    if reply is undefined
      reply = ""

    return reply

module.exports = JSObjectHandler
