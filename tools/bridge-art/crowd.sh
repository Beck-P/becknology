#!/usr/bin/env bash
# Render and pack every passer-by's sheet (characters.py EXTRAS, standing and seated) into
# apps/bridge/assets/characters/crowd/<name>[-sit].png, in key colours that js/crowd.js swaps for each planet's wardrobe.
# Usage: tools/bridge-art/crowd.sh [BVENV_PYTHON] [JOBS] [names…]      (packing runs on PACK, default python3)
set -euo pipefail
PY=${1:-/tmp/bvenv/bin/python}
JOBS=${2:-3}
shift 2 || true
PACK=${PACK:-python3}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$HERE/../../apps/bridge/assets/characters/crowd
TMP=$(mktemp -d)
mkdir -p "$OUT"
names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  mapfile -t names < <(grep -oP "^    '\K[a-z-]+(?=':\s+dict\(_X)" "$HERE/characters.py")
fi
one() {
  "$PY" "$HERE/characters.py" "$TMP/$1" "extra-$1" > "$TMP/$1.log" 2>&1 || { tail -5 "$TMP/$1.log"; return 1; }
  "$PACK" "$HERE/sprites_post.py" "$1" "$TMP/$1" "$OUT" > /dev/null
  echo "$1"
}
export -f one; export PY PACK HERE OUT TMP
for n in "${names[@]}"; do echo "$n"; echo "$n-sit"; done | xargs -P "$JOBS" -I{} bash -c 'one {}'
rm -rf "$TMP"
