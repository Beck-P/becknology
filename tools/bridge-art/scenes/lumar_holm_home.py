"""The cottage on Starling Holm, inside — your island's house (world id "lumar-holm-home").
Usage: BVENV/bin/python lumar_holm_home.py RENDER_DIR

One room under the rafters: whitewash over a sea-green wainscot, scrubbed boards, a stone hearth with the fire in and
your first sloop's model on the mantel, a window either side onto the cove, the table under the window with your ledger
on it (js/holm.js: your ships, voyages, the strongbox), a sea chest, nets and floats on the wall. The rest of the floor
is bare — js/home.js puts the furniture you buy over it (the cottage is yours once it's built: `holm` in HOMES).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-holm-home'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 11
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 14, 8)
DOORS = [(7, 9), (8, 9)]
SEAGREEN = '#2e5a52'

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=4441)
A.room(k, 1, 2, 15, 9, H, door=(7.0, 9.0), floor_tone='#8a6a48', plaster='#ece2cc', wainscot_col=SEAGREEN)

# ---- the hearth (left of centre): stone, the fire in, a kettle on the hob, the sloop's model on the mantel ----------
A.fireplace(k, 4.2, 2.0, H, width=2.0, energy=100)
k.box(3.0, 2.05, 1.32, 5.4, 2.42, 1.42, ('#5e3b1e', 0.12), 'mantel')
k.cyl(3.55, 2.62, 0.05, 0.3, 0.13, ('#2a2a30', 0.15), 'kettle', verts=10)
k.tube((3.68, 2.62, 0.22), (3.85, 2.58, 0.32), 0.025, ('#2a2a30', 0.15), 'kettle_spout', verts=6)
M = (4.2, 2.25, 1.42)                                   # the first sloop, in miniature
k.box(M[0] - 0.32, M[1] - 0.06, M[2], M[0] + 0.32, M[1] + 0.06, M[2] + 0.1, ('#6a4422', 0.12), 'model_hull')
k.cyl(M[0], M[1], M[2] + 0.1, M[2] + 0.55, 0.01, ('#3e2414', 0.12), 'model_mast', verts=4)
k.poly([(M[0] + 0.02, M[1], M[2] + 0.15), (M[0] + 0.3, M[1], M[2] + 0.15), (M[0] + 0.02, M[1], M[2] + 0.52)], ('#f0e8d4', 0.1), 'model_sail')
for x in (3.3, 5.1):
    A.candle(k, x, 2.25, 1.42, energy=1.2)
A.wood_pile(k, 5.7, 6.4, 2.45, rows=2)

# ---- windows on the cove, the table under the right one with the ledger, a bench --------------------------------
for x in (8.6, 12.4):
    k.box(x - 0.6, 2.0, 1.0, x + 0.6, 2.08, 1.95, ('#3e2a1a', 0.12), 'window_frame')
    k.box(x - 0.52, 2.08, 1.06, x + 0.52, 2.1, 1.9, ('#2a3f66', 0.05), 'window_glass', emit=('#2a4a7a', 0.9))
    k.box(x - 0.52, 2.1, 1.06, x + 0.52, 2.11, 1.3, ('#1a3a4a', 0.05), 'window_cove', emit=('#3a7a8a', 0.6))
    k.box(x - 0.02, 2.1, 1.06, x + 0.02, 2.12, 1.9, ('#3e2a1a', 0.12), 'window_bar')
    k.box(x - 0.52, 2.1, 1.46, x + 0.52, 2.12, 1.5, ('#3e2a1a', 0.12), 'window_bar')
    k.box(x - 0.7, 2.08, 0.92, x + 0.7, 2.3, 1.0, ('#6a4a2a', 0.12), 'sill')
    k.area_light(x, 2.6, 1.5, '#7090d0', 22, 0.9, rot=(math.radians(-70), 0, 0))
A.potted_plant(k, 8.25, 2.2, z=1.0, tone='#4a7a3a')
k.box(11.2, 2.5, 0.72, 13.6, 3.4, 0.8, ('#8a6438', 0.12), 'table_top', bevel=0.02)
for (x, r) in ((11.35, 2.65), (13.45, 2.65), (11.35, 3.25), (13.45, 3.25)):
    k.box(x - 0.06, r - 0.06, 0, x + 0.06, r + 0.06, 0.72, ('#5a3a1e', 0.12), 'table_leg')
k.box(12.0, 2.75, 0.8, 12.8, 3.2, 0.86, ('#2a4a6a', 0.12), 'ledger')
k.box(12.05, 2.8, 0.86, 12.75, 3.15, 0.87, ('#f0e8d0', 0.1), 'ledger_page')
k.box(12.38, 2.8, 0.86, 12.42, 3.15, 0.88, ('#3a2a1a', 0.1), 'ledger_spine')
A.candle(k, 13.2, 2.8, 0.8, energy=1.6)
A.mug(k, 11.6, 3.0, 0.8)
k.solid(11.2, 2.5, 13.6, 3.4)
A.bench(k, 11.2, 13.6, 3.85)

# ---- the walls' things: a net with floats, an oar, a sea chest, oilskins on a peg --------------------------------
A.fishing_net(k, 6.7, 7.8, 2.0, z0=1.15, z1=2.05)
for (x, z) in ((6.95, 1.3), (7.35, 1.55), (7.6, 1.25)):
    k.sphere(x, 2.08, z, 0.07, 0.07, ('#d8a040', 0.2), 'float', segs=8)
k.tube((14.4, 2.12, 0.1), (14.2, 2.12, 2.2), 0.04, ('#9a6a3a', 0.12), 'oar', verts=6)
k.box(14.1, 2.08, 1.95, 14.45, 2.14, 2.35, ('#9a6a3a', 0.12), 'oar_blade')
A.trunk(k, 1.4, 2.6, w=0.9, d=0.55, tone='#3a4a5a')
k.box(1.3, 2.0, 1.2, 1.55, 2.06, 1.3, ('#3e2414', 0.12), 'peg')
k.blob(1.5, 2.12, 0.95, 0.18, 0.06, 0.32, ('#d8b030', 0.15), 'oilskin')
k.solid(1.0, 2.0, 2.5, 3.2)

# ---- light: the fire does most of it ----------------------------------------------------------------------------
A.hanging_lamp(k, 8.0, 5.6, energy=70, visible=False)
A.hanging_lamp(k, 12.4, 3.6, energy=60, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.72}}, light_samples=128, world_light=('#38405a', 0.42))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Cottage', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [7, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-holm', 'leaveSpawn': [20, 11], 'label': 'OUTSIDE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 12, 'y': 3, 'type': 'holm', 'act': 'ledger', 'label': 'THE LEDGER', 'prompt': 'PRESS E TO READ'},
    {'x': 4, 'y': 2, 'type': 'holm', 'act': 'rest', 'label': 'THE FIRE', 'prompt': 'PRESS E TO REST'},
    {'x': 4, 'y': 3, 'type': 'dialog', 'label': 'THE MODEL SLOOP', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A MODEL OF YOUR FIRST SLOOP ON THE MANTEL, CARVED BY SOMEBODY WITH MORE PATIENCE THAN YOU. THE NAME ON HER STERN IS YOURS.'},
    {'x': 8, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea',
     'dialog': 'THE COVE, YOUR JETTY, YOUR OWN WATER. NOTHING BETWEEN YOU AND THE HORIZON BUT A GULL.'},
    {'x': 1, 'y': 3, 'type': 'dialog', 'label': 'SEA CHEST', 'prompt': 'PRESS E TO OPEN',
     'dialog': 'A SEA CHEST, BRASS-CORNERED. INSIDE: SPARE CANVAS, A BOX OF HOOKS, AND A BUNDLE OF LETTERS YOU DON\'T REMEMBER PUTTING THERE.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID)
print('holm cottage done')
