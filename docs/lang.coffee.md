# CoffeeObjectHandler (RiveScript master)

CoffeeScript Language Support for RiveScript Macros. This language is not
enabled by default; to enable CoffeeScript object macros:

```coffeescript
CoffeeObjectHandler = require "rivescript/lang/coffee"
bot.setHandler "coffee", new CoffeeObjectHandler
```

## void load (string name, string[] code)

Called by the RiveScript object to load CoffeeScript code.

## string call (RiveScript rs, string name, string[] fields)

Called by the RiveScript object to execute CoffeeScript code.