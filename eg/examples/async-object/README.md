# Asynchronous Objects

This example demonstrates how a JavaScript object macro in a RiveScript bot can
asynchronously send a user a message after a timeout.

In this example we have our chatbot in a prototypical object named `AsyncBot`,
and the bot implements functions such as `sendMessage(user, message)` to deliver
messages to users. If you imagine this bot were to connect to an IRC server,
the implementation of `sendMessage()` might deliver a private message to a
particular user by nickname over IRC. In this example, it just writes a message
to the console.

View the source code of `bot.js` and `async.rive` for details. The JavaScript
source is well-documented. The key pieces are:

* In the call to `reply()`, we pass a reference to `this` (the `AsyncBot`
  object) in as the `scope` parameter. This scope is passed all the way down to
  JavaScript object macros, so that `this` inside the object macro refers to the
  very same `AsyncBot` instance in the application code.
* The `asyncTest` object macro in `async.rive` is able to call the
  `sendMessage()` function after a two-second delay by using `setTimeout()`.
  Any asynchronous JavaScript call could've been used in its place. For example,
  imagine the bot needed to call a web API to get local weather information and
  then deliver it to the user when it's ready (asynchronously).

## Example Output

```
% node bot.js
> async test
[Soandso] async test
[Bot] @Soandso: Wait for it...
> [Bot] @Soandso: Async reply!
lol
[Soandso] lol
[Bot] @Soandso: No reply for that. Type "async test" to test the asynchronous macro.
```

The "Async reply!" line was delivered 2 seconds after the "Wait for it..." line.
