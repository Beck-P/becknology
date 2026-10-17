"""The greenhouse deck aboard the Wayfarer — Blender scene (a module fitted in the passage's third bay:
scenes/ship_passage.py, js/wayfarer.js, js/greenhouse.js).

  BVENV/bin/python tools/bridge-art/scenes/ship_greenhouse.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/ship-greenhouse

A glasshouse let into the ship: the back wall glazed in green-painted iron onto space (a hole: the engine draws the place
below through it), a brick floor in basket weave, raised beds boxed in planks under long grow-lamps — herbs, salad,
tomatoes up their canes, strawberries — a lemon tree in a tub, ferns and ivy in hanging baskets, the potting bench
under the glass with its pots and seedlings and seed packets, a water butt and a watering can, a bench to sit on among
it all. Warm pinkish grow-light, cool space beyond the glass. The world JSON is written here (its beds are forage spots:
js/greenhouse.js), then apply_world fits its collisions. SCENE_SAMPLES=12 previews.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_deck as D                        # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_wayfarer as F                    # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'ship-greenhouse.json')
COLS, ROWS = 18, 12
RF = 4.0
H = 3.2 / math.cos(THETA)
C = math.cos(THETA)
DOOR = (9.0, 11.0)
GL = (1.2, 16.8, 0.75)

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=5151)

# ---- shell ----------------------------------------------------------------------------------------------------------
F.brick_floor(k, 1, RF, 17, 11)
F.back_wall(k, 0.5, GL[0], RF, H)
F.glazed_wall(k, GL[0], GL[1], RF, H, z0=GL[2], bars=0.65, arch=False, tone=F.IRON_G)
F.back_wall(k, GL[1], 17.5, RF, H)
D.side_wall(k, 0.4, 1.0, 3.5, 11.0, H)
D.side_wall(k, 17.0, 17.6, 3.5, 11.0, H, face=-1)
F.front_wall(k, 0.4, 17.6, 11.0, doors=[DOOR])
k.area_light(9.0, RF + 0.6, 3.2, '#8aa0e0', 36, 12.0, rot=(math.radians(-55), 0, 0))     # starlight through the glass

# ---- the beds -------------------------------------------------------------------------------------------------------
BEDS = [(2.1, 6.0, 5.9, 6.9, 'herbs'), (7.1, 6.0, 10.9, 6.9, 'salad'), (12.1, 6.0, 15.9, 6.9, 'tomatoes'),
        (2.1, 8.6, 5.9, 9.4, 'strawberries'), (12.1, 8.6, 15.9, 9.4, 'herbs')]
for (x0, r0, x1, r1, crop) in BEDS:
    F.raised_bed(k, x0, r0, x1, r1, crop)
    F.grow_lamp(k, x0 + 0.1, x1 - 0.1, (r0 + r1) / 2, z=2.35, energy=14)

# ---- along the glass and round the room ----------------------------------------------------------------------------
F.potting_bench(k, 6.6, 9.4, RF + 0.05)
F.water_butt(k, 10.3, RF + 0.45)
k.solid(9.9, RF, 10.8, RF + 0.75)
z = D.planter(k, 1.7, RF + 0.55)
D.lemon_tree(k, 1.7, RF + 0.55, z)
z = D.planter(k, 16.3, RF + 0.55)
D.lemon_tree(k, 16.3, RF + 0.55, z)
for x in (4.0, 13.5):
    F.hanging_basket_plants(k, x, RF + 0.5, z=2.2, chain_top=3.4)
F.hanging_basket_plants(k, 11.5, 8.2, z=2.3, chain_top=3.5)
A.bench(k, 7.4, 10.6, 9.6)
F.watering_can(k, 6.6, 9.6, 0.0)
A.bucket(k, 11.3, 9.9)
A.crate(k, 15.4, 10.1, s=0.5)
for i in range(3):
    k.cone(16.3 + (i % 2) * 0.25, 9.9 + i * 0.12, 0.0, 0.18, 0.09, 0.12, ('#b05a30', 0.1), 'pot', verts=10)

# ---- light ----------------------------------------------------------------------------------------------------------
k.point_light(4.0, 8.0, 2.6, '#ffe0c0', 22, radius=0.6)
k.point_light(14.0, 8.0, 2.6, '#ffe0c0', 22, radius=0.6)
k.point_light(9.0, 9.0, 2.6, '#ffe8d0', 22, radius=0.6)

SAMPLES = int(os.environ.get('SCENE_SAMPLES', '96'))
k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}},
         light_samples=SAMPLES, world_light=('#202838', 0.45))

# ---- the world -------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Greenhouse Deck', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'wayfarer', 'fixedCamera': True,
          'spawns': {'player': [9, 10]}, 'leaveLabel': '&#8592; PASSAGE', 'leaveTo': 'ship-passage'})


def it(x, y, typ, label, prompt, **kw):
    d = {'x': x, 'y': y, 'type': typ, 'label': label, 'prompt': prompt}
    d.update(kw)
    return d


def say(xs, y, label, text, prompt='LOOK'):
    return [it(x, y, 'dialog', label, prompt, dialog=text) for x in xs]


w['interactions'] = (
    [it(x, 11, 'enter_world', 'PASSAGE', 'TO THE PASSAGE', target='ship-passage', spawn=[19, 4], noBeacon=True) for x in (9, 10)] +
    [it(x, 4, 'greenhouse', 'POTTING BENCH', 'PRESS E TO LOOK', part='bench') for x in (7, 8)] +
    [it(10, 4, 'greenhouse', 'WATER BUTT', 'PRESS E TO WATER THE BEDS', part='water')] +
    say((1, 16), 4, 'LEMON TREE', 'A LEMON TREE IN A TUB, GROWN FROM A CUTTING OF THE ONE IN THE OFFICE. IT FRUITS WHEN IT LIKES.') +
    say((4, 13), 4, 'THE GLASS', 'GLASS IN GREEN IRON, FLOOR TO DECKHEAD. THE PLANTS LEAN TOWARD WHATEVER PLANET\'S BELOW, AS IF IT WERE THE SUN.')
)
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 4, 16, 10), doors=[(9, 11), (10, 11)], scene_id='ship-greenhouse',
            scene_extra={'flicker': {'mode': 'pulse'}, 'sky': [GL[0], round(RF - H * C, 3), GL[1], round(RF - GL[2] * C, 3)],
                         'beds': [[int(x0), int(r0), int(math.ceil(x1)) - 1, int(math.ceil(r1)) - 1, crop] for (x0, r0, x1, r1, crop) in BEDS]})
print('greenhouse done')
