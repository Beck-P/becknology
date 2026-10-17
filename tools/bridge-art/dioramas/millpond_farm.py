"""Look Book 2: Millpond Farm — a purpose-made Verdance diorama in the game's own Blender kit.

  SCENE_CYCLE=day BVENV/bin/python tools/bridge-art/dioramas/millpond_farm.py OUT && python3 tools/bridge-art/scene_post.py OUT OUT/post

Look Book 1's farm, modelled: an upper terrace across the top with a dry-stone face (stacked, varied stones, moss, a
grass lip hanging over, ferns at the foot), a stream running across it that spills over the face as a small waterfall
into a millpond sunk in the meadow below (real banks, reeds, lily pads, a jetty on posts, a rowboat); the farmhouse on
the terrace (the richer house kit from village/richer.py when it's there), an oak and pines behind, a little orchard; on
the low ground a fenced field of crop rows with a scarecrow, a dirt path from the terrace steps past the pond, rocks,
bushes, flowers, a lamp post. The land is one heightfield (terrace, slopes, the sunken pond), not a flat sheet.
Built at z = 0 and lifted onto the terrace with assets_isle.pose where it stands up there.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from scenekit import Kit, shade  # noqa: E402
import assets_farm as F  # noqa: E402
import assets_isle as I  # noqa: E402
import assets_town as W  # noqa: E402
from assets_lumar import barrel  # noqa: E402

OUT = sys.argv[1]
COLS, ROWS = 17, 9
TERR = 1.55                     # the terrace's height (tiles)
EDGE = 4.0                      # the row of the terrace's stone face
POND = (11.2, 5.62, 3.2, 1.3)  # centre x, row; base radii (the outline wanders round them: pond_R)
WATER_Z = -0.1
STREAM = [(13.7, -3.2), (13.3, -1.6), (12.6, 0.2), (12.9, 2.2), (12.45, 4.0)]
PATH_LOW = [(7.1, 5.3), (7.0, 6.2), (7.6, 7.0), (8.6, 7.7), (9.5, 7.9)]
PATH_LOW2 = [(7.6, 7.0), (6.9, 8.0), (6.6, 9.6)]
PATH_UP = [(7.5, 3.05), (7.25, 3.6), (7.1, 4.0)]
FIELD = (1.15, 4.85, 5.95, 7.85)
OUT_STREAM = [(13.3, 7.25), (13.9, 7.8), (14.2, 8.6), (14.9, 9.8)]     # the pond trickles out at its low corner
STEPS = (6.55, 7.65)
FALL = (12.05, 12.95)

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, seed=4242)
rng = k.rng

# the richer house kit (assets_house.py): rich_house, tubs, barrels, flower beds
HK = None
try:
    import assets_house as HK  # noqa: E402
except Exception as e:  # noqa: BLE001
    print('MILLPOND: no richer house kit (%s); using assets_town.house' % e)
import assets_village as V  # noqa: E402


def lifted(fn, *a, **kw):
    """Build with fn at ground level, then raise what it built onto the terrace."""
    sp, sl = len(k.parts), len(k.lights)
    out = fn(*a, **kw)
    I.pose(k, sp, (0, 0, 0), dz=TERR, lights_since=sl)
    return out


def pond_R(th):
    """The pond's outline as a radius (relative to the base ellipse) by angle (0 = east, pi/2 = toward the viewer):
    a long uneven shape, a cove pushed into the bank at the lower left, a point of land reaching in from the east,
    a lobe toward the near bank where the jetty stands."""
    R = 1.0 + 0.08 * math.sin(2 * th + 0.7) + 0.06 * math.sin(3 * th + 2.1) + 0.04 * math.sin(5 * th + 0.3) + 0.022 * math.sin(9 * th + 1.7)
    R += 0.2 * math.exp(-((th - 2.4) / 0.3) ** 2)                   # a cove into the lower-left bank
    R -= 0.22 * math.exp(-((th + 0.05) / 0.2) ** 2)                 # a point of land reaching in from the east
    R += 0.12 * math.exp(-((th - 1.55) / 0.4) ** 2)                 # a lobe toward the near bank (the jetty)
    R += 0.16 * math.exp(-((th + 1.25) / 0.35) ** 2)                # reaching up under the waterfall
    return R


def pond_d(x, r):
    cx, cr, rx, ry = POND
    u, v = (x - cx) / rx, (r - cr) / ry
    return math.hypot(u, v) / pond_R(math.atan2(v, u))


def pond_edge(th, k_=1.0):
    cx, cr, rx, ry = POND
    R = pond_R(th) * k_
    return cx + math.cos(th) * rx * R, cr + math.sin(th) * ry * R


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- the land: one heightfield, two pieces (the terrace and the low ground), split at the stone face ----------------
GREEN = '#5e9a3a'
ALB = {'grass': (GREEN, 0.12), 'path': (F.DIRT, 0.1), 'bank': ('#6a5638', 0.22), 'bed': ('#3e4a3a', 0.2),
       'field': (F.EARTH, 0.06), 'gravel': ('#8a8274', 0.25), 'stream': ('#4a5a4a', 0.2)}


def upper_h(x, r):
    z = TERR + 0.035 * I.n2(x, r, 0.9, 3) + max(0.0, -r - 0.6) * 0.12
    d = I.path_dist([STREAM], x, r)                       # the stream's channel, sunk into the terrace
    if d < 0.55:
        z -= 0.2 * smooth(0.55, 0.12, d)
    return z


def lower_h(x, r):
    z = 0.03 * I.n2(x, r, 1.1, 5)
    d = pond_d(x, r)
    if d < 1.32:                                          # the bank falls to the water; a shelf, then the bed, deepest off-centre
        hollow = math.exp(-(((x - 12.0) / 1.6) ** 2 + ((r - 5.3) / 0.8) ** 2))
        z -= 0.15 * smooth(1.32, 0.98, d) + 0.22 * smooth(0.98, 0.7, d) + 0.35 * hollow * smooth(0.9, 0.4, d)
    if OUT_STREAM and I.path_dist([OUT_STREAM], x, r) < 0.4:   # the outflow's little channel
        z -= 0.14 * smooth(0.4, 0.1, I.path_dist([OUT_STREAM], x, r))
    if FIELD[0] <= x <= FIELD[2] and FIELD[1] <= r <= FIELD[3]:
        z = 0.0
    if r < EDGE + 0.6:                                    # a little ramp of soil at the foot of the wall
        z += 0.05 * smooth(EDGE + 0.6, EDGE, r)
    return z


def upper_mat(x, r):
    if I.path_dist([STREAM], x, r) < 0.42:
        return 'stream' if I.path_dist([STREAM], x, r) < 0.2 else 'gravel'
    if I.path_dist([PATH_UP], x, r) < 0.34 + 0.08 * I.n2(x, r, 2.0, 9):
        return 'path'
    return 'grass'


def lower_mat(x, r):
    d = pond_d(x, r)
    if d < 0.97:
        return 'bed'
    if d < 1.1 + 0.07 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8) > -0.2 else 'gravel'
    if OUT_STREAM and I.path_dist([OUT_STREAM], x, r) < 0.3:
        return 'stream' if I.path_dist([OUT_STREAM], x, r) < 0.14 else 'gravel'
    if FIELD[0] <= x <= FIELD[2] and FIELD[1] <= r <= FIELD[3]:
        return 'field'
    if I.path_dist([PATH_LOW, PATH_LOW2], x, r) < 0.36 + 0.09 * I.n2(x, r, 2.0, 7):
        return 'path'
    return 'grass'


up_cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-4, int(EDGE))]
lo_cells = [(c, r) for c in range(-1, COLS + 1) for r in range(int(EDGE), ROWS + 2)]
I.ground(k, up_cells, upper_mat, ALB, height=upper_h, bump=0.0, seed=11, dither=0.035, step=0.0625)
I.ground(k, lo_cells, lower_mat, ALB, height=lower_h, bump=0.0, seed=12, dither=0.035, step=0.0625)

# the water: the millpond's still surface, and the stream's
cx, cr, rx, ry = POND
NOUT = 120
outline = [pond_edge(i / NOUT * math.tau, 1.0) for i in range(NOUT)]
k.poly([(cx, cr, WATER_Z)] + [(x, r, WATER_Z) for (x, r) in outline] + [(outline[0][0], outline[0][1], WATER_Z)], '#2a5a6a', 'pond_water')
# the outflow trickling away at the low corner
q = []
for (ax, ar), (bx, br) in zip(OUT_STREAM, OUT_STREAM[1:]):
    for j in range(6):
        t0, t1 = j / 6, (j + 1) / 6
        x0, r0 = ax + (bx - ax) * t0, ar + (br - ar) * t0
        x1, r1 = ax + (bx - ax) * t1, ar + (br - ar) * t1
        w = 0.11
        q.append(((x0 - w, r0, lower_h(x0, r0) + 0.06), (x0 + w, r0, lower_h(x0, r0) + 0.06),
                  (x1 + w, r1, lower_h(x1, r1) + 0.06), (x1 - w, r1, lower_h(x1, r1) + 0.06)))
k.quads(q, '#2e6070', 'stream_water')
pts = []
for i in range(len(STREAM) - 1):
    (ax, ar), (bx, br) = STREAM[i], STREAM[i + 1]
    for j in range(8):
        t0, t1 = j / 8, (j + 1) / 8
        x0, r0 = ax + (bx - ax) * t0, ar + (br - ar) * t0
        x1, r1 = ax + (bx - ax) * t1, ar + (br - ar) * t1
        w = 0.24
        z0, z1 = upper_h(x0, r0) + 0.12, upper_h(x1, r1) + 0.12
        pts.append(((x0 - w, r0, z0), (x0 + w, r0, z0), (x1 + w, r1, z1), (x1 - w, r1, z1)))
k.quads(pts, '#2e6070', 'stream_water')
for (x, r) in [(13.5, -2.4), (13.0, -0.7), (12.5, 1.0), (12.9, 1.6), (12.7, 3.0), (12.2, 3.6), (12.95, 3.5)]:
    for _ in range(2):                                     # rocks along the stream's banks
        s = rng.uniform(0.08, 0.16)
        k.rock(x + rng.uniform(-0.45, 0.45), r + rng.uniform(-0.2, 0.2), 0.0, s, s * 0.8, s * 0.6,
               (shade('#8a8478', rng.uniform(0.75, 1.1)), 0.2), part='rock', segs=7)
    I.pose(k, len(k.parts) - 2, (0, 0, 0), dz=upper_h(x, r) - 0.05)

# ---- the terrace's stone face: courses of stacked stones, mortar behind, moss, ferns at the foot, a grass lip ------
k.box(-1, EDGE - 0.3, -0.15, COLS + 1, EDGE - 0.03, TERR - 0.08, ('#4a4440', 0.2), 'mortar')
STONE_TONES = ('#a09888', '#8e8678', '#b0a690', '#7e786e', '#9a9282', '#a89c86')
z, course = -0.05, 0
while z < TERR - 0.08:
    hh = rng.uniform(0.22, 0.34)
    x = -1.0 + (0.0 if course % 2 else rng.uniform(0.15, 0.35))
    while x < COLS + 1:
        w = rng.uniform(0.38, 0.82)
        if not (STEPS[0] - 0.05 < x + w / 2 < STEPS[1] + 0.05):
            out = rng.uniform(0.0, 0.05)
            col = shade(rng.choice(STONE_TONES), rng.uniform(0.9, 1.08))
            k.box(x + 0.02, EDGE - 0.08, z + 0.02, x + w - 0.02, EDGE + 0.02 + out, min(TERR - 0.01, z + hh - 0.02),
                  (col, 0.16), 'wall_stone', bevel=0.03)
            if rng.random() < 0.16:                       # moss on a stone's top
                k.blob(x + w * rng.uniform(0.3, 0.7), EDGE + out, min(TERR - 0.02, z + hh - 0.02), w * 0.32, 0.05, 0.04,
                       (shade('#4a7a36', rng.uniform(0.85, 1.1)), 0.2), 'moss', segs=8)
        x += w
    z += hh
    course += 1
# the lip of turf over the top, a little ragged, grass hanging over it
lip = []
hang = {shade(GREEN, 0.85): [], GREEN: [], shade(GREEN, 1.15): []}
x = -1.0
while x < COLS + 1:
    w = rng.uniform(0.15, 0.4)
    if not (STEPS[0] - 0.1 < x + w / 2 < STEPS[1] + 0.1):
        d = rng.uniform(0.04, 0.12)
        lip.append((x, EDGE - 0.1, TERR - 0.05, x + w, EDGE + d, TERR + 0.012))
        for _ in range(int(w * 18)):
            bx = x + rng.uniform(0, w)
            hang[rng.choice(list(hang))].append((bx, EDGE + d * 0.6, TERR + 0.005, -rng.uniform(0.07, 0.16), 0.022,
                                                 rng.uniform(-0.02, 0.02), rng.uniform(0.03, 0.08)))
    x += w
k.boxes(lip, (GREEN, 0.12), 'grass')
for col, bs in hang.items():
    k.blades(bs, (col, 0.25), 'grass')
with k.foliage('leaf'):
    for ix in (2.4, 9.6, 15.2):                            # ivy spilling over the top of the wall
        for j in range(26):
            x = ix + rng.uniform(-0.55, 0.55)
            z = TERR - rng.uniform(0.0, 0.9) * (1 - abs(x - ix) / 0.7)
            k.blob(x, EDGE + 0.06, z, rng.uniform(0.07, 0.12), 0.05, rng.uniform(0.06, 0.1),
                   shade(rng.choice(('#2e5a2a', '#3a6a30', '#2a4e26')), rng.uniform(0.9, 1.1)), 'ivy', segs=8)
for _ in range(18):                                        # little flowers in the wall's crevices
    x, z = rng.uniform(-0.5, COLS + 0.5), rng.uniform(0.15, TERR - 0.15)
    if STEPS[0] - 0.3 < x < STEPS[1] + 0.3 or FALL[0] - 0.3 < x < FALL[1] + 0.3:
        continue
    for j in range(3):
        k.sphere(x + rng.uniform(-0.05, 0.05), EDGE + 0.06, z + rng.uniform(-0.04, 0.04), 0.03, 0.025,
                 rng.choice(('#f0f0e0', '#f0d040', '#b080e0')), 'wall_flower', segs=5)
# ferns and dock leaves at the foot of the wall
with k.foliage('leaf'):
    x = -0.6
    while x < COLS + 0.6:
        if not (STEPS[0] - 0.4 < x < STEPS[1] + 0.4) and not (FALL[0] - 0.5 < x < FALL[1] + 0.5) and rng.random() < 0.55:
            fr = EDGE + rng.uniform(0.1, 0.22)
            col = shade(rng.choice(('#3e7a34', '#4a8a3a', '#356a30')), rng.uniform(0.9, 1.1))
            n = rng.randint(5, 8)
            fronds = []
            for j in range(n):
                a = math.pi * (0.1 + 0.8 * j / (n - 1)) + rng.uniform(-0.1, 0.1)
                L = rng.uniform(0.22, 0.36)
                fronds.append((x, fr, 0.02, L * 0.55, 0.05, -math.cos(a) * L, math.sin(a) * L * 0.35))
            k.blades(fronds, (col, 0.2), 'fern')
        x += rng.uniform(0.35, 0.8)

# ---- the steps down from the terrace -------------------------------------------------------------------------------
n = 6
for i in range(n):
    ra = EDGE - 0.15 + (1.35 * i / n)
    rb = EDGE - 0.15 + (1.35 * (i + 1) / n)
    zt = TERR - TERR * (i + 1) / n
    k.box(STEPS[0], ra, -0.1, STEPS[1], rb, zt + 0.06, (shade('#a8a090', rng.uniform(0.95, 1.1)), 0.14), 'steps', bevel=0.02)
    k.box(STEPS[0], rb - 0.05, zt + 0.02, STEPS[1], rb, zt + 0.07, '#c8c0b0', 'step_nose')
for xx in (STEPS[0] - 0.22, STEPS[1]):                    # the cheek walls either side
    k.box(xx, EDGE - 0.3, -0.05, xx + 0.22, EDGE + 1.2, TERR - 0.15, ('#8e8678', 0.18), 'wall_stone', bevel=0.03)
    k.box(xx - 0.02, EDGE - 0.3, TERR - 0.15, xx + 0.24, EDGE + 1.2, TERR - 0.06, ('#b0a896', 0.1), 'cap_stone', bevel=0.02)

# ---- the waterfall: the stream tips over the face into the pond ----------------------------------------------------
TONES = ('#f4fbfd', '#cfe8f0', '#8cc4d4', '#e2f2f6', '#a6d2de', '#6aa8bc')
x = FALL[0]
z_top, z_bot = TERR - 0.04, WATER_Z + 0.02
r_lip, r_bot = EDGE + 0.1, EDGE + 0.62
while x < FALL[1] - 0.01:
    w = rng.uniform(0.04, 0.1)
    col = rng.choice(TONES)
    # over the lip (bulging out), then straight down with a slight lean: two quads per streak
    k.quads([((x, EDGE - 0.05, z_top), (x + w, EDGE - 0.05, z_top), (x + w, r_lip, z_top - 0.1), (x, r_lip, z_top - 0.1)),
             ((x, r_lip, z_top - 0.1), (x + w, r_lip, z_top - 0.1), (x + w, r_bot, z_bot), (x, r_bot, z_bot))], col, 'waterfall')
    x += w
for _ in range(10):                                        # spray mist rising from the foot
    k.blob(rng.uniform(FALL[0], FALL[1]), EDGE + rng.uniform(0.55, 0.8), WATER_Z + rng.uniform(0.15, 0.4),
           rng.uniform(0.08, 0.14), 0.06, rng.uniform(0.06, 0.1), '#eef8fb', 'spray', segs=8)
for _ in range(14):                                       # foam where it lands
    fx, fr = rng.uniform(FALL[0] - 0.15, FALL[1] + 0.15), EDGE + rng.uniform(0.58, 0.9)
    s = rng.uniform(0.07, 0.13)
    k.blob(fx, fr, WATER_Z + 0.02, s, s * 0.8, s * 0.45, rng.choice(('#f4fbfd', '#dceff4')), 'foam', segs=8)
for (fx, fr) in ((FALL[0] - 0.3, EDGE + 0.6), (FALL[1] + 0.35, EDGE + 0.66)):
    k.rock(fx, fr, WATER_Z - 0.05, 0.18, 0.14, 0.14, ('#6e6a62', 0.2), part='rock', segs=8)

# ---- the farmhouse on the terrace, and its yard ---------------------------------------------------------------------
house = HK.rich_house if HK else W.house
rm, zr = lifted(house, k, 4.7, 10.3, 0.7, 3.0, wall_h=2.0, rise=1.45, roof='#a0482e', wall='#efe2c6', door_x=7.5,
                windows=[(5.8, 0.85), (9.2, 0.85)], windows_up=[(5.8, 1.55), (9.2, 1.55)], chimney=9.2, lanterns=(8.3,))
k.smoke = (9.2, rm, zr + TERR)
lifted(F.log_pile, k, 3.9, 2.4)
lifted(F.beehive, k, 14.3, 2.7)
lifted(F.beehive, k, 15.1, 3.3)
def chopping():
    k.cyl(3.2, 3.0, 0.0, 0.32, 0.2, ('#8a6438', 0.2), 'stump', verts=12)
    k.cyl(3.2, 3.0, 0.32, 0.34, 0.18, '#c89a68', 'stump_top', verts=12)
    k.tube((3.1, 3.0, 0.34), (3.45, 3.15, 0.62), 0.025, '#7a5a34', 'axe', verts=6)
    k.box(3.03, 2.96, 0.3, 3.18, 3.04, 0.42, '#7a7e86', 'axe_head')
lifted(chopping)
lifted(barrel, k, 10.75, 2.75, h=0.6, radius=0.23)
lifted(W.bench, k, 4.9, 6.0, 3.62)
def yard():
    r = 3.0
    while r < EDGE - 0.12:                                 # flagstones from the door to the steps
        x = 7.15 + rng.uniform(-0.05, 0.05)
        w = rng.uniform(0.5, 0.66)
        k.box(x - w / 2 + 0.03, r + 0.02, -0.02, x + w / 2 - 0.03, r + rng.uniform(0.26, 0.34), 0.035,
              (shade('#a89c88', rng.uniform(0.88, 1.08)), 0.12), 'flagstone', bevel=0.015)
        r += 0.34
    if HK:
        V.flower_bed(k, 4.95, 2.95, 6.6, 3.25)
        V.flower_bed(k, 8.4, 2.95, 10.05, 3.25)
        HK.tub(k, 6.75, 3.45)
        HK.tub(k, 8.25, 3.45)
lifted(yard)
# trees: an oak at the left, pines behind, a little orchard by the stream
lifted(W.tree, k, 2.3, 1.2, h=3.3, tone='#3e7a34', lean=0.12)
for (px, pr, h) in ((3.5, -1.9, 3.0), (11.2, -1.6, 3.2), (16.1, -1.2, 2.8), (0.6, -0.9, 2.6), (14.4, -2.2, 2.6)):
    def pn(px=px, pr=pr, h=h):
        k.cyl(px, pr, 0, h * 0.3, 0.08, (W.WOOD_D, 0.12), 'trunk', verts=7)
        W.pine_tiers(k, px, pr, h, shade('#2e5a40', rng.uniform(0.92, 1.08)), rad=0.66)
    lifted(pn)
lifted(F.apple_tree, k, 15.1, 1.3, h=2.5)
lifted(F.apple_tree, k, 16.4, 3.1, h=2.2)
for (bx, br, s) in ((0.9, 3.4, 0.36), (3.6, 3.55, 0.3), (10.9, 3.5, 0.32), (14.0, 3.55, 0.3), (1.4, 0.2, 0.34)):
    lifted(W.bush, k, bx, br, s=s, tone=rng.choice(('#2e5a2e', '#3a6a34')), berries=rng.choice((None, '#c03050', None)))

# ---- the low ground: the field, the pond's dressing, the path's things ----------------------------------------------
# the field: ridged rows of earth with plants along them (leaves: they turn with the year)
fx0, fr0, fx1, fr1 = FIELD
r, row = fr0 + 0.35, 0
while r < fr1 - 0.2:
    k.cyl_x(fx0 + 0.2, fx1 - 0.2, r, 0.02, 0.1, 0.05, (shade(F.EARTH, 0.92), 0.08), 'field_ridge', verts=8)
    kind = ('cabbage', 'corn', 'carrot')[row % 3]
    with k.foliage('leaf'):
        x = fx0 + 0.32
        while x < fx1 - 0.25:
            if kind == 'cabbage':                          # round heads in layered leaves
                s_ = rng.uniform(0.1, 0.13)
                k.sphere(x, r, 0.13, s_ * 0.8, s_ * 0.7, (shade('#7ab05a', rng.uniform(0.92, 1.08)), 0.15), 'crop', segs=8)
                for j in range(5):
                    a = j * 1.26 + rng.uniform(0, 0.4)
                    k.blob(x + math.cos(a) * s_ * 0.9, r + math.sin(a) * s_ * 0.6, 0.08, s_ * 0.7, s_ * 0.45, s_ * 0.3,
                           (shade('#4a8a3a', rng.uniform(0.85, 1.1)), 0.2), 'crop', rot=(0, 0, math.degrees(a)), segs=6)
                x += rng.uniform(0.34, 0.42)
            elif kind == 'corn':                           # tall stalks with long leaves and a tassel
                h = rng.uniform(0.55, 0.75)
                k.cone(x, r, 0.04, h, 0.025, 0.012, ('#5a8a34', 0.15), 'crop', verts=5)
                k.blades([(x, r, h * (0.3 + 0.18 * j), h * 0.32, 0.03, (-1) ** j * 0.18, rng.uniform(-0.04, 0.04)) for j in range(4)],
                         (shade('#6a9a3a', rng.uniform(0.9, 1.1)), 0.15), 'crop')
                k.cone(x, r, h, h + 0.1, 0.03, 0.004, '#d8c070', 'crop_tassel', verts=5)
                x += rng.uniform(0.24, 0.3)
            else:                                          # feathery carrot tops
                k.blades([(x + rng.uniform(-0.03, 0.03), r, 0.08, rng.uniform(0.12, 0.2), 0.022, rng.uniform(-0.07, 0.07), rng.uniform(-0.03, 0.03))
                          for _ in range(6)], (shade('#5aa040', rng.uniform(0.9, 1.15)), 0.2), 'crop')
                x += rng.uniform(0.18, 0.24)
    r += 0.56
    row += 1
for a, b in (((fx0, fr0), (fx1, fr0)), ((fx0, fr1), (fx1, fr1)), ((fx0, fr0), (fx0, fr1)), ((fx1, fr0), (fx1, fr0 + 1.2)), ((fx1, fr0 + 2.2), (fx1, fr1))):
    F.fence(k, a, b, h=0.66, every=0.9)
F.scarecrow(k, 3.3, 6.1)

# the pond: reeds and cattails in clumps, stones half in the water, a grassy overhang on the left bank, lily pads
cx, cr, rx, ry = POND
JX0, JX1 = 9.1, 9.95
def free_bank(th):
    x, r = pond_edge(th)
    if JX0 - 0.25 < x < JX1 + 0.25 and r > cr:        # the jetty
        return False
    if FALL[0] - 0.55 < x < FALL[1] + 0.55 and r < cr:  # the waterfall
        return False
    if x > 12.9 and r > cr + 0.5:                      # the outflow
        return False
    return True
for th in (2.0, 2.55, 3.05, 3.6, 0.35, -0.3, -1.35, 0.9, 4.25, 2.9):
    if not free_bank(th):
        continue
    clump = {shade('#5a8a3a', 0.8): [], '#5a8a3a': [], shade('#6a9a44', 1.12): []}
    for j in range(rng.randint(18, 32)):
        t = th + rng.uniform(-0.14, 0.14)
        x, r = pond_edge(t, rng.uniform(0.93, 1.06))
        zb = max(lower_h(x, r), WATER_Z)
        h = rng.uniform(0.42, 0.95)
        lean = rng.uniform(-0.14, 0.14)
        clump[rng.choice(list(clump))].append((x, r, zb, h, 0.03, lean, rng.uniform(-0.04, 0.04)))
        if rng.random() < 0.22:
            k.cyl(x + lean * 0.9, r, zb + h * 0.82, zb + h * 0.98, 0.028, '#5a3a20', 'cattail', verts=6)
    with k.foliage('leaf'):
        for col, bl in clump.items():
            if bl:
                k.blades(bl, (col, 0.2), 'reed')
for _ in range(26):                                    # stones of a few sizes, half in the water, half on the bank
    th = rng.uniform(-math.pi, math.pi)
    if not free_bank(th):
        continue
    x, r = pond_edge(th, rng.uniform(0.93, 1.12))
    s = rng.choice((0.07, 0.1, 0.14, 0.2, 0.27)) * rng.uniform(0.85, 1.15)
    k.rock(x, r, max(lower_h(x, r), WATER_Z - 0.08) - s * 0.25, s, s * 0.8, s * 0.6,
           (shade(rng.choice(('#8a8478', '#9a9080', '#7a766c')), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8)
# a grassy overhang on the left bank: a lip of turf with grass hanging toward the water
lip, hang = [], {shade(GREEN, 0.85): [], GREEN: [], shade(GREEN, 1.15): []}
for i in range(26):
    th = 2.75 + i * 0.03
    x, r = pond_edge(th, 1.0)
    xi, ri = pond_edge(th, 0.93)
    lip.append(((x, r, 0.02), (xi, ri, 0.0)))
    for _ in range(4):
        hang[rng.choice(list(hang))].append((xi + rng.uniform(-0.04, 0.04), ri, 0.0, -rng.uniform(0.06, 0.13), 0.02,
                                             (xi - x) * 0.6 + rng.uniform(-0.02, 0.02), (ri - r) * 0.6))
for (a, b), (c, d) in zip(lip, lip[1:]):
    k.quads([((a[0], a[1], 0.03), (c[0], c[1], 0.03), (d[0], d[1], 0.0), (b[0], b[1], 0.0))], (GREEN, 0.12), 'grass')
for col, bs in hang.items():
    k.blades(bs, (col, 0.25), 'grass')
for _ in range(12):
    th, dd = rng.uniform(-math.pi, math.pi), rng.uniform(0.35, 0.82)
    x, r = pond_edge(th, dd)
    if JX0 - 0.3 < x < JX1 + 0.3 and r > cr - 0.2:
        continue
    s = rng.uniform(0.12, 0.17)
    k.cyl(x, r, WATER_Z, WATER_Z + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
    if rng.random() < 0.35:
        k.sphere(x + 0.04, r, WATER_Z + 0.04, 0.05, 0.04, '#f0b8d0', 'lily_flower', segs=6)
# the jetty: planks on posts out over the water from the near bank
JR1 = next(rr / 20 for rr in range(160, 100, -1) if pond_d((JX0 + JX1) / 2, rr / 20) < 1.0) + 0.55   # the near bank, and onto it
JR0 = JR1 - 2.2
for rr in [JR0 + 0.05 + i * 0.6 for i in range(4)]:
    for xx in (JX0 + 0.06, JX1 - 0.06):
        k.cyl(xx, rr, min(WATER_Z, lower_h(xx, rr)) - 0.3, 0.22, 0.06, ('#5a4028', 0.15), 'jetty_post', verts=8)
r = JR0
while r < JR1 - 0.02:
    k.box(JX0, r, 0.05, JX1, r + 0.17, 0.11, (shade('#9a7448', rng.uniform(0.85, 1.08)), 0.2), 'jetty_plank', bevel=0.01)
    r += 0.19
k.box(JX0 + 0.02, JR0 + 0.05, -0.02, JX0 + 0.1, JR1, 0.05, '#5a4028', 'jetty_beam')
k.box(JX1 - 0.1, JR0 + 0.05, -0.02, JX1 - 0.02, JR1, 0.05, '#5a4028', 'jetty_beam')
k.cyl(JX0 + 0.12, JR0 + 0.25, 0.11, 0.28, 0.1, ('#7a5a34', 0.15), 'bucket', verts=10)
sp = len(k.parts)
W.rowboat(k, 10.15, 11.75, JR0 + 0.7, beam=0.72)
I.pose(k, sp, (10.95, JR0 + 0.7, 0), yaw=-8, dz=WATER_Z + 0.06)
# the path's things: a lamp post at the foot of the steps, a well, stones along the way
W.lantern_post(k, 7.95, 5.25, h=2.0, energy=26)
I.well(k, 15.35, 4.85)
for _ in range(10):
    x, r = 6.4 + rng.uniform(0, 3.0), 5.4 + rng.uniform(0, 2.4)
    if I.path_dist([PATH_LOW], x, r) > 0.5:
        continue
    s = rng.uniform(0.03, 0.06)
    k.rock(x, r, lower_h(x, r) - 0.01, s, s * 0.85, s * 0.5, (shade('#a09888', rng.uniform(0.8, 1.1)), 0.2), part='pebble', segs=5)
# bushes and an apple tree on the low ground, rocks in the grass
for (bx, br, s) in ((14.9, 8.1, 0.32), (0.6, 8.3, 0.3), (8.1, 8.6, 0.28)):
    W.bush(k, bx, br, s=s, tone=rng.choice(('#2e5a2e', '#3a6a34')), berries=rng.choice((None, '#c03050')))
F.apple_tree(k, 15.7, 7.2, h=2.3)
for (x, r) in ((13.4, 8.3), (0.7, 5.0), (6.3, 4.5), (15.5, 4.4)):
    s = rng.uniform(0.14, 0.24)
    k.rock(x, r, lower_h(x, r) - 0.04, s, s * 0.8, s * 0.6, (shade('#8a8478', rng.uniform(0.8, 1.05)), 0.2), part='rock', segs=8)

# ---- the grass: over both levels, once everything else is in place ---------------------------------------------------
k.later.append(lambda: W.meadow(k, GREEN, cells=[c for c in up_cells + lo_cells], ok=('ground_grass',), density=1.0, flowers=1.0))

k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=96, world_light=('#a8c4e0', 0.85))
