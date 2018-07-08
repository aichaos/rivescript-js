// RiveScript.js
// https://www.rivescript.com/

// This code is released under the MIT License.
// See the "LICENSE" file for more information.

"use strict";

const utils = require("./utils");

/**
SessionManager

This is the interface for session managers that store user variables for
RiveScript. User variables include those set with the `<set>` tag or the
`setUservar()` function, as well as recent reply history and private internal
state variables.

The default session manager keeps the variables in memory. This means the bot
doesn't remember users after you restart the program; but the functions
`getUservars()` and `setUservars()` are available to export and import the
variables yourself.

If you prefer a more active session manager that stores and retrieves user
variables from a MySQL, MongoDB or Redis database, you can replace the default
session manager with one that implements that backend (or write one yourself
that implements this SessionManager API).

To use a session manager, you'd typically do something like:

```javascript
const RedisSessions = require("rivescript-contrib-redis");

// Provide the sessionManager option to use this instead of
// the default MemorySessionManager.
var bot = new RiveScript({
	sessionManager: new RedisSessions("localhost:6379")
});
```

To implement your own session manager, you should extend the
`SessionManager` class and implement a compatible object.
*/
class SessionManager {
	/**
	void set(string username, object data)

	Set user variables for the user `username`. The `args` should be an object
	of key/value pairs. The values are usually strings, but they can be other
	types as well (e.g. arrays or other objects) for some internal data
	structures such as input/reply history.

	A value of `null` for a variable means it should be deleted from the
	user's session store.
	*/
	async set(username, data) {
		throw "Not Implemented"
	}

	/**
	async get(string username, string key) -> string

	Retrieve a stored variable for a user.

	If the user doesn't exist, this should resolve `null`. If the user *does*
	exist, but the key does not, this function should resolve the
	string value `"undefined"`.
	*/
	async get(username, key) {
		throw "Not Implemented"
	}

	/**
	async getAny(string username) -> object

	Retrieve all stored user variables for the user `username`.

	This should resolve an object of the key/value pairs you have stored for
	the user. If the user doesn't exist, resolve `null`.
	*/
	async getAny(username) {
		throw "Not Implemented"
	}

	/**
	async getAll() -> object

	Retrieve all variables about all users.

	This should return an object that maps usernames to an object of their
	variables. For example:

	```json
	{ "user1": {
	    "topic": "random",
        "name": "Alice"
	  },
	  "user2": {
	    "topic": "random",
	    "name": "Bob"
	  }
	}
	```
	*/
	async getAll() {
		throw "Not Implemented"
	}

	/**
	async reset(string username)

	Reset all variables stored about a particular user.
	*/
	async reset(username) {
		throw "Not Implemented"
	}

	/**
	async resetAll()

	Reset all data about all users.
	*/
	async resetAll() {
		throw "Not Implemented"
	}

	/**
	async freeze(string username)

	Make a snapshot of the user's variables so that they can be restored
	later via `thaw()`. This is the implementation for
	`RiveScript.freezeUservars()`
	*/
	async freeze(username) {
		throw "Not Implemented"
	}

	/**
	async thaw(string username, string action)

	Restore the frozen snapshot of variables for a user.

	This should replace _all_ of a user's variables with the frozen copy
	that was snapshotted with `freeze()`. If there are no frozen variables,
	this function should be a no-op (maybe print a warning?)

	Valid options for `action` reflect the usage of `rs.thawUservars()`:

	* `thaw`: Restore the variables and delete the frozen copy (default)
	* `discard`: Do not restore the variables, but delete the frozen copy
	* `keep`: Restore the variables and keep the frozen copy
	*/
	async thaw(username, action) {
		throw "Not Implemented"
	}

	/**
	object defaultSession()

	You do not need to override this method. This returns the default session
	variables for a new user, e.g. with the variable `topic="random"` as per
	the RiveScript spec.
	*/
	defaultSession() {
		return {
			"topic": "random"
		};
	}
}

/**
MemorySessionManager

This is the default in-memory session store for RiveScript.

It keeps all user variables in an object in memory and does not persist them
to disk. This means it won't remember user variables between reboots of your
bot's program, but it remembers just fine during its lifetime.

The RiveScript methods `getUservars()` and `setUservars()` are available to
export and import user variables as JSON-serializable objects so that your
program could save them to disk on its own.

See the documentation for `SessionManager` for information on extending
RiveScript with an alternative session store.
*/
class MemorySessionManager extends SessionManager {
	constructor() {
		super();
		var self = this;
		self._users = {};
		self._frozen = {};
	}

	// init makes sure a user exists in the session store.
	init(username) {
		var self = this;
		if (self._users[username] === undefined) {
			self._users[username] = self.defaultSession();
		}
	}

	async set(username, data) {
		var self = this;
		return new Promise((resolve, reject) => {
			self.init(username);
			for (var key in data) {
				if (data.hasOwnProperty(key)) {
					self._users[username][key] = data[key];
				}
			}
			resolve();
		});
	}

	async get(username, key) {
		var self = this;
		return new Promise((resolve, reject) => {
			if (self._users[username] === undefined) {
				resolve(null);
			} else if (self._users[username][key] !== undefined) {
				resolve(self._users[username][key]);
			} else {
				resolve("undefined");
			}
		});
	}

	async getAny(username) {
		var self = this;
		return new Promise((resolve, reject) => {
			if (self._users[username] === undefined) {
				resolve(null);
			} else {
				resolve(utils.clone(self._users[username]));
			}
		});
	}

	async getAll() {
		var self = this;
		return new Promise((resolve, reject) => {
			resolve(utils.clone(self._users));
		});
	}

	async reset(username) {
		var self = this;
		return new Promise((resolve, reject) => {
			if (self._users[username] !== undefined) {
				delete self._users[username];
			}
			if (self._frozen[username] !== undefined) {
				delete self._frozen[username];
			}
			resolve();
		});
	}

	async resetAll() {
		var self = this;
		return new Promise((resolve, reject) => {
			self._users = {};
			self._frozen = {};
			resolve();
		});
	}

	async freeze(username) {
		var self = this;
		return new Promise((resolve, reject) => {
			if (self._users[username] !== undefined) {
				self._frozen[username] = utils.clone(self._users[username]);
				resolve();
			} else {
				reject(`freeze(${username}): user not found`);
			}
		});
	}

	async thaw(username, action="thaw") {
		var self = this;
		return new Promise((resolve, reject) => {
			if (self._frozen[username] !== undefined) {
				// OK what are we doing?
				switch (action) {
					case "thaw":
						self._users[username] = utils.clone(self._frozen[username]);
						delete self._frozen[username];
						break;
					case "discard":
						delete self._frozen[username];
						break;
					case "keep":
						self._users[username] = utils.clone(self._frozen[username]);
						break;
					default:
						reject("bad thaw action");
				}
				resolve();
			} else {
				reject(`thaw(${username}): no frozen variables found`);
			}
		})
	}
}

/**
NullSessionManager

This is a session manager implementation that does not remember any user
variables. It is mostly useful for unit tests.
*/
class NullSessionManager extends SessionManager {
	async set(username, data) {
		return noop();
	}
	async get(username, key) {
		return noop("undefined");
	}
	async getAny(username) {
		return noop(null);
	}
	async getAll() {
		return noop(new Object());
	}
	async reset(username) {
		return noop()
	}
	async resetAll() {
		return noop()
	}
	async freeze(username) {
		return noop()
	}
	async thaw(username, action) {
		return noop()
	}
}

async function noop(resp) {
	return new Promise((resolve, reject) => {
		resolve(resp);
	});
}

module.exports.SessionManager = SessionManager
module.exports.MemorySessionManager = MemorySessionManager
module.exports.NullSessionManager = NullSessionManager
