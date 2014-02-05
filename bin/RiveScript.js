(function(publish) {
	// JavaScript Object Handler Method
	/**
	 * JsRiveObjects (RiveScript master)
	 *
	 * A default Object handler that can deal with JavaScript code.
	 */
	function JsRiveObjects (master) {
		this._master  = master;
		this._objects = {}; // Cache of objects.
	};

	/**
	 * void load (string name, string[] code)
	 *
	 * Called by the RiveScript object to load JavaScript code.
	 */
	JsRiveObjects.prototype.load = function (name, code) {
		// We need to make a dynamic JavaScript function.
		var source = "this._objects[\"" + name + "\"] = function (rs, args) {\n"
			+ code.join("\n")
			+ "}\n";

		try {
			eval(source);
		} catch (e) {
			this._master.warn("Error evaluating JavaScript object: " + e.message);
		}
	};

	/**
	 * string call (RiveScript rs, string name, string[] fields)
	 *
	 * Called by the RiveScript object to execute JavaScript code.
	 */
	JsRiveObjects.prototype.call = function (rs, name, fields, scope) {
		// Call the dynamic method.
		var func = this._objects[name];
		var reply = "";
		try {
			reply = func.call(scope, rs, fields);
		} catch (e) {
			reply = "[ERR: Error when executing JavaScript object]";
		}

		// Allow undefined responses.
		if (reply == undefined) {
			reply = "";
		}

		return reply;
	};

	////////////////////////////////////////////////////////////////////////////
	// Constructor and Debug Methods                                          //
	////////////////////////////////////////////////////////////////////////////
	
	// Constants.
	var VERSION    = "1.03";
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
		this._node    = {}; // NodeJS objects
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

		// "Current transaction" variables.
		this._current_user = undefined; // Current user ID

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

		// Set the default JavaScript language handler.
		this._handlers["javascript"] = new JsRiveObjects(this);

		this.say("RiveScript Interpreter v" + VERSION + " Initialized.");
		this.say("Runtime Environment: " + this._runtime);
	}

	/**
	 * float version ()
	 *
	 * Return the version number of the RiveScript.js library.
	 */
	RiveScript.prototype.version = function () {
		return VERSION;
	}

	/**
	 * private void runtime ()
	 *
	 * Detect the runtime environment of this module, to determine if we're
	 * running in a web browser or from NodeJS for example.
	 **/
	RiveScript.prototype.runtime = function () {
		// Make sure we have access to Object.keys().
		if (!Object.keys) {
			this._shim_keys();
		}

		// In Node, there is no window, and module is a thing.
		if (typeof(window) == "undefined" && typeof(module) == "object") {
			this._node["fs"] = require("fs");
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
			$(this._div).append("<div>[RS] " + this._escape_html(message) + "</div>");
		} else if (console && console.log) {
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
				+ this._escape_html(message) + "</div>");
		} else if (console) {
			// The console seems to exist.
			if (console.error) {
				console.error(message);
			} else if (console.log) {
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
	 * int loadFile (string path || array path[, on_success[, on_error]])
	 *
	 * Load a RiveScript document from a file. The path can either be a string
	 * that contains the path to a single file, or an array of paths to load
	 * multiple files. on_success is a function to be called when the file(s)
	 * have been successfully loaded. on_error is for catching any errors, such
	 * as syntax errors.
	 *
	 * This loading method is asyncronous. You should define an on_success
	 * handler to be called when the file(s) have been successfully loaded.
	 *
	 * This method returns the "batch number" for this load attempt. The first
	 * call to this function will have a batch number of 0 and that will go
	 * up from there. This batch number is passed to your on_success handler
	 * as its only argument, in case you want to correlate it with your call
	 * to loadFile.
	 *
	 * on_success receives: int batch_count
	 * on_error receives: string error_message
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
			} else if (this._runtime == "node") {
				// With Node FS!
				this._node_load_file(loadcount, file, on_success, on_error);
			}
		}

		return loadcount;
	};

	// Load a file using ajax. DO NOT CALL THIS DIRECTLY.
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
						on_success.call(undefined,loadcount);
					}
				}
			},
			error: function(xhr, textStatus, errorThrown) {
				RS.say("Error! " + textStatus + "; " + errorThrown);
				if (typeof(on_error) == "function") {
					on_error.call(undefined,loadcount,textStatus);
				}
			},
		});
	};

	// Load a file using Node FS. DO NOT CALL THIS DIRECTLY.
	RiveScript.prototype._node_load_file = function (loadcount, file, on_success, on_error) {
		// A pointer to ourself.
		var RS = this;

		// Load the file.
		this._node.fs.readFile(file, function (err, data) {
			if (err) {
				if (typeof(on_error) == "function") {
					on_error.call(undefined,loadcount,err);
				} else {
					RS.warn(err);
				}
				return;
			}

			// Parse it!
			RS.parse(file, ""+data, on_error);

			// Log that we've received this file.
			delete RS._pending[loadcount][file];

			// All gone?
			if (Object.keys(RS._pending[loadcount]).length == 0) {
				if (typeof(on_success) == "function") {
					on_success.call(undefined,loadcount);
				}
			}
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
	RiveScript.prototype.loadDirectory = function (path, on_success, on_error) {
		// This can't be done on the web.
		if (this._runtime === "web") {
			this.warn("loadDirectory can't be used on the web!");
			return;
		}

		var loadcount = this._loadcount++;
		this._pending[loadcount] = {};

		var RS = this;
		this._node.fs.readdir(path, function(err, files) {
			if (err) {
				if (typeof(on_error) == "function") {
					on_error.call(undefined,err);
				} else {
					RS.warn(error);
				}
				return;
			}

			var to_load = [];
			for (var i = 0, iend = files.length; i < iend; i++) {
				if (files[i].match(/\.(rive|rs)$/i)) {
					// Keep track of the file's status.
					RS._pending[loadcount][path+"/"+files[i]] = 1;
					to_load.push(path + "/" + files[i]);
				}
			}

			for (var i = 0, iend = to_load.length; i < iend; i++) {
				var file = to_load[i];

				// Load it.
				RS._node_load_file(loadcount, to_load[i], on_success, on_error);
			}
		});
	};

	/**
	 * bool stream (string code[, func on_error])
	 *
	 * Stream in RiveScript code dynamically. 'code' should be the raw
	 * RiveScript source code as a string (with line breaks after each line).
	 *
	 * This function is synchronous, meaning there is no success handler
	 * needed. It will return false on parsing error, true otherwise.
	 *
	 * on_error receives: string error_message
	 */
	RiveScript.prototype.stream = function (code, on_error) {
		this.say("Streaming code.");
		return this.parse("stream()", code, on_error);
	};

	/**
	 * private bool parse (string name, string code[, func on_error])
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
						// Call the object's handler.
						if (this._handlers[objlang]) {
							this._objlangs[objname] = objlang;
							this._handlers[objlang].load(objname, objbuf);
						} else {
							this.warn("Object creation failed: no handler for " + objlang, fname, lineno);
						}
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
				line = this._strip(line.split(" // ")[0]);
			}

			// Run a syntax check on this line.
			var syntax_error = this.checkSyntax(cmd, line);
			if (syntax_error != "") {
				if (this._strict && typeof(on_error) == "function") {
					on_error.call(null,"Syntax error: " + syntax_error
						+ " at " + fname + " line " + lineno
						+ ", near " + cmd + " " + line);
					return false;
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
							return false;
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

		return true;
	};

	/**
	 * string checkSyntax (char command, string line)
	 *
	 * Check the syntax of a RiveScript command. 'command' is the single
	 * character command symbol, and 'line' is the rest of the line after
	 * the command.
	 *
	 * Returns an empty string on success, or a description of the error
	 * on error.
	 */
	RiveScript.prototype.checkSyntax = function (cmd, line) {
		// Run syntax tests based on the command used.
		if (cmd == '!') {
			// ! Definition
			// - Must be formatted like this:
			//   ! type name = value
			//   OR
			//   ! type = value
			var match = line.match(/^.+(?:\s+.+|)\s*=\s*.+?$/);
			if (!match) {
				return "Invalid format for !Definition line: must be '! type name = value' OR '! type = value'";
			}
		} else if (cmd == '>') {
			// > Label
			// - The "begin" label must have only one argument ("begin")
			// - The "topic" label must be lowercased but can inherit other topics (a-z0-9_\s)
			// - The "object" label must follow the same rules as "topic", but don't need to be lowercase.
			var parts = line.split(/\s+/);
			if (parts[0] == "begin" && parts.length > 1) {
				return "The 'begin' label takes no additional arguments.";
			} else if (parts[0] == "topic") {
				var match = line.match(/[^a-z0-9_\-\s]/);
				if (match) {
					return "Topics should be lowercased and contain only letters and numbers.";
				}
			} else if (parts[0] == "object") {
				var match = line.match(/[^A-Za-z0-9\_\-\s]/);
				if (match) {
					return "Objects can only contain numbers and letters.";
				}
			}
		} else if (cmd == '+' || cmd == '%' || cmd == '@') {
			// + Trigger, % Previous, @ Redirect
			// This one is strict. The triggers are to be run through the regexp engine,
			// therefore it should be acceptable for the regexp engine.
			// - Entirely lowercase
			// - No symbols except: ( | ) [ ] * _ # @ { } < > =
			// - All brackets should be matched.
			var parens = square = curly = angle = 0; // Count the brackets

			// Look for obvious errors first.
			if (line.match(/[^a-z0-9(|)\[\]*_#@{}<>=\s]/)) {
				return "Triggers may only contain lowercase letters, numbers, and these symbols: ( | ) [ ] * _ # @ { } < > =";
			}

			// Count brackets.
			var chars = line.split("");
			for (var i = 0, end = chars.length; i < end; i++) {
				switch (chars[i]) {
					case '(':
						parens++;
						continue;
					case ')':
						parens--;
						continue;
					case '[':
						square++;
						continue;
					case ']':
						square--;
						continue;
					case '{':
						curly++;
						continue;
					case '}':
						curly--;
						continue;
					case '<':
						angle++;
						continue;
					case '>':
						angle--;
						continue;
				}
			}

			// Any mismatches?
			if (parens != 0) {
				return "Unmatched parenthesis brackets.";
			} else if (square != 0) {
				return "Unmatched square brackets.";
			} else if (curly != 0) {
				return "Unmatched curly brackets.";
			} else if (angle != 0) {
				return "Unmatched angle brackets.";
			}
		} else if (cmd == '*') {
			// * Condition
			// Syntax for a conditional is as follows:
			// * value symbol value => response
			var match = line.match(/^.+?\s*(?:==|eq|!=|ne|<>|<|<=|>|>=)\s*.+?=>.+?$/);
			if (!match) {
				return "Invalid format for !Condition: should be like '* value symbol value => response'";
			}
		}

		// No problems!
		return "";
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
					trig = trig.replace(/\{inherits=\d+\}/ig, "");
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
					var kind_sorted = Object.keys(track[ip][kind]).sort(function(a,b) { return b-a });
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

	/**
	 * void setHandler (string lang, object)
	 *
	 * Set a custom language handler for RiveScript objects. See the source for
	 * the built-in JavaScript handler as an example.
	 *
	 * @param lang: The lowercased name of the programming language, e.g. perl, python
	 * @param obj:  A JavaScript object that has functions named "load" and "call".
	 *              Use the undefined value to delete a language handler.
	 */
	RiveScript.prototype.setHandler = function (lang, obj) {
		if (obj == undefined) {
			delete this._handlers[lang];
		} else {
			this._handlers[lang] = obj;
		}
	};

	/**
	 * void setSubroutine (string name, function)
	 *
	 * Define a JavaScript object from your program.
	 *
	 * This is equivalent to having a JS object defined in the RiveScript code, except
	 * your JavaScript code is defining it instead.
	 */
	RiveScript.prototype.setSubroutine = function (name, code) {
		// Do we have a JS handler?
		if (this._handlers["javascript"]) {
			this._handlers["javascript"]._objects[name] = code;
		} else {
			this.warn("Can't setSubroutine: no JavaScript object handler is loaded!");
		}
	};

	/**
	 * void setGlobal (string name, string value)
	 *
	 * Set a global variable. This is equivalent to '! global' in RiveScript.
	 * Set the value to undefined to delete a global.
	 */
	RiveScript.prototype.setGlobal = function (name, value) {
		if (value == undefined) {
			delete this._gvars[name];
		} else {
			this._gvars[name] = value;
		}
	};

	/**
	 * void setVariable (string name, string value)
	 *
	 * Set a bot variable. This is equivalent to '! var' in RiveScript.
	 * Set the value to undefined to delete a variable.
	 */
	RiveScript.prototype.setVariable = function (name, value) {
		if (value == undefined) {
			delete this._bvars[name];
		} else {
			this._bvars[name] = value;
		}
	};

	/**
	 * void setSubstitution (string name, string value)
	 *
	 * Set a substitution. This is equivalent to '! sub' in RiveScript.
	 * Set the value to undefined to delete a substitution.
	 */
	RiveScript.prototype.setSubstitution = function (name, value) {
		if (value == undefined) {
			delete this._subs[name];
		} else {
			this._subs[name] = value;
		}
	};

	/**
	 * void setPerson (string name, string value)
	 *
	 * Set a person substitution. This is equivalent to '! person' in RiveScript.
	 * Set the value to undefined to delete a substitution.
	 */
	RiveScript.prototype.setPerson = function (name, value) {
		if (value == undefined) {
			delete this._person[name];
		} else {
			this._person[name] = value;
		}
	};

	/**
	 * void setUservar (string user, string name, string value)
	 *
	 * Set a user variable for a user.
	 */
	RiveScript.prototype.setUservar = function (user, name, value) {
		// Initialize the user?
		if (!this._users[user]) {
			this._users[user] = { "topic": "random" };
		}

		if (value == undefined) {
			delete this._users[user][name];
		} else {
			this._users[user][name] = value;
		}
	};

	/**
	 * string getUservar (string user, string name)
	 *
	 * Get a variable from a user. Returns the string "undefined" if it isn't
	 * defined.
	 */
	RiveScript.prototype.getUservar = function (user, name) {
		// No user?
		if (!this._users[user]) {
			return "undefined";
		}

		// The var exists?
		if (this._users[user][name]) {
			return this._users[user][name];
		} else {
			return "undefined";
		}
	};

	/**
	 * data getUservars ([string user])
	 *
	 * Get all variables about a user. If no user is provided, returns all
	 * data about all users.
	 */
	RiveScript.prototype.getUservars = function (user) {
		if (user == undefined) {
			// All the users! Return a cloned object to break refs.
			return this._clone(this._users);
		} else {
			// Exists?
			if (this._users[user]) {
				return this._clone(this._users[user]);
			} else {
				return undefined;
			}
		}
	};

	/**
	 * void clearUservars ([string user])
	 *
	 * Clear all a user's variables. If no user is provided, clears all variables
	 * for all users.
	 */
	RiveScript.prototype.clearUservars = function (user) {
		if (user == undefined) {
			// All the users!
			this._users = {};
		} else {
			delete this._users[user];
		}
	};

	/**
	 * void freezeUservars (string user)
	 *
	 * Freeze the variable state of a user. This will clone and preserve the user's
	 * entire variable state, so that it can be restored later with thawUservars().
	 */
	RiveScript.prototype.freezeUservars = function (user) {
		if (this._users[user]) {
			// Freeze them.
			this._freeze[user] = this._clone(this._users[user]);
		} else {
			this.warn("Can't freeze vars for user " + user + ": not found!");
		}
	};

	/**
	 * void thawUservars (string user[, string action])
	 *
	 * Thaws a user's frozen variables. The action can be one of the following:
	 * - discard: Don't restore the variables, just delete the frozen copy.
	 * - keep:    Keep the frozen copy after restoring.
	 * - thaw:    Restore the variables and delete the frozen copy (default)
	 */
	RiveScript.prototype.thawUservars = function (user, action) {
		if (typeof(action) != "string") {
			action = "thaw";
		}

		// Frozen?
		if (!this._freeze[user]) {
			this.warn("Can't thaw user vars: " + user + " not found!");
			return;
		}

		// What are we doing?
		if (action == "thaw") {
			// Thawing them out.
			this.clearUservars(user);
			this._users[user] = this._clone(this._freeze[user]);
			delete this._freeze[user];
		} else if (action == "discard") {
			// Just throw it away.
			delete this._freeze[user];
		} else if (action == "keep") {
			// Copy them back, but keep them.
			this.clearUservars(user);
			this._users[user] = this._clone(this._freeze[user]);
		} else {
			this.warn("Unsupported thaw action");
		}
	};

	/**
	 * void lastMatch (string user)
	 *
	 * Retrieve the trigger that the user matched most recently.
	 */
	RiveScript.prototype.lastMatch = function (user) {
		if (this._users[user]) {
			return this._users[user]["__lastmatch__"];
		}
		return undefined;
	};

	/**
	 * string currentUser ()
	 *
	 * Retrieve the current user's ID. This is most useful within a JavaScript
	 * object macro to get the ID of the user who invoked the macro (e.g. to
	 * get/set user variables for them).
	 *
	 * This will return undefined if called from outside of a reply context
	 * (the value is unset at the end of the reply() method).
	 */
	RiveScript.prototype.currentUser = function () {
		if (this._current_user == undefined) {
			this.warn("currentUser() is intended to be called from within a JS object macro!");
		}
		return this._current_user;
	};

	////////////////////////////////////////////////////////////////////////////
	// Reply Fetching Methods                                                 //
	////////////////////////////////////////////////////////////////////////////

	/**
	 * string reply (string username, string message)
	 *
	 * Fetch a reply from the RiveScript brain. The message doesn't require any
	 * special pre-processing to be done to it, i.e. it's allowed to contain
	 * punctuation and weird symbols. The username is arbitrary and is used to
	 * uniquely identify the user, in the case that you may have multiple
	 * distinct users chatting with your bot.
	 */
	RiveScript.prototype.reply = function (user, msg, scope) {
		this.say("Asked to reply to [" + user + "] " + msg);

		// Store the current user's ID.
		this._current_user = user;

		// Format their message.
		msg = this._format_message(msg);

		var reply = '';

		// If the BEGIN block exists, consult it first.
		if (this._topics["__begin__"]) {
			var begin = this._getreply(user, "request", "begin", 0, scope);

			// Okay to continue?
			if (begin.indexOf("{ok}") > -1) {
				reply = this._getreply(user, msg, "normal", 0, scope);
				begin = begin.replace(/\{ok\}/g, reply);
			}

			reply = begin;
			reply = this._process_tags(user, msg, reply, [], [], 0, scope);
		} else {
			reply = this._getreply(user, msg, "normal", 0, scope);
		}

		// Save their reply history.
		this._users[user]["__history__"]["input"].pop();
		this._users[user]["__history__"]["input"].unshift(msg);
		this._users[user]["__history__"]["reply"].pop();
		this._users[user]["__history__"]["reply"].unshift(reply);

		// Unset the current user's ID.
		this._current_user = undefined;

		return reply;
	};

	// Format a user's message for safe processing.
	RiveScript.prototype._format_message = function (msg) {
		// Lowercase it.
		msg = "" + msg;
		msg = msg.toLowerCase();

		// Run substitutions and sanitize what's left.
		msg = this._substitute(msg, "subs");
		msg = this._strip_nasties(msg);

		return msg;
	};

	// The internal reply method. DO NOT CALL THIS DIRECTLY.
	RiveScript.prototype._getreply = function (user, msg, context, step, scope) {
		// Need to sort replies?
		if (!this._sorted["topics"]) {
			this.warn("You forgot to call sortReplies()!");
			return "ERR: Replies Not Sorted";
		}

		// Initialize the user's profile?
		if (!this._users[user]) {
			this._users[user] = {'topic': 'random'};
		}

		// Collect data on this user.
		var topic     = this._users[user]['topic'];
		var stars     = [];
		var thatstars = []; // For %Previous
		var reply     = '';

		// Avoid letting them fall into a missing topic.
		if (!this._topics[topic]) {
			this.warn("User " + user + " was in an empty topic named '" + topic + "'");
			topic = this._users[user]['topic'] = 'random';
		}

		// Avoid deep recursion.
		if (step > this._depth) {
			return "ERR: Deep Recursion Detected";
		}

		// Are we in the BEGIN block?
		if (context == "begin") {
			topic = "__begin__";
		}

		// Initialize this user's history.
		if (!this._users[user]['__history__']) {
			this._users[user]['__history__'] = {
				'input': [
					'undefined', 'undefined', 'undefined', 'undefined',
					'undefined', 'undefined', 'undefined', 'undefined',
					'undefined', 'undefined'
				],
				'reply': [
					'undefined', 'undefined', 'undefined', 'undefined',
					'undefined', 'undefined', 'undefined', 'undefined',
					'undefined', 'undefined'
				],
			};
		}

		// More topic sanity checking.
		if (!this._topics[topic]) {
			// This was handled before, which would mean topic=random and it
			// doesn't exist. Serious issue!
			return "ERR: No default topic 'random' was found!";
		}

		// Create a pointer for the matched data when we find it.
		var matched        = null;
		var matchedTrigger = null;
		var foundMatch     = false;

		// See if there were any %Previous's in this topic, or any topic related
		// to it. This should only be done the first time -- not during a recursive
		// redirection. This is because in a redirection, "lastreply" is still gonna
		// be the same as it was the first time, resulting in an infinite loop!
		if (step == 0) {
			var allTopics = [ topic ];
			if (this._includes[topic] || this._lineage[topic]) {
				// Get ALL the topics!
				allTopics = this._get_topic_tree(topic);
			}

			// Scan them all.
			for (var i = 0, iend = allTopics.length; i < iend; i++) {
				var top = allTopics[i];
				this.say("Checking topic " + top + " for any %Previous's.");

				if (this._sorted["thats"][top]) {
					// There's one here!
					this.say("There's a %Previous in this topic!");

					// Do we have history yet?
					var lastReply = this._users[user]["__history__"]["reply"][0];

					// Format the bot's last reply the same way as the human's.
					lastReply = this._format_message(lastReply);
					this.say("Last reply: " + lastReply);

					// See if it's a match.
					for (var j = 0, jend = this._sorted["thats"][top].length; j < jend; j++) {
						var trig = this._sorted["thats"][top][j];
						var botside = this._reply_regexp(user, trig);
						this.say("Try to match lastReply (" + lastReply + ") to " + botside);

						// Match?
						var match = lastReply.match(new RegExp('^' + botside + '$'));
						if (match) {
							// Huzzah! See if OUR message is right too.
							this.say("Bot side matched!");
							thatstars = []; // Collect the bot stars in case we need them.
							for (var k = 1, kend = match.length; k < kend; k++) {
								thatstars.push(match[k]);
							}

							// Compare the triggers to the user's message.
							for (var k = 0, kend = this._sorted["that_trig"][top][trig].length; k < kend; k++) {
								var subtrig = this._sorted["that_trig"][top][trig][k];
								var humanside = this._reply_regexp(user, subtrig);
								this.say("Now try to match " + msg + " to " + humanside);

								match = msg.match(new RegExp("^" + humanside + "$"));
								if (match) {
									this.say("Found a match!");
									matched        = this._thats[top][trig][subtrig];
									matchedTrigger = subtrig;
									foundMatch     = true;

									// Collect the stars.
									stars = [];
									if (match.length > 1) {
										for (var j = 1, jend = match.length; j < jend; j++) {
											stars.push(match[j]);
										}
									}
									break;
								}
							}
						}

						// Stop if we found a match.
						if (foundMatch) {
							break;
						}
					}
				}

				// Stop if we found a match.
				if (foundMatch) {
					break;
				}
			}
		}

		// Search their topic for a match to their trigger.
		if (!foundMatch) {
			this.say("Searching their topic for a match...");
			for (var i = 0, iend = this._sorted["topics"][topic].length; i < iend; i++) {
				var trig   = this._sorted["topics"][topic][i];
				var regexp = this._reply_regexp(user, trig);
				this.say("Try to match \"" + msg + "\" against " + trig + " (" + regexp + ")");

				// If the trigger is atomic, we don't need to bother with the regexp engine.
				var isAtomic = this._is_atomic(trig);
				var isMatch = false;
				if (isAtomic) {
					if (msg == regexp) {
						isMatch = true;
					}
				} else {
					// Non-atomic triggers always need the regexp.
					var match = msg.match(new RegExp('^' + regexp + '$'));
					if (match) {
						// The regexp matched!
						isMatch = true;

						// Collect the stars.
						stars = [];
						if (match.length > 1) {
							for (var j = 1, jend = match.length; j < jend; j++) {
								stars.push(match[j]);
							}
						}
					}
				}

				// A match somehow?
				if (isMatch) {
					this.say("Found a match!");
					
					// We found a match, but what if the trigger we've matched
					// doesn't belong to our topic? Find it!
					if (!this._topics[topic][trig]) {
						// We have to find it.
						matched = this._find_trigger_by_inheritence(topic, trig, 0);
					} else {
						matched = this._topics[topic][trig];
					}

					foundMatch = true;
					matchedTrigger = trig;
					break;
				}
			}
		}

		// Store what trigger they matched on. If their matched trigger is undefined,
		// this will be too, which is great.
		this._users[user]["__lastmatch__"] = matchedTrigger;

		// Did we match?
		if (matched) {
			for (var nil = 0; nil < 1; nil++) {
				// See if there are any hard redirects.
				if (matched["redirect"]) {
					this.say("Redirecting us to '" + matched["redirect"] + "'");
					var redirect = this._process_tags(user, msg, matched["redirect"], stars, thatstars, step, scope);
					this.say("Pretend user said: " + redirect);
					reply = this._getreply(user, redirect, context, (step+1), scope);
					break;
				}

				// Check the conditionals.
				for (var i = 0; matched["condition"][i]; i++) {
					var halves = matched["condition"][i].split(/\s*=>\s*/);
					if (halves && halves.length == 2) {
						var condition = halves[0].match(/^(.+?)\s+(==|eq|!=|ne|<>|<|<=|>|>=)\s+(.+?)$/);
						if (condition) {
							var left     = this._strip(condition[1]);
							var eq       = condition[2];
							var right    = this._strip(condition[3]);
							var potreply = this._strip(halves[1]);

							// Process tags all around.
							left  = this._process_tags(user, msg, left, stars, thatstars, step, scope);
							right = this._process_tags(user, msg, right, stars, thatstars, step, scope);

							// Defaults?
							if (left.length == 0) {
								left = "undefined";
							}
							if (right.length == 0) {
								right = "undefined";
							}

							this.say("Check if " + left + " " + eq + " " + right);

							// Validate it.
							var passed = false;
							if (eq == "eq" || eq == "==") {
								if (left == right) {
									passed = true;
								}
							} else if (eq == "ne" || eq == "!=" || eq == "<>") {
								if (left != right) {
									passed = true;
								}
							} else {
								// Dealing with numbers here.
								try {
									left  = parseInt(left);
									right = parseInt(right);
									if (eq == "<") {
										if (left < right) {
											passed = true;
										}
									} else if (eq == "<=") {
										if (left <= right) {
											passed = true;
										}
									} else if (eq == ">") {
										if (left > right) {
											passed = true;
										}
									} else if (eq == ">=") {
										if (left >= right) {
											passed = true;
										}
									}
								} catch(e) {
									this.warn("Failed to evaluate numeric condition!");
								}
							}

							// OK?
							if (passed) {
								reply = potreply;
								break;
							}
						}
					}
				}

				// Have our reply yet?
				if (reply != undefined && reply.length > 0) {
					break;
				}

				// Process weights in the replies.
				var bucket = [];
				for (var rep_index in matched["reply"]) {
					var rep = matched["reply"][rep_index];
					var weight = 1;
					var match  = rep.match(/\{weight=(\\d+?)\}/i);
					if (match) {
						weight = match[1];
						if (weight <= 0) {
							this.warn("Can't have a weight <= 0!");
							weight = 1;
						}
					}

					for (var j = 0; j < weight; j++) {
						bucket.push(rep);
					}
				}

				// Get a random reply.
				var choice = parseInt(Math.random() * bucket.length);
				reply = bucket[choice];
				break;
			}
		}

		// Still no reply?
		if (!foundMatch) {
			reply = "ERR: No Reply Matched";
		} else if (reply == undefined || reply.length == 0) {
			reply = "ERR: No Reply Found";
		}

		this.say("Reply: " + reply);

		// Process tags for the BEGIN block.
		if (context == "begin") {
			// The BEGIN block can set {topic} and user vars.
			var giveup = 0;

			// Topic setter.
			var match = reply.match(/\{topic=(.+?)\}/i);
			while (match) {
				giveup++;
				if (giveup >= 50) {
					this.warn("Infinite loop looking for topic tag!");
					break;
				}
				var name = match[1];
				this._users[user]["topic"] = name;
				reply = reply.replace(new RegExp("{topic=" + this.quotemeta(name) + "}","ig"), "");
				match = reply.match(/\{topic=(.+?)\}/i); // Look for more
			}

			// Set user vars.
			match = reply.match(/<set (.+?)=(.+?)>/i);
			giveup = 0;
			while (match) {
				giveup++;
				if (giveup >= 50) {
					this.warn("Infinite loop looking for set tag!");
					break;
				}
				var name  = match[1];
				var value = match[2];
				this._users[user][name] = value;
			}
		} else {
			// Process more tags if not in BEGIN.
			reply = this._process_tags(user, msg, reply, stars, thatstars, step, scope);
		}

		return reply;
	};

	// Prepares a trigger for the regular expression engine.
	RiveScript.prototype._reply_regexp = function (user, regexp) {
		// If the trigger is simply '*' then the * needs to become (.*?)
		// to match the blank string too.
		regexp = regexp.replace(/^\*$/, "<zerowidthstar>");

		// Simple replacements.
		regexp = regexp.replace(/\*/g, "(.+?)");  // Convert * into (.+?)
		regexp = regexp.replace(/#/g,  "(\\d+?)"); // Convert # into (\d+?)
		regexp = regexp.replace(/_/g,  "([A-Za-z]+?)"); // Convert _ into (\w+?)
		regexp = regexp.replace(/\{weight=\d+\}/g, ""); // Remove {weight} tags
		regexp = regexp.replace(/<zerowidthstar>/g, "(.*?)");

		// Optionals.
		var match  = regexp.match(/\[(.+?)\]/);
		var giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop when trying to process optionals in trigger!");
				return "";
			}

			var parts = match[1].split("|");
			var opts  = [];
			for (var i = 0, iend = parts.length; i < iend; i++) {
				var p = "\\s*" + parts[i] + "\\s*";
				opts.push(p);
			}
			opts.push("\\s*");

			// If this optional had a star or anything in it, make it non-matching.
			var pipes = opts.join("|");
			pipes = pipes.replace(new RegExp(this.quotemeta("(.+?)"), "g"),        "(?:.+?)");
			pipes = pipes.replace(new RegExp(this.quotemeta("(\\d+?)"), "g"),      "(?:\\d+?)");
			pipes = pipes.replace(new RegExp(this.quotemeta("([A-Za-z]+?)"), "g"), "(?:[A-Za-z]+?)");

			regexp = regexp.replace(new RegExp("\\s*\\[" + this.quotemeta(match[1]) + "\\]\\s*"),
				"(?:" + pipes + ")");
			match  = regexp.match(/\[(.+?)\]/); // Circle of life!
		}

		// Filter in arrays.
		var giveup = 0;
		while (regexp.indexOf("@") > -1) {
			giveup++;
			if (giveup >= 50) {
				break;
			}

			var match = regexp.match(/\@(.+?)\b/);
			if (match) {
				var name = match[1];
				var rep  = '';
				if (this._arrays[name]) {
					rep = "(?:" + this._arrays[name].join("|") + ")";
				}
				regexp = regexp.replace(new RegExp("@" + this.quotemeta(name) + "\\b"), rep);
			}
		}

		// Filter in bot variables.
		giveup = 0;
		while (regexp.indexOf("<bot") > -1) {
			giveup++;
			if (giveup >= 50) {
				break;
			}

			var match = regexp.match(/<bot (.+?)>/i);
			if (match) {
				var name = match[1];
				var rep  = '';
				if (this._bvars[name]) {
					rep = this._strip_nasties(this._bvars[name]);
				}
				regexp = regexp.replace(new RegExp("<bot " + this.quotemeta(name) + ">"), rep);
			}
		}

		// Filter in user variables.
		var match = regexp.match(/<get (.+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for get tag!");
				break;
			}
			var name = match[1];
			var value = "undefined";
			if (this._users[user][name]) {
				value = this._users[user][name];
			}
			regexp = regexp.replace(new RegExp("<get " + this.quotemeta(name) + ">","ig"), value);
			match  = regexp.match(/<get (.+?)>/i); // Look for more
		}

		// Filter in <input> and <reply> tags.
		if (regexp.indexOf("<input") > -1 || regexp.indexOf("<reply") > -1) {
			var types = ["input", "reply"];
			for (var i = 0; i < 2; i++) {
				var type = types[i];
				for (var j = 1; j <= 9; j++) {
					if (regexp.indexOf("<" + type + j + ">")) {
						regexp = regexp.replace(new RegExp("<" + type + j + ">","g"),
							this._users[user]["__history__"][type][j]);
					}
				}
				regexp = regexp.replace(new RegExp("<" + type + ">","g"),
					this._users[user]["__history__"][type][0]);
			}
		}

		return regexp;
	};

	// Process tags in a reply element.
	RiveScript.prototype._process_tags = function (user, msg, reply, st, bst, step, scope) {
		// Prepare the stars and botstars.
		var stars = [""];
		stars.push.apply(stars, st);
		var botstars = [""];
		botstars.push.apply(botstars, bst);
		if (stars.length == 1) {
			stars.push("undefined");
		}
		if (botstars.length == 1) {
			botstars.push("undefined");
		}

		// For while loops.
		var match;
		var giveup = 0;

		// Tag shortcuts.
		reply = reply.replace(/<person>/ig,    "{person}<star>{/person}");
		reply = reply.replace(/<@>/ig,         "{@<star>}");
		reply = reply.replace(/<formal>/ig,    "{formal}<star>{/formal}");
		reply = reply.replace(/<sentence>/ig,  "{sentence}<star>{/sentence}");
		reply = reply.replace(/<uppercase>/ig, "{uppercase}<star>{/uppercase}");
		reply = reply.replace(/<lowercase>/ig, "{lowercase}<star>{/lowercase}");

		// Weight and star tags.
		reply = reply.replace(/\{weight=\d+\}/ig, ""); // Leftover {weight}s
		reply = reply.replace(/<star>/ig, stars[1]);
		reply = reply.replace(/<botstar>/ig, botstars[1]);
		for (var i = 1; i <= stars.length; i++) {
			reply = reply.replace(new RegExp("<star" + i + ">","ig"), stars[i]);
		}
		for (var i = 1; i <= botstars.length; i++) {
			reply = reply.replace(new RegExp("<botstar" + i + ">","ig"), botstars[i]);
		}

		// <input> and <reply>
		reply = reply.replace(/<input>/ig, this._users[user]["__history__"]["input"][0]);
		reply = reply.replace(/<reply>/ig, this._users[user]["__history__"]["reply"][0]);
		for (var i = 1; i <= 9; i++) {
			if (reply.indexOf("<input" + i + ">")) {
				reply = reply.replace(new RegExp("<input" + i + ">","ig"),
					this._users[user]["__history__"]["input"][i]);
			}
			if (reply.indexOf("<reply" + i + ">")) {
				reply = reply.replace(new RegExp("<reply" + i + ">","ig"),
					this._users[user]["__history__"]["reply"][i]);
			}
		}

		// <id> and escape codes
		reply = reply.replace(/<id>/ig, user);
		reply = reply.replace(/\\s/ig, " ");
		reply = reply.replace(/\\n/ig, "\n");
		reply = reply.replace(/\\#/ig, "#");

		// {random}
		match = reply.match(/\{random\}(.+?)\{\/random\}/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup > 50) {
				this.warn("Infinite loop looking for random tag!");
				break;
			}

			var random = [];
			var text   = match[1];
			if (text.indexOf("|") > -1) {
				random = text.split("|");
			} else {
				random = text.split(" ");
			}

			var output = random[
				parseInt(Math.random() * random.length)
			];

			reply = reply.replace(new RegExp("\\{random\\}" + this.quotemeta(text) + "\\{\\/random\\}", "ig"),
				output);
			match = reply.match(/\{random\}(.+?)\{\/random\}/i);
		}

		// Person Substitutions & String formatting.
		var formats = ["person", "formal", "sentence", "uppercase", "lowercase"];
		for (var i = 0; i < 5; i++) {
			var type = formats[i];
			match = reply.match(new RegExp("{" + type + "}(.+?){/" + type + "}", "i"));
			giveup = 0;
			while (match) {
				giveup++;
				if (giveup >= 50) {
					this.warn("Infinite loop looking for " + type + " tag!");
					break;
				}

				var content = match[1];
				var replace;
				if (type == "person") {
					replace = this._substitute(content, "person");
				} else {
					replace = this._string_format(type, content);
				}

				reply = reply.replace(new RegExp("{" + type + "}" + this.quotemeta(content) + "{/" + type + "}", "ig"), replace);
				match = reply.match(new RegExp("{" + type + "}(.+?){/" + type + "}", "i"));
			}
		}

		// Bot variables: set
		match = reply.match(/<bot ([^>]+?)=([^>]+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for bot set tag!");
				break;
			}

			var name  = match[1];
			var value = match[2];
			this._bvars[name] = value;

			reply = reply.replace(new RegExp("<bot " + this.quotemeta(name) + "=" + this.quotemeta(value) + ">","ig"),
				"");
			match = reply.match(/<bot ([^>]+?)=([^>]+?)>/i);
		}

		// Bot variables: get
		match = reply.match(/<bot ([^>]+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for bot tag!");
				break;
			}
			var name = match[1];
			var value = "undefined";
			if (this._bvars[name]) {
				value = this._bvars[name];
			}
			reply = reply.replace(new RegExp("<bot " + this.quotemeta(name) + ">", "ig"), value);
			match = reply.match(/<bot ([^>]+?)>/i); // Look for more
		}

		// Global variables: set
		match = reply.match(/<env ([^>]+?)=([^>]+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for env set tag!");
				break;
			}

			var name  = match[1];
			var value = match[2];
			this._gvars[name] = value;

			reply = reply.replace(new RegExp("<env " + this.quotemeta(name) + "=" + this.quotemeta(value) + ">","ig"),
				"");
			match = reply.match(/<env ([^>]+?)=([^>]+?)>/i);
		}

		// Global variables: get
		match = reply.match(/<env ([^>]+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for env tag!");
				break;
			}
			var name = match[1];
			var value = "undefined";
			if (this._gvars[name]) {
				value = this._gvars[name];
			}
			reply = reply.replace(new RegExp("<env " + this.quotemeta(name) + ">", "ig"), value);
			match = reply.match(/<env ([^>]+?)>/i); // Look for more
		}

		// Set user vars.
		match = reply.match(/<set ([^>]+?)=([^>]+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for set tag!");
				break;
			}
			var name  = match[1];
			var value = match[2];
			this._users[user][name] = value;
			reply = reply.replace(new RegExp("<set " + this.quotemeta(name) + "=" + this.quotemeta(value) + ">", "ig"), "");
			match = reply.match(/<set ([^>]+?)=([^>]+?)>/i); // Look for more
		}

		// Math tags.
		var math = ["add", "sub", "mult", "div"];
		for (var i = 0; i < 4; i++) {
			var oper = math[i];
			match  = reply.match(new RegExp("<" + oper + " ([^>]+?)=([^>]+?)>"));
			giveup = 0;
			while (match) {
				var name   = match[1];
				var value  = match[2];
				var newval = 0;
				var output = "";

				// Sanity check.
				value = parseInt(value);
				if (isNaN(value)) {
					output = "[ERR: Math can't '" + oper + "' non-numeric value '" + match[2] + "']";
				} else if (isNaN(parseInt(this._users[user][name]))) {
					output = "[ERR: Math can't '" + oper + "' non-numeric user variable '" + name + "']";
				} else {
					var orig   = parseInt(this._users[user][name]);
					if (oper == "add") {
						newval = orig + value;
					} else if (oper == "sub") {
						newval = orig - value;
					} else if (oper == "mult") {
						newval = orig * value;
					} else if (oper == "div") {
						if (value == 0) {
							output = "[ERR: Can't Divide By Zero]";
						} else {
							newval = orig / value;
						}
					}
				}

				// No errors?
				if (output == "") {
					// Commit.
					this._users[user][name] = newval;
				}

				reply = reply.replace(new RegExp("<" + oper + " " + this.quotemeta(name) + "=" + this.quotemeta(""+value) + ">", "i"),
					output);
				match = reply.match(new RegExp("<" + oper + " ([^>]+?)=([^>]+?)>"));
			}
		}

		// Get user vars.
		match = reply.match(/<get (.+?)>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for get tag!");
				break;
			}
			var name = match[1];
			var value = "undefined";
			if (this._users[user][name]) {
				value = this._users[user][name];
			}
			reply = reply.replace(new RegExp("<get " + this.quotemeta(name) + ">","ig"), value);
			match = reply.match(/<get (.+?)>/i); // Look for more
		}

		// Topic setter.
		match = reply.match(/\{topic=(.+?)\}/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for topic tag!");
				break;
			}
			var name = match[1];
			this._users[user]["topic"] = name;
			reply = reply.replace(new RegExp("{topic=" + this.quotemeta(name) + "}","ig"), "");
			match = reply.match(/\{topic=(.+?)\}/i); // Look for more
		}

		// Inline redirector.
		match = reply.match(/\{@(.+?)\}/);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for redirect tag!");
				break;
			}

			var target = this._strip(match[1]);
			this.say("Inline redirection to: " + target);
			var subreply = this._getreply(user, target, "normal", step+1, scope);
			reply = reply.replace(new RegExp("\\{@" + this.quotemeta(target) + "\\}", "i"), subreply);
			match = reply.match(/\{@(.+?)\}/);
		}

		// Object caller.
		match = reply.match(/<call>(.+?)<\/call>/i);
		giveup = 0;
		while (match) {
			giveup++;
			if (giveup >= 50) {
				this.warn("Infinite loop looking for call tag!");
				break;
			}

			var text = this._strip(match[1]);
			var parts = text.split(/\s+/);
			var obj   = parts[0];
			var args  = [];
			for (var i = 1, iend = parts.length; i < iend; i++) {
				args.push(parts[i]);
			}

			// Do we know this object?
			var output = "";
			if (this._objlangs[obj]) {
				// We do. Do we have a handler for it?
				var lang = this._objlangs[obj];
				if (this._handlers[lang]) {
					// We do.
					output = this._handlers[lang].call(this, obj, args, scope);
				} else {
					output = "[ERR: No Object Handler]";
				}
			} else {
				output = "[ERR: Object Not Found]";
			}

			reply = reply.replace(new RegExp("<call>" + this.quotemeta(match[1]) + "</call>","i"), output);
			match = reply.match(/<call>(.+?)<\/call>/i);
		}

		return reply;
	};

	// Run a kind of substitution on a message.
	RiveScript.prototype._substitute = function (msg, list) {
		// Safety checking.
		if (!this._sorted["lists"] || !this._sorted["lists"][list]) {
			this.warn("You forgot to call sortReplies()!");
			return "";
		}

		// Get the substitutions map.
		var subs;
		if (list == "subs") {
			subs = this._subs;
		} else {
			subs = this._person;
		}

		var notword = "([^A-Za-z0-9])";
		notword = "(\\W+)";
		for (var i = 0, end = this._sorted["lists"][list].length; i < end; i++) {
			var pattern = this._sorted["lists"][list][i];
			var result  = "<rot13sub>" + this._rot13(subs[pattern]) + "<bus31tor>";
			var qm      = this.quotemeta(pattern);

			// Run substitutions.
			msg = msg.replace(new RegExp("^" + qm + "$", "g"),           result);
			msg = msg.replace(new RegExp("^" + qm + "(\\W+)", "g"),      result + "$1");
			msg = msg.replace(new RegExp("(\\W+)" + qm + "(\\W+)", "g"), "$1" + result + "$2");
			msg = msg.replace(new RegExp("(\\W+)" + qm + "$", "g"),      "$1"+result);
		}

		// Convert the rot13-escaped placeholders back.
		var tries = 0;
		while (msg.indexOf("<rot13sub>") > -1) {
			tries++;
			if (tries > 50) {
				this.warn("Too many loops!");
				break;
			}

			var match = msg.match("<rot13sub>(.+?)<bus31tor>");
			if (match) {
				var cap = match[1];
				var decoded = this._rot13(cap);
				msg = msg.replace(new RegExp("<rot13sub>" + this.quotemeta(cap) + "<bus31tor>", "g"), decoded);
			} else {
				this.warn("Unknown fatal error! Saw a <rot13sub> but the regexp to find it failed!");
				return "";
			}
		}

		return msg;
	};

	// Determine if a trigger is atomic or not.
	RiveScript.prototype._is_atomic = function (trigger) {
		// Atomic triggers don't contain any wildcards or parenthesis or anything of the sort.
		// We don't need to test the full character set, just left brackets will do.
		var special = [ '*', '#', '_', '(', '[', '<' ];
		for (var i = 0, end = special.length; i < end; i++) {
			if (trigger.indexOf(special[i]) > -1) {
				return false;
			}
		}
		return true;
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

	// Given a topic and a trigger, find the pointer to the trigger's data.
	// This will search the inheritence tree until it finds the topic that
	// the trigger exists in.
	RiveScript.prototype._find_trigger_by_inheritence = function (topic, trig, depth) {
		// Prevent recursion.
		if (depth > this._depth) {
			this.warn("Deep recursion detected while following an inheritence trail!");
			return undefined;
		}

		// Inheritence is more important than inclusion: triggers in one topic can
		// override those in an inherited topic.
		if (this._lineage[topic]) {
			for (var inherits in this._lineage[topic]) {
				// See if this inherited topic has our trigger.
				if (this._topics[inherits][trig]) {
					// Great!
					return this._topics[inherits][trig];
				} else {
					// Check what THAT topic inherits from.
					var match = this._find_trigger_by_inheritence (
						inherits, trig, (depth+1)
					);
					if (match) {
						// Found it!
						return match;
					}
				}
			}
		}

		// See if this topic has an "includes".
		if (this._includes[topic]) {
			for (var includes in this._includes[topic]) {
				// See if this included topic has our trigger.
				if (this._topics[includes][trig]) {
					// It does!
					return this._topics[includes][trig];
				} else {
					// Check what THAT topic includes.
					var match = this._find_trigger_by_inheritence (
						includes, trig, (depth+1)
					);
					if (match) {
						// Found it!
						return match;
					}
				}
			}
		}

		// Not much else we can do!
		this.warn("User matched a trigger, " + trig + ", but I can't find out what topic it belongs to!");
		return undefined;
	};

	// Given a topic, this returns an array of every topic related to it (all the
	// topics it includes or inherits, plus all the topics included or inherited
	// by those topics, and so on). The array includes the original topic too.
	RiveScript.prototype._get_topic_tree = function (topic, depth) {
		// Default depth.
		if (typeof(depth) != "number") {
			depth = 0;
		}

		// Break if we're in too deep.
		if (depth > this._depth) {
			this.warn("Deep recursion while scanning topic tree!");
			return [];
		}

		// Collect an array of all topics.
		var topics = [ topic ];

		// Does this topic include others?
		if (this._includes[topic]) {
			// Try each of these.
			for (var includes in this._includes[topic]) {
				topics.push.apply(topics, this._get_topic_tree(includes, depth+1));
			}
		}

		// Does this topic inherit other topics?
		if (this._lineage[topic]) {
			// Try each of these.
			for (var inherits in this._lineage[topic]) {
				topics.push.apply(topics, this._get_topic_tree(inherits, depth+1));
			}
		}

		return topics;
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
			words = trigger.split(/[\s\*\#\_\|]+/);
		}

		var wc = 0;
		for (var i = 0, end = words.length; i < end; i++) {
			if (words[i].length > 0) {
				wc++;
			}
		}

		return wc;
	};

	// Escape a string for a regexp.
	RiveScript.prototype.quotemeta = function (string) {
		var unsafe = "\\.+*?[^]$(){}=!<>|:";
		for (var i = 0, end = unsafe.length; i < end; i++) {
			string = string.replace(new RegExp("\\" + unsafe.charAt(i), "g"), "\\" + unsafe.charAt(i));
		}
		return string;
	};

	// ROT13 encode a string.
	RiveScript.prototype._rot13 = function (string) {
		var result = '';

		for (var i = 0, end = string.length; i < end; i++) {
			var b = string.charCodeAt(i);

			if (b >= 65 && b <= 77) {
				b += 13;
			} else if (b >= 97 && b <= 109) {
				b += 13;
			} else if (b >= 78 && b <= 90) {
				b -= 13;
			} else if (b >= 110 && b <= 122) {
				b -= 13;
			}

			result += String.fromCharCode(b);
		}

		return result;
	};

	// String formatting.
	RiveScript.prototype._string_format = function (type, string) {
		if (type == "uppercase") {
			return string.toUpperCase();
		} else if (type == "lowercase") {
			return string.toLowerCase();
		} else if (type == "sentence") {
			string += "";
			var first = string.charAt(0).toUpperCase();
			return first + string.substring(1);
		} else if (type == "formal") {
			var words = string.split(/\s+/);
			for (var i = 0; i < words.length; i++) {
				var first = words[i].charAt(0).toUpperCase();
				words[i] = first + words[i].substring(1);
			}
			return words.join(" ");
		}

		return string;
	};

	// Strip nasties.
	RiveScript.prototype._strip_nasties = function (string) {
		string = string.replace(/[^A-Za-z0-9 ]/g, "");
		return string;
	};
	
	// HTML escape.
	RiveScript.prototype._escape_html = function (string) {
		string = string.replace(/&/g, "&amp;");
		string = string.replace(/</g, "&lt;");
		string = string.replace(/>/g, "&gt;");
		string = string.replace(/"/g, "&quot;");
		return string;
	};

	// Clone an object.
	RiveScript.prototype._clone = function (obj) {
		if (obj === null || typeof(obj) != "object") {
			return obj;
		}

		var copy = obj.constructor();
		for (var key in obj) {
			copy[key] = this._clone(obj[key]);
		}

		return copy;
	};

	// Create Object.keys() because it doesn't exist.
	RiveScript.prototype._shim_keys = function () {
		if (!Object.keys) {
			Object.keys = (function () {
				var hasOwnProperty = Object.prototype.hasOwnProperty,
					hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
					dontEnums = [
						'toString',
						'toLocaleString',
						'valueOf',
						'hasOwnProperty',
						'isPrototypeOf',
						'propertyIsEnumerable',
						'constructor'
					],
					dontEnumsLength = dontEnums.length;

				return function (obj) {
					if (typeof(obj) !== 'object' && typeof(obj) !== 'function' || obj == null) throw new TypeError('Object.keys called on non-object');

					var result = [];

					for (var prop in obj) {
						if (hasOwnProperty.call(obj, prop)) {
							result.push(prop);
						}
					}

					if (hasDontEnumBug) {
						for (var i = 0; i < dontEnumsLength; i++) {
							if (hasOwnProperty.call(obj, dontEnums[i])) {
								result.push(dontEnums[i]);
							}
						}
					}

					return result;
				}
			})();
		}
	};

	publish(RiveScript);
})((typeof(module) == "undefined" && (typeof(window) != "undefined" && this == window))
	? function(a) { this["RiveScript"] = a; }
	: function(a) { module.exports     = a; });

