# bridge-art

Offline art tools for the bridge game (`apps/bridge`). Their output is
committed; nothing here runs at deploy time. See `apps/bridge/CLAUDE.md` for
the art direction these follow (and `CLAUDE.md` here for the house style in brief).

| Tool | What it does |
|---|---|
| `native_sprites.py` | Converts painted building/prop/creature PNGs into native 32 px-per-tile sprites (`apps/bridge/assets/native/`) plus `manifest.js`. Needs numpy + Pillow. |
| `characters.py` | Blender (bpy) script: models the pilot and NPCs and renders colour / part-id / depth frames at the scene camera angle. |
| `sprites_post.py` | Turns character frames into sprite sheets with line work, outlines and the painted face (`apps/bridge/assets/characters/`; the face from the `anchors.json` characters.py writes). |
| `pilots.sh` | Renders and packs every customisable pilot sheet (pose × suit × build × head) into `apps/bridge/assets/characters/pilots/`. Colours are key colours the game swaps (`js/look.js`). |
| `scenekit.py` | Blender scene kit: tile-grid primitives, lights, and the render passes for pre-rendered scenes. |
| `assets_lumar.py` | Lumar asset builders for scenes (floors, walls, furniture, fireplace, lamps…). |
| `assets_magic.py` | Arcane builders: octagonal masonry rooms, angled windows, rose window, spell circle, crystal altar, candelabras, telescope, familiar. |
| `assets_ship.py` | Ship builders: panelled walls with holdout viewports, LED strips, bunk, trophy cabinet, desk, consoles, holo pedestal, captain's chair, and the catalog decor / trophy models. |
| `assets_cyber.py` | Arcadia builders: neon stroke-font signs, arcade cabinets with per-game screen art, vending machines, coolers, gondolas, noodle-bar kitchen, clinic equipment, pawn counter, repair benches. |
| `assets_station.py` | Enigma Station + the Singularity: station shell with holdout viewports and floor windows, server racks, antenna array, data core, the docked ship, void platform, crystals, the black hole. |
| `assets_casino.py` | The Neon Royale (Arcadia's casino): Art Deco walls, carpet and marble, chandeliers, blackjack / roulette / craps / poker tables, slot banks, video walls, the cage, the island bar, the stage, Runouts cabinets, the restaurant's fittings, and the street frontage. Reports the live parts (wheels, screens, slot chases) for `js/worlds/casino.js`. |
| `assets_cave.py` | Cave builders: rock faces and floors, lava pools and fissures, stalagmites, mine timbers and rails, the dragon, the hoard. |
| `scenes/*.py` | One script per pre-rendered world: builds, renders, and updates that world's JSON. |
| `scene_post.py` | Turns scene passes into the lit render in the toy finish + packed depth + the live-light passes + `scene.json` (`apps/bridge/assets/scenes/<id>/`). |
| `assets_house.py` | The richer house kit (Look Book 2): `rich_house` (thatch, pantile or shingle roofs, eaves, jetties, porches, framed windows with shutters and flower boxes), `bay_shop`, `street`, `garden`, `pump`, `tub`, `barrels`, `crate_stack`. |
| `dioramas/` | Look Book 2's five reference places (scripts) and `ref/` — how they look in the toy finish: the bar for any place built or rebuilt. |
| `portraits.py` | Stardew-style talk portraits (64 × 64, five expressions) for every NPC, crowd body and pilot head (`apps/bridge/assets/portraits/`). |

```sh
# Building / prop sprites (all, or just the keys you name)
python3 tools/bridge-art/native_sprites.py [key ...]

# Blender's Python module needs Python 3.13
python3 -m venv /tmp/bvenv && /tmp/bvenv/bin/pip install bpy==5.2.2

# The pilot: every sheet (~45 min on two cores), or one suit/build/head to look at
tools/bridge-art/pilots.sh /tmp/bvenv/bin/python 2
/tmp/bvenv/bin/python tools/bridge-art/characters.py /tmp/chars/p pilot-coat-b ponytail,helmet
/tmp/bvenv/bin/python tools/bridge-art/sprites_post.py pilot-coat-b-ponytail /tmp/chars/p/ponytail /tmp/out

# NPCs
/tmp/bvenv/bin/python tools/bridge-art/characters.py /tmp/chars/npc-bartender npc-bartender
python3 tools/bridge-art/sprites_post.py npc /tmp/chars/npc-bartender

# A pre-rendered scene (updates the world JSON too)
/tmp/bvenv/bin/python tools/bridge-art/scenes/lumar_tavern.py /tmp/tavern
python3 tools/bridge-art/scene_post.py /tmp/tavern apps/bridge/assets/scenes/lumar-tavern
```

Every world is a pre-rendered scene now. After rendering, audit it: walkable
tiles where the player would be hidden behind geometry, NPCs you can walk
into, and interactions the proximity rules can never select
(`python3 tools/bridge-art/audit_worlds.py [world ...]`). Block hidden tiles
with `k.solid` in the scene script.
