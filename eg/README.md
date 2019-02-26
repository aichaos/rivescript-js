# Examples

These directories include example snippets for how to do various things with
RiveScript-js.

## RiveScript Example

* [brain](brain/) - The standard default RiveScript brain (`.rive` files) that
  implements an Eliza-like bot with added triggers to demonstrate other features
  of RiveScript.

## Client Examples

* [web-client](web-client/) - Demonstrates embedding a RiveScript bot into a
  web page (i.e. to be served through a web server like Apache or nginx).
* [json-server](json-server/) - A minimal ExpressJS web server that makes a
  RiveScript bot available at a JSON POST endpoint.
* [telnet-server](telnet-server/) - A simple telnet server that listens on port
  2001 and chats with connected users. It's like the `shell.js` except over a
  TCP socket.
* [slack-bot](slack-bot/) - Example of connecting a RiveScript bot to the
  Slack chat platform.

### External Examples

* [hubot-rivescript](https://github.com/aichaos/hubot-rivescript) - A Hubot
  script that lets you use RiveScript to reply to arbitrary messages sent
  to your Hubot.

## Code Snippets

* [redis](redis/) - Demonstrates storing user variables actively in a Redis
  cache server (to recall user variables across bot sessions).
* [persistence](persistence/) - Demonstrates persistence for user variables;
  the bot can be shut down and restarted and it can remember where it left off
  with its users.
* [reply-async](reply-async/) - Demonstrates using the `replyAsync()` method and
  a JavaScript object macro that returns a promise.
* [second-reply](second-reply/) - Demonstrates a JavaScript object macro in
  RiveScript that sends a second reply to the user at some point in the future,
  separately from the initially requested reply.
* [scope](scope/) - Demonstrates the usage of the `scope` parameter to the
  `reply()` function for passing the parent scope down into JavaScript object
  macros.
* [deparse](deparse/) - Additional documentation on how the `deparse()` function
  is used and its data format.
* [coffeescript](coffeescript/) - Example of using the
  `rivescript-contrib-coffeescript` module to enable CoffeeScript language for
  object macros.
* [router](router/) - Example of using the RiveScript engine in a "router"
  style way (in the web application sense of the term), mapping triggers
  directly to JavaScript handlers without writing RiveScript boilerplate for
  each mapping.
