"""Lumar Harbour — Blender scene (world id "lumar").

  BVENV/bin/python tools/bridge-art/scenes/lumar_harbor.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar

Diggen's Point, rebuilt in the house style (October 2026, Look Book 2's Lantern Quay as the bar): black saltstone
cliffs crowned with heath — turf and drawn grass, gorse, heather, windswept pines and rowans, sea pinks on the ledges,
gulls on the brow — and a cobbled lane winding down between them from the Market Square steps, its verges worn to earth,
turf either side, to the beach and the pier. Under the west cliff Tolliver & Daughters' fish sheds and their slip with
a cutter half-built on the stocks, nets drying, pots and fish boxes; the lighthouse in red and white courses with its
keeper's cottage tucked against the east cliff; a plank pier on braced piles with bollards and a ladder, your sloop
tied up at its end (js/sloop.js), a rowboat on its line; the skiff's landing ring of sea-glass on the east beach.

The headland is whole in the render, like the islands: past the map's sides and top its cliffs run on, curve away and
fall to the sea on a wandering coast all round, with the town's roofs over the brow to the north — so a wide screen
shows the point curving away into open water, and from the sloop it's an island like the rest. The cliffs rise off a
wandering foot (a heightfield, not boxes on the tile grid); the map's collisions are the hand-made layout's, as before
(the sheds and the cottage stand on what were cliff cells, solid as they were).
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
import assets_isle as I                # noqa: E402
import assets_ship as P                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_lumar_rich as R          # noqa: E402

HK.install()                           # the town over the brow: the richer house kit

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar.json')
w = json.load(open(WORLD))
names = {int(k_): v for k_, v in w.get('designTileNames', w['tileNames']).items()}
T = w.get('designTiles', w['tiles'])
COLS, ROWS = w['width'], w['height']
C45 = math.cos(math.radians(45))

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
walk = trail | shore

# ---- the headland beyond the map ----------------------------------------------------------------------------
# noisy lobes: the shoulders either side of the harbour, a bluff each side, the brow to the north where the town
# stands. Inside the map the hand-made layout rules; outside it, these.
LOBES = [(7.5, 2.5, 14.0, 9.5), (8.0, -3.0, 11.5, 5.4), (-1.0, 7.5, 3.6, 6.6), (17.0, 7.0, 3.4, 7.0)]


def lobes(x, r):
    f = max(1 - ((x - cx) / rx) ** 2 - ((r - cr) / ry) ** 2 for (cx, cr, rx, ry) in LOBES)
    return f + 0.16 * I.n2(x, r, 0.16, 23) + 0.08 * I.n2(x, r, 0.43, 26)


inmap = lambda c, r: 0 <= c < COLS and 0 <= r < ROWS
beyond = {(c, r) for c in range(-14, COLS + 14) for r in range(-14, 15)
          if not inmap(c, r) and lobes(c + 0.5, r + 0.5) > 0}
land = I.flood(cliff | walk | beyond, (7, 6))
cliffs = (cliff | beyond) & land

# ---- yards cut into the cliff's foot: the fish sheds and slip (west), the keeper's cottage (east) ----------------
# Level ground at the beach's height where the cliff was; still solid (the sheds, the slip and the cottage stand on it).
SHEDS = {(c, r) for c in range(-2, 6) for r in range(9, 14)} & cliffs
KEEPER = {(c, r) for c in range(14, 18) for r in range(3, 6)} & cliffs
YARD = SHEDS | KEEPER
cliffs -= YARD
low = walk | YARD                                               # ground at the beach's height
xs = [c for (c, r) in land]
rs = [r for (c, r) in land]
MX = round(max(-min(xs), max(xs) + 1 - COLS) + 4.0, 1)          # deep water all round the render's edge
MT = round(-min(rs) + 4.0, 1)
k = Kit(COLS, ROWS, margin_top=MT, margin_bottom=3.0, margin_x=MX, seed=211)
rng = k.rng

# ---- the lane over the brow and the town up there ----------------------------------------------------------
TOWN_R = -3.9                                                    # the cottages' fronts
BROW = [[(7.0, 0.2), (7.0, -2.3), (6.0, TOWN_R + 0.75), (-3.5, TOWN_R + 0.9)], [(7.0, -2.3), (8.2, TOWN_R + 0.75), (19.5, TOWN_R + 0.9)]]
HOUSES = [(-3.8, -0.9, -6.2, '#b0563a'), (0.6, 3.6, -6.4, 'slate'), (8.6, 11.6, -6.6, 'green'), (12.4, 15.0, -6.2, 'red'),
          (15.8, 18.6, -6.3, '#c8a050')]
TOWER = (5.0, TOWN_R)                                            # the bell tower's front


def brow_d(x, r):
    return I.path_dist(BROW, x, r)


def pad_d(x, r):
    """How far (x, r) is from anything built on the brow (it's levelled there)."""
    d = brow_d(x, r) - 0.6
    for (x0, x1, rb, _) in HOUSES:
        d = min(d, math.hypot(max(x0 - 0.5 - x, 0, x - x1 - 0.5), max(rb - r, 0, r - TOWN_R)))
    d = min(d, math.hypot(max(TOWER[0] - 0.8 - x, 0, x - TOWER[0] - 0.8), max(TOWER[1] - 1.6 - r, 0, r - TOWER[1])))
    return d


# ---- the lane down to the beach, and the ground: cobbles, worn verges, turf, scree, sand -----------------------
LANE = [[(7.0, 2.6), (7.5, 3.5), (9.4, 4.5), (10.8, 5.7), (11.2, 7.3), (10.5, 9.1), (9.0, 10.7), (8.1, 12.2), (8.0, 14.0)],
        [(11.1, 6.3), (12.4, 6.35), (13.5, 6.2)]]                # and the short spur to the lighthouse door
LANE_W = 0.72


def lane_d(x, r):
    return I.path_dist(LANE, x, r)


def near(cells, x, r, reach):
    c0, r0 = int(math.floor(x)), int(math.floor(r))
    best = 9.0
    for dc in range(-2, 3):
        for dr in range(-2, 3):
            q = (c0 + dc, r0 + dr)
            if q in cells:
                best = min(best, math.hypot(max(q[0] - x, 0, x - q[0] - 1), max(q[1] - r, 0, r - q[1] - 1)))
    return best < reach


def material(x, r):
    if near(shore, x, r, 0.5 + 0.25 * I.n2(x, r, 1.3, 31)) or (r > 12.5 and near(SHEDS, x, r, 0.2)):
        return 'sand' if I.n2(x, r, 0.9, 32) > -0.45 else 'sand_dark'
    if near(YARD, x, r, 0.05):
        return 'yard' if I.n2(x, r, 1.1, 36) > -0.3 else 'yard_dark'
    d = lane_d(x, r) + 0.08 * I.n2(x, r, 2.2, 37)
    if d < LANE_W + 0.04:
        return 'lanebed'
    if d < LANE_W + 0.28 + 0.18 * I.n2(x, r, 1.4, 38):
        return 'path' if I.n2(x, r, 0.7, 33) > -0.3 else 'path_dark'
    if near(cliff, x, r, 0.28 + 0.15 * I.n2(x, r, 1.6, 39)):
        return 'scree'
    m = I.n2(x, r, 0.45, 42) + 0.4 * I.n2(x, r, 1.5, 43)
    return 'grass' if m > -0.35 else 'grass_dark'


GREEN = '#557a42'
ALB = {'path': ('#7a6a50', 0.3), 'path_dark': ('#6a5c46', 0.3), 'sand': ('#b8a47a', 0.25), 'sand_dark': ('#a8946c', 0.25),
       'lanebed': ('#5e584c', 0.3), 'scree': ('#6a6a62', 0.25), 'grass': (GREEN, 0.3), 'grass_dark': (shade(GREEN, 0.86), 0.3),
       'yard': ('#7e7462', 0.3), 'yard_dark': ('#6e6656', 0.3)}
I.ground(k, low, material, ALB)

# the lane's cobbles: rounded setts in rows across it, packed grit between, a few gone (the bed shows)
r = 2.6
row_i = 0
SIZE = 0.24
while r < 14.0:
    x = 5.5 - (SIZE / 2 if row_i % 2 else 0)
    while x < 14.5:
        cx, cr = x + SIZE / 2 + rng.uniform(-0.03, 0.03), r + SIZE / 2 + rng.uniform(-0.03, 0.03)
        if lane_d(cx, cr) < LANE_W - 0.04 + 0.06 * I.n2(cx, cr, 2.0, 40) and (int(cx), int(cr)) in walk and rng.random() > 0.03 + max(0.0, cr - 12.6) * 0.5:
            k.cyl(cx, cr, -0.04, rng.uniform(0.012, 0.03), SIZE * rng.uniform(0.4, 0.5), (shade('#9a9080', rng.uniform(0.8, 1.14)), 0.12),
                  'cobble', ry=SIZE * rng.uniform(0.38, 0.46), verts=rng.choice((6, 7, 8)), bevel=0.02)
        x += SIZE * rng.uniform(0.95, 1.05)
    r += SIZE
    row_i += 1
# kerb stones along the lane's edge where it runs between turf, set a little proud
for path in LANE[:1]:
    for (a, b) in zip(path, path[1:]):
        L = math.dist(a, b)
        ux, ur = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        t = 0.0
        while t < L:
            for s in (-1, 1):
                px, pr = a[0] + ux * t - ur * s * (LANE_W + 0.06), a[1] + ur * t + ux * s * (LANE_W + 0.06)
                if (int(px), int(pr)) in trail and rng.random() < 0.72 and lane_d(px, pr) > LANE_W - 0.02:
                    k.blob(px, pr, 0.0, 0.1, 0.075, 0.035, (shade('#a89c86', rng.uniform(0.8, 1.05)), 0.14), 'kerb', rot=(0, 0, math.degrees(math.atan2(ur, ux))), segs=7)
            t += 0.22

# ---- the cliffs ---------------------------------------------------------------------------------------------------
# One heightfield over every cliff cell: a level clifftop (turf, heath, the brow's lane) that falls away over SLOPE
# tiles to a foot pulled in from the cells' edge by a wandering amount, the faces banded in saltstone strata. Inside
# the map the cliff never comes out past its own cells, so it never stands on a walkable tile; the steps' cells count
# as cliff for the slope (the clifftop runs level to the top step, the steps cut down between rock walls).
TOP, SLOPE, FOOT = 1.15, 0.55, 0.42
STEPS = {(6, 0), (7, 0), (6, 1), (7, 1), (6, 2), (7, 2)}
solidset = cliffs | STEPS


def dist_to(x, r, outside):
    """Distance from (x, r) to the nearest cell for which outside(cell) holds (searching 3 cells round)."""
    best = 3.0
    c0, r0 = int(math.floor(x)), int(math.floor(r))
    for dc in range(-3, 4):
        for dr in range(-3, 4):
            q = (c0 + dc, r0 + dr)
            if not outside(q):
                continue
            best = min(best, math.hypot(max(q[0] - x, x - (q[0] + 1), 0.0), max(q[1] - r, r - (q[1] + 1), 0.0)))
    return best


def top_at(x, r):
    lev = I.smooth(0.3, 1.6, pad_d(x, r)) if r < 0.5 else 1.0     # levelled under the brow's lane and the houses
    return TOP * (1 + 0.12 * lev * I.n2(x, r, 0.35, 19))


def height(x, r):
    # off the trail, the sand and the yards the cliff's foot is pulled in a little (it never stands on a walkable
    # tile); where it falls to the sea it's pulled in by a long wandering amount, so the outline is never the tile grid
    dw = dist_to(x, r, lambda q: q in low and q not in STEPS)
    dw = dw - FOOT * (0.55 + 0.45 * I.n2(x, r, 0.55, 17))
    ds = dist_to(x, r, lambda q: q not in solidset and q not in low)
    ds = ds - (0.3 + 0.6 * (1 + I.n2(x, r, 0.28, 15)) + 0.3 * I.n2(x, r, 0.9, 16))
    d = min(dw, ds) + 0.1 * I.n2(x, r, 1.7, 18) - 0.1
    return top_at(x, r) * I.smooth(0.0, SLOPE, d) + 0.05 * I.n2(x, r, 2.3, 20) * I.smooth(0.1, SLOPE, d)


def crown(x, r):
    if r < 0.4 and brow_d(x, r) + 0.12 * I.n2(x, r, 2.0, 41) < 0.45:
        return 'lane'
    m = I.n2(x, r, 0.45, 42) + 0.4 * I.n2(x, r, 1.5, 43)
    return 'grass' if m > -0.3 else ('grass_dark' if m > -0.62 else 'heath')


STEP = 0.125
NS = int(round(1 / STEP))
HV = {}


def hv(p):
    if p not in HV:
        HV[p] = height(p[0] * STEP, p[1] * STEP)
    return HV[p]


faces, tops = {}, {}
for (c, r) in cliffs:
    for j in range(NS):
        for i in range(NS):
            a = (c * NS + i, r * NS + j)
            q = (a, (a[0] + 1, a[1]), (a[0] + 1, a[1] + 1), (a[0], a[1] + 1))
            zs = [hv(p) for p in q]
            zc = sum(zs) / 4
            x, y = c + (i + 0.5) * STEP, r + (j + 0.5) * STEP
            steep = (max(zs) - min(zs)) / STEP
            if max(zs) < 0.05:
                faces.setdefault('g:' + material(x, y), []).append(q)
            elif steep > 1.2:                                    # strata: long wavy beds
                faces.setdefault('cliff%d' % (int(zc * 3.4 + 0.5 * I.n2(x, y, 0.22, 44)) % 3), []).append(q)
            elif zc > TOP * 0.6:
                tops.setdefault(crown(x, y), []).append(q)       # the clifftop's turf: ground (grass grows on it)
            else:
                faces.setdefault('scree', []).append(q)
CALB = {'cliff0': ('#3a4240', 0.24), 'cliff1': ('#2e3634', 0.24), 'cliff2': ('#46504c', 0.24), 'scree': ('#56605a', 0.25)}
CALB.update({'g:' + key: alb for key, alb in ALB.items()})
TALB = {'grass': (GREEN, 0.35), 'grass_dark': (shade(GREEN, 0.86), 0.35), 'heath': ('#6a6a44', 0.35), 'lane': ('#8a7a5c', 0.3)}
vfn = lambda p: (p[0] * STEP, p[1] * STEP, hv(p) - (0.004 if hv(p) < 0.05 else 0.0))
I._mesh(k, faces, vfn, CALB, 'cliff')
I._mesh(k, tops, vfn, TALB, 'ground')
for (c, r) in cliff | (YARD & set((c, r) for c in range(COLS) for r in range(ROWS))):   # the map's cliffs and yards are walls
    k.solid(c, r, c + 1, r + 1)


def lift(since, lights_since, dz):
    for p in k.parts[since:]:
        p['obj'].location.z += dz
    for L in k.lights[lights_since:]:
        L['obj'].location.z += dz


def on_top(fn, x, r, *a, **kw):
    """Build fn at ground level, then stand it on the clifftop at (x, r)."""
    since, ls = len(k.parts), len(k.lights)
    out = fn(k, *a, **kw)
    lift(since, ls, height(x, r) - 0.02)
    return out


def clear_above(c, r, n=3):
    """No walkable ground in the screen rows a tall thing at (c, r) covers."""
    return all((c + dc, r - dr) not in walk for dc in (-1, 0, 1) for dr in range(0, n + 1))


# ---- on the clifftop: rocks, gorse, heather, sea pinks on the ledges, pines and rowans -----------------------------
busy = lambda x, r: (r < 0.5 and pad_d(x, r) < 0.4)
VIEW = (-3.0, -3.5, COLS + 3.0, ROWS)                          # where the eye goes: the rest is far off
inview = lambda x, r: VIEW[0] <= x <= VIEW[2] and VIEW[1] <= r <= VIEW[3]
for (c, r) in sorted(cliffs):
    for j in range(2):
        x, y = c + rng.uniform(0.1, 0.9), r + rng.uniform(0.1, 0.9)
        z = height(x, y)
        if busy(x, y):
            continue
        u = rng.random()
        if z > TOP * 0.8:
            if u < 0.1:
                s_ = rng.uniform(0.16, 0.3)
                k.rock(x, y, z - 0.05, s_, s_ * 0.8, s_ * 0.55, (shade('#5a625e', rng.uniform(0.85, 1.1)), 0.22), part='cliff_boulder')
                if rng.random() < 0.5:
                    k.blob(x - s_ * 0.2, y, z + s_ * 0.35, s_ * 0.5, s_ * 0.4, 0.03, ('#9aa86a', 0.3), 'lichen', segs=6)
            elif u < 0.18 and inview(x, y):
                R.heather(k, x, y, z - 0.02, n=rng.randint(3, 6))
        elif 0.25 < z < TOP * 0.75 and u < 0.22 and inview(x, y):     # a ledge on the face: sea pinks, a fern
            R.thrift(k, x, y, z - 0.02, s=rng.uniform(0.7, 1.2))
# fallen rock at the cliffs' feet along the trail and the shore
for (c, r) in sorted(cliff):
    for (dc, dr) in ((0, 1), (-1, 0), (1, 0)):
        if (c + dc, r + dr) in walk and rng.random() < 0.45:
            s = rng.uniform(0.14, 0.26)
            x = c + 0.5 + dc * 0.36 + (rng.uniform(-0.35, 0.35) if dc == 0 else 0)
            rr = r + 0.5 + dr * 0.36 + (rng.uniform(-0.35, 0.35) if dr == 0 else 0)
            k.rock(x, rr, 0.0, s, s * 0.8, s * 0.6, (shade('#56605a', rng.uniform(0.8, 1.1)), 0.22), part='cliff_rock')
            if rng.random() < 0.5:                                   # a fern or a tuft in its lee
                with k.foliage('leaf'):
                    for f in range(5):
                        a = f * 1.25 + rng.uniform(-0.2, 0.2)
                        k.blob(x + math.cos(a) * 0.14 + 0.12, rr + 0.12 + math.sin(a) * 0.06, 0.08, 0.12, 0.035, 0.03,
                               shade('#4a7a3a', rng.uniform(0.85, 1.12)), 'fern', rot=(0, -20, math.degrees(a)), segs=6)

spots = [(c, r) for (c, r) in sorted(cliffs) if clear_above(c, r) and (c, r + 1) not in walk]
rng.shuffle(spots)
pines, rowans, shrubs = 0, 0, 0
for (c, r) in spots:
    x, y = c + rng.uniform(0.3, 0.7), r + rng.uniform(0.3, 0.7)
    if height(x, y) < TOP * 0.85 or busy(x, y) or pad_d(x, y) < 1.0:
        continue
    if pines < 26:
        on_top(W.pine, x, y, x, y, h=rng.uniform(1.9, 2.9), tone=rng.choice(('#28483a', '#2e5040', '#24443a')))
        pines += 1
    elif rowans < 9 and inview(x, y):
        lobes_ = on_top(W.tree, x, y, x, y, h=rng.uniform(1.8, 2.3), tone=rng.choice(('#3e6a36', '#4a7038')), lean=rng.uniform(0.12, 0.3))
        for (lx, lr, lz, lrx, lry, lrz) in lobes_[:3]:                # rowan berries in bunches
            for b in range(4):
                bx, br = lx + rng.uniform(-lrx, lrx) * 0.6, lr + lry * 0.8
                for q in range(4):
                    k.sphere(bx + rng.uniform(-0.04, 0.04), br, lz + height(x, y) + rng.uniform(-lrz, 0) * 0.5 + rng.uniform(-0.04, 0.04),
                             0.028, 0.028, '#d0402a', 'berry', segs=5)
        rowans += 1
    elif shrubs < 34 and inview(x, y):                           # shrubs in clumps of two or three, open turf between
        gorse_ = rng.random() < 0.55
        for j in range(rng.randint(2, 3)):
            sx, sy = x + rng.uniform(-0.45, 0.45), y + rng.uniform(-0.3, 0.3)
            if height(sx, sy) < TOP * 0.85 or busy(sx, sy):
                continue
            if gorse_:
                on_top(R.gorse, sx, sy, sx, sy, s=rng.uniform(0.24, 0.36))
            else:
                on_top(W.bush, sx, sy, sx, sy, s=rng.uniform(0.22, 0.32), tone=rng.choice(('#2e5232', '#3a5a34')),
                       berries=rng.choice((None, None, '#c04050')))
        shrubs += 1
    else:
        continue
for (gx, gr, f) in ((4.6, 7.6, 1), (11.8, 3.2, -1), (2.2, 8.3, 1), (15.2, 8.7, -1)):     # gulls on the brow
    R.gull(k, gx, gr, height(gx, gr) - 0.02, facing=f)
# a post-and-rope fence along the clifftop above the lane, where the edge is sheer
for path in ([(9.5, 3.25), (11.0, 3.6), (12.2, 4.2)], [(7.6, 7.75), (7.75, 9.05), (5.95, 8.8)]):
    pts = []
    for (a, b) in zip(path, path[1:]):
        L = math.dist(a, b)
        n = max(1, int(L / 0.7))
        for i in range(n + (1 if b == path[-1] else 0)):
            t = i / n
            pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    tops_ = []
    for (px, pr) in pts:
        z = height(px, pr)
        k.cyl(px, pr, z - 0.05, z + 0.55, 0.035, (shade('#6a5a44', rng.uniform(0.85, 1.05)), 0.16), 'fence_post', verts=6)
        tops_.append((px, pr, z + 0.48))
    for p, q in zip(tops_, tops_[1:]):
        m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2 - 0.08)
        k.tube(p, m, 0.012, R.ROPE, 'fence_rope', verts=4)
        k.tube(m, q, 0.012, R.ROPE, 'fence_rope', verts=4)

# ---- the steps up to the Market Square, cut down between the rock walls ---------------------------------------------
NSTEP = 8
for i in range(NSTEP):
    z = TOP * (i + 1) / NSTEP
    ra, rb = 2.6 - (i + 1) * 2.6 / NSTEP, 2.6 - i * 2.6 / NSTEP
    x = 6.05
    while x < 7.95:
        wdt = min(7.95 - x, rng.uniform(0.45, 0.8))
        k.box(x + 0.01, ra, -0.1, x + wdt - 0.01, rb, z, (shade('#8a8274', rng.uniform(0.88, 1.08)), 0.16), 'steps', bevel=0.012)
        x += wdt
    k.box(6.05, rb - 0.035, z - 0.04, 7.95, rb, z + 0.005, shade('#a89c86', 1.05), 'step_nose')
for xe in (6.0, 8.0):                                             # an iron handrail down each side
    k.tube((xe, 2.55, 0.62), (xe, 0.0, TOP + 0.62), 0.02, A.IRON, 'handrail', verts=6)
    for rr in (2.4, 1.3, 0.25):
        zz = TOP * (2.6 - rr) / 2.6
        k.cyl(xe, rr, zz, zz + 0.62 + (2.6 - rr) * 0.0, 0.018, A.IRON, 'handrail', verts=5)

# ---- the town over the brow: roofs and lit windows the sloop sees from the sea --------------------------------------
roofs = {'slate': W.ROOF_SLATE, 'green': W.ROOF_GREEN, 'red': W.ROOF_RED}
for (x0, x1, rb, roof) in HOUSES:
    mid = (x0 + x1) / 2
    on_top(W.house, mid, (rb + TOWN_R) / 2, x0, x1, rb, TOWN_R, wall_h=1.9, rise=1.2, roof=roofs.get(roof, roof), wall='#d8c8a4',
           door_x=mid, windows=[(x0 + 0.65, 0.85), (x1 - 0.65, 0.85)], windows_up=[(mid, 1.5)] if x1 - x0 > 2.9 else (), chimney=x0 + 0.6)
on_top(W.bell_tower, TOWER[0], TOWER[1] - 0.8, TOWER[0], TOWER[1])
for x in (2.2, 12.0, -2.3, 17.2):
    on_top(W.lantern_post, x, TOWN_R + 1.5, x, TOWN_R + 1.5, h=1.8, energy=16)
on_top(R.dry_wall, 4.3, -2.1, (3.2, -2.05), (5.6, -2.15), solid=False)
on_top(R.dry_wall, 10.2, -2.1, (8.9, -2.1), (12.6, -2.05), solid=False)

# ---- Tolliver & Daughters: the fish sheds and the slip under the west cliff ----------------------------------------
SX0, SX1, SRB, SRF = -1.6, 5.35, 9.35, 11.55
R.fish_shed(k, SX0, 1.95, SRB, SRF, wall_h=1.7, rise=1.0, roof='#9a4a32', boards='#4a4440', doors=[(0.4, 1.3)],
            windows=[(1.45, 0.75)], lamp=1.25, sign=(0.4, 1.43, 1.1))
R.fish_shed(k, 1.95, SX1, SRB + 0.15, SRF, wall_h=2.15, rise=1.15, roof=W.ROOF_SLATE, boards='#5a4a3c', doors=[(4.4, 1.15)],
            windows=[(2.6, 0.75), (3.35, 0.75)], hoist=3.0)
# the slip: the cutter on her stocks, the ways running down into the water
R.cutter_on_stocks(k, -0.4, 3.3, 12.85, beam=1.1)
for rr in (12.55, 13.15):
    k.box(-3.2, rr - 0.06, -0.55, 3.5, rr + 0.06, -0.02, (shade(A.WOOD_D, 0.9), 0.16), 'slip_way')
    k.tube((-3.2, rr, -0.62), (-1.0, rr, -0.06), 0.05, ('#2e3a2a', 0.3), 'slip_way_weed', verts=5)
xx = -3.0
while xx < 3.5:
    k.box(xx, 12.4, -0.65 if xx < -0.8 else -0.1, xx + 0.12, 13.3, -0.5 if xx < -0.8 else -0.03, (A.WOOD_DD, 0.16), 'slip_sleeper')
    xx += 0.5
# the yard in front: nets, pots, fish boxes, the capstan that hauls them up, an anchor, a gull on the ridge
R.net_rack(k, 2.35, 4.05, 12.15, h=1.15)
R.lobster_pots(k, 4.35, 12.35, n=3)
R.fish_boxes(k, 4.7, 13.25, n=3)
R.capstan(k, -1.1, 12.0)
A.barrel(k, 5.4, 13.45, h=0.66, radius=0.22)
for f in range(3):                                               # buoys and floats hung on the shed wall
    k.sphere(2.3 + f * 0.22, SRF + 0.08, 0.95 + (f % 2) * 0.12, 0.08, 0.075, rng.choice(('#e05a30', '#f0f0e8')), 'float', segs=10)
R.gull(k, 3.6, SRB + 1.0, 3.25, facing=-1)
# a dry-stone wall closing the yard off from the lane, the old lantern at its end
R.dry_wall(k, (5.5, 9.2), (5.55, 11.15), h=0.55)
W.lantern_post(k, 5.6, 11.55)
k.solid(4, 13, 6, 14)                                           # the boxes and barrel at the yard's corner, as before

# ---- the shore --------------------------------------------------------------------------------------------
W.rowboat(k, 4.4, 6.4, 14.5, hull='#3a5a6a', oars=False)          # pulled up west of the pier
A.crate(k, 6.25, 13.85, s=0.36, tone=shade(A.WOOD_L, 0.95), solid=False)
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
k.solid(4, 14, 7, 15)                    # the rowboat
k.solid(SKX - 1.8, SKR - 0.9, SKX + 2.0, SKR + 0.9)       # the skiff
# sea glass where it washes up (the forage spot at (14, 10) — glinting in the grass by the lighthouse path)
for i in range(6):
    k.blob(14.2 + rng.uniform(0, 0.6), 10.3 + rng.uniform(0, 0.5), 0.015, 0.05, 0.04, 0.025, rng.choice(('#9ad8c8', '#a8e0f0', '#c8f0d8')),
           'sea_glass', emit=('#60e0b0', 0.3), segs=6)
# a windfall pine by the lane (the forage spot at (6, 9)): a fallen bough, cones, needles
k.tube((6.15, 9.25, 0.06), (6.95, 9.65, 0.04), 0.06, (A.WOOD_D, 0.14), 'windfall', verts=6)
with k.foliage('needle'):
    for i in range(5):
        k.blob(6.5 + i * 0.12, 9.4 + i * 0.05 + rng.uniform(-0.05, 0.05), 0.1, 0.13, 0.08, 0.06, (shade('#2e5040', rng.uniform(0.85, 1.1)), 0.2),
               'windfall_needles', rot=(0, 0, 25), segs=7)
for i in range(4):
    k.blob(6.2 + rng.uniform(0, 0.7), 9.7 + rng.uniform(0, 0.2), 0.03, 0.04, 0.03, 0.03, '#6a4a2a', 'pine_cone', segs=6)
# beach life: crabs, shells, a bucket, a coil of rope, a lobster pot or two by the pier's foot, gulls
for (cx, cr) in ((10.0, 13.95), (5.7, 13.2)):
    R.crab(k, cx, cr)
for i in range(10):
    x, y = rng.uniform(5.5, 15.0), rng.uniform(13.2, 14.6)
    if not (SKX - 2.1 < x < SKX + 2.2 and SKR - 1.0 < y < SKR + 1.0) and not (6.8 < x < 9.2):
        k.blob(x, y, 0.01, 0.035, 0.03, 0.015, rng.choice(('#f0e8dc', '#e8c8b0', '#d8d0e0')), 'shell', segs=6)
A.bucket(k, 9.5, 14.35)
W.annulus(k, 9.75, 13.9, 0.06, 0.2, 0.0, 0.07, (R.ROPE, 0.25), 'rope', segs=16)
R.gull(k, 7.06, 16.82, 0.42, facing=1)

# ---- the pier ---------------------------------------------------------------------------------------------
R.pier(k, 7.0, 9.0, 13.6, 16.95, z=0.05, bollards=False)
for (x, r) in ((7.1, 16.5), (8.9, 16.5)):
    W.silver_post(k, x, r)
W.lantern_post(k, 9.18, 15.35, h=1.9, energy=26)               # off the deck's edge, on a pile: the pier stays clear
k.blocked.discard((9, 14))                                      # it stands on a pile in the water, not on the sand
W.annulus(k, 7.3, 15.2, 0.05, 0.16, 0.05, 0.11, (R.ROPE, 0.25), 'rope', segs=14)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
# a rowboat riding on her line east of the pier, a buoy off the point
since, lsince = len(k.parts), len(k.lights)
W.rowboat(k, 10.4, 12.2, 16.1, beam=0.78, hull='#7a3a2a', inside=A.WOOD_DD)
C.sink(k, since, C.WZ + 0.12, lights_since=lsince)
for i in range(4):
    t = i / 4
    p = (10.4 + (9.05 - 10.4) * t, 16.1 + (15.7 - 16.1) * t, -0.12 + 0.2 * t - 0.12 * math.sin(math.pi * t))
    q = (10.4 + (9.05 - 10.4) * (t + 0.25), 16.1 + (15.7 - 16.1) * (t + 0.25), -0.12 + 0.2 * (t + 0.25) - 0.12 * math.sin(math.pi * (t + 0.25)))
    k.tube(p, q, 0.012, R.ROPE, 'mooring_line', verts=4)
k.cyl(13.2, 17.6, C.WZ - 0.1, C.WZ + 0.22, 0.16, '#c03a2e', 'buoy', verts=14)
k.cyl(13.2, 17.6, C.WZ + 0.08, C.WZ + 0.16, 0.165, '#ece4d4', 'buoy', verts=14)
k.cone(13.2, 17.6, C.WZ + 0.22, C.WZ + 0.38, 0.08, 0.02, '#2e2e34', 'buoy', verts=10)


# ---- the coast: the beach shelving into the sea, the cliffs' feet in the water all round ----------------------------
def beach_bias(x, r):
    d = min(math.hypot(max(c - x, 0, x - c - 1), max(rr - r, 0, r - rr - 1)) for (c, rr) in shore)
    return 1.2 if d < 1.2 else -0.5


C.coast(k, land, ground=(material, ALB), palette='emerald', rock='#4a5450', seed=5, reach=(0.15, 0.7), beach_bias=beach_bias,
        keep_clear=[(6.6, 13.4, 9.4, 17.0), (3.4, 16.6, 13.8, 19.4), (-3.4, 12.2, 0.0, 13.5), (9.9, 15.6, 12.6, 16.6)])

# ---- lighthouse and the keeper's cottage ------------------------------------------------------------------
R.lighthouse(k, 13.5, 5.5)
W.house(k, 14.25, 16.75, 3.35, 5.45, wall_h=1.6, rise=1.0, roof=W.ROOF_SLATE, wall='#e8e0d0', door_x=15.7,
        windows=[(14.85, 0.8)], chimney=16.3)
for (x, r) in ((8.5, 7.5), (14.5, 11.5)):
    W.lantern_post(k, x, r)

# ---- the grass: over the turf by the lane and on the clifftops in view, once everything else is in place -------------
GRASS_CELLS = sorted(trail) + [c for c in sorted(cliffs) if inview(c[0] + 0.5, c[1] + 0.5)]
k.later.append(lambda: W.meadow(k, GREEN, cells=GRASS_CELLS, ok=('ground_grass', 'ground_grass_dark', 'ground_heath'), density=0.9,
                                flowers=0.6))

# moonlight over the whole headland (as bright on the harbour as before), a warm glow over the lane
k.area_light(8.0, 6.0, 15.0, '#8090c8', 1500, 34.0, rot=(math.radians(-35), 0, 0))
k.point_light(10.0, 9.5, 2.8, '#ffc890', 30, radius=1.0)

for (c, r) in sea:          # no walking on water
    k.solid(c, r, c + 1, r + 1)

k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=int(os.environ.get('SAMPLES', 128)),
         world_light=('#2a3450', 0.7))

apply_world(WORLD, k, (0, 0, 15, 15), doors=[(7, 15), (8, 15), (7, 16), (8, 16)], scene_id='lumar', moves={
    'MARKET SQUARE': [(6, 0), (7, 0)], 'LIGHTHOUSE': (13, 5), 'BOARD GALLEON': [(7, 15), (8, 15)], 'GALLEON': (8, 16), 'DOCK': (8, 16)},
    scene_extra={'backdrop': True, 'layers': {'shuttle': 'parked'}})
w = json.load(open(WORLD))
w['view'] = [-1.6, -1.6, COLS + 1.6, ROWS + 1.6]       # camera bounds (tiles): the harbour framed, the headland round it
for it in w['interactions']:                            # the pier's end is the DOCK now: the sloop, not a galleon
    if it.get('label') == 'GALLEON':
        it.update({'label': 'DOCK', 'x': 8, 'y': 16, 'dialog': 'YOUR SLOOP IS TIED UP AT THE END OF THE PIER.'})
w['shuttle'] = {'spawn': [9, 12]}                       # the skiff sets down on the east beach; you step out beside her (behind her nose you're hidden)
if not any(it.get('type') == 'shuttle' for it in w['interactions']):
    w['interactions'].append({'x': 12, 'y': 12, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('harbor done; margins', MX, MT, 'land', len(land))
