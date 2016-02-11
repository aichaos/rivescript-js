# Reply-async

This example demonstrates using replyAsync function. You should use
**replyAsync** instead of **reply** if you have subroutines that return
promises.

## Running the example

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
