/**
 * RiveScript.js
 *
 * This code is released under the MIT License.
 * See the "LICENSE" file for more information.
 *
 * http://www.rivescript.com/
 */

/**
 * Miscellaneous utility functions.
 */

/**
 * Object clone (object)
 *
 * Clone an object.
 */

const clone = (obj) => {
    if (obj === null || typeof obj !== "object") {
      return obj
    }
    const copy = obj.constructor()
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) {
        copy[key] = clone(obj[key])
      }
    }
    return copy
  },

  /**
   * Void extend (object a, object b)
   *
   * Combine the properties of both objects into one. The properties from
   * object 'b' are inserted into 'a'.
   */

  extend = (a, b) => (() => {
    const result = []
    for (const attr in b) {
      const value = b[attr]
      if (!b.hasOwnProperty.call(attr)) {
        result.push(a[attr] = value)
      }
    }
    return result
  })(),

  /**
   * Boolean isAPromise (object)
   *
   * Determines if obj looks like a promise
   */

  isAPromise = (obj) => obj &&
  obj.then &&
  obj.catch &&
  obj.finally &&
  typeof obj.then === "function" &&
  typeof obj.catch === "function" &&
  typeof obj.finally === "function",

  /**
   * Bool isAtomic (string trigger)
   *
   * Determine whether a trigger is atomic.
   */

  isAtomic = (trigger) => {
    /**
     * Atomic triggers don't contain any wildcards or parenthesis or
     * anything of the sort. We don't need to test the full character set
     * just left brackets will do.
     */
    for (const special of[
        "*",
        "#",
        "_",
        "(",
        "[",
        "<",
        "@"
      ]) {
      if (trigger.includes(special)) {
        return false
      }
    }
    return true
  },

  /**
   * Int nIndexOf (string, string match, int index)
   *
   * Finds a match in a string at a given index
   *
   * Usage:
   * string = "My name is Rive"
   * match = " "
   * index = 2
   * return = 7
   *
   * Summary: It will look for a second space in the string
   */

  nIndexOf = (string, match, index) => string.
split(match, index).
join(match).length,

  /**
   * String quotemeta (string)
   *
   * Escape a string for a regexp.
   */

  quoteMeta = (string) => {
    const unsafe = "\\.+*?[^]$(){}=!<>|:".split("");
    for (const char of unsafe) {
      string = string.replace(new RegExp(`\\${char}`, "g"), `\\${char}`)
    }
    return string
  },

  /**
   * String stringFormat (string type, string)
   *
   * Formats a string according to one of the following types:
   * - formal
   * - sentence
   * - uppercase
   * - lowercase
   */

  stringFormat = (type, string, first) => {
    if (type === "uppercase") {
      return string.toUpperCase();
    } else if (type === "lowercase") {
      return string.toLowerCase()
    } else if (type === "sentence") {
      string = String(string);
      first = string.charAt(0).toUpperCase()
      return first + string.substring(1);
    } else if (type === "formal") {
      const words = string.split(/\s+/),
        result = []
      for (const word of words) {
        first = word.charAt(0).toUpperCase()
        result.push(first + word.substring(1))
      }
      return result.join(" ")
    }
  },

  /**
   * String strip (string)
   *
   * Strip extra whitespace from both ends of the string, and remove
   * line breaks anywhere in the string.
   */

  strip = (text) => text.
replace(/^[\s\t]+/, "").
replace(/[\s\t]+$/, "").
replace(/[\x0D\x0A]+/, ""), //eslint-disable-line

  /**
   * String stripNasties (string, bool utf8)
   *
   * Stip special characters out of a string.
   */

  stripNasties = (string, utf8) => {
    if (utf8) {
      // Allow most things in UTF8 mode.
      return string.replace(/[\\<>]+/g, "")
    }
    return string.replace(/[^A-Za-z0-9 ]/g, "")
  },

  /**
   * String trim (string)
   *
   * Compatible implementation of `String.prototype.trim()`. Strips whitespace
   * from the beginning and end of the string, but doesn't remove any
   * whitespace inside the string like `strip()` does.
   */

  trim = (text) => text.
replace(/^[\x0D\x0A\s\t]+/, ""). //eslint-disable-line
replace(/[\x0D\x0A\s\t]+$/, ""), //eslint-disable-line

  /**
   * Int word_count (string)
   *
   * Count the number of real words in a string.
   */

  wordCount = (trigger, all) => {
    let wc = 0,
      words = []
    if (all) {
      words = trigger.split(/\s+/);
    } else {
      words = trigger.split(/[\s*#_|]+/)
    }
    for (const word of words) {
      if (word.length > 0) {
        wc += 1
      }
    }
    return wc
  }

export default {
  clone,
  extend,
  isAPromise,
  isAtomic,
  nIndexOf,
  quoteMeta,
  stringFormat,
  strip,
  stripNasties,
  trim,
  wordCount
}
