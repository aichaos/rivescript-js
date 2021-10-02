# Web Client Example

This is an example of embedding a RiveScript bot into a web page, i.e. to be
served from a web server like Apache or nginx.

**Note:** this example requires a web server. Modern browsers have security
features preventing a local web page from accessing other local files, so if you
open `chat.html` by double-clicking in your file browser it probably won't be
able to read the `.rive` files the bot needs.

One simple solution is to use the Nodejs `http-server` command:

```bash
# If you don't already have http-server:
% npm install -g http-server

# From the root of the rivescript-js project...
% cd ~/git/rivescript-js

# Build the `dist/rivescript.js` packed for the web browser, and then run
# the Node http-server.
% npm run dist
% http-server
```

And then visit <http://127.0.0.1:8080/eg/web-client/chat.html> to load the
web client in your browser.

Another alternative, if you have Python installed (if you're on Mac or Linux,
you probably do) is to just run `python -m SimpleHTTPServer` from the root
of the rivescript-js project. Do remember to run `npm run dist` though!

## Usage: Built-in Server

To test this example using the built-in server:

```bash
# Install dependencies (run from the root of the rivescript-js project)
$ npm install

# Start the built-in server. This also automatically opens your web browser
# to the correct URL.
$ grunt server
```

## Usage: Hosted on an External Server

To upload this example to an external server such as Apache, you'll need to
change a couple of paths around:

1. Upload all the contents of the `eg/web-client` folder to your server.
2. Run `grunt dist` and upload `dist/rivescript.js` into the same folder as
   `chat.html`
3. Copy the `eg/brain` folder into the same place as `chat.html` (keep the
   folder structure intact).
4. Edit `chat.html` in your favorite text editor and remove the `../lib/` from
   in front of `rivescript.js` on line 9.

The directory structure on your web server should look like this:

```
/brain
    /admin.rive
    /begin.rive
    /...
/chat.css
/chat.html
/datadumper.js
/jquery-1.7.2.min.js
/rivescript.js
```

And the top of `chat.html` (line 9) should look like:

```html
<script type="text/javascript" src="rivescript.js"></script>
```
