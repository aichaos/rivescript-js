# RiveScript (hash options)

Create a new RiveScript interpreter. `options` is an object with the
following keys:

* bool debug:    Debug mode            (default false)
* int  depth:    Recursion depth limit (default 50)
* bool strict:   Strict mode           (default true)
* bool utf8:     Enable UTF-8 mode     (default false)
* func onDebug:  Set a custom handler to catch debug log messages (default null)

# Constructor and Debug Methods

## string version ()

Returns the version number of the RiveScript.js library.

## private void runtime ()

Detect the runtime environment of this module, to determine if we're
running in a web browser or from node.

## private void say (string message)

This is the debug function. If debug mode is enabled, the 'message' will be
sent to the console via console.log (if available), or to your `onDebug`
handler if you defined one.

## private void warn (string message[, filename, lineno])

Print a warning or error message. This is like debug, except it's GOING to
be given to the user one way or another. If the `onDebug` handler is
defined, this is sent there. If `console` is available, this will be sent
there. In a worst case scenario, an alert box is shown.

# Loading and Parsing Methods

## int loadFile (string path || array path[, onSuccess[, onError]])

Load a RiveScript document from a file. The path can either be a string that
contains the path to a single file, or an array of paths to load multiple
files. `onSuccess` is a function to be called when the file(s) have been
successfully loaded. `onError` is for catching any errors, such as syntax
errors.

This loading method is asynchronous. You should define an `onSuccess`
handler to be called when the file(s) have been successfully loaded.

This method returns a "batch number" for this load attempt. The first call
to this function will have the batch number of 0 and that will go up from
there. This batch number is passed to your `onSuccess` handler as its only
argument, in case you want to correlate it with your call to `loadFile()`.

`onSuccess` receives: int batchNumber
`onError` receives: string errorMessage[, int batchNumber]

## void loadDirectory (string path[, func onSuccess[, func onError]])

Load RiveScript documents from a directory.

This function is not supported in a web environment.

## bool stream (string code[, func onError])

Stream in RiveScript code dynamically. `code` should be the raw RiveScript
source code as a string (with line breaks after each line).

This function is synchronous, meaning there is no success handler needed.
It will return false on parsing error, true otherwise.

`onError` receives: string errorMessage

## private bool parse (string name, string code[, func onError])

Parse RiveScript code and load it into memory. `name` is a file name in case
syntax errors need to be pointed out. `code` is the source code, and
`onError` is a function to call when a syntax error occurs.

## void sortReplies()

After you have finished loading your RiveScript code, call this method to
populate the various sort buffers. This is absolutely necessary for reply
matching to work efficiently!

# Public Configuration Methods

## void setHandler(string lang, object)

Set a custom language handler for RiveScript object macros. See the source
for the built-in JavaScript handler (src/lang/javascript.coffee) as an
example.

## void setSubroutine(string name, function)

Define a JavaScript object macro from your program.

This is equivalent to having a JS object defined in the RiveScript code,
except your JavaScript code is defining it instead.

## void setGlobal (string name, string value)

Set a global variable. This is equivalent to `! global` in RiveScript.
Set the value to `undefined` to delete a global.

## void setVariable (string name, string value)

Set a bot variable. This is equivalent to `! var` in RiveScript.
Set the value to `undefined` to delete a bot variable.

## void setSubstitution (string name, string value)

Set a substitution. This is equivalent to `! sub` in RiveScript.
Set the value to `undefined` to delete a substitution.

## void setPerson (string name, string value)

Set a person substitution. This is equivalent to `! person` in RiveScript.
Set the value to `undefined` to delete a person substitution.

## void setUservar (string user, string name, string value)

Set a user variable for a user.

## void setUservars (string user, object data)

Set multiple user variables by providing an object of key/value pairs.
Equivalent to calling `setUservar()` for each pair in the object.

## string getUservar (string user, string name)

Get a variable from a user. Returns the string "undefined" if it isn't
defined.

## data getUservars ([string user])

Get all variables about a user. If no user is provided, returns all data
about all users.

## void clearUservars ([string user])

Clear all a user's variables. If no user is provided, clears all variables
for all users.

## void freezeUservars (string user)

Freeze the variable state of a user. This will clone and preserve the user's
entire variable state, so that it can be restored later with
`thatUservars()`

## void thawUservars (string user[, string action])

Thaw a user's frozen variables. The action can be one of the following:
* discard: Don't restore the variables, just delete the frozen copy.
* keep: Keep the frozen copy after restoring
* thaw: Restore the variables and delete the frozen copy (default)

## string lastMatch (string user)

Retrieve the trigger that the user matched most recently.

## string currentUser ()

Retrieve the current user's ID. This is most useful within a JavaScript
object macro to get the ID of the user who invoked the macro (e.g. to
get/set user variables for them).

This will return undefined if called from outside of a reply context
(the value is unset at the end of the `reply()` method)

# Reply Fetching Methods

## string reply (string username, string message[, scope])

Fetch a reply from the RiveScript brain. The message doesn't require any
special pre-processing to be done to it, i.e. it's allowed to contain
punctuation and weird symbols. The username is arbitrary and is used to
uniquely identify the user, in the case that you may have multiple
distinct users chatting with your bot.