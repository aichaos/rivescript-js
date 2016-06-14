# Changes

* 1.13.0 2016-06-14
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

* 1.12.2 2016-05-16
  - Call the error handler on `loadDirectory()` when the directory doesn't exist
    or isn't a directory (bug #117).
  - Include the `dist/` directory on npm for easy web browser embedding using
    npmcdn.

* 1.12.1 2016-05-05
  - Fix the `<call>...</call>` regular expression to match line break characters
    and preserve them in the argument list sent to an object macro (bug #108).

* 1.12.0 2016-04-17
  - Fix the `stringify()` function to also escape newlines on conditionals.
  - Various fixes to "pipe syntax" for arrays, optionals and alternations;
    having a "blank" entry separated by pipes (e.g. a trailing or leading pipe)
    would cause matching issues. These have been fixed and a syntax error is
    given if this is detected at parsing time.
  - Added additional documentation for the usage of `deparse()` and related
    functions to the `eg/deparse` directory.

* 1.10.0 2016-03-30
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

* 1.8.0 2016-03-18
  - Update the way the `args` array works in JavaScript object macros: it now
    uses a shell-style array where quoted strings come in as one array element,
    even if it contains spaces.
  - Update all internal user variable getting/setting to use the public
    `setUservar()` and `getUservar()` methods, enabling developers to override
    the implementation of these functions.
  - Fix a bug when looking for `%Previous` tags, so that if the current topic
    has no `%Previous` trigger RiveScript won't bother looking for them.

* 1.6.0 2016-03-08
  - Update the `deparse()` and `stringify()` functions to include the source
    code of JavaScript object macros in the output.
  - Update the `loadDirectory()` function to load RiveScript files recursively.

* 1.4.0 2016-02-11
  - Add support for asynchronous object macros (using promises via RSVP.js),
    and the accompanying `replyAsync()` function and example code.
  - Add ability to use an array in a reply element as a shortcut for random
    text: `- (@myArray)` translates to `- {random}my|array|content{/random}`.

* 1.2.1 2016-02-03
  - Fix `setSubroutine()` not accepting a function object as an argument.

* 1.2.0 2015-12-29
  - Fix looping over object keys by adding a check for `hasOwnProperty()`, to
    prevent third party JavaScript libraries from modifying the root `Object`
    prototype and breaking RiveScript (bug #60)
  - Consolidate multiple spaces in a user's input message into just one space
    to prevent issues with matching triggers (bug #57)
  - Fix a bug where `! global debug = true` in RiveScript code wouldn't actually
    adjust the debug mode. Also do the same for `! global depth` (bug #54)
  - Add methods `deparse()`, `stringify()` and `write()` to assist with user
    interface development (bug #61)

* 1.1.8 2015-12-28
  - Trim leading and trailing whitespace from the user's message at the end of
    `formatMessage()` (bug #53)
  - Fix `<add>` and `<sub>` tags using inverted logic and not actually adding or
    subtracting numbers (bug #55)

* 1.1.7 2015-11-19
  - Add `@` to the list of characters that disqualifies a trigger from being
    considered "atomic"

* 1.1.6 2015-10-10
  - Fix the regexp used when matching optionals so that the triggers don't match
    on inputs where they shouldn't. (RiveScript-JS issue #46)

* 1.1.4 2015-09-09
  - Fix a crash if a topic tries to inherit or include a topic which doesn't
    exist. Instead, a warning is given to the console when this case is
    detected.
  - Add common punctuation filter for UTF-8 mode, with the ability to override
    the punctuation regexp if the user needs to.

* 1.1.2 2015-06-18
  - Fix a space split issue when parsing tags such as <set> and <get>.
  - Fix quotemeta issue that caused an infinite loop when tags contained a
    question mark character.

* 1.1.0 2015-04-22
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

* 1.0.4 2014-11-25
  - Relicense project under the MIT License.

* 1.0.3 2014-02-05
  - Create a `_clone()` function to clone user variables for `getUservars()`
    and `freezeUservars()` instead of needing a dependency on
    `jQuery.extend()`

* 1.0.2 2013-11-25
  - Change preferred file extension for RiveScript documents to `.rive`.
    Backwards compatibility for loading `.rs` is still included.
  - Add `currentUser()` method, useful inside of JS objects to get the
    current user's ID (to be able to programmatically set/retrieve
    variables for example).

* 1.0.0 2012-08-03
  - Initial version completed.

vim:ft=markdown
