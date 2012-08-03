(function(publish) {
	////////////////////////////////////////////////////////////////////////////
	// Constructor and Debug Methods                                          //
	////////////////////////////////////////////////////////////////////////////
	
	// Constants.
	var VERSION    = "1.00";
	var RS_VERSION = "2.0";

	/**
	 * RiveScript (hash options)
	 * 
	 * Create a new RiveScript interpreter. options is a hash:
	 *
	 * bool debug:     Debug mode            (default false)
	 * int  depth:     Recursion depth limit (default 50)
	 * bool strict:    Strict mode           (default true)
	 * str  debug_div: ID of an element to write debug lines to (optional)
	 */
	function RiveScript (opts) {
		// Defaults.
		this._debug   = false;
		this._strict  = true;
		this._depth   = 50;
		this._div     = undefined;

		// Identify our runtime environment. Web, or NodeJS?
		this._runtime = this.runtime();

		// Loading files in will be asynchronous, so we'll need to be able to
		// identify when we've finished loading files! This will be an object
		// to keep track of which files are still pending.
		this._pending   = [];
		this._loadcount = 0;  // For multiple calls to loadFile...

		// Internal data structures.
		this._gvars    = {}; // 'global' variables
		this._bvars    = {}; // 'bot' variables
		this._subs     = {}; // 'sub' substitutions
		this._person   = {}; // 'person' substitutions
		this._arrays   = {}; // 'array' variables
		this._users    = {}; // 'user' variables
		this._freeze   = {}; // frozen 'user' variables
		this._includes = {}; // included topics
		this._lineage  = {}; // inherited topics
		this._handlers = {}; // object handlers
		this._objlangs = {}; // languages of objects used
		this._topics   = {}; // main reply structure
		this._thats    = {}; // %Previous reply structure
		this._sorted   = {}; // Sorted buffers

		// Given any options?
		if (typeof(opts) == "object") {
			if (opts["debug"]) {
				this._debug = opts["debug"] ? true : false;
			}
			if (opts["strict"]) {
				this._strict = opts["strict"] ? true : false;
			}
			if (opts["depth"]) {
				this._depth = parseInt(opts["depth"]);
			}
			if (opts["debug_div"]) {
				this._div = opts["debug_div"];
				if (this._div.indexOf("#") != 0) {
					this._div = "#" + this._div;
				}
			}
		}

		this.say("RiveScript Interpreter v" + VERSION + " Initialized.");
		this.say("Runtime Environment: " + this._runtime);
	}

	/**
	 * private void runtime ()
	 *
	 * Detect the runtime environment of this module, to determine if we're
	 * running in a web browser or from NodeJS for example.
	 **/
	RiveScript.prototype.runtime = function () {
		// In Node, there is no window, and module is a thing.
		if (typeof(window) == "undefined" && typeof(module) == "object") {
			return "node";
		} else {
			return "web";
		}
	};

	/**
	 * private void say (string message)
	 *
	 * This is the debug function. If debug mode is enabled, the 'message' will be
	 * sent to the console via console.log (if available), or to your debug div if
	 * you defined one.
	 *
	 * @param message: A message to add to the debug log.
	 */
	RiveScript.prototype.say = function (message) {
		if (this._debug != true) {
			return;
		}

		// A debug div provided?
		if (this._div) {
			$(this._div).append("<div>[RS] " + message + "</div>");
		} else if (console) {
			console.log("[RS] " + message);
		}
	};

	/**
	 * private void warn (string message)
	 *
	 * Print a warning or error message. This is like debug, except it's GOING to be
	 * given to the user one way or another. If the debug div is defined, this is
	 * written to it. If console is defined, the error will be sent there. In a
	 * worst case scenario, an alert box is shown.
	 */
	RiveScript.prototype.warn = function (message, fname, lineno) {
		// Provided a file and line?
		if (typeof(fname) != "undefined" && typeof(lineno) != "undefined") {
			message += " at " + fname + " line " + lineno;
		}

		if (this._div) {
			// A debug div is provided.
			$(this._div).append("<div style='color: #FF0000; font-weight: bold'>"
				+ message + "</div>");
		} else if (console) {
			// The console seems to exist.
			if (console.error) {
				console.error(message);
			} else {
				console.log("[WARNING] " + message);
			}
		} else {
			// Do the alert box.
			window.alert(message);
		}
	}

	////////////////////////////////////////////////////////////////////////////
	// Loading and Parsing Methods                                            //
	////////////////////////////////////////////////////////////////////////////

	/**
	 * void loadFile (string path || array path[, on_success[, on_error]])
	 *
	 * Load a RiveScript document from a file. The path can either be a string
	 * that contains the path to a single file, or an array of paths to load
	 * multiple files. on_success is a function to be called when the file(s)
	 * have been successfully loaded. on_error is for catching any errors, such
	 * as syntax errors.
	 */
	RiveScript.prototype.loadFile = function (path, on_success, on_error) {
		// Did they give us a single path?
		if (typeof(path) == "string") {
			path = [ path ];
		}

		// To identify when THIS batch of files completes, we keep track of them
		// under the "loadcount".
		var loadcount = this._loadcount++;
		this._pending[loadcount] = {};

		// Go through and load the files.
		for (var i = 0; i < path.length; i++) {
			var file = path[i];
			this.say("Request to load file: " + file);
			this._pending[loadcount][file] = 1;

			// How do we load the file?
			if (this._runtime == "web") {
				// With ajax!
				this._ajax_load_file(loadcount, file, on_success, on_error);
			}
		}
	};

	/**
	 * private void _ajax_load_file (int loadcount, string path, on_success(), on_error())
	 *
	 * Load a file using ajax. DO NOT CALL THIS DIRECTLY.
	 */
	RiveScript.prototype._ajax_load_file = function (loadcount, file, on_success, on_error) {
		// A pointer to ourself.
		var RS = this;

		// Make the Ajax request.
		$.ajax({
			url:      file,
			dataType: "text",
			success:  function(data, textStatus, xhr) {
				RS.say("Loading file " + file + " complete.");

				// Parse it real good!
				RS.parse(file, data, on_error);

				// Log that we've received this file.
				delete RS._pending[loadcount][file];

				// All gone?
				if (Object.keys(RS._pending[loadcount]).length == 0) {
					if (typeof(on_success) == "function") {
						on_success.call();
					}
				}
			},
			error: function(xhr, textStatus, errorThrown) {
				RS.say("Error! " + textStatus + "; " + errorThrown);
				if (typeof(on_error) == "function") {
					on_error.call(textStatus);
				}
			},
		});
	};

	/**
	 * void loadDirectory (string path[, func on_success[, func on_error]])
	 *
	 * Load RiveScript documents from a directory.
	 *
	 * This function is not supported in a web environment. Only for
	 * NodeJS.
	 */
	RiveScript.prototype.loadDirectory = function (path) {
		// This can't be done on the web.
		if (this._runtime === "web") {
			this.warn("loadDirectory can't be used on the web!");
			return;
		}

		// TODO
	};

	/**
	 * void stream (string code)
	 *
	 * Stream in RiveScript code dynamically.
	 */
	RiveScript.prototype.stream = function (code) {
		this.warn("Not Implemeneted!"); // TODO
	};

	/**
	 * private void parse (string name, string code[, func on_error])
	 *
	 * Parse RiveScript code and load it into memory. 'name' is a file name in
	 * case syntax errors need to be pointed out. 'code' is the source code,
	 * and 'on_error' is a function to call when a syntax error occurs.
	 */
	RiveScript.prototype.parse = function (fname, code, on_error) {
		this.say("Parsing code!");

		// Track temporary variables.
		var topic   = "random"; // Default topic=random
		var lineno  = 0;        // Line numbers for syntax tracking
		var comment = false;    // In a multi-line comment
		var inobj   = false;    // In an object
		var objname = "";       // The name of the object we're in
		var objlang = "";       // The programming language of the object
		var objbuf  = [];       // Object contents buffer
		var ontrig  = "";       // The current trigger
		var repcnt  = 0;        // The reply counter
		var concnt  = 0;        // The condition counter
		var lastcmd = "";       // Last command code
		var isThat  = "";       // Is a %Previous trigger

		// Go through the lines of code.
		var lines = code.split("\n");
		for (var lp = 0, ll = lines.length; lp < ll; lp++) {
			var line = lines[lp];
			lineno = lp + 1;

//			this.say("Line: " + line + " (topic: " + topic + ") incomment: " + inobj);

			// Strip the line.
			line = this._strip(line);
			if (line.length == 0) {
				continue; // Skip blank ones!
			}

			// In an object?
			if (inobj) {
				// End of the object?
				if (line.indexOf("< object") > -1) {
					// End the object.
					if (objname.length > 0) {
						// Call the object's handler. TODO
					}
					objname = '';
					objlang = '';
					objbuf  = '';
					inobj   = false;
				} else {
					objbuf.push(line);
				}
				continue;
			}

			// Look for comments.
			if (line.indexOf("//") == 0) {
				// Single line comments.
				continue;
			} else if (line.indexOf("#") == 0) {
				// Old style single line comments.
				this.warn("Using the # symbol for comments is deprecated", fname, lineno);
				continue;
			} else if (line.indexOf("/*") == 0) {
				// Start of a multi-line comment.
				if (line.indexOf("*/") > -1) {
					// The end comment is on the same line!
					continue;
				}

				// In a multi-line comment.
				comment = true;
				continue;
			} else if (line.indexOf("*/") > -1) {
				// End of a multi-line comment.
				comment = false;
				continue;
			}
			if (comment) {
				continue;
			}

			// Separate the command from the data.
			if (line.length < 2) {
				this.warn("Weird single-character line '" + line + "' found", fname, lineno);
				continue;
			}
			cmd  = line.substring(0, 1);
			line = this._strip(line.substring(1));

			// Ignore in-line comments if there's a space before and after the "//" symbols.
			if (line.indexOf(" // ") > -1) {
				line = this._strip(line.split(" // ")[0]); // TODO: test this!
			}

			// Run a syntax check on this line.
			var syntax_error = this.checkSyntax(cmd, line);
			if (typeof(syntax_error) != "undefined") {
				if (this._strict && typeof(on_error) == "function") {
					on_error.call("Syntax error: " + syntax_error
						+ " at " + fname + " line " + lineno
						+ ", near " + cmd + " " + line);
					return undefined;
				} else {
					this.warn("Syntax error: " + syntax_error);
				}
			}

			// Reset the %Previous state if this is a new +Trigger.
			if (cmd == '+') {
				isThat = "";
			}

			// Do a lookahead for ^Continue and %Previous commands.
			for (var i = lp + 1; i < ll; i++) {
				var lookahead = this._strip(lines[i]);
				if (lookahead.length < 2) {
					continue;
				}

				var lookCmd = lookahead.substring(0,1);
				lookahead   = this._strip(lookahead.substring(1));

				// Only continue if the lookahead line has any data.
				if (lookahead.length != 0) {
					// The lookahead command has to be either a % or a ^.
					if (lookCmd != '^' && lookCmd != '%') {
						break;
					}

					// If the current command is a +, see if the following is a %.
					if (cmd == '+') {
						if (lookCmd == '%') {
							isThat = lookahead;
							break;
						} else {
							isThat = '';
						}
					}

					// If the current command is a ! and the next command(s) are
					// ^, we'll tack each extension on as a line break (which is
					// useful information for arrays).
					if (cmd == '!') {
						if (lookCmd == '^') {
							line += "<crlf>" + lookahead;
						}
						continue;
					}

					// If the current command is not a ^, and the line after is
					// not a %, but the line after IS a ^, then tack it on to the
					// end of the current line.
					if (cmd != '^' && lookCmd != '%') {
						if (lookCmd == '^') {
							line += lookahead;
						} else {
							break;
						}
					}
				}
			}

			this.say("Cmd: '" + cmd + "'; line: " + line);

			// Handle the types of RS commands.
			switch(cmd) {
				case '!': // ! DEFINE
					var halves = line.split("=", 2);
					var left   = this._strip(halves[0]).split(" ", 2);
					var value = type = name = '';
					if (halves.length == 2) {
						value = this._strip(halves[1]);
					}
					if (left.length >= 1) {
						type = this._strip(left[0]);
						if (left.length >= 2) {
							left.shift();
							name = this._strip(left.join(" "));
						}
					}

					// Remove 'fake' line breaks unless this is an array.
					if (type != "array") {
						value = value.replace(/<crlf>/g, "");
					}

					// Handle version numbers.
					if (type == "version") {
						// Verify we support it.
						if (parseFloat(value) > parseFloat(RS_VERSION)) {
							this.warn("Unsupported RiveScript version. We only support " + RS_VERSION, fname, lineno);
							return;
						}
						continue;
					}

					// All other types of defines require a value and variable name.
					if (name.length == 0) {
						this.warn("Undefined variable name", fname, lineno);
						continue;
					} else if (value.length == 0) {
						this.warn("Undefined variable value", fname, lineno);
						continue;
					}

					// Handle the rest of the types.
					if (type == "global") {
						// 'Global' variables.
						this.say("Set global " + name + " = " + value);

						if (value == "<undef>") {
							delete this._gvars[name];
							continue;
						} else {
							this._gvars[name] = value;
						}

						// Handle flipping debug and depth vars.
						if (name == "debug") {
							if (value.toLowerCase() == "true") {
								this._debug = true;
							} else {
								this._debug = false;
							}
						} else if (name == "depth") {
							this._depth = parseInt(value);
						} else if (name == "strict") {
							if (value.toLowerCase() == "true") {
								this._strict = true;
							} else {
								this._strict = false;
							}
						}
					} else if (type == "var") {
						// Bot variables.
						this.say("Set bot variable " + name + " = " + value);

						if (value == "<undef>") {
							delete this._bvars[name];
						} else {
							this._bvars[name] = value;
						}
					} else if (type == "array") {
						// Arrays
						this.say("Set array " + name + " = " + value);

						if (value == "<undef>") {
							delete this._arrays[name];
							continue;
						}

						// Did this have multiple parts?
						var parts = value.split("<crlf>");

						// Process each line of array data.
						var fields = [];
						for (var i = 0, end = parts.length; i < end; i++) {
							var val = parts[i];
							if (val.indexOf("|") > -1) {
								var tmp = val.split("|");
								fields.push.apply( fields, val.split("|") );
							} else {
								fields.push.apply( fields, val.split(" ") );
							}
						}

						// Convert any remaining '\s' over.
						for (var i = 0, end = fields.length; i < end; i++) {
							fields[i] = fields[i].replace(/\\s/ig, " ");
						}

						this._arrays[name] = fields;
					} else if (type == "sub") {
						// Substitutions
						this.say("Set substitution " + name + " = " + value);

						if (value == "<undef>") {
							delete this._subs[name];
						} else {
							this._subs[name] = value;
						}
					} else if (type == "person") {
						// Person substitutions
						this.say("Set person substitution " + name + " = " + value);

						if (value == "<undef>") {
							delete this._person[name];
						} else {
							this._person[name] = value;
						}
					} else {
						this.warn("Unknown definition type '" + type + "'", fname, lineno);
					}

					continue;
				case '>':
					// > LABEL
					var temp   = this._strip(line).split(" ");
					var type   = temp.shift();
					this.say("line: " + line + "; temp: " + temp + "; type: " + type);
					var name   = '';
					var fields = [];
					if (temp.length > 0) {
						name = temp.shift();
					}
					if (temp.length > 0) {
						fields = temp;
					}

					// Handle the label types.
					if (type == "begin") {
						// The BEGIN block.
						this.say("Found the BEGIN block.");
						type = "topic";
						name = "__begin__";
					}
					if (type == "topic") {
						// Starting a new topic.
						this.say("Set topic to " + name);
						ontrig = '';
						topic  = name;

						// Does this topic include or inherit another one?
						var mode = ''; // or 'inherits' or 'includes'
						if (fields.length >= 2) {
							for (var i = 0; i < fields.length; i++) {
								var field = fields[i];
								if (field == "includes" || field == "inherits") {
									mode = field;
								} else if (mode != '') {
									// This topic is either inherited or included.
									if (mode == "includes") {
										if (!this._includes[name]) {
											this._includes[name] = {};
										}
										this._includes[name][field] = 1;
									} else {
										if (!this._lineage[name]) {
											this._lineage[name] = {};
										}
										this._lineage[name][field] = 1;
									}
								}
							}
						}
					} else if (type == "object") {
						// If a field was provided, it should be the programming language.
						lang = undefined;
						if (fields.length > 0) {
							lang = fields[0].toLowerCase();
						}

						// Only try to parse a language we support.
						ontrig = '';
						if (lang == undefined) {
							self.warn("Trying to parse unknown programming language", fname, lineno);
							lang = 'javascript'; // Assume it's JS
						}

						// See if we have a handler for this language.
						if (this._handlers[lang]) {
							// We have a handler, so start loading the code.
							objname = name;
							objlang = lang;
							objbuf  = [];
							inobj   = true;
						} else {
							// We don't have a handler, so just ignore it.
							objname = '';
							objlang = '';
							objbuf  = [];
							inobj   = true;
						}
					} else {
						this.warn("Unknown label type '" + type + "'", fname, lineno);
					}

					continue;
				case '<':
					// < LABEL
					var type = line;

					if (type == "begin" || type == "topic") {
						this.say("End the topic label.");
						topic = "random";
					} else if (type == "object") {
						this.say("End the object label.");
						inobj = false;
					}

					continue;
				case '+':
					// + TRIGGER
					this.say("Trigger pattern: " + line);
					if (isThat.length > 0) {
						this._initTT('thats', topic, isThat, line);
					} else {
						this._initTT('topics', topic, line);
					}
					ontrig = line;
					repcnt = 0;
					concnt = 0;
					continue;
				case '-':
					// - REPLY
					if (ontrig == '') {
						this.warn("Response found before trigger", fname, lineno);
						continue;
					}
					this.say("Response: " + line);
					if (isThat.length > 0) {
						this._thats[topic][isThat][ontrig]['reply'][repcnt] = line;
					} else {
						this._topics[topic][ontrig]['reply'][repcnt] = line;
					}
					repcnt++;
					continue;
				case '%':
					// % PREVIOUS
					continue; // This was handled above.
				case '^':
					// ^ CONTINUE
					continue; // This was handled above.
				case '@':
					// @ REDIRECT
					this.say("Redirect response to: " + line);
					if (isThat.length > 0) {
						this._thats[topic][isThat][ontrig]['redirect'] = this._strip(line);
					} else {
						this._topics[topic][ontrig]['redirect'] = this._strip(line);
					}
					continue;
				case '*':
					// * CONDITION
					this.say("Adding condition: " + line);
					if (isThat.length > 0) {
						this._thats[topic][isThat][ontrig]['condition'][concnt] = line;
					} else {
						this._topics[topic][ontrig]['condition'][concnt] = line;
					}
					concnt++;
					continue;
				default:
					this.warn("Unknown command '" + cmd + "'", fname, lineno);
			}
		}
	};

	RiveScript.prototype.checkSyntax = function (cmd, line) {
		return undefined; // TODO
	};

	// Initialize a Topic Tree data structure.
	RiveScript.prototype._initTT = function (toplevel, topic, trigger, what) {
		if (toplevel == "topics") {
			if (!this._topics[topic]) {
				this._topics[topic] = {};
			}
			if (!this._topics[topic][trigger]) {
				this._topics[topic][trigger] = {
					'reply':     {},
					'condition': {},
					'redirect':  undefined
				};
			}
		} else if (toplevel == "thats") {
			if (!this._thats[topic]) {
				this._thats[topic] = {};
			}
			if (!this._thats[topic][trigger]) {
				this._thats[topic][trigger] = {};
			}
			if (!this._thats[topic][trigger][what]) {
				this._thats[topic][trigger][what] = {
					'reply':     {},
					'condition': {},
					'redirect':  undefined
				};
			}
		}
	};

	////////////////////////////////////////////////////////////////////////////
	// Loading and Parsing Methods                                            //
	////////////////////////////////////////////////////////////////////////////

	/**
	 * void sortReplies ()
	 *
	 * After you have finished loading your RiveScript code, call this method to
	 * populate the various sort buffers. This is absolutely necessary for
	 * reply matching to work efficiently!
	 */
	RiveScript.prototype.sortReplies = function (thats) {
		// This method can sort both triggers and that's.
		var triglvl, sortlvl;
		if (thats != undefined) {
			triglvl = this._thats;
			sortlvl = 'thats';
		} else {
			triglvl = this._topics;
			sortlvl = 'topics';
		}

		// (Re)initialize the sort cache.
		this._sorted[sortlvl] = {};

		this.say("Sorting triggers...");

		// Loop through all the topics.
		for (var topic in triglvl) {
			this.say("Analyzing topic " + topic);

			// Collect a list of all the triggers we're going to worry about.
			// If this topic inherits another topic, we need to recursively add
			// those to the list as well.
			var alltrig = this._topic_triggers(topic, triglvl);

			// Keep in mind here that there is a difference between 'includes'
			// and 'inherits' -- topics that inherit other topics are able to
			// OVERRIDE triggers that appear in the inherited topic. This means
			// that if the top topic has a trigger of simply '*', then NO
			// triggers are capable of matching in ANY inherited topic, because
			// even though * has the lowest priority, it has an automatic
			// priority over all inherited topics.
			//
			// The _topic_triggers method takes this into account. All topics
			// that inherit other topics will have their triggers prefixed with
			// a fictional {inherits} tag, which would start at {inherits=0} and
			// increment if the topic tree has other inheriting topics. So we can
			// use this tag to make sure topics that inherit things will have their
			// triggers always be on top of the stack, from inherits=0 to
			// inherits=n.

			// Sort these triggers.
			var running = this._sort_trigger_set(alltrig);

			// Save this topic's sorted list.
			if (!this._sorted[sortlvl]) {
				this._sorted[sortlvl] = {};
			}
			this._sorted[sortlvl][topic] = running;
		}

		// And do it all again for %Previous!
		if (thats == undefined) {
			// This will set the %Previous lines to best match the bot's last reply.
			this.sortReplies(true);

			// If any of the %Previous's had more than one +Trigger for them,
			// this will sort all those +Triggers to pair back to the best human
			// interaction.
			this._sort_that_triggers();

			// Also sort both kinds of substitutions.
			this._sort_list("subs", Object.keys(this._subs));
			this._sort_list("person", Object.keys(this._person));
		}
	};

	// Make a list of sorted triggers that correspond to %Previous groups.
	RiveScript.prototype._sort_that_triggers = function () {
		this.say("Sorting reverse triggers for %Previous groups...");

		// (Re)initialize the sort buffer.
		this._sorted["that_trig"] = {};

		for (var topic in this._thats) {
			if (!this._sorted["that_trig"][topic]) {
				this._sorted["that_trig"][topic] = {};
			}

			for (var bottrig in this._thats[topic]) {
				if (!this._sorted["that_trig"][topic][bottrig]) {
					this._sorted["that_trig"][topic][bottrig] = [];
				}
				var triggers = this._sort_trigger_set(Object.keys(this._thats[topic][bottrig]));
				this._sorted["that_trig"][topic][bottrig] = triggers;
			}
		}
	};

	// Sort a group of triggers in an optimal sorting order.
	RiveScript.prototype._sort_trigger_set = function (triggers) {
		// Create a priority map.
		var prior = {
			0: [] // Default priority = 0
		};

		// Sort triggers by their weights.
		for (var i = 0, end = triggers.length; i < end; i++) {
			var trig = triggers[i];
			var match  = trig.match(/\{weight=(\d+)\}/i);
			var weight = 0;
			if (match && match[1]) {
				weight = match[1];
			}

			if (!prior[weight]) {
				prior[weight] = [];
			}
			prior[weight].push(trig);
		}

		// Keep a running list of sorted triggers for this topic.
		var running = [];

		// Sort them by priority.
		var prior_sort = Object.keys(prior).sort(function(a,b) { return b - a });
		for (var i = 0, end = prior_sort.length; i < end; i++) {
			var p = prior_sort[i];
			this.say("Sorting triggers with priority " + p);

			// So, some of these triggers may include {inherits} tags, if they
			// came from a topic which inherits another topic. Lower inherits
			// values mean higher priority on the stack.
			var inherits = -1;         // -1 means no {inherits} tag
			var highest_inherits = -1; // highest number seen so far

			// Loop through and categorize these triggers.
			var track = {};
			track[inherits] = this._init_sort_track();

			for (var j = 0, jend = prior[p].length; j < jend; j++) {
				var trig = prior[p][j];
				this.say("Looking at trigger: " + trig);

				// See if it has an inherits tag.
				var match = trig.match(/\{inherits=(\d+)\}/i);
				if (match && match[1]) {
					inherits = parseInt(match[1]);
					if (inherits > highest_inherits) {
						highest_inherits = inherits;
					}
					this.say("Trigger belongs to a topic that inherits other topics. Level=" + inherits);
				} else {
					inherits = -1;
				}

				// If this is the first time we've seen this inheritence level,
				// initialize its track structure.
				if (!track[inherits]) {
					track[inherits] = this._init_sort_track();
				}

				// Start inspecting the trigger's contents.
				if (trig.indexOf("_") > -1) {
					// Alphabetic wildcard included.
					var cnt = this._word_count(trig);
					this.say("Has a _ wildcard with " + cnt + " words.");
					if (cnt > 1) {
						if (!track[inherits]['alpha'][cnt]) {
							track[inherits]['alpha'][cnt] = [];
						}
						track[inherits]['alpha'][cnt].push(trig);
					} else {
						track[inherits]['under'].push(trig);
					}
				}
				else if (trig.indexOf("#") > -1) {
					// Numeric wildcard included.
					var cnt = this._word_count(trig);
					this.say("Has a # wildcard with " + cnt + " words.");
					if (cnt > 1) {
						if (!track[inherits]['number'][cnt]) {
							track[inherits]['number'][cnt] = [];
						}
						track[inherits]['number'][cnt].push(trig);
					} else {
						track[inherits]['pound'].push(trig);
					}
				}
				else if (trig.indexOf("*") > -1) {
					// Wildcard included.
					var cnt = this._word_count(trig);
					this.say("Has a * wildcard with " + cnt + " words.");
					if (cnt > 1) {
						if (!track[inherits]['wild'][cnt]) {
							track[inherits]['wild'][cnt] = [];
						}
						track[inherits]['wild'][cnt].push(trig);
					} else {
						track[inherits]['star'].push(trig);
					}
				}
				else if (trig.indexOf("[") > -1) {
					// Optionals included.
					var cnt = this._word_count(trig);
					this.say("Has optionals with " + cnt + " words.");
					if (!track[inherits]['option'][cnt]) {
						track[inherits]['option'][cnt] = [];
					}
					track[inherits]['option'][cnt].push(trig);
				}
				else {
					// Totally atomic.
					var cnt = this._word_count(trig);
					this.say("Totally atomic trigger and " + cnt + " words.");
					if (!track[inherits]['atomic'][cnt]) {
						track[inherits]['atomic'][cnt] = [];
					}
					track[inherits]['atomic'][cnt].push(trig);
				}
			}

			// Move the no-{inherits} triggers to the bottom of the stack.
			track[ (highest_inherits + 1) ] = track['-1'];
			delete track['-1'];

			// Add this group to the sort list.
			var track_sorted = Object.keys(track).sort(function(a,b) { return a-b });
			for (var j = 0, jend = track_sorted.length; j < jend; j++) {
				var ip = track_sorted[j];
				this.say("ip=" + ip);

				var kinds = ["atomic", "option", "alpha", "number", "wild"];
				for (var k = 0, kend = kinds.length; k < kend; k++) {
					var kind = kinds[k];
					var kind_sorted = Object.keys(track[ip][kind], function(a,b) { return b-a });
					for (var l = 0, lend = kind_sorted.length; l < lend; l++) {
						var item = kind_sorted[l];
						running.push.apply(running, track[ip][kind][item]);
					}
				}

				var under_sorted = track[ip]['under'].sort( function(a,b) { return b.length - a.length });
				var pound_sorted = track[ip]['pound'].sort( function(a,b) { return b.length - a.length });
				var star_sorted  = track[ip]['star'].sort( function(a,b) { return b.length - a.length });

				running.push.apply(running, under_sorted);
				running.push.apply(running, pound_sorted);
				running.push.apply(running, star_sorted);
			}
		}

		return running;
	};

	// Sort a simple list by number of words and length.
	RiveScript.prototype._sort_list = function (name, items) {
		// Initialize the sort buffer.
		if (!this._sorted["lists"]) {
			this._sorted["lists"] = {};
		}
		this._sorted["lists"][name] = [];

		// Track by number of words.
		var track = {};

		// Loop through each item.
		for (var i = 0, end = items.length; i < end; i++) {
			// Count the words.
			var cnt = this._word_count(items[i], true);
			if (!track[cnt]) {
				track[cnt] = [];
			}
			track[cnt].push(items[i]);
		}

		// Sort them.
		var output = [];
		var sorted = Object.keys(track).sort(function(a,b) { return b-a });
		for (var i = 0, end = sorted.length; i < end; i++) {
			var count = sorted[i];
			var bylen = track[count].sort(function(a,b) { return b.length - a.length });
			output.push.apply(output, bylen);
		}

		this._sorted["lists"][name] = output;
	};

	// Returns a new hash for keeping track of triggers for sorting.
	RiveScript.prototype._init_sort_track = function () {
		return {
			'atomic': {}, // Sort by number of whole words
			'option': {}, // Sort optionals by number of words
			'alpha':  {}, // Sort alpha wildcards by no. of words
			'number': {}, // Sort number wildcards by no. of words
			'wild':   {}, // Sort wildcards by no. of words
			'pound':  [], // Triggers of just #
			'under':  [], // Triggers of just _
			'star':   []  // Triggers of just *
		};
	};

	////////////////////////////////////////////////////////////////////////////
	// Public Configuration Methods                                           //
	////////////////////////////////////////////////////////////////////////////

	RiveScript.prototype.setHandler = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.setSubroutine = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.setGlobal = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.setVariable = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.setSubstitution = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.setPerson = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.setUservar = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.getUservar = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.getUservars = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.clearUservars = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.freezeUservars = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.thawUservars = function () {
		self.warn("Not Implemented"); // TODO
	};

	RiveScript.prototype.lastMatch = function () {
		self.warn("Not Implemented"); // TODO
	};

	////////////////////////////////////////////////////////////////////////////
	// Reply Fetching Methods                                                 //
	////////////////////////////////////////////////////////////////////////////

	RiveScript.prototype.reply = function (user, msg) {
		return "Not implemented!";
	};

	////////////////////////////////////////////////////////////////////////////
	// Topic Inheritence Utility Methods                                      //
	////////////////////////////////////////////////////////////////////////////

	RiveScript.prototype._topic_triggers = function (topic, triglvl, depth, inheritence, inherited) {
		// Initialize default values.
		if (depth == undefined) {
			depth = 0;
		}
		if (inheritence == undefined) {
			inheritence = 0;
		}
		if (inherited == undefined) {
			inherited = 0;
		}

		// Break if we're in too deep.
		if (depth > this._depth) {
			this.warn("Deep recursion while scanning topic inheritence!");
			return;
		}

		// Important info about the depth vs inheritence params to this function:
		// depth increments by 1 each time this function recursively calls itself.
		// inheritence increments by 1 only when this topic inherits another
		// topic.
		//
		// This way, '> topic alpha includes beta inherits gamma' will have this
		// effect:
		//  alpha and beta's triggers are combined together into one matching
		//  pool, and then those triggers have higher priority than gamma's.
		//
		// The inherited option is true if this is a recursive call, from a topic
		// that inherits other topics. This forces the {inherits} tag to be added
		// to the triggers. This only applies when the top topic 'includes'
		// another topic.
		this.say("Collecting trigger list for topic " + topic + " (depth="
			+ depth + "; inheritence=" + inheritence + "; inherited=" + inherited
			+ ")");

		// topic:   the name of the topic
		// triglvl: reference to this._topics or this._thats
		// depth:   starts at 0 and ++'s with each recursion.

		// Collect an array of triggers to return.
		var triggers = [];

		// Get those that exist in this topic directly.
		var inThisTopic = [];
		if (triglvl[topic]) {
			for (var trigger in triglvl[topic]) {
				inThisTopic.push(trigger);
			}
		}

		// Does this topic include others?
		if (this._includes[topic]) {
			// Check every included topic.
			for (var includes in this._includes[topic]) {
				this.say("Topic " + topic + " includes " + includes);
				triggers.push.apply(triggers, this._topic_triggers(includes, triglvl, (depth + 1), (inheritence + 1), true));
			}
		}

		// Does this topic inherit others?
		if (this._lineage[topic]) {
			// Check every inherited topic.
			for (var inherits in this._lineage[topic]) {
				this.say("Topic " + topic + " inherits " + inherits);
				triggers.push.apply(triggers, this._topic_triggers(inherits, triglvl, (depth + 1), (inheritence + 1), false));
			}
		}

		// Collect the triggers for *this* topic. If this topic inherits any other
		// topics, it means that this topic's triggers have higher priority than
		// those in any inherited topics. Enforce this with an {inherits} tag.
		if (this._lineage[topic] || inherited) {
			for (var i = 0, end = inThisTopic.length; i < end; i++) {
				var trigger = inThisTopic[i];
				this.say("Prefixing trigger with {inherits=" + inheritence + "}" + trigger);
				triggers.push.apply(triggers, ["{inherits=" + inheritence + "}" + trigger]);
			}
		} else {
			triggers.push.apply(triggers, inThisTopic);
		}

		return triggers;
	};

	////////////////////////////////////////////////////////////////////////////
	// Misc Utility Methods                                                   //
	////////////////////////////////////////////////////////////////////////////

	// Strip whitespace from a string.
	RiveScript.prototype._strip = function (text) {
		text = text.replace(/^[\s\t]+/i, "");
		text = text.replace(/[\s\t]+$/i, "");
		text = text.replace(/[\x0D\x0A]+/i, "");
		return text;
	};

	// Count real words in a string.
	RiveScript.prototype._word_count = function (trigger, all) {
		var words = [];
		if (all) {
			words = trigger.split(/\s+/);
		} else {
			words = trigger.split(/[\s\*\#\_]+/);
		}

		var wc = 0;
		for (var i = 0, end = words.length; i < end; i++) {
			if (words[i].length > 0) {
				wc++;
			}
		}

		return wc;
	};
	
	publish(RiveScript);
})((typeof(module) == "undefined" && (typeof(window) != "undefined" && this == window))
	? function(a) { this["RiveScript"] = a; }
	: function(a) { module.exports     = a; });
