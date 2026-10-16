#!/bin/sh
# The CDN modules chess needs (chess.js, three, cm-chessboard), unpacked from the npm registry into tools/tests/npm:
# the together tests serve them in place of the CDNs, which a test container can't always reach.
set -e
cd "$(dirname "$0")"
mkdir -p npm
cd npm
for spec in chess:chess.js@1.0.0-beta.6 three:three@0.160.0 cmcb:cm-chessboard@8.7.6; do
  dir=${spec%%:*}; pkg=${spec#*:}
  [ -d "$dir/package" ] && continue
  mkdir -p "$dir"
  tgz=$(npm pack "$pkg" --silent)
  tar -xzf "$tgz" -C "$dir"
  rm "$tgz"
done
echo "npm modules ready"
