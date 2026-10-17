"""Look Book 2 diorama: Hoarfell, a mountain tarn under Fellhaven — Look Book 1's composition built as real 3D in the
Bridge's Blender kit (scenekit + assets_snow / assets_town / assets_isle), small enough to build and render in minutes.

  tools/render.sh lookbook2/dioramas/hoarfell_tarn.py renders/hoarfell-tarn --ts 32,48 --crop main 1 -1.6 16 6.8375 --samples 24

A craggy, snow-capped rock face along the top with a frozen waterfall; the tarn below it, open water under the falls
(the engine's water mirrors the crag in it) and the rest ice — cracks, a swept rink with skate marks, an ice-fishing
hole; snow sculpted into drifts and banks, a lantern-lit path with footprints; a timber chalet with a deep snow roof,
balcony, icicles and warm windows on the left, a log cabin bottom right; snowy firs in clusters; a ski rack, firewood,
a sled, a snowman. Tile units: x = column, r = row (toward the camera), z = height. Writes hoarfell_tarn.json beside
this file: chimney smoke points and where the people stand, in screen tiles (x, r - z·cos45).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.environ.get('BRIDGE_REPO', '/home/user/becknology'), 'tools', 'bridge-art'))
from scenekit import Kit, shade  # noqa: E402
import assets_isle as I            # noqa: E402
import assets_snow as N            # noqa: E402
import assets_town as W            # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/hoarfell_tarn'
COLS, ROWS = 17, 11
C45 = math.cos(math.radians(45))
k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, seed=2207)
SNOW, SNOW_SH, PACKED = N.SNOW, N.SNOW_SH, N.PACKED
ROCK = ('#8c94a8', '#727a90', '#a0a8ba')


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C45, 3)]


# ---- the tarn's outline: an ellipse with a wandering edge ------------------------------------------------------------
TX, TR, TRX, TRY = 9.0, 3.25, 4.6, 2.15


def tarn_rad(a):
    """Outline radius factor at angle a (radians, in the x/row plane)."""
    return 1.0 + 0.07 * math.sin(3 * a + 0.6) + 0.05 * math.sin(5 * a + 2.1) + 0.03 * math.sin(9 * a)


def tarn_inside(x, r):
    """> 0 inside the tarn (0 at the shore, ~1 at the middle)."""
    dx, dr = (x - TX) / TRX, (r - TR) / TRY
    a = math.atan2(dr, dx)
    d = math.hypot(dx, dr)
    return 1 - d / tarn_rad(a)


# ---- the path: a curve from the bottom-left past the tarn to the cabin's door ---------------------------------------
PATH = [(-0.5, 7.8), (1.6, 7.0), (3.6, 6.3), (6.0, 5.95), (8.6, 5.85), (11.0, 6.15), (13.0, 6.55), (14.1, 6.85)]


def path_dist(x, r):
    best = 9.0
    for (ax, ar), (bx, br) in zip(PATH, PATH[1:]):
        vx, vr = bx - ax, br - ar
        t = max(0.0, min(1.0, ((x - ax) * vx + (r - ar) * vr) / (vx * vx + vr * vr)))
        best = min(best, math.hypot(x - ax - vx * t, r - ar - vr * t))
    return best


# ---- the ground: sculpted snow, the tarn's basin, the trodden path ---------------------------------------------------
def height(x, r):
    h = 0.0
    ins = tarn_inside(x, r)
    if ins > -0.15:
        h -= 0.26 * sm(-0.12, 0.35, ins)                                   # the basin, the bank sloping in
        h += 0.07 * sm(-0.16, -0.03, ins) * (1 - sm(-0.03, 0.06, ins))     # a low lip of snow round the shore
    # drifts: soft wind-shaped mounds, longer across the wind (along x), kept off the path and out of the tarn
    n = I.n2(x * 0.55, r * 0.95, 1.0, 41) * 0.6 + I.n2(x * 1.3, r * 1.9, 1.0, 43) * 0.4
    drift = max(0.0, n) * 0.22
    away = sm(0.45, 1.3, path_dist(x, r)) * (1 - sm(-0.25, 0.0, ins))
    h += drift * away
    # the back slope rising to the crag at the sides (behind the chalet, behind the cabin's firs)
    h += 0.35 * sm(1.6, -0.6, r) * (sm(3.0, 1.2, x) + sm(15.2, 16.6, x))
    # drifts banked against the chalet's back and the cabin's side
    h += 0.18 * math.exp(-(((x - 2.1) / 2.0) ** 2 + ((r - 1.25) / 0.35) ** 2))
    h += 0.16 * math.exp(-(((x - 16.2) / 0.5) ** 2 + ((r - 6.0) / 1.0) ** 2))
    # the path: pressed a little into the snow
    h -= 0.035 * sm(0.55, 0.25, path_dist(x, r))
    return h


def material(x, r):
    d = path_dist(x, r) + 0.12 * I.n2(x, r, 2.7, 9)
    if d < 0.42:
        return 'path'
    if d < 0.58:
        return 'path_edge'
    return 'snow'


FX0, FX1 = 7.55, 9.85                                                       # the frozen waterfall's span
cliff_cells = [(c, r) for c in range(2, 16) for r in range(-5, 0)]
ground_cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-5, ROWS + 1) if (c, r) not in set(cliff_cells)]
I.ground(k, ground_cells, material, {'snow': (SNOW, 0.04), 'path': (PACKED, 0.06), 'path_edge': ('#cbd5e6', 0.05),
                                     }, step=0.0625, bump=0.008, seed=7, height=height, dither=0.05)

# ---- the crag: a coherent rock face in tiers -------------------------------------------------------------------------
# Four beds of rock stepping back up the slope. Each tier is a run of big blocks split by vertical cracks (the gaps between
# them): a dark face toward the camera, a bedding line across it, and snow lying along its top ledge with a rounded lip.
# Where the waterfall comes down, the lower tiers are cut back into a recess and the ice curtain hangs in it.
TIERS = [(0.9, 0.78), (1.75, 0.46), (2.6, 0.14), (3.45, -0.18)]               # (top z, front row) per tier, front to back
FACE = ('#5c6276', '#666c80', '#545a6c', '#70768a')
XA, XB = 2.2, 15.8
RECESS = (FX0 - 0.35, FX1 + 0.35)


def rock_block(x0, x1, rf, rback, z_top, lean, col, seed):
    """A block of the face: a jagged top edge, the face leaning back a little, snow lying on its top with a rounded lip."""
    rr = __import__('random').Random(seed)
    n = max(3, int((x1 - x0) / 0.18))
    tops = []
    z = z_top
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        if 0 < i < n:
            z = z_top + rr.uniform(-0.1, 0.08) + (0.14 if rr.random() < 0.15 else 0.0) * rr.choice((-1, 1))
        else:
            z = z_top + rr.uniform(-0.12, -0.02)
        tops.append((x, z))
    xm = (x0 + x1) / 2
    # the face: fanned from the middle of its foot, the top edge set back by `lean`
    outline = [(x0, rf, 0.0)] + [(x, rf - lean, z) for (x, z) in tops] + [(x1, rf, 0.0)]
    k.poly([(xm, rf, 0.0)] + outline, (col, 0.07), 'crag_face')
    # the sides (seen in the cracks between blocks)
    for (x, z) in (tops[0], tops[-1]):
        k.loft([[(x, rf, 0.0), (x, rf - lean, z)], [(x, rback, 0.0), (x, rback, z)]], (shade(col, 0.8), 0.07), 'crag_side', smooth=False)
    # the top: snow over the ledge back to the next tier, a rounded lip along the jagged front edge
    k.loft([[(x, rf - lean, z + 0.01) for (x, z) in tops], [(x, rback, z + 0.01) for (x, z) in tops]], (N.ROOF_SNOW, 0.03), 'ledge_snow', smooth=True)
    for (xa, za), (xb, zb) in zip(tops, tops[1:]):
        k.tube((xa, rf - lean + 0.02, za + 0.03), (xb, rf - lean + 0.02, zb + 0.03), 0.065, (N.ROOF_SNOW, 0.03), 'ledge_snow', verts=8)
    # a crack or two running up the face, the odd icicle off the lip
    for _ in range(rr.randint(0, 2)):
        cx = rr.uniform(x0 + 0.15, x1 - 0.15)
        zc = rr.uniform(0.3, 0.8) * z_top
        k.tube((cx, rf + 0.004, 0.02), (cx + rr.uniform(-0.08, 0.08), rf - lean * zc / z_top + 0.004, zc), 0.018, (shade(col, 0.55), 0.05), 'crack', verts=4)
    if rr.random() < 0.5:
        ix = rr.uniform(x0 + 0.15, x1 - 0.2)
        for j in range(rr.randint(2, 4)):
            L = rr.uniform(0.12, 0.3)
            k.cone(ix + j * 0.09, rf - lean + 0.03, z_top - L, z_top - 0.02, 0.028, 0.005, (N.ICE, 0.05), 'icicle', verts=5)


for ti, (zt, rf) in enumerate(TIERS):
    rf_next = TIERS[ti + 1][1] if ti + 1 < len(TIERS) else rf - 0.6
    x = XA - k.rng.uniform(0.0, 0.5)
    while x < XB:
        w = k.rng.uniform(0.5, 1.7) if ti < 3 else k.rng.uniform(1.0, 2.0)
        x1 = min(XB, x + w)
        if RECESS[0] < (x + x1) / 2 < RECESS[1] and ti < 3:
            x = x1
            continue
        gap = k.rng.uniform(0.03, 0.08)
        front = rf + k.rng.uniform(-0.12, 0.1)
        top = zt + k.rng.uniform(-0.18, 0.12)
        rock_block(x + gap / 2, x1 - gap / 2, front, rf_next - 0.05, top, k.rng.uniform(0.06, 0.2), FACE[k.rng.randrange(len(FACE))], k.rng.randrange(10 ** 6))
        # behind the block, a solid core so nothing shows through the cracks
        k.box(x, rf_next - 0.3, 0.0, x1, front - 0.25, top - 0.15, ('#3c4252', 0.05), 'crag_core')
        x = x1
# the recess behind the waterfall: a darker wall standing back from the face, its top ledge snowy
k.box(RECESS[0], -5.5, 0.0, RECESS[1], 0.05, TIERS[2][0] - 0.05, ('#4a5062', 0.08), 'crag_face', bevel=0.04)
# big boulders fallen to the foot of the face
for (x, r, s) in ((3.7, 1.15, 0.55), (5.3, 1.0, 0.42), (12.6, 1.05, 0.5), (14.1, 1.3, 0.62), (6.4, 0.98, 0.3)):
    k.rock(x, r, s * 0.38, s, s * 0.78, s * 0.72, ('#6a7084', 0.1), part='boulder', segs=10, jitter=0.16)
    k.blob(x - s * 0.08, r - s * 0.08, s * 0.82, s * 0.8, s * 0.6, s * 0.22, (N.ROOF_SNOW, 0.05), 'boulder_snow', segs=12)
# snow banked along the foot of the face
x = XA
while x < XB:
    k.blob(x, TIERS[0][1] + 0.12, 0.02, k.rng.uniform(0.4, 0.7), 0.22, k.rng.uniform(0.12, 0.2), (SNOW, 0.04), 'foot_drift', segs=10)
    x += k.rng.uniform(0.45, 0.7)

# the frozen waterfall: a curtain of ice columns hanging in the recess, bulging where it froze in layers
ICES = ('#d8eef8', '#b4dcee', '#8cc4e2', '#6aa4cc')
FTOP, FR_TOP, FR_BOT = TIERS[2][0] + 0.02, 0.12, 1.0
i = 0
x = FX0
while x < FX1:
    mid = 1 - abs((x - (FX0 + FX1) / 2) / ((FX1 - FX0) / 2))
    top = FTOP + 0.08 * math.sin(x * 7.1)
    bot = 0.05 + (1 - mid) * k.rng.uniform(0.2, 0.9)
    rad = 0.07 + 0.09 * mid * k.rng.uniform(0.6, 1.2)
    col = ICES[(i * 3 + int(x * 13)) % 4 if mid > 0.3 else 3 - (i % 2)]
    rb_ = FR_TOP + (FR_BOT - FR_TOP) * (1 - bot / top)
    k.tube((x, FR_TOP, top), (x + k.rng.uniform(-0.04, 0.04), rb_, bot), rad, (col, 0.05), 'icefall', rb=rad * 0.55, verts=6)
    for zz in (0.6, 1.2, 1.8, 2.3):
        if k.rng.random() < 0.5 * mid + 0.2:
            t = (zz - bot) / max(0.1, top - bot)
            if 0 < t < 1:
                k.blob(x, rb_ - t * (rb_ - FR_TOP), zz, rad * 1.6, rad * 1.2, rad * 1.9, (ICES[k.rng.randrange(3)], 0.05), 'icefall', segs=8)
    x += k.rng.uniform(0.09, 0.16)
    i += 1
k.blob((FX0 + FX1) / 2, 1.2, 0.02, 1.25, 0.42, 0.16, (ICES[1], 0.05), 'ice_pool', segs=14)
k.tube((FX0 - 0.2, FR_TOP - 0.02, FTOP + 0.06), (FX1 + 0.2, FR_TOP - 0.02, FTOP + 0.06), 0.1, (N.ROOF_SNOW, 0.04), 'ledge_snow', verts=10)
for j in range(9):                                                     # icicles off the lip above the fall
    x = FX0 - 0.3 + j * 0.34
    L = 0.25 + 0.35 * abs(math.sin(j * 2.3))
    k.cone(x, FR_TOP, FTOP - L, FTOP, 0.05, 0.008, (ICES[0], 0.05), 'icicle', verts=6)

# ---- the tarn: water (the engine's water), an ice sheet over most of it, open under the falls --------------------------
segs = 72


def ring(scale, z, bite=False):
    pts = []
    for i in range(segs):
        a = i / segs * math.tau
        f = tarn_rad(a) * scale
        if bite:            # open water under the falls: the ice stops short at the top middle
            up = math.cos(a + math.pi / 2)                              # 1 at the top (row decreasing)
            f *= 1 - 0.5 * sm(0.55, 0.95, up) - 0.06 * sm(0.3, 0.6, up)
        pts.append((TX + math.cos(a) * TRX * f, TR + math.sin(a) * TRY * f, z))
    return pts[::-1]          # wound so the fan's faces point up


k.poly([(TX, TR, -0.075)] + ring(0.97, -0.075) + [ring(0.97, -0.075)[0]], ('#2e5a72', 0.05), 'pond_water')
ice = ring(0.985, -0.05, bite=True)
k.poly([(TX + 0.4, TR + 0.6, -0.05)] + ice + [ice[0]], ('#c6dcea', 0.06), 'ice')
# the ice's rim, a little thicker and whiter where it meets the open water and the shore
for p, q in zip(ice, ice[1:] + ice[:1]):
    k.tube((p[0], p[1], -0.045), (q[0], q[1], -0.045), 0.035, ('#e2eef6', 0.05), 'ice_rim', verts=5)
# cracks, skate marks, a swept rink, dusted snow
for _ in range(12):
    a = k.rng.uniform(0, math.tau)
    x0 = TX + 0.5 + math.cos(a) * TRX * k.rng.uniform(0.05, 0.3)
    r0 = TR + 0.6 + math.sin(a) * TRY * k.rng.uniform(0.05, 0.3)
    pts = [(x0, r0)]
    for j in range(5):
        a += k.rng.uniform(-0.6, 0.6)
        pts.append((pts[-1][0] + math.cos(a) * 0.45, pts[-1][1] + math.sin(a) * 0.25))
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        if tarn_inside(bx, br) > 0.12 and tarn_inside(ax, ar) > 0.12:
            k.tube((ax, ar, -0.044), (bx, br, -0.044), 0.012, ('#7aa2c0', 0.05), 'crack', verts=4)
RINK = (10.8, 4.15, 1.45, 0.72)
k.cyl(RINK[0], RINK[1], -0.05, -0.043, RINK[2], ('#dcecf6', 0.04), 'rink', verts=32, ry=RINK[3])
for i in range(9):                                                      # skate marks: loops round the rink
    a0 = k.rng.uniform(0, math.tau)
    rr = k.rng.uniform(0.5, 1.15)
    for j in range(7):
        a, b = a0 + j * 0.22, a0 + (j + 1) * 0.22
        k.tube((RINK[0] + math.cos(a) * RINK[2] * rr, RINK[1] + math.sin(a) * RINK[3] * rr, -0.041),
               (RINK[0] + math.cos(b) * RINK[2] * rr, RINK[1] + math.sin(b) * RINK[3] * rr, -0.041), 0.008, ('#f6fbff', 0.03), 'skate', verts=4)
for _ in range(10):                                                     # wind-blown snow lying on the ice, in streaks
    a = k.rng.uniform(0, math.tau)
    d = k.rng.uniform(0.45, 0.82)
    x, r = TX + math.cos(a) * TRX * d, TR + math.sin(a) * TRY * d
    if tarn_inside(x, r) < 0.15 or math.cos(a + math.pi / 2) > 0.3:
        continue
    for j in range(5):
        k.blob(x + j * k.rng.uniform(0.15, 0.3), r + k.rng.uniform(-0.05, 0.05), -0.046, k.rng.uniform(0.18, 0.4), k.rng.uniform(0.04, 0.09), 0.012,
               (SNOW, 0.04), 'ice_snow', rot=(0, 0, k.rng.uniform(-8, 8)), segs=10)
N.fishing_hole(k, 6.55, 3.5)
# shore rocks with snow on them
for (x, r, s) in ((4.35, 3.6, 0.3), (4.7, 2.6, 0.22), (13.7, 2.4, 0.32), (13.5, 4.2, 0.24), (6.0, 5.3, 0.2), (11.9, 5.25, 0.26)):
    k.rock(x, r, s * 0.3, s, s * 0.8, s * 0.7, (ROCK[1], 0.2), part='shore_rock', segs=8)
    k.blob(x - 0.04, r - 0.04, s * 0.66, s * 0.72, s * 0.55, s * 0.18, (N.ROOF_SNOW, 0.1), 'rock_snow', segs=9)
# reeds poking through the snow at the near shore
for i in range(14):
    a = math.pi * (0.25 + 0.5 * k.rng.random())
    x, r = TX + math.cos(a) * TRX * 1.02, TR + math.sin(a) * TRY * 1.02
    for j in range(3):
        k.tube((x + j * 0.05, r, -0.02), (x + j * 0.05 + k.rng.uniform(-0.06, 0.06), r - 0.02, k.rng.uniform(0.25, 0.45)), 0.012,
               ('#b8a070', 0.1), 'reed', verts=4)

# ---- the chalet: front-gabled, a timber gable with a balcony across it, a deep snow roof ----------------------------
def gable_chalet(x0, x1, r_back, r_front, wall_h, rise, door_x, windows, upper, chimney_x, over=0.45, front_over=0.7):
    xc, zt = (x0 + x1) / 2, wall_h + rise
    k.box(x0 - 0.04, r_back, 0, x1 + 0.04, r_front + 0.04, 0.32, ('#6a6e78', 0.16), 'footing', bevel=0.03)
    k.box(x0, r_back, 0.32, x1, r_front, wall_h, (N.LOG, 0.08), 'chalet_wall')
    z, j = 0.38, 0
    while z < wall_h - 0.05:                                                       # log courses, ends standing proud
        k.cyl_x(x0 - 0.08, x1 + 0.08, r_front - 0.02, z, 0.075, 0.075, (shade(N.LOG, 0.9 if j % 2 else 1.06), 0.1), 'log', verts=8)
        z += 0.15
        j += 1
    # the gable: vertical boards over the log wall, a round window in its peak
    gz0 = wall_h
    k.poly([(x0, r_front + 0.02, gz0), (x1, r_front + 0.02, gz0), (xc, r_front + 0.02, zt)], (N.LOG_L, 0.08), 'gable')
    bx = x0 + 0.12
    while bx < x1 - 0.1:
        hgt = (1 - abs(bx - xc) / ((x1 - x0) / 2)) * rise
        if hgt > 0.08:
            k.box(bx - 0.015, r_front + 0.03, gz0, bx + 0.015, r_front + 0.05, gz0 + hgt - 0.03, (N.LOG_D, 0.08), 'board_joint')
        bx += 0.2
    k.cyl_y(xc, r_front + 0.02, r_front + 0.08, gz0 + rise * 0.55, 0.2, 0.2, N.LOG_D, 'gable_window_frame', verts=14)
    k.cyl_y(xc, r_front + 0.04, r_front + 0.1, gz0 + rise * 0.55, 0.14, 0.14, '#5a3a18', 'window_glass', emit=('#ffc870', 0.9), verts=14)
    k.point_light(xc, r_front + 0.6, gz0 + rise * 0.55, '#ffc070', 4, radius=0.15, group='flicker')
    # the roof: two slopes, deep eaves at the sides and a deep overhang over the gable, snow lying thick on it
    rb, rf = r_back - 0.3, r_front + front_over
    for s_ in (-1, 1):
        xe = xc + s_ * ((x1 - x0) / 2 + over)
        ze = wall_h - over * rise / ((x1 - x0) / 2)
        k.poly([(xc, rb, zt), (xc, rf, zt), (xe, rf, ze), (xe, rb, ze)], (N.LOG_D, 0.08), 'roof_deck')
        # the snow: a blanket lying on the slope, thicker toward the ridge, with a thick rounded cornice along the eave
        # and the verges; one course of shakes shows below the cornice at the eave
        SN = 0.88
        xs_, zs_ = xc + (xe - xc) * SN, zt + (ze - zt) * SN
        k.poly([(xc, rb + 0.05, zt + 0.14), (xc, rf - 0.08, zt + 0.14), (xs_, rf - 0.08, zs_ + 0.1), (xs_, rb + 0.05, zs_ + 0.1)],
               (N.ROOF_SNOW, 0.03), 'roof_snow')
        # two long, low drifts lying down the slope
        ang = math.degrees(math.atan2(rise, (x1 - x0) / 2))
        for j in range(2):
            rr = rb + (0.3 + 0.4 * j) * (rf - rb) + k.rng.uniform(-0.15, 0.15)
            tm = SN * 0.5
            k.blob(xc + (xe - xc) * tm, rr, zt + (ze - zt) * tm + 0.12, ((x1 - x0) / 2) * SN * 0.5, 0.55, 0.028, (N.ROOF_SNOW, 0.03),
                   'roof_drift', rot=(0, -s_ * ang, 0), segs=12)
        # the eave cornice: a fat rounded roll of snow overhanging the shakes, sagging a little between the rafters
        n = 7
        for j in range(n):
            ra_ = rb + 0.02 + j / n * (rf - rb - 0.08)
            rb2 = rb + 0.02 + (j + 1) / n * (rf - rb - 0.08)
            sag = 0.03 * math.sin(j * 1.7)
            k.tube((xs_ + s_ * 0.04, ra_, zs_ + 0.06 - sag), (xs_ + s_ * 0.04, rb2, zs_ + 0.06 + sag), 0.15, (N.ROOF_SNOW, 0.03), 'cornice', verts=12)
        # one course of shakes at the eave, under the cornice
        rects = {0: [], 1: [], 2: []}
        xa, xb_ = xc + (xe - xc) * (SN + 0.02), xe
        za, zb_ = zt + (ze - zt) * (SN + 0.02), ze
        rr = rb
        while rr < rf - 0.05:
            L = k.rng.uniform(0.16, 0.26)
            lo, hi = (xa, xb_) if xa < xb_ else (xb_, xa)
            rects[k.rng.randrange(3)].append((lo, rr, min(za, zb_) + 0.01, hi, min(rf - 0.02, rr + L - 0.03), max(za, zb_) + 0.06))
            rr += L
        for j, tone in enumerate(('#5a3420', '#4a2a18', '#6a4026')):
            if rects[j]:
                k.boxes(rects[j], (tone, 0.08), 'shakes')
        # the verges: rounded rolls of snow along the gable front and the back edge
        for rv in (rf - 0.06, rb + 0.04):
            k.tube((xc, rv, zt + 0.14), (xs_ + s_ * 0.04, rv, zs_ + 0.08), 0.12, (N.ROOF_SNOW, 0.03), 'verge_snow', verts=10)
        k.bar(xc, rf + 0.02, xe, rf + 0.02, ze - 0.02, ze + 0.02, 0.06, (N.LOG_D, 0.08), 'bargeboard')
        k.tube((xc, rf + 0.04, zt - 0.02), (xe, rf + 0.04, ze - 0.06), 0.045, (N.LOG_D, 0.08), 'bargeboard', verts=6)
        # icicles along the side eave
        rr = rb + 0.15
        while rr < rf - 0.1:
            L = k.rng.uniform(0.08, 0.3)
            k.cone(xe - s_ * 0.08, rr, ze - L, ze, 0.025, 0.004, (N.ICE, 0.06), 'icicle', verts=5)
            rr += k.rng.uniform(0.14, 0.26)
    k.tube((xc, rb + 0.04, zt + 0.17), (xc, rf - 0.06, zt + 0.17), 0.13, (N.ROOF_SNOW, 0.03), 'ridge_snow', verts=12)
    # icicles under the gable's overhang
    for j in range(9):
        t = (j + 0.5) / 9
        xx = x0 - over + t * (x1 - x0 + 2 * over)
        zz = zt - abs(xx - xc) * rise / ((x1 - x0) / 2) - 0.1
        if zz > wall_h - 0.3:
            k.cone(xx, rf - 0.02, zz - k.rng.uniform(0.1, 0.32), zz, 0.03, 0.005, (N.ICE, 0.06), 'icicle', verts=5)
    # the balcony across the gable
    bz = wall_h - 0.12
    k.box(x0 + 0.05, r_front, bz, x1 - 0.05, r_front + 0.55, bz + 0.09, (N.LOG_D, 0.08), 'balcony')
    xx = x0 + 0.12
    while xx < x1 - 0.1:
        k.box(xx, r_front + 0.49, bz + 0.09, xx + 0.06, r_front + 0.55, bz + 0.5, (N.LOG_L, 0.08), 'baluster')
        xx += 0.17
    k.box(x0 + 0.05, r_front + 0.47, bz + 0.5, x1 - 0.05, r_front + 0.57, bz + 0.57, (N.LOG_D, 0.08), 'rail')
    k.tube((x0 + 0.05, r_front + 0.52, bz + 0.62), (x1 - 0.05, r_front + 0.52, bz + 0.62), 0.06, (N.ROOF_SNOW, 0.04), 'rail_snow', verts=8)
    for (bx2, bc) in ((x0 + 0.5, '#c83a2e'), (x1 - 0.6, '#3a7ac0')):                         # blankets airing on the rail
        k.box(bx2, r_front + 0.56, bz + 0.2, bx2 + 0.4, r_front + 0.6, bz + 0.6, (bc, 0.1), 'blanket')
    for (ux, uz) in upper:
        W.window(k, ux, r_front + 0.04, wall_h + uz, w=0.42, h=0.5, shutters='#7a2a22')
    W.door(k, door_x, r_front + 0.04, col=N.LOG_D)
    k.box(door_x - 0.55, r_front, 0, door_x + 0.55, r_front + 0.5, 0.14, ('#8a8e98', 0.15), 'step')
    for (wx, wz) in windows:
        W.window(k, wx, r_front + 0.06, wz, shutters='#7a2a22', flowers=None)
        k.blob(wx, r_front + 0.18, wz - 0.03, 0.4, 0.12, 0.05, (N.ROOF_SNOW, 0.06), 'sill_snow', segs=8)
    W.wall_lantern(k, door_x + 0.62, r_front + 0.04)
    # chimney on the left slope, snow on its cap
    cz = wall_h + rise * (1 - abs(chimney_x - xc) / ((x1 - x0) / 2))
    k.box(chimney_x - 0.2, r_back + 0.4, wall_h, chimney_x + 0.2, r_back + 0.8, cz + 0.6, ('#5c5a62', 0.14), 'chimney', bevel=0.02)
    k.blob(chimney_x, r_back + 0.6, cz + 0.66, 0.28, 0.26, 0.08, (N.ROOF_SNOW, 0.05), 'chimney_snow', segs=10)
    k.solid(x0, r_back, x1, r_front)
    return screen(chimney_x, r_back + 0.6, cz + 0.75)


CH = (0.95, 4.15, 2.3, 4.0)
SMOKE = [gable_chalet(CH[0], CH[1], CH[2], CH[3], 1.9, 1.15, 2.55, [(1.55, 0.75), (3.55, 0.75)], [(1.85, 0.3), (3.25, 0.3)], 1.55)]
# its porch: a bench by the door, a barrel, a potted fir, skis leaning on the wall
W.bench(k, 3.25, 4.05, 4.75)
k.cyl(1.2, 4.45, 0, 0.55, 0.22, ('#6a4a2a', 0.12), 'barrel', verts=12)
k.cyl(1.2, 4.45, 0.55, 0.62, 0.24, (N.ROOF_SNOW, 0.1), 'barrel_snow', verts=12)
k.cyl(1.75, 4.35, 0, 0.32, 0.17, ('#7a4a2a', 0.12), 'pot', verts=10)
W.pine_tiers(k, 1.75, 4.35, 0.85, N.PINE, rad=0.24, z0=0.4, tiers=3, snow=N.ROOF_SNOW)
N.ski_rack(k, 0.5, 2.1, 5.15)
N.woodpile(k, 4.45, 5.55, 4.95)

# ---- the log cabin, bottom right ------------------------------------------------------------------------------------
CB = (12.3, 15.9, 5.05, 6.65)
rm2, zr2 = N.chalet(k, CB[0], CB[1], CB[2], CB[3], wall_h=1.85, rise=0.7, door_x=14.1, windows=[(12.95, 0.8), (15.25, 0.8)],
                    chimney=15.3, lanterns=(13.55,))
SMOKE.append(screen(15.18, rm2 - 0.15, zr2 + 0.7))
x = CB[0] - 0.3
while x < CB[1] + 0.3:                                                  # the snow's thick lip along the eave
    k.blob(x, CB[3] + 0.38, 1.82, 0.22, 0.16, 0.12, (N.ROOF_SNOW, 0.05), 'cornice', segs=10)
    x += 0.2
for (x, dr) in ((12.9, 0.2), (13.9, 0.0), (14.9, 0.15), (15.5, -0.1)):  # snow pillows on the roof
    k.blob(x, CB[2] + 0.7 + dr, zr2 - 0.3, 0.5, 0.3, 0.1, (N.ROOF_SNOW, 0.05), 'roof_pillow', segs=10)
k.cyl(16.1, 7.0, 0, 0.5, 0.2, ('#6a4a2a', 0.12), 'barrel', verts=12)
k.cyl(16.1, 7.0, 0.5, 0.56, 0.22, (N.ROOF_SNOW, 0.1), 'barrel_snow', verts=12)
k.box(12.4, 6.95, 0.0, 13.05, 7.35, 0.35, ('#6a4a2a', 0.12), 'crate')
k.blob(12.72, 7.15, 0.37, 0.36, 0.22, 0.05, (N.ROOF_SNOW, 0.05), 'crate_snow', segs=8)
for (x, c) in ((15.75, '#e0b030'), (15.9, '#2a9a5a')):                  # skis stuck upright in the snow by the cabin
    k.tube((x, 6.95, 0.0), (x + 0.05, 6.9, 1.25), 0.03, (c, 0.1), 'ski', verts=4)

# ---- the path: lanterns, footprints, a bench looking over the tarn, a signpost --------------------------------------
for (x, r) in ((2.75, 6.2), (6.4, 6.55), (10.3, 6.65), (11.9, 7.0)):
    W.lantern_post(k, x, r, h=1.75, energy=14)
for i in range(64):                                                     # footprints: pairs along the path
    t = i / 63
    seg = min(len(PATH) - 2, int(t * (len(PATH) - 1)))
    u = t * (len(PATH) - 1) - seg
    (ax, ar), (bx, br) = PATH[seg], PATH[seg + 1]
    x, r = ax + (bx - ax) * u, ar + (br - ar) * u
    nx, nr = -(br - ar), bx - ax
    L = math.hypot(nx, nr) or 1
    off = 0.11 if i % 2 else -0.11
    px, pr = x + nx / L * off + k.rng.uniform(-0.03, 0.03), r + nr / L * off + k.rng.uniform(-0.03, 0.03)
    k.blob(px, pr, height(px, pr) + 0.005, 0.055, 0.085, 0.012, ('#a8b6ce', 0.05), 'print', segs=6)
W.bench(k, 7.7, 8.7, 6.6)
k.blob(8.2, 6.7, 0.5, 0.55, 0.14, 0.05, (N.ROOF_SNOW, 0.05), 'bench_snow', segs=8)
N.signpost(k, 5.6, 5.45)
N.snowman(k, 2.15, 5.6)
N.sled(k, 4.5, 6.85)
for (x, r) in ((0.6, 6.6), (5.3, 7.3), (13.0, 7.65), (9.3, 7.3)):                 # snow-covered shrubs, twigs poking out
    k.blob(x, r, 0.12, 0.32, 0.24, 0.2, (N.ROOF_SNOW, 0.06), 'shrub_snow', segs=10)
    for j in range(4):
        a = j * 1.7
        k.tube((x, r, 0.1), (x + math.cos(a) * 0.35, r + math.sin(a) * 0.15, 0.32 + 0.1 * (j % 2)), 0.012, (N.LOG_D, 0.1), 'twig', verts=4)
for i in range(7):                                                         # a split-rail fence half under the snow, bottom left
    x = -0.4 + i * 0.6
    r = 7.55 - i * 0.25
    k.box(x - 0.04, r - 0.04, 0, x + 0.04, r + 0.04, 0.55, (N.LOG_D, 0.1), 'fence_post')
    k.blob(x, r, 0.58, 0.06, 0.06, 0.04, (N.ROOF_SNOW, 0.05), 'post_snow', segs=6)
    if i < 6:
        k.tube((x, r, 0.42), (x + 0.6, r - 0.25, 0.42), 0.025, (N.LOG, 0.1), 'fence_rail', verts=5)
        k.tube((x, r, 0.46), (x + 0.6, r - 0.25, 0.46), 0.03, (N.ROOF_SNOW, 0.05), 'rail_snow', verts=5)
# fox tracks across the open snow to the right of the tarn
for i in range(14):
    x, r = 13.9 + i * 0.16, 4.5 - i * 0.1 + 0.05 * math.sin(i)
    k.blob(x, r, height(x, r) + 0.004, 0.03, 0.04, 0.01, ('#b4c0d6', 0.05), 'print', segs=5)

# ---- snowy firs in clusters ----------------------------------------------------------------------------------------
FIRS = [
    (0.7, -0.6, 2.9), (2.0, -1.4, 2.6), (3.1, -0.1, 2.4), (-0.2, 1.0, 2.7),          # behind the chalet
    (14.4, -0.2, 2.8), (15.6, 0.7, 2.6), (16.6, -0.9, 2.9), (14.9, 1.9, 2.3), (16.5, 2.6, 2.7),   # behind the cabin
    (16.3, 4.3, 2.5), (15.2, 3.6, 2.1),
    (6.4, 8.0, 2.7), (7.4, 8.5, 2.4), (5.4, 8.6, 2.5),                               # the near cluster (framing the bottom)
    (-0.2, 8.2, 2.7), (1.0, 8.9, 2.5),                                               # bottom left
    (10.9, 8.4, 2.3), (16.7, 7.9, 2.6), (15.3, 8.6, 2.4),
]
for (x, r, h) in FIRS:
    N.snow_pine(k, x, r, h=h)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# a couple of lamps on the cabin and the chalet are the scene's own lights (windows, lanterns); the engine adds the sun
info = {'smoke': SMOKE, 'people': {'skater': [RINK[0] - 0.4, RINK[1] + 0.1], 'skier': [3.4, 6.35], 'fisher': [7.0, 3.7],
                                   'pilot': [9.2, 6.0], 'path': PATH}}
json.dump(info, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hoarfell_tarn.json'), 'w'), indent=1)
k.render(OUT, light_samples=24)
