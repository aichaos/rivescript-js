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
* [telnet-server](telnet-server/) - A simple telnet server that listens on port
  2001 and chats with connected users. It's like the `shell.js` except over a
  TCP socket.
* [slack-bot](slack-bot/) - Example of connecting a RiveScript bot to the
  Slack chat platform.

## Code Snippets

* [async-object](async-object/) - Demonstrates a JavaScript object macro in
  RiveScript that asynchronously sends the user a second message at some point
  in the future, asynchronously from the immediately requested message.
