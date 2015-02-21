# Constants
VERSION    = "1.0.5"
RS_VERSION = "2.0"

class RiveScript
    constructor: (opts) ->
        @_debug  = false
        @_strict = true
        @_depth  = 50
        @_utf8   = false
        @_div    = undefined

        # Identify our runtime environment. Web, or node?
        @_node    = {} # NodeJS objects
        @_runtime = @runtime()

    runtime: () ->
        # In Node, there is no window, and module is a thing.
        if typeof(window) is "undefined" and typeof(module) is "object"
            @_node.fs = require "fs"
            return "node"
        return "web"

module.exports = RiveScript
