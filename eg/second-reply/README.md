# Asynchronous Second Reply

This example demonstrates how a JavaScript object macro in a RiveScript bot can
send a second reply to the user asynchronously from the original reply, after a
timeout.

In this example we have our chatbot in a prototypical object named `MyBot`,
and the bot implements functions such as `sendMessage(user, message)` to deliver
messages to users. If you imagine this bot were to connect to an IRC server,
the implementation of `sendMessage()` might deliver a private message to a
particular user by nickname over IRC. In this example, it just writes a message
to the console.

View the source code of `bot.js` and `second-reply.rive` for details. The
JavaScript source is well-documented. The key pieces are:

* In the call to `reply()`, we pass a reference to `this` (the `MyBot`
  object) in as the `scope` parameter. This scope is passed all the way down to
  JavaScript object macros, so that `this` inside the object macro refers to the
  very same `MyBot` instance in the application code.
* The `replyTest` object macro in `second-reply.rive` is able to call the
  `sendMessage()` function after a two-second delay by using `setTimeout()`.
  Any asynchronous JavaScript call could've been used in its place. For example,
  imagine the bot needed to call a web API to get local weather information and
  then deliver it to the user when it's ready (asynchronously).

## Example Output

```
% node bot.js
> reply test
[Soandso] reply test
[Bot] @Soandso: Wait for it...
> [Bot] @Soandso: Second reply!
```

The "Second reply!" line was delivered 2 seconds after the
"Wait for it..." line.
