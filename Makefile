PATH  := node_modules/.bin:$(PATH)
SHELL := /bin/sh

ifndef VERBOSE
.SILENT:
endif

BUILD=$(shell git describe --always)
CURDIR=$(shell pwd)

bundle:
	babel webpack.config.es6.js --presets env -o webpack.config.js
	webpack --mode production --module-bind js=babel-loader
	# babel-node build/build.js --presets env
	test

clean:
	rm -rf dist
	modclean

reinstall:
	rm -rf node_modules
	rm -f yarn.lock
	rm -f yarn-error.log
	yarn install \
	--silent \
	--ignore-optional \
	--link-duplicates \
	--skip-integrity-check
	modclean

latest:
	yarn upgrade -L -E \
	--silent \
	--ignore-optional \
	--link-duplicates \
	--skip-integrity-check
	modclean

modclean:
	modclean --patterns="default:*" 

lint:
	eslint --ext .js .

fix:
	eslint --fix --ext .js .

setup: clean
	yarn install
	yarn install -g babel-cli webpack uglify-js istanbul modclean

run:
	node shell.js eg/brain

test:
	istanbul test
