"use strict";

module.exports = function(grunt) {
	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		uglify: {
			options: {
				banner: "/* <%= pkg.name %> <%= pkg.version %> -- build on "
					+ "<%= grunt.template.today('yyyy-mm-dd hh:MM:ss') %> */\n"
			},
			build: {
				src: "dist/<%= pkg.name %>.js",
				dest: "dist/<%= pkg.name %>.min.js"
			}
		},
		browserify: {
			main: {
				options: {
					browserifyOptions: {
						standalone: "RSCoffeeScript"
					}
				},
				"src": "index.js",
				"dest": "dist/<%= pkg.name %>.js"
			}
		},
		nodeunit: {
			all: ["test/test-*.js"],
			options: {
				reporter: "default"
			}
		},
		clean: ["dist/"]
	});

	// Grunt plugins
	grunt.loadNpmTasks("grunt-browserify");       // Browserify
	grunt.loadNpmTasks("grunt-contrib-uglify");   // Minify
	grunt.loadNpmTasks("grunt-contrib-nodeunit"); // Unit testing
	grunt.loadNpmTasks("grunt-contrib-clean");    // Clean up build files

	// Tasks
	grunt.registerTask("default", ["dist"]);
	grunt.registerTask("dist", ["browserify", "uglify"]);
	grunt.registerTask("build", ["browserify"]);
	grunt.registerTask("test", ["nodeunit"]);
}
