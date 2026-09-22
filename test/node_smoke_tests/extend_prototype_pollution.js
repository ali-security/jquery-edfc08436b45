"use strict";

// Regression test for CVE-2019-11358: Object.prototype pollution through
// jQuery.extend( true, ... ).
//
// The deep-copy loop in jQuery.extend walked every enumerable key of the source
// object, including an own "__proto__" key of the kind JSON.parse builds from
// '{"__proto__": {...}}' (a key an object literal in source code cannot
// produce, because there the colon form sets the prototype instead). For that
// key the loop read src = target[ "__proto__" ], which is the target's own
// prototype -- Object.prototype for a plain {} target -- and
// jQuery.isPlainObject( Object.prototype ) is true, so the recursive call was
// handed Object.prototype itself as the object to merge into. Every property of
// the attacker-controlled payload was then written onto Object.prototype and
// inherited by every object in the process, which is how a single merge of
// untrusted JSON flips flags such as "devMode" or "isAdmin" in code that never
// went near the attacker's data.
//
// The fix skips the poisoned key outright, in the same place that already
// guarded against the never-ending loop:
//
//     if ( name === "__proto__" || target === copy ) { continue; }
//
// The vectors asserted below are the ways that key reaches the loop: at the top
// level of the source, nested one level deeper so it arrives through the
// recursive call, merged over a non-empty target the way option defaults are
// merged with user-supplied options, and through a shallow (non-deep) extend.
// A no-regression check follows, and the final block replays the pre-fix loop
// on the very same payload to show it really does pollute Object.prototype, so
// the assertions above are not vacuously true.
//
// Syntax is deliberately kept to ES5 (see lib/create_window.js).

var assertOk = require( "./lib/assert_ok" ),
	createWindow = require( "./lib/create_window" ),
	window = createWindow(),
	jQuery = require( "../../dist/jquery.js" )( window ),
	hasOwn = Object.prototype.hasOwnProperty,
	payload = "{\"__proto__\": {\"devMode\": true}}",
	nested,
	defaults,
	shallow,
	deepMerged,
	pollutedByVulnerable;

// Vector 1: the proof of concept quoted by the advisory -- a deep extend into a
// fresh object from JSON carrying an own enumerable "__proto__".
jQuery.extend( true, {}, JSON.parse( payload ) );

assertOk( !( "devMode" in {} ),
	"Object.prototype not polluted by a top-level __proto__ key" );

assertOk( ( {} ).devMode === undefined,
	"a freshly created object does not inherit devMode" );

// Vector 2: the same key one level down, so it is the recursive jQuery.extend
// call -- not the outermost one -- that sees it.
nested = jQuery.extend( true, {},
	JSON.parse( "{\"cfg\": {\"__proto__\": {\"isAdmin\": true}}}" ) );

assertOk( !( "isAdmin" in {} ),
	"Object.prototype not polluted by a nested __proto__ key" );

assertOk( nested.cfg && nested.cfg.isAdmin === undefined,
	"the nested __proto__ payload was not copied onto the merged object" );

// Vector 3: the realistic funnel -- untrusted JSON merged over a non-empty
// defaults object, which is what application code passes to jQuery.extend.
defaults = { "timeout": 100 };
jQuery.extend( true, defaults,
	JSON.parse( "{\"timeout\": 500, \"__proto__\": {\"polluted\": true}}" ) );

assertOk( !( "polluted" in {} ),
	"Object.prototype not polluted when merging over existing defaults" );

assertOk( defaults.timeout === 500,
	"the legitimate key alongside the payload was still merged (got " +
		defaults.timeout + ")" );

assertOk( !hasOwn.call( defaults, "__proto__" ),
	"no own __proto__ property was created on the target" );

assertOk( Object.getPrototypeOf( defaults ) === Object.prototype,
	"the target's own prototype was left alone" );

// Vector 4: a shallow extend. It never recursed into Object.prototype, but it
// did assign through target.__proto__ and so replaced the target's prototype
// with attacker-controlled data; the same guard covers it.
shallow = jQuery.extend( {},
	JSON.parse( "{\"__proto__\": {\"shallowPollution\": true}}" ) );

assertOk( !( "shallowPollution" in {} ),
	"Object.prototype not polluted by a shallow extend" );

assertOk( Object.getPrototypeOf( shallow ) === Object.prototype,
	"a shallow extend did not swap the target's prototype" );

assertOk( shallow.shallowPollution === undefined,
	"the shallow target did not inherit the payload" );

// No regression: ordinary deep merging still behaves exactly as before.
deepMerged = jQuery.extend( true, { "a": { "x": 1 } },
	{ "a": { "y": 2 }, "list": [ 1, 2 ] } );

assertOk( deepMerged.a.x === 1 && deepMerged.a.y === 2,
	"ordinary keys are still deep merged" );

assertOk( jQuery.isArray( deepMerged.list ) && deepMerged.list.length === 2,
	"arrays are still cloned during a deep merge" );

// Finally, replay the pre-fix loop (the shipped one with the name ===
// "__proto__" guard removed) on the same payload and confirm it does reach
// Object.prototype. Without this, every assertion above could pass on a build
// where the vulnerable path had simply stopped being reachable.
function vulnerableExtend( deep, target, options ) {
	var src, copy, copyIsArray, clone, name;

	for ( name in options ) {
		src = target[ name ];
		copy = options[ name ];

		// Prevent never-ending loop
		if ( target === copy ) {
			continue;
		}

		if ( deep && copy &&
			( jQuery.isPlainObject( copy ) ||
				( copyIsArray = jQuery.isArray( copy ) ) ) ) {

			if ( copyIsArray ) {
				copyIsArray = false;
				clone = src && jQuery.isArray( src ) ? src : [];
			} else {
				clone = src && jQuery.isPlainObject( src ) ? src : {};
			}

			target[ name ] = vulnerableExtend( deep, clone, copy );

		} else if ( copy !== undefined ) {
			target[ name ] = copy;
		}
	}

	return target;
}

vulnerableExtend( true, {}, JSON.parse( payload ) );

pollutedByVulnerable = ( {} ).devMode === true;

// The pollution is process-wide, so undo it immediately.
delete Object.prototype.devMode;

assertOk( pollutedByVulnerable,
	"the pre-fix deep-copy loop does pollute Object.prototype on the same input" );

assertOk( !( "devMode" in {} ),
	"the deliberate pollution was cleaned up again" );

assertOk( jQuery.extend( true, {}, JSON.parse( payload ) ) &&
	!( "devMode" in {} ),
	"the shipped jQuery.extend still refuses the payload after the comparison" );
