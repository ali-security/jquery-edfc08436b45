"use strict";

// Backported from jQuery 1.12.4's
// test/node_smoke_tests/document_present_originally.js, with the jsdom
// bootstrap adapted to jsdom 3.x (see lib/create_window.js).
//
// Assigning global.window before requiring dist/jquery.js makes the bare
// `window` identifier resolve inside the UMD wrapper, so the wrapper passes the
// jsdom window as its `global` argument, sees a truthy global.document, and
// calls factory( global, true ). The `true` is jQuery's `noGlobal` flag, so
// this time jQuery must NOT assign window.jQuery -- hence `window` IS passed to
// ensureGlobalNotCreated below, unlike in document_passed.js.
//
// This is why the tests are each spawned in their own process: they must not
// share a require cache or a mutated global.

var createWindow = require( "./lib/create_window" ),
	ensureJQuery = require( "./lib/ensure_jquery" ),
	ensureGlobalNotCreated = require( "./lib/ensure_global_not_created" ),
	window = createWindow();

// Pretend the window is a global.
global.window = window;

var jQuery = require( "../../dist/jquery.js" );

ensureJQuery( jQuery );
ensureGlobalNotCreated( module.exports, window );
