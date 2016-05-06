# CoffeeScript Handler Example

This example shows how you can use `rivescript-contrib-coffeescript` to enable
the CoffeeScript language for object macros in RiveScript.

To use this example, run `npm install` from this directory to get the
`rivescript-contrib-coffeescript` dependency and then run `node coffeebot.js`
to run the example.

The source file used in this demo is from the `/eg/brain/coffee.rive` script.

## How it Works

Here is the minimal source code to enable CoffeeScript support:

```javascript
// If using Node, import these modules; if using the web, just embed their
// .js files and `RiveScript` and `RSCoffeeScript` are both available on the
// global window scope.
var RiveScript = require("rivescript"),
    RSCoffeeScript = require("rivescript-contrib-coffeescript");

// Make your RiveScript bot instance.
var bot = new RiveScript();

// Register the CoffeeScript handler. In this example we register the handler
// for both "coffee" and "coffeescript", so that object macros that name either
// one will both be handled.
bot.setHandler("coffeescript", new RSCoffeeScript(bot));
bot.setHandler("coffee", new RSCoffeeScript(bot));

// Proceed to load replies, etc...
bot.loadFile("brain.rive", function() {
	bot.sortReplies();
	// ...
})
```

## Example Output

```
% node coffeebot.js
> coffee test
Bot> Testing CoffeeScript object: Hello, soandso!
```
