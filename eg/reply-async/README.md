# replyAsync Example

This example demonstrates using replyAsync function. You should use
**replyAsync** instead of **reply** if you have subroutines that return
promises.

## Important Note About Conditionals

Asynchronous object macros are *not* supported within the conditional side of
`*Conditions` in RiveScript. That is, RiveScript code like the following will
not work (where the `weather` macro calls out to an HTTP API and returns a
promise with the result):

```rivescript
+ is it sunny outside
* <call>weather <get zipcode></call> == sunny => It appears it is!
- It doesn't look sunny outside.
```

Conditionals in RiveScript require their results to be immediately available
so it can check if the comparison is truthy. So, even if you use `replyAsync()`,
the `<call>` tags in conditionals only support running synchronous object
macros (ones that return a string result and not a promise).

However, asynchronous object macros can be used in the *reply* portion of the
conditional (the part on the right side of the `=>` separator). This is the
text eventually returned to the user and it can return as a promise when you use
`replyAsync()` just like if it were in a `-Reply` command.

## Running the example

To fully experience this example, you'll need to get an API key from
[OpenWeatherMap](http://openweathermap.org/appid) (don't worry, they're free!),
and edit `weatherman.js` to fill in your `APPID` near the top of the file.

```bash
npm install && node weatherman.js
```

Refer to weatherman.rive for the list of supported commands

## Using async subroutines

Whenever you have a subroutine that needs to call some sort of asynchronous
function in order to return a value back to the script, you should use promises:

```javascript
var rs = new RiveScript();
rs.setSubroutine("asyncHelper", function(rs, args) {
  // RiveScript comes bundled with RSVP.js which you can
  // access through RiveScript.Promise alias
  // but you are free to use your own Promise implementation
  return new rs.Promise(function(resolve, reject) {
    resolve('hello there');
  });
})
```

Async responses in RiveScript come in 2 flavors:

```javascript
// using promises
rs.replyAsync(username, message).then(function(reply) {
  // good to go
}).catch(function(error){
  // something went wrong
});

// or using callbacks
rs.replyAsync(username, message, this, function(error, reply) {
  if (!error) {
    // you can use reply here
  } else {
    // something went wrong, error has more info
  }
});
```
