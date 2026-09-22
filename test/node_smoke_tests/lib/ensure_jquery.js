"use strict";

var assert = require( "assert" );

// Check if the object we got is the jQuery object by invoking a basic API.
//
// Deviation from the jQuery 1.12.4 original: a console.log on success. Upstream
// was silent unless an assertion threw, which left no evidence in the CI log
// that the check had run at all. Failures still throw, so the test process
// exits non-zero and the build goes red.
module.exports = function ensureJQuery( jQuery ) {
	assert( /^jQuery/.test( jQuery.expando ),
		"jQuery.expando was not detected, the jQuery bootstrap process has failed" );

	console.log( "ok - jQuery.expando detected (" + jQuery.expando + ")" );
};
