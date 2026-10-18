"""Rosewell's tea house on its stilts over the lowest pool (world id "lumar-rose-teahouse"). Workstream B1.
Usage: BVENV/bin/python lumar_rose_teahouse.py RENDER_DIR

A room of mats and low tables, paper screens lit from inside, a sunken hearth where the kettle sings on its hook and
Master Lior kneels beside it, shelves of tea in jars and tins from every sea (and one from a sea nobody's charted), a
window open on the steaming pools below and the terraces climbing to the silk groves. Sit at a table; ask Lior for a
pot (`tea`, js/rose.js).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_town as W  # noqa: E402

OUT = sys.argv[1]
WID = 'lumar-rose-teahouse'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 15, 11
H = 2.2 / math.cos(THETA)
FLOOR = (1, 2, 13, 8)
DOORS = [(7, 9)]

k = Kit(COLS, ROWS, margin_top=1.2, margin_bottom=0.5, seed=4433)
rng = k.rng
A.room(k, 1, 2, 14, 9, H, door=(7.0, 8.0), floor_tone='#8a6a48', plaster='#ecdcc8', wainscot=0.6, wainscot_col='#4a2a2a', beams_every=1.5,
       beam='#3a2228')
# mats over the floor: woven, edged in dark cloth
for (x0, r0) in [(x, r) for x in (1.2, 4.2, 7.2, 10.2) for r in (2.2, 5.2)]:
    k.box(x0, r0, 0.0, x0 + 2.9, r0 + 2.9, 0.03, ('#c8b07a', 0.05), 'floor_mat')
    k.box(x0, r0, 0.03, x0 + 2.9, r0 + 0.08, 0.035, '#3a2228', 'floor_mat_edge')
    k.box(x0, r0 + 2.82, 0.03, x0 + 2.9, r0 + 2.9, 0.035, '#3a2228', 'floor_mat_edge')
# the paper screens along the back wall, lit
for sx in (2.0, 5.0, 10.0, 13.0):
    k.box(sx - 1.1, 1.99, 0.6, sx + 1.1, 2.04, 2.0, '#3a1a20', 'paper_screen', emit=('#ffd8a8', 0.45))
    for q in range(6):
        k.box(sx - 1.1 + q * 0.44, 2.04, 0.6, sx - 1.08 + q * 0.44, 2.07, 2.0, '#3a2228', 'lattice')
    for zz in (1.0, 1.5):
        k.box(sx - 1.1, 2.04, zz, sx + 1.1, 2.07, zz + 0.03, '#3a2228', 'lattice')
# the window over the pools (centre back), dark with the steam beyond
k.box(6.4, 1.99, 0.8, 8.6, 2.04, 2.0, '#1e2a3a', 'window_glass', emit=('#5a7a9a', 0.35))
k.box(6.35, 2.0, 0.75, 8.65, 2.08, 0.82, '#3a2228', 'window_frame')
# the sunken hearth (left): a square pit of ash with a glow, the kettle on its hook, Lior beside it
HX, HR = 3.4, 4.6
k.box(HX - 0.6, HR - 0.6, -0.02, HX + 0.6, HR + 0.6, 0.06, ('#3a2a24', 0.2), 'hearth_frame')
k.box(HX - 0.45, HR - 0.45, 0.02, HX + 0.45, HR + 0.45, 0.07, '#2a1006', 'hearth_coals', emit=('#ff7a30', 0.7))
k.tube((HX, HR, 1.8), (HX, HR, 0.62), 0.012, '#2a2a30', 'kettle_hook', verts=4)
k.sphere(HX, HR, 0.48, 0.22, 0.17, ('#2a2a30', 0.15), 'kettle', segs=12)
k.tube((HX + 0.2, HR, 0.5), (HX + 0.38, HR, 0.6), 0.025, '#2a2a30', 'kettle_spout', verts=5)
k.point_light(HX, HR, 0.5, '#ff9a50', 40, radius=0.3, group='flicker')
k.solid(HX - 0.6, HR - 0.6, HX + 0.6, HR + 0.6)
# low tables with cushions, cups and a pot on each
TABLES = [(7.6, 5.2), (10.8, 5.2), (7.6, 7.4), (10.8, 7.4)]
for (tx, tr) in TABLES:
    k.box(tx - 0.6, tr - 0.4, 0.0, tx + 0.6, tr + 0.4, 0.34, ('#4a2a2a', 0.06), 'tea_table', bevel=0.03)
    k.box(tx - 0.55, tr - 0.35, 0.34, tx + 0.55, tr + 0.35, 0.36, ('#6a3a3a', 0.06), 'tea_table_top')
    k.sphere(tx, tr, 0.46, 0.12, 0.1, ('#e8e0d8', 0.04), 'teapot', segs=10)
    k.tube((tx + 0.1, tr, 0.47), (tx + 0.2, tr, 0.52), 0.02, '#e8e0d8', 'teapot_spout', verts=5)
    for dx in (-0.32, 0.32):
        k.cyl(tx + dx, tr + 0.12, 0.36, 0.43, 0.06, '#e8e0d8', 'tea_cup', verts=8)
    k.box(tx - 0.2, tr - 0.3, 0.36, tx + 0.2, tr - 0.15, 0.39, '#c8a050', 'sweets_tray')
    for dx in (-0.85, 0.85):
        k.box(tx + dx - 0.26, tr - 0.26, 0.0, tx + dx + 0.26, tr + 0.26, 0.12, (rng.choice(('#c8607a', '#7a4a8a', '#c8a050')), 0.06), 'cushion', bevel=0.04)
    k.solid(tx - 0.6, tr - 0.4, tx + 0.6, tr + 0.4)
# the alcove (west of the window): a hanging scroll of a mountain and the sea, a low stand with a spray of silk-tree
# blossom in a celadon bowl
k.box(9.2, 1.95, 0.0, 11.2, 2.06, 2.1, ('#e8dcc8', 0.04), 'alcove_back')
k.box(9.15, 2.0, 0.0, 11.25, 2.5, 0.18, ('#4a2a2a', 0.06), 'alcove_dais', bevel=0.02)
k.box(9.15, 2.0, 2.0, 11.25, 2.1, 2.12, '#3a2228', 'alcove_beam')
k.box(9.75, 2.07, 0.75, 10.65, 2.09, 1.85, ('#f0e8d8', 0.03), 'scroll')
k.box(9.82, 2.09, 0.95, 10.58, 2.1, 1.6, '#8a8a9a', 'scroll_ink')
k.box(9.82, 2.09, 1.3, 10.58, 2.1, 1.38, '#c8607a', 'scroll_ink')
k.cyl_x(9.7, 10.7, 2.09, 1.86, 0.03, 0.03, '#3a2228', 'scroll_rod', verts=6)
k.cyl_x(9.7, 10.7, 2.09, 0.74, 0.03, 0.03, '#3a2228', 'scroll_rod', verts=6)
k.cone(10.6, 2.28, 0.18, 0.34, 0.12, 0.17, ('#8ab8a0', 0.04), 'flower_bowl', verts=12)
for i in range(7):
    a = i * 0.8
    k.tube((10.6, 2.28, 0.34), (10.6 + math.cos(a) * 0.3, 2.28 + math.sin(a) * 0.1, 0.62 + (i % 3) * 0.12), 0.012, '#4a3a2a', 'flower_twig', verts=4)
    k.sphere(10.6 + math.cos(a) * 0.3, 2.28 + math.sin(a) * 0.1, 0.64 + (i % 3) * 0.12, 0.06, 0.05, '#f0a8c8', 'blossom', segs=6)
k.solid(9, 2, 11.3, 2.6)
# a folding screen in the corner, painted with cranes; a potted silk tree
for i in range(4):
    k.box(1.3 + i * 0.36, 8.2 - (i % 2) * 0.12, 0.0, 1.64 + i * 0.36, 8.3 - (i % 2) * 0.12, 1.4, ('#e8d8b8', 0.04), 'screen_panel')
    k.box(1.36 + i * 0.36, 8.31 - (i % 2) * 0.12, 0.7, 1.58 + i * 0.36, 8.32 - (i % 2) * 0.12, 0.9, '#c8607a', 'screen_paint')
k.solid(1.2, 8.0, 2.8, 8.4)
k.cyl(12.8, 8.2, 0.0, 0.3, 0.22, ('#5a3a3a', 0.06), 'pot', verts=12)
with k.foliage('leaf'):
    W.leafy_crown(k, 12.8, 8.2, 0.9, 0.42, 0.34, 0.35, '#5a7a4a')
k.solid(12.5, 7.9, 13.1, 8.5)

# the shelves of tea on the east wall
for lv, z in enumerate((0.5, 1.0, 1.5)):
    k.box(12.3, 2.1, z - 0.05, 13.9, 4.4, z, ('#4a2a2a', 0.15), 'shelf')
    for q in range(6):
        k.cyl(12.6 + (q % 3) * 0.5, 2.5 + (q // 3) * 1.2, z, z + 0.28, 0.12, (rng.choice(('#c8402e', '#2a5ad8', '#e0b040', '#3a7a4a', '#7a3a6a', '#e8e0d8')), 0.15),
              'tea_jar', verts=10)
k.solid(12, 2, 14, 4.5)
for (lx, lr) in ((5.4, 3.0), (12.0, 7.6)):
    k.tube((lx, lr, H), (lx, lr, 1.9), 0.006, '#2a2a2c', 'lantern_cord', verts=3)
    k.sphere(lx, lr, 1.75, 0.16, 0.2, '#3a1408', 'paper_lantern', emit=('#ff9a80', 0.9), segs=10)
    k.point_light(lx, lr + 0.2, 1.6, '#ffb090', 30, radius=0.2, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=int(os.environ.get('TH_SAMPLES', 128)),
         world_light=('#3a3040', 0.4))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Tea House', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [7, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-rose-springs', 'leaveSpawn': [28, 20], 'label': 'ROSEWELL', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'MASTER LIOR', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
    {'x': 4, 'y': 3, 'type': 'rose', 'act': 'tea', 'label': 'A POT OF TEA', 'prompt': 'PRESS E TO ORDER'},
    {'x': 7, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea',
     'dialog': 'BELOW, THE POOLS STEAMING IN THEIR WHITE TERRACES, BATHERS UP TO THEIR SHOULDERS, LANTERNS ON THE STAIR. ABOVE THEM THE SILK GROVES GLOW FAINTLY PINK WHERE THE COCOONS HANG.'},
    {'x': 12, 'y': 5, 'type': 'dialog', 'label': 'TEA JARS', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'TEA FROM EVERY SEA. A RED TIN FROM THE CRIMSON MARKED "DO NOT". A BLUE JAR FROM SAPPHIRE. A PLAIN ONE, UNLABELLED, THAT LIOR SAYS CAME FROM A SEA NOBODY HAS CHARTED. IT SMELLS OF RAIN.'},
] + [{'x': int(tx + 0.85 * dx), 'y': int(tr), 'type': 'dialog', 'label': 'CUSHION', 'prompt': 'PRESS E TO SIT', 'action': 'sit',
      'seat': [round(tx + 0.85 * dx, 2), round(tr + 0.1, 2)], 'facing': 'left' if dx > 0 else 'right',
      'dialog': 'YOU KNEEL AT THE LOW TABLE. THE STEAM FROM THE POOLS DRIFTS PAST THE WINDOW.'} for (tx, tr) in TABLES for dx in (-1, 1)]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(3, 3, 4, 4)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-rose-lior', 'x': 3, 'y': 3, 'facing': 'right', 'pose': 'sit'},
])
print('tea house done')
