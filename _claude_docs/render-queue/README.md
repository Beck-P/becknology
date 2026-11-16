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

## Sylvara's places: all open
The Boughs, the Hollow Bough tavern, the falls, the cave behind them, Mirror Lake and the Deepwood are live (`BridgeSylvara.OPEN` in `apps/bridge/js/worlds/sylvara.js`). The helpers that put their doors and people back from `e93d7dc` are kept in `sylvara/` for reference. What's still worth doing there is in `apps/bridge/CLAUDE.md`, *Sylvara's city, the Silverrun and the Deepwood (workstream F)*: the river reaches are plainer than the Look Book — a rebuild, not a re-render.

## Rooms in the toy finish (November 2026)
Every room, cave and deck was re-rendered in the toy finish (62 of them; the rest were current already), each with its
world JSON left exactly as it was. Light fittings 1–2 px wide — a chandelier's gilt arms, candles and flames, a bottle
wall — came out grey because the finish's outline covered all of them: parts with **`lustre`** in their name
(`scene_post.py` `LUSTRE_WORDS`; the estate and casino kits' chandeliers, sconces, torchères and candelabra,
`A.candle(lustre=True)`, the penthouse's bottles) keep their colour and take the line round them instead. Name a new
fitting's thin lit parts that way.
**The Neon Royale's four rooms are in too** (`arcadia-casino`, `-casino-cards`, `-casino-dining`, `-casino-vip`, November
2026). The casino kit's neon tubes, sign letters, slot cabinets' trims, reels and toppers, the bar's bottles and the
table candles are named `lustre` (and the rooms' own signs and neon strips: `assets_signs` `neon` / `letters` and
`assets_cyber.neon_shape` take an optional `part`, unchanged by default), so the neon stays lit. Each room's carpet
lies in one band: its lamps lowered with the light states' `_art` (the floor 0.6, the card room and Aurum 0.5, the
Crown Room 0.375) and its ambient lifted to a warm amber (`world_light=('#584436', …)`), so the finish's band edges
no longer fall across open floor. (A branch `claude/rooms-toy-finish` holds an earlier, unmerged attempt at the
fittings with a different mechanism — `gleam`: don't merge it.) For Beck's eye, shipped as they are: the casino
stage's boards take a soft pool from the follow spot in the dim state; the opera foyer's floor is patchy in the toy
finish, the Hollow's floor takes strong bands round its one lantern, and the Hall of Finds' moonlight pools.

## Found, not yet written (each needs a script fix first)
Ranked by how much a player would notice; details and images were in the look-over's findings.
Who has what (November 16): Hoarfell's park and col (the monastery landed) — a session on `claude/hoarfell-monastery`; the Spires, the Stilts and Starling Holm (the Undercity landed) — `claude/render-found-list-2`.
- **Hoarfell** (Beck named it as the planet with things that look off): the **park's** kickers barely show; bands of snow inside the cliff foot are solid on the col and in the valley.
- **The Spires**: a pale wavy wash across the top of the plaza (check the light first).
- **The Stilts**: the quay stairs are a plain grey slab.
- **Starling Holm, built**: the café's parasols overlap the warehouse wall.
