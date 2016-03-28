module.exports = (grunt) ->
  # Project configuration
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    watch:
      files: "src/**/*.coffee"
      tasks: ["coffee"]
    coffee:
      options:
        bare: true # Compile without top-level function safety wrapper
      compile:
        files: [
          expand: true
          cwd: "./src"
          src: "**/*.coffee"
          dest: "./lib"
          ext: ".js"
        ]
    uglify:
      options:
        banner: "/* <%= pkg.name %> <%= pkg.version %> -- built on " \
          + "<%= grunt.template.today('yyyy-mm-dd hh:MM:ss') %> */\n"
      build:
        src: "dist/<%= pkg.name %>.js"
        dest: "dist/<%= pkg.name %>.min.js"
    browserify:
      main:
        options:
          browserifyOptions:
            standalone: "RiveScript"
        src: "lib/rivescript.js",
        dest: "dist/rivescript.js"
    nodeunit:
      all: ["test/test-*.coffee"]
      options:
        reporter: "default"
    coffeelint:
      app: ["src/**/*.coffee"]
    connect:
      server:
        options:
          protocol: "http"
          hostname: "127.0.0.1"
          port: 8000
          base: "eg/web-client"
          directory: "eg/web-client"
          keepalive: true
          open: "http://localhost:8000/chat.html"
          middleware: (connect, options, middlewares) ->
            # Allow rivescript.js to be accessed from the web root.
            middlewares.unshift (req, res, next) ->
              if req.url is "/lib/rivescript.js"
                return res.end(grunt.file.read("dist/rivescript.js"))
              else if req.url.indexOf("/brain") == 0
                return res.end(grunt.file.read("eg" + req.url))
              else
                return next()
            return middlewares
    clean: ["dist/", "lib/"]

  # Grunt plugins
  grunt.loadNpmTasks("grunt-contrib-connect")  # Simple web server
  grunt.loadNpmTasks("grunt-contrib-coffee")   # CoffeeScript compiler
  grunt.loadNpmTasks("grunt-browserify")       # Browserify
  grunt.loadNpmTasks("grunt-contrib-uglify")   # Minify JS
  grunt.loadNpmTasks("grunt-coffeelint")       # CoffeeScript Linter
  grunt.loadNpmTasks("grunt-contrib-watch")    # Watch JS for live changes
  grunt.loadNpmTasks("grunt-contrib-nodeunit") # Unit testing
  grunt.loadNpmTasks("grunt-contrib-clean")    # Clean up build files

  # Tasks
  grunt.registerTask "default", ["coffee"]
  grunt.registerTask "buildclean", ["clean", "coffee"]
  grunt.registerTask "dist", ["coffee", "browserify", "uglify"]
  grunt.registerTask "server", ["dist", "connect:server"]
  grunt.registerTask "lint", ["coffeelint"]
  grunt.registerTask "test", ["coffee", "nodeunit"]
