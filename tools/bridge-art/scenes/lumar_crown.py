"""Crownhaven — the capital of the Emerald Sea (world id "lumar-crown").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown

The biggest island on Lumar's seas and its one real city, rebuilt in the house style (October 2026: Look Book 2's toy
finish and richer places — Lantern Quay and the richer village are the reference). A long quay of dressed stone along
the harbour: coping and coursed walls down to the weed at the waterline, steps and ladders, rowboats on their lines,
bollards, nets and lobster pots, cargo; your pier and the fishing jetty off it. Behind it the waterfront: two warehouses
(stone below, weatherboards and a hoist above), the harbour office, the Crown & Anchor and two houses from the richer
house kit. Market Row and the avenue in cobbles; up the avenue the grand square in big flags with rings of setts round
the fountain, the stalls heaped under bunting, trees in their beds. The Merchants' Exchange: steps up to a portico of
fluted columns, a pediment with the gilt clock, rusticated walls and arched windows. St Brendan's: buttresses and
lancets, a porch with the rose window in its gable, a bell tower with a spire. The palace stands on its hill behind a
curtain wall of ashlar and machicolations: the drum-towered gatehouse with the royal arms, the keep with its
frontispiece and balcony, towers with slated cones and banners, clipped gardens with a basin either side. East the Royal
Yard, a galleon in frame on the stocks, sawdust and tar; west the Crown Light on the point and the keeper's thatched
cottage among the grass and flowers. Lit for night (cycle='night'): live light for its days.

The map is the old one (every door, interaction, actor, spawn and walkable cell where it was): the rebuild is the art.
CROWN_CROP="x0,r0,x1,r1" (tiles) renders only that part of the frame, for looking at it quickly.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import bpy  # noqa: E402,F401
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_crown as Q               # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown.json')
WID = 'lumar-crown'
COLS, ROWS = 64, 46
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=4401)
rng = k.rng
C45 = math.cos(math.radians(45))
STONE, STONE_D = '#8a8478', '#5e5a52'
ASHLAR = '#b8b0a0'                 # the Exchange and the palace: dressed, pale
SLATE = '#3a4a5a'
GOLD = '#c8a040'
GREEN_ROOF = '#2a5a3e'
TERR = 0.8                         # the palace hill's height behind the curtain wall


def mix(a, b, t):
    return W._mix(a, b, t)


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lifted(dz, fn, *a, **kw):
    """Build with fn at ground level, then raise what it built by dz (onto the palace hill)."""
    sp, sl = len(k.parts), len(k.lights)
    out = fn(*a, **kw)
    I.pose(k, sp, (0, 0, 0), dz=dz, lights_since=sl)
    return out


def drop(since, names, keep):
    """Take parts back out (by part name) that something built since `since` put where they don't belong — keep(x, r)
    says where they may stay (by the mean of their vertices)."""
    gone = []
    for p in k.parts[since:]:
        if p.get('pname') not in names:
            continue
        vs = p['obj'].data.vertices
        x = sum(v.co.x for v in vs) / len(vs)
        r = -sum(v.co.y for v in vs) / len(vs) / (1 / math.sin(math.radians(45)))
        if not keep(x, r):
            gone.append(p)
    for p in gone:
        bpy.data.objects.remove(p['obj'], do_unlink=True)
        k.parts.remove(p)


def rich_house(k_, x0, x1, *a, **kw):
    """HK.rich_house without the barrels it sets beside a front (they'd stand in the next house or the lane)."""
    since = len(k.parts)
    out = HK.rich_house(k_, x0, x1, *a, **kw)
    drop(since, ('barrel', 'barrel_hoop', 'barrel_top', 'hoop'), lambda x, r: x0 - 0.05 <= x <= x1 + 0.05)
    return out


# ---- the island ----------------------------------------------------------------------------------------------------
LOBES = [(32, 22, 27, 13), (32, 9, 16, 7), (8, 27, 7, 7.5), (56, 26, 8, 8.5)]
land = I.mask(COLS, ROWS, LOBES, seed=44, amp=0.1)
land = I.flood(land, (32, 20))
QUAY = 33                                          # the quay's front row: the harbour is south of it
land |= {(c, r) for c in range(11, 53) for r in range(12, QUAY + 1)}          # the city fills its ground, the quay runs straight
land = {(c, r) for (c, r) in land if r <= QUAY or not (12 <= c <= 50)}
land = {(c, r) for (c, r) in land if r >= 4}
QF = QUAY + 0.95                                   # the quay wall's face

PX = 22                                            # your pier; the sloop lies across its end (js/sloop.js MOORINGS)
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
SHIP_R = QUAY + 4
FX, FLEN = 14, 5                                   # the fishing jetty, west along the quay
FPIER = I.jetty_cells((FX, QUAY + 1), FLEN, 's')

# footprints (x0, r0, x1, r1): the paving leaves them out
EX = (12.4, 21.6, 12.6, 18.4)                      # the Exchange
CH = (43.0, 51.0, 10.6, 18.4)                      # St Brendan's
WALL_R = 12.0                                      # the palace's curtain wall front
YARD_R = 27.6
FOOT = [(11.6, 25.4, 16.4, 29.6), (16.8, 25.8, 21.0, 29.6), (22.6, 25.4, 27.4, 29.6), (37.4, 25.0, 42.6, 29.6),
        (43.2, 25.6, 46.8, 29.6), (47.2, 26.0, 50.4, 29.6), (EX[0], EX[2], EX[1], EX[3]), (CH[0], CH[2], CH[1], CH[3]),
        (51.7, 16.6, 53.5, 18.4), (17.0, 3.0, 47.0, WALL_R)]


def under(x, r, pad=0.0):
    return any(x0 - pad <= x <= x1 + pad and r0 - pad <= r <= r1 + pad for (x0, r0, x1, r1) in FOOT)


# ---- the land: paving in the city, grass and paths beyond, the palace on its hill ---------------------------------
TOWN = {(c, r) for (c, r) in land if 11 <= c <= 52 and 11 <= r <= QUAY}
PATHS = [[(10.5, 30.0), (8.0, 28.0), (7.0, 25.0)], [(52.5, 30.0), (56.0, 31.0)], [(11.0, 18.0), (6.0, 21.0)],
         [(7.0, 25.0), (5.4, 28.6)], [(53.0, 24.6), (56.8, 25.2)]]
YARD = (49.6, 20.8, 60.6, 33.6)                    # the Royal Yard's sawdust and packed earth
PALACE = (16.4, 3.0, 48.4, 11.4)                   # the hill under the palace


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def hill(x, r):
    """The palace hill: flat on top behind the curtain wall, falling away to the sides and toward the sea behind."""
    x0, r0, x1, r1 = PALACE
    if not (x0 < x < x1 and r < r1):
        return 0.0
    d = min((x - x0) / 1.7, (x1 - x) / 1.7, (r - 3.6) / 1.5, (r1 - r) / 0.35)
    return TERR * smooth(0.0, 1.0, d)


def in_yard(x, r):
    x0, r0, x1, r1 = YARD
    e = 0.45 * I.n2(x, r, 0.9, 77)
    return x0 + e < x < x1 - e and r0 + e < r < r1


def material(x, r):
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.5:
        return 'path'
    if in_yard(x, r):
        return 'yard' if I.n2(x, r, 2.2, 31) > -0.35 else 'path'
    if hill(x, r) > 0.05 and (19.0 < x < 24.6 or 39.4 < x < 45.0) and 5.0 < r < 10.6:     # the palace gardens' gravel
        return 'gravel'
    m = I.n2(x, r, 0.4, 21) + 0.4 * I.n2(x, r, 1.5, 22)
    return 'grass' if m > -0.45 else ('grass_dark' if m > -0.8 else 'stone')


GRASS = '#3e6a3a'
ALB = {'path': ('#8a7a5e', 0.3), 'grass': (GRASS, 0.3), 'grass_dark': ('#345a34', 0.3), 'stone': ('#6a6a62', 0.25),
       'yard': ('#9a8058', 0.35), 'gravel': ('#a49a86', 0.3)}
OPEN = land - TOWN
I.ground(k, OPEN, material, ALB, height=hill)
k.box(11.0, 11.0, -0.26, 53.0, QUAY + 0.95, -0.11, ('#2a2824', 0.2), 'ground_fill')           # under the city's paving

C.coast(k, land, ground=(material, ALB), palette='emerald', grass=GRASS, rock='#5a5a54', seed=61, beachiness=-0.15,
        beach_bias=lambda x, r: 0.9 * I.smooth(3.0, 6.0, 30 - r) * I.smooth(4.0, 8.0, x),
        keep_clear=[(11.5, QUAY + 0.6, 51.0, QUAY + 2.0), (PX - 0.4, QUAY, PX + 1.4, SHIP_R + 0.2),
                    (FX - 1.5, QUAY, FX + 2.4, QUAY + FLEN + 2.4), (PX - 9.0, SHIP_R - 0.6, 50.0, SHIP_R + 3.4)],
        sheer=[(11.9, QUAY + 0.9, 50.1, QUAY + 6.0)])


# ---- paving --------------------------------------------------------------------------------------------------------
def flags(x0, r0, x1, r1, tone, w=(0.42, 0.78), h=(0.32, 0.46), part='flagstone', skip=None, gap=0.022):
    """Big flags in running bond, the courses of random height so no seam lines up with the tiles."""
    k.box(x0, r0, -0.12, x1, r1, -0.035, ('#2e2b26', 0.2), 'grout')
    r = r0
    while r < r1 - 1e-6:
        hh = min(rng.uniform(*h), r1 - r)
        if r1 - (r + hh) < 0.2:
            hh = r1 - r
        x = x0 - rng.uniform(0.0, 0.5)
        while x < x1 - 1e-6:
            ww = rng.uniform(*w)
            a0, a1 = max(x, x0), min(x + ww, x1)
            cx, cr = (a0 + a1) / 2, r + hh / 2
            if a1 - a0 > 0.1 and not under(cx, cr) and not (skip and skip(cx, cr)):
                k.box(a0 + gap, r + gap, -0.05, a1 - gap, r + hh - gap, rng.uniform(-0.008, 0.01),
                      (shade(tone, rng.uniform(0.92, 1.06)), 0.16), part, bevel=0.016)
            x += ww
        r += hh


def kerb(x0, x1, r, d=0.16, tone='#b0a490'):
    x = x0
    while x < x1 - 0.05:
        w = rng.uniform(0.5, 0.9)
        k.box(x + 0.012, r, -0.02, min(x1, x + w) - 0.012, r + d, 0.06, (shade(tone, rng.uniform(0.86, 1.06)), 0.1), 'kerb', bevel=0.014)
        x += w


def cobble_area(x0, r0, x1, r1, tone='#a59c8a', worn=None, skip=None):
    k.box(x0, r0, -0.11, x1, r1, -0.025, ('#7a705e', 0.3), 'path_grit')       # sandy grit between the stones
    W.cobbles(k, x0, r0, x1, r1, tone=tone, size=0.27, skip=lambda x, r: under(x, r) or (worn and worn(x, r)) or (skip and skip(x, r)))


SQ = (32.0, 18.5)                                   # the fountain


def ring_d(x, r):
    return math.hypot(x - SQ[0], (r - SQ[1]) * 1.0)


def inlay_rose(cx, cr, R=1.25):
    """A compass rose let into the paving: a ring of dark setts, eight points in two stones."""
    k.cyl(cx, cr, -0.04, 0.012, R + 0.08, ('#7a7468', 0.15), 'paving_inlay', verts=40)
    k.cyl(cx, cr, -0.04, 0.016, R - 0.08, ('#c0b6a2', 0.15), 'paving_inlay', verts=40)
    for i in range(8):
        a = i / 8 * math.tau - math.pi / 2
        L = R * (0.92 if i % 2 == 0 else 0.6)
        for s_ in (-1, 1):
            b = a + s_ * (0.2 if i % 2 == 0 else 0.26)
            k.poly([(cx, cr, 0.02), (cx + math.cos(a) * L, cr + math.sin(a) * L, 0.02),
                    (cx + math.cos(b) * L * 0.32, cr + math.sin(b) * L * 0.32, 0.02)],
                   ('#5a6a72' if (s_ > 0) == (i % 2 == 0) else '#c8a858', 0.12), 'paving_inlay')
    k.cyl(cx, cr, 0.0, 0.026, 0.12, GOLD, 'paving_inlay', verts=12)


# the grand square, the Exchange's forecourt, the church's: big pale flags; setts in rings round the fountain
SQUARE = (21.6, 12.1, 43.0, 23.0)
flags(*SQUARE, '#b0a693', w=(0.5, 0.9), h=(0.36, 0.5), skip=lambda x, r: 1.35 < ring_d(x, r) < 3.55)
for (x0, r0, x1, r1) in ((11.0, 19.0, 21.6, 23.0), (11.0, 11.0, 12.4, 19.0), (43.0, 18.4, 53.0, 23.0), (51.0, 11.0, 53.0, 18.4),
                         (12.4, 11.0, 17.0, 12.6), (47.0, 11.0, 51.0, 12.1), (17.0, 12.0, 21.6, 12.6)):
    flags(x0, r0, x1, r1, '#aaa08e', skip=lambda x, r: math.hypot(x - 16.5, r - 21.0) < 1.38 or (abs(x - 47.5) < 0.38 and 19.0 < r < 22.6)
          or (abs(r - 20.4) < 0.38 and 45.2 < x < 49.8))
inlay_rose(16.5, 21.0)
for (xa, ra, xb, rb) in ((47.12, 19.0, 47.88, 22.6), (45.2, 20.02, 49.8, 20.78)):      # a cross of dark setts before St Brendan's
    xx = xa
    while xx < xb - 0.05:
        rr_ = ra
        while rr_ < rb - 0.05:
            if not (xa == 45.2 and 47.12 < xx + 0.1 < 47.88):
                k.box(xx + 0.015, rr_ + 0.015, -0.05, xx + 0.175, rr_ + 0.175, rng.uniform(-0.004, 0.01),
                      (shade('#7e786a', rng.uniform(0.88, 1.08)), 0.14), 'paving_setts', bevel=0.012)
            rr_ += 0.19
        xx += 0.19
# rings of setts: a dark band, pale between, a dark band
rr = 1.42
band = 0
while rr < 3.5:
    n = int(2 * math.pi * rr / 0.27)
    tone = '#857e70' if band in (0, 7) else ('#b4ab98' if band % 2 else '#aaa290')
    for i in range(n):
        a = (i + 0.5 * (band % 2)) / n * math.tau
        cx, cr = SQ[0] + math.cos(a) * rr, SQ[1] + math.sin(a) * rr
        k.box(cx - 0.11, cr - 0.11, -0.05, cx + 0.11, cr + 0.11, rng.uniform(-0.006, 0.01),
              (shade(tone, rng.uniform(0.88, 1.08)), 0.14), 'paving_setts', bevel=0.014)
    rr += 0.26
    band += 1

# Market Row, the avenue and the lanes: cobbles; the quay: flags along the fronts, a kerb, cobbles to the coping


def worn(x, r):
    n = math.sin(x * 1.3 + 0.7) * math.cos(r * 2.1 - x * 0.4) + math.sin(x * 0.37 + r * 0.9) + 0.4 * math.sin(x * 3.1 + r * 4.7)
    return n > 1.45




AV = (30.9, 33.1)                                    # the avenue's flagged way up the middle, quay to square
kerb(11.0, 53.0, 23.0)
cobble_area(11.0, 23.16, 53.0, 25.4, worn=worn, skip=lambda x, r: AV[0] - 0.12 < x < AV[1] + 0.12)
flags(AV[0], 23.16, AV[1], 29.6, '#aaa08e', w=(0.4, 0.7))
for (xa, xb) in ((AV[0] - 0.16, AV[0]), (AV[1], AV[1] + 0.16)):
    r = 23.16
    while r < 29.55:
        hh = rng.uniform(0.5, 0.9)
        k.box(xa + 0.01, r + 0.012, -0.02, xb - 0.01, min(29.6, r + hh) - 0.012, 0.05, (shade('#a89c88', rng.uniform(0.86, 1.04)), 0.1), 'kerb', bevel=0.012)
        r += hh
cobble_area(27.4, 25.4, AV[0] - 0.16, 29.6, worn=worn)
cobble_area(AV[1] + 0.16, 25.4, 37.4, 29.6, worn=worn)
for (x0, x1) in ((21.0, 22.6), (16.4, 16.8), (42.6, 43.2), (46.8, 47.2), (50.4, 53.0), (11.0, 11.6)):
    cobble_area(x0, 25.4, x1, 29.6, worn=worn)
flags(11.0, 29.6, 53.0, 30.45, '#a89c88', w=(0.32, 0.6), h=(0.2, 0.3), part='paving_flag', gap=0.015)
kerb(11.0, 53.0, 30.45)
cobble_area(11.0, 30.61, 53.0, QUAY + 0.62, tone='#a09684', worn=worn)
# the coping along the quay's edge: long dressed stones, a little proud
x = 11.6
while x < 50.4:
    w = rng.uniform(0.55, 0.95)
    k.box(x + 0.015, QUAY + 0.62, -0.04, min(50.4, x + w) - 0.015, QF + 0.04, 0.05,
          (shade('#a8a090', rng.uniform(0.88, 1.08)), 0.14), 'quay_coping', bevel=0.025)
    x += w
# the quay wall: coursed blocks down to the water, wet and weedy at the waterline
k.box(11.8, QF - 0.3, C.WZ - 0.9, 50.2, QF + 0.02, -0.04, ('#4a4a44', 0.1), 'quay_core')
z, i = -0.06, 0
while z > C.WZ - 0.8:
    hgt = rng.uniform(0.2, 0.25)
    x = 11.8 - (0.25 if i % 2 else 0.0)
    while x < 50.2:
        w = rng.uniform(0.42, 0.78)
        wet = max(0.0, min(1.0, (C.WZ + 0.08 - z) / 0.3))
        base = mix(shade(STONE, rng.uniform(0.78, 1.0)), '#3a463a', 0.55 * wet)
        k.box(max(11.8, x) + 0.02, QF + 0.02, z - hgt + 0.02, min(50.2, x + w) - 0.02, QF + 0.07 + rng.uniform(0, 0.015), z,
              (base, 0.16), 'quay_wall', bevel=0.02)
        x += w
    z -= hgt
    i += 1
for i in range(170):                                # weed and barnacles at the tide line
    x = rng.uniform(12.0, 50.0)
    if PX - 0.1 < x < PX + 1.1:
        continue
    k.blob(x, QF + 0.08, C.WZ + rng.uniform(0.02, 0.14), rng.uniform(0.06, 0.16), 0.03, rng.uniform(0.03, 0.06),
           (rng.choice(('#2a3a26', '#334428', '#3e4a2c', '#5a5a48')), 0.2), 'weed', segs=6)
# steps down to the water along the wall, an iron rail
SX0 = 44.2                                           # (east of the Crown & Anchor: the way down to the stilts below the quays)
for i in range(6):
    x0 = SX0 + i * 0.36
    zt = -0.02 - (i + 1) * 0.1
    k.box(x0, QF + 0.06, zt - 0.14, x0 + 0.36, QF + 0.62, zt, (shade('#a8a090', rng.uniform(0.85, 1.0)), 0.14), 'steps', bevel=0.02)
    k.box(x0, QF + 0.58, zt - 0.02, x0 + 0.36, QF + 0.62, zt, shade('#a8a090', 1.15), 'step_nose')
k.box(SX0 + 6 * 0.36, QF + 0.06, C.WZ - 0.5, SX0 + 6 * 0.36 + 0.12, QF + 0.66, -0.06, ('#7a7468', 0.15), 'steps_side')
for i in range(5):
    k.cyl(SX0 + 0.1 + i * 0.44, QF + 0.6, -0.12 - i * 0.12 * 1.2 * 0.85, 0.42 - i * 0.12 * 1.2 * 0.85, 0.02, A.IRON, 'rail', verts=6)
k.tube((SX0 + 0.1, QF + 0.6, 0.42), (SX0 + 0.1 + 4 * 0.44, QF + 0.6, 0.42 - 4 * 0.122), 0.022, A.IRON, 'rail', verts=6)
for LX in (18.6, 30.6):                             # iron ladders down the wall
    for dx in (-0.16, 0.16):
        k.tube((LX + dx, QF + 0.1, 0.32), (LX + dx, QF + 0.1, C.WZ - 0.4), 0.022, A.IRON, 'ladder', verts=6)
    zz = 0.2
    while zz > C.WZ - 0.3:
        k.cyl_x(LX - 0.16, LX + 0.16, QF + 0.1, zz, 0.016, 0.016, A.IRON, 'ladder', verts=6)
        zz -= 0.17
RINGS = (26.2, 35.8, 41.6, 48.8)
for rx in RINGS:                                    # mooring rings in the wall
    k.cyl_y(rx, QF + 0.05, QF + 0.1, -0.2, 0.09, 0.09, A.IRON, 'mooring_ring', verts=12)
    k.cyl_y(rx, QF + 0.04, QF + 0.11, -0.2, 0.05, 0.05, '#2a2a2a', 'mooring_ring_hole', verts=10)

# bollards (where they always stood), the pier, the fishing jetty and its boats
BOLL = (12.8, 17.5, 20.5, 24.5, 28.0, 33.5, 38.5, 43.0, 47.5)
for x in BOLL:
    k.cyl(x, QUAY + 0.75, 0.0, 0.08, 0.18, A.IRON, 'bollard', verts=12)
    k.cyl(x, QUAY + 0.75, 0.08, 0.4, 0.12, ('#2e3238', 0.1), 'bollard', verts=12)
    k.sphere(x, QUAY + 0.75, 0.42, 0.16, 0.09, '#2e3238', 'bollard', segs=12)
    k.solid(x - 0.2, QUAY + 0.55, x + 0.2, QUAY + 0.95)
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.9, SHIP_R + 0.0, z=0.02)
I.fishing_jetty(k, (FX, QUAY + 1), FLEN, 's', glow='#70e0a0')
for bx in (FX + 1.9, FX - 1.0):
    n0, l0 = len(k.parts), len(k.lights)
    W.boat(k, bx, QUAY + 2.3, length=2.2, sail='#e8e4dc' if bx > FX else None)
    C.sink(k, n0, C.WZ + 0.12, l0)
# rowboats on their lines along the wall (clear of the fleet's berths further out)


def line(a, b, sag=0.15, n=4):
    pts = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t))
           for t in (i / n for i in range(n + 1))]
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.013, '#b8a070', 'mooring_line', verts=4)


for (x0, x1, cr, hull, ring) in ((25.0, 27.0, QF + 0.75, '#2a4a6a', 26.2), (34.4, 36.3, QF + 0.8, '#6a3a2a', 35.8),
                                 (47.6, 49.5, QF + 0.85, '#7a6a4a', 48.8)):
    since, lsince = len(k.parts), len(k.lights)
    W.rowboat(k, x0, x1, cr, beam=0.8, hull=hull, inside=A.WOOD_DD)
    C.sink(k, since, C.WZ + 0.12, lights_since=lsince)
    line((x1 - 0.05, cr, C.WZ + 0.42), (ring, QF + 0.06, -0.2), sag=0.1)
Q.sloop(k, 37.6, 42.3, QF + 1.1, C.WZ, beam=1.08)          # a sloop alongside, her sail furled on the boom
line((42.3, QF + 1.1, C.WZ + 0.65), (43.0, QUAY + 0.75, 0.38), sag=0.2)
line((37.6, QF + 1.1, C.WZ + 0.65), (38.5, QUAY + 0.75, 0.38), sag=0.2)
k.cyl(9.2, QUAY + 3.4, C.WZ - 0.1, C.WZ + 0.22, 0.16, '#c03a2e', 'buoy', verts=14)          # a buoy off the point
k.cyl(9.2, QUAY + 3.4, C.WZ + 0.08, C.WZ + 0.16, 0.165, '#ece4d4', 'buoy', verts=14)
k.cone(9.2, QUAY + 3.4, C.WZ + 0.22, C.WZ + 0.38, 0.08, 0.02, '#2e2e34', 'buoy', verts=10)

# ---- life on the quay ----------------------------------------------------------------------------------------------
for (x, r) in ((30.0, QUAY + 0.2), (36.5, QUAY + 0.2), (41.0, QUAY + 0.25)):          # cargo, where it always stood
    A.crate(k, x, r, s=0.62, tone=A.WOOD_L)
A.crate(k, 30.12, QUAY + 0.3, s=0.46, z0=0.62, tone=shade(A.WOOD_L, 0.88), solid=False, contents='apples')
for (x, r) in ((31.0, QUAY + 0.25), (40.2, QUAY + 0.3), (26.6, QUAY + 0.2)):
    A.barrel(k, x, r, h=0.8, radius=0.3)          # (crates and barrels block their own tiles: the quay runs on past them)
V.sacks(k, 36.95, QUAY + 0.55, n=3, col=('#c8b890', '#d8c8a0', '#b8a880'))
for (x, r) in ((15.0, 31.6), (19.0, 31.6), (25.6, 31.6), (34.0, 31.6), (42.0, 31.6), (47.6, 31.6)):
    W.lantern_post(k, x, r, h=2.3, energy=22)
# an anchor laid on the cobbles, coils of rope, lobster pots, a net drying over a barrel, gulls, a dropped lid
AX, AR = 35.2, QUAY - 0.8
k.tube((AX - 0.55, AR, 0.07), (AX + 0.55, AR, 0.07), 0.04, '#2e2e34', 'anchor', verts=8)
k.tube((AX - 0.5, AR - 0.3, 0.06), (AX - 0.5, AR + 0.3, 0.06), 0.035, '#2e2e34', 'anchor', verts=8)
for s in (-1, 1):
    k.tube((AX + 0.55, AR, 0.07), (AX + 0.75, AR + s * 0.32, 0.07), 0.035, '#2e2e34', 'anchor', verts=8)
    k.blob(AX + 0.78, AR + s * 0.36, 0.07, 0.09, 0.06, 0.03, '#2e2e34', 'anchor', segs=8)
k.cyl_y(AX - 0.68, AR - 0.06, AR + 0.06, 0.1, 0.1, 0.1, '#2e2e34', 'anchor', verts=10)
for (cx, cr, n) in ((32.3, QUAY + 0.5, 3), (39.3, QUAY + 0.55, 2), (13.9, QUAY + 0.45, 3)):
    for j in range(n):
        W.annulus(k, cx, cr, 0.08, 0.24 - j * 0.02, j * 0.06, j * 0.06 + 0.06, ('#b8a070', 0.25), 'rope', segs=20)
for (px, pr) in ((48.6, QUAY + 0.45), (49.2, QUAY + 0.6), (16.2, QUAY + 0.5)):
    k.box(px - 0.26, pr - 0.17, 0.0, px + 0.26, pr + 0.17, 0.05, (A.WOOD, 0.14), 'pot_base')
    k.cyl_x(px - 0.26, px + 0.26, pr, 0.08, 0.17, 0.2, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
    for dx in (-0.2, 0.0, 0.2):
        k.cyl_x(px + dx - 0.015, px + dx + 0.015, pr, 0.08, 0.175, 0.205, A.WOOD_D, 'pot_hoop', verts=10)
for i in range(6):                                   # floats in a heap
    k.sphere(48.0 + (i % 3) * 0.13, QUAY + 0.2 + (i // 3) * 0.12, 0.08, 0.075, 0.07, rng.choice(('#e05a30', '#f0f0e8', '#e05a30')), 'float', segs=10)


def gull(x, r, z=0.0, turn=1):
    k.blob(x, r, z + 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(x + 0.08 * turn, r, z + 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
    k.cone(x + 0.14 * turn, r, z + 0.17, z + 0.19, 0.02, 0.0, '#e0a030', 'gull', verts=4)
    k.blob(x - 0.04 * turn, r, z + 0.13, 0.08, 0.05, 0.02, '#8a9098', 'gull', segs=8)


gull(23.6, QUAY + 0.5)
gull(36.0, QUAY + 0.35, turn=-1)
gull(28.0, QUAY + 0.75, z=0.48, turn=-1)            # on a bollard
gull(47.5, QUAY + 0.75, z=0.48)
k.box(43.3, QUAY + 0.15, 0.0, 43.75, QUAY + 0.33, 0.03, (A.WOOD_L, 0.18), 'crate_lid')
A.bucket(k, 33.0, QUAY + 0.35)

# ---- the waterfront: warehouses, the harbour office, the Crown & Anchor, houses -------------------------------------
SMOKE = []


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 1.05) * C45, 3)])


def coursed(x0, x1, z0, z1, rf, tone, skip=(), hrange=(0.2, 0.26), wrange=(0.36, 0.58), part='stone_block', deep=0.0):
    """Dressed stone in courses on a face at row rf (skip: openings (xa, xb, za, zb) to leave clear)."""
    zz, i = z0, 0
    while zz < z1 - 0.05:
        h = min(rng.uniform(*hrange), z1 - zz)
        x = x0 + (0.0 if i % 2 else 0.22)
        while x < x1:
            w = rng.uniform(*wrange)
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.06 and not any(sa < (a + b) / 2 < sb and sz0 < zz + h / 2 < sz1 for (sa, sb, sz0, sz1) in skip):
                k.box(a + 0.015, rf - 0.02, zz + 0.015 + deep, b - 0.015, rf + 0.012 + rng.uniform(0, 0.012) + deep, min(z1, zz + h) - 0.015 - deep,
                      (shade(tone, rng.uniform(0.84, 1.1)), 0.16), part, bevel=0.012 + deep)
            x += w
        zz += h
        i += 1


FQ = 29.6                                            # the waterfront's ground-floor fronts
# the west terrace: the bonded store (a warehouse, weatherboarded, its hoist over the loft door), Tallow & Sons the
# chandlers under their bay of glass, a tall narrow house by the lane
Q.harbour_house(k, 11.6, 16.4, FQ, 25.4, 3.35, 1.5, '#3a4256', '#7a5a3e', door_x=14.0, door_w=1.3, boards=True, hoist=14.9,
                win_down=[(15.7, 0.62)], chimney=None)
V.board_sign(k, 'BONDED STORE', 'AlegreyaSC-Bold', 12.85, FQ + Q.J + 0.04, 2.1, size=0.2)
smoke(Q.harbour_house(k, 16.4, 18.75, FQ, 25.8, 3.25, 1.55, W.ROOF_PURPLE, '#d4dccc', door_x=18.35, door_w=0.62, shop=(16.7, 17.85),
                      win_up=[(17.0, 1.92), (18.15, 1.92)], win_up2=[(17.55, 2.62)], chimney=16.9, sign=(16.55, 2.15, 'compass'),
                      lanterns=(18.0,)), 16.9)
V.board_sign(k, 'TALLOW & SONS', 'IMFellEnglishSC-Regular', 17.3, FQ + 0.03, 1.64, size=0.13, pad=0.06)
smoke(Q.harbour_house(k, 18.75, 21.0, FQ, 25.8, 3.75, 1.7, '#2e5a4a', '#ecdcbc', ground='plaster', door_x=20.4,
                      win_down=[(19.35, 0.62)], win_up=[(19.4, 1.92), (20.45, 1.92)], win_up2=[(19.9, 2.9)], chimney=19.1), 19.1)
# the harbour office: dressed stone below, three floors, its board between the first-floor windows
smoke(Q.harbour_house(k, 22.6, 27.4, FQ, 25.4, 3.65, 1.6, W.ROOF_GREEN, '#e2c88e', door_x=25.0, door_w=0.95,
                      win_down=[(23.5, 0.62), (26.5, 0.62)], win_up=[(23.3, 1.92), (26.7, 1.92)],
                      win_up2=[(23.5, 2.82), (25.0, 2.82), (26.5, 2.82)], chimney=26.9, lanterns=(24.3, 25.7), dormers=(25.0,)), 26.9)
V.board_sign(k, 'HARBOUR OFFICE', 'IMFellEnglishSC-Regular', 25.0, FQ + Q.J + 0.04, 1.98, size=0.17, board='#1e3a2e')
# the east terrace: the Crown & Anchor (tall, its sign out, benches either side of the door), the fishmonger under a
# striped awning, a narrow house with nets drying in front
smoke(Q.harbour_house(k, 37.4, 42.6, FQ, 25.0, 3.65, 1.6, '#6a2a22', '#e6d6b4', door_x=40.0, door_w=0.95,
                      win_down=[(38.3, 0.62), (41.7, 0.62)], win_up=[(38.1, 1.92), (41.9, 1.92)],
                      win_up2=[(38.3, 2.82), (40.0, 2.82), (41.7, 2.82)], chimney=38.0, sign=(42.35, 2.25, 'mug'),
                      lanterns=(39.4, 40.6), dormers=(40.0,)), 38.0)
V.board_sign(k, 'THE CROWN & ANCHOR', 'Rye-Regular', 40.0, FQ + Q.J + 0.04, 1.98, size=0.17)
W.bench(k, 37.4, 38.6, 30.4)                       # benches out front at the corners, the door clear between them
W.bench(k, 41.4, 42.6, 30.4)
k.solid(37.4, 30.2, 38.6, 30.7)
k.solid(41.4, 30.2, 42.6, 30.7)
Q.chalkboard(k, 38.85, FQ + 0.2)
smoke(Q.harbour_house(k, 42.6, 46.8, FQ, 25.6, 2.85, 1.35, W.ROOF_RED, '#e4c4ac', ground='plaster', door_x=46.15,
                      shop=(42.95, 45.25), awning=('#b23a34', '#ece0c8'), win_up=[(43.4, 1.92), (44.6, 1.92), (45.9, 1.92)],
                      chimney=43.3), 43.3)
Q.fish_stall(k, 42.95, 45.25, FQ + 0.12)
Q.fish_baskets(k, 45.55, FQ + 0.45)
smoke(Q.harbour_house(k, 46.8, 50.4, FQ, 26.0, 3.3, 1.5, W.ROOF_SLATE, '#d4dccc', door_x=48.8, win_down=[(47.6, 0.62)],
                      win_up=[(47.6, 1.92), (49.7, 1.92)], win_up2=[(48.65, 2.62)], chimney=50.0, sign=(50.2, 2.15, 'compass')), 50.0)
Q.net_rack(k, 49.3, 50.7, FQ + 0.65)
# against the fronts: sacks, barrels, crates, rope and floats, tubs of flowers (each on its own tile; the quay stays open)
Q.sacks(k, 11.95, FQ + 0.25)
A.barrel(k, 15.4, FQ + 0.24, h=0.72, radius=0.24)          # (the sailor's beat along the fronts stays open)
A.barrel(k, 15.92, FQ + 0.22, h=0.62, radius=0.22, tone=shade(A.WOOD, 0.85))
Q.rope_coils(k, 16.95, FQ + 0.3)
Q.floats(k, 17.55, FQ + 0.12)
Q.tub(k, 20.0, FQ + 0.26, ('#e07030', '#f0d040'))
Q.tub(k, 23.75, FQ + 0.42, ('#e04060', '#f0d040'))
Q.tub(k, 26.25, FQ + 0.42, ('#a060d0', '#f0f0f0'))
Q.crate_stack(k, 47.0, FQ + 0.2)
for (x, r) in ((23.75, 30.0), (26.25, 30.0)):
    k.solid(x - 0.24, r - 0.3, x + 0.24, r + 0.4)
# the avenue up from the quay: its sides stacked with the waterfront's trade (one tile in on each side), the way open
for (x, r, what) in ((27.55, 26.2, 'barrels'), (27.6, 27.55, 'crates'), (27.75, 28.8, 'sacks'), (36.65, 26.1, 'crates'),
                     (36.6, 27.4, 'barrels'), (36.95, 28.75, 'tub')):
    if what == 'barrels':
        Q.barrel_group(k, x, r)
    elif what == 'crates':
        Q.crate_stack(k, x, r)
    elif what == 'sacks':
        Q.sacks(k, x + 0.3, r, n=4)
        A.barrel(k, x + 0.25, r + 0.55, h=0.66, radius=0.22, tone=shade(A.WOOD, 0.9))
    else:
        Q.tub(k, x, r, ('#e04060', '#f0d040'))
    k.solid(x - 0.1 if x < 30 else x - 0.2, r - 0.25, x + 0.8 if x < 30 else x + 0.3, r + 0.6)
Q.cat(k, 27.95, 27.75, 0.38)                          # asleep on the crates
Q.lobster_pots(k, [(28.9, 25.65)])
k.solid(28.6, 25.4, 29.2, 25.9)

# Market Row, the street behind the waterfront: carts and barrels, lanterns, washing across the lane
for (x, r) in ((13.5, 22.6), (21.0, 22.6), (44.5, 22.6)):
    W.lantern_post(k, x, r, h=2.3, energy=20)
A.barrel(k, 17.2, 24.6, h=0.8, radius=0.3)
A.barrel(k, 17.8, 24.8, h=0.8, radius=0.3)
A.barrel(k, 17.5, 24.75, h=0.6, radius=0.24, upright=True, tone=A.WOOD_D)
A.crate(k, 46.4, 24.7, s=0.6, tone=A.WOOD_L)
A.crate(k, 46.45, 24.75, s=0.44, z0=0.6, tone=shade(A.WOOD_L, 0.9), solid=False, contents='apples')
k.solid(16.8, 24.3, 18.2, 25.2)
k.solid(46.0, 24.3, 46.9, 25.2)


def washing(a, b, cols):
    """A line across a lane between two upstairs windows, shirts and sheets pegged on it."""
    line(a, b, sag=0.18, n=6)
    n = len(cols)
    for i, col in enumerate(cols):
        t = (i + 1) / (n + 1)
        x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        z = a[2] + (b[2] - a[2]) * t - 0.18 * math.sin(math.pi * t)
        wide = rng.uniform(0.16, 0.3)
        k.box(x - wide / 2, r - 0.01, z - rng.uniform(0.3, 0.45), x + wide / 2, r + 0.01, z, (col, 0.1), 'washing')


washing((21.05, 27.6, 2.45), (22.55, 27.6, 2.35), ('#e8e4dc', '#5a7aa0', '#e8c8c0'))
washing((42.65, 28.0, 2.2), (43.15, 28.0, 2.15), ('#e8e4dc',))

# ---- the grand square: the fountain, the statue, stalls, trees, benches -------------------------------------------
W.fountain(k, SQ[0], SQ[1], rad=1.25)
k.cyl(SQ[0], SQ[1], -0.03, 0.06, 1.42, (shade(STONE, 0.9), 0.14), 'basin_step', verts=32)     # a step round the basin
for i in range(5):                                   # pigeons on the step
    a = rng.uniform(0.2, 2.9)
    px, pr = SQ[0] + math.cos(a) * 1.55, SQ[1] + math.sin(a) * 1.4
    k.blob(px, pr, 0.08, 0.07, 0.05, 0.05, rng.choice(('#8a8e98', '#9a9ca4', '#6a6e78')), 'pigeon', segs=8)
    k.sphere(px + 0.06, pr, 0.14, 0.035, 0.035, '#7a7e88', 'pigeon', segs=6)
W.statue(k, 32.0, 22.4)
k.solid(31.4, 21.9, 32.6, 22.9)


def stall(x0, x1, awning, goods, extra=None, extra_at=()):
    W.market_stall(k, x0, x1, 21.2, 22.0, awning=awning, goods=goods)
    for (bx, br) in extra_at:                                              # baskets and crates between the stalls
        if rng.random() < 0.7:
            k.cyl(bx, br, 0.0, 0.26, 0.17, ('#a88a58', 0.3), 'basket', verts=12)
            k.cyl(bx, br, 0.24, 0.27, 0.175, '#7a603a', 'basket_rim', verts=12)
            for _ in range(4):
                k.sphere(bx + rng.uniform(-0.08, 0.08), br + rng.uniform(-0.06, 0.06), 0.3, 0.055, 0.05,
                         rng.choice(extra or ('#c02020', '#e0a020', '#60a030')), 'produce', segs=8)
        else:
            A.crate(k, bx - 0.22, br - 0.2, s=0.4, tone=A.WOOD_L, solid=False, contents='apples')


stall(23.2, 25.2, ('#2a6a4a', '#e8e4d0'), 'produce', extra_at=((25.8, 21.45),))
stall(26.4, 28.4, ('#e8e4d0', '#a03a2e'), 'fish', extra=('#a8b8c0', '#c8a080', '#8a9aa0'))
stall(35.6, 37.6, ('#c8a040', '#2a4a6a'), 'produce', extra=('#c8642a', '#a0402a', '#e0b040'), extra_at=((38.2, 21.5),))
W.market_stall(k, 38.8, 40.8, 21.2, 22.0, awning=('#e8e4d0', '#2a6a4a'), goods=None)          # the bookstall: books, not baskets
for i in range(9):
    bx = 39.0 + (i % 5) * 0.34
    br = 21.35 + (i // 5) * 0.28
    k.box(bx, br, 0.86, bx + 0.26, br + 0.2, 0.86 + rng.uniform(0.04, 0.09), (rng.choice(('#6a2a2a', '#2a4a6a', '#3a5a3a', '#7a6a3a', '#4a3a5a')), 0.1), 'books')
W.bunting(k, (23.0, 14.4, 2.3), (41.0, 14.4, 2.3), sag=0.6, cols=('#2e8a5a', '#e8e4d0', GOLD, '#2a4a8a'))
W.bunting(k, (23.0, 14.4, 2.3), (23.0, 21.0, 2.2), sag=0.4, cols=('#2e8a5a', GOLD))
W.bunting(k, (41.0, 14.4, 2.3), (41.0, 21.0, 2.2), sag=0.4, cols=('#2e8a5a', GOLD))
for (x, r) in ((23.0, 14.4), (41.0, 14.4), (23.0, 21.0), (41.0, 21.0)):
    W.lantern_post(k, x, r, h=2.5, energy=30)
for (x0, r) in ((26.0, 16.0), (36.6, 16.0)):
    W.bench(k, x0, x0 + 1.4, r)
    k.solid(x0, r - 0.2, x0 + 1.4, r + 0.3)
HK.cat(k, 37.05, 15.95, 0.43)                         # asleep on a bench
for (x, r) in ((24.4, 15.2), (39.6, 15.2), (24.4, 19.6), (39.6, 19.6)):
    k.cyl(x, r, -0.04, 0.08, 0.6, (shade(STONE, 0.85), 0.14), 'bed_kerb', verts=20)
    k.cyl(x, r, 0.0, 0.1, 0.52, ('#3a2c20', 0.3), 'soil', verts=20)
    for i in range(12):                              # flowers round its foot
        a = i / 12 * math.tau + rng.uniform(-0.15, 0.15)
        with k.foliage('leaf'):
            k.blob(x + math.cos(a) * 0.38, r + math.sin(a) * 0.36, 0.14, 0.09, 0.08, 0.06, ('#3a6a30', 0.2), 'bed_plant', segs=7)
        k.sphere(x + math.cos(a) * 0.38, r + math.sin(a) * 0.36 + 0.03, 0.19, 0.04, 0.04, rng.choice(('#e8e4f0', '#f0c040', '#e05a8a')), 'flower', segs=6)
    W.tree(k, x, r, h=2.9, tone='#3a6a3a')
    k.solid(x - 0.45, r - 0.45, x + 0.45, r + 0.45)
W.cart(k, 34.6, 24.2)
k.solid(33.4, 23.8, 35.2, 24.6)
# more life round the square's edges: a flower stall before the Exchange, a candle-seller by St Brendan's, a cart of
# flowers by the palace gate, tubs, a bench outside the church
W.market_stall(k, 12.0, 13.8, 19.35, 19.95, awning=('#e8e4d0', '#c84a6a'), goods='produce')
W.market_stall(k, 49.6, 51.6, 21.35, 21.95, awning=('#2a4a6a', '#e8e4d0'), goods=None)
for i in range(10):                                   # candles and posies on the candle-seller's counter
    cx_ = 49.8 + (i % 5) * 0.36
    cr_ = 21.48 + (i // 5) * 0.26
    if i % 2:
        k.cyl(cx_, cr_, 0.86, 0.86 + rng.uniform(0.12, 0.22), 0.04, '#f0e8d0', 'candle', verts=8)
    else:
        k.sphere(cx_, cr_, 0.93, 0.07, 0.06, rng.choice(('#e05a8a', '#f0d040', '#e8e8f0')), 'flower', segs=6)
W.bench(k, 44.0, 45.4, 22.4)
k.solid(44.0, 22.2, 45.4, 22.7)
W.cart(k, 26.6, 13.0)
for i in range(8):                                    # heaped with flowers
    k.sphere(26.3 + rng.uniform(-0.4, 0.4), 13.0 + rng.uniform(-0.2, 0.2), 0.7, 0.08, 0.07, rng.choice(('#e05a8a', '#f0d040', '#e8e8f0', '#a070d0')), 'flower', segs=6)
for (x, r, fl) in ((14.5, 19.45, ('#e04060', '#f0d040')), (18.6, 19.45, ('#a060d0', '#f0f0f0')), (43.6, 19.4, ('#e07030', '#f0d040')),
                   (51.3, 19.4, ('#e04060', '#f0f0f0')), (36.7, 12.7, ('#e04060', '#f0d040')), (22.3, 12.7, ('#a060d0', '#f0f0f0'))):
    Q.tub(k, x, r, fl)
    k.solid(x - 0.2, r - 0.2, x + 0.2, r + 0.2)
W.street_clutter(k, (21.8, 12.4, 42.8, 23.4), seed=811, straw=[(23.0, 22.0, 29.0, 22.9), (35.4, 22.0, 41.0, 22.9)],
                 chalk=(29.0, 20.4))           # weeds, drains, a cracked flag, straw by the stalls, hopscotch
W.street_clutter(k, (11.2, 23.2, 52.8, 33.5), seed=812, density=0.6)


# ---- the Merchants' Exchange: steps to a portico of fluted columns, the pediment and its gilt clock ----------------
def column(cx, cr, z0, z1, rad=0.16, tone=ASHLAR):
    k.box(cx - 0.24, cr - 0.24, z0, cx + 0.24, cr + 0.24, z0 + 0.1, (shade(tone, 0.95), 0.1), 'column_base', bevel=0.01)
    k.cyl(cx, cr, z0 + 0.1, z0 + 0.18, rad + 0.05, (tone, 0.1), 'column_base', verts=16)
    k.cone(cx, cr, z0 + 0.18, z1 - 0.12, rad, rad * 0.86, (tone, 0.1), 'column', verts=16)
    for i in range(5):                               # flutes on the face you see
        a = math.pi / 2 + (i - 2) * 0.42
        fx, fr = cx + math.cos(a) * rad * 0.97, cr + math.sin(a) * rad * 0.97
        k.box(fx - 0.012, fr - 0.008, z0 + 0.24, fx + 0.012, fr + 0.004, z1 - 0.18, shade(tone, 0.7), 'column_flute')
    k.cone(cx, cr, z1 - 0.12, z1 - 0.04, rad * 0.9, rad + 0.08, (tone, 0.1), 'capital', verts=16)
    k.box(cx - 0.25, cr - 0.25, z1 - 0.04, cx + 0.25, cr + 0.25, z1 + 0.04, (shade(tone, 1.05), 0.1), 'capital', bevel=0.008)


def arched_window(cx, rf, z0, w=0.62, h=1.2, frame='#e8e0cc', stone=ASHLAR, glow=True):
    """A tall window with a round head, glazing bars, an architrave and a keystone."""
    k.box(cx - w / 2 - 0.09, rf, z0 - 0.08, cx + w / 2 + 0.09, rf + 0.05, z0 + h, (shade(stone, 1.08), 0.1), 'architrave')
    k.cyl_y(cx, rf, rf + 0.05, z0 + h, w / 2 + 0.09, w / 2 + 0.09, (shade(stone, 1.08), 0.1), 'architrave', verts=16)
    k.box(cx - w / 2, rf + 0.03, z0, cx + w / 2, rf + 0.07, z0 + h, '#4a3218', 'window_glass', emit=(W.GLOW, 0.85 if glow else 0.0))
    k.cyl_y(cx, rf + 0.03, rf + 0.07, z0 + h, w / 2, w / 2, '#4a3218', 'window_glass', emit=(W.GLOW, 0.85 if glow else 0.0), verts=16)
    bars = [(cx - 0.015, rf + 0.07, z0, cx + 0.015, rf + 0.085, z0 + h + w / 2)]
    for j in range(1, 4):
        zz = z0 + h * j / 4
        bars.append((cx - w / 2, rf + 0.07, zz - 0.012, cx + w / 2, rf + 0.085, zz + 0.012))
    k.boxes(bars, frame, 'window_frame')
    k.box(cx - 0.07, rf + 0.02, z0 + h + w / 2 + 0.02, cx + 0.07, rf + 0.1, z0 + h + w / 2 + 0.2, (shade(stone, 1.2), 0.1), 'keystone')
    k.box(cx - w / 2 - 0.14, rf, z0 - 0.16, cx + w / 2 + 0.14, rf + 0.14, z0 - 0.06, (shade(stone, 1.05), 0.1), 'sill')
    if glow:
        k.point_light(cx, rf + 0.6, z0 + h / 2, '#ffc070', 7, radius=0.25, group='flicker')


def ns_roof(cx, w, ra, r_meet, ze, apex, roof, part='roof'):
    """A small gabled roof whose ridge runs back from a front gable (a portico, a porch): two slopes of shingle courses
    from the eaves (x = cx ± w/2) to the ridge, front row ra, meeting the main roof at r_meet."""
    tones = [shade(roof, f) for f in (0.88, 0.95, 1.0, 1.06)]
    for s in (-1, 1):
        xe = cx + s * w / 2
        k.quads([((xe, ra, ze), (cx, ra, apex), (cx, r_meet, apex), (xe, r_meet, ze))], shade(roof, 0.5), 'roof_deck')
        n = max(4, int(abs(apex - ze) / 0.2))
        for i in range(n):
            f0, f1 = i / n, min(1.0, (i + 1.3) / n)
            xa, za = xe + (cx - xe) * f0, ze + (apex - ze) * f0 + 0.03
            xb, zb = xe + (cx - xe) * f1, ze + (apex - ze) * f1 + 0.005
            k.quads([((xa, ra, za), (xb, ra, zb), (xb, r_meet, zb), (xa, r_meet, za))], rng.choice(tones), part)
            k.quads([((xa, ra, za + 0.002), (xa + (cx - xe) * 0.03, ra, za + 0.006), (xa + (cx - xe) * 0.03, r_meet, za + 0.006),
                      (xa, r_meet, za + 0.002))], shade(roof, 0.58), part)
    k.tube((cx, ra + 0.02, apex + 0.03), (cx, r_meet, apex + 0.03), 0.06, shade(roof, 0.66), 'ridge', verts=8)


EXF = EX[3] - 0.45                                   # the hall's front wall, behind the portico
EZ = 0.42                                            # the podium
ECX = (EX[0] + EX[1]) / 2
k.box(EX[0], EX[2], 0.0, EX[1], EX[3] + 0.1, EZ, (shade(ASHLAR, 0.85), 0.14), 'podium', bevel=0.02)
coursed(EX[0], EX[1], 0.02, EZ, EX[3] + 0.1, shade(ASHLAR, 0.85), hrange=(0.2, 0.21), wrange=(0.6, 0.9))
for i in range(3):                                   # three steps up to it across the whole front
    ra, rb = EX[3] + 0.1 + i * 0.2, EX[3] + 0.3 + i * 0.2
    zt = EZ - (i + 1) * EZ / 3.4
    x0_, x1_ = EX[0] + 0.25 + i * 0.12, EX[1] - 0.25 - i * 0.12
    k.box(x0_, EX[3] + 0.05, -0.02, x1_, rb, zt, (shade(ASHLAR, rng.uniform(0.92, 1.0)), 0.12), 'steps', bevel=0.012)
    k.box(x0_, rb - 0.04, zt - 0.03, x1_, rb, zt, shade(ASHLAR, 1.12), 'step_nose')
k.box(EX[0] + 0.1, EX[2] + 0.1, EZ, EX[1] - 0.1, EXF, 3.5, (ASHLAR, 0.12), 'ex_wall')
coursed(EX[0] + 0.1, EX[1] - 0.1, EZ, 1.5, EXF, ASHLAR, hrange=(0.26, 0.27), wrange=(0.7, 1.0), part='rustication', deep=0.02,
        skip=[(ECX - 0.75, ECX + 0.75, 0.0, 2.2)] + [(wx - 0.45, wx + 0.45, 0.0, 3.0) for wx in (13.8, 15.6, 18.4, 20.2)])
coursed(EX[0] + 0.1, EX[1] - 0.1, 1.5, 3.32, EXF, shade(ASHLAR, 1.04), hrange=(0.3, 0.31), wrange=(0.8, 1.2), part='ashlar',
        skip=[(ECX - 0.75, ECX + 0.75, 0.0, 2.6)] + [(wx - 0.45, wx + 0.45, 0.0, 3.0) for wx in (13.8, 15.6, 18.4, 20.2)])
k.box(EX[0] + 0.05, EXF - 0.02, 1.48, EX[1] - 0.05, EXF + 0.08, 1.56, (shade(ASHLAR, 1.1), 0.1), 'string_course')
for wx in (13.8, 15.6, 18.4, 20.2):
    arched_window(wx, EXF + 0.02, 0.8, w=0.6, h=1.45)
# the door: tall, panelled, in a pedimented doorcase, brass furniture
k.box(ECX - 0.62, EXF, EZ, ECX + 0.62, EXF + 0.08, 2.35, (shade(ASHLAR, 1.1), 0.1), 'doorcase')
k.box(ECX - 0.5, EXF + 0.04, EZ, ECX + 0.5, EXF + 0.1, 2.15, '#2a3a2e', 'door')
for (xa, xb) in ((ECX - 0.44, ECX - 0.04), (ECX + 0.04, ECX + 0.44)):
    for (za, zb) in ((EZ + 0.12, EZ + 0.8), (EZ + 0.92, 2.05)):
        k.box(xa, EXF + 0.1, za, xb, EXF + 0.12, zb, shade('#2a3a2e', 1.25), 'door_panel')
k.sphere(ECX - 0.1, EXF + 0.13, 1.25, 0.035, 0.035, W.BRASS, 'door_knob', segs=8)
k.sphere(ECX + 0.1, EXF + 0.13, 1.25, 0.035, 0.035, W.BRASS, 'door_knob', segs=8)
k.box(ECX - 0.5, EXF + 0.04, 2.15, ECX + 0.5, EXF + 0.11, 2.42, '#4a3218', 'window_glass', emit=(W.GLOW, 0.8))     # the fanlight
k.poly([(ECX - 0.78, EXF + 0.12, 2.42), (ECX + 0.78, EXF + 0.12, 2.42), (ECX, EXF + 0.12, 2.78)], (shade(ASHLAR, 1.12), 0.1), 'doorcase')
k.box(ECX - 0.8, EXF + 0.02, 2.36, ECX + 0.8, EXF + 0.16, 2.44, (shade(ASHLAR, 1.15), 0.1), 'doorcase')
# the portico: six columns, the entablature, a cornice on dentils, the pediment
PR = EX[3] - 0.05
ZC = 3.15
for i in range(6):
    column(EX[0] + 0.7 + (EX[1] - EX[0] - 1.4) * i / 5, PR, EZ, ZC)
k.box(EX[0] + 0.3, PR - 0.32, ZC + 0.04, EX[1] - 0.3, PR + 0.28, ZC + 0.26, (shade(ASHLAR, 1.06), 0.1), 'architrave', bevel=0.01)
k.box(EX[0] + 0.3, PR - 0.32, ZC + 0.26, EX[1] - 0.3, PR + 0.26, ZC + 0.6, (ASHLAR, 0.1), 'frieze')
V.board_sign(k, "MERCHANTS' EXCHANGE", 'AlegreyaSC-Bold', ECX, PR + 0.26, ZC + 0.3, size=0.22, board=shade(ASHLAR, 0.98),
             ink=GOLD, trim=shade(ASHLAR, 1.1), pad=0.2)
x = EX[0] + 0.32
dent = []
while x < EX[1] - 0.34:
    dent.append((x, PR + 0.26, ZC + 0.56, x + 0.06, PR + 0.34, ZC + 0.64))
    x += 0.12
k.boxes(dent, shade(ASHLAR, 1.12), 'dentil')
ZE = ZC + 0.76
k.box(EX[0] + 0.15, PR - 0.32, ZC + 0.64, EX[1] - 0.15, PR + 0.42, ZE, (shade(ASHLAR, 1.12), 0.1), 'cornice', bevel=0.012)
APEX = ZE + 1.25
k.poly([(EX[0] + 0.3, PR + 0.2, ZE), (EX[1] - 0.3, PR + 0.2, ZE), (ECX, PR + 0.2, APEX - 0.1)], (shade(ASHLAR, 0.96), 0.1), 'tympanum')
for s in (-1, 1):                                    # the raking cornices
    k.tube((ECX + s * (ECX - EX[0] - 0.1), PR + 0.3, ZE + 0.04), (ECX, PR + 0.3, APEX), 0.075, (shade(ASHLAR, 1.12), 0.1), 'cornice', verts=4,
           smooth=False)
# the gilt clock in the tympanum, with garlands either side
k.cyl_y(ECX, PR + 0.18, PR + 0.26, ZE + 0.5, 0.36, 0.36, (GOLD, 0.05), 'clock_rim', verts=24)
k.cyl_y(ECX, PR + 0.2, PR + 0.3, ZE + 0.5, 0.29, 0.29, '#f0e8d0', 'clock_face', emit=('#fff0c0', 0.3), verts=24)
for i in range(12):
    a = i / 12 * math.tau
    k.box(ECX + math.cos(a) * 0.24 - 0.012, PR + 0.3, ZE + 0.5 + math.sin(a) * 0.24 - 0.012,
          ECX + math.cos(a) * 0.24 + 0.012, PR + 0.31, ZE + 0.5 + math.sin(a) * 0.24 + 0.012, '#2a2418', 'clock_mark')
k.tube((ECX, PR + 0.31, ZE + 0.5), (ECX + 0.12, PR + 0.31, ZE + 0.58), 0.014, '#2a2418', 'clock_hand', verts=4)
k.tube((ECX, PR + 0.31, ZE + 0.5), (ECX - 0.03, PR + 0.31, ZE + 0.7), 0.01, '#2a2418', 'clock_hand', verts=4)
for s in (-1, 1):
    for j in range(7):
        t = j / 6
        k.sphere(ECX + s * (0.5 + t * 1.4), PR + 0.24, ZE + 0.42 - 0.22 * math.sin(math.pi * t), 0.06, 0.05, ('#3a6a3a', 0.2), 'garland', segs=6)
# the roofs: the hall's (slate courses, its ridge along the street) and the portico's running back into it
EOVER = 0.32
rm_e, zr_e = W._gable_roof(k, EX[0], EX[1], EX[2], EXF, 3.5, 1.7, '#4a5a66', over=EOVER)
# a cupola on the ridge: a drum of arched lights under a leaded dome, a gilt ball on top
for cx_ in (ECX - 3.2, ECX + 3.2):
    W.chimney_stack(k, cx_, rm_e - 0.35, rm_e + 0.05, 3.5, zr_e + 0.8, brick='#9a9284', mortar='#7a7468', pots=2)
CUZ = zr_e - 0.15
k.box(ECX - 0.55, rm_e - 0.55, CUZ - 0.4, ECX + 0.55, rm_e + 0.55, CUZ + 0.15, (shade(ASHLAR, 0.95), 0.12), 'cupola_base')
k.cyl(ECX, rm_e, CUZ + 0.15, CUZ + 0.75, 0.42, (shade(ASHLAR, 1.05), 0.12), 'cupola', verts=16)
for i in range(4):
    a = math.pi / 2 + (i - 1.5) * 0.55
    wx_, wr_ = ECX + math.cos(a) * 0.42, rm_e + math.sin(a) * 0.42
    k.box(wx_ - 0.07, wr_ - 0.03, CUZ + 0.25, wx_ + 0.07, wr_ + 0.03, CUZ + 0.62, '#4a3218', 'window_glass', emit=(W.GLOW, 0.8))
k.cyl(ECX, rm_e, CUZ + 0.75, CUZ + 0.83, 0.5, (shade(ASHLAR, 1.12), 0.1), 'cornice', verts=16)
k.blob(ECX, rm_e, CUZ + 0.83, 0.44, 0.44, 0.42, ('#5a7a7a', 0.12), 'dome', segs=14)
k.cyl(ECX, rm_e, CUZ + 1.2, CUZ + 1.45, 0.03, A.IRON, 'finial', verts=6)
k.sphere(ECX, rm_e, CUZ + 1.5, 0.08, 0.08, GOLD, 'finial', segs=10)
for (ux, uz) in ((ECX, APEX + 0.06), (EX[0] + 0.3, ZE), (EX[1] - 0.3, ZE)):        # urns on the pediment
    k.cyl(ux, PR + 0.3, uz, uz + 0.08, 0.12, (shade(ASHLAR, 1.05), 0.1), 'urn', verts=12)
    k.blob(ux, PR + 0.3, uz + 0.22, 0.12, 0.12, 0.14, (shade(ASHLAR, 1.05), 0.1), 'urn', segs=10)
    k.cone(ux, PR + 0.3, uz + 0.34, uz + 0.5, 0.06, 0.0, (GOLD, 0.06), 'urn_flame', verts=8)
for (bx, br) in ((ECX - 1.05, EX[3] + 0.4), (ECX + 1.05, EX[3] + 0.4)):              # bay trees in tubs by the steps
    k.cyl(bx, br, 0.0, 0.34, 0.2, ('#3a4a3a', 0.1), 'tub', verts=12)
    k.cyl(bx, br, 0.3, 0.36, 0.21, W.BRASS, 'tub_band', verts=12)
    k.cyl(bx, br, 0.36, 0.7, 0.025, A.WOOD_D, 'trunk', verts=6)
    with k.foliage('needle'):
        W.leafy_crown(k, bx, br, 0.95, 0.24, 0.22, 0.28, '#2e5a32', part='topiary')
for lx in (EX[0] + 0.6, EX[1] - 0.6):
    W.lantern_post(k, lx, EX[3] + 0.55, h=2.2, energy=18)
k.solid(EX[0], EX[2], EX[1], EX[3] + 0.6)

# ---- St Brendan's: buttressed nave, lancets, a porch with the rose window in its gable, the bell tower -----------
CF = CH[3]
CCX = (CH[0] + CH[1]) / 2
CSTONE = '#a49a88'
k.box(CH[0], CH[2], 0.0, CH[1], CF, 0.4, (shade(CSTONE, 0.78), 0.15), 'footing', bevel=0.02)
k.box(CH[0] + 0.1, CH[2] + 0.1, 0.4, CH[1] - 0.1, CF - 0.05, 3.2, (CSTONE, 0.14), 'ch_wall')
LANCETS = (43.95, 45.0, 49.0, 50.05)
coursed(CH[0] + 0.1, CH[1] - 0.1, 0.4, 3.2, CF - 0.05, CSTONE, hrange=(0.22, 0.27), wrange=(0.4, 0.7),
        skip=[(lx - 0.3, lx + 0.3, 0.9, 2.9) for lx in LANCETS])


def lancet(cx, rf, z0, w=0.42, h=1.6, glass='#3a2440', glow='#ffb070'):
    k.box(cx - w / 2 - 0.08, rf, z0 - 0.08, cx + w / 2 + 0.08, rf + 0.05, z0 + h, (shade(CSTONE, 1.1), 0.1), 'architrave')
    k.poly([(cx - w / 2 - 0.08, rf + 0.05, z0 + h), (cx + w / 2 + 0.08, rf + 0.05, z0 + h), (cx, rf + 0.05, z0 + h + w * 0.95)],
           (shade(CSTONE, 1.1), 0.1), 'architrave')
    k.box(cx - w / 2, rf + 0.05, z0, cx + w / 2, rf + 0.08, z0 + h, glass, 'window_glass', emit=(glow, 0.75))
    k.poly([(cx - w / 2, rf + 0.08, z0 + h), (cx + w / 2, rf + 0.08, z0 + h), (cx, rf + 0.08, z0 + h + w * 0.8)], glass, 'window_glass',
           emit=(glow, 0.75))
    bars = [(cx - 0.012, rf + 0.08, z0, cx + 0.012, rf + 0.095, z0 + h + w * 0.7)]
    for j in range(1, 5):
        bars.append((cx - w / 2, rf + 0.08, z0 + h * j / 5 - 0.01, cx + w / 2, rf + 0.095, z0 + h * j / 5 + 0.01))
    k.boxes(bars, '#2a2228', 'leading')
    k.point_light(cx, rf + 0.6, z0 + h / 2, glow, 6, radius=0.25, group='flicker')


for lx in LANCETS:
    lancet(lx, CF - 0.05, 1.0)
for bx in (CH[0] + 0.1, 46.0, 48.0, CH[1] - 0.4):   # buttresses, stepped back as they rise
    k.box(bx, CF - 0.1, 0.0, bx + 0.3, CF + 0.32, 1.4, (shade(CSTONE, 0.95), 0.14), 'buttress', bevel=0.015)
    k.box(bx + 0.02, CF - 0.1, 1.4, bx + 0.28, CF + 0.2, 2.5, (shade(CSTONE, 0.98), 0.14), 'buttress', bevel=0.015)
    k.quads([((bx, CF + 0.32, 1.4), (bx + 0.3, CF + 0.32, 1.4), (bx + 0.3, CF + 0.2, 1.55), (bx, CF + 0.2, 1.55))], shade(CSTONE, 1.12), 'buttress_cap')
    k.quads([((bx + 0.02, CF + 0.2, 2.5), (bx + 0.28, CF + 0.2, 2.5), (bx + 0.28, CF - 0.08, 2.75), (bx + 0.02, CF - 0.08, 2.75))], shade(CSTONE, 1.12), 'buttress_cap')
rm_c, zr_c = W._gable_roof(k, CH[0], CH[1], CH[2], CF, 3.2, 2.2, '#4a3a48', over=0.3)
x = CH[0] + 0.2                                       # iron cresting along the ridge, a flèche over the crossing
while x < CH[1] - 0.2:
    k.box(x - 0.015, rm_c - 0.015, zr_c + 0.05, x + 0.015, rm_c + 0.015, zr_c + 0.22, '#2a2a30', 'cresting')
    k.sphere(x, rm_c, zr_c + 0.24, 0.03, 0.03, '#2a2a30', 'cresting', segs=6)
    x += 0.3
k.box(CH[0] + 0.2, rm_c - 0.02, zr_c + 0.12, CH[1] - 0.2, rm_c + 0.02, zr_c + 0.15, '#2a2a30', 'cresting')
FX_ = 45.2
k.box(FX_ - 0.28, rm_c - 0.28, zr_c - 0.2, FX_ + 0.28, rm_c + 0.28, zr_c + 0.55, (shade('#4a3a48', 1.1), 0.12), 'fleche')
for dx in (-0.13, 0.13):
    k.box(FX_ + dx - 0.05, rm_c + 0.27, zr_c + 0.12, FX_ + dx + 0.05, rm_c + 0.3, zr_c + 0.45, '#1a1418', 'louvre')
W.pyramid(k, FX_ - 0.32, rm_c - 0.32, FX_ + 0.32, rm_c + 0.32, zr_c + 0.55, zr_c + 1.7, ('#4a3a48', 0.14), 'roof_fleche', top=0.04)
k.tube((FX_, rm_c, zr_c + 1.7), (FX_, rm_c, zr_c + 2.0), 0.015, A.IRON, 'cross', verts=4)
k.box(FX_ - 0.08, rm_c - 0.01, zr_c + 1.88, FX_ + 0.08, rm_c + 0.01, zr_c + 1.92, A.IRON, 'cross')
# the porch: a gabled bay standing forward, the door in a pointed arch, the rose window high in its gable
PW, PF = 2.8, CF + 0.55
k.box(CCX - PW / 2, CF - 0.1, 0.0, CCX + PW / 2, PF, 0.36, (shade(CSTONE, 0.8), 0.15), 'footing')
k.box(CCX - PW / 2 + 0.05, CF - 0.1, 0.36, CCX + PW / 2 - 0.05, PF - 0.02, 3.4, (CSTONE, 0.14), 'ch_wall')
coursed(CCX - PW / 2 + 0.05, CCX + PW / 2 - 0.05, 0.36, 3.4, PF - 0.02, shade(CSTONE, 1.03), hrange=(0.22, 0.27), wrange=(0.4, 0.7),
        skip=[(CCX - 0.75, CCX + 0.75, 0.0, 2.25)])
PAPEX = 3.4 + 1.55
k.poly([(CCX - PW / 2 + 0.05, PF - 0.02, 3.38), (CCX + PW / 2 - 0.05, PF - 0.02, 3.38), (CCX, PF - 0.02, PAPEX - 0.05)], (CSTONE, 0.14), 'gable')
for i in range(5):                                   # the door's arch, in orders stepping in
    w_ = 0.75 - i * 0.07
    k.box(CCX - w_, PF - 0.02 + i * 0.0, 0.36, CCX + w_, PF + 0.02, 1.55 + 0.02 * i, (shade(CSTONE, 1.06 - i * 0.04), 0.1), 'arch_order')
    k.poly([(CCX - w_, PF + 0.02 + 0.001 * i, 1.55 + 0.02 * i), (CCX + w_, PF + 0.02 + 0.001 * i, 1.55 + 0.02 * i),
            (CCX, PF + 0.02 + 0.001 * i, 2.2 - 0.03 * i)], (shade(CSTONE, 1.06 - i * 0.04), 0.1), 'arch_order')
k.box(CCX - 0.42, PF + 0.025, 0.36, CCX + 0.42, PF + 0.07, 1.65, ('#4a2a1a', 0.14), 'door')
k.poly([(CCX - 0.42, PF + 0.07, 1.65), (CCX + 0.42, PF + 0.07, 1.65), (CCX, PF + 0.07, 2.0)], ('#4a2a1a', 0.14), 'door')
for zh in (0.7, 1.35):
    k.box(CCX - 0.4, PF + 0.07, zh, CCX + 0.4, PF + 0.09, zh + 0.05, '#2a2a2e', 'strap_hinge')
k.box(CCX - 0.01, PF + 0.07, 0.36, CCX + 0.01, PF + 0.09, 1.95, '#2a1a10', 'door_plank')
ZR_ = 3.95                                            # the rose window
k.cyl_y(CCX, PF - 0.02, PF + 0.04, ZR_, 0.66, 0.66, (shade(CSTONE, 1.12), 0.1), 'rose_frame', verts=28)
k.cyl_y(CCX, PF + 0.02, PF + 0.06, ZR_, 0.54, 0.54, '#3a2440', 'rose_window', emit=('#ff9a60', 0.8), verts=28)
spokes = []
for i in range(8):
    a = i / 8 * math.tau
    k.tube((CCX, PF + 0.07, ZR_), (CCX + math.cos(a) * 0.54, PF + 0.07, ZR_ + math.sin(a) * 0.54), 0.022, '#2a2228', 'tracery', verts=4)
    k.cyl_y(CCX + math.cos(a + 0.39) * 0.36, PF + 0.065, PF + 0.075, ZR_ + math.sin(a + 0.39) * 0.36, 0.09, 0.09,
            rng.choice(('#3a5aa0', '#a03a3a', '#e0b040', '#3a8a5a')), 'rose_pane', emit=(rng.choice(('#80a0ff', '#ff7050', '#ffd060', '#70e0a0')), 0.6), verts=10)
k.cyl_y(CCX, PF + 0.06, PF + 0.08, ZR_, 0.12, 0.12, '#2a2228', 'tracery', verts=12)
k.point_light(CCX, PF + 0.8, ZR_, '#ffb080', 10, radius=0.3, group='flicker')
t_ = (PAPEX + 0.05 - 3.14) / max(0.1, zr_c - 3.14)
r_meet_c = (CF + 0.3) - ((CF + 0.3) - rm_c) * min(1.0, t_) - 0.12
ns_roof(CCX, PW + 0.36, PF + 0.12, r_meet_c, 3.3, PAPEX + 0.05, '#4a3a48')
k.box(CCX - 0.03, PF + 0.06, PAPEX + 0.05, CCX + 0.03, PF + 0.12, PAPEX + 0.6, (shade(CSTONE, 1.15), 0.1), 'cross')      # a stone cross
k.box(CCX - 0.17, PF + 0.06, PAPEX + 0.36, CCX + 0.17, PF + 0.12, PAPEX + 0.43, (shade(CSTONE, 1.15), 0.1), 'cross')
W.wall_lantern(k, CCX - 1.0, PF + 0.02, z=1.4, energy=8)
W.wall_lantern(k, CCX + 1.0, PF + 0.02, z=1.4, energy=8)
# the bell tower: coursed to the belfry, louvred openings, pinnacles at its corners, a slated spire and a weathercock
TX0, TX1, TR0, TR1 = 51.7, 53.5, 16.6, 18.4
TH = 4.5
k.box(TX0, TR0, 0.0, TX1, TR1, 0.4, (shade(CSTONE, 0.78), 0.15), 'footing', bevel=0.02)
k.box(TX0 + 0.05, TR0 + 0.05, 0.4, TX1 - 0.05, TR1 - 0.03, TH + 1.1, (CSTONE, 0.14), 'tower')
coursed(TX0 + 0.05, TX1 - 0.05, 0.4, TH, TR1 - 0.03, CSTONE, hrange=(0.22, 0.27), wrange=(0.35, 0.6), skip=[(52.3, 52.9, 0.3, 1.5), (52.35, 52.85, 2.4, 3.3)])
for zs in (1.9, TH):
    k.box(TX0, TR1 - 0.05, zs, TX1, TR1 + 0.06, zs + 0.1, (shade(CSTONE, 1.12), 0.1), 'string_course')
W.door(k, 52.6, TR1 - 0.03, w=0.55, h=1.05, arch=True)
lancet(52.6, TR1 - 0.03, 2.5, w=0.28, h=0.6)
for dx in (-0.4, 0.4):                               # the belfry's paired louvred openings
    bx = 52.6 + dx
    k.box(bx - 0.2, TR1 - 0.03, TH + 0.2, bx + 0.2, TR1 + 0.0, TH + 0.95, '#1a1418', 'belfry_open')
    k.poly([(bx - 0.2, TR1, TH + 0.95), (bx + 0.2, TR1, TH + 0.95), (bx, TR1, TH + 1.15)], '#1a1418', 'belfry_open')
    for j in range(5):
        k.box(bx - 0.19, TR1 - 0.02, TH + 0.25 + j * 0.14, bx + 0.19, TR1 + 0.04, TH + 0.3 + j * 0.14, '#4a3a2a', 'louvre')
k.cone(52.6, TR1 - 0.4, TH + 0.35, TH + 0.85, 0.08, 0.25, (GOLD, 0.06), 'bell', verts=14)
k.box(TX0 - 0.06, TR0 - 0.06, TH + 1.1, TX1 + 0.06, TR1 + 0.06, TH + 1.24, (shade(CSTONE, 1.1), 0.1), 'parapet')
for (px, pr) in ((TX0 + 0.06, TR1 - 0.06), (TX1 - 0.06, TR1 - 0.06), (TX0 + 0.06, TR0 + 0.06), (TX1 - 0.06, TR0 + 0.06)):
    k.box(px - 0.08, pr - 0.08, TH + 1.24, px + 0.08, pr + 0.08, TH + 1.5, (CSTONE, 0.12), 'pinnacle')
    k.cone(px, pr, TH + 1.5, TH + 1.95, 0.09, 0.0, (CSTONE, 0.12), 'pinnacle', verts=4)
SP0, SP1 = TH + 1.24, TH + 3.9                      # the spire: a tall slated pyramid in bands
for i in range(10):
    t0, t1 = i / 10, (i + 1) / 10
    w0, w1 = (TX1 - TX0) / 2 * (1 - t0 * 0.95) - 0.08, (TX1 - TX0) / 2 * (1 - t1 * 0.95) - 0.08
    W.pyramid(k, 52.6 - w0, (TR0 + TR1) / 2 - w0, 52.6 + w0, (TR0 + TR1) / 2 + w0, SP0 + (SP1 - SP0) * t0, SP0 + (SP1 - SP0) * t1,
              (shade('#4a3a48', 1.0 if i % 2 else 0.88), 0.14), 'roof_spire', top=max(0.01, w1 / w0))
k.tube((52.6, (TR0 + TR1) / 2, SP1), (52.6, (TR0 + TR1) / 2, SP1 + 0.45), 0.02, A.IRON, 'weathervane', verts=4)
k.sphere(52.6, (TR0 + TR1) / 2, SP1 + 0.05, 0.06, 0.06, GOLD, 'finial', segs=8)
k.blob(52.66, (TR0 + TR1) / 2, SP1 + 0.45, 0.12, 0.02, 0.07, GOLD, 'weathercock', segs=8)
k.solid(TX0, TR0, TX1, TR1)
k.solid(CH[0], CH[2], CH[1], CH[3])


# ---- the palace on its hill: the curtain wall, the gatehouse, the keep, towers, gardens -------------------------------
def banded_cyl(cx, cr, z0, z1, rad, tone, part='tower', band=0.27, verts=20):
    """A round tower's masonry: courses as bands a shade apart, so the drum reads as stone, not a tube."""
    z, i = z0, 0
    while z < z1 - 0.01:
        zt = min(z1, z + band)
        k.cyl(cx, cr, z, zt, rad + (0.006 if i % 2 else 0.0), (shade(tone, (0.95, 1.04, 0.99, 1.07)[i % 4]), 0.14), part, verts=verts)
        z, i = zt, i + 1


def cone_roof(cx, cr, z0, h, rad, roof, banner=None):
    n = 7
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        k.cone(cx, cr, z0 + h * t0, z0 + h * t1, rad * (1 - t0) + 0.02, max(0.02, rad * (1 - t1)), (shade(roof, 0.9 if i % 2 else 1.02), 0.14),
               'roof_cone', verts=20)
        k.cone(cx, cr, z0 + h * t0 - 0.01, z0 + h * t0 + 0.03, rad * (1 - t0) + 0.045, rad * (1 - t0) + 0.03, shade(roof, 0.6), 'roof_cone', verts=20)
    k.sphere(cx, cr, z0 + h + 0.02, 0.06, 0.06, GOLD, 'finial', segs=8)
    if banner:
        top = z0 + h
        k.cyl(cx, cr, top, top + 1.0, 0.025, '#2a2a30', 'pole', verts=6)
        pts = [(cx + 0.02 + 0.8 * t, cr, top + 0.96 - 0.06 * t + 0.05 * math.sin(t * 6)) for t in (i / 8 for i in range(9))]
        low = [(p[0], p[1], p[2] - 0.32 + 0.04 * (p[0] - cx)) for p in pts[::-1]]
        k.poly(pts + low, (banner, 0.1), 'banner')


def tower(cx, cr, rad, h, roof='#2a4a6a', banner=None, tone=ASHLAR):
    banded_cyl(cx, cr, 0.0, h, rad, tone)
    k.cyl(cx, cr, 0.0, 0.5, rad + 0.1, (shade(tone, 0.85), 0.14), 'tower_batter', verts=20)
    k.cyl(cx, cr, h - 0.05, h + 0.08, rad + 0.14, (shade(tone, 1.08), 0.12), 'string_course', verts=20)
    for i in range(14):                              # corbels and a crenellated parapet
        a = i / 14 * math.tau
        x, r = cx + math.cos(a) * (rad + 0.08), cr + math.sin(a) * (rad + 0.08)
        k.box(x - 0.05, r - 0.05, h - 0.32, x + 0.05, r + 0.05, h - 0.05, (shade(tone, 0.9), 0.14), 'corbel')
    k.cyl(cx, cr, h + 0.08, h + 0.22, rad + 0.14, (tone, 0.14), 'parapet', verts=20)
    for i in range(10):
        a = i / 10 * math.tau
        x, r = cx + math.cos(a) * (rad + 0.08), cr + math.sin(a) * (rad + 0.08)
        k.box(x - 0.11, r - 0.11, h + 0.22, x + 0.11, r + 0.11, h + 0.48, (shade(tone, rng.uniform(0.95, 1.05)), 0.14), 'crenel')
    cone_roof(cx, cr, h + 0.3, rad * 2.3, rad * 1.02, roof, banner)
    for z in (h * 0.38, h * 0.66):
        k.box(cx - 0.05, cr + rad - 0.02, z, cx + 0.05, cr + rad + 0.03, z + 0.36, '#2a1a08', 'arrow_slit', emit=('#ffd080', 0.5))


def curtain(x0, x1, rf, h, tone=ASHLAR):
    """The curtain wall's face: a batter at its foot, courses, a string course, corbels and crenellations."""
    k.box(x0, rf - 1.0, 0.0, x1, rf, h, (tone, 0.15), 'curtain_wall')
    k.quads([((x0, rf + 0.25, 0.0), (x1, rf + 0.25, 0.0), (x1, rf, 0.55), (x0, rf, 0.55))], (shade(tone, 0.82), 0.15), 'wall_batter')
    coursed(x0, x1, 0.55, h - 0.35, rf, tone, hrange=(0.24, 0.28), wrange=(0.5, 0.85))
    k.box(x0, rf - 0.04, h - 0.38, x1, rf + 0.06, h - 0.3, (shade(tone, 1.1), 0.1), 'string_course')
    x = x0 + 0.1
    while x < x1 - 0.1:
        k.box(x, rf, h - 0.3, x + 0.1, rf + 0.12, h - 0.02, (shade(tone, 0.9), 0.14), 'corbel')
        x += 0.4
    k.box(x0, rf - 0.3, h - 0.02, x1, rf + 0.14, h + 0.12, (tone, 0.14), 'parapet')
    x = x0 + 0.05
    while x < x1 - 0.2:
        k.box(x, rf - 0.28, h + 0.12, x + 0.34, rf + 0.12, h + 0.42, (shade(tone, rng.uniform(0.94, 1.06)), 0.14), 'crenel', bevel=0.01)
        x += 0.58


curtain(19.0, 30.2, WALL_R, 2.6)
curtain(33.8, 45.0, WALL_R, 2.6)
for (cx, h) in ((19.0, 3.8), (45.0, 3.8)):
    tower(cx, WALL_R - 0.6, 0.9, h, banner='#2e8a5a')
# the gatehouse: two drum towers and the arch between, the gates shut, the royal arms over them, banners, lanterns
tower(30.2, WALL_R - 0.4, 0.8, 3.6, banner=GOLD)
tower(33.8, WALL_R - 0.4, 0.8, 3.6, banner=GOLD)
GF = WALL_R + 0.05
k.box(30.9, WALL_R - 0.9, 0.0, 33.1, GF, 3.3, (shade(ASHLAR, 0.97), 0.15), 'gatehouse')
coursed(30.9, 33.1, 0.0, 3.0, GF, shade(ASHLAR, 0.97), hrange=(0.24, 0.28), wrange=(0.4, 0.7), skip=[(31.3, 32.7, 0.0, 2.45)])
for i in range(6):                                   # the arch: voussoirs round a pointed head
    w_ = 0.68 - i * 0.03
    k.box(32.0 - w_, GF, 0.0, 32.0 + w_, GF + 0.04, 1.6, (shade(ASHLAR, 1.08 - 0.03 * i), 0.1), 'arch_order')
    k.poly([(32.0 - w_, GF + 0.04 + 0.001 * i, 1.6), (32.0 + w_, GF + 0.04 + 0.001 * i, 1.6), (32.0, GF + 0.04 + 0.001 * i, 2.45 - 0.05 * i)],
           (shade(ASHLAR, 1.08 - 0.03 * i), 0.1), 'arch_order')
k.box(31.4, GF + 0.05, 0.0, 32.6, GF + 0.09, 1.75, ('#3a2410', 0.12), 'gate')
k.poly([(31.4, GF + 0.09, 1.75), (32.6, GF + 0.09, 1.75), (32.0, GF + 0.09, 2.2)], ('#3a2410', 0.12), 'gate')
for xx in (31.7, 32.0, 32.3):
    k.box(xx - 0.015, GF + 0.09, 0.0, xx + 0.015, GF + 0.11, 1.9, '#1a1008', 'gate_plank')
for zh in (0.35, 0.95, 1.5):
    k.box(31.45, GF + 0.09, zh, 32.55, GF + 0.12, zh + 0.07, '#2a2a2e', 'strap_hinge')
for i in range(5):                                   # the portcullis' teeth under the arch's crown
    xx = 31.55 + i * 0.225
    k.cone(xx, GF + 0.12, 1.98, 2.3, 0.02, 0.03, '#2a2a2e', 'portcullis', verts=4)
k.box(31.5, GF + 0.11, 2.27, 32.5, GF + 0.14, 2.31, '#2a2a2e', 'portcullis')
# the royal arms: a shield, a crown over an anchor, in gold on green
k.box(31.62, GF + 0.04, 2.55, 32.38, GF + 0.08, 3.18, (GOLD, 0.06), 'crest')
k.box(31.68, GF + 0.08, 2.6, 32.32, GF + 0.1, 3.12, '#1e5a3a', 'crest')
k.cyl_y(32.0, GF + 0.04, GF + 0.08, 2.6, 0.38, 0.32, (GOLD, 0.06), 'crest', verts=16)
k.cyl_y(32.0, GF + 0.08, GF + 0.1, 2.6, 0.32, 0.26, '#1e5a3a', 'crest', verts=16)
k.box(31.98, GF + 0.1, 2.5, 32.02, GF + 0.12, 2.95, GOLD, 'crest_anchor')
k.box(31.86, GF + 0.1, 2.88, 32.14, GF + 0.12, 2.92, GOLD, 'crest_anchor')
k.tube((31.82, GF + 0.11, 2.62), (32.18, GF + 0.11, 2.62), 0.025, GOLD, 'crest_anchor', verts=5)
k.box(31.88, GF + 0.1, 3.0, 32.12, GF + 0.12, 3.08, GOLD, 'crest_crown')
for dx in (-0.1, 0.0, 0.1):
    k.cone(32.0 + dx, GF + 0.11, 3.08, 3.16, 0.025, 0.0, GOLD, 'crest_crown', verts=4)
for bx in (31.0, 33.0):                              # long banners hung from the gatehouse
    k.box(bx - 0.2, GF + 0.02, 3.25, bx + 0.2, GF + 0.06, 3.3, '#2a2a2e', 'banner_pole')
    k.poly([(bx - 0.17, GF + 0.07, 3.25), (bx + 0.17, GF + 0.07, 3.25), (bx + 0.17, GF + 0.07, 2.0), (bx, GF + 0.07, 1.82), (bx - 0.17, GF + 0.07, 2.0)],
           ('#1e6a42', 0.1), 'banner')
    k.box(bx - 0.17, GF + 0.075, 2.9, bx + 0.17, GF + 0.08, 2.96, GOLD, 'banner_trim')
    k.sphere(bx, GF + 0.08, 2.5, 0.07, 0.02, GOLD, 'banner_trim', segs=8)
W.wall_lantern(k, 30.6, GF + 0.3, z=1.6, energy=10)
W.wall_lantern(k, 33.4, GF + 0.3, z=1.6, energy=10)
# the keep on the hill: ashlar, a rusticated base, three floors of windows, a frontispiece with a balcony; slated roof
KX0, KX1, KR0, KR1 = 25.0, 39.0, 4.6, 10.4
KH = 4.6
KCX = (KX0 + KX1) / 2


def keep():
    k.box(KX0, KR0, 0.0, KX1, KR1, KH, (ASHLAR, 0.14), 'keep')
    k.box(KX0 - 0.05, KR1 - 0.05, 0.0, KX1 + 0.05, KR1 + 0.06, 0.5, (shade(ASHLAR, 0.85), 0.14), 'footing')
    xs = [26.3, 27.9, 29.5, 34.5, 36.1, 37.7]
    coursed(KX0, KX1, 0.5, 1.6, KR1, ASHLAR, hrange=(0.26, 0.28), wrange=(0.7, 1.0), part='rustication', deep=0.02,
            skip=[(x - 0.42, x + 0.42, 0.0, 9.0) for x in xs] + [(30.3, 33.7, 0.0, 9.0)])
    coursed(KX0, KX1, 1.6, KH, KR1, shade(ASHLAR, 1.03), hrange=(0.3, 0.32), wrange=(0.8, 1.2), part='ashlar',
            skip=[(x - 0.42, x + 0.42, 0.0, 9.0) for x in xs] + [(30.3, 33.7, 0.0, 9.0)])
    for zs in (1.6, 3.1):
        k.box(KX0, KR1 - 0.04, zs, KX1, KR1 + 0.08, zs + 0.09, (shade(ASHLAR, 1.12), 0.1), 'string_course')
    for x in xs:
        arched_window(x, KR1 + 0.02, 0.62, w=0.5, h=0.75)
        HK.rich_window(k, x, KR1 + 0.02, 1.92, w=0.56, h=0.9, shutters=None, box=False, stone=shade(ASHLAR, 1.1))
        HK.rich_window(k, x, KR1 + 0.02, 3.42, w=0.48, h=0.6, shutters=None, box=False, stone=shade(ASHLAR, 1.1))
    # the frontispiece: standing forward, pilasters, the great window over the balcony, a pediment on top
    FF = KR1 + 0.35
    k.box(30.3, KR1 - 0.1, 0.0, 33.7, FF, KH + 0.4, (shade(ASHLAR, 1.03), 0.14), 'keep')
    coursed(30.3, 33.7, 0.5, KH + 0.4, FF, shade(ASHLAR, 1.03), hrange=(0.3, 0.32), wrange=(0.6, 1.0), part='ashlar',
            skip=[(31.3, 32.7, 0.0, 4.3)])
    for px in (30.45, 33.4):
        k.box(px, FF, 0.5, px + 0.15, FF + 0.08, KH + 0.3, (shade(ASHLAR, 1.12), 0.1), 'pilaster')
    k.box(31.45, FF, 0.5, 32.55, FF + 0.06, 1.75, '#2a3a2e', 'door')
    k.poly([(31.45, FF + 0.06, 1.75), (32.55, FF + 0.06, 1.75), (32.0, FF + 0.06, 2.05)], '#2a3a2e', 'door')
    arched_window(32.0, FF + 0.02, 2.45, w=0.9, h=1.2)
    k.box(31.2, FF, 2.2, 32.8, FF + 0.55, 2.3, (shade(ASHLAR, 1.1), 0.1), 'balcony')            # the balcony and its balusters
    for i in range(9):
        bx = 31.28 + i * 0.18
        k.cyl(bx, FF + 0.48, 2.3, 2.62, 0.035, (shade(ASHLAR, 1.12), 0.1), 'baluster', verts=6)
    k.box(31.2, FF + 0.42, 2.62, 32.8, FF + 0.55, 2.68, (shade(ASHLAR, 1.1), 0.1), 'balcony')
    for s in (-1, 1):
        k.tube((32.0 + s * 0.65, FF + 0.05, 1.85), (32.0 + s * 0.65, FF + 0.5, 2.2), 0.05, shade(ASHLAR, 0.95), 'bracket', verts=4)
    k.poly([(32.0 - 0.12, FF + 0.56, 2.66), (32.0 + 0.12, FF + 0.56, 2.66), (32.0 + 0.12, FF + 0.56, 1.95), (32.0, FF + 0.56, 1.85),
            (32.0 - 0.12, FF + 0.56, 1.95)], ('#1e6a42', 0.1), 'banner')
    k.poly([(30.25, FF + 0.08, KH + 0.4), (33.75, FF + 0.08, KH + 0.4), (32.0, FF + 0.08, KH + 1.25)], (shade(ASHLAR, 1.05), 0.1), 'gable')
    for s in (-1, 1):
        k.tube((32.0 + s * 1.85, FF + 0.12, KH + 0.38), (32.0, FF + 0.12, KH + 1.3), 0.06, shade(ASHLAR, 1.15), 'cornice', verts=4, smooth=False)
    k.cyl_y(32.0, FF + 0.08, FF + 0.13, KH + 0.75, 0.2, 0.2, (GOLD, 0.06), 'crest', verts=14)
    k.box(KX0 - 0.05, KR1 - 0.05, KH - 0.06, KX1 + 0.05, KR1 + 0.16, KH + 0.06, (shade(ASHLAR, 1.12), 0.1), 'cornice')
    rm, zr = W._gable_roof(k, KX0, KX1, KR0, KR1, KH, 2.0, '#2a4a6a', over=0.3)
    for dx in (27.1, 29.0, 35.0, 36.9):
        W.dormer(k, dx, KR1 + 0.3, rm, KH - 0.06, zr, '#2a4a6a', ASHLAR, None, w=0.8)
    for cx in (26.2, 37.8):
        W.chimney_stack(k, cx, rm - 0.35, rm + 0.05, KH, zr + 0.9, brick='#8a7a6a', mortar='#6a5e52', pots=3)
    return rm, zr


rm_k, zr_k = lifted(TERR, keep)
SMOKE.append([round(26.2 - 0.12, 3), round(rm_k - 0.15 - (zr_k + TERR + 0.9) * C45, 3)])
for (cx, cr, rad, h, roof, banner) in ((25.0, 6.0, 1.1, 6.2, '#2a4a6a', '#2e8a5a'), (39.0, 6.0, 1.1, 6.2, '#2a4a6a', '#2e8a5a'),
                                       (32.0, 5.0, 1.3, 7.4, '#2a3a5a', GOLD)):
    lifted(TERR, tower, cx, cr, rad, h, roof=roof, banner=banner)


# the gardens either side of the keep: clipped box in knots round a basin, gravel walks, topiary, roses, trees
def garden(x0, x1, r0, r1, seed_flip=1):
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    z = TERR
    since, lsince = len(k.parts), len(k.lights)
    # the basin, sunk in its kerb
    W.annulus(k, cx, cr, 0.62, 0.78, 0.0, 0.2, (shade(ASHLAR, 0.95), 0.12), 'basin_rim', segs=28)
    k.cyl(cx, cr, -0.1, 0.12, 0.64, '#1e3a40', 'basin_water', verts=28)
    k.cyl(cx, cr, 0.12, 0.5, 0.06, (ASHLAR, 0.12), 'fountain_column', verts=8)
    k.sphere(cx, cr, 0.55, 0.09, 0.09, (ASHLAR, 0.12), 'finial', segs=8)
    for i in range(4):                               # lily pads
        a = rng.uniform(0, math.tau)
        k.cyl(cx + math.cos(a) * 0.4, cr + math.sin(a) * 0.35, 0.12, 0.13, 0.08, '#3a6a3a', 'lily', verts=8)
    # the knots: low box hedges in four beds round it, roses in them, a topiary cone at each outer corner
    for (sx, sr) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        bx0, bx1 = sorted((cx + sx * 1.0, cx + sx * (x1 - x0) / 2 * 0.92))
        br0, br1 = sorted((cr + sr * 0.85, cr + sr * (r1 - r0) / 2 * 0.9))
        with k.foliage('needle'):
            for (a, b) in (((bx0, br0), (bx1, br0)), ((bx0, br1), (bx1, br1)), ((bx0, br0), (bx0, br1)), ((bx1, br0), (bx1, br1))):
                L = math.dist(a, b)
                n = max(2, int(L / 0.18))
                for j in range(n + 1):
                    t = j / n
                    k.blob(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.13, 0.13, 0.12, 0.13,
                           (shade('#2a5a30', rng.uniform(0.9, 1.08)), 0.2), 'hedge', segs=7)
        k.box(bx0 + 0.14, br0 + 0.14, -0.02, bx1 - 0.14, br1 - 0.14, 0.04, ('#3a2c20', 0.3), 'soil')
        for j in range(int((bx1 - bx0) * (br1 - br0) * 5)):
            fx, fr = rng.uniform(bx0 + 0.25, bx1 - 0.25), rng.uniform(br0 + 0.25, br1 - 0.25)
            with k.foliage('leaf'):
                k.blob(fx, fr, 0.14, 0.11, 0.1, 0.1, ('#2e5a2a', 0.2), 'rose_bush', segs=7)
            col = rng.choice(('#e04870', '#f0f0f0', '#e8a0c0', '#c82a3a') if seed_flip > 0 else ('#f0c040', '#e8e0f0', '#a070d0', '#f08040'))
            for _ in range(3):
                k.sphere(fx + rng.uniform(-0.08, 0.08), fr + rng.uniform(-0.06, 0.08), 0.22 + rng.uniform(0, 0.05), 0.04, 0.04, col, 'flower', segs=6)
        ox, orr = (bx0 if sx < 0 else bx1), (br0 if sr < 0 else br1)
        k.cyl(ox, orr, 0.0, 0.22, 0.14, ('#8a5a3a', 0.12), 'tub', verts=10)
        with k.foliage('needle'):
            k.cone(ox, orr, 0.2, 1.05, 0.24, 0.02, ('#2a5a32', 0.2), 'topiary', verts=10)
            for j in range(10):
                t = rng.uniform(0.1, 0.85)
                a = rng.uniform(0, math.tau)
                k.sphere(ox + math.cos(a) * 0.24 * (1 - t), orr + math.sin(a) * 0.22 * (1 - t), 0.2 + 0.85 * t, 0.06, 0.06,
                         (shade('#2a5a32', rng.uniform(0.95, 1.2)), 0.2), 'topiary', segs=6)
    I.pose(k, since, (0, 0, 0), dz=z, lights_since=lsince)


garden(19.4, 24.4, 5.6, 9.6, 1)
garden(39.6, 44.6, 5.6, 9.6, -1)
for (x, r, kind) in ((21.5, 10.4, 'tree'), (42.5, 10.4, 'tree'), (18.0, 7.2, 'pine'), (46.2, 7.2, 'pine'), (23.4, 4.9, 'tree'),
                     (40.8, 4.9, 'tree')):
    since, lsince = len(k.parts), len(k.lights)
    (W.tree(k, x, r, h=2.7, tone='#355e36') if kind == 'tree' else W.pine(k, x, r, h=2.8, tone='#24463a'))
    I.pose(k, since, (0, 0, 0), dz=hill(x, r), lights_since=lsince)
k.solid(17, 3, 47, WALL_R + 0.0)
k.solid(30.0, WALL_R, 34.0, WALL_R + 0.4)
W.lantern_post(k, 28.6, 13.0, h=2.5, energy=26)
W.lantern_post(k, 35.4, 13.0, h=2.5, energy=26)

# ---- the Royal Yard: a galleon in frame on the stocks, sheer-legs over her, timber stacked, sawdust and tar --------------


def ship_in_frame(x0, x1, rc, beam=2.0, zk=0.55, h=1.6):
    """A hull on the stocks: keel on its blocks, stem and sternpost, ribs all along, planking up to the turn of the bilge
    on the near side, a staging of planks round her."""
    L = x1 - x0
    for i in range(7):                                                   # keel blocks
        bx = x0 + 0.4 + i * (L - 0.8) / 6
        for j in range(3):                                               # stacked baulks, crossways
            k.box(bx - 0.22, rc - 0.32, j * zk / 3, bx + 0.22, rc + 0.32, (j + 1) * zk / 3 - 0.01,
                  (shade('#5a4a3a', rng.uniform(0.85, 1.1)), 0.15), 'keel_block')
    k.box(x0, rc - 0.08, zk, x1, rc + 0.08, zk + 0.16, ('#5a3a1e', 0.1), 'keel')
    k.tube((x1, rc, zk), (x1 + 0.6, rc, zk + h + 0.5), 0.09, ('#5a3a1e', 0.1), 'stem', verts=6, smooth=False)
    k.tube((x0, rc, zk), (x0 - 0.15, rc, zk + h + 0.8), 0.1, ('#5a3a1e', 0.1), 'sternpost', verts=6, smooth=False)
    n = 16
    for i in range(1, n):
        t = i / n
        u = x0 + t * L
        w = beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t)) ** 0.6
        top = zk + h + 0.25 * max(0.0, t - 0.7) / 0.3
        for s in (-1, 1):                                                # a rib: up from the keel, out, and up to the sheer
            k.tube((u, rc, zk + 0.1), (u, rc + s * w * 0.8, zk + 0.35), 0.035, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
            k.tube((u, rc + s * w * 0.8, zk + 0.35), (u, rc + s * w, zk + h * 0.6), 0.035, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
            k.tube((u, rc + s * w, zk + h * 0.6), (u, rc + s * w * 0.96, top), 0.035, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
    for zz in (zk + h * 0.95,):                                          # the sheer clamp tying the ribs' heads
        for s in (-1, 1):
            pts = []
            for i in range(1, n):
                t = i / n
                w = beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t)) ** 0.6
                pts.append((x0 + t * L, rc + s * w * 0.97, zz + 0.25 * max(0.0, t - 0.7) / 0.3))
            for p, q in zip(pts, pts[1:]):
                k.tube(p, q, 0.03, ('#7a5030', 0.1), 'rib', verts=4, smooth=False)
    rings = []                                                           # planking on the near side, up to the bilge
    for i in range(n + 1):
        t = i / n
        u = x0 + t * L
        w = beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t)) ** 0.6 + 0.03
        rings.append([(u, rc + w * 0.82, zk + 0.37), (u, rc + w + 0.0, zk + h * 0.55)])
    k.loft(rings[2:n - 1], ('#8a5a30', 0.08), 'planking')
    for i in range(2, n - 2):                                            # the strakes' seams
        t0, t1 = i / n, (i + 1) / n
        for f in (0.33, 0.66):
            pa = (x0 + t0 * L, rc + (beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t0)) ** 0.6 + 0.04) * (0.82 + 0.18 * f), zk + 0.37 + (h * 0.55 - 0.37) * f)
            pb = (x0 + t1 * L, rc + (beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t1)) ** 0.6 + 0.04) * (0.82 + 0.18 * f), zk + 0.37 + (h * 0.55 - 0.37) * f)
            k.tube(pa, pb, 0.008, '#4a3018', 'plank_seam', verts=4, smooth=False)
    for z in (zk + 0.9, zk + 1.7):                                       # the staging round her
        k.box(x0 - 0.3, rc + beam / 2 + 0.25, z, x1 + 0.3, rc + beam / 2 + 0.55, z + 0.06, ('#9a7a4a', 0.1), 'staging')
        k.box(x0 - 0.3, rc - beam / 2 - 0.55, z, x1 + 0.3, rc - beam / 2 - 0.25, z + 0.06, ('#9a7a4a', 0.1), 'staging')
    for i in range(6):
        px = x0 - 0.2 + i * (L + 0.4) / 5
        for s in (-1, 1):
            k.cyl(px, rc + s * (beam / 2 + 0.4), 0.0, zk + 1.9, 0.04, ('#6a5030', 0.1), 'staging_post', verts=5)
    for i in range(4):                                                   # ladders up to the staging
        lx = x0 + 1.2 + i * 2.0
        for dx in (-0.12, 0.12):
            k.tube((lx + dx, rc + beam / 2 + 0.75, 0.0), (lx + dx, rc + beam / 2 + 0.5, zk + 0.95), 0.02, '#7a5a34', 'ladder', verts=4) if i % 2 == 0 else None


ship_in_frame(51.0, 59.0, YARD_R, beam=2.2)
# the sheer-legs: two great spars leaning over her, a block and tackle hanging, guys to the ground
k.tube((53.0, YARD_R - 2.2, 0.0), (55.0, YARD_R, 5.2), 0.09, ('#5a4024', 0.1), 'sheerleg', verts=6, smooth=False)
k.tube((57.0, YARD_R - 2.2, 0.0), (55.0, YARD_R, 5.2), 0.09, ('#5a4024', 0.1), 'sheerleg', verts=6, smooth=False)
k.tube((55.0, YARD_R, 5.2), (55.0, YARD_R, 3.0), 0.015, ('#c8b48a', 0.1), 'tackle', verts=4, smooth=False)
k.box(54.85, YARD_R - 0.1, 2.75, 55.15, YARD_R + 0.1, 3.05, ('#3a3a40', 0.1), 'block')
k.tube((55.0, YARD_R, 5.2), (56.5, YARD_R + 1.5, 0.0), 0.012, '#8a7450', 'guy_rope', verts=4)
k.tube((55.0, YARD_R, 3.0), (54.6, YARD_R - 0.2, 2.2), 0.012, '#c8b48a', 'tackle', verts=4)       # a frame swinging on the hook
k.tube((54.2, YARD_R - 0.2, 2.2), (55.2, YARD_R - 0.2, 2.2), 0.04, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
for (x0, x1, r) in ((50.4, 53.6, 31.4), (54.2, 57.0, 31.6)):           # timber stacked to season, on bearers
    for j in range(3):
        k.tube((x0, r - 0.25, 0.12 + j * 0.2), (x1, r - 0.25, 0.12 + j * 0.2), 0.1, (shade('#8a6a3a', rng.uniform(0.9, 1.1)), 0.12), 'timber', verts=8)
        k.tube((x0, r + 0.02, 0.12 + j * 0.2), (x1, r + 0.02, 0.12 + j * 0.2), 0.1, (shade('#7a5a32', rng.uniform(0.9, 1.1)), 0.12), 'timber', verts=8)
    for bx in (x0 + 0.3, (x0 + x1) / 2, x1 - 0.3):
        k.box(bx - 0.06, r - 0.4, 0.0, bx + 0.06, r + 0.18, 0.05, '#4a3a28', 'bearer')
    k.solid(x0, r - 0.4, x1, r + 0.3)
# by the hull, inside the stocks' own ground: the tar kettle on its fire, a steam box, planks, shavings
TK = (50.55, 29.0)
k.cyl(TK[0], TK[1], 0.0, 0.08, 0.28, ('#4a4440', 0.2), 'hearth', verts=12)
for i in range(5):
    a = i / 5 * math.tau
    k.rock(TK[0] + math.cos(a) * 0.24, TK[1] + math.sin(a) * 0.2, 0.04, 0.08, 0.07, 0.06, ('#5a5650', 0.2), part='hearth')
k.cyl(TK[0], TK[1], 0.08, 0.14, 0.12, '#3a1a08', 'embers', emit=('#ff6a20', 0.9), verts=10)
k.cyl(TK[0], TK[1], 0.18, 0.46, 0.2, ('#1e1e22', 0.15), 'kettle', verts=12)
k.cyl(TK[0], TK[1], 0.45, 0.47, 0.17, '#0e0c0a', 'tar', verts=12)
for s in (-1, 1):
    k.tube((TK[0] + s * 0.26, TK[1], 0.0), (TK[0], TK[1], 0.7), 0.02, A.WOOD_D, 'tripod', verts=4)
k.point_light(TK[0], TK[1] + 0.3, 0.25, '#ff7a30', 12, radius=0.2, group='flicker')
k.box(58.4, 28.75, 0.0, 59.75, 29.15, 0.45, ('#6a5038', 0.14), 'steam_box', bevel=0.01)
k.box(58.42, 28.73, 0.15, 59.73, 28.76, 0.2, '#3a2a1a', 'steam_box_band')
for i in range(5):                                   # planks leant against the staging
    px = 52.0 + i * 0.16
    k.bar(px, 29.15, px + 0.05, 29.0, 0.0, 1.2, 0.06, (shade('#a07a4a', rng.uniform(0.85, 1.1)), 0.12), 'plank')
for _ in range(90):                                  # shavings and chips over the yard
    x, r = rng.uniform(50.2, 59.8), rng.uniform(25.5, 33.2)
    if 50.2 < x < 59.8 and 26.2 < r < 29.2 and rng.random() < 0.5:
        pass
    k.box(x, r, 0.0, x + rng.uniform(0.04, 0.09), r + rng.uniform(0.02, 0.05), 0.012, rng.choice(('#d8b880', '#c8a06a', '#e0c890')), 'yard_chips')
smoke(rich_house(k, 55.6, 59.2, 21.4, 24.4, wall_h=2.0, rise=1.0, roof=SLATE, wall='#a89a88', door_x=57.4,
                 windows=[(56.4, 0.85), (58.4, 0.85)], chimney=58.8, stone=True), 58.8)
V.board_sign(k, 'ROYAL YARD', 'IMFellEnglishSC-Regular', 57.4, 24.4, 2.08, size=0.22, board='#2a3a30')
W.bulletin_board(k, 53.0, 24.2, w=1.2)
for (nx, nz, col) in ((52.65, 1.3, '#e8e0c8'), (53.2, 1.12, '#e0d4b0'), (52.95, 0.92, '#f0e8d8')):      # notices pinned on it
    k.box(nx - 0.16, 24.2 + 0.03, nz - 0.18, nx + 0.16, 24.2 + 0.05, nz + 0.18, col, 'notice')
k.solid(50.2, YARD_R - 1.4, 59.8, YARD_R + 1.6)              # (the row in front of the yard office stays open)

# ---- the west point: the Crown Light, the keeper's thatched cottage, gardens; the cottage by the lane ----------------
LH = (6.4, 25.2)
I.lighthouse(k, *LH, stripe='#2e7a4a', lamp='#b0ffd0')
k.box(5.0, 26.1, 0.0, 7.8, 27.0, 0.25, ('#7a7a72', 0.2), 'lh_step', bevel=0.03)
for i in range(14):                                  # rocks at the light's foot
    a = rng.uniform(0, math.tau)
    k.rock(LH[0] + math.cos(a) * 0.95, LH[1] + math.sin(a) * 0.75, 0.0, rng.uniform(0.1, 0.2), 0.12, 0.1,
           (shade('#7a786e', rng.uniform(0.8, 1.1)), 0.2), part='rock')
smoke(rich_house(k, 2.8, 6.4, 29.0, 31.8, wall_h=1.9, rise=1.2, roof='#c8a060', wall='#ece2cc', door_x=4.6,
                 windows=[(3.5, 0.8), (5.7, 0.8)], chimney=3.2), 3.2)
smoke(rich_house(k, 7.6, 10.6, 20.2, 23.0, wall_h=1.9, rise=1.0, roof='#b05a3a', wall='#d8d0bc', door_x=9.1,
                 windows=[(8.3, 0.8), (9.9, 0.8)], chimney=10.1), 10.1)
for (x, r) in ((3.2, 23.0), (9.2, 33.0), (11.0, 27.6), (4.0, 33.4)):
    W.tree(k, x, r, h=2.6, tone='#3a6a3a')
    k.solid(x - 0.3, r - 0.6, x + 0.3, r)          # the trunk and the tile its crown hides: the cottage's yard stays open
W.bench(k, 7.6, 9.0, 31.2)
k.solid(7.6, 31.0, 9.0, 31.5)

# ---- the east beyond the yard, the north gardens ------------------------------------------------------------------
for (x, r) in ((60.0, 30.0), (61.5, 24.0), (14.0, 9.5), (49.0, 9.5), (16.0, 12.5), (48.0, 12.8), (55.0, 18.0), (9.5, 17.0)):
    if (x, r) in ((61.5, 24.0), (14.0, 9.5), (49.0, 9.5), (9.5, 17.0)):   # pines on the cliff path, yews by the gardens
        W.pine(k, x, r, h=2.7, tone='#24463a')
    else:
        W.tree(k, x, r, h=2.6, tone='#3a6438')
    if (x, r) == (60.0, 30.0):                     # on the cliff path down past the yard: block the yard side of its trunk
        k.solid(x - 0.4, r, x, r + 0.4)
    else:
        k.solid(x - 0.3, r - 0.6, x + 0.3, r)
for (x, r) in ((13.0, 21.5), (20.0, 21.6)):
    W.planter(k, x - 0.5, x + 0.5, r)

# ---- bushes, flowers and stones where nobody walks; the grass over it all --------------------------------------------
busy = lambda x, r: pd(x, r) < 0.55 or under(x, r, 0.1)
grass_cells = [c for c in OPEN if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')]
k.later.append(lambda: W.meadow(k, GRASS, cells=grass_cells, ok=('ground_grass', 'coast_lip', 'lip_grass'), density=0.95, avoid=busy,
                                flowers=0.9, h=(0.07, 0.14)))
I.pebbles(k, OPEN, '#7a7a70', per_cell=0.12, avoid=busy)

k.area_light(32.0, 20.0, 16.0, '#90a8c8', 3000, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(32.0, 19.0, 4.0, '#e0f0e8', 60, radius=1.5)
k.point_light(40.0, 31.0, 2.5, '#ffc070', 30, radius=0.8, group='flicker')                  # the pub's glow on the quay

CROP = os.environ.get('CROWN_CROP')
if CROP:                                             # render just a part of the frame, to look at it quickly
    cx0, cr0, cx1, cr1 = (float(v) for v in CROP.split(','))
    _set = k._settings

    def _settings(*a, **kw):
        _set(*a, **kw)
        sc = k.scene
        sc.render.use_border = True
        sc.render.use_crop_to_border = True
        sc.render.border_min_x = (cx0 + k.mx) / (COLS + 2 * k.mx)
        sc.render.border_max_x = (cx1 + k.mx) / (COLS + 2 * k.mx)
        sc.render.border_max_y = 1 - (cr0 + k.mt) / (ROWS + k.mt + k.mb)
        sc.render.border_min_y = 1 - (cr1 + k.mt) / (ROWS + k.mt + k.mb)
    k._settings = _settings
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('CROWN_SAMPLES', 96)), world_light=('#26384a', 0.8))
if CROP:
    sys.exit(0)

# ---- the world -----------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


def door(label, x, y, target, spawn):                # into one of the capital's rooms (scenes/lumar_crown_*.py)
    return {'x': x, 'y': y, 'type': 'enter_world', 'target': target, 'spawn': spawn, 'label': label, 'prompt': 'PRESS E TO GO IN'}


w = {'name': 'Crownhaven', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': '#d8f0e0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY + 2, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         door('HARBOUR OFFICE', 25, 29, 'lumar-crown-office', [7, 8]),
         look('BONDED STORE', 14, 29, 'CROWN BONDED STORE. EVERY CRATE IN HERE HAS PAID ITS DUTY, OR IS WAITING TO.'),
         door('THE CROWN & ANCHOR', 40, 29, 'lumar-crown-pub', [8, 9]),
         door("MERCHANTS' EXCHANGE", 17, 18, 'lumar-crown-exchange', [10, 11]),
         {'x': 30, 'y': 13, 'type': 'dialog', 'label': 'GUARD', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE GUARD LOOKS STRAIGHT AHEAD.'},
         {'x': 54, 'y': 24, 'type': 'dialog', 'label': 'SHIPWRIGHT', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE SHIPWRIGHT WIPES TAR FROM HER HANDS.'},
         door("ST BRENDAN'S", 47, 18, 'lumar-crown-chapel', [7, 12]),
         look('FOUNTAIN', 32, 20, 'THE CROWN FOUNTAIN. COINS AT THE BOTTOM FROM EVERY PORT ON THE SEA, AND A FEW FROM PLACES NOBODY HAS HEARD OF.'),
         look('STATUE', 32, 23, 'CAPTAIN MIRA LUMAR, WHO FIRST CHARTED THE FIVE SEAS. THE PLAQUE: "SHE FOUND THEM ALL, AND KEPT LOOKING."'),
         {'x': 32, 'y': 13, 'type': 'palace_gate', 'label': 'PALACE GATE', 'prompt': 'PRESS E TO ASK'},     # three ships and it opens (js/crown.js)
         look('ROYAL YARD', 57, 25, 'THE ROYAL YARD. A GALLEON IN FRAME ON THE STOCKS, RIBS LIKE A WHALE\'S. THE SHIPWRIGHTS SAY SHE\'LL TAKE A YEAR.\n\nTHE HARBOURMASTER TAKES ORDERS FOR GALLEONS - "IF YOU\'VE THE COIN."'),
         look('NOTICE BOARD', 53, 25, 'NOTICES: GALLEON HULLS - ROYAL YARD. CARRIERS WANTED FOR SILK TO SAPPHIRE. PIRATES SIGHTED OFF THE CRIMSON SEAM - CONVOY THURSDAY.'),
         look('LIGHTHOUSE', 6, 26, 'THE CROWN LIGHT, ITS LAMP BURNING GREEN FOR THE EMERALD SEA. THE KEEPER WAVES FROM THE GALLERY.'),
         look('MARKET', 24, 23, 'APPLES FROM THE NORTH GARDENS, BREAD STILL WARM, A CRATE OF PEARS FROM SOMEWHERE THAT ISN\'T HERE.'),
         look('FISH MARKET', 27, 23, 'THE CATCH ON ICE: SILVERFIN, CRAB, A RAY AS BIG AS A DOOR.'),
         look('SPICE STALL', 36, 23, 'SPICES FROM ALL FIVE SEAS IN LITTLE JARS. THE TRADER LETS YOU SMELL THE MOON SALT: IT SMELLS OF NOTHING AT ALL.'),
         look('BOOKSTALL', 39, 23, 'CHARTS, ALMANACS, A BATTERED COPY OF "THE LADY OF THE EMERALD SEA". SOMEBODY HAS ANNOTATED EVERY PAGE.'),
         look('FISHING JETTY', FX, QUAY + 1, 'THE FISHING JETTY. LANTERNS ALONG IT, AND A CHALKED SIGN: "NO FISHING FROM THE ROYAL PIER."'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x, y) in ((30, 13), (34, 13), (54, 24)):                    # the guards at the palace gate, the shipwright at the yard
    k.solid(x, y, x + 1, y + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FPIER, scene_id=WID,
            actors=[{'sheet': 'npc-watcher', 'x': 30, 'y': 13, 'facing': 'down'}, {'sheet': 'npc-watcher', 'x': 34, 'y': 13, 'facing': 'down'},
                    {'sheet': 'npc-smith', 'x': 54, 'y': 24, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE, 'beacon': [LH[0], round(LH[1] - 5.6 * C45, 2)]})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in land and (c, r) not in PIER and (c, r) not in FPIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('crown done; walkable', len(land))
