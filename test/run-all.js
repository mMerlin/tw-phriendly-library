#!/usr/bin/env node
"use strict";

const STANDALONE_SPECS = [
	"library-install"
];

async function main() {
	let failures = 0;

	for (const name of STANDALONE_SPECS) {
		const spec = require("./specs/" + name + ".spec.js");
		try {
			await spec();
			console.log("PASS  " + name);
		} catch (err) {
			failures++;
			console.error("FAIL  " + name);
			console.error(err && err.stack ? err.stack : err);
		}
	}

	if (failures > 0) {
		console.error("\n" + failures + " test(s) failed.");
		process.exitCode = 1;
	} else {
		console.log("\nAll tests passed.");
	}
}

main().catch((err) => {
	console.error("FATAL", err);
	process.exit(1);
});
