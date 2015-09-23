# Telnet Server Example

This is a simple Node telnet server that implements RiveScript. It listens on
port 2001 and chats with any connected users.

## Usage

```bash
# Build the JavaScript sources from the CoffeeScript first. Run these from
# the root of the rivescript-js repo.
$ npm install
$ grunt

# Run the server.
$ node tcp-server.js
```

Then in a different shell, connect via telnet:

```bash
% telnet localhost 2001
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
Hello 127.0.0.1:50529! This is RiveScript.js v1.1.4 running on Node!
Type /quit to disconnect.

You> Hello bot.
Bot> Hi. What seems to be your problem?
```
