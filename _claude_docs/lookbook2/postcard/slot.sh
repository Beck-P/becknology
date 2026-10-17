#!/bin/bash
# slot.sh <command...> — run a Blender job holding one of the look book's three render slots (see tools/render.sh)
LOCKS="/tmp/claude-0/-home-user-becknology/ea055e40-accf-57a0-8967-45b30b32784f/scratchpad/lookbook2/.locks"; mkdir -p "$LOCKS"
while true; do
  for i in 1 2 3; do
    exec 9>"$LOCKS/slot$i"
    if flock -n 9; then "$@"; rc=$?; flock -u 9; exit $rc; fi
  done
  sleep 5
done
