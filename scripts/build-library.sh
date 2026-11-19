#!/bin/bash
# Rebuilds editions/library/output/ -- the static plugin-library page
# (index.html + recipes/library/tiddlers*.json) that TiddlyWiki's own
# "Get more plugins" picker can point at. Run this whenever members.json
# changes (a member bumped its version) or on a schedule in CI; the fetch
# step always pulls the tag-pinned dist file fresh, so there's nothing to
# bump here beyond members.json itself.
#
# --makelibrary scans TIDDLYWIKI_PLUGIN_PATH directly off disk -- it does
# NOT care what's loaded into the edition's own wiki -- so the member
# filter passed to --savelibrarytiddlers has to explicitly name each
# member's title. A prefix filter would also sweep in every plugin bundled
# with TiddlyWiki5 core itself (codemirror, markdown, etc.), since those
# live under the same default pluginsPath.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

./scripts/fetch-plugin-tiddlers.sh

FILTER=$(node -e "
	const members = JSON.parse(require('fs').readFileSync('members.json','utf8'));
	console.log(members.map(m => '[[' + m.title + ']]').join(' '));
")

export TIDDLYWIKI_PLUGIN_PATH="$(pwd)/build-cache/plugins"
node vendor/TiddlyWiki5/tiddlywiki.js editions/library \
	--makelibrary "\$:/UpgradeLibrary" \
	--savelibrarytiddlers "\$:/UpgradeLibrary" "$FILTER" "recipes/library/tiddlers/" "\$:/UpgradeLibrary/List" \
	--savetiddler "\$:/UpgradeLibrary/List" "recipes/library/tiddlers.json" \
	--rendertiddler "\$:/plugins/tiddlywiki/pluginlibrary/library.template.html" "index.html" "text/plain"

echo "Wrote editions/library/output/index.html ($(wc -c < editions/library/output/index.html) bytes)"
