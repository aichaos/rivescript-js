# Data sorting functions

## string[] sortTriggerSet (string[] triggers[, exclude_previous[, func say]])

Sort a group of triggers in an optimal sorting order. The `say` parameter is
a reference to RiveScript.say() or provide your own function (or not) for
debug logging from within this function.

This function has two use cases:

1. create a sort buffer for "normal" (matchable) triggers, which are triggers
   which are NOT accompanied by a %Previous tag.
2. create a sort buffer for triggers that had %Previous tags.

Use the `exclude_previous` parameter to control which one is being done.
This function will return a list of items in the format of
`[ "trigger text", trigger pointer ]` and it's intended to have no duplicate
trigger patterns (unless the source RiveScript code explicitly uses the
same duplicate pattern twice, which is a user error).

## string[] sortList (string[] items)

Sort a list of strings by their word counts and lengths.

## private object initSortTrack ()

Returns a new object for keeping track of triggers for sorting.