#!/usr/bin/env bash
# Render and pack every customisable pilot sheet into apps/bridge/assets/characters/pilots/
#   pilot[-sit|-ski|-climb|-attack][-<style>]-<a|b>-<head>.png      (head: helmet, <hair>, <hair>-beard)
# and every weapon in the hand into apps/bridge/assets/characters/weapons/ (weapon_sprites.py).
# Usage: tools/bridge-art/pilots.sh [BVENV_PYTHON] [JOBS]      (packing runs on PACK, default python3: numpy + Pillow)
#   MODES="attack" … just those poses (stand sit ski climb attack; default all; the full set is 70 runs)
#   WEAPONS=0 … skip the weapons; WEAPONS=only … just them (two runs, a few minutes)
set -euo pipefail
PY=${1:-/tmp/bvenv/bin/python}
PACK=${PACK:-python3}
JOBS=${2:-2}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$HERE/../../apps/bridge/assets/characters/pilots
WOUT=$HERE/../../apps/bridge/assets/characters/weapons
TMP=$(mktemp -d)
MODES=${MODES:-"stand sit ski climb attack"}
WEAPONS=${WEAPONS:-1}
jobs=()
if [ "$WEAPONS" != "only" ]; then
  for m in $MODES; do
    mode=""; [ "$m" != "stand" ] && mode="$m-"
    for style in "" coat- plate- thermal- runner- mystic- ranger-; do
      for body in a b; do jobs+=("pilot-$mode$style$body"); done
    done
  done
fi
if [ "$WEAPONS" != "0" ]; then jobs=("pilot-weapons-a" "pilot-weapons-b" "${jobs[@]}"); fi
one() {
  local who=$1
  if [[ $who == pilot-weapons-* ]]; then           # every weapon in the hand, one build (packed together below)
    "$PY" "$HERE/characters.py" "$TMP/w/${who##*-}" "$who" > "$TMP/$who.log" 2>&1
    echo "$who"
    return
  fi
  "$PY" "$HERE/characters.py" "$TMP/$who" "$who" > "$TMP/$who.log" 2>&1
  for d in "$TMP/$who"/*/; do
    "$PACK" "$HERE/sprites_post.py" "$who-$(basename "$d")" "$d" "$OUT" > /dev/null
  done
  rm -rf "${TMP:?}/$who"
  echo "$who"
}
export -f one; export PY PACK HERE OUT TMP
printf '%s\n' "${jobs[@]}" | xargs -P "$JOBS" -I{} bash -c 'one {}'
if [ -d "$TMP/w" ]; then "$PACK" "$HERE/weapon_sprites.py" pack "$TMP/w" "$WOUT"; fi
rm -rf "$TMP"
