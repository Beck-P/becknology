"""Starling Holm — a little island of your own off the Emerald Sea (world id "lumar-holm").

  BVENV/bin/python tools/bridge-art/scenes/lumar_holm.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-holm

Tucked away from the towns: a holm with a sheltered cove, an old jetty and a crumbling quay, a cottage gone to ruin on
the rise, an orchard run wild, a walled garden lost under brambles, an old boathouse sinking into the shingle. Buy the
deed and make it yours (js/holm.js): each thing you build is a scene variant (`k.variant`), rendered in the island's
own light and switched on as you build it:
  house      ruin | cottage        the cottage on the rise: tumbled stone walls and a gable standing, or rebuilt, lit, smoking
  dock       built                 the quay and jetty rebuilt: new planking, bollards, lamps, a crane, your flag
  garden     wild | tilled         the walled garden under brambles, or cleared and dug (the farm's plot: `farm.plot`)
  warehouse  built                 a stone warehouse on its lot (cargo kept ashore between ships)
  quarters   built                 a bunkhouse for your hands
  workshop   built                 an open forge under its chimney and a timber workshop by the well (js/workshop.js)
  slipway    built                 the old slip relaid, sheer-legs over it (js/shipyard.js); hull keel | frame | planked
  hall       built                 the hall of finds (js/trophies.js)
  resort     old | built           the old boathouse, or the Starling, a seaside hotel in its place (a venue that earns)
Lots that are open ground until you build on them (warehouse, quarters, workshop, hall) are left walkable here and listed
in the world JSON's `holm.lots`; js/holm.js blocks their tiles once built.

Rebuilt in the house style (Look Book 2, October 2026): the land rises gently to the cottage and falls to the coast, a
freshwater pond lies sunk below the hall in reedy, pebbly banks, the garden's walls are dry stone, gorse, heather, ferns
and foxgloves grow in layers along the rim, the houses come from the richer house kit (assets_house.py), and there's
small life everywhere — sheep on the north meadow, gulls on the quay, ducks and a heron at the pond, lobster pots and a
boat turned over on the shingle. The map is the old one: every lot, door and interaction where it was.

Previews: HOLM_PREVIEW=1 builds the variants named in HOLM_SHOW (`slot:key,...`, or `built` for the island fully built
up) into the base render and leaves the rest out, and doesn't touch the world JSON; HOLM_SAMPLES sets the samples.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import bpy                             # noqa: E402
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_farm as F                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_holm as H                # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_yard as Y                # noqa: E402
import assets_wild as WL               # noqa: E402

HK.install()                           # every house below is the richer kit's

OUT = sys.argv[1]
PREVIEW = bool(os.environ.get('HOLM_PREVIEW'))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-holm.json')
WID = 'lumar-holm'
COLS, ROWS = 42, 32
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=7707)
WL.fast_top(k)                         # the grass's rays: one BVH tree (it leaves the variants out), not every object in turn
rng = k.rng
C45 = math.cos(math.radians(45))

LOBES = [(21, 13, 16, 9), (9, 15, 6, 6.5), (33, 14, 6.5, 7)]
land = I.mask(COLS, ROWS, LOBES, seed=77, amp=0.13)
land = I.flood(land, (21, 13))
QUAY = 21
land = {(c, r) for (c, r) in land if r <= QUAY or not (14 <= c <= 28)}          # the cove
land |= {(c, r) for c in range(14, 29) for r in range(18, QUAY + 1)}
PX = 21
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
SHIP_R = QUAY + 4

HOUSE = (16.8, 24.2, 6.4, 10.6)
GARDEN = (5, 11, 11, 17)                           # the plot, tiles inclusive (the wall round it is outside)
LOTS = {'warehouse': (27, 13, 31, 17), 'quarters': (26, 6, 31, 9), 'workshop': (10, 6, 15, 9), 'hall': (33, 10, 37, 13)}
BH = (33.0, 37.4, 17.4, 20.2)                      # the boathouse / the Starling
SLIP = (8.6, 12.4, 19.8, 25.6)
POND = (18.2, 12.95, 1.45, 0.62)                   # the pond below the cottage: centre x, row, radii (its outline wanders)
WATER_Z = -0.1                                     # the pond's surface (above the sea's, so the sea's mask leaves it be)

GRASS = '#4e7e3e'
GRASS_D = '#42703a'


# ---- the land: one heightfield over the island -----------------------------------------------------------------------
PATHS = [
    [(PX + 0.5, QUAY + 0.4), (PX + 0.5, 17.5), (PX + 0.3, 15.4), (20.9, 13.0), (20.6, HOUSE[3] + 0.35)],     # jetty to cottage
    [(PX + 0.4, 15.6), (18.6, 15.2), (15.0, 14.7), (13.2, 14.3)],                                          # to the well and garden
    [(PX + 0.6, 16.8), (24.6, 17.9), (27.6, 18.5), (30.0, 18.4), (32.4, 18.7)],                           # the warehouse, the boathouse
    [(20.95, 12.9), (24.0, 11.7), (27.0, 11.0), (28.6, 10.4)],                                             # the quarters
    [(28.0, 11.1), (31.2, 11.7), (33.6, 13.0), (35.5, 14.3)],                                              # the hall
    [(20.7, 11.6), (17.6, 11.3), (14.8, 10.6), (13.5, 10.15)],                                             # the workshop
]
STEP_FLAGS = [(20.55, 10.95), (20.65, 11.35), (20.8, 11.78)]          # flags up to the cottage's door


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def pond_R(th):
    """The pond's outline as a radius (relative to its ellipse) by angle (0 east, pi/2 toward the viewer): a long
    uneven shape, a bay at the west where the heron stands, a spit of gravel from the east, a lobe toward the near bank."""
    R = 1.0 + 0.07 * math.sin(2 * th + 0.4) + 0.06 * math.sin(3 * th + 1.7) + 0.035 * math.sin(5 * th + 0.9) + 0.02 * math.sin(9 * th + 2.3)
    R += 0.16 * math.exp(-((th - 3.0) / 0.35) ** 2)
    R -= 0.18 * math.exp(-((th + 0.2) / 0.22) ** 2)
    R += 0.1 * math.exp(-((th - 1.4) / 0.45) ** 2)
    return R


def pond_d(x, r):
    cx, cr, rx, ry = POND
    u, v = (x - cx) / rx, (r - cr) / ry
    return math.hypot(u, v) / pond_R(math.atan2(v, u))


def pond_edge(th, f=1.0):
    cx, cr, rx, ry = POND
    R = pond_R(th) * f
    return cx + math.cos(th) * rx * R, cr + math.sin(th) * ry * R


NONLAND = [(c, r) for c in range(-1, COLS + 1) for r in range(-1, ROWS + 1) if (c, r) not in land]
NEAR = {}
for (c, r) in NONLAND:
    for dc in range(-3, 4):
        for dr in range(-3, 4):
            NEAR.setdefault((c + dc, r + dr), []).append((c, r))


def edge_d(x, r):
    """How far (x, r) lies inside the land: distance to the nearest cell that isn't (3 tiles at most)."""
    best = 3.0
    for (c, rr) in NEAR.get((int(math.floor(x)), int(math.floor(r))), ()):
        dx = max(c - x, 0.0, x - (c + 1))
        dr = max(rr - r, 0.0, r - (rr + 1))
        best = min(best, math.hypot(dx, dr))
    return best


FLAT = [(HOUSE[0] - 0.4, HOUSE[2] - 0.4, HOUSE[1] + 0.4, HOUSE[3] + 0.5), (BH[0] - 0.3, BH[2] - 0.3, BH[1] + 0.3, BH[3] + 0.4),
        (GARDEN[0] - 0.6, GARDEN[1] - 0.6, GARDEN[2] + 1.6, GARDEN[3] + 1.6), (12.8, 11.9, 14.2, 13.3), (13.5, 19.6, 29.5, 23.0),
        (SLIP[0] - 3.6, SLIP[2] - 1.0, SLIP[1] + 0.4, SLIP[3])] + \
       [(c0 - 0.2, r0 - 0.2, c1 + 1.2, r1 + 1.25) for (c0, r0, c1, r1) in LOTS.values()]


def flat_f(x, r):
    f = 0.0
    for (x0, r0, x1, r1) in FLAT:
        dx = max(x0 - x, 0.0, x - x1)
        dr = max(r0 - r, 0.0, r - r1)
        f = max(f, 1.0 - smooth(0.0, 0.9, math.hypot(dx, dr)))
    return f


def hgt(x, r):
    """The ground's height: a gentle swell of the land to the cottage on its rise and down to the shore, flattened where
    things are built (their lots, the garden, the quay) and worn a little lower along the paths; the pond dug into it."""
    z = 0.045 * I.n2(x, r, 0.3, 41) + 0.025 * I.n2(x, r, 0.9, 42) + 0.13 * math.exp(-(((x - 20.5) / 7.5) ** 2 + ((r - 7.0) / 3.6) ** 2))
    z += 0.05 * math.exp(-(((x - 6.0) / 2.6) ** 2 + ((r - 8.8) / 2.0) ** 2))        # the lookout's knoll
    z *= 1.0 - flat_f(x, r)
    z *= smooth(0.0, 1.6, edge_d(x, r))
    z -= 0.012 * smooth(0.55, 0.15, pd(x, r))
    d = pond_d(x, r)
    if d < 1.35:
        hollow = math.exp(-(((x - POND[0] + 0.3) / 1.0) ** 2 + ((r - POND[1]) / 0.45) ** 2))
        z -= 0.09 * smooth(1.35, 1.0, d) + 0.11 * smooth(1.0, 0.72, d) + 0.08 * hollow * smooth(0.9, 0.4, d)
    return z


def material(x, r):
    d = pond_d(x, r)
    if d < 0.97:
        return 'pond_bed'
    if d < 1.12 + 0.07 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8) > -0.15 else 'gravel'
    p = pd(x, r) + 0.13 * I.n2(x, r, 1.6, 3)
    if p < 0.4:
        return 'path'
    if p < 0.55 and I.n2(x, r, 2.4, 5) > -0.1:
        return 'path_edge'
    return 'grass'


ALB = {'path': (F.DIRT, 0.1), 'path_edge': ('#8a7e58', 0.15), 'grass': (GRASS, 0.14), 'grass_dark': (GRASS_D, 0.14),
       'pond_bed': ('#4a5040', 0.25), 'bank': ('#6a5a40', 0.25), 'gravel': ('#8a8274', 0.25)}
I.ground(k, land, material, ALB, height=hgt, bump=0.0, seed=11, dither=0.04, step=0.125)
TERRAIN = C.coast(k, land, ground=(material, ALB), palette='emerald', grass=GRASS, rock='#6a665c', seed=71, beachiness=0.25,
        beach_bias=lambda x, r: 0.9 * I.smooth(QUAY - 2.0, QUAY + 0.5, r) * (1 - I.smooth(13.0, 15.0, x) * (1 - I.smooth(28.0, 30.0, x))),
        keep_clear=[(PX - 0.4, QUAY - 0.2, PX + 1.4, SHIP_R + 0.2), (PX - 14.0, SHIP_R - 0.6, PX + 16.0, SHIP_R + 3.0),
                    (14.0, QUAY + 0.6, 29.0, QUAY + 1.6)],
        sheer=[(13.9, QUAY + 0.9, 29.1, QUAY + 4.0, 1.6)])


def gz(x, r):
    """The ground's height anywhere: the island's own, or the coast's beyond it."""
    return hgt(x, r) if (int(math.floor(x)), int(math.floor(r))) in land else TERRAIN.z(x, r)


def on_lip(x, r, lo=-0.03):
    """Off the walkable land but on dry ground above the shore (the coast's grass lip)."""
    return (int(math.floor(x)), int(math.floor(r))) not in land and TERRAIN.z(x, r) > lo


def lift(fn, x, r, *a, **kw):
    """Build with fn at z = 0, then set what it built on the ground at (x, r)."""
    sp, sl = len(k.parts), len(k.lights)
    out = fn(*a, **kw)
    dz = gz(x, r)
    if abs(dz) > 0.004:
        I.pose(k, sp, (x, r, 0), dz=dz, lights_since=sl)
    return out


def in_variant(fn):
    """Things a variant leaves to k.later (the turf creeping over a field's edge) stay in that variant."""
    v = k._var
    n0 = len(k.later)
    fn()
    if v is None:
        return
    for i in range(n0, len(k.later)):
        f0 = k.later[i]

        def run(f0=f0, v=v):
            k._var = v
            try:
                f0()
            finally:
                k._var = None
        k.later[i] = run


# ---- the pond below the cottage: still water sunk in reedy, pebbly banks ------------------------------------------------
cx, cr, rx, ry = POND
NOUT = 120
outline = [pond_edge(i / NOUT * math.tau, 1.0) for i in range(NOUT)]
k.poly([(cx, cr, WATER_Z)] + [(x, r, WATER_Z) for (x, r) in outline] + [(outline[0][0], outline[0][1], WATER_Z)], '#2a5a5a', 'pond_water')
k.solid(17, 12, 20, 14)


for th in (2.2, 2.7, 3.35, 3.8, 0.45, -0.35, -1.2, 0.95, 4.4, 1.9, -2.2):
    clump = {shade('#5a8a3a', 0.8): [], '#5a8a3a': [], shade('#6a9a44', 1.12): []}
    for j in range(rng.randint(16, 28)):
        t = th + rng.uniform(-0.15, 0.15)
        x, r = pond_edge(t, rng.uniform(0.93, 1.06))
        zb = max(hgt(x, r), WATER_Z)
        h = rng.uniform(0.38, 0.85)
        lean = rng.uniform(-0.12, 0.12)
        clump[rng.choice(list(clump))].append((x, r, zb, h, 0.028, lean, rng.uniform(-0.04, 0.04)))
        if rng.random() < 0.2:
            k.cyl(x + lean * 0.9, r, zb + h * 0.82, zb + h * 0.98, 0.026, '#5a3a20', 'cattail', verts=6)
    with k.foliage('leaf'):
        for col, bl in clump.items():
            if bl:
                k.blades(bl, (col, 0.2), 'reed')
for _ in range(30):                                                  # stones half in the water, half on the bank
    th = rng.uniform(-math.pi, math.pi)
    x, r = pond_edge(th, rng.uniform(0.94, 1.14))
    s = rng.choice((0.06, 0.09, 0.12, 0.16, 0.22)) * rng.uniform(0.85, 1.15)
    k.rock(x, r, max(hgt(x, r), WATER_Z - 0.06) - s * 0.25, s, s * 0.8, s * 0.6,
           (shade(rng.choice(('#8a8478', '#9a9080', '#7a766c')), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8)
for _ in range(9):                                                   # lily pads, a flower or two
    th, dd = rng.uniform(-math.pi, math.pi), rng.uniform(0.3, 0.8)
    x, r = pond_edge(th, dd)
    s = rng.uniform(0.11, 0.16)
    k.cyl(x, r, WATER_Z, WATER_Z + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
    if rng.random() < 0.4:
        k.sphere(x + 0.04, r, WATER_Z + 0.04, 0.05, 0.04, '#f0e0e8', 'lily_flower', segs=6)
lip, hang = [], {shade(GRASS, 0.85): [], GRASS: [], shade(GRASS, 1.15): []}
for i in range(22):                                                  # a grassy overhang on the near bank
    th = 0.9 + i * 0.035
    x, r = pond_edge(th, 1.0)
    xi, ri = pond_edge(th, 0.94)
    lip.append(((x, r, hgt(x, r) + 0.02), (xi, ri, WATER_Z + 0.03)))
    for _ in range(4):
        hang[rng.choice(list(hang))].append((xi + rng.uniform(-0.04, 0.04), ri, WATER_Z + 0.03, -rng.uniform(0.05, 0.11), 0.02,
                                             (xi - x) * 0.6 + rng.uniform(-0.02, 0.02), (ri - r) * 0.6))
for (a, b), (c, d) in zip(lip, lip[1:]):
    k.quads([(a, c, d, b)], (GRASS, 0.14), 'grass')
for col, bs in hang.items():
    k.blades(bs, (col, 0.25), 'grass')
for (dx, dr, yaw) in ((cx - 0.5, cr + 0.2, 20), (cx + 0.7, cr - 0.1, -150), (cx + 1.0, cr + 0.12, -160)):      # ducks, one with her duckling
    s = 0.7 if yaw == -160 else 1.0
    k.blob(dx, dr, WATER_Z + 0.06 * s, 0.13 * s, 0.08 * s, 0.06 * s, ('#7a5a3a' if s < 1 else '#8a6a48', 0.2), 'duck', rot=(0, 0, yaw), segs=10)
    hx, hr = dx + 0.11 * s * math.cos(math.radians(yaw)), dr + 0.11 * s * math.sin(math.radians(yaw))
    k.sphere(hx, hr, WATER_Z + 0.15 * s, 0.05 * s, 0.05 * s, '#2a5a3a' if yaw == 20 else '#6a4a2a', 'duck', segs=8)
    k.cone(hx + 0.05 * math.cos(math.radians(yaw)), hr + 0.05 * math.sin(math.radians(yaw)), WATER_Z + 0.14 * s, WATER_Z + 0.16 * s,
           0.02 * s, 0.0, '#e0a030', 'duck', verts=4)
# the heron, standing in the shallows of the west bay
HX, HR = pond_edge(3.05, 0.86)
for e in (-0.03, 0.03):
    k.cyl(HX + e, HR, WATER_Z - 0.05, WATER_Z + 0.32, 0.01, '#8a7a5a', 'heron_leg', verts=4)
k.blob(HX, HR, WATER_Z + 0.42, 0.13, 0.07, 0.08, '#9aa2aa', 'heron', rot=(0, -20, 0), segs=10)
k.tube((HX + 0.08, HR, WATER_Z + 0.45), (HX + 0.12, HR + 0.02, WATER_Z + 0.68), 0.025, '#d8dcdc', 'heron', verts=6)
k.sphere(HX + 0.12, HR + 0.02, WATER_Z + 0.7, 0.04, 0.035, '#e8ecec', 'heron', segs=8)
k.tube((HX + 0.13, HR + 0.02, WATER_Z + 0.7), (HX + 0.27, HR + 0.03, WATER_Z + 0.66), 0.012, '#d8b040', 'heron_beak', rb=0.003, verts=4)
k.blob(HX - 0.12, HR, WATER_Z + 0.38, 0.08, 0.05, 0.03, '#5a626a', 'heron', rot=(0, 25, 0), segs=8)

# ---- the old quay and jetty (always there; the dock variant rebuilds them) -----------------------------------------
QF = QUAY + 1.1                                     # the quay's face
x = 13.8
while x < 29.2:                                     # the face: courses of dressed blocks, weed and barnacles low down
    z, course = C.WZ - 0.5, 0
    while z < -0.06:
        hh = rng.uniform(0.17, 0.22)
        w = rng.uniform(0.38, 0.56)
        k.box(x + 0.012, QF - 0.16, z + 0.012, min(29.2, x + w) - 0.012, QF + rng.uniform(-0.01, 0.015), min(-0.05, z + hh) - 0.012,
              (shade(rng.choice(('#6a665c', '#5e5a52', '#726c60')), rng.uniform(0.82, 1.06) * (0.8 if z < C.WZ + 0.08 else 1.0)), 0.25),
              'quay_stone', bevel=0.02)
        z += hh
    if rng.random() < 0.5:
        k.blob(x + w / 2, QF + 0.01, C.WZ + 0.06, w * 0.45, 0.04, 0.05, ('#2a4a2e', 0.3), 'quay_weed', segs=7)
    x += w
k.box(13.8, QF - 0.3, C.WZ - 0.6, 29.2, QF - 0.12, -0.07, ('#4e4a44', 0.25), 'quay_core')
x = 14.0
while x < 29.0:                                     # the coping, worn, some stones gone, some tipped
    w = rng.uniform(0.42, 0.62)
    if rng.random() > 0.14:
        tip = rng.uniform(-0.03, 0.03) if rng.random() < 0.25 else 0.0
        k.box(x + 0.02, QF - 0.42, -0.06, min(29.0, x + w) - 0.02, QF + 0.04, -0.005 + tip + rng.uniform(0, 0.02),
              (shade(rng.choice(('#7a746a', '#706a60', '#827a6e')), rng.uniform(0.85, 1.05)), 0.2), 'quay_cope', bevel=0.02)
    x += w
r = QUAY - 0.25                                      # the apron behind it: old flags, grass in the joints, some lifted
while r < QF - 0.45:
    x = 14.0 + rng.uniform(0, 0.3)
    hh = rng.uniform(0.32, 0.42)
    while x < 28.9:
        w = rng.uniform(0.42, 0.66)
        if rng.random() > 0.3 + 0.55 * smooth(QUAY + 0.3, QUAY - 0.3, r) and not (PX - 0.1 < x + w / 2 < PX + 1.1):
            jx, jr = rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03)
            k.box(x + 0.04 + jx, r + 0.04 + jr, -0.02, min(28.95, x + w) - 0.04 + jx, r + hh - 0.04 + jr, 0.018 + rng.uniform(0, 0.012),
                  (shade(rng.choice(('#6e6a60', '#76705f', '#686458', '#7e7868')), rng.uniform(0.82, 1.04)), 0.2), 'flagstone', bevel=0.015)
        x += w
    r += hh
for i in range(3):                                  # the old jetty: grey planks, a few gone, piles leaning, weed on them
    r0 = QUAY + 0.9 + i
    for j in range(5):
        if (i, j) in ((1, 2), (2, 0)):
            continue
        k.box(PX + 0.06 + j * 0.18, r0, 0.0, PX + 0.22 + j * 0.18, r0 + 1.0, 0.05, (shade('#7a7266', rng.uniform(0.8, 1.05)), 0.2), 'old_plank')
k.box(PX + 0.0, QUAY + 0.9, -0.12, PX + 0.08, SHIP_R, 0.0, ('#4a4238', 0.2), 'old_beam')
k.box(PX + 0.92, QUAY + 0.9, -0.12, PX + 1.0, SHIP_R, 0.0, ('#4a4238', 0.2), 'old_beam')
for (dx, dr, lean) in ((0.1, QUAY + 1.6, 0.05), (0.9, QUAY + 1.6, -0.04), (0.1, SHIP_R - 0.1, -0.06), (0.9, SHIP_R - 0.1, 0.07)):
    k.tube((PX + dx, dr, C.WZ - 0.6), (PX + dx + lean, dr, 0.25), 0.07, ('#4a3e30', 0.2), 'old_pile', verts=6, smooth=False)
    k.tube((PX + dx + lean * 0.05, dr, C.WZ - 0.1), (PX + dx + lean * 0.3, dr, C.WZ + 0.1), 0.085, ('#2e4a30', 0.3), 'pile_weed', verts=6, smooth=False)
H.gull(k, PX + 0.95 + 0.07, SHIP_R - 0.1, 0.25, yaw=200)
H.gull(k, 17.4, QF - 0.25, 0.0, yaw=-30)
H.gull(k, 26.2, QF - 0.2, 0.0, yaw=160)
H.rope_coil(k, PX - 0.45, QUAY + 0.55, 0.02, n=2, col='#8a7a58')                # an old line, gone grey, by the jetty's head

# ---- the cottage on the rise: a ruin, or rebuilt -------------------------------------------------------------------
SMOKE = {}                                         # chimneys by what they belong to: they smoke once it's built
k.solid(*[HOUSE[0], HOUSE[2], HOUSE[1], HOUSE[3]])
for (fx, fr) in STEP_FLAGS:                        # flags up to the door, either way
    k.box(fx - 0.3, fr - 0.17, -0.02, fx + 0.3, fr + 0.17, 0.03, (shade('#a49a88', rng.uniform(0.9, 1.05)), 0.14), 'flagstone', bevel=0.015)
with k.variant('house', 'ruin'):
    H.ruin(k, HOUSE[0], HOUSE[1], HOUSE[2], HOUSE[3], random.Random(5151), door_x=20.5)
with k.variant('house', 'cottage'):
    ridge = W.house(k, HOUSE[0], HOUSE[1], HOUSE[2], HOUSE[3], wall_h=2.2, rise=1.4, roof='#3a5a4a', wall='#ece2cc', door_x=20.5,
                    windows=[(17.8, 0.9), (23.2, 0.9)], windows_up=[(19.0, 1.8), (22.0, 1.8)], chimney=17.5, lanterns=(19.8, 21.2))
    HK.tub(k, 19.55, HOUSE[3] + 0.45)
    HK.tub(k, 21.5, HOUSE[3] + 0.42)
    W.bench(k, 22.3, 23.5, HOUSE[3] + 0.38)
    H.washing_line(k, 24.6, 26.0, 8.2, random.Random(77))
    rm, zr = ridge
    SMOKE['house'] = [round(17.5 - 0.12, 3), round(rm - 0.15 - (zr + 1.3) * C45, 3)]

# ---- the walled garden: brambles, or dug and planted --------------------------------------------------------------
gx0, gr0, gx1, gr1 = GARDEN
WR = random.Random(3131)
H.dry_wall(k, [(gx1 + 1.4, gr0 - 0.25), (gx0 - 0.25, gr0 - 0.25), (gx0 - 0.25, gr1 + 1.25), (gx1 - 1.0, gr1 + 1.25)], WR, h=0.7, d=0.3,
           gaps=[(3.0, 3.7)], tumble=0.12, moss=0.25)
for (x, r) in ((gx1 + 1.25, gr0 - 0.25), (gx1 - 1.1, gr1 + 1.25)):            # the wall's ends, a stone pier each
    k.box(x - 0.18, r - 0.2, 0.0, x + 0.18, r + 0.2, 0.82, ('#9a9282', 0.18), 'wall_stone', bevel=0.03)
    k.box(x - 0.22, r - 0.24, 0.82, x + 0.22, r + 0.24, 0.92, ('#b0a896', 0.12), 'copestone', bevel=0.02)
k.solid(gx0 - 1, gr0 - 1, gx1 + 2, gr0)
k.solid(gx0 - 1, gr0 - 1, gx0, gr1 + 2)
k.solid(gx0 - 1, gr1 + 1, gx1 - 1, gr1 + 2)
H.ivy_on(k, 6.8, gr0 - 0.1, 0.1, 0.65, 1.2, WR, face=0.0)
H.ivy_on(k, 9.9, gr1 + 1.4, 0.1, 0.65, 1.0, WR, face=0.0)
with k.variant('garden', 'wild'):
    BR = random.Random(4141)
    spots = []
    while len(spots) < 26:
        x, r = BR.uniform(gx0 + 0.35, gx1 + 0.65), BR.uniform(gr0 + 0.35, gr1 + 0.65)
        if all(math.hypot(x - a, r - b) > 0.55 for (a, b) in spots):
            spots.append((x, r))
    with k.foliage('leaf'):
        for (x, r) in spots:
            s = BR.uniform(0.32, 0.55)
            W.leafy_crown(k, x, r, s * 0.6, s, s * 0.8, s * 0.6, shade(BR.choice(('#3a5a2a', '#34522a', '#40602e')), BR.uniform(0.9, 1.08)),
                          part='bramble')
    for i, (x, r) in enumerate(spots):
        for j in range(BR.randint(2, 6)):
            k.sphere(x + BR.uniform(-0.3, 0.3), r + BR.uniform(0.1, 0.3), BR.uniform(0.25, 0.55), 0.035, 0.035,
                     BR.choice(('#2a1028', '#5a1a3a', '#8a2a3a', '#2a1028')), 'berry', segs=5)
        if i % 3 == 0:                                       # long arching canes
            a = BR.uniform(0, math.tau)
            k.tube((x, r, 0.3), (x + math.cos(a) * 0.6, r + math.sin(a) * 0.4, 0.05), 0.015, '#5a3a3a', 'bramble_cane', verts=4)
    H.nettles(k, [(gx0 + 0.6, gr1 + 0.6), (gx1 + 0.5, gr0 + 0.6), (gx0 + 3.0, gr0 + 0.4)], BR)
    H.foxgloves(k, gx1 + 0.6, gr1 + 0.5, BR, n=4)
    k.box(gx1 + 0.2, gr1 + 0.1, 0.0, gx1 + 0.9, gr1 + 0.25, 0.04, ('#6a5a44', 0.2), 'old_board')       # a fallen gate in the grass
    k.box(gx1 + 0.15, gr1 + 0.35, 0.0, gx1 + 0.95, gr1 + 0.5, 0.04, ('#6a5a44', 0.2), 'old_board')
with k.variant('garden', 'tilled'):
    in_variant(lambda: F.earth(k, gx0 + 0.05, gr0 + 0.05, gx1 + 0.95, gr1 + 0.95))
    F.scarecrow(k, gx1 + 0.6, gr0 + 0.5)
    k.cyl(gx1 + 0.55, gr1 + 0.5, 0.0, 0.7, 0.3, ('#5a3a1e', 0.15), 'water_butt', verts=12)
    for zz in (0.1, 0.55):
        k.cyl(gx1 + 0.55, gr1 + 0.5, zz, zz + 0.04, 0.31, '#3a3a3c', 'water_butt', verts=12)
    H.wheelbarrow(k, gx0 + 0.8, gr1 + 0.55)
    k.tube((gx0 + 2.4, gr1 + 0.6, -0.1), (gx0 + 2.45, gr1 + 0.62, 0.7), 0.02, A.WOOD, 'spade', verts=5)          # a spade left in
    k.box(gx0 + 2.33, gr1 + 0.56, -0.05, gx0 + 2.5, gr1 + 0.66, 0.1, '#6a6e74', 'spade')
I.well(k, 13.5, 12.6)
k.solid(13.0, 12.1, 14.0, 13.1)
A.bucket(k, 14.25, 13.05)

# ---- the lots: open ground with a stake at each corner, or built on ------------------------------
for name, (c0, r0, c1, r1) in LOTS.items():
    pts = [(c0 + 0.1, r0 + 0.1), (c1 + 0.9, r0 + 0.1), (c1 + 0.9, r1 + 0.9), (c0 + 0.1, r1 + 0.9)]
    for (x, r) in pts:
        k.cyl(x, r, 0.0, 0.35, 0.035, ('#8a6a3a', 0.2), 'stake', verts=5)
        k.cyl(x, r, 0.3, 0.34, 0.04, '#e8e0c8', 'stake_twine', verts=5)
with k.variant('warehouse', 'built'):
    # stone, with a loading door to the path under a hoist beam, a lamp, sacks and barrels at its foot
    c0, r0, c1, r1 = LOTS['warehouse']
    W.house(k, c0 + 0.1, c1 + 0.9, r0 + 0.1, r1 + 0.95, wall_h=2.4, rise=1.3, roof='#4a3a2e', wall='#8a7e6a', timber='#3a2618',
            door_x=None, windows=[(c0 + 0.9, 0.9), (c1 + 0.1, 0.9)], stone=True)
    cx = (c0 + c1 + 1) / 2
    rf = r1 + 0.95
    k.box(cx - 0.98, rf - 0.02, 0.0, cx + 0.98, rf + 0.02, 1.86, ('#2a2018', 0.2), 'door_frame')
    for i in range(8):                                     # two leaves of boards, ledged and braced
        bx = cx - 0.9 + i * 0.225
        k.box(bx + 0.01, rf + 0.01, 0.02, bx + 0.215, rf + 0.06, 1.8, (shade('#5a3e24', rng.uniform(0.88, 1.1)), 0.16), 'warehouse_doors')
    for s in (-1, 1):
        k.bar(cx + s * 0.85, rf + 0.065, cx + s * 0.1, rf + 0.065, 0.3, 0.38, 0.03, '#4a3220', 'door_brace')
        k.bar(cx + s * 0.85, rf + 0.065, cx + s * 0.1, rf + 0.065, 1.42, 1.5, 0.03, '#4a3220', 'door_brace')
        for z in (0.45, 1.35):
            k.box(cx + s * 0.88 - 0.25 * (s > 0), rf + 0.06, z, cx + s * 0.88 + 0.25 * (s < 0), rf + 0.08, z + 0.05, A.IRON, 'hinge')
    k.box(cx - 1.1, rf - 0.02, 1.86, cx + 1.1, rf + 0.08, 2.02, ('#a49a86', 0.14), 'lintel', bevel=0.02)
    k.box(cx - 0.06, rf - 0.3, 2.06, cx + 0.06, rf + 0.7, 2.18, ('#4a3220', 0.15), 'hoist_beam')
    k.cyl(cx, rf + 0.62, 1.6, 2.06, 0.012, '#c8b48a', 'hoist_rope', verts=4)
    k.box(cx - 0.06, rf + 0.56, 1.5, cx + 0.06, rf + 0.68, 1.62, A.IRON, 'hoist_hook')
    W.wall_lantern(k, cx + 1.25, rf, z=1.7, energy=8)
    V.sacks(k, c0 + 0.55, rf + 0.35, n=3)
    A.barrel(k, c1 + 0.55, rf + 0.3, h=0.62, radius=0.22)
with k.variant('quarters', 'built'):
    c0, r0, c1, r1 = LOTS['quarters']
    q = W.house(k, c0 + 0.1, c1 + 0.9, r0 + 0.1, r1 + 0.95, wall_h=1.9, rise=1.1, roof='#5a3a2a', wall='#d8ccb0', door_x=(c0 + c1 + 1) / 2,
                windows=[(c0 + 1.0, 0.8), (c1 - 0.0, 0.8)], chimney=c1 + 0.4)
    SMOKE['quarters'] = [round(c1 + 0.4 - 0.12, 3), round(q[0] - 0.15 - (q[1] + 1.3) * C45, 3)]
with k.variant('workshop', 'built'):
    # the workshop by the well: an open forge at the west end, its hearth's chimney through the roof, and a timber shop
    # with its door on the lot's front row (js/holm.js puts the WORKSHOP interaction there), a log pile by it
    c0, r0, c1, r1 = LOTS['workshop']
    V.forge(k, c0 + 0.1, c0 + 2.5, r0 + 0.1, r1 + 0.95, wall='#7a7268', roof='#4a3e36', energy=70)
    hx = c0 + 0.1 + 2.4 * 0.32
    W.chimney_stack(k, hx, r0 + 0.3, r0 + 0.8, 0.0, 3.8, pots=1, roof_z=2.5)
    SMOKE['workshop'] = [round(hx - 0.12, 3), round(r0 + 0.55 - 0.15 - 4.1 * C45, 3)]
    W.house(k, c0 + 2.6, c1 + 0.9, r0 + 0.1, r1 - 0.05, wall_h=2.3, rise=1.2, roof='#5a4a3a', wall='#8a6a48', timber='#3a2618',
            door_x=13.5, windows=[(14.9, 0.9)])
    W.wall_lantern(k, 12.95, r1 - 0.05, z=1.6, energy=8)
    F.log_pile(k, 15.4, r1 + 0.5)
k.blocked -= {(c, r) for nm, (c0, r0, c1, r1) in LOTS.items() for c in range(c0, c1 + 1) for r in range(r0, r1 + 1)}

# ---- the rebuilt dock -------------------------------------------------------------------------------------------
with k.variant('dock', 'built'):
    W.dock(k, PX + 0.04, PX + 0.96, QUAY + 0.85, SHIP_R + 0.02, z=0.07)
    k.box(13.9, QUAY + 0.6, -0.04, 29.1, QUAY + 1.12, 0.06, ('#8a8478', 0.2), 'new_quay_cap', bevel=0.02)
    x = 13.9
    while x < 29.1:                                      # the new coping's joints
        k.box(x, QUAY + 0.6, 0.06, x + 0.015, QUAY + 1.12, 0.062, '#6a645a', 'quay_joint')
        x += 0.55
    for x in (15.0, 18.5, 24.5, 28.0):
        k.cyl(x, QUAY + 0.8, 0.06, 0.4, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
        k.cyl(x, QUAY + 0.8, 0.4, 0.45, 0.15, '#2a2a30', 'bollard_cap', verts=10)
    for x in (PX - 0.6, PX + 1.6):
        W.lantern_post(k, x, QUAY - 0.3, energy=22)
    # the crane on the quay, its jib out over the water
    k.cyl(26.6, QUAY - 0.4, 0.0, 0.18, 0.3, ('#6a6458', 0.2), 'crane_base', verts=10)
    k.cyl(26.6, QUAY - 0.4, 0.0, 2.4, 0.12, ('#5a4024', 0.1), 'crane_post', verts=8)
    k.tube((26.6, QUAY - 0.4, 2.2), (26.6, QUAY + 2.0, 1.6), 0.07, ('#5a4024', 0.1), 'crane_jib', verts=6, smooth=False)
    k.tube((26.6, QUAY - 0.4, 1.2), (26.6, QUAY + 1.0, 1.9), 0.04, ('#5a4024', 0.1), 'crane_strut', verts=5, smooth=False)
    k.tube((26.6, QUAY + 2.0, 1.6), (26.6, QUAY + 2.0, 0.6), 0.012, ('#c8b48a', 0.1), 'crane_rope', verts=4, smooth=False)
    k.box(26.5, QUAY + 1.95, 0.45, 26.7, QUAY + 2.05, 0.6, A.IRON, 'crane_hook')
    # your flag: green, a white star
    FX, FR, FH = 16.0, QUAY - 0.5, 3.2
    k.cyl(FX, FR, 0.0, 0.14, 0.14, ('#6a6458', 0.2), 'flag_base', verts=8)
    k.cyl(FX, FR, 0.0, FH, 0.04, A.WOOD_D, 'flagpole', verts=6)
    k.sphere(FX, FR, FH + 0.03, 0.06, 0.06, W.BRASS, 'flag_finial', segs=8)
    k.poly([(FX, FR, FH - 0.05), (FX + 0.95, FR + 0.02, FH - 0.2), (FX + 0.82, FR + 0.03, FH - 0.38), (FX + 0.92, FR + 0.03, FH - 0.6),
            (FX, FR, FH - 0.65)], ('#2e8a5a', 0.3), 'flag')
    sx, sz = FX + 0.42, FH - 0.36
    star = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        rr_ = 0.13 if i % 2 == 0 else 0.055
        star.append((sx + math.cos(a) * rr_, FR + 0.045, sz + math.sin(a) * rr_))
    k.poly([(sx, FR + 0.045, sz)] + star + [star[0]], '#f4f0e4', 'flag_star')
    # life on the new quay: crates and barrels landed, a coil of new rope, a handcart, a net hung to dry
    A.crate(k, 23.4, QUAY + 0.15, s=0.46, solid=False)
    A.crate(k, 23.9, QUAY + 0.22, s=0.42, tone=shade(A.WOOD_L, 0.9), solid=False)
    A.crate(k, 23.6, QUAY + 0.18, s=0.4, z0=0.39, tone=shade(A.WOOD_L, 1.08), solid=False, contents='apples')
    A.barrel(k, 19.4, QUAY + 0.35, h=0.62, radius=0.22)
    A.barrel(k, 18.95, QUAY + 0.45, h=0.58, radius=0.21, tone='#7a5a34')
    H.rope_coil(k, 25.3, QUAY + 0.6, 0.06, n=3)
    H.rope_coil(k, 17.4, QUAY + 0.7, 0.06, n=2, col='#c8b080')
k.solid(PX - 1, QUAY - 1, PX, QUAY)                      # where the lamps and the crane stand (and the sale sign before)
k.solid(PX + 1, QUAY - 1, PX + 2, QUAY)
k.solid(26, QUAY - 1, 27, QUAY)
k.solid(15.5, QUAY - 1, 16.5, QUAY)

# ---- the orchard, the trees ---------------------------------------------------------------------------------------
ORCHARD = ((16.0, 14.6), (17.6, 17.2), (24.8, 14.2), (26.0, 16.6), (14.2, 18.6), (23.4, 12.2))
for (x, r) in ORCHARD:
    lift(F.apple_tree, x, r, k, x, r, h=rng.uniform(2.0, 2.5))
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
    for j in range(rng.randint(1, 4)):                     # windfalls in the grass under it
        a, d = rng.uniform(0, math.tau), rng.uniform(0.3, 0.8)
        k.sphere(x + math.cos(a) * d, r + math.sin(a) * d * 0.7, gz(x, r) + 0.05, 0.055, 0.05, ('#b83a2a', 0.2), 'apple', segs=6)
# the pines on the heads (the one by the pond moved out onto the rim, so the hall's door can be reached past it)
for (x, r, h) in ((8.3, 8.1, 2.3), (31.6, 10.6, 2.5), (7.2, 19.6, 2.2), (34.6, 8.6, 2.6)):
    lift(W.pine, x, r, k, x, r, h=h)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
lift(W.pine, 39.2, 14.3, k, 39.2, 14.3, h=2.4)

# ---- the boathouse, or the Starling --------------------------------------------------------------------------------
# the old boathouse, roof sagging, its doors to the water — or, built (js/holm.js), the Starling: a seaside hotel on
# the same footing, white and blue, lamps lit, parasols on the lawn beside it (a venue: js/business.js `holm-resort`)
with k.variant('resort', 'old'):
    OR = random.Random(6161)
    k.box(BH[0], BH[2], 0.0, BH[1], BH[3], 0.3, ('#6a665e', 0.2), 'footing', bevel=0.02)
    x = BH[0]
    while x < BH[1] - 0.01:                                # weatherboarded: overlapping boards, grey and silvered, one or two gone
        z = 0.3
        while z < 1.4:
            if OR.random() > 0.04:
                k.box(x, BH[3] - 0.02, z, min(BH[1], x + OR.uniform(1.0, 2.2)), BH[3] + 0.03 + (z - 0.3) * 0.01, z + 0.15,
                      (shade('#6a5e4e', OR.uniform(0.8, 1.08)), 0.2), 'boathouse_board')
            z += 0.13
        x += OR.uniform(1.0, 2.2)
    k.box(BH[0], BH[2], 0.3, BH[1], BH[3] - 0.02, 1.4, ('#5a4a3a', 0.2), 'boathouse')
    for xx in (BH[0] + 0.05, BH[1] - 0.15):
        k.box(xx, BH[3] - 0.04, 0.0, xx + 0.1, BH[3] + 0.06, 1.42, ('#3a3028', 0.2), 'boathouse_post')
    sp = len(k.parts)
    W._gable_roof(k, BH[0], BH[1], BH[2], BH[3], 1.4, 0.9, '#4a4a46')
    I.tilt(k, sp, ((BH[0] + BH[1]) / 2, (BH[2] + BH[3]) / 2, 1.6), roll=3.0)      # its back gone a little out of true
    k.box(BH[0] + 1.0, BH[3], 0.0, BH[1] - 1.0, BH[3] + 0.05, 1.1, ('#2a1e14', 0.15), 'boathouse_doors')
    k.box(BH[0] + 1.0, BH[3] + 0.05, 0.0, BH[0] + 2.15, BH[3] + 0.09, 1.08, ('#5a4a38', 0.2), 'boathouse_door')   # one leaf hanging open
    k.box(BH[0] + 1.25, BH[3] + 0.09, 0.5, BH[0] + 2.05, BH[3] + 0.11, 0.56, A.IRON, 'hinge')
    H.lobster_pots(k, BH[1] - 0.95, BH[3] + 0.45, OR, n=3)
    H.ivy_on(k, BH[0] + 0.4, BH[3], 0.1, 1.2, 0.8, OR, face=0.04)
with k.variant('resort', 'built'):
    W.house(k, BH[0], BH[1], BH[2], BH[3], wall_h=2.7, rise=1.3, roof='#34507a', wall='#f0ece2', door_x=35.2,
            windows=[(33.8, 0.9), (36.6, 0.9)], windows_up=[(33.8, 1.9), (36.6, 1.9)], chimney=36.9,
            lanterns=(34.4, 36.0))
    V.board_sign(k, 'THE STARLING', 'IMFellEnglishSC-Regular', 35.2, BH[3], 1.78, size=0.22, board='#1e2e4a', ink='#f0e8d0')
    # cafe tables on the lawn under striped parasols: a thin pole, a shallow canopy of eight panels, two chairs
    for (x, r, c) in ((31.0, 18.4, '#d84848'), (32.2, 19.6, '#3a7ac8'), (31.2, 20.6, '#e0b040')):
        k.cyl(x, r, 0.0, 1.5, 0.025, '#e8e4dc', 'parasol_pole', verts=6)
        for i in range(8):
            a0, a1 = math.tau * i / 8, math.tau * (i + 1) / 8
            k.poly([(x, r, 1.52), (x + 0.7 * math.cos(a0), r + 0.7 * math.sin(a0), 1.24), (x + 0.7 * math.cos(a1), r + 0.7 * math.sin(a1), 1.24)],
                   (c if i % 2 == 0 else '#f2eee4', 0.2), 'parasol')
        k.cyl(x, r, 0.0, 0.48, 0.035, '#2e2e30', 'cafe_leg', verts=6)
        k.cyl(x, r, 0.46, 0.5, 0.26, ('#f0ece2', 0.1), 'cafe_table', verts=12)
        for dx in (-0.42, 0.42):
            k.box(x + dx - 0.11, r - 0.11, 0.0, x + dx + 0.11, r + 0.11, 0.26, ('#2e4466', 0.15), 'cafe_chair')
            bx = x + dx + (0.09 if dx > 0 else -0.11)
            k.box(bx, r - 0.11, 0.26, bx + 0.02, r + 0.11, 0.56, ('#2e4466', 0.15), 'cafe_chair_back')
    I.flagpole(k, 37.9, 18.0, h=3.0, col='#34507a')
k.solid(BH[0], BH[2], BH[1], BH[3])

# ---- the lookout, the north meadow, the rim -------------------------------------------------------------------------
lift(W.bench, 4.7, 9.4, k, 4.0, 5.4, 9.4)
k.solid(4.0, 9.2, 5.4, 9.7)
for (x, r, yaw, lamb, down) in ((18.6, 4.7, 200, False, True), (23.3, 5.1, -20, False, False), (24.05, 4.75, 160, True, True),
                                (33.1, 8.25, 120, False, True)):
    lift(H.sheep, x, r, k, x, r, rng, yaw=yaw, lamb=lamb, grazing=down)
lift(H.anchor, 18.0, 19.4, k, 18.0, 19.4, z=-0.03)                 # an old anchor sunk in the turf by the quay
SB = random.Random(8181)
lift(H.upturned_boat, 37.6, 21.0, k, 36.8, 38.5, 21.0, SB, hull='#3a5a6a')
for (x, r, s) in ((12.9, 20.4, 0.2), (3.6, 13.8, 0.24), (36.6, 13.4, 0.18), (25.2, 5.6, 0.2), (14.6, 5.3, 0.22), (29.4, 12.2, 0.17)):
    for j in range(3):                                     # rocks set in the turf, low enough to step over
        ss = s * (1.0 if j == 0 else rng.uniform(0.45, 0.7))
        xx, rr_ = x + (0 if j == 0 else rng.uniform(-0.35, 0.35)), r + (0 if j == 0 else rng.uniform(-0.2, 0.2))
        k.rock(xx, rr_, gz(xx, rr_) - ss * 0.35, ss, ss * 0.8, ss * 0.55, (shade('#8a8478', rng.uniform(0.8, 1.05)), 0.2), part='rock', segs=8)
        if j == 0:
            k.blob(xx - ss * 0.2, rr_, gz(xx, rr_) + ss * 0.2, ss * 0.5, ss * 0.4, 0.03, ('#6a8a3a', 0.25), 'moss', segs=7)
# the rim: gorse and heather, ferns and foxgloves on the grass lip round the island, thicker on the wild north and west
# heads; low only along the south, where the quay and the beaches are
RIM = random.Random(9191)
spots = []
for (c, r) in sorted(land):
    for (dc, dr) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        if (c + dc, r + dr) in land:
            continue
        for j in range(2):
            t = RIM.random()
            x = c + 0.5 + dc * RIM.uniform(0.75, 1.3) + (t - 0.5) * (1 if dr else 0) * 0.9
            rr_ = r + 0.5 + dr * RIM.uniform(0.75, 1.3) + (t - 0.5) * (1 if dc else 0) * 0.9
            spots.append((x, rr_))
RIM.shuffle(spots)
placed = []
for (x, r) in spots:
    if not on_lip(x, r, -0.02):
        continue
    if any(math.hypot(x - a, r - b) < 0.75 for (a, b) in placed):
        continue
    if SLIP[0] - 1.0 < x < SLIP[1] + 1.0 and r > SLIP[2] - 1.2:      # the slip, kept clear
        continue
    if 13.0 < x < 30.0 and r > 18.0:                                # the quay and the cove
        continue
    if BH[0] - 0.5 < x < BH[1] + 0.5 and r > BH[3] - 0.5:            # the boathouse's front
        continue
    if x > 36.0 and r > 20.0:                                       # the boat on the shingle
        continue
    south = r > 17.5
    roll = RIM.random()
    if south:
        if roll < 0.5:
            H.heather(k, x, r, RIM, s=RIM.uniform(0.22, 0.32), z=gz(x, r))
        elif roll < 0.7:
            H.ferns(k, [(x, r)], RIM, z=gz(x, r), size=0.8)
        else:
            continue
    elif roll < 0.3:
        H.gorse(k, x, r, RIM, s=RIM.uniform(0.3, 0.46), z=gz(x, r))
    elif roll < 0.55:
        H.heather(k, x, r, RIM, s=RIM.uniform(0.25, 0.4), z=gz(x, r))
    elif roll < 0.72:
        H.ferns(k, [(x, r)], RIM, z=gz(x, r))
    elif roll < 0.8:
        H.foxgloves(k, x, r, RIM, n=RIM.randint(2, 4), z=gz(x, r))
    elif roll < 0.9:
        lift(W.bush, x, r, k, x, r, s=RIM.uniform(0.26, 0.36), tone=RIM.choice(('#2e5a2e', '#3a6a34')), berries=RIM.choice((None, '#c03050', None)))
    else:
        continue
    placed.append((x, r))
# hawthorns bent by the wind on the north rim
for (x, r) in ((12.6, 4.2), (27.6, 4.3), (36.4, 6.6), (3.2, 11.2)):
    if on_lip(x, r, -0.05):
        sp = len(k.parts)
        W.tree(k, x, r, h=1.7, tone='#3a5e30', lean=0.25)
        I.pose(k, sp, (x, r, 0), dz=gz(x, r))
# the sale sign at the head of the jetty (js/holm.js takes it down once the deed's yours, the post stays)
k.box(PX + 1.45, QUAY - 0.55, 0.0, PX + 1.55, QUAY - 0.45, 1.2, A.WOOD_D, 'sign_post')
# wildflowers in clumps over the meadows (the grass itself grows over everything below, last)
F.wildflowers(k, 22.0, 15.0, 26.0, 19.5, 22)
F.wildflowers(k, 6.0, 5.6, 12.0, 9.6, 14)
F.wildflowers(k, 30.0, 4.6, 34.0, 9.6, 12)
busy = lambda x, r: pd(x, r) < 0.55                       # noqa: E731
FC = random.Random(2727)
n = 0
while n < 64:                                              # clumps of flowering grass over the open meadows
    x, r = FC.uniform(3.0, 39.0), FC.uniform(4.2, 20.5)
    if (int(x), int(r)) not in land or busy(x, r) or pond_d(x, r) < 1.4 or edge_d(x, r) < 0.4:
        continue
    if HOUSE[0] - 0.3 < x < HOUSE[1] + 0.3 and HOUSE[2] - 0.3 < r < HOUSE[3] + 0.6:
        continue
    if GARDEN[0] - 0.5 < x < GARDEN[2] + 1.5 and GARDEN[1] - 0.5 < r < GARDEN[3] + 1.5:
        continue
    if BH[0] - 0.3 < x < BH[1] + 0.3 and BH[2] - 0.3 < r < BH[3] + 0.5:
        continue
    if r > QUAY - 0.6 and 13.5 < x < 29.5:
        continue
    H.flower_clump(k, x, r, FC, z=gz(x, r))
    n += 1
I.pebbles(k, land, '#8a8478', per_cell=0.18, avoid=busy)

# ---- life round the cove and on the shingle (its own dice) ------------------------------------------------------------
LF = random.Random(5353)
# two rowing boats lying on their lines in the cove either side of the jetty (Lantern Quay's), a buoy beyond
for (x0, x1, cr_, hull, inside, ring) in ((17.4, 19.4, QUAY + 2.05, '#2a4a6a', A.WOOD_D, (18.9, QF - 0.1)),
                                          (23.3, 25.2, QUAY + 2.35, '#6a3a2a', A.WOOD_DD, (24.4, QF - 0.1))):
    since, lsince = len(k.parts), len(k.lights)
    W.rowboat(k, x0, x1, cr_, beam=0.82, hull=hull, inside=inside)
    C.sink(k, since, C.WZ + 0.12, lights_since=lsince)
    a, b = (x1 - 0.1 if x0 < PX else x0 + 0.1, cr_ - 0.2, C.WZ + 0.42), (ring[0], ring[1], -0.12)
    for i in range(4):
        t0, t1 = i / 4, (i + 1) / 4
        p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[2] + (b[2] - a[2]) * t0 - 0.15 * math.sin(math.pi * t0))
        p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1 - 0.15 * math.sin(math.pi * t1))
        k.tube(p0, p1, 0.013, '#b8a070', 'mooring_line', verts=4)
    W.annulus(k, ring[0], ring[1] + 0.02, 0.03, 0.07, -0.2, -0.16, A.IRON, 'mooring_ring', segs=10)
k.sphere(27.2, QUAY + 2.6, C.WZ + 0.06, 0.16, 0.14, ('#c84a30', 0.2), 'buoy', segs=12)
k.cyl(27.2, QUAY + 2.6, C.WZ + 0.18, C.WZ + 0.42, 0.02, A.IRON, 'buoy_post', verts=5)
H.gull(k, 27.2, QUAY + 2.6, C.WZ + 0.42, yaw=210)
# on the quay's blocked cells (by the jetty's head, under where the lamps and the crane go): what was left behind
H.old_barrels(k, 20.2, QUAY - 0.75, LF)
H.capstan(k, 26.5, QUAY - 0.45)
H.net_heap(k, 15.6, QUAY - 0.5, LF)
H.lobster_pots(k, 16.05, QUAY - 0.35, LF, n=3)
H.gull(k, 20.4, QUAY - 0.65, 0.6, yaw=-20)
# the east shingle past the boathouse: a wreck's ribs, net poles, a crab
for (x, r) in ((38.4, 18.6), (38.9, 17.6), (39.3, 16.6)):
    if on_lip(x, r, C.WZ + 0.1):
        H.boat_ribs(k, x - 0.9, x + 0.9, r, LF, z=TERRAIN.z(x, r) - 0.04)
        break
for (x, r) in ((29.6, 21.8), (31.0, 22.0), (32.4, 21.9)):
    if TERRAIN.z(x, r) > C.WZ + 0.08:
        k.cyl(x, r, TERRAIN.z(x, r) - 0.2, TERRAIN.z(x, r) + 1.2, 0.04, (A.WOOD_D, 0.15), 'net_post', verts=6)
if all(TERRAIN.z(x, r) > C.WZ + 0.08 for (x, r) in ((29.6, 21.8), (32.4, 21.9))):
    H.net_rack(k, 29.6, 31.0, 21.85, LF, h=1.15)
k.blob(30.6, 21.5, TERRAIN.z(30.6, 21.5) + 0.03, 0.06, 0.045, 0.025, '#c8502a', 'crab', segs=8)
# a fisherman's net shed on the north-east head, its lantern lit (behind the hall's lot, clear of it)
H.tarred_shed(k, 32.05, 34.15, 7.05, 8.55, LF, door_x=32.75)
I.crab_pots(k, 33.5, 9.05, n=2)
H.gull(k, 33.6, 7.6, 2.05, yaw=170)
# lights for the night before anything's built: a lantern hung on the jetty's end pile and one on the sale post's arm
k.cyl_x(PX + 0.95, PX + 1.15, SHIP_R - 0.1, 0.24, 0.015, 0.015, A.IRON, 'lantern_arm', verts=4)
W.lantern(k, PX + 1.15, SHIP_R - 0.1, 0.0, 0.2, s=0.07, energy=10)
k.cyl_x(PX + 1.5, PX + 1.8, QUAY - 0.5, 1.12, 0.015, 0.015, A.IRON, 'lantern_arm', verts=4)
W.lantern(k, PX + 1.78, QUAY - 0.5, 0.82, 1.06, s=0.08, energy=14)
# the west shingle below the slip: a boat drawn up, fish drying on a rack, crab pots
def shingle_spot(xs, rs, w, keep=(), top=-0.03):
    """The first place along the west shingle where something w long lies on dry beach, clear of what's there."""
    for r_ in rs:
        for x0 in xs:
            pts = [(x0 + w * t, r_ + dr) for t in (0.0, 0.5, 1.0) for dr in (-0.25, 0.25)]
            if all(on_lip(x, rr, C.WZ + 0.12) and TERRAIN.z(x, rr) < top for (x, rr) in pts) and \
               all(abs(x0 + w / 2 - kx) > w / 2 + 0.6 or abs(r_ - kr) > 0.9 for (kx, kr) in keep):
                return x0, r_
    return None


xs = [1.0 + 0.25 * i for i in range(30)]
rs = [17.0 + 0.25 * i for i in range(26)]
boat = shingle_spot(xs, rs, 1.8)
if boat:
    x0, r_ = boat
    sp, sl = len(k.parts), len(k.lights)
    W.rowboat(k, x0, x0 + 1.8, r_, beam=0.8, hull='#4a6a5a', inside=A.WOOD_D)
    I.pose(k, sp, (x0 + 0.9, r_, 0), yaw=12, roll=6, dz=TERRAIN.z(x0 + 0.9, r_) + 0.04, lights_since=sl)
rack = shingle_spot(xs, rs, 1.5, keep=[(boat[0] + 0.9, boat[1])] if boat else [], top=1.0)
if rack:
    x0, r_ = rack
    sp = len(k.parts)
    I.drying_rack(k, x0, x0 + 1.5, r_)
    I.pose(k, sp, (x0 + 0.75, r_, 0), dz=TERRAIN.z(x0 + 0.75, r_))
print('holm shingle: boat', boat, 'rack', rack)
for (x, r_) in ((7.6, 20.9), (7.9, 21.4), (4.2, 20.4)):
    if on_lip(x, r_, C.WZ + 0.12):
        sp = len(k.parts)
        I.crab_pots(k, x, r_, n=3)
        I.pose(k, sp, (x, r_, 0), dz=TERRAIN.z(x, r_))
        break
# the empty lots: the footings of something older on one, old timbers heaped on another, nettles round them
H.footings(k, 33.4, 10.5, 37.6, 13.7, LF, z=0.0)
H.timber_heap(k, 30.4, 14.2, LF)
H.timber_heap(k, 26.9, 7.0, LF)
H.nettles(k, [(31.2, 13.6), (26.4, 6.6), (33.6, 10.7)], LF)
H.ferns(k, [(37.2, 13.5), (29.8, 15.2), (11.0, 6.5), (14.8, 6.4)], LF)
# the lookout's cairn, on the head past the bench
for (x, r) in ((3.4, 8.6), (3.6, 9.2), (4.0, 8.4)):
    if on_lip(x, r, -0.03):
        H.cairn(k, x, r, LF, z=TERRAIN.z(x, r))
        break
# bracken and foxgloves at the trees' feet, on the cells they already stand on
for (x, r) in ORCHARD + ((8.3, 8.1), (31.6, 10.6), (7.2, 19.6), (34.6, 8.6)):
    H.ferns(k, [(x + LF.uniform(-0.3, 0.3), r + 0.25)], LF, z=gz(x, r), size=0.8)
    if LF.random() < 0.4:
        H.foxgloves(k, x + 0.3, r + 0.2, LF, n=2, z=gz(x, r))

# ---- the slipway below the garden wall (js/shipyard.js) --------------------------------------------------------------
# The old slip's bed on its piles is always there (dry to the sea's mask, so the hull built on it is never drawn under
# water); built, the slip is relaid over it, sheer-legs over its head and timber stacked by it; and a hull on it as she's
# built (`hull`: keel | frame | planked). Its own dice, laid last, so nothing else on the island moves.
SLIP_Z = (0.0, C.WZ + 0.06)
Y.clear_parts(k, (SLIP[0] - 0.3, SLIP[1] + 0.3, SLIP[2], SLIP[3] + 0.6), ('coast_rock', 'coast_weed', 'kelp', 'spore_clump', 'shell', 'driftwood', 'rim_rock'))
Y.slip_bed(k, SLIP[0], SLIP[1], SLIP[2], SLIP[3], SLIP_Z[0], SLIP_Z[1], random.Random(9091))
with k.variant('slipway', 'built'):
    yr = random.Random(9092)
    Y.slip_new(k, SLIP[0], SLIP[1], SLIP[2], SLIP[3], SLIP_Z[0], SLIP_Z[1], yr, ground=TERRAIN.z)
    Y.lumber(k, 5.2, 6.8, 19.15, 19.85, yr, solid=False)                 # (js/holm.js walls its lot once it's built)
for stage in ('keel', 'frame', 'planked'):
    with k.variant('hull', stage):
        Y.hull_on_slip(k, 10.5, 20.6, 24.8, 1.5, 0.55, 1.15, stage, SLIP[2], SLIP[3], SLIP_Z[0], SLIP_Z[1], random.Random(9093))
LOTS['slipway'] = (5, 19, 6, 19)

# ---- the hall of finds (js/trophies.js): stone and slate on the east lot, tall windows, its name over the door; its
# own dice (the house's character draws from the scene's, so they're put back after), laid last like the slip
with k.variant('hall', 'built'):
    keep = k.rng.getstate()
    c0, r0, c1, r1 = LOTS['hall']
    W.house(k, c0 + 0.1, c1 + 0.9, r0 + 0.1, r1 + 0.95, wall_h=2.6, rise=1.4, roof='#3a4250', wall='#b4ac9c', stone=True,
            door_x=35.5, windows=[(33.9, 0.8), (37.1, 0.8)], lanterns=(34.75, 36.25))
    V.board_sign(k, 'THE HALL OF FINDS', 'CinzelDecorative-Bold', 35.5, r1 + 0.95, 2.02, size=0.17, board='#24303e', ink='#e8d8a8')
    k.rng.setstate(keep)

# ---- the grass, over everything, once it's all in place --------------------------------------------------------------
# It grows wherever the turf is what's on top — looking down past the variants (fast_top leaves them out: a lot's open
# ground is grass until it's built on, and the building, composited over it, hides it).
MEADOW = sorted(set(land) | {(c + dc, r + dr) for (c, r) in land for dc in (-1, 0, 1) for dr in (-1, 0, 1)})


def grow():
    W.meadow(k, GRASS, cells=MEADOW, ok=('ground_grass', 'coast_g:grass'), density=1.0, flowers=0.8,
             avoid=lambda x, r: pd(x, r) < 0.42 or pond_d(x, r) < 1.08)


k.later.append(grow)

k.area_light(21.0, 14.0, 16.0, '#90a8c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(21.0, 13.0, 4.0, '#e0f0e8', 40, radius=1.5)


def preview():
    """HOLM_PREVIEW: the variants named in HOLM_SHOW built into the base, the rest left out."""
    want = os.environ.get('HOLM_SHOW', '')
    if want == 'built':
        want = 'house:cottage,dock:built,garden:tilled,warehouse:built,quarters:built,workshop:built,slipway:built,hull:frame,hall:built,resort:built'
    if want == 'base':
        want = 'house:ruin,garden:wild,resort:old'
    show = {tuple(s.split(':')) for s in want.split(',') if s}
    drop, gone = set(), []
    for v in k.variants:
        if (v['slot'], v['key']) in show:
            for p in v['parts']:
                p['var'] = None
            for li in v['lights']:
                li['var'] = None
        else:
            drop |= {id(p) for p in v['parts']} | {id(li) for li in v['lights']}
            gone.extend([p['obj'] for p in v['parts']] + [li['obj'] for li in v['lights']])
    bpy.data.batch_remove(gone)
    k.parts = [p for p in k.parts if id(p) not in drop]
    k.lights = [li for li in k.lights if id(li) not in drop]
    k.variants = []


if PREVIEW:
    preview()
SAMPLES = int(os.environ.get('HOLM_SAMPLES', 96))
if os.environ.get('HOLM_RESUME'):                      # a render cut short: every pass already written is kept, the rest rendered
    _render_pass = k._render
    k._render = lambda path: None if os.path.exists(path) else _render_pass(path)
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=SAMPLES,
         world_light=('#26384a', 0.8))
if PREVIEW:
    sys.exit(0)

# ---- the world -----------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Starling Holm', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': '#d8f0e0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY + 2, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         {'x': PX + 1, 'y': QUAY - 1, 'type': 'holm', 'act': 'deed', 'label': 'FOR SALE', 'prompt': 'PRESS E TO READ'},
         {'x': 20, 'y': 10, 'type': 'holm', 'act': 'house', 'label': 'THE COTTAGE', 'prompt': 'PRESS E TO GO IN'},
         {'x': 29, 'y': 17, 'type': 'holm', 'act': 'warehouse', 'label': 'WAREHOUSE', 'prompt': 'PRESS E TO LOOK'},
         {'x': 28, 'y': 9, 'type': 'holm', 'act': 'quarters', 'label': 'QUARTERS', 'prompt': 'PRESS E TO LOOK'},
         {'x': 13, 'y': 9, 'type': 'holm', 'act': 'workshop', 'label': 'WORKSHOP', 'prompt': 'PRESS E TO LOOK'},
         {'x': 10, 'y': 19, 'type': 'holm', 'act': 'slipway', 'label': 'SLIPWAY', 'prompt': 'PRESS E TO LOOK'},
         {'x': 35, 'y': 13, 'type': 'holm', 'act': 'hall', 'label': 'THE HALL', 'prompt': 'PRESS E TO LOOK'},
         {'x': 12, 'y': 14, 'type': 'holm', 'act': 'garden', 'label': 'THE GARDEN', 'prompt': 'PRESS E TO LOOK'},
         {'x': 13, 'y': 12, 'type': 'farm_well', 'label': 'WELL', 'prompt': 'PRESS E TO DRAW WATER'},
         look('BOATHOUSE', 33, 18, 'THE OLD BOATHOUSE, ITS ROOF SAGGING. INSIDE, A ROWING BOAT WITH NO BOTTOM AND A NAME YOU CAN\'T READ.'),
         look('LOOKOUT', 5, 10, 'A BENCH ON THE WEST HEAD. THE CAPITAL\'S LIGHTS ON ONE SIDE, NOTHING BUT SEA ON THE OTHER.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER, scene_id=WID, actors=[],
            scene_extra={'backdrop': True, 'smoke': [], 'layers': {'house': 'ruin', 'garden': 'wild', 'resort': 'old'}})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in land and (c, r) not in PIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
w['farm'] = {'plot': list(GARDEN)}
w['holm'] = {'lots': {n: list(v) for n, v in LOTS.items()}, 'smoke': SMOKE}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('holm done; walkable', len(land))
