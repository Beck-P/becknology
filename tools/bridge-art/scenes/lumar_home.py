"""Your house on Sapphire Port — the white house on the square, empty for you to furnish.
Usage: BVENV/bin/python lumar_home.py RENDER_DIR

A swept, bare room under a whitewashed ceiling: the hearth, two windows on
the sea side, a shelf of the last tenant's bottles, and floorboards. Nothing else is
in the render — js/home.js puts the furniture you buy over it, where you
put it (the furniture sheet: tools/bridge-art/furniture_sprites.py).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401

OUT = sys.argv[1]
WID = 'lumar-home'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 18, 12
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=61)
A.room(k, 1, 2, 17, 10, H, door=(8.0, 10.0), floor_tone='#8a6a48', plaster='#e4dccb', wainscot_col='#3e5a78')

# ---- the back wall: hearth, shelf, windows over the sea ---------------------------------------------
A.fireplace(k, 4.5, 2.0, H, width=2.0, energy=150)
A.wall_shelf(k, 7.0, 8.8, 2.0, 1.45, bottles=True)
A.window(k, 11.0, 2.0, w=0.9)
A.window(k, 14.0, 2.0, w=0.9)
A.wall_sconce(k, 9.6, 2.0, energy=8)
A.wall_sconce(k, 2.4, 2.0, energy=6)

# ---- light: the fire, a lamp's worth from above, the moon through the windows -------------------------
A.hanging_lamp(k, 8.5, 5.5, energy=120, visible=False)
for x in (11.0, 14.0):
    k.area_light(x, 2.6, 1.6, '#7090d0', 22, 1.0, rot=(math.radians(-70), 0, 0))

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128, world_light=('#38405a', 0.45))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The White House', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar-home',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire', 'leaveSpawn': [38, 14], 'label': 'THE SQUARE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 4, 'y': 2, 'type': 'dialog', 'label': 'HEARTH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'YOUR OWN FIRE. SOMEONE - THE LANDLADY, PROBABLY - LAID IT BEFORE YOU CAME, AND LEFT A BUNDLE OF DRIFTWOOD BESIDE IT.'},
    {'x': 11, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea', 'roofs': True,
     'dialog': 'OVER THE ROOFTOPS TO THE HARBOUR, THE LIGHTHOUSE BEAM SWEEPING THE BLUE WATER.'},
    {'x': 14, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea', 'beam': True,
     'dialog': 'THE SAPPHIRE SEA, AND THE LIGHT ON THE WEST HILL TURNING.'},
    {'x': 8, 'y': 2, 'type': 'dialog', 'label': 'SHELF', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SHELF OF ODD BOTTLES THE LAST TENANT LEFT. ONE HOLDS A SHIP. ONE HOLDS SOMETHING THAT MOVES WHEN YOU AREN\'T LOOKING.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID)
print('lumar home done')
