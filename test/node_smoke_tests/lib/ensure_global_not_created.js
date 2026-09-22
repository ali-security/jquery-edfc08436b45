"use strict";

var assert = require( "assert" );

// Ensure the jQuery property on global/window/module.exports/etc. was not
// created in a CommonJS environment.
// `global` is always checked in addition to passed parameters.
//
// Deviation from the jQuery 1.12.4 original: a console.log per checked object,
// so the CI log records the assertions actually running.
module.exports = function ensureGlobalNotCreated() {
	var args = [].slice.call( arguments ).concat( global );

	args.forEach( function( object ) {
		assert.strictEqual( object.jQuery, undefined,
			"A jQuery global was created in a CommonJS environment." );
	} );

	console.log( "ok - no jQuery global was created (" + args.length +
		" object(s) checked)" );
};
