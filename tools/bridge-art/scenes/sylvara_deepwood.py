"""Sylvara — the Deepwood, the old wood beyond the glade. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_deepwood.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-deepwood

Older than the city, darker under the giants, and full of wonders (not menace — it's Sylvara). The Deep Run comes in
from the west, slow and dark, and ends in a pool ringed with stones where the lantern frogs sing (you can paddle in from
the Silverrun's fork and land there). North-east, under the oldest trees, the glowing grove: mushrooms taller than you
glowing cyan and violet from under their caps, spores drifting, owlmoss on the fallen logs, dreamcaps in the roots, a
carved box grown half into the roots of the heart oak. South, where a giant fell long ago and let the sun in, a
flowering meadow in drifts of colour, windthistles nodding; at its edge the Mossback, a tortoise as big as a cottage,
asleep so long a tree grows on its shell. In a hollow trunk to the south-west lives Sorrel, who forages here. Lit by
day with Sylvara's dusk; the grove glows at night.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_sylvan as A
import assets_sylvara_rich as R                    # noqa: E402                          # noqa: E402
import assets_town as W                            # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'sylvara-deepwood'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 52, 38
k = Kit(COLS, ROWS, margin_top=3.4, margin_bottom=0.8, seed=10331)
rng = k.rng
WZ = -0.3

RUN = A.spline([(-3.0, 16.2), (2.0, 16.4), (6.0, 15.6), (9.6, 16.6), (12.2, 17.0)], 6)
POOL = (13.6, 17.2, 2.0, 1.5)
GROVE = (38.0, 10.0, 11.0, 6.5)                                  # the glowing grove: centre, half-width, half-depth
MEADOW = (24.0, 27.0, 10.0, 6.0)
MOSSBACK = (40.0, 26.0)
HOLLOW = (6.0, 29.0, 1.9)                                        # Sorrel's hollow trunk


def in_pool(x, r):
    return ((x - POOL[0]) / POOL[2]) ** 2 + ((r - POOL[1]) / POOL[3]) ** 2 < 1.0


def wet(x, r, pad=0.0):
    return A.line_dist(x, r, RUN) < 1.05 + pad or ((x - POOL[0]) / (POOL[2] + pad)) ** 2 + ((r - POOL[1]) / (POOL[3] + pad)) ** 2 < 1.0


def in_meadow(x, r):
    return ((x - MEADOW[0]) / MEADOW[2]) ** 2 + ((r - MEADOW[1]) / MEADOW[3]) ** 2 < 1.0


def in_grove(x, r):
    return ((x - GROVE[0]) / GROVE[2]) ** 2 + ((r - GROVE[1]) / GROVE[3]) ** 2 < 1.0


def zfn(x, r):
    base = 0.12 + 0.22 * (A.noise(x, r, 0.35, 3) - 0.5) + 0.06 * (A.noise(x, r, 1.5, 4) - 0.5)
    for (tx, tr, rad, _h) in GIANTS:
        d = math.hypot(x - tx, (r - tr) * 1.1)
        base += 0.3 * math.exp(-(d / (rad + 1.2)) ** 2)
    if wet(x, r, 0.8):
        d = min(A.line_dist(x, r, RUN) - 1.05, 0.0 if in_pool(x, r) else 9)
        if in_pool(x, r):
            d = -1.0
        bed = WZ - 0.35
        return bed + (base - bed) * A.smooth(-0.5, 0.75, d)
    return base


GIANTS = [(30.0, 4.6, 2.0, 8.0), (44.0, 6.0, 2.2, 8.4), (47.0, 16.0, 1.8, 7.6), (34.0, 15.4, 1.5, 7.2), (6.0, 6.0, 1.8, 7.6),
          (16.0, 5.0, 1.6, 7.4), (2.0, 23.0, 1.4, 6.8), (49.0, 30.0, 1.6, 7.0)]
HEART = GIANTS[3]                                                # the heart oak, its cache in the roots
PATHS = {
    'north': [(-1.5, 13.4), (4.0, 12.6), (10.0, 12.0), (18.0, 11.6), (25.0, 12.6), (31.0, 10.0), (37.0, 10.6)],
    'south': [(-1.5, 18.8), (5.0, 19.6), (10.0, 20.0), (15.0, 21.6), (20.0, 24.6)],
    'hollow': [(5.0, 19.6), (6.4, 24.0), (6.4, 26.6)],
    'mead': [(20.0, 24.6), (28.0, 26.4), (35.0, 26.0)],
    'link': [(18.0, 11.6), (19.0, 17.0), (20.0, 24.6)],
}
PL = {k_: A.spline(v, 5) for k_, v in PATHS.items()}


def path_d(x, r):
    return min(A.line_dist(x, r, p) for p in PL.values())


def mat(x, r):
    jit = 0.12 * (A.noise(x, r, 3.0, 5) - 0.5)
    if wet(x, r, -0.15):
        return 'bed'
    if wet(x, r, 0.35 + jit):
        n = A.noise(x, r, 4.0, 6)
        return 'pebble' if n > 0.6 else 'mud' if n < 0.35 else 'bank'
    if path_d(x, r) < 0.5 + jit:
        return 'path'
    if in_meadow(x, r):
        return 'meadow'
    if in_grove(x, r):
        return 'deep_moss' if A.noise(x, r, 0.9, 8) > 0.4 else 'gloom'
    n = A.noise(x, r, 0.8, 7)
    return 'litter' if n > 0.72 else 'moss_dark' if n < 0.38 else 'moss'


L = A.Land(k, zfn, mat, alb={'meadow': ('#6e9a46', 0.3)})
L.field(-1.5, -3.5, COLS + 1.5, ROWS + 1.5, 0.125)
A.water(k, -1.5, -3.5, COLS + 1.5, ROWS + 1.5, lambda x, r: wet(x, r, 0.5), WZ, part='pond_water', tone='#2a5a6a')

# ---- the giants, the heart oak's cache ---------------------------------------------------------------------------------
crowns = []
for i, (x, r, rad, h) in enumerate(GIANTS):
    crowns.append(A.old_tree(k, L, x, r, rad, h, seed=130 + i))
hx, hr, hrad, _ = HEART
cbx, cbr = hx + 0.6, hr + hrad + 0.6
k.box(cbx - 0.3, cbr - 0.2, L.z(cbx, cbr) - 0.05, cbx + 0.3, cbr + 0.2, L.z(cbx, cbr) + 0.3, (shade(A.ELFWOOD, 0.8), 0.3), 'chest')
k.blob(cbx, cbr, L.z(cbx, cbr) + 0.33, 0.34, 0.24, 0.06, (A.MOSS_L, 0.4), 'chest_moss', segs=8)
k.tube((cbx - 0.6, cbr - 0.4, L.z(cbx, cbr) + 0.4), (cbx + 0.5, cbr + 0.3, L.z(cbx, cbr) - 0.05), 0.12, (A.BARK, 0.3), 'root', rb=0.06, verts=8)
k.solid(cbx - 0.35, cbr - 0.25, cbx + 0.35, cbr + 0.25)

# ---- the glowing grove: giant mushrooms, clusters, spores, owlmoss on logs ----------------------------------------------
GLOWS = ('#86f2d6', '#a8d8ff', '#e0b0ff', '#86f2d6', '#c8a8ff')
for (x, r, h, cap) in ((33.0, 8.6, 1.6, 0.8), (36.4, 11.0, 1.2, 0.6), (40.4, 9.2, 1.9, 0.95), (42.4, 12.4, 1.3, 0.65), (38.0, 6.6, 1.1, 0.55),
                       (45.4, 10.2, 1.5, 0.7), (31.0, 12.6, 1.0, 0.5), (39.6, 14.4, 0.9, 0.45)):
    if path_d(x, r) > 0.9:
        A.giant_mushroom(k, L, x, r, h=h, cap=cap, col=rng.choice(GLOWS), light=6.0)
for _ in range(26):
    x, r = rng.uniform(GROVE[0] - GROVE[2], GROVE[0] + GROVE[2]), rng.uniform(GROVE[1] - GROVE[3], GROVE[1] + GROVE[3])
    if in_grove(x, r) and path_d(x, r) > 0.8 and (int(x), int(r)) not in k.blocked:
        A.mushroom_ring(k, L, x, r, n=rng.randint(4, 7), glow=True, col=rng.choice(GLOWS), size=rng.uniform(1.0, 1.6), light=1.5)
for _ in range(50):
    x, r = rng.uniform(GROVE[0] - GROVE[2], GROVE[0] + GROVE[2]), rng.uniform(GROVE[1] - GROVE[3], GROVE[1] + GROVE[3])
    if in_grove(x, r):
        A.glow_spores(k, L, x, r, n=rng.randint(3, 7), spread=0.5, col=rng.choice(GLOWS))
A.log(k, L, 34.0, 37.0, 13.0, 0.3, seed=7)
A.log(k, L, 41.0, 44.2, 7.8, 0.26, seed=9)
for (x0, x1, r) in ((34.0, 37.0, 13.0), (41.0, 44.2, 7.8)):
    for _ in range(8):
        x = rng.uniform(x0 + 0.2, x1 - 0.2)
        k.blob(x, r + 0.05, L.z(x, r) + 0.52, 0.16, 0.1, 0.04, ('#3a6a3a', 0.35), 'owlmoss', emit=('#a8f0c8', 0.4), segs=8)

# ---- the pool where the Run ends: stones round it, a landing, lantern frogs (js/worlds/sylvara.js) -----------------------------
px_, pr_, pw, ph = POOL
for i in range(16):
    a = i / 16 * math.tau
    if abs(math.cos(a) + 1) < 0.25:                              # the Run comes in from the west
        continue
    x, r = px_ + math.cos(a) * (pw + 0.15), pr_ + math.sin(a) * (ph + 0.12)
    s = rng.uniform(0.15, 0.3)
    k.rock(x, r, L.z(x, r) + 0.05, s, s * 0.8, s * 0.55, (shade('#7a786a', rng.uniform(0.85, 1.1)), 0.3), part='pool_stone', segs=8)
with k.foliage('leaf'):
    for _ in range(14):
        a, d = rng.uniform(0, math.tau), rng.uniform(0.3, 0.85)
        x, r = px_ + math.cos(a) * pw * d, pr_ + math.sin(a) * ph * d
        s = rng.uniform(0.1, 0.18)
        k.cyl(x, r, WZ + 0.005, WZ + 0.015, s, (shade('#3e7a32', rng.uniform(0.85, 1.15)), 0.3), 'lily_pad', verts=12)
LANDING = (px_ + 0.4, pr_ + ph - 0.2, px_ + 2.2, pr_ + ph + 1.2)
A.deck(k, *LANDING, z=0.05)
for i in range(0, len(RUN) - 1, 2):
    x, r = RUN[i]
    for side in (-1, 1):
        if rng.random() < 0.55:
            A.reeds(k, L, x, r + side * 1.3, n=rng.randint(4, 8))

# ---- the meadow: drifts of flowers, windthistles, butterflies (the js), a fallen giant's stump ---------------------------------
mx, mr, mw, mh = MEADOW
for _ in range(46):
    x, r = rng.uniform(mx - mw, mx + mw), rng.uniform(mr - mh, mr + mh)
    if not in_meadow(x, r) or path_d(x, r) < 0.7:
        continue
    col = rng.choice(('#a878d8', '#f0d070', '#f0f0f0', '#f0a0b8', '#e88a5a', '#a878d8', '#c8e8f8'))
    A.flowers(k, L, x - 0.8, r - 0.6, x + 0.8, r + 0.6, 22, ok=lambda xx, rr: in_meadow(xx, rr) and path_d(xx, rr) > 0.6, cols=(col,))
for _ in range(14):                                              # windthistles: tall violet heads on grey stems
    x, r = rng.uniform(mx - mw, mx + mw), rng.uniform(mr - mh, mr + mh)
    if not in_meadow(x, r) or path_d(x, r) < 0.8:
        continue
    z0 = L.z(x, r)
    for j in range(rng.randint(2, 4)):
        xx, rr = x + rng.uniform(-0.2, 0.2), r + rng.uniform(-0.15, 0.15)
        h = rng.uniform(0.4, 0.65)
        k.tube((xx, rr, z0), (xx + rng.uniform(-0.04, 0.04), rr, z0 + h), 0.015, ('#7a8a6a', 0.25), 'thistle_stem', verts=4)
        k.sphere(xx, rr, z0 + h, 0.07, 0.07, ('#a878d8', 0.25), 'thistle_head', segs=8)
        k.sphere(xx, rr, z0 + h + 0.06, 0.05, 0.04, ('#e8e0f0', 0.25), 'thistle_down', segs=6)
sx_, sr_ = mx - 3.0, mr - 2.0                                    # the stump of the giant that fell
z0 = L.z(sx_, sr_)
k.cyl(sx_, sr_, z0 - 0.1, z0 + 0.55, 1.2, (A.BARK, 0.35), 'stump', verts=28, ry=1.1)
k.cyl(sx_, sr_, z0 + 0.55, z0 + 0.6, 1.1, ('#b89a70', 0.3), 'stump_top', verts=28, ry=1.0)
for rr in (0.85, 0.6, 0.35):
    W.annulus(k, sx_, sr_, rr - 0.02, rr, z0 + 0.6, z0 + 0.61, ('#8a6a48', 0.3), 'stump_ring', segs=24)
mushroom_cols = ('#d8a040', '#c8703a')
A.mushroom_ring(k, L, sx_ + 0.9, sr_ + 0.8, n=5, glow=False, cap='#c87a3a')
k.solid(sx_ - 1.2, sr_ - 1.0, sx_ + 1.2, sr_ + 1.0)

# ---- the Mossback: a tortoise as big as a cottage, asleep, a tree on its shell ------------------------------------------------
tx, tr = MOSSBACK
z0 = L.z(tx, tr)
k.blob(tx, tr, z0 + 0.7, 2.6, 1.9, 1.5, ('#5a5a3a', 0.4), 'mossback_shell', segs=24)
for i in range(14):                                              # the shell's plates, raised, mossy
    a = rng.uniform(0, math.tau)
    d = rng.uniform(0.3, 2.0)
    x, r = tx + math.cos(a) * d, tr + math.sin(a) * d * 0.7
    zz = z0 + 0.7 + 1.5 * math.sqrt(max(0.0, 1 - (d / 2.6) ** 2)) - 0.1
    k.blob(x, r, zz, 0.55, 0.45, 0.16, (shade('#6a6a44', rng.uniform(0.85, 1.12)), 0.4), 'mossback_plate', segs=8)
with k.foliage('leaf'):
    for _ in range(40):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0.0, 2.3)
        x, r = tx + math.cos(a) * d, tr + math.sin(a) * d * 0.7
        zz = z0 + 0.7 + 1.5 * math.sqrt(max(0.0, 1 - (d / 2.6) ** 2))
        k.blob(x, r, zz, 0.3, 0.24, 0.12, (shade(A.MOSS_L, rng.uniform(0.8, 1.15)), 0.4), 'mossback_moss', segs=8)
A.fern(k, L, tx - 1.0, tr - 0.2, s=0.6, z=z0 + 1.9)
A.fern(k, L, tx + 1.2, tr + 0.2, s=0.5, z=z0 + 1.8)
A.birch(k, A.Land(k, lambda x, r: z0 + 2.15, lambda x, r: None), tx + 0.2, tr - 0.3, h=2.6)
hx2, hr2 = tx - 2.7, tr + 0.9                                    # the head, resting on the grass, eyes shut
k.blob(hx2, hr2, z0 + 0.35, 0.6, 0.48, 0.42, ('#7a7a52', 0.35), 'mossback_head', segs=14)
k.blob(hx2 - 0.4, hr2 + 0.12, z0 + 0.32, 0.32, 0.3, 0.26, ('#7a7a52', 0.35), 'mossback_head', segs=12)
for sgn in (-1, 1):
    k.box(hx2 - 0.3 - 0.06, hr2 + 0.22 * sgn - 0.01, z0 + 0.48, hx2 - 0.3 + 0.06, hr2 + 0.22 * sgn + 0.01, z0 + 0.5, ('#2a2a1a', 0.3), 'mossback_eye')
for (dx, dr) in ((-1.6, 1.0), (1.6, 1.0), (-1.4, -1.1), (1.5, -1.0)):   # the legs, tucked
    k.blob(tx + dx, tr + dr, z0 + 0.2, 0.45, 0.35, 0.25, ('#7a7a52', 0.35), 'mossback_leg', segs=10)
k.solid(tx - 3.2, tr - 1.5, tx + 2.6, tr + 1.4)

# ---- Sorrel's hollow: a broken giant's trunk, a round door, a garden of herbs, a drying rack -----------------------------------
ox, orr, orad = HOLLOW
A.ancient_trunk(k, L, ox, orr, orad, 3.2, seed=77, ivy=4)
k.cyl(ox, orr, L.z(ox, orr) + 3.2, L.z(ox, orr) + 3.5, orad * 0.95, (shade(A.BARK, 0.7), 0.35), 'broken_top', verts=20)
for i in range(8):                                               # the broken top's jagged rim
    a = i / 8 * math.tau
    k.cone(ox + math.cos(a) * orad * 0.85, orr + math.sin(a) * orad * 0.8, L.z(ox, orr) + 3.4, L.z(ox, orr) + 3.4 + rng.uniform(0.3, 0.8), 0.25, 0.02, (A.BARK, 0.35), 'broken_top', verts=6)
A.trunk_front(k, L, ox, orr, orad, w=1.6, h=1.8, roof='#5a6a3a', roof2='#6a7a44', icon='leaf')
k.box(ox + 2.2, orr + 1.6, L.z(ox + 2.2, orr + 1.6), ox + 3.6, orr + 2.6, L.z(ox + 2.2, orr + 1.6) + 0.12, ('#4a3a28', 0.36), 'garden_bed')
for i in range(10):
    x, r = ox + 2.35 + (i % 5) * 0.28, orr + 1.85 + (i // 5) * 0.45
    k.blob(x, r, L.z(x, r) + 0.2, 0.12, 0.1, 0.12, (shade('#5a8a3a', rng.uniform(0.85, 1.15)), 0.3), 'herb_plant', segs=7)
k.solid(ox + 2.2, orr + 1.6, ox + 3.6, orr + 2.6)
A.staves_drying(k, L, ox - 2.2, orr + 2.2, n=4)
SORREL = (int(ox - 1), int(orr + orad + 1.4))

# ---- the rest of the wood ------------------------------------------------------------------------------------------------
def clear(x, r, pad=0.8):
    if wet(x, r, 0.7) or path_d(x, r) < pad:
        return False
    if (int(x), int(r)) in k.blocked:
        return False
    if math.hypot(x - tx, (r - tr) * 1.3) < 3.6 or math.hypot(x - ox, r - orr) < orad + 2.0:
        return False
    return True


for (x, r, h) in ((10.0, 9.0, 4.4), (24.0, 6.0, 4.6), (22.0, 15.0, 4.2), (12.6, 33.0, 4.4), (34.0, 34.6, 4.0), (44.0, 20.0, 4.4), (28.0, 18.0, 4.0),
                  (3.0, 35.0, 4.2), (45.0, 35.4, 4.0), (16.0, 24.0, 3.8)):
    if clear(x, r, 1.0) and not in_meadow(x, r):
        A.elf_oak(k, L, x, r, h=h, rad=0.36 + 0.04 * h, seed=int(x * 7 + r * 3))
for _ in range(170):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 0.8) and not in_meadow(x, r):
        A.fern(k, L, x, r, s=rng.uniform(0.5, 0.85), tone=rng.choice(('#3e7a32', '#4a8a3a', '#356e2e')))
for _ in range(36):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 1.0) and not in_meadow(x, r) and not in_grove(x, r):
        A.shrub(k, L, x, r, s=rng.uniform(0.35, 0.6), tone=rng.choice(('#2e5a2a', '#3a6a30')), berries=rng.choice((None, '#c83a3a', '#6a4ab8')))
for (x, r, s) in ((26.0, 9.0, 0.5), (12.0, 21.4, 0.45), (46.0, 25.0, 0.55), (31.0, 31.0, 0.5)):
    if clear(x, r, 0.5):
        A.boulder(k, L, x, r, s)
ok = lambda x, r: clear(x, r, 0.6) and not in_meadow(x, r)
A.pebbles(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 70, ok=lambda x, r: wet(x, r, 0.8) and not wet(x, r, 0.0))
A.leaf_litter(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 180, ok=ok)
A.flowers(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 120, ok=lambda x, r: ok(x, r) and not in_grove(x, r))
A.moss_mounds(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 90, ok=ok)
A.twigs(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 24, ok=ok)
W.meadow(k, '#4e7032', area=(-0.5, -2.0, COLS + 0.5, ROWS + 1.0), ok=('ground_moss', 'ground_moss_dark', 'ground_litter', 'ground_deep_moss'), density=0.75, flowers=0.5, h=(0.07, 0.15))
W.meadow(k, '#6e9a46', area=(mx - mw, mr - mh, mx + mw, mr + mh), ok=('ground_meadow',), density=1.3, flowers=1.8, h=(0.1, 0.22))
for c in crowns:
    c()
with k.foliage('leaf'):                                           # the canopy closing over the grove: it's dim in there
    for (x, r, z, s) in ((38.0, 3.0, 7.2, 1.4), (46.0, 9.0, 6.8, 1.2), (30.0, 9.0, 7.6, 1.2), (12.0, 2.0, 6.6, 1.2), (-0.5, 12.0, 5.6, 1.1),
                         (50.0, 22.0, 5.6, 1.1)):
        W.leafy_crown(k, x, r, z, 1.4 * s, 1.15 * s, 0.85 * s, shade(A.LEAF, rng.uniform(0.75, 0.95)), n=int(64 * s * s), part='canopy')

# ---- what's walkable, where the canoe goes ------------------------------------------------------------------------------
water_rows, walk = [], set()
for rr in range(ROWS):
    row = ''
    for c in range(COLS):
        x, r = c + 0.5, rr + 0.5
        on_landing = LANDING[0] < x < LANDING[2] and LANDING[1] < r < LANDING[3]
        row += '1' if wet(x, r, -0.15) and not on_landing else '0'
        if not wet(x, rr + 0.7, 0.05):
            walk.add((c, rr))
    water_rows.append(row)
for c in range(int(LANDING[0]), int(math.ceil(LANDING[2]))):
    for rr in range(int(LANDING[1]), int(math.ceil(LANDING[3]))):
        walk.add((c, rr))
for c in range(COLS):
    for rr in range(ROWS):
        if (c, rr) not in walk:
            k.solid(c, rr, c + 1, rr + 1)

k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
R.merge_parts(k)                                                  # one mesh per look: each render pass quick (assets_sylvara_rich)
k.render(OUT, cycle={'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'the Deepwood', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [1, 14]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.4, COLS, ROWS]})
w['river'] = {'water': water_rows, 'flow': [[round(x, 2), round(r, 2), 0.25] for (x, r) in RUN[::2]], 'width': 2.0,
              'up': {'edge': 'left', 'target': 'sylvara-falls', 'at': [47, 14]},
              'landings': [[int(LANDING[0]) + 1, int(LANDING[1]) + 1], [int(px_) - 1, int(pr_ - ph) - 1]], 'racks': []}
w['interactions'] = [
    {'x': 0, 'y': 13, 'type': 'enter_world', 'label': 'THE FALLS', 'prompt': 'PRESS E TO FOLLOW THE RUN BACK', 'target': 'sylvara-falls', 'spawn': [48, 12]},
    {'x': 0, 'y': 19, 'type': 'enter_world', 'label': 'THE ROOTMARKET', 'prompt': 'PRESS E TO WALK BACK TO THE CITY', 'target': 'sylvara-roots', 'spawn': [46, 8]},
    {'x': int(cbx), 'y': int(cbr) + 1, 'type': 'sylvan', 'kind': 'cache', 'cache': 'deep', 'label': 'MOSSY BOX', 'prompt': 'PRESS E TO OPEN'},
    {'x': int(hx2) - 1, 'y': int(hr2) + 1, 'type': 'sylvan', 'kind': 'mossback', 'label': 'THE MOSSBACK', 'prompt': 'PRESS E TO LOOK', 'verb': 'Look'},
    {'x': SORREL[0], 'y': SORREL[1], 'type': 'dialog', 'label': 'FORAGER', 'prompt': 'PRESS E TO TALK', 'dialog': 'SORREL IS SORTING ROOTS.'},
    {'x': int(px_), 'y': int(pr_ - ph) - 1, 'type': 'dialog', 'label': 'THE POOL', 'prompt': 'PRESS E TO LISTEN',
     'dialog': 'THE DEEP RUN ENDS HERE IN A POOL RINGED WITH STONES. AT DUSK THE LANTERN FROGS COME OUT ON THE LILY PADS, LIGHT UP ONE BY ONE, AND SING. THE ELVES SAY THEY\'RE COUNTING THE STARS. THEY GET IT WRONG EVERY NIGHT AND START AGAIN.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(SORREL[0], SORREL[1], SORREL[0] + 1, SORREL[1] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, doors=[(0, 13), (0, 19)],
            actors=[{'sheet': 'npc-elf-hermit', 'x': SORREL[0], 'y': SORREL[1], 'facing': 'down'}], scene_extra={})
print('sylvara-deepwood done', 'walkable', len(walk), 'sorrel', SORREL)
