"""The Loop's carriage — Arcadia's sky train round the Mid-Levels (world id "arcadia-loop").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_loop.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-loop

Inside one of her cars: the long back wall is three bays of glass with a pair of sliding doors between each (the
glass a holdout — js/skyline.js draws the city streaming past behind it, js/transit.js the towers flashing by and
each station's platform sliding in), cyan-upholstered benches under the windows, grab poles in the aisle, the route
map over each door, ad panels, the gangway doors at either end to the next car, and people riding. js/transit.js
runs the journey (BridgeTransit: the doors step you off when she's in, `loop_doors`; the route map, `loop_map`).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_signs as S               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-loop'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 24, 8
C = math.cos(THETA)
RF = 2.6                                          # the back wall's face
H = 2.75 / C                                      # its height: up past the top of the frame
WZ0, WZ1 = 0.78, 2.55                             # the glass, foot to head
BAYS = [(1.5, 6.6), (8.9, 15.1), (17.4, 22.5)]    # three bays of windows
DOORS = [(6.6, 8.9), (15.1, 17.4)]                # a pair of sliding doors between each
FRONT = 6.4                                       # the near wall, cut low
k = Kit(COLS, ROWS, margin_top=0.4, margin_bottom=0.3, seed=414)
SHELL, SHELL_D, SHELL_L = '#d8d6e2', '#9e9aae', '#eeecf4'

# ---- the floor: dark rubber with a ribbed aisle, a yellow line at the doors -----------------------------------------
Y.tile_floor(k, 0.6, RF, COLS - 0.6, FRONT, tones=('#2a2838', '#262434'), size=0.5, seam='#141220')
k.box(0.6, 3.95, 0.0, COLS - 0.6, 5.15, 0.006, '#1e1c2a', 'floor_aisle')
for x in [0.8 + i * 0.25 for i in range(int((COLS - 1.6) / 0.25))]:
    k.box(x, 4.0, 0.006, x + 0.12, 5.1, 0.01, '#16141f', 'floor_rib')
for (a, b) in DOORS:
    k.box(a + 0.1, RF + 0.05, 0.0, b - 0.1, RF + 0.95, 0.008, '#2c2a1c', 'floor_door')
    k.box(a + 0.1, RF + 0.92, 0.0, b - 0.1, RF + 0.98, 0.012, '#e0c040', 'floor_door_line')

# ---- the back wall: white panels, the glass bays, the doors ---------------------------------------------------------
k.box(0.0, RF - 0.4, 0.0, COLS, RF, H, (SHELL_D, 0.05), 'wall')
for (a, b) in BAYS:
    k.box(a, RF - 0.02, WZ0, b, RF + 0.02, WZ1, 'HOLDOUT', 'window')
    k.box(a - 0.12, RF, WZ0 - 0.12, b + 0.12, RF + 0.08, WZ0, (SHELL_L, 0.05), 'window_sill')
    k.box(a - 0.12, RF, WZ1, b + 0.12, RF + 0.06, WZ1 + 0.1, (SHELL_L, 0.05), 'window_head')
    for xx in (a - 0.12, b):
        k.box(xx, RF, WZ0, xx + 0.12, RF + 0.06, WZ1, (SHELL_L, 0.05), 'window_jamb')
    n = max(1, int(round((b - a) / 1.7)))
    for i in range(1, n):                          # mullions
        mx = a + (b - a) * i / n
        k.box(mx - 0.05, RF, WZ0, mx + 0.05, RF + 0.05, WZ1, ('#3a3a4c', 0.05), 'mullion')
    k.box(a, RF + 0.0, 0.0, b, RF + 0.05, WZ0 - 0.12, (SHELL, 0.05), 'wall_panel')
    # an ad panel over the bay, lit: a holo the city sells
    k.box(a + 0.3, RF, WZ1 + 0.22, b - 0.3, RF + 0.04, WZ1 + 0.68, '#0c0a18', 'ad_panel')
for i, (a, b) in enumerate(BAYS):
    cx = (a + b) / 2
    col = (Y.PINK, Y.CYAN_L, Y.YEL)[i]
    k.box(a + 0.36, RF + 0.04, WZ1 + 0.28, b - 0.36, RF + 0.05, WZ1 + 0.62, shade(col, 0.25), 'ad_screen', emit=(col, 0.35))
    S.letters(k, ('LUCKY 7', 'TAKE THE LOOP', 'HALCYON')[i], 'Audiowide', cx, RF + 0.05, WZ1 + 0.36, size=0.22, col='#f4f0ff', energy=5)
for (a, b) in DOORS:
    cx = (a + b) / 2
    k.box(a, RF - 0.02, 0.0, b, RF + 0.04, WZ1 + 0.1, ('#3a3a4c', 0.05), 'door_frame')
    for (d0, d1) in ((a + 0.1, cx - 0.02), (cx + 0.02, b - 0.1)):
        k.box(d0, RF + 0.04, 0.02, d1, RF + 0.09, WZ1, (SHELL, 0.05), 'door_leaf')
        k.box(d0 + 0.14, RF + 0.08, 0.95, d1 - 0.14, RF + 0.1, WZ1 - 0.15, 'HOLDOUT', 'door_glass')
        k.box(d0, RF + 0.09, 0.02, d1, RF + 0.1, 0.12, '#2a2838', 'door_kick')
    k.box(cx - 0.015, RF + 0.09, 0.02, cx + 0.015, RF + 0.11, WZ1, '#14141c', 'door_seam')
    for s in (-1, 1):                              # the door lights: green when she's in
        k.sphere(cx + s * 0.95, RF + 0.08, WZ1 - 0.1, 0.04, 0.04, Y.GREEN, 'door_lamp', emit=(Y.GREEN, 0.9), segs=6)
    # the route map over the door: a ring of light, a dot for each station
    k.box(a + 0.15, RF + 0.04, WZ1 + 0.22, b - 0.15, RF + 0.08, WZ1 + 0.66, '#0a0c16', 'route_board')
    k.box(a + 0.3, RF + 0.08, WZ1 + 0.42, b - 0.3, RF + 0.09, WZ1 + 0.46, shade(Y.CYAN, 0.4), 'route_line', emit=(Y.CYAN, 0.9))
    for j in range(4):
        px = a + 0.4 + j * (b - a - 0.8) / 3
        k.cyl_y(px, RF + 0.085, RF + 0.1, WZ1 + 0.44, 0.05, 0.05, '#f4f4ff', 'route_stop', emit=('#ffffff', 0.8 if j else 0.4), verts=8)
    k.solid(a, RF - 0.2, b, RF + 0.1)
k.box(0.0, RF - 0.02, H - 0.36, COLS, RF + 0.14, H - 0.24, (SHELL_L, 0.05), 'wall_cornice')
k.box(0.0, RF + 0.12, H - 0.42, COLS, RF + 0.16, H - 0.38, shade(Y.CYAN, 0.4), 'ceiling_strip', emit=(Y.CYAN_L, 0.9))

# ---- the benches under the windows ---------------------------------------------------------------------------------------
SEATS = []
for (a, b) in BAYS:
    k.box(a + 0.05, RF, 0.0, b - 0.05, RF + 0.6, 0.36, ('#2a2a3a', 0.06), 'bench_base')
    k.box(a + 0.05, RF + 0.02, 0.36, b - 0.05, RF + 0.62, 0.46, ('#2a7c8a', 0.12), 'bench_seat', bevel=0.03)
    k.box(a + 0.05, RF + 0.0, 0.46, b - 0.05, RF + 0.14, WZ0 - 0.04, ('#2a7c8a', 0.12), 'bench_back', bevel=0.03)
    for x in [a + 0.6 + i * 0.85 for i in range(int((b - a - 0.4) / 0.85))]:
        k.box(x - 0.01, RF + 0.14, 0.46, x + 0.01, RF + 0.62, 0.47, '#1e5a66', 'bench_seam')
    k.solid(a, RF, b, RF + 0.62)
    for x in range(int(math.ceil(a + 0.2)), int(b)):
        SEATS.append([x + 0.5, round(RF + 0.55, 2), 'down'])
# grab poles in the aisle, a rail along the ceiling's edge for them
for x in (4.0, 7.75, 12.0, 16.25, 20.0):
    k.cyl(x, 4.55, 0.0, 2.7, 0.045, ('#c8ccd8', 0.35), 'pole', verts=8)
    k.cyl(x, 4.55, 0.0, 0.06, 0.1, '#3a3a4c', 'pole_foot', verts=8)
    k.solid_post(x, 4.55)

# small life: a cup rolling under a bench, a free paper, an umbrella left against a pole, a bag on the seat
k.cyl(5.2, 3.3, 0.0, 0.14, 0.05, ('#e8e0d0', 0.1), 'cup', verts=8)
k.box(10.6, 5.3, 0.0, 11.2, 5.7, 0.01, ('#d8d4c8', 0.2), 'newspaper')
k.box(10.65, 5.35, 0.01, 11.15, 5.42, 0.012, '#3a3a44', 'newspaper_print')
k.tube((16.32, 4.62, 0.0), (16.28, 4.66, 0.85), 0.05, '#d84a6a', 'umbrella', rb=0.02, verts=8)
k.box(18.2, RF + 0.15, 0.46, 18.7, RF + 0.5, 0.75, ('#5a3a2a', 0.1), 'bag', bevel=0.03)

# ---- the ends: gangway doors through to the next car ----------------------------------------------------------------------
for (x0, x1, door_x) in ((0.0, 0.6, 0.6), (COLS - 0.6, COLS, COLS - 0.6)):
    k.box(x0, RF, 0.0, x1, FRONT, H, (SHELL_D, 0.05), 'end_wall')
    k.box(min(door_x, door_x - 0.02), 3.5, 0.0, max(door_x, door_x + 0.02), 5.3, 2.2, '#3a3a4c', 'gangway_door')
    k.box(min(door_x, door_x - 0.03), 3.9, 1.0, max(door_x, door_x + 0.03), 4.9, 1.9, '#141a28', 'gangway_glass', emit=('#ffd890', 0.25))
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
# the near wall: low, a rail, the floor's edge
k.box(0.0, FRONT, 0.0, COLS, FRONT + 0.4, 0.55, (SHELL_D, 0.05), 'front_wall')
k.box(0.0, FRONT - 0.02, 0.5, COLS, FRONT + 0.42, 0.6, (SHELL_L, 0.05), 'front_cap')
k.box(0.0, FRONT + 0.38, 0.05, COLS, FRONT + 0.42, 0.1, shade(Y.PINK, 0.4), 'front_led', emit=(Y.PINK, 0.7))
k.solid(0, FRONT - 0.1, COLS, ROWS)

# ---- light: the strip lights, the city's glow through the glass --------------------------------------------------------------
for x in (4.0, 12.0, 20.0):
    k.point_light(x, 4.2, 2.6, '#e0ecff', 170, radius=0.9)
k.area_light(COLS / 2, RF + 0.5, 1.8, '#9a70e0', 120, 14.0, rot=(math.radians(-75), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.85}}, light_samples=128, world_light=('#2a2040', 0.5))

ACTORS = [{'sheet': 'npc-gambler-a', 'x': 3, 'y': 3, 'facing': 'down', 'pose': 'sit'},
          {'sheet': 'npc-gambler-c', 'x': 10, 'y': 3, 'facing': 'down', 'pose': 'sit'},
          {'sheet': 'npc-gambler-b', 'x': 13, 'y': 3, 'facing': 'down', 'pose': 'sit'},
          {'sheet': 'npc-gambler-d', 'x': 21, 'y': 3, 'facing': 'down', 'pose': 'sit'}]
taken = {(a['x'], a['y']) for a in ACTORS}
SEATS = [s for s in SEATS if (int(s[0]), 3) not in taken and int(s[0]) != 18]   # (a bag on that one)
w = {'name': 'The Loop', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [12, 5]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 7, 'y': 3, 'type': 'loop_doors', 'label': 'DOORS', 'prompt': 'PRESS E FOR THE DOORS'},
         {'x': 8, 'y': 3, 'type': 'loop_doors', 'label': 'DOORS', 'prompt': 'PRESS E FOR THE DOORS'},
         {'x': 15, 'y': 3, 'type': 'loop_doors', 'label': 'DOORS', 'prompt': 'PRESS E FOR THE DOORS'},
         {'x': 16, 'y': 3, 'type': 'loop_doors', 'label': 'DOORS', 'prompt': 'PRESS E FOR THE DOORS'},
         {'x': 1, 'y': 5, 'type': 'loop_map', 'label': 'ROUTE MAP', 'prompt': 'PRESS E TO LOOK'},
         {'x': 22, 'y': 5, 'type': 'dialog', 'label': 'NEXT CAR', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THROUGH THE GANGWAY GLASS THE NEXT CAR SWAYS ON THE BEND: A COURIER ASLEEP ON HER BAG, TWO SUITS SHARING A SCREEN, A KID WITH HIS FACE PRESSED TO THE WINDOW.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 3, COLS - 2, 5), scene_id=WID, actors=ACTORS, scene_extra={'backdrop': True, 'flicker': {'mode': 'pulse'}})
w = json.load(open(WORLD))
top, bot = round(RF - WZ1 * C, 2), round(RF - WZ0 * C, 2)
w['skyline'] = {'baseRow': round(top + 0.6, 2), 'railRow': round(bot - 0.3, 2), 'centerCol': COLS / 2, 'motion': 'loop', 'rain': {'none': True}}
w['loopcar'] = {'window': [top, bot], 'seats': SEATS, 'board': [12, 4]}
w['view'] = [0.0, round(RF - H * C + 0.1, 2), COLS, FRONT + 0.5]
w['fixedCamera'] = True
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('loop carriage done', top, bot)
