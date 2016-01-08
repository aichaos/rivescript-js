# Scope Example

This example demonstrates the use of the `scope` parameter as passed to the
`reply()` function.

The purpose of the `scope` parameter is to change the scope that a JS macro
executes in. Put more simply, it changes the meaning of the built-in variable
named `this` to point to the same `this` as in the parent object.

In the example code, the RiveScript bot instance is encapsulated as a member
attribute of the `ScopedBot` object. By passing in the `this` variable to the
RiveScript `reply()` function, the JS object macro is also executed in the
context of the `ScopedBot` instance, and therefore it can access other local
instance variables and functions.

## Example Output

```
% node bot.js
Bot> Testing the scope!
Function result: It works!
this.hello: Hello world
this.counter: 1
> scope test
Bot> Testing the scope!
Function result: It works!
this.hello: Hello world
this.counter: 2
> scope test
Bot> Testing the scope!
Function result: It works!
this.hello: Hello world
this.counter: 3
```
