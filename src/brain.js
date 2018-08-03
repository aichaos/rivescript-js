/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// RiveScript.js
//
// This code is released under the MIT License.
// See the "LICENSE" file for more information.
//
// http://www.rivescript.com/
// Brain logic for RiveScript
import utils from "./utils";

import inherit_utils from "./inheritance";
import RSVP from "rsvp";

//#
// Brain (RiveScript master)
//
// Create a Brain object which handles the actual process of fetching a reply.
//#
class Brain {
  constructor(master) {
    this.master = master;
    this.strict = master._strict;
    this.utf8 = master._utf8;

    // Private variables only relevant to the reply-answering part of RiveScript.
    this._currentUser = null; // The current user asking for a message
  }

  // Proxy functions
  say(message) {
    return this.master.say(message);
  }
  warn(message, filename, lineno) {
    return this.master.warn(message, filename, lineno);
  }


  //#
  // string reply (string user, string msg[, scope])
  //
  // Fetch a reply for the user.
  //#
  reply(user, msg, scope, async) {
    this.say(`Asked to reply to [${user}] ${msg}`);

    // Store the current user's ID.
    this._currentUser = user;

    // Format their message.
    msg = this.formatMessage(msg);
    let reply = "";

    // Set initial match to be undefined
    if (this.master.getUservars(user)) {
      this.master._users[user].__initialmatch__ = undefined;
    }

    // If the BEGIN block exists, consult it first.
    if (this.master._topics.__begin__) {
      let begin = this._getReply(user, "request", "begin", 0, scope);

      // OK to continue?
      if (begin.includes("{ok}")) {
        reply = this._getReply(user, msg, "normal", 0, scope);
        begin = begin.replace(/\{ok\}/g, reply);
      }

      reply = begin;
      reply = this.processTags(user, msg, reply, [], [], 0, scope);
    } else {
      reply = this._getReply(user, msg, "normal", 0, scope);
    }

    reply = this.processCallTags(reply, scope, async);

    if (!utils.isAPromise(reply)) {
      this.onAfterReply(msg, user, reply);
    } else {
      reply.then(result => {
        return this.onAfterReply(msg, user, result);
      });
    }

    return reply;
  }

  onAfterReply(msg, user, reply) {
    // Save their reply history
    this.master._users[user].__history__.input.pop();
    this.master._users[user].__history__.input.unshift(msg);
    this.master._users[user].__history__.reply.pop();
    this.master._users[user].__history__.reply.unshift(reply);

    // Unset the current user ID.
    return this._currentUser = undefined;
  }

  //#
  // string|Promise processCallTags (string reply, object scope, bool async)
  //
  // Process <call> tags in the preprocessed reply string.
  // If `async` is true, processCallTags can handle asynchronous subroutines
  // and it returns a promise, otherwise a string is returned
  //#
  processCallTags(reply, scope, async) {
    let args;
    let text;
    reply = reply.replace(/«__call__»/ig, "<call>");
    reply = reply.replace(/«\/__call__»/ig, "</call>");
    const callRe = /<call>([\s\S]+?)<\/call>/ig;
    const argsRe = /«__call_arg__»([\s\S]*?)«\/__call_arg__»/ig;

    let giveup = 0;
    const matches = {};
    const promises = [];

    while (true) {
      giveup++;
      if (giveup >= 50) {
        this.warn("Infinite loop looking for call tag!");
        break;
      }

      const match = callRe.exec(reply);

      if (!match) {
        break;
      }

      text = utils.trim(match[1]);

      // get subroutine name
      const subroutineNameMatch = (/(\S+)/ig).exec(text);
      const subroutineName = subroutineNameMatch[0];

      args = [];

      // get arguments
      while (true) {
        const m = argsRe.exec(text);
        if (!m) {
          break;
        }
        args.push(m[1]);
      }


      matches[match[1]] = {
        text,
        obj: subroutineName,
        args
      };
    }

    // go through all the object calls and run functions
    for (let k in matches) {
      const data = matches[k];
      let output = "";
      if (this.master._objlangs[data.obj]) {
        // We do. Do we have a handler for it?
        const lang = this.master._objlangs[data.obj];
        if (this.master._handlers[lang]) {
          // We do.
          output = this.master._handlers[lang].call(this.master, data.obj, data.args, scope);
        } else {
          output = "[ERR: No Object Handler]";
        }
      } else {
        output = this.master.errors.objectNotFound;
      }

      // if we get a promise back and we are not in the async mode,
      // leave an error message to suggest using an async version of rs
      // otherwise, keep promises tucked into a list where we can check on
      // them later
      if (utils.isAPromise(output)) {
        if (async) {
          promises.push({
            promise: output,
            text: k
          });
          continue;
        } else {
          output = "[ERR: Using async routine with reply: use replyAsync instead]";
        }
      }

      reply = this._replaceCallTags(k, output, reply);
    }

    if (!async) {
      return reply;
    } else {
      // wait for all the promises to be resolved and
      // return a resulting promise with the final reply
      return new RSVP.Promise((resolve, reject) => {
        return RSVP.all(Array.from(promises).map(({
          promise
        }) => promise)).then(results => {
          for (let i = 0, end = results.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            reply = this._replaceCallTags(promises[i].text, results[i], reply);
          }

          return resolve(reply);
        }).catch(reason => {
          return reject(reason);
        });
      });
    }
  }

  _replaceCallTags(callSignature, callResult, reply) {
    return reply.replace(new RegExp(`<call>${utils.quotemeta(callSignature)}</call>`, "i"), callResult);
  }

  _parseCallArgsString(args) {
    // turn args string into a list of arguments
    const result = [];
    let buff = "";
    let insideAString = false;
    const spaceRe = /\s/ig;
    const doubleQuoteRe = /"/ig;

    const flushBuffer = () => {
      if (buff.length !== 0) {
        result.push(buff);
      }
      return buff = "";
    };

    for (let c of Array.from(args)) {
      if (c.match(spaceRe) && !insideAString) {
        flushBuffer();
        continue;
      }
      if (c.match(doubleQuoteRe)) {
        if (insideAString) {
          flushBuffer();
        }
        insideAString = !insideAString;
        continue;
      }
      buff = buff + c;
    }

    flushBuffer();

    return result;
  }

  _wrapArgumentsInCallTags(reply) {
    // wrap arguments inside <call></call> in «__call_arg__»«/__call_arg__»
    const callRegEx = /<call>\s*(.*?)\s*<\/call>/ig;
    const callArgsRegEx = /<call>\s*[^\s]+ (.*)<\/call>/ig;

    const callSignatures = [];

    while (true) {
      const match = callRegEx.exec(reply);

      if (!match) {
        break;
      }

      const originalCallSignature = match[0];
      let wrappedCallSignature = originalCallSignature;

      while (true) {
        const argsMatch = callArgsRegEx.exec(originalCallSignature);
        if (!argsMatch) {
          break;
        }

        const originalArgs = argsMatch[1];
        const args = this._parseCallArgsString(originalArgs);
        const wrappedArgs = [];

        for (let a of Array.from(args)) {
          wrappedArgs.push(`«__call_arg__»${a}«/__call_arg__»`);
        }

        wrappedCallSignature = wrappedCallSignature.replace(originalArgs,
          wrappedArgs.join(' '));
      }

      callSignatures.push({
        original: originalCallSignature,
        wrapped: wrappedCallSignature
      });
    }

    for (let cs of Array.from(callSignatures)) {
      reply = reply.replace(cs.original, cs.wrapped);
    }

    return reply;
  }

  //#
  // string _getReply (string user, string msg, string context, int step, scope)
  //
  // The internal reply method. DO NOT CALL THIS DIRECTLY.
  //
  // * user, msg and scope are the same as reply()
  // * context = "normal" or "begin"
  // * step = the recursion depth
  // * scope = the call scope for object macros
  //#
  _getReply(user, msg, context, step, scope) {
    // Needed to sort replies?
    let i;

    let isAtomic;
    let isMatch;
    let match;
    let pattern;
    let regexp;
    let trig;
    if (!this.master._sorted.topics) {
      this.warn("You forgot to call sortReplies()!");
      return "ERR: Replies Not Sorted";
    }

    // Initialize the user's profile?
    if (!this.master.getUservars(user)) {
      this.master.setUservar(user, "topic", "random");
    }

    // Collect data on this user.
    let topic = this.master.getUservar(user, "topic");
    let stars = [];
    let thatstars = []; // For %Previous
    let reply = "";

    // Avoid letting them fall into a missing topic.
    if (!this.master._topics[topic]) {
      this.warn(`User ${user} was in an empty topic named '${topic}'`);
      topic = "random";
      this.master.setUservar(user, "topic", topic);
    }

    // Avoid deep recursion.
    if (step > this.master._depth) {
      return this.master.errors.deepRecursion;
    }

    // Are we in the BEGIN block?
    if (context === "begin") {
      topic = "__begin__";
    }

    // Initialize this user's history.
    if (!this.master._users[user].__history__) {
      this.master._users[user].__history__ = {};
    }

    // Update input &/or reply if given array is missing or empty
    if (!this.master._users[user].__history__.input || (this.master._users[user].__history__.input.length === 0)) {
      this.master._users[user].__history__.input = [
        "undefined", "undefined", "undefined", "undefined", "undefined",
        "undefined", "undefined", "undefined", "undefined", "undefined"
      ];
    }
    if (!this.master._users[user].__history__.reply || (this.master._users[user].__history__.reply.length === 0)) {
      this.master._users[user].__history__.reply = [
        "undefined", "undefined", "undefined", "undefined", "undefined",
        "undefined", "undefined", "undefined", "undefined", "undefined"
      ];
    }

    // More topic sanity checking.
    if (!this.master._topics[topic]) {
      // This was handled before, which would mean topic=random and it doesn't
      // exist. Serious issue!
      return "ERR: No default topic 'random' was found!";
    }

    // Create a pointer for the matched data when we find it.
    let matched = null;
    let matchedTrigger = null;
    let foundMatch = false;

    // See if there were any %Previous's in this topic, or any topic related
    // to it. This should only be done the first time -- not during a recursive
    // redirection. This is because in a redirection, "lastreply" is still gonna
    // be the same as it was the first time, resulting in an infinite loop!
    if (step === 0) {
      let allTopics = [topic];
      if (this.master._topics[topic].includes || this.master._topics[topic].inherits) {
        // Get ALL the topics!
        allTopics = inherit_utils.getTopicTree(this.master, topic);
      }

      // Scan them all.
      for (let top of Array.from(allTopics)) {
        this.say(`Checking topic ${top} for any %Previous's`);

        if (this.master._sorted.thats[top].length) {
          // There's one here!
          this.say("There's a %Previous in this topic!");

          // Do we have history yet?
          let lastReply = this.master._users[user].__history__.reply[0] || "undefined";

          // Format the bot's last reply the same way as the human's.
          lastReply = this.formatMessage(lastReply, true);
          this.say(`Last reply: ${lastReply}`);

          // See if it's a match
          for (trig of Array.from(this.master._sorted.thats[top])) {
            pattern = trig[1].previous;
            const botside = this.triggerRegexp(user, pattern);
            this.say(`Try to match lastReply (${lastReply}) to ${botside}`);

            // Match?
            match = lastReply.match(new RegExp(`^${botside}$`));
            if (match) {
              // Huzzah! See if OUR message is right too.
              this.say("Bot side matched!");
              thatstars = match; // Collect the bot stars in case we need them
              thatstars.shift();

              // Compare the triggers to the user's message.
              const userSide = trig[1];
              regexp = this.triggerRegexp(user, userSide.trigger);
              this.say(`Try to match \"${msg}\" against ${userSide.trigger} (${regexp})`);

              // If the trigger is atomic, we don't need to bother with the regexp engine.
              isAtomic = utils.isAtomic(userSide.trigger);
              isMatch = false;
              if (isAtomic) {
                if (msg === regexp) {
                  isMatch = true;
                }
              } else {
                match = msg.match(new RegExp(`^${regexp}$`));
                if (match) {
                  isMatch = true;

                  // Get the stars
                  stars = match;
                  if (stars.length >= 1) {
                    stars.shift();
                  }
                }
              }

              // Was it a match?
              if (isMatch) {
                // Keep the trigger pointer.
                matched = userSide;
                foundMatch = true;
                matchedTrigger = userSide.trigger;
                break;
              }
            }
          }
        } else {
          this.say("No %Previous in this topic!");
        }
      }
    }

    // Search their topic for a match to their trigger.
    if (!foundMatch) {
      this.say("Searching their topic for a match...");
      for (trig of Array.from(this.master._sorted.topics[topic])) {
        pattern = trig[0];
        regexp = this.triggerRegexp(user, pattern);
        this.say(`Try to match \"${msg}\" against ${pattern} (${regexp})`);

        // If the trigger is atomic, we don't need to bother with the regexp engine.
        isAtomic = utils.isAtomic(pattern);
        isMatch = false;
        if (isAtomic) {
          if (msg === regexp) {
            isMatch = true;
          }
        } else {
          // Non-atomic triggers always need the regexp.
          match = msg.match(new RegExp(`^${regexp}$`));
          if (match) {
            // The regexp matched!
            isMatch = true;

            // Collect the stars
            stars = [];
            if (match.length > 1) {
              let asc;
              let end;
              for (i = 1, end = match.length, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
                stars.push(match[i]);
              }
            }
          }
        }

        // A match somehow?
        if (isMatch) {
          this.say("Found a match!");

          // Keep the pointer to this trigger's data.
          matched = trig[1];
          foundMatch = true;
          matchedTrigger = pattern;
          break;
        }
      }
    }

    // Store what trigger they matched on. If their matched trigger is undefined,
    // this will be too, which is great.
    this.master._users[user].__lastmatch__ = matchedTrigger;

    if (step === 0) {
      // Store initial matched trigger. Like __lastmatch__, this can be undefined.
      this.master._users[user].__initialmatch__ = matchedTrigger;

      // Also initialize __last_triggers__ which will keep all matched triggers
      this.master._users[user].__last_triggers__ = [];
    }

    // Did we match?
    if (matched) {
      // Keep the current match
      this.master._users[user].__last_triggers__.push(matched);

      for (let nil of[1]) { // A single loop so we can break out early
        // See if there are any hard redirects.
        if (matched.redirect != null) {
          this.say(`Redirecting us to ${matched.redirect}`);
          let redirect = this.processTags(user, msg, matched.redirect, stars, thatstars, step, scope);

          // Execute and resolve *synchronous* <call> tags.
          redirect = this.processCallTags(redirect, scope, false);

          this.say(`Pretend user said: ${redirect}`);
          reply = this._getReply(user, redirect, context, step + 1, scope);
          break;
        }

        // Check the conditionals.
        for (let row of Array.from(matched.condition)) {
          const halves = row.split(/\s*=>\s*/);
          if (halves && (halves.length === 2)) {
            const condition = halves[0].match(/^(.+?)\s+(==|eq|!=|ne|<>|<|<=|>|>=)\s+(.*?)$/);
            if (condition) {
              let left = utils.strip(condition[1]);
              const eq = condition[2];
              let right = utils.strip(condition[3]);
              const potreply = halves[1].trim();

              // Process tags all around
              left = this.processTags(user, msg, left, stars, thatstars, step, scope);
              right = this.processTags(user, msg, right, stars, thatstars, step, scope);

              // Execute any <call> tags in the conditions. We explicitly send
              // `false` as the async parameter, because we can't run async
              // object macros in conditionals; we need the result NOW
              // for comparison.
              left = this.processCallTags(left, scope, false);
              right = this.processCallTags(right, scope, false);

              // Defaults?
              if (left.length === 0) {
                left = "undefined";
              }
              if (right.length === 0) {
                right = "undefined";
              }

              this.say(`Check if ${left} ${eq} ${right}`);

              // Validate it
              let passed = false;
              if ((eq === "eq") || (eq === "==")) {
                if (left === right) {
                  passed = true;
                }
              } else if ((eq === "ne") || (eq === "!=") || (eq === "<>")) {
                if (left !== right) {
                  passed = true;
                }
              } else {
                // Dealing with numbers here
                try {
                  left = parseInt(left);
                  right = parseInt(right);
                  if ((eq === "<") && (left < right)) {
                    passed = true;
                  } else if ((eq === "<=") && (left <= right)) {
                    passed = true;
                  } else if ((eq === ">") && (left > right)) {
                    passed = true;
                  } else if ((eq === ">=") && (left >= right)) {
                    passed = true;
                  }
                } catch (e) {
                  this.warn("Failed to evaluate numeric condition!");
                }
              }

              // OK?
              if (passed) {
                reply = potreply;
                break;
              }
            }
          }
        }

        // Have our reply yet?
        if ((reply !== undefined) && (reply.length > 0)) {
          break;
        }

        // Process weights in the replies.
        const bucket = [];
        for (let rep of Array.from(matched.reply)) {
          let asc1;
          let end1;
          let weight = 1;
          match = rep.match(/\{weight=(\d+?)\}/i);
          if (match) {
            weight = match[1];
            if (weight <= 0) {
              this.warn("Can't have a weight <= 0!");
              weight = 1;
            }
          }

          for (i = 0, end1 = weight, asc1 = 0 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
            bucket.push(rep);
          }
        }

        // Get a random reply.
        const choice = parseInt(Math.random() * bucket.length);
        reply = bucket[choice];
        break;
      }
    }

    // Still no reply?
    if (!foundMatch) {
      reply = this.master.errors.replyNotMatched;
    } else if ((reply === undefined) || (reply.length === 0)) {
      reply = this.master.errors.replyNotFound;
    }

    this.say(`Reply: ${reply}`);

    // Process tags for the BEGIN block.
    if (context === "begin") {
      // The BEGIN block can set {topic} and user vars.

      // Topic setter
      let name;
      match = reply.match(/\{topic=(.+?)\}/i);
      let giveup = 0;
      while (match) {
        giveup++;
        if (giveup >= 50) {
          this.warn("Infinite loop looking for topic tag!");
          break;
        }
        name = match[1];
        this.master.setUservar(user, "topic", name);
        reply = reply.replace(new RegExp(`{topic=${utils.quotemeta(name)}}`, "ig"), "");
        match = reply.match(/\{topic=(.+?)\}/i);
      }

      // Set user vars
      match = reply.match(/<set (.+?)=(.+?)>/i);
      giveup = 0;
      while (match) {
        giveup++;
        if (giveup >= 50) {
          this.warn("Infinite loop looking for set tag!");
          break;
        }
        name = match[1];
        const value = match[2];
        this.master.setUservar(user, name, value);
        reply = reply.replace(new RegExp(`<set ${utils.quotemeta(name)}=${utils.quotemeta(value)}>`, "ig"), "");
        match = reply.match(/<set (.+?)=(.+?)>/i);
      }
    } else {
      // Process all the tags.
      reply = this.processTags(user, msg, reply, stars, thatstars, step, scope);
    }

    return reply;
  }

  //#
  // string formatMessage (string msg)
  //
  // Format a user's message for safe processing.
  //#
  formatMessage(msg, botreply) {
    // Lowercase it.
    msg = `${msg}`;
    msg = msg.toLowerCase();

    // Run substitutions and sanitize what's left.
    msg = this.substitute(msg, "sub");

    // In UTF-8 mode, only strip metacharcters and HTML brackets (to protect
    // against obvious XSS attacks).
    if (this.utf8) {
      msg = msg.replace(/[\\<>]+/, "");
      if (this.master.unicodePunctuation != null) {
        msg = msg.replace(this.master.unicodePunctuation, "");
      }

      // For the bot's reply, also strip common punctuation.
      if (botreply != null) {
        msg = msg.replace(/[.?,!;:@#$%^&*()]/, "");
      }
    } else {
      // For everything else, strip all non-alphanumerics
      msg = utils.stripNasties(msg, this.utf8);
    }

    // cut leading and trailing blanks once punctuation dropped office
    msg = msg.trim();
    msg = msg.replace(/\s+/g, " ");
    return msg;
  }

  //#
  // string triggerRegexp (string user, string trigger)
  //
  // Prepares a trigger for the regular expression engine.
  //#
  triggerRegexp(user, regexp) {
    // If the trigger is simply '*' then the * needs to become (.*?)
    // to match the blank string too.
    let name;

    let rep;
    regexp = regexp.replace(/^\*$/, "<zerowidthstar>");

    // Simple replacements.
    regexp = regexp.replace(/\*/g, "(.+?)"); // Convert * into (.+?)
    regexp = regexp.replace(/#/g, "(\\d+?)"); // Convert # into (\d+?)
    regexp = regexp.replace(/_/g, "(\\w+?)"); // Convert _ into (\w+?)
    regexp = regexp.replace(/\s*\{weight=\d+\}\s*/g, ""); // Remove {weight} tags
    regexp = regexp.replace(/<zerowidthstar>/g, "(.*?)");
    regexp = regexp.replace(/\|{2,}/, '|'); // Remove empty entities
    regexp = regexp.replace(/(\(|\[)\|/g, '$1'); // Remove empty entities from start of alt/opts
    regexp = regexp.replace(/\|(\)|\])/g, '$1'); // Remove empty entities from end of alt/opts

    // UTF-8 mode special characters.
    if (this.utf8) {
      regexp = regexp.replace(/\\@/, "\\u0040"); // @ symbols conflict w/ arrays
    }

    // Optionals.
    let match = regexp.match(/\[(.+?)\]/);
    let giveup = 0;
    while (match) {
      if (giveup++ > 50) {
        this.warn("Infinite loop when trying to process optionals in a trigger!");
        return "";
      }

      // The resulting regexp needs to work in two scenarios:
      // 1) The user included the optional word(s) in which case they must be
      //    in the message surrounded by a space or a word boundary (e.g. the
      //    end or beginning of their message)
      // 2) The user did not include the word, meaning the whole entire set of
      //    words should be "OR'd" with a word boundary or one or more spaces.
      //
      // The resulting regexp ends up looking like this, for a given input
      // trigger of: what is your [home|office] number
      //
      // what is your(?:(?:\s|\b)+home(?:\s|\b)+|(?:\s|\b)+office(?:\s|\b)+|(?:\b|\s)+)number
      //
      // See https://github.com/aichaos/rivescript-js/issues/48

      const parts = match[1].split("|");
      const opts = [];
      for (let p of Array.from(parts)) {
        opts.push(`(?:\\s|\\b)+${p}(?:\\s|\\b)+`);
      }

      // If this optional had a star or anything in it, make it non-matching.
      let pipes = opts.join("|");
      pipes = pipes.replace(new RegExp(utils.quotemeta("(.+?)"), "g"), "(?:.+?)");
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\d+?)"), "g"), "(?:\\d+?)");
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\w+?)"), "g"), "(?:\\w+?)");

      // Temporarily dummy out the literal square brackets so we don't loop forever
      // thinking that the [\s\b] part is another optional.
      pipes = pipes.replace(/\[/g, "__lb__").replace(/\]/g, "__rb__");

      regexp = regexp.replace(new RegExp(`\\s*\\[${utils.quotemeta(match[1])}\\]\\s*`),
        `(?:${pipes}|(?:\\b|\\s)+)`);
      match = regexp.match(/\[(.+?)\]/);
    }

    // Restore the literal square brackets.
    regexp = regexp.replace(/__lb__/g, "[").replace(/__rb__/g, "]");

    // _ wildcards can't match numbers! Quick note on why I did it this way:
    // the initial replacement above (_ => (\w+?)) needs to be \w because the
    // square brackets in [\s\d] will confuse the optionals logic just above.
    // So then we switch it back down here. Also, we don't just use \w+ because
    // that matches digits, and similarly [A-Za-z] doesn't work with Unicode,
    // so this regexp excludes spaces and digits instead of including letters.
    regexp = regexp.replace(/\\w/, "[^\\s\\d]");

    // Filter in arrays.
    giveup = 0;
    while (regexp.includes("@")) {
      if (giveup++ > 50) {
        break;
      }

      match = regexp.match(/\@(.+?)\b/);
      if (match) {
        name = match[1];
        rep = "";
        if (this.master._array[name]) {
          rep = `(?:${this.master._array[name].join("|")})`;
        }
        regexp = regexp.replace(new RegExp(`@${utils.quotemeta(name)}\\b`), rep);
      }
    }

    // Filter in bot variables.
    giveup = 0;
    while (regexp.includes("<bot")) {
      if (giveup++ > 50) {
        break;
      }

      match = regexp.match(/<bot (.+?)>/i);
      if (match) {
        name = match[1];
        rep = '';
        if (this.master._var[name]) {
          rep = utils.stripNasties(this.master._var[name]);
        }
        regexp = regexp.replace(new RegExp(`<bot ${utils.quotemeta(name)}>`), rep.toLowerCase());
      }
    }

    // Filter in user variables.
    giveup = 0;
    while (regexp.includes("<get")) {
      if (giveup++ > 50) {
        break;
      }

      match = regexp.match(/<get (.+?)>/i);
      if (match) {
        name = match[1];
        rep = this.master.getUservar(user, name);
        regexp = regexp.replace(new RegExp(`<get ${utils.quotemeta(name)}>`, "ig"), rep.toLowerCase());
      }
    }

    // Filter in input/reply tags.
    giveup = 0;
    regexp = regexp.replace(/<input>/i, "<input1>");
    regexp = regexp.replace(/<reply>/i, "<reply1>");
    while ((regexp.includes("<input")) || (regexp.includes("<reply"))) {
      if (giveup++ > 50) {
        break;
      }

      for (let type of["input", "reply"]) {
        for (let i = 1; i <= 9; i++) {
          if (regexp.includes(`<${type}${i}>`)) {
            regexp = regexp.replace(new RegExp(`<${type}${i}>`, "g"),
              this.master._users[user].__history__[type][i]);
          }
        }
      }
    }

    // Recover escaped Unicode symbols.
    if (this.utf8 && (regexp.includes("\\u"))) {
      regexp = regexp.replace(/\\u([A-Fa-f0-9]{4})/, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
    }

    // Prevent accidental wildcard match due to double-pipe (e.g. /hi||hello/)
    regexp = regexp.replace(/\|{2,}/mg, '|');

    return regexp;
  }

  //#
  // string processTags (string user, string msg, string reply, string[] stars,
  //                     string[] botstars, int step, scope)
  //
  // Process tags in a reply element.
  //
  // All the tags get processed here except for `<call>` tags which have
  // a separate subroutine (refer to `processCallTags` for more info)
  //#
  processTags(user, msg, reply, st, bst, step, scope) {
    // Prepare the stars and botstars.
    let i;

    let name;
    let replace;
    let result;
    let target;
    let asc;
    let end;
    let asc1;
    let end1;
    const stars = [""];
    stars.push(...st);
    const botstars = [""];
    botstars.push(...bst);
    if (stars.length === 1) {
      stars.push("undefined");
    }
    if (botstars.length === 1) {
      botstars.push("undefined");
    }

    // Turn arrays into randomized sets.
    let match = reply.match(/\(@([A-Za-z0-9_]+)\)/i);
    let giveup = 0;
    while (match) {
      if (giveup++ > this.master._depth) {
        this.warn("Infinite loop looking for arrays in reply!");
        break;
      }

      name = match[1];
      if (this.master._array[name]) {
        result = `{random}${this.master._array[name].join("|")}{/random}`;
      } else {
        result = `\x00@${name}\x00`; // Dummy it out so we can reinsert it later.
      }

      reply = reply.replace(new RegExp(`\\(@${utils.quotemeta(name)}\\)`, "ig"),
        result);
      match = reply.match(/\(@([A-Za-z0-9_]+)\)/i);
    }
    reply = reply.replace(/\x00@([A-Za-z0-9_]+)\x00/g, "(@$1)");

    // Wrap args inside call tags
    reply = this._wrapArgumentsInCallTags(reply);

    // Tag shortcuts.
    reply = reply.replace(/<person>/ig, "{person}<star>{/person}");
    reply = reply.replace(/<@>/ig, "{@<star>}");
    reply = reply.replace(/<formal>/ig, "{formal}<star>{/formal}");
    reply = reply.replace(/<sentence>/ig, "{sentence}<star>{/sentence}");
    reply = reply.replace(/<uppercase>/ig, "{uppercase}<star>{/uppercase}");
    reply = reply.replace(/<lowercase>/ig, "{lowercase}<star>{/lowercase}");

    // Weight and star tags.
    reply = reply.replace(/\{weight=\d+\}/ig, ""); // Remove {weight}s
    reply = reply.replace(/<star>/ig, stars[1]);
    reply = reply.replace(/<botstar>/ig, botstars[1]);
    for (i = 1, end = stars.length, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      reply = reply.replace(new RegExp(`<star${i}>`, "ig"), stars[i]);
    }
    for (i = 1, end1 = botstars.length, asc1 = 1 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
      reply = reply.replace(new RegExp(`<botstar${i}>`, "ig"), botstars[i]);
    }

    // <input> and <reply>
    reply = reply.replace(/<input>/ig, this.master._users[user].__history__.input[0] || "undefined");
    reply = reply.replace(/<reply>/ig, this.master._users[user].__history__.reply[0] || "undefined");
    for (i = 1; i <= 9; i++) {
      if (reply.includes(`<input${i}>`)) {
        reply = reply.replace(new RegExp(`<input${i}>`, "ig"),
          this.master._users[user].__history__.input[i]);
      }
      if (reply.includes(`<reply${i}>`)) {
        reply = reply.replace(new RegExp(`<reply${i}>`, "ig"),
          this.master._users[user].__history__.reply[i]);
      }
    }

    // <id> and escape codes
    reply = reply.replace(/<id>/ig, user);
    reply = reply.replace(/\\s/ig, " ");
    reply = reply.replace(/\\n/ig, "\n");
    reply = reply.replace(/\\#/ig, "#");

    // {random}
    match = reply.match(/\{random\}(.+?)\{\/random\}/i);
    giveup = 0;
    while (match) {
      if (giveup++ > this.master._depth) {
        this.warn("Infinite loop looking for random tag!");
        break;
      }

      let random = [];
      const text = match[1];
      if (text.includes("|")) {
        random = text.split("|");
      } else {
        random = text.split(" ");
      }

      const output = random[parseInt(Math.random() * random.length)];

      reply = reply.replace(new RegExp(`\\{random\\}${utils.quotemeta(text)}\\{\\/random\\}`, "ig"),
        output);
      match = reply.match(/\{random\}(.+?)\{\/random\}/i);
    }

    // Person substitutions & string formatting
    const formats = ["person", "formal", "sentence", "uppercase", "lowercase"];
    for (let type of Array.from(formats)) {
      match = reply.match(new RegExp(`{${type}}(.+?){/${type}}`, "i"));
      giveup = 0;
      while (match) {
        giveup++;
        if (giveup >= 50) {
          this.warn(`Infinite loop looking for ${type} tag!`);
          break;
        }

        const content = match[1];
        if (type === "person") {
          replace = this.substitute(content, "person");
        } else {
          replace = utils.stringFormat(type, content);
        }

        reply = reply.replace(new RegExp(`{${type}}` + utils.quotemeta(content) + `{/${type}}`, "ig"), replace);
        match = reply.match(new RegExp(`{${type}}(.+?){/${type}}`, "i"));
      }
    }

    // Handle all variable-related tags with an iterative regexp approach, to
    // allow for nesting of tags in arbitrary ways (think <set a=<get b>>)
    // Dummy out the <call> tags first, because we don't handle them right here.
    reply = reply.replace(/<call>/ig, "«__call__»");
    reply = reply.replace(/<\/call>/ig, "«/__call__»");

    while (true) {
      // This regexp will match a <tag> which contains no other tag inside it,
      // i.e. in the case of <set a=<get b>> it will match <get b> but not the
      // <set> tag, on the first pass. The second pass will get the <set> tag,
      // and so on.
      match = reply.match(/<([^<]+?)>/);
      if (!match) {
        break; // No remaining tags!
      }

      match = match[1];
      let parts = match.split(" ");
      const tag = parts[0].toLowerCase();
      let data = "";
      if (parts.length > 1) {
        data = parts.slice(1).join(" ");
      }
      let insert = "";

      // Handle the tags.
      if ((tag === "bot") || (tag === "env")) {
        // <bot> and <env> tags are similar
        target = tag === "bot" ? this.master._var : this.master._global;
        if (data.includes("=")) {
          // Assigning a variable
          parts = data.split("=", 2);
          this.say(`Set ${tag} variable ${parts[0]} = ${parts[1]}`);
          target[parts[0]] = parts[1];
        } else {
          // Getting a bot/env variable
          insert = target[data] || "undefined";
        }
      } else if (tag === "set") {
        // <set> user vars
        parts = data.split("=", 2);
        this.say(`Set uservar ${parts[0]} = ${parts[1]}`);
        this.master.setUservar(user, parts[0], parts[1]);
      } else if ((tag === "add") || (tag === "sub") || (tag === "mult") || (tag === "div")) {
        // Math operator tags
        parts = data.split("=");
        name = parts[0];
        let value = parts[1];

        // Initialize the variable?
        if (this.master.getUservar(user, name) === "undefined") {
          this.master.setUservar(user, name, 0);
        }

        // Sanity check
        value = parseInt(value);
        if (isNaN(value)) {
          insert = `[ERR: Math can't '${tag}' non-numeric value '${value}']`;
        } else if (isNaN(parseInt(this.master.getUservar(user, name)))) {
          insert = `[ERR: Math can't '${tag}' non-numeric user variable '${name}']`;
        } else {
          result = parseInt(this.master.getUservar(user, name));
          if (tag === "add") {
            result += value;
          } else if (tag === "sub") {
            result -= value;
          } else if (tag === "mult") {
            result *= value;
          } else if (tag === "div") {
            if (value === 0) {
              insert = "[ERR: Can't Divide By Zero]";
            } else {
              result /= value;
            }
          }

          // No errors?
          if (insert === "") {
            this.master.setUservar(user, name, result);
          }
        }
      } else if (tag === "get") {
        insert = this.master.getUservar(user, data);
      } else {
        // Unrecognized tag, preserve it
        insert = `\x00${match}\x01`;
      }

      reply = reply.replace(new RegExp(`<${utils.quotemeta(match)}>`), insert);
    }

    // Recover mangled HTML-like tags
    reply = reply.replace(/\x00/g, "<");
    reply = reply.replace(/\x01/g, ">");

    // Topic setter
    match = reply.match(/\{topic=(.+?)\}/i);
    giveup = 0;
    while (match) {
      giveup++;
      if (giveup >= 50) {
        this.warn("Infinite loop looking for topic tag!");
        break;
      }

      name = match[1];
      this.master.setUservar(user, "topic", name);
      reply = reply.replace(new RegExp(`{topic=${utils.quotemeta(name)}}`, "ig"), "");
      match = reply.match(/\{topic=(.+?)\}/i);
    } // Look for more

    // Inline redirector
    match = reply.match(/\{@([^\}]*?)\}/);
    giveup = 0;
    while (match) {
      giveup++;
      if (giveup >= 50) {
        this.warn("Infinite loop looking for redirect tag!");
        break;
      }

      target = utils.strip(match[1]);

      // Resolve any *synchronous* <call> tags right now before redirecting.
      target = this.processCallTags(target, scope, false);

      this.say(`Inline redirection to: ${target}`);
      const subreply = this._getReply(user, target, "normal", step + 1, scope);
      reply = reply.replace(new RegExp(`\\{@${utils.quotemeta(match[1])}\\}`, "i"), subreply);
      match = reply.match(/\{@([^\}]*?)\}/);
    }

    return reply;
  }

  //#
  // string substitute (string msg, string type)
  //
  // Run substitutions against a message. `type` is either "sub" or "person" for
  // the type of substitution to run.
  substitute(msg, type) {

    // Safety checking.
    let pattern;
    if (!this.master._sorted[type]) {
      this.master.warn("You forgot to call sortReplies()!");
      return "";
    }

    // Get the substitutions map.
    const subs = type === "sub" ? this.master._sub : this.master._person;

    // Get the max number of words in sub/person to minimize interations
    const maxwords = type === "sub" ? this.master._submax : this.master._personmax;

    let result = "";

    // Take the original message with no punctuation
    if (this.master.unicodePunctuation != null) {
      pattern = msg.replace(this.master.unicodePunctuation, "");
    } else {
      pattern = msg.replace(/[.,!?;:]/g, "");
    }

    let tries = 0;
    let giveup = 0;
    let subgiveup = 0;

    // Look for words/phrases until there is no "spaces" in pattern
    while (pattern.includes(" ")) {
      giveup++;
      // Give up if there are too many substitutions (for safety)
      if (giveup >= 1000) {
        this.warn("Too many loops when handling substitutions!");
        break;
      }

      let li = utils.nIndexOf(pattern, " ", maxwords);
      let subpattern = pattern.substring(0, li);

      // If finds the pattern in sub object replace and stop to look
      result = subs[subpattern];
      if (result !== undefined) {
        msg = msg.replace(subpattern, result);
      } else {
        // Otherwise Look for substitutions in a subpattern
        while (subpattern.includes(" ")) {
          subgiveup++;
          // Give up if there are too many substitutions (for safety)
          if (subgiveup >= 1000) {
            this.warn("Too many loops when handling substitutions!");
            break;
          }

          li = subpattern.lastIndexOf(" ");
          subpattern = subpattern.substring(0, li);

          // If finds the subpattern in sub object replace and stop to look
          result = subs[subpattern];
          if (result !== undefined) {
            msg = msg.replace(subpattern, result);
            break;
          }

          tries++;
        }
      }

      const fi = pattern.indexOf(" ");
      pattern = pattern.substring(fi + 1);
      tries++;
    }

    // After all loops, see if just one word is in the pattern
    result = subs[pattern];
    if (result !== undefined) {
      msg = msg.replace(pattern, result);
    }

    return msg;
  }
}

export default Brain;
