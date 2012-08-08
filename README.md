RiveScript-JS
=============

INTRODUCTION
------------

This is a RiveScript interpreter library for JavaScript.
RiveScript is a scripting language for chatterbots, making it
easy to write trigger/response pairs for building up a bot's
intelligence.

This library can be used both in a web browser or as a Node.JS
module. See the `eg/` folder for a web browser example. There's
a `node/` folder with a Node.JS example.

USAGE
-----

	var bot = new RiveScript();

	// Load a directory full of RiveScript documents (.rs files). This is for
	// Node.JS only: it doesn't work on the web!
	bot.loadDirectory("brain", loading_done, loading_error);

	// Load an individual file.
	bot.loadFile("brain/testsuite.rs", loading_done, loading_error);

	// Load a list of files all at once (the best alternative to loadDirectory
	// for the web!)
	bot.loadFile([
		"brain/begin.rs",
		"brain/admin.rs",
		"brain/clients.rs"
	], loading_done, loading_error);

	// All file loading operations are asynchronous, so you need handlers
	// to catch when they've finished. If you use loadDirectory (or loadFile
	// with multiple file names), the success function is called only when ALL
	// the files have finished loading.
	function loading_done (batch_num) {
		console.log("Batch #" + batch_num + " has finished loading!");

		// Now the replies must be sorted!
		bot.sortReplies();

		// And now we're free to get a reply from the brain!
		var reply = bot.reply("local-user", "Hello, bot!");
		console.log("The bot says: " + reply);
	}

	// It's good to catch errors too!
	function loading_error (batch_num, error) {
		console.log("Error when loading files: " + error);
	}

COPYRIGHT AND LICENSE
---------------------

The JS RiveScript interpreter library is dual licensed. For open
source applications the module is using the GNU General Public License. If
you'd like to use the RiveScript module in a closed source or commercial
application, contact the author for more information.

	RiveScript - Rendering Intelligence Very Easily
	Copyright (C) 2012 Noah Petherbridge

	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

SEE ALSO
--------

The official RiveScript website, http://www.rivescript.com/
