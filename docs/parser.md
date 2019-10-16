# Parser (RiveScript master)

Create a parser object to handle parsing RiveScript code.

## object parse (string filename, string code[, func onError])

Read and parse a RiveScript document. Returns a data structure that
represents all of the useful contents of the document, in this format:

```javascript
{
  "begin": { // "begin" data
    "global": {}, // ! global vars
    "var": {},    // ! bot vars
    "sub": {},    // ! sub substitutions
    "person": {}, // ! person substitutions
    "array": {},  // ! array lists
  },
  "topics": { // main reply data
    "random": { // (topic name)
      "includes": {}, // included topics
      "inherits": {}, // inherited topics
      "triggers": [ // array of triggers
        {
          "trigger": "hello bot",
          "reply": [], // array of replies
          "condition": [], // array of conditions
          "redirect": "",  // @ redirect command
          "previous": null, // % previous command
        },
        ...
      ]
    }
  },
  "objects": [ // parsed object macros
    {
      "name": "",     // object name
      "language": "", // programming language
      "code": [],     // object source code (in lines)
    }
  ]
}
```

onError function receives: `(err string[, filename str, line_no int])`

## string stringify (data deparsed)

Translate deparsed data into the source code of a RiveScript document.
See the `stringify()` method on the parent RiveScript class; this is its
implementation.

## string checkSyntax (char command, string line)

Check the syntax of a RiveScript command. `command` is the single character
command symbol, and `line` is the rest of the line after the command.

Returns an empty string on success, or a description of the error on error.

## private void initTopic (object topics, string name)

Initialize the topic tree for the parsing phase. Sets up the topic under
ast.topics with all its relevant keys and sub-keys, etc.