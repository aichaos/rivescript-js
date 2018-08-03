// From: http://eslint.org/docs/user-guide/configuring

// By default, ESLint will look for configuration files in all parent folders
// up to the root directory. This can be useful if you want all of your projects
// to follow a certain convention, but can sometimes lead to unexpected results.
// To limit ESLint to a specific project, place "root": true inside the eslintConfig
// field of the package.json file or in the .eslintrc.* file at your project’s root level. ESLint will stop looking in parent folders once it finds a configuration with "root": true.

module.exports = {
  root: true, // See above ⤴
  parser: 'babel-eslint', // Do I have a better choice?
  parserOptions: { // From: http://eslint.org/docs/user-guide/configuring
    sourceType: 'module' // sourceType - set to "script" (default)
  }, // or "module" if your code is in ECMAScript modules.
  extends: 'eslint:recommended', // I like this very much
  "env": { // Env is a replacement for the deprecated 'latest'
    "node": true, // Yes, its node
    "browser": true, // Yes, its a browser
    "es6": true // This is bleeding edge motherfuc***
  },
  parserOptions: {
    "ecmaVersion": 8 // or 2019
  },
  rules: { // Add your custom rules here
    'no-constant-condition': 0, // Allow constant condition while(true)
    'no-console': 0, // Allow console.log
    'arrow-parens': 0, // Allow paren-less arrow functions, because it's cool
    'generator-star-spacing': 0, // Allow async-await, because it's non blocking
    'no-debugger': 0 // Allow debugger during development
  }
}
