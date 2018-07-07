'use strict';

// Example QuickBlox bot for RiveScript-JS.
//
// To run this bot, edit 'CONFIG' variable below to fill in your QuickBlox settings for the bot.
//
// Run this demo: `node index.js`

require("babel-polyfill");
const QB = require('quickblox');

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
const RiveScript = require("../../lib/rivescript");

// In order to start develop you first Chat Bot you have to register new QuickBlox account and create your first application.
// Go to https://quickblox.com/signup and get a QuickBlox account, then go to https://admin.quickblox.com/apps/new
// and create your first application. Then put here Application ID, Authorization key, Authorization secret.
//
// also
//
// Go to Users module in QuickBlox dashboard
// (e.g. <your_app_id>/service/users https://admin.quickblox.com/apps/<your_app_id>/service/users) and create
// new user for you chat bot. Then put here user's ID, password, login and full name.
//
const CONFIG = {
	"appId": "...",
	"authKey": "...",
	"authSecret": "...",
	"user": {
		"id": "...",
		"login": "...",
		"password": "...",
		"fullname": "..."
	}
};

// Init RiveScript logic
var riveScriptGenerator = new RiveScript();

function loadingDone(batch_num) {
	console.log(`[RiveScript] Batch #${batch_num} has finished loading!`);
	riveScriptGenerator.sortReplies();
}

function loadingError(batch_num, error) {
	console.log(`[RiveScript] Load the batch #${batch_num} is failed`, JSON.stringify(error));
}

riveScriptGenerator.loadDirectory('../brain').then(loadingDone).catch(loadingError);


// Initialise QuickBlox
QB.init(CONFIG.appId, CONFIG.authKey, CONFIG.authSecret);

var qbListeners = {
	// Contact list listener
	onSubscribeListener: function onSubscribeListener(userId) {
		console.log(`[QB] onSubscribeListener. Subscribe from ${userId}`);

		QB.chat.roster.confirm(userId, function() {
			console.log(`[QB] Confirm subscription from user ${userId}`);
		});
	},

	// System messages listener
	onSystemMessageListener: function onSystemMessageListener(msg) {
		if(msg.extension.notification_type === '1'){
			console.log(`[QB] The user ${msg.userId} adds you to dialog`);

			var roomJid = QB.chat.helpers.getRoomJidFromDialogId(msg.extension.dialog_id);

			QB.chat.muc.join(roomJid);
		}
	},

	// Chat messages listener
	onMessageListener: function onMessageListener(userId, msg) {
		var answer;

		// process group chat messages
		if (msg.type == 'groupchat') {

			// - skip own messages in the group chat, don't replay to them
			// - reply only when someone mentions you. For example: "@YourBotBestFriend how are you?"
			var mentionStartIndex = -1;
			var mentionPattern = '@' + CONFIG.user.fullname;
			var mentionLength = mentionPattern.length;

			if(msg.body){
				mentionStartIndex = msg.body.indexOf(mentionPattern);
			}

			if(userId != CONFIG.user.id && mentionStartIndex >= 0){
				// build a reply
				var realBody;

				if(mentionStartIndex === 0 && msg.body.substring(mentionLength, mentionLength+1) == ' '){
					realBody = msg.body.substring(mentionLength + 1);
				}else{
					realBody = "What's up? I react only for commands like this: '@YourBotBestFriend <text>'";
				}

				riveScriptGenerator.reply(userId, realBody).then(function(reply) {
					answer = {
						type: 'groupchat',
						body: reply,
						extension: {
							save_to_history: 1
						}
					};

					QB.chat.send(QB.chat.helpers.getRoomJidFromDialogId(msg.dialog_id), answer);
				});

			}

			// process 1-1 messages
		} else if (msg.type == 'chat') {
			if(msg.body){
				riveScriptGenerator.reply(userId, msg.body).then(function(reply) {
					answer = {
						type: 'chat',
						body: reply,
						extension: {
							save_to_history: 1
						}
					};

					QB.chat.send(userId, answer);
				})

			}
		}
	}
};

// Create QuickBlox session
QB.createSession({
	login: CONFIG.user.login,
	password: CONFIG.user.password
}, (createSessionError, res) => {
	if(createSessionError) {
		console.error('[QB] createSession is failed', JSON.stringify(createSessionError));
		process.exit(1);
	}

	// Connect to Real-Time Chat
	QB.chat.connect({
		userId: CONFIG.user.id,
		password: CONFIG.user.password
	}, (chatConnectError) => {
		if (chatConnectError) {
			console.log('[QB] chat.connect is failed', JSON.stringify(chatConnectError));
			process.exit(1);
		}

		console.log('[QB] bot is up and running');

		// Retireve all group chats where bot is in occupants list.
		QB.chat.dialog.list({type: 2}, (dialogListError, dialogList) => {
			if(dialogListError){
				console.log('[QB] dialog.list is failed', JSON.stringify(dialogListError));
				process.exit(1);
			}

			// Join bot's group chats
			dialogList.items.forEach((dialog) => {
				QB.chat.muc.join(dialog.xmpp_room_jid);
			});
		});

		// Add listeners
		QB.chat.onMessageListener = qbListeners.onMessageListener;
		QB.chat.onSubscribeListener = qbListeners.onSubscribeListener;
		QB.chat.onSystemMessageListener = qbListeners.onSystemMessageListener;
	});
}
);

process.on('exit', function () {
	console.log('The qbot is gone.');
	QB.chat.disconnect();
});
