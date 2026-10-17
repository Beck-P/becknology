"""The Downs — the countryside between Verdance's towns (world id "verdance-downs").

  BVENV/bin/python tools/bridge-art/scenes/verdance_downs.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance-downs

Over Station Road's bridge the land goes up in green waves. The lanes are holloways, sunk between banks topped with
hedgerows, and they meet at a crossroads with a fingerpost, a post box and a farm stand with an honesty box (stock it
with your own produce: js/makers.js). North-west, Larkspur Flower Farm: striped rows of dahlias, zinnias, cosmos,
lavender and sweet peas on hazel frames, sunflowers, a glasshouse, and a bed of moonflowers that glow after dark.
South-east, Cobb's cider orchard and the open-fronted press barn. The chalk horse is cut in the hillside to the
north-east, where the lane climbs toward the hill village; the branch line runs north–south across the east of it
and the lane to Thistlecombe crosses it at gates. Sheep in the far field, a duck pond by the lane south-west to the
mill hamlet, an old oak with a bench at the crossroads, a windpump.

The walking is on the lanes and the yards (level ground); the fields beyond the hedges rise and fall in a heightfield
(the hill, the waves of the Downs). In the house style: shaped land, hedges and trees in layers, the richer house kit
for the farmhouses, small life everywhere; Verdance's long golden afternoon with live light.
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
import assets_verdance as G            # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'verdance-downs'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 56, 40
k = Kit(COLS, ROWS, margin_top=3.6, margin_bottom=0.6, seed=4417)
G.fast_top(k)
rng = k.rng
C = math.cos(math.radians(45))
SMOKE = []

# ---- the lanes and the yards (the walking), and the land round them ------------------------------------------------------
L_N = [(19.5, -1.5), (19.6, 4.0), (20.6, 9.0), (21.8, 13.5), (22.6, 18.0)]
L_E = [(22.6, 18.0), (29.0, 18.6), (36.0, 19.4), (44.0, 19.9), (57.5, 20.2)]
L_NE = [(26.0, 18.3), (29.0, 15.2), (34.0, 12.4), (40.0, 9.2), (46.0, 5.6), (50.5, 2.4), (52.5, -1.5)]
L_SW = [(22.6, 18.0), (18.6, 22.6), (14.4, 27.2), (10.4, 31.6), (8.0, 35.8), (7.4, 41.5)]
L_FARM = [(20.4, 8.2), (16.0, 8.4)]
L_CIDER = [(31.0, 18.8), (30.2, 21.6), (28.0, 23.2), (27.4, 25.0)]
LANES = [L_N, L_E, L_NE, L_SW, L_FARM, L_CIDER]
YARDS = [(2.0, 3.0, 16.2, 16.6), (19.4, 14.6, 27.0, 21.6), (26.6, 24.0, 39.6, 36.2), (4.0, 33.0, 12.0, 38.6)]   # the flower farm, the crossroads, the cider, the pond's bank
TRACK = (40.2, 41.8)
POND = (8.6, 28.2, 2.4, 1.3)
PZ = -0.12


def in_yard(x, r, m=0.0):
    return any(x0 - m <= x <= x1 + m and r0 - m <= r <= r1 + m for (x0, r0, x1, r1) in YARDS)


def lane_d(x, r):
    return I.path_dist(LANES, x, r)


def yard_d(x, r):
    d = 9.0
    for (x0, r0, x1, r1) in YARDS:
        dx = max(x0 - x, 0.0, x - x1)
        dr = max(r0 - r, 0.0, r - r1)
        d = min(d, math.hypot(dx, dr))
    return d


def pond_d(x, r):
    cx, cr, rx, ry = POND
    u, v = (x - cx) / rx, (r - cr) / ry
    th = math.atan2(v, u)
    R = 1.0 + 0.08 * math.sin(2 * th + 0.9) + 0.06 * math.sin(3 * th + 0.2) + 0.12 * math.exp(-((th - 2.3) / 0.4) ** 2)
    return math.hypot(u, v) / R


def height(x, r):
    """Level on the lanes and in the yards; banks up to the hedges; beyond them the Downs roll, and the hill rises
    north-east (the chalk horse on its flank)."""
    d = min(lane_d(x, r) - 0.85, yard_d(x, r) - 0.2)
    if abs(x - (TRACK[0] + TRACK[1]) / 2) < 1.6:                         # the railway runs on the level
        d = min(d, abs(x - (TRACK[0] + TRACK[1]) / 2) - 1.0)
    bank = 0.32 * G.smooth(0.0, 1.0, d)
    roll = (0.22 * (I.n2(x, r, 0.09, 31) + 1) + 0.08 * I.n2(x, r, 0.25, 7)) * G.smooth(0.8, 3.5, d)
    hill = 1.7 * math.exp(-((x - 37.0) / 9.0) ** 2 - ((r - 1.0) / 6.5) ** 2) * G.smooth(1.0, 3.0, d)
    z = bank + roll + hill + 0.02 * I.n2(x, r, 1.3, 5)
    pd = pond_d(x, r)
    if pd < 1.3:
        z = min(z, 0.0) - (0.1 * G.smooth(1.3, 0.98, pd) + 0.16 * G.smooth(0.98, 0.5, pd))
    return z


# the chalk horse: a few long white strokes on the hill's flank, as the old ones are cut
CHALK = [[(33.8, 6.4), (36.2, 5.5), (38.6, 4.8)],                    # the body
         [(38.6, 4.8), (39.6, 3.9), (40.4, 3.2), (41.3, 3.5)],       # the neck and the head
         [(40.5, 3.25), (40.7, 2.5)],                                # an ear
         [(34.3, 6.3), (33.5, 7.4), (33.4, 8.4)], [(35.2, 6.0), (35.3, 7.2), (34.9, 8.2)],   # the hind legs
         [(37.8, 5.1), (38.6, 6.2), (39.0, 7.4)], [(38.4, 4.9), (39.6, 5.7), (40.3, 6.6)],   # the forelegs
         [(33.8, 6.4), (32.8, 6.2), (32.1, 6.9)]]                    # the tail


def chalk(x, r):
    w = 0.3 if I.path_dist(CHALK[:2], x, r) < 0.6 else 0.19                     # the body and neck broader than the legs
    return I.path_dist(CHALK, x, r) < w + 0.03 * I.n2(x, r, 3.0, 2)


# the patchwork beyond the hedges: wheat, a ploughed field, the hay meadow, the sheep's pasture (grass)
FIELDS = [('wheat', 27.4, 9.8, 39.4, 16.6), ('wheat', 44.0, 8.0, 56.5, 18.6), ('plough', -1.0, 18.0, 13.0, 23.6),
          ('hay', 12.8, 29.6, 26.6, 40.5), ('plough', 0.0, 34.0, 6.0, 40.5)]


def field(x, r):
    for (kind, x0, r0, x1, r1) in FIELDS:
        if x0 <= x <= x1 and r0 <= r <= r1 and lane_d(x, r) > 1.6 and not in_yard(x, r, m=0.4):
            return kind
    return None


def material(x, r):
    pd = pond_d(x, r)
    if pd < 0.97:
        return 'bed'
    if pd < 1.1 + 0.07 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8) > -0.2 else 'gravel'
    if chalk(x, r):
        return 'chalk'
    f = field(x, r)
    if f == 'plough':
        return 'plough' if (r * 2.2 + 0.1 * I.n2(x, r, 2.0, 3)) % 1.0 < 0.55 else 'furrow'
    if f == 'wheat':
        return 'wheat' if I.n2(x, r, 1.4, 6) > -0.35 else 'wheat2'
    if f == 'hay':
        return 'hay'
    if lane_d(x, r) < 0.7 + 0.08 * I.n2(x, r, 2.0, 7):
        return 'path'
    if YARDS[2][0] < x < YARDS[2][2] and YARDS[2][1] < r < 28.4 and I.n2(x, r, 1.5, 3) > -0.1:
        return 'yard'
    if YARDS[0][0] + 1 < x < YARDS[0][2] - 1 and YARDS[0][1] < r < 7.2 and I.n2(x, r, 1.5, 3) > 0.0:
        return 'yard'
    return 'grass'


ALB = {'grass': (G.GREEN, 0.12), 'path': (F.DIRT, 0.1), 'bank': ('#6a5638', 0.22), 'bed': ('#3e4a3a', 0.2), 'gravel': ('#8a8274', 0.25),
       'yard': ('#8a7050', 0.12), 'chalk': ('#f0ece0', 0.1), 'plough': ('#7a5634', 0.1), 'furrow': ('#5e4026', 0.1),
       'wheat': ('#d8b860', 0.12), 'wheat2': ('#c8a450', 0.12), 'hay': ('#a8b868', 0.12)}
CELLS = [(c, r) for c in range(-1, COLS + 1) for r in range(-5, ROWS + 2)]
I.ground(k, CELLS, material, ALB, height=height, bump=0.0, seed=44, dither=0.035, step=0.0625)
cx_, cr_, rx_, ry_ = POND
outline = []
for i in range(100):
    th = i / 100 * math.tau
    lo, hi = 0.2, 2.0
    for _ in range(20):                                                # where pond_d crosses 1 along this ray
        mid = (lo + hi) / 2
        if pond_d(cx_ + math.cos(th) * rx_ * mid, cr_ + math.sin(th) * ry_ * mid) < 1.0:
            lo = mid
        else:
            hi = mid
    outline.append((cx_ + math.cos(th) * rx_ * lo, cr_ + math.sin(th) * ry_ * lo))
k.poly([(cx_, cr_, PZ)] + [(x, r, PZ) for (x, r) in outline] + [(outline[0][0], outline[0][1], PZ)], '#2a5a6a', 'pond_water')


def tree_at(x, r, h=None, kind='oak'):
    if lane_d(x, r) < 1.4 or in_yard(x, r, m=0.3):
        return                                                         # never in the way
    h = h or rng.uniform(2.4, 3.2)
    if kind == 'oak':
        G.on(k, height, W.tree, x, r, h=h, tone=rng.choice(('#3a6a34', '#3e7a34', '#4a7a30')), lean=rng.uniform(-0.1, 0.1))
    elif kind == 'pine':
        G.on(k, height, W.pine, x, r, h=h, tone='#2e5a38')
    else:
        G.on(k, height, F.apple_tree, x, r, h=min(h, 2.5))
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)


def hedge_on(a, b, h=0.6, gap=None, tone='#3a6a30', flowers=0.25, skip_lanes=False):
    """A hedgerow along the top of a bank: built in tile-long pieces, each lifted onto the land under it."""
    (x0, r0), (x1, r1) = a, b
    n = max(1, int(math.dist(a, b) / 1.0))
    for i in range(n):
        p = (x0 + (x1 - x0) * i / n, r0 + (r1 - r0) * i / n)
        q = (x0 + (x1 - x0) * (i + 1) / n, r0 + (r1 - r0) * (i + 1) / n)
        m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
        if skip_lanes and (lane_d(*m) < 1.25 or in_yard(*m, m=0.3)):
            continue
        if gap and any(g0 <= (m[0] if abs(x1 - x0) >= abs(r1 - r0) else m[1]) <= g1 for (g0, g1) in gap):
            continue
        sp = len(k.parts)
        G.hedge(k, p, q, h=h, tone=tone, flowers=flowers)
        G.lift(k, sp, height(*m) - 0.04)
        if int(m[0] * 7 + m[1] * 13) % 7 == 0:                        # now and then an oak grows up out of the hedge
            tree_at(m[0], m[1], h=rng.uniform(2.6, 3.4), kind='oak')


# hedges along both sides of every lane, set back to the top of its banks
def lane_hedges(path, side_gaps=()):
    for (ax, ar), (bx, br) in zip(path, path[1:]):
        L = math.dist((ax, ar), (bx, br))
        nx, nr = -(br - ar) / L, (bx - ax) / L
        for s in (-1, 1):
            a = (ax + nx * 1.55 * s, ar + nr * 1.55 * s)
            b = (bx + nx * 1.55 * s, br + nr * 1.55 * s)
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if in_yard(*mid, m=0.6) or any(math.dist(mid, g) < 2.2 for g in side_gaps):
                continue
            hedge_on(a, b)


lane_hedges(L_N, side_gaps=[(18.0, 8.3)])
lane_hedges(L_E[1:], side_gaps=[(31.0, 20.5), (TRACK[0] + 0.8, 18.0), (TRACK[0] + 0.8, 21.8)])
lane_hedges(L_NE[1:])
lane_hedges(L_SW[1:], side_gaps=[(11.5, 30.0)])

# ---- the crossroads: the fingerpost, the farm stand, the post box, the old oak and its bench ------------------------------
V.signpost(k, 23.6, 17.0, [('THISTLECOMBE', 'e', 1.55), ('BRAMBLEFORD', 'w', 1.3), ('THE MILL', 'w', 1.05)])
V.board_sign(k, 'VINEHALLOW', 'IMFellEnglishSC', 25.4, 16.2, 0.9, size=0.1, board='#f0e8d0', ink='#3a2414', trim='#6a4a2a', pad=0.05)
k.box(25.36, 16.1, 0.0, 25.44, 16.2, 1.1, (G.WOOD_D, 0.15), 'post')
G.stand(k, 20.2, 22.0, 15.4)
V.board_sign(k, 'HONESTY BOX', 'Rye', 21.1, 15.82, 1.9, size=0.1, board='#f0e8d0', ink='#7a2a1a', trim='#5a3e22', pad=0.05)
G.post_box(k, 23.0, 21.2)
W.tree(k, 26.0, 21.0, h=3.6, tone='#3e6a34', lean=0.1)
W.round_bench(k, 26.0, 21.0, tone=V.WOOD)
k.solid(25.3, 20.3, 26.8, 21.8)
G.trough(k, 19.8, 21.0, 20.6)
F.wildflowers(k, 19.5, 19.0, 22.0, 21.4, 25)
F.wildflowers(k, 24.0, 14.8, 27.0, 16.0, 15)
for (x, r) in ((19.6, 15.0), (26.8, 19.0)):
    W.bush(k, x, r, s=0.36, tone='#3a6a30', berries='#c03050')
W.lantern_post(k, 22.0, 17.0, h=2.1, energy=28)

# ---- Larkspur Flower Farm ------------------------------------------------------------------------------------------------
rm, zr = HK.rich_house(k, 2.4, 7.4, 3.2, 6.6, wall_h=1.95, rise=1.4, roof='#c4a25a', wall='#f0e6cc', door_x=5.0,
                       windows=[(3.4, 0.85), (6.4, 0.85)], chimney=2.9)
SMOKE.append([2.78, round(rm - 0.15 - (zr + 1.05) * C, 3)])
rm, zr = HK.rich_house(k, 8.2, 12.0, 3.6, 6.6, wall_h=1.8, rise=1.2, roof='#7a3a2a', wall='#e8dcc4', door_x=10.1, windows=[(9.0, 0.85), (11.2, 0.85)])
V.board_sign(k, 'LARKSPUR FLOWERS', 'Pacifico', 10.1, 6.63, 1.6, size=0.13, board='#3a5a32', ink='#f8e0f0', trim='#e8a0c0', pad=0.06)
V.awning(k, 8.2, 12.0, 6.66, 1.5, depth=0.5, drop=0.22, cols=('#e8a0c0', '#f4ece4'))
G.greenhouse(k, 12.6, 15.8, 3.4, 6.4, h=1.4)
for i in range(6):                                                # buckets of cut flowers outside the shop
    x = 8.5 + i * 0.6
    k.cyl(x, 7.1, 0.0, 0.35, 0.16, ('#8a9aa0', 0.06), 'bucket', verts=10)
    for j in range(5):
        k.sphere(x + rng.uniform(-0.1, 0.1), 7.1 + rng.uniform(-0.08, 0.08), rng.uniform(0.45, 0.6), 0.06, 0.05,
                 rng.choice(('#e86a3a', '#f0c040', '#c83a5a', '#f0a0c0', '#ffffff', '#b080e0')), 'bloom', segs=6)
k.solid(8.3, 6.9, 12.0, 7.3)
W.market_stall(k, 16.6, 18.6, 6.4, 7.2, awning=('#d070a0', '#f4ece4'), goods=None)
for i in range(5):
    k.sphere(16.9 + i * 0.35, 6.8, 1.02, 0.11, 0.09, rng.choice(('#f080b0', '#f0d040', '#a070e0', '#f0f0f0', '#e05050')), 'bloom', segs=8)
k.solid(16.6, 6.4, 18.6, 7.2)
G.washing_line(k, (2.6, 2.4), (6.6, 2.2))
# the cutting garden: rows of colour, sweet peas on hazel, sunflowers at the back, the moonflower bed by the path
ROWS_FL = [('sunflower', 9.6), ('sweetpea', 10.4), ('dahlia', 11.2), ('zinnia', 12.0), ('cosmos', 12.8), ('lavender', 13.6), ('dahlia', 14.4), ('moonflower', 15.4)]
for kind, rr in ROWS_FL:
    if kind == 'sweetpea':
        G.sweetpea_frame(k, 3.4, 14.4, rr)
    else:
        G.flower_row(k, 3.4, 14.4, rr, kind)
V.board_sign(k, 'MOONFLOWERS - PICK AFTER DARK', 'Rye', 9.0, 16.05, 0.15, size=0.08, board='#2a3048', ink='#e8eeff', trim='#8a9ac8', pad=0.04)
k.box(6.9, 15.98, 0.0, 6.96, 16.04, 0.42, (G.WOOD_D, 0.15), 'sign_post')
k.box(11.04, 15.98, 0.0, 11.1, 16.04, 0.42, (G.WOOD_D, 0.15), 'sign_post')
G.windpump(k, 1.0, 8.6)
HK.tub(k, 7.8, 7.0)
HK.tub(k, 12.4, 7.1)
for (x, r) in ((16.6, 3.2), (1.2, 12.0), (16.8, 13.6)):
    W.bush(k, x, r, s=0.4, tone='#3a6a30', berries=rng.choice((None, '#c03050')))
    k.solid(x - 0.4, r - 0.3, x + 0.4, r + 0.3)

# ---- Cobb's cider: the press barn, the orchard in rows, the yard ------------------------------------------------------------
G.press_barn(k, 28.6, 34.6, 24.4, 27.6)
V.board_sign(k, "COBB'S CIDER", 'Rye', 31.6, 27.62, 2.0, size=0.15, board='#2a1a10', ink='#f0c860', trim='#8a6a3a', pad=0.08)
rm, zr = HK.rich_house(k, 35.4, 39.2, 24.4, 27.4, wall_h=1.9, rise=1.3, roof='#5a4636', wall='#d8c8a8', door_x=37.3, windows=[(36.2, 0.85), (38.4, 0.85)],
                       chimney=38.8, stone=True)
SMOKE.append([38.68, round(rm - 0.15 - (zr + 1.05) * C, 3)])
for (x, r) in ((38.6, 28.4), (35.0, 28.2)):
    G.apple_heap(k, x, r)
W.cart(k, 36.6, 28.9)
k.solid(35.9, 28.4, 37.3, 29.4)
for x in (29.4, 30.0):
    G.barrel(k, x, 28.5, h=0.62, radius=0.24)
k.solid(29.1, 28.2, 30.3, 28.8)
for rr in (30.4, 32.6, 34.8):                                       # the orchard, in rows with grass alleys between
    for x in (27.6, 30.0, 32.4, 34.8, 37.2):
        tree_at(x + rng.uniform(-0.2, 0.2), rr + rng.uniform(-0.15, 0.15), h=rng.uniform(2.2, 2.6), kind='apple')
F.wildflowers(k, 27.0, 29.0, 39.4, 36.0, 70)
for (x, r) in ((38.6, 31.6), (28.8, 36.0)):
    F.beehive(k, x, r)
W.lantern_post(k, 31.0, 23.6, h=2.1, energy=28)

# ---- the duck pond by the south-west lane ---------------------------------------------------------------------------------
for th in (2.0, 2.5, 3.0, 3.7, 0.3, -0.5, -1.2, 1.0, 4.3):
    clump = {shade('#5a8a3a', 0.8): [], '#5a8a3a': [], shade('#6a9a44', 1.12): []}
    for j in range(rng.randint(12, 22)):
        a = th + rng.uniform(-0.14, 0.14)
        x, r = cx_ + math.cos(a) * rx_ * rng.uniform(0.95, 1.08), cr_ + math.sin(a) * ry_ * rng.uniform(0.95, 1.08)
        h = rng.uniform(0.35, 0.8)
        clump[rng.choice(list(clump))].append((x, r, max(height(x, r), PZ), h, 0.028, rng.uniform(-0.12, 0.12), rng.uniform(-0.04, 0.04)))
    with k.foliage('leaf'):
        for col, bl in clump.items():
            if bl:
                k.blades(bl, (col, 0.2), 'reed')
for (x, r, col) in ((8.0, 28.0, '#f4f0e4'), (9.0, 28.5, '#8a6a4a'), (9.4, 27.8, '#f4f0e4')):
    G.duck(k, x, r, PZ, col)
for _ in range(8):
    a = rng.uniform(0, math.tau)
    s = rng.uniform(0.11, 0.16)
    k.cyl(cx_ + math.cos(a) * rx_ * 0.6, cr_ + math.sin(a) * ry_ * 0.6, PZ, PZ + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
for c in range(int(cx_ - 3), int(cx_ + 4)):
    for r in range(int(cr_ - 2), int(cr_ + 2)):
        if pond_d(c + 0.5, r + 0.5) < 1.05:
            k.solid(c, r, c + 1, r + 1)
G.willow(k, 5.4, 27.0, h=3.0)

# ---- the railway, and the lane crossing it ------------------------------------------------------------------------------------
G.rail_track(k, TRACK[0], TRACK[1], -5.0, 19.4, z=0.0)
G.rail_track(k, TRACK[0], TRACK[1], 20.6, ROWS + 1.0, z=0.0)
G.level_crossing(k, TRACK[0], TRACK[1], 19.4, 20.6)
for r in (-4.0, 6.0, 30.0):
    k.box(TRACK[1] + 0.4, r, 0.0, TRACK[1] + 0.46, r + 0.06, 1.0, (G.IRON, 0.1), 'telegraph')

# ---- the fields beyond: sheep, stooks, the chalk horse, trees in the hedges, a copse -------------------------------------------
for (x, r, f) in ((46.0, 27.0, 0.3), (48.4, 28.6, 2.4), (50.6, 26.6, 1.0), (47.2, 31.4, -0.6), (52.0, 31.0, 3.0), (49.4, 34.2, 1.6), (53.4, 35.6, 0.2)):
    G.on(k, height, G.sheep, x, r, facing=f, lying=rng.random() < 0.3)
for (x, r) in ((14.0, 34.0), (16.4, 36.2), (18.6, 33.6), (44.0, 12.6), (47.0, 14.0), (50.0, 12.0)):
    G.on(k, height, G.stook, x, r)
for (x, r, kind) in ((30.0, 4.0, 'oak'), (46.5, 9.5, 'oak'), (1.0, 20.0, 'oak'), (3.0, 22.6, 'pine'), (13.5, 21.0, 'oak'),
                     (17.0, 30.0, 'oak'), (24.0, 30.5, 'oak'), (24.6, 37.5, 'pine'), (43.6, 37.0, 'oak'), (55.0, 15.0, 'oak'),
                     (53.0, 9.0, 'pine'), (27.5, 9.0, 'oak'), (24.0, 4.0, 'pine'), (45.0, 24.4, 'oak'), (14.5, 38.5, 'oak')):
    tree_at(x, r, kind=kind)
for _ in range(9):                                                    # a copse on the far slope
    tree_at(rng.uniform(48.0, 55.0), rng.uniform(0.0, 5.0), kind=rng.choice(('oak', 'pine')))
for (x0, r0, x1, r1, n) in ((27.0, 11.0, 34.0, 14.6, 40), (43.0, 22.4, 55.0, 38.0, 70), (13.0, 30.0, 26.0, 38.0, 60), (0.5, 17.0, 16.0, 24.0, 60),
                            (44.0, 2.0, 55.0, 18.0, 60), (24.0, 0.0, 34.0, 10.0, 40)):
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if lane_d(x, r) < 1.2 or in_yard(x, r) or chalk(x, r):
            continue
        hh = rng.uniform(0.08, 0.2)
        z = height(x, r)
        k.cone(x, r, z, z + hh, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
        k.sphere(x, r, z + hh, 0.035, 0.03, rng.choice(('#f0d040', '#e05070', '#a070e0', '#f0f0f0', '#f08030')), 'flower', segs=5)
for (kind, x0, r0, x1, r1) in FIELDS:                                 # the wheat: ears standing over the golden fields
    if kind != 'wheat':
        continue
    ears = {'#d8b860': [], '#e8c870': [], '#c8a048': []}
    for _ in range(int((x1 - x0) * (r1 - r0) * 26)):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if field(x, r) != 'wheat':
            continue
        z = height(x, r)
        ears[rng.choice(list(ears))].append((x, r, z, rng.uniform(0.22, 0.34), 0.03, rng.uniform(-0.04, 0.06), rng.uniform(-0.02, 0.02)))
    for col, bl in ears.items():
        k.blades(bl, (col, 0.2), 'wheat_ears')
# field hedges dividing the Downs into its patchwork
hedge_on((27.0, 23.4), (42.8, 23.4), gap=[(26.6, 29.0)])
hedge_on((43.0, 22.6), (56.0, 22.6))
hedge_on((43.0, 22.6), (43.0, 40.0))
hedge_on((12.4, 29.0), (27.0, 29.0), gap=[(17.0, 19.0)])
hedge_on((0.0, 17.2), (17.6, 17.2), gap=[(1.0, 3.0)])
hedge_on((27.4, 10.0), (27.4, 16.4))
for (kind, x0, r0, x1, r1) in FIELDS:                                 # each field hedged round, but where a lane runs
    for (a, b) in (((x0, r0), (x1, r0)), ((x0, r1), (x1, r1)), ((x0, r0), (x0, r1)), ((x1, r0), (x1, r1))):
        if 0.5 < a[0] < COLS - 0.5 or a[0] == b[0]:
            hedge_on(a, b, skip_lanes=True)
G.on(k, height, G.stile, 18.0, 29.0)
G.on(k, height, G.field_gate, 2.0, 17.2)

# the grass, over all of it, wherever the turf's on top
k.later.append(lambda: W.meadow(k, G.GREEN, cells=CELLS, ok=('ground_grass',), density=0.9, flowers=0.8))


# ---- where you can walk: the lanes and the yards, and the way out at each end -----------------------------------------------
def walkable(c, r):
    x, y = c + 0.5, r + 0.5
    return lane_d(x, y) < 0.95 or in_yard(x, y)


for c in range(COLS):
    for r in range(ROWS):
        if not walkable(c, r):
            k.solid(c, r, c + 1, r + 1)

if os.environ.get('NOVAR'):
    k.variants = []
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle=None if os.environ.get('PREVIEW') else 'day', light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Downs', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [19, 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -2.5, COLS, ROWS]})


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 19, 'y': 0, 'type': 'enter_world', 'label': 'STATION ROAD', 'prompt': 'PRESS E TO GO BACK OVER THE BRIDGE', 'target': 'verdance-east', 'spawn': [19, 30]},
    {'x': 20, 'y': 0, 'type': 'enter_world', 'label': 'STATION ROAD', 'prompt': 'PRESS E TO GO BACK OVER THE BRIDGE', 'target': 'verdance-east', 'spawn': [19, 30]},
    {'x': 55, 'y': 20, 'type': 'lane', 'to': 'verdance-market', 'label': 'THE LANE TO THISTLECOMBE', 'prompt': 'PRESS E TO FOLLOW THE LANE', 'spawn': [1, 20]},
    {'x': 51, 'y': 0, 'type': 'lane', 'to': 'verdance-hill', 'label': 'THE LANE UP TO VINEHALLOW', 'prompt': 'PRESS E TO CLIMB THE LANE', 'spawn': [20, 38]},
    {'x': 7, 'y': 39, 'type': 'lane', 'to': 'verdance-mill', 'label': 'THE LANE TO THE MILL', 'prompt': 'PRESS E TO FOLLOW THE LANE', 'spawn': [24, 1]},
    {'x': 23, 'y': 17, 'type': 'dialog', 'label': 'FINGERPOST', 'prompt': 'PRESS E TO READ',
     'dialog': 'THISTLECOMBE, EAST, 2 MILES. VINEHALLOW, UP THE HILL. THE MILL, SOUTH-WEST BY THE RIVER. BRAMBLEFORD, BACK OVER THE BRIDGE.'},
    {'x': 21, 'y': 16, 'type': 'farm_stand', 'label': 'THE FARM STAND', 'prompt': 'PRESS E TO LOOK'},
    look('POST BOX', 23, 22, 'A RED PILLAR BOX. COLLECTION: WHEN THE MAIL COACH FEELS LIKE IT.'),
    look('THE OLD OAK', 25, 21, 'A BENCH ROUND THE OAK AT THE CROSSROADS. FROM HERE YOU CAN SEE THE CHALK HORSE ON THE HILL, AND ON A CLEAR DAY THE SPIRE AT THISTLECOMBE.'),
    {'x': 20, 'y': 21, 'type': 'farm_well', 'label': 'TROUGH', 'prompt': 'PRESS E TO FILL THE CAN'},
    {'x': 10, 'y': 7, 'type': 'flower_farm', 'label': 'LARKSPUR FLOWERS', 'prompt': 'PRESS E TO GO IN'},
    {'x': 17, 'y': 7, 'type': 'flower_farm', 'label': 'FLOWER STALL', 'prompt': 'PRESS E TO BROWSE'},
    {'x': 9, 'y': 16, 'type': 'flower_bed', 'label': 'THE MOONFLOWER BED', 'prompt': 'PRESS E TO LOOK'},
    look('GLASSHOUSE', 14, 7, 'TRAYS OF SEEDLINGS, A VINE OF SWEET PEAS UP THE WALL, A RADIO PLAYING TO THE TOMATOES.'),
    look('WINDPUMP', 2, 9, 'IT CREAKS ROUND IN THE BREEZE, PUMPING WATER UP FOR THE FLOWERS.'),
    {'x': 31, 'y': 28, 'type': 'cider_press', 'label': "COBB'S CIDER", 'prompt': 'PRESS E TO GO IN'},
    look('THE ORCHARD', 31, 31, 'OLD CIDER APPLES: KINGSTON BLACK, BROWN SNOUT, SLACK-MA-GIRDLE. THE TREES ARE ALL ELBOWS.'),
    look('THE LEVEL CROSSING', 39, 20, 'WHITE GATES SWUNG BACK FROM THE LANE. "STOP, LOOK, LISTEN." THE RAILS RUN NORTH TO BRAMBLEFORD AND SOUTH TO THISTLECOMBE.'),
    look('DUCK POND', 9, 30, 'A DUCK POND BY THE LANE, A WILLOW TRAILING IN IT. THE DUCKS HAVE OPINIONS ABOUT YOU.'),
    look('THE CHALK HORSE', 30, 15, 'CUT INTO THE HILL, WHITE AGAINST THE GREEN, OLDER THAN ANYONE KNOWS. EVERY SPRING THE VILLAGES SCOUR IT CLEAN TOGETHER.'),
    {'x': 9, 'y': 8, 'type': 'dialog', 'label': 'MARIGOLD', 'prompt': 'PRESS E TO TALK', 'dialog': 'MARIGOLD LARKIN LOOKS UP FROM A BUCKET OF DAHLIAS.'},
    {'x': 33, 'y': 28, 'type': 'dialog', 'label': 'EZRA', 'prompt': 'PRESS E TO TALK', 'dialog': 'EZRA COBB WIPES HIS HANDS ON HIS SMOCK.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-marigold', 'x': 9, 'y': 8, 'facing': 'down'}, {'sheet': 'npc-ezra', 'x': 33, 'y': 28, 'facing': 'down'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS, scene_extra={'smoke': SMOKE})
print('downs done')
