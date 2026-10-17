"""The galley and mess aboard the Wayfarer — Blender scene (a module fitted in the passage's first bay:
scenes/ship_passage.py, js/wayfarer.js).

  BVENV/bin/python tools/bridge-art/scenes/ship_galley.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/ship-galley

Wood and brass like the bridge. West, the galley: the cook's black range in a brick alcove with its copper hood, the
fire glowing through its bars and a stockpot on the hob; copper pans on a rack over the butcher's block, shelves of
jars and bowls, the copper sink under the fresh-water tank, sacks and an apple crate in the corner. The pass runs down
the room between the galley and the mess, plates waiting on it under a cloche. East, the mess: two long tables laid
with blue-and-white plates under hanging lamps, benches either side, two arched windows onto space (holes: the engine
draws the place below through them), the menu on a blackboard between them, a dresser of plates, and in the corner the
card table under its own low lamp (its cards are the `cards` variant, out after supper: js/galley.js). Dorrie and the
crew aren't stood here: they keep their day (js/aboard.js). The world JSON
is written here (interactions), then apply_world fits its collisions to what was built. SCENE_SAMPLES=12 previews.
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
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'ship-galley.json')
COLS, ROWS = 20, 12
RF = 4.0
H = 3.2 / math.cos(THETA)
C = math.cos(THETA)
DOOR = (8.0, 10.0)                       # back to the passage: tiles 8, 9 of the front wall

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=4242)

# ---- shell ----------------------------------------------------------------------------------------------------------
WINS = [(10.1, 11.7, 1.1, 2.75), (14.1, 15.7, 1.1, 2.75)]
D.deck_floor(k, 1, RF, 19, 11)
F.back_wall(k, 0.5, 19.5, RF, H, windows=WINS)
D.side_wall(k, 0.4, 1.0, 3.5, 11.0, H)
D.side_wall(k, 19.0, 19.6, 3.5, 11.0, H, face=-1)
D.front_wall(k, 0.4, 19.6, 11.0, door=DOOR)
k.area_light(12.9, RF + 0.6, 3.0, '#6a80d0', 26, 6.5, rot=(math.radians(-55), 0, 0))     # starlight through the windows

# ---- the galley -----------------------------------------------------------------------------------------------------
F.galley_range(k, 1.1, 4.3, RF, H, energy=55)
F.crockery_shelves(k, 4.5, 6.1, RF)
A.barrel(k, 5.0, RF + 0.45, h=0.85, tone=A.WOOD_D)                       # flour, under the shelves
A.crate(k, 5.45, RF + 0.1, s=0.55, tone=A.WOOD_L)
F.galley_sink(k, 6.25, 7.75, RF)
F.butcher_block(k, 1.9, 4.1, 6.45, 7.35)
F.pan_rack(k, 2.0, 4.0, 6.9, z=2.3)
F.pass_counter(k, 7.75, 8.6, RF + 0.05, 8.35)
F.sacks_and_casks(k, 1.1, 8.85)
A.stool(k, 4.6, 9.4)
A.bucket(k, 6.9, 10.3)
A.barrel(k, 6.0, 10.0, h=0.8)
F.rag_rug(k, 4.4, 9.0, 1.35, 0.75)
A.cat(k, 4.55, RF + 1.15, col='#c8783a')                                   # on the warm hearth
F.onion_string(k, 7.95, RF, z_top=2.35)
A.herb_beam(k, 4.5, 6.1, RF, z=2.3)

# ---- the mess -------------------------------------------------------------------------------------------------------
F.menu_board(k, 12.9, RF, z0=1.25, w=1.15, h=0.85)
F.plate_dresser(k, 16.6, 19.3, RF)
F.long_table(k, 10.15, 13.85, 6.5)                                      # columns 14-15 left clear: the way to the cards
F.bench_seat(k, 10.3, 13.7, 5.48)
F.bench_seat(k, 10.3, 13.7, 7.52)
F.long_table(k, 10.15, 13.85, 9.5)
F.bench_seat(k, 10.3, 13.7, 8.48)
F.bench_seat(k, 10.3, 13.7, 10.52)
F.card_table(k, 17.5, 8.5, rad=0.55)
F.chair(k, 16.5, 8.5, 'right')
F.chair(k, 18.5, 8.5, 'left')
F.chair(k, 17.5, 7.5, 'down')
F.chair(k, 17.5, 9.62, 'up', solid=False)                                  # pushed back for whoever sits in
with k.variant('cards', 'on'):
    F.card_spread(k, 17.5, 8.5, h=0.77)
A.barrel(k, 18.5, 10.35, h=0.8, tone=A.WOOD_D)
A.painting(k, 9.05, RF, 1.55, w=0.8, h=0.55)
z = D.planter(k, 15.95, RF + 0.4)
D.spore_fern(k, 15.95, RF + 0.4, z)

# ---- light ----------------------------------------------------------------------------------------------------------
for x in (11.0, 13.0):
    A.hanging_lamp(k, x, 6.5, z=2.3, energy=40, chain_top=3.5)
A.hanging_lamp(k, 12.0, 9.5, z=2.3, energy=36, chain_top=3.5)
A.hanging_lamp(k, 17.5, 8.5, z=1.85, energy=26, chain_top=3.5)            # low over the cards
A.hanging_lamp(k, 3.0, 8.6, z=2.35, energy=30, chain_top=3.5)
for x in (9.75, 16.3):
    A.wall_sconce(k, x, RF + 0.06, z=2.3, energy=4.0)
k.point_light(4.5, 8.0, 2.6, '#ffc890', 55, radius=0.6)
k.point_light(12.5, 7.8, 2.6, '#ffc890', 60, radius=0.6)
k.point_light(17.0, 8.0, 2.6, '#ffc890', 40, radius=0.6)

SAMPLES = int(os.environ.get('SCENE_SAMPLES', '96'))
k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}},
         light_samples=SAMPLES, world_light=('#2a2438', 0.4))

# ---- the world -------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Galley', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'wayfarer', 'fixedCamera': True,
          'spawns': {'player': [8, 10]}, 'leaveLabel': '&#8592; PASSAGE', 'leaveTo': 'ship-passage'})


def it(x, y, typ, label, prompt, **kw):
    d = {'x': x, 'y': y, 'type': typ, 'label': label, 'prompt': prompt}
    d.update(kw)
    return d


def galley(xs, y, part, label, prompt):                   # js/galley.js
    return [it(x, y, 'galley', label, prompt, part=part) for x in xs]


def say(xs, y, label, text, prompt='LOOK'):
    return [it(x, y, 'dialog', label, prompt, dialog=text) for x in xs]


w['interactions'] = (
    [it(x, 11, 'enter_world', 'PASSAGE', 'TO THE PASSAGE', target='ship-passage', spawn=[6, 4], noBeacon=True) for x in (8, 9)] +
    galley((8,), 6, 'cook', 'THE PASS', 'PRESS E FOR A MEAL') +
    galley((8,), 5, 'cook', 'THE PASS', 'PRESS E FOR A MEAL') +
    galley((12, 13), 4, 'menu', 'MENU', 'PRESS E TO READ') +
    galley((17,), 9, 'cards', 'CARD TABLE', 'PRESS E TO SIT IN') +
    galley((17,), 8, 'cards', 'CARD TABLE', 'PRESS E TO SIT IN') +
    say((2, 3), 4, 'RANGE', 'THE RANGE NEVER QUITE GOES OUT. THERE IS ALWAYS SOMETHING IN THE STOCKPOT, AND ALWAYS A KETTLE NEARLY ON THE BOIL.') +
    say((5,), 4, 'SHELVES', 'OATS, FLOUR, DRIED BEANS, A JAR OF SOMETHING LABELLED ONLY "DO NOT".\n\nEVERY SHELF HAS A RAIL: IN A JUMP, THINGS SLIDE.') +
    say((6, 7), 4, 'SINK', 'A COPPER SINK UNDER THE FRESH-WATER TANK. THE TAP IS STIFF; THE COOK SAYS IT KEEPS THE CREW HONEST.') +
    say((2, 3), 7, "BUTCHER'S BLOCK", 'A LOAF HALF SLICED, ONIONS, A CLEAVER LEFT WHERE THE COOK CAN FIND IT AND NOBODY ELSE CAN.') +
    say((17, 18), 4, 'DRESSER', 'BLUE-AND-WHITE PLATES, NONE OF THEM MATCHING QUITE, STOOD UP BEHIND THEIR RAIL. A TUREEN, A JUG, THE BREAD CROCK.') +
    say((1,), 9, 'STORES', 'SACKS OF FLOUR AND OATS AND A CRATE OF APPLES FROM WHEREVER THE SHIP LAST TOUCHED.')
)
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
sx0, sz0, sx1, sz1 = WINS[0][0], WINS[0][2], WINS[1][1], WINS[1][3]
apply_world(WORLD, k, (1, 4, 18, 10), doors=[(8, 11), (9, 11)], scene_id='ship-galley',
            scene_extra={'flicker': {'mode': 'pulse'}, 'steam': [[1.85, round(RF + 0.38 - 1.3 * C, 3)], [3.65, round(RF + 0.38 - 1.2 * C, 3)]],
                         'sky': [sx0, round(RF - sz1 * C, 3), sx1, round(RF - sz0 * C, 3)]})
print('galley done')
