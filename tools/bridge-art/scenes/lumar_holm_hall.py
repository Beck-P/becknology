"""The hall of finds on Starling Holm, inside (world id "lumar-holm-hall") — the empire plan's chunk 4.
Usage: BVENV/bin/python lumar_holm_hall.py RENDER_DIR

A stone hall to show what you've found yourself: oak boards along the back wall for the five sea legends, stone plinths
down the floor for the deep's trophies and the rarest finds, and two glass-topped cases by the door for the small
precious things. The render holds only the room and its empty furniture; js/trophies.js draws each find on its board,
plinth or case once you have it (from the items' own art), so new finds never need a re-render. Where they go is in the
world JSON's `hall.spots`: [id, x, row, z, kind] in tile units — kind 'board' (on the wall), 'plinth' (standing on
top), 'case' (lying under the glass).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_estate as E

OUT = sys.argv[1]
WID = 'lumar-holm-hall'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 18, 12
H = 2.4 / math.cos(THETA)
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]
OAK_D, OAK = '#3a2414', '#6a4426'
STONE = '#b4aea4'
SPOTS = []                                              # [id, x, row, z, kind]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=5151)
# (the room by hand rather than A.room: a chevron parquet, not its flags - big regular slabs read as a wall)
E.parquet_chevron(k, 1, 2, 17, 10, tones=('#6a4426', '#5e3c20', '#76502e', '#644024'), border=(0.3, '#3e2614'))
A.back_wall(k, 0.4, 17.6, 2, H, plaster='#9a9284', wainscot_col='#3e2a1a', stone=True, beams_every=0)
A.side_wall(k, 0.4, 1, 1.5, 10, H)
A.side_wall(k, 17, 17.6, 1.5, 10, H)
A.front_wall(k, 0.4, 17.6, 10, gaps=[(8.0, 10.0)])
A.door_frame(k, 8.0, 10.0, 10)
E.runner_carpet(k, 8.2, 4.0, 9.8, 10.0, col='#24405a', trim=E.GILT)

# ---- the back wall: five oak boards for the sea legends, the middle one the biggest, a brass plate under each ---------
for i, (x, legend) in enumerate(((2.9, 'old_mossback'), (5.95, 'crownfin'), (9.0, 'nightglass'), (12.05, 'dawnveil'), (15.1, 'emberjaw'))):
    w, h, z = (1.0, 0.42, 1.62) if i != 2 else (1.25, 0.5, 1.72)
    k.box(x - w, 2.0, z - h, x + w, 2.06, z + h, (OAK_D, 0.1), 'board', bevel=0.03)
    k.box(x - w + 0.08, 2.06, z - h + 0.08, x + w - 0.08, 2.08, z + h - 0.08, (OAK, 0.12), 'board_face', bevel=0.01)
    for sx in (-1, 1):                                      # the board's carved ends, half-rounds
        k.cyl_y(x + sx * w, 2.0, 2.07, z, h * 0.62, h * 0.62, (OAK_D, 0.1), 'board', verts=14)
    k.box(x - 0.28, 2.04, z - h - 0.2, x + 0.28, 2.08, z - h - 0.06, (E.GILT, 0.06), 'plate', bevel=0.01)
    SPOTS.append([legend, x, 2.09, z, 'board'])
for x in (4.42, 7.48, 10.52, 13.58):
    E.sconce(k, x, 2.0, z=1.85, energy=7.0)
k.box(1.0, 1.98, H - 0.42, 17.0, 2.12, H - 0.3, (OAK_D, 0.1), 'cornice')

# ---- the plinths: the Lantern Beyond in the middle on the tallest, the deep's trophies and the rarest finds round it ---
PLINTHS = [('lantern_beyond', 9.0, 5.0, 1.05, 0.62), ('heartsong', 3.2, 4.6, 0.9, 0.52), ('wispcaller', 6.0, 4.6, 0.9, 0.52),
           ('regatta_cup', 12.0, 4.6, 0.9, 0.52), ('gloam_scale', 14.8, 4.6, 0.9, 0.52),
           ('deep_pearl', 6.6, 7.6, 0.85, 0.5), ('veilpiercer', 11.4, 7.6, 0.85, 0.5)]
for (tid, cx, cr, h, w) in PLINTHS:
    top = E.plinth(k, cx, cr, h=h, w=w, stone=STONE, trim=E.GILT)
    SPOTS.append([tid, cx, cr, top, 'plinth'])
    k.box(cx - 0.16, cr + w / 2 + 0.045, h * 0.45, cx + 0.16, cr + w / 2 + 0.055, h * 0.45 + 0.09, (E.GILT, 0.06), 'plate')

# ---- the two cases by the door: oak, on turned legs, glass-topped (the glass is js/trophies.js's, so the finds show) ---
for (x0, x1, ids) in ((1.9, 5.1, ('drowned_bell', 'wight_lantern', 'heron_coin')), (12.9, 16.1, ('ferry_coin', 'barrow_crown', 'star_pearl'))):
    r0, r1, z = 7.1, 7.9, 0.82
    for (x, r) in ((x0 + 0.1, r0 + 0.1), (x1 - 0.1, r0 + 0.1), (x0 + 0.1, r1 - 0.1), (x1 - 0.1, r1 - 0.1)):
        k.cyl(x, r, 0.0, z - 0.2, 0.05, (OAK_D, 0.1), 'case_leg', verts=8)
    k.box(x0, r0, z - 0.22, x1, r1, z - 0.12, (OAK_D, 0.1), 'case')
    k.box(x0 + 0.06, r0 + 0.06, z - 0.12, x1 - 0.06, r1 - 0.06, z - 0.1, ('#4a1c22', 0.6), 'case_velvet')
    for (a, b) in (((x0, r0), (x1, r0 + 0.06)), ((x0, r1 - 0.06), (x1, r1)), ((x0, r0), (x0 + 0.06, r1)), ((x1 - 0.06, r0), (x1, r1))):
        k.box(a[0], a[1], z - 0.12, b[0], b[1], z, (OAK, 0.12), 'case_frame')
    k.box(x0 - 0.02, r1 - 0.01, z - 0.02, x1 + 0.02, r1 + 0.01, z + 0.01, (E.GILT, 0.06), 'case_trim')
    k.solid(x0, r0, x1, r1)
    for i, tid in enumerate(ids):
        SPOTS.append([tid, round(x0 + (x1 - x0) * (i + 0.5) / len(ids), 3), (r0 + r1) / 2, z - 0.1, 'case'])

# ---- by the walls: banners; light from the sconces, the chandelier and two lamps --------------------------------------
for (x, r) in ((1.7, 2.7), (16.3, 2.7)):                 # a palm in each back corner
    E.potted_palm(k, x, r)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for (x, col) in ((1.25, '#24405a'), (16.75, '#5a2430')):
    k.box(x - 0.04, 2.3, 1.0, x + 0.04, 2.36, 2.45, (col, 0.6), 'banner')
E.chandelier(k, 9.0, 5.0, H - 0.4, rad=0.55, arms=6, tiers=1, chain_top=H, energy=70.0)
A.hanging_lamp(k, 4.6, 6.0, energy=55, visible=False)
A.hanging_lamp(k, 13.4, 6.0, energy=55, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=int(os.environ.get('SCENE_SAMPLES', 128)),
         world_light=('#343a50', 0.42))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hall of Finds', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True, 'hall': {'spots': SPOTS}})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-holm', 'leaveSpawn': [35, 14], 'label': 'OUTSIDE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID)
print('holm hall done')
