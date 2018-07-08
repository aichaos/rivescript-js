# Learning Example

This implements a RiveScript bot that is able to learn new triggers and
responses from the user.

> * **User:** Hello bot.
> * **Bot:** I don't know how to reply to that. Can you teach me?
> * **User:** When I say hello bot you say hello human! :)
> * **Bot:** Got it.
> * **USer:** Hello bot!
> * **Bot:** Hello human! :)

## Features

* Works in both a Node (server side) environment as well as in a web browser.
* Keeps the learned replies completely separated from your bot's "core personality."
    * All learned replies are put in a file named `learned.rive`
    * For web browsers, since there isn't a filesystem, they are put in
      localStorage at `localStorage["learned.rive"]` (your bot could then
      `stream()` it from there on page reload).
* Works whether or not the RiveScript program is cooperating with it.
  * The bot program can call `setUservar(user, "origMessage", message)` before
    calling `reply()` to preserve the user's _original_ message, including
    formatting and special characters.
  * If the `origMessage` is available, the object macro will re-parse the trigger
    from it, to keep the symbols and formatting intact.
  * If the bot program does not help though: you are limited to a lowercased,
    simple trigger, a simple sentence-cased response, and any Unicode symbols
    that may have slipped through with UTF-8 mode enabled. If you don't have a
    `! sub`stitution for the `*` symbol, you are able to create wildcard triggers
    using a vanilla RiveScript-JS environment with UTF-8 mode enabled.

For an example of an environment that is not cooperative but works anyway
(enable UTF-8 mode and you can create wildcard triggers):
<https://play.rivescript.com/s/0r4ZYvklR9>

Or just paste the contents of `macro.rive` into
[The RiveScript Playground](https://play.rivescript.com/).

## Caveats and Security Considerations

* Adding duplicate triggers won't update the existing reply. The first of
  the triggers will always overshadow the duplicates learned later.
* Probably dangerous to use the `origMessage` approach with untrusted random
  users. They might be able to introduce syntax errors or worse.
* This doesn't defend against newline characters like `\n` appearing in
  the user's message. Combined with the `origMessage` noted previously,
  a user could conceivably inject their own JavaScript object macro.
* This is just a toy example.

If you are afraid of scripts in particular, you can disable the parsing of
JavaScript object macros appearing directly in RiveScript source files:

```javascript
var bot = new RiveScript();

// This will prevent `> object * javascript` in source code from being
// parsed and executed.
bot.setHandler("javascript", null);

// Don't worry, you can still define macros from the program side!
bot.setSubroutine("learn", function(rs, args) {
  // You'll need to copy the macro from `macro.rive` here. Alternatively,
  // load macro.rive first and then disable the JavaScript handler, so
  // that any macros in `learned.rive` won't parse.
})
```

## Example

The `bot.js` loads a few useful files from the example brain, but leaves
it mostly a blank slate for _you_ to teach it new replies.

There is a `*` trigger in `star.rive` that teaches you how to teach the
bot whenever you say something it couldn't match.

The `bot.js` cooperates with the macro by setting the `origMessage`. On
reload of the bot program, it will parse the replies learned in
`learned.rive` automatically.

```
% cd eg/learning
% node bot.js
> Hello
[Soandso] Hello
[Bot] I don't know how to reply to that. Why not teach me?

Just say: when I say hello you say (what you want me to say)

For example: when I say hello bot you say hello human.

> when I say hello you say Hello human!
[Soandso] when I say hello you say Hello human!
[Bot] I have learned: when you say "hello" I should say "Hello human!"

> Hello
[Soandso] Hello
[Bot] Hello human!

> My name is Noah
[Soandso] My name is Noah
[Bot] Nice to meet you, Noah.

> Who is Kirsle?
[Soandso] Who is Kirsle?
[Bot] I don't know how to reply to that. Why not teach me?

Just say: when I say who is kirsle you say (what you want me to say)

For example: when I say hello bot you say hello human.

> when I say who is * you say I've never heard of <formal> before in my life!!
[Soandso] when I say who is * you say I've never heard of <formal> before in my life!!
[Bot] I have learned: when you say "who is *" I should say "I've never heard of Undefined before in my life!!"

> Who is Kirsle?
[Soandso] Who is Kirsle?
[Bot] I've never heard of Kirsle before in my life!!

> Who is Linus Torvalds?
[Soandso] Who is Linus Torvalds?
[Bot] I've never heard of Linus Torvalds before in my life!!
```

And the contents of `learned.rive` afterwards:

```
! version = 2.0
! local concat = none

+ hello
- Hello human!

+ who is *
- I've never heard of <formal> before in my life!!
```
