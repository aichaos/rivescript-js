/*
Redis Driver for RiveScript User Variable Session Manager.
*/

const redis = require("redis");

// debug function
var Debug = false;
function say(arguments) {
	if (Debug) {
		console.log(arguments);
	}
}

/**
 * RedisSessionManager provides a Redis-backed session store for RiveScript.
 */
class RedisSessionManager {
	/**
	 * RedisSessions(redisOptions)
	 *
	 * Initialize the Redis session manager. The constructor object is passed
	 * directly to the underlying Redis module.
	 */
	constructor(opts) {
		this._prefix = typeof(opts) === "object" ? opts.prefix : null;
		this._client = redis.createClient(opts);
	}

	// init loads the user's session object from Redis. If they don't exist in
	// Redis, it returns a new default session (but will not create a Redis
	// entry until you actually save variables for the user the first time).
	async init(username) {
		let self = this;

		let data = await self.redisGet(username);
		if (data === null) {
			say("init: user ${username} not found, create default session");
			data = self.defaultSession();
			await self.redisSet(username, data);
		}

		return data;
	}

	// method to retrieve JSON value from a Redis key
	async redisGet(key) {
		let self = this;

		// Redis module doesn't have a Promise-based API, so wrap it in
		// a Promise for easy use.
		return new Promise((resolve, reject) => {
			self._client.get(key, (err, reply) => {
				if (reply === null) {
					resolve(null);
					return;
				}

				let data = JSON.parse(reply.toString());
				resolve(data);
			});
		});
	}

	// method to delete a Redis key
	async redisDel(key) {
		let self = this;

		// Redis module doesn't have a Promise-based API, so wrap it in
		// a Promise for easy use.
		return new Promise((resolve, reject) => {
			self._client.del(key, (err, reply) => {
				resolve();
			});
		});
	}

	// method to store a JSON object to a Redis key
	async redisSet(key, data) {
		let self = this;
		let serialized = JSON.stringify(data, null, 2);
		return new Promise((resolve, reject) => {
			self._client.set(key, serialized, (err, reply) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			})
		});
	}

	// method to run a KEYS operation in Redis as a Promise
	async redisKeys(pattern) {
		let self = this;
		return new Promise((resolve, reject) => {
			self._client.keys(pattern, (err, replies) => {
				resolve(replies);
			})
		})
	}

	// method to get all usernames in storage
	async allUsernames() {
		// Redis key search pattern.
		let pattern = "*"
		if (this._prefix !== null) {
			pattern = this._prefix + pattern;
		}

		let keys = await this.redisKeys(pattern);
		let usernames = keys.map((el) => {
			let prefix = this._prefix === null ? "" : this._prefix;
			return el.replace(new RegExp("^" + prefix), "");
		});

		return usernames;
	}

	/*
	The functions below implement the RiveScript SessionManager interface.
	https://github.com/aichaos/rivescript-js/blob/master/src/sessions.js
	*/

	defaultSession() {
		return {
			"topic": "random"
		}
	}

	async set(username, data) {
		// Initialize the user if they don't exist in Redis or load their
		// existing session object.
		let session = await this.init(username);

		for (var key of Object.keys(data)) {
			if (data.hasOwnProperty(key)) {
				session[key] = data[key];
			}
		}

		await this.redisSet(username, session);
	}

	// get a specific user variable key
	// returns null if username is not found in session store
	// returns the string "undefined" if the user variable was not set
	//    for that username (but the username does exist)
	// otherwise returns the value of the user variable, usually a string type.
	async get(username, key) {
		let session = await this.redisGet(username);

		// User not found?
		if (session === null) {
			say(`get(${username},${key}): session did not exist`);
			return null;
		}

		// Key not set for user?
		if (session[key] === undefined) {
			say(`get(${username},${key}): username exists, but key not set`);
			return "undefined"; // the classic RiveScript undefined string
		}

		say(`get(${username},${key}): found value ${session[key]}`);
		return session[key];
	}

	// get the entire set of user variables as an object.
	// returns null if username not found in session store.
	async getAny(username) {
		let session = await this.redisGet(username);
		return session;
	}

	// getAll returns ALL user variables stored in your Redis cache as an array
	// of objects.
	async getAll() {
		let self = this;

		let usernames = await this.allUsernames();

		let result = {};
		for (let user of usernames) {
			result[user] = await self.getAny(user);
		}

		return result;
	}

	// reset all user data for a user or all users
	async reset(username) {
		if (username) {
			// Nuke only one user.
			say(`reset: clear vars for user ${username}`)
			return await this.redisDel(username);
		}

		// Nuking ALL the users.
		let usernames = await this.allUsernames();
		say(`reset: delete users ${usernames}`);
		for (let user of usernames) {
			await this.redisDel(user);
		}
	}

	// reset all users data
	async resetAll() {
		return reset();
	}

	// freeze user variables
	async freeze(username) {
		let session = await this.redisGet(username);
		if (session === null) {
			throw `freeze(${username}): user not found`;
		}

		await this.redisSet(username+":frozen", session);
	}

	// thaw frozen user variables
	async thaw(username, action="thaw") {
		let frozen = await this.redisGet(username+":frozen");
		if (frozen === null) {
			throw `thaw(${username}): no frozen variables found`;
		}

		// restore user variables from frozen state
		if (action === "thaw" || action == "keep") {
			await this.redisSet(username, frozen);
		}

		// discard of old frozen state?
		if (action === "thaw" || action === "discard") {
			await this.redisDel(username+":frozen");
		}
	}
}

module.exports = RedisSessionManager;
