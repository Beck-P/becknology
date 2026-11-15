# Picture fixes waiting for a render

The November 2026 look-over (Beck: "make sure there's not just random stuff placed in the way or weird things where
something looks off") fixed what was data straight away. What needs a new picture is here: each patch is a
scene-script change that is **not applied** in the repo, because a scene's script, its render and its world JSON must
describe the same place — never commit one without the others.

## How to land one
```
git apply _claude_docs/render-queue/<name>.patch
BVENV/bin/python tools/bridge-art/scenes/<scene>.py /some/out/<world-id>        # Blender as a module: python 3.13, pip bpy==5.2.2 numpy Pillow
python3 tools/bridge-art/scene_post.py /some/out/<world-id> apps/bridge/assets/scenes/<world-id>
python3 tools/bridge-art/audit_worlds.py <world-id>
node tools/tests/world/lookover.js <world-id>                                   # then open every image it writes
```
The scene script rewrites the world's JSON itself (`scenekit.apply_world`): check afterwards that every interaction,
door, spawn, actor and label is still where the game expects it (quests match clues by `{world, label}`; a label is
never renamed), that nothing a player needs is walled off, and that what the patch set out to fix is fixed in each
light the place has. Then run the tests `tools/tests/README.md` names for the place, commit the script, the render and
the world JSON together, and delete the patch from this folder (and its row below).

One render at a time on a machine; a big outdoor place with live light takes one to two and a half hours on four
cores, an interior much less.

## The queue
Empty: the Old Bridge, the Terraces and the Hill landed in November 2026.

## Sylvara's closed places (five still to open)
The Boughs are live. Still closed (`BridgeSylvara.OPEN` in `apps/bridge/js/worlds/sylvara.js` lists what's open): the
Hollow Bough tavern (`sylvara-tavern` — its script is brightened and dressed; one three-minute render, then a look),
the falls (`sylvara-falls`), the cave behind them (`sylvara-fallcave`), Mirror Lake (`sylvara-lake`) and the Deepwood
(`sylvara-deepwood`) — scripted, never rendered at full samples (about 70 minutes each outdoors on four free cores;
preview first at low samples, fix what the preview shows — the Boughs needed crowns lowered off the walkways, bridges
moved out from behind trunks and two houses off bridge ends — then render in full). `apps/bridge/CLAUDE.md`, *Sylvara's
city, the Silverrun and the Deepwood (workstream F)*, says how a place opens: render, `scene_post.py`, the ways in put
back into the open worlds, its people and crowd line, `OPEN`, `atlas.py`. Two helpers for that are in `sylvara/` here
(run from the repo root; they read commit `e93d7dc`, where the closed places' doors and people were kept — a shallow
clone needs `git fetch --unshallow` first):
```
python3 _claude_docs/render-queue/sylvara/restore_doors.py sylvara-tavern      # the doors that lead to it, back into the open worlds' JSON
python3 _claude_docs/render-queue/sylvara/restore_person.py <person-id>        # e.g. Fennick (the tavern), Sorrel — ids as in e93d7dc's people.json
```
Re-running the Boughs' script writes the Hollow Bough's door back (the shipped Boughs JSON leaves it out until the
tavern opens) — or use `restore_doors.py`. `tools/tests/world/sylvara_places.js` walks the city and goes into the
tavern for Fennick's cider once it's open.

## Found, not yet written (each needs a script fix first)
Ranked by how much a player would notice; details and images were in the look-over's findings.
- **Old Town** (`lumar-crown-oldtown`): the Old Keep's roof is one flat beige plane (the Admiral's cat was "on the roof of the Old Keep"); tall gable houses reach up into the lane north of them.
- **The Crater** (`lumar-cinder-volcano`): now that the camera follows you, its walls are stretched noise with square corners at the map's edge and the floor is flat noise. **Cinder Key**'s volcano flank is in coarse stepped bands.
- **Arcadia's spaceport**: the middle apron (x 20–45, rows 21–26) is dark and flat under one lamp pool. **The Spires**: a pale wavy wash across the top of the plaza (check the light first).
- **Brambleford**: the landing green's BRAMBLEFORD sign can't be read (letters about 5 px tall).
- **The Stilts**: the quay stairs are a plain grey slab. **The Hill**: the drop below the terrace is flat and the city roofs below are in an older finish.
- **The ship**: the game room's and the hangar's doors back to the bridge read as gaps (the bridge's own side doors are being fixed); in the game room the dust sheets over unfound games look like ghosts.
- **Starling Holm, built**: the café's parasols overlap the warehouse wall.
- **Undercity**: on the customer side of the north stalls (row 14) you're half behind the middle block's roof (moving the block's back half a tile needs a render).
