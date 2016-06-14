# JSON Server

This example demonstrates embedding RiveScript in a Nodejs web server,
accessible via a JSON endpoint.

This uses Expressjs to create a super simple web server that accepts JSON POST
requests to `/reply` and responds with JSON output.

## Run the Example

```bash
# Build the JavaScript sources from the CoffeeScript first. Run these from
# the root of the rivescript-js repo.
$ npm install
$ grunt

# Then, from the eg/json-server directory, install the JSON server's
# dependencies (expressjs, etc.)
$ npm install

# And run the server.
$ node server.js
```

And then from another terminal, you can use `curl` to test the JSON endpoint for
the chatbot. Or, you can use your favorite REST client.

## API Documentation

This simple Express server only has one useful endpoint: `POST /reply`. All
other endpoints will return simple usage instructions (basically, a `curl`
command that you can paste into a terminal window).

### POST /reply

**Parameters (`application/json`):**

```json
{
	"username": "Soandso",
	"message": "Hello, bot!",
	"vars": {
		"name": "Soandso",
		"age": "10"
	}
}
```

The required parameters are `username` and `message`. You can provide `vars` to
send along user variables.

**Response:**

```json
{
	"status": "ok",
	"reply": "Hello human!",
	"vars": {
		"topic": "random",
		"name": "Soandso",
		"age": "10",
		"__history__": {},
		"__lastmatch__": "hello bot"
	}
}
```

The response includes `status` ("ok" or "error"), `reply` which is the bot's
response, and `vars` which are the user variables. To keep state between
requests, you should send *back* the `vars` data with the following request.
For example if the first request said "my name is soandso", `vars.name` will
be "Soandso" in the response. Passing the same `vars` back with the next
request will cause the bot to "remember" the name, and be able to keep track of
the user over multiple requests.

In case of error, a `message` key will contain the error message.

## Example Output

```bash
curl -i \
   -H "Content-Type: application/json" \
   -X POST -d '{"username":"soandso","message":"hello bot"}' \
   http://localhost:2001/reply
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 913
ETag: W/"391-AgDgznci+rSclUCAK4w2EA"
Date: Tue, 19 Jan 2016 00:49:27 GMT
Connection: keep-alive

{
    "status": "ok",
    "reply": "How do you do. Please state your problem.",
    "vars": {
        "topic": "random",
        "__history__": {
            "input": [
                "hello bot",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined"
            ],
            "reply": [
                "How do you do. Please state your problem.",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined",
                "undefined"
            ]
        },
        "__lastmatch__": "(hello|hi|hey|howdy|hola|hai|yo) [*]",
        "__initialmatch__": "(hello|hi|hey|howdy|hola|hai|yo) [*]"
    }
}
```
