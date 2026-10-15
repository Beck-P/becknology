"""Brambleford — the farm town on Verdance (world id "verdance-village"), where the shuttle sets down.

  BVENV/bin/python tools/bridge-art/scenes/verdance_village.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance-village

A village in the same long golden afternoon as the farm. Along the north of the main
street, every building its own: the Crusty Loaf, a cream bakery under terracotta with
bread in the window; the Hayloft, a two-storey thatched inn; Pennyworth's, a brick
general store with a striped awning and its windows full of jars; St Elm's, a stone
chapel, and its bell tower; then the landing green with the skiff on it. South of the
street, the cobbled square with its well, the flower stall, the notice board and the
pub's tables; east, the Anvil & Hoof, an open forge with a live hearth, and two
cottages behind picket fences. West, Ludd's watermill turns in the stream that runs
across the bottom of the village; over the footbridge Meadow Lane wanders off south
(to the old farm — js/worlds and scenes/verdance.py), over the stone bridge are the
allotments and a cottage among apple trees. Every shop has its name painted up.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_farm as F                # noqa: E402
import assets_isle as I                # noqa: E402
import assets_ship as P                # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'verdance-village'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 34
FRONT = 10.2                                                    # the street-side facades
SR0, SR1 = 26.2, 28.0                                           # the stream, across the bottom
k = Kit(COLS, ROWS, margin_top=2.4, margin_bottom=0.6, seed=1907)
C = math.cos(math.radians(45))
SMOKE = []

# ---- the ground: meadow, the street, the square, the lanes ----------------------------------------------------
W.grass(k, 0, -2.4, COLS, ROWS + 0.6, tone=F.GRASS, tufts=0.45)
F.dirt_path(k, 0.6, 10.4, 45.4, 12.4)                            # the main street
F.dirt_path(k, 38.6, 9.2, 40.4, 10.4)                            # up to the landing green
W.cobbles(k, 9.0, 12.4, 27.0, 19.6, tone='#8a8274')              # the square
F.dirt_path(k, 10.0, 19.6, 11.4, SR0 - 0.2)                      # Meadow Lane, down to the footbridge...
F.dirt_path(k, 10.0, SR1 + 0.2, 11.4, ROWS + 0.6)                # ...and away south
F.dirt_path(k, 30.0, 19.6, 31.8, SR0 - 0.2)                      # to the stone bridge
F.dirt_path(k, 30.0, SR1 + 0.2, 31.8, 29.0)
F.dirt_path(k, 1.0, 25.0, 9.6, 26.0)                             # the mill yard along the bank
F.dirt_path(k, 6.2, 19.4, 9.6, 25.0)
F.dirt_path(k, 32.6, 18.6, 45.0, 19.6)                           # past the forge to the cottages

# ---- the north side of the street ---------------------------------------------------------------------------
# The Crusty Loaf: cream and terracotta, bread in the window, smoke from the oven chimney
rm, zr = W.house(k, 2.6, 7.4, 5.2, FRONT, wall_h=2.3, rise=1.4, roof='#b85a3a', wall='#f4e8c8', door_x=4.2,
                 windows=[(3.1, 0.9)], chimney=3.2)
SMOKE.append([3.08, round(rm - 0.15 - (zr + 0.65) * C, 3)])
V.shop_window(k, 5.0, 7.0, FRONT + 0.02, 0.45, 1.35, frame='#6a3a22', goods=('#c89048', '#e0b060', '#a86a30', '#f0d8a0'))
V.board_sign(k, 'The Crusty Loaf', 'Pacifico', 5.0, FRONT + 0.03, 1.72, size=0.2, board='#f0e0c0', ink='#7a3a1a', trim='#8a5030')
W.hanging_sign(k, 7.15, FRONT, 1.9, icon='bread')
W.bench(k, 5.4, 6.9, FRONT + 0.75)
# The Hayloft: a big thatched inn, two floors of windows, its name over the door, a mug on a bracket
rm, zr = W.house(k, 9.6, 17.4, 4.0, FRONT, wall_h=2.9, rise=1.9, roof='#c4a25a', wall='#efe2c6', timber='#4a3020', door_x=13.5,
                 windows=[(10.9, 0.85), (16.1, 0.85)], windows_up=[(10.9, 2.15), (13.5, 2.2), (16.1, 2.15)], chimney=16.6)
SMOKE.append([16.48, round(rm - 0.15 - (zr + 0.65) * C, 3)])
V.board_sign(k, 'THE HAYLOFT', 'Rye', 13.5, FRONT + 0.03, 1.78, size=0.22)
W.hanging_sign(k, 17.55, FRONT, 2.1, icon='mug')
for x in (12.4, 14.6):
    W.planter(k, x - 0.45, x + 0.45, FRONT + 0.18, flowers=('#e05070', '#f0d040', '#f0f0f0'))
# Pennyworth's: brick and slate, a striped awning over windows full of jars and parcels
W.house(k, 19.2, 25.4, 5.0, FRONT, wall_h=2.55, rise=1.3, roof='#4e5a68', wall='#a85a48', door_x=22.3, stone=True)
V.shop_window(k, 19.6, 21.6, FRONT + 0.02, 0.45, 1.5)
V.shop_window(k, 23.0, 25.0, FRONT + 0.02, 0.45, 1.5, goods=('#4a7ac0', '#e8d090', '#c84a3a', '#5a8a3a'))
V.awning(k, 19.4, 25.2, FRONT + 0.06, 1.85, depth=0.62, drop=0.3, cols=('#b83a32', '#f0e6d0'))
V.board_sign(k, "PENNYWORTH'S", 'AlegreyaSC-Bold', 22.3, FRONT + 0.03, 2.0, size=0.22, board='#24362a', ink='#f0d890')
V.crates(k, 25.0, FRONT + 0.5)
V.sacks(k, 19.7, FRONT + 0.45, n=3)
# St Elm's: a stone chapel, a rose window over the door, its bell tower beside it
W.house(k, 27.0, 30.8, 3.6, FRONT, wall_h=2.6, rise=2.1, roof='#5a5a62', wall='#c0b8a8', door_x=28.9, windows=[(27.7, 0.9), (30.1, 0.9)],
        stone=True)
k.cyl_y(28.9, FRONT + 0.0, FRONT + 0.05, 2.2, 0.3, 0.3, '#3a3040', 'rose_frame', verts=16)
k.cyl_y(28.9, FRONT + 0.03, FRONT + 0.07, 2.2, 0.24, 0.24, '#d08a50', 'rose_glass', emit=('#ffb070', 0.5), verts=16)
for i in range(4):
    a = i * math.pi / 4
    k.box(28.9 - 0.012, FRONT + 0.07, 2.2 - 0.24, 28.9 + 0.012, FRONT + 0.08, 2.2 + 0.24, '#3a3040', 'rose_bar') if i == 0 else \
        k.tube((28.9 - math.cos(a) * 0.24, FRONT + 0.075, 2.2 - math.sin(a) * 0.24), (28.9 + math.cos(a) * 0.24, FRONT + 0.075, 2.2 + math.sin(a) * 0.24),
               0.012, '#3a3040', 'rose_bar', verts=4)
V.board_sign(k, "ST ELM'S", 'IMFellEnglishSC', 28.9, FRONT + 0.03, 1.66, size=0.15, board='#e8e0cc', ink='#3a2a20', trim='#7a6a58', pad=0.1)
W.bell_tower(k, 32.0, FRONT, w=1.5, h=4.6)
# the landing green: a mown ring in the meadow, the skiff on it, a windsock, the village sign
PX, PR = 39.6, 6.2
k.cyl(PX, PR, -0.01, 0.014, 3.05, ('#b8ad94', 0.3), 'pad_gravel', verts=48)
k.cyl(PX, PR, 0.0, 0.02, 2.6, ('#ece6d4', 0.25), 'pad_ring', verts=48)
k.cyl(PX, PR, 0.0, 0.026, 2.42, ('#b0a58c', 0.3), 'pad_gravel', verts=48)
for i in range(28):
    a = i * math.tau / 28
    k.rock(PX + math.cos(a) * 3.2, PR + math.sin(a) * 3.2, 0.02, 0.1, 0.08, 0.06, ('#e8e4dc', 0.2), part='pad_stone', segs=6)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.1, PX + 2.0, PR + 0.9)
F.windsock(k, 44.4, 3.0)
for x in (35.1, 38.0):                                          # BRAMBLEFORD on a board between two posts
    k.box(x - 0.06, 9.55, 0, x + 0.06, 9.67, 1.25, (V.WOOD_D, 0.15), 'post')
V.board_sign(k, 'BRAMBLEFORD', 'IMFellEnglishSC', 36.55, 9.68, 0.8, size=0.22, board='#3a5a32', ink='#f0e8c8', trim='#d8c890')
k.solid(35, 9, 38, 10)
F.wildflowers(k, 34.0, 2.6, 45.0, 9.0, 60)

# ---- the square: the well, the flower stall, the notice board, the pub's tables -------------------------------
I.well(k, 18.0, 16.0)
for (x0, r0) in ((16.2, 14.2), (19.2, 14.2), (16.2, 17.3), (19.2, 17.3)):
    V.flower_bed(k, x0, r0, x0 + 0.6, r0 + 0.5)
W.market_stall(k, 21.4, 23.8, 17.2, 18.1, awning=('#d070a0', '#f4ece4'), goods=None)
for i in range(6):                                                # posies and pots of flowers on the counter
    x = 21.7 + i * 0.36
    k.cyl(x, 17.65, 0.86, 1.0, 0.1, ('#a85a30', 0.2), 'pot', verts=8)
    k.sphere(x, 17.65, 1.08, 0.12, 0.09, ('#f080b0', '#f0d040', '#a070e0', '#f0f0f0', '#e05050', '#f09030')[i], 'bloom', segs=8)
k.solid(21, 17, 24, 18)
W.bulletin_board(k, 15.2, 13.0)
k.solid(14, 12, 16, 13)
V.picnic_table(k, 10.8, 13.8)
V.picnic_table(k, 12.9, 13.8)
W.tree(k, 25.2, 14.6, h=3.6, tone='#3e6a34')                    # the old oak on the square, a bench round it
W.annulus(k, 25.2, 14.6, 0.55, 0.85, 0.0, 0.42, (V.WOOD, 0.15), 'oak_bench')
k.solid(24, 14, 26, 15)
for (x, r) in ((9.4, 12.7), (26.6, 12.7), (9.4, 19.3), (26.6, 19.3)):
    W.lantern_post(k, x, r, energy=0)
W.bunting(k, (9.6, 12.7, 2.0), (17.9, 12.7, 2.0), sag=0.35)
W.bunting(k, (17.9, 12.7, 2.0), (26.4, 12.7, 2.0), sag=0.35)
k.box(17.85, 12.65, 0, 17.95, 12.75, 2.05, (V.WOOD_D, 0.15), 'bunting_pole')
W.bench(k, 12.4, 13.9, 19.0)
V.flower_bed(k, 9.3, 17.6, 10.9, 18.6)
V.flower_bed(k, 24.9, 17.6, 26.5, 18.6)

# ---- east: the Anvil & Hoof and two cottages ---------------------------------------------------------------------
V.forge(k, 28.6, 33.8, 13.4, 18.6)
V.board_sign(k, 'ANVIL & HOOF', 'Rye', 31.2, 18.55, 1.82, size=0.18, board='#2a1a10', ink='#f0c860', trim='#8a6a3a', pad=0.1)
W.hanging_sign(k, 34.0, 18.2, 1.8, icon='anvil')
k.box(34.4, 19.05, 0.65, 36.2, 19.15, 0.72, (V.WOOD, 0.15), 'hitching_rail')
for x in (34.5, 36.1):
    k.box(x - 0.05, 19.05, 0, x + 0.05, 19.15, 0.75, (V.WOOD_D, 0.15), 'rail_post')
F.haybale(k, 35.3, 17.4)
rm, zr = W.house(k, 36.4, 40.2, 13.6, 17.8, wall_h=2.1, rise=1.3, roof='#3a6a8a', wall='#e8dcc8', door_x=38.3, windows=[(37.2, 0.9), (39.4, 0.9)],
                 chimney=37.0)
SMOKE.append([36.88, round(rm - 0.15 - (zr + 0.65) * C, 3)])
V.picket_fence(k, (36.2, 18.55), (38.0, 18.55))
V.picket_fence(k, (38.6, 18.55), (40.4, 18.55))
V.flower_bed(k, 36.5, 17.95, 37.8, 18.35, n=12)
W.house(k, 41.2, 45.2, 14.4, 18.4, wall_h=2.2, rise=1.4, roof='#7a3a3a', wall='#b8a890', door_x=43.2, windows=[(42.1, 0.9), (44.3, 0.9)],
        chimney=44.6, stone=True)
V.picket_fence(k, (41.0, 19.15), (42.9, 19.15))
V.picket_fence(k, (43.5, 19.15), (45.4, 19.15))

# ---- west: Ludd's mill on the stream -----------------------------------------------------------------------------
W.house(k, 1.0, 6.0, 18.8, 25.0, wall_h=3.0, rise=1.6, roof='#5a4636', wall='#a89a88', door_x=5.0, windows=[(1.9, 0.9)],
        windows_up=[(1.9, 2.2), (4.6, 2.2)], stone=True)
V.board_sign(k, "LUDD'S MILL", 'IMFellEnglishSC', 3.25, 25.03, 1.6, size=0.17, board='#e8dcc0', ink='#3a2414', trim='#6a4a2a', pad=0.1)
V.waterwheel(k, 2.5, 26.4, rad=1.1, width=0.5)
k.solid(1.0, 25.0, 4.0, 26.0)
V.sacks(k, 7.6, 22.4, n=4)
k.solid(7, 22, 8, 23)
k.cyl_y(7.2, 20.9, 21.1, 0.55, 0.55, 0.55, ('#a8a090', 0.25), 'millstone', verts=20)       # a spare millstone against the wall
k.cyl_y(7.2, 21.08, 21.12, 0.55, 0.1, 0.1, '#5a5048', 'millstone_eye', verts=10)
k.solid(6.6, 20.6, 7.8, 21.4)

# ---- the stream, its bridges, Meadow Lane ------------------------------------------------------------------------
V.stream(k, -1.0, COLS + 1.0, SR0, SR1)
V.footbridge(k, 10.0, 11.4, SR0 - 0.25, SR1 + 0.25)
V.stone_bridge(k, 30.0, 31.8, SR0 - 0.3, SR1 + 0.3)
V.signpost(k, 12.5, 24.8, [('MEADOW LANE', 'w', 1.55), ('THE MILL', 'w', 1.25), ('ALLOTMENTS', 'e', 1.4)])

# ---- over the stream: the allotments, Nan Ashby's cottage, apple trees ------------------------------------------
for i, x0 in enumerate((24.2, 27.4, 33.0)):
    F.earth(k, x0, 29.0, x0 + 2.6, 31.8)
    for xx in [x0 + 0.4 + j * 0.6 for j in range(4)]:
        for rr in (29.5, 30.4, 31.3):
            if i == 0:
                k.sphere(xx, rr, 0.1, 0.17, 0.12, ('#5a9a4a', 0.25), 'cabbage', segs=8)
            elif i == 1:
                k.cone(xx, rr, 0.0, 0.45, 0.08, 0.01, ('#4a8a3a', 0.25), 'bean_cane', verts=5)
            else:
                k.sphere(xx, rr, 0.12, 0.14, 0.12, ('#e08a30', 0.25), 'pumpkin', segs=8)
    F.fence(k, (x0 - 0.1, 28.8), (x0 + 2.7, 28.8))
    F.fence(k, (x0 - 0.1, 32.0), (x0 + 2.7, 32.0))
k.box(36.4, 28.8, 0, 38.0, 30.2, 1.5, ('#6a5a40', 0.2), 'allotment_shed')
k.poly([(36.2, 30.4, 1.4), (38.2, 30.4, 1.4), (38.2, 28.6, 1.8), (36.2, 28.6, 1.8)], ('#5a6a5a', 0.2), 'shed_roof')
k.solid(36, 28, 38, 30)
F.scarecrow(k, 31.0, 31.0)
k.solid(30.5, 30.5, 31.5, 31.5)
rm, zr = W.house(k, 14.4, 18.6, 28.6, 32.4, wall_h=2.0, rise=1.3, roof='#4a7a4a', wall='#f0e4d0', door_x=16.5, windows=[(15.3, 0.85), (17.7, 0.85)],
                 chimney=18.0)
SMOKE.append([17.88, round(rm - 0.15 - (zr + 0.65) * C, 3)])
V.flower_bed(k, 14.6, 32.6, 16.0, 33.2)
V.flower_bed(k, 17.0, 32.6, 18.4, 33.2)
for (x, r) in ((20.6, 29.6), (21.9, 32.2), (40.6, 30.4), (42.8, 32.0)):
    F.apple_tree(k, x, r, h=k.rng.uniform(2.2, 2.6))
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)

# ---- trees and hedges all round ----------------------------------------------------------------------------------
for x in [i * 2.3 + 0.8 for i in range(20)]:
    if x < 33.0:                                                 # behind the buildings: small ones
        W.bush(k, x, 1.6, s=0.45, tone='#3a6a30')
    elif k.rng.random() < 0.5:
        W.tree(k, x, 1.0, h=k.rng.uniform(2.4, 3.0), tone='#3a6a34')
    else:
        W.pine(k, x, 1.0, h=k.rng.uniform(2.2, 2.8), tone='#2e5a38')
for r in (3.0, 5.6, 8.2, 13.6, 16.0):
    W.tree(k, 0.5, r, h=k.rng.uniform(2.2, 2.8), tone='#3a6a34')
for r in (12.8, 21.0, 23.4):
    W.tree(k, 45.5, r, h=k.rng.uniform(2.2, 2.8), tone='#3a6a34')
for x in [i * 1.9 + 0.8 for i in range(25)]:
    if 9.4 < x < 12.0 or 13.8 < x < 19.0:                         # the lane's gap, the cottage garden
        continue
    W.bush(k, x, 33.6, s=0.5, tone=k.rng.choice(('#3a6a30', '#4a7a34')), berries=k.rng.choice((None, '#c03050', None)))
F.wildflowers(k, 1.0, 29.0, 9.0, 33.0, 40)
F.wildflowers(k, 12.6, 20.0, 27.0, 25.4, 50)
F.wildflowers(k, 34.0, 20.0, 45.0, 25.4, 40)
k.solid(0, 0, COLS, 2)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)

# the stream: no wading, except over the bridges
for c in range(COLS):
    if c in (10, 11, 30, 31):
        continue
    k.solid(c, 26, c + 1, 28)
for c in range(COLS):                                            # the hedge along the bottom, but for the lane
    if c not in (10, 11):
        k.solid(c, 33, c + 1, ROWS)

# ---- the light: the same low golden sun as the farm ------------------------------------------------------------------
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Brambleford', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [39, 10]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.5, COLS, ROWS], 'shuttle': {'spawn': [39, 10]}})


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 39, 'y': 7, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
    look('BRAMBLEFORD', 36, 9, 'BRAMBLEFORD.\n\nPOP. 61, AND THE GOAT. PLEASE MIND THE GEESE ON THE GREEN.', 'PRESS E TO READ'),
    {'x': 4, 'y': 10, 'type': 'vendor', 'label': 'THE CRUSTY LOAF', 'prompt': 'PRESS E TO SHOP',
     'items': [{'id': 'bread', 'price': 6}, {'id': 'sweet_roll', 'price': 8}, {'id': 'honey_cake', 'price': 16}, {'id': 'pumpkin_pie', 'price': 24}]},
    {'x': 13, 'y': 10, 'type': 'vendor', 'label': 'THE HAYLOFT', 'prompt': 'PRESS E TO GO IN',
     'items': [{'id': 'mug_of_ale', 'price': 6}, {'id': 'mulled_cider', 'price': 9}, {'id': 'bowl_of_stew', 'price': 14}, {'id': 'ploughmans', 'price': 18}]},
    {'x': 22, 'y': 10, 'type': 'vendor', 'label': "PENNYWORTH'S", 'prompt': 'PRESS E TO SHOP',
     'items': [{'id': 'seed_turnip', 'price': 5}, {'id': 'seed_carrot', 'price': 8}, {'id': 'seed_strawberry', 'price': 15},
               {'id': 'seed_sunflower', 'price': 12}, {'id': 'seed_pumpkin', 'price': 30}, {'id': 'seed_starfruit', 'price': 80},
               {'id': 'health_draught', 'price': 30}, {'id': 'lockpick', 'price': 10}]},
    look("ST ELM'S", 28, 10, "ST ELM'S, BUILT OF THE SAME GREY STONE AS THE WELL. THE DOOR IS NEVER LOCKED.\n\nINSIDE, A ROW OF JARS ON THE SILL: SEEDS FROM EVERY HARVEST SINCE THE VILLAGE BEGAN, EACH ONE LABELLED. THE OLDEST JUST SAYS \"FIRST\"."),
    look('BELL TOWER', 32, 9, 'THE BELL RINGS FOR WEDDINGS, FOR THE HARVEST, AND ONCE, THEY SAY, FOR A GOAT THAT CAME HOME.'),
    {'x': 18, 'y': 16, 'type': 'farm_well', 'label': 'WELL', 'prompt': 'PRESS E TO DRAW WATER'},
    look('NOTICE BOARD', 15, 12, 'NOTICES:\n\n"HARVEST SUPPER AT THE HAYLOFT, FIRST NIGHT OF AUTUMN. BRING A DISH."\n\n'
         '"THE OLD FARM DOWN MEADOW LANE HAS STOOD EMPTY SINCE EDDA WENT. SOMEBODY OUGHT TO TAKE IT ON. ASK HOLLIN, NEXT DOOR TO IT."\n\n'
         '"LOST: ONE GOAT. ANSWERS TO NOTHING. STILL."', 'PRESS E TO READ'),
    {'x': 22, 'y': 17, 'type': 'vendor', 'label': 'FLOWER STALL', 'prompt': 'PRESS E TO BROWSE',
     'items': [{'id': 'posy', 'price': 10}, {'id': 'seed_sunflower', 'price': 12}, {'id': 'seed_strawberry', 'price': 15}]},
    look('OLD OAK', 25, 15, 'THE OAK ON THE SQUARE. EVERY CHILD IN BRAMBLEFORD HAS CARVED SOMETHING ON THE BENCH ROUND IT. MOSTLY GOATS.'),
    {'x': 31, 'y': 17, 'type': 'vendor', 'label': 'ANVIL & HOOF', 'prompt': 'PRESS E TO BUY',
     'items': [{'id': 'lucky_horseshoe', 'price': 60}, {'id': 'hoe', 'price': 15}, {'id': 'watering_can', 'price': 20}, {'id': 'iron_dagger', 'price': 25}]},
    look('COTTAGE', 38, 17, 'A BLUE DOOR, A CAT ON THE STEP, WASHING ON A LINE ROUND THE BACK. THE CAT DOES NOT MOVE FOR YOU.'),
    look('STONE COTTAGE', 43, 18, 'THE SCHOOLMISTRESS LIVES HERE. THE WINDOW IS FULL OF CHILDREN\'S DRAWINGS OF YOUR SHUTTLE.'),
    look("LUDD'S MILL", 5, 24, "THE WHEEL TURNS, THE STONES GRIND, THE WHOLE MILL SHIVERS AND HUMS. FLOUR ON EVERYTHING.\n\nCHALKED BY THE DOOR: \"BRING ME GRAIN, I'LL BRING YOU BREAD. - L.\""),
    look('WATERWHEEL', 2, 26, 'THE WHEEL CLACKS ROUND, SLOW AND STEADY, WATER POURING OFF EVERY PADDLE.'),
    look('SIGNPOST', 12, 24, 'MEADOW LANE, THIS WAY. THE MILL, THAT WAY. THE ALLOTMENTS, OVER THE BRIDGE.\n\nSOMEBODY HAS SCRATCHED UNDER "MEADOW LANE": "THE OLD FARM".', 'PRESS E TO READ'),
    look('ALLOTMENTS', 27, 29, 'CABBAGES, BEANS UP THEIR CANES, PUMPKINS GETTING IDEAS. A HAND-PAINTED SIGN: "NO GOATS".'),
    look("NAN ASHBY'S", 16, 32, "NAN ASHBY'S COTTAGE. THE BEST APPLES IN THE VILLAGE, AND SHE KNOWS IT."),
    {'x': 6, 'y': 11, 'type': 'dialog', 'label': 'BRIDGET', 'prompt': 'PRESS E TO TALK', 'dialog': 'BRIDGET DUSTS THE FLOUR OFF HER HANDS.'},
    {'x': 24, 'y': 11, 'type': 'dialog', 'label': 'PERCY', 'prompt': 'PRESS E TO TALK', 'dialog': 'PERCY PENNYWORTH STRAIGHTENS HIS APRON.'},
    {'x': 33, 'y': 18, 'type': 'dialog', 'label': 'WAT', 'prompt': 'PRESS E TO TALK', 'dialog': 'WAT NODS, HAMMER IN HAND.'},
    {'x': 7, 'y': 24, 'type': 'dialog', 'label': 'OLD LUDD', 'prompt': 'PRESS E TO TALK', 'dialog': 'OLD LUDD TOUCHES HIS CAP.'},
    {'x': 23, 'y': 18, 'type': 'dialog', 'label': 'NELL', 'prompt': 'PRESS E TO TALK', 'dialog': 'NELL WAVES A SUNFLOWER AT YOU.'},
    {'x': 15, 'y': 11, 'type': 'dialog', 'label': 'MAGS', 'prompt': 'PRESS E TO TALK', 'dialog': 'MAGS LEANS IN THE DOORWAY OF THE HAYLOFT.'},
    {'x': 10, 'y': 33, 'type': 'enter_world', 'label': 'MEADOW LANE', 'prompt': 'PRESS E TO FOLLOW THE LANE', 'target': 'verdance', 'spawn': [42, 21]},
    {'x': 11, 'y': 33, 'type': 'enter_world', 'label': 'MEADOW LANE', 'prompt': 'PRESS E TO FOLLOW THE LANE', 'target': 'verdance', 'spawn': [42, 21]},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-vbaker', 'x': 6, 'y': 11, 'facing': 'down'}, {'sheet': 'npc-vshop', 'x': 24, 'y': 11, 'facing': 'down'},
                    {'sheet': 'npc-vsmith', 'x': 33, 'y': 18, 'facing': 'down'}, {'sheet': 'npc-vmiller', 'x': 7, 'y': 24, 'facing': 'down'},
                    {'sheet': 'npc-vfolk-a', 'x': 23, 'y': 18, 'facing': 'down'}, {'sheet': 'npc-vinn', 'x': 15, 'y': 11, 'facing': 'down'}],
            scene_extra={'layers': {'shuttle': 'parked'}, 'smoke': SMOKE})
print('village done')
