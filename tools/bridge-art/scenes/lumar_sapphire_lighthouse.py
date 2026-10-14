"""The Sapphire Light, inside: the keeper's room at the foot of the tower.

  BVENV/bin/python tools/bridge-art/scenes/lumar_sapphire_lighthouse.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-sapphire-lighthouse

An octagon of whitewashed stone: an iron stair winding up the back wall to
the lamp room (lumar-sapphire-lamproom), shelves of old logbooks, the table with
this year's log open under a lamp, the keeper's bed (not slept in), the
stove with a kettle that's still warm, drums of lamp oil, a yellow oilskin
on its peg by the door, windows onto the night sea.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_deck as D                        # noqa: E402
import assets_light as L                       # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_magic as M                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-sapphire-lighthouse.json')

H = 2.6 / math.cos(THETA)
k = Kit(12, 13, margin_top=1.0, margin_bottom=0.5, seed=1403)
P, C = M.octagon_room(k, 2, 2, 10, 11, 2, H, door=(5.0, 7.0), stone=L.WHITE, floor_tone='#5a5866')

# ---- the stair up, winding against the back wall ---------------------------------------------
SX, SR = 7.0, 3.05
top = L.spiral_stair(k, SX, SR, 1.0)
k.box(SX - 0.48, 1.98, top, SX + 0.48, 2.06, top + 1.35, A.WOOD_DD, 'upstairs_frame')
k.box(SX - 0.4, 2.06, top, SX + 0.4, 2.065, top + 1.27, '#0c1420', 'upstairs_dark', emit=(L.LAMP, 0.18))
k.point_light(SX, 2.4, top + 0.9, L.LAMP, 8, radius=0.2, group='flicker')
k.point_light(SX - 0.3, SR + 1.4, 1.8, '#c8d0e8', 14, radius=0.3)
k.solid(SX - 1.0, SR - 1.0, SX + 0.4, SR + 0.9)

# ---- the back wall: shelves of old logs -------------------------------------------------------------
A.bookshelf(k, 4.15, 5.85, 2.0, top=2.1, tone='#2e2418')
k.solid(4.15, 2.0, 5.85, 2.5)

# ---- windows onto the sea -------------------------------------------------------------------------------
M.angled_window(k, P[7], P[0], C, 0.3, 0.7, 1.15, 2.35, moon=True)
M.angled_window(k, P[1], P[2], C, 0.3, 0.7, 1.15, 2.35)
k.area_light(3.3, 3.3, 1.9, '#7890e0', 30, 1.0, rot=(math.radians(-70), 0, math.radians(45)))
k.area_light(8.7, 3.3, 1.9, '#7890e0', 24, 1.0, rot=(math.radians(-70), 0, math.radians(-45)))

# ---- left: the keeper's bed, her sea chest ----------------------------------------------------------------
A.bed(k, 2.25, 3.25, 4.45, 6.45, quilt='#2a4a7a', quilt2='#d0a028')
A.trunk(k, 2.3, 6.65, w=0.9, d=0.5, tone='#3a4a6a')
k.solid(2.3, 6.65, 3.2, 7.15)

# ---- right: the stove, the oil -------------------------------------------------------------------------------
L.iron_stove(k, 9.2, 4.95)
L.oil_drums(k, 8.85, 6.7)
A.crate(k, 8.0, 9.1, s=0.55, tone=A.WOOD_D)

# ---- the middle: the log on its table, a stool, a rag rug ----------------------------------------------------
A.rug(k, 4.3, 5.4, 7.0, 7.9, col='#2a4a7a', trim='#d0a028', pattern=True)
L.log_table(k, 5.5, 6.4)
A.stool(k, 5.5, 7.3)
k.solid(5.0, 6.0, 6.0, 7.0)

# ---- by the stove, and by the door: her chair, the oilskin on its peg, rope, a bucket ----------------------
A.rocking_chair(k, 7.95, 5.75, tone=A.WOOD_D)
k.solid(7.6, 5.4, 8.3, 6.1)
L.oilskins(k, 3.15, 8.55)
A.bucket(k, 8.6, 8.3)
D.coil_of_rope(k, 9.0, 9.0)
D.coil_of_rope(k, 3.45, 9.6)

# ---- light -----------------------------------------------------------------------------------------------------
A.hanging_lamp(k, 6.0, 5.8, energy=120, visible=True)
k.point_light(6.0, 9.0, 2.4, '#a8b8e0', 25, radius=0.6)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.74}}, light_samples=128,
         world_light=('#2a3450', 0.45))

# ---- the world -------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Sapphire Light', 'width': 12, 'height': 13, 'tileSize': 16, 'tileset': 'lumar-sapphire-lighthouse',
          'spawns': {'player': [6, 10]}, 'shipExit': False})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 5, 'y': 11, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire', 'leaveSpawn': [8, 17], 'label': 'DOOR',
     'prompt': 'LEAVE LIGHTHOUSE'},
    {'x': 6, 'y': 11, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire', 'leaveSpawn': [8, 17], 'label': 'DOOR',
     'prompt': 'LEAVE LIGHTHOUSE'},
    {'x': 6, 'y': 3, 'type': 'enter_world', 'target': 'lumar-sapphire-lamproom', 'spawn': [5, 8], 'label': 'STAIRS UP',
     'prompt': 'PRESS E TO CLIMB'},
    {'x': 7, 'y': 3, 'type': 'enter_world', 'target': 'lumar-sapphire-lamproom', 'spawn': [5, 8], 'label': 'STAIRS UP',
     'prompt': 'PRESS E TO CLIMB'},
    look(5, 6, 'THE LOGBOOK',
         "THIS YEAR'S LOG, OPEN UNDER THE LAMP. WIND, WEATHER, SHIPS PASSING, OIL BURNED - IN A SMALL, STEADY HAND.\n\n"
         "THEN, EVERY NIGHT FOR THREE WEEKS, ONE MORE LINE:\n'LIGHT ANSWERED FROM MIDNIGHT, NORTH BY EAST. THREE LONG, ONE SHORT.'",
         'PRESS E TO READ'),
    look(5, 2, 'OLD LOGS',
         "FORTY YEARS OF LOGBOOKS, SPINES FADED TO THE SAME GREY-BLUE.\n\nONE IS MARKED WITH A RIBBON. AN OLDER HAND, THE NIGHT "
         "OF A GREAT STORM: 'MORNING TIDE NOT IN. LAMP KEPT ALL NIGHT. LIGHT ANSWERED FROM MIDNIGHT - THREE LONG, ONE SHORT.' "
         "THEN NOTHING ABOUT IT EVER AGAIN.\n\nSIGNED E. GALE.", 'PRESS E TO READ'),
    look(3, 5, "KEEPER'S BED",
         "MADE TIGHT AS A DRUM, A SAPPHIRE-AND-GOLD QUILT. NOBODY HAS SLEPT IN IT FOR WEEKS.\n\nA BOOK FACE DOWN ON THE PILLOW: "
         "'SIGNALS AND CALLS OF THE LUMAR FLEET'."),
    look(3, 7, 'SEA CHEST',
         "PAINTED ON THE LID, NEARLY WORN AWAY: 'M. GALE - MORNING TIDE'.\n\nIT'S LOCKED."),
    look(8, 4, 'STOVE',
         "AN IRON STOVE, BANKED LOW. THE KETTLE ON IT IS STILL WARM.\n\nSOMEBODY COMES DOWN TO FILL IT."),
    look(8, 6, 'OIL DRUMS',
         "DRUMS OF LAMP OIL, STENCILLED 'SAPPHIRE LIGHT - KEEPER'S USE'. TWO ARE EMPTY.\n\nAT THIS RATE THE LAMP'S BURNING "
         "HOTTER THAN IT NEEDS TO."),
    look(3, 8, 'OILSKINS',
         "A YELLOW OILSKIN AND SOU'WESTER ON A PEG. THE COAT IS DRY AND STIFF - NOT WORN SINCE THE LAST RAINS."),
    look(8, 9, 'CRATE',
         "SPARE WICKS, A TIN OF BRASS POLISH, A DOZEN CANDLE ENDS, AND A SMALL BLUE CRYSTAL WRAPPED IN A CLOTH, LIKE "
         "SOMETHING PUT AWAY FOR LATER."),
    look(3, 3, 'WINDOW', "THE NIGHT SEA, AND A WHITE MOON.\n\nTHE BEAM SWEEPS OVER THE WATER ABOVE YOU, BLUE, AND BLUE, AND BLUE."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, 2, 9, 10), doors=[(5, 11), (6, 11)], scene_id='lumar-sapphire-lighthouse')
print('lighthouse done')
