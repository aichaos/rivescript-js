# Brain (RiveScript master)

Create a Brain object which handles the actual process of fetching a reply.

## async reply (string user, string msg[, scope]) -> string

Fetch a reply for the user. This returns a Promise that may be awaited on.

## private async _getReply (string user, string msg, string context, int step, scope) -> string

The internal reply method. DO NOT CALL THIS DIRECTLY.

* user, msg and scope are the same as reply()
* context = "normal" or "begin"
* step = the recursion depth
* scope = the call scope for object macros

## string formatMessage (string msg)

Format a user's message for safe processing.

## async triggerRegexp (string user, string trigger) -> string

Prepares a trigger for the regular expression engine.

## async processTags (string user, string msg, string reply, string[] stars, string[] botstars, int step, scope) -> string

Process tags in a reply element.

## string substitute (string msg, string type)

Run substitutions against a message. `type` is either "sub" or "person" for
the type of substitution to run.
