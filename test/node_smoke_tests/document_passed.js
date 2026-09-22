"use strict";

// Backported from jQuery 1.12.4's test/node_smoke_tests/document_passed.js,
// with the jsdom bootstrap adapted to jsdom 3.x (see lib/create_window.js).
//
// No window global exists when dist/jquery.js is required, so the UMD wrapper
// exports a factory; calling it with a real jsdom window must bootstrap jQuery.
// In this path jQuery is invoked without the `noGlobal` flag, so it legitimately
// assigns window.jQuery -- which is why `window` is deliberately NOT passed to
// ensureGlobalNotCreated below (matching upstream).

var assertOk = require( "./lib/assert_ok" ),
	createWindow = require( "./lib/create_window" ),
	ensureJQuery = require( "./lib/ensure_jquery" ),
	ensureGlobalNotCreated = require( "./lib/ensure_global_not_created" ),
	window = createWindow(),
	document = window.document,
	jQuery = require( "../../dist/jquery.js" )( window );

ensureJQuery( jQuery );
ensureGlobalNotCreated( module.exports );

// Exercise a little real jQuery behaviour against the jsdom document, so the
// run proves the library actually works rather than only that it loaded.
assertOk( jQuery( document.body ).length === 1,
	"jQuery( document.body ) wraps exactly one element" );

assertOk( jQuery( "<div></div>" ).addClass( "sealed" ).hasClass( "sealed" ),
	"addClass/hasClass round-trips on a detached element" );

jQuery( "<div id='smoke-target'>original</div>" ).appendTo( document.body );

assertOk( jQuery( "#smoke-target", document ).length === 1,
	"an appended element is found by id selector" );

assertOk( jQuery( "#smoke-target", document ).text() === "original",
	"text() reads the appended element's text" );

jQuery( "#smoke-target", document ).text( "replaced" );

assertOk( jQuery( "#smoke-target", document ).text() === "replaced",
	"text( value ) updates the element's text" );

assertOk( jQuery( "#smoke-target", document ).attr( "data-smoke", "yes" )
		.attr( "data-smoke" ) === "yes",
	"attr() writes and reads an attribute" );

jQuery( "#smoke-target", document ).remove();

assertOk( jQuery( "#smoke-target", document ).length === 0,
	"remove() detaches the element from the document" );

assertOk( jQuery.trim( "  spaced  " ) === "spaced",
	"jQuery.trim strips surrounding whitespace" );

assertOk( jQuery.isArray( [] ) && !jQuery.isArray( {} ),
	"jQuery.isArray discriminates arrays from plain objects" );

assertOk( jQuery.map( [ 1, 2, 3 ], function( n ) {
		return n * 2;
	} ).join( "," ) === "2,4,6",
	"jQuery.map transforms each element" );
