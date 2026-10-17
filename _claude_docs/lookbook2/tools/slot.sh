#!/bin/bash
# slot.sh <command...> — run any Blender job holding one of the three render slots render.sh uses (memory: ~2 GB each).
HERE="$(cd "$(dirname "$0")" && pwd)"
LOCKS="$HERE/../.locks"; mkdir -p "$LOCKS"
while true; do
  for i in 1 2 3; do
    exec 9>"$LOCKS/slot$i"
    if flock -n 9; then "$@"; rc=$?; flock -u 9; exit $rc; fi
  done
  sleep 5
done
