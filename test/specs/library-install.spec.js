"use strict";

// End-to-end check of the actual distribution path for this repo: point a
// plugin-free wiki's native "Get more plugins" picker at our built
// editions/library/output/, confirm our member plugin is listed there,
// install it through that real UI (not a hand-written stand-in for it),
// then save + cold-reload and confirm the plugin survived.
//
// Manages its own server/browser lifecycle, like import-roundtrip.spec.js
// does in the sibling tearoff-panes repo.

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-chromium");
const { startLibraryServer, stopLibraryServer } = require("../helpers/library-server");

const ROOT = path.join(__dirname, "..", "..");
const PORT = 8097;

module.exports = async function libraryInstall() {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "phriendly-library-install-test-"));
	const members = JSON.parse(fs.readFileSync(path.join(ROOT, "members.json"), "utf8"));
	assert.ok(members.length > 0, "expected members.json to list at least one plugin");
	const member = members[0];

	const server = await startLibraryServer(path.join(ROOT, "editions", "library", "output"), PORT);
	try {
		const emptyWikiPath = path.join(tmpDir, "empty.html");
		fs.copyFileSync(path.join(ROOT, "import", "tiddlewiki-empty.html"), emptyWikiPath);

		const browser = await chromium.launch();
		try {
			const page = await browser.newPage();
			await page.goto("file://" + emptyWikiPath, { waitUntil: "load" });
			await page.waitForSelector(".tc-story-river", { timeout: 15000 });

			assert.equal(
				await page.evaluate(() => window.$tw.wiki.tiddlerExists("$:/plugins/phriendly/tearoff-panes")),
				false,
				"expected the plugin-free fixture wiki not to already have the plugin"
			);

			// Mirrors the manual step a real user takes to add a third-party
			// library: create a tiddler tagged $:/tags/PluginLibrary with a
			// url field. The rest of this test drives TiddlyWiki's own UI.
			await page.evaluate((libraryUrl) => {
				window.$tw.wiki.addTiddler(new window.$tw.Tiddler({
					title: "$:/TestPluginLibrary",
					tags: "$:/tags/PluginLibrary",
					caption: "phriendly's Library",
					url: libraryUrl
				}));
			}, "http://127.0.0.1:" + PORT + "/index.html");

			// TiddlyWiki renders its control-panel tabs and sidebar tabs with
			// role="switch", not role="button" -- plain text locators scoped
			// to the relevant container are more robust here than ARIA roles.
			await page.getByRole("button", { name: "control panel" }).click();
			await page.locator(".tc-tab-buttons button", { hasText: "Plugins" }).click();
			await page.locator("button", { hasText: "Get more plugins" }).first().click();

			await page.locator(".tc-modal .tc-tab-buttons button", { hasText: "phriendly's Library" }).click();
			await page.locator(".tc-modal button", { hasText: "Open plugin library" }).click();

			const descriptionLocator = page.locator(".tc-plugin-info-description", { hasText: member.title.replace("$:/plugins/", "") });
			await descriptionLocator.waitFor({ timeout: 15000 });

			await page.locator(".tc-modal button", { hasText: "install" }).click();

			await page.waitForFunction(
				(title) => window.$tw.wiki.tiddlerExists(title),
				member.title,
				{ timeout: 15000 }
			);

			const installedVersion = await page.evaluate(
				(title) => window.$tw.wiki.getTiddler(title).fields.version,
				member.title
			);
			assert.equal(installedVersion, member.tag.replace(/^v/, ""),
				"expected the installed plugin version to match the pinned tag " + member.tag);

			// Save + cold reload, the same way import-roundtrip.spec.js does,
			// to confirm the installed plugin is actually persisted, not just
			// present in the in-memory wiki.
			const savedHtml = await page.evaluate(() => window.$tw.wiki.renderTiddler("text/plain", "$:/core/save/all"));
			const savedPath = path.join(tmpDir, "saved.html");
			fs.writeFileSync(savedPath, savedHtml, "utf8");
			await page.close();

			const page2 = await browser.newPage();
			await page2.goto("file://" + savedPath, { waitUntil: "load" });
			await page2.waitForSelector(".tc-story-river", { timeout: 15000 });

			assert.equal(
				await page2.evaluate((title) => window.$tw.wiki.tiddlerExists(title), member.title),
				true,
				"expected the installed plugin to survive a save + cold reload cycle"
			);
			await page2.close();
		} finally {
			await browser.close();
		}
	} finally {
		await stopLibraryServer(server);
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
};
