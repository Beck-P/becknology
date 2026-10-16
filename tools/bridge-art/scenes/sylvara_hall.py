"""The Heartwood Hall — inside the Great Tree of Elderglade (world id "sylvara-hall").
Usage: BVENV/bin/python sylvara_hall.py RENDER_DIR

The throne room of the wood elves, hollowed out of a living tree: walls of ribbed heartwood, roots arching over a
great round window full of the evening wood, the floor polished across the tree's own rings. A runner of moss
leads to a dais of three steps and the throne — living branches woven together, gold leaves along them, green
velvet in the seat — under a canopy of boughs hung with leaf lanterns. Queen Alyssara of the wood elves sits there in
green and gold; Beckolas, her first sword, stands at her right hand. A bard's harp by the window, a basin of
Moonwell water on a root, the elves' banners (a gold leaf on green) either side.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_elves as E                               # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = sys.argv[1]
WID = 'sylvara-hall'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 15
H = 3.4 / math.cos(THETA)
FLOOR = (1, 2, 20, 12)
DOORS = [(10, 13), (11, 13)]
HEART = '#7a5434'          # heartwood
HEART_D = '#4a3020'
GOLD = E.GOLD
GREEN = '#2a5a2e'
CX = 11.0

k = Kit(COLS, ROWS, margin_top=2.2, margin_bottom=0.5, seed=4031)

# ---- the floor: polished heartwood across the tree's rings --------------------------------------------------------
k.box(0.4, 1.5, -0.12, 21.6, 13.0, -0.02, '#1a120c', 'subfloor')
k.box(1.0, 2.0, -0.04, 21.0, 13.0, 0.0, ('#8a6040', 0.12), 'floor')
for i, rad in enumerate([11.5 - j * 0.7 for j in range(16)]):        # rings, centred on the throne
    k.cyl(CX, 3.2, -0.035 + i * 0.0004, 0.0005 + i * 0.0004, rad, (shade('#8a6040', 0.9 if i % 2 else 1.06), 0.1), 'floor_ring', verts=64)
k.box(-1, 13.0, -0.2, 23, 15, 0.01, '#000000', 'floor_clip')            # (rings would run out under the front wall)

# ---- the walls: ribbed heartwood, roots arching over the round window --------------------------------------------------
k.box(0.4, 1.4, 0.0, 21.6, 2.0, H, (HEART, 0.2), 'wall')
for x in [1.0 + i * 0.55 for i in range(37)]:                         # the grain: ribs up the wall
    k.tube((x, 1.98, 0.0), (x + k.rng.uniform(-0.08, 0.08), 1.98, H), k.rng.uniform(0.05, 0.1),
           (shade(HEART, k.rng.uniform(0.8, 1.15)), 0.25), 'wall_rib', verts=5, smooth=False)
for (x0, x1) in ((0.4, 1.0), (21.0, 21.6)):
    k.box(x0, 1.5, 0.0, x1, 13.0, H, (HEART_D, 0.2), 'side_wall')
    k.box(x0 - 0.02, 13.0, 0.0, x1 + 0.02, 13.03, H, '#120c08', 'wall_cut')
for (a, b) in ((0.4, 10.0), (12.0, 21.6)):                            # the low front wall, the doorway in it
    k.box(a, 13.0, 0.0, b, 13.6, 0.35, (HEART_D, 0.2), 'front_wall')
k.box(10.0, 13.0, -0.01, 12.0, 13.6, 0.02, (HEART_D, 0.2), 'threshold')

WZ = 3.1                                                              # the round window above the throne
k.cyl_y(CX, 1.9, 2.08, WZ, 1.55, 1.55, (HEART_D, 0.25), 'window_frame', verts=40)
k.cyl_y(CX, 1.92, 2.1, WZ, 1.35, 1.35, '#2a4a3a', 'window_glass', emit=('#6a9a5a', 1.0), verts=40)
for (dx, dz, s, col) in ((-0.5, -0.4, 0.55, '#3a6a3a'), (0.6, -0.2, 0.6, '#2e5a32'), (0.0, 0.5, 0.5, '#4a7a3a'),
                         (-0.8, 0.4, 0.35, '#5a8a42'), (0.85, 0.55, 0.3, '#3a6a34')):
    k.blob(CX + dx, 2.11, WZ + dz, s, 0.01, s * 0.8, col, 'window_trees', emit=(shade(col, 1.3), 0.8), segs=10)
k.blob(CX - 0.9, 2.115, WZ - 0.75, 0.25, 0.01, 0.25, '#ffd890', 'window_sun', emit=('#ffc070', 1.6), segs=10)
for i in range(6):                                                    # mullions like branches
    a = i / 6 * math.pi
    k.tube((CX, 2.12, WZ), (CX + math.cos(a) * 1.35, 2.12, WZ + math.sin(a) * 1.35), 0.035, (HEART_D, 0.25), 'mullion', verts=5)
k.area_light(CX, 2.6, WZ, '#ffd8a0', 70, 2.2, rot=(math.radians(-70), 0, 0))
for sx in (-1, 1):                                                    # roots arching over it
    pts = [(CX + sx * 3.6, 2.0, 0.0), (CX + sx * 2.6, 2.05, 1.6), (CX + sx * 1.9, 2.1, 3.4), (CX + sx * 0.6, 2.12, 4.8)]
    for (a, b) in zip(pts, pts[1:]):
        k.tube(a, b, 0.22, (shade(HEART, 0.85), 0.25), 'arch_root', rb=0.18, verts=8)
    for (a, b) in zip(pts[1:], pts[2:]):
        k.blob((a[0] + b[0]) / 2, 2.25, (a[2] + b[2]) / 2, 0.09, 0.04, 0.14, (GOLD, 0.25), 'root_leaf', segs=6)

# ---- banners: a gold leaf on green -------------------------------------------------------------------------------------


def banner(x, z1=3.6, w=0.8, l=2.0):
    k.cyl_x(x - w / 2 - 0.1, x + w / 2 + 0.1, 2.08, z1 + 0.05, 0.035, 0.035, (GOLD, 0.25), 'banner_pole', verts=8)
    k.box(x - w / 2, 2.06, z1 - l, x + w / 2, 2.1, z1, (GREEN, 0.12), 'banner')
    k.poly([(x - w / 2, 2.102, z1 - l), (x + w / 2, 2.102, z1 - l), (x, 2.102, z1 - l - 0.32)], (GREEN, 0.12), 'banner_tail')
    zc = z1 - l * 0.45
    k.blob(x, 2.11, zc, 0.18, 0.01, 0.3, (GOLD, 0.25), 'banner_leaf', segs=8)
    k.tube((x, 2.115, zc - 0.3), (x, 2.115, zc + 0.3), 0.012, ('#a07820', 0.25), 'banner_vein', verts=4)


for x in (4.0, 7.0, 15.0, 18.0):
    banner(x)

# ---- the dais and the throne of living branches ------------------------------------------------------------------------
for i, (x0, x1, r1, z) in enumerate(((7.4, 14.6, 5.0, 0.15), (8.0, 14.0, 4.4, 0.3), (8.6, 13.4, 3.8, 0.45))):
    k.box(x0, 2.0, z - 0.15, x1, r1, z, (shade('#6a4a30', 1.0 + 0.06 * i), 0.15), 'dais', bevel=0.02)
    k.box(x0, r1 - 0.05, z - 0.02, x1, r1 + 0.01, z, (GOLD, 0.25), 'dais_edge')
k.box(9.8, 2.6, 0.45, 12.2, 3.8, 0.462, ('#4a7a3a', 0.4), 'dais_moss')
TZ, TR = 0.45, 2.9
k.box(CX - 0.55, TR - 0.4, TZ, CX + 0.55, TR - 0.02, TZ + 0.48, (HEART_D, 0.25), 'throne_base', bevel=0.04)
k.box(CX - 0.45, TR - 0.3, TZ + 0.48, CX + 0.45, TR - 0.04, TZ + 0.56, ('#2a6a46', 0.12), 'throne_seat', bevel=0.02)
for i in range(9):                                                    # the back: branches woven upward, fanning out
    dx = (i - 4) * 0.13
    top = (CX + dx * 2.2, TR - 0.42, TZ + 2.2 + 0.25 * math.cos((i - 4) / 4 * 1.3))
    k.tube((CX + dx, TR - 0.38, TZ + 0.5), top, 0.05, (shade(HEART, k.rng.uniform(0.85, 1.1)), 0.25), 'throne_branch', rb=0.025, verts=6)
    k.blob(top[0], TR - 0.42, top[2] + 0.05, 0.08, 0.04, 0.13, (GOLD, 0.25), 'throne_leaf', rot=(0, (i - 4) * 0.25, 0), segs=6)
for z in (1.2, 1.7, 2.1):                                             # crosswise, binding them
    k.tube((CX - 0.55 - z * 0.08, TR - 0.4, TZ + z), (CX + 0.55 + z * 0.08, TR - 0.4, TZ + z), 0.035, (HEART, 0.25), 'throne_weave', verts=6)
k.box(CX - 0.42, TR - 0.36, TZ + 0.6, CX + 0.42, TR - 0.34, TZ + 1.55, ('#2a6a46', 0.12), 'throne_velvet')
for dx in (-0.6, 0.6):
    k.tube((CX + dx, TR - 0.4, TZ + 0.85), (CX + dx, TR - 0.02, TZ + 0.85), 0.07, (HEART, 0.25), 'throne_arm', verts=8)
    k.blob(CX + dx, TR + 0.0, TZ + 0.9, 0.08, 0.06, 0.08, (GOLD, 0.25), 'throne_knot', segs=8)
k.sphere(CX, TR - 0.44, TZ + 2.65, 0.08, 0.08, '#80ffc0', 'throne_gem', emit=('#60e0a0', 1.4), segs=8)
k.point_light(CX, 4.6, 2.2, '#ffd8a0', 50, radius=0.4)                 # lamplight on the throne
k.solid(CX - 0.7, 2.0, CX + 0.7, TR + 0.4)
# a canopy of boughs over the throne, leaf lanterns hanging from it (all behind her, against the wall, so she's drawn in front)
for sx in (-1, 1):
    k.tube((CX + sx * 1.9, 2.12, TZ), (CX + sx * 1.6, 2.12, 3.0), 0.09, (HEART, 0.25), 'canopy_post', rb=0.07, verts=8)
    k.tube((CX + sx * 1.6, 2.12, 3.0), (CX, 2.14, 3.5), 0.08, (HEART, 0.25), 'canopy_bough', rb=0.06, verts=8)
    for t in (0.25, 0.6):
        x = CX + sx * 1.6 * (1 - t)
        k.cyl(x, 2.15, 2.55, 3.1 + 0.4 * t, 0.006, (GOLD, 0.25), 'chain', verts=4)
        E.leaf_lantern(k, x, 2.15, 2.45, s=0.12, energy=10)
for _ in range(16):
    a = k.rng.uniform(0.2, math.pi - 0.2)
    k.blob(CX + math.cos(a) * 1.7, 2.14, 3.0 + math.sin(a) * 0.5, 0.3, 0.2, 0.18, (shade(E.LEAF, k.rng.uniform(0.85, 1.2)), 0.35), 'canopy_leaves', segs=8)
for x in (8.9, 13.1):                                                 # tall lanterns on the dais
    k.tube((x, 2.5, 0.45), (x, 2.5, 1.7), 0.035, (GOLD, 0.25), 'stand', verts=8)
    E.leaf_lantern(k, x, 2.5, 1.85, s=0.14, energy=12)
k.solid(7.4, 2.0, 14.6, 5.0)                                          # the dais: you stand at its foot

# ---- the moss runner down the hall, flowers along it ---------------------------------------------------------------------
k.box(10.0, 5.0, 0.0, 12.0, 13.0, 0.015, ('#3e6a32', 0.4), 'runner')
k.box(10.15, 5.0, 0.015, 11.85, 13.0, 0.02, ('#4e7e3a', 0.4), 'runner')
for r in [5.4 + i * 0.6 for i in range(13)]:
    for x in (9.85, 12.15):
        k.sphere(x + k.rng.uniform(-0.05, 0.05), r, 0.05, 0.05, 0.04, k.rng.choice(('#f0e0a0', '#f0f0f0', '#c8a8f0')), 'runner_flower', segs=6)

# ---- by the walls: a harp by the window, the Moonwell basin, benches of root, lanterns ---------------------------------------
E.harp(k, 3.2, 3.0)
k.solid(2.8, 2.6, 3.7, 3.4)
k.rock(18.6, 3.2, 0.0, 0.45, 0.4, 0.55, (shade(HEART, 0.85), 0.3), part='basin_root', segs=10)
k.cyl(18.6, 3.2, 0.55, 0.7, 0.42, ('#b8b0a0', 0.2), 'basin', verts=20)
k.cyl(18.6, 3.2, 0.7, 0.71, 0.36, '#20504c', 'basin_water', emit=(E.MOON, 1.2), verts=20)
k.point_light(18.6, 3.4, 1.0, E.MOON, 10, radius=0.2)
k.solid(18.1, 2.7, 19.1, 3.7)
for r in (7.0, 10.0):
    for (x0, x1) in ((2.0, 5.2), (16.8, 20.0)):
        k.cyl_x(x0, x1, r, 0.3, 0.26, 0.26, (shade(HEART, 0.95), 0.25), 'root_bench', verts=10)
        k.box(x0 + 0.1, r - 0.18, 0.5, x1 - 0.1, r + 0.18, 0.56, ('#4a7a3a', 0.4), 'bench_moss')
        k.solid(x0, r - 0.3, x1, r + 0.3)
for (x, r) in ((1.6, 5.0), (20.4, 5.0), (1.6, 12.0), (20.4, 12.0)):
    k.tube((x, r, 0.0), (x, r, 1.6), 0.04, (GOLD, 0.25), 'stand', verts=8)
    E.leaf_lantern(k, x, r, 1.75, s=0.12, energy=10)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for (x, r) in ((2.4, 12.2), (19.6, 12.2), (8.6, 12.4), (13.4, 12.4)):
    E.fern(k, x, r, s=0.5)
    E.mushrooms(k, x + 0.35, r - 0.2, n=3)

# ---- light: warm lanterns, the evening through the window ---------------------------------------------------------------------
for (x, r, e) in ((CX, 6.5, 120), (CX, 10.0, 100), (4.0, 8.5, 70), (18.0, 8.5, 70)):
    k.point_light(x, r, 2.8, '#ffd090', e, radius=0.3)
k.render(OUT, light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 128)), world_light=('#3a4a3a', 0.45))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Heartwood Hall', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [10, 12]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'sylvara', 'leaveSpawn': [22, 8], 'label': 'THE DOOR', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 11, 'y': 5, 'type': 'dialog', 'label': 'QUEEN ALYSSARA', 'prompt': 'PRESS E TO KNEEL',
     'dialog': 'QUEEN ALYSSARA OF THE WOOD ELVES INCLINES HER HEAD.'},
    {'x': 9, 'y': 4, 'type': 'dialog', 'label': 'BECKOLAS', 'prompt': 'PRESS E TO TALK', 'dialog': 'BECKOLAS WATCHES YOU, HAND NEAR HIS SWORD.'},
    {'x': 13, 'y': 5, 'type': 'dialog', 'label': 'THRONE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE THRONE OF THE WOOD ELVES IS NOT CARVED. IT WAS ASKED FOR, AND THE TREE GREW IT.'},
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'HARP', 'prompt': 'PRESS E TO PLAY',
     'dialog': 'YOU PLUCK ONE STRING. THE WHOLE HALL HUMS WITH IT FOR A LONG TIME AFTER, LIKE THE TREE IS LISTENING.'},
    {'x': 18, 'y': 4, 'type': 'dialog', 'label': 'MOONWELL BASIN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'WATER FROM THE MOONWELL, BROUGHT IN A SILVER JUG EACH MORNING. THE QUEEN WASHES HER HANDS IN IT BEFORE SHE HEARS ANYONE.'},
    {'x': 7, 'y': 2, 'type': 'dialog', 'label': 'BANNER', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE BANNER OF THE WOOD: ONE GOLD LEAF ON GREEN. "WE ROOT. WE REACH. WE REMAIN."'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-alyssa', 'x': 10.5, 'y': 2.38, 'facing': 'down', 'pose': 'sit', 'lift': TZ, 'light': [11, 5]},
    {'sheet': 'npc-beckolas', 'x': 9, 'y': 3, 'facing': 'down', 'lift': 0.38, 'light': [9, 5]},
])
print('hall done')
