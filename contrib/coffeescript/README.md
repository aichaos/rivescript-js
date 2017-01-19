# RiveScript-Contrib-CoffeeScript

This provides a CoffeeScript language handler for RiveScript object macros.

# Installation

```npm install rivescript-contrib-coffeescript```

```html
<script src="https://unpkg.com/rivescript-contrib-coffeescript@latest/dist/rivescript-contrib-coffeescript.min.js"></script>
```

# Usage

## In nodejs

```javascript
var RiveScript = require("rivescript"),
    RSCoffeeScript = require("rivescript-contrib-coffeescript");

var bot = new RiveScript();

// Register the CoffeeScript handler.
bot.setHandler("coffeescript", new RSCoffeeScript(bot));

// Load your replies like normal, and `>object * coffeescript` macros will be
// loaded and usable just like JavaScript ones.
bot.loadDirectory("./replies", function() {
    bot.sortReplies();

    var reply = bot.reply("reverse hello world");
    if (reply === "dlrow olleh") {
        console.log("It works!");
    }
});
```

Example CoffeeScript object macro handler (in RiveScript code):

```rivescript
> object reverse coffeescript
    msg = args.join " "
    return msg.split("").reverse().join("")
< object

+ reverse *
- <call>reverse <star></call>
```

## On a web page

Embed the browserified `rivescript-contrib-coffee.min.js` on your web page and
access its object constructor with the name `RSCoffeeScript`. and use the
example code above to register it via `setHandler()`.

# License

```
The MIT License (MIT)

Copyright (c) 2017 Noah Petherbridge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## SEE ALSO

The official RiveScript website, http://www.rivescript.com/
