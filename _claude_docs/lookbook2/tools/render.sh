#!/bin/bash
# render.sh <lookkit args...> — run lookkit.py holding one of three slots, so at most three Blender processes run at
# once (each can take 2 GB). Waits for a free slot.
HERE="$(cd "$(dirname "$0")" && pwd)"
LOCKS="$HERE/../.locks"; mkdir -p "$LOCKS"
while true; do
  for i in 1 2 3; do
    exec 9>"$LOCKS/slot$i"
    if flock -n 9; then /home/user/BVENV/bin/python "$HERE/lookkit.py" "$@"; rc=$?; flock -u 9; exit $rc; fi
  done
  sleep 5
done
