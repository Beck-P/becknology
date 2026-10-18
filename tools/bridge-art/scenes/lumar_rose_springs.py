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
              the middle with a landing on each; the bathing pools you can wade into (scene.heights sinks you to the waist)
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
# the pools: each terrace is cut into basins of its own width, side by side, filling it from the lip above to the lip
# below with low rims of travertine between — as the springs build them — never ovals laid on a lawn
POOLS = []
STAIR_GAP = (STAIR_X[0] - 0.7, STAIR_X[1] + 1.7)
KEEP_OUT = [(BATH_X[0] - 0.4, BATH_X[1] + 0.4, 16.8, 21.0), (TEA_X[0] - 0.6, TEA_X[1] + 0.6, 16.4, 21.0)]
for i in (1, 2, 3, 4):
    z = TERR[i][1]
    x = 0.3
    while x < COLS - 1.2:
        w = rng.uniform(2.8, 5.6)
        a, b = x, min(COLS - 0.3, x + w)
        x = b + rng.uniform(0.35, 0.6)
        if b - a < 1.8 or (a < STAIR_GAP[1] and b > STAIR_GAP[0]):
            if a < STAIR_GAP[1] and b > STAIR_GAP[0]:
                # split round the stair: the part before it, then carry on after it
                if STAIR_GAP[0] - 0.4 - a > 1.8:
                    POOLS.append((a, STAIR_GAP[0] - 0.4, z, i))
                x = STAIR_GAP[1] + 0.4
            continue
        if i == 4 and any(ka < b and kb > a for (ka, kb, kr0, kr1) in KEEP_OUT):
            continue
        POOLS.append((a, b, z, i))
# the bathing pools (walkable: you wade in): the ones either side of the stair on the middle terrace
POOLS.append((TEA_X[0] - 1.2, TEA_X[1] + 1.2, 0.0, 4))         # the tea house's own pool, under its stilts
BATHING = [p for p in POOLS if p[3] == 2 and (abs(p[1] - (STAIR_GAP[0] - 0.4)) < 0.05 or abs(p[0] - (STAIR_GAP[1] + 0.4)) < 0.05)]


def pool_extent(p, x):
    a, b, z, i = p
    return lip_r(x, i - 1) + 0.42, lip_r(x, i) - 0.24          # back and front edge at this x


def pool_d(p, x, r):
    """How far inside pool p (x, r) is, in tiles (negative outside): its rounded-box outline, scalloped by the lips."""
    a, b, z, i = p
    if not (a - 0.5 < x < b + 0.5):
        return -1.0
    back, front = pool_extent(p, x)
    dx = min(x - a, b - x)
    dr = min(r - back, front - r)
    if dx < 0 or dr < 0:
        return min(dx, dr)
    k_ = 0.45                                                  # the corners rounded over this much
    if dx < k_ and dr < k_:
        return k_ - math.hypot(k_ - dx, k_ - dr)
    return min(dx, dr) + 0.05 * math.sin(x * 4.1 + r * 2.7)


def in_pool(x, r):
    for p in POOLS:
        if pool_d(p, x, r) > 0:
            return p
    return None


def H(x, r):
    z = level_at(x, r)
    for p in POOLS:
        d = pool_d(p, x, r)
        if d > 0:
            return p[2] - 0.08 - 0.36 * I.smooth(0.0, 0.42, d)      # banks shelving down to the bed
    return z


def material(x, r):
    if r < lip_r(x, 0) - 0.3:
        return 'grass' if I.n2(x, r, 0.6, 9) > -0.4 else 'grass_dark'
    if r >= 20.6 and not in_pool(x, r):
        return 'path' if 17.5 < x < 24.5 or I.n2(x, r, 0.4, 2) > 0.5 else 'grass'
    p = in_pool(x, r)
    if p:
        return 'pool_shelf' if pool_d(p, x, r) < 0.35 else 'pool_bed'
    for i in range(1, len(TERR)):                              # a lip's face: streaked where the water runs over it
        if abs(r - lip_r(x, i)) < 0.32:
            return 'trav_streak' if I.n2(x * 3.0, 0.0, 1.0, 17 + i) > 0.0 else 'trav0'
    t = I.n2(x, r, 1.9, 13)
    return 'trav0' if t > 0.25 else 'trav1' if t > -0.25 else 'trav2'


ALB = {'grass': ('#4a5a42', 0.2), 'grass_dark': ('#3e4c3a', 0.2), 'path': ('#a89890', 0.15), 'pool_bed': ('#a8c8c8', 0.06),
       'pool_shelf': ('#d8e4e0', 0.06), 'trav0': (TRAV[0], 0.06), 'trav1': (TRAV[1], 0.06), 'trav2': (TRAV[3], 0.06),
       'trav_streak': ('#f8f2f0', 0.04)}
CELLS = {(c, r) for c in range(-1, COLS + 1) for r in range(-4, ROWS + 1)}
I.ground(k, CELLS, material, ALB, height=lambda x, r: H(x, r), dither=0.04, step=0.0833)

# the water in each pool: one surface following its outline exactly (the Look Book water by its name), steaming;
# crystals of roseite glowing on the beds
STEAM = []
faces = []
n = 10
for p in POOLS:
    a, b, z, i = p
    back0 = min(pool_extent(p, xx)[0] for xx in (a, (a + b) / 2, b)) - 0.1
    front0 = max(pool_extent(p, xx)[1] for xx in (a, (a + b) / 2, b)) + 0.1
    for xi in range(int(a * n), int(b * n) + 1):
        for ri in range(int(back0 * n), int(front0 * n) + 1):
            if pool_d(p, (xi + 0.5) / n, (ri + 0.5) / n) > 0.02:
                faces.append(((xi, ri), (xi + 1, ri), (xi + 1, ri + 1), (xi, ri + 1), z))
by_z = {}
for f in faces:
    by_z.setdefault(f[4], []).append(f[:4])
for zz, fs in by_z.items():
    I._mesh(k, {'water': fs}, lambda q, zz=zz: (q[0] / n, q[1] / n, zz - 0.07), {'water': (WATER, 0.04)}, 'basin')
for p in POOLS:
    a, b, z, i = p
    back, front = pool_extent(p, (a + b) / 2)
    STEAM.append([round((a + b) / 2, 2), round((back + front) / 2 - z * C45, 2)])
    for q in range(int((b - a) // 2)):
        if rng.random() < 0.5:
            cx_, cr_ = rng.uniform(a + 0.5, b - 0.5), rng.uniform(back + 0.4, front - 0.3)
            k.cone(cx_, cr_, z - 0.44, z - 0.02, 0.07, 0.0, '#3a1428', 'crystal', emit=('#f080b0', 0.7), verts=5)
            k.cone(cx_ + 0.1, cr_ + 0.05, z - 0.44, z - 0.18, 0.05, 0.0, '#3a1428', 'crystal', emit=('#ff9ad0', 0.6), verts=5)
# the lips: water spilling over in thin bright sheets in front of the fullest pools
for p in POOLS:
    a, b, z, i = p
    if i == 4 or rng.random() < 0.35:
        continue
    zb = TERR[i + 1][1] if i + 1 < len(TERR) else 0.0
    xx = a + rng.uniform(0.3, 0.8)
    while xx < b - 0.4:
        w_ = rng.uniform(0.18, 0.45)
        rr = lip_r(xx, i)
        k.quads([((xx, rr - 0.12, z - 0.07), (xx + w_, rr - 0.12, z - 0.07), (xx + w_, rr + 0.2, zb + 0.02), (xx, rr + 0.2, zb + 0.02))],
                (rng.choice(('#f4fbfd', '#e2f2f6', '#cfe8f0')), 0.05), 'cascade')
        xx += w_ + rng.uniform(0.4, 1.4)
# rough grass, ferns and roseite where the terraces meet the hill at either side
for side in ((0.0, 1.4), (COLS - 1.4, COLS + 0.0)):
    for q in range(26):
        x_, r_ = rng.uniform(*side), rng.uniform(8.0, 20.0)
        with k.foliage('leaf'):
            k.blob(x_, r_, H(x_, r_) + 0.08, rng.uniform(0.15, 0.3), rng.uniform(0.12, 0.22), 0.14,
                   (rng.choice(('#5a7a4a', '#4e6e44', '#6a8a52')), 0.2), 'fern', segs=7)

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
for p in BATHING:                                           # the bathing pools and the terrace between them and the stair
    x0, x1, z, i = p
    cs = range(int(x0), STAIR_X[0]) if x1 < STAIR_X[0] else range(STAIR_X[1] + 1, int(math.ceil(x1)))
    for c in cs:
        for r in range(int(math.ceil(TERR[i - 1][0] + 0.3)), int(TERR[i][0])):
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
for p in POOLS:
    if p in BATHING or p[3] == 4:
        continue
    x0, x1, z, i = p
    back, front = pool_extent(p, (x0 + x1) / 2)
    cx, cr = int((x0 + x1) / 2), int((back + front) / 2)
    if rng.random() < 0.6:
        BATHERS.append({'sheet': rng.choice(('npc-rose-bather-a', 'npc-rose-bather-b')), 'x': cx, 'y': cr, 'facing': rng.choice(('down', 'left', 'right'))})
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-rose-seren', 'x': 21, 'y': 5, 'facing': 'down'},
                    {'sheet': 'npc-rose-amaryllis', 'x': 25, 'y': 24, 'facing': 'down'}] + BATHERS,
            scene_extra={'smoke': [], 'steam': STEAM, 'heights': LIFT})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in WALK:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('rosewell done; walkable', len(WALK), 'pools', len(POOLS), 'bathing', len(BATHING))
