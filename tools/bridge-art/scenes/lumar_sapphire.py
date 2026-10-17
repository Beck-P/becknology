"""Sapphire Port — the trading town (world id "lumar-sapphire").

  BVENV/bin/python tools/bridge-art/scenes/lumar_sapphire.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-sapphire

The busiest island on the sea: your sloop ties up at the end of the quay, fishing boats at the next pier along. Built in
the Look Book's style (October 2026, after dioramas/lantern_quay.py): a quay of dressed coping over a coursed stone wall
going green at the waterline, steps down to the water and iron ladders, rowboats on their lines to the rings; a flagged
pavement along the house fronts and a cobbled market square worn sandy in places, striped stalls round the well, tubs of
flowers and two trees in their beds; the houses from the richer kit (assets_house.py) at their old footprints — porches,
shutters, flower boxes, jettied upper floors, chimneys smoking — the stone warehouse of the Zephyr trader with its hoist,
and the White House on the square. Up the west hill the Sapphire Light behind a dry-stone wall, a reedy pond sunk into
the turf, gorse and heather and boulders; east, the potter's yard with its kiln, woodpile and shelves of pots, fish drying
on racks, washing on a line, and the morning-tide shrine on the rocks at the point.

PREVIEW=1 renders the night alone at a few samples without the live-light passes and leaves the world JSON alone.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_house as HK              # noqa: E402
import assets_fishport as P            # noqa: E402

HK.install()
OUT = sys.argv[1]
PREVIEW = bool(os.environ.get('PREVIEW'))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-sapphire.json')
COLS, ROWS = 58, 38
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=1301)
rng = k.rng
C45 = math.cos(math.radians(45))
CRYSTAL = ('#1a2a6a', '#4080f0')

LOBES = [(29, 16.5, 23, 9), (9, 18, 6.5, 8), (49, 19, 7.5, 7.5)]
land = I.mask(COLS, ROWS, LOBES, seed=13, amp=0.12)
land = I.flood(land, (29, 17))
QUAY = 24                                         # the quay's front row: everything south of it is the harbour
land = {(c, r) for (c, r) in land if r <= QUAY or not (12 <= c <= 44)}
land |= {(c, QUAY) for c in range(12, 45)}        # the quay runs the town's whole front (the wall was always there)
Q = QUAY + 1.0                                    # the quay's edge

PX, FX = 28, 38                                   # the sloop's pier, the fishing pier
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
FLEN = 6                                          # the fishing pier: a long jetty with a head to fish from
FPIER = I.jetty_cells((FX, QUAY + 1), FLEN, 's')
SHIP_R = QUAY + 4
SL = 7.0

# ---- the land: turf and paths on the hills, a pond sunk into the west hill -------------------------------------------
TOWN = {(c, r) for (c, r) in land if 12 <= c <= 44 and 14 <= r <= QUAY}
PATHS = [[(9.0, 20.5), (12.0, 21.0), (14.0, 20.0)], [(8.6, 19.8), (8.6, 17.0)],
         [(44.0, 20.0), (47.0, 19.5), (52.5, 21.0)], [(29.5, 14.0), (29.5, 10.0)]]
POND = (5.15, 19.55, 1.25, 0.82)                 # centre, radii: on the west hill below the light


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def pond_R(th):
    return (1.0 + 0.08 * math.sin(2 * th + 0.7) + 0.06 * math.sin(3 * th + 2.1) + 0.035 * math.sin(5 * th + 0.3)
            + 0.18 * math.exp(-((th - 2.5) / 0.35) ** 2) - 0.16 * math.exp(-((th + 0.2) / 0.25) ** 2))


def pond_d(x, r):
    cx, cr, rx, ry = POND
    u, v = (x - cx) / rx, (r - cr) / ry
    return math.hypot(u, v) / pond_R(math.atan2(v, u))


def pond_edge(th, s=1.0):
    cx, cr, rx, ry = POND
    R = pond_R(th) * s
    return cx + math.cos(th) * rx * R, cr + math.sin(th) * ry * R


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


POND_Z = -0.12


def height(x, r):
    d = pond_d(x, r)
    if d < 1.3:
        return -0.08 * smooth(1.3, 1.0, d) - 0.22 * smooth(1.0, 0.55, d)
    return 0.0


def material(x, r):
    d = pond_d(x, r)
    if d < 0.98:
        return 'bed'
    if d < 1.14 + 0.08 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8) > -0.25 else 'gravel'
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.45:
        return 'path'
    m = I.n2(x, r, 0.4, 11) + 0.4 * I.n2(x, r, 1.5, 12)
    return 'grass' if m > -0.25 else ('grass_dark' if m > -0.6 else 'stone')


GREEN = '#46633f'
ALB = {'path': ('#8a8070', 0.3), 'grass': (GREEN, 0.3), 'grass_dark': ('#3c5638', 0.3), 'stone': ('#6e727a', 0.25),
       'bank': ('#5e5040', 0.22), 'gravel': ('#7e7a70', 0.25), 'bed': ('#33403a', 0.2)}
POND_CELLS = {(c, r) for (c, r) in land if pond_d(c + 0.5, r + 0.5) < 1.12}

# ---- the town's ground: a flagged pavement along the fronts, the cobbled square, a flagged apron to the quay --------
k.box(12.0, 14.0, -0.3, 45.0, Q - 0.28, -0.12, ('#2e2c28', 0.2), 'ground_fill')
P.flags(k, 12.0, 14.0, 45.0, 14.9, tone='#8a8478')
P.kerb(k, 12.0, 45.0, 14.9)


def worn(x, r):
    n = math.sin(x * 1.3 + 0.7) * math.cos(r * 2.1 - x * 0.4) + math.sin(x * 0.37 + r * 0.9) + 0.4 * math.sin(x * 3.1 + r * 4.7)
    if 25.8 < x < 29.4 and 19.4 < r < 23.2:                                  # where the children chalk their hopscotch
        return False
    return n > 1.4 or math.hypot((x - 29.5) / 1.5, (r - 18.6) / 1.15) < 1.0     # bare in places; the well stands on flags


k.box(12.0, 15.06, -0.08, 45.0, 23.3, -0.015, ('#7a6e5c', 0.3), 'path_grit')                  # sandy grit between the stones
W.cobbles(k, 12.05, 15.06, 44.95, 23.3, tone='#8a8478', size=0.28, skip=worn)
P.flags(k, 28.0, 17.5, 31.0, 19.8, tone='#9a9284')                                             # round the well
P.kerb(k, 12.0, 45.0, 23.3, tone='#a89c88')
P.flags(k, 12.0, 23.46, 45.0, Q - 0.3, tone='#8a8478')                                         # the quay's apron
P.quay_wall(k, 11.9, 44.1, Q, C.WZ, rings=(16.0, 22.6, 34.6, 43.0), skip=())
P.quay_steps(k, 12.3, Q, C.WZ)
P.ladder(k, 26.6, Q, C.WZ)
P.ladder(k, 40.2, Q, C.WZ)
for x in (12.0, 45.0):                                                                          # the square's sides
    k.box(x - 0.08, 14.0, -0.03, x + 0.08, Q - 0.3, 0.05, ('#a89c88', 0.12), 'kerb', bevel=0.012)

I.ground(k, land - TOWN, material, ALB, height=height)
terrain = C.coast(k, land, ground=(material, ALB), palette='sapphire', grass=GREEN, rock='#4a5058', seed=41, beachiness=-0.1,
                  beach_bias=lambda x, r: 0.8 * I.smooth(46.0, 50.0, x) * I.smooth(20.0, 23.0, r),
                  keep_clear=[(11.5, QUAY + 0.6, 45.0, QUAY + 2.2),
                              (PX - 0.4, QUAY, PX + 1.4, SHIP_R + 0.2), (FX - 1.5, QUAY, FX + 2.4, QUAY + 3.6), (FX - 0.6, QUAY, FX + 1.6, QUAY + FLEN + 2.4),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9)],
                  sheer=[(11.9, QUAY + 0.9, 44.1, QUAY + 6.0)])

# the pond's still water, its banks: reeds, stones half in the water, lilies
cx_, cr_, _, _ = POND
outline = [pond_edge(i / 96 * math.tau, 1.0) for i in range(96)]
k.poly([(cx_, cr_, POND_Z)] + [(x, r, POND_Z) for (x, r) in outline] + [(outline[0][0], outline[0][1], POND_Z)], '#2a5a6a', 'pond_water')
P.reeds(k, [(*pond_edge(th, rng.uniform(0.94, 1.04)), POND_Z) for th in (2.2, 2.45, 2.75, 3.1, 3.5, -2.6, -2.25, 0.5, 0.8)])
for _ in range(22):
    th = rng.uniform(-math.pi, math.pi)
    x, r = pond_edge(th, rng.uniform(0.94, 1.12))
    s = rng.choice((0.07, 0.1, 0.13, 0.18)) * rng.uniform(0.85, 1.15)
    k.rock(x, r, max(height(x, r), POND_Z - 0.06) - s * 0.25, s, s * 0.8, s * 0.6,
           (shade(rng.choice(('#8a8478', '#7a7e86', '#6e727a')), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8)
for _ in range(7):
    th, dd = rng.uniform(-math.pi, math.pi), rng.uniform(0.3, 0.75)
    x, r = pond_edge(th, dd)
    s = rng.uniform(0.11, 0.15)
    k.cyl(x, r, POND_Z, POND_Z + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
    if rng.random() < 0.4:
        k.sphere(x + 0.04, r, POND_Z + 0.04, 0.05, 0.04, '#f0f0f8', 'lily_flower', segs=6)
for (c, r) in POND_CELLS:
    k.solid(c, r, c + 1, r + 1)

# ---- the piers, the fishing boats, rowboats on their lines -------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.9, SHIP_R + 0.0, z=0.02)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
I.fishing_jetty(k, (FX, QUAY + 1), FLEN, 's', glow='#80b0ff')
for (bx, sail) in ((FX - 0.95, '#e8e4dc'), (FX + 1.95, None)):
    n0, l0 = len(k.parts), len(k.lights)
    W.boat(k, bx, QUAY + 2.2, length=2.4, sail=sail)
    C.sink(k, n0, C.WZ + 0.12, l0)
P.sloop(k, 13.6, 18.3, Q + 1.45, beam=1.05, hull='#2e3a4a', strake='#2a4a7a', wz=C.WZ)      # a sloop at her moorings, sail furled
P.line(k, (13.7, Q + 1.45, C.WZ + 0.55), (13.5, Q - 0.5, 0.38), sag=0.2)
P.line(k, (18.2, Q + 1.45, C.WZ + 0.55), (17.0, Q - 0.5, 0.38), sag=0.2)
for (x0, x1, cr, hull, ring) in ((20.9, 22.9, Q + 1.3, '#6a3a2a', 22.6), (41.6, 43.6, Q + 0.8, '#3a5a4a', 43.0)):
    n0, l0 = len(k.parts), len(k.lights)
    W.rowboat(k, x0, x1, cr, beam=0.78, hull=hull)
    C.sink(k, n0, C.WZ + 0.12, l0)
    P.line(k, (x1 - 0.1, cr, C.WZ + 0.42), (ring, Q + 0.05, -0.2))
k.cyl(18.6, Q + 2.6, C.WZ - 0.1, C.WZ + 0.22, 0.16, '#c03a2e', 'buoy', verts=14)                 # a buoy off the quay
k.cyl(18.6, Q + 2.6, C.WZ + 0.08, C.WZ + 0.16, 0.165, '#ece4d4', 'buoy', verts=14)
k.cone(18.6, Q + 2.6, C.WZ + 0.22, C.WZ + 0.38, 0.08, 0.02, '#2e2e34', 'buoy', verts=10)

# ---- the town: Lantern Quay's harbour houses along the north of the square, at the old footprints and doors ----------
SMOKE = []


def hh(chimney=None, **kw):
    rm, zr = P.harbour_house(k, chimney=chimney, **kw)
    if chimney is not None:
        SMOKE.append([round(chimney - 0.12, 3), round(rm - 0.15 - (zr + 0.95) * C45, 3)])


hh(x0=13.2, x1=17.0, r_back=10.6, F=14.0, wall_h=2.9, rise=1.45, roof=W.ROOF_SLATE, wall='#e6d6b4', door_x=15.1,
   win_down=[(13.95, 0.62), (16.3, 0.62)], win_up=[(13.95, 1.92), (16.3, 1.92)], chimney=13.8, lanterns=(15.85,))
hh(x0=17.6, x1=21.6, r_back=10.0, F=14.0, wall_h=3.65, rise=1.6, roof='#2a4a7a', wall='#e2c88e', door_x=19.6, door_w=0.95,
   win_down=[(18.3, 0.62), (20.9, 0.62)], win_up=[(18.3, 1.92), (19.6, 1.92), (20.9, 1.92)],
   win_up2=[(18.3, 2.82), (19.6, 2.82), (20.9, 2.82)], chimney=21.0, sign=(21.4, 2.25, 'mug'), lanterns=(18.95, 20.25),
   dormers=(19.6,))
# the Zephyr trader's warehouse: weatherboards over coursed stone, the big door, a loft door and its hoist
hh(x0=22.4, x1=27.2, r_back=9.6, F=14.0, wall_h=3.35, rise=1.5, roof='#3a4256', wall='#7a5a3e', door_x=24.8, door_w=1.3,
   boards=True, hoist=True, win_down=[(23.0, 0.62), (26.6, 0.62)], sign=(27.05, 2.25, 'compass'))
V.board_sign(k, 'ZEPHYR', 'Rye-Regular', 23.15, 14.22, 2.0, size=0.2)
hh(x0=31.8, x1=35.8, r_back=10.0, F=14.0, wall_h=3.25, rise=1.55, roof='#2e5a7a', wall='#d4dccc', door_x=33.0,
   shop=(33.75, 35.5), awning=('#2a4a9a', '#ece0c8'), win_up=[(32.5, 1.92), (33.8, 1.92), (35.1, 1.92)],
   win_up2=[(33.8, 2.62)], chimney=35.2, sign=(32.0, 2.15, 'fish'), lanterns=(32.35,))
# the White House (js/home.js: its door at 38, 13)
hh(x0=36.4, x1=40.4, r_back=10.6, F=14.0, wall_h=2.9, rise=1.45, roof=W.ROOF_SLATE, wall='#f4f1ea', ground='plaster',
   door_x=38.4, win_down=[(37.2, 0.62), (39.6, 0.62)], win_up=[(37.2, 1.92), (39.6, 1.92)], chimney=37.0,
   sign=(40.2, 2.1, 'bread'))
hh(x0=41.0, x1=44.0, r_back=11.4, F=14.4, wall_h=3.75, rise=1.7, roof='#2e5a4a', wall='#ecdcbc', ground='plaster',
   door_x=42.5, win_down=[(41.6, 0.62)], win_up=[(41.6, 1.92), (43.4, 1.92)], win_up2=[(42.5, 2.9)], chimney=43.4)
HK.barrels(k, 21.75, 14.3)                                                     # by the inn, between it and the warehouse
A.crate(k, 27.25, 14.15, s=0.5, tone=A.WOOD_L)
A.crate(k, 27.3, 14.18, s=0.42, z0=0.43, tone=shade(A.WOOD_L, 1.08), solid=False, contents='apples')
k.bar(16.55, 14.45, 16.8, 14.57, 0.0, 0.7, 0.04, (A.WOOD_D, 0.1), 'chalkboard_leg')               # a chalkboard by the inn door
k.box(16.58, 14.47, 0.32, 16.86, 14.55, 0.72, '#2a2e2a', 'chalkboard')
k.boxes([(16.61, 14.55, 0.62, 16.8, 14.56, 0.635), (16.61, 14.55, 0.55, 16.76, 14.56, 0.565)], '#e8e4d8', 'chalk')

k.solid(12, 8, 28, 14)                                    # behind the house rows (under their roofs), either side of the lane
k.solid(31, 8, 45, 14)
W.shore_crystals(k, 30.8, 9.2, col=CRYSTAL, s=1.0, energy=10, solid=False)    # the lookout up the lane: you walk on past
                                                                                              # the bench and the crystals onto the clifftop
W.bench(k, 28.3, 29.7, 10.2)
k.solid(28.3, 10.0, 29.7, 10.5)
P.gorse(k, 31.2, 8.2, s=0.3)
P.wildflowers(k, 28.0, 8.9, rad=0.3, n=10)
P.heather(k, 30.4, 11.6, rad=0.35, n=7)

# ---- the market square ---------------------------------------------------------------------------------------------
W.market_stall(k, 19.6, 21.6, 16.4, 17.2, awning=('#2a4a9a', '#e8e8f0'), goods='produce')
W.market_stall(k, 23.4, 25.4, 16.4, 17.2, awning=('#e8e8f0', '#2a4a9a'), goods='fish')
W.market_stall(k, 32.6, 34.6, 16.4, 17.2, awning=('#c0a040', '#e8e8f0'), goods='produce')
W.market_stall(k, 36.4, 38.4, 16.4, 17.2, awning=('#e8e8f0', '#a03a2e'), goods='fish')
I.well(k, 29.5, 18.6)
P.cat(k, 29.95, 18.95, 0.6)                                                                 # asleep on the well's rim
for (x, r) in ((18.0, 15.6), (27.0, 21.6), (32.0, 21.6), (40.4, 15.6), (14.5, 22.4), (43.0, 22.4)):
    W.lantern_post(k, x, r, energy=18)
    k.point_light(x + 0.3, r + 0.2, 1.9, '#4080ff', 10, radius=0.1, group='flicker')          # blue flame
W.bunting(k, (18.0, 15.6, 2.0), (40.4, 15.6, 2.0), sag=0.5, cols=('#2a4a9a', '#e8e8f0', '#c0a040', '#4080f0'))
for (x, r) in ((18.9, 16.75), (39.0, 16.75), (26.2, 22.0)):          # stock beside the stalls, the square left open
    A.crate(k, x, r, s=0.6, tone=A.WOOD_L)
W.street_clutter(k, (14.0, 15.0, 44.0, 23.0), seed=905, straw=[(19.4, 17.2, 25.6, 18.0), (32.4, 17.2, 38.6, 18.0)], chalk=(27.5, 21.2))
A.barrel(k, 22.5, 16.8, h=0.8, radius=0.3)                                  # in the gaps between the stalls
A.barrel(k, 35.5, 16.8, h=0.8, radius=0.3)
for (bx, br) in ((26.0, 16.6), (26.45, 16.85)):                             # the fishmonger's baskets
    P.fish_basket(k, bx, br)
k.solid(25.6, 16.3, 26.8, 17.1)
V.sacks(k, 39.75, 17.55, n=3, col=('#c8b890', '#d8c8a0', '#b8a880'))          # the spice stall's salt
k.box(14.45, 16.45, 0.0, 14.55, 16.55, 1.3, A.WOOD_D, 'note_post')                           # the trader's note
k.box(14.3, 16.55, 0.85, 14.7, 16.58, 1.25, '#e8dcc0', 'note')
k.solid(14, 16, 15, 17)
W.bench(k, 21.0, 22.6, 20.6)
W.bench(k, 36.4, 38.0, 20.6)
for (tx, tr) in ((15.6, 19.6), (42.4, 19.6)):                               # trees in their beds at the square's ends
    W.tree_bed(k, tx, tr, rad=0.5, grass=GREEN)
    W.tree(k, tx, tr, h=2.5, tone='#2e5a3e')
for (tx, tr) in ((12.6, 15.5), (44.4, 15.5), (17.3, 22.3), (40.7, 22.3), (32.6, 22.5), (14.0, 20.4)):     # tubs of flowers
    HK.tub(k, tx, tr)
# a second row of stalls toward the quay, barrels and a handcart by them; bunting along the quay lamps; gulls
W.market_stall(k, 19.6, 21.6, 21.25, 22.05, awning=('#c0a040', '#e8e8f0'), goods='produce')
W.market_stall(k, 33.2, 35.2, 21.25, 22.05, awning=('#2a4a9a', '#e8e8f0'), goods='fish')
A.barrel(k, 22.1, 21.7, h=0.75, radius=0.28)
A.barrel(k, 35.75, 21.65, h=0.75, radius=0.28, tone=shade(A.WOOD, 0.88))
V.sacks(k, 18.9, 21.75, n=3)
for (bx, br) in ((36.3, 21.45), (36.7, 21.75)):
    P.fish_basket(k, bx, br)
W.cart(k, 18.4, 18.9)
W.bunting(k, (14.5, 22.4, 2.0), (27.0, 21.6, 2.0), sag=0.45, cols=('#2a4a9a', '#e8e8f0', '#c0a040', '#4080f0'))
W.bunting(k, (27.0, 21.6, 2.0), (32.0, 21.6, 2.0), sag=0.3, cols=('#2a4a9a', '#e8e8f0', '#c0a040', '#4080f0'))
W.bunting(k, (32.0, 21.6, 2.0), (43.0, 22.4, 2.0), sag=0.45, cols=('#2a4a9a', '#e8e8f0', '#c0a040', '#4080f0'))
for (gx, gr, f) in ((23.5, 19.2, 1), (36.0, 19.4, -1), (31.4, 22.7, 1), (16.8, 17.6, -1)):
    P.gull(k, gx, gr, facing=f)

# ---- the quay: bollards, pots and nets, barrels, an anchor laid by the edge, gulls --------------------------------------
for x in (13.5, 17.0, 21.0, 24.5, 32.5, 35.5, 41.0):
    P.bollard(k, x, Q - 0.5)
P.pot_stack(k, 15.3, Q - 0.75)
P.rope_coil(k, 18.2, Q - 0.62)
HK.barrels(k, 19.2, Q - 0.85)
P.anchor(k, 22.4, Q - 0.62)
P.gull(k, 24.5, Q - 0.5, z=0.5)
P.gull(k, 26.1, Q - 0.75, facing=-1)
P.net_rack(k, 33.0, 34.9, Q - 0.62)
for (bx, br) in ((36.1, Q - 0.7), (36.55, Q - 0.55)):
    P.fish_basket(k, bx, br)
A.crate(k, 41.5, Q - 0.95, s=0.5, tone=shade(A.WOOD_L, 0.95))
A.crate(k, 41.6, Q - 0.92, s=0.42, z0=0.43, tone=shade(A.WOOD_L, 1.08), solid=False)
P.lobster_pot(k, 42.9, Q - 0.62, solid=True)
P.gull(k, 41.0, Q - 0.5, z=0.5, facing=-1)
A.bucket(k, 31.6, Q - 0.6)
V.sacks(k, 25.9, Q - 0.7, n=3, col=('#c8b890', '#d8c8a0', '#b8a880'))
A.crate(k, 39.3, Q - 0.95, s=0.5, tone=A.WOOD_L)
A.crate(k, 39.35, Q - 0.92, s=0.42, z0=0.43, tone=shade(A.WOOD_L, 1.1), solid=False)
P.rope_coil(k, 44.2, Q - 0.6)
P.lobster_pot(k, 36.95, Q - 0.62)

# ---- the west hill and the Sapphire Light ---------------------------------------------------------------------------
LH = (8.6, 15.6)
I.lighthouse(k, *LH)
P.flags(k, 7.3, 16.35, 9.9, 17.35, tone='#8a8a94')                          # the flagged apron at its door
HK.stone_wall(k, 6.7, 10.5, 14.25)
for (x, r) in ((11.4, 14.6), (6.2, 15.0), (3.7, 16.7)):
    W.pine(k, x, r, h=2.4)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
for (x, r, s) in ((4.4, 21.9, 0.34), (10.7, 22.9, 0.3), (12.3, 18.4, 0.28), (7.2, 22.2, 0.26)):
    P.gorse(k, x, r, s=s)
    k.solid(x - 0.3, r - 0.25, x + 0.3, r + 0.25)
for (x, r) in ((10.6, 17.3), (4.2, 14.9), (6.6, 21.0), (9.6, 23.9)):
    P.heather(k, x, r)
for (x, r, s) in ((3.6, 18.2, 0.32), (11.6, 24.6, 0.36), (6.1, 24.7, 0.3)):
    P.boulder(k, x, r, s=s)
for (x, r) in ((7.6, 19.0), (10.2, 15.5), (5.0, 17.4), (12.8, 22.6)):
    P.wildflowers(k, x, r)

# ---- east: the potter's yard, drying racks, washing, the morning-tide shrine ---------------------------------------------
KILN = (47.5, 16.8)
SMOKE.append([round(v, 3) for v in I.kiln(k, *KILN)])
W.potter_wheel(k, 45.4, 18.6)
A.wood_pile(k, 49.1, 50.5, 16.35)
k.box(44.25, 15.55, 0.0, 45.75, 15.95, 0.04, (A.WOOD_D, 0.12), 'shelf')                    # the potter's drying shelves
for z in (0.42, 0.84):
    k.box(44.25, 15.55, z, 45.75, 15.95, z + 0.05, (A.WOOD, 0.12), 'shelf')
for xs in (44.3, 45.65):
    k.box(xs, 15.55, 0.0, xs + 0.06, 15.95, 1.2, A.WOOD_D, 'shelf_post')
for zi, z in enumerate((0.04, 0.47, 0.89)):
    x = 44.45
    while x < 45.6:
        h = rng.uniform(0.18, 0.3)
        k.cyl(x, 15.75, z, z + h, rng.uniform(0.07, 0.1), (rng.choice(('#2a5a9a', '#a05a3a', '#e0d8c8', '#c8a070', '#3a7a8a')), 0.1),
              'pot', verts=10)
        x += rng.uniform(0.22, 0.3)
k.solid(44.25, 15.55, 45.75, 15.95)
I.drying_rack(k, 49.0, 51.6, 19.8)
I.drying_rack(k, 46.0, 48.2, 21.6)
P.washing(k, 53.2, 55.6, 18.4)
SHRINE = (54.0, 21.2)
I.standing_stone(k, SHRINE[0], SHRINE[1], h=1.0, tone='#8a90a0', glyph=CRYSTAL[1])
for i in range(6):
    a = i * math.pi / 5
    k.cyl(SHRINE[0] + math.cos(a) * 0.6, SHRINE[1] + 0.3 + math.sin(a) * 0.3, 0.0, 0.05, 0.05, '#e8dcc0', 'shell', verts=6)
for (dx, dr) in ((-0.35, 0.45), (0.4, 0.42)):                               # candles left for the boats
    k.cyl(SHRINE[0] + dx, SHRINE[1] + dr, 0.0, 0.16, 0.035, '#f0e8d0', 'candle', verts=8)
    k.sphere(SHRINE[0] + dx, SHRINE[1] + dr, 0.2, 0.025, 0.035, '#ffd890', 'candle_flame', emit=('#ffc060', 0.9), segs=6)
    k.point_light(SHRINE[0] + dx, SHRINE[1] + dr + 0.1, 0.3, '#ffc070', 3, radius=0.05, group='flicker')
P.wildflowers(k, SHRINE[0] - 0.1, SHRINE[1] + 0.75, rad=0.3, n=8, cols='#f0f0f0')
for (x, r, s) in ((51.0, 14.6, 0.9), (55.0, 18.4, 0.8), (6.0, 23.0, 0.8), (44.2, 11.0, 1.0), (10.8, 11.2, 0.9),
                  (52.6, 23.2, 0.7)):
    W.shore_crystals(k, x, r, col=CRYSTAL, s=s, energy=10, solid=s > 0.75)
for (x, r) in ((49.8, 13.6), (53.2, 16.4), (44.8, 24.0)):
    W.tree(k, x, r, h=2.4, tone='#2e4a44')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
for (x, r, s) in ((47.2, 13.4, 0.3), (55.4, 20.3, 0.3), (51.9, 24.3, 0.28)):
    P.gorse(k, x, r, s=s)
    k.solid(x - 0.3, r - 0.25, x + 0.3, r + 0.25)
for (x, r) in ((46.0, 23.6), (54.4, 15.2), (48.4, 12.6)):
    P.heather(k, x, r)
P.boulder(k, 56.0, 22.3, s=0.36)
for (x, r) in ((50.2, 22.9), (47.4, 19.9), (52.2, 17.7)):
    P.wildflowers(k, x, r)
k.solid(45, 18, 46, 19)                                   # the potter at the wheel
k.solid(25, 15, 26, 16)                                   # the trader at the warehouse door

# the edges of the turf above the rocks: low heather, flowers and stones (nothing you have to walk round)
KEEP = {(8, 18), (6, 16), (6, 23), (51, 14), (52, 23), (44, 11), (52, 15), (54, 22), (3, 21)}
for (c, r) in sorted(land - TOWN - POND_CELLS):
    if (c, r) in KEEP or pd(c + 0.5, r + 0.5) < 0.9 or not any((c + dc, r + dr) not in land for dc in (-1, 0, 1) for dr in (-1, 0, 1)):
        continue
    x, rr = c + rng.uniform(0.2, 0.8), r + rng.uniform(0.2, 0.8)
    roll = rng.random()
    if roll < 0.3:
        P.heather(k, x, rr, rad=0.3, n=6)
    elif roll < 0.5:
        P.wildflowers(k, x, rr, rad=0.25, n=8)
    elif roll < 0.62:
        P.boulder(k, x, rr, s=rng.uniform(0.12, 0.2), solid=False)
for (x, r) in ((47.3, 12.2), (5.0, 13.6)):
    W.tree(k, x, r, h=2.3, tone='#2e4a44')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
W.cart(k, 44.0, 17.8)

# ---- the grass ------------------------------------------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6 or pond_d(x, r) < 1.18
I.tufts(k, [c for c in land - TOWN if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#527248', per_cell=1.0,
        avoid=busy)
I.pebbles(k, land - TOWN - POND_CELLS, '#6a6e78', per_cell=0.2, avoid=busy)

k.area_light(29.0, 16.0, 16.0, '#8a98d0', 2600, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(29.0, 18.0, 4.0, '#d8e0ff', 50, radius=1.5)

if PREVIEW:
    os.environ['SCENE_NOLIT'] = '1'
    k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}}, light_samples=int(os.environ.get('PREVIEW_SAMPLES', 12)),
             world_light=('#26344e', 0.8))
    sys.exit(0)
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#26344e', 0.8))

# ---- the world -----------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
byl = {}
for i in old['interactions']:
    byl.setdefault(i.get('label'), []).append(i)


def keep(label, x, y, n=0):
    it = dict(byl[label][n])
    it.update({'x': x, 'y': y})
    return it


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Sapphire Port', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         keep('DOCK', PX, QUAY + 2),
         keep('ZEPHYR TRADER', 25, 15),
         keep('POTTER', 45, 18),
         keep('STALL', 20, 18, 0),
         keep('STALL', 33, 18, 1),
         keep('BLUE FLAME LANTERN', 18, 16),
         keep('SAPPHIRE CRYSTAL', 52, 15),
         keep('MORNING TIDE', 54, 22),
         keep("TRADER'S NOTE", 14, 17),
         look('FISH STALL', 24, 18, 'TODAY\'S CATCH ON ICE: SILVERFIN, REEF EEL, A BLUE CRAB THE SIZE OF A HAT.\n\n"ALL CAUGHT THIS MORNING. MOST OF IT ON PURPOSE."'),
         look('SPICE STALL', 37, 18, 'SACKS OF SALT IN SIX COLOURS, DRIED SPORE-PEPPER, SAPPHIRE SUGAR THAT GLOWS IN THE DARK.\n\nA SIGN: "TASTERS - ONE GRAIN ONLY."'),
         look('WELL', 29, 20, 'THE WATER AT THE BOTTOM GLOWS FAINTLY BLUE.\n\nCOINS GLINT DOWN THERE - WISHES FROM EVERY PORT ON THE SEA.'),
         look('WAREHOUSE', 24, 15, 'THE ZEPHYR TRADING CO. WAREHOUSE. THE DOORS ARE BARRED; SOMETHING INSIDE TICKS LIKE A COOLING KILN.\n\nCHALKED ON THE DOOR: "BLUE GLASS - ASK INSIDE".'),
         look('SAPPHIRE LIGHT', 9, 16, 'THE LIGHTHOUSE ON THE WEST HILL, BANDED BLUE AND WHITE.\n\nITS BEAM BURNS BLUE: A SAILOR\'S TRICK FOR SAPPHIRE WATERS. THE KEEPER HASN\'T BEEN SEEN IN WEEKS, BUT THE LAMP NEVER GOES OUT.\n\nTHE DOOR AT ITS FOOT IS ON THE LATCH.'),
         {'x': 8, 'y': 16, 'type': 'enter_world', 'target': 'lumar-sapphire-lighthouse', 'spawn': [6, 10], 'label': 'LIGHTHOUSE',
          'prompt': 'PRESS E TO ENTER'},
         look('KILN', 47, 18, 'A BEEHIVE KILN, ITS MOUTH GLOWING ORANGE. THE HEAT HITS YOU FROM THREE STEPS AWAY.\n\nSUNLIGHT SPORES, BURNING HOTTER THAN ANYTHING.'),
         look('DRYING RACKS', 50, 21, 'SILVERFIN DRYING IN THE SEA WIND. THE GULLS HAVE TAKEN EXACTLY ONE FROM EACH RACK, AS IF BY AGREEMENT.'),
         look('LOOKOUT', 29, 11, 'UP THE LANE BEHIND THE HOUSES, A BENCH FACING NORTH OVER THE OPEN SEA.\n\nON A CLEAR NIGHT YOU CAN SEE MIDNIGHT ISLE FROM HERE - AND, NOW AND THEN, A LIGHT MOVING ON IT.'),
         look('FISHING BOATS', FX, QUAY + 1, 'TWO BOATS AT THE FISHING PIER, NETS PILED IN THEIR BOWS.\n\nONE IS NAMED "MORNING TIDE II". THERE IS NO SIGN OF THE FIRST ONE.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FPIER, scene_id='lumar-sapphire',
            actors=[{'sheet': 'npc-trader', 'x': 25, 'y': 15, 'facing': 'down'},
                    {'sheet': 'npc-potter', 'x': 45, 'y': 18, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE, 'beacon': [LH[0], round(LH[1] - 5.6 * C45, 2)]})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in land and (c, r) not in PIER and (c, r) not in FPIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['collisions'][QUAY - 1][19] = 0                  # the sailors' row along the quay stays open (the barrels' foot just touches it)
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('sapphire done; walkable', len(land))
