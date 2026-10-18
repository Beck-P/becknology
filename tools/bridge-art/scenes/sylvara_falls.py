"""Sylvara — the Silverrun's rapids and falls, and the fork into the Deepwood. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_falls.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-falls

Below the shrine island the river narrows and quickens: rapids over boulders, white water (js/canoe.js runs you fast
and bumps you about). Then it parts: a quiet arm runs off east into the Deepwood (the Deep Run — paddle off the edge and
you're there) while the main river goes on to the falls, pouring over a lip of mossy rock into a pool far below. Land
above the falls (the elves' warning post with its red leaf), carry the canoe down the stair cut into the cliff, and
there's a rack of canoes at the pool for the rest of the way to Mirror Lake. Behind the falls a ledge runs under the
curtain of water to a cave.

TWO LEVELS. The gorge below the falls is built LOW (DROP) and every bit of it shifted north by DROP·cos 45° — the same as
it falls on screen — so each point of it shows on the tile row it's on (screen row = r − z·cos 45°): you stand on the
pool's shore where you stand. Collisions, water, landings and the flow are worked out in tile rows (`tile_to_world`).
The one thing to keep in mind: the game depth-tests you as if at z = 0, so nothing down there may stand in front of
you — the pool's shores are kept open.
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
WID = 'sylvara-falls'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 50, 40
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=0.8, seed=8823)
rng = k.rng
C45 = math.cos(math.pi / 4)
WZ = -0.28                                                       # the river above the falls
DROP = 2.8                                                       # how far the falls fall (a face you can see: ~2.5 rows on screen)
LZ = -DROP                                                       # the gorge's ground
LWZ = LZ + WZ                                                    # the pool's surface
LIP = 19.0                                                       # world row of the falls' lip
FOOT = LIP + 0.55                                                # world row of the cliff's foot (the gorge starts)
SH = DROP * C45                                                  # the gorge's shift north

# ---- the rivers (world rows; below the falls the rows are the gorge's, already shifted) ------------------------------------
UP = A.spline([(22.5, -3.0), (22.8, 2.4), (25.0, 6.6), (24.4, 10.6), (24.0, 14.0), (23.4, 17.0), (23.2, 19.4)], 6)
DEEP = A.spline([(24.2, 12.4), (28.6, 13.6), (34.0, 14.6), (40.0, 14.2), (46.0, 15.0), (53.0, 15.4)], 6)
LOW = A.spline([(23.2, FOOT), (23.6, 23.6 - SH), (26.4, 28.6 - SH), (24.4, 34.0 - SH), (25.2, 38.6 - SH), (25.0, 44.0 - SH)], 6)
POOL = (23.4, 22.6 - SH, 3.4, 2.3)                               # the plunge pool: centre (world), half-width, half-depth
ROCKS = [(23.6, 4.2, 0.4), (25.6, 7.2, 0.35), (23.8, 9.0, 0.45), (24.8, 3.0, 0.3), (24.6, 11.4, 0.3)]   # boulders in the rapids


def w_up(r):
    return 1.75 + 0.2 * math.sin(r * 0.5)


def up_d(x, r):
    return A.line_dist(x, r, UP) if r < LIP + 0.2 else 99


def deep_d(x, r):
    return A.line_dist(x, r, DEEP) if r < LIP - 1 else 99


def low_d(x, r):
    return A.line_dist(x, r, LOW) if r > FOOT - 0.2 else 99


def in_pool(x, r):
    return ((x - POOL[0]) / POOL[2]) ** 2 + ((r - POOL[1]) / POOL[3]) ** 2 < 1.0


def wet_up(x, r, pad=0.0):
    return up_d(x, r) < w_up(r) + pad or deep_d(x, r) < 1.25 + pad


def wet_low(x, r, pad=0.0):
    return low_d(x, r) < 1.9 + pad or in_pool(x, r)


def cliff(x, r):
    """How far down the gorge a point is: 0 above the falls, 1 below; the cliff between (with the stair cut down its west
    side, and the ledge behind the falls)."""
    stair = 15.6 < x < 18.4
    if stair:
        return A.smooth(17.4, FOOT + 1.2, r)
    return A.smooth(LIP + 0.1, FOOT, r)


def zfn(x, r):
    lvl = cliff(x, r)
    top = 0.12 + 0.15 * (A.noise(x, r, 0.4, 3) - 0.5) + 0.25 * A.smooth(LIP - 4.0, LIP - 0.5, r) * (1 - A.smooth(15.6, 18.0, x) * A.smooth(18.4, 16.0, x))
    bot = LZ + 0.1 + 0.12 * (A.noise(x, r, 0.5, 4) - 0.5)
    z = top + (bot - top) * lvl
    # the river beds
    if lvl < 0.5:
        d, w = min(up_d(x, r) - w_up(r), deep_d(x, r) - 1.25), 0
        if d < 0.7:
            bed = WZ - 0.32
            z = bed + (z - bed) * A.smooth(-0.6, 0.7, d)
    else:
        d = min(low_d(x, r) - 1.9, 0.0 if in_pool(x, r) else 9)
        if in_pool(x, r):
            d = -1.0
        if d < 0.7:
            bed = LWZ - 0.4
            z = bed + (z - bed) * A.smooth(-0.6, 0.7, d)
    return z


PATHS = {
    'west': [(16.4, -1.5), (17.4, 4.0), (19.0, 10.0), (19.2, 15.6), (17.2, 17.4)],                      # down the west bank to the landing
    'stair': [(17.2, 17.4), (17.0, 19.6), (17.6, 21.0 - SH * 0.3), (19.4, 23.2 - SH)],                 # down the cliff to the pool
    'pool': [(19.4, 23.2 - SH), (20.6, 26.4 - SH), (21.4, 31.0 - SH), (21.0, 36.0 - SH), (21.2, 42.0 - SH)],   # on down to the lake
    'east': [(27.4, 8.0), (30.0, 11.4), (36.0, 12.2), (43.0, 12.0), (51.0, 12.6)],                      # along the Deep Run
    'ledge': [(19.4, 23.2 - SH), (20.4, FOOT + 0.35), (22.6, FOOT + 0.3)],                               # behind the falls
}
PL = {k_: A.spline(v, 5) for k_, v in PATHS.items()}


def path_d(x, r):
    return min(A.line_dist(x, r, p) for p in PL.values())


def mat(x, r):
    lvl = cliff(x, r)
    jit = 0.12 * (A.noise(x, r, 3.0, 5) - 0.5)
    if 0.12 < lvl < 0.88 and not (15.6 < x < 18.4):
        return 'cliff'
    if lvl < 0.5:
        d = min(up_d(x, r) - w_up(r), deep_d(x, r) - 1.25)
    else:
        d = -1 if in_pool(x, r) else low_d(x, r) - 1.9
    if d < -0.3:
        return 'bed'
    if d < 0.4 + jit:
        n = A.noise(x, r, 4.2, 6)
        return 'pebble' if n > 0.55 else 'mud' if n < 0.3 else 'bank'
    if path_d(x, r) < 0.55 + jit:
        return 'path'
    n = A.noise(x, r, 0.8, 7)
    return 'litter' if n > 0.74 else 'moss_dark' if n < 0.32 else 'moss'


L = A.Land(k, zfn, mat, alb={'cliff': ('#6a685a', 0.38)})
L.field(-1.5, -3.5, COLS + 1.5, ROWS + 1.5, 0.11)
A.water(k, -1.5, -3.5, COLS + 1.5, LIP + 0.3, lambda x, r: wet_up(x, r, 0.55) and cliff(x, r) < 0.1, WZ, part='stream_water')
A.water(k, -1.5, FOOT - 0.1, COLS + 1.5, ROWS + 1.5, lambda x, r: wet_low(x, r, 0.55) and cliff(x, r) > 0.9, LWZ, part='pond_water')

fx0_, fx1_ = 20.7, 25.9                                          # the falls' width at the lip
# ---- the cliff: rock faces either side of the falls, mossy, ferns in the cracks ---------------------------------------------
for i in range(70):
    x = rng.uniform(-1.0, COLS + 1.0)
    if 15.4 < x < 18.6:
        continue
    r = rng.uniform(LIP - 0.1, FOOT + 0.1)
    z = rng.uniform(LZ + 0.2, 0.2)
    s = rng.uniform(0.35, 0.7)
    k.rock(x, r + 0.05, z, s, s * 0.45, s * 0.7, (shade('#6e6c5c', rng.uniform(0.82, 1.12)), 0.35), part='cliff_rock', segs=9)
    if rng.random() < 0.4:
        k.blob(x, r + 0.1, z + s * 0.6, s * 0.7, s * 0.3, s * 0.15, (shade(A.MOSS_L, rng.uniform(0.85, 1.1)), 0.4), 'rock_moss', segs=8)
# strata: ledges of rock across the face, each band its own tone, moss along their tops, dark where water seeps down
def face_r(z):
    """Where the face is at height z (it falls from the lip's top to the gorge's floor between LIP + 0.1 and FOOT)."""
    t = min(1.0, max(0.0, (0.15 - z) / (0.15 - LZ)))
    return LIP + 0.1 + (FOOT - LIP - 0.1) * t


BANDS = ['#7a7464', '#68645a', '#857c68', '#5e5a50', '#746e60']
zb = 0.05
bi = 0
while zb > LZ + 0.15:
    tone = BANDS[bi % len(BANDS)]
    x = -1.2
    while x < COLS + 1.2:
        w = rng.uniform(0.6, 1.6)
        if not (15.4 < x + w / 2 < 18.6) and not (fx0_ - 0.3 < x + w / 2 < fx1_ + 0.3):
            rr = face_r(zb)
            h = rng.uniform(0.2, 0.32)
            k.box(x, rr - 0.05, zb - h, x + w * 0.96, rr + rng.uniform(0.08, 0.16), zb, (shade(tone, rng.uniform(0.9, 1.08)), 0.38), 'cliff_ledge')
            if rng.random() < 0.45:                                  # moss along the ledge's top
                k.box(x + 0.05, rr - 0.04, zb, x + w * 0.9, rr + 0.1, zb + 0.03, (shade(A.MOSS_L, rng.uniform(0.85, 1.1)), 0.4), 'cliff_moss')
            if rng.random() < 0.18:                                  # a dark wet streak down it
                sx = x + rng.uniform(0.1, w * 0.8)
                k.box(sx, rr + 0.1, zb - h - 0.4, sx + 0.08, rr + 0.12, zb, ('#3a3c38', 0.3), 'cliff_streak')
        x += w
    zb -= rng.uniform(0.32, 0.42)
    bi += 1
for i in range(16):                                              # ferns hanging from the cliff
    x = rng.uniform(0, COLS)
    if 15.4 < x < 18.6 or 20.6 < x < 26.0:
        continue
    A.fern(k, L, x, LIP + 0.25, s=rng.uniform(0.5, 0.7), z=rng.uniform(LZ * 0.5, -0.1), tone='#4a8a3a')

# ---- the falls: the lip, the water pouring over it in strands, foam and spray at the foot ----------------------------------
fx0, fx1 = fx0_, fx1_
for _ in range(10):                                              # the lip's rocks
    x = rng.uniform(fx0 - 0.6, fx1 + 0.6)
    s = rng.uniform(0.25, 0.45)
    k.rock(x, LIP - 0.15, WZ + 0.05, s, s * 0.6, s * 0.35, (shade('#7a786a', rng.uniform(0.85, 1.1)), 0.35), part='rock', segs=8)
strands = [[], []]
n = 40
for i in range(n):
    x = fx0 + (fx1 - fx0) * (i + 0.5) / n + rng.uniform(-0.03, 0.03)
    w_ = (fx1 - fx0) / n * rng.uniform(0.32, 0.48)
    top, bot = (LIP, WZ + 0.02), (FOOT + 0.05, LWZ + 0.02)
    mid = (LIP + 0.22, WZ - 0.9)
    q1 = ((x - w_, top[0], top[1]), (x + w_, top[0], top[1]), (x + w_ * 1.1, mid[0], mid[1]), (x - w_ * 1.1, mid[0], mid[1]))
    q2 = ((x - w_ * 1.1, mid[0], mid[1]), (x + w_ * 1.1, mid[0], mid[1]), (x + w_ * 1.3, bot[0], bot[1]), (x - w_ * 1.3, bot[0], bot[1]))
    strands[i % 2] += [q1, q2]
k.quads(strands[0], ('#e2f2f4', 0.15), 'falls')
k.quads(strands[1], ('#a4d0dc', 0.15), 'falls_shade')
for _ in range(110):
    x = rng.uniform(fx0 - 0.5, fx1 + 0.5)
    r = rng.uniform(FOOT, FOOT + 1.8)
    s = rng.uniform(0.07, 0.18)
    k.blob(x, r, LWZ + 0.02, s, s * 0.8, 0.03, ('#eef6f6', 0.15), 'foam', segs=7)
for _ in range(24):                                              # spray clouds over the pool
    x = rng.uniform(fx0, fx1)
    k.blob(x, FOOT + rng.uniform(0.2, 0.9), LWZ + rng.uniform(0.2, 0.7), rng.uniform(0.25, 0.45), 0.2, rng.uniform(0.15, 0.3), ('#e8f4f6', 0.1), 'spray', segs=8)
# the cave behind the curtain: a dark arch in the cliff, the ledge to it
cx_, cz = 23.4, LZ
k.cyl_y(cx_, LIP + 0.1, FOOT - 0.05, cz + 0.55, 0.55, 0.7, ('#0e0c0a', 0.3), 'cave_mouth', verts=16)
k.box(cx_ - 0.55, LIP + 0.1, cz, cx_ + 0.55, FOOT - 0.05, cz + 0.55, ('#0e0c0a', 0.3), 'cave_mouth')
k.box(19.6, FOOT - 0.05, LZ + 0.02, 24.0, FOOT + 0.45, LZ + 0.12, (shade('#6a685a', 1.05), 0.3), 'ledge')

# ---- the landing above the falls, the warning post, the stair down ---------------------------------------------------------
LANDING = (18.2, 15.4, 20.6, 17.0)
A.deck(k, *LANDING, z=0.12, rail_sides='')
for x in (LANDING[0] + 0.2, LANDING[2] - 0.2):
    k.cyl(x, LANDING[3] - 0.15, WZ - 0.4, 0.12, 0.07, (A.ELFWOOD_D, 0.3), 'pile', verts=6)
wp = (20.8, 17.6)
A.carved_post(k, wp[0], wp[1], L.z(*wp), L.z(*wp) + 1.6, rad=0.07)
k.blob(wp[0], wp[1] + 0.06, L.z(*wp) + 1.35, 0.2, 0.03, 0.26, ('#c83a2a', 0.3), 'warning_leaf', segs=8)
k.solid_post(*wp)
for i in range(14):                                              # steps cut down the cliff's west side
    t = i / 13
    r = 17.6 + t * (FOOT + 1.2 - 17.6)
    x = 17.0 + 0.3 * math.sin(t * 2.5)
    z = zfn(x, r)
    k.box(x - 0.55, r - 0.12, z - 0.06, x + 0.55, r + 0.12, z + 0.04, (shade('#8a8878', rng.uniform(0.9, 1.08)), 0.25), 'stair_step')
for (x, r) in ((15.8, 18.4), (18.4, 19.6)):
    A.lantern_post(k, L, x, r, h=1.4, energy=6.0)

# ---- the pool's shore: a rack of canoes, a bench, the way on --------------------------------------------------------------
RACK_W = (18.2, 24.6 - SH)
rx, rr_ = RACK_W
z0 = zfn(rx, rr_)
for i in range(2):
    for x in (rx - 0.6, rx + 0.6):
        k.cyl(x, rr_, z0, z0 + 0.5 + i * 0.36, 0.04, (A.ELFWOOD_D, 0.25), 'rack', verts=5)
    k.blob(rx, rr_ - 0.1, z0 + 0.62 + i * 0.36, 1.05, 0.22, 0.09, ('#e4dcc4', 0.3), 'canoe_stowed', segs=12)
    k.blob(rx, rr_ - 0.1, z0 + 0.58 + i * 0.36, 1.06, 0.23, 0.04, ('#5a3e26', 0.3), 'canoe_gunwale', segs=12)

# ---- a footbridge of split logs over the river near the top, so both banks join (the canoe goes under) -----------------
FB_R = 1.4
A.deck(k, 19.6, FB_R - 0.6, 26.4, FB_R + 0.6, z=0.42, rail_sides='ns', tone='#8a6a48')
for x in (20.2, 23.0, 25.8):
    for r in (FB_R - 0.5, FB_R + 0.5):
        k.cyl(x, r, WZ - 0.4, 0.4, 0.07, (A.ELFWOOD_D, 0.3), 'pile', verts=6)

# ---- the wood: above the falls as anywhere, below only far from where you walk (nothing down there may hide you) ------------
crowns = []
for i, (x, r, rad, h) in enumerate(((5.0, 4.0, 1.6, 7.0), (36.0, 4.0, 1.7, 7.4), (46.0, 4.6, 1.4, 6.8), (8.0, 14.0, 1.4, 6.6), (31.0, 9.0, 1.2, 6.4))):
    crowns.append(A.old_tree(k, L, x, r, rad, h, seed=90 + i))


def clear(x, r, pad=0.8):
    if wet_up(x, r, 0.6) or wet_low(x, r, 0.6) or path_d(x, r) < pad:
        return False
    if (int(x), int(r)) in k.blocked:
        return False
    if 0.05 < cliff(x, r) < 0.95:
        return False
    if 17.4 < x < 22.0 and 14.5 < r < 18.5:
        return False
    if 19.0 < x < 27.0 and FB_R - 1.2 < r < FB_R + 1.2:
        return False
    return True


def far_below(x, r):                                             # in the gorge, but out of the way: the edges
    return cliff(x, r) > 0.95 and (x < 13 or x > 34)


for (x, r, h) in ((12.0, 3.0, 4.2), (30.0, 3.4, 4.0), (42.0, 9.0, 4.4), (12.6, 9.0, 3.8), (29.0, 17.6, 3.8), (38.0, 18.4, 4.0), (4.0, 10.0, 4.2)):
    if clear(x, r, 1.0):
        A.elf_oak(k, L, x, r, h=h, rad=0.36 + 0.04 * h, seed=int(x * 5 + r))
for (x, r, h) in ((6.0, 26.0, 4.4), (10.0, 32.0, 4.0), (40.0, 26.0, 4.2), (44.0, 33.0, 4.6), (36.0, 36.0, 4.0), (3.0, 36.0, 4.2)):
    if clear(x, r, 1.0) and far_below(x, r):
        A.elf_oak(k, L, x, r, h=h, rad=0.36 + 0.04 * h, seed=int(x * 5 + r))
for _ in range(170):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 0.8) and (cliff(x, r) < 0.1 or far_below(x, r)):
        A.fern(k, L, x, r, s=rng.uniform(0.5, 0.8), tone=rng.choice(('#4a8a3a', '#55963e', '#3e7a32')))
for _ in range(40):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 1.0) and (cliff(x, r) < 0.1 or far_below(x, r)):
        A.shrub(k, L, x, r, s=rng.uniform(0.35, 0.6), tone=rng.choice(('#3a6a30', '#4a7a34', '#2e5a2a')), berries=rng.choice((None, '#f0f0f0')))
for (x, r, s) in ((20.4, 6.4, 0.4), (27.0, 15.6, 0.45), (8.0, 20.4, 0.5), (44.0, 22.0, 0.6)):
    if clear(x, r, 0.5):
        A.boulder(k, L, x, r, s)
for (x, r, s) in ROCKS:                                          # boulders in the rapids, foam round them
    z0 = zfn(x, r)
    k.rock(x, r, WZ + 0.05, s, s * 0.8, s * 0.55, (shade('#7a786a', rng.uniform(0.9, 1.1)), 0.35), part='rock', segs=9)
    for _ in range(6):
        a = rng.uniform(0, math.tau)
        k.blob(x + math.cos(a) * (s + 0.1), r + math.sin(a) * (s + 0.05), WZ + 0.01, 0.1, 0.07, 0.02, ('#eef6f6', 0.15), 'foam', segs=6)
for _ in range(40):                                              # white water down the rapids
    t = rng.uniform(0.15, 0.6)
    x, r = UP[int(t * (len(UP) - 1))]
    x += rng.uniform(-1.2, 1.2)
    if wet_up(x, r):
        s = rng.uniform(0.05, 0.12)
        k.blob(x, r, WZ + 0.01, s * 1.6, s, 0.015, ('#eef6f6', 0.15), 'foam', segs=6)
for (pts, wf) in ((UP, w_up), (DEEP, lambda r: 1.25)):
    for i in range(0, len(pts) - 1, 2):
        x, r = pts[i]
        if r < 0 or r > LIP - 1:
            continue
        for side in (-1, 1):
            if rng.random() < 0.45:
                A.reeds(k, L, x + side * (wf(r) + 0.25), r, n=rng.randint(4, 8))
ok = lambda x, r: clear(x, r, 0.6) and (cliff(x, r) < 0.1 or cliff(x, r) > 0.95)
A.pebbles(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 120, ok=lambda x, r: (cliff(x, r) < 0.1 or cliff(x, r) > 0.95) and (wet_up(x, r, 0.9) or wet_low(x, r, 0.9)) and not (wet_up(x, r, -0.1) or wet_low(x, r, -0.1)))
A.flowers(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 240, ok=ok)
A.leaf_litter(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 120, ok=ok)
A.moss_mounds(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 50, ok=ok)
W.meadow(k, '#567a36', area=(-0.5, -2.0, COLS + 0.5, ROWS + 1.0), ok=('ground_moss', 'ground_moss_dark', 'ground_litter'), density=0.8, flowers=0.7, h=(0.07, 0.15))
for c in crowns:
    c()

# ---- tile rows ↔ world rows; what's walkable, where the canoe goes -------------------------------------------------------
def tile_to_world(x, t):
    """The world row whose ground shows on tile row t (screen row = r − z·cos 45°), or None on the cliff's face (no
    ground there shows at that row: you'd be standing on air)."""
    r = t
    for _ in range(12):
        r = t + C45 * zfn(x, r)
    return r if abs(r - (t + C45 * zfn(x, r))) < 0.08 else None


water_rows, walk = [], set()
for t in range(ROWS):
    row = ''
    for c in range(COLS):
        x = c + 0.5
        r = tile_to_world(x, t + 0.5)
        if r is None:
            row += '0'
            continue
        lvl = cliff(x, r)
        ch = '0'
        if lvl < 0.1 and wet_up(x, r, -0.2) and not any(math.hypot(x - bx, r - br) < bs + 0.2 for (bx, br, bs) in ROCKS) and r < LIP - 0.3:
            ch = '2' if 2.0 < r < 12.0 and up_d(x, r) < w_up(r) else '1'
        elif lvl > 0.9 and wet_low(x, r, -0.2) and r > FOOT + 0.5:
            ch = '2' if r < FOOT + 1.2 else '1'
        row += ch
        rf = tile_to_world(x, t + 0.7)
        if rf is None or cliff(x, rf) > 0.12 and cliff(x, rf) < 0.88 and not 15.6 < x < 18.4:
            continue
        if not (wet_up(x, rf, 0.05) or wet_low(x, rf, 0.05)) and (cliff(x, rf) < 0.12 or cliff(x, rf) > 0.88 or 15.6 < x < 18.4):
            walk.add((c, t))
    water_rows.append(row)
for (x0, r0, x1, r1) in (LANDING, (19.6, FB_R - 0.6, 26.4, FB_R + 0.6)):
    for c in range(int(x0), int(math.ceil(x1))):
        for t in range(int(r0), int(math.ceil(r1))):
            walk.add((c, t))
LEDGE_T = int(FOOT + 0.3 + SH)                                   # the ledge behind the falls, in tile rows
for c in range(19, 24):
    walk.add((c, LEDGE_T))
for c in range(COLS):
    for t in range(ROWS):
        if (c, t) not in walk:
            k.solid(c, t, c + 1, t + 1)

k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
R.merge_parts(k)                                                  # one mesh per look: each render pass quick (assets_sylvara_rich)
k.render(OUT, cycle={'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'the Falls', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [16, 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.0, COLS, ROWS]})


def to_tile(x, r):
    return [round(x, 2), round(r - C45 * zfn(x, r), 2)]


flow = [to_tile(x, r) + [1.5 if 2.0 < r < 12 else 0.7] for (x, r) in UP[::3] if r < LIP - 0.4]
flow_low = [to_tile(x, r) + [0.5] for (x, r) in LOW[::3]]
flow_deep = [to_tile(x, r) + [0.4] for (x, r) in DEEP[2::3]]
w['river'] = {'water': water_rows, 'flow': flow + flow_low, 'flows': [flow_deep], 'width': 3.0,
              'down': {'edge': 'bottom', 'target': 'sylvara-lake', 'at': [24, 1]},
              'forks': [{'edge': 'right', 'target': 'sylvara-deepwood', 'at': [1, 16]}],
              'landings': [[19, 16], [18, 16], [19, int(23.4)], [26, 23], [20, LEDGE_T]],
              'racks': [[int(rx), int(rr_ + SH) + 1]]}
w['interactions'] = [
    {'x': 16, 'y': 0, 'type': 'enter_world', 'label': 'THE SILVERRUN', 'prompt': 'PRESS E TO WALK UP THE RIVER', 'target': 'sylvara-river', 'spawn': [21, 38]},
    {'x': COLS - 1, 'y': 12, 'type': 'enter_world', 'label': 'THE DEEPWOOD', 'prompt': 'PRESS E TO FOLLOW THE DEEP RUN', 'target': 'sylvara-deepwood', 'spawn': [1, 14]},
    {'x': 21, 'y': ROWS - 1, 'type': 'enter_world', 'label': 'MIRROR LAKE', 'prompt': 'PRESS E TO WALK DOWN TO THE LAKE', 'target': 'sylvara-lake', 'spawn': [21, 1]},
    {'x': int(wp[0]), 'y': int(wp[1]), 'type': 'dialog', 'label': 'WARNING POST', 'prompt': 'PRESS E TO READ',
     'dialog': 'A POST WITH A RED LEAF NAILED TO IT, AND CARVED UNDER IT IN THE ELVES\' HAND: LAND HERE. THE FALLS ARE NOT A SHORTCUT. (UNDER THAT, SMALLER, IN A CHILD\'S: PIP DID IT ONCE.) (UNDER THAT, IN ANOTHER: NO SHE DIDN\'T.)'},
    {'x': 23, 'y': LEDGE_T, 'type': 'enter_world', 'label': 'BEHIND THE FALLS', 'prompt': 'PRESS E TO GO IN', 'target': 'sylvara-fallcave', 'spawn': [9, 13]},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, doors=[(16, 0), (COLS - 1, 12), (21, ROWS - 1)], actors=[], scene_extra={})
print('sylvara-falls done', 'walkable', len(walk), 'ledge row', LEDGE_T)
