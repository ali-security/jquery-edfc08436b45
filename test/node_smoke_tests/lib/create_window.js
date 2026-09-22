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
//
// An optional url makes document.location.href a resolvable base instead of the
// default "about:blank"; parse_html_inert_document.js needs that to check that
// relative URLs in parsed markup still resolve (gh-2965). Callers that do not
// care about URLs keep calling createWindow() with no argument.
module.exports = function createWindow( url ) {
	var html = "<html><head></head><body></body></html>",
		options = url ? { "url": url } : undefined,
		window,
		document;

	if ( typeof jsdom.JSDOM === "function" ) {

		// jsdom >= 10: the JSDOM constructor exposes the window directly.
		window = new jsdom.JSDOM( html, options ).window;
	} else if ( typeof jsdom.jsdom === "function" ) {

		// jsdom 3.x-9.x legacy API: jsdom.jsdom( html ) returns a document whose
		// window is document.parentWindow, with document.defaultView as an alias.
		// Its second argument is the DOM level, not an options object, so the url
		// is not forwarded here; callers that need one assert on it themselves.
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
