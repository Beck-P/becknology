"""The Backs — Blender scene (the alley behind the District, through the
chained gate).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_alley.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-alley

A wet lane behind the shops: the noodle kitchen's back door with its
extractor and a cook on his break, the Arcade's back wall with a fire
escape and a gutted cabinet dumped by the door, Lucky 7 and the hotel's
backs with laundry strung between them, and at the far end NULL's shipping
container, its doors open on a magenta glow (inside: null-den). The
District's skyline stands over the roofs and the rain comes down (the
arcadia hooks: world JSON `skyline`).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_backs as B               # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402
import assets_signs as S               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'arcadia-alley.json')
COLS, ROWS = 34, 14
RF = 7.0          # the back walls' faces; the lane rows 7-12, the low wall with the gate at 13

k = Kit(COLS, ROWS, margin_top=2.5, margin_bottom=0.6, seed=313)
st = D.Street()

# ---- the lane ---------------------------------------------------------------------------------------
Y.tile_floor(k, -0.5, RF, COLS + 0.5, 13.0, tones=('#2c2838', '#302c3e'), size=1.0, seam='#141020')
k.box(-0.5, 10.4, 0.0, COLS + 0.5, 10.48, 0.004, '#16121e', 'gutter')
for (x, r, rx, ry, tint) in ((3.2, 11.3, 0.7, 0.3, '#ffb050'), (9.5, 9.6, 0.5, 0.22, Y.PINK), (14.8, 11.6, 0.9, 0.35, Y.CYAN),
                             (21.0, 10.1, 0.6, 0.25, Y.PINK), (25.5, 11.8, 0.8, 0.3, '#e040c0'), (31.0, 11.4, 0.6, 0.25, '#e040c0')):
    Y.puddle(k, x, r, rx, ry, tint=tint)
D.steam_grate(k, st, 6.5, 11.2)
D.steam_grate(k, st, 20.0, 11.8)
Y.manhole(k, 12.0, 10.9)
st.vent(12.0, 10.9)

# ---- the backs ---------------------------------------------------------------------------------------
# Cyber Noodles: brick, the kitchen door, the extractor, cabbages, the cook on his crate
B.back_wall(k, -0.5, 9.0, RF, 3, wall='#3a2622', clad='brick', lit=0.45)
B.back_door(k, 4.5, RF, glow='#ffc070')
B.wall_lamp(k, 4.5, RF, col='#ffb060')
B.extractor(k, 2.4, RF, 2.2)
st.vent(2.4, RF + 0.3, 2.2)
B.pipes(k, 6.2, RF, 0.0, 4.6, n=2)
B.sign_back(k, 0.6, 3.6, RF, 3.0, 3.6, spill='#ffb050')
B.cabbage_crate(k, 2.6, RF + 0.35)
B.cabbage_crate(k, 3.3, RF + 0.95)
B.upturned_crate(k, 6.5, 8.55)
Y.trash_can(k, 7.8, RF + 0.35)
Y.trash_can(k, 8.4, RF + 0.35)

# the Arcade: tall and metal-clad, a fire escape, the back door with an EXIT sign, a gutted cabinet
B.back_wall(k, 9.0, 19.0, RF, 5, wall='#262236', clad='metal', lit=0.3)
D.fire_escape(k, 10.0, 12.8, RF, 4, 1.15, base=2.4)
B.back_door(k, 13.8, RF, glow='#ff6040', label_col='#e84040')
B.wall_lamp(k, 13.8, RF, col='#ffd890', energy=60)
Y.arcade_cabinet(k, 15.4, RF, broken=True)
D.graffiti(k, 16.2, 18.8, RF, 0.6, 2.2, Y.GREEN)
S.letters(k, 'NULL', 'Bungee', 17.4, RF + 0.02, 2.45, size=0.95, col=Y.GREEN, energy=8)
D.dumpster(k, 17.6, RF + 0.45)
B.cat(k, 17.2, RF + 0.4, 0.92)
B.pipes(k, 9.3, RF, 0.0, 6.9, n=3, col='#2e2c3a')
for z in (3.6, 4.75):
    D.ac_unit(k, 15.0, RF, z)
    D.ac_unit(k, 17.6, RF, z)

# Lucky 7 and the hotel: tiled backs, AC units, a vending machine nobody restocks, laundry across
B.back_wall(k, 19.0, 23.6, RF, 3, wall='#2c2440', clad='tile', lit=0.5)
B.back_wall(k, 23.6, 27.4, RF, 4, wall='#2a2838', clad='tile', lit=0.4)
B.sign_back(k, 19.6, 22.8, RF, 2.9, 3.7, spill='#ffe090')
Y.vending_machine(k, 20.4, RF, body='#1a2a40')
B.back_door(k, 22.4, RF, glow='#ffe090')
B.wall_lamp(k, 22.4, RF, col='#ffc878', energy=50)
B.wall_lamp(k, 9.6, RF, col='#a0c0ff', energy=40)
B.crate_stack(k, 24.0, RF + 0.05, n=3)
for z in (2.4, 3.55):
    D.ac_unit(k, 25.6, RF, z)
D.laundry(k, (19.6, RF + 0.3, 3.4), (26.8, RF + 0.3, 3.6), sag=0.3)
D.laundry(k, (20.2, RF + 0.3, 2.35), (24.6, RF + 0.3, 2.45), sag=0.2)
D.cable(k, (9.2, RF + 0.3, 4.4), (19.0, RF + 0.3, 3.9), sag=0.5, lights=[Y.PINK, Y.CYAN, '#ffe090'])
D.cable(k, (0.5, RF + 0.3, 3.9), (9.0, RF + 0.3, 4.2), sag=0.4, lights=['#ffe090', Y.PINK])

# NULL's container, backed by the hotel's service wall
B.back_wall(k, 27.4, COLS + 0.5, RF, 5, wall='#221e2c', clad='plain', lit=0.2)
B.container(k, 27.7, 33.7, RF, 9.6, door=(29.7, 31.1))
S.letters(k, 'NULL', 'Bungee', 32.4, 9.65, 1.3, size=0.5, col='#e040c0', energy=3)
Y.neon_shape(k, [(28.5 + 0.22 * math.cos(a * math.pi / 8), 1.95 + 0.22 * math.sin(a * math.pi / 8)) for a in range(16)],
             9.66, '#e040c0', closed=True)
Y.neon_shape(k, [(28.33, 1.78), (28.67, 2.12)], 9.66, '#e040c0', closed=False)
D.dish(k, 28.6, 8.2, 2.6)
D.cable(k, (28.6, 8.2, 2.7), (27.6, RF + 0.2, 4.5), sag=0.3)
D.trash_pile(k, 26.6, 9.0)
Y.hover_bike(k, 26.2, 11.6)

# the low wall at the front, the gate open onto the street
B.low_wall(k, -0.5, 15.64, 13.0)
B.low_wall(k, 18.36, COLS + 0.5, 13.0)
B.gate_open(k, 16.0, 18.0, 13.0)

# ---- light -----------------------------------------------------------------------------------------
k.point_light(4.5, 9.8, 2.6, '#ffb070', 60, radius=0.5, group='flicker')
k.point_light(10.0, 10.5, 3.0, '#a080ff', 60, radius=0.6, group='flicker')
k.point_light(14.5, 10.5, 3.0, '#a080ff', 70, radius=0.6, group='flicker')
k.point_light(19.0, 10.5, 3.0, '#ff80c0', 60, radius=0.6, group='flicker')
k.point_light(23.5, 10.5, 3.0, '#ff80c0', 60, radius=0.6, group='flicker')
k.point_light(30.5, 11.0, 2.4, '#e040c0', 70, radius=0.5, group='flicker')
k.point_light(1.5, 11.0, 2.6, '#ffb070', 40, radius=0.5, group='flicker')
k.area_light(COLS / 2, 13.5, 6.0, '#8070c0', 60, 30.0, rot=(math.radians(40), 0, 0))     # glow off the street
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.78}}, light_samples=128,
         world_light=('#2a2048', 0.8))

# ---- the world -------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Backs', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [16, 12]}, 'shipExit': False})


def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 16, 'y': 13, 'type': 'leave_world', 'label': 'STREET', 'prompt': 'RETURN TO STREET', 'leaveTo': 'arcadia-street',
     'leaveSpawn': [33, 8]},
    {'x': 17, 'y': 13, 'type': 'leave_world', 'label': 'STREET', 'prompt': 'RETURN TO STREET', 'leaveTo': 'arcadia-street',
     'leaveSpawn': [33, 8]},
    {'x': 30, 'y': 9, 'type': 'enter_world', 'target': 'null-den', 'spawn': [6, 7], 'label': 'CONTAINER', 'prompt': 'PRESS E TO ENTER'},
    dialog(6, 8, 'LINE COOK', 'PRESS E TO TALK', "NO."),
    dialog(4, 7, 'KITCHEN DOOR', 'PRESS E TO LOOK',
           "THE BACK OF CYBER NOODLES. STEAM, SHOUTING, SOMETHING SIZZLING.\n\nA SIGN ON THE DOOR: 'STAFF ONLY. THAT MEANS YOU.'"),
    dialog(15, 7, 'GUTTED CABINET', 'PRESS E TO LOOK',
           "AN ARCADE CABINET DUMPED BY THE BACK DOOR, ITS SCREEN KICKED IN.\n\nINSIDE THE COIN DOOR SOMEONE HAS SCRATCHED AN ARROW, "
           "POINTING DOWN THE ALLEY TOWARD THE CONTAINER."),
    dialog(13, 7, 'ARCADE BACK DOOR', 'PRESS E TO LOOK', "LOCKED. THROUGH IT, FAINT: THE RUNOUTS THEME, OVER AND OVER."),
    dialog(17, 7, 'CAT', 'PRESS E TO PET',
           "A BLACK CAT ON THE DUMPSTER LID OPENS ONE YELLOW EYE, CONSIDERS YOU, AND CLOSES IT AGAIN."),
    dialog(20, 7, 'VENDING MACHINE', 'PRESS E TO LOOK',
           "A VENDING MACHINE NOBODY HAS RESTOCKED IN YEARS. ONE CAN LEFT, WEDGED SIDEWAYS. IT IS LABELLED 'SODA (?)'."),
    dialog(24, 7, 'CRATES', 'PRESS E TO LOOK', "CRATES OF PACHINKO BALLS. THOUSANDS OF THEM. ONE CRATE HAS BURST."),
    dialog(26, 11, 'HOVER-BIKE', 'PRESS E TO LOOK',
           "A STRIPPED-DOWN HOVER-BIKE, NO PLATES, A NULL TAG ON THE TANK. THE IGNITION HAS BEEN REPLACED WITH A SINGLE RED BUTTON."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

k.solid(6, 8, 7, 9)                   # the cook on his crate
apply_world(WORLD, k, (0, 7, COLS - 1, 12), doors=[(16, 13), (17, 13)], scene_id='arcadia-alley',
            actors=[{'sheet': 'npc-cook', 'x': 6, 'y': 8, 'facing': 'down', 'pose': 'sit'}],
            scene_extra={'backdrop': True, 'steam': st.steam})
w = json.load(open(WORLD))
w['view'] = [-0.5, -5.0, COLS + 0.5, ROWS + 0.4]
w['cameraLead'] = -1.5
w['skyline'] = {'baseRow': 4.2, 'railRow': 40, 'centerCol': COLS / 2,
                'rain': {'drops': 170, 'splash': [0, RF + 0.3, COLS, 12.8]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('alley done')
