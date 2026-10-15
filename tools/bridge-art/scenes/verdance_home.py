"""Your farmhouse on Verdance — Edda's kitchen, empty for you to furnish.
Usage: BVENV/bin/python verdance_home.py RENDER_DIR

The farm's one room downstairs, in daylight: whitewashed walls over green
wainscot, scrubbed boards, the black range with its fire in, a dresser of
blue-and-white plates, a window either side of it onto the field, Edda's
kitchen table with the ledger on it, her boots by the range. The rest of
the floor is bare — js/home.js puts the furniture you buy over it (the
house comes with the farm's deed, js/homestead.js).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401

OUT = sys.argv[1]
WID = 'verdance-home'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 11
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 14, 8)
DOORS = [(7, 9), (8, 9)]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=67)
A.room(k, 1, 2, 15, 9, H, door=(7.0, 9.0), floor_tone='#9a7a52', plaster='#efe2c6', wainscot_col='#3a6a3a')

# ---- the back wall: the range, the dresser, two windows on the field ------------------------------------
A.fireplace(k, 3.4, 2.0, H, width=1.8, energy=90)
k.box(2.3, 2.05, 1.32, 4.5, 2.4, 1.42, ('#2a2a30', 0.12), 'mantel')
for i, col in enumerate(('#c8a050', '#8a5a30', '#c8a050')):
    k.cyl(2.7 + i * 0.8, 2.25, 1.42, 1.62, 0.1, (col, 0.1), 'pan', verts=10)
# the dresser: a cupboard below, racks of plates above
k.box(5.4, 2.05, 0, 7.6, 2.6, 0.9, ('#4e6a8a', 0.14), 'dresser', bevel=0.02)
k.box(5.35, 2.0, 0.9, 7.65, 2.65, 0.96, ('#6a4a2a', 0.12), 'dresser_top')
k.box(5.5, 2.05, 0.96, 7.5, 2.2, 2.1, ('#4e6a8a', 0.14), 'dresser_back')
for z in (1.2, 1.6, 2.0):
    k.box(5.5, 2.2, z - 0.04, 7.5, 2.42, z, ('#6a4a2a', 0.12), 'rack')
    for j in range(5):
        k.cyl_y(5.75 + j * 0.4, 2.2, 2.26, z + 0.15, 0.15, 0.15, ('#e8eef6', 0.06), 'plate', verts=12)
        k.cyl_y(5.75 + j * 0.4, 2.26, 2.27, z + 0.15, 0.09, 0.09, ('#2a5a9a', 0.06), 'plate_blue', verts=10)
k.solid(5, 2, 8, 3)
# daylight windows: the field outside
for x in (9.6, 12.6):
    k.box(x - 0.6, 2.0, 1.0, x + 0.6, 2.08, 2.0, ('#4a3420', 0.12), 'window_frame')
    k.box(x - 0.52, 2.08, 1.06, x + 0.52, 2.1, 1.94, ('#8ab8d8', 0.05), 'window_glass', emit=('#d8ecff', 0.85))
    k.box(x - 0.02, 2.1, 1.06, x + 0.02, 2.12, 1.94, ('#4a3420', 0.12), 'window_bar')
    k.box(x - 0.52, 2.1, 1.48, x + 0.52, 2.12, 1.52, ('#4a3420', 0.12), 'window_bar')
    k.box(x - 0.7, 2.08, 0.92, x + 0.7, 2.3, 1.0, ('#6a4a2a', 0.12), 'sill')
    A.potted_plant(k, x - 0.35, 2.2, z=1.0, tone='#4a8a3a')
# Edda's kitchen table, the ledger on it, two stools; her boots by the range
k.box(10.4, 3.4, 0.72, 12.8, 4.5, 0.8, ('#8a6438', 0.12), 'table_top', bevel=0.02)
for (x, r) in ((10.55, 3.55), (12.65, 3.55), (10.55, 4.35), (12.65, 4.35)):
    k.box(x - 0.06, r - 0.06, 0, x + 0.06, r + 0.06, 0.72, ('#5a3a1e', 0.12), 'table_leg')
k.box(11.2, 3.7, 0.8, 11.9, 4.2, 0.86, ('#3a5a3a', 0.12), 'ledger')
k.box(11.25, 3.75, 0.86, 11.85, 4.15, 0.87, ('#f0e8d0', 0.1), 'ledger_page')
A.mug(k, 12.3, 3.9, 0.8)
A.stool(k, 10.0, 4.0)
A.stool(k, 13.2, 4.0)
k.solid(10, 3, 13, 5)
for dx in (0, 0.22):
    k.box(4.7 + dx, 3.0, 0, 4.86 + dx, 3.3, 0.36, ('#3a2414', 0.12), 'boot')
# a braided rug by the door
A.rug(k, 6.2, 6.6, 9.8, 8.4, col='#a8584a', trim='#e8d8b0')

# ---- light: daylight through the windows, the fire in the range --------------------------------------------
for x in (9.6, 12.6):
    k.area_light(x, 2.6, 1.5, '#fff0d4', 60, 1.2, rot=(math.radians(-70), 0, 0))
k.area_light(8.0, 5.5, 3.2, '#fff4e0', 40, 4.0)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128, world_light=('#8a9ab8', 0.7))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Farmhouse', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar-home',
          'spawns': {'player': [7, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'verdance', 'leaveSpawn': [6, 8], 'label': 'THE YARD', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 11, 'y': 4, 'type': 'farm_ledger', 'label': 'KITCHEN TABLE', 'prompt': 'PRESS E FOR THE LEDGER'},
    {'x': 3, 'y': 2, 'type': 'dialog', 'label': 'RANGE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE RANGE TICKS AND THE KETTLE MUTTERS. EDDA\'S BOOTS ARE STILL BY IT. YOU PUT YOURS BESIDE THEM.'},
    {'x': 6, 'y': 2, 'type': 'dialog', 'label': 'DRESSER', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'BLUE-AND-WHITE PLATES, EVERY ONE A DIFFERENT PATTERN, AND IN THE CUPBOARD UNDER THEM A JAR OF BUTTONS, A JAR OF SEEDS, AND A JAR OF LETTERS FROM SOMEONE WHO WENT NORTH.'},
    {'x': 9, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE FIELD IN THE SUN, THE SCARECROW, THE WINDMILL TURNING OVER THE BARN. YOURS, ALL OF IT.'},
    {'x': 12, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE LANE DOWN TO THE VILLAGE, HOLLIN\'S STALL, MARLO\'S CART. A BUTTERFLY ON THE SILL, ASLEEP.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID)
print('verdance home done')
