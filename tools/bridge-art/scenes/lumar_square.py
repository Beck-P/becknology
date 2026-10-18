"""Lumar Market Square — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/lumar_square.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-square

The town square, rebuilt in the house style (October 2026; Look Book 2's Lantern Quay and the richer village as the
bar): the tavern, inn, bakery and apothecary along the north side from the richer house kit — jettied upper floors on
corbelled bressumers, framed and shuttered windows with flower boxes, coursed plinths, ivy and roses, cats on the
steps — on a flagged pavement with a kerb; the smithy in stone to the west, the bell tower and the fishmonger's stall
to the east; the fountain on its rings of pale paving, cobbles worn by carts, drains and weeds in the joints; trees
in stone-kerbed beds of flowers, tubs of flowers, a clothes rail at the merchant's, washing over the alley, baskets
on the lamp posts, pigeons; and along the south side a parapet over the drop to the harbour, the steps going down
through it, the sea beyond (the world's own backdrop).
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_lumar_rich as R          # noqa: E402

HK.install()

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-square.json')

k = Kit(26, 18, margin_top=1.5, margin_bottom=1.7, seed=181)
rng = k.rng

# footprints (x0, r0, x1, r1) the cobbles skip; chimney tops for the engine's smoke
FOOT = []
SMOKE = []
C = math.cos(math.radians(45))
JET = 0.3                                # a two-storey timber house's ground floor stands this far back (assets_house)


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 1.05) * C, 3)])


def built(x0, r0, x1, r1):
    FOOT.append((x0, r0, x1, r1))


def lamps(xs, r_front):
    for lx in xs:                        # on the ground floor's face, under the jetty
        W.wall_lantern(k, lx, r_front - JET + 0.02, z=1.3, energy=12)


# ---- north side ---------------------------------------------------------------------------------
smoke(W.house(k, 0.2, 3.1, 1.0, 4.6, wall_h=2.0, roof=W.ROOF_SLATE, wall='#d8c8a8', door_x=1.65,
        windows=[(0.75, 0.85), (2.55, 0.85)], windows_up=[(1.65, 1.5)], chimney=0.8, barrels=False), 0.8)
built(0.2, 1.0, 3.1, 4.6)
smoke(W.house(k, 3.4, 7.6, 1.0, 5.0, wall_h=2.3, rise=1.4, roof='#b0563a', door_x=5.5, windows=[(4.2, 0.9), (6.8, 0.9)],
        windows_up=[(4.2, 1.7), (5.5, 1.75), (6.8, 1.7)], chimney=4.1, sign=(7.45, 1.75, 'mug'), barrels=False), 4.1)
lamps((4.85, 6.15), 5.0)
built(3.4, 1.0, 7.6, 5.0)
smoke(W.house(k, 9.2, 13.8, 1.0, 5.0, wall_h=2.3, rise=1.4, roof=W.ROOF_SLATE, wall='#e0d8c4', door_x=11.5,
        windows=[(10.0, 0.9), (12.9, 0.9)], windows_up=[(10.0, 1.7), (11.5, 1.75), (12.9, 1.7)], chimney=13.2,
        sign=(13.65, 1.75, 'bed'), barrels=False), 13.2)
lamps((10.85, 12.15), 5.0)
built(9.2, 1.0, 13.8, 5.0)
smoke(W.house(k, 14.3, 17.1, 1.6, 5.0, wall_h=2.0, rise=1.1, roof='#c8a050', wall='#ecdcbc', door_x=15.5,
        windows=[(16.5, 0.9)], windows_up=[(15.7, 1.5)], chimney=16.5, sign=(14.45, 1.6, 'bread')), 16.5)
built(14.3, 1.6, 17.1, 5.0)
W.house(k, 17.9, 21.1, 1.4, 5.0, wall_h=2.1, rise=1.2, roof=W.ROOF_PURPLE, wall='#6a6078', door_x=19.5,
        windows=[(18.6, 0.9), (20.4, 0.9)], windows_up=[(19.5, 1.6)], sign=(20.95, 1.6, 'bottle'), stone=True, barrels=False)
built(17.9, 1.4, 21.1, 5.0)
smoke(W.house(k, 21.6, 25.8, 0.8, 4.4, wall_h=2.0, roof=W.ROOF_GREEN, wall='#c8b898', door_x=24.9,
        windows=[(22.5, 0.85), (23.7, 0.85)], windows_up=[(23.7, 1.5)], chimney=22.3, sign=(25.65, 1.6, 'compass'), barrels=False), 22.3)
built(21.6, 0.8, 25.8, 4.4)
# washing strung over the alley between the tavern and the inn
WL = [(7.6, 2.6, 2.75), (9.2, 2.9, 2.75)]
pts = [(WL[0][0] + (WL[1][0] - WL[0][0]) * t, WL[0][1] + (WL[1][1] - WL[0][1]) * t, 2.75 - 0.22 * math.sin(math.pi * t)) for t in
       [i / 8 for i in range(9)]]
for p, q in zip(pts, pts[1:]):
    k.tube(p, q, 0.008, '#d8d0c0', 'washing_line', verts=4)
for i, (col, wdt, h) in enumerate((('#e8e4dc', 0.24, 0.32), ('#5a7ab0', 0.2, 0.4), ('#c84a3a', 0.16, 0.18), ('#e8e4dc', 0.3, 0.24),
                                   ('#7a9a5a', 0.18, 0.36))):
    p = pts[1 + i + (1 if i > 2 else 0)]
    k.box(p[0] - wdt / 2, p[1] - 0.01, p[2] - h, p[0] + wdt / 2, p[1] + 0.01, p[2] - 0.01, (col, 0.2), 'washing')

# ---- west: the smithy -------------------------------------------------------------------------------
# (shallow, so its roof doesn't hide the lane to the cottage door behind it)
smoke(W.house(k, 1.0, 5.0, 7.4, 10.0, wall_h=2.1, rise=1.0, roof=W.ROOF_SLATE, wall='#7e776c', door_x=3.5,
        windows=[(2.0, 0.9)], chimney=4.3, sign=(1.15, 1.6, 'anvil'), stone=True, barrels=False), 4.3)
built(1.0, 7.4, 5.0, 10.0)
A.anvil(k, 1.7, 10.6, glowing_blade=False)       # anvil and barrel flank the door, its front kept clear
A.barrel(k, 4.6, 10.5, tone=A.WOOD_D)
k.point_light(4.3, 10.0, 0.6, '#ff7a30', 10, radius=0.3, group='flicker')   # forge glow under the door
A.grindstone(k, 0.55, 10.55)
for i in range(3):                                # horseshoes nailed over the door, for luck
    a = -0.5 + i * 0.5
    k.tube((3.5 + a * 0.4 - 0.06, 10.03, 1.62), (3.5 + a * 0.4 + 0.06, 10.03, 1.62), 0.018, A.IRON, 'horseshoe', verts=5)

# ---- east: bell tower, fishmonger -----------------------------------------------------------------------
W.bell_tower(k, 23.0, 8.0)
built(22.2, 6.4, 23.8, 8.0)
W.market_stall(k, 18.6, 20.9, 9.15, 9.85, goods='fish')
k.solid(21, 9, 22, 10)                   # the fishmonger, beside the stall
R.fish_boxes(k, 18.55, 8.45, n=2)        # behind the stall: boxes of the catch, pots, a basket
R.lobster_pots(k, 19.4, 8.3, n=2)
k.cyl(20.75, 8.55, 0.0, 0.3, 0.22, ('#a88a58', 0.3), 'basket', verts=12)
k.cyl(20.75, 8.55, 0.28, 0.31, 0.225, '#7a603a', 'basket_rim', verts=12)
HK.tub(k, 20.55, 5.6)

# ---- the square -------------------------------------------------------------------------------------
W.fountain(k, 12.0, 8.55)
built(11.0, 7.7, 13.0, 9.4)
LAMPS = ((9.5, 6.5), (2.5, 13.5), (21.5, 13.5), (16.5, 6.5))
for (x, r) in LAMPS:
    W.lantern_post(k, x, r)
for (x, r) in LAMPS[::2]:                # baskets of trailing flowers hung under the lamps' arms
    k.tube((x + 0.12, r, 1.82), (x + 0.12, r, 1.62), 0.008, A.IRON, 'basket_chain', verts=4)
    k.cyl(x + 0.12, r, 1.42, 1.6, 0.13, ('#6a4a2a', 0.3), 'basket', verts=10)
    with k.foliage('leaf'):
        W.leafy_crown(k, x + 0.12, r, 1.6, 0.17, 0.15, 0.1, '#3a6a30', part='foliage', sprigs=False)
    for _ in range(7):
        a = rng.uniform(0, math.tau)
        k.sphere(x + 0.12 + math.cos(a) * 0.14, r + math.sin(a) * 0.1, rng.uniform(1.45, 1.66), 0.035, 0.035,
                 rng.choice(('#e04060', '#f0f0f0', '#a060d0')), 'flower', segs=5)
W.cart(k, 22.9, 11.6)                    # the handcart, parked by the fish stall
for (x, r) in ((17.15, 11.05), (17.75, 11.15)):
    A.crate(k, x, r, s=0.55, tone=A.WOOD_L, contents='apples' if x < 17.5 else None)
A.barrel(k, 18.6, 11.35)                 # the merchant's stock in one row, the lane past it open
# his clothes rail behind the crates: a pole on two posts, coats and shirts on hangers
RR = 11.88
for xx in (17.05, 18.9):
    k.cyl(xx, RR, 0.0, 1.35, 0.03, A.WOOD_D, 'rail_post', verts=6)
k.cyl_x(17.0, 18.95, RR, 1.32, 0.022, 0.022, A.WOOD_D, 'rail', verts=6)
x = 17.25
for col in ('#3a4a7a', '#8a3a3a', '#e8e0cc', '#4a6a3a', '#7a5a3a', '#2a2a3a', '#c8a050'):
    lng = rng.uniform(0.55, 0.85)
    k.box(x - 0.09, RR - 0.04, 1.3 - lng, x + 0.09, RR + 0.04, 1.27, (col, 0.25), 'garment')
    k.box(x - 0.13, RR - 0.04, 1.18, x + 0.13, RR + 0.04, 1.27, (shade(col, 0.9), 0.25), 'garment')
    x += 0.24
k.solid(17, 11, 19, 12)
W.bulletin_board(k, 18.0, 15.5)          # by the harbour steps, out of the way up to the fountain
# the captain's statue on a stepped plinth in a bed of flowers, bollards and chains round it
V_BED = (7.75, 13.75, 9.25, 15.25)
k.box(V_BED[0] - 0.2, V_BED[1] - 0.2, 0.0, V_BED[2] + 0.2, V_BED[3] + 0.2, 0.06, (shade('#a89c86', 0.95), 0.14), 'kerb', bevel=0.02)
k.box(V_BED[0], V_BED[1], 0.0, V_BED[2], V_BED[3], 0.09, ('#4a3a26', 0.3), 'bed_soil')
for _ in range(60):
    xx, rr = rng.uniform(V_BED[0] + 0.1, V_BED[2] - 0.1), rng.uniform(V_BED[1] + 0.1, V_BED[3] - 0.1)
    if abs(xx - 8.5) < 0.62 and abs(rr - 14.5) < 0.62:
        continue
    k.cone(xx, rr, 0.09, 0.09 + rng.uniform(0.1, 0.22), 0.03, 0.01, '#4a8a3a', 'stem', verts=4)
    k.sphere(xx, rr, 0.12 + rng.uniform(0.1, 0.2), 0.045, 0.04, rng.choice(('#e05070', '#f0d040', '#f0f0f0', '#a070e0')), 'bloom', segs=6)
W.statue(k, 8.5, 14.5)
CH = [(V_BED[0] - 0.1, V_BED[1] - 0.1), (V_BED[2] + 0.1, V_BED[1] - 0.1), (V_BED[2] + 0.1, V_BED[3] + 0.1), (V_BED[0] - 0.1, V_BED[3] + 0.1)]
for (bx, br) in CH:
    k.cyl(bx, br, 0.0, 0.42, 0.06, ('#2e3238', 0.1), 'bollard', verts=8)
    k.sphere(bx, br, 0.44, 0.07, 0.05, '#2e3238', 'bollard', segs=8)
for a, b in zip(CH, CH[1:] + CH[:1]):
    for i in range(6):
        t0, t1 = i / 6, (i + 1) / 6
        z0, z1 = 0.36 - 0.12 * math.sin(math.pi * t0), 0.36 - 0.12 * math.sin(math.pi * t1)
        k.tube((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, z0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, z1),
               0.012, '#2a2a30', 'chain', verts=4)
k.solid(7, 13, 10, 16)
W.street_clutter(k, (0.5, 4.0, 25.5, 17.5), seed=303, straw=[(18.4, 9.85, 21.2, 10.6)], chalk=(4.5, 16.8))
k.solid(7, 11, 8, 12)                    # the passerby
k.solid(16, 11, 17, 12)                  # the merchant
for (tx, tr) in ((12.6, 5.6), (13.3, 5.6), (9.65, 5.6), (10.35, 5.6)):
    HK.tub(k, tx, tr)
for (px, pr) in ((14.2, 12.4), (14.45, 12.55), (6.2, 8.2)):     # pigeons pecking on the cobbles
    k.blob(px, pr, 0.07, 0.07, 0.05, 0.05, '#8a8e98', 'pigeon', segs=8)
    k.sphere(px + 0.06, pr + 0.01, 0.08, 0.035, 0.03, '#6a7080', 'pigeon', segs=6)
    k.blob(px - 0.03, pr, 0.08, 0.05, 0.04, 0.02, '#a8acb4', 'pigeon', segs=6)

# ---- the trail down to the harbour, the parapet over the drop ----------------------------------------
W.stone_steps(k, 13.0, 15.0, 16.0, 18.0)
built(12.7, 16.0, 15.3, 18.0)
for x in (12.4, 15.6):
    W.lantern_post(k, x, 15.5, energy=30)
# below the square's south edge the land falls away: a coped parapet along it, the steps going on down through a gap,
# a stone face below with ivy and valerian, rock at its foot
EDGE = 18.0
for (xa, xb) in ((-0.2, 12.4), (15.6, 26.2)):
    R.dry_wall(k, (xa, EDGE + 0.15), (xb, EDGE + 0.15), h=0.62, d=0.3, solid=False)
k.box(-0.5, EDGE + 0.3, -1.45, 26.5, EDGE + 0.36, 0.02, ('#4a4a44', 0.2), 'mortar')
z, course = -0.04, 0
while z > -1.35:
    hh = rng.uniform(0.2, 0.3)
    x = -0.5 + (0.0 if course % 2 else rng.uniform(0.15, 0.3))
    while x < 26.5:
        wdt = rng.uniform(0.38, 0.8)
        if not (12.9 < x + wdt / 2 < 15.1):
            k.box(x + 0.02, EDGE + 0.22, z - hh + 0.02, x + wdt - 0.02, EDGE + 0.36 + rng.uniform(0, 0.04), z,
                  (shade(rng.choice(R.STONES), rng.uniform(0.82, 1.04)), 0.16), 'wall_stone', bevel=0.02)
            if rng.random() < 0.08:
                k.blob(x + wdt / 2, EDGE + 0.36, z - 0.02, wdt * 0.3, 0.05, 0.04, ('#4a7a36', 0.2), 'moss', segs=8)
        x += wdt
    z -= hh
    course += 1
for (xa, xb) in ((1.5, 3.5), (8.0, 9.2), (19.0, 21.4)):         # ivy down the face
    with k.foliage('leaf'):
        for j in range(26):
            k.blob(rng.uniform(xa, xb), EDGE + 0.42, -rng.uniform(0.0, 1.1), rng.uniform(0.07, 0.12), 0.05, 0.08,
                   shade('#2e5a2a', rng.uniform(0.85, 1.12)), 'ivy', segs=8)
for (vx, vz) in ((5.6, -0.6), (16.8, -0.9), (23.4, -0.4)):      # valerian in the joints
    with k.foliage('leaf'):
        k.blob(vx, EDGE + 0.45, vz, 0.18, 0.08, 0.12, ('#4a7a44', 0.25), 'valerian', segs=8)
    for _ in range(8):
        k.sphere(vx + rng.uniform(-0.15, 0.15), EDGE + 0.52, vz + rng.uniform(0.0, 0.15), 0.035, 0.03, '#d8507a', 'flower', segs=5)
W.stone_steps(k, 13.0, 15.0, 18.0, 19.2, z_top=-0.9, z_bot=-1.5, n=3)
for i in range(18):
    s = rng.uniform(0.3, 0.6)
    k.rock(rng.uniform(-0.5, 26.5), EDGE + 0.6 + rng.uniform(0, 0.9), -1.5, s, s * 0.7, s * 0.5, (shade('#4a5450', rng.uniform(0.8, 1.1)), 0.2),
           part='cliff_rock')

# ---- trees, benches, bunting -------------------------------------------------------------------------
BEDS = [(0.9, 11.6), (24.7, 11.2), (1.0, 15.9), (24.8, 15.9), (20.3, 16.4), (5.0, 16.4)]
for (x, r) in BEDS:
    W.tree_bed(k, x, r)
    for _ in range(12):                  # flowers round the tree's foot
        a, d = rng.uniform(0, math.tau), rng.uniform(0.2, 0.45)
        k.sphere(x + math.cos(a) * d, r + math.sin(a) * d * 0.9, rng.uniform(0.08, 0.16), 0.04, 0.035,
                 rng.choice(('#f0f0f0', '#e05070', '#f0d040', '#a070e0')), 'flower', segs=5)
    W.tree(k, x, r, h=rng.uniform(2.4, 2.9), lean=rng.uniform(-0.12, 0.12),
           tone=rng.choice(('#3e6a3a', '#447040', '#3a623e')))
W.bench(k, 14.3, 15.5, 10.9)
W.bench(k, 8.3, 9.5, 10.9)
W.bunting(k, (9.5, 6.5, 2.0), (16.5, 6.5, 2.0), sag=0.4)
W.bunting(k, (16.5, 6.5, 2.0), (21.5, 13.5, 2.0), sag=0.45)
for (gx, gr, gz, f) in ((5.6, 3.0, 3.95, 1), (16.2, 3.3, 3.25, -1)):     # gulls on the ridges
    R.gull(k, gx, gr, gz, facing=f)

# ---- the fountain plaza: rings of pale paving round the basin ----------------------------------------
FX, FR, PLAZA = 12.0, 8.55, 2.2
band, Rr = 0.38, 1.02
while Rr < PLAZA - 0.05:
    Rm = Rr + band / 2
    n = max(8, int(2 * math.pi * Rm / 0.42))
    off = rng.uniform(0, 2 * math.pi)
    for i in range(n):
        a0, a1 = off + 2 * math.pi * (i + 0.06) / n, off + 2 * math.pi * (i + 0.94) / n
        k.bar(FX + math.cos(a0) * Rm, FR + math.sin(a0) * Rm, FX + math.cos(a1) * Rm, FR + math.sin(a1) * Rm, -0.05,
              rng.uniform(0.0, 0.012), band - 0.05, (W.shade('#b0a892', rng.uniform(0.82, 1.0)), 0.14), 'plaza_stone',
              bevel=0.015)
    Rr += band

# ---- the pavement along the north side: big flags a hair apart, a kerb ---------------------------------
PAVE = [(0.0, 4.3, 3.25), (3.25, 4.7, 8.0), (8.0, 5.0, 8.9), (8.9, 4.7, 14.05), (14.05, 4.7, 17.5), (17.5, 5.0, 21.35), (21.35, 4.1, 26.0)]
KERB = 5.72
for (xa, ra, xb) in PAVE:
    k.box(xa, ra, -0.12, xb, KERB, -0.02, ('#3a3730', 0.15), 'grout')
    r_ = ra + 0.01
    while r_ < KERB - 0.06:
        h_ = min(KERB - 0.06, r_ + rng.choice((0.34, 0.38, 0.42))) - r_
        x = xa + rng.uniform(0, 0.2)
        while x < xb - 0.05:
            wdt = min(xb - x, rng.choice((0.46, 0.54, 0.62, 0.7)))
            k.box(x + 0.02, r_ + 0.02, -0.05, x + wdt - 0.02, r_ + h_ - 0.02, 0.012,
                  (shade('#a39a8a', rng.uniform(0.86, 1.1)), 0.12), 'flagstone', bevel=0.012)
            x += wdt
        r_ += h_
    x = xa
    while x < xb - 0.05:
        wdt = min(xb - x, rng.uniform(0.5, 0.9))
        k.box(x + 0.012, KERB - 0.06, -0.06, x + wdt - 0.012, KERB + 0.1, 0.03, (shade('#b0a490', rng.uniform(0.86, 1.06)), 0.1), 'kerb',
              bevel=0.014)
        x += wdt
    built(xa - 0.05, ra, xb + 0.05, KERB + 0.12)


def skip(x, r):
    if math.hypot(x - FX, r - FR) < PLAZA + 0.1:
        return True
    if any(math.hypot(x - bx, r - br) < 0.62 for bx, br in BEDS):
        return True
    if V_BED[0] - 0.25 <= x <= V_BED[2] + 0.25 and V_BED[1] - 0.25 <= r <= V_BED[3] + 0.25:
        return True
    return any(a - 0.1 <= x <= c + 0.1 and b - 0.1 <= r <= d + 0.1 for a, b, c, d in FOOT)


W.cobbles(k, 0, 0, 26, EDGE + 0.2, tone='#8a8274', skip=skip)

# ---- night light ----------------------------------------------------------------------------------------
k.area_light(13.0, 12.0, 12.0, '#8090c8', 900, 26.0, rot=(math.radians(-35), 0, 0))     # moonlight
for (x, r) in ((12.0, 10.5), (6.0, 7.0), (19.0, 7.0), (12.0, 15.0)):
    k.point_light(x, r, 2.8, '#ffc890', 30, radius=1.0)

k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=int(os.environ.get('SAMPLES', 128)),
         world_light=('#2a3450', 0.75))

k.solid(0, 0, 26, 1)                    # the strip behind the houses
k.solid(18, 8, 21, 9)                   # behind the fish stall
k.solid(22, 5, 24, 6)                   # behind the bell tower
k.solid(1, 6, 5, 7)                     # behind the smithy
for (c, r) in ((0, 10), (0, 14), (1, 14), (5, 14), (20, 14), (24, 14), (17, 14), (18, 14)):
    k.solid(c, r, c + 1, r + 1)         # under tree crowns / behind the bulletin board
apply_world(WORLD, k, (0, 0, 25, 17), scene_id='lumar-square', moves={
    'COTTAGE': (1, 4), "CARTOGRAPHER'S HOUSE": (24, 4), 'TAVERN': (5, 4), 'INN': (11, 4), 'BAKERY': (15, 4), 'APOTHECARY': (19, 4), 'SMITHY': (3, 9),
    'FISHMONGER': [(19, 9), (21, 9)], 'FOUNTAIN': (11, 8), 'BULLETIN BOARD': (17, 15), 'PASSERBY': (7, 11), 'MERCHANT': (16, 11),
    'HARBOR': [(13, 17), (14, 17)]},
    actors=[{'sheet': 'npc-fishmonger', 'x': 21, 'y': 9, 'facing': 'left'},
            {'sheet': 'npc-passerby', 'x': 7, 'y': 11, 'facing': 'left'},
            {'sheet': 'npc-townsman', 'x': 16, 'y': 11, 'facing': 'down'}],
    scene_extra={'backdrop': True, 'smoke': SMOKE,
                 'fountain': {'x': 12.0, 'r': 8.55, 'spoutZ': 1.42, 'basinZ': 0.46}})
print('square done')
