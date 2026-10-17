#!/bin/bash
# render_richer.sh <lookkit args...> — richer.py (the village with the richer house kit) holding one of the three
# shared Blender slots, like tools/render.sh.
HERE="$(cd "$(dirname "$0")" && pwd)"
LOCKS="$HERE/../.locks"; mkdir -p "$LOCKS"
while true; do
  for i in 1 2 3; do
    exec 9>"$LOCKS/slot$i"
    if flock -n 9; then /home/user/BVENV/bin/python "$HERE/richer.py" "$@"; rc=$?; flock -u 9; exit $rc; fi
  done
  sleep 5
done
