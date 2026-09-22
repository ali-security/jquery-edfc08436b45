"use strict";

// Backported from jQuery 1.12.4's test/node_smoke_tests/document_missing.js.
//
// In a CommonJS environment with no window carrying a document, jQuery's UMD
// wrapper (src/intro.js) must export a jQuery-making *factory* rather than a
// jQuery instance, and that factory must refuse a window without a document.
// This test needs no DOM at all, so it does not require jsdom.

var assert = require( "assert" ),
	ensureGlobalNotCreated = require( "./lib/ensure_global_not_created" ),
	jQueryFactory = require( "../../dist/jquery.js" );

assert.strictEqual( typeof jQueryFactory, "function",
	"dist/jquery.js should export a factory function when no document is present" );

console.log( "ok - dist/jquery.js exported a factory function" );

assert.throws( function() {
	jQueryFactory( {} );
}, /jQuery requires a window with a document/ );

console.log( "ok - the factory rejected a window without a document" );

ensureGlobalNotCreated( module.exports );
