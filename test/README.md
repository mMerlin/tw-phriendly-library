# Tests

One end-to-end regression test, `specs/library-install.spec.js`. It:

1. Builds a throwaway, plugin-free wiki fixture from the
   `vendor/TiddlyWiki5` submodule's own `empty` edition -- self-contained,
   no dependency on anything outside the repo.
2. Serves `editions/library/output/` over a plain local HTTP server
   (`helpers/library-server.js`) -- run `../scripts/build-library.sh`
   first, or this will serve a stale/missing build.
3. Opens the fixture wiki in a real Chromium page, adds a
   `$:/tags/PluginLibrary` tiddler pointing at that server (the one manual
   setup step a real user would also do), then drives TiddlyWiki's actual
   "Get more plugins" UI: Control Panel &rarr; Plugins &rarr; Get more
   plugins &rarr; this library's tab &rarr; Open plugin library &rarr;
   install.
4. Confirms the installed plugin's version matches `members.json`'s pinned
   tag, then saves and cold-reloads the wiki to confirm it's actually
   persisted, not just present in memory.

```sh
cd ..
./scripts/build-library.sh
cd test
npm install
npx playwright install --with-deps chromium   # first run only
npm test
```
