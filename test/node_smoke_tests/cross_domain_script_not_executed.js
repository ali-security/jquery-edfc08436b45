"use strict";

// Regression test for CVE-2015-9251 (gh-2432).
//
// jQuery used to sniff the Content-Type of *every* ajax response, including
// cross-domain ones, and promote a body served as "text/javascript" or
// "application/ecmascript" to the "script" dataType -- which the "text script"
// converter then hands to jQuery.globalEval(). A plain
// jQuery.ajax( "http://third-party/..." ) that never asked for a script was
// therefore enough for a hostile (or injected) third-party endpoint to run
// arbitrary JavaScript in the calling page.
//
// The fix registers an ajaxPrefilter that clears the "script" entry of
// s.contents for cross-domain requests, so content-type sniffing can no longer
// promote a cross-domain response to "script". Requests that explicitly pass
// dataType: "script" are unaffected (the contents map is only consulted for the
// auto "*" dataType), and same-domain responses keep their old behaviour.
//
// Upstream covers this with three ajaxTest() cases in test/unit/ajax.js, which
// need a browser and a PHP server. This file reproduces the same exploit
// headlessly: a transport registered in front of the stock ones replays a canned
// response whose Content-Type is application/ecmascript and whose body assigns a
// global, and each case asserts whether that global ended up being set.
//
// The window is created with jsdom's "outside-only" script mode purely so that
// the spec globals jQuery.globalEval() relies on are installed on it. Cases 2
// and 3 are the positive controls: they travel the very same transport,
// converter and globalEval path and must still execute the payload, which
// proves case 1 stays silent because of the fix and not because this
// environment cannot evaluate anything at all.
//
// Syntax is deliberately kept to ES5 (see lib/create_window.js).

var assertOk = require( "./lib/assert_ok" ),
	createWindow = require( "./lib/create_window" ),
	pageUrl = "http://example.com/some/dir/page.html",
	payload = "window.crossDomainScriptExecuted = true;",
	responseHeaders = "Content-Type: application/ecmascript\r\n",
	window = createWindow( pageUrl, "outside-only" ),
	jQuery = require( "../../dist/jquery.js" )( window ),
	lastStatus,
	lastData;

// Replay a canned JavaScript response ahead of the stock transports, both for
// the auto-detected dataType ("*") and for an explicit "script" one, so no
// network and no script-tag injection is involved.
jQuery.ajaxTransport( "+script +*", function() {
	return {
		send: function( _, callback ) {
			callback( 200, "success", { text: payload }, responseHeaders );
		},
		abort: function() {}
	};
} );

function request( options ) {
	window.crossDomainScriptExecuted = false;
	lastStatus = null;
	lastData = null;

	jQuery.ajax( jQuery.extend( {
		url: "http://third-party.example.net/endpoint",
		success: function( data ) {
			lastStatus = "success";
			lastData = data;
		},
		error: function( _, textStatus, errorThrown ) {
			lastStatus = "error (" + textStatus + ", " + errorThrown + ")";
		}
	}, options ) );
}

// 1. The exploit itself: a cross-domain request that never asked for a script.
request( { crossDomain: true } );

assertOk( lastStatus === "success",
	"cross-domain request without a dataType completed, got: " + lastStatus );

assertOk( window.crossDomainScriptExecuted !== true,
	"the cross-domain JavaScript response was NOT auto-executed" );

assertOk( lastData === payload,
	"the cross-domain response reached the caller as unevaluated text" );

// 2. Positive control: the very same response is still executed when the caller
//    explicitly asks for it, which also proves the eval path works here.
request( { crossDomain: true, dataType: "script" } );

assertOk( lastStatus === "success",
	"cross-domain request with dataType 'script' completed, got: " + lastStatus );

assertOk( window.crossDomainScriptExecuted === true,
	"an explicitly requested cross-domain script is still executed" );

// 3. Same-domain responses are untouched by the fix and keep being sniffed.
request( { url: "/some/dir/endpoint" } );

assertOk( lastStatus === "success",
	"same-domain request without a dataType completed, got: " + lastStatus );

assertOk( window.crossDomainScriptExecuted === true,
	"a same-domain JavaScript response is still auto-executed" );
