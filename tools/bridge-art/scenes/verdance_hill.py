"""Vinehallow — the hill village with the vineyard, on Verdance (world id "verdance-hill").

  BVENV/bin/python tools/bridge-art/scenes/verdance_hill.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance-hill

Up the lane past the chalk horse, a village on the south slope of a hill: the vineyard climbs behind it in terraces held
up by dry-stone walls, row on row of vines, a stone hut among them and a windmill on the crest. On the level, the
village: a little square with a plane tree and a well, the Vane estate's winery with the cellar door cut into the hill
(where your casks age — js/makers.js: wine that gets better over real weeks), the tasting terrace with its tables
under a pergola of vines, a chapel, stone houses with pantile roofs. The estate's own rows run along the foot of the
terraces, where you can pick. Down the hill to the south-west, the river and Vinehallow landing for the ferry; the
lane from the Downs comes in at the foot of the map.

In the house style: the land shaped into terraces (a heightfield and dry-stone walls), vines and trees in layers,
the richer house kit, small life; Verdance's afternoon with live light.
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
WID = 'verdance-hill'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 40
TERR = [(13.2, 0.55), (10.6, 1.1), (8.0, 1.65), (5.4, 2.2), (2.8, 2.75)]   # each terrace's front row and its height
RIV = (33.6, 37.8)                                                    # the river along the south-west corner
RZ = -0.4
WARM = '#d8c098'                                                      # the hill village's stone, paler than Thistlecombe's
k = Kit(COLS, ROWS, margin_top=4.6, margin_bottom=0.6, seed=8840)
G.fast_top(k)
rng = k.rng
C = math.cos(math.radians(45))
SMOKE = []


def terrace_z(r):
    z = 0.0
    for (rf, h) in TERR:
        if r < rf:
            z = h
    return z


def river_r(x):
    """The river's near bank (row) at column x: it cuts across the south-west corner."""
    return 30.4 + 0.62 * x


def height(x, r):
    z = terrace_z(r) + 0.02 * I.n2(x, r, 1.3, 5)
    if r < -0.5:
        z += 0.6 * G.smooth(-0.5, -4.0, r)                            # the crest
    rb = river_r(x)
    if x < 30 and r > rb - 0.8:
        z = min(z, -0.05) - 0.35 * G.smooth(rb - 0.8, rb + 0.4, r)    # the bank down to the water
    return z


LANE = [(20.4, 41.0), (21.0, 35.0), (20.0, 30.0), (20.6, 24.0), (21.4, 19.2)]
TO_LANDING = [(20.2, 30.4), (14.0, 32.0), (8.0, 33.0), (5.0, 33.4)]
VINE_PATH = [(30.0, 18.0), (34.0, 16.0)]


def material(x, r):
    if x < 30 and r > river_r(x) + 0.1:
        return 'bed' if r > river_r(x) + 0.5 else 'bank'
    if I.path_dist([LANE, TO_LANDING], x, r) < 0.75 + 0.08 * I.n2(x, r, 2.0, 7):
        return 'path'
    if 14.2 < x < 27.0 and 15.2 < r < 23.6:
        return 'paving'                                                 # under the square's setts
    if r < TERR[0][0] and r > TERR[-1][0] - 2.0:
        return 'soil' if I.n2(x, r, 2.5, 3) > -0.2 else 'grass'         # the terraces' earth between the vines
    return 'grass'


ALB = {'grass': (G.GREEN, 0.12), 'path': (F.DIRT, 0.1), 'bank': ('#6a5638', 0.22), 'bed': ('#3e4a3a', 0.2), 'soil': ('#8a6a44', 0.14), 'paving': ('#9a8a6a', 0.1)}
CELLS = [(c, r) for c in range(-1, COLS + 1) for r in range(-6, ROWS + 2)]
I.ground(k, CELLS, material, ALB, height=height, bump=0.0, seed=88, dither=0.035, step=0.0625)
q = []
for i in range(40):
    x0, x1 = -1 + i * 0.8, -1 + (i + 1) * 0.8
    if river_r(x0) > ROWS + 2:
        break
    q.append(((x0, river_r(x0) + 0.15, RZ), (x1, river_r(x1) + 0.15, RZ), (x1, ROWS + 2, RZ), (x0, ROWS + 2, RZ)))
k.quads(q, '#2a5a6a', 'stream_water')

# ---- the terraces: dry-stone walls holding up the slope, vines in rows on each ------------------------------------------
STONES = ('#c8b898', '#b8a888', '#d8c8a8', '#a89878')
for (rf, h) in TERR:
    lo = terrace_z(rf + 0.1)
    z, course = lo - 0.05, 0
    while z < h - 0.06:
        hh = rng.uniform(0.16, 0.24)
        x = -1.0 + (0.0 if course % 2 else rng.uniform(0.1, 0.25))
        while x < COLS + 1:
            w = rng.uniform(0.3, 0.6)
            if not (17.6 < x + w / 2 < 19.0):                           # the steps up through the terraces
                k.box(x + 0.015, rf - 0.12, z + 0.015, x + w - 0.015, rf + 0.02 + rng.uniform(0, 0.04), min(h, z + hh) - 0.015,
                      (shade(rng.choice(STONES), rng.uniform(0.86, 1.06)), 0.16), 'wall_stone', bevel=0.02)
            x += w
        z, course = z + hh, course + 1
    for x in range(0, COLS, 3):                                         # tufts and flowers in the wall's face
        if rng.random() < 0.5 and not 17 < x < 19.5:
            k.blob(x + rng.uniform(0, 2), rf + 0.03, rng.uniform(lo + 0.1, h - 0.05), 0.08, 0.04, 0.06, (shade('#4a7a36', rng.uniform(0.85, 1.1)), 0.2), 'moss', segs=7)
    n = 6                                                                # the steps
    for i in range(n):
        za = lo + (h - lo) * (i + 1) / n
        k.box(17.7, rf - 0.5 + 0.5 * (n - i) / n - 0.08, lo - 0.05, 18.9, rf + 0.15, za, (shade('#c8b898', rng.uniform(0.92, 1.06)), 0.14), 'steps', bevel=0.015)
# the vines: rows along each terrace (the estate's), with their posts and wires
for (rf, h) in TERR:
    for rr in (rf - 1.9, rf - 0.9):
        if rr < -1.0:
            continue
        sp = len(k.parts)
        G.vines(k, 1.0, 17.2, rr, h=0.95)
        G.vines(k, 19.6, 44.6, rr, h=0.95)
        G.lift(k, sp, h)
# the crest: a windmill, a stone hut in the vines, a cypress or two
sp = len(k.parts)
I.windmill(k, 34.0, -2.6, h=3.6, rad=1.0, tone='#e8dcc8', roof='#8a4a2a', chimes=False)
G.lift(k, sp, height(34.0, -2.6))
sp = len(k.parts)
HK.rich_house(k, 6.0, 8.4, 2.0, 3.6, wall_h=1.4, rise=1.0, roof='#b85a3a', wall=WARM, door_x=7.2, stone=True)
G.lift(k, sp, TERR[-1][1])
for (x, r) in ((12.0, -1.6), (24.0, -2.0), (42.0, -1.0), (2.0, -2.4)):
    sp = len(k.parts)
    W.pine(k, x, r, h=3.0, tone='#2e4a30')
    G.lift(k, sp, height(x, r))

# ---- the village on the level -------------------------------------------------------------------------------------------
W.cobbles(k, 14.2, 15.2, 27.0, 23.6, tone='#d0c0a0', size=0.26)
W.street_clutter(k, (14.2, 15.4, 27.0, 23.6), seed=8841)
W.tree(k, 20.6, 19.2, h=3.8, tone='#5a8a3a', lean=0.06)               # the plane tree, a bench round it
W.round_bench(k, 20.6, 19.2, tone=V.WOOD)
k.solid(19.8, 18.4, 21.4, 20.0)
I.well(k, 24.2, 21.4, stone='#b8a888')
# the winery: a long stone barn with the estate's name, its cellar door into the terrace wall behind
rm, zr = HK.rich_house(k, 25.4, 33.4, 12.0, 15.2, wall_h=2.2, rise=1.3, roof='#b85a3a', wall=WARM, door_x=29.4,
                       windows=[(26.6, 0.9), (32.2, 0.9)], chimney=33.0, stone=True)
SMOKE.append([32.88, round(rm - 0.15 - (zr + 1.05) * C, 3)])
V.board_sign(k, 'VANE ESTATE  VINEHALLOW', 'IMFellEnglishSC', 29.4, 15.23, 1.9, size=0.13, board='#3a1a2a', ink='#f0d8a0', trim='#c8a050', pad=0.06)
for x in (26.2, 26.8, 32.4):
    G.barrel(k, x, 15.8, h=0.62, radius=0.24, upright=x != 26.8)
k.solid(25.9, 15.5, 27.2, 16.2)
k.solid(32.1, 15.5, 32.8, 16.2)
# the cellar door: an arch of dressed stone into the hillside, the door studded, a lamp
cx_ = 36.4
k.box(cx_ - 0.9, TERR[0][0] - 0.2, 0.0, cx_ + 0.9, TERR[0][0] + 0.12, 1.75, (shade(WARM, 0.95), 0.16), 'cellar_face', bevel=0.02)
k.cyl_y(cx_, TERR[0][0] + 0.1, TERR[0][0] + 0.16, 1.2, 0.62, 0.5, (shade(WARM, 1.08), 0.14), 'cellar_arch', verts=16)
k.box(cx_ - 0.5, TERR[0][0] + 0.12, 0.0, cx_ + 0.5, TERR[0][0] + 0.18, 1.2, ('#4a2a1a', 0.14), 'cellar_door')
k.cyl_y(cx_, TERR[0][0] + 0.12, TERR[0][0] + 0.18, 1.2, 0.5, 0.42, ('#4a2a1a', 0.14), 'cellar_door', verts=14)
for (dx, dz) in ((-0.3, 0.4), (0.3, 0.4), (-0.3, 0.9), (0.3, 0.9), (0.0, 1.4)):
    k.sphere(cx_ + dx, TERR[0][0] + 0.19, dz, 0.03, 0.03, '#c8a040', 'stud', segs=5)
W.wall_lantern(k, cx_ + 0.8, TERR[0][0] + 0.12, z=1.4, energy=14)
V.board_sign(k, 'THE CELLAR', 'Rye', cx_, TERR[0][0] + 0.18, 1.85, size=0.1, board='#3a1a2a', ink='#f0d8a0', trim='#c8a050', pad=0.05)
for x in (34.6, 35.2, 37.6, 38.2):
    G.barrel(k, x, TERR[0][0] + 0.55, h=0.6, radius=0.23, upright=x < 36)
k.solid(34.3, TERR[0][0] + 0.25, 35.5, TERR[0][0] + 0.85)
k.solid(37.3, TERR[0][0] + 0.25, 38.5, TERR[0][0] + 0.85)
# the tasting terrace: tables under a pergola of vines, looking down the valley
PX0, PX1, PR0, PR1 = 30.2, 37.8, 18.0, 21.6
for x in (PX0, (PX0 + PX1) / 2, PX1):
    for r in (PR0, PR1):
        k.box(x - 0.07, r - 0.07, 0.0, x + 0.07, r + 0.07, 2.0, (G.WOOD_D, 0.15), 'pergola_post')
        k.solid_post(x, r)
for r in (PR0, PR1):
    k.box(PX0 - 0.2, r - 0.05, 2.0, PX1 + 0.2, r + 0.05, 2.1, (G.WOOD_D, 0.15), 'pergola_beam')
x = PX0
while x <= PX1 + 0.01:
    k.box(x - 0.03, PR0 - 0.3, 2.1, x + 0.03, PR1 + 0.3, 2.16, (G.WOOD, 0.15), 'pergola_rafter')
    x += 0.6
with k.foliage('leaf'):
    for _ in range(320):
        k.blob(rng.uniform(PX0 - 0.2, PX1 + 0.2), rng.uniform(PR0 - 0.2, PR1 + 0.2), 2.2 + rng.uniform(0, 0.12), 0.16, 0.13, 0.06,
               (shade(rng.choice(('#3e6a2a', '#4a7a30', '#56863a')), rng.uniform(0.9, 1.1)), 0.22), 'vine_leaf', segs=7)
for _ in range(16):
    gx, gr = rng.uniform(PX0, PX1), rng.uniform(PR0, PR1)
    for g_ in range(6):
        k.sphere(gx + rng.uniform(-0.03, 0.03), gr, 2.05 - g_ * 0.025, 0.03, 0.03, ('#4a2a5a', 0.1), 'grape', segs=5)
for (x, r) in ((31.6, 19.0), (33.8, 20.6), (36.2, 19.2)):
    G.bistro(k, x, r, top='#5a2a3a')
W.lantern_post(k, 29.6, 21.8, h=2.1, energy=28)
V.flower_bed(k, 30.4, 22.0, 37.6, 22.5, cols=('#e05070', '#f0d040', '#a070e0', '#f0f0f0'))
# the chapel and the houses round the square
HK.rich_house(k, 8.6, 13.4, 11.4, 15.0, wall_h=2.4, rise=1.9, roof='#8a5040', wall=WARM, door_x=11.0, windows=[(9.5, 1.0), (12.5, 1.0)], stone=True)
tx0, tx1, tr0, tr1 = 13.8, 15.0, 13.8, 15.0                         # the campanile, in the village's stone
k.box(tx0, tr0, 0.0, tx1, tr1, 3.4, (WARM, 0.16), 'tower')
for z in (0.9, 1.9, 2.9):
    k.box(tx0 - 0.03, tr1 - 0.02, z, tx1 + 0.03, tr1 + 0.03, z + 0.06, (shade(WARM, 1.1), 0.12), 'string_course')
k.box(14.2, tr1 + 0.0, 2.95, 14.6, tr1 + 0.03, 3.35, '#2a2420', 'belfry')
k.cyl_y(14.4, tr1 + 0.0, tr1 + 0.03, 3.35, 0.2, 0.12, '#2a2420', 'belfry', verts=10)
k.cone(14.4, 14.4, 3.25, 3.55, 0.12, 0.08, ('#c8a040', 0.06), 'bell', verts=10)
W.pyramid(k, tx0 - 0.1, tr0 - 0.1, tx1 + 0.1, tr1 + 0.1, 3.4, 4.3, ('#b85a3a', 0.14), 'roof_tower')
k.solid(tx0, tr0, tx1, tr1)
for (x0, x1, door, roof, rb, rf) in ((2.0, 5.6, 3.8, '#b85a3a', 19.4, 22.8), (5.8, 8.8, 7.3, '#a85030', 19.6, 22.6),
                                      (27.6, 30.6, 29.1, '#b85a3a', 23.8, 27.0), (31.0, 34.6, 32.8, '#8a5040', 24.0, 27.2)):
    rm, zr = HK.rich_house(k, x0, x1, rb, rf, wall_h=1.95, rise=1.3, roof=roof, wall=WARM, door_x=door, windows=[(x0 + 0.7, 0.85), (x1 - 0.7, 0.85)],
                           chimney=x1 - 0.4, stone=True)
    SMOKE.append([x1 - 0.52, round(rm - 0.15 - (zr + 1.05) * C, 3)])
for (x, r) in ((14.8, 15.8), (26.4, 22.9), (14.8, 22.9)):
    HK.tub(k, x, r)
for (x, r) in ((14.0, 23.8), (27.2, 15.4)):
    W.lantern_post(k, x, r, h=2.2, energy=30)
V.signpost(k, 22.4, 25.2, [('THE DOWNS', 'e', 1.55), ('THE LANDING', 'w', 1.25), ('THE CELLAR', 'e', 0.95)])
G.washing_line(k, (2.4, 24.0), (5.4, 24.4))
# the estate's own rows on the level, where anyone can pick: four rows along the foot of the terraces
for (x0, x1, rr) in ((1.0, 7.4, 16.4), (1.0, 7.4, 17.4), (36.6, 44.6, 23.6), (36.6, 44.6, 24.6)):
    G.vines(k, x0, x1, rr, h=0.95)
# down to the landing: the river, a little jetty for the ferry, willows
k.box(3.4, 33.0, 0.02, 6.6, 33.9, 0.1, (G.WOOD, 0.15), 'jetty_plank')
W.dock(k, 4.4, 5.6, 33.8, 36.6, z=0.05)
V.board_sign(k, 'VINEHALLOW LANDING', 'Rye', 6.6, 32.8, 0.9, size=0.09, board='#2e5a3e', ink='#f0e8c8', trim='#c8a050', pad=0.04)
k.box(6.55, 32.74, 0.0, 6.65, 32.8, 0.95, (G.WOOD_D, 0.15), 'sign_post')
for (x, r) in ((8.6, 33.8), (1.0, 29.4), (14.0, 35.6)):
    G.willow(k, x, r, h=2.8)
for (x0, r0, x1, r1, n) in ((0.5, 24.5, 12.0, 31.0, 50), (24.0, 28.0, 44.0, 38.0, 70), (36.0, 14.0, 45.0, 22.0, 30)):
    F.wildflowers(k, x0, r0, x1, r1, n)
for (x, r) in ((40.0, 30.0), (43.0, 34.0), (36.0, 36.0), (28.0, 33.5), (44.0, 27.0), (11.0, 27.5)):
    W.tree(k, x, r, h=rng.uniform(2.6, 3.2), tone=rng.choice(('#3a6a34', '#4a7a30')))
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
for (x, r) in ((25.0, 31.0), (16.0, 27.0)):
    G.hedge(k, (x - 2.0, r), (x + 2.0, r))

# the lower slope: lavender in rows, olive-grey trees, a stone wall along the lane, a bench at the view
for rr in (28.4, 29.2, 30.0, 30.8, 31.6):
    G.flower_row(k, 25.0, 38.0, rr, 'lavender')
for (x, r) in ((40.0, 30.0), (24.0, 34.6), (32.0, 34.6), (38.6, 34.0), (13.0, 27.6), (7.0, 26.4), (16.6, 31.4)):
    W.tree(k, x, r, h=rng.uniform(2.0, 2.5), tone='#7a8a5a', lean=rng.uniform(-0.15, 0.15))
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
HK.stone_wall(k, 21.8, 30.0, 26.2, h=0.5)
HK.stone_wall(k, 12.0, 19.2, 26.2, h=0.5)
W.bench(k, 9.0, 10.2, 29.2)
for (x0, r0, x1, r1) in ((1.0, 25.0, 8.0, 30.0), (23.0, 33.0, 30.0, 36.5)):
    F.wildflowers(k, x0, r0, x1, r1, 40, cols=('#e03030', '#e83a3a', '#f0d040', '#f0f0f0'))
for (x, r) in ((44.0, 18.0), (44.6, 21.0), (12.6, 20.6)):
    W.pine(k, x, r, h=3.2, tone='#2e4a30')
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

k.later.append(lambda: W.meadow(k, G.GREEN, cells=CELLS, ok=('ground_grass',), density=0.9, flowers=0.8))

# ---- where you can walk: the level below the terraces, the lane, the path to the landing ---------------------------------------
k.solid(0, 0, COLS, int(TERR[0][0]) + 1)                             # the terraces (scenery: the estate's)
for c in range(COLS):
    for r in range(ROWS):
        x, y = c + 0.5, r + 0.5
        if x < 30 and y > river_r(x) + 0.2 and not (4.0 <= x <= 6.0 and y < river_r(x) + 3.0):
            k.solid(c, r, c + 1, r + 1)

if os.environ.get('NOVAR'):
    k.variants = []
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle=None if os.environ.get('PREVIEW') else 'day', light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Vinehallow', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [20, 38]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -4.0, COLS, ROWS]})


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 20, 'y': 39, 'type': 'enter_world', 'label': 'THE DOWNS', 'prompt': 'PRESS E TO TAKE THE LANE DOWN', 'target': 'verdance-downs', 'spawn': [51, 1]},
    {'x': 21, 'y': 39, 'type': 'enter_world', 'label': 'THE DOWNS', 'prompt': 'PRESS E TO TAKE THE LANE DOWN', 'target': 'verdance-downs', 'spawn': [51, 1]},
    {'x': 5, 'y': 34, 'type': 'ferry', 'label': 'VINEHALLOW LANDING', 'prompt': 'PRESS E FOR THE FERRY'},
    {'x': 29, 'y': 16, 'type': 'winery', 'label': 'VANE ESTATE', 'prompt': 'PRESS E TO GO IN'},
    {'x': 36, 'y': 15, 'type': 'cellar', 'label': 'THE CELLAR', 'prompt': 'PRESS E TO GO DOWN'},
    {'x': 3, 'y': 18, 'type': 'vines', 'label': 'THE VINES', 'prompt': 'PRESS E TO PICK', 'row': 'west'},
    {'x': 40, 'y': 25, 'type': 'vines', 'label': 'THE VINES', 'prompt': 'PRESS E TO PICK', 'row': 'east'},
    {'x': 33, 'y': 22, 'type': 'tasting', 'label': 'THE TASTING TERRACE', 'prompt': 'PRESS E TO SIT'},
    {'x': 24, 'y': 22, 'type': 'farm_well', 'label': 'WELL', 'prompt': 'PRESS E TO FILL THE CAN'},
    look('CHAPEL', 11, 15, 'A LITTLE CHAPEL WITH A BELL THAT RINGS FOR THE START OF THE HARVEST. INSIDE, A CARVED GRAPEVINE CLIMBS THE PULPIT.'),
    look('THE TERRACES', 18, 14, 'TERRACE OVER TERRACE UP THE HILL, EACH HELD UP BY A DRY-STONE WALL OLDER THAN THE VILLAGE. THE VANE FAMILY HAS TENDED THESE ROWS FOR TWO HUNDRED YEARS.'),
    look('THE PLANE TREE', 21, 20, 'THE OLD PLANE TREE ON THE SQUARE, ITS BARK IN PATCHES LIKE A MAP. THE OLD MEN OF VINEHALLOW PLAY BOULES UNDER IT AND DISAGREE ABOUT EVERYTHING.'),
    {'x': 28, 'y': 16, 'type': 'dialog', 'label': 'ROSALIND', 'prompt': 'PRESS E TO TALK', 'dialog': 'ROSALIND VANE LOOKS UP FROM A GLASS SHE\'S HOLDING TO THE LIGHT.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-rosalind', 'x': 28, 'y': 16, 'facing': 'down'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS, scene_extra={'smoke': SMOKE})
print('vinehallow done')
