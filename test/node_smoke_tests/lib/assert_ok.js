"use strict";

var assert = require( "assert" ),
	count = 0;

// Thin logging wrapper around assert.ok, so that every executed assertion
// leaves a visible line in the CI log. A failing assertion still throws, which
// exits the test process with a non-zero code and turns the build red.
module.exports = function assertOk( value, message ) {
	assert.ok( value, message );

	count++;
	console.log( "ok " + count + " - " + message );
};
