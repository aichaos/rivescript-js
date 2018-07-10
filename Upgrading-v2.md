# Upgrading to RiveScript v2.0.0

[RiveScript.js][1] has jumped from version `v1.19.0` to `v2.0.0` in a large
move that broke some backwards compatibility. In exchange for this, RiveScript
is now able to make use of modern Async/Await features in JavaScript which
means it can do more async things more often: such as storing your user's
variables _directly_ into a Redis cache.

The major highlights of the RiveScript v2.0.0 release are:

* Upgrade the code to use modern [Async/Await][2] features.
* Provide an interface to replace the User Variable Session Manager with
  one backed by a database or cache.
* "Decaffeinate" the source code from CoffeeScript into native ES2015+
  syntax. CoffeeScript was holding us back from the `await` keyword
  and JavaScript is actually nice to program in nowadays.

# JavaScript API Changes

## Changed: reply() now returns a Promise

The `reply()` function returns a Promise now (so you have to call `.then()`
to get the response asynchronously) instead of just giving the string reply
immediately.

```javascript
// The old way that doesn't work:
var reply = bot.reply(user, message); // reply = [promise Promise]
console.log("Bot>", reply);

// Instead wait on the promise:
bot.reply(user, message).then(function(reply) {
    console.log("Bot>", reply);
});
```

This does mean that your code might need a bit of restructuring if it
expected to get the `reply` as a string immediately. Usually, you can just
take all of the code that needed your `var reply` and move it inside the
callback function.

If you want some inspiration, see commit [2e6aae30][3] where I upgraded all
of the example programs that come with `rivescript-js`.

Read the [Background](#background) below for an explanation why this function
had to change.

## Deprecated: replyAsync()

The `replyAsync()` function is deprecated in favor of `reply()`, which now
shares the same API.

To upgrade, just find/replace your use of `replyAsync()` with `reply()`.

```diff
-  bot.replyAsync(user, message).then(console.log);
+  bot.reply(user, message).then(console.log);
```

## Deprecated: loadFile() and loadDirectory() are becoming Promise-based

To make the API more consistent, `loadFile()` and `loadDirectory()` are
becoming Promise-based and using the old callback style will print a
deprecation warning to the console.

These functions are very easy to change:

* Take your `rs.loadFile(path, onSuccess, onError)`
* And make it `rs.loadFile(path).then(onSuccess).catch(onError)`

Example:

```javascript
var bot = new RiveScript();
bot.loadDirectory("./brain").then(function() {
  console.log("Bot loaded!");
  bot.sortReplies();
}).catch(function(err, filename, lineno) {
  console.error("An error occurred!");
});

// For backwards compatibility, if you use the old callback style,
// you will get a warning in your terminal but it will still work.
bot.loadFile("brain.rive", function() {
  console.log("Brain loaded!");
  bot.sortReplies();
}, function(err, filename, lineno) {
  console.log("An error occurred!");
});
```

## Changed: All User Variable methods now return Promises

All methods that get or set user variables now return Promises instead of
just returning their result directly. This is the complete list:

+ setUservar (string user, string name, string value)
+ setUservars (string user, object data)
+ getUservar (string user, string name) -> value
+ getUservars ([string user]) -> object
+ clearUservars ([string user])
+ freezeUservars (string user)
+ thawUservars (string user[, string action])
+ lastMatch (string user) -> string
+ initialMatch (string user) -> string
+ lastTriggers (string user) -> object
+ getUserTopicTriggers (string username) -> object

A lot of these, like `setUservar()`, you probably don't care about, but if
you expect the value to be *immediately* available after you set it, you
should update your use of it to be async aware.

For example, if you called `setUservar()` to set a user's name and then
immediately called `getUservar()` to retrieve it (something that used to
work in RiveScript v1.19.0), you would find that it wasn't available yet.

Examples:

```javascript
// Exporting user vars to save to disk maybe?
bot.getUservars().then( (data) => {
  console.log(`Got the user vars: ${JSON.stringify(data)}`);
});

// Get the user's last matched trigger.
bot.lastMatch(username).then( (lastTrigger) => {
  console.log(`You last matched: ${lastTrigger}`);
});

// If you want to set and get in sequence, you have
// to wait on the Promises to resolve.
bot.setUservar(user, "name", "Alice").then(() => {
  bot.getUservar(user, "name").then((value) => {
    console.log(`I remembered your name is ${value}!`);
  });
});
```

# Background

TBD.

[1]: https://github.com/aichaos/rivescript-js
[2]: https://www.twilio.com/blog/2015/10/asyncawait-the-hero-javascript-deserved.html
[3]: https://github.com/aichaos/rivescript-js/commit/2e6aae30bbecd4cba946ef95b085f023954dcb97?w=1
