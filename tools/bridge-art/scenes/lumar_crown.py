"""Crownhaven — the capital of the Emerald Sea (world id "lumar-crown").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown

The biggest island on Lumar's seas and its one real city. A long quay along the harbour (your sloop ties up at the end of
its pier, every other ship of yours in line beside her), warehouses and the harbour office behind it, the Crown & Anchor
on the corner. Up the avenue, the grand square: the fountain, the Merchants' Exchange with its columns, St Brendan's and
its bell tower, market stalls under bunting. Above it all the palace behind its wall, banners on the towers. East, the
Royal Yard, a galleon in frame on the stocks under the sheer-legs; west, the lighthouse on the point and the old town's
lanes. Every quay lantern lit, people everywhere.
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

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown.json')
WID = 'lumar-crown'
COLS, ROWS = 64, 46
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=4401)
C45 = math.cos(math.radians(45))
STONE, STONE_D = '#8a8478', '#5e5a52'
SLATE = '#3a4a5a'
GOLD = '#c8a040'
GREEN_ROOF = '#2a5a3e'

LOBES = [(32, 22, 27, 13), (32, 9, 16, 7), (8, 27, 7, 7.5), (56, 26, 8, 8.5)]
land = I.mask(COLS, ROWS, LOBES, seed=44, amp=0.1)
land = I.flood(land, (32, 20))
QUAY = 33                                          # the quay's front row: the harbour is south of it
land |= {(c, r) for c in range(11, 53) for r in range(12, QUAY + 1)}          # the city fills its ground, the quay runs straight
land = {(c, r) for (c, r) in land if r <= QUAY or not (12 <= c <= 50)}
land = {(c, r) for (c, r) in land if r >= 4}

PX = 22                                            # your pier; the sloop lies across its end (js/sloop.js MOORINGS)
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
SHIP_R = QUAY + 4
FX, FLEN = 14, 5                                   # the fishing jetty, west along the quay
FPIER = I.jetty_cells((FX, QUAY + 1), FLEN, 's')

# ---- ground: the city in flagstones, gardens and the point in grass --------------------------------------------------
TOWN = {(c, r) for (c, r) in land if 11 <= c <= 52 and 11 <= r <= QUAY}
PATHS = [[(10.5, 30.0), (8.0, 28.0), (7.0, 25.0)], [(52.5, 30.0), (56.0, 31.0)], [(11.0, 18.0), (6.0, 21.0)]]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.5:
        return 'path'
    m = I.n2(x, r, 0.4, 21) + 0.4 * I.n2(x, r, 1.5, 22)
    return 'grass' if m > -0.3 else ('grass_dark' if m > -0.65 else 'stone')


ALB = {'path': ('#7a7266', 0.3), 'grass': ('#3a5a3a', 0.3), 'grass_dark': ('#2e4a34', 0.3), 'stone': ('#6a6a62', 0.25)}
W.island_ground(k, TOWN, tone='#7a766c', grass='#3a5a3a', coast=True)
I.ground(k, land - TOWN, material, ALB)

C.coast(k, land, ground=(material, ALB), palette='emerald', grass='#3a5a3a', rock='#5a5a54', seed=61, beachiness=-0.15,
        beach_bias=lambda x, r: 0.9 * I.smooth(3.0, 6.0, 30 - r) * I.smooth(4.0, 8.0, x),
        keep_clear=[(11.5, QUAY + 0.6, 51.0, QUAY + 2.0), (PX - 0.4, QUAY, PX + 1.4, SHIP_R + 0.2),
                    (FX - 1.5, QUAY, FX + 2.4, QUAY + FLEN + 2.4), (PX - 9.0, SHIP_R - 0.6, 50.0, SHIP_R + 3.4)],
        sheer=[(11.9, QUAY + 0.9, 50.1, QUAY + 6.0)])

# the quay wall, bollards, the pier and the fishing jetty
k.box(11.8, QUAY + 0.95, C.WZ - 0.6, 50.2, QUAY + 1.1, 0.0, ('#6a665c', 0.2), 'quay_wall')
x = 12.0
while x < 50.0:
    k.box(x + 0.02, QUAY + 1.08, C.WZ - 0.4, x + 0.48, QUAY + 1.12, -0.02, (shade('#6a665c', k.rng.uniform(0.85, 1.1)), 0.2), 'quay_block')
    x += 0.5
for x in (12.8, 17.5, 20.5, 24.5, 28.0, 33.5, 38.5, 43.0, 47.5):
    k.cyl(x, QUAY + 0.75, 0.0, 0.35, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.cyl(x, QUAY + 0.75, 0.35, 0.4, 0.15, '#2a2a30', 'bollard_cap', verts=10)
    k.solid(x - 0.2, QUAY + 0.55, x + 0.2, QUAY + 0.95)
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.9, SHIP_R + 0.0, z=0.02)
I.fishing_jetty(k, (FX, QUAY + 1), FLEN, 's', glow='#70e0a0')
for bx in (FX + 1.9, FX - 1.0):
    n0, l0 = len(k.parts), len(k.lights)
    W.boat(k, bx, QUAY + 2.3, length=2.2, sail='#e8e4dc' if bx > FX else None)
    C.sink(k, n0, C.WZ + 0.12, l0)
for (x, r) in ((30.0, QUAY + 0.2), (36.5, QUAY + 0.2), (41.0, QUAY + 0.25)):          # cargo on the quay
    A.crate(k, x, r, s=0.62, tone=A.WOOD_L)
for (x, r) in ((31.0, QUAY + 0.25), (40.2, QUAY + 0.3), (26.6, QUAY + 0.2)):
    A.barrel(k, x, r, h=0.8, radius=0.3)
k.solid(29.5, 32.8, 31.5, 33.6)
k.solid(36.0, 32.8, 37.0, 33.6)
k.solid(39.7, 32.8, 41.5, 33.6)
k.solid(26.2, 32.8, 27.0, 33.6)
for (x, r) in ((15.0, 31.6), (19.0, 31.6), (25.6, 31.6), (34.0, 31.6), (42.0, 31.6), (47.6, 31.6)):
    W.lantern_post(k, x, r, energy=22)

# ---- the waterfront: warehouses, the harbour office, the Crown & Anchor, houses -------------------------------------
SMOKE = []


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 0.65) * C45, 3)])


def warehouse(x0, x1, r0, r1, name):
    W.house(k, x0, x1, r0, r1, wall_h=2.8, rise=1.2, roof=SLATE, wall='#7a7064', door_x=None,
            windows_up=[(x0 + 0.8, 2.1), (x1 - 0.8, 2.1)], stone=True)
    cx = (x0 + x1) / 2
    k.box(cx - 0.9, r1, 0.0, cx + 0.9, r1 + 0.06, 1.8, ('#4a3420', 0.12), 'warehouse_doors')
    for xx in (cx - 0.55, cx, cx + 0.55):
        k.box(xx - 0.02, r1 + 0.06, 0.0, xx + 0.02, r1 + 0.09, 1.8, '#2a1a10', 'warehouse_plank')
    V.board_sign(k, name, 'AlegreyaSC-Bold', cx, r1, 2.0, size=0.22)
    W.wall_lantern(k, cx + 1.25, r1, z=1.8, energy=8)


warehouse(11.6, 16.4, 25.4, 29.6, 'BONDED STORE')
warehouse(16.8, 21.0, 25.8, 29.6, 'TALLOW & SONS')
smoke(W.house(k, 22.6, 27.4, 25.4, 29.6, wall_h=2.6, rise=1.4, roof=GREEN_ROOF, wall='#e0d8c4', door_x=25.0,
              windows=[(23.4, 0.95), (26.6, 0.95)], windows_up=[(23.4, 1.9), (25.0, 1.9), (26.6, 1.9)], chimney=26.9,
              lanterns=(24.3, 25.7)), 26.9)
V.board_sign(k, 'HARBOUR OFFICE', 'IMFellEnglishSC-Regular', 25.0, 29.6, 2.25, size=0.24, board='#1e3a2e')
smoke(W.house(k, 37.4, 42.6, 25.0, 29.6, wall_h=2.7, rise=1.5, roof='#6a2a22', wall='#d8c8a8', door_x=40.0,
              windows=[(38.2, 0.95), (41.8, 0.95)], windows_up=[(38.2, 2.0), (40.0, 2.0), (41.8, 2.0)], chimney=38.0,
              sign=(42.45, 1.95, 'mug'), lanterns=(39.3, 40.7)), 38.0)
V.board_sign(k, 'THE CROWN & ANCHOR', 'Rye-Regular', 40.0, 29.6, 2.4, size=0.22)
W.bench(k, 37.4, 38.6, 30.4)                       # benches out front at the corners, the door clear between them
W.bench(k, 41.4, 42.6, 30.4)
k.solid(37.4, 30.2, 38.6, 30.7)
k.solid(41.4, 30.2, 42.6, 30.7)
smoke(W.house(k, 43.2, 46.8, 25.6, 29.6, wall_h=2.3, rise=1.2, roof=SLATE, wall='#c8c0b0', door_x=45.0,
              windows=[(43.9, 0.9), (46.1, 0.9)], windows_up=[(45.0, 1.7)], chimney=46.3), 46.3)
W.house(k, 47.2, 50.4, 26.0, 29.6, wall_h=2.0, rise=1.0, roof=GREEN_ROOF, wall='#e8dcc8', door_x=48.8,
        windows=[(47.9, 0.85), (49.7, 0.85)])
for (x0, x1, r) in ((22.6, 27.4, 29.6), (43.2, 46.8, 29.6), (47.2, 50.4, 29.6)):
    W.planter(k, x0 + 0.2, x0 + 1.2, r + 0.25)
# Market Row, the street behind the waterfront: carts and barrels, lanterns
for (x, r) in ((13.5, 22.6), (21.0, 22.6), (44.5, 22.6)):
    W.lantern_post(k, x, r, energy=20)
A.barrel(k, 17.2, 24.6, h=0.8, radius=0.3)
A.barrel(k, 17.8, 24.8, h=0.8, radius=0.3)
A.crate(k, 46.4, 24.7, s=0.6, tone=A.WOOD_L)
k.solid(16.8, 24.3, 18.2, 25.2)
k.solid(46.0, 24.3, 46.9, 25.2)

# ---- the grand square: fountain, the Exchange, St Brendan's, the market --------------------------------------------
SQ = (32.0, 18.5)
W.fountain(k, SQ[0], SQ[1], rad=1.25)
W.statue(k, 32.0, 22.4)
k.solid(31.4, 21.9, 32.6, 22.9)


def columns(x0, x1, r_face, n, h, tone='#d8d0bc'):
    for i in range(n):
        cx = x0 + (x1 - x0) * i / (n - 1)
        k.cyl(cx, r_face + 0.3, 0.3, 0.3 + h, 0.16, (tone, 0.1), 'column', verts=12)
        k.box(cx - 0.22, r_face + 0.08, 0.3 + h, cx + 0.22, r_face + 0.52, 0.42 + h, (tone, 0.1), 'capital')


# the Merchants' Exchange: a stone hall on a plinth, a portico of columns, a pediment, a gilt clock
EX = (12.4, 21.6, 12.6, 18.4)
k.box(EX[0], EX[2], 0.0, EX[1], EX[3] + 0.9, 0.3, ('#9a9488', 0.15), 'ex_plinth', bevel=0.02)
k.box(EX[0] + 0.1, EX[2] + 0.1, 0.3, EX[1] - 0.1, EX[3], 3.4, ('#c8c0ac', 0.12), 'ex_wall')
columns(EX[0] + 0.7, EX[1] - 0.7, EX[3], 6, 2.9)
k.box(EX[0] + 0.2, EX[3] - 0.05, 3.32, EX[1] - 0.2, EX[3] + 0.6, 3.6, ('#d8d0bc', 0.1), 'entablature')
W.pyramid(k, EX[0] - 0.1, EX[2] - 0.1, EX[1] + 0.1, EX[3] + 0.65, 3.6, 4.6, ('#5a6a72', 0.2), 'ex_roof')
for i in range(5):
    W.window(k, EX[0] + 1.2 + i * 1.7, EX[3], 1.0, w=0.6, h=1.3)
k.cyl((EX[0] + EX[1]) / 2, EX[3] + 0.62, 3.9, 3.95, 0.4, (GOLD, 0.05), 'clock_rim', verts=20)
k.cyl((EX[0] + EX[1]) / 2, EX[3] + 0.64, 3.95, 3.97, 0.34, '#f0e8d0', 'clock_face', verts=20, emit=('#fff0c0', 0.25))
V.board_sign(k, "MERCHANTS' EXCHANGE", 'AlegreyaSC-Bold', (EX[0] + EX[1]) / 2, EX[3] + 0.55, 3.38, size=0.2, board='#2a3a30')
W.door(k, (EX[0] + EX[1]) / 2, EX[3], w=1.0, h=1.9)
k.solid(EX[0], EX[2], EX[1], EX[3] + 0.6)

# St Brendan's: a long nave, a rose window, a bell tower beside it
CH = (43.0, 51.0, 10.6, 18.4)
k.box(CH[0], CH[2], 0.0, CH[1], CH[3], 0.4, ('#7a766c', 0.15), 'ch_footing', bevel=0.02)
k.box(CH[0] + 0.1, CH[2] + 0.1, 0.4, CH[1] - 0.1, CH[3] - 0.05, 3.2, ('#a8a090', 0.14), 'ch_wall')
W._gable_roof(k, CH[0], CH[1], CH[2], CH[3], 3.2, 2.2, '#4a3a42')
k.cyl((CH[0] + CH[1]) / 2, CH[3] + 0.02, 2.0, 2.06, 0.62, '#2a1a28', 'rose_frame', verts=24)
k.cyl((CH[0] + CH[1]) / 2, CH[3] + 0.06, 2.06, 2.08, 0.52, '#3a2440', 'rose_window', verts=24, emit=('#ff9a60', 0.7))
W.door(k, (CH[0] + CH[1]) / 2, CH[3], w=1.1, h=1.7)
for x in (CH[0] + 1.2, CH[1] - 1.2):
    W.window(k, x, CH[3], 1.0, w=0.5, h=1.4, shutters=None)
W.bell_tower(k, 52.6, 18.4, w=1.8, h=5.6)
k.solid(CH[0], CH[2], CH[1], CH[3])

# the market along the south of the square, bunting over it, lanterns round it
W.market_stall(k, 23.2, 25.2, 21.2, 22.0, awning=('#2a6a4a', '#e8e4d0'), goods='produce')
W.market_stall(k, 26.4, 28.4, 21.2, 22.0, awning=('#e8e4d0', '#a03a2e'), goods='fish')
W.market_stall(k, 35.6, 37.6, 21.2, 22.0, awning=('#c8a040', '#2a4a6a'), goods='produce')
W.market_stall(k, 38.8, 40.8, 21.2, 22.0, awning=('#e8e4d0', '#2a6a4a'), goods='fish')
W.bunting(k, (23.0, 14.4, 2.3), (41.0, 14.4, 2.3), sag=0.6, cols=('#2e8a5a', '#e8e4d0', GOLD, '#2a4a8a'))
W.bunting(k, (23.0, 14.4, 2.3), (23.0, 21.0, 2.2), sag=0.4, cols=('#2e8a5a', GOLD))
W.bunting(k, (41.0, 14.4, 2.3), (41.0, 21.0, 2.2), sag=0.4, cols=('#2e8a5a', GOLD))
for (x, r) in ((23.0, 14.4), (41.0, 14.4), (23.0, 21.0), (41.0, 21.0)):
    W.lantern_post(k, x, r, h=2.5, energy=30)
for (x0, r) in ((26.0, 16.0), (36.6, 16.0)):
    W.bench(k, x0, x0 + 1.4, r)
    k.solid(x0, r - 0.2, x0 + 1.4, r + 0.3)
for (x, r) in ((24.4, 15.2), (39.6, 15.2), (24.4, 19.6), (39.6, 19.6)):
    W.tree_bed(k, x, r, rad=0.5)
    W.tree(k, x, r, h=2.5, tone='#2e5a3a')
    k.solid(x - 0.45, r - 0.45, x + 0.45, r + 0.45)
W.cart(k, 34.6, 24.2)
k.solid(33.4, 23.8, 35.2, 24.6)


# ---- the palace on the hill: the wall, the gatehouse, the keep and its towers ---------------------------------------
WALL_R = 12.0


def tower(cx, cr, rad, h, roof='#2a4a6a', banner=None):
    k.cyl(cx, cr, 0.0, h, rad, (STONE, 0.15), 'tower', verts=18)
    for i in range(8):                                                  # crenels round the top
        a = i * math.pi / 4
        k.box(cx + math.cos(a) * rad * 0.85 - 0.12, cr + math.sin(a) * rad * 0.85 - 0.12, h, cx + math.cos(a) * rad * 0.85 + 0.12,
              cr + math.sin(a) * rad * 0.85 + 0.12, h + 0.25, (STONE, 0.15), 'crenel')
    k.cone(cx, cr, h + 0.05, h + rad * 2.2, rad * 1.08, 0.02, (roof, 0.15), 'tower_roof', verts=18)
    if banner:
        k.cyl(cx, cr, h + rad * 2.2, h + rad * 2.2 + 0.9, 0.025, '#2a2a30', 'pole', verts=6)
        k.poly([(cx, cr, h + rad * 2.2 + 0.88), (cx + 0.75, cr, h + rad * 2.2 + 0.72), (cx, cr, h + rad * 2.2 + 0.56)], (banner, 0.1), 'banner')
    for z in (h * 0.45, h * 0.7):
        k.box(cx - 0.08, cr + rad - 0.02, z, cx + 0.08, cr + rad + 0.02, z + 0.35, '#2a1a08', 'arrow_slit', emit=('#ffd080', 0.5))


k.box(19.0, WALL_R - 1.0, 0.0, 45.0, WALL_R, 2.6, (STONE, 0.15), 'curtain_wall')
x = 19.1
while x < 44.9:
    k.box(x, WALL_R - 1.0, 2.6, x + 0.32, WALL_R - 0.1, 2.9, (STONE, 0.15), 'crenel')
    x += 0.6
for (cx, h) in ((19.0, 3.8), (45.0, 3.8)):
    tower(cx, WALL_R - 0.6, 0.9, h, banner='#2e8a5a')
# the gatehouse: two drum towers and the arch between, the gates shut, a guard's lantern either side
tower(30.2, WALL_R - 0.4, 0.8, 3.6, banner=GOLD)
tower(33.8, WALL_R - 0.4, 0.8, 3.6, banner=GOLD)
k.box(30.9, WALL_R - 0.9, 0.0, 33.1, WALL_R + 0.05, 3.3, (shade(STONE, 0.95), 0.15), 'gatehouse')
k.box(31.4, WALL_R + 0.05, 0.0, 32.6, WALL_R + 0.09, 1.9, ('#3a2410', 0.12), 'gate')
for xx in (31.7, 32.0, 32.3):
    k.box(xx - 0.02, WALL_R + 0.09, 0.0, xx + 0.02, WALL_R + 0.11, 1.9, '#1a1008', 'gate_plank')
k.cyl(32.0, WALL_R + 0.1, 2.4, 2.45, 0.35, (GOLD, 0.05), 'crest', verts=16)
W.wall_lantern(k, 30.6, WALL_R + 0.3, z=1.6, energy=10)
W.wall_lantern(k, 33.4, WALL_R + 0.3, z=1.6, energy=10)
# the keep behind, its great hall roof, towers at the corners, lit windows high up
k.box(25.0, 4.6, 0.0, 39.0, 10.4, 4.6, ('#9a9284', 0.15), 'keep')
W._gable_roof(k, 25.0, 39.0, 4.6, 10.4, 4.6, 2.0, '#2a4a6a')
for i in range(6):
    W.window(k, 26.4 + i * 2.2, 10.4, 2.6, w=0.55, h=1.1, shutters=None)
tower(25.0, 6.0, 1.1, 6.2, banner='#2e8a5a')
tower(39.0, 6.0, 1.1, 6.2, banner='#2e8a5a')
tower(32.0, 5.0, 1.3, 7.4, roof='#2a3a5a', banner=GOLD)
for (x, r) in ((21.5, 9.0), (42.5, 9.0), (23.0, 6.5), (41.0, 6.5)):
    W.tree(k, x, r, h=2.6, tone='#2a5a3a')
k.solid(17, 3, 47, WALL_R + 0.0)
k.solid(30.0, WALL_R, 34.0, WALL_R + 0.4)
W.lantern_post(k, 28.6, 13.0, h=2.5, energy=26)
W.lantern_post(k, 35.4, 13.0, h=2.5, energy=26)

# ---- the Royal Yard: a galleon in frame on the stocks, sheer-legs over her, timber stacked ---------------------------


def ship_in_frame(x0, x1, rc, beam=2.0, zk=0.55, h=1.6):
    """A hull on the stocks: keel on its blocks, stem and sternpost, ribs all along, planking up to the turn of the bilge
    on the near side, a staging of planks round her."""
    L = x1 - x0
    for i in range(7):                                                   # keel blocks
        bx = x0 + 0.4 + i * (L - 0.8) / 6
        k.box(bx - 0.2, rc - 0.3, 0.0, bx + 0.2, rc + 0.3, zk, ('#5a4a3a', 0.15), 'keel_block')
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
    rings = []                                                           # planking on the near side, up to the bilge
    for i in range(n + 1):
        t = i / n
        u = x0 + t * L
        w = beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t)) ** 0.6 + 0.03
        rings.append([(u, rc + w * 0.82, zk + 0.37), (u, rc + w + 0.0, zk + h * 0.55)])
    k.loft(rings[2:n - 1], ('#8a5a30', 0.08), 'planking')
    for z in (zk + 0.9, zk + 1.7):                                       # the staging round her
        k.box(x0 - 0.3, rc + beam / 2 + 0.25, z, x1 + 0.3, rc + beam / 2 + 0.55, z + 0.06, ('#9a7a4a', 0.1), 'staging')
        k.box(x0 - 0.3, rc - beam / 2 - 0.55, z, x1 + 0.3, rc - beam / 2 - 0.25, z + 0.06, ('#9a7a4a', 0.1), 'staging')
    for i in range(6):
        px = x0 - 0.2 + i * (L + 0.4) / 5
        for s in (-1, 1):
            k.cyl(px, rc + s * (beam / 2 + 0.4), 0.0, zk + 1.9, 0.04, ('#6a5030', 0.1), 'staging_post', verts=5)


YARD_R = 27.6
ship_in_frame(51.0, 59.0, YARD_R, beam=2.2)
# the sheer-legs: two great spars leaning over her, a block and tackle hanging
k.tube((53.0, YARD_R - 2.2, 0.0), (55.0, YARD_R, 5.2), 0.09, ('#5a4024', 0.1), 'sheerleg', verts=6, smooth=False)
k.tube((57.0, YARD_R - 2.2, 0.0), (55.0, YARD_R, 5.2), 0.09, ('#5a4024', 0.1), 'sheerleg', verts=6, smooth=False)
k.tube((55.0, YARD_R, 5.2), (55.0, YARD_R, 3.0), 0.015, ('#c8b48a', 0.1), 'tackle', verts=4, smooth=False)
k.box(54.85, YARD_R - 0.1, 2.75, 55.15, YARD_R + 0.1, 3.05, ('#3a3a40', 0.1), 'block')
for (x0, x1, r) in ((50.4, 53.6, 31.4), (54.2, 57.0, 31.6)):           # timber stacked to season
    for j in range(3):
        k.tube((x0, r - 0.25 + j * 0.0, 0.12 + j * 0.2), (x1, r - 0.25, 0.12 + j * 0.2), 0.1, ('#8a6a3a', 0.12), 'timber', verts=8)
        k.tube((x0, r + 0.02, 0.12 + j * 0.2), (x1, r + 0.02, 0.12 + j * 0.2), 0.1, ('#7a5a32', 0.12), 'timber', verts=8)
    k.solid(x0, r - 0.4, x1, r + 0.3)
smoke(W.house(k, 55.6, 59.2, 21.4, 24.4, wall_h=2.0, rise=1.0, roof=SLATE, wall='#a89a88', door_x=57.4,
              windows=[(56.4, 0.85), (58.4, 0.85)], chimney=58.8, stone=True), 58.8)
V.board_sign(k, 'ROYAL YARD', 'IMFellEnglishSC-Regular', 57.4, 24.4, 2.05, size=0.24, board='#2a3a30')
W.bulletin_board(k, 53.0, 24.2, w=1.2)
k.solid(50.2, YARD_R - 1.4, 59.8, YARD_R + 1.6)              # (the row in front of the yard office stays open)

# ---- the west point: the lighthouse, the old town's cottages, gardens ----------------------------------------------
LH = (6.4, 25.2)
I.lighthouse(k, *LH, stripe='#2e7a4a', lamp='#b0ffd0')
k.box(5.0, 26.1, 0.0, 7.8, 27.0, 0.25, ('#7a7a72', 0.2), 'lh_step', bevel=0.03)
smoke(W.house(k, 2.8, 6.4, 29.0, 31.8, wall_h=1.9, rise=1.1, roof='#5a3a2a', wall='#e8dcc4', door_x=4.6,
              windows=[(3.5, 0.8), (5.7, 0.8)], chimney=3.2), 3.2)
smoke(W.house(k, 7.6, 10.6, 20.2, 23.0, wall_h=1.9, rise=1.0, roof=GREEN_ROOF, wall='#d8d0bc', door_x=9.1,
              windows=[(8.3, 0.8), (9.9, 0.8)], chimney=10.1), 10.1)
for (x, r) in ((3.2, 23.0), (9.2, 33.0), (11.0, 27.6), (4.0, 33.4)):
    W.tree(k, x, r, h=2.4, tone='#2e5a3a')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
W.bench(k, 7.6, 9.0, 31.2)
k.solid(7.6, 31.0, 9.0, 31.5)

# ---- the east beyond the yard, the north gardens ------------------------------------------------------------------
for (x, r) in ((60.0, 30.0), (61.5, 24.0), (14.0, 9.5), (49.0, 9.5), (16.0, 12.5), (48.0, 12.8), (55.0, 18.0), (9.5, 17.0)):
    W.tree(k, x, r, h=2.5, tone='#2a5434')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
for (x, r) in ((13.0, 21.5), (20.0, 21.6)):
    W.planter(k, x - 0.5, x + 0.5, r)

# ---- scatter ------------------------------------------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in land - TOWN if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#4a6a48', per_cell=1.0,
        avoid=busy)
I.pebbles(k, land - TOWN, '#6a6a62', per_cell=0.15, avoid=busy)

k.area_light(32.0, 20.0, 16.0, '#90a8c8', 3000, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(32.0, 19.0, 4.0, '#e0f0e8', 60, radius=1.5)
k.point_light(40.0, 31.0, 2.5, '#ffc070', 30, radius=0.8, group='flicker')                  # the pub's glow on the quay

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#26384a', 0.8))

# ---- the world -----------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Crownhaven', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': '#d8f0e0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY + 2, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         look('HARBOUR OFFICE', 25, 29, 'THE HARBOUR OFFICE OF CROWNHAVEN. A CLERK BEHIND EVERY WINDOW, A LEDGER FOR EVERY KEEL.\n\nTHE HARBOURMASTER WORKS ON THE QUAY, NOT IN HERE.'),
         look('BONDED STORE', 14, 29, 'CROWN BONDED STORE. EVERY CRATE IN HERE HAS PAID ITS DUTY, OR IS WAITING TO.'),
         look('THE CROWN & ANCHOR', 40, 29, 'THE CROWN & ANCHOR. SINGING INSIDE, AND SOMEBODY WINNING AT DICE.\n\nA SLATE BY THE DOOR: "HANDS WANTED - ASK THE HARBOURMASTER. NO PIRATES (AGAIN)."'),
         look("MERCHANTS' EXCHANGE", 17, 19, "THE MERCHANTS' EXCHANGE. UNDER THE CLOCK, TRADERS FROM ALL FIVE SEAS SHOUT PRICES AT EACH OTHER.\n\nTHE BOARD INSIDE: SPORE SILK UP, MOON SALT UP, NOBODY WANTS SALT FISH TODAY."),
         look("ST BRENDAN'S", 47, 19, "ST BRENDAN'S, PATRON OF THOSE WHO SAIL. THE ROSE WINDOW GLOWS ALL NIGHT FOR SHIPS STILL OUT.\n\nINSIDE, CANDLES FOR THE MISSING, ROW ON ROW. ONE SAYS \"THE WREN\"."),
         look('FOUNTAIN', 32, 20, 'THE CROWN FOUNTAIN. COINS AT THE BOTTOM FROM EVERY PORT ON THE SEA, AND A FEW FROM PLACES NOBODY HAS HEARD OF.'),
         look('STATUE', 32, 23, 'CAPTAIN MIRA LUMAR, WHO FIRST CHARTED THE FIVE SEAS. THE PLAQUE: "SHE FOUND THEM ALL, AND KEPT LOOKING."'),
         look('PALACE GATE', 32, 13, 'THE PALACE OF THE EMERALD CROWN. THE GATES ARE SHUT; THE GUARDS SAY THE QUEEN-REGENT SEES NOBODY WITHOUT A LETTER.\n\nONE OF THEM ADDS, QUIETLY: "UNLESS YOU OWN A FLEET."'),
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
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FPIER, scene_id=WID, actors=[],
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
