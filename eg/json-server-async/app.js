// Asynchronous Objects Example
// See the accompanying README.md for details.

// Run this demo: `node weatherman.js`

var readline = require("readline");
var request = require("request");
var colors = require('colors');

// Configuration: get an API key from http://openweathermap.org/appid and
// put it in this variable.
const APPID = 'CHAMGEME';

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.

var express = require("express"),
    cookieParser = require('cookie-parser')
    bodyParser = require("body-parser"),
    RiveScript = require("../../lib/rivescript.js");

var rs = new RiveScript({utf8: true});

var mytest = function(location, callback) {
      callback.call(this, null, location + " parsed");
};


rs.setSubroutine("mytest", function (rs, args)  {
  return new rs.Promise(function(resolve, reject) {
    mytest(args.join(' '), function(error, data){
      if(error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
})

var getWeather = function(location, callback) {
  request.get({
    url: "http://api.openweathermap.org/data/2.5/weather",
    qs: {
      q: location,
      APPID: APPID
    },
    json: true
  }, function(error, response) {
    if (response.statusCode !== 200) {
      callback.call(this, response.body);
    } else {
      callback.call(this, null, response.body);
    }
  });
};


rs.setSubroutine("getWeather", function (rs, args)  {
  return new rs.Promise(function(resolve, reject) {
    getWeather(args.join(' '), function(error, data){
      if(error) {
        reject(error);
      } else {
        resolve(data.weather[0].description);
      }
    });
  });
});

rs.setSubroutine("checkForRain", function(rs, args) {
  return new rs.Promise(function(resolve, reject) {
    getWeather(args.join(' '), function(error, data){
      if(error) {
        console.error('');
        reject(error);
      } else {
        var rainStatus = data.rain ? 'yup :(' : 'nope';
        resolve(rainStatus);
      }
    });
  });
});

// Create a prototypical class for our own chatbot.
var AsyncBot = function(onReady) {
    var self = this;

    if (APPID === 'change me') {
        console.log('Error -- edit weatherman.js and provide the APPID for Open Weathermap.'.bold.yellow);
    }

    // Load the replies and process them.
    //rs.loadDirectory("../brain", function() {
    //  rs.sortReplies();
    //  onReady();
    //});

    
    // Load the replies and process them.
	rs.loadFile("weatherman.rive", function() {
	    rs.sortReplies();
	    onReady();
	});
    
    // This is a function for delivering the message to a user. Its actual
    // implementation could vary; for example if you were writing an IRC chatbot
    // this message could deliver a private message to a target username.
    self.sendMessage = function(username, message) {
      // This just logs it to the console like "[Bot] @username: message"
      console.log(
        ["[Brick Tamland]", message].join(": ").underline.green
      );
    };

    // This is a function for a user requesting a reply. It just proxies through
    // to RiveScript.
    self.getReply = function(username, message, callback) {
      return rs.replyAsync(username, message, self).then(function(reply){
        callback.call(this, null, reply);
      }).catch(function(error) {
        callback.call(this, error);
      });
    }
};

// Create and run the example bot.
var bot = new AsyncBot(function() {

    // Set up the Express app.
    var app = express();

    app.use(cookieParser());
    
    // Parse application/json inputs.
    app.use(bodyParser.json());
    app.set("json spaces", 4);

    // Set up routes.
    app.post("/reply", getReply);
    app.get("/", showUsage);
    app.get("*", showUsage);

    // Start listening.
    app.listen(2001, function() {
	console.log("Listening on http://localhost:2001");
    });
});

// POST to /reply to get a RiveScript reply.
function getReply(req, res) {
    // Get data from the JSON post.
    var message  = req.body.message;
    var vars     = req.body.vars;
    var username;
    
    if (req.cookies.username) {
	username = req.cookies.username;
    } else {
	username = req.connection.remoteAddress;
	console.log(username);
	res.cookie('username', username, { maxAge: 100000 * 60 });
    }
    
    // Make sure username and message are included.
    if (typeof(message) === "undefined") {
		return error(res, "message is a required key");
    }
    
    // Copy any user vars from the post into RiveScript.
    if (typeof(vars) !== "undefined") {
	for (var key in vars) {
	    if (vars.hasOwnProperty(key)) {
		rs.setUservar(username, key, vars[key]);
	    }
	}
	rs.setUservar(username, "username", username);
    }

    var reply = bot.getReply(username, message, function(error, reply){
        if (error) {
            res.json({
		"status": "ko",
		"reply": error,
		"vars": vars
	    });
        } else {
	    // Get all the user's vars back out of the bot to include in the response.
	    vars = rs.getUservars(username);
	    
	    // Send the JSON response.
	    res.json({
		"status": "ok",
		"reply": reply,
		"vars": vars
	    });
        }
    });
	   
};

// All other routes shows the usage to test the /reply route.
function showUsage(req, res) {
	var egPayload = {
		"username": "soandso",
		"message": "Hello bot",
		"vars": {
			"name": "Soandso"
		}
	};
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.write("Usage: curl -i \\\n");
	res.write("   -H \"Content-Type: application/json\" \\\n");
	res.write("   -X POST -d '" + JSON.stringify(egPayload) + "' \\\n");
	res.write("   http://localhost:2001/reply");
	res.end();
}

// Send a JSON error to the browser.
function error(res, message) {
	res.json({
		"status": "error",
		"message": message
	});
}


