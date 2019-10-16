# Redis for RiveScript

```
npm install rivescript-redis
```

This module implements a Redis cache driver for the RiveScript User Variable
Session Manager.

It lets you **actively** persist your user variables to Redis instead of
just in the bot's memory, so that your bot can easily recall user
information across reboots and even across separate machines by storing
them in Redis.

This module is part of the `rivescript-js` project which can be found at
https://github.com/aichaos/rivescript-js and is released under the same
license (MIT).

## Usage

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

## License

MIT.
