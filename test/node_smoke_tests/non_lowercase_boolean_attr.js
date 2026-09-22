"use strict";

// Regression test for CVE-2016-10707: reading a boolean attribute through a
// name that is not all-lowercase sent jQuery into infinite recursion.
//
// jQuery installs a getter on jQuery.expr.attrHandle for every boolean
// attribute ("checked", "required", "autofocus", ...). To read the underlying
// attribute without calling itself again, that getter temporarily removes
// itself from attrHandle before delegating to jQuery.find.attr. It used to save
// and restore attrHandle[ name ], where name is the name the caller passed in,
// while Sizzle looks the getter up under name.toLowerCase(). So for a name such
// as "Checked" the getter blanked attrHandle[ "Checked" ] -- a key nobody reads
// -- left attrHandle[ "checked" ] pointing at itself, and recursed until the
// stack blew up. Every path that reaches the getter with a mixed-case name is
// then a denial of service: a "RangeError: Maximum call stack size exceeded"
// (or a hung tab in a browser) from a single attribute read or selector match.
//
// The fix keys the save/restore off name.toLowerCase(), the same key Sizzle
// uses, so the getter really is out of the way while it delegates.
//
// The three vectors asserted below are the three ways user input reaches that
// getter: jQuery.find.attr() (the Sizzle attribute getter itself), an attribute
// selector carrying the mixed-case name, and .attr(). Against the unpatched
// library the first two throw RangeError instead of returning a value.
//
// Syntax is deliberately kept to ES5 (see lib/create_window.js).

var assertOk = require( "./lib/assert_ok" ),
	createWindow = require( "./lib/create_window" ),
	window = createWindow(),
	jQuery = require( "../../dist/jquery.js" )( window ),
	elem = jQuery( "<input checked required autofocus type='checkbox'>" ),
	inputs = jQuery( "<input checked><input checked>" ),
	filtered;

assertOk( elem.length === 1 && inputs.length === 2,
	"the test elements were created" );

jQuery.each( {
	checked: "Checked",
	required: "requiRed",
	autofocus: "AUTOFOCUS"
}, function( lowercased, original ) {
	var viaFind, viaAttr;

	// Vector 1: the Sizzle attribute getter, which is what hands the
	// caller-supplied casing to the boolean attrHandle in the first place.
	try {
		viaFind = jQuery.find.attr( elem[ 0 ], original );
	} catch ( e ) {
		assertOk( false, "jQuery.find.attr( elem, \"" + original + "\" ) threw " +
			( e && e.name ) );
	}

	assertOk( viaFind === lowercased,
		"jQuery.find.attr( elem, \"" + original + "\" ) returned the lowercased " +
			"name (got " + viaFind + ")" );

	// Vector 3: the public getter.
	try {
		viaAttr = elem.attr( original );
	} catch ( e ) {
		assertOk( false, ".attr( \"" + original + "\" ) threw " + ( e && e.name ) );
	}

	assertOk( viaAttr === lowercased,
		".attr( \"" + original + "\" ) returned the lowercased name (got " +
			viaAttr + ")" );
} );

// Vector 2: an attribute selector spelling the boolean attribute in another
// case. Filtering a set of more than one element goes through
// jQuery.find.matches, which runs Sizzle's own ATTR filter instead of the
// browser's native matcher, so the mixed-case name reaches the attrHandle.
try {
	filtered = inputs.filter( "[CHECKED]" );
} catch ( e ) {
	assertOk( false, "filtering by \"[CHECKED]\" threw " + ( e && e.name ) );
}

assertOk( filtered.length === 2,
	"a mixed-case attribute selector still matches both inputs (got " +
		filtered.length + ")" );

// The getter must leave jQuery.expr.attrHandle exactly as it found it; a stale
// entry there would break every later attribute read.
assertOk( typeof jQuery.expr.attrHandle.checked === "function",
	"the boolean attrHandle was restored after the getters ran" );

assertOk( jQuery.expr.attrHandle.Checked === undefined,
	"no mixed-case key was left behind on jQuery.expr.attrHandle" );

// Finally, show that the assertions above are not vacuously true: put the
// pre-fix getter back (it is the shipped one with lowercaseName spelled out as
// the caller-supplied name again) and confirm that it does blow the stack on
// the very same call. If a future change reintroduced the bug, the assertions
// above would fail; this one guarantees they would have something to catch.
var patchedHandle = jQuery.expr.attrHandle.checked,
	getter = jQuery.find.attr,
	vulnerableThrew = false;

jQuery.expr.attrHandle.checked = function( elem, name, isXML ) {
	var ret, handle;
	if ( !isXML ) {
		handle = jQuery.expr.attrHandle[ name ];
		jQuery.expr.attrHandle[ name ] = ret;
		ret = getter( elem, name, isXML ) != null ?
			name.toLowerCase() :
			null;
		jQuery.expr.attrHandle[ name ] = handle;
	}
	return ret;
};

try {
	jQuery.find.attr( elem[ 0 ], "Checked" );
} catch ( e ) {
	vulnerableThrew = e instanceof RangeError;
}

// The recursion never reaches its own restore step, so clean up by hand.
jQuery.expr.attrHandle.checked = patchedHandle;
delete jQuery.expr.attrHandle.Checked;

assertOk( vulnerableThrew,
	"the pre-fix getter recurses until the stack overflows on the same call" );

assertOk( jQuery.find.attr( elem[ 0 ], "Checked" ) === "checked",
	"the shipped getter still answers that call after the comparison" );
