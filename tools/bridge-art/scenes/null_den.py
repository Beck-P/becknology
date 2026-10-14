"""NULL's den — Blender scene (inside the shipping container in the Backs).

  BVENV/bin/python tools/bridge-art/scenes/null_den.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/null-den

A corrugated steel box made home: a wall of mismatched monitors over a long
desk where Vex holds court in a battered gaming chair, the job rig (patch
panels, one big screen showing the puzzle — js/splice.js), the plan under
red string, a fridge, beanbags round an upturned crate, string lights.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_backs as B               # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_signs as S               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'null-den.json')
COLS, ROWS = 14, 9
RF = 3.0
H = 2.5 / math.cos(THETA)

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=419)

# ---- shell ------------------------------------------------------------------------------------
k.box(1.0, RF, -0.12, 13.0, 8.0, -0.02, '#0e0c14', 'subfloor')
x = 1.0
while x < 13.0 - 1e-6:                     # plywood sheets over the container floor
    xn = min(13.0, x + 1.2)
    k.box(x + 0.01, RF, -0.04, xn - 0.01, 8.0, 0.0, ('#4a3a2a', 0.15), 'plywood')
    x = xn
B.corrugated_room(k, 0.5, 13.5, RF, H)
for (x0, x1) in ((0.4, 1.0), (13.0, 13.6)):
    k.box(x0, RF - 0.4, 0, x1, 8.0, H, ('#1a3a3a', 0.1), 'den_side')
    k.box(x0 - 0.02, RF - 0.4, H, x1 + 0.02, 8.0, H + 0.05, '#102424', 'den_cap')
for (x0, x1) in ((0.4, 6.0), (8.0, 13.6)):
    k.box(x0, 8.0, 0, x1, 8.6, 0.4, ('#1a3a3a', 0.1), 'den_front')
    k.box(x0, 8.0, 0.4, x1, 8.6, 0.45, '#102424', 'den_cap')
k.box(6.0, 8.0, -0.01, 8.0, 8.6, 0.02, '#2a2a30', 'threshold')
A.rug(k, 5.2, 4.8, 9.2, 7.4, col='#3a1a4a', trim='#e040c0', pattern=True)

# ---- along the back wall --------------------------------------------------------------------------
B.screen_wall(k, 1.1, 6.2, RF, 0.95, H - 0.25)
B.hacker_desk(k, 1.1, 5.9, RF)
B.gamer_chair(k, 3.5, 4.45)
B.splice_rig(k, 8.2, RF)
B.plan_board(k, 10.7, RF, z0=0.85)
S.neon(k, 'NULL', 'Bungee', 10.7, RF + 0.02, 2.15, size=0.36, col='#e040c0', energy=6)
B.fridge(k, 12.4, RF)
Y.glow_poster(k, 6.65, RF, 1.0, w=0.5, h=0.7, bg='#1a0a30', accent=Y.CYAN, kind=1)

# ---- the room --------------------------------------------------------------------------------------
B.beanbag(k, 9.9, 6.3, col='#3a2a60')
B.beanbag(k, 12.0, 5.9, col='#602a4a')
B.upturned_crate(k, 11.0, 6.7)
k.box(10.75, 6.5, 0.42, 11.3, 6.95, 0.46, ('#c8a070', 0.1), 'pizza_box')
B.crate_stack(k, 1.1, 6.6, n=3)
D.drone_parked(k, 3.4, 6.8)
D.cable(k, (0.6, RF + 0.2, 2.9), (13.4, RF + 0.2, 2.8), sag=0.35, lights=['#e040c0', Y.CYAN, '#ffe090'])
D.cable(k, (0.6, 5.5, 3.0), (13.4, 5.2, 3.0), sag=0.3, lights=[Y.CYAN, '#e040c0'])

# ---- light -----------------------------------------------------------------------------------------
k.point_light(3.5, 5.5, 2.2, '#8090ff', 30, radius=0.4, group='flicker')
k.point_light(10.5, 5.5, 2.3, '#e040c0', 35, radius=0.4, group='flicker')
k.point_light(7.0, 7.3, 2.0, '#ffd0a0', 12, radius=0.4)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128,
         world_light=('#1a1430', 0.45))

# ---- the world -------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': "NULL's Den", 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia', 'interior': True,
          'fixedCamera': True, 'spawns': {'player': [6, 7]}, 'shipExit': False})


def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


out = {'type': 'leave_world', 'label': 'THE BACKS', 'prompt': 'RETURN TO THE BACKS', 'leaveTo': 'arcadia-alley', 'leaveSpawn': [30, 10]}
w['interactions'] = [
    dict(out, x=6, y=8), dict(out, x=7, y=8),
    dialog(3, 4, 'VEX', 'PRESS E TO TALK', "WHAT."),
    {'x': 7, 'y': 3, 'type': 'splice', 'label': 'THE RIG', 'prompt': 'PRESS E TO JACK IN'},
    {'x': 8, 'y': 3, 'type': 'splice', 'label': 'THE RIG', 'prompt': 'PRESS E TO JACK IN'},
    dialog(10, 3, 'THE PLAN', 'PRESS E TO READ',
           "A MAP OF THE DISTRICT UNDER RED STRING. EVERY AD SCREEN ON THE STREET IS CIRCLED.\n\nACROSS THE TOP, IN MARKER: "
           "'HALCYON OWNS THE SKY. NOT FOREVER.'"),
    dialog(11, 3, 'THE PLAN', 'PRESS E TO READ',
           "PHOTOS PINNED ALONG THE STRING: A BILLBOARD, A ROOFTOP, THE SKYWALK LIFT, A FACE WITH A BIG RED X THROUGH IT."),
    dialog(12, 3, 'FRIDGE', 'PRESS E TO OPEN', "ENERGY DRINKS, COLD NOODLES AND ONE ENORMOUS BLOCK OF CHEESE. NOBODY KNOWS WHOSE."),
    dialog(1, 3, 'SCREENS', 'PRESS E TO LOOK',
           "TWENTY SCREENS. CAMERA FEEDS FROM UP AND DOWN THE STREET, SCROLLING CODE, A COOKING SHOW WITH THE SOUND OFF."),
    dialog(5, 3, 'SCREENS', 'PRESS E TO LOOK',
           "ONE SCREEN JUST SHOWS THE WAYFARER, PARKED IN ORBIT. SOMEBODY HAS BEEN WATCHING YOUR SHIP."),
    dialog(10, 6, 'BEANBAG', 'PRESS E TO SIT', "YOU SINK IN UP TO YOUR ELBOWS. IT SMELLS OF PIZZA AND SOLDER."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

k.solid(3, 4, 4, 5)                   # Vex in the chair
apply_world(WORLD, k, (1, 3, 12, 7), doors=[(6, 8), (7, 8)], scene_id='null-den',
            actors=[{'sheet': 'npc-vex', 'x': 3, 'y': 4, 'facing': 'down', 'pose': 'sit'}],
            scene_extra={'flicker': {'mode': 'pulse'}})
print('den done')
