"""Hoarfell — the Park: a terrain park below the pistes. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_park.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-park

A slope cut through the forest and shaped for tricks (js/ski.js, the park
run): a drop-in deck at the top under a THE PARK banner; down the left a
line of three kickers, small, medium and large; down the right a line of
features to slide — a flat box, a straight rail, a down rail, a kinked
rail; at the bottom the Big One, a kicker you could park a chalet under,
then the finish, the judges' tower and its scoreboard, a few benches, and the
rope tow back up the east side. Downhill is down the screen; the ground is
flat in the render except where the kickers rise.

Written into the world JSON's `ski` block: `jumps` (the kickers, as on the
pistes), `rails` ([x0, row0, x1, row1, h0, h1, kind] — a slide from one end
to the other at those heights), `grade`, `zone`, `obstacles`, and `park`
(the drop-in, the finish row).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                       # noqa: E402
import assets_signs as G                      # noqa: E402
import assets_snow as N                       # noqa: E402
import assets_town as W                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-park'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 40, 82
C = math.cos(math.radians(45))
k = Kit(COLS, ROWS, margin_top=2.4, margin_bottom=0.6, seed=6131)
n2 = I.n2
DECK_R, FINISH_R, BOTTOM_R = 7.0, 70.0, 74.0
X0, X1 = 4.5, 35.5                                   # the cut through the forest


def edge(r):
    """The cut's west and east edges at row r (wandering a little)."""
    return X0 + 0.6 * math.sin(r * 0.21) + 0.3 * math.sin(r * 0.63 + 1), X1 + 0.5 * math.sin(r * 0.19 + 2) + 0.3 * math.sin(r * 0.71)


def in_cut(x, r):
    a, b = edge(r)
    return a < x < b and r > 1.0


# ---- the features --------------------------------------------------------------------------------------------------
# kickers: x, lip row, width, length, lip height
JUMPS = [(11.0, 19.0, 3.0, 2.0, 0.36), (11.0, 33.0, 3.4, 2.6, 0.56), (11.0, 48.0, 4.0, 3.2, 0.82), (20.0, 62.0, 5.0, 3.8, 1.15)]
NAMES = ['SMALL', 'MEDIUM', 'LARGE', 'THE BIG ONE']
# rails and boxes: x0, row0, x1, row1, height at the top end, at the bottom end, kind (a kink is two pieces)
RAILS = [
    (27.0, 13.0, 27.0, 19.0, 0.28, 0.28, 'box'),
    (27.6, 25.0, 27.6, 31.5, 0.4, 0.4, 'rail'),
    (27.0, 37.0, 28.2, 44.0, 0.72, 0.32, 'down'),
    (26.8, 50.0, 26.8, 53.0, 0.5, 0.5, 'kink'),
    (26.8, 53.0, 27.8, 57.5, 0.5, 0.22, 'kink'),
]


def jump_at(x, r):
    z = 0.0
    for (jx, lr, w, L, h) in JUMPS:
        u = (r - (lr - L)) / L
        v = abs(x - jx) / (w / 2)
        if 0 <= u <= 1 and v <= 1:
            z = max(z, h * u ** 1.4 * (1 - v ** 6))
        # the landing below: a gentle knuckle of packed snow, a third of the lip's height, falling away
        u2 = (r - lr - 0.6) / (L * 1.8)
        if 0 <= u2 <= 1 and v <= 1.15:
            z = max(z, h * 0.32 * (1 - u2) ** 1.6 * (1 - min(1.0, v) ** 4))
    return z


PASS = 4.4                                           # a groomer's pass: its width (tiles)


def material(x, r):
    if jump_at(x, r) > 0.02:
        return 'kicker'
    if not in_cut(x, r):
        return 'powder'
    if r < DECK_R + 1.2 or r > FINISH_R + 1:
        return 'cord'
    # corduroy in the groomer's passes down the hill: each pass its own wobble, ribs a quarter tile apart, a soft seam of
    # pushed-up snow where two passes meet
    xs = x - 0.25 * math.sin(r * 0.09) - 0.12 * math.sin(r * 0.31 + 1.3)
    p_, f = divmod(xs - X0, PASS)
    if f < 0.07 or f > PASS - 0.07:
        return 'cord_seam'
    return 'cord' if int(math.floor((f + p_ * 0.11) * 4)) % 2 else 'cord2'


ALB = {'powder': ('#e0e8f4', 0.03), 'cord': (shade(N.SNOW, 1.01), 0.0), 'cord2': (shade(N.SNOW, 0.985), 0.0),
       'cord_seam': (shade(N.SNOW, 0.96), 0.0), 'kicker': (shade(N.SNOW, 1.04), 0.0)}

# ---- the ground, the crest, the forest ----------------------------------------------------------------------------------
crest = {(x, r) for x in range(-2, COLS + 2) for r in range(-5, 1)}
cells = [(x, r) for x in range(-1, COLS + 1) for r in range(-3, ROWS + 1) if (x, r) not in crest]
I.ground(k, cells, material, ALB, step=0.125, bump=0.01, seed=17, height=jump_at, dither=0.07)
HC = I.ridge(k, sorted(crest), top=2.4, slope=1.6, seed=31, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'),
             moss=N.ROOF_SNOW, foot=0.7, patchy=False, ground=(material, ALB))
for (x, r) in crest:
    k.solid(x, r, x + 1, r + 1)

OBST = []
step = 1.2
r = 0.4
row = 0
while r < ROWS + 0.5:
    x = -0.6 + (step / 2 if row % 2 else 0)
    while x < COLS + 0.6:
        tx, tr = x + k.rng.uniform(-0.4, 0.4), r + k.rng.uniform(-0.4, 0.4)
        x += step
        a, b = edge(tr)
        if a - 0.7 < tx < b + 0.7 or (tr > BOTTOM_R - 2 and 2 < tx < 38) or k.rng.random() > 0.9:
            continue
        N.piste_tree(k, tx, tr, h=k.rng.uniform(2.1, 3.2))
        OBST.append([round(tx, 2), round(tr, 2), 0.4, 'tree'])
        if 0 <= tx < COLS and 0 <= tr < ROWS:
            k.solid(math.floor(tx), math.floor(tr), math.floor(tx) + 1, math.floor(tr) + 1)
    r += step * 0.87
    row += 1

# ---- the drop-in deck, the banner over it ---------------------------------------------------------------------------------
k.box(14.0, 3.2, 0, 26.0, 6.2, 0.5, (N.LOG, 0.14), 'deck', bevel=0.03)
for x in (14.4, 25.6):
    k.box(x - 0.08, 3.4, 0.5, x + 0.08, 3.56, 3.2, (N.LOG_D, 0.12), 'banner_post')
k.box(14.4, 3.42, 2.3, 25.6, 3.5, 3.15, ('#1e1e26', 0.12), 'banner')
G.letters(k, 'THE PARK', 'Righteous', 20.0, 3.5, 2.42, size=0.62, col='#ff5ab0', lit=False)
for i, col in enumerate(('#ff5ab0', '#40c8d8', '#e0b030', '#40c8d8', '#ff5ab0')):
    k.box(15.0 + i * 2.3, 6.15, 0.0, 16.0 + i * 2.3, 6.25, 0.5, (col, 0.1), 'deck_stripe')
k.solid(14, 3, 26, 5)
W.bench(k, 9.0, 11.4, 5.4)
N.ski_rack(k, 28.4, 30.4, 5.6)
k.solid(9, 5, 11, 6)
k.solid(28, 5, 30, 6)
# coloured marker cones down each line
for (x, r, col) in ((8.4, 12.0, '#40c8d8'), (13.6, 12.0, '#40c8d8'), (24.6, 10.0, '#ff5ab0'), (30.0, 10.0, '#ff5ab0')):
    k.cone(x, r, 0, 0.5, 0.16, 0.02, (col, 0.1), 'cone', verts=10)

# ---- the rails and boxes: steel on posts, a box with a coloured top ---------------------------------------------------------
STEEL, STEEL_D = '#c8ccd8', '#5a5e6a'
for (x0, r0, x1, r1, h0, h1, kind) in RAILS:
    L = math.hypot(x1 - x0, r1 - r0)
    n = max(2, int(L / 1.4) + 1)
    if kind == 'box':
        k.bar(x0, r0, x1, r1, 0.0, h0, 0.62, ('#2a2e3a', 0.12), 'box_body')
        k.bar(x0, r0, x1, r1, h0, h0 + 0.04, 0.64, ('#ff5ab0', 0.08), 'box_top')
        k.bar(x0, r0 - 0.5, x0, r0, 0.0, h0 * 0.5, 0.6, (N.SNOW, 0.1), 'box_ramp')
    else:
        k.tube((x0, r0, h0), (x1, r1, h1), 0.05, (STEEL, 0.05), 'rail', verts=8)
        for i in range(n):
            t = i / (n - 1)
            x, r, h = x0 + (x1 - x0) * t, r0 + (r1 - r0) * t, h0 + (h1 - h0) * t
            k.cyl(x, r, 0, h - 0.03, 0.04, (STEEL_D, 0.1), 'rail_post', verts=6)
            k.box(x - 0.12, r - 0.12, 0, x + 0.12, r + 0.12, 0.05, (STEEL_D, 0.1), 'rail_foot')
        if kind != 'kink' or r0 < 51:
            k.blob(x0, r0 - 0.35, 0.0, 0.35, 0.5, h0 * 0.8, (N.SNOW, 0.08), 'rail_ramp', segs=8)

# kicker lips: a blue line across each, a sign at the side with its size
for (jx, lr, w, L, h), name in zip(JUMPS, NAMES):
    k.box(jx - w / 2 + 0.2, lr - 0.06, h - 0.02, jx + w / 2 - 0.2, lr + 0.02, h + 0.01, ('#2a6ae0', 0.1), 'lip_line')
    sx = jx - w / 2 - 0.9
    k.cyl(sx, lr - L * 0.5, 0, 1.2, 0.04, (N.LOG_D, 0.1), 'sign_post', verts=6)
    k.box(sx - 0.45, lr - L * 0.5 + 0.04, 0.85, sx + 0.45, lr - L * 0.5 + 0.1, 1.2, ('#1e1e26', 0.1), 'sign_board')
    G.letters(k, name.split()[-1] if len(name) > 7 else name, 'Righteous', sx, lr - L * 0.5 + 0.1, 0.94, size=0.16, col='#40c8d8', lit=False)
    k.solid(math.floor(sx), math.floor(lr - L * 0.5), math.floor(sx) + 1, math.floor(lr - L * 0.5) + 1)
    OBST.append([round(sx, 2), round(lr - L * 0.5, 2), 0.25, 'pylon'])

# ---- the finish, the judges' tower, the scoreboard, benches, the rope tow ---------------------------------------------------------
N.finish_arch(k, 12.0, 28.0, FINISH_R)
N.net_fence(k, (6.0, FINISH_R + 1.5), (11.6, FINISH_R + 0.2), col='#ff5ab0')
N.net_fence(k, (28.4, FINISH_R + 0.2), (33.0, FINISH_R + 1.5), col='#ff5ab0')
# the judges' tower: a hut on legs with a long window
JX, JR = 33.0, 66.0
for (dx, dr) in ((-1.0, -0.8), (1.0, -0.8), (-1.0, 0.8), (1.0, 0.8)):
    k.cyl(JX + dx, JR + dr, 0, 2.0, 0.08, (N.LOG_D, 0.12), 'tower_leg', verts=6)
k.box(JX - 1.3, JR - 1.1, 2.0, JX + 1.3, JR + 1.1, 3.4, (N.LOG, 0.14), 'tower_hut', bevel=0.03)
k.box(JX - 1.5, JR - 1.3, 3.4, JX + 1.5, JR + 1.3, 3.65, (N.ROOF_SNOW, 0.1), 'tower_roof')
k.box(JX - 1.1, JR + 1.1, 2.55, JX + 1.1, JR + 1.14, 3.15, ('#5a3a18', 0.1), 'tower_window', emit=('#ffd890', 0.8))
k.box(JX - 1.3, JR + 1.1, 1.95, JX + 1.3, JR + 1.5, 2.05, (N.LOG_D, 0.12), 'tower_balcony')
k.solid(JX - 1.2, JR - 1.0, JX + 1.2, JR + 1.0)
# the scoreboard: a black board on legs with amber digits (the score itself is drawn live)
SB = (20.0, 75.4)
for x in (SB[0] - 2.0, SB[0] + 2.0):
    k.box(x - 0.08, SB[1] - 0.08, 0, x + 0.08, SB[1] + 0.08, 2.4, ('#3a3a42', 0.1), 'board_leg')
k.box(SB[0] - 2.2, SB[1] - 0.06, 1.2, SB[0] + 2.2, SB[1] + 0.06, 2.6, ('#14141c', 0.12), 'board')
G.letters(k, 'SCORES', 'Righteous', SB[0], SB[1] + 0.06, 2.25, size=0.2, col='#ffb040', lit=True)
k.solid(SB[0] - 2.2, SB[1] - 0.3, SB[0] + 2.2, SB[1] + 0.3)
W.bench(k, 9.0, 11.6, 76.6)
W.bench(k, 28.4, 31.0, 76.6)
for (x, r) in ((7.0, 74.0), (33.0, 74.0)):
    W.lantern_post(k, x, r, energy=14)
N.trodden(k, 18.0, 77.0, 22.0, ROWS + 0.6)                              # the path down to the pistes
# the rope tow: two pylons up the east side, the rope between, handles on it
TX = 37.4
tow = []
for r_ in (76.0, 58.0, 40.0, 22.0, 6.0):
    k.cyl(TX, r_, 0, 1.6, 0.07, ('#b83a2e', 0.12), 'tow_pole', verts=8)
    k.box(TX - 0.25, r_ - 0.05, 1.5, TX + 0.25, r_ + 0.05, 1.6, ('#3a3a42', 0.1), 'tow_arm')
    tow.append((TX, r_, 1.45))
    k.solid(math.floor(TX), math.floor(r_), math.floor(TX) + 1, math.floor(r_) + 1)
for a, b in zip(tow, tow[1:]):
    k.tube((a[0] - 0.2, a[1], a[2]), (b[0] - 0.2, b[1], b[2]), 0.015, ('#2a2a30', 0.1), 'tow_rope', verts=4)
    k.tube((a[0] + 0.2, a[1], a[2]), (b[0] + 0.2, b[1], b[2]), 0.015, ('#2a2a30', 0.1), 'tow_rope', verts=4)
k.box(TX - 0.8, 77.0, 0, TX + 0.4, 78.6, 1.4, (N.LOG, 0.14), 'tow_hut', bevel=0.02)
k.box(TX - 0.9, 76.9, 1.4, TX + 0.5, 78.7, 1.55, (N.ROOF_SNOW, 0.1), 'tow_hut_roof')
k.solid(TX - 0.8, 77.0, TX + 0.4, 78.6)

# ---- the surroundings, enriched (Oct 2026, on their own dice: nothing above moves, nothing here is solid or in the ski data) ------
import random  # noqa: E402
import assets_hoarfell_rich as HR  # noqa: E402
er = random.Random(6132)
for side in (0, 1):                                   # old carves down the margins of the cut, clear of the features
    pts = []
    r = DECK_R + 4.0
    while r < FINISH_R - 3.0:
        a, b = edge(r)
        pts.append(((a + 1.2 + 0.5 * math.sin(r * 0.8)) if side == 0 else (b - 1.2 - 0.5 * math.sin(r * 0.8 + 1)), r))
        r += 0.7
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        if jump_at(ax, ar) or jump_at(bx, br):
            continue
        for o in (-0.06, 0.06):
            k.tube((ax + o, ar, 0.008), (bx + o, br, 0.008), 0.014, ('#cdd2da', 0.05), 'print', verts=4, smooth=False)
HR.windswept(k, 2.0, BOTTOM_R, 38.0, ROWS - 0.5, 18, er, ok=lambda x, r: not 17.5 < x < 22.5)

# ---- the features made to read (Nov 2026, on their own dice; the shapes are the game's own — jump_at, RAILS — so nothing a
# skier hits, slides or lands on moves or changes size) -------------------------------------------------------------------
fr = random.Random(6133)
DYE = ('#2a6ae0', 0.08)                               # the park crew's spray dye: blue on the lips, the knuckles, the edges
DYE_P = ('#ff5ab0', 0.08)


def surf(x, r, lift=0.012):
    return (x, r, jump_at(x, r) + lift)


def patch(xa, xb, ra, rb, nx, nr, albedo, part, lift=0.012):
    """The ground's own shape over a rectangle, as quads a hair above it."""
    q = []
    for i in range(nx):
        for j in range(nr):
            x0_, x1_ = xa + (xb - xa) * i / nx, xa + (xb - xa) * (i + 1) / nx
            r0_, r1_ = ra + (rb - ra) * j / nr, ra + (rb - ra) * (j + 1) / nr
            q.append((surf(x0_, r0_, lift), surf(x1_, r0_, lift), surf(x1_, r1_, lift), surf(x0_, r1_, lift)))
    k.quads(q, albedo, part)


for (jx, lr, w, L, h) in JUMPS:
    # the ramp: shaped, packed snow a shade off the groomed run, so it stands up out of it with its own edge
    # in bands of tone: paler toward the lip where it's packed hardest, the side slopes a step darker
    n = 20
    bands = {}
    for i in range(n):
        for j in range(n):
            v0, v1 = -1 + 2 * i / n, -1 + 2 * (i + 1) / n
            u0, u1 = j / n, (j + 1) / n
            pts = []
            for (u, v) in ((u0, v0), (u0, v1), (u1, v1), (u1, v0)):
                x, r = jx + v * w / 2 * 0.999, lr - L + u * L * 0.999
                pts.append((x, r, h * u ** 1.4 * (1 - abs(v) ** 6) + 0.014))
            side = max(abs(v0), abs(v1)) > 0.86
            key = 'side' if side else ('foot' if u1 <= 0.34 else 'mid' if u1 <= 0.7 else 'lip')
            bands.setdefault(key, []).append(pts)
    for key, col in (('foot', '#c2cde0'), ('mid', '#ccd6e6'), ('lip', '#d8e0ee'), ('side', '#a8b6cc')):
        if key in bands:
            k.quads(bands[key], (col, 0.05), 'kicker')
    # the lip's face, cut square where it drops to the table: a shaded wall of packed snow facing down the hill
    m = 24
    face = []
    for i in range(m):
        va, vb = -1 + 2 * i / m, -1 + 2 * (i + 1) / m
        xa, xb = jx + va * w / 2, jx + vb * w / 2
        za, zb = h * (1 - abs(va) ** 6), h * (1 - abs(vb) ** 6)
        face.append(((xa, lr, 0.0), (xb, lr, 0.0), (xb, lr, zb + 0.014), (xa, lr, za + 0.014)))
    k.quads(face, ('#8e9cb6', 0.06), 'kicker_face')
    # dye: a band across the lip, the ramp's edges, the knuckle's dashed line, the sweet spot's two marks
    patch(jx - w / 2 * 0.92, jx + w / 2 * 0.92, lr - 0.16, lr - 0.01, 12, 1, DYE, 'chalk_dye', lift=0.02)
    for s_ in (-1, 1):                                                   # along the ramp's edges, its top half
        patch(jx + s_ * w / 2 * 0.86 - 0.04, jx + s_ * w / 2 * 0.86 + 0.04, lr - L * 0.5, lr - 0.16, 1, 8, DYE, 'chalk_dye', lift=0.02)
    kr = lr + 0.6
    xd = jx - w / 2 * 0.9
    while xd < jx + w / 2 * 0.9 - 0.2:
        patch(xd, xd + 0.24, kr + 0.02, kr + 0.12, 2, 1, DYE, 'chalk_dye', lift=0.016)
        xd += 0.4
    sr = lr + 0.6 + L * 0.9
    for s_ in (-1, 1):
        patch(jx + s_ * w / 2 * 0.6 - 0.08, jx + s_ * w / 2 * 0.6 + 0.08, sr - 0.3, sr + 0.3, 1, 3, DYE_P, 'chalk_dye', lift=0.016)
    # the landing's edges marked down each side in dashes
    for s_ in (-1, 1):
        rr0 = lr + 0.9
        while rr0 < lr + 0.6 + L * 1.7:
            patch(jx + s_ * w / 2 * 1.05 - 0.05, jx + s_ * w / 2 * 1.05 + 0.05, rr0, rr0 + 0.3, 1, 2, DYE, 'chalk_dye', lift=0.016)
            rr0 += 0.55
    # the landing groomed smooth across the corduroy, a shade cooler
    patch(jx - w / 2 * 1.1, jx + w / 2 * 1.1, lr + 0.6, lr + 0.6 + L * 1.8, 10, 8, (shade(N.SNOW, 0.995), 0.02), 'landing_snow', lift=0.006)
    # the size sign gets a flag on its post (the post is an obstacle already)
    sx, sr_ = jx - w / 2 - 0.9, lr - L * 0.5
    k.cyl(sx, sr_, 1.2, 1.9, 0.025, ('#2a2a30', 0.1), 'flag_pole', verts=5)
    k.poly([(sx, sr_ + 0.01, 1.88), (sx + 0.42, sr_ + 0.01, 1.78), (sx + 0.38, sr_ + 0.01, 1.42), (sx, sr_ + 0.01, 1.4)], ('#40c8d8', 0.08), 'flag')

RAIL_COL = {'box': '#ff5ab0', 'rail': '#f0c030', 'down': '#40c8d8', 'kink': '#ff5ab0'}
for (x0, r0, x1, r1, h0, h1, kind) in RAILS:
    col = RAIL_COL[kind]
    if kind == 'box':
        k.bar(x0, r1 - 0.02, x0, r1 + 0.02, 0.0, h0, 0.66, (col, 0.08), 'box_end')      # the downhill end, its colour
        k.bar(x0, r0, x1, r1, h0 + 0.04, h0 + 0.05, 0.36, ('#f4f4f8', 0.05), 'box_top')  # the slick white strip down the middle
        for t in (0.15, 0.5, 0.85):
            rr_ = r0 + (r1 - r0) * t
            k.bar(x0, rr_ - 0.03, x0, rr_ + 0.03, h0 + 0.05, h0 + 0.055, 0.66, ('#1e1e26', 0.1), 'box_bolt')
        continue
    # a fat coloured rail where a hairline was, its posts coloured to match, standing on two skids in the snow
    k.tube((x0, r0, h0 + 0.01), (x1, r1, h1 + 0.01), 0.075, (col, 0.06), 'rail', verts=10)
    k.tube((x0, r0, h0 + 0.06), (x1, r1, h1 + 0.06), 0.03, ('#f4f4f8', 0.05), 'rail_shine', verts=6)
    L_ = math.hypot(x1 - x0, r1 - r0)
    ux, ur = (x1 - x0) / L_, (r1 - r0) / L_
    for s_ in (-1, 1):
        k.tube((x0 + s_ * ur * 0.2, r0 - s_ * ux * 0.2, 0.03), (x1 + s_ * ur * 0.2, r1 - s_ * ux * 0.2, 0.03), 0.035, ('#2a2e3a', 0.1), 'rail_skid', verts=6)
    nposts = max(2, int(L_ / 1.4) + 1)
    for i in range(nposts):
        t = i / (nposts - 1)
        x, r, hh = x0 + (x1 - x0) * t, r0 + (r1 - r0) * t, h0 + (h1 - h0) * t
        k.cyl(x, r, 0, hh - 0.04, 0.06, (shade(col, 0.7), 0.08), 'rail_post', verts=8)
        k.tube((x + ur * 0.2, r - ux * 0.2, 0.03), (x - ur * 0.2, r + ux * 0.2, 0.03), 0.03, ('#2a2e3a', 0.1), 'rail_skid', verts=5)

# the rope tow made to read as one line: a trodden lane up under it, a heavier rope, its handles, sheaves on the poles
k.box(TX - 0.45, 6.6, -0.02, TX + 0.45, 76.0, 0.005, (N.PACKED, 0.12), 'path')
for (a, b) in zip(tow, tow[1:]):
    for s_ in (-0.2, 0.2):
        k.tube((a[0] + s_, a[1], a[2]), (b[0] + s_, b[1], b[2]), 0.028, ('#1e1e24', 0.1), 'tow_rope', verts=5)
    r_ = b[1] + 0.8
    while r_ < a[1] - 0.6:                                     # handles every couple of tiles on the up-going side
        k.tube((TX - 0.2, r_, 1.45), (TX - 0.2, r_, 0.85), 0.012, ('#2a2a30', 0.1), 'tow_handle', verts=4)
        k.cyl_x(TX - 0.34, TX - 0.06, r_, 0.83, 0.035, 0.035, ('#e0b030', 0.1), 'tow_handle', verts=6)
        r_ += 2.2
for (x_, r_, z_) in tow:
    for s_ in (-0.2, 0.2):
        k.cyl_x(TX + s_ - 0.04, TX + s_ + 0.04, r_, 1.5, 0.12, 0.12, ('#3a3a42', 0.1), 'tow_sheave', verts=10)
    k.cyl(TX, r_, 1.6, 1.68, 0.12, ('#f2f5fa', 0.05), 'tow_snow', verts=8)

# flags at the drop-in: feather banners on the deck's corners, in the park's colours
for (fx, col) in ((14.5, '#ff5ab0'), (25.5, '#40c8d8')):
    k.cyl(fx, 4.6, 0.5, 3.0, 0.03, ('#2a2a30', 0.1), 'flag_pole', verts=5)
    k.poly([(fx + 0.02, 4.61, 2.98), (fx + 0.38, 4.61, 2.8), (fx + 0.4, 4.61, 1.6), (fx + 0.02, 4.61, 1.5)], (col, 0.08), 'flag')

# ---- the light: the alpenglow --------------------------------------------------------------------------------------------------
k.sun((0.8, 0.25, -0.38), '#ffc4a4', 3.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=64, world_light=('#8a96cc', 0.95))

# ---- what the game needs ---------------------------------------------------------------------------------------------------------
grade, zone = [], []
for r in range(ROWS):
    g, z = '', ''
    for x in range(COLS):
        cx, cr = x + 0.5, r + 0.5
        if cr < DECK_R:
            gv = 1
        elif cr < DECK_R + 2:
            gv = 6
        elif cr < FINISH_R:
            gv = 5
        elif cr < FINISH_R + 3:
            gv = 2
        else:
            gv = 0
        g += str(gv)
        z += '.' if in_cut(cx, cr) else '~'
    grade.append(g)
    zone.append(z)

SKI = {
    'name': 'THE PARK', 'hello': 'THE PARK. SPACE SPINS IN THE AIR, HOLD DOWN TO GRAB; LAND ON A RAIL TO SLIDE IT.',
    'start': DECK_R, 'finish': FINISH_R, 'runs': {},
    'jumps': [list(j) for j in JUMPS],
    'rails': [[x0, r0, x1, r1, h0, h1, kind] for (x0, r0, x1, r1, h0, h1, kind) in RAILS],
    'grade': grade, 'zone': zone, 'obstacles': OBST,
    'park': {'start': [20.0, DECK_R + 0.4], 'finish': FINISH_R, 'board': [SB[0], SB[1] - 2.0]},
}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Park', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [20, 79]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.2, COLS, ROWS], 'cold': True})
w['interactions'] = [
    {'x': 20, 'y': 6, 'type': 'park_start', 'label': 'DROP IN', 'prompt': 'PRESS E TO SKI THE PARK'},
    {'x': 36, 'y': 77, 'type': 'park_tow', 'label': 'ROPE TOW', 'prompt': 'PRESS E TO RIDE UP'},
    {'x': 20, 'y': 75, 'type': 'park_board', 'label': 'SCOREBOARD', 'prompt': 'PRESS E TO READ'},
    {'x': 33, 'y': 67, 'type': 'dialog', 'label': 'JUDGES\' TOWER', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A HUT ON STILTS WITH A LONG WINDOW ONTO THE PARK. THREE STOOLS, A FLASK, A STACK OF SCORECARDS, AND A RADIO PLAYING SOMETHING WITH TOO MUCH BASS.'},
    {'x': 23, 'y': 77, 'type': 'dialog', 'label': 'JUNO', 'prompt': 'PRESS E TO TALK', 'dialog': 'JUNO IS WAXING A PAIR OF SKIS ON THE BENCH.'},
    {'x': 20, 'y': 81, 'type': 'enter_world', 'label': 'TO THE PISTES', 'prompt': 'PRESS E TO WALK DOWN', 'target': 'hoarfell-piste', 'spawn': [37, 101]},
]
w['ski'] = SKI
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
k.solid(23, 77, 24, 78)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=[{'sheet': 'npc-juno', 'x': 23, 'y': 77, 'facing': 'down'}],
            scene_extra={'smoke': []})
print('hoarfell-park done', len(OBST), 'obstacles')
