# RiveScript.js
#
# This code is released under the MIT License.
# See the "LICENSE" file for more information.
#
# http://www.rivescript.com/
"use strict"

##
# Notice to Developers
#
# The methods prefixed with the word "private" *should not be used* by you. They
# are documented here to help the RiveScript library developers understand the
# code; they are not considered 'stable' API functions and they may change or
# be removed at any time, for any reason, and with no advance notice.
#
# The most commonly used private function I've seen developers use is the
# `parse()` function, when they want to load RiveScript code from a string
# instead of a file. **Do not use this function.** The public API equivalent
# function is `stream()`. The parse function will probably be removed in the
# near future.
##

# Constants
VERSION  = "1.17.2"

# Helper modules
Parser  = require "./parser"
Brain   = require "./brain"
utils   = require "./utils"
sorting = require "./sorting"
inherit_utils = require "./inheritance"
JSObjectHandler = require "./lang/javascript"
RSVP = require("rsvp")
readDir = require("fs-readdir-recursive")

##
# RiveScript (hash options)
#
# Create a new RiveScript interpreter. `options` is an object with the
# following keys:
#
# ```
# * bool debug:     Debug mode               (default false)
# * int  depth:     Recursion depth limit    (default 50)
# * bool strict:    Strict mode              (default true)
# * bool utf8:      Enable UTF-8 mode        (default false, see below)
# * bool forceCase: Force-lowercase triggers (default false, see below)
# * func onDebug:   Set a custom handler to catch debug log messages (default null)
# * obj  errors:    Customize certain error messages (see below)
# * str  concat:    Globally replace the default concatenation mode when parsing
#                   RiveScript source files (default `null`. be careful when
#                   setting this option if using somebody else's RiveScript
#                   personality; see below)
# ```
#
# ## UTF-8 Mode
#
# In UTF-8 mode, most characters in a user's message are left intact, except for
# certain metacharacters like backslashes and common punctuation characters like
# `/[.,!?;:]/`.
#
# If you want to override the punctuation regexp, you can provide a new one by
# assigning the `unicodePunctuation` attribute of the bot object after
# initialization. Example:
#
# ```javascript
# var bot = new RiveScript({utf8: true});
# bot.unicodePunctuation = new RegExp(/[.,!?;:]/g);
# ```
#
# ## Force Case
#
# This option to the constructor will make RiveScript lowercase all the triggers
# it sees during parse time. This may ease the pain point that authors
# experience when they need to write a lowercase "i" in triggers, for example
# a trigger of `i am *`, where the lowercase `i` feels unnatural to type.
#
# By default a capital ASCII letter in a trigger would raise a parse error.
# Setting the `forceCase` option to `true` will instead silently lowercase the
# trigger and thus avoid the error.
#
# Do note, however, that this can have side effects with certain Unicode symbols
# in triggers, see [case folding in Unicode](https://www.w3.org/International/wiki/Case_folding).
# If you need to support Unicode symbols in triggers this may cause problems with
# certain symbols when made lowercase.
#
# ## Global Concat Mode
#
# The concat (short for concatenation) mode controls how RiveScript joins two
# lines of code together when a `^Continue` command is used in a source file.
# By default, RiveScript simply joins them together with no symbols inserted in
# between ("none"); the other options are "newline" which joins them with line
# breaks, or "space" which joins them with a single space character.
#
# RiveScript source files can define a *local, file-scoped* setting for this
# by using e.g. `! local concat = newline`, which affects how the continuations
# are joined in the lines that follow.
#
# Be careful when changing the global concat setting if you're using a RiveScript
# personality written by somebody else; if they were relying on the default
# concat behavior (didn't specify a `! local concat` option), then changing the
# global default will potentially cause formatting issues or trigger matching
# issues when using that personality.
#
# I strongly recommend that you **do not** use this option if you intend to ever
# share your RiveScript personality with others; instead, explicitly spell out
# the local concat mode in each source file. It might sound like it will save
# you a lot of typing by not having to copy and paste a `! local concat` option,
# but it will likely lead to misbehavior in your RiveScript personality when you
# give it to somebody else to use in their bot.
#
# ## Custom Error Messages
#
# You can provide any or all of the following properties in the `errors`
# argument to the constructor to override certain internal error messages:
#
# * `replyNotMatched`: The message returned when the user's message does not
#   match any triggers in your RiveScript code.
#
#   The default is "ERR: No Reply Matched"
#
#   **Note:** the recommended way to handle this case is to provide a trigger of
#   simply `*`, which serves as the catch-all trigger and is the default one
#   that will match if nothing else matches the user's message. Example:
#
#   ```
#   + *
#   - I don't know what to say to that!
#   ```
# * `replyNotFound`: This message is returned when the user *did* in fact match
#   a trigger, but no response was found for the user. For example, if a trigger
#   only checks a set of conditions that are all false and provides no "normal"
#   reply, this error message is given to the user instead.
#
#   The default is "ERR: No Reply Found"
#
#   **Note:** the recommended way to handle this case is to provide at least one
#   normal reply (with the `-` command) to every trigger to cover the cases
#   where none of the conditions are true. Example:
#
#   ```
#   + hello
#   * <get name> != undefined => Hello there, <get name>.
#   - Hi there.
#   ```
# * `objectNotFound`: This message is inserted into the bot's reply in-line when
#   it attempts to call an object macro which does not exist (for example, its
#   name was invalid or it was written in a programming language that the bot
#   couldn't parse, or that it had compile errors).
#
#   The default is "[ERR: Object Not Found]"
# * `deepRecursion`: This message is inserted when the bot encounters a deep
#   recursion situation, for example when a reply redirects to a trigger which
#   redirects back to the first trigger, creating an infinite loop.
#
#   The default is "ERR: Deep Recursion Detected"
#
# These custom error messages can be provided during the construction of the
# RiveScript object, or set afterwards on the object's `errors` property.
#
# Examples:
#
# ```javascript
# var bot = new RiveScript({
#    errors: {
#        replyNotFound: "I don't know how to reply to that."
#    }
# });
#
# bot.errors.objectNotFound = "Something went terribly wrong.";
# ```
#
##
class RiveScript

  ##############################################################################
  # Constructor and Debug Methods                                              #
  ##############################################################################

  constructor: (opts) ->
    if not opts?
      opts = {}

    # Default parameters
    @_debug     = if opts.debug then opts.debug else false
    @_strict    = if opts.strict then opts.strict else true
    @_depth     = if opts.depth then parseInt(opts.depth) else 50
    @_utf8      = if opts.utf8 then opts.utf8 else false
    @_forceCase = if opts.forceCase then opts.forceCase else false
    @_onDebug   = if opts.onDebug then opts.onDebug else null
    @_concat    = if opts.concat then opts.concat else null

    # UTF-8 punctuation, overridable by the user.
    @unicodePunctuation = new RegExp(/[.,!?;:]/g)

    # Customized error messages.
    @errors =
      replyNotMatched:      "ERR: No Reply Matched"
      replyNotFound:        "ERR: No Reply Found"
      objectNotFound:       "[ERR: Object Not Found]"
      deepRecursion:        "ERR: Deep Recursion Detected"
    if typeof(opts.errors) is "object"
      for key, value of opts.errors
        if opts.errors.hasOwnProperty(key)
          @errors[key] = value

    # Identify our runtime environment. Web, or node?
    @_node    = {} # NodeJS objects
    @_runtime = @runtime()

    # Sub-module helpers.
    @parser = new Parser @
    @brain  = new Brain @

    # Loading files in will be asynchronous, so we'll need to abe able to
    # identify when we've finished loading files! This will be an object
    # to keep track of which files are still pending.
    @_pending   = []
    @_loadCount = 0

    # Internal data structures
    @_global   = {} # 'global' variables
    @_var      = {} # 'bot' variables
    @_sub      = {} # 'sub' substitutions
    @_submax   = 1  # 'submax' max words in sub object
    @_person   = {} # 'person' substitutions
    @_personmax= 1  # 'personmax' max words in person object
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
  # Promise Promise
  #
  # Alias for `RSVP.Promise` for use in async object macros.
  #
  # This enables you to create a JavaScript object macro that returns a promise
  # for asynchronous tasks (e.g. polling a web API or database). Example:
  #
  # ```javascript
  # rs.setSubroutine("asyncHelper", function (rs, args) {
  #  return new rs.Promise(function (resolve, reject) {
  #    resolve(42);
  #  });
  # });
  # ```
  #
  # If you're using promises in your object macros, you need to get a reply from
  # the bot using the `replyAsync()` method instead of `reply()`, for example:
  #
  # ```javascript
  # rs.replyAsync(username, message, this).then(function(reply) {
  #    console.log("Bot> ", reply);
  # });
  # ```
  ##
  Promise: RSVP.Promise

  ##
  # private void runtime ()
  #
  # Detect the runtime environment of this module, to determine if we're
  # running in a web browser or from node.
  ##
  runtime: ->
    # Webpack and browserify define `process.browser` so this is the best place
    # to check if we're running in a web environment.
    if process.browser
      return "web"

    # Import the Node filesystem library.
    @_node.fs = require "fs"
    return "node"

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
      error: (xhr, textStatus, errorThrown) =>
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
  # Load RiveScript documents from a directory recursively.
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
    toLoad = []

    # Default error handler/dummy function.
    if not onError?
      onError = () ->
        return

    # Verify the directory exists.
    @_node.fs.stat(path, (err, stats) =>
      if err
        return onError.call undefined, err, loadCount

      if not stats.isDirectory()
        return onError.call undefined, "#{path} is not a directory", loadCount

      @say "Loading batch #{loadCount} from directory #{path}"

      # Load all the files.
      files = readDir(path)
      for file in files
        if file.match(/\.(rive|rs)$/i)
          # Keep track of the file's status.
          @_pending[loadCount][path+"/"+file] = 1
          toLoad.push path+"/"+file

      # Load all the files.
      for file in toLoad
        @say "Parsing file #{file} from directory"
        @_nodeLoadFile loadCount, file, onSuccess, onError
    )

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
      continue unless ast.begin.hasOwnProperty type
      internal = "_#{type}" # so "global" maps to this._global
      for name, value of vars
        if type=='sub' || type=='person'
          @[internal+"max"] = Math.max(@[internal+"max"], name.split(" ").length);
        continue unless vars.hasOwnProperty name
        if value is "<undef>"
          delete @[internal][name]
        else
          @[internal][name] = value

      # Let the scripts set the debug mode and other internals.
      if @_global.debug?
        @_debug = if @_global.debug is "true" then true else false
      if @_global.depth?
        @_depth = parseInt(@_global.depth) or 50

    # Consume all the parsed triggers.
    for topic, data of ast.topics
      continue unless ast.topics.hasOwnProperty topic
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

    # Load all the parsed objects.
    for object in ast.objects
      # Have a handler for it?
      if @_handlers[object.language]
        @_objlangs[object.name] = object.language
        @_handlers[object.language].load(object.name, object.code)

  ##
  # void removeTopic(string topic)
  #
  # If you've loaded a topic that's no longer needed, it can be excised via
  # this function and a subsequent call to sortReplies().  Note that you
  # can't remove other side-effects of the parse() function, just the
  # contents of a topic.  Bad things might happen if other topics inherited
  # from this topic.
  #
  ##
  removeTopic: (topic) ->
    delete @_topics[topic]
    delete @_inherits[topic]
    delete @_includes[topic]
    delete @_thats[topic]
    
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
      continue unless @_topics.hasOwnProperty topic
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

  ##
  # data deparse()
  #
  # Translate the in-memory representation of the loaded RiveScript documents
  # into a JSON-serializable data structure. This may be useful for developing
  # a user interface to edit RiveScript replies without having to edit the
  # RiveScript code manually, in conjunction with the `write()` method.
  #
  # The format of the deparsed data structure is out of scope for this document,
  # but there is additional information and examples available in the `eg/`
  # directory of the source distribution. You can read the documentation on
  # GitHub here: [RiveScript Deparse](https://github.com/aichaos/rivescript-js/tree/master/eg/deparse)
  ##
  deparse: ->
    # Data to return from this function.
    result =
      begin:
        global: utils.clone(@_global)
        var: utils.clone(@_var)
        sub: utils.clone(@_sub)
        person: utils.clone(@_person)
        array: utils.clone(@_array)
        triggers: []
      topics: utils.clone(@_topics)
      inherits: utils.clone(@_inherits)
      includes: utils.clone(@_includes)
      objects: {}

    for key of this._handlers
      result.objects[key] =
        _objects: utils.clone(this._handlers[key]._objects)

    # Begin topic.
    if result.topics.__begin__?
      result.begin.triggers = result.topics.__begin__
      delete result.topics.__begin__

    # Populate config fields if they differ from the defaults.
    if @_debug
      result.begin.global.debug = @_debug
    if @_depth isnt 50
      result.begin.global.depth = @_depth

    return result

  ##
  # string stringify([data deparsed])
  #
  # Translate the in-memory representation of the RiveScript brain back into
  # RiveScript source code. This is like `write()`, but it returns the text of
  # the source code as a string instead of writing it to a file.
  #
  # You can optionally pass the parameter `deparsed`, which should be a data
  # structure of the same format that the `deparse()` method returns. If not
  # provided, the current internal data is used (this function calls `deparse()`
  # itself and uses that).
  #
  # Warning: the output of this function won't be pretty. For example, no word
  # wrapping will be done for your longer replies. The only guarantee is that
  # what comes out of this function is valid RiveScript code that can be loaded
  # back in later.
  ##
  stringify: (deparsed) ->
    return @parser.stringify deparsed

  ##
  # void write (string filename[, data deparsed])
  #
  # Write the in-memory RiveScript data into a RiveScript text file. This
  # method can not be used on the web; it requires filesystem access and can
  # only run from a Node environment.
  #
  # This calls the `stringify()` method and writes the output into the filename
  # specified. You can provide your own deparse-compatible data structure,
  # or else the current state of the bot's brain is used instead.
  ##
  write: (filename, deparsed) ->
    # Can't be done on the web!
    if @_runtime is "web"
      @warn "write() can't be used on the web!"
      return

    @_node.fs.writeFile(filename, @stringify(deparsed), (err) ->
      if err
        @warn "Error writing to file #{filename}: #{err}"
    )

  ##############################################################################
  # Public Configuration Methods                                               #
  ##############################################################################

  ##
  # void setHandler(string lang, object)
  #
  # Set a custom language handler for RiveScript object macros. See the source
  # for the built-in JavaScript handler (src/lang/javascript.coffee) as an
  # example.
  #
  # By default, JavaScript object macros are enabled. If you want to disable
  # these (e.g. for security purposes when loading untrusted third-party code),
  # just set the JavaScript handler to null:
  #
  # ```javascript
  # var bot = new RiveScript();
  # bot.setHandler("javascript", null);
  # ```
  ##
  setHandler: (lang, obj) ->
    if obj is undefined
      delete @_handlers[lang]
    else
      @_handlers[lang] = obj

  ##
  # void setSubroutine(string name, function)
  #
  # Define a JavaScript object macro from your program.
  #
  # This is equivalent to having a JS object defined in the RiveScript code,
  # except your JavaScript code is defining it instead.
  ##
  setSubroutine: (name, code) ->
    # Do we have a JS handler?
    if @_handlers.javascript
      @_objlangs[name] = "javascript"
      @_handlers.javascript.load(name, code)

  ##
  # void setGlobal (string name, string value)
  #
  # Set a global variable. This is equivalent to `! global` in RiveScript.
  # Set the value to `undefined` to delete a global.
  ##
  setGlobal: (name, value) ->
    if value is undefined
      delete @_global[name]
    else
      @_global[name] = value

  ##
  # void setVariable (string name, string value)
  #
  # Set a bot variable. This is equivalent to `! var` in RiveScript.
  # Set the value to `undefined` to delete a bot variable.
  ##
  setVariable: (name, value) ->
    if value is undefined
      delete @_var[name]
    else
      @_var[name] = value

  ##
  # void setSubstitution (string name, string value)
  #
  # Set a substitution. This is equivalent to `! sub` in RiveScript.
  # Set the value to `undefined` to delete a substitution.
  ##
  setSubstitution: (name, value) ->
    if value is undefined
      delete @_sub[name]
    else
      @_submax = Math.max(name.split(' ').length, @_submax)
      @_sub[name] = value

  ##
  # void setPerson (string name, string value)
  #
  # Set a person substitution. This is equivalent to `! person` in RiveScript.
  # Set the value to `undefined` to delete a person substitution.
  ##
  setPerson: (name, value) ->
    if value is undefined
      delete @_person[name]
    else
      @_personmax = Math.max(name.split(' ').length, @_personmax)
      @_person[name] = value

  ##
  # void setUservar (string user, string name, string value)
  #
  # Set a user variable for a user.
  ##
  setUservar: (user, name, value) ->
    # Initialize the user?
    if not @_users[user]
      @_users[user] = {topic: "random"}

    if value is undefined
      delete @_users[user][name]
    else
      # Topic? And are we forcing case?
      if name is "topic" and @_forceCase
        value = value.toLowerCase()
      @_users[user][name] = value

  ##
  # void setUservars (string user, object data)
  #
  # Set multiple user variables by providing an object of key/value pairs.
  # Equivalent to calling `setUservar()` for each pair in the object.
  ##
  setUservars: (user, data) ->
    # Initialize the user?
    if not @_users[user]
      @_users[user] = {topic: "random"}

    for key of data
      continue unless data.hasOwnProperty key

      # Topic? And are we forcing case?
      if key is "topic" and @_forceCase
        data[key] = data[key].toLowerCase()

      if data[key] is undefined
        delete @_users[user][key]
      else
        @_users[user][key] = data[key]

  ##
  # string getVariable (string name)
  #
  # Gets a variable. This is equivalent to `<bot name>` in RiveScript.
  ##
  getVariable: (name) ->
    # The var exists?
    if typeof(@_var[name]) isnt "undefined"
      return @_var[name]
    else
      return "undefined"
 
  ##
  # object getVariables ()
  #
  # Gets all bot variables.
  ##
  getVariables: () ->
    return utils.clone(@_var)

  ##
  # void setVariable (string key, string value)
  #
  # Set a bot variable, or unset it if value is undefined.
  ##
  setVariable: (key, value) ->
    if value is undefined
      delete @_var[key]
    else
      @_var[key] = value

  ##
  # void setVariables (object data)
  #
  # Set multiple bot variables by providing an object of key/value pairs.
  # Equivalent to calling `setVariable()` for each pair in the object.
  ##
  setVariables: (data) ->
    for key of data
      continue unless data.hasOwnProperty key

      if data[key] is undefined
        delete @_var[key]
      else
        @_var[key] = data[key]


  # Alias for getVariable for consistency with getUservar
  getBotvar: (name) ->
    return @getVariable(name)
  # Alias for getVariables for consistency with getUservars
  getBotvars: () ->
    return @getVariables()
  # Alias for setVariable for consistency with getUservar
  setBotvar: (key, value) ->
    @setVariable(key, value)
  # Alias for setVariables for consistency with getUservar
  setBotvars: (data) ->
    @setVariables(data)


  ##
  # string getUservar (string user, string name)
  #
  # Get a variable from a user. Returns the string "undefined" if it isn't
  # defined.
  ##
  getUservar: (user, name) ->
    # No user?
    if not @_users[user]
      return "undefined"

    # The var exists?
    if typeof(@_users[user][name]) isnt "undefined"
      return @_users[user][name]
    else
      return "undefined"

  ##
  # data getUservars ([string user])
  #
  # Get all variables about a user. If no user is provided, returns all data
  # about all users.
  ##
  getUservars: (user) ->
    if user is undefined
      # All the users! Return a cloned object to break refs.
      return utils.clone(@_users)
    else
      if @_users[user]?
        return utils.clone(@_users[user])
      return undefined

  ##
  # void clearUservars ([string user])
  #
  # Clear all a user's variables. If no user is provided, clears all variables
  # for all users.
  ##
  clearUservars: (user) ->
    if user is undefined
      @_users = {}
    else
      delete @_users[user]

  ##
  # void freezeUservars (string user)
  #
  # Freeze the variable state of a user. This will clone and preserve the user's
  # entire variable state, so that it can be restored later with
  # `thawUservars()`
  ##
  freezeUservars: (user) ->
    if @_users[user]?
      @_freeze[user] = utils.clone(@_users[user])
    else
      @warn "Can't freeze vars for user #{user}: not found!"

  ##
  # void thawUservars (string user[, string action])
  #
  # Thaw a user's frozen variables. The action can be one of the following:
  # * discard: Don't restore the variables, just delete the frozen copy.
  # * keep: Keep the frozen copy after restoring
  # * thaw: Restore the variables and delete the frozen copy (default)
  ##
  thawUservars: (user, action="thaw") ->
    if typeof(action) isnt "string"
      action = "thaw"

    # Frozen?
    if not @_freeze[user]?
      @warn "Can't thaw user vars: #{user} wasn't frozen!"
      return

    # What are we doing?
    if action is "thaw"
      @clearUservars(user)
      @_users[user] = utils.clone(@_freeze[user])
      delete @_freeze[user]
    else if action is "discard"
      delete @_freeze[user]
    else if action is "keep"
      @clearUservars(user)
      @_users[user] = utils.clone(@_freeze[user])
    else
      @warn "Unsupported thaw action!"

  ##
  # string lastMatch (string user)
  #
  # Retrieve the trigger that the user matched most recently.
  ##
  lastMatch: (user) ->
    if @_users[user]?
      return @_users[user].__lastmatch__
    return undefined

  ##
  # string initialMatch (string user)
  #
  # Retrieve the trigger that the user matched initially. This will return
  # only the first matched trigger and will not include subsequent redirects.
  #
  # This value is reset on each `reply()` or `replyAsync()` call.
  ##
  initialMatch: (user) ->
    if @_users[user]?
      return @_users[user].__initialmatch__
    return undefined

  ##
  # object lastTriggers (string user)
  #
  # Retrieve the triggers that have been matched for the last reply. This
  # will contain all matched trigger with every subsequent redirects.
  #
  # This value is reset on each `reply()` or `replyAsync()` call.
  ##
  lastTriggers: (user) ->
    if @_users[user]?
      return @_users[user].__last_triggers__
    return undefined

  ##
  # object getUserTopicTriggers (string username)
  #
  # Retrieve the triggers in the current topic for the specified user. It can
  # be used to create a UI that gives the user options based on trigges, e.g.
  # using buttons, select boxes and other UI resources. This also includes the
  # triggers available in any topics inherited or included by the user's current
  # topic.
  #
  # This will return `undefined` if the user cant be find
  ##
  getUserTopicTriggers: (user) ->
    @userVars = this.getUservars(user);
    if @userVars?
      return inherit_utils.getTopicTriggers(this, @userVars.topic);
    return undefined

  ##
  # string currentUser ()
  #
  # Retrieve the current user's ID. This is most useful within a JavaScript
  # object macro to get the ID of the user who invoked the macro (e.g. to
  # get/set user variables for them).
  #
  # This will return undefined if called from outside of a reply context
  # (the value is unset at the end of the `reply()` method)
  ##
  currentUser: () ->
    if @brain._currentUser is undefined
      @warn "currentUser() is intended to be called from within a JS object macro!"
    return @brain._currentUser

  ##############################################################################
  # Reply Fetching Methods                                                     #
  ##############################################################################

  ##
  # string reply (string username, string message[, scope, skipBegin])
  #
  # Fetch a reply from the RiveScript brain. The message doesn't require any
  # special pre-processing to be done to it, i.e. it's allowed to contain
  # punctuation and weird symbols. The username is arbitrary and is used to
  # uniquely identify the user, in the case that you may have multiple
  # distinct users chatting with your bot.
  #
  # The optional `scope` parameter will be passed down into any JavaScript
  # object macros that the RiveScript code executes. If you pass the special
  # variable `this` as the scope parameter, then `this` in the context of an
  # object macro will refer to the very same `this` as the one you passed in,
  # so for example the object macro will have access to any local functions
  # or attributes that your code has access to, from the location that `reply()`
  # was called. For an example of this, refer to the `eg/scope` directory in
  # the source distribution of RiveScript-JS.
  #
  # The option `skipBegin` parameter can be used to skip any begin blocks.
  # This is useful for when calling reply from within a macro (when begin
  # has already been processed) or when executing a system call where the
  # implementor purposefully wishes to avoid the begin block.
  ##
  reply: (user, msg, scope, skipBegin) ->
    return @brain.reply(user, msg, scope, false, skipBegin)

  replyPromisified: (user, msg, scope, skipBegin, hooks) ->
    return @brain.replyPromisified(user, msg, scope, false, skipBegin, hooks)

  ##
  # Promise replyAsync (string username, string message [[, scope], callback])
  #
  # Asyncronous version of reply. Use replyAsync if at least one of the subroutines
  # used with the `<call>` tag returns a promise.
  #
  # Example: using promises
  #
  # ```javascript
  # rs.replyAsync(user, message).then(function(reply) {
  #   console.log("Bot>", reply);
  # }).catch(function(error) {
  #   console.error("Error: ", error);
  # });
  # ```
  #
  # Example: using the callback
  #
  # ```javascript
  # rs.replyAsync(username, msg, this, function(error, reply) {
  #   if (!error) {
  #     console.log("Bot>", reply);
  #   } else {
  #     console.error("Error: ", error);
  #   }
  # });
  # ```
  ##
  replyAsync: (user, msg, scope, callback) ->
    reply = @brain.reply(user, msg, scope, true)
    if callback
      reply.then (result) =>
        callback.call @, null, result
      .catch (error) =>
        callback.call @, error, null
    return reply

module.exports = RiveScript
