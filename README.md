# phriendly's TiddlyWiki Plugin Library

A self-hosted [TiddlyWiki5](https://tiddlywiki.com/) **plugin library**: a
static page that makes `phriendly`-published plugins installable straight
from inside TiddlyWiki's own Control Panel &rarr; Plugins &rarr; **Get more
plugins** picker, the same way the official TiddlyWiki library works.

Each plugin's actual source stays in its own repo (e.g.
[`tw5-tearoff-panes`](https://github.com/mMerlin/tw5-tearoff-panes)). This
repo never vendors or hand-copies a member plugin's description, version, or
author -- it fetches each member's tag-pinned `dist/<name>-<version>.html`
release artifact at build time and repacks it into the library's `assetList`.
`members.json` is the only thing that moves when a member plugin ships a new
version.

## Adding this library to a wiki

1. Open your TiddlyWiki document.
2. Create a tiddler tagged `$:/tags/PluginLibrary` with a `url` field
   pointing at this library's published `index.html`
   (see [GitHub Pages deployment](#github-pages-deployment) below), and a
   `caption` field for the tab label, e.g.:

   ```
   title: $:/MyLibraries/phriendly
   tags: $:/tags/PluginLibrary
   caption: phriendly's Library
   url: https://<published-url>/index.html
   ```

3. Open Control Panel &rarr; Plugins &rarr; **Get more plugins**. Your new
   tab appears alongside the official library; click it, then **Open
   plugin library** to list and install from it.

## Currently serves

| Plugin | Repo | Version |
| --- | --- | --- |
| `tearoff-panes` | [`mMerlin/tw5-tearoff-panes`](https://github.com/mMerlin/tw5-tearoff-panes) | see [`members.json`](members.json) |

## How it works

TiddlyWiki core builds its own official library by running
`--makelibrary`, `--savelibrarytiddlers`, then rendering
`library.template.html` -- this repo reuses that exact mechanism, scoped to
just the plugins listed in `members.json`:

1. **`scripts/fetch-plugin-tiddlers.sh`** downloads each member's tag-pinned
   dist file from `raw.githubusercontent.com` and unpacks the single packed
   plugin tiddler it contains into `build-cache/plugins/<publisher>/<name>/plugin.info`
   -- the on-disk shape `--makelibrary` expects to find via
   `TIDDLYWIKI_PLUGIN_PATH`.
2. **`scripts/build-library.sh`** runs the fetch step, then
   `--makelibrary` / `--savelibrarytiddlers` (filtered to exactly the
   member titles, so core's own bundled plugins aren't swept in too) /
   `--rendertiddler` to produce `editions/library/output/index.html` plus
   the per-plugin JSON files the installed library serves over
   `window.postMessage` (`$:/plugins/tiddlywiki/pluginlibrary/libraryserver.js`
   -- unmodified core code).

```sh
git clone --recurse-submodules <this-repo>
cd tw5-phriendly-library
./scripts/build-library.sh
```

`editions/library/output/` is the result -- serve it statically from
anywhere.

## GitHub Pages deployment

`.github/workflows/deploy.yml` builds and publishes
`editions/library/output/` to GitHub Pages on every push to `main` that
touches `members.json` or the build scripts, and on manual dispatch. Enable
Pages for this repo under Settings &rarr; Pages &rarr; Source: **GitHub
Actions**, once.

## Adding another member plugin

Append an entry to `members.json`:

```json
{
    "repo": "<github-owner>/<repo-name>",
    "tag": "v<version>",
    "distFile": "<name>-<version>.html",
    "title": "$:/plugins/<publisher>/<name>"
}
```

The target repo must publish its tagged release the same way
`tw5-tearoff-panes` does: a `dist/<name>-<version>.html` file at that tag
containing nothing but the packed plugin tiddler.

## Testing

`test/` runs an end-to-end check with a real (plugin-free) TiddlyWiki
document and a real TiddlyWiki server/browser: it points the native "Get
more plugins" picker at a freshly built `editions/library/output/`, installs
a plugin through that actual UI, then saves and cold-reloads to confirm it
stuck. See [`test/README.md`](test/README.md).

## License

MIT, see [LICENSE](LICENSE).
