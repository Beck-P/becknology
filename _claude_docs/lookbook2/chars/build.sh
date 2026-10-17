#!/bin/bash
# build.sh — render the look book's cast in every variant and size into ../sprites/<variant>/<name>-<32|48>.png,
# and copy the game's own sheets for the same people into ../sprites/game/.
cd "$(dirname "$0")"
CAST=("pilot pilot 0 1" "npc-hollin farmer 0 1" "npc-baker baker 0 1" "npc-fisher-gran fisher 1 1" "npc-elf-bard elf 1 1"
      "npc-skier-a skier 1 1" "npc-dj cyber 1 0" "npc-sailor sailor 0 1" "npc-dockhand dockhand 0 0")
for v in ${VARIANTS:-today faces round}; do
  for s in 1 1.5; do
    px=$([ "$s" = "1" ] && echo 32 || echo 48)
    for c in "${CAST[@]}"; do
      set -- $c
      OUTP=../sprites/$v ./rc.sh "$v" "$s" "$1" "$2" --blush "$3" --friendly "$4" >/dev/null && mv "../sprites/$v/$2-$v-$s.png" "../sprites/$v/$2-$px.png"
    done
    echo "$v $px done"
  done
done
mkdir -p ../sprites/game
for c in "${CAST[@]}"; do set -- $c; [ -f "/home/user/becknology/apps/bridge/assets/characters/$1.png" ] && cp "/home/user/becknology/apps/bridge/assets/characters/$1.png" "../sprites/game/$2-32.png"; done
ls ../sprites/*
