# Changes

* 1.03 2014-02-05
  - Create a `_clone()` function to clone user variables for `getUservars()`
    and `freezeUservars()` instead of needing a dependency on
    `jQuery.extend()`

* 1.02 2013-11-25
  - Change preferred file extension for RiveScript documents to `.rive`.
    Backwards compatibility for loading `.rs` is still included.
  - Add `currentUser()` method, useful inside of JS objects to get the
    current user's ID (to be able to programmatically set/retrieve
    variables for example).

* 1.00 2012-08-03
  - Initial version completed.

vim:ft=markdown
