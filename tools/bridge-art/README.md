# bridge-art

Offline art tools for the bridge game (`apps/bridge`). Their output is
committed; nothing here runs at deploy time. See `apps/bridge/CLAUDE.md` for
the art direction these follow.

| Tool | What it does |
|---|---|
| `native_sprites.py` | Converts painted building/prop/creature PNGs into native 32 px-per-tile sprites (`apps/bridge/assets/native/`) plus `manifest.js`. Needs numpy + Pillow. |
| `characters.py` | Blender (bpy) script: models the pilot and NPCs and renders colour / part-id / depth frames at the scene camera angle. |
| `sprites_post.py` | Turns character frames into sprite sheets with line work and outlines (`apps/bridge/assets/characters/`). |
| `scenekit.py` | Blender scene kit: tile-grid primitives, lights, and the render passes for pre-rendered scenes. |
| `assets_lumar.py` | Lumar asset builders for scenes (floors, walls, furniture, fireplace, lamps…). |
| `assets_magic.py` | Arcane builders: octagonal masonry rooms, angled windows, rose window, spell circle, crystal altar, candelabras, telescope, familiar. |
| `assets_cave.py` | Cave builders: rock faces and floors, lava pools and fissures, stalagmites, mine timbers and rails, the dragon, the hoard. |
| `scenes/*.py` | One script per pre-rendered world: builds, renders, and updates that world's JSON. |
| `scene_post.py` | Turns scene passes into the dithered, lit render + packed depth + `scene.json` (`apps/bridge/assets/scenes/<id>/`). |

```sh
# Building / prop sprites (all, or just the keys you name)
python3 tools/bridge-art/native_sprites.py [key ...]

# Blender's Python module needs Python 3.13
python3 -m venv /tmp/bvenv && /tmp/bvenv/bin/pip install bpy==5.2.2

# Characters
/tmp/bvenv/bin/python tools/bridge-art/characters.py /tmp/chars/pilot pilot
python3 tools/bridge-art/sprites_post.py pilot /tmp/chars/pilot
/tmp/bvenv/bin/python tools/bridge-art/characters.py /tmp/chars/npc-bartender npc-bartender
python3 tools/bridge-art/sprites_post.py npc /tmp/chars/npc-bartender

# A pre-rendered scene (updates the world JSON too)
/tmp/bvenv/bin/python tools/bridge-art/scenes/lumar_tavern.py /tmp/tavern
python3 tools/bridge-art/scene_post.py /tmp/tavern apps/bridge/assets/scenes/lumar-tavern
```
