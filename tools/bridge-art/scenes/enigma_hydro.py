"""Enigma Station, hydroponics — Blender scene (world id "enigma-hydro").

  BVENV/bin/python tools/bridge-art/scenes/enigma_hydro.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/enigma-hydro

Through the relay deck's east door: the station's garden, and the one
place on Enigma that's alive. Grow beds under magenta lamps, vines up the
pipes, a fish tank glowing at the back — and in the corner a nest of
cables, a hammock and a radio rig tuned to 47.3 MHz, where D. Okafor, the
engineer who stayed, has been listening for seventy-two cycles.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_station as T             # noqa: E402
import assets_ship as P                # noqa: E402
import assets_signs as S               # noqa: E402
import assets_lumar as A               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'enigma-hydro.json')
H = 2.4 / math.cos(THETA)
COLS, ROWS = 22, 16
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, margin_x=1.0, seed=511)
GROW = '#ff60c0'
LEAF = ['#2e6a3a', '#3e8a4a', '#5aa85a', '#7ac868']

T.station_floor(k, 1, 4, 21, 14)
T.station_room(k, 1, 4, 21, 14, H, windows=[(4.6, 7.4, 1.0, 2.3, False), (14.6, 17.4, 1.0, 2.3, False)], airlock=(8.2, 10.2))
T.docking_tube(k, -1.0, 0.35, 8.25, 10.15)          # the passage back to the relay deck


def bed(x0, x1, cr, crop):
    """A grow bed: a steel trough of dark soil, plants in it, a magenta lamp bar over it."""
    k.box(x0, cr - 0.35, 0.0, x1, cr + 0.35, 0.45, (T.ST_WALL[2], 0.06), 'trough', bevel=0.02)
    k.box(x0 + 0.05, cr - 0.3, 0.45, x1 - 0.05, cr + 0.3, 0.47, '#2a1e16', 'soil')
    x = x0 + 0.3
    while x < x1 - 0.2:
        if crop == 'leafy':
            for j in range(3):
                k.blob(x + k.rng.uniform(-0.08, 0.08), cr + k.rng.uniform(-0.12, 0.12), 0.58 + j * 0.04, 0.16, 0.13, 0.1,
                       (k.rng.choice(LEAF), 0.25), 'leaves', segs=8)
        elif crop == 'tall':
            for j in range(2):
                top = (x + k.rng.uniform(-0.1, 0.1), cr + k.rng.uniform(-0.1, 0.1), 0.9 + k.rng.uniform(0, 0.35))
                k.tube((x, cr, 0.46), top, 0.02, LEAF[1], 'stalk', verts=4)
                k.blob(top[0], top[1], top[2], 0.08, 0.07, 0.1, (LEAF[2], 0.25), 'leaves', segs=7)
            k.sphere(x + 0.05, cr + 0.12, 0.75, 0.05, 0.05, '#e04030', 'tomato', segs=6)
        else:   # glowing tubers: something Okafor bred from Lumar spores
            k.blob(x, cr, 0.55, 0.14, 0.12, 0.08, (LEAF[0], 0.25), 'leaves', segs=7)
            k.sphere(x + 0.06, cr + 0.1, 0.5, 0.05, 0.05, '#203828', 'spore_fruit', emit=('#60e0a0', 0.8), segs=6)
        x += 0.42
    k.box(x0, cr - 0.05, 1.9, x1, cr + 0.05, 1.96, '#2a1020', 'grow_lamp', emit=(GROW, 0.95))
    for xx in (x0 + 0.2, x1 - 0.2):
        k.tube((xx, cr, 1.96), (xx, cr, H - 0.1), 0.012, '#3a3a44', 'lamp_wire', verts=3)
    k.point_light((x0 + x1) / 2, cr + 0.1, 1.7, GROW, 60, radius=0.6, group='flicker')
    k.solid(x0, cr - 0.35, x1, cr + 0.35)


for (cr, crop) in ((6.6, 'leafy'), (9.6, 'tall'), (12.4, 'spore')):
    bed(9.0, 13.6, cr, crop)
    bed(15.0, 19.6, cr, 'leafy' if crop == 'tall' else 'tall')

# vines up the back wall's pipes
for x in (8.4, 14.2, 20.4):
    k.tube((x, 4.05, 0.0), (x, 4.05, H - 0.2), 0.05, T.ST_WALL[1], 'pipe', verts=8)
    z = 0.2
    while z < H - 0.4:
        k.blob(x + k.rng.uniform(-0.15, 0.15), 4.12, z, 0.14, 0.06, 0.1, (k.rng.choice(LEAF), 0.25), 'vine', segs=7)
        z += k.rng.uniform(0.18, 0.32)
# the fish tank at the back
k.box(10.6, 4.1, 0.0, 13.4, 4.9, 0.4, T.ST_WALL[1], 'tank_base')
k.box(10.7, 4.15, 0.4, 13.3, 4.85, 1.6, '#0a2a30', 'tank_water', emit=('#1a6a70', 0.5))
for i in range(5):
    k.blob(10.9 + i * 0.5, 4.88, 0.7 + (i % 3) * 0.25, 0.08, 0.01, 0.04, '#e8a040', 'fish', emit=('#e8a040', 0.3), segs=6)
k.box(10.6, 4.1, 1.6, 13.4, 4.9, 1.66, T.ST_WALL[3], 'tank_lid')
k.point_light(12.0, 5.4, 1.0, T.TEAL, 10, radius=0.5, group='flicker')
k.solid(10.6, 4.1, 13.4, 4.9)

# ---- Okafor's corner: hammock, radio rig, photo board --------------------------------------------------------
P.desk_station(k, 2.0, 4.6, 4.9)
for (x, col) in ((2.5, T.LED_G), (3.3, T.TEAL), (4.1, T.LED_G)):
    k.box(x - 0.3, 4.5, 1.0, x + 0.3, 4.55, 1.45, shade(col, 0.35), 'radio_screen', emit=(col, 0.9))
S.letters(k, '47.3', 'RussoOne', 3.3, 4.56, 1.55, size=0.42, col=T.LED_G, energy=4)
k.box(4.8, 4.2, 0.0, 5.6, 4.9, 1.9, (T.ST_WALL[2], 0.06), 'radio_rack', bevel=0.02)
for i in range(6):
    k.box(4.85, 4.9, 0.3 + i * 0.25, 5.55, 4.92, 0.4 + i * 0.25, '#0a1418', 'radio_slot', emit=((T.LED_G if i % 2 else T.WARN_Y), 0.5))
k.cyl(5.2, 4.55, 1.9, 2.6, 0.03, '#5a6470', 'radio_whip', verts=4)
k.solid(1.9, 4.2, 5.7, 5.1)
for (x, r) in ((1.6, 12.6), (4.4, 12.6)):                     # hammock between two stanchions
    k.cyl(x, r, 0.0, 1.5, 0.05, '#4a5a68', 'stanchion', verts=8)
k.loft([[(1.6 + t * 2.8, 12.6 + dr, 0.75 - 0.35 * math.sin(math.pi * t)) for dr in (-0.3, 0.0, 0.3)]
        for t in [i / 12 for i in range(13)]], ('#c87830', 0.3), 'hammock')
k.blob(3.2, 12.6, 0.48, 0.5, 0.2, 0.06, ('#4a5a3a', 0.3), 'blanket', segs=10)
k.solid(1.4, 12.2, 4.6, 13.0)
k.box(6.2, 4.02, 0.9, 7.8, 4.06, 1.9, '#5a4a3a', 'photo_board')                  # crew photos on the wall
for i, col in enumerate(('#d8c8a0', '#c8d8e0', '#e0c8c8', '#c8e0c8', '#d8d0e8')):
    k.box(6.35 + (i % 3) * 0.48, 4.06, 1.0 + (i // 3) * 0.45, 6.7 + (i % 3) * 0.48, 4.08, 1.3 + (i // 3) * 0.45, col, 'photo')
k.cyl(6.0, 6.0, 0.0, 0.1, 0.05, '#c8c0b0', 'mug', verts=8)
A.stool(k, 3.4, 6.1)                                                       # her seat at the rig

# the potting bench along the front: seed trays, a watering can
BX = 15.0
k.box(BX, 13.3, 0.78, BX + 2.8, 13.9, 0.85, ('#3a4450', 0.06), 'bench_top')
for x in (BX + 0.1, BX + 2.7):
    k.box(x - 0.05, 13.35, 0.0, x + 0.05, 13.85, 0.78, '#22303c', 'bench_leg')
for i in range(4):
    tx = BX + 0.2 + i * 0.6
    k.box(tx, 13.4, 0.85, tx + 0.5, 13.8, 0.92, '#2a1e16', 'seed_tray')
    for j in range(6):
        k.sphere(tx + 0.08 + (j % 3) * 0.17, 13.5 + (j // 3) * 0.2, 0.95, 0.035, 0.03, LEAF[2 + (i + j) % 2], 'seedling', segs=5)
k.cyl(BX + 2.5, 13.6, 0.85, 1.1, 0.12, '#4a8a9a', 'watering_can', verts=10)
k.tube((BX + 2.6, 13.6, 1.0), (BX + 2.85, 13.45, 1.12), 0.025, '#4a8a9a', 'watering_can', verts=5)
k.solid(BX, 13.3, BX + 2.8, 13.9)
# a water tank by the photo board, hosed to the beds
k.cyl(7.9, 4.75, 0.0, 1.3, 0.34, (T.ST_WALL[2], 0.06), 'water_tank', verts=16)
k.cyl(7.9, 4.75, 1.3, 1.36, 0.36, T.ST_WALL[3], 'water_tank_lid', verts=16)
k.box(7.6, 5.05, 0.3, 8.2, 5.1, 1.1, '#0a2a30', 'tank_gauge', emit=('#1a6a70', 0.4))
k.tube((8.1, 5.0, 0.05), (9.0, 6.3, 0.05), 0.04, '#2a2a30', 'hose', verts=6)
k.solid(7.5, 4.4, 8.3, 5.1)
# seed sacks and crates stacked by the passage
for (x, r, z) in ((1.55, 6.3, 0.0), (1.55, 6.9, 0.0), (1.55, 6.6, 0.5)):
    k.blob(x, r, z + 0.22, 0.26, 0.22, 0.24, ('#9a8a6a', 0.3), 'seed_sack', segs=10)
k.solid(1.2, 6.0, 1.9, 7.2)
T.debris(k, 6.0, 7.5, 8.5, 13.5, n=6)
T.hanging_cables(k, 6.0, 4.6, n=3)
T.emergency_light(k, 20.2, 4.0)

k.solid(5, 5, 6, 6)                                            # Okafor at the rig
k.area_light(11.0, 5.0, 2.4, '#7080c0', 30, 5.0, rot=(math.radians(-60), 0, 0))
for (x, r) in ((5.0, 7.5), (11.0, 11.0), (17.0, 8.0), (7.5, 11.5)):
    k.point_light(x, r, 2.6, '#80c0d0', 45, radius=0.8)
k.point_light(3.4, 6.2, 1.4, '#ffd0a0', 18, radius=0.3)                   # her desk lamp

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.6}}, light_samples=128,
         world_light=('#16283a', 0.6))

w = {'name': 'Hydroponics', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'enigma',
     'spawns': {'player': [2, 9]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 0, 'y': 8, 'type': 'enter_world', 'target': 'enigma', 'spawn': [16, 9], 'label': 'RELAY DECK',
          'prompt': 'PRESS E TO GO THROUGH'},
         {'x': 0, 'y': 9, 'type': 'enter_world', 'target': 'enigma', 'spawn': [16, 9], 'label': 'RELAY DECK',
          'prompt': 'PRESS E TO GO THROUGH'},
         {'x': 5, 'y': 5, 'type': 'dialog', 'label': 'OKAFOR', 'prompt': 'PRESS E TO TALK',
          'dialog': 'A WOMAN IN AN ENGINEER\'S VEST LOOKS UP FROM THE RADIO.\n\n"YOU\'RE REAL. GOOD. SIT DOWN - DON\'T TOUCH THE DIALS."'},
         {'x': 3, 'y': 5, 'type': 'dialog', 'label': 'RADIO RIG', 'prompt': 'PRESS E TO LISTEN',
          'dialog': 'STATIC, AND UNDER IT A VOICE, CALM, REPEATING:\n\n"WREN TO ENIGMA. WREN TO ENIGMA. WE CAN SEE THE EDGE. WE ARE NOT AFRAID."\n\nTHE LOOP IS SEVENTY-TWO CYCLES OLD.'},
         {'x': 7, 'y': 5, 'type': 'dialog', 'label': 'PHOTO BOARD', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THE CREW, PINNED TO CORK: FIVE FACES IN FLIGHT JACKETS IN FRONT OF A SKIFF CALLED WREN.\n\nOKAFOR IS IN THE CORNER OF EVERY PHOTO, HOLDING A WRENCH, NOT LOOKING AT THE CAMERA.'},
         {'x': 12, 'y': 4, 'type': 'dialog', 'label': 'FISH TANK', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'ORANGE FISH IN BLUE LIGHT. A HAND-LETTERED LABEL: "DO NOT EAT. THEY HAVE NAMES."'},
         {'x': 11, 'y': 9, 'type': 'dialog', 'label': 'GROW BEDS', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'LETTUCE, TOMATOES, AND A TUBER THAT GLOWS GREEN WHEN YOU BREATHE ON IT.\n\nEVERYTHING IS WATERED. EVERYTHING IS LABELLED. SOMEONE HAS BEEN VERY CAREFUL FOR A VERY LONG TIME.'},
         {'x': 3, 'y': 12, 'type': 'dialog', 'label': 'HAMMOCK', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A HAMMOCK SEWN FROM AN ORANGE FLIGHT SUIT. THE NAME TAPE STILL ON IT: OKAFOR.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 4, 20, 13), doors=[(0, 8), (0, 9)], scene_id='enigma-hydro',
            actors=[{'sheet': 'npc-okafor', 'x': 5, 'y': 5, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'flicker': {'mode': 'pulse'}})
print('hydro done')
