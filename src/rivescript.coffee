# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/
"use strict"

# Constants
VERSION  = "1.0.5"

# Helper modules
Parser  = require "./parser"
utils   = require "./utils"
sorting = require "./sorting"
inherit_utils = require "./inheritence"
JSObjectHandler = require "./lang/javascript"

##
# RiveScript (hash options)
#
# Create a new RiveScript interpreter. `options` is an object with the
# following keys:
#
# bool debug:    Debug mode            (default false)
# int  depth:    Recursion depth limit (default 50)
# bool strict:   Strict mode           (default true)
# bool utf8:     Enable UTF-8 mode     (default false)
# func onDebug:  Set a custom handler to catch debug log messages (default null)
##
class RiveScript

  ##############################################################################
  # Constructor and Debug Methods                                              #
  ##############################################################################

  constructor: (opts) ->
    # Default parameters
    @_debug   = if opts.debug then opts.debug else false
    @_strict  = if opts.strict then opts.strict else true
    @_depth   = if opts.depth then parseInt(opts.depth) else 50
    @_utf8    = if opts.utf8 then opts.utf8 else false
    @_onDebug = if opts.onDebug then opts.onDebug else null

    # Identify our runtime environment. Web, or node?
    @_node    = {} # NodeJS objects
    @_runtime = @runtime()

    # Parser helper
    @parser = new Parser @

    # Loading files in will be asynchronous, so we'll need to abe able to
    # identify when we've finished loading files! This will be an object
    # to keep track of which files are still pending.
    @_pending   = []
    @_loadCount = 0

    # Internal data structures
    @_global   = {} # 'global' variables
    @_var      = {} # 'bot' variables
    @_sub      = {} # 'sub' substitutions
    @_person   = {} # 'person' substitutions
    @_array    = {} # 'array' variables
    @_users    = {} # 'user' variables
    @_freeze   = {} # frozen 'user' variables
    @_includes = {} # included topics
    @_inherits = {} # inherited topics
    @_handlers = {} # object handlers
    @_objlangs = {} # map objects to their languages
    @_topics   = {} # main reply structure
    @_thats    = {} # %Previous reply structure (pointers into @_topics)
    @_sorted   = {} # Sorted buffers

    # "Current transaction" variables
    @_currentUser = null # Current user ID

    # Given any options?
    if typeof(opts) is "object"
      if opts.debug then @_debug = true
      if opts.strict then @_strict = true
      if opts.depth then @_depth = parseInt opts.depth
      if opts.utf8 then @_utf8 = true

    # Set the default JavaScript language handler.
    @_handlers.javascript = new JSObjectHandler @

    @say "RiveScript Interpreter v#{VERSION} Initialized."
    @say "Runtime Environment: #{@_runtime}"

  ##
  # string version ()
  #
  # Returns the version number of the RiveScript.js library.
  ##
  version: ->
    return VERSION

  ##
  # private void runtime ()
  #
  # Detect the runtime environment of this module, to determine if we're
  # running in a web browser or from node.
  ##
  runtime: ->
    # In Node, there is no window, and module is a thing.
    if typeof(window) is "undefined" and typeof(module) is "object"
      @_node.fs = require "fs"
      return "node"
    return "web"

  ##
  # private void say (string message)
  #
  # This is the debug function. If debug mode is enabled, the 'message' will be
  # sent to the console via console.log (if available), or to your `onDebug`
  # handler if you defined one.
  ##
  say: (message) ->
    if @_debug isnt true
      return

    # Debug log handler defined?
    if @_onDebug
      @_onDebug message
    else
      console.log message

  ##
  # private void warn (string message[, filename, lineno])
  #
  # Print a warning or error message. This is like debug, except it's GOING to
  # be given to the user one way or another. If the `onDebug` handler is
  # defined, this is sent there. If `console` is available, this will be sent
  # there. In a worst case scenario, an alert box is shown.
  ##
  warn: (message, filename, lineno) ->
    # Provided a file and line?
    if filename? and lineno?
      message += " at #{filename} line #{lineno}"

    if @_onDebug
      @_onDebug "[WARNING] #{message}"
    else if console
      if console.error
        console.error message
      else
        console.log "[WARNING] #{message}"
    else if window
      window.alert message

  ##############################################################################
  # Loading and Parsing Methods                                                #
  ##############################################################################

  ##
  # int loadFile (string path || array path[, onSuccess[, onError]])
  #
  # Load a RiveScript document from a file. The path can either be a string that
  # contains the path to a single file, or an array of paths to load multiple
  # files. `onSuccess` is a function to be called when the file(s) have been
  # successfully loaded. `onError` is for catching any errors, such as syntax
  # errors.
  #
  # This loading method is asynchronous. You should define an `onSuccess`
  # handler to be called when the file(s) have been successfully loaded.
  #
  # This method returns a "batch number" for this load attempt. The first call
  # to this function will have the batch number of 0 and that will go up from
  # there. This batch number is passed to your `onSuccess` handler as its only
  # argument, in case you want to correlate it with your call to `loadFile()`.
  #
  # `onSuccess` receives: int batchNumber
  # `onError` receives: string errorMessage[, int batchNumber]
  ##
  loadFile: (path, onSuccess, onError) ->
    # Did they give us a single path?
    if typeof(path) is "string"
      path = [ path ]

    # To identify when THIS batch of files completes, we keep track of them
    # under the "loadcount"
    loadCount = @_loadCount++
    @_pending[loadCount] = {}

    # Go through and load the files.
    for file in path
      @say "Request to load file: #{file}"
      @_pending[loadCount][file] = 1

      # How do we load the file?
      if @_runtime is "web"
        # With ajax!
        @_ajaxLoadFile loadCount, file, onSuccess, onError
      else
        # With fs module!
        @_nodeLoadFile loadCount, file, onSuccess, onError

    return loadCount

  # Load a file using ajax. DO NOT CALL THIS DIRECTLY.
  _ajaxLoadFile: (loadCount, file, onSuccess, onError) ->
    # Make the ajax request with jQuery. TODO: don't use jQuery.
    $.ajax
      url: file
      dataType: "text"
      success: (data, textStatus, xhr) =>
        @say "Loading file #{file} complete."

        # Parse it!
        @parse file, data, onError

        # Log that we've received this file.
        delete @_pending[loadCount][file]

        # All gone?
        if Object.keys(@_pending[loadCount]).length is 0
          if typeof(onSuccess) is "function"
            onSuccess.call undefined, loadCount
      error (xhr, textStatus, errorThrown) =>
        @say "Ajax error! #{textStatus}; #{errorThrown}"
        if typeof(onError) is "function"
          onError.call undefined, textStatus, loadCount

  # Load a file using node. DO NOT CALL THIS DIRECTLY.
  _nodeLoadFile: (loadCount, file, onSuccess, onError) ->
    # Load the file.
    @_node.fs.readFile file, (err, data) =>
      if err
        if typeof(onError) is "function"
          onError.call undefined, err, loadCount
        else
          @warn err
        return

      # Parse it!
      @parse file, ""+data, onError

      # Log that we've received this file.
      delete @_pending[loadCount][file]

      # All gone?
      if Object.keys(@_pending[loadCount]).length is 0
        if typeof(onSuccess) is "function"
          onSuccess.call undefined, loadCount

  ##
  # void loadDirectory (string path[, func onSuccess[, func onError]])
  #
  # Load RiveScript documents from a directory.
  #
  # This function is not supported in a web environment.
  ##
  loadDirectory: (path, onSuccess, onError) ->
    # Can't be done on the web!
    if @_runtime is "web"
      @warn "loadDirectory can't be used on the web!"
      return

    loadCount = @_loadCount++
    @_pending[loadCount] = {}

    @say "Loading batch #{loadCount} from directory #{path}"

    # Read the directory.
    @_node.fs.readdir path, (err, files) =>
      if err
        if typeof(onError) is "function"
          onError.call undefined, err
        else
          @warn err
        return

      toLoad = []
      for file in files
        if file.match(/\.(rive|rs)$/i)
          # Keep track of the file's status.
          @_pending[loadCount][path+"/"+file] = 1
          toLoad.push path+"/"+file

      # Load all the files.
      for file in toLoad
        @say "Parsing file #{file} from directory"
        @_nodeLoadFile loadCount, file, onSuccess, onError

  ##
  # bool stream (string code[, func onError])
  #
  # Stream in RiveScript code dynamically. `code` should be the raw RiveScript
  # source code as a string (with line breaks after each line).
  #
  # This function is synchronous, meaning there is no success handler needed.
  # It will return false on parsing error, true otherwise.
  #
  # `onError` receives: string errorMessage
  ##
  stream: (code, onError) ->
    @say "Streaming code."
    return @parse "stream()", code, onError

  ##
  # private bool parse (string name, string code[, func onError])
  #
  # Parse RiveScript code and load it into memory. `name` is a file name in case
  # syntax errors need to be pointed out. `code` is the source code, and
  # `onError` is a function to call when a syntax error occurs.
  ##
  parse: (filename, code, onError) ->
    @say "Parsing code!"

    # Get the "abstract syntax tree"
    ast = @parser.parse filename, code, onError

    # Get all of the "begin" type variables: global, var, sub, person, array..
    for type, vars of ast.begin
      internal = "_#{type}" # so "global" maps to this._global
      for name, value of vars
        if value is "<undef>"
          delete @[internal][name]
        else
          @[internal][name] = value

    # Consume all the parsed triggers.
    for topic, data of ast.topics
      # Keep a map of the topics that are included/inherited under this topic.
      if not @_includes[topic]?
        @_includes[topic] = {}
      if not @_inherits[topic]?
        @_inherits[topic] = {}
      utils.extend(@_includes[topic], data.includes)
      utils.extend(@_inherits[topic], data.inherits)

      # Consume the triggers.
      if not @_topics[topic]?
        @_topics[topic] = []
      for trigger in data.triggers
        @_topics[topic].push trigger

        # Does this trigger have a %Previous? If so, make a pointer to this
        # exact trigger in @_thats.
        if trigger.previous?
          # Initialize the @_thats structure first.
          if not @_thats[topic]?
            @_thats[topic] = {}
          if not @_thats[topic][trigger.trigger]?
            @_thats[topic][trigger.trigger] = {}
          @_thats[topic][trigger.trigger][trigger.previous] = trigger

    console.log JSON.stringify(@_inherits, null, 2)

  ##
  # void sortReplies()
  #
  # After you have finished loading your RiveScript code, call this method to
  # populate the various sort buffers. This is absolutely necessary for reply
  # matching to work efficiently!
  ##
  sortReplies: () ->
    # (Re)initialize the sort cache.
    @_sorted.topics = {}
    @_sorted.thats  = {}
    @say "Sorting triggers..."

    # Loop through all the topics.
    for topic of @_topics
      @say "Analyzing topic #{topic}..."

      # Collect a list of all the triggers we're going to worry about. If this
      # topic inherits another topic, we need to recursively add those to the
      # list as well.
      allTriggers = inherit_utils.getTopicTriggers(@, topic)

      # Sort these triggers.
      @_sorted.topics[topic] = sorting.sortTriggerSet(allTriggers, true)

      # Get all of the %Previous triggers for this topic.
      thatTriggers = inherit_utils.getTopicTriggers(@, topic, true)

      # And sort them, too.
      @_sorted.thats[topic] = sorting.sortTriggerSet(thatTriggers, false)

    # Sort the substitution lists.
    @_sorted.sub    = sorting.sortList Object.keys(@_sub)
    @_sorted.person = sorting.sortList Object.keys(@_person)

  ##############################################################################
  # Public Configuration Methods                                               #
  ##############################################################################

  # TODO: setHandler, etc.

  ##############################################################################
  # Reply Fetching Methods                                                     #
  ##############################################################################



module.exports = RiveScript
