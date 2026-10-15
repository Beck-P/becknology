"""Lumar Harbour — Blender scene (world id "lumar").

  BVENV/bin/python tools/bridge-art/scenes/lumar_harbor.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar

Black saltstone cliffs with a trail winding down from the Market Square
steps to the shore, the lighthouse, lantern posts, boats pulled up on the
sand, and the pier with your sloop tied up at its end. The emerald sea is the world's own
animated backdrop.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_coast as C               # noqa: E402
import assets_ship as P                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar.json')
w = json.load(open(WORLD))
names = {int(k_): v for k_, v in w.get('designTileNames', w['tileNames']).items()}
T = w.get('designTiles', w['tiles'])
COLS, ROWS = w['width'], w['height']

# Diggen's Point is a headland: the cliffs run on past the map's sides and top
# and curve away into the sea, so the render is wider than the map (the world
# JSON's "view" keeps the camera inside it, off the render's cut edges)
MX, MT = 3.0, 3.0
k = Kit(COLS, ROWS, margin_top=MT, margin_bottom=1.5, margin_x=MX, seed=211)

cliff, trail, shore, sea = set(), set(), set(), set()
for r in range(ROWS):
    for c in range(COLS):
        n = names.get(T[r][c], 'void')
        if n == 'black_cliff':
            cliff.add((c, r))
        elif n in ('cliff_trail', 'lantern_post', 'lighthouse_png'):
            trail.add((c, r))
        elif n == 'shore':
            shore.add((c, r))
        elif n == 'emerald_sea':
            sea.add((c, r))
map_land = cliff | trail | shore
# the land beyond the map: north all the way, west and east tapering away
for r in range(-3, 0):
    for c in range(-3, COLS + 3):
        (trail if 6 <= c <= 7 else cliff).add((c, r))
for c, last in ((-1, 13), (-2, 11), (-3, 8), (COLS, 14), (COLS + 1, 12), (COLS + 2, 9)):
    for r in range(0, last + 1):
        cliff.add((c, r))


# ---- cliffs ----------------------------------------------------------------------------------
# body and grass top are built as one box per run of cliff cells along a row:
# per-cell boxes overlapping at the seams catch each other's shadows and show
# the tile grid.
H = 1.05
for r in range(-3, ROWS):
    cs = sorted(c for (c, rr) in cliff if rr == r)
    runs = []
    for c in cs:
        if runs and runs[-1][1] == c:
            runs[-1][1] = c + 1
        else:
            runs.append([c, c + 1])
    for (c0, c1) in runs:
        k.box(c0, r, -0.6, c1, r + 1, H - 0.06, (W.SALT[1], 0.22), 'cliff')
        k.box(c0, r, H - 0.08, c1, r + 1, H, ('#33472f', 0.35), 'cliff_top')
for (c, r) in cliff:
    h = H
    if k.rng.random() < 0.6:
        for j in range(2):
            k.cone(c + k.rng.uniform(0.2, 0.8), r + k.rng.uniform(0.2, 0.8), h, h + k.rng.uniform(0.1, 0.2), 0.03, 0.002,
                   '#4a6a40', 'tuft', verts=3)
    if k.rng.random() < 0.3:
        s_ = k.rng.uniform(0.18, 0.3)
        k.rock(c + k.rng.uniform(0.2, 0.8), r + k.rng.uniform(0.2, 0.8), h - 0.05, s_, s_ * 0.8, s_ * 0.6,
               (W.SALT[k.rng.choice((2, 3))], 0.22), part='cliff_boulder')
    if k.rng.random() < 0.2:
        for j in range(3):
            k.sphere(c + k.rng.uniform(0.2, 0.8), r + k.rng.uniform(0.2, 0.8), h + 0.03, 0.035, 0.03,
                     k.rng.choice(('#e0d8f0', '#e8c860', '#c070c0')), 'wildflower', segs=5)
    for (dc, dr) in ((0, 1), (-1, 0), (1, 0)):              # rugged faces where the cliff drops to the sea
        nb = (c + dc, r + dr)
        if nb not in cliff and nb not in trail and nb not in shore:
            for j in range(3):
                s = k.rng.uniform(0.3, 0.55)
                x = c + 0.5 + dc * 0.55 + (k.rng.uniform(-0.4, 0.4) if dc == 0 else k.rng.uniform(-0.1, 0.15) * dc)
                rr = r + 0.5 + dr * 0.55 + (k.rng.uniform(-0.4, 0.4) if dr == 0 else k.rng.uniform(-0.1, 0.15) * dr)
                k.rock(x, rr, k.rng.uniform(-0.25, H * 0.7), s, s * 0.85, s * 1.1, (W.SALT[k.rng.choice((1, 2, 2))], 0.22),
                       part='cliff_rock')
    for (dc, dr) in ((0, 1), (-1, 0), (1, 0), (0, -1)):
        if (c + dc, r + dr) in trail or (c + dc, r + dr) in shore:
            for j in range(2):
                s = k.rng.uniform(0.22, 0.38)
                x = c + 0.5 + dc * 0.5 + (k.rng.uniform(-0.3, 0.3) if dc == 0 else 0)
                rr = r + 0.5 + dr * 0.5 + (k.rng.uniform(-0.3, 0.3) if dr == 0 else 0)
                k.rock(x, rr, h * k.rng.uniform(0.3, 0.7), s, s * 0.8, h * 0.45, (W.SALT[k.rng.choice((1, 2))], 0.22),
                       part='cliff_rock')
    if 0 <= c < COLS and 0 <= r < ROWS:
        k.solid(c, r, c + 1, r + 1)


def clear_above(c, r, n=3):
    """No walkable ground in the screen rows a tall thing at (c, r) covers."""
    return all((c + dc, r - dr) not in trail and (c + dc, r - dr) not in shore for dc in (-1, 0, 1) for dr in range(0, n + 1))


spots = [(c, r) for (c, r) in sorted(cliff) if clear_above(c, r) and (c, r + 1) not in trail]
k.rng.shuffle(spots)
for (c, r) in spots[:24]:
    W.pine(k, c + k.rng.uniform(0.3, 0.7), r + k.rng.uniform(0.3, 0.7), h=k.rng.uniform(2.0, 2.8))
for (c, r) in spots[24:56]:
    W.bush(k, c + k.rng.uniform(0.3, 0.7), r + k.rng.uniform(0.3, 0.7), s=k.rng.uniform(0.22, 0.32),
           berries=k.rng.choice((None, None, '#c04050')))

# ---- the trail -------------------------------------------------------------------------------------
for (c, r) in trail:
    if r < 0:
        continue
    k.box(c, r, -0.3, c + 1, r + 1, -0.02, ('#4a4034', 0.3), 'trail')
    for j in range(3):
        s = k.rng.uniform(0.08, 0.18)
        k.cyl(c + k.rng.uniform(0.15, 0.85), r + k.rng.uniform(0.15, 0.85), -0.03, 0.005, s, (W.SALT[2], 0.15), 'trail_stone',
              ry=s * 0.8, verts=6)
# steps up to the Market Square at the top of the trail, the lane on north
k.box(6.0, -MT, -0.6, 8.0, 0.0, 1.2, (shade(A.STONE, 0.95), 0.14), 'steps')
for i in range(4):
    z = 0.3 * (i + 1)
    k.box(6.0, 2.0 - (i + 1) * 0.5, -0.1, 8.0, 2.0 - i * 0.5, z, (shade(A.STONE, 0.95 + 0.03 * i), 0.14), 'steps')

# ---- the shore --------------------------------------------------------------------------------------------
for (c, r) in shore:
    k.box(c, r, -0.4, c + 1, r + 1, -0.02, ('#8a7a5a', 0.25), 'sand')
W.rock_shore(k, [(3.8, 13.4), (3.7, 14.3), (15.2, 13.5), (14.9, 14.6), (9.4, 14.9), (6.4, 14.8)])
W.rowboat(k, 4.4, 6.4, 14.5, hull='#3a4a5a', oars=False)          # pulled up west of the pier
# the skiff's landing place: the east beach, a ring of sea-glass stones and two lanterns on posts
SKX, SKR = 12.4, 13.3
for i in range(18):
    a = i * math.pi / 9
    x, r = SKX + math.cos(a) * 2.0, SKR + 0.2 + math.sin(a) * 1.1
    if 9.4 < x < 15.0 and r < 14.6:
        k.blob(x, r, 0.02, 0.09, 0.07, 0.05, '#9ad8c8', 'sea_glass', emit=('#60e0b0', 0.35), segs=6)
for x in (10.2, 14.6):
    W.lantern_post(k, x, 12.3, h=1.6, energy=22)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, SKX - 1.7, SKR)
A.crate(k, 4.3, 13.1, s=0.5)
A.barrel(k, 5.2, 13.5, h=0.75, radius=0.28)
for i in range(4):     # net drying over the rocks
    k.bar(9.6 + i * 0.12, 13.2, 10.1 + i * 0.12, 13.9, 0.05, 0.07, 0.015, '#8a7a5a', 'net')
k.solid(4, 14, 7, 15)                    # the rowboat
k.solid(SKX - 1.8, SKR - 0.9, SKX + 2.0, SKR + 0.9)       # the skiff
k.solid(4, 13, 6, 14)

# ---- the pier ---------------------------------------------------------------------------------------------
W.dock(k, 7.0, 9.0, 13.6, 16.95, z=0.05)
for (x, r) in ((7.1, 16.5), (8.9, 16.5)):
    W.silver_post(k, x, r)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)

# ---- the coast: the beach shelving into the sea, the cliffs' feet in the water ------------------------------
def beach_bias(x, r):
    d = min(math.hypot(max(c - x, 0, x - c - 1), max(rr - r, 0, r - rr - 1)) for (c, rr) in shore)
    return 1.2 if d < 1.2 else -0.5


C.coast(k, cliff | trail | shore, palette='emerald', rock=W.SALT[2], seed=5, reach=(0.15, 0.7), beach_bias=beach_bias,
        keep_clear=[(6.6, 13.4, 9.4, 17.0), (3.4, 16.6, 13.8, 19.4)])

# ---- lighthouse ---------------------------------------------------------------------------------------------
lx, lr = 13.5, 5.5
for i in range(7):
    z0, z1 = i * 0.5, (i + 1) * 0.5
    rad = 0.55 - i * 0.025
    k.cyl(lx, lr, z0, z1, rad, ('#e8e0d0' if i % 2 == 0 else '#a83028', 0.08), 'lighthouse', verts=16)
k.cyl(lx, lr, 3.5, 3.6, 0.6, '#2a2a30', 'lighthouse_gallery', verts=16)
for i in range(12):
    a = i * math.pi / 6
    k.cyl(lx + math.cos(a) * 0.55, lr + math.sin(a) * 0.55, 3.6, 3.85, 0.012, '#2a2a30', 'gallery_rail', verts=4)
k.cyl(lx, lr, 3.6, 4.1, 0.32, '#fff0b0', 'lamp_room', emit=('#ffd060', 1.0), verts=12)
for i in range(6):
    a = i * math.pi / 3
    k.box(lx + math.cos(a) * 0.32 - 0.02, lr + math.sin(a) * 0.32 - 0.02, 3.6, lx + math.cos(a) * 0.32 + 0.02,
          lr + math.sin(a) * 0.32 + 0.02, 4.1, '#2a2a30', 'lamp_frame')
k.cone(lx, lr, 4.1, 4.5, 0.4, 0.02, ('#2a3548', 0.1), 'lighthouse_dome', verts=12)
W.door(k, lx, lr + 0.5, w=0.5, h=0.9, arch=True)
k.point_light(lx, lr + 0.8, 3.9, '#ffd070', 120, radius=0.3, group='flicker')
k.solid(13, 5, 14, 6)

for (x, r) in ((8.5, 7.5), (5.5, 11.5), (14.5, 11.5)):
    W.lantern_post(k, x, r)

k.area_light(8.0, 10.0, 12.0, '#8090c8', 600, 18.0, rot=(math.radians(-35), 0, 0))     # moonlight
k.point_light(10.0, 9.5, 2.8, '#ffc890', 30, radius=1.0)

for (c, r) in sea:          # no walking on water
    k.solid(c, r, c + 1, r + 1)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128,
         world_light=('#2a3450', 0.7))

apply_world(WORLD, k, (0, 0, 15, 15), doors=[(7, 15), (8, 15), (7, 16), (8, 16)], scene_id='lumar', moves={
    'MARKET SQUARE': [(6, 0), (7, 0)], 'LIGHTHOUSE': (13, 5), 'BOARD GALLEON': [(7, 15), (8, 15)], 'GALLEON': (8, 16), 'DOCK': (8, 16)},
    scene_extra={'backdrop': True, 'layers': {'shuttle': 'parked'}})
w = json.load(open(WORLD))
w['view'] = [-1.6, -1.6, COLS + 1.6, ROWS + 1.6]       # camera bounds (tiles): inside the render's margins
for it in w['interactions']:                            # the pier's end is the DOCK now: the sloop, not a galleon
    if it.get('label') == 'GALLEON':
        it.update({'label': 'DOCK', 'x': 8, 'y': 16, 'dialog': 'YOUR SLOOP IS TIED UP AT THE END OF THE PIER.'})
w['shuttle'] = {'spawn': [12, 11]}                      # the skiff sets down on the east beach
if not any(it.get('type') == 'shuttle' for it in w['interactions']):
    w['interactions'].append({'x': 12, 'y': 12, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('harbor done')
