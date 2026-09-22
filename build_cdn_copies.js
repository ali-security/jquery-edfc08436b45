/*
 * Standalone port of makeReleaseCopies() from build/release.js.
 *
 * Upstream only generates the dist/cdn/* release copies from the
 * jquery-release workflow (build/release.js -> generateArtifacts ->
 * makeReleaseCopies), which never runs as part of `grunt`. The published
 * jquery-1.11.1.tgz nevertheless contains all nine of them, so a
 * source rebuild that only runs `grunt` is missing them.
 *
 * This script reproduces makeReleaseCopies() byte-for-byte for a final
 * (non pre-release) version. Run it from the repository root after the
 * grunt build has produced dist/jquery.js, dist/jquery.min.js and
 * dist/jquery.min.map:
 *
 *     node build_cdn_copies.js
 *
 * ES5 / Node 0.10 only: the build container is node:0.10-wheezy.
 * Kept at the repository root on purpose - changes under build/ are not
 * captured by the sealing harness - and excluded from the npm tarball
 * via .npmignore.
 */

var fs = require( "fs" ),
	path = require( "path" ),

	devFile = "dist/jquery.js",
	minFile = "dist/jquery.min.js",
	mapFile = "dist/jquery.min.map",

	cdnFolder = "dist/cdn",

	// Mirrors the releaseFiles map in build/release.js.
	releaseFiles = {
		"jquery-VER.js": devFile,
		"jquery-VER.min.js": minFile,
		"jquery-VER.min.map": mapFile,
		"jquery.js": devFile,
		"jquery.min.js": minFile,
		"jquery.min.map": mapFile,
		"jquery-latest.js": devFile,
		"jquery-latest.min.js": minFile,
		"jquery-latest.min.map": mapFile
	},

	version = releaseVersion(),
	created = 0;

/*
 * The release tool substitutes Release.newVersion, i.e. the plain upstream
 * version, for VER. Derive it from package.json and drop any pre-release or
 * build suffix (e.g. a "-spN" seal suffix) so the copies keep the upstream
 * names the published tarball uses.
 */
function releaseVersion() {
	var pkg = JSON.parse( fs.readFileSync( "package.json", "utf8" ) );
	return String( pkg.version ).replace( /[-+].*$/, "" );
}

// shell.mkdir( "-p", cdnFolder ) equivalent.
function mkdirp( dir ) {
	var parent = path.dirname( dir );
	if ( fs.existsSync( dir ) ) {
		return;
	}
	if ( parent !== dir ) {
		mkdirp( parent );
	}
	fs.mkdirSync( dir );
}

mkdirp( cdnFolder );

Object.keys( releaseFiles ).forEach(function( key ) {
	var text,
		builtFile = releaseFiles[ key ],
		unpathedFile = key.replace( /VER/g, version ),
		releaseFile = cdnFolder + "/" + unpathedFile;

	if ( /\.map$/.test( releaseFile ) ) {

		// Map files need to reference the new uncompressed name;
		// assume that all files reside in the same directory.
		// "file":"jquery.min.js","sources":["jquery.js"]
		text = fs.readFileSync( builtFile, "utf8" )
			.replace( /"file":"([^"]+)","sources":\["([^"]+)"\]/,
				"\"file\":\"" + unpathedFile.replace( /\.min\.map/, ".min.js" ) +
				"\",\"sources\":[\"" + unpathedFile.replace( /\.min\.map/, ".js" ) + "\"]" );
		fs.writeFileSync( releaseFile, text );
	} else if ( /\.min\.js$/.test( releaseFile ) ) {

		// Remove the source map comment; it causes way too many problems.
		// Keep the map file in case DevTools allow manual association.
		text = fs.readFileSync( builtFile, "utf8" )
			.replace( /\/\/# sourceMappingURL=\S+/, "" );
		fs.writeFileSync( releaseFile, text );
	} else if ( builtFile !== releaseFile ) {

		// shell.cp( "-f", builtFile, releaseFile ): verbatim byte copy.
		fs.writeFileSync( releaseFile, fs.readFileSync( builtFile ) );
	}

	created++;
	console.log( "Created: " + releaseFile );
});

console.log( "build_cdn_copies.js: wrote " + created + " file(s) to " + cdnFolder );
