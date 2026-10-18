"""Verdance — the farm. Blender scene, the Bridge's one daylight world, rebuilt in the house style (Look Book 2's
Millpond Farm is this farm reimagined: tools/bridge-art/dioramas/millpond_farm.py).

  BVENV/bin/python tools/bridge-art/scenes/verdance.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance

The same map as ever — every door, interaction, the field, the pen and the lane where they were — on land with shape:
a terrace across the top under a dry-stone face, trees and a hedge along it; a stream springing over its lip as a little
fall, running down past the windmill under a plank bridge on the lane and into the millpond, which lies sunk in the
meadow with muddy, pebbly, reedy banks, lilies, ducks, the jetty and a rowboat. The farmhouse from the richer house kit
(clay pantiles, a jetty, shutters and flower boxes) over a flagged yard, the red barn with its churns and trough, a
board-and-batten tool shed, a whitewashed tower mill, hay stacked in the top meadow with the wagon; the field inside its
split-rail fence with a gate swung open, the scarecrow and a crow, the stone well; the orchard with fallen apples, a
ladder and baskets, skeps on their bench; down the lane Hollin's thatched cottage, his stall and Marlo's cart. A
dry-stone wall and hedgerow along the bottom, verges of foxglove and cow parsley, washing on the line. One sun.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_farm as F                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_verdance_rich as VR      # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'verdance'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 30
PLOT = (3, 12, 18, 21)                               # the field's tiles, inclusive
FARM = (3, 12, 18, 20)                               # the ones you can work (the last row is a headland, under the fence)
GREEN = F.GRASS

k = Kit(COLS, ROWS, margin_top=2.4, margin_bottom=0.6, seed=731)
VR.fast_top(k)
rng = k.rng
C = math.cos(math.radians(45))

# ---- the land's plan -------------------------------------------------------------------------------------------------
TERR_R, TERR_Z = 1.7, 1.1                           # the terrace across the top: its face's row and its height
POND = (28.0, 19.4, 3.4, 2.2)                        # the millpond: centre x, row, base radii (the outline wanders)
WATER_Z = -0.1
STREAM_UP = [(30.3, -3.0), (29.8, -1.6), (30.2, -0.2), (29.95, TERR_R - 0.1)]
CTRL = [(29.95, TERR_R + 0.5), (29.55, 3.5), (30.2, 5.1), (29.55, 6.9), (29.95, 8.5), (29.9, 11.3), (29.25, 12.8),
        (29.8, 14.3), (29.05, 15.9), (28.6, 17.6)]


def catmull(P, n=8):
    out = []
    Q = [P[0]] + P + [P[-1]]
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for j in range(n):
            t = j / n
            out.append(tuple(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t
                                    + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t ** 3) for c in (0, 1)))
    out.append(P[-1])
    return out


STREAM = catmull(CTRL)
FALL = (29.55, 30.4)
BRIDGE = (29.2, 30.6)                                # the lane's plank bridge over the stream (x)
LANE = (9.2, 10.6)                                   # the lane's rows


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def pond_R(th):
    """The millpond's outline as a radius by angle (0 east, pi/2 toward you): a long uneven shape, a lobe toward the
    near bank where the jetty stands, a cove at the lower left, a point of land from the east, a bay under the inlet."""
    R = 1.0 + 0.07 * math.sin(2 * th + 0.7) + 0.05 * math.sin(3 * th + 2.1) + 0.035 * math.sin(5 * th + 0.3) + 0.02 * math.sin(9 * th + 1.7)
    R += 0.18 * math.exp(-((th - 1.4) / 0.45) ** 2)
    R += 0.12 * math.exp(-((th - 2.5) / 0.3) ** 2)
    R -= 0.16 * math.exp(-((th + 0.1) / 0.22) ** 2)
    R += 0.1 * math.exp(-((th + 1.55) / 0.3) ** 2)
    return R


def pond_d(x, r):
    cx, cr, rx, ry = POND
    u, v = (x - cx) / rx, (r - cr) / ry
    return math.hypot(u, v) / pond_R(math.atan2(v, u))


def pond_edge(th, s=1.0):
    cx, cr, rx, ry = POND
    R = pond_R(th) * s
    return cx + math.cos(th) * rx * R, cr + math.sin(th) * ry * R


def stream_d(x, r):
    if abs(x - 29.6) > 2.2 or r < TERR_R - 0.5 or r > 18.5:
        return 9.0
    return I.path_dist([STREAM], x, r)


def low_h(x, r):
    z = 0.0
    d = pond_d(x, r)
    if d < 1.38:                                     # the bank falls to the water, a shelf, then the bed
        z -= 0.12 * smooth(1.38, 1.0, d) + 0.2 * smooth(1.0, 0.72, d) + 0.16 * smooth(0.7, 0.3, d)
    s = stream_d(x, r)
    if s < 0.62 and r > TERR_R:
        z = min(z, -0.17 * smooth(0.62, 0.16, s))
    if r < TERR_R + 1.1 and abs(x - 29.95) < 1.0:    # the plunge pool under the fall
        z = min(z, -0.2 * smooth(1.0, 0.3, math.hypot(x - 29.95, (r - TERR_R - 0.55) * 1.6)))
    return z


def up_h(x, r):
    z = TERR_Z + 0.03 * I.n2(x, r, 0.9, 3) + max(0.0, -r - 0.8) * 0.1
    s = I.path_dist([STREAM_UP], x, r)
    if s < 0.55:
        z -= 0.18 * smooth(0.55, 0.12, s)
    return z


def low_mat(x, r):
    d = pond_d(x, r)
    if d < 0.97:
        return 'bed'
    if d < 1.1 + 0.07 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8) > -0.25 else 'gravel'
    s = stream_d(x, r)
    if r > TERR_R and s < 0.44 + 0.05 * I.n2(x, r, 3.0, 2):
        return 'bed' if s < 0.2 else ('gravel' if I.n2(x, r, 5.0, 6) > -0.1 else 'bank')
    if r < TERR_R + 1.0 and math.hypot(x - 29.95, (r - TERR_R - 0.55) * 1.6) < 0.75:
        return 'gravel'
    return 'grass'


def up_mat(x, r):
    s = I.path_dist([STREAM_UP], x, r)
    if s < 0.42:
        return 'bed' if s < 0.2 else 'gravel'
    return 'grass'


ALB = {'grass': (GREEN, 0.12), 'bank': ('#6a5638', 0.22), 'bed': ('#3e4a3a', 0.2), 'gravel': ('#8a8274', 0.25)}


def shaped(c, r):                                    # cells whose ground isn't flat: finer quads
    x, y = c + 0.5, r + 0.5
    return pond_d(x, y) < 1.75 or stream_d(x, y) < 1.3 or (y < TERR_R + 1.6 and abs(x - 29.95) < 1.6)


up_cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-3, int(TERR_R))]
lo_cells = [(c, r) for c in range(-1, COLS + 1) for r in range(int(TERR_R), ROWS + 1)]
I.ground(k, up_cells, up_mat, ALB, height=up_h, bump=0.0, seed=11, dither=0.035, step=0.0625)
I.ground(k, [p for p in lo_cells if shaped(*p)], low_mat, ALB, height=low_h, bump=0.0, seed=12, dither=0.035, step=0.0625)
I.ground(k, [p for p in lo_cells if not shaped(*p)], low_mat, ALB, height=low_h, bump=0.0, seed=12, dither=0.035, step=0.125)
# the terrace's own ground is lifted on cells cut at TERR_R: close the gap under its face
k.box(-1, TERR_R - 0.3, -0.2, COLS + 1, TERR_R - 0.02, TERR_Z - 0.02, ('#4a4440', 0.2), 'mortar')

# ---- the lane, the paths, the yards ------------------------------------------------------------------------------------
F.dirt_path(k, 5.2, LANE[0], BRIDGE[0], LANE[1])     # the lane, broken by the bridge
F.dirt_path(k, BRIDGE[1], LANE[0], 34.6, LANE[1])
F.dirt_path(k, 9.9, LANE[1], 12.1, 11.9)             # down to the field gate
F.dirt_path(k, 33.4, LANE[1], 34.6, 19.4)            # south to Hollin's
F.dirt_path(k, 19.9, LANE[1], 21.1, 16.4)            # past the scarecrow to the well
F.dirt_path(k, 21.1, 15.2, 25.0, 16.4)
F.dirt_path(k, 32.6, 19.4, 43.2, 27.6)               # the yard by Hollin's
F.dirt_path(k, 43.2, 20.0, 44.6, 23.0)               # Meadow Lane, off east to Brambleford
F.dirt_path(k, 27.4, 22.8, 32.6, 23.8)               # from the yard to the jetty
F.earth(k, PLOT[0], PLOT[1], PLOT[2] + 1, PLOT[3] + 1)
for i in range(9):                                   # wheel ruts in the lane, grass down its crown
    x0 = 5.6 + i * 3.1
    if BRIDGE[0] - 0.5 < x0 + 1.4 and x0 < BRIDGE[1] + 0.3:
        continue
    for rr in (LANE[0] + 0.38, LANE[1] - 0.38):
        k.box(x0, rr - 0.07, 0.006, x0 + rng.uniform(2.0, 2.8), rr + 0.07, 0.0085, (shade(F.DIRT, 0.82), 0.1), 'path')

# the plank bridge on the lane over the stream: planks across the way, two beams, a low rail each side
x = BRIDGE[0] - 0.05
while x < BRIDGE[1] + 0.05:
    k.box(x + 0.012, LANE[0] - 0.12, 0.02, x + 0.17, LANE[1] + 0.12, 0.07, (shade('#9a7448', rng.uniform(0.85, 1.08)), 0.18), 'bridge_plank')
    x += 0.18
for rr in (LANE[0] - 0.08, LANE[1] + 0.04):
    k.box(BRIDGE[0] - 0.1, rr, -0.2, BRIDGE[1] + 0.1, rr + 0.06, 0.02, '#5a4028', 'bridge_beam')
for rr in (LANE[0] - 0.1, LANE[1] + 0.08):
    for xx in (BRIDGE[0] - 0.05, (BRIDGE[0] + BRIDGE[1]) / 2, BRIDGE[1] + 0.02):
        k.box(xx - 0.035, rr - 0.035, 0.0, xx + 0.035, rr + 0.035, 0.42, ('#6a4a2a', 0.15), 'bridge_post')
    k.box(BRIDGE[0] - 0.08, rr - 0.03, 0.36, BRIDGE[1] + 0.06, rr + 0.03, 0.42, ('#8a6438', 0.15), 'bridge_rail')

# ---- the water: the millpond, the stream, the fall ---------------------------------------------------------------------
cx, cr, rx, ry = POND
NOUT = 140
outline = [pond_edge(i / NOUT * math.tau, 1.0) for i in range(NOUT)]
k.poly([(cx, cr, WATER_Z)] + [(x, r, WATER_Z) for (x, r) in outline] + [(outline[0][0], outline[0][1], WATER_Z)], '#2a5a6a', 'pond_water')


def ribbon(path, w, z_of, step=2):
    q = []
    pts = []
    for (ax, ar), (bx, br) in zip(path, path[1:]):
        for j in range(step):
            t = j / step
            pts.append((ax + (bx - ax) * t, ar + (br - ar) * t))
    pts.append(path[-1])
    sides = []
    for i, (x, r) in enumerate(pts):                       # each point's normal, the width wandering along it
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        dx, dr = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dr) or 1
        ww = w(x, r) if callable(w) else w
        sides.append(((x - dr / L * ww, r + dx / L * ww), (x + dr / L * ww, r - dx / L * ww)))
    for (l0, r0), (l1, r1), (x0, rr0), (x1, rr1) in zip(sides, sides[1:], pts, pts[1:]):
        q.append(((l0[0], l0[1], z_of(x0, rr0)), (r0[0], r0[1], z_of(x0, rr0)), (r1[0], r1[1], z_of(x1, rr1)), (l1[0], l1[1], z_of(x1, rr1))))
    return q


k.quads(ribbon(STREAM, lambda x, r: 0.27 + 0.07 * math.sin(r * 1.7) + 0.04 * math.sin(r * 4.1 + 1), lambda x, r: -0.085),
        '#2e6070', 'stream_water')
k.quads(ribbon(STREAM_UP, 0.25, lambda x, r: TERR_Z - 0.09), '#2e6070', 'stream_water')
k.cyl(29.95, TERR_R + 0.55, -0.08, -0.079, 0.62, '#2e6070', 'stream_water', verts=20, ry=0.42)
for (x, r) in [(30.1, -2.4), (29.7, -0.9), (30.3, 0.6), (29.4, 3.0), (30.4, 4.6), (29.2, 6.3), (30.3, 7.6), (29.4, 12.0),
               (30.1, 13.6), (28.8, 15.2), (29.6, 16.4), (30.5, 2.6)]:
    for _ in range(2):                                     # stones along its banks
        s = rng.uniform(0.07, 0.15)
        z0 = (up_h if r < TERR_R else low_h)(x, r)
        k.rock(x + rng.uniform(-0.42, 0.42), r + rng.uniform(-0.2, 0.2), z0 - 0.03, s, s * 0.8, s * 0.6,
               (shade('#8a8478', rng.uniform(0.75, 1.1)), 0.2), part='rock', segs=7)
for i in range(0, len(STREAM) - 1, 2):                    # stones in the water and on the gravel, reeds in clumps
    x, r = STREAM[i]
    if LANE[0] - 0.6 < r < LANE[1] + 0.6 or r < TERR_R + 1.0:
        continue
    if rng.random() < 0.55:
        s = rng.uniform(0.06, 0.13)
        k.rock(x + rng.uniform(-0.18, 0.18), r, -0.13, s, s * 0.8, s * 0.55, (shade('#8a8478', rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=7)
    if rng.random() < 0.4:
        side = rng.choice((-1, 1))
        clump = []
        for j in range(rng.randint(8, 16)):
            xx, rr = x + side * rng.uniform(0.3, 0.45), r + rng.uniform(-0.25, 0.25)
            clump.append((xx, rr, low_h(xx, rr), rng.uniform(0.3, 0.7), 0.028, rng.uniform(-0.1, 0.1), rng.uniform(-0.03, 0.03)))
        with k.foliage('leaf'):
            k.blades(clump, (shade('#5a8a3a', rng.uniform(0.85, 1.12)), 0.2), 'reed')
TONES = ('#f4fbfd', '#cfe8f0', '#8cc4d4', '#e2f2f6', '#a6d2de', '#6aa8bc')
x = FALL[0]
while x < FALL[1] - 0.01:                                  # the fall over the terrace's lip
    w = rng.uniform(0.04, 0.1)
    zt, zb = TERR_Z - 0.06, -0.06
    r_lip, r_bot = TERR_R + 0.08, TERR_R + 0.42
    k.quads([((x, TERR_R - 0.1, zt), (x + w, TERR_R - 0.1, zt), (x + w, r_lip, zt - 0.08), (x, r_lip, zt - 0.08)),
             ((x, r_lip, zt - 0.08), (x + w, r_lip, zt - 0.08), (x + w, r_bot, zb), (x, r_bot, zb))], rng.choice(TONES), 'waterfall')
    x += w
for _ in range(10):
    s = rng.uniform(0.06, 0.12)
    k.blob(rng.uniform(FALL[0] - 0.1, FALL[1] + 0.1), TERR_R + rng.uniform(0.4, 0.75), -0.07, s, s * 0.8, s * 0.45,
           rng.choice(('#f4fbfd', '#dceff4')), 'foam', segs=8)
for _ in range(6):
    k.blob(rng.uniform(FALL[0], FALL[1]), TERR_R + rng.uniform(0.45, 0.7), rng.uniform(0.08, 0.3),
           rng.uniform(0.07, 0.12), 0.05, rng.uniform(0.05, 0.09), '#eef8fb', 'spray', segs=8)

# ---- the terrace: its stone face, the hedge and trees along the top ------------------------------------------------------
VR.terrace_face(k, -1.0, COLS + 1.0, TERR_R, TERR_Z, gaps=[(FALL[0] - 0.05, FALL[1] + 0.05)], green=GREEN,
                ivy=(3.5, 12.6, 23.4, 37.2), flowers=40)


def lifted(fn, *a, dz=TERR_Z, **kw):
    sp, sl = len(k.parts), len(k.lights)
    out = fn(*a, **kw)
    I.pose(k, sp, (0, 0, 0), dz=dz, lights_since=sl)
    return out


lifted(VR.hedge, k, (-1.0, 1.15), (28.9, 1.15), h=0.7, w=0.5, tone='#3a6a30', flowers=('#f4f0e8', '#f0d8e0'))
lifted(VR.hedge, k, (31.1, 1.15), (COLS + 1.0, 1.15), h=0.7, w=0.5, tone='#3a6a30', flowers=('#f4f0e8',))
x = 0.8
while x < COLS:                                            # trees along the terrace, behind the hedge
    if not (28.6 < x < 31.4):
        h = rng.uniform(2.4, 3.2)
        if rng.random() < 0.38:
            lifted(W.pine, k, x, rng.uniform(-0.1, 0.4), h=h, tone=shade('#2e5a38', rng.uniform(0.92, 1.08)))
        elif rng.random() < 0.15:
            lifted(F.apple_tree, k, x, rng.uniform(-0.1, 0.4), h=h * 0.85)
        else:
            lifted(W.tree, k, x, rng.uniform(-0.1, 0.4), h=h, tone=rng.choice(('#3a6a34', '#3e7a34', '#46743a')))
    x += rng.uniform(1.9, 2.6)
lifted(VR.verge, k, -0.5, 1.3, COLS + 0.5, 1.6, n=40, avoid=lambda x, r: abs(x - 30) < 1.1)
lifted(VR.fern, k, 28.9, 1.4)
lifted(VR.fern, k, 31.0, 1.35)

# ---- the farmhouse, its yard, the porch and the mailbox ---------------------------------------------------------------
SMOKE = []
rm, zr = HK.rich_house(k, 2.6, 9.4, 2.6, 7.6, wall_h=2.3, rise=1.6, roof='#a04a30', wall='#efe2c6', door_x=6.0,
                       windows=[(3.8, 0.9), (8.2, 0.9)], windows_up=[(3.8, 1.75), (6.0, 1.8), (8.2, 1.75)], chimney=8.4)
SMOKE.append([8.28, round(rm - 0.15 - (zr + 1.05) * C, 3)])
r = 7.75
while r < LANE[0] - 0.05:                                  # flagstones from the door down to the lane
    xx = 6.0 + rng.uniform(-0.05, 0.05)
    w = rng.uniform(0.6, 0.78)
    k.box(xx - w / 2 + 0.03, r + 0.02, -0.02, xx + w / 2 - 0.03, r + rng.uniform(0.27, 0.34), 0.03,
          (shade('#a89c88', rng.uniform(0.88, 1.08)), 0.12), 'path_flag', bevel=0.015)
    r += 0.36
V.flower_bed(k, 2.9, 7.4, 5.1, 7.72)
V.flower_bed(k, 6.9, 7.4, 9.1, 7.72)
W.bench(k, 7.0, 8.7, 8.3)
HK.tub(k, 3.4, 8.3)
HK.tub(k, 4.4, 8.4, blooms=('#f0d040', '#f08030'))
F.mailbox(k, 10.5, 8.4)
k.solid(10, 8, 11, 9)
F.log_pile(k, 1.5, 6.4)
VR.chopping_block(k, 2.1, 8.2)
VR.washing_line(k, 1.0, 3.6, 10.15)
VR.water_butt(k, 2.25, 4.0)

# ---- the barn, its yard, the tool shed ------------------------------------------------------------------------------------
F.barn(k, 12.2, 19.6, 2.4, 7.8, roof='#6e5c50')
F.haybale(k, 12.8, 8.6)
F.haybale(k, 18.9, 8.6, rolled=False)
VR.churns(k, 14.1, 8.15)
VR.trough(k, 17.2, 18.3, 8.25, wood=True)
F.dirt_path(k, 14.9, 7.85, 16.9, LANE[0])                # worn from the barn doors to the lane
for _ in range(30):                                        # straw blown about the apron
    xx, rr_ = rng.uniform(13.8, 18.0), rng.uniform(7.9, 9.0)
    a = rng.uniform(0, math.pi)
    k.bar(xx, rr_, xx + math.cos(a) * 0.12, rr_ + math.sin(a) * 0.12, 0.004, 0.014, 0.012, '#d8c070', 'grass_straw')
VR.tool_shed(k, 20.2, 22.0, 5.2, 7.6, door_x=20.75)
k.solid(20, 5, 22, 8)
VR.pots(k, 21.5, 7.85, n=4)
VR.wheelbarrow(k, 22.75, 8.35)

# ---- the windmill --------------------------------------------------------------------------------------------------------
VR.tower_mill(k, 25.2, 5.4)
k.solid(24, 4, 27, 7)
for (sx, sr) in ((24.3, 6.9), (24.6, 7.25)):
    V.sacks(k, sx, sr, n=2)

# ---- the top meadow, where the hay's stacked -------------------------------------------------------------------------
F.haybale(k, 32.4, 5.4)
F.haybale(k, 33.6, 5.9)
F.haybale(k, 35.2, 5.0, rolled=False)
F.haybale(k, 36.1, 5.0, rolled=False)
sp = len(k.parts)
F.haybale(k, 35.65, 5.0, rolled=False)
I.pose(k, sp, (0, 0, 0), dz=0.4)
VR.hay_cart(k, 33.6, 3.9)
k.solid(31, 4, 37, 7)
for _ in range(40):
    xx, rr_ = rng.uniform(31.0, 37.0), rng.uniform(4.2, 6.9)
    a = rng.uniform(0, math.pi)
    k.bar(xx, rr_, xx + math.cos(a) * 0.14, rr_ + math.sin(a) * 0.14, 0.0, 0.012, 0.012, '#d8c070', 'grass_straw')

# ---- the field: bare earth inside a split-rail fence, a gate swung open north, posts at the east gap ---------------------
F.fence(k, (2.5, 11.5), (9.6, 11.5))
F.fence(k, (12.4, 11.5), (19.5, 11.5))
F.fence(k, (2.5, 22.5), (19.5, 22.5))
F.fence(k, (2.5, 11.5), (2.5, 22.5))
F.fence(k, (19.5, 11.5), (19.5, 15.6))
F.fence(k, (19.5, 17.4), (19.5, 22.5))
VR.field_gate(k, 9.6, 12.4, 11.5, open_to=180, leaf=1.5)
for (gx, gr) in ((19.5, 15.6), (19.5, 17.4)):
    k.box(gx - 0.07, gr - 0.07, 0.0, gx + 0.07, gr + 0.07, 0.84, (shade(F.WOOD, 0.85), 0.2), 'gate_post')
F.scarecrow(k, 21.3, 13.0)
VR.crow(k, 21.75, 13.0, 1.18, yaw=10)
VR.well(k, 21.5, 17.6)
k.solid(21, 17, 22, 18)
VR.verge(k, 0.9, 11.6, 2.3, 22.4, n=26)                            # the field's verges, outside the fence
VR.verge(k, 2.4, 22.65, 19.5, 23.1, n=30)
VR.verge(k, 19.65, 11.6, 19.9, 15.4, n=8)
VR.basket(k, 18.95, 17.85, fruit='#e07a2a')
VR.ducks(k, [(26.2, 18.6, 20), (26.7, 18.95, 200), (30.4, 19.0, 160)], WATER_Z)

# ---- the millpond's dressing: reeds, stones, lilies, an overhanging bank, the jetty and the rowboat ---------------------
JX0, JX1 = 27.56, 28.44


def free_bank(th):
    x, r = pond_edge(th)
    if JX0 - 0.3 < x < JX1 + 0.3 and r > cr:
        return False
    if stream_d(x, r) < 0.7:
        return False
    return True


for th in (2.0, 2.55, 3.05, 3.6, 0.35, -0.35, -0.9, -2.2, 0.95, 4.25, 2.85, 1.15, -2.7):
    if not free_bank(th):
        continue
    clump = {shade('#5a8a3a', 0.8): [], '#5a8a3a': [], shade('#6a9a44', 1.12): []}
    for j in range(rng.randint(18, 32)):
        t = th + rng.uniform(-0.12, 0.12)
        x, r = pond_edge(t, rng.uniform(0.94, 1.05))
        zb = max(low_h(x, r), WATER_Z)
        h = rng.uniform(0.42, 0.95)
        lean = rng.uniform(-0.14, 0.14)
        clump[rng.choice(list(clump))].append((x, r, zb, h, 0.03, lean, rng.uniform(-0.04, 0.04)))
        if rng.random() < 0.22:
            k.cyl(x + lean * 0.9, r, zb + h * 0.82, zb + h * 0.98, 0.028, '#5a3a20', 'cattail', verts=6)
    with k.foliage('leaf'):
        for col, bl in clump.items():
            if bl:
                k.blades(bl, (col, 0.2), 'reed')
for _ in range(40):
    th = rng.uniform(-math.pi, math.pi)
    if not free_bank(th):
        continue
    x, r = pond_edge(th, rng.uniform(0.94, 1.12))
    s = rng.choice((0.07, 0.1, 0.14, 0.2, 0.26)) * rng.uniform(0.85, 1.15)
    k.rock(x, r, max(low_h(x, r), WATER_Z - 0.08) - s * 0.25, s, s * 0.8, s * 0.6,
           (shade(rng.choice(('#8a8478', '#9a9080', '#7a766c')), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8)
lip, hang = [], {shade(GREEN, 0.85): [], GREEN: [], shade(GREEN, 1.15): []}
for i in range(30):                                        # turf overhanging the west bank
    th = 2.7 + i * 0.03
    x, r = pond_edge(th, 1.0)
    xi, ri = pond_edge(th, 0.94)
    lip.append(((x, r), (xi, ri)))
    for _ in range(4):
        hang[rng.choice(list(hang))].append((xi + rng.uniform(-0.04, 0.04), ri, WATER_Z + 0.1, -rng.uniform(0.06, 0.13), 0.02,
                                             (xi - x) * 0.6 + rng.uniform(-0.02, 0.02), (ri - r) * 0.6))
for (a, b), (c_, d) in zip(lip, lip[1:]):
    k.quads([((a[0], a[1], low_h(*a) + 0.02), (c_[0], c_[1], low_h(*c_) + 0.02), (d[0], d[1], WATER_Z + 0.1), (b[0], b[1], WATER_Z + 0.1))],
            (GREEN, 0.12), 'grass')
for col, bs in hang.items():
    k.blades(bs, (col, 0.25), 'grass')
for _ in range(16):
    th, dd = rng.uniform(-math.pi, math.pi), rng.uniform(0.3, 0.85)
    x, r = pond_edge(th, dd)
    if JX0 - 0.3 < x < JX1 + 0.3 and r > cr - 0.3:
        continue
    if 29.0 < x < 31.2 and 19.6 < r < 21.2:
        continue
    s = rng.uniform(0.11, 0.17)
    k.cyl(x, r, WATER_Z, WATER_Z + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
    if rng.random() < 0.35:
        k.sphere(x + 0.04, r, WATER_Z + 0.04, 0.05, 0.04, rng.choice(('#f0b8d0', '#f8f4f0')), 'lily_flower', segs=6)
JR0, JR1 = 19.55, 23.0                                     # the jetty, on its posts, out from the near bank
for rr in [JR0 + 0.05 + i * 0.68 for i in range(6)]:
    for xx in (JX0 + 0.06, JX1 - 0.06):
        k.cyl(xx, rr, min(WATER_Z, low_h(xx, rr)) - 0.3, 0.2, 0.06, ('#5a4028', 0.15), 'jetty_post', verts=8)
r = JR0
while r < JR1 - 0.02:
    k.box(JX0, r, 0.04, JX1, r + 0.17, 0.1, (shade('#9a7448', rng.uniform(0.85, 1.08)), 0.2), 'jetty_plank', bevel=0.01)
    r += 0.19
k.box(JX0 + 0.02, JR0 + 0.05, -0.03, JX0 + 0.1, JR1, 0.04, '#5a4028', 'jetty_beam')
k.box(JX1 - 0.1, JR0 + 0.05, -0.03, JX1 - 0.02, JR1, 0.04, '#5a4028', 'jetty_beam')
k.cyl(JX1 - 0.14, JR0 + 0.3, 0.1, 0.27, 0.1, ('#7a5a34', 0.15), 'bucket', verts=10)
k.tube((JX1 - 0.04, JR0 + 0.55, 0.1), (JX1 + 0.6, JR0 + 0.9, 0.0), 0.012, '#c8b080', 'mooring_rope', verts=4)
sp = len(k.parts)
W.rowboat(k, 29.2, 30.7, 20.3, beam=0.7)
I.pose(k, sp, (29.95, 20.3, 0), yaw=-12, dz=WATER_Z + 0.06)

# ---- the orchard and the skeps ------------------------------------------------------------------------------------------
for x in (36.5, 39.5, 42.2):
    for r in (12.5, 15.5):
        F.apple_tree(k, x, r, h=rng.uniform(2.2, 2.6))
        VR.fallen_apples(k, x, r + 0.25, n=rng.randint(3, 7), rad=0.8)
VR.ladder(k, 39.15, 12.95, 1.75, lean=0.35)
VR.basket(k, 38.4, 13.35)
VR.basket(k, 41.1, 16.25)
VR.bee_bench(k, 40.9, 42.9, 18.35)
VR.skep(k, 41.4, 18.3)
VR.skep(k, 42.4, 18.4)
k.solid(41.15, 18.05, 41.65, 18.55)
k.solid(42.15, 18.15, 42.65, 18.65)
VR.verge(k, 35.0, 16.9, 40.6, 18.9, n=24, kinds=('grass', 'parsley', 'daisy', 'foxglove'))
VR.verge(k, 35.0, 11.0, 43.0, 11.6, n=12, kinds=('grass', 'daisy'))

# ---- the village corner: Hollin's stall, Marlo's cart, the notice board, Hollin's cottage ---------------------------------
F.seed_stall(k, 35.0, 38.0, 20.3, 21.0)
k.solid(36, 19, 37, 20)
k.solid(38, 20, 39, 21)                                                             # Hollin, beside his stall
V.sacks(k, 34.55, 20.0, n=3)
VR.pots(k, 38.25, 21.55, n=5)
W.cart(k, 36.4, 22.5)                                                               # clear of the cottage roof
k.solid(37, 22, 38, 23)                                                             # Marlo, at the back of his cart
W.bulletin_board(k, 35.6, 25.4)
k.solid(35, 25, 37, 26)
W.bench(k, 37.8, 39.4, 26.6)
W.lantern_post(k, 33.4, 22.6, energy=0)
k.solid(33, 22, 34, 23)
rm2, zr2 = HK.rich_house(k, 39.6, 43.8, 23.8, 27.2, wall_h=2.0, rise=1.3, roof='#c4a25a', wall='#e8dcc0', door_x=41.4,
                         windows=[(40.4, 0.9), (42.8, 0.9)], chimney=40.2)
SMOKE.append([40.08, round((23.8 + 27.2) / 2 - 0.15 - (zr2 + 0.65) * C, 3)])
W.planter(k, 34.0, 35.6, 27.2, flowers=('#a070e0', '#f0d040', '#e05070'))

# ---- the edges: hedgerow and trees west and east, a dry-stone wall and hedge along the bottom ------------------------------
for i, r in enumerate([i * 2.2 + 3.0 for i in range(12)]):                        # oaks with a fir every third
    if r >= 26:
        W.bush(k, 0.6, r, s=0.45, tone='#3a6a30')
    elif i % 3 == 1:
        W.pine(k, 0.5, r, h=rng.uniform(2.3, 2.9), tone='#2e5a38')
    else:
        W.tree(k, 0.5, r, h=rng.uniform(2.2, 2.8), tone='#3a6a34')
    if r < 19 or r > 27.5:
        if i % 3 == 2:
            W.pine(k, 43.5, r, h=rng.uniform(2.3, 2.9), tone='#2e5a38')
        else:
            W.tree(k, 43.5, r, h=rng.uniform(2.2, 2.8), tone='#3a6a34')
VR.hedge(k, (-0.3, 2.2), (-0.3, 28.0), h=0.8, w=0.6, tone='#3a6a30')
VR.hedge(k, (43.85, 2.2), (43.85, 19.0), h=0.8, w=0.6, tone='#3a6a30', flowers=('#f4f0e8',))
VR.dry_wall(k, (-0.6, 28.3), (32.4, 28.3), h=0.55)
VR.hedge(k, (-0.6, 28.95), (32.6, 28.95), h=0.75, w=0.55, tone='#3e6e32', flowers=('#c03050', '#f4f0e8'))
for x in (4.2, 11.5, 18.8, 25.6):
    W.tree(k, x, 29.4, h=rng.uniform(2.3, 2.8), tone=rng.choice(('#3a6a34', '#46743a')))
VR.verge(k, 0.6, 27.7, 32.0, 28.05, n=50)
VR.verge(k, 0.8, 2.2, 2.4, 9.0, n=10, kinds=('grass', 'foxglove', 'parsley'))
VR.verge(k, 22.4, 2.3, 23.9, 4.2, n=8)
VR.verge(k, 37.5, 2.2, 43.2, 3.4, n=14)
F.wildflowers(k, 22.0, 11.0, 32.0, 14.0, 30)
# the meadow's own life: drifts of wildflowers, a willow over the pond, bushes on the banks, stones in the grass
VR.willow(k, 32.3, 17.9)
for (bx, br) in ((24.5, 20.6), (32.6, 20.3), (23.6, 12.2), (26.6, 8.3)):
    W.bush(k, bx, br, s=rng.uniform(0.3, 0.4), tone=rng.choice(('#2e5a2e', '#3a6a34')), berries=rng.choice((None, '#c03050')))
    k.solid(bx - 0.25, br - 0.25, bx + 0.25, br + 0.25)
for (fx, fr) in ((24.0, 13.6), (27.2, 12.4), (31.6, 13.8), (25.8, 3.4), (37.8, 3.6), (41.2, 6.4), (38.0, 9.0),
                 (5.0, 24.6), (11.0, 26.0), (17.5, 24.4), (23.0, 26.3), (28.6, 25.4), (8.0, 27.0), (36.5, 14.0),
                 (40.8, 14.0), (39.0, 17.0), (23.2, 22.0), (1.8, 25.0)):
    VR.flower_patch(k, fx, fr, rad=rng.uniform(0.45, 0.8), n=rng.randint(26, 46))
for _ in range(26):
    x, r = rng.uniform(1.5, 42.5), rng.uniform(2.5, 27.5)
    if PLOT[0] - 1 < x < PLOT[2] + 2 and PLOT[1] - 1 < r < PLOT[3] + 2 or pond_d(x, r) < 1.5 or stream_d(x, r) < 0.8:
        continue
    s = rng.uniform(0.05, 0.09)
    k.rock(x, r, -0.02, s, s * 0.8, s * 0.5, (shade('#9a9282', rng.uniform(0.8, 1.08)), 0.2), part='rock', segs=7)
k.solid(0, 0, COLS, 2)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(0, ROWS - 2, 32, ROWS)

# the water: no wading — the pond (but the jetty), the stream (but the lane's bridge)
for r in range(ROWS):
    for c in range(COLS):
        x, y = c + 0.5, r + 0.5
        if pond_d(x, y) < 1.08 and not (c == 28 and r >= 20):
            k.solid(c, r, c + 1, r + 1)
        elif y > TERR_R and stream_d(x, y) < 0.5 and r not in (9, 10):
            k.solid(c, r, c + 1, r + 1)

# ---- the grass: over everything still turf once it's all in place ---------------------------------------------------------
k.later.append(lambda: W.meadow(k, GREEN, cells=up_cells + lo_cells, ok=('ground_grass',), density=1.0, flowers=1.0))

# ---- the light: a low golden sun from the west, the sky's blue in the shadows ---------------------------------------------
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=96, world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.pop('shuttle', None)                                # no pad here: the shuttle lands in Brambleford, up Meadow Lane
w.update({'name': 'Verdance', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [42, 21]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.5, COLS, ROWS],
          'farm': {'plot': list(FARM)}})
MAIL = ["A SEED CATALOGUE, DOG-EARED AT THE PUMPKINS.", "A POSTCARD FROM LUMAR: \"THE SEA GLOWS. WISH YOU WERE HERE.\" NO NAME.",
        "A BILL FOR ONE (1) SCARECROW HAT. PAID.", "NOTHING TODAY. A SNAIL HAS MOVED IN."]
w['interactions'] = [
    {'x': 43, 'y': 21, 'type': 'enter_world', 'label': 'MEADOW LANE', 'prompt': 'PRESS E TO WALK TO BRAMBLEFORD', 'target': 'verdance-village', 'spawn': [10, 32]},
    {'x': 43, 'y': 22, 'type': 'enter_world', 'label': 'MEADOW LANE', 'prompt': 'PRESS E TO WALK TO BRAMBLEFORD', 'target': 'verdance-village', 'spawn': [11, 32]},
    {'x': 6, 'y': 7, 'type': 'dialog', 'label': 'FARMHOUSE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'YOUR FARMHOUSE. WHITEWASHED, A RED ROOF, SMOKE FROM THE CHIMNEY. THE DOOR STICKS IN SUMMER - HOLLIN SAYS IT ALWAYS HAS.'},
    {'x': 16, 'y': 7, 'type': 'dialog', 'label': 'BARN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'EMPTY STALLS, A HAYLOFT, SWALLOWS IN THE RAFTERS. ROOM FOR ANIMALS, ONE DAY.'},
    {'x': 20, 'y': 7, 'type': 'farm_tools', 'label': 'TOOL SHED', 'prompt': 'PRESS E TO OPEN'},
    {'x': 25, 'y': 6, 'type': 'dialog', 'label': 'WINDMILL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE MILL TURNS SLOW IN THE WARM WIND. SOMEONE HAS CHALKED A HEART ON THE DOOR, AND THE YEAR.'},
    {'x': 10, 'y': 8, 'type': 'random_dialog', 'label': 'MAILBOX', 'prompt': 'PRESS E TO LOOK', 'messages': MAIL},
    {'x': 21, 'y': 17, 'type': 'farm_well', 'label': 'WELL', 'prompt': 'PRESS E TO FILL'},
    {'x': 21, 'y': 13, 'type': 'dialog', 'label': 'SCARECROW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SCARECROW IN A BLUE SHIRT. THE CROWS SIT ON ITS ARMS AND DISCUSS IT.'},
    {'x': 36, 'y': 20, 'type': 'vendor', 'label': 'SEED STALL', 'prompt': 'PRESS E TO BUY SEEDS',
     'items': [{'id': 'seed_turnip', 'price': 5}, {'id': 'seed_carrot', 'price': 8}, {'id': 'seed_strawberry', 'price': 15},
               {'id': 'seed_sunflower', 'price': 12}, {'id': 'seed_pumpkin', 'price': 30}, {'id': 'seed_starfruit', 'price': 80}]},
    {'x': 38, 'y': 20, 'type': 'dialog', 'label': 'HOLLIN', 'prompt': 'PRESS E TO TALK', 'dialog': 'HOLLIN TIPS HIS HAT.'},
    {'x': 37, 'y': 22, 'type': 'dialog', 'label': 'MARLO', 'prompt': 'PRESS E TO TALK', 'dialog': 'MARLO WAVES A MELON AT YOU.'},
    {'x': 35, 'y': 25, 'type': 'dialog', 'label': 'NOTICE BOARD', 'prompt': 'PRESS E TO READ',
     'dialog': 'NOTICES:\n\n"TILL WITH THE HOE, PLANT, THEN WATER - WATERED GROUND GROWS FOR TWENTY MINUTES, THEN DRIES OUT."\n\n'
               '"MARLO BUYS EVERYTHING. EVERYTHING."\n\n"LOST: ONE GOAT. ANSWERS TO NOTHING."'},
    {'x': 41, 'y': 24, 'type': 'dialog', 'label': "HOLLIN'S COTTAGE", 'prompt': 'PRESS E TO LOOK',
     'dialog': "HOLLIN'S COTTAGE. A PIE COOLS ON THE SILL. YOU ARE NOT GOING TO TOUCH IT."},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-hollin', 'x': 38, 'y': 20, 'facing': 'down'}, {'sheet': 'npc-marlo', 'x': 37, 'y': 22, 'facing': 'down'}],
            scene_extra={'smoke': SMOKE})
print('verdance done')
