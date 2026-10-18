"""Hoarfell — Fellhaven, the ski village under the cliffs. Blender scene (rebuilt Oct 2026 in the Look Book 2 style).

  BVENV/bin/python tools/bridge-art/scenes/hoarfell.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell

Day on an ice world, the low sun turning the snow pink and the shadows blue (live light moves it through the day).
Across the top the Hoarspire massif in tiers of rock, snow on every ledge, three climbing routes leaving from its
foot — the Staircase (a fixed yellow line up the beds), the Icefall (a frozen waterfall hung in a recess) and the
Hoarspire itself (red, a flag on its shoulder) — and the chairlift climbing over them. A brook comes down from the
foot of the cliffs, under the street in a stone culvert, into the tarn. The village street, the snow ploughed into
banks along it: Ysolde's guide hut, the Snowcap Lodge with its balcony and dormers, the ski hire, the lift station;
south of the street Tove's cocoa hut with a brazier and barrel tables, the frozen tarn sunk in its bank with an
ice-fishing hole and a swept rink, the snowman, two chalets, and the landing pad. Firs in clusters, saplings, bare
birches, shrubs under the snow, a buried fence, boot prints and sled tracks.

The map is the one the game has always had: every door, interaction, NPC and spot where it was.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_hoarfell_rich as HR      # noqa: E402
import assets_isle as I                # noqa: E402
import assets_ship as P                # noqa: E402
import assets_signs as G               # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 34
C = math.cos(math.radians(45))
sm = HR.sm

k = Kit(COLS, ROWS, margin_top=3.6, margin_bottom=0.6, seed=1907)
rr = random.Random(1907)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


# ---- the plan: paths, places kept flat, the tarn, the brook --------------------------------------------------------
PATHS = [   # (polyline, half width)
    ([(1.2, 15.75), (8.0, 15.62), (15.0, 15.78), (22.0, 15.66), (30.0, 15.76), (37.0, 15.64), (44.8, 15.72)], 0.78),   # the street
    ([(19.5, 13.7), (19.5, 15.2)], 0.62), ([(30.5, 13.7), (30.5, 15.2)], 0.55),                                        # lodge, ski hire
    ([(5.0, 12.1), (5.05, 15.2)], 0.55),                                                                              # guide hut
    ([(9.6, 15.2), (9.75, 12.4), (9.6, 9.6), (9.0, 7.5)], 0.5),                                                      # up to the Staircase
    ([(26.4, 15.2), (26.5, 11.0), (26.0, 8.6), (23.6, 7.9), (22.2, 7.55)], 0.55),                                    # round the lodge to the Icefall
    ([(35.0, 15.2), (35.1, 11.4), (34.9, 7.5)], 0.52),                                                               # up to the Hoarspire
    ([(41.5, 15.2), (41.5, 13.4)], 0.95),                                                                             # the lift station
    ([(23.6, 16.3), (23.7, 18.5), (23.2, 20.3), (21.0, 20.4), (18.4, 20.2)], 0.58),                                  # the cocoa hut
    ([(13.6, 16.3), (13.7, 18.0), (13.3, 19.9)], 0.5),                                                                # down to the tarn
    ([(40.8, 16.3), (40.9, 20.0), (40.7, 24.0), (40.4, 25.8)], 0.6),                                                 # to the pad
    ([(27.0, 24.0), (32.0, 24.1), (37.0, 23.95), (40.7, 24.0)], 0.55),                                               # the chalets' lane
    ([(30.5, 23.3), (30.5, 24.0)], 0.5), ([(37.0, 22.9), (37.0, 24.0)], 0.5),                                        # their doors
]
FLAT = [    # (x0, r0, x1, r1): buildings and the things at their feet, where the ground stays level
    (2.4, 6.9, 9.6, 12.8), (13.6, 9.0, 25.4, 14.4), (27.6, 10.0, 33.8, 14.6), (39.6, 9.8, 43.6, 14.0),
    (19.4, 17.8, 23.2, 20.0), (27.4, 19.6, 33.6, 24.0), (34.0, 19.2, 40.0, 23.6), (9.9, 9.7, 11.3, 11.1),
]
PAD = (38.6, 28.6)
TX, TR, TRX, TRY = 10.8, 22.6, 4.4, 2.5                                         # the tarn
BROOK = [(12.3, 7.25), (12.75, 8.6), (12.9, 10.2), (12.55, 12.3), (12.2, 14.2), (12.0, 15.7), (11.85, 17.0), (11.6, 18.6),
         (11.2, 19.8), (10.9, 20.6)]


def path_dist(x, r):
    return min(I.path_dist([p], x, r) - w for (p, w) in PATHS)


def brook_dist(x, r):
    return I.path_dist([BROOK], x, r)


def flat_mask(x, r, m=0.55):
    """0 on a building's plot (and m tiles round it), 1 away from them."""
    f = 1.0
    for (x0, r0, x1, r1) in FLAT:
        dx = max(x0 - x, 0.0, x - x1)
        dr = max(r0 - r, 0.0, r - r1)
        f = min(f, sm(0.0, m, math.hypot(dx, dr)))
    d = math.hypot(x - PAD[0], (r - PAD[1]) * 1.0)
    return min(f, sm(3.5, 4.3, d))


def tarn_rad(a):
    return 1.0 + 0.08 * math.sin(3 * a + 0.6) + 0.05 * math.sin(5 * a + 2.1) + 0.03 * math.sin(9 * a)


def tarn_inside(x, r):
    dx, dr = (x - TX) / TRX, (r - TR) / TRY
    return 1 - math.hypot(dx, dr) / tarn_rad(math.atan2(dr, dx))


def height(x, r):
    h = 0.0
    pd = path_dist(x, r)
    fm = flat_mask(x, r)
    ins = tarn_inside(x, r)
    bd = brook_dist(x, r)
    away = sm(0.15, 0.9, pd) * fm
    # drifts: soft wind-shaped mounds, longer across the wind
    n = I.n2(x * 0.42, r * 0.8, 1.0, 41) * 0.6 + I.n2(x * 1.1, r * 1.6, 1.0, 43) * 0.4
    h += max(0.0, n) * 0.36 * away * (1 - sm(-0.3, 0.0, ins)) * sm(0.5, 1.2, bd)
    # snow ploughed into banks along the street
    sd = I.path_dist([PATHS[0][0]], x, r)
    other = min(I.path_dist([p], x, r) - w for (p, w) in PATHS[1:])
    h += 0.26 * math.exp(-((sd - 1.45) / 0.34) ** 2) * sm(0.05, 0.6, other) * fm * sm(0.6, 1.1, bd)
    # the land rising toward the foot of the cliffs: talus under snow
    h += 0.32 * sm(9.2, 7.1, r) * sm(0.05, 0.6, pd)
    # the tarn's basin and the low lip of snow round its shore
    if ins > -0.2:
        h -= 0.26 * sm(-0.12, 0.35, ins)
        h += 0.07 * sm(-0.18, -0.04, ins) * (1 - sm(-0.04, 0.05, ins))
    # the brook's bed and its banks (not under the street, where it runs through the culvert)
    if bd < 1.0 and abs(r - 15.7) > 1.0:
        h -= 0.16 * sm(0.75, 0.25, bd)
        h += 0.05 * math.exp(-((bd - 0.75) / 0.18) ** 2)
    # paths pressed a little into the snow
    h -= 0.03 * sm(0.3, -0.2, pd)
    return h


def HZ(x, r):
    """The ground's height at a point (for setting small things on it)."""
    return height(x, r)


def material(x, r):
    pd = path_dist(x, r) + 0.12 * I.n2(x, r, 2.7, 9)
    if tarn_inside(x, r) > 0.0:
        return 'ice_bank'
    if brook_dist(x, r) < 0.42 and abs(r - 15.7) > 0.95:
        return 'stream_bed'
    if pd < 0.0:
        return 'path'
    if pd < 0.16:
        return 'path_edge'
    if math.hypot(x - PAD[0], r - PAD[1]) < 3.6:
        return 'snow_ploughed'
    return 'snow'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(4, ROWS + 2)]
I.ground(k, cells, material, {'snow': (N.SNOW, 0.04), 'path': ('#c8ced8', 0.06), 'path_edge': ('#d8dee6', 0.05),
                              'snow_ploughed': ('#dde2ea', 0.05), 'ice_bank': ('#d2deec', 0.06), 'stream_bed': ('#8a9cb0', 0.08)},
         step=0.0625, bump=0.01, seed=7, height=height, dither=0.07)

# ---- the massif: tiers of rock stepping back, the icefall in its recess ---------------------------------------------------
TIERS = [(1.15, 7.0), (2.3, 6.45), (3.45, 5.9), (4.6, 5.3), (6.0, 4.5), (7.4, 3.55), (8.8, 2.5), (10.2, 1.3), (11.6, 0.0)]
RECESS = (20.6, 23.6)
H = HR.crag(k, -1.5, COLS + 1.5, TIERS, recess=[RECESS], rr=random.Random(11))
HR.icefall(k, RECESS[0] + 0.2, RECESS[1] - 0.2, TIERS[3][1] + 0.25, TIERS[2][0] - 0.02, r_bot=7.0, rr=random.Random(5))


def climb_line(x, col, upto):
    """A fixed line up the tiers at x: up each face, along each ledge to the next."""
    pts = [(x, 7.15, 0.05)]
    for i in range(upto):
        zt, rf = TIERS[i]
        nz, nf = TIERS[i + 1] if i + 1 < len(TIERS) else (zt + 1, rf - 0.6)
        xo = x + (0.12 if i % 2 else -0.12)
        pts.append((xo, rf - 0.04, zt * 0.55))
        pts.append((xo + 0.05, rf - 0.12, zt + 0.06))
        pts.append((xo, nf + 0.05, zt + 0.06))
    HR.fixed_line(k, pts, col)
    return pts


climb_line(8.0, '#e0b030', 6)                                                    # the Staircase
HR.route_foot(k, 8.0, 7.0, '#e0b030')
HR.route_foot(k, 23.2, 7.25, '#3a8ae0')                                          # the Icefall
climb_line(34.95, N.RED, 4)                                                      # the Hoarspire
HR.route_foot(k, 35.0, 7.0, N.RED)
FZ = H(35.4, 4.0)
k.cyl(35.4, 4.0, FZ, FZ + 2.0, 0.035, ('#c0c4cc', 0.1), 'flagpole', verts=6)    # the flag on the Hoarspire's shoulder
k.poly([(35.4, 4.0, FZ + 1.95), (36.25, 4.05, FZ + 1.72), (35.4, 4.0, FZ + 1.42)], (N.RED, 0.1), 'flag')
k.blob(35.4, 4.0, FZ + 0.02, 0.3, 0.25, 0.1, (N.ROOF_SNOW, 0.05), 'drift', segs=8)
for (x, r) in ((14.2, 7.6), (28.6, 7.4), (38.6, 7.5), (3.2, 7.6)):              # hoar crystals at the cliff foot
    W.shore_crystals(k, x, r, col=('#2a4a7a', '#a8dcff'), s=0.7, energy=5, z=HZ(x, r) - 0.04)
for (x, r, s) in ((11.0, 7.75, 0.45), (17.2, 7.85, 0.6), (31.0, 7.75, 0.5), (44.0, 7.85, 0.55), (1.2, 8.05, 0.5),
                  (25.0, 7.6, 0.35), (39.8, 7.7, 0.4)):
    HR.rock(k, x, r, s, z=HZ(x, r) - 0.06, rr=rr)
    k.solid(x - s, r - s * 0.8, x + s, r + s * 0.8)

# ---- the brook: open water in a bed of stones under thin ice, a culvert under the street ---------------------------------
seg = []
for (a, b) in zip(BROOK, BROOK[1:]):
    n = max(1, int(math.dist(a, b) / 0.3))
    seg += [(a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n) for t in range(n)]
seg.append(BROOK[-1])
for i, ((ax, ar), (bx, br)) in enumerate(zip(seg, seg[1:])):
    if abs((ar + br) / 2 - 15.7) < 1.0:
        continue
    z = -0.115
    wdt = 0.2 + 0.05 * math.sin(i * 0.9)
    L = math.hypot(bx - ax, br - ar)
    nx, nr = -(br - ar) / L * wdt, (bx - ax) / L * wdt
    k.quads([((ax - nx, ar - nr, z), (ax + nx, ar + nr, z), (bx + nx, br + nr, z), (bx - nx, br - nr, z))], ('#2e5a72', 0.05), 'stream_water')
    if i % 5 in (1, 2, 3):                                                         # ice over most of it, open water between
        k.blob((ax + bx) / 2, (ar + br) / 2, -0.105, 0.3, 0.26, 0.02, ('#d0e2ee', 0.06), 'ice', segs=10)
    elif i % 5 == 4:                                                               # snow shelving out from a bank
        s_ = 1 if (i // 5) % 2 else -1
        k.blob(ax + nx * s_ * 1.2, ar + nr * s_ * 1.2, -0.08, 0.28, 0.2, 0.05, (N.SNOW, 0.05), 'drift', segs=8)
    if i % 9 == 4:                                                                 # a stone with a cap of snow
        HR.rock(k, ax + nx * rr.uniform(-0.6, 0.6), ar + nr * rr.uniform(-0.6, 0.6), rr.uniform(0.1, 0.16), z=-0.12, rr=rr, part='stream_stone')
for rf_ in (14.92, 16.5):                                                          # the culvert's stone headwalls
    sgn = -1 if rf_ < 15.7 else 1
    k.box(11.3, rf_ - 0.12, -0.14, 12.75, rf_ + 0.06, 0.04, ('#7a7e88', 0.12), 'culvert_wall', bevel=0.02)
    x = 11.3
    while x < 12.7:
        k.box(x + 0.01, rf_ + 0.06 * (1 if sgn > 0 else -1) - 0.005, -0.12, x + 0.22, rf_ + 0.065 * (1 if sgn > 0 else -1), 0.03,
              (shade('#7a7e88', rr.uniform(0.85, 1.12)), 0.12), 'culvert_stone')
        x += 0.24
    k.cyl_y(12.05, rf_ - 0.14, rf_ + 0.08, -0.12, 0.26, 0.2, '#14202a', 'culvert_mouth', verts=12)

# ---- the tarn: an ice sheet over most of it, open water where the brook comes in -------------------------------------------
SEGS = 80


def ring(scale, z, bite=False):
    pts = []
    for i in range(SEGS):
        a = i / SEGS * math.tau
        f = tarn_rad(a) * scale
        if bite:                                   # the brook keeps a patch open at the top left
            ang = math.atan2(math.sin(a), math.cos(a))
            f *= 1 - 0.45 * sm(0.75, 0.15, abs(ang - (-2.0)))
        pts.append((TX + math.cos(a) * TRX * f, TR + math.sin(a) * TRY * f, z))
    return pts[::-1]


k.poly([(TX, TR, -0.2)] + ring(0.97, -0.2) + [ring(0.97, -0.2)[0]], ('#2e5a72', 0.05), 'pond_water')
ice = ring(0.985, -0.175, bite=True)
k.poly([(TX + 0.6, TR + 0.4, -0.175)] + ice + [ice[0]], ('#c6dcea', 0.06), 'ice')
for p, q in zip(ice, ice[1:] + ice[:1]):
    k.tube((p[0], p[1], -0.17), (q[0], q[1], -0.17), 0.035, ('#e2eef6', 0.05), 'ice_rim', verts=5)
for _ in range(16):                                                                # cracks
    a = rr.uniform(0, math.tau)
    x0, r0 = TX + 0.6 + math.cos(a) * TRX * rr.uniform(0.05, 0.4), TR + 0.4 + math.sin(a) * TRY * rr.uniform(0.05, 0.4)
    pts = [(x0, r0)]
    for j in range(5):
        a += rr.uniform(-0.6, 0.6)
        pts.append((pts[-1][0] + math.cos(a) * 0.5, pts[-1][1] + math.sin(a) * 0.28))
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        if tarn_inside(bx, br) > 0.15 and tarn_inside(ax, ar) > 0.15:
            k.tube((ax, ar, -0.169), (bx, br, -0.169), 0.012, ('#7aa2c0', 0.05), 'crack', verts=4)
RINK = (9.2, 23.3, 1.6, 0.85)
k.cyl(RINK[0], RINK[1], -0.175, -0.166, RINK[2], ('#dcecf6', 0.04), 'rink', verts=32, ry=RINK[3])
for i in range(10):                                                                # skate marks round the rink
    a0, rad = rr.uniform(0, math.tau), rr.uniform(0.5, 1.15)
    for j in range(7):
        a, b = a0 + j * 0.22, a0 + (j + 1) * 0.22
        k.tube((RINK[0] + math.cos(a) * RINK[2] * rad, RINK[1] + math.sin(a) * RINK[3] * rad, -0.163),
               (RINK[0] + math.cos(b) * RINK[2] * rad, RINK[1] + math.sin(b) * RINK[3] * rad, -0.163), 0.008, ('#f6fbff', 0.03), 'skate', verts=4)
for _ in range(14):                                                                # wind-blown snow lying on the ice
    a, d = rr.uniform(0, math.tau), rr.uniform(0.45, 0.85)
    x, r = TX + math.cos(a) * TRX * d, TR + math.sin(a) * TRY * d
    if tarn_inside(x, r) < 0.15 or abs(math.atan2(math.sin(a), math.cos(a)) + 2.0) < 0.8 or abs(x - RINK[0]) < 2 and abs(r - RINK[1]) < 1:
        continue
    for j in range(4):
        k.blob(x + j * rr.uniform(0.15, 0.3), r + rr.uniform(-0.05, 0.05), -0.17, rr.uniform(0.18, 0.4), rr.uniform(0.04, 0.09), 0.012,
               (N.SNOW, 0.04), 'ice_snow', rot=(0, 0, rr.uniform(-8, 8)), segs=10)
IZ = -0.175                                                                        # somebody's ice-fishing hole, on the ice
k.cyl(12.5, 22.6, IZ - 0.01, IZ + 0.012, 0.32, ('#dcecf6', 0.05), 'rink', verts=16)
k.cyl(12.5, 22.6, IZ - 0.02, IZ + 0.016, 0.2, ('#10283a', 0.05), 'hole', verts=14)
k.cyl(12.95, 22.75, IZ, IZ + 0.32, 0.12, (N.LOG, 0.1), 'stool', verts=8)
k.cyl(12.1, 22.8, IZ, IZ + 0.22, 0.1, ('#8a8e98', 0.1), 'bucket', verts=8)
k.tube((12.75, 22.5, IZ + 0.3), (12.45, 22.55, IZ + 0.75), 0.012, ('#6a4a2a', 0.1), 'rod', verts=4)
k.tube((12.45, 22.55, IZ + 0.75), (12.5, 22.6, IZ + 0.02), 0.004, ('#e8e4dc', 0.1), 'line', verts=3)
k.solid(12, 22, 13, 23)
for (x, r, s) in ((6.5, 21.8, 0.28), (6.9, 23.9, 0.22), (14.9, 21.3, 0.3), (15.1, 23.5, 0.24), (8.3, 20.5, 0.2), (13.6, 24.95, 0.26)):
    HR.rock(k, x, r, s, z=HZ(x, r) - 0.05, rr=rr, part='shore_rock')
for i in range(22):                                                                # reeds through the snow on the near shore
    a = math.pi * (0.15 + 0.7 * rr.random())
    x, r = TX + math.cos(a) * TRX * 1.03, TR + math.sin(a) * TRY * 1.03
    for j in range(3):
        k.tube((x + j * 0.05, r, HZ(x, r) - 0.02), (x + j * 0.05 + rr.uniform(-0.06, 0.06), r - 0.02, HZ(x, r) + rr.uniform(0.25, 0.45)), 0.012,
               ('#b8a070', 0.1), 'reed', verts=4)
W.bench(k, 3.0, 4.6, 19.6)
k.blob(3.8, 19.7, 0.5, 0.6, 0.14, 0.05, (N.ROOF_SNOW, 0.05), 'bench_snow', segs=8)
for (x, c) in ((5.1, '#c83a2e'),):                                                 # somebody's skates on the bench's end
    k.box(x - 0.08, 19.5, 0.46, x + 0.08, 19.75, 0.6, (c, 0.1), 'skate_boot')

# ---- the chairlift --------------------------------------------------------------------------------------------------------
LX, LR = 41.5, 12.5
bull = N.lift_station(k, LX, LR)
p1 = N.pylon(k, LX, 8.6, 3.0, z0=HZ(LX, 8.6) - 0.05)
z2 = H(LX, 4.0)
p2 = N.pylon(k, LX, 4.0, 2.4, z0=z2 - 0.05)
z3 = H(LX, 0.4)
p3 = N.pylon(k, LX, 0.4, 2.4, z0=z3 - 0.05)
far = [(p3[0][0], -8.0, z3 + 5.4), (p3[1][0], -8.0, z3 + 5.4)]
lines = []
for s in (0, 1):
    pts = [bull[s], p1[s], p2[s], p3[s], far[s]]
    N.cable(k, pts)
    lines.append([screen(*p) for p in pts])
k.solid(LX - 1.6, LR - 1.1, LX + 1.6, LR - 0.6)
for x in (39.85, 43.15):                                                           # the queue's rope posts
    for r in (13.7, 14.6):
        k.cyl(x, r, 0, 0.7, 0.035, ('#c8c4bc', 0.1), 'rope_post', verts=6)
        k.blob(x, r, 0.72, 0.06, 0.06, 0.04, (N.ROOF_SNOW, 0.05), 'post_snow', segs=6)
    k.tube((x, 13.7, 0.6), (x, 14.6, 0.6), 0.015, (N.RED, 0.1), 'rope', verts=4)
k.box(40.2, 10.15, 0.3, 42.8, 10.25, 0.95, (N.LOG_D, 0.1), 'lift_board')
G.letters(k, 'LIFT', 'Righteous', 41.5, 10.25, 0.45, size=0.32, col='#ffd890', lit=True, energy=3)
HR.skis(k, 39.4, 10.9, cols=('#2a9a5a', '#e0b030'))

# ---- Ysolde's guide hut and the route board --------------------------------------------------------------------------------
SMOKE = []
SMOKE.append(HR.chalet(k, 2.8, 8.98, 8.0, 12.0, wall_h=1.75, rise=1.25, gable='side', door_x=5.0, windows=[(3.75, 0.8), (6.25, 0.8), (8.35, 0.8)],
                       chimney=3.4, shutters='#2a4a3a', door_col='#6a2a22', dormers=(6.6,), rr=random.Random(3)))
N.hanging_sign(k, 7.3, 12.02, 0.85, 'axe')                                        # GUIDES: an ice axe and a coil of rope
W.bulletin_board(k, 10.6, 10.4)
k.solid(10, 10, 12, 11)
k.blob(10.6, 10.4, 1.8, 0.85, 0.22, 0.06, (N.ROOF_SNOW, 0.05), 'board_snow', segs=8)
N.woodpile(k, 1.0, 2.4, 11.2)
k.quads([((0.85, 10.75, 1.15), (2.55, 10.75, 1.15), (2.55, 11.7, 0.9), (0.85, 11.7, 0.9))], (N.LOG_D, 0.1), 'roof_woodshed')
k.blob(1.7, 11.2, 1.12, 0.9, 0.5, 0.06, (N.ROOF_SNOW, 0.04), 'roof_snow', segs=10)
for x in (0.9, 2.5):
    k.box(x - 0.04, 11.66, 0, x + 0.04, 11.74, 0.92, (N.LOG_D, 0.1), 'post')
N.sled(k, 9.6, 13.2)
HR.skis(k, 2.2, 12.25, cols=('#e0b030', '#e0b030'))
k.cyl(3.0, 12.35, 0, 0.45, 0.16, ('#7a5232', 0.12), 'coil_crate', verts=10)
for j in range(3):                                                                  # coils of rope on it
    k.cyl(3.0, 12.35, 0.45 + j * 0.06, 0.5 + j * 0.06, 0.13 - j * 0.02, ('#e0b030', 0.1), 'rope_coil', verts=10)
HR.snowshoes(k, 4.2, 12.05, z=0.55)
HR.bird_feeder(k, 1.4, 13.4)

# ---- the Snowcap Lodge --------------------------------------------------------------------------------------------------------
SMOKE.append(HR.chalet(k, 14.0, 25.0, 9.4, 13.6, wall_h=2.7, rise=2.0, gable='side', door_x=19.5,
                       windows=[(15.2, 0.85), (16.9, 0.85), (22.1, 0.85), (23.8, 0.85)],
                       windows_up=[(15.2, 2.0), (16.7, 2.0), (22.3, 2.0), (23.8, 2.0)], chimney=23.4, balcony=(14.5, 24.5),
                       lanterns=(18.6, 20.4), canopy=False, shutters='#7a2a22', door_col='#5a3420', dormers=(16.4, 19.5, 21.4), rail_boxes=False,
                       rr=random.Random(7)))
BZ = 2.7 * 0.55                                                                    # the name along the balcony's rail
k.box(17.0, 14.17, BZ + 0.12, 22.0, 14.23, BZ + 0.6, (N.LOG_D, 0.1), 'sign_board')
G.letters(k, 'Snowcap Lodge', 'Pacifico', 19.5, 14.23, BZ + 0.17, size=0.32, col='#ffd890', lit=True, energy=5)
N.hanging_sign(k, 14.25, 13.58, 1.55, 'bed')
for (x, c) in ((14.35, '#7a1a22'), (24.65, '#1e3a5a')):                            # the lodge's flags, its clipped firs
    HR.flagpole(k, x, 14.25, c)
for x in (18.55, 20.45):
    HR.tub_fir(k, x, 14.05)
HR.skis(k, 25.25, 13.2, cols=('#c83a2e', '#c83a2e'))
HR.skis(k, 25.45, 12.2, cols=('#2a6ac0', '#e8e8f0'))
N.woodpile(k, 14.2, 15.8, 14.1)
HR.barrel_snow(k, 24.7, 14.1)
HR.string_lights(k, (14.2, 13.95, 2.0), (17.2, 13.95, 2.0), sag=0.18)
HR.string_lights(k, (21.8, 13.95, 2.0), (24.8, 13.95, 2.0), sag=0.18)

# ---- the ski hire, its racks -----------------------------------------------------------------------------------------------------
SMOKE.append(HR.chalet(k, 28.0, 33.4, 10.4, 13.6, wall_h=2.1, rise=1.5, gable='front', door_x=30.5, windows=[(29.0, 0.85), (32.2, 0.85)],
                       chimney=32.4, balcony=False, canopy=False, shutters='#2e4a6a', door_col='#c83a2e', rr=random.Random(9)))
k.box(28.6, 13.6, 1.98, 32.8, 13.66, 2.08, (N.LOG_D, 0.1), 'sign_board')
G.letters(k, 'SKI HIRE', 'Righteous', 30.7, 13.66, 1.72, size=0.24, col='#ff6a4a', lit=True, energy=4)
N.ski_rack(k, 28.2, 29.8, 14.4)
N.ski_rack(k, 31.3, 32.9, 14.4)
N.hanging_sign(k, 33.2, 13.58, 1.05, 'skis')
for (x, c) in ((27.4, ('#e0b030', '#2a9a5a')), (33.9, ('#a040c0', '#e8e8f0'))):
    HR.skis(k, x, 12.8, cols=c)
HR.crate_snow(k, 34.0, 11.4)

# ---- the street: lamps, a signpost, bunting -------------------------------------------------------------------------------------
for (x, r) in ((10.2, 14.4), (36.6, 14.4), (15.6, 17.0), (33.0, 17.0), (2.4, 17.0)):
    W.lantern_post(k, x, r, energy=30)
    k.blob(x + 0.28, r, 2.08, 0.12, 0.12, 0.04, (N.ROOF_SNOW, 0.05), 'lamp_snow', segs=6)
N.signpost(k, 25.3, 14.4)
W.bunting(k, (24.9, 13.75, 2.3), (28.1, 13.75, 2.1), sag=0.35)

# ---- the cocoa hut, braziers, barrel tables, the snowman ----------------------------------------------------------------------------
N.cocoa_hut(k, 20.0, 22.6, 18.3, 19.4)
N.hanging_sign(k, 22.45, 19.62, 1.3, 'mug')
k.solid(19, 19, 20, 20)                                                         # Tove, beside her hut
HR.string_lights(k, (19.8, 19.85, 1.95), (16.4, 19.6, 1.4), sag=0.2)
k.cyl(16.4, 19.6, 0, 1.5, 0.035, (N.LOG_D, 0.1), 'pole', verts=6)
k.solid_post(16.4, 19.6)
HR.brazier(k, 25.4, 18.4)
HR.barrel_table(k, 24.9, 19.7)
HR.barrel_table(k, 17.0, 18.6, mugs=1)
N.snowman(k, 17.2, 22.4)
N.sled(k, 16.6, 25.0, col='#2a6ac0')

# ---- chalets, a back lane ---------------------------------------------------------------------------------------------------------
SMOKE.append(HR.chalet(k, 27.8, 33.2, 20.0, 23.2, wall_h=1.9, rise=1.4, gable='front', door_x=30.5, windows=[(28.8, 0.8), (32.2, 0.8)],
                       chimney=28.8, balcony=True, shutters='#2a4a3a', rr=random.Random(13)))
SMOKE.append(HR.chalet(k, 34.4, 39.6, 19.6, 22.8, wall_h=2.0, rise=1.45, gable='front', door_x=37.0, windows=[(35.4, 0.8), (38.6, 0.8)],
                       chimney=38.8, balcony=True, shutters='#7a2a22', rr=random.Random(17)))
N.woodpile(k, 25.6, 27.2, 21.6)
HR.barrel_snow(k, 33.6, 22.4)
HR.crate_snow(k, 26.4, 22.6)
HR.skis(k, 39.9, 21.4, cols=('#e8e8f0', '#c83a2e'))
HR.fence(k, [(27.4, 25.0), (29.4, 25.15), (31.4, 25.0), (33.4, 25.1)], HZ)

# ---- the landing pad --------------------------------------------------------------------------------------------------------------
PX, PR = PAD
k.cyl(PX, PR, -0.01, 0.014, 2.95, ('#8a90a0', 0.25), 'pad', verts=48)
k.cyl(PX, PR, 0.0, 0.02, 2.55, ('#e8c040', 0.2), 'pad_ring', verts=48)
k.cyl(PX, PR, 0.0, 0.026, 2.38, ('#7e8494', 0.25), 'pad', verts=48)
for i in range(8):                                                                # joints between the pad's slabs
    a = i * math.tau / 8 + 0.2
    k.bar(PX + math.cos(a) * 0.4, PR + math.sin(a) * 0.4, PX + math.cos(a) * 2.35, PR + math.sin(a) * 2.35, 0.026, 0.03, 0.025, ('#6a7080', 0.2), 'pad_joint')
for i in range(26):                                                               # the plough's banks round it, lumpy
    a = i * math.tau / 26 + rr.uniform(-0.05, 0.05)
    k.blob(PX + math.cos(a) * 3.2, PR + math.sin(a) * 3.15, 0.0, rr.uniform(0.3, 0.45), rr.uniform(0.22, 0.32), rr.uniform(0.1, 0.18),
           (N.SNOW, 0.04), 'plough_bank', rot=(0, 0, math.degrees(a) + 90), segs=8)
for i in range(8):
    a = i * math.tau / 8 + 0.2
    W.lantern(k, PX + math.cos(a) * 2.85, PR + math.sin(a) * 2.85, 0.0, 0.18, s=0.06, energy=3)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.1, PX + 2.0, PR + 0.9)
k.cyl(43.4, 26.8, 0, 2.2, 0.04, ('#c0c4cc', 0.1), 'windsock_pole', verts=6)       # the windsock
k.solid_post(43.4, 26.8)
for j in range(4):
    k.cyl_x(43.42 + j * 0.16, 43.58 + j * 0.16, 26.8, 2.05 - j * 0.03, 0.12 - j * 0.015, 0.12 - j * 0.015,
            (('#ff7a2a', '#f0ece4')[j % 2], 0.1), 'windsock', verts=10)
for (x, r) in ((35.3, 26.1), (35.7, 26.5)):                                         # fuel drums
    k.cyl(x, r, 0, 0.55, 0.2, ('#b83a2e', 0.12), 'drum', verts=10)
    k.blob(x, r, 0.57, 0.2, 0.2, 0.05, (N.ROOF_SNOW, 0.05), 'drum_snow', segs=8)
k.solid(35, 26, 36, 27)

# ---- trees in layers: firs in clusters, saplings, bare birches, shrubs under the snow -----------------------------------------------
FIRS = [(0.6, 8.6 + i * 2.1, rr.uniform(2.4, 3.2)) for i in range(12)]
FIRS += [(45.4, 8.6 + i * 2.1, rr.uniform(2.4, 3.2)) for i in range(12) if 8.6 + i * 2.1 < 10 or 8.6 + i * 2.1 > 16.5]
x = 1.0
while x < 46:                                                                       # the wood along the bottom, ragged
    if not 34.2 < x < 43.8:
        FIRS.append((x, 32.4 + rr.uniform(-0.6, 0.7), rr.uniform(2.0, 3.4)))
        if rr.random() < 0.45:
            FIRS.append((x + rr.uniform(-0.6, 0.6), 31.0 + rr.uniform(-0.4, 0.4), rr.uniform(1.6, 2.4)))
    x += rr.uniform(1.3, 2.6)
FIRS += [(3.0, 25.5, 2.7), (5.2, 28.0, 2.9), (2.2, 28.9, 2.6), (3.8, 29.8, 1.9), (6.4, 29.4, 2.3),             # bottom-left wood
         (21.0, 27.4, 2.6), (23.6, 28.6, 2.9), (19.6, 28.9, 2.0), (25.9, 29.4, 2.5), (22.6, 29.9, 1.8),
         (44.0, 22.0, 2.8), (43.2, 25.0, 2.4), (44.4, 28.8, 2.9), (30.6, 28.8, 2.5), (31.8, 29.6, 1.9), (8.6, 27.6, 2.4),
         (10.6, 29.2, 2.6), (12.0, 28.0, 1.8), (28.6, 29.5, 2.0), (16.4, 29.2, 2.2),
         (44.6, 11.0, 2.6), (43.8, 18.2, 2.3)]
for (x, r, h) in FIRS:
    HR.fir(k, x, r, h, rr=rr, solid=1.2 < x < 44.6 and r < 31.5)
for (x, r) in ((7.4, 26.4), (14.6, 27.6), (18.0, 28.0), (27.4, 27.6), (33.6, 27.4), (2.0, 23.6), (42.8, 20.4),
               (27.3, 9.4), (36.6, 9.0), (1.8, 14.0), (44.2, 14.4)):
    HR.sapling(k, x, r, rr=rr)
for (x, r, h) in ((15.2, 21.2, 2.3), (7.2, 24.8, 2.1), (33.4, 18.6, 2.0), (2.2, 21.2, 2.2)):
    HR.birch(k, x, r, h, rr=rr)
for (x, r, b) in ((4.6, 26.6, False), (9.8, 26.2, True), (19.6, 26.6, False), (24.0, 25.6, True), (31.0, 27.0, False),
                  (36.0, 25.2, True), (13.2, 13.4, False), (24.6, 22.2, False),
                  (34.6, 9.6, False), (37.8, 8.4, True), (16.2, 8.6, False), (27.4, 8.8, True), (6.6, 13.2, False)):
    HR.shrub(k, x, r, s=rr.uniform(0.8, 1.2), rr=rr, berries=b)
HR.fence(k, [(-0.4, 31.0), (0.4, 30.6), (1.2, 30.3), (2.0, 30.0)], HZ)
HR.fence(k, [(41.8, 30.2), (42.6, 29.8), (43.5, 29.6), (44.4, 29.6), (45.2, 29.8)], HZ)

# ---- boot prints and sled tracks ---------------------------------------------------------------------------------------------------
HR.prints(k, [(13.6, 16.5), (13.7, 18.0), (13.3, 19.8), (12.8, 21.4), (12.5, 22.2)], HZ, rr=rr)        # to the fishing hole
HR.prints(k, [(18.0, 20.8), (17.6, 21.8), (17.3, 22.0)], HZ, rr=rr)
HR.prints(k, [(26.6, 15.0), (24.8, 18.0), (21.0, 23.8), (17.0, 24.6)], HZ, rr=rr)
HR.sled_tracks(k, [(9.8, 13.6), (11.0, 17.5), (14.8, 24.0), (16.6, 24.6)], HZ)
for i in range(14):                                                               # fox tracks across the open snow
    x, r = 18.5 + i * 0.4, 27.0 - i * 0.16 + 0.1 * math.sin(i)
    k.blob(x, r, HZ(x, r) + 0.004, 0.03, 0.04, 0.01, ('#c4c9d2', 0.05), 'print', segs=5)

# ---- the market huts on the street, the skate hut on the tarn, lamps and a fence round the ice ------------------------------------
HR.market_hut(k, 4.2, 6.4, 17.5, 18.6, 'mulled', rr=random.Random(31))
HR.market_hut(k, 7.2, 9.4, 17.5, 18.6, 'cheese', rr=random.Random(32))
HR.market_hut(k, 35.2, 37.4, 17.4, 18.6, 'wreaths', rr=random.Random(33))
HR.chalet(k, 2.9, 5.5, 21.2, 23.4, wall_h=1.5, rise=0.9, gable='front', door_x=4.2, windows=[], canopy=True, balcony=False,
          gable_window=False, shutters='#2a4a3a', door_col='#3a5a4a', rr=random.Random(41))
G.letters(k, 'SKATES', 'Righteous', 4.2, 23.46, 1.5, size=0.16, col='#c83a2e', lit=False)
for (x, c) in ((3.25, '#e8e4dc'), (5.15, '#c83a2e')):                              # skates hung by their laces beside the door
    for dx in (-0.07, 0.07):
        k.box(x + dx - 0.05, 23.45, 0.7, x + dx + 0.05, 23.55, 0.9, (c, 0.1), 'skate_boot')
        k.box(x + dx - 0.06, 23.47, 0.66, x + dx + 0.06, 23.53, 0.68, ('#c0c4cc', 0.1), 'skate_blade')
for (x, r) in ((8.0, 19.8), (6.4, 25.4), (15.8, 24.2), (14.6, 18.4)):
    W.lantern_post(k, x, r, h=1.9, energy=22)
    k.blob(x + 0.28, r, 1.78, 0.12, 0.12, 0.04, (N.ROOF_SNOW, 0.05), 'lamp_snow', segs=6)
W.bench(k, 9.0, 10.4, 25.95)
k.blob(9.7, 26.05, 0.5, 0.55, 0.14, 0.05, (N.ROOF_SNOW, 0.05), 'bench_snow', segs=8)
HR.fence(k, [(6.6, 25.2), (7.6, 25.55), (8.6, 25.7)], HZ)
HR.fir(k, 16.0, 20.5, 2.4, rr=rr)
HR.village_tree(k, 26.0, 25.8, rr=random.Random(51))                            # the village's tree, on the green's edge
for (x, r) in ((19.0, 23.4), (23.0, 25.4)):                                      # lamps round the green (on tile lines: in nobody's way)
    W.lantern_post(k, x, r, h=1.9, energy=22)

# ---- the busy places: an après-ski terrace, the ski school, a sleigh waiting, children's things ---------------------------------
HR.deck(k, 25.8, 17.7, 30.0, 19.9)                                                 # the terrace by the cocoa hut
HR.parasol_table(k, 26.8, 18.9, col='#c83a2e')
HR.parasol_table(k, 28.9, 18.6, col='#2a5a8a', chairs=3)
HR.deckchair(k, 29.55, 19.75, col='#c8a040')
HR.string_lights(k, (25.9, 17.8, 1.7), (29.9, 17.8, 1.7), sag=0.15)
for x in (25.95, 29.95):
    k.cyl(x, 17.8, 0.08, 1.75, 0.03, (N.LOG_D, 0.1), 'pole', verts=5)
HR.chalet(k, 36.6, 38.9, 10.6, 12.7, wall_h=1.55, rise=0.95, gable='front', door_x=37.75, windows=[], canopy=False, balcony=False,
          gable_window=False, shutters='#2e4a6a', door_col='#2e4a6a', rr=random.Random(23))
G.letters(k, 'SKI SCHOOL', 'Righteous', 37.75, 12.76, 1.48, size=0.17, col='#2a6ac0', lit=False)
HR.skis(k, 36.2, 12.95, cols=('#e0b030', '#2a9a5a'))
HR.skis(k, 39.0, 12.5, cols=('#c83a2e', '#e8e8f0'))
HR.sleigh(k, 42.7, 17.85, facing=-1)                                               # the sleigh, waiting for a ride
HR.igloo(k, 12.8, 26.3)                                                            # the children's igloo, their snowballs
HR.snowballs(k, 15.4, 25.2, rr=rr)
HR.snowballs(k, 20.6, 25.6, n=5, rr=rr)
N.sled(k, 14.2, 26.9, col='#c83a2e')
for x in (29.7, 31.3):                                                             # clipped firs by the chalets' doors
    HR.tub_fir(k, x, 23.55, h=0.7)
for x in (36.2, 37.8):
    HR.tub_fir(k, x, 23.15, h=0.7)
for i in range(5):                                                                 # a plank footbridge over the brook above the street
    k.box(12.05 + i * 0.0 - 0.6, 12.0 + i * 0.16, 0.0, 12.05 + 0.6, 12.0 + i * 0.16 + 0.13, 0.05, ((N.LOG_L, N.LOG)[i % 2], 0.1), 'bridge_plank')
for xb in (11.45, 12.65):
    k.box(xb - 0.03, 12.0, 0.05, xb + 0.03, 12.8, 0.1, (N.LOG_D, 0.1), 'bridge_beam')
for (x, r, s_) in ((19.0, 8.1, 0.32), (30.2, 8.2, 0.28), (5.6, 8.0, 0.3), (43.4, 8.7, 0.34)):
    HR.rock(k, x, r, s_, z=HZ(x, r) - 0.05, rr=rr)

# ---- glints on the ice (drawn live by js/worlds/hoarfell.js, sc.glints: screen tiles and a seed) ---------------------------------
GLINTS = []
gr = random.Random(77)
while len(GLINTS) < 70:
    x, r = gr.uniform(TX - TRX, TX + TRX), gr.uniform(TR - TRY, TR + TRY)
    if tarn_inside(x, r) > 0.22:
        GLINTS.append(screen(x, r, -0.17) + [round(gr.random(), 3)])
for (x, r) in seg[::3]:
    if abs(r - 15.7) > 1.2:
        GLINTS.append(screen(x + gr.uniform(-0.15, 0.15), r, -0.1) + [round(gr.random(), 3)])

# ---- the borders ------------------------------------------------------------------------------------------------------------------
k.solid(0, 0, COLS, 7)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(0, ROWS - 2, 34, ROWS)
k.solid(44, ROWS - 2, COLS, ROWS)

# ---- the light: alpenglow — a low pink sun from the west, the sky's violet-blue in the shadows -------------------------------------
k.sun((0.8, 0.25, -0.38), '#ffc4a4', 3.2, angle=3.0)
if os.environ.get('HF_CROP'):                     # previews: render only a window of the frame (fractions x0,y0,x1,y1)
    _bx = [float(v) for v in os.environ['HF_CROP'].split(',')]
    _st = k._settings

    def _settings(*a, **kw):
        _st(*a, **kw)
        r = k.scene.render
        r.use_border, r.use_crop_to_border = True, False
        r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = _bx[0], _bx[2], 1 - _bx[3], 1 - _bx[1]
    k._settings = _settings
k.render(OUT, cycle=None if os.environ.get('HF_FAST') else 'day', light_states={'full': {}}, light_samples=int(os.environ.get('SCENE_SAMPLES', 96)), world_light=('#8a96cc', 0.95))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Fellhaven', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [39, 25]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -2.5, COLS, ROWS], 'cold': True, 'shuttle': {'spawn': [39, 25]}})
w['interactions'] = [
    {'x': 39, 'y': 28, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
    {'x': 19, 'y': 13, 'type': 'enter_world', 'label': 'SNOWCAP LODGE', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-lodge', 'spawn': [8, 9]},
    {'x': 30, 'y': 13, 'type': 'enter_world', 'label': 'SKI HIRE', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-skihire', 'spawn': [7, 8]},
    {'x': 5, 'y': 11, 'type': 'vendor', 'label': "GUIDE'S HUT", 'prompt': 'PRESS E TO SHOP',
     'items': [{'id': 'chalk', 'price': 6}, {'id': 'climbing_rope', 'price': 60}, {'id': 'ice_axe', 'price': 180}]},
    {'x': 9, 'y': 13, 'type': 'dialog', 'label': 'YSOLDE', 'prompt': 'PRESS E TO TALK', 'dialog': 'YSOLDE LOOKS YOU UP AND DOWN.'},
    {'x': 10, 'y': 10, 'type': 'climb_board', 'label': 'ROUTE BOARD', 'prompt': 'PRESS E TO READ'},
    {'x': 8, 'y': 6, 'type': 'climb', 'route': 'staircase', 'label': 'THE STAIRCASE', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 22, 'y': 6, 'type': 'climb', 'route': 'icefall', 'label': 'THE ICEFALL', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 35, 'y': 6, 'type': 'climb', 'route': 'hoarspire', 'label': 'THE HOARSPIRE', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 41, 'y': 13, 'type': 'lift', 'label': 'CHAIRLIFT', 'prompt': 'PRESS E TO RIDE'},
    {'x': 43, 'y': 13, 'type': 'dialog', 'label': 'ANSGAR', 'prompt': 'PRESS E TO TALK', 'dialog': 'ANSGAR NODS FROM INSIDE HIS HOOD.'},
    {'x': 21, 'y': 19, 'type': 'vendor', 'label': 'COCOA HUT', 'prompt': 'PRESS E TO BUY',
     'items': [{'id': 'hot_cocoa', 'price': 6}, {'id': 'roast_chestnuts', 'price': 4}, {'id': 'sweet_roll', 'price': 5}]},
    {'x': 19, 'y': 19, 'type': 'dialog', 'label': 'TOVE', 'prompt': 'PRESS E TO TALK', 'dialog': 'TOVE POURS YOU A CUP BEFORE YOU ASK.'},
    {'x': 17, 'y': 22, 'type': 'dialog', 'label': 'SNOWMAN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SNOWMAN IN A TOP HAT AND A RED SCARF. SOMEBODY HAS GIVEN IT A VERY STERN EXPRESSION.'},
    {'x': 25, 'y': 14, 'type': 'dialog', 'label': 'SIGNPOST', 'prompt': 'PRESS E TO READ',
     'dialog': 'RED: THE HOARSPIRE.  BLUE: THE ICEFALL.  YELLOW: THE STAIRCASE.\n\nUNDER THEM, CARVED SMALL: "THE MOUNTAIN DOESN\'T KNOW YOU\'RE COMING."'},
    {'x': 30, 'y': 23, 'type': 'dialog', 'label': 'CHALET', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'NOBODY ANSWERS. THROUGH THE WINDOW: SKIS DRYING BY A STOVE, A CAT ASLEEP ON A RADIATOR.'},
    {'x': 37, 'y': 22, 'type': 'dialog', 'label': 'CHALET', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'A VOICE INSIDE CALLS "WE\'RE NOT BUYING ANY!" BEFORE YOU\'VE SAID A WORD.'},
]
w['lift'] = {'lines': lines}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(9, 13, 10, 14)                                                          # Ysolde and Ansgar stand where they stand
k.solid(43, 13, 44, 14)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-ysolde', 'x': 9, 'y': 13, 'facing': 'down'}, {'sheet': 'npc-ansgar', 'x': 43, 'y': 13, 'facing': 'left'},
                    {'sheet': 'npc-tove', 'x': 19, 'y': 19, 'facing': 'down'}],
            scene_extra={'layers': {'shuttle': 'parked'}, 'smoke': [s for s in SMOKE if s], 'lift': {'lines': lines}, 'glints': GLINTS})
print('hoarfell done')
