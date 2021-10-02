SHELL := /bin/bash

BUILD=$(shell git describe --always)
CURDIR=$(shell pwd)

# `make setup` to set up a new environment, pull dependencies, etc.
.PHONY: setup
setup: clean
	npm install
	npm install -g babel-cli webpack uglify-js nodeunit

# `make run` to run it in debug mode.
.PHONY: run
run:
	node shell.js eg/brain

# `make test` to run unit tests.
.PHONY: test
test:
	nodeunit test

# `make build` to build code with Babel for older JS clients.
.PHONY: build
build:
	npm run build
	npm run test

# `make dist` to create a distribution for npm.
.PHONY: dist
dist: build
	npm run dist

# `make clean` cleans everything up.
.PHONY: clean
clean:
	npm run clean
