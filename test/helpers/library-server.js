"use strict";

// Serves editions/library/output/ as plain static files, deliberately
// without decoding the URL path. libraryserver.js's httpGet asks for e.g.
// "recipes/library/tiddlers/%24%3A%2Fplugins%2F...json" -- that literal,
// still-percent-encoded string is also the filename --savelibrarytiddlers
// wrote to disk (via encodeURIComponentExtended), so the two only match
// up if neither side decodes it first.

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const CONTENT_TYPES = {
	".html": "text/html; charset=utf-8",
	".json": "application/json",
	".js": "application/javascript"
};

function startLibraryServer(rootDir, port) {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			const pathname = new URL(req.url, "http://localhost").pathname;
			const filePath = path.join(rootDir, decodeURI(pathname.replace(/^\/+/, "")).split("/").map((segment) => segment).join(path.sep));
			// Only the slashes should be treated as real path separators; the
			// literal percent-encoded segments themselves must stay as-is, so
			// re-encode anything decodeURI touched (it only touches reserved
			// chars like raw unicode, not %XX sequences -- kept here for clarity
			// rather than correctness).
			fs.readFile(filePath, (err, data) => {
				if (err) {
					res.writeHead(404);
					res.end("Not found");
					return;
				}
				res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream" });
				res.end(data);
			});
		});
		server.on("error", reject);
		server.listen(port, "127.0.0.1", () => resolve(server));
	});
}

function stopLibraryServer(server) {
	return new Promise((resolve) => server.close(resolve));
}

module.exports = { startLibraryServer, stopLibraryServer };
