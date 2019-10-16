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

# New Features

## User Variables Session Managers

Previously, RiveScript only stored user variables in its own process
memory (keyed by username), and if you wanted the bot to remember user
information across reboots, you needed to use functions like getUservars
and setUservars to get data in and out of the bot's memory.

With the new Async/Await features, now, it is possible to replace the
User Variable Session Manager with a more active one, such as a Redis
cache or a MongoDB database. So every time a user variable gets `<set>`,
it's put directly into a database rather than just kept in memory.

The default is still an in-memory store, but you can implement a custom
async driver following the SessionManager interface. There is a Redis
driver in the rivescript-js git repository called `rivescript-redis`

```javascript
// Import rivescript and rivescript-redis
const RiveScript = require("rivescript"),
    RedisSessionManager = require("rivescript-redis");

// Construct your RiveScript bot as normal...
let bot = new RiveScript({
    utf8: true,

    // Give it a new Redis session manager.
    sessionManager: new RedisSessionManager({
        // The constructor takes an `opts` object, and mostly passes it
        // directly along to the underlying `redis` module. So all these
        // parameters come from `redis`
        host: "localhost",  // default
        port: 6369,

        // NOTE: this option is used by `redis` and is also noticed by
        // rivescript-redis: it's optional but recommended to set a
        // prefix. The Redis keys otherwise are simply the username
        // given to RiveScript.
        prefix: "rivescript/"
    })
});

// And carry on as normal. All user variables will be actively persisted
// in Redis (no need to call `getUservars()` and `setUservars()` to manage
// them yourself -- though these functions DO work and will get you current
// data from your Redis cache!)
```

# Async Objects in Conditions

Async/Await enables asynchronous object macros that return Promises to
be used *anywhere* throughout RiveScript. This means they can finally be
used inside of `*Condition`s! Example:

```rivescript
// <call>wait-limited $timeout $maxTimeout</call>
// If the $timeout > $maxTimeout, it resolves "too long" immediately.
// Otherwise it waits $timeout seconds and resolves "done"
> object wait-limited javascript
	var timeout = parseInt(args[0]);
	var max     = parseInt(args[1]);

	return new Promise(function(resolve, reject) {
		if (timeout > max) {
			resolve("too long");
		} else {
			setTimeout(function() {
				resolve("done");
			}, timeout*1000);
		}
	});
< object

+ can you wait # seconds
* <call>wait-limited <star> 6</call> == done => I can!
- No the longest I'll wait is 6 seconds.
```

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

[1]: https://github.com/aichaos/rivescript-js
[2]: https://www.twilio.com/blog/2015/10/asyncawait-the-hero-javascript-deserved.html
[3]: https://github.com/aichaos/rivescript-js/commit/2e6aae30bbecd4cba946ef95b085f023954dcb97?w=1
