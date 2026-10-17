"""The captain's office aboard the Wayfarer — Blender scene (off the bridge,
through the door in its south wall, west of the quarters').

  BVENV/bin/python tools/bridge-art/scenes/office.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/office

Where you run everything you own. Wood and brass like the bridge: the
captain's desk under three arched windows onto space (a hole: the engine
draws the place the ship is over through it), the staff board on the wall
and the chart table (holes too: js/worlds/office.js pins the faces of
everyone working for you to the one and your ships to the other, live), the
strongbox and its counting table, shelves of books and ledgers, the
Wayfarer in miniature in a glass case, lanterns and lamps. The world JSON
is written here (interactions, the board's and the chart's screen rects in
`office`), then apply_world fits its collisions to what was built.
SCENE_SAMPLES=12 makes a quick preview (the light passes default to 96).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_deck as D                        # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_ship as P                        # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'office.json')
COLS, ROWS = 17, 12
RF = 4.0                                   # the back wall's face
H = 3.2 / math.cos(THETA)
C = math.cos(THETA)

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=313)

# ---- shell ----------------------------------------------------------------------------------------
WIN = (5.6, 11.4, 1.05, 3.8)
D.deck_floor(k, 1, RF, 16, 11)
MULL = D.gallery_wall(k, 0.5, 16.5, RF, H, WIN, lights=3)
D.side_wall(k, 0.4, 1.0, 3.5, 11.0, H)
D.side_wall(k, 16.0, 16.6, 3.5, 11.0, H, face=-1)
D.front_wall(k, 0.4, 16.6, 11.0, door=(7.0, 10.0))               # back to the bridge
for mx in MULL:
    D.hanging_lantern(k, mx, RF + 0.25, WIN[3], drop=1.25, energy=20)
k.area_light(8.5, RF + 0.6, 3.0, '#6a80d0', 30, 5.5, rot=(math.radians(-55), 0, 0))     # starlight
D.compass_rug(k, 6.0, 6.55, 11.0, 9.45)

# ---- along the back wall: shelves, the model ship, the window and the desk, the staff board -------------
A.bookshelf(k, 1.05, 3.05, RF, top=2.6, levels=(0.15, 0.62, 1.09, 1.56, 2.03))
D.globe(k, 1.6, RF + 0.2, 2.67)
D.ship_bottle(k, 2.5, RF + 0.2, 2.67)
SB = P.sideboard(k, 3.2, 4.95, RF)
P.model_ship(k, 3.45, RF + 0.25, SB, L=1.15)
D.wall_clock(k, 4.1, RF + 0.06, 2.75)
for x in (3.35, 4.85):
    A.wall_sconce(k, x, RF + 0.06, z=2.25, energy=2.5)
P.partners_desk(k, 6.4, 10.6, 5.3, 6.2)
P.captains_chair(k, 8.5, 4.72)
P.club_chair(k, 6.85, 7.1)
P.club_chair(k, 10.15, 7.1)
P.card_cabinet(k, 12.0, 15.9, RF)
BOARD = P.staff_board(k, 11.95, 15.75, RF + 0.06, 1.05, 3.75)     # hung on the pier's panelling

# ---- the room: the chart table, the strongbox corner ---------------------------------------------------
CHART = P.map_table(k, 2.0, 7.3, 5.0, 9.0)
D.ship_lantern(k, 1.4, 7.0)
k.solid_post(1.4, 7.0)
P.counting_table(k, 12.05, 13.95, 7.4, 8.2)
A.stool(k, 13.0, 6.95)
P.strongbox(k, 15.0, 7.45)
z = D.planter(k, 1.55, 10.2)
D.lemon_tree(k, 1.55, 10.2, z)
A.coat_rack(k, 15.4, 10.2)

# ---- light -------------------------------------------------------------------------------------
k.point_light(3.5, 8.0, 2.6, '#ffc890', 55, radius=0.6)
k.point_light(13.5, 8.0, 2.6, '#ffc890', 55, radius=0.6)
k.point_light(8.5, 8.6, 2.4, '#ffc890', 45, radius=0.6)
k.point_light(8.5, 5.9, 2.2, '#ffc890', 20, radius=0.4)
k.point_light(3.5, 8.2, 1.6, '#ffd8a0', 14, radius=0.3)          # over the chart

SAMPLES = int(os.environ.get('SCENE_SAMPLES', '96'))
k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}},
         light_samples=SAMPLES, world_light=('#2a2438', 0.4))

# ---- the world -------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': "Captain's Office", 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'office', 'fixedCamera': True,
          'spawns': {'player': [8, 10]}, 'leaveLabel': '&#8592; BRIDGE', 'leaveTo': 'bridge'})


def it(x, y, typ, label, prompt, **kw):
    d = {'x': x, 'y': y, 'type': typ, 'label': label, 'prompt': prompt}
    d.update(kw)
    return d


def office(xs, y, part, label, prompt):                   # js/worlds/office.js (not `action`: that's js/actions.js's)
    return [it(x, y, 'office', label, prompt, part=part) for x in xs]


def say(xs, y, label, text, prompt='LOOK'):
    return [it(x, y, 'dialog', label, prompt, dialog=text) for x in xs]


w['interactions'] = (
    [it(x, 11, 'enter_world', 'BRIDGE', 'ENTER BRIDGE', target='bridge', spawn=[5, 12], noBeacon=True) for x in (7, 8, 9)] +
    office((6, 7, 8, 9, 10), 5, 'books', "CAPTAIN'S DESK", 'PRESS E TO OPEN THE BOOKS') +
    office((12, 13, 14, 15), 4, 'staff', 'STAFF BOARD', 'PRESS E TO READ') +
    office((2, 3, 4), 8, 'chart', 'CHART TABLE', 'PRESS E TO GIVE ORDERS') +
    office((2, 3, 4), 7, 'chart', 'CHART TABLE', 'PRESS E TO GIVE ORDERS') +
    office((14, 15), 7, 'accounts', 'STRONGBOX', 'PRESS E TO OPEN') +
    office((12, 13), 7, 'accounts', 'COUNTING TABLE', 'PRESS E FOR THE ACCOUNTS') +
    say((8,), 4, "CAPTAIN'S CHAIR", 'YOUR CHAIR, WITH ITS BACK TO THE STARS. FROM HERE THE WHOLE OF IT IS IN REACH: THE BOOKS, THE BOARD, THE CHART.') +
    say((6, 10), 4, 'WINDOW', "THREE ARCHED WINDOWS ONTO WHEREVER THE WAYFARER LIES.") +
    say((1, 2), 4, 'BOOKSHELF', "LEDGERS GOING BACK YEARS, PILOT'S ALMANACS, A SEA ATLAS OF LUMAR, A BOOK ON THE HANDLING OF MEN WITH A GREAT DEAL UNDERLINED." +
        "\n\nON TOP, A GLOBE AND A SHIP IN A BOTTLE.") +
    say((3, 4), 4, 'MODEL SHIP', 'THE WAYFARER IN MINIATURE UNDER GLASS: EVERY PORT LIT, EVERY LIGHT-SAIL SET.' +
        "\n\nA BRASS PLATE ON THE CASE READS 'FROM THE YARD THAT BUILT HER'.") +
    say((1,), 10, 'LEMON TREE', 'A LEMON TREE IN A BRASS-BANDED TUB. IT FRUITS WHENEVER IT LIKES, WHICH IS OFTEN.') +
    say((15,), 10, 'COAT STAND', 'A CAPTAIN\'S COAT AND HAT, KEPT FOR WHEN SOMEBODY IMPORTANT COMES ABOARD.')
)
cx0, cr0, cx1, cr1, cz = CHART
bx0, bz0, bx1, bz1, br = BOARD
w['office'] = {
    # where the engine draws them (tiles, the screen's own: rows less height × cos θ)
    'board': [round(bx0, 3), round(br - bz1 * C, 3), round(bx1, 3), round(br - bz0 * C, 3)],
    'chart': [round(cx0, 3), round(cr0 - cz * C, 3), round(cx1, 3), round(cr1 - cz * C, 3)],
}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 4, 15, 10), doors=[(7, 11), (8, 11), (9, 11)], scene_id='office',
            scene_extra={'flicker': {'mode': 'pulse'},
                         'sky': [WIN[0], round(RF - WIN[3] * C, 3), WIN[1], round(RF - WIN[2] * C, 3)]})
print('office done')
