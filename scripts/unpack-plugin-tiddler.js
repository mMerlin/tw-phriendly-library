#!/usr/bin/env node
// Pulls the single packed plugin tiddler out of a tag-pinned dist/<name>.html
// file (the "contains nothing but the plugin itself" distributable every
// phriendly plugin ships) and rewrites it as a plugin.info file -- the
// on-disk shape TiddlyWiki5's --makelibrary command expects when it scans
// TIDDLYWIKI_PLUGIN_PATH. This is purely a reshaping step: every field
// (description, author, version, the packed sub-tiddlers) comes straight
// from the dist file, never retyped here.
"use strict";

const fs = require("fs");
const path = require("path");

const [, , htmlFile, expectedTitle, outDir] = process.argv;
if (!htmlFile || !expectedTitle || !outDir) {
	console.error("usage: unpack-plugin-tiddler.js <dist.html> <plugin-title> <outDir>");
	process.exit(1);
}

const html = fs.readFileSync(htmlFile, "utf8");
const storeMatch = html.match(
	/<script class="tiddlywiki-tiddler-store" type="application\/json">([\s\S]*?)<\/script>/
);
if (!storeMatch) {
	console.error(`error: no tiddlywiki-tiddler-store script found in ${htmlFile}`);
	process.exit(1);
}

const tiddlers = JSON.parse(storeMatch[1]);
const pluginTiddler = tiddlers.find((t) => t.title === expectedTitle);
if (!pluginTiddler) {
	console.error(`error: ${htmlFile} does not contain a tiddler titled "${expectedTitle}"`);
	console.error(`found: ${tiddlers.map((t) => t.title).join(", ")}`);
	process.exit(1);
}

const packedData = JSON.parse(pluginTiddler.text);

const pluginInfo = Object.assign({}, pluginTiddler, {
	tiddlers: packedData.tiddlers
});
delete pluginInfo.text;
delete pluginInfo.type;

fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "plugin.info");
fs.writeFileSync(outFile, JSON.stringify(pluginInfo, null, 4) + "\n", "utf8");
console.log(`  -> ${outFile} (${Object.keys(packedData.tiddlers).length} tiddlers)`);
