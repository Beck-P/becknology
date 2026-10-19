"""Sylvara — the Rootmarket: the forest floor of the wood elves' city, east of Elderglade. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_roots.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-roots

The city in the trees has three tiers (workstream F): this is the floor, among the feet of giants. Their crowns close
over the top of the picture; their roots run under the paths. A market of stalls under leaf-cut awnings round a spring
basin fed from a root; the bowyer's shop built against a trunk to the north-west (Corin, bows on racks, staves drying);
the weavers' looms under a long awning in the west, cloth drying on lines; the lantern makers' workshop south-west,
strings of leaf lanterns over the path; the basket lift up to the Boughs at the foot of the greatest tree (old Brannoc
at the winch) and a stair spiralling up another; Aerin's archery range to the east — the line, three rails the marks
run along, the pennant — fenced with rope. Ways out: west to Elderglade, south down to the Silverrun, north-east into
the Deepwood. Lit by day with Sylvara's dusk (the live light); lanterns everywhere for the night.
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
WID = 'sylvara-roots'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 48, 36
k = Kit(COLS, ROWS, margin_top=4.2, margin_bottom=0.8, seed=4411)
rng = k.rng

# ---- the plan -------------------------------------------------------------------------------------------------------
GIANTS = [  # x, r, trunk radius, height (crowns into the top of the picture)
    (4.6, 5.6, 1.8, 7.6),      # north-west: the weavers' tree
    (13.0, 4.6, 1.6, 7.3),     # the bowyer's tree
    (21.6, 5.4, 2.05, 8.2),    # the greatest: the basket lift at its foot
    (31.0, 4.8, 1.7, 7.4),     # the stair tree
    (42.4, 3.6, 1.7, 7.6),     # north-east, over the range
    (1.6, 14.5, 1.3, 6.8),     # the west edge
]
SQ = (22.0, 21.0, 6.4, 4.7)                                      # the market square: centre, half-width, half-depth
BASIN = (22.0, 20.4)
LIFT = (21.4, 10.6)
STAIR_T = GIANTS[3]
BOW_T = GIANTS[1]
RANGE = dict(x0=37, x1=46, r0=11, r1=31, line=30)               # Aerin's range: the line at its foot
LANES = [(26, 38.0, 45.0, 1.4), (21, 38.0, 45.0, 2.1), (15, 38.5, 44.5, 2.8)]   # row, x0, x1, speed (far is faster)
PATHS = {
    'west': [(-1.5, 20.3), (3.0, 20.6), (7.5, 20.2), (11.5, 20.8), (14.6, 21.0)],
    'lift': [(19.5, 15.6), (20.4, 13.0), (21.2, 11.8)],
    'bow': [(16.2, 16.4), (14.6, 12.8), (13.4, 9.4)],
    'stair': [(26.6, 15.8), (28.6, 12.0), (29.6, 8.6)],
    'deep': [(29.6, 9.4), (33.5, 8.8), (38.0, 9.0), (43.0, 8.8), (49.0, 8.4)],
    'range': [(28.6, 24.6), (32.5, 27.6), (36.5, 29.9), (41.5, 30.9), (45.2, 30.8)],
    'lantern': [(15.2, 23.6), (11.6, 25.6), (9.0, 27.2)],
    'south': [(23.2, 26.4), (23.6, 30.0), (22.8, 33.5), (23.4, 37.5)],
    'weave': [(14.4, 19.8), (10.5, 16.8), (8.0, 14.6)],
}
PATH_LINES = {k_: A.spline(v, 5) for k_, v in PATHS.items()}


def in_square(x, r):
    return ((x - SQ[0]) / SQ[2]) ** 2 + ((r - SQ[1]) / SQ[3]) ** 2 < 1.0


def path_d(x, r):
    return min(A.line_dist(x, r, p) for p in PATH_LINES.values())


def zfn(x, r):
    z = 0.12 * (A.noise(x, r, 0.35, 21) - 0.5) + 0.04 * (A.noise(x, r, 1.6, 22) - 0.5)
    for (tx, tr, rad, _h) in GIANTS:                             # the ground swells round the old trees' feet
        d = math.hypot(x - tx, (r - tr) * 1.1)
        z += 0.32 * math.exp(-(d / (rad + 1.2)) ** 2)
    z *= 1 - 0.85 * A.smooth(1.15, 0.85, math.sqrt(((x - SQ[0]) / SQ[2]) ** 2 + ((r - SQ[1]) / SQ[3]) ** 2))   # the square near level
    if RANGE['x0'] - 0.5 < x < RANGE['x1'] + 0.5 and RANGE['r0'] - 0.5 < r < RANGE['r1'] + 0.5:
        z *= 0.3                                                 # the range, mown and level
    z -= 0.12 * A.smooth(31.0, 35.5, r)                          # falling away south toward the river
    return z


def mat(x, r):
    jit = 0.1 * (A.noise(x, r, 3.0, 5) - 0.5)
    if in_square(x, r):
        e = ((x - SQ[0]) / SQ[2]) ** 2 + ((r - SQ[1]) / SQ[3]) ** 2
        return 'flag' if e < 0.86 + jit else 'path'
    if path_d(x, r) < 0.62 + jit:
        return 'path'
    if RANGE['x0'] - 0.2 < x < RANGE['x1'] + 0.2 and abs(r - RANGE['line'] - 0.4) < 0.75 + 2 * jit:
        return 'path'                                            # the turf trodden bare along the shooting line
    n = A.noise(x, r, 0.8, 7)
    if n > 0.76:
        return 'litter'
    if n < 0.3:
        return 'moss_dark'
    return 'moss'


L = A.Land(k, zfn, mat, alb={'flag': ('#3a5232', 0.36), 'grass': ('#5a843a', 0.3), 'meadow': ('#668e42', 0.3)})   # moss in the paving's joints
L.field(-1.5, -4.5, COLS + 1.5, ROWS + 1.5, 0.125)

# flagstones over the square: slabs laid in rough courses, moss in the joints (flat, named as paving)
for r0 in [SQ[1] - SQ[3] + i * 0.62 for i in range(int(SQ[3] * 2 / 0.62) + 1)]:
    x = SQ[0] - SQ[2] + rng.uniform(0, 0.4)
    while x < SQ[0] + SQ[2]:
        w = rng.uniform(0.45, 0.85)
        cx, cr = x + w / 2, r0 + 0.3
        if ((cx - SQ[0]) / SQ[2]) ** 2 + ((cr - SQ[1]) / SQ[3]) ** 2 < 0.8 and math.hypot(cx - BASIN[0], cr - BASIN[1]) > 1.05:
            z = L.z(cx, cr)
            k.box(x + 0.03, r0 + 0.03, z - 0.02, x + w - 0.03, r0 + 0.59, z + 0.012, (shade('#8a8874', rng.uniform(0.82, 1.1)), 0.22), 'flagstone')
        x += w

# ---- the giants ------------------------------------------------------------------------------------------------------
crowns = []
for i, (tx, tr, rad, h) in enumerate(GIANTS):
    crowns.append(A.old_tree(k, L, tx, tr, rad, h, seed=30 + i))

# ---- the basket lift at the greatest tree's foot ----------------------------------------------------------------------
A.basket_lift(k, L, LIFT[0], LIFT[1], rope_top=13.0)
A.lantern_post(k, L, LIFT[0] - 1.6, LIFT[1] + 0.9)

# ---- the stair spiralling up the stair tree --------------------------------------------------------------------------
sx, sr, srad, sh = STAIR_T
A.spiral_stair(k, sx, sr, srad * 1.25, L.z(sx, sr + srad) + 0.02, 9.5, turns=1.15, a0=math.pi * 0.62)
STAIR_FOOT = (int(sx + math.cos(math.pi * 0.62) * (srad * 1.25 + 0.4)), int(sr + math.sin(math.pi * 0.62) * (srad * 1.25 + 0.4) * 0.92) + 1)
A.lantern_post(k, L, STAIR_FOOT[0] - 1.2, STAIR_FOOT[1] + 0.6)

# ---- the bowyer's: a shopfront against the trunk, racks of bows, staves drying, a target to try them --------------------
bx, br, brad, _bh = BOW_T
BOW_DOOR = A.trunk_front(k, L, bx, br, brad, w=2.6, h=2.3, roof=A.CLOTH['russet'], roof2=A.CLOTH['gold'], icon='bow')
A.bow_rack(k, L, bx - 2.2, br + brad + 0.9)
k.solid(bx - 2.75, br + brad + 0.7, bx - 1.6, br + brad + 1.1)
A.staves_drying(k, L, bx + 2.4, br + brad + 0.9)
k.solid(bx + 1.7, br + brad + 0.5, bx + 3.1, br + brad + 1.2)
A.hay_target(k, L, bx + 3.8, br + brad + 2.6, s=0.38)
k.solid(bx + 3.4, br + brad + 2.4, bx + 4.2, br + brad + 2.9)
CORIN = (int(bx - 1), int(br + brad + 1.6))

# ---- the weavers' row: looms under a long awning, cloth drying ----------------------------------------------------------
WV = (3.6, 11.0, 12.0)                                           # x0, x1, row of the awning's back
for i, x in enumerate((4.6, 6.6, 8.6, 10.4)):
    A.loom(k, L, x, WV[2] + 0.6, warp=list(A.CLOTH.values())[(i * 3) % len(A.CLOTH)])
for x in (WV[0], WV[0] + 2.5, WV[0] + 5.0, WV[1]):
    A.carved_post(k, x, WV[2] + 1.55, L.z(x, WV[2] + 1.5), L.z(x, WV[2] + 1.5) + 2.0)
    A.carved_post(k, x, WV[2] - 0.2, L.z(x, WV[2]), L.z(x, WV[2]) + 2.4)
A.leaf_awning(k, WV[0] - 0.3, WV[1] + 0.3, WV[2] - 0.4, WV[2] + 1.9, L.z(7, WV[2]) + 2.45, L.z(7, WV[2]) + 1.95, A.CLOTH['violet'], A.CLOTH['cream'])
A.hanging_sign(k, WV[1] + 0.7, WV[2] + 1.5, L.z(WV[1], WV[2]) + 1.5, icon='loom')
A.cloth_line(k, (4.0, 16.4, L.z(4, 16.4) + 1.6), (9.4, 16.8, L.z(9.4, 16.8) + 1.6), n=5)
for x in (3.9, 9.5):
    A.carved_post(k, x, 16.6, L.z(x, 16.6), L.z(x, 16.6) + 1.7, leaf=False)
    k.solid_post(x, 16.6)
k.solid(WV[0] - 0.2, WV[2] - 0.6, WV[1] + 0.2, WV[2] + 0.2)
LOOMER = (6, int(WV[2] + 1.2))                                   # at the second loom's bench

# ---- the lantern makers' workshop (south-west): a thatched frame, a table of lanterns, strings of them over the path -----
LX0, LX1, LR = 3.4, 9.6, 28.6
for x in (LX0, (LX0 + LX1) / 2, LX1):
    A.carved_post(k, x, LR - 1.1, L.z(x, LR - 1.1), L.z(x, LR - 1.1) + 2.5)
    A.carved_post(k, x, LR + 0.9, L.z(x, LR + 0.9), L.z(x, LR + 0.9) + 2.0)
A.leaf_thatch(k, LX0 - 0.4, LX1 + 0.4, LR - 1.5, LR + 1.4, L.z(6, LR) + 2.6, L.z(6, LR) + 1.95)
z0 = L.z(6.5, LR)
k.box(LX0 + 0.6, LR - 0.5, z0 + 0.72, LX1 - 0.6, LR + 0.2, z0 + 0.8, (A.ELFWOOD, 0.25), 'workbench')
for x in (LX0 + 0.7, LX1 - 0.7):
    k.box(x - 0.05, LR - 0.45, z0, x + 0.05, LR + 0.15, z0 + 0.72, (A.ELFWOOD_D, 0.25), 'workbench')
A.goods(k, LX0 + 0.7, LX1 - 0.7, LR - 0.15, z0 + 0.8, 'lanterns')
for i in range(5):                                               # finished lanterns hung from the frame's beam
    x = LX0 + 0.7 + i * (LX1 - LX0 - 1.4) / 4
    k.cyl(x, LR - 1.1, z0 + 2.0, z0 + 2.45, 0.005, (A.GOLD, 0.25), 'chain', verts=4)
    A.leaf_lantern(k, x, LR - 1.1, z0 + 1.92, s=0.1, energy=2.5, col=rng.choice((A.GLOW, '#c8f0e0', '#f0c8ff')))
k.solid(LX0 + 0.5, LR - 0.6, LX1 - 0.5, LR + 0.25)
WREN = (int((LX0 + LX1) / 2), int(LR - 1))
A.hanging_sign(k, LX1 + 0.8, LR + 0.7, L.z(LX1, LR) + 1.5, icon='lantern')
for (a, b) in (((9.8, 23.4), (16.0, 24.8)), ((8.6, 24.8), (12.6, 21.2)), ((3.0, 22.6), (8.6, 24.8))):
    A.lantern_string(k, (a[0], a[1], L.z(*a) + 2.6), (b[0], b[1], L.z(*b) + 2.6), n=8, sag=0.45)
for (x, r) in ((9.8, 23.4), (16.0, 24.8), (8.6, 24.8), (12.6, 21.2), (3.0, 22.6)):
    A.carved_post(k, x, r, L.z(x, r), L.z(x, r) + 2.7)
    k.solid_post(x, r)

# ---- the market square: the spring basin, stalls round it, benches ------------------------------------------------------
A.spring_basin(k, L, BASIN[0], BASIN[1], rad=1.35)
for (dx, dr) in ((-3.2, -1.6), (3.2, -1.6), (-3.4, 1.9), (3.4, 1.9)):        # flower beds round the basin
    A.flower_bed(k, L, BASIN[0] + dx, BASIN[1] + 0.5 + dr, 0.75, 0.5)
STALLS = [  # x0, x1, row, awning, stripe, goods
    (15.4, 18.0, 17.6, 'green', 'gold', 'fruit'),
    (26.0, 28.6, 17.6, 'twilight', 'cream', 'honey'),
    (15.6, 18.2, 24.6, 'violet', 'cream', 'cloth'),
    (25.8, 28.4, 24.6, 'leaf', 'gold', 'toys'),
    (18.8, 20.6, 16.0, 'rose', 'cream', 'herbs'),
    (23.4, 25.2, 16.0, 'russet', 'gold', 'crystals'),
    (12.2, 14.4, 23.0, 'gold', 'green', 'bread'),
    (29.8, 32.0, 19.2, 'moon', 'twilight', 'lanterns'),
]
for (x0, x1, r, a1, a2, g) in STALLS:
    A.leaf_stall(k, L, x0, x1, r, awning=a1, awning2=a2, kind=g)
MERROW = (16, 16)                                                # behind the fruit stall                                                # behind the fruit stall
for (x0, x1, r) in ((18.6, 20.2, 25.4), (23.8, 25.4, 25.4)):
    A.bench(k, L, x0, x1, r)
for (x, r) in ((15.4, 20.0), (28.8, 21.6), (19.6, 24.2), (24.6, 24.2), (25.6, 18.0)):
    A.lantern_post(k, L, x, r)
for (x, r) in ((14.0, 15.6), (30.0, 15.4), (13.0, 26.8), (30.6, 26.4), (25.2, 12.4), (17.0, 12.2), (33.6, 23.4)):
    A.clutter(k, L, x, r)
A.gate_arch(k, L, 2.6, 18.9, 22.0)                               # the way in from Elderglade, under an arch of carved bough

# ---- Aerin's range: the line, rails the marks run along, the pennant, a rope fence --------------------------------------
R0, R1 = RANGE['r0'], RANGE['r1']
A.rope_fence(k, L, [(RANGE['x0'] - 0.4, RANGE['line'] - 0.1), (RANGE['x0'] - 0.4, R0 - 0.5), (RANGE['x1'] + 0.6, R0 - 0.5), (RANGE['x1'] + 0.6, RANGE['line'] - 0.1)])
for (r, x0, x1, _s) in LANES:
    A.target_rail(k, L, x0, x1 + 1, r + 0.5)
k.box(RANGE['x0'] + 0.4, RANGE['line'] - 0.18, L.z(41, RANGE['line']) - 0.02, RANGE['x1'] - 0.4, RANGE['line'] + 0.02,
      L.z(41, RANGE['line']) + 0.03, ('#e8dcc0', 0.3), 'line_chalk')
A.pennant_pole(k, L, RANGE['x0'] + 0.1, 22.0)
A.bow_rack(k, L, RANGE['x1'] + 1.3, RANGE['line'] + 1.6, n=4)
k.solid(RANGE['x1'] + 0.7, RANGE['line'] + 1.4, RANGE['x1'] + 2.2, RANGE['line'] + 1.8)
for x in (38.0, 41.5, 45.0):                                     # straw bosses at the far end, behind the last rail
    A.hay_target(k, L, x, 12.4, s=0.36)
    k.solid(x - 0.4, 12.2, x + 0.4, 12.7)
A.pavilion(k, L, 32.6, 35.4, 28.4, 30.2)                          # where the wardens watch, west of the line
for r in [11.0 + i * 1.1 for i in range(19)]:                      # a hedge along the outside of the fence, east and west
    for x in (RANGE['x0'] - 1.3, RANGE['x1'] + 1.5):
        if r > RANGE['line'] - 1.2 and x < RANGE['x0']:
            continue
        A.shrub(k, L, x + rng.uniform(-0.15, 0.15), r, s=rng.uniform(0.38, 0.5), tone=rng.choice(('#3a6a30', '#46763a')),
                flowers_=rng.choice((None, None, '#f0f0f0', '#f0b0c8')))
# life round the range, on its own dice (the scene's dice place the wood after it, as before): straw bales and a quiver
# stand by the line, spent arrows in the turf short of the marks, flowers along the inside of the fence
rr_ = __import__('random').Random(4747)
for (x, r) in ((RANGE['x0'] - 0.75, RANGE['line'] - 1.6), (RANGE['x1'] + 0.2, RANGE['line'] - 0.9)):
    zb = L.z(x, r)
    k.box(x - 0.32, r - 0.2, zb, x + 0.32, r + 0.2, zb + 0.36, ('#c8a85a', 0.42), 'hay')
    for i in range(3):
        k.box(x - 0.33, r - 0.21 + i * 0.14, zb + 0.34, x + 0.33, r - 0.19 + i * 0.14, zb + 0.365, ('#9a7a3a', 0.4), 'hay_band')
    k.solid(x - 0.32, r - 0.2, x + 0.32, r + 0.2)
qx, qr = RANGE['x1'] - 0.7, RANGE['line'] + 1.1
A.carved_post(k, qx, qr, L.z(qx, qr), L.z(qx, qr) + 0.8, rad=0.05, leaf=False)
k.cyl(qx + 0.1, qr + 0.02, L.z(qx, qr) + 0.35, L.z(qx, qr) + 0.75, 0.08, ('#6a4a2a', 0.35), 'quiver', verts=8)
for i in range(5):
    k.tube((qx + 0.06 + i * 0.02, qr + 0.02, L.z(qx, qr) + 0.7), (qx + 0.04 + i * 0.03, qr, L.z(qx, qr) + 0.95), 0.008, '#d8c8a0', 'arrow_shaft', verts=4)
    k.blob(qx + 0.04 + i * 0.03, qr, L.z(qx, qr) + 0.93, 0.02, 0.01, 0.03, ('#8ab858', 0.4), 'fletch', segs=5)
k.solid_post(qx, qr)
for (r, x0, x1, _s) in LANES:
    for _ in range(3):
        x, r2 = rr_.uniform(x0, x1 + 1), r + rr_.uniform(0.9, 2.2)
        z = L.z(x, r2)
        a = rr_.uniform(-0.3, 0.3)
        k.tube((x, r2, z - 0.02), (x + a * 0.2, r2 - 0.25, z + 0.22), 0.01, '#c8b088', 'arrow_shaft', verts=4)
        k.blob(x + a * 0.2, r2 - 0.25, z + 0.22, 0.025, 0.012, 0.035, ('#8ab858', 0.4), 'fletch', segs=5)
for x in (RANGE['x0'] - 0.1, RANGE['x1'] + 0.35):
    A.flowers(k, L, x - 0.3, R0 + 0.5, x + 0.3, RANGE['line'] - 2.0, 30, cols=('#f0f0f0', '#f0e0a0', '#c8a8f0'))
AERIN = (RANGE['x0'] - 1, RANGE['line'])
for x in (RANGE['x0'] - 0.2, RANGE['x1'] + 0.6):
    A.lantern_post(k, L, x, RANGE['line'] + 1.0)

# ---- the wood round it all: birches, shrubs, ferns, mushrooms, boulders, logs, the small things --------------------------
used_cells = set()
for p in PATH_LINES.values():
    for (x, r) in p:
        used_cells.add((int(x), int(r)))


def clear(x, r, pad=0.9):
    if in_square(x, r) or path_d(x, r) < pad:
        return False
    if (int(x), int(r)) in k.blocked and r > 8:                      # something's built there (a stall, a bed, clutter)
        return False
    if 31.8 < x < 36.2 and 27.6 < r < 31.0:                          # the pavilion
        return False
    if RANGE['x0'] - 1 < x < RANGE['x1'] + 1.5 and RANGE['r0'] - 1 < r < RANGE['r1'] + 2.5:
        return False
    if any(math.hypot(x - tx, (r - tr)) < rad + 0.9 for (tx, tr, rad, _h) in GIANTS):
        return False
    if WV[0] - 0.8 < x < WV[1] + 0.8 and WV[2] - 1 < r < WV[2] + 2.5:
        return False
    if LX0 - 0.8 < x < LX1 + 0.8 and LR - 1.8 < r < LR + 1.6:
        return False
    if abs(x - LIFT[0] - 0.6) < 2.6 and abs(r - LIFT[1]) < 1.6:
        return False
    if abs(x - bx) < 4.5 and br + brad < r < br + brad + 3.4:
        return False
    return True


for (x, r, h) in ((10.8, 31.6, 3.3), (16.6, 32.4, 3.6), (30.4, 32.6, 3.2), (34.0, 21.6, 3.4), (33.2, 16.0, 3.0), (9.4, 9.6, 3.0),
                  (1.8, 26.0, 3.4), (27.6, 31.2, 2.9), (35.2, 33.4, 3.5), (12.2, 34.2, 3.1)):
    if clear(x, r, 0.8):
        A.birch(k, L, x, r, h=h)
for (x, r, h) in ((5.6, 33.4, 4.4), (14.2, 30.4, 4.0), (19.4, 34.0, 4.6), (29.0, 34.6, 4.2), (33.8, 29.8, 3.8), (36.6, 33.0, 4.4),
                  (44.4, 34.2, 4.0), (0.8, 35.0, 4.2), (11.0, 17.4, 3.4), (33.6, 18.8, 3.6)):
    if clear(x, r, 1.0):
        A.elf_oak(k, L, x, r, h=h, rad=0.36 + 0.04 * h, seed=int(x * 7 + r))
for _ in range(170):
    x, r = rng.uniform(0.5, COLS - 0.5), rng.uniform(8.0, ROWS + 0.5)
    if clear(x, r, 0.85):
        A.fern(k, L, x, r, s=rng.uniform(0.5, 0.8), tone=rng.choice(('#4a8a3a', '#55963e', '#3e7a32')))
for _ in range(60):
    x, r = rng.uniform(0.5, COLS - 0.5), rng.uniform(8.0, ROWS + 0.5)
    if clear(x, r, 1.0):
        A.shrub(k, L, x, r, s=rng.uniform(0.35, 0.6), tone=rng.choice(('#3a6a30', '#4a7a34', '#2e5a2a')),
                berries=rng.choice((None, None, '#f0f0f0', '#c83a3a')), flowers_=rng.choice((None, None, '#f0b0c8', '#c8a8f0')))
for _ in range(14):
    x, r = rng.uniform(0.5, COLS - 0.5), rng.uniform(8.0, ROWS)
    if clear(x, r, 1.0):
        A.mushroom_ring(k, L, x, r, n=rng.randint(3, 5), glow=rng.random() < 0.55, col=rng.choice((A.SPORE, '#a8d8ff', '#e0b0ff')), light=2.0)
for (x, r, s) in ((10.4, 30.0, 0.42), (33.0, 30.8, 0.5), (0.8, 31.2, 0.6), (35.6, 12.6, 0.38), (17.6, 33.6, 0.45)):
    if clear(x, r, 0.6):
        A.boulder(k, L, x, r, s)
A.log(k, L, 30.6, 33.4, 34.2, 0.26)
glowspots = [(rng.uniform(1, COLS - 1), rng.uniform(9, ROWS - 1)) for _ in range(30)]
for (x, r) in glowspots:
    if clear(x, r, 0.7):
        A.glow_spores(k, L, x, r, n=rng.randint(3, 6))
ok = lambda x, r: clear(x, r, 0.7)
A.pebbles(k, L, -0.5, 7.0, COLS + 0.5, ROWS + 0.5, 90, ok=ok)
A.leaf_litter(k, L, -0.5, 7.0, COLS + 0.5, ROWS + 0.5, 160, ok=lambda x, r: not in_square(x, r))
A.flowers(k, L, -0.5, 7.0, COLS + 0.5, ROWS + 0.5, 320, ok=ok)
A.moss_mounds(k, L, -0.5, 7.0, COLS + 0.5, ROWS + 0.5, 90, ok=ok)
A.twigs(k, L, -0.5, 7.0, COLS + 0.5, ROWS + 0.5, 18, ok=ok)
# stones edging the paths
for name, p in PATH_LINES.items():
    for a, b in zip(p, p[1:]):
        Ln = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        for i in range(max(1, int(Ln / 0.6))):
            t = (i + rng.uniform(0, 0.6)) / max(1, int(Ln / 0.6))
            x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            nx, nr = -(b[1] - a[1]) / Ln, (b[0] - a[0]) / Ln
            side = rng.choice((-1, 1))
            px, pr = x + nx * 0.7 * side, r + nr * 0.7 * side
            if in_square(px, pr) or path_d(px, pr) < 0.6:
                continue
            s = rng.uniform(0.07, 0.13)
            k.rock(px, pr, L.z(px, pr) + s * 0.25, s, s * 0.8, s * 0.55, (shade(A.STONE, rng.uniform(0.8, 1.15)), 0.3), part='path_stone', segs=7)

# the grass over the moss (only where the moss is still what's on top), then the range's mown grass
W.meadow(k, '#567a36', area=(-0.5, 6.0, COLS + 0.5, ROWS + 1.0), ok=('ground_moss', 'ground_moss_dark', 'ground_litter'), density=0.8, flowers=0.7, h=(0.07, 0.15))

# ---- the crowns last, and boughs of trees out of the picture closing the canopy over the top ----------------------------
for c in crowns:
    c()
with k.foliage('leaf'):
    for (x, r, z, s) in ((26.5, 2.0, 6.8, 1.2), (36.0, 2.6, 6.6, 1.1), (8.6, 2.4, 6.4, 1.1), (47.5, 9.0, 5.6, 1.0), (-0.5, 9.0, 5.4, 1.0),
                         (17.0, 1.8, 7.0, 1.0)):
        W.leafy_crown(k, x, r, z, 1.4 * s, 1.15 * s, 0.85 * s, shade(A.LEAF, rng.uniform(0.85, 1.05)), n=int(64 * s * s), part='canopy')

# the north behind the trees, and the edges
k.solid(0, 0, COLS, 7)
for r in range(ROWS):
    for c in (0, COLS - 1):
        k.solid(c, r, c + 1, r + 1)
k.solid(0, ROWS - 1, COLS, ROWS)

# ---- the light: Sylvara's day (the sun down through the canopy; at dusk a low gold sun between the trunks) --------------
k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
R.merge_parts(k)                                                  # one mesh per look: each render pass quick (assets_sylvara_rich)
k.render(OUT, cycle={'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

# ---- the world -------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
SPAWN = [1, 20]
w.update({'name': 'the Rootmarket', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': SPAWN}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -4.0, COLS, ROWS], 'crowd': 'sylvara'})
line = RANGE['line']
w['range'] = {'line': [RANGE['x0'], RANGE['x1'], line], 'lanes': [{'y': r, 'x0': x0, 'x1': x1, 'speed': s, 'size': 0.5, 'far': r < 18, 'phase': i * 0.37}
                                                                     for i, (r, x0, x1, s) in enumerate(LANES)], 'flag': [RANGE['x0'], 22]}
w['interactions'] = [
    {'x': 0, 'y': 20, 'type': 'enter_world', 'label': 'ELDERGLADE', 'prompt': 'PRESS E TO WALK WEST', 'target': 'sylvara', 'spawn': [43, 18]},
    {'x': 23, 'y': ROWS - 2, 'type': 'enter_world', 'label': 'THE SILVERRUN', 'prompt': 'PRESS E TO WALK DOWN TO THE RIVER', 'target': 'sylvara-river', 'spawn': [24, 1]},
    {'x': COLS - 2, 'y': 8, 'type': 'enter_world', 'label': 'THE DEEPWOOD', 'prompt': 'PRESS E TO GO INTO THE OLD WOOD', 'target': 'sylvara-deepwood', 'spawn': [1, 18]},
    {'x': int(LIFT[0]), 'y': int(LIFT[1]) + 1, 'type': 'sylvan', 'kind': 'lift', 'label': 'BASKET LIFT', 'prompt': 'PRESS E TO RIDE UP TO THE BOUGHS',
     'target': 'sylvara-boughs', 'spawn': [21, 26]},
    {'x': STAIR_FOOT[0], 'y': STAIR_FOOT[1], 'type': 'enter_world', 'label': 'THE STAIR', 'prompt': 'PRESS E TO CLIMB TO THE BOUGHS',
     'target': 'sylvara-boughs', 'spawn': [31, 22]},
    {'x': CORIN[0], 'y': CORIN[1], 'type': 'dialog', 'label': 'BOWYER', 'prompt': 'PRESS E TO TALK', 'dialog': 'CORIN LOOKS UP FROM A STAVE.'},
    {'x': WREN[0], 'y': WREN[1] + 2, 'type': 'dialog', 'label': 'LANTERN MAKER', 'prompt': 'PRESS E TO TALK', 'dialog': 'WREN HOLDS A LANTERN UP TO THE LIGHT.'},
    {'x': LOOMER[0], 'y': LOOMER[1] + 1, 'type': 'dialog', 'label': 'WEAVER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE SHUTTLE GOES ACROSS AND BACK.'},
    {'x': MERROW[0], 'y': MERROW[1] + 2, 'type': 'dialog', 'label': 'FRUIT STALL', 'prompt': 'PRESS E TO TALK', 'dialog': 'MERROW WEIGHS A PEAR IN HIS HAND.'},
    {'x': int(LIFT[0]) + 2, 'y': int(LIFT[1]) + 1, 'type': 'dialog', 'label': 'LIFTKEEPER', 'prompt': 'PRESS E TO TALK', 'dialog': 'OLD BRANNOC LEANS ON THE WINCH.'},
    {'x': int(BASIN[0]), 'y': int(BASIN[1]) + 2, 'type': 'dialog', 'label': 'SPRING', 'prompt': 'PRESS E TO DRINK',
     'dialog': 'WATER FROM THE ROOTS OF THE GREAT TREES, COLD ENOUGH TO MAKE YOUR TEETH ACHE. YOU FEEL A LITTLE LESS TIRED.'},
    {'x': AERIN[0], 'y': AERIN[1], 'type': 'dialog', 'label': 'WARDEN', 'prompt': 'PRESS E TO TALK', 'dialog': 'AERIN WATCHES THE MARKS.'},
]
for x in range(RANGE['x0'], RANGE['x1'] + 1, 3):
    w['interactions'].append({'x': x, 'y': line, 'type': 'sylvan', 'kind': 'range', 'label': 'THE LINE', 'prompt': 'PRESS E TO SHOOT A ROUND', 'noBeacon': True})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x, y) in (CORIN, WREN, LOOMER, MERROW, (int(LIFT[0]) + 2, int(LIFT[1])), AERIN):
    k.solid(x, y, x + 1, y + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            doors=[(0, 20), (23, ROWS - 2), (COLS - 2, 8), (COLS - 1, 8)],
            actors=[{'sheet': 'npc-elf-bowyer', 'x': CORIN[0], 'y': CORIN[1], 'facing': 'down'},
                    {'sheet': 'npc-elf-lanternmaker', 'x': WREN[0], 'y': WREN[1], 'facing': 'down'},
                    {'sheet': 'npc-elf-loomer', 'x': LOOMER[0] + 0.5, 'y': LOOMER[1] + 0.1, 'facing': 'up', 'pose': 'sit'},
                    {'sheet': 'npc-elf-grocer', 'x': MERROW[0], 'y': MERROW[1], 'facing': 'down'},
                    {'sheet': 'npc-elf-liftkeeper', 'x': int(LIFT[0]) + 2, 'y': int(LIFT[1]), 'facing': 'down'},
                    {'sheet': 'npc-elf-warden', 'x': AERIN[0], 'y': AERIN[1], 'facing': 'right', 'id': 'aerin-range'}],
            scene_extra={})
print('sylvara-roots done', 'stair foot', STAIR_FOOT, 'corin', CORIN, 'wren', WREN)
