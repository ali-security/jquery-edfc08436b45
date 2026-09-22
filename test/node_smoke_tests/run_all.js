"use strict";

// Runs every jQuery node smoke test in its own child process and prints a
// machine-readable summary.
//
// Each test file exits with code 0 on success and non-zero on failure, and
// prints one line beginning with "ok" per assertion it executes. This runner
// re-emits that output, then reports a PASS or FAIL line per test plus a final
// "N tests, M assertions, F failures" tally, and exits non-zero if any test
// failed. Spawning each test separately keeps them from sharing a require cache
// or a mutated global, which matters because document_present_originally.js
// deliberately assigns global.window before loading jQuery.
//
// Syntax is deliberately kept to ES5: jshint (pinned to 2.4.4 by
// grunt-contrib-jshint 0.8.0) lints test/**/*.js during the Node 0.10 grunt
// run, so const/let, arrow functions and template literals would fail the lint
// even though the runtime executing this file supports them.

var path = require( "path" ),
	spawnSync = require( "child_process" ).spawnSync,
	tests = [
		"document_missing.js",
		"document_passed.js",
		"document_present_originally.js",
		"parse_html_inert_document.js",
		"cross_domain_script_not_executed.js",
		"non_lowercase_boolean_attr.js"
	],
	totalAssertions = 0,
	failed = [],
	jsdomVersion;

try {
	jsdomVersion = require( "jsdom/package.json" ).version;
} catch ( e ) {
	jsdomVersion = "NOT RESOLVABLE (" + e.message + ")";
}

console.log( "=== jQuery node smoke tests ===" );
console.log( "node:  " + process.version );
console.log( "jsdom: " + jsdomVersion );
console.log( "" );

tests.forEach( function( testFile ) {
	var testPath = path.join( __dirname, testFile ),
		result = spawnSync( process.execPath, [ testPath ], { encoding: "utf8" } ),
		output = ( result.stdout || "" ) + ( result.stderr || "" ),
		assertions = 0;

	console.log( "--- " + testFile + " ---" );

	if ( result.error ) {
		console.log( "could not spawn the test: " + result.error.message );
	}

	output.replace( /\s+$/, "" ).split( "\n" ).forEach( function( line ) {
		if ( line !== "" ) {
			console.log( line );
		}
		if ( /^ok\b/.test( line ) ) {
			assertions++;
		}
	} );

	totalAssertions += assertions;

	if ( result.status === 0 ) {
		console.log( "PASS " + testFile + " (" + assertions + " assertions)" );
	} else {
		failed.push( testFile );
		console.log( "FAIL " + testFile + " (" + assertions +
			" assertions, exit code " + result.status + ")" );
	}

	console.log( "" );
} );

console.log( "===============================" );
console.log( tests.length + " tests, " + totalAssertions + " assertions, " +
	failed.length + " failures" );

if ( failed.length ) {
	console.log( "failed tests: " + failed.join( ", " ) );
	console.log( "RESULT: FAIL" );
	process.exit( 1 );
}

console.log( "RESULT: PASS" );
