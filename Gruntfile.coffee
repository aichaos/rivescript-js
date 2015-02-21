module.exports = (grunt) ->
	# Project configuration
	grunt.initConfig
		pkg: grunt.file.readJSON("package.json")
		watch:
			files: ["lib/<%= pkg.name %>.js"]
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
				src: "lib/<%= pkg.name %>.js"
				dest: "lib/<%= pkg.name %>.min.js"
		nodeunit:
			all: ["test/test-*.js"]
			options:
				reporter: "default"
		jshint:
			files: [
				"Gruntfile.js"
				"lib/<%= pkg.name %>.js"
			]
			options:
				curly: true
				eqnull: true
				eqeqeq: true
				undef: true
				laxbreak: true
				evil: true, # Don't warn about eval in our JS object handler
				globals:
					$: true,
					require: true,
					module: true,
					console: true,
					window: true
		connect:
			server:
				options:
					protocol: "http"
					hostname: "127.0.0.1"
					port: 8000
					base: "eg"
					directory: "eg"
					keepalive: true
					open: "http://localhost:8000/chat.html"
					middleware: (connect, options, middlewares) ->
						# Allow rivescript.js to be accessed from the web root.
						middlewares.unshift (req, res, next) ->
							if req.url is "/lib/rivescript.js"
								return res.end(grunt.file.read("lib/rivescript.js"))
							else
								return next()
						return middlewares

	# Grunt plugins
	grunt.loadNpmTasks("grunt-contrib-connect")  # Simple web server
	grunt.loadNpmTasks("grunt-contrib-coffee")   # CoffeeScript compiler
	grunt.loadNpmTasks("grunt-contrib-uglify")   # Minify JS
	grunt.loadNpmTasks("grunt-contrib-jshint")   # JSLint
	grunt.loadNpmTasks("grunt-contrib-watch")    # Watch JS for live changes
	grunt.loadNpmTasks("grunt-contrib-nodeunit") # Unit testing

	# Tasks
	grunt.registerTask "default", ["coffee"]
	grunt.registerTask "test", ["nodeunit"]
