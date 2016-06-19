# RiveScript as a Router

This example was created in response to the discussion in
[Issue #130](https://github.com/aichaos/rivescript-js/issues/130) about using
RiveScript as a router (in the web application sense of the word).

In web applications, you define routes (URIs) and function handlers to be called
when a browser requests that route.

```javascript
app.route("/myRoute", Class.method);
```

If you're writing a very heavily programmatic chatbot, where you want JavaScript
object macro handlers for *many, many* triggers, and you don't want to keep
writing out `<call>` commands over and over again, this example offers an idea
for doing this in a [D.R.Y.](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
way.

## Concepts Demonstrated

This example covers multiple useful things:

* JavaScript object macros that import an external module (`controllers.js`),
  without needing to repeatedly `require()` them every single time in every
  macro handler.
* Defining triggers that directly map to your object macros without needing to
  manually re-write the `<call>` tags multiple times.
* Using the RiveScript engine (with its simplified regexp triggers and its
  sorting algorithm) *without* actually writing a single line of RiveScript
  code by hand.

This example doesn't cover, but it is possible, mixing a router-style approach
with normal RiveScript replies. For example, separately from all the code that
registers "routes" to handlers you could include a normal `loadFile()` or
`loadDirectory()` call, and load normal RiveScript sources that have their own
normal replies with them instead of needing to call function handlers for every
message.

## Run the Example

To run this, first run `grunt dist` from the root of the rivescript-js project
(to build the JavaScript code from the CoffeeScript sources for RiveScript),
and then run `node router.js`:

```bash
[rivescript-js]$ grunt dist
[rivescript-js]$ cd eg/router
[router]$ node router.js
```

Example output:

```
% node router.js
Note: type `/quit` to exit.
You> hello bot
[Captain's Log] Unhandled message: hello bot
Bot> No reply for that one. Try one of these:
   add 5 and 7
   what is 12 divided by 3
   reverse hello world
   say hi robot to me backwards
You> add 5 and 7
Bot> 12
You> reverse how are you?
Bot> uoy era woh
You> say hi robot to me backwards
Bot> tobor ih
```

## How it Works

Review the source of `router.js`, the entry point to this example bot.

The `replies` object is where most of the magic happens. It creates simple
arrays of just the trigger texts, and associates them with a JavaScript
function to be called when one of those triggers is matched. The actual
implementations of the two functions exposed (`math` and `reverse`) are in
`controllers.js`, which is an external Node module, and this demonstrates that
a module imported *once* in the global scope can be made available to the
individual object macros without each of them needing to import their own
copies.

At the bottom of `router.js` is some "write once" boilerplate that iterates
through the `replies` object and dynamically creates RiveScript source code
and registers the JavaScript object macros.

The dynamically generated RiveScript source is loaded by the bot using the
`stream()` function, which allows you to import RiveScript source from a string
rather than a file. This way, the bot writer doesn't actually need to write a
single line of raw RiveScript code herself. An example of the dynamically
generated RiveScript code looks like this:

```
+ [*] what is # * [by|to|and] #
- <call>math "<star1>" "<star2>" "<star3>"</call>
```

But you don't ever actually write that code out yourself!

The router example then enters a readline loop, similar to the `shell.js` at
the root of the RiveScript-JS project, to enable chatting with the bot using
your terminal.

## Available Functions

For this example, we make three functions available: `math`, `reverse`, and
`wildcard`. Here are examples of how to invoke these with your messages:

* `math`
  * `add 5 and 7`
  * `what is 12 divided by 3`
  * `what is 4 times 8`
  * `what is 6 multiplied by 12`
  * `subtract 13 by 4`
* `reverse`
  * `say hello to me backwards`
  * `reverse rivescript`
  * `say how are you in reverse`
* `wildcard`
  * Literally any message that doesn't match the other patterns.

The wildcard handler matches all uncaught messages (`*`), and gives you examples
of messages to try the other handlers.
