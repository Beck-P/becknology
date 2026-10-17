"""The Penthouse — the top of Skyport 7's tower, yours for 250,000 (world id "arcadia-penthouse"; js/home.js, js/legacy.js).
Usage: BVENV/bin/python arcadia_penthouse.py RENDER_DIR

A private lift from the roof pad opens on one long room under the city's lights: the whole back wall is glass onto the
skyline (holdout glass; js/home.js draws the live towers and rain through it), a sunken lounge facing it with a glass
table, a bar on the left with its stools and a wall of bottles lit from below, a bed on a raised platform on the right
under a neon halo, and a plunge pool glowing by the lift. The floor between is polished stone, bare for the furniture you
buy (the furniture sheet from tools/bridge-art/furniture_sprites.py).
"""
import json
import math
import os
import sys

from _cyber_room import Y, P, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade  # noqa: E402

OUT = sys.argv[1]
WID = 'arcadia-penthouse'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 13
H = 2.8 / math.cos(THETA)
C = math.cos(THETA)
FLOOR = (1, 2, 20, 10)
DOORS = [(10, 11), (11, 11)]
RF = 2.0                                                    # the glass wall's face
WIN = (1.3, 20.7, 0.25, 2.55)
GOLD = '#d8b060'

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=2501)
Y.tile_floor(k, 1, 2, 21, 11, tones=('#1c1a26', '#23212f'), size=1.0, seam='#0e0c16')
P.ship_back_wall(k, 0.4, 21.6, RF, H, win=WIN, mullions=(4.6, 7.9, 11.0, 14.1, 17.4), pal=Y.WALL, trim=shade(GOLD, 0.7))
P.ship_side_wall(k, 0.4, 1.0, RF - 0.5, 11, H, pal=Y.WALL)
P.ship_side_wall(k, 21.0, 21.6, RF - 0.5, 11, H, pal=Y.WALL)
P.ship_front_wall(k, 0.4, 21.6, 11, door=(10.0, 12.0), pal=Y.WALL)
k.box(1.0, RF + 0.02, 0.0, 21.0, RF + 0.1, 0.06, '#0c1418', 'glass_foot', emit=(Y.CYAN, 0.5))     # the floor's edge lit at the glass
P.led_strip(k, 1.0, 21.0, RF + 0.11, z=H - 0.3, col=Y.PURP, group='flicker')

# ---- the bar, on the left ------------------------------------------------------------------------------------------
BX0, BX1, BR0, BR1 = 1.2, 2.0, 3.6, 8.2                     # the counter runs front to back along the left wall
k.box(BX0, BR0, 0.0, BX1, BR1, 1.0, ('#16141e', 0.08), 'bar_body')
k.box(BX0 - 0.04, BR0 - 0.04, 1.0, BX1 + 0.12, BR1 + 0.04, 1.04, ('#2a2632', 0.25), 'bar_top')
k.box(BX1 + 0.08, BR0 - 0.04, 1.0, BX1 + 0.12, BR1 + 0.04, 1.04, (GOLD, 0.3), 'bar_edge')
k.box(BX1 + 0.01, BR0 + 0.1, 0.08, BX1 + 0.03, BR1 - 0.1, 0.12, '#200818', 'bar_neon', emit=(Y.PINK, 0.9))
for i, r in enumerate((4.0, 4.5, 5.0, 5.6, 6.1, 6.7, 7.3, 7.8)):          # bottles along the counter
    tone = (Y.CYAN, Y.PINK, Y.YEL, '#a0f080')[i % 4]
    k.cyl(BX0 + 0.3, r, 1.06, 1.36 + (i % 3) * 0.05, 0.05, (shade(tone, 0.45), 0.05), 'bottle', verts=8)
    k.cyl(BX0 + 0.3, r, 1.36 + (i % 3) * 0.05, 1.44 + (i % 3) * 0.05, 0.02, '#1a1a1a', 'bottle_neck', verts=6)
for r in (4.4, 5.8, 7.2):                                    # stools
    k.cyl(BX1 + 0.55, r, 0.0, 0.66, 0.04, '#3a3a48', 'stool_leg', verts=8)
    k.cyl(BX1 + 0.55, r, 0.66, 0.74, 0.2, (GOLD, 0.3), 'stool_seat', verts=12)
k.point_light(BX0 + 0.6, (BR0 + BR1) / 2, 1.6, '#f0a0c8', 18, radius=0.3)
k.solid(1.0, BR0, 2.1, BR1)
Y.neon_text(k, 'HALCYON', 3.2, RF, 2.2, h=0.26, col=Y.PINK, energy=4)

# ---- the sunken lounge, facing the glass ----------------------------------------------------------------------------
LX0, LX1, LR0, LR1 = 7.2, 14.8, 3.0, 5.6
k.box(LX0, LR0, -0.22, LX1, LR1, -0.02, ('#141220', 0.05), 'pit_floor')                        # the step down
k.box(LX0 - 0.1, LR1, -0.02, LX1 + 0.1, LR1 + 0.1, 0.0, (GOLD, 0.3), 'pit_edge')
SOFA = '#3a2a5a'
k.box(LX0, LR1 - 0.75, -0.02, LX1, LR1, 0.42, (SOFA, 0.12), 'sofa_seat', bevel=0.04)          # the long seat, its back to you
k.box(LX0, LR1 - 0.25, 0.42, LX1, LR1, 0.95, (shade(SOFA, 0.85), 0.12), 'sofa_back', bevel=0.05)
for x0 in (LX0, LX1 - 0.75):                                 # the arms of the U, down the sides
    k.box(x0, LR0 + 0.2, -0.02, x0 + 0.75, LR1 - 0.75, 0.42, (SOFA, 0.12), 'sofa_side', bevel=0.04)
    k.box(x0 + (0.0 if x0 == LX0 else 0.5), LR0 + 0.2, 0.42, x0 + (0.25 if x0 == LX0 else 0.75), LR1 - 0.75, 0.85, (shade(SOFA, 0.85), 0.12), 'sofa_back', bevel=0.04)
for x in (8.6, 10.2, 11.8, 13.4):                            # cushions
    k.box(x - 0.3, LR1 - 0.62, 0.42, x + 0.3, LR1 - 0.3, 0.7, (('#c86a9a', '#5ac8d0')[int(x) % 2], 0.15), 'cushion', bevel=0.05)
k.box(LX0 + 0.1, LR1 - 0.04, 0.02, LX1 - 0.1, LR1, 0.06, '#082028', 'sofa_glow', emit=(Y.CYAN, 0.8))
k.box(9.6, 3.6, -0.02, 12.4, 4.4, 0.36, ('#a0c8e0', 0.02), 'table_glass')                     # the glass table
k.box(9.7, 3.7, 0.0, 12.3, 4.3, 0.04, '#0c1820', 'table_glow', emit=(Y.CYAN, 0.4))
k.cyl(10.4, 4.0, 0.36, 0.44, 0.08, '#e8e0d0', 'cup', verts=10)
k.box(11.2, 3.85, 0.36, 11.8, 4.15, 0.42, '#2a2a3a', 'tablet', emit=('#3a6a9a', 0.5))
k.point_light(11.0, 4.4, 1.4, '#a0e0f0', 14, radius=0.4)
k.solid(LX0, LR0, LX1, LR1)

# ---- the bed on its platform, right -------------------------------------------------------------------------------
PX0, PX1, PR0, PR1 = 15.8, 21.0, 2.0, 6.2
k.box(PX0, PR0, 0.0, PX1, PR1, 0.24, ('#24202e', 0.06), 'platform', bevel=0.02)
k.box(PX0, PR1 - 0.03, 0.02, PX1, PR1 + 0.01, 0.06, '#200818', 'platform_neon', emit=(Y.PINK, 0.8))
BX, BR = 17.0, 2.5                                            # the bed: its head to the glass, foot towards you
k.box(BX, BR + 0.1, 0.24, BX + 2.6, BR + 3.0, 0.62, ('#2a2638', 0.08), 'bed_base', bevel=0.04)
k.box(BX + 0.05, BR + 0.15, 0.62, BX + 2.55, BR + 2.95, 0.78, ('#e8e4f0', 0.12), 'bed_sheet', bevel=0.05)
k.box(BX + 0.05, BR + 1.3, 0.78, BX + 2.55, BR + 2.95, 0.84, ('#5a3a8a', 0.12), 'bed_throw', bevel=0.04)
for x in (BX + 0.35, BX + 1.4):
    k.box(x, BR + 0.25, 0.78, x + 0.85, BR + 0.7, 0.92, ('#f4f0f8', 0.15), 'pillow', bevel=0.05)
k.box(BX - 0.1, BR, 0.24, BX + 2.7, BR + 0.12, 1.25, ('#1a1626', 0.08), 'headboard', bevel=0.03)
Y.neon_shape(k, [(BX + 0.3, 1.3), (BX + 1.3, 1.6), (BX + 2.3, 1.3)], BR + 0.13, Y.PINK, closed=False)
k.point_light(BX + 1.3, BR + 1.0, 1.5, '#f090c0', 16, radius=0.4)
for x in (BX - 0.55, BX + 3.15):                             # night stands
    k.box(x, BR + 0.2, 0.24, x + 0.45, BR + 0.65, 0.66, ('#2a2638', 0.08), 'nightstand')
    k.cyl(x + 0.22, BR + 0.42, 0.66, 0.9, 0.08, '#fff0d0', 'lamp', emit=('#ffd8a0', 0.8), verts=10)
k.solid(BX - 0.6, BR, BX + 3.7, BR + 3.0)

# ---- the plunge pool by the lift, right front --------------------------------------------------------------------
QX0, QX1, QR0, QR1 = 15.6, 19.8, 7.6, 10.0
for (a, b, c, d) in ((QX0 - 0.15, QR0 - 0.15, QX1 + 0.15, QR0), (QX0 - 0.15, QR1, QX1 + 0.15, QR1 + 0.15),
                     (QX0 - 0.15, QR0, QX0, QR1), (QX1, QR0, QX1 + 0.15, QR1)):         # the rim, round the water
    k.box(a, b, -0.02, c, d, 0.08, ('#e8e4e0', 0.12), 'pool_rim', bevel=0.01)
k.box(QX0, QR0, 0.0, QX1, QR1, 0.03, '#06303c', 'pool_water', emit=('#1a98b0', 0.5))     # (over the floor's tiles)
k.box(QX0 + 1.6, QR0 + 0.3, 0.03, QX1 - 0.3, QR1 - 0.3, 0.031, '#042630', 'pool_deep', emit=('#0e7088', 0.46))   # the deep end
for i in range(1, 8):                                        # the tiled bottom, seen through the water
    x = QX0 + i * (QX1 - QX0) / 8
    k.box(x - 0.01, QR0 + 0.05, 0.031, x + 0.01, QR1 - 0.05, 0.032, '#0a4858', 'pool_tile', emit=('#38b8d0', 0.4))
for i in range(1, 5):
    r = QR0 + i * (QR1 - QR0) / 5
    k.box(QX0 + 0.05, r - 0.01, 0.031, QX1 - 0.05, r + 0.01, 0.032, '#0a4858', 'pool_tile', emit=('#38b8d0', 0.4))
for i in range(6):                                           # ripples of light on it
    x = QX0 + 0.4 + k.rng.random() * (QX1 - QX0 - 0.8)
    r = QR0 + 0.3 + k.rng.random() * (QR1 - QR0 - 0.6)
    k.box(x - 0.25, r - 0.02, 0.03, x + 0.25, r + 0.02, 0.036, '#60c8e0', 'pool_glint', emit=('#a8f0ff', 0.55))
k.point_light((QX0 + QX1) / 2, (QR0 + QR1) / 2, 0.6, '#60e0f0', 30, radius=1.0)
k.solid(QX0 - 0.15, QR0 - 0.15, QX1 + 0.15, QR1 + 0.15)

# ---- the lift doors in the front wall, plants, light ------------------------------------------------------------
for (x, r) in ((1.6, 9.8), (20.4, 6.8), (6.4, 3.0), (15.2, 3.0)):
    k.cyl(x, r, 0.0, 0.42, 0.24, ('#1a1626', 0.06), 'planter', verts=12)
    P.houseplant(k, x, r, 0.42)
for x in (2.6, 6.4, 11.0, 15.6, 19.4):
    k.point_light(x, 6.5, 3.0, '#d8c8f0', 115, radius=0.8)
k.area_light(11.0, RF + 0.5, 2.0, '#7060d0', 160, 18.0, rot=(math.radians(-75), 0, 0))     # the city's glow through the glass
k.point_light(11.0, 9.6, 1.0, '#ffd8a0', 12, radius=0.3)                                     # by the lift

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=128, world_light=('#2a2448', 0.7))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Penthouse', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia', 'interior': True,
          'spawns': {'player': [10, 10]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-skypad', 'leaveSpawn': [11, 4], 'label': 'THE LIFT', 'prompt': 'PRESS E TO GO UP TO THE ROOF'}
    for (x, y) in DOORS] + [
    {'x': 4, 'y': 2, 'type': 'dialog', 'label': 'THE GLASS', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'skyline',
     'dialog': 'THE WHOLE CITY, AND YOU ABOVE IT. THE TRAFFIC LANES RUN LIKE RIVERS OF LIGHT BETWEEN THE TOWERS.'},
    {'x': 10, 'y': 6, 'type': 'dialog', 'label': 'THE LOUNGE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SOFA YOU COULD LOSE A PARTY IN, SUNK INTO THE FLOOR, FACING THE GLASS. ON THE TABLE, A CUP STILL WARM AND A TABLET THAT SAYS WELCOME HOME.'},
    {'x': 2, 'y': 5, 'type': 'dialog', 'label': 'THE BAR', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'EVERY BOTTLE THE CITY MAKES, AND A FEW IT DOESN\'T. THE DUCHESS SENT UP A CASE OF HALCYON \'01 "FOR THE NEW NEIGHBOUR."'},
    {'x': 18, 'y': 6, 'type': 'dialog', 'label': 'BED', 'prompt': 'PRESS E TO SLEEP', 'action': 'sleep',
     'dialog': 'YOU SLEEP ABOVE THE CITY, UNDER A PINK HALO, AND DREAM OF NOTHING AT ALL.'},
    {'x': 17, 'y': 7, 'type': 'dialog', 'label': 'THE POOL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A PLUNGE POOL, LIT FROM BELOW. THE WATER IS WARM AND SMELLS FAINTLY OF THE SEA ON LUMAR. SOMEBODY IMPORTED IT.'},
    {'x': 16, 'y': 2, 'type': 'dialog', 'label': 'THE GLASS', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'skyline',
     'dialog': 'THE NEON ROYALE\'S CROWN, LEVEL WITH YOUR WINDOW. FROM HERE THE WHALES LOOK LIKE ANYONE ELSE.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, scene_extra={
    'flicker': {'mode': 'pulse'},
    'sky': [WIN[0], round(RF - WIN[3] * C, 3), WIN[1], round(RF - WIN[2] * C, 3)]})
print('penthouse done')
