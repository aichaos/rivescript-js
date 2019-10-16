# JSObjectHandler (RiveScript master)

JavaScript Language Support for RiveScript Macros. This support is enabled by
default in RiveScript.js; if you don't want it, override the `javascript`
language handler to null, like so:

```javascript
bot.setHandler("javascript", null);
```

## void load (string name, string[]|function code)

Called by the RiveScript object to load JavaScript code.

## string call (RiveScript rs, string name, string[] fields)

Called by the RiveScript object to execute JavaScript code.