"""Rosewell — the bathhouse town on Rose Cove's hot springs (world id "lumar-rose-springs"). Workstream B1.

  BVENV/bin/python tools/bridge-art/scenes/lumar_rose_springs.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-rose-springs

Rose, the crystal sea: makers and mystics. Up the path from Rose Cove the springs come out of the hill hot and pink
with roseite, and they've built a town on them: the water steps down the slope through terraces of travertine —
white-and-rose stone the springs lay down themselves, scalloped lips, little cascades — each terrace a row of pools
steaming under the moon, people soaking in them up to their shoulders. West, the bathhouse (its great bath inside,
js/rose.js); east, the tea house on its stilts over the lowest pool; along the top of the hill the silk groves, where
the moths spin spore silk that glows, cocoons hung in the branches like lamps, silk drying on lines, the weavers' shed;
at the foot, the street up from the cove.

  rows 0-7    the silk groves (z 3.2): trees with glowing cocoons, the drying lines, the weavers' shed
  rows 8-20   the terraces: four levels of pools (z 2.4, 1.6, 0.8, 0.0 down the slope), a stair of white stone down
              the middle with a landing on each; the bathing pools you can wade into (scene.lift sinks you to the waist)
  rows 21-27  the street: houses, lamps, the way back down to the cove at its south edge
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_cliff as CL              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-rose-springs'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 28
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=0.6, margin_x=0.0, seed=4417)
rng = k.rng
C45 = math.cos(math.radians(45))

TRAV = ('#efe4e0', '#e8d6d4', '#f4ece8', '#dcc4c4')        # travertine: white, blushing rose
WATER = '#5aa0a8'
GROVE_Z = 3.2
# the terraces: (row of the lip, level above it); the pools sit on each level
TERR = [(8.0, 3.2), (11.0, 2.4), (14.0, 1.6), (17.0, 0.8), (20.0, 0.0)]
STAIR_X = (20, 21)                                          # the stair down the middle (columns)
BATH_X = (2.0, 13.0)                                        # the bathhouse's frontage, west
TEA_X = (30.0, 40.0)                                        # the tea house, east


def lip_r(x, i):
    """Terrace i's lip: scalloped (each pool's rim bulging out a little), wandering."""
    base = TERR[i][0]
    return base + 0.22 * math.sin(x * 1.3 + i * 2.1) + 0.14 * abs(math.sin(x * 0.7 + i)) + 0.08 * I.n2(x, i * 7.0, 1.4, 3)


def level_at(x, r):
    if r < lip_r(x, 0):
        return GROVE_Z + 0.25 * I.smooth(6.0, 0.0, r) + 0.06 * I.n2(x, r, 0.8, 5)
    for i in range(1, len(TERR)):
        if r < lip_r(x, i):
            return TERR[i][1]
    return 0.0


# the pools: on each level, a row of irregular basins between the lip above and the lip below
POOLS = []
for i in (1, 2, 3):
    z = TERR[i][1]
    r0, r1 = TERR[i - 1][0] + 0.55, TERR[i][0] - 0.45
    xs = [1.5, 7.0, 13.0] if i != 3 else [1.5, 7.5, 24.0]
    for j, x0 in enumerate([1.0, 6.5, 12.5, 23.5, 29.5, 35.5]):
        if i == 3 and TEA_X[0] - 1 <= x0 <= TEA_X[1]:
            continue
        x1 = x0 + rng.uniform(4.2, 5.0)
        if x0 < STAIR_X[1] + 1.4 and x1 > STAIR_X[0] - 0.4:
            continue
        POOLS.append((x0, x1, r0, r1, z, i))
# the bathing pools (walkable: you wade in): the ones either side of the stair on the middle terrace
BATHING = [p for p in POOLS if p[5] == 2 and (abs(p[0] - 12.5) < 0.1 or abs(p[0] - 23.5) < 0.1)]


def in_pool(x, r):
    for p in POOLS:
        x0, x1, r0, r1, z, i = p
        u = (x - (x0 + x1) / 2) / ((x1 - x0) / 2)
        v = (r - (r0 + r1) / 2) / ((r1 - r0) / 2)
        if u * u + v * v < 1.0 + 0.1 * math.sin(x * 3.1 + r * 2.3):
            return p
    return None


TEA_POOL = (30.0, 41.2, 17.6, 20.6)


def H(x, r):
    if TEA_POOL[0] < x < TEA_POOL[1] and TEA_POOL[2] < r < TEA_POOL[3]:
        return -0.62
    z = level_at(x, r)
    p = in_pool(x, r)
    if p:
        z = p[4] - 0.42
    return z


def material(x, r):
    if r < lip_r(x, 0) - 0.3:
        return 'grass' if I.n2(x, r, 0.6, 9) > -0.4 else 'grass_dark'
    if r >= 20.6:
        return 'path' if 17.5 < x < 24.5 or I.n2(x, r, 0.4, 2) > 0.5 else 'grass'
    if in_pool(x, r) or (TEA_POOL[0] < x < TEA_POOL[1] and TEA_POOL[2] < r < TEA_POOL[3]):
        return 'pool_bed'
    t = I.n2(x, r, 1.9, 13)
    return 'trav0' if t > 0.3 else 'trav1' if t > -0.2 else 'trav2'


ALB = {'grass': ('#4a5a42', 0.3), 'grass_dark': ('#3e4c3a', 0.3), 'path': ('#a89890', 0.3), 'pool_bed': ('#c8a8a8', 0.2),
       'trav0': (TRAV[0], 0.22), 'trav1': (TRAV[1], 0.22), 'trav2': (TRAV[3], 0.22)}
CELLS = {(c, r) for c in range(-1, COLS + 1) for r in range(-4, ROWS + 1)}
I.ground(k, CELLS, material, ALB, height=lambda x, r: H(x, r), dither=0.05)

# the water in each pool, steaming; the lips' cascades; rims
STEAM = []
for (x0, x1, r0, r1, z, i) in POOLS:
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    k.blob(cx, cr, z - 0.06, (x1 - x0) / 2 * 1.02, (r1 - r0) / 2 * 1.02, 0.02, (WATER, 0.05), 'basin_water', segs=24)
    STEAM.append([round(cx, 2), round(cr - z * C45, 2)])
    for t in range(14):                                     # the rim: rounded lumps of travertine round the edge
        a = t / 14 * math.pi * 2
        k.blob(cx + math.cos(a) * (x1 - x0) / 2 * 1.04, cr + math.sin(a) * (r1 - r0) / 2 * 1.06, z - 0.02, 0.24, 0.14, 0.07,
               (rng.choice(TRAV), 0.22), 'trav_rim', segs=8)
for i in range(1, len(TERR) - 1):                           # cascades over each lip: white streaks, drip formations
    z_top, z_bot = TERR[i - 1][1], TERR[i][1]
    x = 0.5
    while x < COLS - 0.5:
        if STAIR_X[0] - 0.6 < x < STAIR_X[1] + 1.6:
            x += 1.0
            continue
        rr = lip_r(x, i)
        w_ = rng.uniform(0.25, 0.6)
        if rng.random() < 0.55:
            k.quads([((x, rr - 0.05, z_top - 0.02), (x + w_, rr - 0.05, z_top - 0.02), (x + w_, rr + 0.12, z_bot + 0.02), (x, rr + 0.12, z_bot + 0.02))],
                    (rng.choice(('#f4fbfd', '#cfe8f0', '#e2f2f6')), 0.1), 'cascade')
        for q in range(3):                                  # the lip's drip stones
            k.blob(x + rng.uniform(0, w_), rr + 0.05, z_top - rng.uniform(0.15, 0.5), 0.09, 0.06, rng.uniform(0.12, 0.22),
                   (rng.choice(TRAV), 0.22), 'trav_drip', segs=7)
        x += w_ + rng.uniform(0.1, 0.5)

# ---- the stair down the middle: white stone, a landing on each terrace, lamps ---------------------------------------
for i in range(1, len(TERR)):
    ra, z_top = TERR[i - 1][0] - 0.6, TERR[i - 1][1]
    rb, z_bot = TERR[i][0] + 0.4, TERR[i][1]
    CL.steps(k, STAIR_X[0] + 0.05, STAIR_X[1] + 0.95, ra + 1.2, rb, z_top, z_bot, col='#d8ccc8', wall='#e8dcd8')
for (lx, lr) in ((19.6, 10.6), (22.4, 13.6), (19.6, 16.6), (22.4, 19.6)):
    CL.lift(k, H(lx, lr - 0.4), W.lantern_post, k, lx, lr, h=1.6, energy=24)
    k.solid_post(lx, lr)

# ---- the silk groves along the top --------------------------------------------------------------------------------
COCOON = ('#ffe8f6', '#f8d0e8', '#fff4d8')


def silk_tree(x, r, h=2.2):
    """A silk tree: a short twisted trunk, a broad low crown of small leaves (they turn with the seasons), the moths'
    cocoons hung in it glowing like little lamps."""
    k.tube((x, r, 0.0), (x + 0.12, r, h * 0.45), 0.11, ('#5a4a42', 0.3), 'trunk', verts=7)
    for a in (0.6, 2.4, 4.2):
        k.tube((x + 0.12, r, h * 0.42), (x + 0.12 + math.cos(a) * 0.5, r + math.sin(a) * 0.3, h * 0.62), 0.05, '#5a4a42', 'branch', verts=5)
    with k.foliage('leaf'):
        W.leafy_crown(k, x + 0.1, r, h * 0.72, 1.05, 0.8, 0.5, rng.choice(('#5a7a4a', '#4e6e44', '#64824e')))
    for q in range(5):
        a = rng.uniform(0, math.pi * 2)
        cx_, cr_ = x + math.cos(a) * rng.uniform(0.3, 0.9), r + math.sin(a) * rng.uniform(0.2, 0.6) + 0.2
        zc = h * 0.5 + rng.uniform(-0.1, 0.15)
        k.tube((cx_, cr_, zc + 0.3), (cx_, cr_, zc + 0.08), 0.006, '#e8e0e8', 'silk_thread', verts=3)
        k.blob(cx_, cr_, zc, 0.06, 0.06, 0.1, '#5a3a4a', 'cocoon', emit=(rng.choice(COCOON), 0.7), segs=7)


for (tx, tr) in ((2.5, 3.0), (6.0, 1.6), (9.4, 3.4), (13.0, 1.8), (16.4, 3.6), (25.6, 3.2), (29.0, 1.6), (32.6, 3.4), (36.2, 1.8), (40.0, 3.2)):
    CL.lift(k, H(tx, tr), silk_tree, tx, tr, h=rng.uniform(2.0, 2.5))
    k.solid(tx - 0.4, tr - 0.4, tx + 0.4, tr + 0.4)
# silk drying on lines between poles, pale and glowing faintly
for (x0, x1, rr) in ((4.0, 8.0, 5.6), (11.0, 15.0, 5.8), (27.0, 31.0, 5.6), (34.0, 38.0, 5.8)):
    z0 = H((x0 + x1) / 2, rr)
    for xx in (x0, x1):
        CL.lift(k, z0, k.cyl, xx, rr, 0.0, 1.5, 0.03, A.WOOD_D, 'line_post', verts=6)
        k.solid_post(xx, rr)
    CL.lift(k, z0, k.tube, (x0, rr, 1.45), (x1, rr, 1.45), 0.008, '#e8e0e8', 'silk_line', verts=3)
    xx = x0 + 0.25
    while xx < x1 - 0.3:
        col = rng.choice(('#f8d0e8', '#ffe8f6', '#e8b0d0', '#fff0e0', '#d8c0f0'))
        CL.lift(k, z0, k.box, xx, rr - 0.01, 0.75, xx + 0.42, rr + 0.01, 1.43, '#5a3a4a', 'silk_cloth', emit=(col, 0.28))
        xx += 0.55
# the weavers' shed in the middle of the grove: an open front, looms inside, bolts of silk stacked
SHED = (18.0, 24.0, 1.0, 4.0)
sz = H(21.0, 3.0)


def weavers_shed():
    x0, x1, r0, r1 = SHED
    k.box(x0, r0, 0.0, x1, r0 + 0.3, 1.8, ('#d8c4c0', 0.2), 'shed_wall', bevel=0.03)
    for xx in (x0, x1 - 0.25):
        k.box(xx, r0, 0.0, xx + 0.25, r1, 1.8, ('#d8c4c0', 0.2), 'shed_wall', bevel=0.03)
    for xx in (x0 + 2.0, x0 + 4.0):
        k.box(xx - 0.08, r1 - 0.12, 0.0, xx + 0.08, r1 + 0.04, 1.8, ('#5a3a2a', 0.2), 'shed_post')
    W._gable_roof(k, x0 - 0.1, x1 + 0.1, r0, r1 + 0.1, 1.8, 0.9, '#5a2a40')
    for j, xx in enumerate((x0 + 1.2, x0 + 3.0, x0 + 4.8)):                 # the looms
        k.box(xx - 0.5, r0 + 0.9, 0.0, xx + 0.5, r0 + 1.1, 1.2, ('#6a4a2a', 0.2), 'loom_frame')
        k.box(xx - 0.45, r0 + 1.1, 0.5, xx + 0.45, r0 + 1.12, 1.15, '#5a3a4a', 'loom_silk', emit=(COCOON[j], 0.35))
        k.box(xx - 0.5, r0 + 1.5, 0.0, xx + 0.5, r0 + 1.9, 0.45, ('#6a4a2a', 0.2), 'loom_bench')
    for j in range(4):
        k.cyl_x(x1 - 1.2, x1 - 0.4, r1 - 0.5, 0.15 + j * 0.2, 0.1, 0.1, '#5a3a4a', 'silk_bolt', emit=(COCOON[j % 3], 0.3), verts=10)
    W.lantern(k, x0 + 3.0, r1 - 0.3, 1.2, 1.4, s=0.08, energy=8)


CL.lift(k, sz, weavers_shed)
k.solid(SHED[0], SHED[2], SHED[1], SHED[3])
# flowers in the grove grass
I.tufts(k, [(c, r) for c in range(COLS) for r in range(0, 7)], '#5a6a50', per_cell=0.9,
        avoid=lambda x, r: SHED[0] - 0.3 < x < SHED[1] + 0.3 and r < SHED[3] + 0.3)

# ---- the bathhouse (west) and the tea house on stilts (east) ------------------------------------------------------
BZ = TERR[4][1]                                             # the bathhouse stands on the lowest terrace's level


def bathhouse():
    x0, x1 = BATH_X
    r0, r1 = 17.2, 20.8
    k.box(x0, r0, -0.02, x1, r1, 2.0, ('#e8d4d0', 0.18), 'bath_wall', bevel=0.06)
    k.box(x0 - 0.1, r1 - 0.02, -0.02, x1 + 0.1, r1 + 0.04, 0.3, ('#c8b0ac', 0.2), 'footing', bevel=0.02)
    HK.pantile_roof(k, x0 - 0.1, x1 + 0.1, r0 - 0.1, r1 + 0.1, 2.0, 1.1, '#8a3a50', '#e8d4d0')
    # three domes on the roof's ridge, rose-pink, glass eyes letting the steam out
    for dx in (-3.0, 0.0, 3.0):
        CL.dome(k, (x0 + x1) / 2 + dx, (r0 + r1) / 2 - 0.3, 2.9, 0.62 if dx else 0.85, col='#c8607a', cross=False)
    # the great door under a horseshoe arch, lamplit; arched windows
    cx = 7.5
    k.box(cx - 0.9, r1 - 0.05, 0.0, cx + 0.9, r1 + 0.08, 1.7, ('#c8b0ac', 0.15), 'door_reveal', bevel=0.03)
    k.cyl_y(cx, r1 - 0.05, r1 + 0.08, 1.7, 0.9, 0.7, ('#c8b0ac', 0.15), 'door_reveal', verts=18)
    k.box(cx - 0.65, r1 - 0.02, 0.0, cx + 0.65, r1 + 0.09, 1.55, '#3a1a20', 'door_glow', emit=('#ffb070', 0.55))
    k.cyl_y(cx, r1 - 0.02, r1 + 0.09, 1.55, 0.65, 0.5, '#3a1a20', 'door_glow', emit=('#ffb070', 0.55), verts=16)
    k.point_light(cx, r1 + 0.7, 0.9, '#ffb070', 40, radius=0.4, group='flicker')
    for wx in (3.6, 5.4, 9.6, 11.4):
        CL.deep_window(k, wx, r1 + 0.02, 0.8, w=0.42, h=0.7, shutters=None, arch=True)
    for dx in (-1.2, 1.2):
        W.lantern(k, cx + dx, r1 + 0.18, 1.2, 1.42, s=0.08, energy=6)


CL.lift(k, BZ, bathhouse)
k.solid(BATH_X[0], 17, BATH_X[1], 21)


def teahouse():
    x0, x1 = TEA_X
    r0, r1 = 16.6, 20.2
    for xx in (x0 + 0.2, x1 - 0.2, (x0 + x1) / 2):           # stilts down into the pool below
        for rr in (r0 + 0.3, r1 - 0.2):
            k.cyl(xx, rr, -0.6, 0.6, 0.1, ('#4a2a2a', 0.2), 'stilt', verts=8)
    k.box(x0 - 0.3, r0, 0.5, x1 + 0.3, r1 + 0.6, 0.62, ('#7a4a3a', 0.15), 'deck', bevel=0.02)
    k.box(x0 + 0.4, r0 + 0.2, 0.62, x1 - 0.4, r1 - 0.5, 2.0, ('#e8d8c8', 0.18), 'tea_wall', bevel=0.04)
    k.box(x0 + 0.4, r1 - 0.52, 0.62, x1 - 0.4, r1 - 0.48, 1.9, '#3a1a20', 'tea_screens', emit=('#ffc890', 0.55))
    xx = x0 + 0.6
    while xx < x1 - 0.5:                                     # lattice over the lit paper screens
        k.box(xx - 0.02, r1 - 0.48, 0.62, xx + 0.02, r1 - 0.44, 1.9, '#4a2a2a', 'lattice')
        xx += 0.45
    for zz in (1.0, 1.4):
        k.box(x0 + 0.4, r1 - 0.48, zz, x1 - 0.4, r1 - 0.44, zz + 0.04, '#4a2a2a', 'lattice')
    # a sweeping roof: deep eaves curling up at the corners
    k.box(x0 - 0.6, r0 - 0.4, 2.0, x1 + 0.6, r1 + 0.7, 2.12, ('#3a2a34', 0.2), 'roof_eave', bevel=0.03)
    HK.pantile_roof(k, x0 - 0.3, x1 + 0.3, r0 - 0.2, r1 + 0.4, 2.1, 1.0, '#5a2a40', '#e8d8c8')
    for (ex, er) in ((x0 - 0.6, r1 + 0.7), (x1 + 0.6, r1 + 0.7)):
        k.cone(ex, er, 2.06, 2.36, 0.08, 0.02, '#3a2a34', 'roof_eave_tip', verts=6)
    for xx in (x0 + 0.5, (x0 + x1) / 2, x1 - 0.5):          # paper lanterns along the eave
        k.tube((xx, r1 + 0.55, 2.0), (xx, r1 + 0.55, 1.75), 0.006, '#2a2a2c', 'lantern_cord', verts=3)
        k.sphere(xx, r1 + 0.55, 1.62, 0.13, 0.17, '#3a1408', 'paper_lantern', emit=('#ff8a70', 0.9), segs=10)
        k.point_light(xx, r1 + 0.8, 1.5, '#ff9a80', 10, radius=0.12, group='flicker')
    for (tx, tr) in ((x0 + 1.4, r1 + 0.3), (x1 - 1.4, r1 + 0.3)):   # low tables on the deck, cushions
        k.box(tx - 0.3, tr - 0.2, 0.62, tx + 0.3, tr + 0.2, 0.8, ('#4a2a2a', 0.2), 'tea_table')
        for dx in (-0.45, 0.45):
            k.box(tx + dx - 0.15, tr - 0.15, 0.62, tx + dx + 0.15, tr + 0.15, 0.7, ('#c8607a', 0.3), 'cushion', bevel=0.03)


CL.lift(k, TERR[4][1], teahouse)
k.solid(TEA_X[0] - 0.3, 16.6, TEA_X[1] + 0.3, 20.8)
# the tea house's pool below it, and its little bridge from the stair landing
k.box(TEA_POOL[0], TEA_POOL[2], -0.5, TEA_POOL[1], TEA_POOL[3], -0.44, (WATER, 0.05), 'basin_water')
STEAM.append([round((TEA_POOL[0] + TEA_POOL[1]) / 2, 2), round(19.0 + 0.5 * C45, 2)])

# ---- the street at the foot ----------------------------------------------------------------------------------------
HK.install()
# the bathhouse's plaza: paving, a fountain of the springs' own hot water, tubs of roses, benches
k.box(0.0, 21.0, -0.02, 13.6, 24.6, 0.005, ('#d8c8c4', 0.05), 'paving_grout')
CL.paving(k, 0.0, 21.0, 13.6, 24.6, seed=77, grout='#e8dcd8')
FTN = (7.0, 23.0)
k.cyl(FTN[0], FTN[1], 0.0, 0.42, 0.95, ('#e8d8d4', 0.06), 'fountain_rim', verts=24)
k.cyl(FTN[0], FTN[1], 0.3, 0.38, 0.85, (WATER, 0.05), 'basin_water', verts=24)
k.cyl(FTN[0], FTN[1], 0.0, 1.1, 0.16, ('#d8c4c0', 0.06), 'fountain_column', verts=12)
k.cone(FTN[0], FTN[1], 1.1, 1.3, 0.4, 0.2, ('#d8c4c0', 0.06), 'fountain_bowl', verts=16)
k.tube((FTN[0], FTN[1], 1.3), (FTN[0], FTN[1] + 0.55, 0.4), 0.025, '#cfe8f0', 'fountain_stream', verts=5)
k.tube((FTN[0], FTN[1], 1.3), (FTN[0], FTN[1] - 0.55, 0.4), 0.025, '#cfe8f0', 'fountain_stream', verts=5)
k.solid(FTN[0] - 1.0, FTN[1] - 1.0, FTN[0] + 1.0, FTN[1] + 1.0)
STEAM.append([FTN[0], round(FTN[1] - 0.5, 2)])
for (bx, br) in ((2.2, 22.4), (11.6, 22.4)):
    W.bench(k, bx - 0.7, bx + 0.7, br)
    k.solid(bx - 0.7, br - 0.2, bx + 0.7, br + 0.3)
for (tx, tr) in ((0.8, 21.4), (13.0, 21.4), (4.2, 24.2), (9.8, 24.2)):
    HK.tub(k, tx, tr, blooms=('#f080b0', '#ffd0e8', '#c060a0'))
    k.solid(tx - 0.35, tr - 0.35, tx + 0.35, tr + 0.35)
HK.rich_house(k, 31.6, 36.0, 21.6, 24.0, wall_h=2.0, rise=1.2, roof='#5a2a40', wall='#e4d0d8', door_x=33.4,
              windows=[(32.4, 0.85), (35.2, 0.85)], windows_up=[(33.8, 1.5)], chimney=35.6)
HK.rich_house(k, 36.6, 42.6, 21.5, 24.0, wall_h=2.2, rise=1.3, roof='#8a3a50', wall='#f0dcd0', door_x=40.4,
              windows=[(37.5, 0.9), (38.9, 0.9)], windows_up=[(37.9, 1.6), (41.3, 1.6)], chimney=37.2, sign=(42.45, 1.6, 'mug'))
k.solid(31, 21, 43, 24)
for (cx_, cr_) in ((14.2, 24.4), (30.6, 24.5)):
    HK.tub(k, cx_, cr_, blooms=('#f080b0', '#ffd0e8', '#c060a0'))
    k.solid(cx_ - 0.35, cr_ - 0.35, cx_ + 0.35, cr_ + 0.35)
for (lx, lr) in ((13.0, 26.6), (28.0, 26.6), (17.6, 22.4), (24.4, 22.4)):
    W.lantern_post(k, lx, lr, energy=26)
    k.solid_post(lx, lr)
# roseite crystals pushing up where the springs seep, glowing
for (x_, r_, s_) in ((15.4, 23.6, 0.9), (26.8, 23.2, 0.8), (0.8, 26.4, 1.0), (43.0, 26.0, 0.9), (14.6, 9.6, 0.7), (27.6, 12.4, 0.7)):
    CL.lift(k, H(x_, r_), W.shore_crystals, k, x_, r_, col=('#6a2a4a', '#f080b0'), s=s_, energy=8, solid=False)
    k.solid(x_ - 0.3, r_ - 0.3, x_ + 0.3, r_ + 0.3)

# ---- light --------------------------------------------------------------------------------------------------------
k.area_light(22.0, 12.0, 16.0, '#b8a0d0', 1600, 34.0, rot=(math.radians(-35), 0, 0))
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('ROSE_SAMPLES', 96)), world_light=('#3a2a4a', 0.8))

# ---- the world ----------------------------------------------------------------------------------------------------
WALK = set()
for c in range(COLS):
    for r in range(0, 7):                                    # the grove
        WALK.add((c, r))
    for r in range(21, ROWS):                                # the street
        WALK.add((c, r))
for c in STAIR_X:
    for r in range(7, 21):
        WALK.add((c, r))
for (x0, x1, r0, r1, z, i) in BATHING:                      # the bathing pools and the terrace between them and the stair
    cs = range(int(x0) - 1, STAIR_X[0]) if x1 < STAIR_X[0] else range(STAIR_X[1] + 1, int(math.ceil(x1)) + 1)
    for c in cs:
        for r in range(int(r0), int(math.ceil(r1))):
            WALK.add((c, r))
for c in range(int(STAIR_X[1]) + 1, int(TEA_X[0])):         # the walk along the lowest terrace to the tea house's deck
    WALK.add((c, 20))
WALK = {(c, r) for (c, r) in WALK if 0 <= c < COLS and 0 <= r < ROWS}


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Rosewell', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
     'spawns': {'player': [21, 26]}, 'moonColor': [140, 90, 140], 'shipExit': False,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': 20, 'y': 27, 'type': 'leave_world', 'leaveTo': 'lumar-rose', 'leaveSpawn': [51, 22], 'label': 'ROSE COVE', 'prompt': 'PRESS E TO GO DOWN'},
         {'x': 21, 'y': 27, 'type': 'leave_world', 'leaveTo': 'lumar-rose', 'leaveSpawn': [51, 22], 'label': 'ROSE COVE', 'prompt': 'PRESS E TO GO DOWN'},
         {'x': 7, 'y': 20, 'type': 'enter_world', 'target': 'lumar-rose-bathhouse', 'spawn': [8, 10], 'label': 'BATHHOUSE', 'prompt': 'PRESS E TO GO IN'},
         {'x': 29, 'y': 20, 'type': 'enter_world', 'target': 'lumar-rose-teahouse', 'spawn': [7, 9], 'label': 'TEA HOUSE', 'prompt': 'PRESS E TO GO IN'},
         {'x': 21, 'y': 5, 'type': 'dialog', 'label': 'SEREN', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         {'x': 25, 'y': 24, 'type': 'dialog', 'label': 'MOTHER AMARYLLIS', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         {'x': 6, 'y': 5, 'type': 'rose', 'act': 'silk', 'label': 'SILK TREES', 'prompt': 'PRESS E TO GATHER'},
         {'x': 22, 'y': 5, 'type': 'rose', 'act': 'looms', 'label': 'LOOMS', 'prompt': 'PRESS E TO LOOK'},
         {'x': 15, 'y': 12, 'type': 'rose', 'act': 'soak', 'label': 'HOT POOL', 'prompt': 'PRESS E TO SOAK'},
         {'x': 25, 'y': 12, 'type': 'rose', 'act': 'soak', 'label': 'HOT POOL', 'prompt': 'PRESS E TO SOAK'},
         {'x': 24, 'y': 24, 'type': 'rose', 'act': 'reading', 'label': 'A READING', 'prompt': 'PRESS E FOR A READING'},
         look('THE TERRACES', 21, 9, 'THE SPRINGS COME OUT OF THE HILL HOT AND PINK WITH ROSEITE AND LAY DOWN THEIR OWN STONE AS THEY GO - WHITE, BLUSHING, SCALLOPED LIKE ICING. EVERY YEAR THE TERRACES GROW A FINGER\'S WIDTH.'),
         look('CRYSTALS', 15, 22, 'ROSEITE PUSHING UP THROUGH THE PAVING WHERE THE SPRING SEEPS. THE TOWN LETS IT GROW. "IT WAS HERE FIRST," THEY SAY.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (ax, ay) in ((21, 5), (25, 24)):
    k.solid(ax, ay, ax + 1, ay + 1)
LIFT = [[round(H(c + 0.5, r + 0.5), 2) for c in range(COLS)] for r in range(ROWS)]
BATHERS = []
for (x0, x1, r0, r1, z, i) in POOLS:
    if (x0, x1, r0, r1, z, i) in BATHING:
        continue
    cx, cr = int((x0 + x1) / 2), int((r0 + r1) / 2)
    if rng.random() < 0.6:
        BATHERS.append({'sheet': rng.choice(('npc-rose-bather-a', 'npc-rose-bather-b')), 'x': cx, 'y': cr, 'facing': rng.choice(('down', 'left', 'right'))})
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-rose-seren', 'x': 21, 'y': 5, 'facing': 'down'},
                    {'sheet': 'npc-rose-amaryllis', 'x': 25, 'y': 24, 'facing': 'down'}] + BATHERS,
            scene_extra={'smoke': [], 'steam': STEAM, 'lift': LIFT})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in WALK:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('rosewell done; walkable', len(WALK), 'pools', len(POOLS), 'bathing', len(BATHING))
