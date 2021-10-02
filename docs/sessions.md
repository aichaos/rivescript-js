# SessionManager

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

## async set(string username, object data) -> void

Set user variables for the user `username`. The `args` should be an object
of key/value pairs. The values are usually strings, but they can be other
types as well (e.g. arrays or other objects) for some internal data
structures such as input/reply history.

A value of `null` for a variable means it should be deleted from the
user's session store.

## async get(string username, string key) -> string

Retrieve a stored variable for a user.

If the user doesn't exist, this should resolve `null`. If the user *does*
exist, but the key does not, this function should resolve the
string value `"undefined"`.

## async getAny(string username) -> object

Retrieve all stored user variables for the user `username`.

This should resolve an object of the key/value pairs you have stored for
the user. If the user doesn't exist, resolve `null`.

## async getAll() -> object

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

## async reset(string username) -> void

Reset all variables stored about a particular user.

## async resetAll() -> void

Reset all data about all users.

## async freeze(string username) -> void

Make a snapshot of the user's variables so that they can be restored
later via `thaw()`. This is the implementation for
`RiveScript.freezeUservars()`

## async thaw(string username, string action) -> void

Restore the frozen snapshot of variables for a user.

This should replace _all_ of a user's variables with the frozen copy
that was snapshotted with `freeze()`. If there are no frozen variables,
this function should be a no-op (maybe print a warning?)

Valid options for `action` reflect the usage of `rs.thawUservars()`:

* `thaw`: Restore the variables and delete the frozen copy (default)
* `discard`: Do not restore the variables, but delete the frozen copy
* `keep`: Restore the variables and keep the frozen copy

## object defaultSession()

You do not need to override this method. This returns the default session
variables for a new user, e.g. with the variable `topic="random"` as per
the RiveScript spec.

# MemorySessionManager

This is the default in-memory session store for RiveScript.

It keeps all user variables in an object in memory and does not persist them
to disk. This means it won't remember user variables between reboots of your
bot's program, but it remembers just fine during its lifetime.

The RiveScript methods `getUservars()` and `setUservars()` are available to
export and import user variables as JSON-serializable objects so that your
program could save them to disk on its own.

See the documentation for `SessionManager` for information on extending
RiveScript with an alternative session store.

# NullSessionManager

This is a session manager implementation that does not remember any user
variables. It is mostly useful for unit tests.
