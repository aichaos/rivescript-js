# RiveScript-JS

## INTRODUCTION

This is a RiveScript interpreter library for JavaScript. RiveScript is a
scripting language for chatterbots, making it easy to write trigger/response
pairs for building up a bot's intelligence.

This library can be used both in a web browser or as a Node.JS module.
See the `eg/` folder for a web browser example. There's a `node/` folder with
a Node.JS example.

## INSTALLATION

For nodejs and other similar JavaScript engines, you can install this module
through npm:

`npm install rivescript`

To use on the web, just load `rivescript.js` with a `<script>` tag like usual.

## USAGE

The distribution of RiveScript.js includes an interactive shell for testing your
RiveScript bot, `shell.js`. Run it with Node and point it to a folder where you
have your RiveScript documents. Example:

```bash
node shell.js eg/brain
```

Once inside the shell you can chat with the bot using the RiveScript files in
that directory. For simple debugging you can type `/eval` to run single lines
of JavaScript code. See `/help` for more.

When using RiveScript.js as a library, the synopsis is as follows:

```javascript
var bot = new RiveScript();

// Load a directory full of RiveScript documents (.rive files). This is for
// Node.JS only: it doesn't work on the web!
bot.loadDirectory("brain", loading_done, loading_error);

// Load an individual file.
bot.loadFile("brain/testsuite.rive", loading_done, loading_error);

// Load a list of files all at once (the best alternative to loadDirectory
// for the web!)
bot.loadFile([
	"brain/begin.rive",
	"brain/admin.rive",
	"brain/clients.rive"
], loading_done, loading_error);

// All file loading operations are asynchronous, so you need handlers
// to catch when they've finished. If you use loadDirectory (or loadFile
// with multiple file names), the success function is called only when ALL
// the files have finished loading.
function loading_done (batch_num) {
	console.log("Batch #" + batch_num + " has finished loading!");

	// Now the replies must be sorted!
	bot.sortReplies();

	// And now we're free to get a reply from the brain!
	var reply = bot.reply("local-user", "Hello, bot!");
	console.log("The bot says: " + reply);
}

// It's good to catch errors too!
function loading_error (batch_num, error) {
	console.log("Error when loading files: " + error);
}
```

## UTF-8 SUPPORT

Version 1.0.5 adds experimental support for UTF-8 in RiveScript documents.
It is disabled by default. Enable it by passing a `true` value for the `utf8`
option in the constructor.

By default (without UTF-8 mode on), triggers may only contain basic ASCII
characters (no foreign characters), and the user's message is stripped of all
characters except letters/numbers and spaces. This means that, for example,
you can't capture a user's e-mail address in a RiveScript reply, because of the
@ and . characters.

When UTF-8 mode is enabled, these restrictions are lifted. Triggers are only
limited to not contain certain metacharacters like the backslash, and the user's
message is only stripped of backslashes and HTML angled brackets (to protect
from obvious XSS if you use RiveScript in a web application). The `<star>` tags
in RiveScript will capture the user's "raw" input, so you can write replies to
get the user's e-mail address or store foreign characters in their name.

This has so far only been tested when run under Node. When served through a
web server, take extra care that your server sends the correct content encoding
with the RiveScript source files (`Content-Type: text/plain; charset=utf-8`).

## BUILDING

Grunt options:

* `grunt` - Builds the minified `lib/rivescript.min.js`
* `grunt jshint` - Runs JS linting on `rivescript.js`
* `grunt watch` - For development - watches `rivescript.js` for changes and
  automatically minifies it.
* `grunt connect:server` - Starts a local web server and opens `eg/chat.html`
  for local testing and demoing.
* `grunt test` - Run unit tests.

## GRUNT CONNECT

This project uses [Grunt](http://gruntjs.com) for compiling to minified JS and
also includes a simple web server for local testing and demoing for RiveScript.

Install `nodejs` and `npm` and then:

```bash
$ npm install -g grunt-cli # If you don't already have it
$ npm install              # Install dev dependencies
$ grunt connect:server     # Will start a local web server and open eg/chat.html
```

## LICENSE

```
The MIT License (MIT)

Copyright (c) 2015 Noah Petherbridge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## SEE ALSO

The official RiveScript website, http://www.rivescript.com/
