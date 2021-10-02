// RiveScript.js
// https://www.rivescript.com/

// This code is released under the MIT License.
// See the "LICENSE" file for more information.

"use strict";

/**
Notice to Developers

The methods prefixed with the word "private" *should not be used* by you. They
are documented here to help the RiveScript library developers understand the
code; they are not considered 'stable' API functions and they may change or
be removed at any time, for any reason, and with no advance notice.

The most commonly used private function I've seen developers use is the
`parse()` function, when they want to load RiveScript code from a string
instead of a file. **Do not use this function.** The public API equivalent
function is `stream()`. The parse function will probably be removed in the
near future.
*/

// Constants
const VERSION = "2.1.0";

// Helper modules
const Parser = require("./parser");
const Brain = require("./brain");
const utils = require("./utils");
const sorting = require("./sorting");
const inherit_utils = require("./inheritance");
const { MemorySessionManager } = require("./sessions");
const JSObjectHandler = require("./lang/javascript");
const readDir = require("fs-readdir-recursive");

/**
RiveScript (hash options)

Create a new RiveScript interpreter. `options` is an object with the
following keys:

```
* bool debug:     Debug mode               (default false)
* int  depth:     Recursion depth limit    (default 50)
* bool strict:    Strict mode              (default true)
* bool utf8:      Enable UTF-8 mode        (default false, see below)
* bool forceCase: Force-lowercase triggers (default false, see below)
* func onDebug:   Set a custom handler to catch debug log messages (default null)
* obj  errors:    Customize certain error messages (see below)
* str  concat:    Globally replace the default concatenation mode when parsing
                  RiveScript source files (default `null`. be careful when
                  setting this option if using somebody else's RiveScript
                  personality; see below)
* sessionManager: provide a custom session manager to store user variables.
                  The default is to store variables in memory, but you may
                  use any async data store by providing an implementation of
                  RiveScript's SessionManager. See the
                  [sessions](./sessions.md) documentation.
```

## UTF-8 Mode

In UTF-8 mode, most characters in a user's message are left intact, except for
certain metacharacters like backslashes and common punctuation characters like
`/[.,!?;:]/`.

If you want to override the punctuation regexp, you can provide a new one by
assigning the `unicodePunctuation` attribute of the bot object after
initialization. Example:

```javascript
var bot = new RiveScript({utf8: true});
bot.unicodePunctuation = new RegExp(/[.,!?;:]/g);
```

## Force Case

This option to the constructor will make RiveScript lowercase all the triggers
it sees during parse time. This may ease the pain point that authors
experience when they need to write a lowercase "i" in triggers, for example
a trigger of `i am *`, where the lowercase `i` feels unnatural to type.

By default a capital ASCII letter in a trigger would raise a parse error.
Setting the `forceCase` option to `true` will instead silently lowercase the
trigger and thus avoid the error.

Do note, however, that this can have side effects with certain Unicode symbols
in triggers, see [case folding in Unicode](https://www.w3.org/International/wiki/Case_folding).
If you need to support Unicode symbols in triggers this may cause problems with
certain symbols when made lowercase.

## Global Concat Mode

The concat (short for concatenation) mode controls how RiveScript joins two
lines of code together when a `^Continue` command is used in a source file.
By default, RiveScript simply joins them together with no symbols inserted in
between ("none"); the other options are "newline" which joins them with line
breaks, or "space" which joins them with a single space character.

RiveScript source files can define a *local, file-scoped* setting for this
by using e.g. `! local concat = newline`, which affects how the continuations
are joined in the lines that follow.

Be careful when changing the global concat setting if you're using a RiveScript
personality written by somebody else; if they were relying on the default
concat behavior (didn't specify a `! local concat` option), then changing the
global default will potentially cause formatting issues or trigger matching
issues when using that personality.

I strongly recommend that you **do not** use this option if you intend to ever
share your RiveScript personality with others; instead, explicitly spell out
the local concat mode in each source file. It might sound like it will save
you a lot of typing by not having to copy and paste a `! local concat` option,
but it will likely lead to misbehavior in your RiveScript personality when you
give it to somebody else to use in their bot.

## Custom Error Messages

You can provide any or all of the following properties in the `errors`
argument to the constructor to override certain internal error messages:

* `replyNotMatched`: The message returned when the user's message does not
match any triggers in your RiveScript code.

The default is "ERR: No Reply Matched"

**Note:** the recommended way to handle this case is to provide a trigger of
simply `*`, which serves as the catch-all trigger and is the default one
that will match if nothing else matches the user's message. Example:

```
+ *
- I don't know what to say to that!
```
* `replyNotFound`: This message is returned when the user *did* in fact match
a trigger, but no response was found for the user. For example, if a trigger
only checks a set of conditions that are all false and provides no "normal"
reply, this error message is given to the user instead.

The default is "ERR: No Reply Found"

**Note:** the recommended way to handle this case is to provide at least one
normal reply (with the `-` command) to every trigger to cover the cases
where none of the conditions are true. Example:

```
+ hello
* <get name> != undefined => Hello there, <get name>.
- Hi there.
```
* `objectNotFound`: This message is inserted into the bot's reply in-line when
it attempts to call an object macro which does not exist (for example, its
name was invalid or it was written in a programming language that the bot
couldn't parse, or that it had compile errors).

The default is "[ERR: Object Not Found]"
* `deepRecursion`: This message is inserted when the bot encounters a deep
recursion situation, for example when a reply redirects to a trigger which
redirects back to the first trigger, creating an infinite loop.

The default is "ERR: Deep Recursion Detected"

These custom error messages can be provided during the construction of the
RiveScript object, or set afterwards on the object's `errors` property.

Examples:

```javascript
var bot = new RiveScript({
errors: {
replyNotFound: "I don't know how to reply to that."
}
});

bot.errors.objectNotFound = "Something went terribly wrong.";
```
*/
const RiveScript = (function() {
	class RiveScript {
		////////////////////////////////////////////////////////////////////////
		// Constructor and Debug Methods                                      //
		////////////////////////////////////////////////////////////////////////
		constructor(opts) {
			var self = this;
			if (opts == null) {
				opts = {};
			}

			// Default parameters
			self._debug     = opts.debug ? opts.debug : false;
			self._strict    = opts.strict ? opts.strict : true;
			self._depth     = opts.depth ? parseInt(opts.depth) : 50;
			self._utf8      = opts.utf8 ? opts.utf8 : false;
			self._forceCase = opts.forceCase ? opts.forceCase : false;
			self._onDebug   = opts.onDebug ? opts.onDebug : null;
			self._concat    = opts.concat ? opts.concat : null;

			// UTF-8 punctuation, overridable by the user.
			self.unicodePunctuation = new RegExp(/[.,!?;:]/g);

			// Customized error messages.
			self.errors = {
				replyNotMatched: "ERR: No Reply Matched",
				replyNotFound:   "ERR: No Reply Found",
				objectNotFound:  "[ERR: Object Not Found]",
				deepRecursion:   "ERR: Deep Recursion Detected"
			};
			if (typeof opts.errors === "object") {
				let ref = opts.errors;
				for (let key in ref) {
					let value = ref[key];
					if (opts.errors.hasOwnProperty(key)) {
						self.errors[key] = value;
					}
				}
			}
			// Identify our runtime environment. Web, or node?
			self._node    = {}; // NodeJS objects
			self._runtime = self.runtime();

			// Sub-module helpers.
			self.parser = new Parser(self);
			self.brain  = new Brain(self);

			// Loading files in will be asynchronous, so we'll need to abe able to
			// identify when we've finished loading files! This will be an object
			// to keep track of which files are still pending.
			self._pending = [];
			self._loadCount = 0;

			// Internal data structures
			self._global = {}; // 'global' variables
			self._var = {}; // 'bot' variables
			self._sub = {}; // 'sub' substitutions
			self._submax = 1; // 'submax' max words in sub object
			self._person = {}; // 'person' substitutions
			self._personmax = 1; // 'personmax' max words in person object
			self._array = {}; // 'array' variables
			self._session = null; // session manager for user variables
			self._includes = {}; // included topics
			self._inherits = {}; // inherited topics
			self._handlers = {}; // object handlers
			self._objlangs = {}; // map objects to their languages
			self._topics = {}; // main reply structure
			self._thats = {}; // %Previous reply structure (pointers into @_topics)
			self._sorted = {}; // Sorted buffers

			// Given any options?
			if (typeof opts === "object") {
				if (opts.debug) {
					self._debug = true;
				}
				if (opts.strict) {
					self._strict = true;
				}
				if (opts.depth) {
					self._depth = parseInt(opts.depth);
				}
				if (opts.utf8) {
					self._utf8 = true;
				}
				if (opts.sessionManager) {
					self._session = opts.sessionManager;
				}
			}

			// Initialize the default session manager.
			if (self._session === null) {
				self._session = new MemorySessionManager();
			}

			// Set the default JavaScript language handler.
			self._handlers.javascript = new JSObjectHandler(self);
			self.say(`RiveScript Interpreter v${VERSION} Initialized.`);
			self.say(`Runtime Environment: ${self._runtime}`);
		}

		/**
		string version ()

		Returns the version number of the RiveScript.js library.
		*/
		version() {
			return VERSION;
		}

		/**
		private void runtime ()

		Detect the runtime environment of this module, to determine if we're
		running in a web browser or from node.
		*/
		runtime() {
			var self = this;

			// Webpack and browserify define `process.browser` so this is the best place
			// to check if we're running in a web environment.
			if (process.browser) {
				return "web";
			}

			// Import the Node filesystem library.
			self._node.fs = require("fs");
			return "node";
		}

		/**
		private void say (string message)

		This is the debug function. If debug mode is enabled, the 'message' will be
		sent to the console via console.log (if available), or to your `onDebug`
		handler if you defined one.
		*/
		say(message) {
			var self = this;
			if (self._debug !== true) {
				return;
			}

			// Debug log handler defined?
			if (self._onDebug) {
				return self._onDebug(message);
			} else {
				return console.log(message);
			}
		}

		/**
		private void warn (string message[, filename, lineno])

		Print a warning or error message. This is like debug, except it's GOING to
		be given to the user one way or another. If the `onDebug` handler is
		defined, this is sent there. If `console` is available, this will be sent
		there. In a worst case scenario, an alert box is shown.
		*/
		warn(message, filename, lineno) {
			var self = this;

			// Provided a file and line?
			if ((filename != null) && (lineno != null)) {
				message += ` at ${filename} line ${lineno}`;
			}
			if (self._onDebug) {
				return self._onDebug(`[WARNING] ${message}`);
			} else if (console) {
				if (console.error) {
					return console.error(message);
				} else {
					return console.log(`[WARNING] ${message}`);
				}
			} else if (window) {
				return window.alert(message);
			}
		}

		////////////////////////////////////////////////////////////////////////
		// Loading and Parsing Methods                                        //
		////////////////////////////////////////////////////////////////////////

		/**
		async loadFile(string path || array path)

		Load a RiveScript document from a file. The path can either be a string that
		contains the path to a single file, or an array of paths to load multiple
		files. The Promise resolves when all of the files have been parsed and
		loaded. The Promise rejects on error.

		This loading method is asynchronous so you must resolve the promise or
		await it before you go on to sort the replies.

		For backwards compatibility, this function can take callbacks instead
		of returning a Promise:

		> `rs.loadDirectory(path, onSuccess(), onError(err, filename, lineno))`

		* resolves: `()`
		* rejects: `(string error)`
		*/
		async loadFile(path, onSuccess, onError) {
			var self = this;

			// Did they give us a single path?
			if (typeof path === "string") {
				path = [path];
			}

			let promises = new Array();
			for (let i = 0, len = path.length; i < len; i++) {
				let file = path[i];
				self.say(`Request to load file: ${file}`);
				promises.push(function(f) {
					// This function returns a Promise. How are we going to load
					// the file?
					if (self._runtime === "web") {
						// Via ajax!
						return self._ajaxLoadFile(f);
					} else {
						// With node fs module!
						return self._nodeLoadFile(f);
					}
				}(file));
			}

			// The final Promise to return.
			let promise = new Promise((resolve, reject) => {
				Promise.all(promises).then(resolve).catch(reject);
			});

			// Legacy callback style?
			if (typeof(onSuccess) === "function") {
				self.warn("DEPRECATED: RiveScript.loadFile() now returns a Promise instead of using callbacks")
				return promise.then(onSuccess).catch(function(err, filename, lineno) {
					if (typeof(onError) === "function") {
						onError.call(null, err, filename, lineno);
					}
				});
			} else {
				return promise;
			}
		}

		// Load a file using ajax. DO NOT CALL THIS DIRECTLY.
		// Returns a Promise.
		async _ajaxLoadFile(file) {
			var self = this;
			return new Promise(function(resolve, reject) {
				let xhr = new XMLHttpRequest();
				xhr.open("GET", file, true);
				xhr.onreadystatechange = () => {
					var ref;
					if (xhr.readyState === 4) {
						let ref = xhr.status;
						if (ref === 200) {
							self.say(`Loading file ${file} complete.`);

							// Parse it!
							let ok = self.parse(file, xhr.responseText, (err) => {
								reject(err);
							});
							if (ok) {
								resolve();
							} else {
								reject("parser error");
							}
						} else {
							self.warn(`Network error in XMLHttpRequest for file ${file}`);
							reject(`Failed to load file ${file}: network error`);
						}
					}
				};
				xhr.send(null);
			});
		}

		// Load a file using node. DO NOT CALL THIS DIRECTLY.
		// Returns a Promise.
		async _nodeLoadFile(file) {
			var self = this;
			return new Promise(function(resolve, reject) {
				// Load the file.
				return self._node.fs.readFile(file, (err, data) => {
					if (err) {
						reject(err);
						return;
					}

					// Parse it!
					let ok = self.parse(file, "" + data, (err) => {
						reject(err);
					});
					if (ok) {
						resolve();
					} else {
						reject("parser error");
					}
				});
			});
		}

		/**
		async loadDirectory (string path)

		Load RiveScript documents from a directory recursively.

		For backwards compatibility, this function can take callbacks instead
		of returning a Promise:

		> `rs.loadDirectory(path, onSuccess(), onError(err, filename, lineno))`

		This function is not supported in a web environment.
		*/
		async loadDirectory(path, onSuccess, onError) {
			var self = this;
			var promise = new Promise(function(resolve, reject) {
				// Can't be done on the web!
				if (self._runtime === "web") {
					reject("loadDirectory can't be used on the web!");
					return;
				}

				// Verify the directory exists.
				self._node.fs.stat(path, (err, stats) => {
					if (err) {
						reject(err);
						return;
					}
					if (!stats.isDirectory()) {
						reject(`${path} is not a directory`);
						return;
					}
					self.say(`Loading from directory ${path}`);

					// Load all the files.
					let files = readDir(path);
					let toLoad = new Array();
					for (let i = 0, len = files.length; i < len; i++) {
						let file = files[i];
						if (file.match(/\.(rive|rs)$/i)) {
							// Keep track of the file's status.
							toLoad.push(path + "/" + file);
						}
					}
					self.loadFile(toLoad).then(resolve).catch(reject);
				});
			});

			// Legacy callback-style?
			if (typeof(onSuccess) === "function") {
				self.warn("DEPRECATED: RiveScript.loadDirectory() now returns a Promise instead of using callbacks")
				return promise.then(onSuccess).catch(function(err, filename, lineno) {
					if (typeof(onError) === "function") {
						onError.call(null, err, filename, lineno);
					}
				});
			}
			return promise;
		}

		/**
		bool stream (string code[, func onError])

		Load RiveScript source code from a string. `code` should be the raw
		RiveScript source code, with line breaks separating each line.

		This function is synchronous, meaning it does not return a Promise. It
		parses the code immediately and returns. Do not fear: the parser runs
		very quickly.

		Returns `true` if the code parsed with no error.

		onError function receives: `(err string[, filename str, line_no int])`
		*/
		stream(code, onError) {
			var self = this;
			return self.parse("stream()", code, onError);
		}

		/**
		private bool parse (string name, string code[, func onError(string)])

		Parse RiveScript code and load it into memory. `name` is a file name in case
		syntax errors need to be pointed out. `code` is the source code.

		Returns `true` if the code parsed with no error.
		*/
		parse(filename, code, onError) {
			var self = this;
			self.say("Parsing code!");

			// Get the "abstract syntax tree"
			let ok = true;
			let ast = self.parser.parse(filename, code, (err, fn, ln) => {
				if (typeof(onError) === "function") {
					onError.call(null, err, fn, ln);
				}
				ok = false;
			});

			// Get all of the "begin" type variables: global, var, sub, person, array..
			for (let type in ast.begin) {
				let vars = ast.begin[type];
				if (!ast.begin.hasOwnProperty(type)) {
					continue;
				}
				let internal = `_${type}` // so "global" maps to self._global

				for (let name in vars) {
					let value = vars[name];
					if (type === 'sub' || type === 'person') {
						self[internal + "max"] = Math.max(self[internal + "max"], name.split(" ").length);
					}
					if (!vars.hasOwnProperty(name)) {
						continue;
					}

					if (value === "<undef>") {
						delete self[internal][name];
					} else {
						self[internal][name] = value;
					}
				}
			}

			// Let the scripts set the debug mode and other internals.
			if (self._global.debug != null) {
				self._debug = self._global.debug === "true";
			}
			if (self._global.depth != null) {
				self._depth = parseInt(self._global.depth) || 50;
			}

			// Consume all the parsed triggers.
			for (let topic in ast.topics) {
				let data = ast.topics[topic];
				if (!ast.topics.hasOwnProperty(topic)) {
					continue;
				}

				// Keep a map of the topics that are included/inherited under self topic.
				if (self._includes[topic] == null) {
					self._includes[topic] = {};
				}
				if (self._inherits[topic] == null) {
					self._inherits[topic] = {};
				}
				utils.extend(self._includes[topic], data.includes);
				utils.extend(self._inherits[topic], data.inherits);

				// Consume the triggers.
				if (self._topics[topic] == null) {
					self._topics[topic] = [];
				}
				for (let i = 0, len = data.triggers.length; i < len; i++) {
					let trigger = data.triggers[i];
					self._topics[topic].push(trigger);

					// Does this trigger have a %Previous? If so, make a pointer to this
					// exact trigger in @_thats.
					if (trigger.previous != null) {
						// Initialize the @_thats structure first.
						if (self._thats[topic] == null) {
							self._thats[topic] = {};
						}
						if (self._thats[topic][trigger.trigger] == null) {
							self._thats[topic][trigger.trigger] = {};
						}
						self._thats[topic][trigger.trigger][trigger.previous] = trigger;
					}
				}
			}

			// Load all the parsed objects.
			let results = [];
			for (let j = 0, len = ast.objects.length; j < len; j++) {
				let object = ast.objects[j];

				// Have a handler for it?
				if (self._handlers[object.language]) {
					self._objlangs[object.name] = object.language;
					results.push(self._handlers[object.language].load(object.name, object.code));
				}
			}

			return ok;
		}

		/**
		void sortReplies()

		After you have finished loading your RiveScript code, call this method to
		populate the various sort buffers. This is absolutely necessary for reply
		matching to work efficiently!
		*/
		sortReplies() {
			var self = this;

			// (Re)initialize the sort cache.
			self._sorted.topics = {};
			self._sorted.thats = {};

			self.say("Sorting triggers...");

			// Loop through all the topics.
			for (let topic in self._topics) {
				if (!self._topics.hasOwnProperty(topic)) {
					continue;
				}
				self.say(`Analyzing topic ${topic}...`);

				// Collect a list of all the triggers we're going to worry about. If this
				// topic inherits another topic, we need to recursively add those to the
				// list as well.
				let allTriggers = inherit_utils.getTopicTriggers(self, topic);

				// Sort these triggers.
				self._sorted.topics[topic] = sorting.sortTriggerSet(allTriggers, true);

				// Get all of the %Previous triggers for this topic.
				let thatTriggers = inherit_utils.getTopicTriggers(self, topic, true);

				// And sort them, too.
				self._sorted.thats[topic] = sorting.sortTriggerSet(thatTriggers, false);
			}

			// Sort the substitution lists.
			self._sorted.sub = sorting.sortList(Object.keys(self._sub));
			return self._sorted.person = sorting.sortList(Object.keys(self._person));
		}

		/**
		data deparse()

		Translate the in-memory representation of the loaded RiveScript documents
		into a JSON-serializable data structure. This may be useful for developing
		a user interface to edit RiveScript replies without having to edit the
		RiveScript code manually, in conjunction with the `write()` method.

		The format of the deparsed data structure is out of scope for this document,
		but there is additional information and examples available in the `eg/`
		directory of the source distribution. You can read the documentation on
		GitHub here: [RiveScript Deparse](https://github.com/aichaos/rivescript-js/tree/master/eg/deparse)
		*/
		deparse() {
			var self = this;

			// Data to return from this function.
			let result = {
				begin: {
					global: utils.clone(self._global),
					var: utils.clone(self._var),
					sub: utils.clone(self._sub),
					person: utils.clone(self._person),
					array: utils.clone(self._array),
					triggers: []
				},
				topics: utils.clone(self._topics),
				inherits: utils.clone(self._inherits),
				includes: utils.clone(self._includes),
				objects: {}
			};

			for (let key in self._handlers) {
				result.objects[key] = {
					_objects: utils.clone(self._handlers[key]._objects)
				};
			}

			// Begin topic.
			if (result.topics.__begin__ != null) {
				result.begin.triggers = result.topics.__begin__;
				delete result.topics.__begin__;
			}

			// Populate config fields if they differ from the defaults.
			if (self._debug) {
				result.begin.global.debug = self._debug;
			}
			if (self._depth !== 50) {
				result.begin.global.depth = self._depth;
			}

			return result;
		}

		/**
		string stringify([data deparsed])

		Translate the in-memory representation of the RiveScript brain back into
		RiveScript source code. This is like `write()`, but it returns the text of
		the source code as a string instead of writing it to a file.

		You can optionally pass the parameter `deparsed`, which should be a data
		structure of the same format that the `deparse()` method returns. If not
		provided, the current internal data is used (this function calls `deparse()`
		itself and uses that).

		Warning: the output of this function won't be pretty. For example, no word
		wrapping will be done for your longer replies. The only guarantee is that
		what comes out of this function is valid RiveScript code that can be loaded
		back in later.
		*/
		stringify(deparsed) {
			var self = this;
			return self.parser.stringify(deparsed);
		}

		/**
		void write (string filename[, data deparsed])

		Write the in-memory RiveScript data into a RiveScript text file. This
		method can not be used on the web; it requires filesystem access and can
		only run from a Node environment.

		This calls the `stringify()` method and writes the output into the filename
		specified. You can provide your own deparse-compatible data structure,
		or else the current state of the bot's brain is used instead.
		*/
		write(filename, deparsed) {
			var self = this;

			// Can't be done on the web!
			if (self._runtime === "web") {
				self.warn("write() can't be used on the web!");
				return;
			}

			return self._node.fs.writeFile(filename, self.stringify(deparsed), function(err) {
				if (err) {
					return self.warn(`Error writing to file ${filename}: ${err}`);
				}
			});
		}

		////////////////////////////////////////////////////////////////////////
		// Public Configuration Methods                                       //
		////////////////////////////////////////////////////////////////////////

		/**
		void setHandler(string lang, object)

		Set a custom language handler for RiveScript object macros. See the source
		for the built-in JavaScript handler (src/lang/javascript.coffee) as an
		example.

		By default, JavaScript object macros are enabled. If you want to disable
		these (e.g. for security purposes when loading untrusted third-party code),
		just set the JavaScript handler to null:

		```javascript
		var bot = new RiveScript();
		bot.setHandler("javascript", null);
		```
		*/
		setHandler(lang, obj) {
			var self = this;

			if (obj === void 0) {
				return delete self._handlers[lang];
			} else {
				return self._handlers[lang] = obj;
			}
		}

		/**
		void setSubroutine(string name, function)

		Define a JavaScript object macro from your program.

		This is equivalent to having a JS object defined in the RiveScript code,
		except your JavaScript code is defining it instead.
		*/
		setSubroutine(name, code) {
			var self = this;

			// Do we have a JS handler?
			if (self._handlers.javascript) {
				self._objlangs[name] = "javascript";
				return self._handlers.javascript.load(name, code);
			}
		}

		/**
		void setGlobal (string name, string value)

		Set a global variable. This is equivalent to `! global` in RiveScript.
		Set the value to `undefined` to delete a global.
		*/
		setGlobal(name, value) {
			var self = this;

			if (value === void 0) {
				return delete self._global[name];
			} else {
				return self._global[name] = value;
			}
		}

		/**
		void setVariable (string name, string value)

		Set a bot variable. This is equivalent to `! var` in RiveScript.
		Set the value to `undefined` to delete a bot variable.
		*/
		setVariable(name, value) {
			var self = this;

			if (value === void 0) {
				return delete self._var[name];
			} else {
				return self._var[name] = value;
			}
		}

		/**
		void setSubstitution (string name, string value)

		Set a substitution. This is equivalent to `! sub` in RiveScript.
		Set the value to `undefined` to delete a substitution.
		*/
		setSubstitution(name, value) {
			var self = this;

			if (value === void 0) {
				return delete self._sub[name];
			} else {
				self._submax = Math.max(name.split(' ').length, self._submax);
				return self._sub[name] = value;
			}
		}

		/**
		void setPerson (string name, string value)

		Set a person substitution. This is equivalent to `! person` in RiveScript.
		Set the value to `undefined` to delete a person substitution.
		*/
		setPerson(name, value) {
			var self = this;

			if (value === void 0) {
				return delete self._person[name];
			} else {
				self._personmax = Math.max(name.split(' ').length, self._personmax);
				return self._person[name] = value;
			}
		}

		/**
		async setUservar (string user, string name, string value)

		Set a user variable for a user.
		*/
		async setUservar(user, name, value) {
			var self = this;

			// Are we setting the topic and are we forcing case?
			if (name === "topic" && self._forceCase) {
				value = value.toLowerCase();
			}

			var fields = {};
			fields[name] = value;
			return self._session.set(user, fields);
		}

		/**
		async setUservars (string user, object data)

		Set multiple user variables by providing an object of key/value pairs.
		Equivalent to calling `setUservar()` for each pair in the object.
		*/
		async setUservars(user, data) {
			var self = this;
			return self._session.set(user, data);
		}

		/**
		string getVariable (string name)

		Gets a variable. This is equivalent to `<bot name>` in RiveScript.
		*/
		getVariable(name) {
			var self = this;

			// The var exists?
			if (typeof self._var[name] !== "undefined") {
				return self._var[name];
			} else {
				return "undefined";
			}
		}

		/**
		async getUservar (string user, string name) -> value

		Get a variable from a user. Returns the string "undefined" if it isn't
		defined.
		*/
		async getUservar(user, name) {
			var self = this;
			return self._session.get(user, name);
		}

		/**
		async getUservars ([string user]) -> object

		Get all variables about a user. If no user is provided, returns all data
		about all users.
		*/
		async getUservars(user) {
			var self = this;
			if (user === undefined) {
				return self._session.getAll();
			} else {
				return self._session.getAny(user);
			}
		}

		/**
		async clearUservars ([string user])

		Clear all a user's variables. If no user is provided, clears all variables
		for all users.
		*/
		async clearUservars(user) {
			var self = this;
			if (user === undefined) {
				return self._session.resetAll();
			} else {
				return self._session.reset(user);
			}
		}

		/**
		async freezeUservars (string user)

		Freeze the variable state of a user. This will clone and preserve the user's
		entire variable state, so that it can be restored later with
		`thawUservars()`
		*/
		async freezeUservars(user) {
			var self = this;
			return self._session.freeze(user);
		}

		/**
		async thawUservars (string user[, string action])

		Thaw a user's frozen variables. The action can be one of the following:
		* discard: Don't restore the variables, just delete the frozen copy.
		* keep: Keep the frozen copy after restoring
		* thaw: Restore the variables and delete the frozen copy (default)
		*/
		async thawUservars(user, action="thaw") {
			var self = this;
			return self._session.thaw(user, action);
		}

		/**
		async lastMatch (string user) -> string

		Retrieve the trigger that the user matched most recently.
		*/
		async lastMatch(user) {
			var self = this;
			return self._session.get(user, "__lastmatch__");
		}

		/**
		async initialMatch (string user) -> string

		Retrieve the trigger that the user matched initially. This will return
		only the first matched trigger and will not include subsequent redirects.

		This value is reset on each `reply()` call.
		*/
		async initialMatch(user) {
			var self = this;
			return self._session.get(user, "__initialmatch__");
		}

		/**
		async lastTriggers (string user) -> object

		Retrieve the triggers that have been matched for the last reply. This
		will contain all matched trigger with every subsequent redirects.

		This value is reset on each `reply()` or `replyAsync()` call.
		*/
		async lastTriggers(user) {
			var self = this;
			return self._session.get(user, "__last_triggers__");
		}

		/**
		async getUserTopicTriggers (string username) -> object

		Retrieve the triggers in the current topic for the specified user. It can
		be used to create a UI that gives the user options based on trigges, e.g.
		using buttons, select boxes and other UI resources. This also includes the
		triggers available in any topics inherited or included by the user's current
		topic.

		This will return `undefined` if the user cant be find
		*/
		async getUserTopicTriggers(user) {
			var self = this;
			return new Promise((resolve, reject) => {
				self._session.get(user, "topic").then((topic) => {
					resolve(inherit_utils.getTopicTriggers(self, topic));
				});
			});
		}

		/**
		string currentUser ()

		Retrieve the current user's ID. This is most useful within a JavaScript
		object macro to get the ID of the user who invoked the macro (e.g. to
		get/set user variables for them).

		This will return undefined if called from outside of a reply context
		(the value is unset at the end of the `reply()` method)
		*/
		currentUser() {
			var self = this;

			if (self.brain._currentUser === null) {
				self.warn("currentUser() is intended to be called from within a JS object macro!");
			}
			return self.brain._currentUser;
		}

		////////////////////////////////////////////////////////////////////////
		// Reply Fetching Methods                                             //
		////////////////////////////////////////////////////////////////////////

		/**
		Promise reply (string username, string message[, scope])

		Fetch a reply from the RiveScript brain. The message doesn't require any
		special pre-processing to be done to it, i.e. it's allowed to contain
		punctuation and weird symbols. The username is arbitrary and is used to
		uniquely identify the user, in the case that you may have multiple
		distinct users chatting with your bot.

		**Changed in version 2.0.0:** this function used to return a string, but
		therefore didn't support async object macros or session managers. This
		function now returns a Promise (obsoleting the `replyAsync()` function).

		The optional `scope` parameter will be passed down into any JavaScript
		object macros that the RiveScript code executes. If you pass the special
		variable `this` as the scope parameter, then `this` in the context of an
		object macro will refer to the very same `this` as the one you passed in,
		so for example the object macro will have access to any local functions
		or attributes that your code has access to, from the location that `reply()`
		was called. For an example of this, refer to the `eg/scope` directory in
		the source distribution of RiveScript-JS.

		Example:

		```javascript
		// Normal usage as a promise
		bot.reply(username, message, this).then(function(reply) {
		    console.log("Bot>", reply);
		});

		// Async-Await usage in an async function.
		async function getReply(username, message) {
		    var reply = await bot.reply(username, message);
		    console.log("Bot>", reply);
		}
		```
		*/
		async reply(user, msg, scope) {
			var self = this;
			return (await self.brain.reply(user, msg, scope));
		}

		/**
		Promise replyAsync (string username, string message [[, scope], callback])

		**Obsolete as of v2.0.0** -- use `reply()` instead in new code.

		Asyncronous version of reply. Use replyAsync if at least one of the subroutines
		used with the `<call>` tag returns a promise.

		Example: using promises

		```javascript
		rs.replyAsync(user, message).then(function(reply) {
		  console.log("Bot>", reply);
		}).catch(function(error) {
		  console.error("Error: ", error);
		});
		```

		Example: using the callback

		```javascript
		rs.replyAsync(username, msg, this, function(error, reply) {
		  if (!error) {
		    console.log("Bot>", reply);
		  } else {
		    console.error("Error: ", error);
		  }
		});
		```
		*/
		replyAsync(user, msg, scope, callback) {
			var self = this;
			self.warn("DEPRECATED FUNCTION: RiveScript.replyAsync() is deprecated; use reply() instead");

			let reply = self.brain.reply(user, msg, scope);
			if (callback) {
				reply.then((result) => {
					return callback.call(self, null, result);
				}).catch((error) => {
					return callback.call(self, error, null);
				});
			}
			return reply;
		}

	};

	/**
	Promise Promise

	**DEPRECATED**

	Backwards compatible alias to the native JavaScript `Promise` object.

	`rs.Promise` used to refer to an `RSVP.Promise` which acted as a polyfill
	for older systems. In new code, return a native Promise directly from your
	object macros.

	This enables you to create a JavaScript object macro that returns a promise
	for asynchronous tasks (e.g. polling a web API or database). Example:

	```javascript
	rs.setSubroutine("asyncHelper", function (rs, args) {
	 return new rs.Promise(function (resolve, reject) {
	   resolve(42);
	 });
	});
	```

	If you're using promises in your object macros, you need to get a reply from
	the bot using the `replyAsync()` method instead of `reply()`, for example:

	```javascript
	rs.replyAsync(username, message, this).then(function(reply) {
	   console.log("Bot> ", reply);
	});
	```
	*/
	RiveScript.prototype.Promise = Promise;

	return RiveScript;
})();

module.exports = RiveScript;
