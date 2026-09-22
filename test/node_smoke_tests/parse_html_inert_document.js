"use strict";

// Regression test for the jQuery.parseHTML XSS fix and for its relative-URL
// follow-up (gh-2965).
//
// jQuery.parseHTML() used to build its nodes in the live document, so a payload
// such as "<img src=x onerror='...'>" was created inside a document that has a
// browsing context and the browser ran the inline event handler while merely
// *parsing* the string -- before the caller ever had a chance to sanitise or
// discard the result. The fix parses into an inert document obtained from
// document.implementation.createHTMLDocument( "" ), which has no browsing
// context and therefore runs neither scripts nor inline event handlers.
//
// jsdom never executes inline event handlers (it is created without
// runScripts), so instead of waiting for a handler that could not fire either
// way, this test asserts the structural property the fix depends on: nodes
// returned by jQuery.parseHTML() must not belong to the live document, and the
// document they do belong to must have no browsing context. Against the
// unpatched library both assertions fail, because there context is the live
// document itself.
//
// The last part covers gh-2965: the inert document is created with an
// "about:blank" URL, so without the <base href> the fix appends to its head,
// relative URLs in the parsed markup would stop resolving.
//
// Syntax is deliberately kept to ES5 (see lib/create_window.js).

var assertOk = require( "./lib/assert_ok" ),
	createWindow = require( "./lib/create_window" ),
	pageUrl = "https://example.com/some/dir/page.html",
	window = createWindow( pageUrl ),
	document = window.document,
	jQuery = require( "../../dist/jquery.js" )( window ),
	parsed,
	href;

assertOk( jQuery.support.createHTMLDocument === true,
	"jQuery.support.createHTMLDocument was detected in this environment" );

assertOk( document.location.href === pageUrl,
	"the live document is served from a resolvable URL" );

parsed = jQuery.parseHTML( "<img src=x onerror='window.parseHTMLError = true'>" );

assertOk( parsed.length === 1 && parsed[ 0 ].nodeName.toLowerCase() === "img",
	"jQuery.parseHTML returned the parsed img element" );

assertOk( parsed[ 0 ].ownerDocument !== document,
	"the payload was parsed in a separate document, not in the live one" );

assertOk( parsed[ 0 ].ownerDocument.defaultView == null,
	"that document has no browsing context, so inline handlers cannot run" );

assertOk( window.parseHTMLError === undefined,
	"the inline onerror handler did not run" );

// The same protection has to hold for a <script> payload.
parsed = jQuery.parseHTML( "<div></div><script>window.parseHTMLError = true;</script>",
	true );

assertOk( parsed[ 1 ].ownerDocument !== document,
	"a script payload is parsed in a separate document too" );

assertOk( window.parseHTMLError === undefined,
	"the inline script did not run" );

// gh-2965: relative URLs in the parsed markup still resolve against the live
// document's URL, because the fix gives the inert document a <base href>.
href = jQuery.parseHTML( "<a href='test.html'></a>" )[ 0 ].href;

assertOk( href === "https://example.com/some/dir/test.html",
	"a relative href resolves against the live document URL (got " + href + ")" );

// An explicitly passed context is still honoured, so callers that opt into the
// live document -- jQuery( "<div>" ) does exactly that -- keep working.
parsed = jQuery.parseHTML( "<div></div>", document );

assertOk( parsed[ 0 ].ownerDocument === document,
	"an explicitly passed context document is still used" );
