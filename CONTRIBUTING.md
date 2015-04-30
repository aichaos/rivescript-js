# Contributing

Interested in contributing to RiveScript? Great!

First, check the general contributing guidelines for RiveScript and its primary
implementations found at <http://www.rivescript.com/contributing> - in
particular, understand the goals and scope of the RiveScript language and the
style guide for the JavaScript implementation.

# Quick Start

Fork, then clone the repo:

```bash
$ git clone git@github.com:your-username/rivescript-js.git
```

Make sure you have `node` and `npm` and set up the build dependencies:

```bash
$ npm install -g grunt-cli # If you don't already have it
$ npm install              # Install dev dependencies
```

Make your code changes in `rivescript.js` and test them either by using the
TCP example server in `node/tcp-server.js` or by using the built-in web server
by running `grunt connect:server`.

Make sure the unit tests still pass (`grunt test`), and add new unit tests if
necessary for your change.

Run JS linting with `grunt lint` and fix any issues that occur.

When finished, run `grunt` to create the minified JS file.

Push to your fork and [submit a pull request](https://github.com/aichaos/rivescript-js/compare/).

At this point you're waiting on me. I'm usually pretty quick to comment on pull
requests (within a few days) and I may suggest some changes or improvements
or alternatives.

Some things that will increase the chance that your pull request is accepted:

* Follow the style guide at <http://www.rivescript.com/contributing>
* Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

# Code Documentation Style

For this project I've adopted a JavaDoc-style documentation system for the CoffeeScript source code. Look at existing function documentation for examples, but briefly:

* Begin the comment block with two comment characters: `##`
* Each line of the comment block should begin with a `#` symbol.
* The comment block should begin with the function definition prototype (use Java style data types to denote what each parameter should be)
* Use a blank line between the function prototype and the description.
* Use [Markdown syntax](http://daringfireball.net/projects/markdown/syntax) - the documentation is generated as Markdown files and then rendered to HTML.
* End the comment block with another pair of `##` symbols.
* There should be no more comments touching the comment block (if you need a comment directly after the comment block, leave a blank line in between, or else that comment may end up becoming a part of the documentation!)

Examples:

```coffeescript
  ##
  # string processTags (string user, string msg, string reply, string[] stars,
  #                     string[] botstars, int step, scope)
  #
  # Process tags in a reply element.
  ##
  processTags: (user, msg, reply, st, bst, step, scope) ->
  
  ...
  
  ##
  # int loadFile (string path || array path[, onSuccess[, onError]])
  #
  # Load a RiveScript document from a file. The path can either be a string that
  # contains the path to a single file, or an array of paths to load multiple
  # files. `onSuccess` is a function to be called when the file(s) have been
  # successfully loaded. `onError` is for catching any errors, such as syntax
  # errors.
  #
  # This loading method is asynchronous. You should define an `onSuccess`
  # handler to be called when the file(s) have been successfully loaded.
  #
  # This method returns a "batch number" for this load attempt. The first call
  # to this function will have the batch number of 0 and that will go up from
  # there. This batch number is passed to your `onSuccess` handler as its only
  # argument, in case you want to correlate it with your call to `loadFile()`.
  #
  # `onSuccess` receives: int batchNumber
  # `onError` receives: string errorMessage[, int batchNumber]
  ##
  loadFile: (path, onSuccess, onError) ->
```

To compile the documentation, you'll need Python and the `markdown` module installed. If you can't do this, don't worry too much about it; the project maintainer will rebuild the documentation periodically. Quick start:

```bash
$ mkvirtualenv rivescript # (if you use virtualenvwrapper)
$ pip install markdown
$ python mkdoc.py
```
