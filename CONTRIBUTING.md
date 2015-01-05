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

Run JS linting with `grunt jshint` and fix any issues that occur.

When finished, run `grunt` to create the minified JS file.

Push to your fork and [submit a pull request](https://github.com/kirsle/rivescript-js/compare/).

At this point you're waiting on me. I'm usually pretty quick to comment on pull
requests (within a few days) and I may suggest some changes or improvements
or alternatives.

Some things that will increase the change that your pull request is accepted:

* Follow the style guide at <http://www.rivescript.com/contributing>
* Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).
