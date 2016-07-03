# SessionHandler

This is the default session manager used by RiveScript to store and retrieve
user variables. This session handler just keeps the variables in RAM; if you
want to provide your own session handler (e.g. to use a database), you can
program your own handler and pass it into the RiveScript constructor:

```javascript
var bot = new RiveScript({
    sessionHandler: new MySessionHandler()
})
```

Your custom session handler should be a JavaScript object (class) that
implements the following functions:

* void set (string username, object vars): For setting user variables. The
  `vars` object is a key/value dictionary mapping user variable names (key)
  to their values. The values will usually be strings, but can be other types
  for some internal data structures (e.g. input/reply histories as arrays).
* string get (string username, [string key]): For retrieving a user variable.
  Return the string `"undefined"` if the variable doesn't exist. If the `key`
  parameter is not provided, this should instead return the full object of
  key/value pairs for the user.
* object getAll(): Retrieve all user variables for all users. This should
  return an object where the top-level key is the username, and the values
  are objects of key/value pairs of that user's variables.
* void reset (string username): This should delete all variables about the
  given username.
* void resetAll(): This should delete all variables about all users.
* void freeze (string username): Make a snapshot of a user's variables, which
  can be later restored using `thaw()`.
* void thaw (string username[, string action]): Restore a user's variables
  from the frozen snapshot. This should replace *all* their variables with the
  set that was frozen. The valid options for `action` are:
  * `thaw`: Restore the variables and delete the frozen copy (default).
  * `discard`: Don't restore the variables, just delete the frozen copy.
  * `keep`: After restoring the user's variables, keep the frozen copy around
    anyway (e.g. so future calls to `thaw()` will keep restoring the same
    set of variables).

All class methods are optional, and RiveScript won't attempt to call them if
they haven't been implemented.