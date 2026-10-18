"""Hoarfell — the hidden valley, beyond the Col du Vent: the end of the High Route (js/touring.js). Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_valley.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-valley

Warm from below. You come down through the larches on the west from Bram's refuge into a valley where the snow gives
out: the outer slopes still white and wind-carved (the ice wolves hunt there, js/valley.js), then green moss and grass
coming through it the nearer you get to the hot springs — travertine terraces of blue water stepping down the valley
floor, steaming, a stream running out of them. White chortens and prayer flags, a wall of prayer wheels under a little
roof, mossy boulders. At the valley's head the monastery stands on its cliff, whitewashed walls and gilt roofs, its stair
zigzagging down the rock; in the east the glacier's blue tongue comes down to the valley with the mouth of the ice caves
in its foot. In the south-west, big boulders where the yetis keep to themselves; on the south edge a herders' shelter
with a fire. Tile units: x = column, r = row (toward the camera), z = height.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_alpine as A              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-valley'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 52, 46
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=7.5, margin_bottom=0.6, seed=9029)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- warmth: where the springs are, the snow gives out --------------------------------------------------------------------
SPRINGS = [(26.0, 17.0, 4), (33.4, 22.0, 3), (20.6, 25.4, 3)]           # each terrace's top pool (x, r) and how many steps
WARM = [(26.0, 19.0, 7.0), (33.4, 23.0, 5.0), (20.6, 27.0, 5.0), (25.0, 31.0, 6.0)]
STREAM = [(26.0, 21.0), (25.2, 24.0), (24.4, 28.0), (25.6, 32.0), (24.8, 36.0), (26.2, 40.0), (25.6, 46.0)]


def warmth(x, r):
    w = 0.0
    for (wx, wr, s) in WARM:
        w = max(w, math.exp(-((x - wx) ** 2 + ((r - wr) * 1.2) ** 2) / (s * s)))
    return w


def stream_d(x, r):
    return I.path_dist([STREAM], x, r) + 0.12 * I.n2(x, r, 2.2, 3)


TRAIL = [(4.0, 6.0), (6.0, 10.0), (9.0, 14.0), (13.0, 17.0), (17.0, 20.0), (22.0, 22.0), (25.6, 24.6), (27.0, 30.0), (24.0, 36.0),
         (24.6, 41.0)]
TRAIL_E = [(27.0, 30.0), (33.0, 30.0), (39.0, 26.0), (42.0, 20.5)]       # to the ice caves
TRAIL_N = [(25.6, 24.6), (30.0, 18.0), (30.0, 12.0), (27.6, 9.6)]         # to the monastery stair


def trail_d(x, r):
    return I.path_dist([TRAIL, TRAIL_E, TRAIL_N], x, r) + 0.12 * I.n2(x, r, 1.9, 7)


def height(x, r):
    h = 0.0
    h += 1.2 * sm(14.0, 2.0, x) * sm(4.0, 16.0, r)                    # the west slopes rising
    h += 0.6 * sm(42.0, 50.0, x)                                       # the east bank under the glacier
    n = I.n2(x * 0.5, r * 0.8, 1.0, 91) * 0.6 + I.n2(x * 1.2, r * 1.6, 1.0, 93) * 0.4
    h += max(0.0, n) * 0.18 * (1 - warmth(x, r)) * sm(0.5, 1.5, trail_d(x, r))
    h -= 0.18 * sm(0.7, 0.2, stream_d(x, r))                           # the stream's bed
    cold = 1 - sm(0.25, 0.5, warmth(x, r))
    h += 0.32 * cold * max(0.0, I.n2(x * 0.35, r * 0.9, 1.0, 95)) * sm(0.6, 1.6, trail_d(x, r))   # wind-carved drifts
    h += 0.9 * sm(11.0, 8.0, r) * (0.6 + 0.4 * I.n2(x * 0.7, r, 1.0, 97))  # scree fanning out at the cliff's foot
    return h


def material(x, r):
    if stream_d(x, r) < 0.25:
        return 'stream_bed'
    t = trail_d(x, r)
    w = warmth(x, r) + 0.18 * I.n2(x * 1.3, r * 1.3, 1.0, 17) + 0.08 * I.n2(x * 4.1, r * 4.1, 1.0, 19)
    if r < 10.0 and w < 0.4 and I.n2(x * 1.7, r * 2.2, 1.0, 23) > 0.1 - 0.12 * (10.0 - r):
        return 'scree'
    if t < 0.45:
        return 'path' if w > 0.45 else 'trodden'
    if w > 0.62:
        return 'grass'
    if w > 0.5:
        return 'moss'
    if w > 0.36:
        return 'thaw'
    return 'snow'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, ROWS + 1)]
I.ground(k, cells, material, {'snow': (N.SNOW, 0.04), 'thaw': ('#c8d0c4', 0.08), 'moss': ('#5a7a42', 0.14), 'grass': ('#4a7a3a', 0.12),
                              'path': ('#8a7a5e', 0.12), 'trodden': (N.PACKED, 0.06), 'stream_bed': ('#6a6a5a', 0.12),
                              'scree': ('#8a8c94', 0.2)},
         step=0.25 if QUICK else 0.125, bump=0.012, seed=61, height=height, dither=0.08)
# the grass and moss grow over the warm ground (the meadow's tufts, flowers where it's warmest)
warm_cells = [(c, r) for c in range(COLS) for r in range(ROWS) if warmth(c + 0.5, r + 0.5) > 0.55 and stream_d(c + 0.5, r + 0.5) > 0.6]
I.tufts(k, warm_cells, '#4a7a3a', per_cell=0.6 if QUICK else 1.4, avoid=lambda x, r: trail_d(x, r) < 0.6 or stream_d(x, r) < 0.5, flowers=0.5)
# snow patches lying on in the thaw, moss on the rocks
for _ in range(120 if not QUICK else 40):
    x, r = k.rng.uniform(8, 44), k.rng.uniform(10, 44)
    w = warmth(x, r)
    if 0.3 < w < 0.6 and trail_d(x, r) > 0.8 and stream_d(x, r) > 0.8:
        k.blob(x, r, height(x, r), k.rng.uniform(0.3, 0.7), k.rng.uniform(0.2, 0.4), 0.04, (N.SNOW, 0.04), 'snow_patch', segs=9)

# ---- the stream, out of the springs and away south ------------------------------------------------------------------------
pts = []
for (ax, ar), (bx, br) in zip(STREAM, STREAM[1:]):
    for i in range(8):
        t = i / 8
        pts.append((ax + (bx - ax) * t, ar + (br - ar) * t))
pts.append(STREAM[-1])
for (ax, ar), (bx, br) in zip(pts, pts[1:]):
    z = min(height(ax, ar), height(bx, br)) + 0.05
    L = math.hypot(bx - ax, br - ar)
    nx, nr = -(br - ar) / L, (bx - ax) / L
    w = 0.3
    k.quads([((ax - nx * w, ar - nr * w, z), (bx - nx * w, br - nr * w, z), (bx + nx * w, br + nr * w, z), (ax + nx * w, ar + nr * w, z))],
            ('#3a8a9a', 0.04), 'stream_water')
for (x, r) in pts[::3]:                                                 # stones along its banks
    for s_ in (-1, 1):
        if k.rng.random() < 0.6:
            sx = x + s_ * k.rng.uniform(0.35, 0.55)
            k.rock(sx, r, height(sx, r) + 0.05, 0.1, 0.08, 0.07, ('#7a7a72', 0.18), part='stone', segs=6)

# ---- the hot springs -----------------------------------------------------------------------------------------------------
STEAM, POOLS = [], []
for i, (x, r, n) in enumerate(SPRINGS):
    st, pl = A.spring_terraces(k, x, r, steps=n, w=2.8 if i == 0 else 2.2, d=1.05, z0=height(x, r + n) - 0.04, seed=i)
    STEAM += st
    POOLS += pl
    for (px_, pr_, rx, ry) in pl:
        k.solid(px_ - rx * 0.8, pr_ - ry * 0.8, px_ + rx * 0.8, pr_ + ry * 0.8)

# ---- the chortens, the prayer wheels, flags ---------------------------------------------------------------------------------
CH = [(18.0, 19.6, 0.9), (31.0, 28.6, 1.0), (14.0, 33.0, 0.8), (36.6, 16.4, 0.8)]
tops = []
for (x, r, s) in CH:
    tops.append(A.chorten(k, x, r, s=s, z0=height(x, r)))
A.mani_flags(k, tops[0], (22.0, 21.4, 1.6), sag=0.4)
A.mani_flags(k, tops[1], (27.6, 26.8, 1.8), sag=0.45)
A.mani_flags(k, (27.6, 26.8, 1.8), (30.0, 23.6, 2.2), sag=0.3)
for (x, r, h) in ((22.0, 21.4, 1.7), (27.6, 26.8, 1.9), (30.0, 23.6, 2.3)):
    k.cyl(x, r, height(x, r), height(x, r) + h, 0.03, ('#6a4a2a', 0.1), 'flagpole', verts=6)
    k.solid_post(x, r)
A.prayer_wheels(k, 29.2, 33.6, 34.2)

# ---- the boulders: mossy where it's warm, snowy where it isn't; the yetis' place in the south-west -------------------------
BOULDERS = [(10.0, 36.0, 0.9), (6.6, 38.4, 1.1), (12.6, 39.2, 0.8), (4.4, 34.0, 0.7), (8.4, 41.6, 0.9), (3.6, 40.6, 0.6),
            (16.2, 27.6, 0.5), (34.2, 36.4, 0.6), (39.6, 32.6, 0.55), (19.4, 39.0, 0.5), (36.0, 41.0, 0.6), (11.4, 30.6, 0.5)]
for (x, r, s) in BOULDERS:
    z = height(x, r)
    k.rock(x, r, z + s * 0.35, s, s * 0.85, s * 0.7, ('#6a6c74', 0.18), part='boulder', segs=9)
    w = warmth(x, r)
    if w > 0.35:
        with k.foliage('needle'):
            k.blob(x - s * 0.1, r - s * 0.1, z + s * 0.75, s * 0.7, s * 0.6, s * 0.22, (A.MOSS[1], 0.18), 'moss_cap', segs=9)
    else:
        k.blob(x - s * 0.1, r - s * 0.1, z + s * 0.75, s * 0.75, s * 0.65, s * 0.26, (N.ROOF_SNOW, 0.06), 'boulder_snow', segs=9)
    k.solid(x - s * 0.8, r - s * 0.6, x + s * 0.8, r + s * 0.6)
# the yetis' den: an overhang of rock with a hollow under it, berries left on a flat stone
den = [(c, r) for c in range(0, 7) for r in range(28, 34)]
I.ridge(k, den, top=2.4, slope=1.2, seed=97, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'), moss=N.ROOF_SNOW, foot=0.5,
        patchy=False, notches=[(3.4, 32.0, 5.6, 34.0)])
k.box(3.5, 32.4, 0.0, 5.5, 33.4, 0.9, '#0c0e14', 'den_dark')
k.box(6.6, 34.6, 0.0, 7.4, 35.2, 0.18, ('#7a7a72', 0.12), 'stone', bevel=0.03)
for i in range(7):
    k.sphere(6.75 + (i % 4) * 0.17, 34.75 + (i // 4) * 0.2, 0.22, 0.05, 0.05, ('#8a1a3a', 0.08), 'berries', segs=6)

# ---- the outer slopes: crags through the snow, drifts in their lee, sastrugi; the scree's stones; juniper in the thaw ----------
CRAGS = [(15.0, 11.2, 0.7), (38.0, 11.6, 0.8), (44.0, 26.0, 0.6), (16.0, 36.0, 0.5), (14.0, 44.0, 0.5), (40.0, 44.0, 0.7), (33.0, 10.6, 0.5)]
for (x, r, s) in CRAGS:
    z = height(x, r)
    for j in range(3):
        k.rock(x + (j - 1) * s * 0.7, r + k.rng.uniform(-0.2, 0.2), z + s * 0.3, s * k.rng.uniform(0.5, 0.8), s * 0.5, s * k.rng.uniform(0.6, 1.0),
               ('#585c68', 0.2), part='crag', segs=7)
    k.blob(x, r - 0.1, z + s * 0.95, s * 1.1, s * 0.5, s * 0.16, (N.ROOF_SNOW, 0.05), 'crag_snow', segs=9)
    k.blob(x + s * 1.3, r + 0.3, z, s * 1.0, s * 0.4, s * 0.2, (N.SNOW, 0.04), 'drift', segs=9)
    k.solid(x - s * 1.2, r - s * 0.5, x + s * 1.2, r + s * 0.5)
for _ in range(70 if not QUICK else 35):
    x, r = k.rng.uniform(1, 51), k.rng.uniform(9, 45)
    if warmth(x, r) < 0.2 and trail_d(x, r) > 1.0:
        k.blob(x, r, height(x, r), k.rng.uniform(0.5, 1.1), 0.07, 0.03, ('#dce6f2', 0.03), 'drift', rot=(0, 0, k.rng.uniform(-12, 12)), segs=8)
for _ in range(160 if not QUICK else 80):                               # scree stones
    x, r = k.rng.uniform(0, 52), k.rng.uniform(7.6, 10.4)
    if material(x, r) == 'scree' and not (23.0 < x < 31.0):
        s = k.rng.uniform(0.08, 0.22)
        k.rock(x, r, height(x, r) + s * 0.3, s, s * 0.8, s * 0.6, (shade('#7a7c86', k.rng.uniform(0.85, 1.1)), 0.2), part='stone', segs=6)
for _ in range(60 if not QUICK else 30):                                # juniper: low dark mats where the snow gives out
    x, r = k.rng.uniform(8, 44), k.rng.uniform(12, 44)
    w = warmth(x, r)
    if 0.3 < w < 0.7 and trail_d(x, r) > 0.9 and stream_d(x, r) > 0.9 and all(math.hypot(x - px, r - pr) > 2.2 for (px, pr, n) in SPRINGS):
        with k.foliage('needle'):
            for j in range(k.rng.randint(3, 6)):
                k.blob(x + k.rng.uniform(-0.35, 0.35), r + k.rng.uniform(-0.25, 0.25), height(x, r) + 0.08, k.rng.uniform(0.18, 0.3),
                       k.rng.uniform(0.14, 0.24), 0.12, (shade('#2e4a34', k.rng.uniform(0.85, 1.2)), 0.18), 'juniper', segs=7)
# a mani wall beside the path to the stair: a long low wall of carved stones, each one a prayer
for i in range(14):
    t = i / 13
    x, r = 27.6 + (30.6 - 27.6) * t, 23.6 + (17.6 - 23.6) * t
    z = height(x, r)
    k.box(x - 0.24, r - 0.2, z, x + 0.24, r + 0.2, z + 0.42, (shade('#8a8478', k.rng.uniform(0.9, 1.08)), 0.18), 'mani_wall', bevel=0.03)
    k.box(x - 0.2, r + 0.2, z + 0.12, x + 0.2, r + 0.22, z + 0.36, (k.rng.choice(('#b0a890', '#9aa6a8', '#a89a84')), 0.15), 'mani_stone')
    k.box(x - 0.25, r - 0.21, z + 0.42, x + 0.25, r + 0.21, z + 0.5, (N.ROOF_SNOW, 0.05), 'mani_snow')
    k.solid(x - 0.2, r - 0.2, x + 0.2, r + 0.2)


# ---- trees: larches on the west slopes, pines on the east, a few birches by the warm water ---------------------------------
def larch(x, r, h):
    """A larch: a slim leaning trunk, airy whorls of soft needles in tufts along drooping boughs (deciduous — they go gold
    in autumn, so they're leaves, not needles), snow caught in them."""
    z0 = height(x, r)
    lean = k.rng.uniform(-0.08, 0.08)
    k.tube((x, r, z0), (x + lean, r, z0 + h), 0.06, ('#5a3a24', 0.12), 'trunk', rb=0.015, verts=6)
    green = k.rng.choice(('#7a9a4a', '#6a8e44', '#88a452'))
    with k.foliage('leaf'):
        n = 7
        for i in range(n):
            t = i / n
            zz = z0 + 0.35 + t * (h - 0.5)
            rad = 0.6 * (1 - t * 0.8) + 0.08
            for j in range(5):                                              # tufts round each whorl, drooping at their tips
                a = j / 5 * math.tau + i * 0.9
                bx, br = x + lean * t + math.cos(a) * rad, r + math.sin(a) * rad * 0.8
                k.blob(bx, br, zz - 0.05, rad * 0.45, rad * 0.35, 0.12, (shade(green, k.rng.uniform(0.85, 1.12)), 0.18), 'larch', segs=7)
            k.blob(x + lean * t, r, zz, rad * 0.55, rad * 0.45, 0.14, (shade(green, 0.8), 0.18), 'larch', segs=7)
    if warmth(x, r) > 0.35:
        return
    for i in range(0, 7, 2):
        t = i / 7
        zz = z0 + 0.35 + t * (h - 0.5)
        rad = 0.6 * (1 - t * 0.8) + 0.08
        k.blob(x - rad * 0.25, r - 0.05, zz + 0.1, rad * 0.5, rad * 0.4, 0.05, (N.ROOF_SNOW, 0.08), 'larch_snow', segs=7)


TREES = []
for (x, r) in ((2.0, 12.0), (4.4, 14.8), (1.6, 17.6), (7.4, 18.6), (3.0, 21.8), (9.6, 22.4), (5.8, 24.6), (12.4, 21.0), (1.4, 25.8),
               (8.0, 9.6), (10.6, 12.6), (14.6, 14.0), (2.6, 8.0), (6.0, 16.4), (11.0, 17.2), (3.0, 26.6), (13.4, 25.0), (16.8, 16.6),
               (0.8, 20.0), (9.0, 27.0)):
    larch(x, r, k.rng.uniform(2.4, 3.4))
    TREES.append((x, r))
for (x, r) in ((46.0, 30.0), (48.6, 33.4), (44.4, 35.2), (49.4, 38.4), (46.8, 41.8), (42.0, 40.4), (50.0, 27.0), (40.8, 37.6), (44.0, 44.0), (50.6, 44.6), (47.6, 25.2),
               (43.0, 38.6)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.3, 3.0))
    TREES.append((x, r))
for (x, r) in ((22.4, 33.8), (29.6, 37.6), (18.0, 30.4), (31.4, 19.4)):
    with k.foliage('leaf'):
        W.leafy_crown(k, x, r, height(x, r) + 1.6, 0.55, 0.45, 0.6, '#5a8a3a', n=18)
    k.tube((x, r, height(x, r)), (x + 0.05, r, height(x, r) + 1.4), 0.06, ('#e8e4dc', 0.1), 'birch_trunk', rb=0.04, verts=6)
    TREES.append((x, r))
for (x, r) in TREES:
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- the valley's head: the cliff, and the monastery on it -------------------------------------------------------------------
head = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, 8)]
H = I.ridge(k, head, top=6.2, slope=1.6, seed=101, rock='#c8ced8', strata=('#6a6e7c', '#565a68', '#7a7e8c'), moss=N.ROOF_SNOW, foot=0.8,
            patchy=False)
far = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, -4)]
I.ridge(k, far, top=11.0, slope=2.8, seed=103, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'), moss=N.ROOF_SNOW, foot=0.9,
        patchy=False)
ZM = H(22.0, 1.0)                                                      # the clifftop the monastery stands on
A.gompa(k, 16.0, 21.6, -1.2, 2.6, h=2.6, z0=ZM - 0.1, windows=3)
A.gompa(k, 21.6, 28.4, -2.2, 2.2, h=3.6, z0=ZM - 0.1, windows=4, roof='gold', door=25.0)
A.gompa(k, 28.4, 33.0, -1.0, 2.8, h=2.2, z0=ZM - 0.1, windows=3)
A.gompa(k, 33.0, 36.4, 0.2, 3.0, h=1.6, z0=ZM - 0.1, windows=2)
A.mani_flags(k, (16.0, 2.6, ZM + 2.4), (13.0, 4.0, ZM + 0.4), sag=0.5)
A.mani_flags(k, (36.4, 3.0, ZM + 1.4), (39.0, 4.6, ZM + 0.2), sag=0.4)
A.chorten(k, 38.6, 2.0, s=0.7, z0=H(38.6, 2.0) - 0.05)
# the stair down the cliff: zigzag flights of stone steps cut into the face, a rail of rope
STAIR = [(25.0, 3.0, ZM), (28.6, 5.0, ZM * 0.66), (25.4, 6.8, ZM * 0.33), (27.6, 8.6, 0.0)]
for (ax, ar, az), (bx, br, bz) in zip(STAIR, STAIR[1:]):
    n = 10
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        x, r, z = ax + (bx - ax) * t0, ar + (br - ar) * t0, az + (bz - az) * t0
        k.box(x - 0.32, r - 0.22, z - 0.1, x + 0.32, r + 0.22, z + 0.02, ('#a8a094', 0.12), 'stair_step', bevel=0.02)
        k.box(x - 0.3, r - 0.2, z + 0.02, x + 0.3, r + 0.2, z + 0.04, (N.ROOF_SNOW, 0.05), 'stair_snow')
    k.tube((ax + 0.35, ar + 0.2, az + 0.5), (bx + 0.35, br + 0.2, bz + 0.5), 0.015, ('#a88a50', 0.1), 'rope', verts=4)
k.solid(23.6, 0, 30.4, 8.6)

# ---- the glacier's tongue in the east, and the mouth of the ice caves -------------------------------------------------------
tongue = [(c, r) for c in range(40, COLS + 1) for r in range(-10, 26) if r < 21 + 0.4 * (c - 46)]
I.ridge(k, tongue, top=3.6, slope=1.4, seed=107, rock='#e2ecf6', strata=('#8ab8d8', '#6a9ac0', '#a8d0e8'), moss=N.ROOF_SNOW, foot=0.5,
        patchy=False, notches=[(42.6, 17.4, 44.6, 20.0)])
k.box(42.7, 17.6, 0.0, 44.5, 18.0, 1.5, ('#0e2a4a', 0.1), 'cave_glow', emit=('#4aa8e8', 0.7))
for s_ in (-1, 1):
    k.blob(43.6 + s_ * 1.0, 18.6, 0.6, 0.35, 0.4, 0.8, ('#bcdcef', 0.06), 'ice_pillar', segs=8)
for i in range(7):
    x = 42.8 + i * 0.27
    k.cone(x, 18.4, 1.25 - 0.2 * abs(math.sin(i * 1.7)), 1.6, 0.04, 0.005, (N.ICE, 0.05), 'icicle', verts=5)
k.point_light(43.6, 19.4, 0.6, '#6ab8f0', 12, radius=0.3, group='static')
for (c, r) in tongue:
    if 0 <= c < COLS and 0 <= r < ROWS and not (42 <= c <= 44 and 17 <= r <= 19):
        k.solid(c, r, c + 1, r + 1)

# ---- the herders' shelter on the south edge -----------------------------------------------------------------------------------
SX0, SX1, SR0, SR1 = 20.6, 25.4, 41.6, 44.0
k.box(SX0, SR0, 0.0, SX1, SR1, 1.3, ('#8a8478', 0.18), 'hut_wall')
A.ashlar(k, SX0, SX1, SR1, 0.0, 1.3, '#9a9488', course=0.22, block=(0.25, 0.5))
k.quads([((SX0 - 0.3, SR1 + 0.3, 1.3), (SX1 + 0.3, SR1 + 0.3, 1.3), (SX1 + 0.3, (SR0 + SR1) / 2, 1.9), (SX0 - 0.3, (SR0 + SR1) / 2, 1.9))],
        ('#6a5a48', 0.12), 'roof_slate')
k.quads([((SX0 - 0.3, (SR0 + SR1) / 2, 1.9), (SX1 + 0.3, (SR0 + SR1) / 2, 1.9), (SX1 + 0.3, SR0 - 0.3, 1.3), (SX0 - 0.3, SR0 - 0.3, 1.3))],
        ('#5a4a3a', 0.12), 'roof_slate')
k.box(22.6, SR1 - 0.02, 0.0, 23.4, SR1 + 0.02, 0.9, '#2a1a10', 'doorway', emit=('#ff9a40', 0.4))
k.cyl(24.6, 42.4, 1.4, 2.3, 0.06, (N.IRON, 0.1), 'stovepipe', verts=8)
SMOKE = [screen(24.6, 42.4, 2.4)]
A.fire_pit(k, 18.6, 42.6, rad=0.45)
k.solid(SX0, SR0, SX1, SR1)

# ---- the edges -----------------------------------------------------------------------------------------------------------------
k.solid(-1, -10, COLS + 1, 8)                                           # the cliff
k.solid(-1, 0, 0, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(-1, ROWS - 1, COLS + 1, ROWS + 1)
for (x, r) in pts:                                                      # the stream: step over it at the stones only
    if not (abs(r - 30.0) < 0.6 or abs(r - 37.0) < 0.6):
        k.blocked.add((int(x), int(r)))

A.flush(k)
k.sun((0.8, 0.25, -0.38), '#ffe0c0', 3.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 64, world_light=('#8a96cc', 0.95))

# ---- the world -----------------------------------------------------------------------------------------------------------------
VALLEY = {
    'spawns': [['wolf', 6, 12, 0], ['wolf', 8, 13, 0], ['wolf', 11, 16, 0], ['wolf', 4, 20, 1], ['wolf', 7, 22, 1], ['wolf', 10, 24, 1],
               ['wolf', 40, 31, 2], ['wolf', 43, 34, 2]],
    'yetis': [[6, 36], [9, 39]],
}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hidden Valley', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [5, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 0.6, 'view': [0.0, -7.5, COLS, ROWS], 'valley': VALLEY,
          'onFaint': {'world': WID, 'spawn': [23, 44], 'who': 'A YETI',
                      'line': 'YOU COME ROUND BY THE SHELTER\'S FIRE, A SMELL OF WET FUR AND BERRIES. BIG FOOTPRINTS LEAD AWAY INTO THE SNOW. SOMETHING CARRIED YOU HERE.'}})
w['interactions'] = [
    {'x': 4, 'y': 8, 'type': 'vale', 'label': 'THE WAY OUT', 'prompt': 'PRESS E TO GO BACK'},
    {'x': 23, 'y': 44, 'type': 'vale', 'label': 'THE SHELTER', 'prompt': 'PRESS E TO REST'},
    {'x': 18, 'y': 43, 'type': 'vale', 'label': 'FIRE', 'prompt': 'PRESS E TO WARM UP'},
    {'x': 31, 'y': 34, 'type': 'vale', 'label': 'PRAYER WHEELS', 'prompt': 'PRESS E TO TURN THEM'},
    {'x': 43, 'y': 20, 'type': 'enter_world', 'label': 'THE ICE CAVES', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-caves', 'spawn': [6, 26]},
    {'x': 27, 'y': 9, 'type': 'enter_world', 'label': 'THE MONASTERY STAIR', 'prompt': 'PRESS E TO CLIMB', 'target': 'hoarfell-monastery', 'spawn': [22, 33]},
    {'x': 7, 'y': 35, 'type': 'dialog', 'label': 'FLAT STONE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A FLAT STONE BY THE BOULDERS, BERRIES LAID OUT ON IT IN A NEAT ROW. SOMEBODY WITH VERY BIG HANDS WAS VERY CAREFUL.'},
] + [{'x': int(px_), 'y': int(pr_ + ry + 0.6), 'type': 'vale', 'label': 'HOT SPRING', 'prompt': 'PRESS E TO BATHE'} for (px_, pr_, rx, ry) in POOLS[::2]] + [
    {'x': int(x), 'y': int(r + 0.9), 'type': 'vale', 'label': 'CHORTEN', 'prompt': 'PRESS E TO LOOK'} for (x, r, s) in CH]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, scene_extra={'smoke': SMOKE, 'steam': STEAM})
print('valley done')
