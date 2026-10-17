"""Starling Holm — a little island of your own off the Emerald Sea (world id "lumar-holm").

  BVENV/bin/python tools/bridge-art/scenes/lumar_holm.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-holm

Tucked away from the towns: a holm with a sheltered cove, an old jetty and a crumbling quay, a cottage gone to ruin on
the rise, an orchard run wild, a walled garden lost under brambles, an old boathouse sinking into the shingle. Buy the
deed and make it yours (js/holm.js): each thing you build is a scene variant (`k.variant`), rendered in the island's
own light and switched on as you build it:
  house      ruin | cottage        the cottage on the rise, roofed, lit and smoking
  dock       built                 the quay and jetty rebuilt: new planking, bollards, lamps, a crane, your flag
  garden     tilled                the walled garden cleared and dug (the farm's plot: `farm.plot`)
  warehouse  built                 a timber warehouse on its lot (cargo kept ashore between ships)
  quarters   built                 a bunkhouse for your hands
  resort     old | built           the old boathouse, or the Starling, a seaside hotel in its place (a venue that earns)
Lots that are open ground until you build on them (warehouse, quarters) are left walkable here and listed in the world
JSON's `holm.lots`; js/holm.js blocks their tiles once built.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_farm as F                # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-holm.json')
WID = 'lumar-holm'
COLS, ROWS = 42, 32
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=7707)
C45 = math.cos(math.radians(45))

LOBES = [(21, 13, 16, 9), (9, 15, 6, 6.5), (33, 14, 6.5, 7)]
land = I.mask(COLS, ROWS, LOBES, seed=77, amp=0.13)
land = I.flood(land, (21, 13))
QUAY = 21
land = {(c, r) for (c, r) in land if r <= QUAY or not (14 <= c <= 28)}          # the cove
land |= {(c, r) for c in range(14, 29) for r in range(18, QUAY + 1)}
PX = 21
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
SHIP_R = QUAY + 4

HOUSE = (16.8, 24.2, 6.4, 10.6)
GARDEN = (5, 11, 11, 17)                           # the plot, tiles inclusive (the wall round it is outside)
LOTS = {'warehouse': (27, 13, 32, 17), 'quarters': (26, 6, 31, 9)}


# ---- ground ---------------------------------------------------------------------------------------------------------
PATHS = [[(PX + 0.5, QUAY + 0.2), (PX + 0.5, 15.0), (20.6, HOUSE[3] + 0.3)], [(PX + 0.5, 15.5), (13.0, 14.5), (12.2, 14.0)],
         [(PX + 0.5, 16.0), (26.5, 18.4)], [(28.5, 12.6), (27.0, 11.0), (24.6, 10.0)]]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    p = pd(x, r) + 0.2 * I.n2(x, r, 1.6, 3)
    if p < 0.5:
        return 'path'
    m = I.n2(x, r, 0.45, 31) + 0.4 * I.n2(x, r, 1.5, 32)
    return 'grass' if m > -0.3 else ('grass_dark' if m > -0.65 else 'stone')


ALB = {'path': ('#7a6a50', 0.3), 'grass': ('#3e5e38', 0.3), 'grass_dark': ('#30503a', 0.3), 'stone': ('#6a6a62', 0.25)}
I.ground(k, land, material, ALB)
C.coast(k, land, ground=(material, ALB), palette='emerald', grass='#3e5e38', rock='#5a5a54', seed=71, beachiness=0.25,
        beach_bias=lambda x, r: 0.9 * I.smooth(QUAY - 2.0, QUAY + 0.5, r) * (1 - I.smooth(13.0, 15.0, x) * (1 - I.smooth(28.0, 30.0, x))),
        keep_clear=[(PX - 0.4, QUAY - 0.2, PX + 1.4, SHIP_R + 0.2), (PX - 14.0, SHIP_R - 0.6, PX + 16.0, SHIP_R + 3.0),
                    (14.0, QUAY + 0.6, 29.0, QUAY + 1.6)],
        sheer=[(13.9, QUAY + 0.9, 29.1, QUAY + 4.0, 1.6)])

# ---- the old quay and jetty (always there; the dock variant rebuilds them) -----------------------------------------
k.box(13.8, QUAY + 0.95, C.WZ - 0.6, 29.2, QUAY + 1.1, -0.05, ('#5e5a52', 0.25), 'old_quay')
x = 14.0
while x < 29.0:                                     # worn blocks, some fallen
    if k.rng.random() > 0.18:
        k.box(x + 0.03, QUAY + 1.06, C.WZ - 0.4, x + 0.46, QUAY + 1.13, -0.06 - k.rng.random() * 0.08,
              (shade('#5e5a52', k.rng.uniform(0.8, 1.1)), 0.25), 'quay_block')
    x += 0.5
for i in range(3):                                   # the old jetty: grey planks, a few gone, piles leaning
    r0 = QUAY + 0.9 + i
    for j in range(5):
        if (i, j) in ((1, 2), (2, 0)):
            continue
        k.box(PX + 0.06 + j * 0.18, r0, 0.0, PX + 0.22 + j * 0.18, r0 + 1.0, 0.05, (shade('#7a7266', k.rng.uniform(0.8, 1.05)), 0.2), 'old_plank')
for (dx, dr, lean) in ((0.1, QUAY + 1.6, 0.05), (0.9, QUAY + 1.6, -0.04), (0.1, SHIP_R - 0.1, -0.06), (0.9, SHIP_R - 0.1, 0.07)):
    k.tube((PX + dx, dr, C.WZ - 0.6), (PX + dx + lean, dr, 0.25), 0.07, ('#4a3e30', 0.2), 'old_pile', verts=6, smooth=False)

# ---- the cottage on the rise: a ruin, or rebuilt -------------------------------------------------------------------
SMOKE = {}                                         # chimneys by what they belong to: they smoke once it's built
k.solid(*[HOUSE[0], HOUSE[2], HOUSE[1], HOUSE[3]])
with k.variant('house', 'ruin'):
    hx0, hx1, hr0, hr1 = HOUSE
    k.box(hx0, hr0, 0.0, hx1, hr1, 0.3, ('#6a665e', 0.2), 'ruin_footing', bevel=0.02)
    for (a, b, side) in (((hx0, hr1 - 0.25), (hx1, hr1), 'front'), ((hx0, hr0), (hx1, hr0 + 0.25), 'back'),
                         ((hx0, hr0), (hx0 + 0.25, hr1), 'west'), ((hx1 - 0.25, hr0), (hx1, hr1), 'east')):
        n = 9 if side in ('front', 'back') else 6
        for i in range(n):                                               # walls broken to a ragged top
            f0, f1 = i / n, (i + 1) / n
            x0 = a[0] + (b[0] - a[0]) * f0 if side in ('front', 'back') else a[0]
            x1 = a[0] + (b[0] - a[0]) * f1 if side in ('front', 'back') else b[0]
            r0 = a[1] if side in ('front', 'back') else a[1] + (b[1] - a[1]) * f0
            r1 = b[1] if side in ('front', 'back') else a[1] + (b[1] - a[1]) * f1
            if side == 'front' and 0.4 < (f0 + f1) / 2 < 0.6:
                h = 0.4                                                  # the doorway
            else:
                h = 0.6 + 1.3 * abs(math.sin(i * 1.7 + len(side))) * (1.0 if side != 'front' else 0.8)
            k.box(x0, r0, 0.3, x1, r1, 0.3 + h, ('#8a8478', 0.2), 'ruin_wall')
    for i in range(14):                                                  # ivy over it
        a = i * 2.39
        k.blob(hx0 + 0.3 + (hx1 - hx0 - 0.6) * ((i * 0.37) % 1), hr0 + 0.2 + (hr1 - hr0 - 0.4) * ((i * 0.61) % 1), 0.9 + 0.5 * math.sin(a),
               0.35, 0.25, 0.3, ('#2e5030', 0.3), 'ivy', segs=8)
    for (x, r) in ((18.6, 8.2), (21.8, 9.0)):                            # fallen beams inside
        k.tube((x, r, 0.35), (x + 1.6, r - 0.4, 0.9), 0.08, ('#4a3a2a', 0.2), 'fallen_beam', verts=6, smooth=False)
with k.variant('house', 'cottage'):
    ridge = W.house(k, HOUSE[0], HOUSE[1], HOUSE[2], HOUSE[3], wall_h=2.2, rise=1.4, roof='#3a5a4a', wall='#ece2cc', door_x=20.5,
                    windows=[(17.8, 0.9), (23.2, 0.9)], windows_up=[(19.0, 1.8), (22.0, 1.8)], chimney=17.5, lanterns=(19.8, 21.2))
    W.planter(k, 17.2, 18.4, HOUSE[3] + 0.25)
    W.planter(k, 22.6, 23.8, HOUSE[3] + 0.25)
    rm, zr = ridge
    SMOKE['house'] = [round(17.5 - 0.12, 3), round(rm - 0.15 - (zr + 0.65) * C45, 3)]

# ---- the walled garden: brambles, or dug and planted --------------------------------------------------------------
gx0, gr0, gx1, gr1 = GARDEN
k.box(gx0 - 0.4, gr0 - 0.4, 0.0, gx1 + 1.4, gr0 - 0.1, 0.7, ('#7a7468', 0.2), 'garden_wall')        # the old wall, three sides
k.box(gx0 - 0.4, gr0 - 0.4, 0.0, gx0 - 0.1, gr1 + 1.4, 0.7, ('#7a7468', 0.2), 'garden_wall')
k.box(gx0 - 0.4, gr1 + 1.1, 0.0, gx1 - 1.0, gr1 + 1.4, 0.7, ('#7a7468', 0.2), 'garden_wall')
k.solid(gx0 - 1, gr0 - 1, gx1 + 2, gr0)
k.solid(gx0 - 1, gr0 - 1, gx0, gr1 + 2)
k.solid(gx0 - 1, gr1 + 1, gx1 - 1, gr1 + 2)
with k.variant('garden', 'wild'):
    for i in range(46):
        x = gx0 + 0.3 + (gx1 + 1 - gx0 - 0.6) * ((i * 0.618) % 1)
        r = gr0 + 0.3 + (gr1 + 1 - gr0 - 0.6) * ((i * 0.377) % 1)
        k.blob(x, r, 0.15, 0.3 + 0.15 * ((i * 7) % 3), 0.22, 0.22 + 0.08 * (i % 3), ('#3a5228', 0.3), 'bramble', segs=8)
        if i % 4 == 0:
            k.blob(x + 0.15, r, 0.35, 0.05, 0.05, 0.05, '#5a1a3a', 'berry', segs=6)
with k.variant('garden', 'tilled'):
    F.earth(k, gx0 + 0.05, gr0 + 0.05, gx1 + 0.95, gr1 + 0.95)
    F.scarecrow(k, gx1 + 0.6, gr0 + 0.5)
    k.cyl(gx1 + 0.55, gr1 + 0.5, 0.0, 0.7, 0.3, ('#5a3a1e', 0.15), 'water_butt', verts=12)
I.well(k, 13.5, 12.6)
k.solid(13.0, 12.1, 14.0, 13.1)

# ---- the lots: open ground with a stake, or built on --------------------------------------------------------------
for name, (c0, r0, c1, r1) in LOTS.items():
    for (x, r) in ((c0 + 0.1, r0 + 0.1), (c1 + 0.9, r0 + 0.1), (c0 + 0.1, r1 + 0.9), (c1 + 0.9, r1 + 0.9)):
        k.cyl(x, r, 0.0, 0.35, 0.04, ('#8a6a3a', 0.2), 'stake', verts=5)
with k.variant('warehouse', 'built'):
    c0, r0, c1, r1 = LOTS['warehouse']
    W.house(k, c0 + 0.1, c1 + 0.9, r0 + 0.1, r1 + 0.95, wall_h=2.4, rise=1.3, roof='#4a3a2e', wall='#8a6a48', timber='#3a2618',
            door_x=None, windows_up=[(c0 + 1.2, 1.9), (c1 - 0.2, 1.9)])
    cx = (c0 + c1 + 1) / 2
    k.box(cx - 0.9, r1 + 0.95, 0.0, cx + 0.9, r1 + 1.0, 1.7, ('#4a3420', 0.12), 'warehouse_doors')
    W.wall_lantern(k, cx + 1.2, r1 + 0.95, z=1.7, energy=8)
with k.variant('quarters', 'built'):
    c0, r0, c1, r1 = LOTS['quarters']
    q = W.house(k, c0 + 0.1, c1 + 0.9, r0 + 0.1, r1 + 0.95, wall_h=1.9, rise=1.1, roof='#5a3a2a', wall='#d8ccb0', door_x=(c0 + c1 + 1) / 2,
                windows=[(c0 + 1.0, 0.8), (c1 - 0.0, 0.8)], chimney=c1 + 0.4)
    SMOKE['quarters'] = [round(c1 + 0.4 - 0.12, 3), round(q[0] - 0.15 - (q[1] + 0.65) * C45, 3)]
k.blocked -= {(c, r) for nm, (c0, r0, c1, r1) in LOTS.items() for c in range(c0, c1 + 1) for r in range(r0, r1 + 1)}

# ---- the rebuilt dock -------------------------------------------------------------------------------------------
with k.variant('dock', 'built'):
    W.dock(k, PX + 0.04, PX + 0.96, QUAY + 0.85, SHIP_R + 0.02, z=0.07)
    k.box(13.9, QUAY + 0.6, -0.04, 29.1, QUAY + 1.12, 0.06, ('#8a8478', 0.2), 'new_quay_cap', bevel=0.02)
    for x in (15.0, 18.5, 24.5, 28.0):
        k.cyl(x, QUAY + 0.8, 0.06, 0.4, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
        k.cyl(x, QUAY + 0.8, 0.4, 0.45, 0.15, '#2a2a30', 'bollard_cap', verts=10)
    for x in (PX - 0.6, PX + 1.6):
        W.lantern_post(k, x, QUAY - 0.3, energy=22)
    # the crane on the quay, its jib out over the water
    k.cyl(26.6, QUAY - 0.4, 0.0, 2.4, 0.12, ('#5a4024', 0.1), 'crane_post', verts=8)
    k.tube((26.6, QUAY - 0.4, 2.2), (26.6, QUAY + 2.0, 1.6), 0.07, ('#5a4024', 0.1), 'crane_jib', verts=6, smooth=False)
    k.tube((26.6, QUAY + 2.0, 1.6), (26.6, QUAY + 2.0, 0.6), 0.012, ('#c8b48a', 0.1), 'crane_rope', verts=4, smooth=False)
    I.flagpole(k, 16.0, QUAY - 0.5, h=3.2, col='#2e8a5a')
k.solid(PX - 1, QUAY - 1, PX, QUAY)                      # where the lamps and the crane stand (and the sale sign before)
k.solid(PX + 1, QUAY - 1, PX + 2, QUAY)
k.solid(26, QUAY - 1, 27, QUAY)
k.solid(15.5, QUAY - 1, 16.5, QUAY)

# ---- the orchard, the boathouse, the lookout --------------------------------------------------------------------
for (x, r) in ((16.0, 14.6), (17.6, 17.2), (24.8, 14.2), (26.0, 16.6), (14.2, 18.6), (23.4, 12.2)):
    F.apple_tree(k, x, r, h=k.rng.uniform(2.0, 2.5))
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
# the old boathouse, roof sagging, its doors to the water — or, built (js/holm.js), the Starling: a seaside hotel on
# the same footing, white and blue, lamps lit, parasols on the lawn beside it (a venue: js/business.js `holm-resort`)
BH = (33.0, 37.4, 17.4, 20.2)
with k.variant('resort', 'old'):
    k.box(BH[0], BH[2], 0.0, BH[1], BH[3], 1.4, ('#5a4a3a', 0.2), 'boathouse')
    W._gable_roof(k, BH[0], BH[1], BH[2], BH[3], 1.4, 0.9, '#4a4a46')
    k.box(BH[0] + 1.0, BH[3], 0.0, BH[1] - 1.0, BH[3] + 0.05, 1.1, ('#2a1e14', 0.15), 'boathouse_doors')
with k.variant('resort', 'built'):
    W.house(k, BH[0], BH[1], BH[2], BH[3], wall_h=2.7, rise=1.3, roof='#34507a', wall='#f0ece2', door_x=35.2,
            windows=[(33.8, 0.9), (36.6, 0.9)], windows_up=[(33.8, 1.9), (36.6, 1.9)], chimney=36.9,
            lanterns=(34.4, 36.0))
    V.board_sign(k, 'THE STARLING', 'IMFellEnglishSC-Regular', 35.2, BH[3], 1.78, size=0.22, board='#1e2e4a', ink='#f0e8d0')
    # cafe tables on the lawn under striped parasols: a thin pole, a shallow canopy of eight panels, two chairs
    for (x, r, c) in ((31.0, 18.4, '#d84848'), (32.2, 19.6, '#3a7ac8'), (31.2, 20.6, '#e0b040')):
        k.cyl(x, r, 0.0, 1.5, 0.025, '#e8e4dc', 'parasol_pole', verts=6)
        for i in range(8):
            a0, a1 = math.tau * i / 8, math.tau * (i + 1) / 8
            k.poly([(x, r, 1.52), (x + 0.7 * math.cos(a0), r + 0.7 * math.sin(a0), 1.24), (x + 0.7 * math.cos(a1), r + 0.7 * math.sin(a1), 1.24)],
                   (c if i % 2 == 0 else '#f2eee4', 0.2), 'parasol')
        k.cyl(x, r, 0.0, 0.48, 0.035, '#2e2e30', 'cafe_leg', verts=6)
        k.cyl(x, r, 0.46, 0.5, 0.26, ('#f0ece2', 0.1), 'cafe_table', verts=12)
        for dx in (-0.42, 0.42):
            k.box(x + dx - 0.11, r - 0.11, 0.0, x + dx + 0.11, r + 0.11, 0.26, ('#2e4466', 0.15), 'cafe_chair')
            bx = x + dx + (0.09 if dx > 0 else -0.11)
            k.box(bx, r - 0.11, 0.26, bx + 0.02, r + 0.11, 0.56, ('#2e4466', 0.15), 'cafe_chair_back')
    I.flagpole(k, 37.9, 18.0, h=3.0, col='#34507a')
k.solid(BH[0], BH[2], BH[1], BH[3])
W.bench(k, 4.0, 5.4, 9.4)
k.solid(4.0, 9.2, 5.4, 9.7)
for (x, r) in ((10.0, 7.8), (31.6, 10.6), (36.4, 12.2), (7.2, 19.6), (34.6, 8.6)):
    W.pine(k, x, r, h=2.3)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
F.wildflowers(k, 22.0, 15.0, 26.0, 19.5, 26)
F.wildflowers(k, 6.0, 7.0, 12.0, 10.0, 18)
# the sale sign at the head of the jetty (js/holm.js takes it down once the deed's yours, the post stays)
k.box(PX + 1.45, QUAY - 0.55, 0.0, PX + 1.55, QUAY - 0.45, 1.2, A.WOOD_D, 'sign_post')

busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in land if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#4e6e44', per_cell=1.3, avoid=busy)
I.pebbles(k, land, '#6a6a62', per_cell=0.2, avoid=busy)

k.area_light(21.0, 14.0, 16.0, '#90a8c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(21.0, 13.0, 4.0, '#e0f0e8', 40, radius=1.5)

k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#26384a', 0.8))

# ---- the world -----------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Starling Holm', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': '#d8f0e0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY + 2, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         {'x': PX + 1, 'y': QUAY - 1, 'type': 'holm', 'act': 'deed', 'label': 'FOR SALE', 'prompt': 'PRESS E TO READ'},
         {'x': 20, 'y': 10, 'type': 'holm', 'act': 'house', 'label': 'THE COTTAGE', 'prompt': 'PRESS E TO GO IN'},
         {'x': 29, 'y': 17, 'type': 'holm', 'act': 'warehouse', 'label': 'WAREHOUSE', 'prompt': 'PRESS E TO LOOK'},
         {'x': 28, 'y': 9, 'type': 'holm', 'act': 'quarters', 'label': 'QUARTERS', 'prompt': 'PRESS E TO LOOK'},
         {'x': 12, 'y': 14, 'type': 'holm', 'act': 'garden', 'label': 'THE GARDEN', 'prompt': 'PRESS E TO LOOK'},
         {'x': 13, 'y': 12, 'type': 'farm_well', 'label': 'WELL', 'prompt': 'PRESS E TO DRAW WATER'},
         look('BOATHOUSE', 33, 18, 'THE OLD BOATHOUSE, ITS ROOF SAGGING. INSIDE, A ROWING BOAT WITH NO BOTTOM AND A NAME YOU CAN\'T READ.'),
         look('LOOKOUT', 5, 10, 'A BENCH ON THE WEST HEAD. THE CAPITAL\'S LIGHTS ON ONE SIDE, NOTHING BUT SEA ON THE OTHER.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER, scene_id=WID, actors=[],
            scene_extra={'backdrop': True, 'smoke': [], 'layers': {'house': 'ruin', 'garden': 'wild', 'resort': 'old'}})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in land and (c, r) not in PIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
w['farm'] = {'plot': list(GARDEN)}
w['holm'] = {'lots': {n: list(v) for n, v in LOTS.items()}, 'smoke': SMOKE}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('holm done; walkable', len(land))
