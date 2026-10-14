"""Diggen's Tavern — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/lumar_tavern.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-tavern

Builds the room on the world's 14 × 11 tile grid, renders it (scenekit), and
rewrites lumar-tavern.json to match what was built: collisions from the
objects that were placed, interactions moved onto their objects, NPC actors,
and the "scene" reference that tells the engine to draw this render.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA  # noqa: E402
import assets_lumar as A          # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-tavern.json')

COLS, ROWS = 14, 11
H = 2.0 / math.cos(THETA)          # back wall reads as 2 tiles tall
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=11)

# ---- shell ------------------------------------------------------------------
A.floor_planks(k, 2, 2, 12, 10)
A.back_wall(k, 1.4, 12.6, 2.0, H)
A.side_wall(k, 1.4, 2.0, 1.5, 10.0, H)
A.side_wall(k, 12.0, 12.6, 1.5, 10.0, H)
A.front_wall(k, 1.4, 12.6, 10.0, gaps=[(7.0, 8.0)])
A.door_frame(k, 7.0, 8.0, 10.0)

# ---- the bar (left) -----------------------------------------------------------
A.bar_counter(k, 2.0, 7.7, 3.25, 3.8)
A.beer_tap(k, 5.0, 3.5, 1.0)
A.wall_shelf(k, 2.1, 7.0, 2.0, 1.25)
A.wall_shelf(k, 2.1, 7.0, 2.0, 1.72)
A.stove(k, 2.55, 2.5, 2.0, H)
A.keg_rack(k, 5.9, 7.6, 2.5)
k.solid(2, 2, 8, 3)                 # behind the bar: staff only

# ---- hearth wall (right) ------------------------------------------------------
A.window(k, 8.4, 2.0)
A.fireplace(k, 10.0, 2.0, H)
A.painting(k, 10.0, 2.22, 1.62)
A.dart_board(k, 11.55, 2.0)
A.side_table(k, 11.5, 2.5)          # darts + chalk under the board

# ---- room ---------------------------------------------------------------------
A.upright_piano(k, 2.0, 5.0, 7.0)
A.rug(k, 6.6, 7.0, 8.4, 9.3)
A.round_table(k, 5.5, 6.5)
A.stool(k, 4.5, 6.55)
A.stool(k, 6.5, 6.55)
A.round_table(k, 9.5, 6.5)
A.stool(k, 8.5, 6.55)
A.stool(k, 10.5, 6.55)
A.round_table(k, 9.5, 8.5)
A.stool(k, 8.5, 8.55)
A.stool(k, 10.5, 8.55)
for (x, r) in ((5.5, 6.5), (9.5, 6.5), (9.5, 8.5)):
    A.candle(k, x - 0.08, r - 0.1, 0.78)
A.mug(k, 5.75, 6.6, 0.78)
A.mug(k, 5.3, 6.35, 0.78)
A.mug(k, 9.25, 6.6, 0.78)
A.mug(k, 9.7, 8.6, 0.78)
A.mug(k, 3.0, 3.5, 1.0)
A.mug(k, 6.6, 3.45, 1.0)
A.barrel(k, 11.45, 5.5)
A.barrel(k, 11.45, 6.5)
A.coat_rack(k, 11.4, 9.4)

# ---- light ----------------------------------------------------------------------
A.hanging_lamp(k, 3.5, 3.6, energy=170, visible=False)
A.hanging_lamp(k, 6.3, 3.6, energy=170, visible=False)
A.hanging_lamp(k, 5.5, 6.6, energy=170, visible=False)
A.hanging_lamp(k, 9.5, 7.4, energy=190, visible=False)
k.point_light(2.55, 3.0, 0.3, '#ff7a30', 12, radius=0.1, group='flicker')   # stove door
k.area_light(8.4, 2.6, 1.6, '#7090d0', 40, 1.0, rot=(math.radians(-70), 0, 0))  # moonlight

meta = k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}},
                light_samples=128, world_light=('#38405a', 0.4))

# ---- world JSON ------------------------------------------------------------------
w = json.load(open(WORLD))
blocked = {tuple(b) for b in meta['blocked']}
coll = []
for r in range(ROWS):
    row = []
    for c in range(COLS):
        inside = 2 <= c <= 11 and 2 <= r <= 9
        door = (c, r) == (7, 10)
        row.append(0 if (inside and (c, r) not in blocked) or door else 1)
    coll.append(row)
w['collisions'] = coll

# Interactions keep their text, moved onto the objects they describe
moves = {
    'DOOR': (7, 10), 'TAVERN': (4, 3), 'FIREPLACE': (10, 2), 'PIANO': (2, 5),
    'DART BOARD': (11, 2), 'STOVE': (2, 3), 'REGULAR': (6, 6), 'MERCHANT': (8, 6),
    'BEER BARREL': (11, 5), 'COAT RACK': (11, 9), 'PAINTING': (9, 2),
}
for it in w['interactions']:
    if it.get('label') in moves:
        it['x'], it['y'] = moves[it['label']]

# Semantic tile names (the engine draws the scene, not these tiles)
names = {0: 'void', 1: 'wall', 2: 'floor', 3: 'door', 4: 'furniture'}
tiles = []
for r in range(ROWS):
    row = []
    for c in range(COLS):
        if (c, r) == (7, 10):
            row.append(3)
        elif 2 <= c <= 11 and 2 <= r <= 9:
            row.append(4 if (c, r) in blocked else 2)
        elif 1 <= c <= 12 and 0 <= r <= 10:
            row.append(1)
        else:
            row.append(0)
    tiles.append(row)
w['tiles'] = tiles
w['tileNames'] = {str(k_): v for k_, v in names.items()}
w.pop('lighting', None)          # light is baked into the render now
w['scene'] = {
    'id': 'lumar-tavern',
    'flicker': {'from': 'dim', 'to': 'full'},
    'actors': [
        {'sheet': 'npc-bartender', 'x': 4, 'y': 2, 'facing': 'down'},
        {'sheet': 'npc-regular', 'x': 6, 'y': 6, 'facing': 'left', 'pose': 'sit'},
        {'sheet': 'npc-merchant', 'x': 8, 'y': 6, 'facing': 'right', 'pose': 'sit'},
    ],
}
s = json.dumps(w, indent=2)
open(WORLD, 'w').write(s + '\n')
print('world updated; blocked tiles:', len(blocked))
