"""Verdance — the farm. Blender scene, the Bridge's one daylight world.

  BVENV/bin/python tools/bridge-art/scenes/verdance.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance

A garden world in a long golden afternoon: the farmhouse and its porch, the red
barn and the tool shed, the windmill, hay stacked in the top meadow, the field — bare earth inside a split-rail fence, yours to till
and plant (js/farm.js draws what you grow) — the well, the pond with its jetty,
the orchard and the beehives, and down the lane the corner by Hollin's: his seed
stall, Marlo's produce cart, the notice board, Hollin's cottage; Meadow Lane leaves east
for Brambleford, the village where the shuttle lands (scenes/verdance_village.py). Hedgerow and
trees all round. One sun, no flicker.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_farm as F                # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_ship as P                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'verdance'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 30
PLOT = (3, 12, 18, 21)                               # the field's tiles, inclusive
FARM = (3, 12, 18, 20)                               # the ones you can work (the last row is a headland, under the fence)

k = Kit(COLS, ROWS, margin_top=2.4, margin_bottom=0.6, seed=731)

# ---- the ground: meadow, the lane, the field, the yards ----------------------------------------------------
W.grass(k, 0, -2.4, COLS, ROWS + 0.6, tone=F.GRASS, tufts=0.45)   # past the edges: the camera sees a little beyond
F.dirt_path(k, 5.2, 9.2, 34.6, 10.6)                 # the lane from the pad to the farmhouse
F.dirt_path(k, 5.4, 7.7, 6.6, 9.2)                   # up to the farmhouse door
F.dirt_path(k, 9.9, 10.6, 12.1, 11.9)                # down to the field gate
F.dirt_path(k, 33.4, 10.6, 34.6, 19.4)               # south to the village (paths only touch: overlaps z-fight)
F.dirt_path(k, 19.9, 10.6, 21.1, 16.4)               # past the scarecrow to the well
F.dirt_path(k, 21.1, 15.2, 25.0, 16.4)
F.dirt_path(k, 32.6, 19.4, 43.2, 27.6)               # the yard by Hollin's
F.dirt_path(k, 43.2, 20.0, 44.6, 23.0)               # Meadow Lane, off east to Brambleford
F.dirt_path(k, 27.4, 22.8, 32.6, 23.8)               # from the yard to the jetty
F.earth(k, PLOT[0], PLOT[1], PLOT[2] + 1, PLOT[3] + 1)

# ---- the farmhouse, its porch and mailbox -------------------------------------------------------------------
SMOKE = []
C = math.cos(math.radians(45))
rm, zr = W.house(k, 2.6, 9.4, 2.6, 7.6, wall_h=2.3, rise=1.6, roof='#a04a30', wall='#efe2c6', door_x=6.0,
                 windows=[(3.8, 0.9), (8.2, 0.9)], windows_up=[(3.8, 1.75), (6.0, 1.8), (8.2, 1.75)], chimney=8.4)
SMOKE.append([8.28, round(rm - 0.15 - (zr + 0.65) * C, 3)])
W.bench(k, 7.0, 8.7, 8.3)
W.planter(k, 3.0, 4.8, 8.2, flowers=('#e05070', '#f0d040', '#f0f0f0'))
F.mailbox(k, 10.5, 8.4)
k.solid(10, 8, 11, 9)
F.log_pile(k, 1.5, 6.4)

# ---- the barn, the hay, the tool shed -----------------------------------------------------------------------
F.barn(k, 12.2, 19.6, 2.4, 7.8)
F.haybale(k, 12.8, 8.6)
F.haybale(k, 18.9, 8.6, rolled=False)
k.box(20.2, 5.2, 0.0, 22.0, 7.6, 1.7, ('#7a5a38', 0.2), 'shed')                 # the tool shed, lean-to roof
k.poly([(20.0, 7.9, 1.55), (22.2, 7.9, 1.55), (22.2, 5.0, 2.1), (20.0, 5.0, 2.1)], ('#5a5a5a', 0.2), 'shed_roof')
k.box(20.7, 7.6, 0.0, 21.5, 7.64, 1.4, ('#5a3e22', 0.2), 'shed_door')
for (x, h) in ((20.35, 1.2), (21.75, 1.25)):                                        # a hoe and a rake against the wall
    k.box(x - 0.02, 7.64, 0.0, x + 0.02, 7.7, h, F.WOOD_D, 'tool_handle')
k.solid(20, 5, 22, 8)

# ---- the windmill ---------------------------------------------------------------------------------------------
I.windmill(k, 25.2, 5.4, h=3.6, rad=0.9, tone='#e8e0d0', roof='#a04a30', chimes=False)
k.solid(24, 4, 27, 7)

# ---- the top meadow, where the hay's stacked (the shuttle sets down in Brambleford now, up the lane) ---------------------
F.haybale(k, 32.4, 5.4)
F.haybale(k, 33.6, 5.9)
F.haybale(k, 35.6, 5.2, rolled=False)
k.solid(31, 4, 37, 7)
F.wildflowers(k, 29.0, 3.0, 42.0, 8.4, 70)

# ---- the field: bare earth inside a split-rail fence, gates north and east ---------------------------------------
F.fence(k, (2.5, 11.5), (9.6, 11.5))
F.fence(k, (12.4, 11.5), (19.5, 11.5))
F.fence(k, (2.5, 22.5), (19.5, 22.5))
F.fence(k, (2.5, 11.5), (2.5, 22.5))
F.fence(k, (19.5, 11.5), (19.5, 15.6))
F.fence(k, (19.5, 17.4), (19.5, 22.5))
F.scarecrow(k, 21.3, 13.0)
I.well(k, 21.5, 17.6)
k.solid(21, 17, 22, 18)

# ---- the pond and its jetty ----------------------------------------------------------------------------------------
PCX, PCR, PRX, PRY = 28.0, 19.4, 3.4, 2.2
F.pond(k, PCX, PCR, PRX, PRY)
for r in range(ROWS):
    for x in range(COLS):
        cx, cr = x + 0.5, r + 0.5
        if ((cx - PCX) / (PRX + 0.15)) ** 2 + ((cr - PCR) / (PRY + 0.15)) ** 2 <= 1.0 and not (x == 28 and r >= 20):
            k.solid(x, r, x + 1, r + 1)
W.dock(k, 27.6, 28.4, 19.6, 23.0, z=0.08)

# ---- the orchard and the hives -------------------------------------------------------------------------------------
for x in (36.5, 39.5, 42.2):
    for r in (12.5, 15.5):
        F.apple_tree(k, x, r, h=k.rng.uniform(2.2, 2.6))
F.beehive(k, 41.4, 18.3)
F.beehive(k, 42.4, 18.4)
F.wildflowers(k, 35.0, 17.0, 43.0, 19.0, 60)

# ---- the village corner: Hollin's stall, Marlo's cart, the notice board, Hollin's cottage ---------------------------
F.seed_stall(k, 35.0, 38.0, 20.3, 21.0)
k.solid(36, 19, 37, 20)
k.solid(38, 20, 39, 21)                                                             # Hollin, beside his stall (under the awning he'd vanish)
W.cart(k, 36.4, 22.5)                                                               # clear of the cottage roof, which hides rows 22-23 east of 39.6
k.solid(37, 22, 38, 23)                                                             # Marlo, at the back of his cart
W.bulletin_board(k, 35.6, 25.4)
k.solid(35, 25, 37, 26)
W.bench(k, 37.8, 39.4, 26.6)
W.lantern_post(k, 33.4, 22.6, energy=0)
k.solid(33, 22, 34, 23)
rm2, zr2 = W.house(k, 39.6, 43.8, 23.8, 27.2, wall_h=2.0, rise=1.3, roof='#3a6a3a', wall='#e8dcc0', door_x=41.4,
                   windows=[(40.4, 0.9), (42.8, 0.9)], windows_up=[(41.4, 1.5)], chimney=40.2)
SMOKE.append([40.08, round((23.8 + 27.2) / 2 - 0.15 - (zr2 + 0.65) * C, 3)])
W.planter(k, 34.0, 35.6, 27.2, flowers=('#a070e0', '#f0d040', '#e05070'))

# ---- hedgerow and trees all round ------------------------------------------------------------------------------------
for x in [i * 2.3 + 0.8 for i in range(19)]:
    if 2.0 < x < 9.6 or 12.0 < x < 20.0:                                            # behind the buildings, small ones
        W.bush(k, x, 1.4, s=0.45, tone="#3a6a30")
    elif k.rng.random() < 0.5:
        W.tree(k, x, 1.0, h=k.rng.uniform(2.4, 3.0), tone='#3a6a34')
    else:
        W.pine(k, x, 1.0, h=k.rng.uniform(2.2, 2.8), tone='#2e5a38')
for r in [i * 2.2 + 3.0 for i in range(12)]:
    W.tree(k, 0.5, r, h=k.rng.uniform(2.2, 2.8), tone='#3a6a34') if r < 26 else W.bush(k, 0.6, r, s=0.45, tone='#3a6a30')
    if r < 19 or r > 27.5:
        W.tree(k, 43.5, r, h=k.rng.uniform(2.2, 2.8), tone='#3a6a34')
for x in [i * 2.0 + 1.0 for i in range(22)]:
    if 32.5 < x < 44:
        continue
    W.bush(k, x, 28.8, s=0.5, tone=k.rng.choice(('#3a6a30', '#4a7a34')), berries=k.rng.choice((None, '#c03050', None)))
F.wildflowers(k, 1.0, 23.5, 32.0, 28.0, 140)
F.wildflowers(k, 22.0, 11.0, 32.0, 14.0, 50)
k.solid(0, 0, COLS, 2)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(0, ROWS - 2, 32, ROWS)

# ---- the light: a low golden sun from the west, the sky's blue in the shadows ------------------------------------------
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.pop('shuttle', None)                                # no pad here: the shuttle lands in Brambleford, up Meadow Lane
w.update({'name': 'Verdance', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [42, 21]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.5, COLS, ROWS],
          'farm': {'plot': list(FARM)}})
MAIL = ["A SEED CATALOGUE, DOG-EARED AT THE PUMPKINS.", "A POSTCARD FROM LUMAR: \"THE SEA GLOWS. WISH YOU WERE HERE.\" NO NAME.",
        "A BILL FOR ONE (1) SCARECROW HAT. PAID.", "NOTHING TODAY. A SNAIL HAS MOVED IN."]
w['interactions'] = [
    {'x': 43, 'y': 21, 'type': 'enter_world', 'label': 'MEADOW LANE', 'prompt': 'PRESS E TO WALK TO BRAMBLEFORD', 'target': 'verdance-village', 'spawn': [10, 32]},
    {'x': 43, 'y': 22, 'type': 'enter_world', 'label': 'MEADOW LANE', 'prompt': 'PRESS E TO WALK TO BRAMBLEFORD', 'target': 'verdance-village', 'spawn': [11, 32]},
    {'x': 6, 'y': 7, 'type': 'dialog', 'label': 'FARMHOUSE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'YOUR FARMHOUSE. WHITEWASHED, A RED ROOF, SMOKE FROM THE CHIMNEY. THE DOOR STICKS IN SUMMER - HOLLIN SAYS IT ALWAYS HAS.'},
    {'x': 16, 'y': 7, 'type': 'dialog', 'label': 'BARN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'EMPTY STALLS, A HAYLOFT, SWALLOWS IN THE RAFTERS. ROOM FOR ANIMALS, ONE DAY.'},
    {'x': 20, 'y': 7, 'type': 'farm_tools', 'label': 'TOOL SHED', 'prompt': 'PRESS E TO OPEN'},
    {'x': 25, 'y': 6, 'type': 'dialog', 'label': 'WINDMILL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE MILL TURNS SLOW IN THE WARM WIND. SOMEONE HAS CHALKED A HEART ON THE DOOR, AND THE YEAR.'},
    {'x': 10, 'y': 8, 'type': 'random_dialog', 'label': 'MAILBOX', 'prompt': 'PRESS E TO LOOK', 'messages': MAIL},
    {'x': 21, 'y': 17, 'type': 'farm_well', 'label': 'WELL', 'prompt': 'PRESS E TO FILL'},
    {'x': 21, 'y': 13, 'type': 'dialog', 'label': 'SCARECROW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SCARECROW IN A BLUE SHIRT. THE CROWS SIT ON ITS ARMS AND DISCUSS IT.'},
    {'x': 36, 'y': 20, 'type': 'vendor', 'label': 'SEED STALL', 'prompt': 'PRESS E TO BUY SEEDS',
     'items': [{'id': 'seed_turnip', 'price': 5}, {'id': 'seed_carrot', 'price': 8}, {'id': 'seed_strawberry', 'price': 15},
               {'id': 'seed_sunflower', 'price': 12}, {'id': 'seed_pumpkin', 'price': 30}, {'id': 'seed_starfruit', 'price': 80}]},
    {'x': 38, 'y': 20, 'type': 'dialog', 'label': 'HOLLIN', 'prompt': 'PRESS E TO TALK', 'dialog': 'HOLLIN TIPS HIS HAT.'},
    {'x': 37, 'y': 22, 'type': 'dialog', 'label': 'MARLO', 'prompt': 'PRESS E TO TALK', 'dialog': 'MARLO WAVES A MELON AT YOU.'},
    {'x': 35, 'y': 25, 'type': 'dialog', 'label': 'NOTICE BOARD', 'prompt': 'PRESS E TO READ',
     'dialog': 'NOTICES:\n\n"TILL WITH THE HOE, PLANT, THEN WATER - WATERED GROUND GROWS FOR TWENTY MINUTES, THEN DRIES OUT."\n\n'
               '"MARLO BUYS EVERYTHING. EVERYTHING."\n\n"LOST: ONE GOAT. ANSWERS TO NOTHING."'},
    {'x': 41, 'y': 24, 'type': 'dialog', 'label': "HOLLIN'S COTTAGE", 'prompt': 'PRESS E TO LOOK',
     'dialog': "HOLLIN'S COTTAGE. A PIE COOLS ON THE SILL. YOU ARE NOT GOING TO TOUCH IT."},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-hollin', 'x': 38, 'y': 20, 'facing': 'down'}, {'sheet': 'npc-marlo', 'x': 37, 'y': 22, 'facing': 'down'}],
            scene_extra={'smoke': SMOKE})
print('verdance done')
