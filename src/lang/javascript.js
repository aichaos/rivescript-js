/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// RiveScript.js
//
// This code is released under the MIT License.
// See the "LICENSE" file for more information.
//
// http://www.rivescript.com/
"use strict";

//#
// JSObjectHandler (RiveScript master)
//
// JavaScript Language Support for RiveScript Macros. This support is enabled by
// default in RiveScript.js; if you don't want it, override the `javascript`
// language handler to null, like so:
//
// ```javascript
//    bot.setHandler("javascript", null);
// ```
//#
class JSObjectHandler {
  constructor(master) {
    this._master  = master;
    this._objects = {};
  }

  //#
  // void load (string name, string[]|function code)
  //
  // Called by the RiveScript object to load JavaScript code.
  //#
  load(name, code) {
    if (typeof code === "function") {
      // If code is just a js function, store the reference as is
      return this._objects[name] = code;
    } else {
      // We need to make a dynamic JavaScript function.
      const source = `this._objects["${name}"] = function(rs, args) {\n` 
        + code.join("\n") 
        + "}\n";

      try {
        return eval(source);
      } catch (e) {
        return this._master.warn(`Error evaluating JavaScript object: ${e.message}`);
      }
    }
  }

  //#
  // string call (RiveScript rs, string name, string[] fields)
  //
  // Called by the RiveScript object to execute JavaScript code.
  //#
  call(rs, name, fields, scope) {
    // We have it?
    if (!this._objects[name]) {
      return this._master.errors.objectNotFound;
    }

    // Call the dynamic method.
    const func = this._objects[name];
    let reply = "";
    try {
      reply = func.call(scope, rs, fields);
    } catch (e) {
      reply = `[ERR: Error when executing JavaScript object: ${e.message}]`;
    }

    // Allow undefined responses.
    if (reply === undefined) {
      reply = "";
    }

    return reply;
  }
}

module.exports = JSObjectHandler;
