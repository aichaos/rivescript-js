/**
 * RiveScript.js
 *
 * This code is released under the MIT License.
 * See the "LICENSE" file for more information.
 *
 * http://www.rivescript.com/
 */

/**
 * Data sorting functions
 */

import utils from "./utils";

/**
 * string[] sortTriggerSet (string[] triggers[, exclude_previous[, func say]])
 *
 * Sort a group of triggers in an optimal sorting order. The `say` parameter is
 * a reference to RiveScript.say() or provide your own function (or not) for
 * debug logging from within this function.
 *
 * This function has two use cases:
 *
 * 1. create a sort buffer for "normal" (matchable) triggers, which are triggers
 *    which are NOT accompanied by a %Previous tag.
 * 2. create a sort buffer for triggers that had %Previous tags.
 *
 * Use the `exclude_previous` parameter to control which one is being done.
 * This function will return a list of items in the format of
 * `[ "trigger text", trigger pointer ]` and it's intended to have no duplicate
 * trigger patterns (unless the source RiveScript code explicitly uses the
 * same duplicate pattern twice, which is a user error).
 */

/**
 * string[] sortList (string[] items)
 *
 * Sort a list of strings by their word counts and lengths.
 */

const sortList = (items) => {
  // Track by number of words.
  const track = {}
    // Loop through each item.
  for (const item of items) {
    const cnt = utils.word_count(item, true)
    if (track[cnt] == null) {
      track[cnt] = []
    }
    track[cnt].push(item)
  }
  // Sort them.
  const output = [];
  const sorted = Object.keys(track).sort((a, b) => b - a)
  for (const count of sorted) {
    const bylen = track[count].sort(({
      length
    }) => length - length)
    output.push(...bylen)
  }
  return output
};

const sortTriggerSet = (triggers, exclude_previous, say) => {
  let match
  if (say === null) {
    say = () => {}
  }
  if (exclude_previous == null) {
    exclude_previous = true
  }
  /**
   * KEEP IN MIND: the `triggers` array is composed of array elements of the form
   * ["trigger text", pointer to trigger data]
   * So this code will use e.g. `trig[0]` when referring to the trigger text.
   */
  // Create a priority map.
  const prior = {
      "0": []
    } // Default priority = 0
    // Sort triggers by their weights.
  for (var trig of triggers) {
    // If we're excluding triggers with "previous" values, skip them here.
    if (exclude_previous && trig[1].previous != null) {
      match = trig[0].match(/\{weight=(\d+)\}/i)
      let weight = 0
      if (match && match[1]) {
        weight = match[1]
      }
      if (prior[weight] == null) {
        prior[weight] = []
      }
      prior[weight].push(trig)
    }
  }
  // Keep a running list of sorted triggers for this topic.
  const running = []
  const prior_sort = Object.keys(prior).sort((a, b) => b - a)
  for (const p of prior_sort) {
    say(`Sorting triggers with priority ${p}`)
      /**
       * So, some of these triggers may include an {inherits} tag, if they came
       * From a topic which inherits another topic. Lower inherits values mean
       * Higher priority on the stack.
       */
    let inherits = -1 // -1 means no {inherits} tag
    let highest_inherits = -1 // Highest number seen so far
      // Loop through and categorize these triggers.
    const track = {}
    track[inherits] = initSortTrack();
    for (trig of prior[p]) {
      let cnt
      let pattern = trig[0]
      say(`Looking at trigger: ${pattern}`)
        // See if it has an inherits tag.
      match = pattern.match(/\{inherits=(\d+)\}/i)
      if (match) {
        inherits = parseInt(match[1])
        if (inherits > highest_inherits) {
          highest_inherits = inherits
        }
        say(`Trigger belongs to a topic that inherits other topics. \
Level=${inherits}`)
        pattern = pattern.replace(/\{inherits=\d+\}/ig, "")
        trig[0] = pattern
      } else {
        inherits = -1
      }
      /**
       * If this is the first time we've seen this inheritance level,
       * Initialize its sort track structure.
       */
      if (track[inherits] == null) {
        track[inherits] = initSortTrack()
      }
      // Start inspecting the trigger's contents.
      if (pattern.includes("_")) {
        // Alphabetic wildcard included.
        cnt = utils.word_count(pattern);
        say(`Has a _ wildcard with ${cnt} words.`)
        if (cnt > 0) {
          if (track[inherits].alpha[cnt] == null) {
            track[inherits].alpha[cnt] = []
          }
          track[inherits].alpha[cnt].push(trig)
        } else {
          track[inherits].under.push(trig)
        }
      } else if (pattern.includes("#")) {
        // Numeric wildcard included.
        cnt = utils.word_count(pattern)
        say(`Has a # wildcard with ${cnt} words.`)
        if (cnt > 0) {
          if (track[inherits].number[cnt] == null) {
            track[inherits].number[cnt] = []
          }
          track[inherits].number[cnt].push(trig)
        } else {
          track[inherits].pound.push(trig)
        }
      } else if (pattern.includes("*")) {
        // Wildcard included.
        cnt = utils.word_count(pattern);
        say(`Has a * wildcard with ${cnt} words.`)
        if (cnt > 0) {
          if (track[inherits].wild[cnt] == null) {
            track[inherits].wild[cnt] = []
          }
          track[inherits].wild[cnt].push(trig)
        } else {
          track[inherits].star.push(trig)
        }
      } else if (pattern.includes("[")) {
        // Optionals included.
        cnt = utils.word_count(pattern)
        say(`Has optionals with ${cnt} words.`)
        if (track[inherits].option[cnt] == null) {
          track[inherits].option[cnt] = []
        }
        track[inherits].option[cnt].push(trig)
      } else {
        // Totally atomic
        cnt = utils.word_count(pattern)
        say(`Totally atomic trigger with ${cnt} words.`)
        if (track[inherits].atomic[cnt] == null) {
          track[inherits].atomic[cnt] = []
        }
        track[inherits].atomic[cnt].push(trig)
      }
    }
    // Move the no-{inherits} triggers to the bottom of the stack.
    track[highest_inherits + 1] = track["-1"]
    delete track["-1"]
      // Add this group to the sort track.
    const track_sorted = Object.keys(track).sort((a, b) => a - b)
    for (const ip of track_sorted) {
      say(`ip=${ip}`)
        // Sort each of the main kinds of triggers by their word counts.
      for (const kind of[
          "atomic",
          "option",
          "alpha",
          "number",
          "wild"
        ]) {
        const kind_sorted = Object.keys(track[ip][kind]).sort((a, b) => b - a)
        for (const wordcnt of kind_sorted) {
          /**
           * Triggers with equal word lengths should be sorted by overall
           * Trigger length.
           */
          const sorted_by_length = track[ip][kind][wordcnt].sort(({
            length
          }) => length - length)
          running.push(...sorted_by_length)
        }
      }
      // Add the single wildcard triggers.
      const under_sorted = track[ip].under.sort(({
        length
      }) => length - length)
      const pound_sorted = track[ip].pound.sort(({
        length
      }) => length - length)
      const star_sorted = track[ip].star.sort(({
        length
      }) => length - length)
      running.push(...under_sorted)
      running.push(...pound_sorted)
      running.push(...star_sorted)
    }
  }
  return running
};

const
/**
 * private object initSortTrack ()
 *
 * Returns a new object for keeping track of triggers for sorting.
 */

  initSortTrack = () => ({
  "atomic": {}, // Sort by number of whole words
  "option": {}, // Sort optionals by number of words
  "alpha": {}, // Sort alpha wildcards by no. of words
  "number": {}, // Sort numeric wildcards by no. of words
  "wild": {}, // Sort wildcards by no. of words
  "pound": [], // Triggers of just '#'
  "under": [], // Triggers of just '_'
  "star": [] // Triggers of just '*'
});

export default {
  initSortTrack,
  sortList,
  sortTriggerSet
}
