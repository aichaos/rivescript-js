# User Data Persistence Example

This example demonstrates a way to persist user variables across sessions of
a chatbot, so that the bot may be shut down and restarted and it can still
remember where it left off with each user -- keeping track of user variables
such as their name, as well as the recent history of inputs and replies.

In this example, the bot asks you for a username when it starts up -- in a real
world scenario the username could come from somewhere else (i.e. if this were
an IRC bot, the user's IRC nick would be a logical thing to use). After each
reply from the bot, the user's variables are exported to a JSON file on disk
named after the username (example: `soandso.json`).

When the bot is restarted and its internal memory of user data is reset, the
user's variables can be reloaded by reading the JSON file from the hard disk.

## Usage

```bash
# From the root of the rivescript-js project, build the JS sources.
$ grunt

# From the persistence example folder, run the bot.
$ cd eg/persistence/
$ node bot.js
```

## Example Output

```
$ node bot.js
Enter your username [default: soandso]: kirsle
Hello kirsle
Type /quit to quit.

> Hello bot
Bot> How do you do. Please state your problem.
> My name is Noah
Bot> Noah, nice to meet you.
> /quit

$ node bot.js
Enter your username [default: soandso]: kirsle
Hello kirsle
Type /quit to quit.

> How are you?
Bot> What is it you really want to know?
> What is my name?
Bot> Your name is Noah.
> /quit
```

After running the bot, check the current working directory for a JSON file named
after your username. Example:

```javascript
// kirsle.json
{
  "topic": "random",
  "__history__": {
    "input": [
      "what is my name",
      "how are you",
      "my name is noah",
      "hello bot",
      "undefined",
      "undefined",
      "undefined",
      "undefined",
      "undefined",
      "undefined"
    ],
    "reply": [
      "Your name is Noah.",
      "What is it you really want to know?",
      "Noah, nice to meet you.",
      "How do you do. Please state your problem.",
      "undefined",
      "undefined",
      "undefined",
      "undefined",
      "undefined",
      "undefined"
    ]
  },
  "__lastmatch__": "(what is my name|who am i|do you know my name|do you know who i am){weight=10}",
  "__initialmatch__": "(what is my name|who am i|do you know my name|do you know who i am){weight=10}",
  "name": "Noah"
}
```

## Caveats

In this example, we read the JSON files from disk synchronously. This is
generally considered a bad practice in Node. Instead, a real chatbot would
probably pre-load user data for *all* users it knows about during its startup
process, so that reading files from disk won't cause latency when the bot is
actually fetching a reply for a user.

When saving user variables, on the other hand, this example writes the files
asynchronously.
