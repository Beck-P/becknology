"""Lumar Harbour — Blender scene (world id "lumar").

  BVENV/bin/python tools/bridge-art/scenes/lumar_harbor.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar

Black saltstone cliffs with a trail winding down from the Market Square
steps to the shore, the lighthouse, lantern posts, boats pulled up on the
sand, the pier and the galleon at berth. The emerald sea is the world's own
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

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar.json')
w = json.load(open(WORLD))
names = {int(k_): v for k_, v in w.get('designTileNames', w['tileNames']).items()}
T = w.get('designTiles', w['tiles'])
COLS, ROWS = w['width'], w['height']

k = Kit(COLS, ROWS, margin_top=1.5, margin_bottom=1.5, seed=211)

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


# ---- cliffs ----------------------------------------------------------------------------------
# body and grass top are built as one box per run of cliff cells along a row:
# per-cell boxes overlapping at the seams catch each other's shadows and show
# the tile grid.
H = 1.05
for r in range(ROWS):
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
    for (dc, dr) in ((0, 1), (-1, 0), (1, 0), (0, -1)):
        if (c + dc, r + dr) in trail or (c + dc, r + dr) in shore:
            for j in range(2):
                s = k.rng.uniform(0.22, 0.38)
                x = c + 0.5 + dc * 0.5 + (k.rng.uniform(-0.3, 0.3) if dc == 0 else 0)
                rr = r + 0.5 + dr * 0.5 + (k.rng.uniform(-0.3, 0.3) if dr == 0 else 0)
                k.rock(x, rr, h * k.rng.uniform(0.3, 0.7), s, s * 0.8, h * 0.45, (W.SALT[k.rng.choice((1, 2))], 0.22),
                       part='cliff_rock')
    k.solid(c, r, c + 1, r + 1)


def clear_above(c, r, n=3):
    """No walkable ground in the screen rows a tall thing at (c, r) covers."""
    return all((c + dc, r - dr) not in trail and (c + dc, r - dr) not in shore for dc in (-1, 0, 1) for dr in range(0, n + 1))


spots = [(c, r) for (c, r) in sorted(cliff) if clear_above(c, r) and (c, r + 1) not in trail]
k.rng.shuffle(spots)
for (c, r) in spots[:12]:
    W.pine(k, c + k.rng.uniform(0.3, 0.7), r + k.rng.uniform(0.3, 0.7), h=k.rng.uniform(2.0, 2.8))
for (c, r) in spots[12:30]:
    W.bush(k, c + k.rng.uniform(0.3, 0.7), r + k.rng.uniform(0.3, 0.7), s=k.rng.uniform(0.22, 0.32),
           berries=k.rng.choice((None, None, '#c04050')))

# ---- the trail -------------------------------------------------------------------------------------
for (c, r) in trail:
    k.box(c, r, -0.3, c + 1, r + 1, -0.02, ('#4a4034', 0.3), 'trail')
    for j in range(3):
        s = k.rng.uniform(0.08, 0.18)
        k.cyl(c + k.rng.uniform(0.15, 0.85), r + k.rng.uniform(0.15, 0.85), -0.03, 0.005, s, (W.SALT[2], 0.15), 'trail_stone',
              ry=s * 0.8, verts=6)
# steps up to the Market Square at the top of the trail
for i in range(4):
    z = 0.3 * (i + 1)
    k.box(6.0, 2.0 - (i + 1) * 0.5, -0.1, 8.0, 2.0 - i * 0.5, z, (shade(A.STONE, 0.95 + 0.03 * i), 0.14), 'steps')

# ---- the shore --------------------------------------------------------------------------------------------
for (c, r) in shore:
    k.box(c, r, -0.4, c + 1, r + 1, -0.02, ('#8a7a5a', 0.25), 'sand')
    if (c, r + 1) not in shore and (c, r + 1) not in trail:
        k.box(c, r + 0.85, -0.5, c + 1, r + 1.02, -0.05, ('#6a5a40', 0.25), 'sand_edge')
W.rock_shore(k, [(3.8, 13.4), (3.7, 14.3), (15.2, 13.5), (14.9, 14.6), (9.4, 14.9), (6.4, 14.8)])
W.rowboat(k, 10.6, 12.6, 13.55)
W.rowboat(k, 12.3, 14.2, 14.45, hull='#3a4a5a', oars=False)
A.crate(k, 4.3, 13.1, s=0.5)
A.barrel(k, 5.2, 13.5, h=0.75, radius=0.28)
for i in range(4):     # net drying over the rocks
    k.bar(9.6 + i * 0.12, 13.2, 10.1 + i * 0.12, 13.9, 0.05, 0.07, 0.015, '#8a7a5a', 'net')
k.solid(11, 13, 13, 14)
k.solid(12, 14, 14, 15)
k.solid(4, 13, 6, 14)

# ---- pier + galleon ---------------------------------------------------------------------------------------
W.dock(k, 7.0, 9.0, 13.6, 16.95, z=0.05)
for (x, r) in ((7.1, 16.5), (8.9, 16.5)):
    W.silver_post(k, x, r)
W.galleon(k, 4.2, 12.6, 17.8)
k.poly([(7.75, 16.55, 0.06), (8.25, 16.55, 0.06), (8.25, 17.25, 1.0), (7.75, 17.25, 1.0)], (A.WOOD, 0.14), 'gangplank')
for xx in (7.75, 8.25):
    k.tube((xx, 16.55, 0.35), (xx, 17.25, 1.3), 0.012, '#8a7a5a', 'gangplank_rope', verts=4)

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
    'MARKET SQUARE': [(6, 0), (7, 0)], 'LIGHTHOUSE': (13, 5), 'BOARD GALLEON': [(7, 15), (8, 15)], 'GALLEON': (8, 17)},
    scene_extra={'backdrop': True})
print('harbor done')
