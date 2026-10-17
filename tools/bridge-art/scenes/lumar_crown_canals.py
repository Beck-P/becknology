"""Crownhaven's canal quarter and Guild Row (world id "lumar-crown-canals").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown_canals.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown-canals

North of the Old Town's walls, where the merchants built when the old town got too small: two canals running east-west
off the harbour, each with a quay on its north side and houses fronting it — tall, gable-fronted merchant houses with
hoist beams and loft doors on Merchants' Quay, the working shops of the guilds on Guild Row (the sailmaker's loft with a
sail hung out to dry and canvas spread on the stones, the chartmaker's bow window of charts and a globe, the instrument
maker's brass in the window and a great clock on a bracket); humpbacked bridges between, barges and canal boats moored
to striped poles, the Canal Market on the south bank by the water stairs. North of Guild Row the hill rises, and the
funicular climbs it to the academy, the observatory and the palace.

Ways out: the SOUTH GATE (the Old Town's North Gate) and the FUNICULAR (js/capital.js wires it once the hill is on
main). Kit: assets_capital.py (canal, humpback, barge, gondola, mooring_pole, town_house, row).
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_capital as CAP           # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_house as HK              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown-canals.json')
WID = 'lumar-crown-canals'
COLS, ROWS = 56, 40
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=1.0, margin_x=0.5, seed=5202)
rng = k.rng
C45 = math.cos(math.radians(45))

# ---- the plan (fronts face the camera) ------------------------------------------------------------------------------
G = (3.4, 6.6)             # Guild Row (back, front)
FUNI = (41.4, 48.6)        # the funicular's square, a gap in Guild Row
GQ = (6.6, 10.4)           # Guild Quay
CA = (10.4, 13.8)          # the Upper Canal
BR_A = [(12.0, 13.6), (30.0, 31.6)]
M = (15.6, 18.4)           # Merchants' Quay's houses
M_GAPS = [(11.6, 14.0), (29.6, 32.0), (46.0, 47.6)]
MQ = (18.4, 21.8)          # Merchants' Quay
CB = (21.8, 25.2)          # the Lower Canal
BR_B = [(20.0, 21.6), (40.0, 41.6)]
S = (27.0, 29.8)           # the south row
MARKET = (24.0, 34.0)      # the Canal Market: a gap in the south row, on the canal's south bank
S_GAPS = [(19.6, 22.0), (39.6, 42.0), MARKET]
GS = (29.8, 34.6)          # Gate Street
SWALL = 35.6               # the Old Town's north wall (its top, here)
GATE_X = 28.0

# ---- ground --------------------------------------------------------------------------------------------------------
k.box(-0.6, -3.5, -0.3, COLS + 0.6, 40.0, -0.06, ('#3a3632', 0.12), 'ground')


def worn(x, r):
    n = math.sin(x * 1.3 + 0.7) * math.cos(r * 2.1 - x * 0.4) + math.sin(x * 0.37 + r * 0.9) + 0.4 * math.sin(x * 3.1 + r * 4.7)
    return n > 1.35


CAP.flagged(k, -0.6, GQ[0], COLS + 0.6, CA[0] - 0.3, tone='#948a7a')        # Guild Quay: big flags
CAP.flagged(k, -0.6, MQ[0], COLS + 0.6, CB[0] - 0.3, tone='#8e8676')        # Merchants' Quay
CAP.lane(k, -0.6, GS[0], COLS + 0.6, GS[1], worn=worn)                       # Gate Street
CAP.flagged(k, FUNI[0], -1.0, FUNI[1], GQ[0], tone='#9a9080')               # the funicular's square
CAP.flagged(k, MARKET[0], CB[1], MARKET[1], GS[0], tone='#a09684')          # the Canal Market
for (ga, gb) in M_GAPS:
    CAP.lane(k, ga, CA[1], gb, MQ[0], tone='#8e8676')
for (ga, gb) in S_GAPS[:2]:
    CAP.lane(k, ga, CB[1], gb, GS[0], tone='#8e8676')

# ---- the canals and their bridges ------------------------------------------------------------------------------------
CAP.canal(k, -0.6, COLS + 0.6, CA[0], CA[1], seed=31, steps=[6.0, 24.5, 50.0])
CAP.canal(k, -0.6, COLS + 0.6, CB[0], CB[1], seed=32, steps=[15.0, MARKET[0] + 1.2, MARKET[1] - 1.2, 49.0])
for (x0, x1) in BR_A:
    CAP.humpback(k, x0, x1, CA[0] - 0.3, CA[1] + 0.2)
for (x0, x1) in BR_B:
    CAP.humpback(k, x0, x1, CB[0] - 0.3, CB[1] + 0.2)
# the Canal Market's own quay along the south bank: a low wall with the water stairs (the canal's far side, seen here)
k.box(MARKET[0], CB[1] - 0.15, CAP.CANAL_Z - 0.2, MARKET[1], CB[1] + 0.15, 0.04, (shade(CAP.STONE_L, 0.92), 0.12), 'quay_coping')

# boats: barges along the quays, canal boats at their poles, a skiff under a bridge
rr = random.Random(41)
for (x0, x1, rc) in ((2.0, 6.0, CA[0] + 0.7), (16.0, 20.5, CA[0] + 0.7), (34.0, 38.5, CA[0] + 0.7),
                     (2.5, 7.0, CB[0] + 0.7), (25.6, 30.0, CB[1] - 0.9), (44.0, 48.5, CB[0] + 0.7)):
    CAP.barge(k, x0, x1, rc, rng=rr)
for (x0, x1, rc) in ((8.0, 10.6, CA[0] + 1.6), (40.0, 42.6, CA[0] + 1.8), (51.0, 53.6, CA[0] + 0.8),
                     (9.0, 11.6, CB[0] + 1.7), (33.0, 35.6, CB[0] + 1.6), (51.5, 54.1, CB[0] + 1.5)):
    CAP.gondola(k, x0, x1, rc)
for (x, rc, cols) in ((7.6, CA[0] + 0.9, ('#e8e0d0', '#3a6a9a')), (10.9, CA[0] + 0.9, ('#e8e0d0', '#3a6a9a')),
                      (39.6, CA[0] + 1.0, ('#e8e0d0', '#9a3a3a')), (43.0, CA[0] + 1.0, ('#e8e0d0', '#9a3a3a')),
                      (8.6, CB[0] + 0.9, ('#e8e0d0', '#2e6a4a')), (12.0, CB[0] + 0.9, ('#e8e0d0', '#2e6a4a')),
                      (32.6, CB[0] + 0.9, ('#e8e0d0', '#c8a040')), (36.0, CB[0] + 0.9, ('#e8e0d0', '#c8a040'))):
    CAP.mooring_pole(k, x, rc, cols=cols)

# ---- the hill to the north: its foot, the funicular's lower station and its track climbing out of the picture --------
I.ground(k, {(c, r) for c in range(0, COLS) for r in range(-3, 3)}, lambda x, r: 'grass', {'grass': ('#3a5a3a', 0.3)})
with k.foliage('leaf'):
    for (tx, tr) in ((4.0, 1.4), (11.0, 0.6), (18.0, 1.2), (26.0, 0.4), (33.0, 1.0), (52.0, 0.8)):
        W.tree(k, tx, tr, h=2.6, tone=rng.choice(('#2e5a3a', '#3a6234', '#2a5434')))
with k.foliage('needle'):
    for (tx, tr) in ((7.5, -0.4), (22.0, -0.2), (37.0, 0.2), (55.0, -0.3)):
        W.pine(k, tx, tr, h=2.8, tone='#24463a')
SX = (FUNI[0] + FUNI[1]) / 2           # the station, square to the funicular's square
k.box(SX - 2.4, -1.6, -0.02, SX + 2.4, 2.4, 0.3, (W.SALT[2], 0.16), 'footing')
k.box(SX - 2.3, -1.5, 0.3, SX + 2.3, 2.3, 2.6, ('#e6d6b4', 0.08), 'house_wall')
CAP.coursed(k, SX - 2.3, SX + 2.3, 0.3, 1.0, 2.3, '#9a9080', skip=[(SX - 0.9, SX + 0.9, 0, 2.2)])
for i in range(9):                                           # a great arched mouth onto the platform
    a0, a1 = math.pi * i / 9, math.pi * (i + 1) / 9
    pts = [(SX - math.cos(a) * rr_, 2.32, 1.3 + math.sin(a) * rr_ * 0.8) for (a, rr_) in ((a0, 1.0), (a1, 1.0), (a1, 1.25), (a0, 1.25))]
    k.quads([tuple(pts)], ('#efe6d2', 0.08), 'voussoir')
k.box(SX - 1.0, 2.26, 0.0, SX + 1.0, 2.31, 1.3, '#5a3a18', 'window_glass', emit=('#ffc070', 0.6))
k.box(SX - 0.8, 2.25, 1.3, SX + 0.8, 2.3, 2.0, '#5a3a18', 'window_glass', emit=('#ffc070', 0.5))
W._gable_roof(k, SX - 2.3, SX + 2.3, -1.5, 2.3, 2.6, 1.2, '#3e7a6a')
V.board_sign(k, 'FUNICULAR', 'AlegreyaSC-Bold', SX, 2.32, 2.25, size=0.24, board='#2a3a2e')
k.point_light(SX, 3.0, 1.0, '#ffc070', 30, radius=0.6, group='flicker')
# the track: two rails on sleepers climbing north up the slope and off the top of the picture, a car waiting at the top
for i in range(14):
    r = -1.2 - i * 0.3
    z = 0.4 + i * 0.32
    k.box(SX - 0.7, r - 0.08, z - 0.06, SX + 0.7, r + 0.08, z, ('#5a4030', 0.14), 'sleeper')
for dx in (-0.45, 0.45):
    k.tube((SX + dx, -1.0, 0.36), (SX + dx, -5.4, 0.36 + 14 * 0.32), 0.035, '#6a6a70', 'rail', verts=6)
k.box(SX - 0.12, -3.8, 0.4, SX + 0.12, -1.2, 0.5 + 0.32 * 9, ('#7e786c', 0.14), 'track_bed')
k.solid(SX - 2.4, -1.6, SX + 2.4, 2.3)
for s in (-1, 1):
    W.lantern_post(k, SX + s * 2.8, 3.2, energy=26)
    k.solid_post(SX + s * 2.8, 3.2)

# ---- Guild Row -------------------------------------------------------------------------------------------------------
SMOKE = []


def chimney_smoke(cx, rm_zr):
    rm, zr = rm_zr
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 1.05) * C45, 3)])


gr = random.Random(301)
# the sailmaker's loft: three storeys of weatherboard, loft doors open on the top floor, a sail hung out to dry
SAIL = (3.4, 9.4)
CAP.town_house(k, SAIL[0], SAIL[1], G[0], G[1], storeys=3, roof='#44567a', wall='#8a6a4a', boards=True, door_x=5.2, door_w=1.2,
               shop=(6.2, 8.8), wins=[4.6, 8.2], hoist=True, rng=gr)
LX = (SAIL[0] + SAIL[1]) / 2
k.box(LX - 0.9, G[1] + 0.38, 1.95, LX + 0.9, G[1] + 0.42, 3.2, ('#ece4d0', 0.08), 'sail_canvas')       # the sail, hung from the hoist
for zz in (2.3, 2.7, 3.05):
    k.box(LX - 0.9, G[1] + 0.42, zz, LX + 0.9, G[1] + 0.44, zz + 0.03, '#c8bca0', 'sail_seam')
k.box(LX - 0.95, G[1] + 0.36, 3.2, LX + 0.95, G[1] + 0.46, 3.26, (A.WOOD, 0.12), 'sail_yard')
V.board_sign(k, 'RIGG & DAUGHTERS · SAILMAKERS', 'AlegreyaSC-Bold', LX, G[1] - 0.36 + 0.02, 1.72, size=0.17, board='#2e3a4a')
# canvas spread on the quay in front, with a bench, a palm-iron and a bucket of twine
k.box(4.0, GQ[0] + 0.6, 0.0, 8.6, GQ[0] + 2.2, 0.025, ('#e4dcc8', 0.08), 'sail_canvas')
for xx in (4.5, 5.6, 6.7, 7.8):
    k.box(xx, GQ[0] + 0.6, 0.025, xx + 0.04, GQ[0] + 2.2, 0.035, '#c8bca0', 'sail_seam')
k.solid(4.0, GQ[0] + 0.6, 8.6, GQ[0] + 2.2)
W.bench(k, 8.9, 10.0, GQ[0] + 0.5)
k.solid(8.9, GQ[0] + 0.3, 10.0, GQ[0] + 0.75)
A.bucket(k, 3.6, GQ[0] + 0.5)

# the chartmaker's: a bow window full of charts, a globe on a bracket
CH = (9.8, 14.6)
CAP.town_house(k, CH[0], CH[1], G[0], G[1], storeys=3, roof='#2e5a4a', wall='#e8d8c0', ground='stone', door_x=13.6, wins=[10.9, 12.2, 13.6], rng=gr)
HK.bay_shop(k, 10.1, 12.8, G[1] - 0.36, goods=('#e8dcb0', '#d8c8a0', '#c8b890', '#3a5a7a', '#e0d0a8'))
V.board_sign(k, 'PENN · CHARTMAKER', 'IMFellEnglishSC-Regular', 12.2, G[1] - 0.36, 1.86, size=0.18, board='#2a2a3a')
GX, GR, GZ = 14.35, G[1] + 0.25, 2.35                                     # the globe on its bracket
k.tube((GX, G[1] - 0.36, GZ + 0.3), (GX, GR + 0.2, GZ + 0.3), 0.02, A.IRON, 'sign_bracket', verts=5)
k.sphere(GX, GR + 0.2, GZ, 0.24, 0.24, ('#3a6a8a', 0.1), 'globe', segs=14)
k.cyl_x(GX - 0.27, GX + 0.27, GR + 0.2, GZ, 0.26, 0.26, W.BRASS, 'globe_ring', verts=16)
k.box(GX - 0.1, GR + 0.15, GZ - 0.06, GX + 0.1, GR + 0.43, GZ + 0.12, ('#6a8a4a', 0.1), 'globe')

# the instrument maker's: brass in the window, a great clock on a bracket
IN = (14.6, 19.0)
CAP.town_house(k, IN[0], IN[1], G[0], G[1], storeys=2, roof='#6a3a2a', wall='#d4dccc', door_x=18.2, shop=(15.0, 17.4),
               awning_cols=('#2e4a5a', '#e8dcc0'), wins=[15.6, 17.2, 18.4], rng=gr)
for (ix, kind) in ((15.4, 'scope'), (16.1, 'sext'), (16.8, 'scope')):                                    # brass on show
    if kind == 'scope':
        k.tube((ix - 0.1, G[1] - 0.3, 0.75), (ix + 0.12, G[1] - 0.3, 1.2), 0.04, W.BRASS, 'brass', verts=8)
    else:
        k.cyl_y(ix, G[1] - 0.32, G[1] - 0.28, 1.0, 0.18, 0.18, W.BRASS, 'brass', verts=10)
CX, CR = 17.9, G[1] + 0.35                                                                               # the clock
k.tube((CX, G[1] - 0.36, 2.55), (CX, CR, 2.55), 0.03, A.IRON, 'sign_bracket', verts=5)
k.cyl_y(CX, CR - 0.06, CR + 0.06, 2.3, 0.3, 0.3, ('#1e2a3a', 0.08), 'clock_case', verts=18)
k.cyl_y(CX, CR + 0.05, CR + 0.08, 2.3, 0.25, 0.25, '#f0e8d0', 'clock_face', verts=18, emit=('#fff0c0', 0.25))
k.box(CX - 0.012, CR + 0.08, 2.3, CX + 0.012, CR + 0.1, 2.5, '#1a1a1e', 'clock_hand')
k.box(CX, CR + 0.08, 2.29, CX + 0.15, CR + 0.1, 2.31, '#1a1a1e', 'clock_hand')
V.board_sign(k, 'O. BRASSWORTH · INSTRUMENTS', 'IMFellEnglishSC-Regular', 16.4, G[1], 1.8, size=0.15, board='#1e2a3a')

# the rest of Guild Row: a cooper, a ropemaker's shop, a lantern maker, a counting house, the guild hall
built = CAP.row(k, 19.0, FUNI[0], G[0], G[1], seed=302, smoke=SMOKE, storeys=(2, 3, 3), shops=0.6,
                signs=[(21.0, 'anvil'), (27.0, 'bottle'), (35.0, 'compass')])
# the Guild Hall: a wide stone front, arched windows, the guilds' banners
GH = (FUNI[1], 55.6)
CAP.town_house(k, GH[0], GH[1], G[0] - 0.4, G[1], storeys=3, roof=W.ROOF_SLATE, wall='#c8bca8', ground='stone', door_x=52.0,
               door_w=1.1, wins=[49.4, 50.8, 52.0, 53.2, 54.6], wins_down=[49.6, 54.4], chimney=50.0, rng=gr)
for (bx, col) in ((49.0, '#8a2a2a'), (50.6, '#2e5a8a'), (53.4, '#3a6a3a'), (55.0, '#c8a040')):
    k.box(bx - 0.18, G[1] + 0.38, 2.3, bx + 0.18, G[1] + 0.41, 3.4, (col, 0.08), 'banner')
    k.box(bx - 0.07, G[1] + 0.41, 2.8, bx + 0.07, G[1] + 0.42, 3.0, W.BRASS, 'banner_badge')
V.board_sign(k, 'THE GUILD HALL', 'CinzelDecorative-Bold', 52.0, G[1] - 0.36, 1.86, size=0.18, board='#3a2414')
k.solid(-0.6, G[0], SAIL[0], G[1])
# the yards behind Guild Row (behind its roofs)
k.box(-0.6, 2.4, -0.05, COLS + 0.6, G[0], 0.02, ('#4a4a3e', 0.3), 'yard')

# ---- Merchants' Quay: gable-fronted merchant houses with hoists, the counting houses ------------------------------------
mrow = CAP.row(k, -0.6, COLS + 0.6, M[0], M[1], seed=303, gaps=M_GAPS, smoke=SMOKE, storeys=(3, 3, 2), shops=0.25,
               gable_front=0.6, widths=(2.2, 3.0), walls=('#e6d6b4', '#d8c8a8', '#c8d4d8', '#e0c8c0', '#a87a5a', '#8a5a4a', '#c8b090'),
               signs=[(5.0, 'fish'), (36.0, 'mug')])
for (xa, xb, dx, rmzr, rfi) in mrow:
    if gr.random() < 0.45 and xb - xa > 2.2:                     # a hoist beam over the loft door, a crate halfway up
        hx = (xa + xb) / 2
        k.box(hx - 0.06, M[1] + 0.1, 3.78, hx + 0.06, M[1] + 0.8, 3.9, (A.WOOD_D, 0.12), 'hoist_beam')
        k.tube((hx, M[1] + 0.7, 3.78), (hx, M[1] + 0.7, 2.4), 0.012, '#a08a60', 'rope', verts=5)
        if gr.random() < 0.5:
            A.crate(k, hx - 0.2, M[1] + 0.5, s=0.4, z0=2.0, tone=A.WOOD_L, solid=False)
k.box(-0.6, CA[1], -0.05, COLS + 0.6, M[0], 0.02, ('#4a4a3e', 0.3), 'yard')                 # behind them (under their roofs)
k.solid(-0.6, CA[1], COLS + 0.6, M[0])
for (ga, gb) in M_GAPS:
    k.blocked -= {(c, r) for c in range(int(math.ceil(ga)), int(math.floor(gb))) for r in range(int(CA[1]), int(math.ceil(M[0])))}
    if gb - ga >= 1.6:
        CAP.washing(k, ga + 0.05, gb - 0.05, (M[0] + M[1]) / 2, z=2.4, rng=gr)
V.board_sign(k, 'ASHGROVE & VANE', 'CinzelDecorative-Bold', 25.0, M[1] - 0.18, 1.86, size=0.17, board='#2a3a2e')

# ---- the south row and the Canal Market --------------------------------------------------------------------------------
CAP.row(k, -0.6, COLS + 0.6, S[0], S[1], seed=304, gaps=S_GAPS, smoke=SMOKE, storeys=(2, 3), shops=0.4, gable_front=0.3,
        signs=[(10.0, 'bread'), (47.0, 'bed')])
k.box(-0.6, CB[1], -0.05, COLS + 0.6, S[0], 0.02, ('#4a4a3e', 0.3), 'yard')
k.solid(-0.6, CB[1], MARKET[0], S[0])
k.solid(MARKET[1], CB[1], COLS + 0.6, S[0])
for (ga, gb) in S_GAPS[:2]:
    k.blocked -= {(c, r) for c in range(int(math.ceil(ga)), int(math.floor(gb))) for r in range(int(CB[1]), int(math.ceil(S[0])))}
# the market: stalls of fish, flowers and fruit on the canal's south bank, a fountain pump, crates
for (x0, x1, awn, goods) in ((24.6, 26.6, ('#2e5a8a', '#e8e0d0'), 'fish'), (27.4, 29.4, ('#b23a34', '#ece0c8'), 'veg'),
                             (30.2, 32.2, ('#3a6a3a', '#e8dcc0'), 'flowers')):
    W.market_stall(k, x0, x1, 26.2, 27.4, awning=awn, goods=goods)
    k.solid(x0, 26.2, x1, 27.4)
HK.pump(k, 33.2, 28.6)
for (tx, tr) in ((24.4, 29.4), (33.6, 26.0)):
    HK.tub(k, tx, tr)

# ---- life on the quays -------------------------------------------------------------------------------------------------------
def quay_life(r, x0, x1, seed, gaps=()):
    q = random.Random(seed)
    x = x0 + q.uniform(0.5, 1.5)
    while x < x1 - 0.6:
        if any(a - 0.7 < x < b + 0.7 for a, b in gaps):
            x += 0.8
            continue
        p = q.random()
        if p < 0.25:
            A.barrel(k, x, r, h=0.66, radius=0.24, tone=q.choice((A.WOOD, shade(A.WOOD, 0.85))))
        elif p < 0.45:
            A.crate(k, x, r, s=0.46, tone=shade(A.WOOD_L, q.uniform(0.88, 1.06)))
        elif p < 0.6:
            V.sacks(k, x, r, n=3)
        elif p < 0.72:
            HK.tub(k, x, r)
        x += q.uniform(2.4, 4.4)


quay_life(GQ[0] + 0.5, 19.0, FUNI[0], 401)
quay_life(MQ[0] + 0.5, -0.6, COLS + 0.6, 402, gaps=M_GAPS)
quay_life(GS[0] + 0.5, -0.6, COLS + 0.6, 403, gaps=S_GAPS)
for (x, r) in ((10.0, CA[0] - 0.55), (22.0, CA[0] - 0.55), (36.0, CA[0] - 0.55), (52.0, CA[0] - 0.55),
               (4.0, CB[0] - 0.55), (16.0, CB[0] - 0.55), (27.0, CB[0] - 0.55), (45.0, CB[0] - 0.55), (53.0, CB[0] - 0.55),
               (8.0, GS[1] - 0.3), (18.0, GS[1] - 0.3), (38.0, GS[1] - 0.3), (50.0, GS[1] - 0.3)):
    W.lantern_post(k, x, r, energy=24)
    k.solid_post(x, r)
for (bx, br) in ((3.0, CA[0] - 0.45), (14.6, CA[0] - 0.45), (33.4, CA[0] - 0.45), (46.0, CA[0] - 0.45),
                 (10.0, CB[0] - 0.45), (31.0, CB[0] - 0.45), (43.0, CB[0] - 0.45)):
    k.cyl(bx, br, 0.0, 0.08, 0.17, A.IRON, 'bollard', verts=12)
    k.cyl(bx, br, 0.08, 0.42, 0.11, ('#2e3238', 0.1), 'bollard', verts=12)
    k.sphere(bx, br, 0.44, 0.15, 0.08, '#2e3238', 'bollard', segs=12)
    k.solid_post(bx, br)
with k.foliage('leaf'):                                              # limes along Merchants' Quay
    for x in (8.0, 22.5, 38.0, 51.0):
        W.tree(k, x, MQ[1] - 1.0, h=2.6, tone=rng.choice(('#3a6234', '#2e5a3a')))
        k.solid(x - 0.3, MQ[1] - 1.5, x + 0.3, MQ[1] - 1.0)
for (gx, gr_) in ((26.0, GQ[0] + 2.6), (44.8, MQ[0] + 2.2), (12.0, GS[0] + 1.5)):
    k.blob(gx, gr_, 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(gx + 0.08, gr_, 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)

# ---- the Old Town's wall along the south, its North Gate ---------------------------------------------------------------------
CAP.town_wall(k, -0.6, COLS + 0.6, SWALL + 0.9, h=1.2, thick=0.9, skip=[(GATE_X - 1.4, GATE_X + 1.4)], seed=91)
for s in (-1, 1):
    px = GATE_X + s * 1.85
    k.box(px - 0.45, SWALL, -0.05, px + 0.45, SWALL + 0.9, 2.4, (shade(CAP.WALL_STONE, 0.9), 0.12), 'gate_pier')
    CAP.coursed(k, px - 0.45, px + 0.45, 0.0, 2.4, SWALL + 0.9, '#8a8478', part='wall_block', **CAP.BIG)
    k.box(px - 0.5, SWALL - 0.05, 2.4, px + 0.5, SWALL + 0.95, 2.55, (CAP.STONE_L, 0.1), 'pier_cap')
    W.wall_lantern(k, px, SWALL + 0.92, z=1.6, energy=14)
    k.solid(px - 0.45, SWALL, px + 0.45, SWALL + 0.9)
I.ground(k, {(c, r) for c in range(0, COLS) for r in range(37, 41)}, lambda x, r: 'grass', {'grass': ('#3a4a3a', 0.3)})

# ---- light --------------------------------------------------------------------------------------------------------------------
k.area_light(30.0, 18.0, 16.0, '#90a8c8', 3000, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#26384a', 0.8))

# ---- the world -------------------------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


inters = [
    {'x': int(GATE_X), 'y': 36, 'type': 'enter_world', 'target': 'lumar-crown-oldtown', 'spawn': [28, 4], 'label': 'SOUTH GATE', 'prompt': 'PRESS E TO GO THROUGH'},
    {'x': int(SX), 'y': 3, 'type': 'dialog', 'label': 'FUNICULAR', 'prompt': 'PRESS E TO RIDE UP',
     'dialog': 'THE FUNICULAR TO THE HILL - THE ACADEMY, THE OBSERVATORY AND THE PALACE GARDENS. A CHALKED SIGN: "CAR UNDER INSPECTION. BACK SOON."'},
    {'x': 6, 'y': 7, 'type': 'dialog', 'label': 'SAILMAKER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE SAILMAKER LOOKS UP FROM A SEAM.'},
    {'x': 12, 'y': 7, 'type': 'dialog', 'label': 'CHARTMAKER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE CHARTMAKER IS INKING A COASTLINE.'},
    {'x': 16, 'y': 7, 'type': 'dialog', 'label': 'INSTRUMENT MAKER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE INSTRUMENT MAKER SQUINTS AT A SEXTANT.'},
    look('THE GUILD HALL', 52, 7, 'THE GUILD HALL. THE SAILMAKERS, THE CHARTMAKERS, THE ROPEMAKERS, THE COOPERS AND THE INSTRUMENT MAKERS EACH HAVE A BANNER AND A CHAIR AT THE LONG TABLE. THE COOPERS SAY THEIRS IS THE BEST CHAIR. IT IS A BARREL.'),
    look('ASHGROVE & VANE', 25, 19, 'ASHGROVE & VANE, MERCHANTS. THEIR OCHRE SAILS ARE ON EVERY LANE BETWEEN THE PORTS. A CLERK IN THE WINDOW IS COUNTING SOMETHING, VERY FAST.'),
    look('CANAL MARKET', 28, 28, 'THE CANAL MARKET: FISH STRAIGHT OFF THE BARGES, SEA PINKS AND THRIFT, APPLES FROM THE HILL GARDENS. THE FISHWIFE SHOUTS PRICES AT THE GULLS.'),
    look('UPPER CANAL', 22, 10, 'THE UPPER CANAL. THE WATER IS GREEN AND STILL AND SMELLS OF TAR AND BREAD. SOMEONE HAS PAINTED A FISH ON THE BOTTOM OF EVERY BOAT.'),
    look('WATER STAIRS', 15, 22, 'WATER STAIRS DOWN TO THE LOWER CANAL. THE STEP AT THE BOTTOM IS GREEN WITH WEED AND THE ONE ABOVE IT WITH WARNINGS.'),
]
w = {'name': 'The Canal Quarter', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [int(GATE_X), 34]}, 'moonColor': '#d8f0e0', 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': inters}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x, y) in ((6, 6), (12, 6), (16, 6)):                 # the guildsfolk stand at their doors (solid: you talk to them)
    k.solid(x, y, x + 1, y + 1)
DOORS = [(c, r) for c in (int(GATE_X) - 1, int(GATE_X)) for r in range(34, 37)]
DOORS += [(int(SX) - 1, 3), (int(SX), 3)]
apply_world(WORLD, k, (0, 3, COLS - 1, 35), doors=DOORS, scene_id=WID,
            actors=[{'sheet': 'npc-sailmaker', 'x': 6, 'y': 6, 'facing': 'down'},
                    {'sheet': 'npc-chartmaker', 'x': 12, 'y': 6, 'facing': 'down'},
                    {'sheet': 'npc-instrument', 'x': 16, 'y': 6, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
w['view'] = [-0.5, -1.0, COLS + 0.5, ROWS - 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('canals done')
