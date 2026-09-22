"use strict";

var assert = require( "assert" ),
	jsdom = require( "jsdom" );

// Build a jsdom window for the smoke tests.
//
// These tests run under a modern Node (installed by .travis.yml with nvm) so
// that a current, pure-JavaScript jsdom can be used. jsdom has needed no native
// module since 4.0.0 replaced Contextify with the built-in vm module, so there
// is no compiler and no Python 2 involved. Node 0.10 still runs the grunt
// default task that builds the dist/jquery.js loaded here.
//
// Syntax is deliberately kept to ES5: jshint (pinned to 2.4.4 by
// grunt-contrib-jshint 0.8.0) lints test/**/*.js as part of that Node 0.10
// grunt run, so const/let, arrow functions and template literals would fail the
// lint even though the runtime executing this file supports them.
module.exports = function createWindow() {
	var html = "<html><head></head><body></body></html>",
		window,
		document;

	if ( typeof jsdom.JSDOM === "function" ) {

		// jsdom >= 10: the JSDOM constructor exposes the window directly.
		window = new jsdom.JSDOM( html ).window;
	} else if ( typeof jsdom.jsdom === "function" ) {

		// jsdom 3.x-9.x legacy API: jsdom.jsdom( html ) returns a document whose
		// window is document.parentWindow, with document.defaultView as an alias.
		document = jsdom.jsdom( html );
		window = document.parentWindow || document.defaultView;
	} else {
		throw new Error( "Unrecognised jsdom API: neither JSDOM nor jsdom found" );
	}

	assert.ok( window, "jsdom did not produce a window" );
	assert.ok( window.document, "the jsdom window has no document" );

	console.log( "ok - jsdom window created with a document" );

	return window;
};
