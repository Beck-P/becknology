#!/usr/bin/env bash
# Render and pack every customisable pilot sheet into apps/bridge/assets/characters/pilots/
#   pilot[-sit|-ski|-climb][-<style>]-<a|b>-<head>.png      (head: helmet, <hair>, <hair>-beard)
# Usage: tools/bridge-art/pilots.sh [BVENV_PYTHON] [JOBS]
set -euo pipefail
PY=${1:-/tmp/bvenv/bin/python}
JOBS=${2:-2}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$HERE/../../apps/bridge/assets/characters/pilots
TMP=$(mktemp -d)
jobs=()
for mode in "" sit- ski- climb-; do
  for style in "" coat- plate- thermal- runner- mystic- ranger-; do
    for body in a b; do jobs+=("pilot-$mode$style$body"); done
  done
done
one() {
  local who=$1
  "$PY" "$HERE/characters.py" "$TMP/$who" "$who" > "$TMP/$who.log" 2>&1
  for d in "$TMP/$who"/*/; do
    "$PY" "$HERE/sprites_post.py" "$who-$(basename "$d")" "$d" "$OUT" > /dev/null
  done
  rm -rf "${TMP:?}/$who"
  echo "$who"
}
export -f one; export PY HERE OUT TMP
printf '%s\n' "${jobs[@]}" | xargs -P "$JOBS" -I{} bash -c 'one {}'
rm -rf "$TMP"
