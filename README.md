# RiveScript-JS

[![Build Status](https://travis-ci.org/aichaos/rivescript-js.svg?branch=master)](https://travis-ci.org/aichaos/rivescript-js)

## INTRODUCTION

This is a RiveScript interpreter library for JavaScript. RiveScript is a
scripting language for chatterbots, making it easy to write trigger/response
pairs for building up a bot's intelligence.

This library can be used both in a web browser or as a Node module.
See the `eg/` folder for examples.

## DOCUMENTATION

There is generated Markdown and HTML documentation of the modules in the
[docs](https://github.com/aichaos/rivescript-js/tree/master/docs) folder.
The main module is at [rivescript](https://github.com/aichaos/rivescript-js/blob/master/docs/rivescript.md).

Also check out the [**RiveScript Community Wiki**](https://github.com/aichaos/rivescript/wiki)
for common design patterns and tips & tricks for RiveScript.

## INSTALLATION

For nodejs and other similar JavaScript engines, you can install this module
through npm:

`npm install rivescript`

For the web you can use the unpkg:

```html
<script src="https://unpkg.com/rivescript@latest/dist/rivescript.min.js"></script>
```

The GitHub repository for this project only includes the CoffeeScript sources.
To download a compiled JavaScript release of this library, check the
[Releases](https://github.com/aichaos/rivescript-js/releases) tab. The compiled
distribution includes a `lib/` directory with JavaScript sources to use with
node, and a `dist/` directory containing a "browserified" script that can be
used on a web page.

To use on the web, just load `dist/rivescript.min.js` with a `<script>` tag
like usual.

## EXAMPLES

There are examples available in the
[eg/](https://github.com/aichaos/rivescript-js/tree/master/eg) directory of
this project on GitHub that show how to interface with a RiveScript bot in
a variety of ways--such as through a web browser or a telnet server--and other
code snippets and useful tricks.

## RIVESCRIPT PLAYGROUND

For testing and sharing RiveScript snippets that use the JavaScript
implementation, check out the [RiveScript Playground](https://play.rivescript.com/).

It's a JSFiddle style web app for playing with RiveScript in your web browser
and sharing code with others.

<https://play.rivescript.com/>

## USAGE

The distribution of RiveScript.js includes an interactive shell for testing your
RiveScript bot, `shell.js`. Run it with Node and point it to a folder where you
have your RiveScript documents. Example:

```bash
node shell.js eg/brain
```

There is also a CoffeeScript version of `shell.js` which works the same way. The
key difference is that when running the Coffee version, RiveScript object macros
written in CoffeeScript may be used (for example, see `eg/brain/coffee.rive`).

```bash
coffee shell.coffee eg/brain
```

Once inside the shell you can chat with the bot using the RiveScript files in
that directory. For simple debugging you can type `/eval` to run single lines
of JavaScript code. See `/help` for more.

Both shell scripts accept command line parameters:

* `--debug`: enables verbose debug logging.
* `--watch`: watch the reply folder for changes and automatically reload the
  bot when files are modified.
* `--utf8`: enables UTF-8 mode.

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
function loading_error (error) {
	console.log("Error when loading files: " + error);
}
```

## UTF-8 SUPPORT

Version 1.0.5 adds **experimental** support for UTF-8 in RiveScript documents.
It is disabled by default. Enable it by passing a `true` value for the `utf8`
option in the constructor.

By default (without UTF-8 mode on), triggers may only contain basic ASCII
characters (no foreign characters), and the user's message is stripped of all
characters except letters, numbers and spaces. This means that, for example,
you can't capture a user's e-mail address in a RiveScript reply, because of the
@ and . characters.

When UTF-8 mode is enabled, these restrictions are lifted. Triggers are only
limited to not contain certain metacharacters like the backslash, and the user's
message is only stripped of backslashes and HTML angled brackets (to protect
from obvious XSS if you use RiveScript in a web application). Additionally,
common punctuation characters are stripped out, with the default set being
`/[.,!?;:]/g`. This can be overridden by providing a new `RegExp` object as the
`rs.unicodePunctuation` attribute. Example:

```javascript
// Make a new bot with UTF-8 mode enabled.
var bot = new RiveScript({utf8: true});

// Override the punctuation characters that get stripped from the
// user's message.
bot.unicodePunctuation = new RegExp(/[.,!?;:]/g);
```

The `<star>` tags in RiveScript will capture the user's "raw" input, so you
can write replies to get the user's e-mail address or store foreign characters
in their name.

This has so far only been tested when run under Node. When served through a
web server, take extra care that your server sends the correct content encoding
with the RiveScript source files (`Content-Type: text/plain; charset=utf-8`).

One caveat to watch out for in UTF-8 mode is that punctuation characters are not
removed from a user's message, so if they include commas or exclamation marks
it can impact the matching ability of your triggers (you should *absolutely
not* write an explicit punctuation mark on your trigger's side. Triggers should
NOT contain symbols like `?` or `,` even with UTF-8 mode enabled, and while that
may work right now, a future update will probably rigidly enforce this).

## BUILDING

Grunt options:

* `grunt` - Compiles the CoffeeScript in the `src/` folder into JavaScript in
  the `lib/` folder.
* `grunt clean` - Cleans the `lib/` and `dist/` directories.
* `grunt buildclean` - Cleans and rebuilds the project.
* `grunt lint` - Runs CoffeeScript linting.
* `grunt watch` - For development - watches CoffeeScript source files and
  automatically builds them on change.
* `grunt server` - Starts a local web server and opens `eg/chat.html`
  for local testing and demoing.
* `grunt test` - Run unit tests.

## GRUNT SERVER

This project uses [Grunt](http://gruntjs.com) for compiling to minified JS and
also includes a simple web server for local testing and demoing for RiveScript.

Install `nodejs` and `npm` and then:

```bash
$ npm install -g grunt-cli # If you don't already have it
$ npm install              # Install dev dependencies
$ grunt server             # Will start a local web server and open eg/chat.html
```

## PUBLISHING

Steps for the npm maintainer of this module:

1. Increment the version number in `package.json` and `src/rivescript.coffee`
2. Add a change log notice to `Changes.md`
3. Run `grunt dist` to build the JavaScript sources and `grunt test` to verify
   all tests pass.
3. Test a local installation from a different directory
   (`npm install ../rivescript-js`)
4. `npm login` if it's the first time on a new system, and `npm publish` to
   publish the module to NPM.
5. Create compiled zip and tarballs for GitHub releases:
  * Copy git repo to a new folder.
  * `rm -rf .git node_modules` to remove cruft from the new folder.
  * `zip -r rivescript-js-VERSION.zip rivescript-js`
  * `tar -czvf rivescript-js-VERSION.tar.gz rivescript-js`

## LICENSE

```
The MIT License (MIT)

Copyright (c) 2017 Noah Petherbridge

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
