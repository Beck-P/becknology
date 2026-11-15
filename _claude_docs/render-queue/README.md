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
| Patch | Scene scripts | What it fixes | Look at afterwards |
|---|---|---|---|
| `arcadia-terraces.patch` | `scenes/arcadia_terraces.py` → `arcadia-terraces` | Cascade Tower's front was rows of big white window squares: darker glass, slimmer bars, fewer and dimmer lit offices with desks, screens, blinds and plants; the flats across the gap and the lit floors over the train tunnel toned down the same way. The script replays the old random rolls so nothing placed after the tower moves. Also in it (world JSON): Halo's two patio heaters and Cirrus's three cocktail tables, which you could walk through, are solid. | The tower front (the top sections of the look-over); `world/arcadia_terraces.js`. |
| `lumar-crown-bridge-and-hill.patch` | `scenes/lumar_crown_bridge.py` → `lumar-crown-bridge`; `scenes/lumar_crown_hill.py` → `lumar-crown-hill`; `assets_capital.py` (`flagged` gains an optional `z`) | **The Old Bridge:** the loggia's roof is one flat red slab over half the street — you vanish under it crossing the bridge and the builder's statue pokes up through it. A low tiled roof over the arcade only; the statue across the street, THE BUILDER at 30,11 (the render moves its blocked tiles and the label's spot). **The Hill:** the gravel walks, the parade ground and the observatory terrace come out striped because the gravel sits exactly level with the grass; the gravel is raised a touch. | The bridge's street under the loggia, on a desktop and a phone, and that *The Admiral*'s clue THE LOGGIA (30,13) can still be stood beside; the Hill's parade ground. `world/capital.js`, `world/small_stories.js admiral`. |

## Sylvara's closed places (two still to open)
The Boughs, the Hollow Bough tavern, the falls and the cave behind them are live. Still closed (`BridgeSylvara.OPEN` in `apps/bridge/js/worlds/sylvara.js` lists what's open): Mirror Lake (`sylvara-lake`) and the Deepwood
(`sylvara-deepwood`) — scripted, never rendered at full samples (about 25 minutes each outdoors on four free cores — the falls took 24;
preview first at low samples, fix what the preview shows — the Boughs needed crowns lowered off the walkways, bridges
moved out from behind trunks and two houses off bridge ends — then render in full). `apps/bridge/CLAUDE.md`, *Sylvara's
city, the Silverrun and the Deepwood (workstream F)*, says how a place opens: render, `scene_post.py`, the ways in put
back into the open worlds, its people and crowd line, `OPEN`, `atlas.py`. Two helpers for that are in `sylvara/` here
(run from the repo root; they read commit `e93d7dc`, where the closed places' doors and people were kept — a shallow
clone needs `git fetch --unshallow` first):
```
python3 _claude_docs/render-queue/sylvara/restore_doors.py sylvara-lake        # the doors that lead to it, back into the open worlds' JSON
python3 _claude_docs/render-queue/sylvara/restore_person.py <person-id>        # e.g. Fennick (the tavern), Sorrel — ids as in e93d7dc's people.json
```
`tools/tests/world/sylvara_places.js` walks the city and goes into the tavern for Fennick's cider; extend it for each
place as it opens.

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
