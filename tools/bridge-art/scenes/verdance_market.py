"""Thistlecombe — the honey-stone market town on the river, on Verdance (world id "verdance-market").

  BVENV/bin/python tools/bridge-art/scenes/verdance_market.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance-market

The lane from the Downs comes in as West Street to the market square: cobbles, the old buttercross in the middle on
its squat pillars (the market hall), stalls round it on market day (a scene variant) and your own stall at its
south-west corner (your goods and whoever you've hired to keep it drawn by js/makers.js). Round the square in warm
honey-coloured stone under stone-slate roofs: the Woolpack inn, Ember & Bean the coffee roasters (the drum turning by
the door), Thistle Pottery with its kiln, Wick & Comb the chandlers (tapers hanging to cool), and St Mary's with its
spire over the churchyard. The branch line ends at the station by the buffers, east. South, the wharf along the River
Wend: a dressed-stone quay, the ferry on its chain, a narrowboat, and the packing house where Verdance's produce is
crated for Arcadia's restaurants, its cargo pod on the pad. Over the river, the water meadows and willows.

In the house style: the richer house kit in honey stone, the town shaped round its square and down to the river, small
life everywhere; Verdance's long afternoon with live light.
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
WID = 'verdance-market'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 50, 38
FRONT = 11.6                                  # the square's north facades
SQ = (13.6, 11.8, 35.0, 25.0)                 # the market square
QUAY_R = 28.2                                 # the quay's edge
RIV = (29.0, 34.2)
RZ = -0.45
TRACK = (44.2, 45.8)
STONE = G.HONEY
SLATE = '#9a8c74'
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=0.6, seed=7121)
G.fast_top(k)
rng = k.rng
C = math.cos(math.radians(45))
SMOKE = []


def height(x, r):
    z = 0.02 * I.n2(x, r, 1.2, 5)
    if r > QUAY_R + 0.1:                                                 # the river below the quay, the meadow beyond
        a, b = G.river_edges(x, RIV[0], RIV[1], seed=2.2, amp=0.2)
        if r < b + 0.6:
            z = -0.75 if r < b - 0.2 else -0.75 + 0.75 * G.smooth(b - 0.2, b + 0.8, r)
        else:
            z = 0.04 + 0.1 * G.smooth(b + 0.6, 37.0, r) + 0.03 * I.n2(x, r, 1.0, 9)
    if r < 3.0:
        z += 0.3 * G.smooth(3.0, -1.0, r)                                # the gardens rising behind the north side
    return z


WEST_ST = [(-1.0, 20.0), (8.0, 20.0), (13.6, 19.0)]
LANES = [WEST_ST, [(12.0, 20.0), (12.6, 27.6)], [(35.0, 18.0), (41.0, 17.6), (44.0, 15.0)], [(35.0, 24.0), (38.0, 26.0)]]


def material(x, r):
    if r > QUAY_R + 0.1:
        a, b = G.river_edges(x, RIV[0], RIV[1], seed=2.2, amp=0.2)
        if r < b - 0.1:
            return 'bed'
        if r < b + 0.4 + 0.08 * I.n2(x, r, 3, 4):
            return 'bank'
        return 'grass'
    if SQ[0] - 0.4 < x < SQ[2] + 0.4 and SQ[1] < r < SQ[3]:
        return 'paving'                                                  # under the setts
    if 1.0 < x < 42.0 and 25.0 < r < QUAY_R:
        return 'paving'
    if I.path_dist(LANES, x, r) < 0.9:
        return 'path'
    return 'grass'


ALB = {'grass': (G.GREEN, 0.12), 'path': (F.DIRT, 0.1), 'bank': ('#6a5638', 0.22), 'bed': ('#3e4a3a', 0.2), 'paving': ('#8a7a60', 0.1)}
CELLS = [(c, r) for c in range(-1, COLS + 1) for r in range(-4, ROWS + 2)]
I.ground(k, CELLS, material, ALB, height=height, bump=0.0, seed=71, dither=0.035, step=0.0625)
G.river_water(k, -1.0, COLS + 1.0, RIV[0] - 1.2, RIV[1], RZ, seed=2.2)

# the cobbles: the square, West Street, the wharf
W.cobbles(k, SQ[0], SQ[1], SQ[2], SQ[3], tone='#c8b490', size=0.26)
HK.street(k, -1.0, 19.0, SQ[0], 21.0, tone='#a89878')
W.cobbles(k, 1.0, 25.0, 42.0, QUAY_R - 0.3, tone='#b8a688', size=0.28)
W.street_clutter(k, (SQ[0], SQ[1] + 0.5, SQ[2], SQ[3]), seed=7122, straw=[(15.0, 21.0, 33.0, 23.6)], chalk=(30.0, 14.2))
G.quay(k, -1.0, 43.0, QUAY_R, z_top=0.0, z_water=RZ)

# ---- the north side of the square ---------------------------------------------------------------------------------------
# the Woolpack: a big two-storey inn, a hanging sign, benches out front
rm, zr = HK.rich_house(k, 14.0, 19.6, 6.2, FRONT, wall_h=2.7, rise=1.6, roof=SLATE, wall=STONE, door_x=16.8,
                       windows=[(14.9, 0.9), (18.7, 0.9)], windows_up=[(14.9, 2.2), (16.8, 2.25), (18.7, 2.2)], chimney=19.0, stone=True)
SMOKE.append([18.88, round(rm - 0.15 - (zr + 1.05) * C, 3)])
V.board_sign(k, 'THE WOOLPACK', 'IMFellEnglishSC', 16.8, FRONT + 0.03, 1.72, size=0.16)
W.hanging_sign(k, 19.75, FRONT, 2.1, icon='mug')
V.picnic_table(k, 15.0, 12.6)
k.solid(14.3, 12.2, 15.7, 13.0)
# Ember & Bean: the roaster's drum by the door, sacks of green beans, the smell of it all down the street
rm, zr = HK.rich_house(k, 20.2, 24.8, 6.6, FRONT, wall_h=2.3, rise=1.4, roof=SLATE, wall=shade(STONE, 1.04), door_x=23.6,
                       windows=[], chimney=21.0, stone=True)
SMOKE.append([20.88, round(rm - 0.15 - (zr + 1.05) * C, 3)])
HK.bay_shop(k, 20.6, 22.8, FRONT + 0.02, goods=('#5a3a20', '#8a5a30', '#c89a60', '#3a2414', '#e8dcc0'))
V.board_sign(k, 'Ember & Bean', 'Pacifico', 22.5, FRONT + 0.03, 1.78, size=0.17, board='#2a1a10', ink='#f0c070', trim='#a8743a')
V.awning(k, 20.4, 24.6, FRONT + 0.42, 2.0, depth=0.5, drop=0.22, cols=('#3a2414', '#e8c890'))
G.roaster(k, 24.0, FRONT + 0.75)
# Thistle Pottery: its kiln in the yard beside it, wares out on a trestle
HK.rich_house(k, 25.4, 28.8, 6.8, FRONT, wall_h=2.0, rise=1.3, roof='#a85a3a', wall=STONE, door_x=27.8, windows=[(26.3, 0.85)], stone=True)
V.board_sign(k, 'THISTLE POTTERY', 'AlegreyaSC-Bold', 27.1, FRONT + 0.03, 1.72, size=0.11, board='#e8dcc4', ink='#2a5a9a', trim='#2a5a9a', pad=0.06)
G.pots_display(k, 25.6, 27.4, FRONT + 0.6)
kx, kz = I.kiln(k, 29.6, 10.2)
SMOKE.append([round(kx, 3), round(kz + 0.6, 3)])
# Wick & Comb, the chandlers: tapers hanging to cool, skeps in the window (it's your beeswax they want)
HK.rich_house(k, 30.8, 35.2, 6.4, FRONT, wall_h=2.4, rise=1.4, roof=SLATE, wall=shade(STONE, 0.96), door_x=34.2, windows=[], stone=True)
HK.bay_shop(k, 31.2, 33.4, FRONT + 0.02, goods=('#f4e8b0', '#f0d880', '#e8c860', '#f4f0e0', '#c89a40'))
V.board_sign(k, 'WICK & COMB', 'Rye', 33.0, FRONT + 0.03, 1.85, size=0.15, board='#3a2a10', ink='#f0d070', trim='#c8a040')
W.hanging_sign(k, 35.35, FRONT, 2.0, icon='bread')

# ---- St Mary's and the churchyard, west -------------------------------------------------------------------------------------
G.spire_church(k, 2.0, 12.6, 6.4, 12.4, stone=STONE, roof=SLATE)
for (x, r) in ((3.0, 14.4), (4.4, 15.2), (6.0, 14.2), (7.6, 15.6), (9.2, 14.6), (10.8, 15.4), (3.6, 16.8), (6.8, 17.0), (9.6, 17.2)):
    G.headstone(k, x, r, tone=shade('#c8bca8', rng.uniform(0.85, 1.05)))
    k.solid(x - 0.3, r - 0.2, x + 0.3, r + 0.2)
W.tree(k, 11.6, 16.8, h=3.2, tone='#2e5a38')                       # a yew
k.solid(11.1, 16.3, 12.1, 17.3)
HK.stone_wall(k, 1.6, 12.4, 18.4, h=0.55)
for x in (2.0, 12.2):
    k.box(x - 0.08, 13.0, 0, x + 0.08, 18.4, 0.55, (shade(STONE, 0.9), 0.16), 'wall_stone', bevel=0.02)
F.wildflowers(k, 2.4, 13.6, 12.0, 18.0, 40)

# ---- the square: the buttercross, your stall, market day's stalls, the lime trees -------------------------------------------
G.buttercross(k, 24.4, 17.6, w=4.6, d=3.0, roof=SLATE, stone=STONE)
W.market_stall(k, 16.4, 18.6, 19.8, 20.6, awning=('#3a6a3a', '#f0e6d0'), goods=None)        # yours (js/makers.js lays it out)
V.board_sign(k, 'YOUR STALL', 'Rye', 17.5, 20.62, 0.5, size=0.09, board='#f0e8d0', ink='#3a5a32', trim='#3a5a32', pad=0.04)
with k.variant('market', 'on'):
    for (x0, x1, r0, r1, aw, goods) in ((20.6, 22.8, 21.6, 22.4, ('#c84a3a', '#f0e6d0'), 'produce'), (24.2, 26.4, 21.6, 22.4, ('#3a5a9a', '#f0e6d0'), 'fish'),
                                         (27.8, 30.0, 21.6, 22.4, ('#d8a030', '#f4ece0'), 'produce'), (31.0, 33.2, 15.6, 16.4, ('#8a3a6a', '#f4ece0'), 'produce'),
                                         (15.6, 17.8, 14.4, 15.2, ('#2a6a6a', '#f0e6d0'), 'produce')):
        W.market_stall(k, x0, x1, r0, r1, awning=aw, goods=goods)
    G.crates_stamped(k, 19.0, 22.0, n=2, stamp='#8a3a2a')
    W.bunting(k, (14.0, 12.4, 2.2), (24.4, 16.0, 3.0), sag=0.4)
    W.bunting(k, (24.4, 16.0, 3.0), (34.6, 12.4, 2.2), sag=0.4)
for (x, r) in ((14.6, 24.2), (20.0, 24.4), (28.8, 24.4), (34.2, 24.2)):
    W.tree(k, x, r, h=3.0, tone='#4a7a34', lean=0.05)
    W.tree_bed(k, x, r, rad=0.5, grass='#4e7a34')
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
for (x, r) in ((14.0, 12.4), (34.6, 12.4), (14.0, 24.6), (34.6, 24.6)):
    W.lantern_post(k, x, r, h=2.2, energy=32)
W.bench(k, 22.0, 23.2, 24.5)
W.bench(k, 25.6, 26.8, 24.5)
HK.pump(k, 30.6, 19.4)
for (x, r) in ((19.6, 12.5), (29.0, 12.5)):
    HK.tub(k, x, r)

# the east side: two cottages and their gardens between the square and the station approach
for (x0, x1, rb, rf, door, roof) in ((36.4, 39.6, 19.4, 22.6, 38.0, '#a85a3a'), (40.0, 43.6, 19.6, 22.8, 41.8, SLATE)):
    rm, zr = HK.rich_house(k, x0, x1, rb, rf, wall_h=1.95, rise=1.3, roof=roof, wall=STONE, door_x=door, windows=[(x0 + 0.7, 0.85), (x1 - 0.7, 0.85)],
                           chimney=x1 - 0.4, stone=True)
    SMOKE.append([x1 - 0.52, round(rm - 0.15 - (zr + 1.05) * C, 3)])
    V.flower_bed(k, x0 + 0.2, rf + 0.1, x1 - 0.2, rf + 0.5)
G.washing_line(k, (36.8, 18.6), (39.4, 18.4))
for (x, r) in ((36.0, 13.6), (42.4, 16.0)):
    W.bush(k, x, r, s=0.4, tone='#3a6a30', berries='#c03050')
    k.solid(x - 0.4, r - 0.3, x + 0.4, r + 0.3)
F.wildflowers(k, 35.6, 12.6, 46.0, 18.6, 40)

# ---- the station, east -------------------------------------------------------------------------------------------------------
HK.rich_house(k, 37.0, 42.4, 6.0, 10.6, wall_h=2.2, rise=1.3, roof=SLATE, wall=STONE, door_x=39.7, windows=[(38.0, 0.9), (41.4, 0.9)], stone=True)
V.board_sign(k, 'THISTLECOMBE', 'AlegreyaSC-Bold', 39.7, 10.63, 1.85, size=0.15, board='#2e4a3a', ink='#f0e8c8', trim='#c8a050')
G.platform(k, 42.8, 44.0, 1.0, 15.2, z=0.24)
G.canopy(k, 42.9, 43.9, 2.4, 10.6, z=2.0)
G.rail_track(k, TRACK[0], TRACK[1], -4.0, 13.6)
G.buffer_stop(k, (TRACK[0] + TRACK[1]) / 2, 13.8)
G.station_clock(k, 43.4, 10.7, 1.65)
k.box(43.37, 10.6, 1.8, 43.43, 10.66, 2.0, (G.IRON, 0.1), 'clock_hanger')
W.bench(k, 42.9, 43.9, 6.0, tone='#2e5a3e')
G.trolley(k, 43.4, 12.6)
for r in (4.0, 8.4):
    HK.tub(k, 43.0, r)
W.lantern_post(k, 41.2, 13.8, h=2.1, energy=28)

# ---- the wharf: the ferry, the packing house, the cargo pod, the cottages ------------------------------------------------------
for (x0, x1, door, roof) in ((1.0, 4.6, 2.8, SLATE), (5.0, 8.4, 6.7, '#a85a3a')):
    rm, zr = HK.rich_house(k, x0, x1, 21.8, 25.0, wall_h=1.9, rise=1.3, roof=roof, wall=STONE, door_x=door, windows=[(x0 + 0.7, 0.85), (x1 - 0.7, 0.85)],
                           chimney=x1 - 0.4, stone=True)
    SMOKE.append([x1 - 0.52, round(rm - 0.15 - (zr + 1.05) * C, 3)])
G.ferry(k, 12.0, 30.6, RZ + 0.05)
for x in (10.6, 13.4):
    k.cyl(x, QUAY_R + 0.3, RZ - 0.3, 0.35, 0.07, (G.WOOD_D, 0.15), 'ferry_post', verts=8)
V.board_sign(k, 'FERRY', 'Rye', 12.0, QUAY_R - 0.3, 0.9, size=0.12, board='#2e5a3e', ink='#f0e8c8', trim='#c8a050', pad=0.05)
k.box(11.95, QUAY_R - 0.34, 0.0, 12.05, QUAY_R - 0.3, 0.95, (G.WOOD_D, 0.15), 'sign_post')
k.box(10.4, QUAY_R - 0.1, -0.45, 13.6, QUAY_R + 0.35, 0.02, (shade(G.HONEY_D, 0.9), 0.16), 'ferry_steps')
# a narrowboat moored along the quay, flowers on her roof
k.box(18.0, QUAY_R + 0.45, RZ - 0.2, 25.0, QUAY_R + 1.15, RZ + 0.25, ('#2e4a3a', 0.12), 'boat_hull')
k.box(18.6, QUAY_R + 0.5, RZ + 0.25, 24.0, QUAY_R + 1.1, RZ + 0.75, ('#8a2a2a', 0.12), 'boat_cabin')
k.box(18.5, QUAY_R + 0.45, RZ + 0.75, 24.1, QUAY_R + 1.15, RZ + 0.8, ('#2e4a3a', 0.12), 'boat_roof')
for x in [18.9 + i * 0.6 for i in range(9)]:
    k.box(x, QUAY_R + 1.1, RZ + 0.42, x + 0.3, QUAY_R + 1.12, RZ + 0.62, '#f0d070', 'boat_window')
for x in (19.4, 21.0, 22.8):
    HK.tub(k, x, QUAY_R + 0.8)
# the packing house: crates for Arcadia on the wharf, its cargo pod on the pad
rm, zr = HK.rich_house(k, 28.0, 35.6, 22.4, 25.2, wall_h=2.4, rise=1.3, roof=SLATE, wall=shade(STONE, 0.94), door_x=31.8, windows=[(29.2, 0.9), (34.4, 0.9)], stone=True)
V.board_sign(k, 'VERDANT & CO.  PACKERS TO ARCADIA', 'AlegreyaSC-Bold', 31.8, 25.23, 1.9, size=0.1, board='#1e3a4a', ink='#a8e0f0', trim='#4a8aa0', pad=0.06)
for (x, r, n) in ((28.4, 25.9, 6), (33.8, 25.8, 4), (35.6, 26.6, 4)):
    G.crates_stamped(k, x, r, n=n)
G.cargo_pod(k, 39.2, 25.4)
W.lantern_post(k, 37.4, 27.2, h=2.1, energy=28)
for x in (5.0, 16.0, 26.5):
    W.lantern_post(k, x, 27.4, h=2.1, energy=28)
W.bench(k, 14.6, 15.8, 27.0)
HK.barrels(k, 9.0, 26.0)
k.solid(8.7, 25.7, 9.8, 26.6)
G.washing_line(k, (1.4, 26.2), (4.4, 26.4))

# ---- over the river: water meadows and willows ------------------------------------------------------------------------------
G.river_banks(k, -0.8, COLS + 0.8, RIV[0] - 1.2, RIV[1], RZ, seed=2.2, skip=[(-1.0, 43.0)])
for (x, r) in ((4.0, 35.6), (15.0, 35.8), (28.0, 35.4), (41.0, 35.8)):
    G.on(k, height, G.willow, x, r, h=3.0)
for x in (9.0, 21.0, 34.0, 46.0):
    G.on(k, height, W.tree, x, 36.6, h=2.8, tone='#3e7a34')
F.wildflowers(k, 0.5, 35.0, 49.5, 37.8, 60)
# east: the water meadow beside the station, a hedge, trees behind
for (x, r) in ((46.5, 18.0), (48.6, 21.0), (47.0, 24.0), (49.0, 15.0)):
    W.tree(k, x, r, h=rng.uniform(2.6, 3.2), tone='#3a6a34')
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
G.hedge(k, (46.6, 2.0), (46.6, 27.0), h=0.6)
# behind the north side: gardens and trees under the hill
for x in [i * 2.4 + 1.0 for i in range(20)]:
    if x > 46:
        break
    (W.tree if rng.random() < 0.6 else W.pine)(k, x, 1.0 + rng.uniform(-0.4, 0.4), h=rng.uniform(2.4, 3.1), tone=rng.choice(('#3a6a34', '#2e5a38')))

k.later.append(lambda: W.meadow(k, G.GREEN, cells=CELLS, ok=('ground_grass',), density=0.9, flowers=0.8))

# ---- where you can walk ----------------------------------------------------------------------------------------------------------
k.solid(0, 0, COLS, 5)                                    # behind the north side
for c in range(42, 45):                                   # the platform runs north under its canopy
    for r in range(1, 5):
        k.blocked.discard((c, r))
k.solid(TRACK[0] - 0.1, -1, COLS, 14)                     # the line, and the east beyond it
k.solid(46, 14, COLS, ROWS)
k.solid(0, 13, 1.6, 19)                                   # the churchyard's west side
k.solid(0, 21, 1, 25)
for c in range(COLS):                                     # the river (the ferry's steps aside)
    for r in range(int(QUAY_R + 0.5), ROWS):
        k.solid(c, r, c + 1, r + 1)

if os.environ.get('NOVAR'):
    k.variants = []
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle=None if os.environ.get('PREVIEW') else 'day', light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Thistlecombe', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [1, 20]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -2.0, COLS, ROWS]})


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 0, 'y': 19, 'type': 'enter_world', 'label': 'THE DOWNS', 'prompt': 'PRESS E TO TAKE THE LANE WEST', 'target': 'verdance-downs', 'spawn': [54, 20]},
    {'x': 0, 'y': 20, 'type': 'enter_world', 'label': 'THE DOWNS', 'prompt': 'PRESS E TO TAKE THE LANE WEST', 'target': 'verdance-downs', 'spawn': [54, 20]},
    {'x': 16, 'y': 12, 'type': 'vendor', 'label': 'THE WOOLPACK', 'prompt': 'PRESS E TO GO IN',
     'items': [{'id': 'mug_of_ale', 'price': 7}, {'id': 'cider', 'price': 12}, {'id': 'ploughmans', 'price': 20}, {'id': 'pumpkin_soup', 'price': 16}]},
    {'x': 23, 'y': 12, 'type': 'maker', 'maker': 'roaster', 'label': 'EMBER & BEAN', 'prompt': 'PRESS E TO GO IN'},
    {'x': 27, 'y': 12, 'type': 'maker', 'maker': 'potter', 'label': 'THISTLE POTTERY', 'prompt': 'PRESS E TO GO IN'},
    {'x': 34, 'y': 12, 'type': 'maker', 'maker': 'candles', 'label': 'WICK & COMB', 'prompt': 'PRESS E TO GO IN'},
    {'x': 17, 'y': 21, 'type': 'market_stall', 'label': 'YOUR STALL', 'prompt': 'PRESS E TO SEE TO YOUR STALL'},
    look('THE BUTTERCROSS', 24, 19, 'THE MARKET HALL, FOUR HUNDRED YEARS OLD: A STONE ROOF ON EIGHT SQUAT PILLARS. MARKET DAY IS SATURDAY, AND THE WHOLE COUNTRYSIDE COMES IN.'),
    look("ST MARY'S", 7, 13, "ST MARY'S, BUILT ON WOOL MONEY: THE SPIRE CAN BE SEEN FROM THE CHALK HORSE. INSIDE, A WINDOW OF SHEEP, VERY WELL DONE."),
    {'x': 40, 'y': 11, 'type': 'train', 'label': 'THISTLECOMBE STATION', 'prompt': 'PRESS E FOR THE TRAIN'},
    {'x': 43, 'y': 14, 'type': 'train', 'label': 'THE PLATFORM', 'prompt': 'PRESS E FOR THE TRAIN'},
    {'x': 12, 'y': 27, 'type': 'ferry', 'label': 'THE FERRY', 'prompt': 'PRESS E TO TAKE THE FERRY'},
    {'x': 32, 'y': 26, 'type': 'export', 'label': 'VERDANT & CO.', 'prompt': 'PRESS E TO GO IN'},
    look('THE CARGO POD', 39, 27, 'A FAT WHITE POD ON A PAD BY THE WHARF, ITS HATCH OPEN. ONCE A DAY IT GOES UP TO THE FREIGHTER IN ORBIT, AND BY SUPPER VERDANCE\'S CARROTS ARE ON ARCADIA\'S PLATES.'),
    look('NARROWBOAT', 21, 27, '"THE DORMOUSE", PAINTED WITH ROSES AND CASTLES, GERANIUMS ON THE ROOF. A CAT ASLEEP ON THE TILLER.'),
    {'x': 30, 'y': 20, 'type': 'farm_well', 'label': 'PUMP', 'prompt': 'PRESS E TO FILL THE CAN'},
    {'x': 22, 'y': 13, 'type': 'dialog', 'label': 'ADA', 'prompt': 'PRESS E TO TALK', 'dialog': 'ADA EMBER TURNS THE ROASTER\'S HANDLE.'},
    {'x': 26, 'y': 12, 'type': 'dialog', 'label': 'WREN', 'prompt': 'PRESS E TO TALK', 'dialog': 'WREN POTTS HAS CLAY TO THE ELBOWS.'},
    {'x': 35, 'y': 12, 'type': 'dialog', 'label': 'SILAS', 'prompt': 'PRESS E TO TALK', 'dialog': 'SILAS WICK SMELLS FAINTLY OF HONEY.'},
    {'x': 33, 'y': 26, 'type': 'dialog', 'label': 'MS OKORO', 'prompt': 'PRESS E TO TALK', 'dialog': 'MS OKORO LOOKS UP FROM A CLIPBOARD.'},
    {'x': 14, 'y': 27, 'type': 'dialog', 'label': 'OLD RUDD', 'prompt': 'PRESS E TO TALK', 'dialog': 'OLD RUDD, THE FERRYMAN, NODS FROM HIS STOOL.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-ada', 'x': 22, 'y': 13, 'facing': 'down'}, {'sheet': 'npc-wren', 'x': 26, 'y': 12, 'facing': 'down'},
          {'sheet': 'npc-silas', 'x': 35, 'y': 12, 'facing': 'down'}, {'sheet': 'npc-okoro', 'x': 33, 'y': 26, 'facing': 'down'},
          {'sheet': 'npc-rudd', 'x': 14, 'y': 27, 'facing': 'down'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS, scene_extra={'smoke': SMOKE, 'layers': {'market': None}})
print('market town done')
