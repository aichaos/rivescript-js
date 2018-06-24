/*
rivescript-contrib-coffeescript - CoffeeScript object macro handler for RiveScript

This code is released under the MIT License.
See the "LICENSE" file for more information.

https://www.rivescript.com/
*/
"use strict";

var coffee = require("coffeescript");

/**
 * CoffeeHandler (RiveScript master)
 *
 * CoffeeScript language support for RiveScript object macros.
 */
var CoffeeHandler = function(master) {
	var self = this;
	self._master = master;
	self._objects = {};

	/**
	 * void load (string name, string[] code)
	 *
	 * Called by the RiveScript instance to load CoffeeScript code.
	 */
	self.load = function(name, code) {
		// Make this a dynamic CoffeeScript function.
		var source;
		try {
			source = "this._objects[\"" + name + "\"] = function(rs, args) {\n"
				+ coffee.compile(code.join("\n"), {bare: true})
				+ "}\n";
		}
		catch (e) {
			self._master.warn("Error constructing CoffeeScript source: " + e.message);
			return;
		}

		try {
			eval(source);
		}
		catch (e) {
			self._master.warn("Error evaluating CoffeeScript object: " + e.message);
			return;
		}
	};

	/**
	 * string call (RiveScript rs, string name, string[] fields, scope)
	 *
	 * Called by the RiveScript instance to execute an object macro.
	 */
	self.call = function(rs, name, fields, scope) {
		// Do we have it?
		if (!self._objects[name]) {
			return self._master.errors.objectNotFound;
		}

		// Call the dynamic method.
		var func  = self._objects[name];
		var reply = "";
		try {
			reply = func.call(scope, rs, fields);
		}
		catch (e) {
			reply = "[ERR: Error when executing CoffeeScript object: " + e.message + "]";
		}

		// Allow undefined responses.
		if (reply === undefined) {
			reply = "";
		}

		return reply;
	}
}

module.exports = CoffeeHandler;
