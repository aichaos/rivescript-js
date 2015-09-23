# Slack Bot Example

This is an example chatbot for the [Slack](https://slack.com/) chat platform.
It can be invited to channels, it responds to people who @mention it, it
responds to messages that begin with its name, and it can chat one-on-one in
direct message sessions.

## Setup

You need to get a Slack Auth Token for the bot first. You can get one by going
to the following URL (substitute `<slack_name>` with your Slack team's name):

`https://<slack_name>.slack.com/services/new/bot`

After creating the bot, edit `config.js` and put in the bot's Auth Token.

## Usage

```bash
# First, build the JavaScript library from the CoffeeScript code. Run this from
# the root of the rivescript-js project:
$ grunt

# Then, from the slack-bot folder, install the Slackbot's dependencies and run
# the bot.
$ cd eg/slack-bot/
$ npm install
$ node slack-bot.js
[Wed Sep 23 2015 12:00:48 GMT-0700 (PDT)] INFO Connecting...
Welcome to Slack. You are admiral of YourSlackOrg
```

The bot should come online in Slack. You can test it by sending a direct
message, by @mentioning it in a channel it's participating in, or by starting
a message with the bot's name (by default, "admiral").
