# bridge-art

Offline art tools for the bridge game (`apps/bridge`). Their output is
committed; nothing here runs at deploy time. See `apps/bridge/CLAUDE.md` for
the art direction these follow.

| Tool | What it does |
|---|---|
| `native_sprites.py` | Converts painted building/prop/creature PNGs into native 32 px-per-tile sprites (`apps/bridge/assets/native/`) plus `manifest.js`. Needs numpy + Pillow. |
| `pilot.py` | Blender (bpy) script: models the pilot and renders colour / part-id / depth frames for every suit colour. |
| `sprites_post.py` | Turns Blender frames into sprite sheets with line work and outlines (`apps/bridge/assets/characters/`). |

```sh
# Building / prop sprites (all, or just the keys you name)
python3 tools/bridge-art/native_sprites.py [key ...]

# Pilot sprite sheets — Blender's Python module needs Python 3.13
python3 -m venv /tmp/bvenv && /tmp/bvenv/bin/pip install bpy==5.2.2
/tmp/bvenv/bin/python tools/bridge-art/pilot.py /tmp/pilot-frames
python3 tools/bridge-art/sprites_post.py pilot /tmp/pilot-frames
```
