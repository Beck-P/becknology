"""The observatory aboard the Wayfarer — Blender scene (a module fitted in the passage's second bay:
scenes/ship_passage.py, js/wayfarer.js, js/observatory.js).

  BVENV/bin/python tools/bridge-art/scenes/ship_observatory.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/ship-observatory

The back wall all glass onto space under a dome's brass ribs (a hole: the engine draws the place below and the stars
through it), the great telescope on its round dais raised to the glass, a stool at its eyepiece. A star chart under a
red-shaded lamp so the eyes keep their dark, a celestial globe, the orrery and an armillary sphere on a side table,
shelves of almanacs and logbooks, a chaise to lie back on under the glass, a round rug of the twelve houses. Cool
starlight from the glass, warm only where a lamp is. The world JSON is written here, then apply_world fits its
collisions. SCENE_SAMPLES=12 previews.
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
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'ship-observatory.json')
COLS, ROWS = 18, 12
RF = 4.0
H = 3.2 / math.cos(THETA)
C = math.cos(THETA)
DOOR = (9.0, 11.0)                       # back to the passage: tiles 9, 10 of the front wall
GL = (3.2, 14.8, 0.85)                   # the glass: x0, x1, its sill

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=8080)

# ---- shell ----------------------------------------------------------------------------------------------------------
D.deck_floor(k, 1, RF, 17, 11)
F.back_wall(k, 0.5, GL[0], RF, H)
F.glazed_wall(k, GL[0], GL[1], RF, H, z0=GL[2], bars=0.97)
F.back_wall(k, GL[1], 17.5, RF, H)
D.side_wall(k, 0.4, 1.0, 3.5, 11.0, H)
D.side_wall(k, 17.0, 17.6, 3.5, 11.0, H, face=-1)
F.front_wall(k, 0.4, 17.6, 11.0, doors=[DOOR])
k.area_light(9.0, RF + 0.6, 3.2, '#7a90e0', 60, 10.0, rot=(math.radians(-55), 0, 0))     # starlight through the glass
k.area_light(9.0, 9.0, 3.6, '#4a5aa0', 14, 8.0)

# ---- the telescope and its dais -------------------------------------------------------------------------------------
F.zodiac_rug(k, 9.0, 7.6, 2.2)
F.great_telescope(k, 9.0, 6.4)

# ---- round the walls ------------------------------------------------------------------------------------------------
A.bookshelf(k, 1.05, 3.0, RF, top=2.6, levels=(0.15, 0.62, 1.09, 1.56, 2.03))
D.globe(k, 1.6, RF + 0.2, 2.67)
D.wall_clock(k, 2.4, RF + 0.06, 2.95, rad=0.2)
A.bookshelf(k, 15.0, 16.95, RF, top=2.6, levels=(0.15, 0.62, 1.09, 1.56, 2.03))
F.armillary(k, 15.5, RF + 0.2, 2.67, R=0.18)
F.star_chart(k, 1.4, 6.6, 3.6, 8.2)
A.stool(k, 2.5, 8.7)
F.celestial_globe(k, 15.7, 6.9)
A.side_table(k, 15.6, 9.0)
D.orrery(k, 15.6, 9.0, 0.62)
F.chaise(k, 12.2, 14.0, 9.7)
F.chaise(k, 4.0, 5.8, 9.7)
A.book_stack(k, 1.6, 10.2, n=5)
A.trunk(k, 1.2, 9.4, w=0.8, d=0.5, tone='#3a2a4a')
A.map_desk(k, 12.4, 14.6, RF)                                            # the observer's desk under the glass's edge
F.red_lamp(k, 12.55, RF + 0.62, 0.78)
D.tripod_telescope(k, 4.6, 5.4)
z = D.planter(k, 16.4, 10.3)
D.spore_fern(k, 16.4, 10.3, z)

# ---- light: cool from the glass, warm and red only at the lamps ----------------------------------------------------
k.point_light(2.5, 8.0, 2.4, '#ffb090', 34, radius=0.5)
k.point_light(15.5, 8.6, 2.4, '#ffc890', 36, radius=0.5)
k.point_light(9.0, 9.8, 2.8, '#9ab0ff', 34, radius=0.6)
k.point_light(9.0, 5.6, 2.9, '#c8d0ff', 30, radius=0.6)                   # the glass's glow on the brass
for x in (5.6, 12.4):
    A.hanging_lamp(k, x, 7.0, z=2.3, energy=22, chain_top=3.6)

SAMPLES = int(os.environ.get('SCENE_SAMPLES', '96'))
k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}},
         light_samples=SAMPLES, world_light=('#222a48', 0.6))

# ---- the world -------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Observatory', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'wayfarer', 'fixedCamera': True,
          'spawns': {'player': [9, 10]}, 'leaveLabel': '&#8592; PASSAGE', 'leaveTo': 'ship-passage'})


def it(x, y, typ, label, prompt, **kw):
    d = {'x': x, 'y': y, 'type': typ, 'label': label, 'prompt': prompt}
    d.update(kw)
    return d


def obs(xs, y, part, label, prompt):                   # js/observatory.js
    return [it(x, y, 'observatory', label, prompt, part=part) for x in xs]


def say(xs, y, label, text, prompt='LOOK'):
    return [it(x, y, 'dialog', label, prompt, dialog=text) for x in xs]


w['interactions'] = (
    [it(x, 11, 'enter_world', 'PASSAGE', 'TO THE PASSAGE', target='ship-passage', spawn=[12, 4], noBeacon=True) for x in (9, 10)] +
    obs((8,), 8, 'scope', 'GREAT TELESCOPE', 'PRESS E TO LOOK THROUGH') +
    obs((7,), 7, 'scope', 'GREAT TELESCOPE', 'PRESS E TO LOOK THROUGH') +
    obs((2, 3), 7, 'chart', 'STAR CHART', 'PRESS E TO READ THE SKY') +
    obs((15,), 9, 'orrery', 'ORRERY', 'PRESS E TO LOOK') +
    obs((15,), 7, 'log', 'CELESTIAL GLOBE', 'PRESS E FOR THE LOG') +
    say((1, 2), 4, 'ALMANACS', "STAR ALMANACS, TIDE TABLES FOR SEAS THAT AREN'T ON ANY PLANET YOU KNOW, LOGBOOKS IN A DOZEN HANDS. THE LAST ENTRY IS YOURS TO WRITE.") +
    say((15, 16), 4, 'BOOKSHELF', 'THE NIGHT SKY OF SIX WORLDS, BOUND IN BLUE. AN ARMILLARY SPHERE ON TOP, FOR NO REASON BUT THAT IT IS BEAUTIFUL.') +
    obs((13, 14), 4, 'log', 'OBSERVER\'S DESK', 'PRESS E FOR THE LOG') +
    obs((4,), 6, 'scope', 'SPOTTING SCOPE', 'PRESS E TO LOOK THROUGH') +
    say((6, 9, 10, 11), 4, 'THE GLASS', 'GLASS FROM THE DECK TO THE CROWN OF THE DOME, BRASS RIBS BETWEEN. THE STARS DON\'T TWINKLE OUT HERE; THEY JUST BURN.')
)
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 4, 16, 10), doors=[(9, 11), (10, 11)], scene_id='ship-observatory',
            scene_extra={'flicker': {'mode': 'pulse'}, 'stars': 1,
                         'sky': [GL[0], round(RF - H * C, 3), GL[1], round(RF - GL[2] * C, 3)]})
print('observatory done')
