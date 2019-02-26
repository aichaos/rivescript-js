# Redis Session Manager Example

This example implements a simple RiveScript bot that uses a
[Redis](https://redis.io) cache server to **actively** store user variables,
instead of keeping them in memory as default.

The crucial bit of code for your own use case is like the following:

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

## Requirements

Install and run a [Redis](https://redis.io) server on localhost before
running this script.

This script imports the **local copy** of `redis-rivescript` and is intended
to be run from the source code tree of rivescript-js. That is, it expects to
be able to import `../../contrib/redis` relative to itself.

## Example Output

```
% node redis-bot.js
Redis Session Manager Example

This script will connect to the Redis server at localhost:6379 and store
RiveScript user variables into keys with the prefix "rivescript/" followed
by their username. For example, the default username "soandso" would have
its user variables actively stored at the Redis key "rivescript/soandso".

Enter any username for yourself> kirsle

The example chatbot has been loaded and you will now enter a chat session
with it. Trying saying "hello" or "my name is kirsle"

Type "/help" for some commands to test the Redis system.
Type "/quit" to quit.


kirsle> Hello bot
Bot> How do you do. Please state your problem.
kirsle> My name is noah
Bot> Noah, nice to meet you.
kirsle> /dump-users
Dump of all user variables in Redis
{
  "kirsle": {
    "topic": "random",
    "__initialmatch__": "my name is *",
    "name": "Noah",

    ...some spammy keys redacted...
  }
}
kirsle> /help
Commands available:
/user <username>
    Dump the user variables for a specific username to console.
    Note: this data is coming from Redis!

/dump-users
    Dump all data about all users.

/reset [username]
    Reset user variables for a username, or if not provided, reset
    all variables. This will clear all "rivescript/*" keys from your
    Redis cache.

/quit
    Exit this program

kirsle> /quit
```
