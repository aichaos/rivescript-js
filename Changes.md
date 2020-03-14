# Changes

## 2.1.0 - Mar 13 2020

- The RiveScript `shell.js` script is now installed as a command line program
  when you `npm install rivescript`. Call it like `riveshell /path/to/brain`
  or, if installed locally, `npx riveshell /path/to/brain`
- TypeScript definition fixes.

## 2.0.0: The Async/Await Update

This is a major new version of RiveScript. It adds async/await support and
makes the API asynchronous everywhere. It also decaffeinates the code,
migrating it from CoffeeScript back to native ES2015+ with modern syntax.

See the [Upgrading-v2](https://github.com/aichaos/rivescript-js/blob/master/Upgrading-v2.md) document for information about what's
new and how to upgrade your code.

v2.0.0 last minute changes:

- Fix a bug where `<reply>` in `+Trigger` wasn't being formatted properly
  (lowercased, etc.) so matching was difficult.
- Add a Redis driver for an example User Variable Session Manager that
  stores variables directly to the cache, and an `eg/redis` example bot
  that demonstrates it.
- Write documentation for final v2.0.0 launch.

### 2.0.0-beta.1 - Jan 16 2019

- Republish to npm after updating TypeScript definitions.
- Move release status to "beta"

Before 2.0.0 final release there should be at least one User Variable Session
Driver implemented (likely Redis) to verify the session interface is working
as intended.

### 2.0.0-alpha.6 - Jul 9 2018

- Make `loadFile()` and `loadDirectory()` backwards compatible so "simple" bots
  won't need to change anything to upgrade, but will get deprecation warnings
  instead. ("Simple" bots used `loadFile()` or `loadDirectory()` in conjunction
  with `replyAsync()`, and didn't use any other functions that changed).

### 2.0.0-alpha.5 - Jul 7 2018

- Fix `<botstar>` not working at all.
- Make `loadFile()` and `loadDirectory()` promise-based.
- Add the User Variable Session Manager Interface and break backwards
  compatibility on **all** methods that use user variables (e.g.
  `getUservar()`, `lastMatch()`, etc.)

### 2.0.0-alpha.3 - June 23 2018

- Fix a runtime error when `<input>` is used in a trigger.
- Reformatted the unit tests to use ES2015 multi-line string literals.

### 2.0.0-alpha.2 - June 16 2018

- Decaffeinate the source code from CoffeeScript back into native JavaScript.
- Add async/await support into the reply process, which enables support for
  a lot of new async features, including use of `<call>` tags in
  `*Condition` checks and for replacing the user variable session manager
  with one backed by a database.
- **Deprecated:** `replyAsync()`. See details below.




## 1.0.0 Releases

### 1.19.0 - March 4 2018

- Add the new `?Keyword` command to work around the problem that Unicode
  text wouldn't match properly with optional wildcards. For example,
  `+ [*] 你好 [*]` wasn't able to match messages containing the word "你好"
  in the same way as it would if the keyword were using only ASCII symbols.
  Now, the command `? 你好` will allow you to match that keyword anywhere in
  a user's message. (PR #256)

### 1.18.0 - November 27 2017

- Fix an infinite loop when using a number as a substitution (PR #206)
- Optimize substitution algorithm (including person substitutions) to be
  more performant when you have a large set of substitutions defined (PR #208)
- Add support for defining a global concatenation option when constructing
  the RiveScript object. This will set the default concat mode when
  parsing files that didn't define their own local mode (PR #209)
- Add API function `lastTriggers(username)` to retrieve the full set of
  triggers that were last matched for that user. For example, if some triggers
  redirected to others, all the triggers that were touched will be
  returned by this function (PR #217)
- Remove dependency on jQuery for loading files in a web environment and
  instead use a standard `XMLHttpRequest` (PR #251)

### 1.17.2 - January 19 2017

- Fix `<call>` tags not working inside of the `@Redirect` command and the
  inline redirect `{@}` tag. Note that only *synchronous* object macros that
  return a string response are allowed in these, just like in `*Condition`
  commands (PR #203)

### 1.17.1 - December 12 2016

- Fix sorting algorithm for triggers with `%Previous`, making their sort order
  deterministic and correct regardless of the order they appeared in the
  source file (PR #194)
- Fix the function prototype for `getVariable` to only accept the `name`
  parameter for a bot variable. Previously it was accepting `(username, name)`
  which was incorrect because bot variables are global and have no relation
  to a particular username.

### 1.17.0 - October 11 2016

- Fix accidental double-piped wildcards caused by missing arrays (PR #176).
- Fix tags like `{uppercase}` in the BEGIN block from affecting object macros
  before they could be called (bug #178).
- In the parser, include the current topic in some common error messages, such
  as syntax errors, single-character lines and unknown commands (bug #140).
- Allow `forceCase` to apply to topics too, both in the `> topic` command and
  in the `{topic=...}` tag (bug #158).
- In case of deep recursion while scanning topic inheritance trees, the error
  now includes the current topic that it gave up on (bug #167).

### 1.16.0 - September 6 2016

- Add TypeScript declaration files (PR #162).
- Add a `--watch` option to `shell.js` to automatically reload the bot's
  brain when the source files change (PR #160).
- Fix the `json-server` example not giving errors correctly (passing invalid
  data into the RiveScript library and potentially raising an exception
  from within there; bug #165).

### 1.15.0 - August 7 2016

- Add a new contructor option, `forceCase`, which will force-lowercase your
  triggers during parse time, enabling authors to use uppercase letters in
  triggers without it being a syntax error. Do note however that Unicode
  case folding can become an issue with certain symbols. (Bugs #143 and #69).
- Fix a bug where inline redirects, like `{@ hello}` would fail to match their
  trigger due to the presence of a space between the `@` and text (bug #145).
- Add a non-fatal warning at parse time if it's detected that you used an
  `@Redirect` command in conjunction with a `-Reply` or `*Condition`. In such
  cases, the redirect "wins" and preempts the others, which may be surprising
  behavior, and RiveScript will warn you about this now (bug #58).
- Prevent errors from arising when the user's history object is invalid, for
  example if somebody manually overrode the `__history__` user
  variable (PR #151).
- Fix a bug in the `write()` function where `-Replies` were being written when
  a trigger actually had no reply (resulting in a single-character `-`
  command which raises an error when re-parsed) (PR #141).
- Add more documentation to the `rs.Promise` function, including a full
  example of how to use the `replyAsync()` method (bug #144).

### 1.14.0 - July 9 2016

- Add a new API function: `getUserTopicTriggers` returns a list of triggers
  available from a user's current topic, including triggers that came from
  topics inherited/included by their topic (PR #138).
- Change how the parser handles inline comments (`//` appearing on the same
  line as RiveScript code). Previously, it required at least one space to
  be present on either side of the `//` characters. Now, it only requires a
  space *before* the `//`.
- Add new examples: using RiveScript as a router, and a link to a plugin for
  using RiveScript with Hubot.
- Add a new ASCII logo to the header output of `shell.js` and `shell.coffee`

### 1.13.0 - June 14 2016

- Fix the `<call>` tags not being executed on the left side of conditionals,
  so that `<call>test</call> == true => Success` types of conditions should
  work (bug #107).
- Fix trigger regexp processing so that if a `{weight}` tag contains a space
  before or after it (or: a space between `{weight}` and the rest of the
  trigger text), the spaces are also stripped so that matching isn't broken
  for that trigger (bug #102).
- Rename the old `async-object` example to `second-reply` to lessen confusion
  between it and `async-reply` (bug #123).
- Fix the `_` wildcard not being able to match Unicode letters (bug #118).
- Add `initialMatch()` to the API, which is like `lastMatch()` but it returns
  the original trigger that the user matched instead of a redirected trigger
  (PR #127).

### 1.12.2 - May 16 2016

- Call the error handler on `loadDirectory()` when the directory doesn't exist
  or isn't a directory (bug #117).
- Include the `dist/` directory on npm for easy web browser embedding using
  unpkg.

### 1.12.1 - May 5 2016

- Fix the `<call>...</call>` regular expression to match line break characters
  and preserve them in the argument list sent to an object macro (bug #108).

### 1.12.0 - April 17 2016

- Fix the `stringify()` function to also escape newlines on conditionals.
- Various fixes to "pipe syntax" for arrays, optionals and alternations;
  having a "blank" entry separated by pipes (e.g. a trailing or leading pipe)
  would cause matching issues. These have been fixed and a syntax error is
  given if this is detected at parsing time.
- Added additional documentation for the usage of `deparse()` and related
  functions to the `eg/deparse` directory.

### 1.10.0 - March 30 2016

- Fix a bug where `! local concat` settings wouldn't apply to the first
  continuation of a conditional (bug #88)
- Add the ability to override certain common error messages with custom text,
  for the cases where a trigger wasn't matched, when a trigger *was* matched
  but no reply was given, when an object macro wasn't found, and when deep
  recursion errors arise (bug #90)
- Fix a bug where the `<@>` syntax for a redirect fails when `<star1>` is
  undefined (bug #92)
- Fix the `stringify()` function to escape newline characters so that the
  resulting code doesn't have syntax errors when reloading it (bug #95)
- Fix some triggers in the default example brain to account for substitution
  on the bot's previous reply (bug #87)
- Add command line arguments to `shell.js` and `shell.coffee`: use `--debug`
  to enable verbose debug logging and `--utf8` to enable UTF-8 mode.

### 1.8.0 - March 18 2016

- Update the way the `args` array works in JavaScript object macros: it now
  uses a shell-style array where quoted strings come in as one array element,
  even if it contains spaces.
- Update all internal user variable getting/setting to use the public
  `setUservar()` and `getUservar()` methods, enabling developers to override
  the implementation of these functions.
- Fix a bug when looking for `%Previous` tags, so that if the current topic
  has no `%Previous` trigger RiveScript won't bother looking for them.

### 1.6.0 - March 8 2016

- Update the `deparse()` and `stringify()` functions to include the source
  code of JavaScript object macros in the output.
- Update the `loadDirectory()` function to load RiveScript files recursively.

### 1.4.0 - February 11 2016

- Add support for asynchronous object macros (using promises via RSVP.js),
  and the accompanying `replyAsync()` function and example code.
- Add ability to use an array in a reply element as a shortcut for random
  text: `- (@myArray)` translates to `- {random}my|array|content{/random}`.

### 1.2.1 - February 3 2016

- Fix `setSubroutine()` not accepting a function object as an argument.

### 1.2.0 - December 29 2015

- Fix looping over object keys by adding a check for `hasOwnProperty()`, to
  prevent third party JavaScript libraries from modifying the root `Object`
  prototype and breaking RiveScript (bug #60)
- Consolidate multiple spaces in a user's input message into just one space
  to prevent issues with matching triggers (bug #57)
- Fix a bug where `! global debug = true` in RiveScript code wouldn't actually
  adjust the debug mode. Also do the same for `! global depth` (bug #54)
- Add methods `deparse()`, `stringify()` and `write()` to assist with user
  interface development (bug #61)

### 1.1.8 - December 28 2015

- Trim leading and trailing whitespace from the user's message at the end of
  `formatMessage()` (bug #53)
- Fix `<add>` and `<sub>` tags using inverted logic and not actually adding or
  subtracting numbers (bug #55)

### 1.1.7 - November 19 2015

- Add `@` to the list of characters that disqualifies a trigger from being
  considered "atomic"

### 1.1.6 - October 10 2015

- Fix the regexp used when matching optionals so that the triggers don't match
  on inputs where they shouldn't. (RiveScript-JS issue #46)

### 1.1.4 - September 9 2015

- Fix a crash if a topic tries to inherit or include a topic which doesn't
  exist. Instead, a warning is given to the console when this case is
  detected.
- Add common punctuation filter for UTF-8 mode, with the ability to override
  the punctuation regexp if the user needs to.

### 1.1.2 - June 18 2015

- Fix a space split issue when parsing tags such as <set> and <get>.
- Fix quotemeta issue that caused an infinite loop when tags contained a
  question mark character.

### 1.1.0 - April 22 2015

- Add experimental support for UTF-8.
- Fix various bugs and port over unit tests from Perl/Python versions.
- New tag processing algorithm allows for <set> tag to contain <get> tags.
- Fix trigger sorting, so that triggers with matching word lengths get
  sorted by length of trigger (longest to shortest).
- Fix <bot> tag matching in triggers.
- Allow <bot> interpolation in triggers to support UTF-8.
- Use Grunt for minification (instead of the Perl minify.pl script), JS
  linting, and for running a simple web server for demoing RiveScript.
- Add setUservars() function to set multiple variables at once using an
  object.
- Fix getting user variables by adding type checking, so variables can contain
  a falsy value and not be mistaken as being undefined (bug #17).
- Add shell.js, an interactive command line shell for testing a RiveScript
  bot.
- Add support for `! local concat` option to override concatenation mode
  (file scoped)
- Rewrite code base in CoffeeScript and restructure internal data layout.

### 1.0.4 - November 25 2014

- Relicense project under the MIT License.

### 1.0.3 - February 5 2014

- Create a `_clone()` function to clone user variables for `getUservars()`
  and `freezeUservars()` instead of needing a dependency on
  `jQuery.extend()`

### 1.0.2 - November 25 2013

- Change preferred file extension for RiveScript documents to `.rive`.
  Backwards compatibility for loading `.rs` is still included.
- Add `currentUser()` method, useful inside of JS objects to get the
  current user's ID (to be able to programmatically set/retrieve
  variables for example).

### 1.0.0 - August 3 2012

- Initial version completed.

vim:ft=markdown
