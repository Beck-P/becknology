"""Your capsule apartment in Arcadia — the long-stay floor above the Capsule Hotel, empty for you to furnish.
Usage: BVENV/bin/python arcadia_home.py RENDER_DIR

One room: a strip window across the back wall onto the skyline (holdout
glass; js/home.js draws the live skyline and rain through it), the
sleeping capsule built into the wall, a kitchenette, LED strips, a neon
HOME someone left on. The rest is bare tile for the furniture you buy
(js/home.js, the furniture sheet from tools/bridge-art/furniture_sprites.py).
"""
import json
import math
import os
import sys

from _cyber_room import Y, P, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade  # noqa: E402

OUT = sys.argv[1]
WID = 'arcadia-home'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 14, 11
H = 2.3 / math.cos(THETA)
C = math.cos(THETA)
FLOOR = (1, 2, 12, 8)
DOORS = [(6, 9), (7, 9)]
RF = 2.0                                         # the back wall's face
WIN = (3.7, 10.3, 0.85, 2.75)

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=171)
Y.tile_floor(k, 1, 2, 13, 9, tones=('#2a2440', '#34304c'))
P.ship_back_wall(k, 0.4, 13.6, RF, H, win=WIN, mullions=(5.9, 8.1), pal=Y.WALL, trim=shade(Y.PINK, 0.6))
P.ship_side_wall(k, 0.4, 1.0, RF - 0.5, 9, H, pal=Y.WALL)
P.ship_side_wall(k, 13.0, 13.6, RF - 0.5, 9, H, pal=Y.WALL)
P.ship_front_wall(k, 0.4, 13.6, 9, door=(6.0, 8.0), pal=Y.WALL)
k.box(1.0, RF + 0.08, H - 0.34, 13.0, RF + 0.12, H - 0.3, '#200818', 'neon', emit=(Y.PINK, 0.85))
P.led_strip(k, 1.0, 13.0, RF + 0.11, z=0.22, col=Y.CYAN, group='flicker')
k.box(WIN[0] - 0.1, RF + 0.02, WIN[2] - 0.3, WIN[1] + 0.1, RF + 0.38, WIN[2] - 0.22, ('#3a3650', 0.08), 'sill')

# ---- the sleeping capsule, built into the left wall ------------------------------------------------------
x0, x1, r0, r1 = 1.0, 3.1, RF, RF + 1.15
k.box(x0, r0, 0.0, x1, r1, 0.34, ('#2a2a3e', 0.08), 'pod_base')
k.box(x0, r0, 0.34, x1, r0 + 0.12, 1.25, ('#d8d8e0', 0.12), 'pod_back')
k.box(x0, r0, 1.13, x1, r1, 1.25, ('#e0e0e8', 0.12), 'pod_roof')
k.box(x0, r0, 0.34, x0 + 0.1, r1, 1.25, ('#c8c8d0', 0.12), 'pod_side')
k.box(x1 - 0.1, r0, 0.34, x1, r1, 1.25, ('#c8c8d0', 0.12), 'pod_side')
k.box(x0 + 0.1, r0 + 0.12, 0.34, x1 - 0.1, r1 - 0.05, 0.44, ('#4a3a7a', 0.2), 'pod_mattress')
k.box(x0 + 0.2, r0 + 0.16, 0.44, x0 + 0.65, r0 + 0.5, 0.52, '#d4c8e0', 'pod_pillow')
k.box(x0 + 0.1, r1 - 0.04, 1.08, x1 - 0.1, r1, 1.12, '#200818', 'pod_led', emit=(Y.PINK, 0.8))
k.point_light((x0 + x1) / 2, r0 + 0.6, 0.9, '#f078a8', 6, radius=0.2, group='flicker')
k.solid(1, 2, 3, 4)

# ---- the kitchenette on the right ----------------------------------------------------------------------
x0, x1 = 10.9, 13.0
k.box(x0, RF, 0.0, x1, RF + 0.62, 0.86, ('#2a2a3e', 0.06), 'counter')
k.box(x0 - 0.02, RF, 0.86, x1, RF + 0.66, 0.92, ('#8a8aa0', 0.25), 'counter_top')
k.box(x0 + 0.15, RF + 0.12, 0.92, x0 + 0.65, RF + 0.48, 0.95, '#1a1a24', 'hotplate')
k.cyl(x0 + 0.4, RF + 0.3, 0.95, 1.1, 0.13, ('#6a6a78', 0.3), 'pan', verts=12)
k.cyl(x0 + 1.15, RF + 0.32, 0.92, 1.06, 0.07, '#e8e0d0', 'noodle_cup', verts=10)
k.cyl(x0 + 1.15, RF + 0.32, 1.06, 1.07, 0.072, '#e84040', 'noodle_lid', verts=10)
k.box(x0 + 1.4, RF + 0.08, 0.92, x1 - 0.1, RF + 0.5, 1.0, '#5a6a7a', 'sink')
k.box(x0 + 0.1, RF - 0.02, 1.35, x1 - 0.1, RF + 0.3, 1.75, ('#3a3650', 0.08), 'cupboard')
k.box(x0 + 0.1, RF + 0.3, 1.33, x1 - 0.1, RF + 0.32, 1.36, '#10343a', 'cupboard_led', emit=(Y.CYAN, 0.7))
k.point_light((x0 + x1) / 2, RF + 0.5, 1.3, '#a0f0f0', 5, radius=0.2)
k.solid(11, 2, 13, 3)

# ---- a neon HOME someone left on, and the lights --------------------------------------------------------
Y.neon_text(k, 'HOME', 12.0, RF, 2.15, h=0.3, col=Y.PINK, energy=5)
for (x, r) in ((4.5, 5.0), (9.0, 5.0), (7.0, 7.6)):
    k.point_light(x, r, 2.8, '#d8c8f0', 95, radius=0.8)
k.area_light(7.0, RF + 0.4, 1.8, '#8070d0', 70, 6.0, rot=(math.radians(-75), 0, 0))     # city glow through the glass

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=128, world_light=('#3a3058', 0.55))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Capsule Apartment', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia', 'interior': True,
          'spawns': {'player': [6, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-street', 'leaveSpawn': [36, 8], 'label': 'THE STREET', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 2, 'y': 3, 'type': 'dialog', 'label': 'CAPSULE', 'prompt': 'PRESS E TO SLEEP', 'action': 'sleep',
     'dialog': 'THE CAPSULE HUMS SHUT. THE CITY GOES ON WITHOUT YOU FOR A WHILE.'},
    {'x': 5, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'skyline',
     'dialog': 'THE TOWERS, THE TRAFFIC LANES, THE ADS. FROM UP HERE THE RAIN LOOKS LIKE IT FALLS UPWARD.'},
    {'x': 9, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'skyline',
     'dialog': 'A HOLO-AD FOR A HOLIDAY ON LUMAR. BLUE SEA, REAL SAND. YOU\'VE BEEN. IT\'S BETTER.'},
    {'x': 12, 'y': 2, 'type': 'dialog', 'label': 'KITCHENETTE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A HOTPLATE, A PAN, A SINK THE SIZE OF A HAT, AND ONE CUP OF INSTANT NOODLES THE LAST TENANT LEFT. SPORE-BROTH FLAVOUR.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, scene_extra={
    'flicker': {'mode': 'pulse'},
    'sky': [WIN[0], round(RF - WIN[3] * C, 3), WIN[1], round(RF - WIN[2] * C, 3)]})
print('arcadia home done')
