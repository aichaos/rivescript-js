# Changes

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
