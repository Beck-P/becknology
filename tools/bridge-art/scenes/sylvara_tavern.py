"""The Hollow Bough — the tavern inside a great branch, in the Boughs (world id "sylvara-tavern").
Usage: BVENV/bin/python sylvara_tavern.py RENDER_DIR

A bough so big a hundred elves can dance in it, hollowed out long ago: the room is the inside of the branch, its walls
ribbed heartwood curving up into the dark, three round windows at the back full of the green of the canopy outside. A
bar of one polished root along the east side, kegs and bottles behind it, Fennick at the taps; round tables and stools
across the floor; a copper firebowl in the middle under a hood whose flue runs up through the bough; a little stage of
planks in the west with a harp and a lute on a stand for whoever's playing; leaf lanterns hung from the ribs. Lit by
the fire and the lanterns (`full` / `dim`: the fire flickers), finished as toys.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_elves as E                               # noqa: E402
import assets_lumar as LU                              # noqa: E402
import assets_sylvan as A
import assets_sylvara_rich as R                    # noqa: E402                              # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = sys.argv[1]
WID = 'sylvara-tavern'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 24, 16
H = 3.6 / math.cos(THETA)
FLOOR = (1, 3, 22, 13)
DOORS = [(11, 14), (12, 14)]
HEART, HEART_D, HEART_L = '#7a5434', '#4a3020', '#9a6e48'
k = Kit(COLS, ROWS, margin_top=2.4, margin_bottom=0.5, seed=4141)
rng = k.rng

# ---- the floor: planks of heartwood running along the branch ------------------------------------------------------------
k.box(0.4, 2.0, -0.12, 23.6, 14.2, -0.02, '#1a120c', 'subfloor')
r = 2.6
while r < 14.0:
    x = 0.8 + rng.uniform(0, 1.0)
    while x < 23.2:
        Ln = rng.uniform(1.6, 3.4)
        k.box(x + 0.02, r + 0.015, -0.04, min(23.2, x + Ln) - 0.02, r + 0.305, 0.0, (shade('#8a6040', rng.uniform(0.86, 1.08)), 0.12), 'floor_plank')
        x += Ln
    r += 0.32

# ---- the walls: the inside of the bough, ribbed, curving up into the dark ----------------------------------------------------
for i in range(9):                                               # the back wall leaning in as it rises (the branch's curve)
    z0, z1 = i * H / 9, (i + 1) * H / 9
    ra, rb = 2.6 - 0.35 * math.sin(z0 / H * math.pi * 0.5), 2.6 - 0.35 * math.sin(z1 / H * math.pi * 0.5)
    k.poly([(0.4, ra, z0), (23.6, ra, z0), (23.6, rb, z1), (0.4, rb, z1)], (shade(HEART, 0.95 + 0.04 * (i % 2)), 0.22), 'wall')
for x in [0.8 + i * 0.6 for i in range(38)]:                     # the grain: ribs up the wall
    k.tube((x, 2.58, 0.0), (x + rng.uniform(-0.08, 0.08), 2.3, H), rng.uniform(0.05, 0.1), (shade(HEART, rng.uniform(0.8, 1.15)), 0.25), 'wall_rib',
           verts=5, smooth=False)
for (x0, x1) in ((0.4, 1.0), (23.0, 23.6)):
    k.box(x0, 2.0, 0.0, x1, 14.0, H, (HEART_D, 0.2), 'side_wall')
    k.box(x0 - 0.02, 14.0, 0.0, x1 + 0.02, 14.03, H, '#120c08', 'wall_cut')
for (a, b) in ((0.4, 11.0), (13.0, 23.6)):
    k.box(a, 14.0, 0.0, b, 14.6, 0.35, (HEART_D, 0.2), 'front_wall')
k.box(11.0, 14.0, -0.01, 13.0, 14.6, 0.02, (HEART_D, 0.2), 'threshold')
for x in (4.0, 12.0, 20.0):                                      # great ribs arching over (the branch's growth rings, cut)
    for i in range(10):
        a0, a1 = i / 10 * math.pi * 0.5, (i + 1) / 10 * math.pi * 0.5
        k.tube((x, 2.5 + 3.4 * (1 - math.cos(a0)) * 0.0, H * math.sin(a0) * 0.98), (x, 2.5, H * math.sin(a1) * 0.98), 0.14, (HEART_L, 0.25), 'rib_arch', verts=6)
# three round windows at the back, the canopy green and gold beyond
for (x, z) in ((6.0, 2.6), (12.0, 3.0), (18.0, 2.6)):
    k.cyl_y(x, 2.4, 2.62, z, 0.75, 0.75, (HEART_D, 0.25), 'window_frame', verts=28)
    k.cyl_y(x, 2.42, 2.64, z, 0.6, 0.6, '#2a4a2a', 'window_glass', emit=('#6a9a4a', 1.0), verts=28)
    for (dx, dz, s, col) in ((-0.2, -0.15, 0.3, '#3a6a3a'), (0.25, 0.1, 0.32, '#2e5a32'), (0.0, 0.3, 0.26, '#5a8a42')):
        k.blob(x + dx, 2.65, z + dz, s, 0.01, s * 0.8, col, 'window_trees', emit=(shade(col, 1.3), 0.8), segs=10)
    k.box(x - 0.02, 2.62, z - 0.6, x + 0.02, 2.66, z + 0.6, (HEART_D, 0.25), 'window_bar')
    k.box(x - 0.6, 2.62, z - 0.02, x + 0.6, 2.66, z + 0.02, (HEART_D, 0.25), 'window_bar')

# ---- the bar: one polished root along the east side, kegs and shelves behind -------------------------------------------------
LU.bar_counter(k, 17.0, 22.6, 5.6, 6.4)
k.box(16.6, 5.6, 0.0, 17.4, 9.0, 1.0, (HEART_L, 0.18), 'bar_end')            # the counter turns down the room
for i, (a, b) in enumerate(((16.5, 16.84), (16.84, 17.17), (17.17, 17.5))):    # the top in three worn boards
    k.box(a, 5.5, 1.0, b - 0.012, 9.1, 1.08, (shade(HEART_L, (1.18, 1.06, 1.12)[i]), 0.12), 'bar_top')
for i in range(12):                                              # the root's end dressed: staves down its face and end, a kick
    rr = 5.75 + i * 0.28                                         # board and a brass foot rail, the top's lip darker
    k.box(16.57, rr, 0.08, 16.6, rr + 0.22, 0.92, (shade(HEART_D, 0.9 + 0.12 * (i % 2)), 0.2), 'bar_panel')
for i in range(3):
    xx = 16.66 + i * 0.24
    k.box(xx, 9.0, 0.08, xx + 0.2, 9.03, 0.92, (shade(HEART_D, 0.95 + 0.1 * (i % 2)), 0.2), 'bar_panel')
k.box(16.55, 5.6, 0.0, 16.62, 9.05, 0.1, ('#2a1a10', 0.2), 'bar_kick')
k.cyl_y(16.42, 5.7, 8.95, 0.22, 0.025, 0.025, ('#c89848', 0.15), 'bar_rail', verts=6)
k.box(16.46, 5.46, 0.98, 17.54, 9.14, 1.02, (shade(HEART_D, 0.8), 0.2), 'bar_lip')
for (x, rr) in ((16.9, 6.5), (17.05, 7.6), (16.85, 8.6), (18.7, 5.8), (21.6, 5.85)):           # mugs and a bottle left out
    LU.mug(k, x, rr, 1.08)
k.cyl(17.1, 8.1, 1.08, 1.38, 0.05, ('#2a5a32', 0.1), 'bottle', verts=8)
k.cyl(17.1, 8.1, 1.38, 1.46, 0.02, ('#2a5a32', 0.1), 'bottle', verts=6)
k.blob(17.0, 6.9, 1.12, 0.14, 0.1, 0.05, ('#e8c070', 0.3), 'honeycake', segs=8)
for x in (18.0, 19.4, 20.8):
    LU.beer_tap(k, x, 5.9, 1.06)
LU.keg_rack(k, 17.8, 22.4, 3.3, levels=2)
LU.wall_shelf(k, 17.6, 22.6, 2.62, 2.0)
for (x, rr) in ((17.2, 7.0), (17.2, 8.4)):
    LU.stool(k, x - 0.7, rr)
for x in (18.2, 19.6, 21.0):
    LU.stool(k, x, 7.0)
k.solid(16.6, 5.4, 22.6, 6.6)
k.solid(16.6, 5.4, 17.4, 9.1)
k.solid(17.6, 3.0, 22.6, 4.2)
FENNICK = (20, 4)

# ---- the firebowl in the middle under its copper hood ---------------------------------------------------------------------
fx, fr = 11.6, 8.2
k.cyl(fx, fr, 0.0, 0.42, 0.9, (shade(E.STONE, 0.95), 0.25), 'firebowl', verts=24)
k.cyl(fx, fr, 0.38, 0.44, 0.78, ('#3a2a20', 0.3), 'firebowl_ash', verts=24)
for i in range(7):
    a = i / 7 * math.tau
    k.tube((fx + math.cos(a) * 0.4, fr + math.sin(a) * 0.32, 0.45), (fx - math.cos(a) * 0.1, fr - math.sin(a) * 0.08, 0.6), 0.06, ('#3a2416', 0.3), 'firelog', verts=6)
for (s, z, col) in ((0.42, 0.62, '#ff9030'), (0.3, 0.85, '#ffc040'), (0.16, 1.05, '#fff0a0')):
    k.cone(fx, fr, 0.45, z, s, 0.0, col, 'fire', emit=(col, 2.2), verts=10)
k.point_light(fx, fr + 0.2, 1.0, '#ff9a40', 90, radius=0.4, group='fire')
k.cone(fx, fr, 2.6, 3.2, 1.0, 0.25, ('#b0703a', 0.2), 'hood', verts=20)
k.cyl(fx, fr, 3.2, H, 0.24, ('#9a6030', 0.2), 'flue', verts=12)
for i in range(3):
    k.cyl(fx, fr, 2.6 + i * 0.2, 2.64 + i * 0.2, 1.0 - i * 0.24, ('#d89048', 0.15), 'hood_band', verts=20)
k.solid(fx - 0.9, fr - 0.8, fx + 0.9, fr + 0.8)
for (x0, x1, rr) in ((9.2, 11.0, 10.2), (12.4, 14.2, 10.2)):
    LU.bench(k, x0, x1, rr)

# ---- tables and stools across the floor ---------------------------------------------------------------------------------
TABLES = [(5.6, 9.6), (8.0, 5.6), (15.2, 11.4), (4.4, 12.2), (19.8, 11.8), (14.4, 5.4), (9.4, 12.8)]
for (x, rr) in TABLES:
    LU.round_table(k, x, rr)
    for (dx, dr) in ((-0.7, 0.0), (0.7, 0.0), (0.0, 0.62)):
        LU.stool(k, x + dx, rr + dr)
    LU.mug(k, x + 0.12, rr - 0.05, 0.78)
    LU.candle(k, x - 0.1, rr + 0.05, 0.78, energy=2.5)
    k.solid(x - 0.45, rr - 0.4, x + 0.45, rr + 0.4)

# ---- the stage in the west: planks raised a step, the harp, a lute on a stand, a banner -------------------------------------------
k.box(1.2, 3.2, 0.0, 4.6, 6.4, 0.22, ('#8a6040', 0.15), 'stage')
for x in [1.2 + i * 0.34 for i in range(10)]:
    k.box(x + 0.01, 3.2, 0.215, x + 0.33, 6.4, 0.225, (shade('#8a6040', rng.uniform(0.9, 1.08)), 0.12), 'stage_plank')
E.harp(k, 2.0, 4.0, z=0.22)
k.tube((3.6, 4.2, 0.22), (3.6, 4.2, 0.9), 0.025, (A.ELFWOOD_D, 0.25), 'lute_stand', verts=5)
k.blob(3.6, 4.32, 0.75, 0.16, 0.06, 0.22, ('#a0703a', 0.25), 'lute', segs=10)
k.tube((3.6, 4.32, 0.95), (3.62, 4.3, 1.35), 0.025, ('#5a3a20', 0.25), 'lute', verts=5)
k.poly([(2.6, 2.56, 3.0), (4.0, 2.56, 3.0), (4.0, 2.55, 1.6), (3.3, 2.54, 1.3), (2.6, 2.55, 1.6)], ('#2a5a2e', 0.3), 'banner')
k.blob(3.3, 2.53, 2.3, 0.16, 0.01, 0.24, (E.GOLD, 0.25), 'banner_leaf', segs=8)
k.solid(1.2, 3.2, 4.6, 4.6)
k.cyl(2.9, 3.7, 0.22, 0.62, 0.22, ('#8a5a34', 0.2), 'drum', verts=14)           # a hand drum, a cushion for the harper,
k.cyl(2.9, 3.7, 0.62, 0.65, 0.23, ('#e8dcc0', 0.3), 'drum_skin', verts=14)      # a music stand with its sheet
for i in range(6):
    a = i / 6 * math.tau
    k.box(2.9 + math.cos(a) * 0.22 - 0.015, 3.7 + math.sin(a) * 0.18 - 0.015, 0.25, 2.9 + math.cos(a) * 0.22 + 0.015, 3.7 + math.sin(a) * 0.18 + 0.015, 0.6, ('#d0a040', 0.2), 'drum_cord')
k.blob(1.7, 4.45, 0.3, 0.26, 0.22, 0.08, ('#2a5a2e', 0.4), 'cushion', segs=10)
k.tube((4.2, 3.5, 0.22), (4.2, 3.5, 1.05), 0.02, (A.ELFWOOD_D, 0.25), 'music_stand', verts=5)
k.poly([(3.98, 3.56, 0.98), (4.42, 3.56, 0.98), (4.42, 3.6, 1.28), (3.98, 3.6, 1.28)], ('#efe2c4', 0.4), 'music_sheet')
k.box(1.2, 6.38, 0.0, 4.6, 6.44, 0.22, ('#5a3a24', 0.2), 'stage_edge')

# ---- lanterns hung from the ribs, barrels, a coat peg, a rug by the fire -----------------------------------------------------
for (x, rr) in ((4.0, 6.0), (12.0, 4.6), (20.0, 9.6), (8.0, 11.0), (16.0, 8.0), (17.6, 12.2), (2.8, 10.4)):
    k.cyl(x, rr, 2.62, H - 0.2, 0.012, (E.GOLD, 0.25), 'chain', verts=4)
    E.leaf_lantern(k, x, rr, 2.6, s=0.22, energy=14.0)
for (x, rr) in ((1.6, 12.6), (2.4, 12.8), (22.0, 12.6)):
    LU.barrel(k, x, rr, h=0.8, radius=0.3)
    k.solid(x - 0.3, rr - 0.3, x + 0.3, rr + 0.3)
LU.rug(k, 9.6, 9.4, 13.6, 11.4, col='#2a5a2e', trim='#d0a040')
LU.coat_rack(k, 14.2, 13.2)
k.solid(14.0, 13.0, 14.4, 13.4)

# ---- the room's own life: ferns and mushrooms in the corners, bundles of herbs drying along the back wall, leaf garlands
# swagged between the great ribs, a second rug, a cask on its side by the stage, the chalk board -----------------------------
for (x, rr) in ((1.6, 7.4), (22.4, 9.6), (5.8, 13.2), (17.4, 13.2), (9.6, 3.0), (14.4, 3.0)):
    E.fern(k, x, rr, s=0.5)
    E.mushrooms(k, x + 0.3, rr - 0.15, n=3)
for i in range(14):                                               # herbs drying, hung in bunches from a rail on the back wall
    x = 5.0 + i * 0.85
    if 11.0 < x < 13.0 or x > 16.8:
        continue
    k.tube((x, 2.5, 2.05), (x, 2.52, 1.7), 0.006, ('#c8b080', 0.25), 'string', verts=4)
    k.blob(x, 2.55, 1.55, 0.09, 0.05, 0.16, (rng.choice(('#6a8a3a', '#8a7a3a', '#7a5a8a', '#5a7a3a')), 0.35), 'herbs', segs=7)
k.tube((4.8, 2.5, 2.08), (16.6, 2.5, 2.08), 0.025, (A.ELFWOOD_D, 0.25), 'herb_rail', verts=6)
with k.foliage('leaf'):
    for (xa, xb) in ((4.0, 12.0), (12.0, 20.0)):                  # garlands swagged between the ribs, over the room
        for i in range(17):
            t = i / 16
            x = xa + (xb - xa) * t
            z = H * 0.82 - 0.7 * math.sin(math.pi * t)
            k.blob(x, 2.7, z, 0.13, 0.1, 0.1, (shade('#4a8038', rng.uniform(0.85, 1.15)), 0.3), 'garland', segs=6)
            if i % 4 == 2:
                k.blob(x, 2.78, z - 0.08, 0.05, 0.05, 0.05, (rng.choice(('#f0e0a0', '#f0b0c8', '#c8a8f0')), 0.35), 'garland_flower', segs=6)
LU.rug(k, 3.4, 8.6, 7.6, 10.8, col='#6a3a2a', trim='#d0a040')
LU.rug(k, 18.2, 10.6, 21.6, 13.0, col='#3a4a6a', trim='#d0a040')
for (x, rr) in ((22.2, 7.9), (22.3, 10.7)):                       # casks and sacks against the east wall
    LU.barrel(k, x, rr, h=0.7, radius=0.28)
    k.solid(x - 0.3, rr - 0.3, x + 0.3, rr + 0.3)
for (x, rr, c) in ((22.2, 8.7, '#c8b080'), (22.35, 9.2, '#b8a070')):
    k.blob(x, rr, 0.28, 0.26, 0.22, 0.28, (c, 0.4), 'sack', segs=9)
k.solid(21.9, 8.4, 22.6, 9.5)
rng2 = __import__('random').Random(77)                             # knots and wear in the planks (on their own dice)
for _ in range(60):
    x, rr = rng2.uniform(1.4, 22.6), rng2.uniform(3.0, 13.8)
    k.blob(x, rr, -0.005, rng2.uniform(0.05, 0.1), rng2.uniform(0.03, 0.05), 0.01, ('#5a3a24', 0.2), 'floor_knot', segs=6)
k.box(4.8, 3.0, 0.22, 5.4, 3.12, 1.4, ('#22281e', 0.3), 'chalkboard')
k.box(4.76, 2.98, 1.4, 5.44, 3.14, 1.46, (A.ELFWOOD_D, 0.3), 'chalkboard_frame')
LU.barrel(k, 5.4, 4.8, h=0.6, radius=0.26)
k.solid(5.1, 4.5, 5.7, 5.1)
# fill light under the ribs (the lanterns and the fire alone left the room in the dark)
for (x, rr, e) in ((6.0, 8.0, 90), (17.0, 9.0, 80), (11.6, 12.0, 80), (4.6, 12.0, 60), (19.6, 4.8, 50)):
    k.point_light(x, rr, 2.9, '#ffd090', e, radius=0.3)

R.merge_parts(k)                                                 # one mesh per look: each render pass quick (assets_sylvara_rich)
k.render(OUT, light_states={'full': {}, 'dim': {'fire': 0.7}}, light_samples=int(os.environ.get('SAMPLES', 128)), world_light=('#4a3c28', 0.6))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hollow Bough', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [12, 13]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True, 'crowd': 'sylvara'})
w['interactions'] = [
    {'x': 11, 'y': 14, 'type': 'enter_world', 'label': 'THE DOOR', 'prompt': 'PRESS E TO GO OUT', 'target': 'sylvara-boughs', 'spawn': [31, 11]},
    {'x': 12, 'y': 14, 'type': 'enter_world', 'label': 'THE DOOR', 'prompt': 'PRESS E TO GO OUT', 'target': 'sylvara-boughs', 'spawn': [31, 11]},
    {'x': 19, 'y': 7, 'type': 'dialog', 'label': 'TAVERN KEEPER', 'prompt': 'PRESS E TO TALK', 'dialog': 'FENNICK POLISHES A MUG.'},
    {'x': 3, 'y': 7, 'type': 'dialog', 'label': 'THE STAGE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A STAGE OF PLANKS, A HARP, A LUTE ON ITS STAND. CHALKED ON THE BOARD BESIDE IT: TONIGHT - THAELIN, IF HE TURNS UP. TOMORROW - THAELIN, IF HE TURNS UP. EVERY NIGHT AFTER - SEE ABOVE.'},
    {'x': int(fx), 'y': int(fr) + 2, 'type': 'dialog', 'label': 'THE FIREBOWL', 'prompt': 'PRESS E TO WARM UP',
     'dialog': 'YOU HOLD YOUR HANDS TO THE FIRE. THE SMOKE GOES UP THE COPPER FLUE AND OUT THROUGH THE TOP OF THE BOUGH, WHERE THE OWLS HAVE COMPLAINED ABOUT IT FOR THREE HUNDRED YEARS.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(FENNICK[0], FENNICK[1], FENNICK[0] + 1, FENNICK[1] + 1)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID,
            actors=[{'sheet': 'npc-elf-tavernkeeper', 'x': FENNICK[0], 'y': FENNICK[1], 'facing': 'down', 'light': [FENNICK[0], FENNICK[1] + 2]}],
            scene_extra={'flicker': {'from': 'dim', 'to': 'full'}})
print('tavern done')
