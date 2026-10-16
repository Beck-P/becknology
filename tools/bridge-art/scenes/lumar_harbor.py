"""Lumar Harbour — Blender scene (world id "lumar").

  BVENV/bin/python tools/bridge-art/scenes/lumar_harbor.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar

Diggen's Point: black saltstone cliffs with a trail winding down from the
Market Square steps to the shore, the lighthouse, lantern posts, boats pulled
up on the sand, and the pier with your sloop tied up at its end. The emerald
sea is the world's own animated backdrop.

The headland is whole in the render, like the islands: past the map's sides
and top its cliffs run on, curve away and fall to the sea on a wandering coast
all round, with the town's roofs over the brow to the north — so a wide screen
shows the point curving away into open water, and from the sloop it's an
island like the rest, never a block of land cut square at the render's edge.
The cliffs rise off a wandering foot (a heightfield, not boxes on the tile
grid); the map's collisions are the hand-made layout's, as before.
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
xs = [c for (c, r) in land]
rs = [r for (c, r) in land]
MX = round(max(-min(xs), max(xs) + 1 - COLS) + 4.0, 1)          # deep water all round the render's edge
MT = round(-min(rs) + 4.0, 1)
k = Kit(COLS, ROWS, margin_top=MT, margin_bottom=3.0, margin_x=MX, seed=211)

# ---- the lane over the brow and the town up there ----------------------------------------------------------
TOWN_R = -3.9                                                    # the cottages' fronts
LANE = [[(7.0, 0.2), (7.0, -2.3), (6.0, TOWN_R + 0.75), (0.5, TOWN_R + 0.85)], [(7.0, -2.3), (8.2, TOWN_R + 0.75), (16.0, TOWN_R + 0.9)]]
HOUSES = [(0.6, 3.6, -6.4, 'slate'), (8.6, 11.6, -6.6, 'green'), (12.4, 15.0, -6.2, 'red')]
TOWER = (5.0, TOWN_R)                                            # the bell tower's front


def lane_d(x, r):
    return I.path_dist(LANE, x, r)


def pad_d(x, r):
    """How far (x, r) is from anything built on the brow (it's levelled there)."""
    d = lane_d(x, r) - 0.6
    for (x0, x1, rb, _) in HOUSES:
        d = min(d, math.hypot(max(x0 - x, 0, x - x1), max(rb - r, 0, r - TOWN_R)))
    d = min(d, math.hypot(max(TOWER[0] - 0.8 - x, 0, x - TOWER[0] - 0.8), max(TOWER[1] - 1.6 - r, 0, r - TOWER[1])))
    return d


# ---- ground: the trail, the sand, the ledges at the cliffs' feet ----------------------------------------------
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
    if near(shore, x, r, 0.5 + 0.25 * I.n2(x, r, 1.3, 31)):
        return 'sand' if I.n2(x, r, 0.9, 32) > -0.45 else 'sand_dark'
    if near(trail, x, r, 0.6):
        p = I.n2(x, r, 0.7, 33) + 0.4 * I.n2(x, r, 2.1, 34)
        return 'path' if p > -0.35 else 'path_dark'
    return 'ledge' if I.n2(x, r, 0.8, 35) > -0.2 else 'ledge_moss'


ALB = {'path': ('#4a4034', 0.3), 'path_dark': ('#3e3529', 0.3), 'sand': ('#8a7a5a', 0.25), 'sand_dark': ('#7a6c50', 0.25),
       'ledge': ('#343a38', 0.25), 'ledge_moss': ('#2e3a2c', 0.3)}
I.ground(k, walk, material, ALB)
for (c, r) in trail:                                             # flat stones bedded in the trail
    for j in range(3):
        s = k.rng.uniform(0.08, 0.18)
        k.cyl(c + k.rng.uniform(0.15, 0.85), r + k.rng.uniform(0.15, 0.85), -0.03, 0.005, s, (W.SALT[2], 0.15), 'trail_stone',
              ry=s * 0.8, verts=6)

# ---- the cliffs ---------------------------------------------------------------------------------------------------
# One heightfield over every cliff cell: a level clifftop (grass, heath, the lane) that falls away over SLOPE tiles to
# a foot pulled in from the cells' edge by a wandering amount, the faces banded in saltstone strata. Inside the map
# the cliff never comes out past its own cells, so it never stands on a walkable tile; the steps' cells count as
# cliff for the slope (the clifftop runs level to the top step, the steps cut down between rock walls).
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
    lev = I.smooth(0.3, 1.6, pad_d(x, r)) if r < 0.5 else 1.0     # levelled under the lane and the houses
    return TOP * (1 + 0.12 * lev * I.n2(x, r, 0.35, 19))


def height(x, r):
    # off the trail and the sand the cliff's foot is pulled in a little (it never stands on a walkable tile); where it
    # falls to the sea it's pulled in by a long wandering amount, so the headland's outline is never the tile grid
    dw = dist_to(x, r, lambda q: q in walk and q not in STEPS)
    dw = dw - FOOT * (0.55 + 0.45 * I.n2(x, r, 0.55, 17))
    ds = dist_to(x, r, lambda q: q not in solidset and q not in walk)
    ds = ds - (0.3 + 0.6 * (1 + I.n2(x, r, 0.28, 15)) + 0.3 * I.n2(x, r, 0.9, 16))
    d = min(dw, ds) + 0.1 * I.n2(x, r, 1.7, 18) - 0.1
    return top_at(x, r) * I.smooth(0.0, SLOPE, d) + 0.05 * I.n2(x, r, 2.3, 20) * I.smooth(0.1, SLOPE, d)


def crown(x, r):
    if r < 0.4 and lane_d(x, r) + 0.12 * I.n2(x, r, 2.0, 41) < 0.45:
        return 'lane'
    m = I.n2(x, r, 0.45, 42) + 0.4 * I.n2(x, r, 1.5, 43)
    return 'grass' if m > -0.25 else ('grass_dark' if m > -0.6 else 'heath')


STEP = 0.125
NS = int(round(1 / STEP))
HV = {}


def hv(p):
    if p not in HV:
        HV[p] = height(p[0] * STEP, p[1] * STEP)
    return HV[p]


faces = {}
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
                key = 'g:' + material(x, y)
            elif steep > 1.2:                                    # strata: long wavy beds
                key = 'cliff%d' % (int(zc * 3.4 + 0.5 * I.n2(x, y, 0.22, 44)) % 3)
            elif zc > TOP * 0.6:
                key = 'c:' + crown(x, y)
            else:
                key = 'scree'
            faces.setdefault(key, []).append(q)
CALB = {'cliff0': ('#2a302e', 0.24), 'cliff1': ('#222826', 0.24), 'cliff2': ('#323a38', 0.24), 'scree': (W.SALT[2], 0.25),
        'c:grass': ('#33472f', 0.35), 'c:grass_dark': ('#2b3d29', 0.35), 'c:heath': ('#3c4630', 0.35), 'c:lane': ('#4e4638', 0.3)}
CALB.update({'g:' + key: alb for key, alb in ALB.items()})
I._mesh(k, faces, lambda p: (p[0] * STEP, p[1] * STEP, hv(p) - (0.004 if hv(p) < 0.05 else 0.0)), CALB, 'cliff')
for (c, r) in cliff:                                             # the map's cliffs are its walls, as laid out
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


# ---- on the clifftop: tufts, boulders, flowers, pines, bushes ------------------------------------------------------
busy = lambda x, r: (r < 0.5 and pad_d(x, r) < 0.4)
for (c, r) in sorted(cliffs):
    for j in range(2):
        x, y = c + k.rng.uniform(0.1, 0.9), r + k.rng.uniform(0.1, 0.9)
        z = height(x, y)
        if z < TOP * 0.8 or busy(x, y):
            continue
        if k.rng.random() < 0.55:
            for t in range(2):
                k.cone(x + t * 0.05, y, z, z + k.rng.uniform(0.1, 0.2), 0.03, 0.002, '#4a6a40', 'tuft', verts=3)
        if k.rng.random() < 0.14:
            s_ = k.rng.uniform(0.18, 0.3)
            k.rock(x, y, z - 0.05, s_, s_ * 0.8, s_ * 0.6, (W.SALT[k.rng.choice((2, 3))], 0.22), part='cliff_boulder')
        if k.rng.random() < 0.1:
            for f in range(3):
                k.sphere(x + k.rng.uniform(-0.2, 0.2), y + k.rng.uniform(-0.2, 0.2), z + 0.03, 0.035, 0.03,
                         k.rng.choice(('#e0d8f0', '#e8c860', '#c070c0')), 'wildflower', segs=5)
# fallen rock at the cliffs' feet along the trail and the shore
for (c, r) in sorted(cliff):
    for (dc, dr) in ((0, 1), (-1, 0), (1, 0)):
        if (c + dc, r + dr) in walk and k.rng.random() < 0.55:
            s = k.rng.uniform(0.16, 0.3)
            x = c + 0.5 + dc * 0.32 + (k.rng.uniform(-0.35, 0.35) if dc == 0 else 0)
            rr = r + 0.5 + dr * 0.32 + (k.rng.uniform(-0.35, 0.35) if dr == 0 else 0)
            k.rock(x, rr, 0.0, s, s * 0.8, s * 0.7, (W.SALT[k.rng.choice((1, 2))], 0.22), part='cliff_rock')

spots = [(c, r) for (c, r) in sorted(cliffs) if clear_above(c, r) and (c, r + 1) not in walk]
k.rng.shuffle(spots)
pines = 0
for (c, r) in spots:
    x, y = c + k.rng.uniform(0.3, 0.7), r + k.rng.uniform(0.3, 0.7)
    if height(x, y) < TOP * 0.85 or busy(x, y) or pad_d(x, y) < 1.0:
        continue
    if pines < 34:
        on_top(W.pine, x, y, x, y, h=k.rng.uniform(2.0, 2.8))
    elif pines < 80:
        on_top(W.bush, x, y, x, y, s=k.rng.uniform(0.22, 0.32), berries=k.rng.choice((None, None, '#c04050')))
    else:
        break
    pines += 1

# ---- the steps up to the Market Square, cut down between the rock walls ---------------------------------------------
for i in range(4):
    z = TOP * (i + 1) / 4
    k.box(6.0, 2.0 - (i + 1) * 0.5, -0.1, 8.0, 2.0 - i * 0.5, z, (shade('#4e4a44', 0.92 + 0.05 * i), 0.2), 'steps')

# ---- the town over the brow: roofs and lit windows the sloop sees from the sea --------------------------------------
roofs = {'slate': W.ROOF_SLATE, 'green': W.ROOF_GREEN, 'red': W.ROOF_RED}
for (x0, x1, rb, roof) in HOUSES:
    mid = (x0 + x1) / 2
    on_top(W.house, mid, (rb + TOWN_R) / 2, x0, x1, rb, TOWN_R, wall_h=2.0, rise=1.2, roof=roofs[roof], wall='#c8b898',
           door_x=mid, windows=[(x0 + 0.7, 0.85), (x1 - 0.7, 0.85)], windows_up=[(mid, 1.5)], chimney=x0 + 0.6)
on_top(W.bell_tower, TOWER[0], TOWER[1] - 0.8, TOWER[0], TOWER[1])
for x in (2.2, 12.0):
    on_top(W.lantern_post, x, TOWN_R + 1.5, x, TOWN_R + 1.5, h=1.8, energy=16)

# ---- the shore --------------------------------------------------------------------------------------------
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


# ---- the coast: the beach shelving into the sea, the cliffs' feet in the water all round ----------------------------
def beach_bias(x, r):
    d = min(math.hypot(max(c - x, 0, x - c - 1), max(rr - r, 0, r - rr - 1)) for (c, rr) in shore)
    return 1.2 if d < 1.2 else -0.5


C.coast(k, land, ground=(material, ALB), palette='emerald', rock=W.SALT[2], seed=5, reach=(0.15, 0.7), beach_bias=beach_bias,
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

# moonlight over the whole headland (as bright on the harbour as before), a warm glow over the trail
k.area_light(8.0, 6.0, 15.0, '#8090c8', 1500, 34.0, rot=(math.radians(-35), 0, 0))
k.point_light(10.0, 9.5, 2.8, '#ffc890', 30, radius=1.0)

for (c, r) in sea:          # no walking on water
    k.solid(c, r, c + 1, r + 1)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=int(os.environ.get('SAMPLES', 128)),
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
