"""Station Road — Brambleford's east end, on Verdance (world id "verdance-east"): the part of the village that grows.

  BVENV/bin/python tools/bridge-art/scenes/verdance_east.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance-east

Brambleford's main street carries on east past the last cottages to the old station. When you first walk it, it's a
village end gone quiet: the tea rooms boarded up, the dairy to let, two building plots in the nettles, the halt closed
and the old bridge over the river fallen in. The village fund (the board on the green; js/village.js) mends each in
turn, and each is a scene variant — shut and open — so the place visibly fills up: the Kettle & Crumb with its tables
out, the Wold Dairy's cheeses, two new cottages with people in them, the halt painted and lit for the branch line,
the bridge whole again and the road south over it to the Downs.

North of the road: Rose Cottage, the tea rooms, the plots, the dairy, the station building, the platform under its
canopy and the line running north–south behind it. South: the green with its duck pond sunk in the turf, the old oak and
the fund board; Hobb's Livery, its stable block and white-railed paddock; the lane down to the bridge; the river across
the bottom (the railway crosses it on girders); over it the meadow and the road on. In the house style: one heightfield
(the land rising a little behind the houses, the pond and the river sunk into it with muddy, reedy banks), the richer
house kit, layered hedges and trees inside k.foliage, small life everywhere.
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
WID = 'verdance-east'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 32
FRONT = 10.2                                   # the street-side facades (as Brambleford's)
ST0, ST1 = 10.4, 12.4                          # the street
RIV = (24.9, 27.5)                             # the river's water line (wandering either side)
RZ = -0.3                                      # its water
POND = (7.6, 18.6, 3.1, 1.6)                   # the duck pond on the green: centre, radii
PZ = -0.12
LANE_X = (18.5, 20.0)                          # the lane down to the bridge
BR = (18.3, 20.2, 23.4, 29.0)                  # the bridge
TRACK = (39.9, 41.5)
PLAT = (37.0, 39.6, 1.0, 14.8)
YARD = (26.2, 36.6, 18.2, 22.8)                # the livery's yard
LANE = [(19.25, 12.2), (19.25, 23.6)]
LANE_S = [(19.25, 28.8), (19.1, 30.2), (19.4, 32.6)]
RIVERSIDE = [(20.0, 22.6), (26.4, 22.4)]
GREEN_PATH = [(12.0, 12.6), (12.6, 14.6), (11.8, 16.6), (10.6, 17.2)]
GREEN_PATH2 = [(1.4, 12.6), (3.0, 15.0), (3.2, 19.0), (3.2, 20.9)]
FORE_PATH = [(37.0, 13.8), (37.0, 18.4)]
k = Kit(COLS, ROWS, margin_top=2.6, margin_bottom=0.6, seed=2611)
G.fast_top(k)
rng = k.rng
C = math.cos(math.radians(45))
SMOKE = []


# ---- the land: one heightfield ----------------------------------------------------------------------------------------
def pond_R(th):
    R = 1.0 + 0.08 * math.sin(2 * th + 0.4) + 0.06 * math.sin(3 * th + 1.7) + 0.035 * math.sin(5 * th + 2.3)
    R += 0.16 * math.exp(-((th - 2.6) / 0.35) ** 2) - 0.14 * math.exp(-((th - 0.2) / 0.25) ** 2)
    return R


def pond_d(x, r):
    cx, cr, rx, ry = POND
    u, v = (x - cx) / rx, (r - cr) / ry
    return math.hypot(u, v) / pond_R(math.atan2(v, u))


def pond_edge(th, f=1.0):
    cx, cr, rx, ry = POND
    R = pond_R(th) * f
    return cx + math.cos(th) * rx * R, cr + math.sin(th) * ry * R


def height(x, r):
    z = 0.03 * I.n2(x, r, 1.1, 5)
    z += 0.32 * G.smooth(5.5, -1.0, r)                       # the gardens rising behind the houses
    if r > 28.6:
        z += 0.1 * G.smooth(28.6, 32.5, r)                   # and the meadow over the river
    z -= G.river_depth(x, r, RIV[0], RIV[1], seed=1.3)
    d = pond_d(x, r)
    if d < 1.3:
        z -= 0.1 * G.smooth(1.3, 0.98, d) + 0.16 * G.smooth(0.98, 0.5, d)
    if ST0 - 0.4 < r < 13.9 and x < 38:                    # the street and forecourt lie level
        z *= 0.2
    return z


def material(x, r):
    m = G.river_mat(x, r, RIV[0], RIV[1], seed=1.3)
    if m:
        return m
    d = pond_d(x, r)
    if d < 0.97:
        return 'bed'
    if d < 1.1 + 0.07 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8) > -0.2 else 'gravel'
    if YARD[0] < x < YARD[1] and YARD[2] < r < YARD[3]:
        return 'yard' if I.n2(x, r, 2.2, 3) > -0.35 else 'straw'
    w = 0.34 + 0.08 * I.n2(x, r, 2.0, 9)
    if I.path_dist([LANE, LANE_S], x, r) < 0.75 + 0.06 * I.n2(x, r, 2.0, 7):
        return 'path'
    if I.path_dist([RIVERSIDE, FORE_PATH], x, r) < 0.5 + 0.06 * I.n2(x, r, 2.0, 7):
        return 'path'
    if I.path_dist([GREEN_PATH, GREEN_PATH2], x, r) < w:
        return 'path'
    return 'grass'


ALB = {'grass': (G.GREEN, 0.12), 'path': (F.DIRT, 0.1), 'bank': ('#6a5638', 0.22),
       'bed': ('#3e4a3a', 0.2), 'gravel': ('#8a8274', 0.25), 'yard': ('#8a7050', 0.12), 'straw': ('#c8a860', 0.2)}
CELLS = [(c, r) for c in range(-1, COLS + 1) for r in range(-4, ROWS + 2)]
I.ground(k, CELLS, material, ALB, height=height, bump=0.0, seed=21, dither=0.035, step=0.0625)
G.river_water(k, -1.0, COLS + 1.0, RIV[0], RIV[1], RZ, seed=1.3)
cx_, cr_, rx_, ry_ = POND
outline = [pond_edge(i / 120 * math.tau) for i in range(120)]
k.poly([(cx_, cr_, PZ)] + [(x, r, PZ) for (x, r) in outline] + [(outline[0][0], outline[0][1], PZ)], '#2a5a6a', 'pond_water')

# the street (cobbles, a flagged pavement on the houses' side) and the station forecourt
HK.street(k, -1.0, ST0, 30.0, ST1)
W.cobbles(k, 28.6, ST0, 37.6, 13.8, tone='#a39a8a', size=0.24, lawn=True)
W.street_clutter(k, (0.0, ST0, 37.4, 13.6), seed=2612)

# ---- north of the road ---------------------------------------------------------------------------------------------------
# Rose Cottage: thatch, roses round the door, lived in all along
rm, zr = HK.rich_house(k, 1.0, 5.4, 6.6, FRONT, wall_h=1.95, rise=1.35, roof='#c4a25a', wall='#f0e6cc', door_x=3.2,
                       windows=[(1.9, 0.85), (4.5, 0.85)], chimney=1.7)
SMOKE.append([1.58, round(rm - 0.15 - (zr + 1.05) * C, 3)])

# the old tea rooms (the Kettle & Crumb, once the fund opens it): two floors, two bay windows, the door between
rm, zr = HK.rich_house(k, 6.4, 12.4, 5.4, FRONT, wall_h=2.5, rise=1.5, roof='#b85a3a', wall='#f2e6c8', door_x=9.4,
                       windows_up=[(7.6, 2.1), (9.4, 2.15), (11.2, 2.1)], chimney=11.7)
CAFE_SMOKE = [11.58, round(rm - 0.15 - (zr + 1.05) * C, 3)]
HK.bay_shop(k, 6.8, 8.7, FRONT + 0.02, goods=('#e8c890', '#c8844a', '#f0e0c0', '#a85a3a', '#e8d8b0'))
HK.bay_shop(k, 10.1, 12.0, FRONT + 0.02, goods=('#f0d8a0', '#8a5a3a', '#e0b070', '#f4ecd8', '#c86a4a'))
with k.variant('cafe', 'shut'):
    for (a, b) in ((6.8, 8.7), (10.1, 12.0)):
        G.boards_over(k, a, b, FRONT + 0.36, 0.45, 1.55)
    G.boards_over(k, 9.02, 9.78, FRONT + 0.02, 0.05, 1.35, tone='#7a6a52')
    V.board_sign(k, 'TEA ROOMS', 'IMFellEnglishSC', 9.4, FRONT + 0.03, 1.6, size=0.14, board='#c8bca0', ink='#7a6a58', trim='#8a7a62', pad=0.08)
    G.weeds(k, 6.5, FRONT + 0.4, 12.3, FRONT + 0.7, n=10)
    G.to_let(k, 12.9, FRONT + 0.55)
with k.variant('cafe', 'open'):
    V.board_sign(k, 'The Kettle & Crumb', 'Pacifico', 9.4, FRONT + 0.03, 1.62, size=0.19, board='#2e4a3a', ink='#f4e6c0', trim='#c8a050')
    V.awning(k, 6.6, 8.9, FRONT + 0.4, 1.95, depth=0.55, drop=0.24, cols=('#2e6a4a', '#f0e6d0'))
    V.awning(k, 9.9, 12.2, FRONT + 0.4, 1.95, depth=0.55, drop=0.24, cols=('#2e6a4a', '#f0e6d0'))
    W.hanging_sign(k, 12.55, FRONT, 2.0, icon='mug')
    G.a_board(k, 9.4 + 0.75, ST0 + 0.25)
    HK.tub(k, 6.55, FRONT + 0.55)
    HK.tub(k, 12.2, FRONT + 0.55)
    G.string_lights(k, (6.5, FRONT + 0.05, 2.35), (12.3, FRONT + 0.05, 2.35), sag=0.18, energy=14)
    k.cyl_x(7.2, 7.95, FRONT + 0.75, 0.24, 0.22, 0.22, ('#2a2a30', 0.1), 'bike_wheel', verts=14)        # a bicycle against the bay
    k.tube((7.2, FRONT + 0.75, 0.24), (7.7, FRONT + 0.75, 0.55), 0.018, '#2e6a4a', 'bike', verts=4)
    k.tube((7.95, FRONT + 0.75, 0.24), (7.7, FRONT + 0.75, 0.55), 0.018, '#2e6a4a', 'bike', verts=4)
    k.box(7.0, FRONT + 0.67, 0.42, 7.35, FRONT + 0.83, 0.56, ('#a87038', 0.2), 'bike_basket')

# the building plots, and the cottages the fund puts up on them
with k.variant('homes', 'plots'):
    G.stakes(k, 13.5, 7.2, 16.5, FRONT - 0.1, sign='BUILDING PLOTS')
    G.stakes(k, 17.2, 7.2, 20.2, FRONT - 0.1)
    G.weeds(k, 13.4, 7.0, 20.3, FRONT, n=40)
    for (x, r) in ((17.9, 8.0), (18.3, 8.25), (18.0, 8.4)):
        k.rock(x, r, 0.0, 0.16, 0.14, 0.1, ('#a89c88', 0.2), part='rock', segs=7)
with k.variant('homes', 'built'):
    rm, zr = HK.rich_house(k, 13.4, 16.6, 7.0, FRONT - 0.4, wall_h=1.9, rise=1.3, roof='#c4a25a', wall='#f4ecd8', door_x=15.0,
                           windows=[(14.1, 0.85), (15.9, 0.85)], chimney=13.9)
    rm2, zr2 = HK.rich_house(k, 17.2, 20.4, 7.0, FRONT - 0.4, wall_h=1.9, rise=1.25, roof='#4e5a68', wall='#d8c8a8', door_x=18.8,
                             windows=[(17.9, 0.85), (19.7, 0.85)], chimney=20.0, stone=True)
    V.picket_fence(k, (13.3, FRONT + 0.05), (14.7, FRONT + 0.05))
    V.picket_fence(k, (15.3, FRONT + 0.05), (16.7, FRONT + 0.05))
    V.flower_bed(k, 13.5, FRONT - 0.32, 14.6, FRONT - 0.08)
    V.flower_bed(k, 17.3, FRONT - 0.32, 18.4, FRONT - 0.08)
    G.washing_line(k, (13.6, 6.4), (16.2, 6.2))
HOMES_SMOKE = [[13.78, round(rm - 0.15 - (zr + 1.05) * C, 3)], [19.88, round(rm2 - 0.15 - (zr2 + 1.05) * C, 3)]]

# the dairy: stone, two windows and a wide door; the Wold Dairy once a cheesemaker's in
HK.rich_house(k, 21.4, 27.4, 5.0, FRONT, wall_h=2.2, rise=1.3, roof='#5a4636', wall='#c8bca8', door_x=24.4,
              windows=[(22.4, 0.85), (26.4, 0.85)], chimney=22.1, stone=True)
with k.variant('dairy', 'empty'):
    for wx in (22.4, 26.4):
        G.boards_over(k, wx - 0.34, wx + 0.34, FRONT + 0.06, 0.85, 1.55)
    G.boards_over(k, 24.0, 24.8, FRONT + 0.12, 0.1, 1.3, tone='#7a6a52')
    G.to_let(k, 27.9, FRONT + 0.5)
    G.weeds(k, 21.3, FRONT + 0.3, 27.5, FRONT + 0.7, n=14)
with k.variant('dairy', 'open'):
    V.board_sign(k, 'WOLD DAIRY', 'Rye', 24.4, FRONT + 0.03, 1.72, size=0.17, board='#f0e8d0', ink='#2a4a6a', trim='#2a4a6a')
    k.box(23.98, FRONT + 0.11, 0.06, 24.82, FRONT + 0.14, 1.32, '#1a1410', 'doorway_dark')               # the door stood open
    G.cheese_rack(k, 25.0, 26.9, FRONT + 0.75, levels=2)
    k.box(22.0, FRONT + 0.35, 0.0, 23.3, FRONT + 0.85, 0.5, (G.WOOD, 0.15), 'churn_stand')
    for x in (22.25, 22.65, 23.05):
        G.churn(k, x, FRONT + 0.6)
        I.pose(k, len(k.parts) - 4, (0, 0, 0), dz=0.5)
    k.solid(22.0, FRONT + 0.3, 23.3, FRONT + 0.9)
    G.cheese_wheels(k, 23.7, FRONT + 0.7, n=3)
    HK.tub(k, 21.6, FRONT + 0.55, blooms=('#f0f0f0', '#f0d040'))

# the station: the building on the road, the platform behind it under its canopy, the line north–south
HK.rich_house(k, 28.4, 36.6, 4.6, FRONT, wall_h=2.3, rise=1.3, roof='#4e5a68', wall='#c8b898', door_x=32.5,
              windows=[(29.5, 0.9), (30.9, 0.9), (34.1, 0.9), (35.5, 0.9)], chimney=29.2, stone=True)
V.board_sign(k, 'BRAMBLEFORD HALT', 'AlegreyaSC-Bold', 32.5, FRONT + 0.03, 1.92, size=0.17, board='#2e4a3a', ink='#f0e8c8', trim='#c8a050')
G.platform(k, *PLAT, z=0.24)
G.canopy(k, PLAT[0] + 0.15, PLAT[1] - 0.15, 3.0, 10.4, z=2.05)
G.station_clock(k, 38.3, 10.5, 1.7)
k.box(38.27, 10.4, 1.85, 38.33, 10.46, 2.05, (G.IRON, 0.1), 'clock_hanger')
G.rail_track(k, *TRACK, -4.0, 24.3, z=0.0)
G.girder_bridge(k, TRACK[0], TRACK[1], 24.3, 28.3, z=0.0)
G.rail_track(k, *TRACK, 28.3, ROWS + 1.0, z=0.0)
with k.variant('station', 'closed'):
    for wx in (29.5, 30.9, 34.1, 35.5):
        G.boards_over(k, wx - 0.33, wx + 0.33, FRONT + 0.06, 0.88, 1.6)
    G.barrier(k, 31.8, 33.2, FRONT + 0.7, text='CLOSED')
    G.weeds(k, PLAT[0] + 0.1, PLAT[2], PLAT[1] - 0.3, PLAT[3] - 1.0, n=60)
    G.weeds(k, TRACK[0], -2.0, TRACK[1], 24.0, n=50)
    G.barrier(k, PLAT[0] + 0.1, PLAT[1] - 0.3, PLAT[3] - 1.2, text='NO TRAINS')
with k.variant('station', 'open'):
    W.bench(k, 37.3, 38.4, 3.5, tone='#2e5a3e')
    G.trolley(k, 37.9, 9.0)
    for r in (5.2, 7.2, 12.4):
        HK.tub(k, 37.55, r)
    G.enamel_sign(k, 38.0, 13.6, 0.95, 0.9, 0.35, '#2e4a3a')
    k.box(37.95, 13.55, 0.0, 38.05, 13.6, 0.95, (G.IRON, 0.1), 'sign_post')
    for r in (4.2, 11.4):
        W.lantern_post(k, 39.2, r, h=2.0, energy=26)
    W.lantern_post(k, 28.0, 13.4, h=2.1, energy=30)
    V.board_sign(k, 'TRAINS TO THISTLECOMBE', 'AlegreyaSC-Bold', 32.5, FRONT + 0.03, 1.55, size=0.09, board='#f0e8c8', ink='#2e4a3a', trim='#2e4a3a', pad=0.05)
    G.trolley(k, 35.4, FRONT + 0.8)

# ---- the green: the duck pond, the oak, the fund board ---------------------------------------------------------------------
cx_, cr_ = POND[0], POND[1]
for th in (2.1, 2.6, 3.1, 3.7, 0.4, -0.5, -1.3, 1.1, 4.4):                     # reeds in clumps round the pond
    clump = {shade('#5a8a3a', 0.8): [], '#5a8a3a': [], shade('#6a9a44', 1.12): []}
    for j in range(rng.randint(14, 26)):
        x, r = pond_edge(th + rng.uniform(-0.14, 0.14), rng.uniform(0.93, 1.06))
        h = rng.uniform(0.35, 0.8)
        lean = rng.uniform(-0.12, 0.12)
        clump[rng.choice(list(clump))].append((x, r, max(height(x, r), PZ), h, 0.028, lean, rng.uniform(-0.04, 0.04)))
        if rng.random() < 0.2:
            k.cyl(x + lean * 0.9, r, max(height(x, r), PZ) + h * 0.8, max(height(x, r), PZ) + h * 0.96, 0.026, '#5a3a20', 'cattail', verts=6)
    with k.foliage('leaf'):
        for col, bl in clump.items():
            if bl:
                k.blades(bl, (col, 0.2), 'reed')
for _ in range(22):
    th = rng.uniform(-math.pi, math.pi)
    x, r = pond_edge(th, rng.uniform(0.93, 1.12))
    s = rng.choice((0.07, 0.1, 0.14, 0.2)) * rng.uniform(0.85, 1.15)
    k.rock(x, r, max(height(x, r), PZ - 0.08) - s * 0.25, s, s * 0.8, s * 0.6,
           (shade(rng.choice(('#8a8478', '#9a9080', '#7a766c')), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8)
for _ in range(9):
    x, r = pond_edge(rng.uniform(-math.pi, math.pi), rng.uniform(0.3, 0.8))
    s = rng.uniform(0.12, 0.17)
    k.cyl(x, r, PZ, PZ + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
    if rng.random() < 0.35:
        k.sphere(x + 0.04, r, PZ + 0.04, 0.05, 0.04, '#f0b8d0', 'lily_flower', segs=6)
for c in range(int(cx_ - 3), int(cx_ + 4)):
    for r in range(int(cr_ - 2), int(cr_ + 2)):
        if pond_d(c + 0.5, r + 0.5) < 1.0:
            k.solid(c, r, c + 1, r + 1)
W.tree(k, 13.4, 16.4, h=3.6, tone='#3e6a34', lean=0.12)                      # the old oak, a bench round it
W.round_bench(k, 13.4, 16.4, tone=V.WOOD)
k.solid(12.6, 15.8, 14.2, 17.0)
W.bench(k, 3.4, 4.6, 16.2)                                                    # a bench looking over the pond
W.bulletin_board(k, 15.6, 13.6, w=1.4)                                       # the village fund
V.board_sign(k, 'THE VILLAGE FUND', 'IMFellEnglishSC', 15.6, 13.64, 1.86, size=0.1, board='#3a5a32', ink='#f0e8c8', trim='#d8c890', pad=0.05)
HK.pump(k, 16.6, 20.4)
V.flower_bed(k, 1.2, 13.2, 3.6, 13.7)
V.flower_bed(k, 14.4, 22.2, 16.8, 22.7)
V.signpost(k, 17.4, 13.4, [('BRAMBLEFORD', 'w', 1.55), ('THE STATION', 'e', 1.3), ('THE DOWNS', 'w', 1.0)])
for (x, r) in ((0.6, 13.0), (12.4, 13.0)):
    W.lantern_post(k, x, r, h=2.1, energy=30)
W.lantern_post(k, 20.6, 13.1, h=2.1, energy=30)
F.wildflowers(k, 1.0, 20.5, 12.5, 23.5, 40)
F.wildflowers(k, 2.0, 13.8, 12.0, 15.6, 20)
for (x, r, s) in ((1.0, 21.0, 0.42), (5.2, 22.8, 0.36), (11.4, 21.6, 0.4), (15.4, 18.2, 0.34)):
    W.bush(k, x, r, s=s, tone=rng.choice(('#2e5a2e', '#3a6a34')), berries=rng.choice((None, '#c03050', None)))
    k.solid(x - s, r - s * 0.6, x + s, r + s * 0.6)

# more of the green: a bandstand, a willow over the pond, flowers and clumps everywhere the grass is long
G.bandstand(k, 3.2, 22.2)
G.willow(k, 11.0, 17.6, h=3.1)
W.tree(k, 0.9, 15.2, h=3.4, tone='#4a7a30', lean=0.08)                          # a chestnut at the green's corner, a swing from it
k.solid(0.4, 14.7, 1.4, 15.7)
for dx in (-0.18, 0.18):
    k.tube((1.4 + dx, 15.3, 1.85), (1.4 + dx, 15.3, 0.45), 0.008, '#c8b890', 'swing_rope', verts=4)
k.box(1.18, 15.22, 0.42, 1.62, 15.38, 0.47, (V.WOOD, 0.15), 'swing_seat')
V.picnic_table(k, 6.0, 14.6)
k.solid(5.2, 14.1, 6.8, 15.1)
for (x, r) in ((4.6, 13.2), (8.6, 13.2)):
    HK.tub(k, x, r)
for (x0, r0, x1, r1, n) in ((0.5, 14.0, 6.0, 16.0, 30), (12.5, 18.5, 17.5, 23.5, 35), (5.0, 21.0, 12.0, 23.6, 30)):
    F.wildflowers(k, x0, r0, x1, r1, n)
for (x, r) in ((1.6, 18.2), (12.2, 22.6), (16.0, 16.4), (6.2, 23.2)):
    G.weeds(k, x - 0.4, r - 0.2, x + 0.4, r + 0.2, n=6)
for (x, r) in ((5.6, 13.6), (14.8, 21.2), (2.4, 19.6)):
    s_ = rng.uniform(0.12, 0.22)
    k.rock(x, r, height(x, r) - 0.04, s_, s_ * 0.8, s_ * 0.6, (shade('#8a8478', rng.uniform(0.8, 1.05)), 0.2), part='rock', segs=8)
W.lantern_post(k, 20.5, 17.2, h=2.0, energy=26)
W.lantern_post(k, 18.0, 21.4, h=2.0, energy=26)

# the old orchard behind the hedge: apple trees, the skeps, a bench under them
for (x, r, h) in ((22.6, 15.4, 2.4), (24.9, 15.7, 2.6), (22.9, 18.0, 2.3), (25.2, 18.6, 2.5), (23.8, 20.8, 2.2)):
    F.apple_tree(k, x, r, h=h)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
for (x, r) in ((21.9, 20.9), (22.6, 21.5)):
    F.beehive(k, x, r)
W.bench(k, 23.4, 24.5, 17.1)
F.wildflowers(k, 21.6, 14.4, 26.0, 21.8, 45)

# ---- Hobb's Livery: a thatched stable block facing the yard, the paddock, the trough ----------------------------------------
HK.rich_house(k, 26.6, 35.6, 14.6, 18.0, wall_h=1.75, rise=1.4, roof='#c4a25a', wall='#e8dcc4', door_x=None, windows=[(31.1, 0.9)])
for x in (27.6, 29.4, 32.8, 34.6):
    G.stable_doors(k, x, 18.0, col=rng.choice(('#3a5a3a', '#6a2a2a')))
V.board_sign(k, "HOBB'S LIVERY", 'Rye', 31.1, 18.03, 1.6, size=0.15, board='#2a1a10', ink='#f0c860', trim='#8a6a3a', pad=0.08)
G.paddock(k, [(30.2, 19.4), (36.4, 19.4), (36.4, 22.6), (30.2, 22.6), (30.2, 21.4)])
G.trough(k, 28.0, 29.4, 19.5)
G.hay_rack(k, 33.0, 19.1)
G.mounting_block(k, 29.0, 21.2)
W.cart(k, 25.4, 16.4)
k.solid(24.7, 15.9, 26.1, 16.9)
F.haybale(k, 26.6, 19.5)
k.solid(26.2, 19.1, 26.95, 19.9)
k.cyl(29.8, 18.6, 0.0, 0.4, 0.2, ('#7a5a34', 0.15), 'bucket', verts=10)
W.lantern_post(k, 26.0, 18.4, h=2.0, energy=24)
G.hedge(k, (21.4, 13.9), (26.2, 13.9))
for r in (14.8, 16.2, 19.4, 20.8):                                    # bushes along the orchard's lane side
    W.bush(k, 21.0, r, s=0.42, tone=rng.choice(('#3a6a30', '#2e5a2e')), berries=rng.choice((None, '#c03050')))
    k.solid(20.6, r - 0.3, 21.4, r + 0.3)
G.hedge(k, (36.0, 14.4), (36.0, 17.8))

# ---- the river and its bridges -------------------------------------------------------------------------------------------
G.river_banks(k, -0.8, COLS + 0.8, RIV[0], RIV[1], RZ, seed=1.3, skip=[(BR[0], BR[1]), (TRACK[0] - 0.4, TRACK[1] + 0.4)])
with k.variant('bridge', 'broken'):
    G.arch_bridge(k, BR[0], BR[1], BR[2], BR[3], broken=True)
    G.barrier(k, BR[0] - 0.1, BR[1] + 0.1, BR[2] - 0.15, text='BRIDGE UNSAFE')
with k.variant('bridge', 'mended'):
    G.arch_bridge(k, BR[0], BR[1], BR[2], BR[3])
    for x in (BR[0] - 0.25, BR[1] + 0.05):
        W.lantern_post(k, x + 0.1, BR[2] - 0.3, h=1.9, energy=20)
for c in range(COLS):                                                          # no wading
    for r in range(int(RIV[0] - 0.6), int(RIV[1] + 1.2)):
        a, b = G.river_edges(c + 0.5, RIV[0], RIV[1], 1.3)
        if a - 0.35 < r + 0.5 < b + 0.35 and c not in (18, 19):
            k.solid(c, r, c + 1, r + 1)

# ---- over the river: the meadow and the road on --------------------------------------------------------------------------
V.signpost(k, 21.2, 29.6, [('THE DOWNS', 'e', 1.55), ('THISTLECOMBE', 'e', 1.25), ('BRAMBLEFORD', 'w', 0.95)])
G.hedge(k, (-0.5, 31.5), (17.8, 31.5), flowers=0.3, gap=(9.3, 10.7))
G.hedge(k, (20.8, 31.5), (39.4, 31.5), flowers=0.3)
F.wildflowers(k, 0.5, 28.8, 17.5, 31.0, 50)
F.wildflowers(k, 21.0, 28.6, 39.0, 31.0, 50)
for x in (3.0, 9.5, 14.2, 25.0, 32.5):
    W.tree(k, x, 30.4, h=rng.uniform(2.4, 3.0), tone='#3a6a34')
    k.solid(x - 0.4, 30, x + 0.4, 31)
F.apple_tree(k, 23.0, 29.8, h=2.3)
for (x, r) in ((3.2, 29.2), (5.6, 29.6), (7.8, 29.1), (26.2, 29.4), (28.6, 29.0), (30.8, 29.7), (34.6, 29.3)):
    G.stook(k, x, r)
G.field_gate(k, 10.0, 31.5)

# ---- behind the houses: gardens, trees, the hedge at the top ---------------------------------------------------------------
for x in [i * 2.2 + 0.6 for i in range(18)]:
    if x > 36.5:
        break
    if rng.random() < 0.55:
        W.tree(k, x, 1.2 + rng.uniform(-0.3, 0.3), h=rng.uniform(2.4, 3.1), tone='#3a6a34')
    else:
        W.pine(k, x, 1.0, h=rng.uniform(2.2, 2.8), tone='#2e5a38')
for (x0, x1) in ((1.2, 5.2), (21.6, 27.2)):
    for x in (x0 + 0.6, x1 - 0.6):
        W.bush(k, x, 3.4, s=0.4, tone='#3a6a30', berries=rng.choice((None, '#c03050')))
G.washing_line(k, (1.6, 5.0), (4.6, 4.8))
G.veg_patch(k, 1.6, 2.4, 4.6, 4.2)
G.shed(k, 6.8, 8.2, 3.4, 4.5)
G.veg_patch(k, 8.8, 2.6, 12.0, 4.4, kinds=('bean', 'cabbage', 'onion'))
F.log_pile(k, 21.9, 4.2)
G.shed(k, 25.6, 27.0, 3.4, 4.4, wall='#7a6a50', roof='#5a4636')
for (x, r) in ((13.6, 4.4), (16.4, 3.8), (19.2, 4.6)):
    W.bush(k, x, r, s=0.38, tone='#3a6a30', berries=rng.choice((None, '#c03050')))
HK.stone_wall(k, 0.6, 5.8, 5.6, h=0.5)
HK.stone_wall(k, 21.2, 27.6, 4.9, h=0.5)
F.apple_tree(k, 9.4, 3.6, h=2.2)
G.hedge(k, (-0.5, 4.0), (0.8, 4.0))
for r in (2.0, 6.0, 10.0, 15.0, 19.0, 23.0, 29.5):                           # the east side, past the line
    if r < 24 or r > 28:
        (W.tree if rng.random() < 0.6 else W.pine)(k, 43.0, r, h=rng.uniform(2.3, 3.0), tone=rng.choice(('#3a6a34', '#2e5a38')))
G.hedge(k, (42.0, -1.0), (42.0, 24.0), h=0.7)

# the meadow's grass everywhere the ground is still turf
k.later.append(lambda: W.meadow(k, G.GREEN, cells=CELLS, ok=('ground_grass',), density=1.0, flowers=0.9))

# the edges: nobody walks off the map but by the road west
k.solid(0, 0, COLS, 4)
for c in range(int(PLAT[0]), int(PLAT[1])):                                    # (the platform runs north under the canopy)
    for r in range(1, 4):
        k.blocked.discard((c, r))
k.solid(TRACK[0] - 0.1, -1, COLS, ROWS)
k.solid(0, 31, 18, ROWS)
k.solid(20, 31, COLS, ROWS)

# ---- the light: Verdance's long golden afternoon -------------------------------------------------------------------------------
if os.environ.get('NOVAR'):
    k.variants = []
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle=None if os.environ.get('PREVIEW') else 'day', light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Station Road', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [1, 11]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.5, COLS, ROWS]})


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 0, 'y': 11, 'type': 'enter_world', 'label': 'BRAMBLEFORD', 'prompt': 'PRESS E TO WALK INTO THE VILLAGE', 'target': 'verdance-village', 'spawn': [44, 11]},
    {'x': 0, 'y': 12, 'type': 'enter_world', 'label': 'BRAMBLEFORD', 'prompt': 'PRESS E TO WALK INTO THE VILLAGE', 'target': 'verdance-village', 'spawn': [44, 11]},
    {'x': 15, 'y': 14, 'type': 'village_fund', 'label': 'THE VILLAGE FUND', 'prompt': 'PRESS E TO READ THE FUND'},
    look('ROSE COTTAGE', 3, 11, 'ROSE COTTAGE. THE ROSES ARE OLDER THAN THE COTTAGE, THE OLD WOMAN WHO LIVES THERE SAYS, AND SHE SHOULD KNOW.'),
    {'x': 9, 'y': 11, 'type': 'village_site', 'site': 'cafe', 'label': 'THE TEA ROOMS', 'prompt': 'PRESS E TO LOOK'},
    {'x': 15, 'y': 10, 'type': 'village_site', 'site': 'homes', 'label': 'THE PLOTS', 'prompt': 'PRESS E TO LOOK'},
    {'x': 24, 'y': 11, 'type': 'village_site', 'site': 'dairy', 'label': 'THE DAIRY', 'prompt': 'PRESS E TO LOOK'},
    {'x': 32, 'y': 11, 'type': 'village_site', 'site': 'station', 'label': 'THE STATION', 'prompt': 'PRESS E TO LOOK'},
    {'x': 19, 'y': 23, 'type': 'village_site', 'site': 'bridge', 'label': 'THE OLD BRIDGE', 'prompt': 'PRESS E TO LOOK'},
    look('THE OLD OAK', 13, 17, 'THE GREEN\'S OAK. SOMEONE HAS CARVED "THE DUCKS WERE HERE FIRST" ON THE BENCH.'),
    look('DUCK POND', 8, 17, 'THE DUCK POND. THE DUCKS LOOK AT YOU AS IF YOU OWE THEM BREAD. YOU MIGHT.'),
    look('SIGNPOST', 17, 14, 'BRAMBLEFORD, WEST. THE STATION, EAST. THE DOWNS, OVER THE OLD BRIDGE - "WHEN IT\'S MENDED", SOMEBODY HAS CHALKED UNDER IT.', 'PRESS E TO READ'),
    {'x': 16, 'y': 21, 'type': 'farm_well', 'label': 'PUMP', 'prompt': 'PRESS E TO FILL THE CAN'},
    {'x': 33, 'y': 18, 'type': 'village_livery', 'label': "HOBB'S LIVERY", 'prompt': 'PRESS E TO LOOK IN'},
    look('THE LINE', 38, 15, 'THE BRANCH LINE, NORTH TO THE JUNCTION AND SOUTH OVER THE RIVER TO THISTLECOMBE. THE RAILS ARE BRIGHT AGAIN WHERE THE TRAINS RUN.'),
    {'x': 20, 'y': 29, 'type': 'dialog', 'label': 'THE ROAD SOUTH', 'prompt': 'PRESS E TO READ',
     'dialog': 'THE ROAD SOUTH, OVER THE DOWNS TO THISTLECOMBE ON THE RIVER.'},
    {'x': 31, 'y': 18, 'type': 'dialog', 'label': 'HOBB', 'prompt': 'PRESS E TO TALK', 'dialog': 'HOBB LEANS ON THE HALF DOOR.'},
    {'x': 10, 'y': 11, 'type': 'dialog', 'label': 'JUNIPER', 'prompt': 'PRESS E TO TALK', 'dialog': 'JUNIPER WIPES HER HANDS ON HER APRON.'},
    {'x': 25, 'y': 11, 'type': 'dialog', 'label': 'HESTER', 'prompt': 'PRESS E TO TALK', 'dialog': 'HESTER WOLD NODS OVER A ROUND OF CHEESE.'},
    {'x': 37, 'y': 9, 'type': 'dialog', 'label': 'MR PIKE', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE STATIONMASTER CHECKS HIS WATCH.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-hobb', 'x': 31, 'y': 18, 'facing': 'down'}, {'sheet': 'npc-juniper', 'x': 10, 'y': 11, 'facing': 'down', 'when': 'cafe'},
          {'sheet': 'npc-hester', 'x': 25, 'y': 11, 'facing': 'down', 'when': 'dairy'},
          {'sheet': 'npc-pike', 'x': 37, 'y': 9, 'facing': 'down', 'when': 'station'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS,
            scene_extra={'layers': {'cafe': 'shut', 'homes': 'plots', 'dairy': 'empty', 'station': 'closed', 'bridge': 'broken'},
                         'smoke': SMOKE, 'smokeWhen': {'cafe': [CAFE_SMOKE], 'homes': HOMES_SMOKE}})
print('station road done')
