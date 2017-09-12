"use strict";
var Brain, RSVP, inherit_utils, utils;

utils = require("./utils");

inherit_utils = require("./inheritance");

RSVP = require("rsvp");

Brain = (function() {
  function Brain(master) {
    this.master = master;
    this.strict = master._strict;
    this.utf8 = master._utf8;
    this._currentUser = null;
  }

  Brain.prototype.say = function(message) {
    return this.master.say(message);
  };

  Brain.prototype.warn = function(message, filename, lineno) {
    return this.master.warn(message, filename, lineno);
  };

  Brain.prototype.reply = function(user, msg, scope, async) {
    var begin, reply;
    this.say("Asked to reply to [" + user + "] " + msg);
    this._currentUser = user;
    msg = this.formatMessage(msg);
    reply = "";
    if (this.master.getUservars(user)) {
      this.master._users[user].__initialmatch__ = void 0;
    }
    if (this.master._topics.__begin__) {
      begin = this._getReply(user, "request", "begin", 0, scope);
      if (begin.indexOf("{ok}") > -1) {
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
      reply.then((function(_this) {
        return function(result) {
          return _this.onAfterReply(msg, user, result);
        };
      })(this));
    }
    return reply;
  };

  Brain.prototype.onAfterReply = function(msg, user, reply) {
    this.master._users[user].__history__.input.pop();
    this.master._users[user].__history__.input.unshift(msg);
    this.master._users[user].__history__.reply.pop();
    this.master._users[user].__history__.reply.unshift(reply);
    return this._currentUser = void 0;
  };

  Brain.prototype.processCallTags = function(reply, scope, async) {
    var args, argsRe, callRe, data, giveup, k, lang, m, match, matches, output, promises, subroutineName, subroutineNameMatch, text;
    reply = reply.replace(/«__call__»/ig, "<call>");
    reply = reply.replace(/«\/__call__»/ig, "</call>");
    callRe = /<call>([\s\S]+?)<\/call>/ig;
    argsRe = /«__call_arg__»([\s\S]*?)«\/__call_arg__»/ig;
    giveup = 0;
    matches = {};
    promises = [];
    while (true) {
      giveup++;
      if (giveup >= 50) {
        this.warn("Infinite loop looking for call tag!");
        break;
      }
      match = callRe.exec(reply);
      if (!match) {
        break;
      }
      text = utils.trim(match[1]);
      subroutineNameMatch = /(\S+)/ig.exec(text);
      subroutineName = subroutineNameMatch[0];
      args = [];
      while (true) {
        m = argsRe.exec(text);
        if (!m) {
          break;
        }
        args.push(m[1]);
      }
      matches[match[1]] = {
        text: text,
        obj: subroutineName,
        args: args
      };
    }
    for (k in matches) {
      data = matches[k];
      output = "";
      if (this.master._objlangs[data.obj]) {
        lang = this.master._objlangs[data.obj];
        if (this.master._handlers[lang]) {
          output = this.master._handlers[lang].call(this.master, data.obj, data.args, scope);
        } else {
          output = "[ERR: No Object Handler]";
        }
      } else {
        output = this.master.errors.objectNotFound;
      }
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
      return new RSVP.Promise((function(_this) {
        return function(resolve, reject) {
          var p;
          return RSVP.all((function() {
            var j, len, results1;
            results1 = [];
            for (j = 0, len = promises.length; j < len; j++) {
              p = promises[j];
              results1.push(p.promise);
            }
            return results1;
          })()).then(function(results) {
            var i, j, ref;
            for (i = j = 0, ref = results.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
              reply = _this._replaceCallTags(promises[i].text, results[i], reply);
            }
            return resolve(reply);
          })["catch"](function(reason) {
            return reject(reason);
          });
        };
      })(this));
    }
  };

  Brain.prototype._replaceCallTags = function(callSignature, callResult, reply) {
    return reply.replace(new RegExp("<call>" + utils.quotemeta(callSignature) + "</call>", "i"), callResult);
  };

  Brain.prototype._parseCallArgsString = function(args) {
    var buff, c, doubleQuoteRe, flushBuffer, insideAString, j, len, result, spaceRe;
    result = [];
    buff = "";
    insideAString = false;
    spaceRe = /\s/ig;
    doubleQuoteRe = /"/ig;
    flushBuffer = function() {
      if (buff.length !== 0) {
        result.push(buff);
      }
      return buff = "";
    };
    for (j = 0, len = args.length; j < len; j++) {
      c = args[j];
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
  };

  Brain.prototype._wrapArgumentsInCallTags = function(reply) {
    var a, args, argsMatch, callArgsRegEx, callRegEx, callSignatures, cs, j, l, len, len1, match, originalArgs, originalCallSignature, wrappedArgs, wrappedCallSignature;
    callRegEx = /<call>\s*(.*?)\s*<\/call>/ig;
    callArgsRegEx = /<call>\s*[^\s]+ (.*)<\/call>/ig;
    callSignatures = [];
    while (true) {
      match = callRegEx.exec(reply);
      if (!match) {
        break;
      }
      originalCallSignature = match[0];
      wrappedCallSignature = originalCallSignature;
      while (true) {
        argsMatch = callArgsRegEx.exec(originalCallSignature);
        if (!argsMatch) {
          break;
        }
        originalArgs = argsMatch[1];
        args = this._parseCallArgsString(originalArgs);
        wrappedArgs = [];
        for (j = 0, len = args.length; j < len; j++) {
          a = args[j];
          wrappedArgs.push("«__call_arg__»" + a + "«/__call_arg__»");
        }
        wrappedCallSignature = wrappedCallSignature.replace(originalArgs, wrappedArgs.join(' '));
      }
      callSignatures.push({
        original: originalCallSignature,
        wrapped: wrappedCallSignature
      });
    }
    for (l = 0, len1 = callSignatures.length; l < len1; l++) {
      cs = callSignatures[l];
      reply = reply.replace(cs.original, cs.wrapped);
    }
    return reply;
  };

  Brain.prototype._getReply = function(user, msg, context, step, scope) {
    var allTopics, botside, bucket, choice, condition, e, eq, foundMatch, giveup, halves, i, isAtomic, isMatch, j, l, lastReply, left, len, len1, len2, len3, len4, len5, match, matched, matchedTrigger, n, name, nil, o, passed, pattern, potreply, q, r, redirect, ref, ref1, ref2, ref3, ref4, ref5, ref6, regexp, rep, reply, right, row, s, stars, t, thatstars, top, topic, trig, userSide, value, weight;
    if (!this.master._sorted.topics) {
      this.warn("You forgot to call sortReplies()!");
      return "ERR: Replies Not Sorted";
    }
    if (!this.master.getUservars(user)) {
      this.master.setUservar(user, "topic", "random");
    }
    topic = this.master.getUservar(user, "topic");
    stars = [];
    thatstars = [];
    reply = "";
    if (!this.master._topics[topic]) {
      this.warn("User " + user + " was in an empty topic named '" + topic + "'");
      topic = "random";
      this.master.setUservar(user, "topic", topic);
    }
    if (step > this.master._depth) {
      return this.master.errors.deepRecursion;
    }
    if (context === "begin") {
      topic = "__begin__";
    }
    if (!this.master._users[user].__history__) {
      this.master._users[user].__history__ = {};
    }
    if (!this.master._users[user].__history__.input || this.master._users[user].__history__.input.length === 0) {
      this.master._users[user].__history__.input = ["undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined"];
    }
    if (!this.master._users[user].__history__.reply || this.master._users[user].__history__.reply.length === 0) {
      this.master._users[user].__history__.reply = ["undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined", "undefined"];
    }
    if (!this.master._topics[topic]) {
      return "ERR: No default topic 'random' was found!";
    }
    matched = null;
    matchedTrigger = null;
    foundMatch = false;
    if (step === 0) {
      allTopics = [topic];
      if (this.master._topics[topic].includes || this.master._topics[topic].inherits) {
        allTopics = inherit_utils.getTopicTree(this.master, topic);
      }
      for (j = 0, len = allTopics.length; j < len; j++) {
        top = allTopics[j];
        this.say("Checking topic " + top + " for any %Previous's");
        if (this.master._sorted.thats[top].length) {
          this.say("There's a %Previous in this topic!");
          lastReply = this.master._users[user].__history__.reply[0] || "undefined";
          lastReply = this.formatMessage(lastReply, true);
          this.say("Last reply: " + lastReply);
          ref = this.master._sorted.thats[top];
          for (l = 0, len1 = ref.length; l < len1; l++) {
            trig = ref[l];
            pattern = trig[1].previous;
            botside = this.triggerRegexp(user, pattern);
            this.say("Try to match lastReply (" + lastReply + ") to " + botside);
            match = lastReply.match(new RegExp("^" + botside + "$"));
            if (match) {
              this.say("Bot side matched!");
              thatstars = match;
              thatstars.shift();
              userSide = trig[1];
              regexp = this.triggerRegexp(user, userSide.trigger);
              this.say("Try to match \"" + msg + "\" against " + userSide.trigger + " (" + regexp + ")");
              isAtomic = utils.isAtomic(userSide.trigger);
              isMatch = false;
              if (isAtomic) {
                if (msg === regexp) {
                  isMatch = true;
                }
              } else {
                match = msg.match(new RegExp("^" + regexp + "$"));
                if (match) {
                  isMatch = true;
                  stars = match;
                  if (stars.length >= 1) {
                    stars.shift();
                  }
                }
              }
              if (isMatch) {
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
    if (!foundMatch) {
      this.say("Searching their topic for a match...");
      ref1 = this.master._sorted.topics[topic];
      for (n = 0, len2 = ref1.length; n < len2; n++) {
        trig = ref1[n];
        pattern = trig[0];
        regexp = this.triggerRegexp(user, pattern);
        this.say("Try to match \"" + msg + "\" against " + pattern + " (" + regexp + ")");
        isAtomic = utils.isAtomic(pattern);
        isMatch = false;
        if (isAtomic) {
          if (msg === regexp) {
            isMatch = true;
          }
        } else {
          match = msg.match(new RegExp("^" + regexp + "$"));
          if (match) {
            isMatch = true;
            stars = [];
            if (match.length > 1) {
              for (i = o = 1, ref2 = match.length; 1 <= ref2 ? o <= ref2 : o >= ref2; i = 1 <= ref2 ? ++o : --o) {
                stars.push(match[i]);
              }
            }
          }
        }
        if (isMatch) {
          this.say("Found a match!");
          matched = trig[1];
          foundMatch = true;
          matchedTrigger = pattern;
          break;
        }
      }
    }
    this.master._users[user].__lastmatch__ = matchedTrigger;
    if (step === 0) {
      this.master._users[user].__initialmatch__ = matchedTrigger;
      this.master._users[user].__last_triggers__ = [];
    }
    if (matched) {
      this.master._users[user].__last_triggers__.push(matched);
      ref3 = [1];
      for (q = 0, len3 = ref3.length; q < len3; q++) {
        nil = ref3[q];
        if (matched.redirect != null) {
          this.say("Redirecting us to " + matched.redirect);
          redirect = this.processTags(user, msg, matched.redirect, stars, thatstars, step, scope);
          redirect = this.processCallTags(redirect, scope, false);
          this.say("Pretend user said: " + redirect);
          reply = this._getReply(user, redirect, context, step + 1, scope);
          break;
        }
        ref4 = matched.condition;
        for (r = 0, len4 = ref4.length; r < len4; r++) {
          row = ref4[r];
          halves = row.split(/\s*=>\s*/);
          if (halves && halves.length === 2) {
            condition = halves[0].match(/^(.+?)\s+(==|eq|!=|ne|<>|<|<=|>|>=)\s+(.*?)$/);
            if (condition) {
              left = utils.strip(condition[1]);
              eq = condition[2];
              right = utils.strip(condition[3]);
              potreply = halves[1].trim();
              left = this.processTags(user, msg, left, stars, thatstars, step, scope);
              right = this.processTags(user, msg, right, stars, thatstars, step, scope);
              left = this.processCallTags(left, scope, false);
              right = this.processCallTags(right, scope, false);
              if (left.length === 0) {
                left = "undefined";
              }
              if (right.length === 0) {
                right = "undefined";
              }
              this.say("Check if " + left + " " + eq + " " + right);
              passed = false;
              if (eq === "eq" || eq === "==") {
                if (left === right) {
                  passed = true;
                }
              } else if (eq === "ne" || eq === "!=" || eq === "<>") {
                if (left !== right) {
                  passed = true;
                }
              } else {
                try {
                  left = parseInt(left);
                  right = parseInt(right);
                  if (eq === "<" && left < right) {
                    passed = true;
                  } else if (eq === "<=" && left <= right) {
                    passed = true;
                  } else if (eq === ">" && left > right) {
                    passed = true;
                  } else if (eq === ">=" && left >= right) {
                    passed = true;
                  }
                } catch (_error) {
                  e = _error;
                  this.warn("Failed to evaluate numeric condition!");
                }
              }
              if (passed) {
                reply = potreply;
                break;
              }
            }
          }
        }
        if (reply !== void 0 && reply.length > 0) {
          break;
        }
        bucket = [];
        ref5 = matched.reply;
        for (s = 0, len5 = ref5.length; s < len5; s++) {
          rep = ref5[s];
          weight = 1;
          match = rep.match(/\{weight=(\d+?)\}/i);
          if (match) {
            weight = match[1];
            if (weight <= 0) {
              this.warn("Can't have a weight <= 0!");
              weight = 1;
            }
          }
          for (i = t = 0, ref6 = weight; 0 <= ref6 ? t <= ref6 : t >= ref6; i = 0 <= ref6 ? ++t : --t) {
            bucket.push(rep);
          }
        }
        choice = parseInt(Math.random() * bucket.length);
        reply = bucket[choice];
        break;
      }
    }
    if (!foundMatch) {
      reply = this.master.errors.replyNotMatched;
    } else if (reply === void 0 || reply.length === 0) {
      reply = this.master.errors.replyNotFound;
    }
    this.say("Reply: " + reply);
    if (context === "begin") {
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
        reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "");
        match = reply.match(/\{topic=(.+?)\}/i);
      }
      match = reply.match(/<set (.+?)=(.+?)>/i);
      giveup = 0;
      while (match) {
        giveup++;
        if (giveup >= 50) {
          this.warn("Infinite loop looking for set tag!");
          break;
        }
        name = match[1];
        value = match[2];
        this.master.setUservar(user, name, value);
        reply = reply.replace(new RegExp("<set " + utils.quotemeta(name) + "=" + utils.quotemeta(value) + ">", "ig"), "");
        match = reply.match(/<set (.+?)=(.+?)>/i);
      }
    } else {
      reply = this.processTags(user, msg, reply, stars, thatstars, step, scope);
    }
    return reply;
  };

  Brain.prototype.formatMessage = function(msg, botreply) {
    msg = "" + msg;
    msg = this.substitute(msg, "sub");
    msg = msg.trim();
    msg = msg.replace(/\s+/g, " ");
    return msg;
  };

  Brain.prototype.triggerRegexp = function(user, regexp) {
    var giveup, i, j, l, len, len1, match, n, name, opts, p, parts, pipes, ref, rep, type;
    regexp = regexp.replace(/^\*$/, "<zerowidthstar>");
    regexp = regexp.replace(/\*/g, "(.+?)");
    regexp = regexp.replace(/#/g, "(\\d+?)");
    regexp = regexp.replace(/_/g, "(\\w+?)");
    regexp = regexp.replace(/\s*\{weight=\d+\}\s*/g, "");
    regexp = regexp.replace(/<zerowidthstar>/g, "(.*?)");
    regexp = regexp.replace(/\|{2,}/, '|');
    regexp = regexp.replace(/(\(|\[)\|/g, '$1');
    regexp = regexp.replace(/\|(\)|\])/g, '$1');
    if (this.utf8) {
      regexp = regexp.replace(/\\@/, "\\u0040");
    }
    match = regexp.match(/\[(.+?)\]/);
    giveup = 0;
    while (match) {
      if (giveup++ > 50) {
        this.warn("Infinite loop when trying to process optionals in a trigger!");
        return "";
      }
      parts = match[1].split("|");
      opts = [];
      for (j = 0, len = parts.length; j < len; j++) {
        p = parts[j];
        opts.push("(?:\\s|\\b)+" + p + "(?:\\s|\\b)+");
      }
      pipes = opts.join("|");
      pipes = pipes.replace(new RegExp(utils.quotemeta("(.+?)"), "g"), "(?:.+?)");
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\d+?)"), "g"), "(?:\\d+?)");
      pipes = pipes.replace(new RegExp(utils.quotemeta("(\\w+?)"), "g"), "(?:\\w+?)");
      pipes = pipes.replace(/\[/g, "__lb__").replace(/\]/g, "__rb__");
      regexp = regexp.replace(new RegExp("\\s*\\[" + utils.quotemeta(match[1]) + "\\]\\s*"), "(?:" + pipes + "|(?:\\b|\\s)+)");
      match = regexp.match(/\[(.+?)\]/);
    }
    regexp = regexp.replace(/__lb__/g, "[").replace(/__rb__/g, "]");
    regexp = regexp.replace(/\\w/, "[^\\s\\d]");
    giveup = 0;
    while (regexp.indexOf("@") > -1) {
      if (giveup++ > 50) {
        break;
      }
      match = regexp.match(/\@(.+?)\b/);
      if (match) {
        name = match[1];
        rep = "";
        if (this.master._array[name]) {
          rep = "(?:" + this.master._array[name].join("|") + ")";
        }
        regexp = regexp.replace(new RegExp("@" + utils.quotemeta(name) + "\\b"), rep);
      }
    }
    giveup = 0;
    while (regexp.indexOf("<bot") > -1) {
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
        regexp = regexp.replace(new RegExp("<bot " + utils.quotemeta(name) + ">"), rep.toLowerCase());
      }
    }
    giveup = 0;
    while (regexp.indexOf("<get") > -1) {
      if (giveup++ > 50) {
        break;
      }
      match = regexp.match(/<get (.+?)>/i);
      if (match) {
        name = match[1];
        rep = this.master.getUservar(user, name);
        regexp = regexp.replace(new RegExp("<get " + utils.quotemeta(name) + ">", "ig"), rep.toLowerCase());
      }
    }
    giveup = 0;
    regexp = regexp.replace(/<input>/i, "<input1>");
    regexp = regexp.replace(/<reply>/i, "<reply1>");
    while (regexp.indexOf("<input") > -1 || regexp.indexOf("<reply") > -1) {
      if (giveup++ > 50) {
        break;
      }
      ref = ["input", "reply"];
      for (l = 0, len1 = ref.length; l < len1; l++) {
        type = ref[l];
        for (i = n = 1; n <= 9; i = ++n) {
          if (regexp.indexOf("<" + type + i + ">") > -1) {
            regexp = regexp.replace(new RegExp("<" + type + i + ">", "g"), this.master._users[user].__history__[type][i]);
          }
        }
      }
    }
    if (this.utf8 && regexp.indexOf("\\u") > -1) {
      regexp = regexp.replace(/\\u([A-Fa-f0-9]{4})/, function(match, grp) {
        return String.fromCharCode(parseInt(grp, 16));
      });
    }
    regexp = regexp.replace(/\|{2,}/mg, '|');
    return regexp;
  };

  Brain.prototype.processTags = function(user, msg, reply, st, bst, step, scope) {
    var botstars, content, data, formats, giveup, i, insert, j, l, len, match, n, name, o, output, parts, random, ref, ref1, replace, result, stars, subreply, tag, target, text, type, value;
    stars = [""];
    stars.push.apply(stars, st);
    botstars = [""];
    botstars.push.apply(botstars, bst);
    if (stars.length === 1) {
      stars.push("undefined");
    }
    if (botstars.length === 1) {
      botstars.push("undefined");
    }
    match = reply.match(/\(@([A-Za-z0-9_]+)\)/i);
    giveup = 0;
    while (match) {
      if (giveup++ > this.master._depth) {
        this.warn("Infinite loop looking for arrays in reply!");
        break;
      }
      name = match[1];
      if (this.master._array[name]) {
        result = "{random}" + this.master._array[name].join("|") + "{/random}";
      } else {
        result = "\x00@" + name + "\x00";
      }
      reply = reply.replace(new RegExp("\\(@" + utils.quotemeta(name) + "\\)", "ig"), result);
      match = reply.match(/\(@([A-Za-z0-9_]+)\)/i);
    }
    reply = reply.replace(/\x00@([A-Za-z0-9_]+)\x00/g, "(@$1)");
    reply = this._wrapArgumentsInCallTags(reply);
    reply = reply.replace(/<person>/ig, "{person}<star>{/person}");
    reply = reply.replace(/<@>/ig, "{@<star>}");
    reply = reply.replace(/<formal>/ig, "{formal}<star>{/formal}");
    reply = reply.replace(/<sentence>/ig, "{sentence}<star>{/sentence}");
    reply = reply.replace(/<uppercase>/ig, "{uppercase}<star>{/uppercase}");
    reply = reply.replace(/<lowercase>/ig, "{lowercase}<star>{/lowercase}");
    reply = reply.replace(/\{weight=\d+\}/ig, "");
    reply = reply.replace(/<star>/ig, stars[1]);
    reply = reply.replace(/<botstar>/ig, botstars[1]);
    for (i = j = 1, ref = stars.length; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
      reply = reply.replace(new RegExp("<star" + i + ">", "ig"), stars[i]);
    }
    for (i = l = 1, ref1 = botstars.length; 1 <= ref1 ? l <= ref1 : l >= ref1; i = 1 <= ref1 ? ++l : --l) {
      reply = reply.replace(new RegExp("<botstar" + i + ">", "ig"), botstars[i]);
    }
    reply = reply.replace(/<input>/ig, this.master._users[user].__history__.input[0] || "undefined");
    reply = reply.replace(/<reply>/ig, this.master._users[user].__history__.reply[0] || "undefined");
    for (i = n = 1; n <= 9; i = ++n) {
      if (reply.indexOf("<input" + i + ">") > -1) {
        reply = reply.replace(new RegExp("<input" + i + ">", "ig"), this.master._users[user].__history__.input[i]);
      }
      if (reply.indexOf("<reply" + i + ">") > -1) {
        reply = reply.replace(new RegExp("<reply" + i + ">", "ig"), this.master._users[user].__history__.reply[i]);
      }
    }
    reply = reply.replace(/<id>/ig, user);
    reply = reply.replace(/\\s/ig, " ");
    reply = reply.replace(/\\n/ig, "\n");
    reply = reply.replace(/\\#/ig, "#");
    match = reply.match(/\{random\}(.+?)\{\/random\}/i);
    giveup = 0;
    while (match) {
      if (giveup++ > this.master._depth) {
        this.warn("Infinite loop looking for random tag!");
        break;
      }
      random = [];
      text = match[1];
      if (text.indexOf("|") > -1) {
        random = text.split("|");
      } else {
        random = text.split(" ");
      }
      output = random[parseInt(Math.random() * random.length)];
      reply = reply.replace(new RegExp("\\{random\\}" + utils.quotemeta(text) + "\\{\\/random\\}", "ig"), output);
      match = reply.match(/\{random\}(.+?)\{\/random\}/i);
    }
    formats = ["person", "formal", "sentence", "uppercase", "lowercase"];
    for (o = 0, len = formats.length; o < len; o++) {
      type = formats[o];
      match = reply.match(new RegExp("{" + type + "}(.+?){/" + type + "}", "i"));
      giveup = 0;
      while (match) {
        giveup++;
        if (giveup >= 50) {
          this.warn("Infinite loop looking for " + type + " tag!");
          break;
        }
        content = match[1];
        if (type === "person") {
          replace = this.substitute(content, "person");
        } else {
          replace = utils.stringFormat(type, content);
        }
        reply = reply.replace(new RegExp(("{" + type + "}") + utils.quotemeta(content) + ("{/" + type + "}"), "ig"), replace);
        match = reply.match(new RegExp("{" + type + "}(.+?){/" + type + "}", "i"));
      }
    }
    reply = reply.replace(/<call>/ig, "«__call__»");
    reply = reply.replace(/<\/call>/ig, "«/__call__»");
    while (true) {
      match = reply.match(/<([^<]+?)>/);
      if (!match) {
        break;
      }
      match = match[1];
      parts = match.split(" ");
      tag = parts[0].toLowerCase();
      data = "";
      if (parts.length > 1) {
        data = parts.slice(1).join(" ");
      }
      insert = "";
      if (tag === "bot" || tag === "env") {
        target = tag === "bot" ? this.master._var : this.master._global;
        if (data.indexOf("=") > -1) {
          parts = data.split("=", 2);
          this.say("Set " + tag + " variable " + parts[0] + " = " + parts[1]);
          target[parts[0]] = parts[1];
        } else {
          insert = target[data] || "undefined";
        }
      } else if (tag === "set") {
        parts = data.split("=", 2);
        this.say("Set uservar " + parts[0] + " = " + parts[1]);
        this.master.setUservar(user, parts[0], parts[1]);
      } else if (tag === "add" || tag === "sub" || tag === "mult" || tag === "div") {
        parts = data.split("=");
        name = parts[0];
        value = parts[1];
        if (this.master.getUservar(user, name) === "undefined") {
          this.master.setUservar(user, name, 0);
        }
        value = parseInt(value);
        if (isNaN(value)) {
          insert = "[ERR: Math can't '" + tag + "' non-numeric value '" + value + "']";
        } else if (isNaN(parseInt(this.master.getUservar(user, name)))) {
          insert = "[ERR: Math can't '" + tag + "' non-numeric user variable '" + name + "']";
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
          if (insert === "") {
            this.master.setUservar(user, name, result);
          }
        }
      } else if (tag === "get") {
        insert = this.master.getUservar(user, data);
      } else {
        insert = "\x00" + match + "\x01";
      }
      reply = reply.replace(new RegExp("<" + (utils.quotemeta(match)) + ">"), insert);
    }
    reply = reply.replace(/\x00/g, "<");
    reply = reply.replace(/\x01/g, ">");
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
      reply = reply.replace(new RegExp("{topic=" + utils.quotemeta(name) + "}", "ig"), "");
      match = reply.match(/\{topic=(.+?)\}/i);
    }
    match = reply.match(/\{@([^\}]*?)\}/);
    giveup = 0;
    while (match) {
      giveup++;
      if (giveup >= 50) {
        this.warn("Infinite loop looking for redirect tag!");
        break;
      }
      target = utils.strip(match[1]);
      target = this.processCallTags(target, scope, false);
      this.say("Inline redirection to: " + target);
      subreply = this._getReply(user, target, "normal", step + 1, scope);
      reply = reply.replace(new RegExp("\\{@" + utils.quotemeta(match[1]) + "\\}", "i"), subreply);
      match = reply.match(/\{@([^\}]*?)\}/);
    }
    return reply;
  };

  Brain.prototype.substitute = function(msg, type) {
    var fi, giveup, li, maxwords, pattern, result, subgiveup, subpattern, subs, tries;
    if (!this.master._sorted[type]) {
      this.master.warn("You forgot to call sortReplies()!");
      return "";
    }
    subs = type === "sub" ? this.master._sub : this.master._person;
    maxwords = type === "sub" ? this.master._submax : this.master._personmax;
    result = "";
    if (this.master.unicodePunctuation != null) {
      pattern = msg.replace(this.master.unicodePunctuation, "");
    } else {
      pattern = msg.replace(/[.,!?;:]/g, "");
    }
    tries = 0;
    giveup = 0;
    subgiveup = 0;
    while (pattern.indexOf(" ") > -1) {
      giveup++;
      if (giveup >= 1000) {
        this.warn("Too many loops when handling substitutions!");
        break;
      }
      li = utils.nIndexOf(pattern, " ", maxwords);
      subpattern = pattern.substring(0, li);
      result = subs[subpattern];
      if (result !== void 0) {
        msg = msg.replace(subpattern, result);
      } else {
        while (subpattern.indexOf(" ") > -1) {
          subgiveup++;
          if (subgiveup >= 1000) {
            this.warn("Too many loops when handling substitutions!");
            break;
          }
          li = subpattern.lastIndexOf(" ");
          subpattern = subpattern.substring(0, li);
          result = subs[subpattern];
          if (result !== void 0) {
            msg = msg.replace(subpattern, result);
            break;
          }
          tries++;
        }
      }
      fi = pattern.indexOf(" ");
      pattern = pattern.substring(fi + 1);
      tries++;
    }
    result = subs[pattern];
    if (result !== void 0) {
      msg = msg.replace(pattern, result);
    }
    return msg;
  };

  return Brain;

})();

module.exports = Brain;
