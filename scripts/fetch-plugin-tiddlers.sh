#!/bin/bash
# Pulls the tag-pinned dist/<name>-<version>.html file for every member
# plugin listed in members.json, straight from GitHub (raw.githubusercontent.com),
# then unpacks each one into a plugin.info under build-cache/plugins/ --
# the on-disk layout --makelibrary scans via TIDDLYWIKI_PLUGIN_PATH.
# build-cache/ is git-ignored and entirely build-time-only.
#
# This is "Option B" from the bootstrap doc: no submodule per member plugin,
# no hand-copied description/version/author -- those stay in each plugin's
# own plugin.info (packed inside its dist file) and get pulled in here,
# never retyped.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CACHE_DIR="build-cache"
RAW_DIR="${CACHE_DIR}/raw"
PLUGINS_DIR="${CACHE_DIR}/plugins"
rm -rf "$CACHE_DIR"
mkdir -p "$RAW_DIR" "$PLUGINS_DIR"

MEMBER_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('members.json','utf8')).length)")

for i in $(seq 0 $((MEMBER_COUNT - 1))); do
	read -r REPO TAG DISTFILE TITLE <<<"$(node -e "
		const m = JSON.parse(require('fs').readFileSync('members.json','utf8'))[$i];
		console.log(m.repo, m.tag, m.distFile, m.title);
	")"
	URL="https://raw.githubusercontent.com/${REPO}/${TAG}/dist/${DISTFILE}"
	DEST="${RAW_DIR}/${DISTFILE}"
	echo "Fetching ${URL}"
	curl -fsSL "$URL" -o "$DEST"
	if [ ! -s "$DEST" ]; then
		echo "error: ${DEST} is empty after fetching ${URL}" >&2
		exit 1
	fi
	echo "  -> ${DEST} ($(wc -c <"$DEST") bytes)"

	# title is "$:/plugins/<publisher>/<name>" -- plugin.info must land at
	# <pluginsDir>/<publisher>/<name>/plugin.info for getAllPlugins() to find it.
	PLUGIN_SUBPATH="${TITLE#\$:/plugins/}"
	OUT_DIR="${PLUGINS_DIR}/${PLUGIN_SUBPATH}"
	node scripts/unpack-plugin-tiddler.js "$DEST" "$TITLE" "$OUT_DIR"
done
