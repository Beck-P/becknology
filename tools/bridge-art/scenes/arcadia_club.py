"""Club Void — the club behind the velvet rope on the District street (world
id "arcadia-club"). Usage: BVENV/bin/python arcadia_club.py RENDER_DIR

A black box of a room under VOID in neon tubes: the DJ on a riser at the
back between two stacks of speakers, Kiri on the decks; an LED dance floor
of dark glass tiles in the middle (js/dance.js lights them to the beat and
runs the dance); the bar on the left with its wall of lit bottles and Dez
behind it; two booths on the right with low tables; a mirror ball over the
floor; dancers. The floor tiles are dark on purpose — the light is drawn
live.
"""
import math
import sys
from _cyber_room import Y, A, P, new_kit, render, apply_world, world_path  # noqa: F401
from scenekit import Kit, THETA
import assets_signs as S
import json
import os

WID = 'arcadia-club'
WORLD = world_path(WID)
COLS, ROWS = 18, 12
H = 2.6 / math.cos(THETA)
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]
DF = (6, 5, 12, 9)            # the dance floor: tiles x 6..11, rows 5..8

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=4404)
Y.cyber_room(k, 1, 2, 17, 10, H, door=(8.0, 10.0), floor_tones=('#120c1c', '#18101f'), top_neon=Y.PURP, base_neon=Y.PINK)

# ---- the dance floor: dark glass tiles in a steel grid ---------------------------------------------------------
for x in range(DF[0], DF[2]):
    for r in range(DF[1], DF[3]):
        k.box(x + 0.04, r + 0.04, 0.0, x + 0.96, r + 0.96, 0.03, ('#140c20', 0.02), 'led_tile')
k.box(DF[0] - 0.06, DF[1] - 0.06, -0.01, DF[2] + 0.06, DF[3] + 0.06, 0.02, ('#3a3a4a', 0.06), 'floor_grid')

# ---- the DJ: a riser, the decks, the stacks, VOID in neon over it all ------------------------------------------
k.box(6.2, 2.0, 0.0, 11.8, 4.0, 0.4, ('#1a1424', 0.08), 'riser', bevel=0.02)
k.box(6.2, 3.96, 0.05, 11.8, 4.0, 0.3, '#200818', 'riser_led', emit=(Y.CYAN, 0.8))
k.box(7.4, 3.0, 0.4, 10.6, 3.6, 1.25, ('#24202c', 0.06), 'deck_table', bevel=0.02)
k.box(7.38, 3.58, 0.5, 10.62, 3.62, 1.15, '#140a1c', 'deck_front', emit=(Y.PINK, 0.35))
for x in (8.0, 10.0):
    k.cyl(x, 3.3, 1.25, 1.29, 0.28, ('#0e0e14', 0.05), 'turntable', verts=18)
    k.cyl(x, 3.3, 1.29, 1.3, 0.05, ('#c8c8d0', 0.05), 'spindle', verts=8)
k.box(8.7, 3.15, 1.25, 9.3, 3.5, 1.3, ('#2a2a34', 0.06), 'mixer')
for i in range(5):
    k.box(8.75 + i * 0.11, 3.2, 1.3, 8.8 + i * 0.11, 3.45, 1.31, '#100808', 'fader', emit=((Y.CYAN, Y.PINK, Y.YEL, Y.PINK, Y.CYAN)[i], 0.9))
for x0 in (4.8, 12.0):
    k.box(x0, 2.1, 0.0, x0 + 1.2, 3.2, 2.5, ('#14121a', 0.08), 'speaker', bevel=0.03)
    for (z, rad) in ((0.55, 0.42), (1.45, 0.42), (2.15, 0.2)):
        k.cyl_y(x0 + 0.6, 3.2, 3.24, z, rad, rad, ('#24222c', 0.05), 'cone', verts=18)
        k.cyl_y(x0 + 0.6, 3.24, 3.26, z, rad * 0.35, rad * 0.35, ('#3a3a48', 0.05), 'dust_cap', verts=12)
k.solid(4.8, 2.0, 13.2, 4.0)
S.neon(k, 'VOID', 'Monoton', 9.0, 2.02, 2.45, size=0.8, col=Y.PURP, tube=0.024, energy=18)
# the mirror ball, hanging over the floor
k.tube((9.0, 4.6, 3.6), (9.0, 4.6, 3.0), 0.01, ('#3a3a48', 0.05), 'ball_wire', verts=4)
k.sphere(9.0, 4.6, 2.75, 0.26, 0.26, ('#c8d0e0', 0.02), 'mirror_ball', segs=10)

# ---- the bar: a lit wall of bottles, the counter, stools ------------------------------------------------------
k.box(1.2, 2.0, 0.9, 4.6, 2.3, 2.3, ('#14101c', 0.06), 'bottle_wall')
for z in (1.15, 1.6, 2.05):
    k.box(1.3, 2.2, z - 0.03, 4.5, 2.42, z, '#20102a', 'bottle_shelf', emit=(Y.PINK, 0.5))
    for i in range(12):
        col = (Y.CYAN, Y.YEL, Y.GREEN, Y.PINK, Y.PURP, '#f09040')[(i * 7 + int(z * 10)) % 6]
        k.cyl(1.45 + i * 0.27, 2.3, z, z + 0.26 + (i % 3) * 0.04, 0.05, (col, 0.05), 'bottle', emit=(col, 0.35), verts=6)
k.box(1.2, 3.7, 0.0, 4.9, 4.25, 1.05, ('#1a1424', 0.06), 'bar', bevel=0.02)
k.box(1.15, 3.65, 1.05, 4.95, 4.3, 1.12, ('#2e2a3a', 0.04), 'bar_top')
k.box(1.2, 4.24, 0.12, 4.9, 4.26, 0.95, '#100818', 'bar_front', emit=(Y.CYAN, 0.3))
for (x, col) in ((1.9, Y.CYAN), (3.3, Y.YEL), (4.4, Y.PINK)):
    k.cyl(x, 3.95, 1.12, 1.3, 0.05, (col, 0.05), 'glass', emit=(col, 0.4), verts=8)
k.solid(1, 3, 5, 4)
for x in (1.8, 3.0, 4.2):
    Y.neon_stool(k, x, 4.9, seat=Y.PINK_D)

# ---- the booths on the right ---------------------------------------------------------------------------------
for r0 in (3.0, 6.4):
    k.box(13.4, r0, 0.0, 16.8, r0 + 0.45, 1.15, ('#3a1040', 0.1), 'booth_back', bevel=0.04)
    k.box(13.4, r0 + 0.45, 0.0, 16.8, r0 + 1.0, 0.45, ('#4a1850', 0.1), 'booth_seat', bevel=0.04)
    k.box(16.3, r0 + 0.45, 0.0, 16.8, r0 + 2.0, 0.7, ('#3a1040', 0.1), 'booth_arm', bevel=0.04)
    Y.cafe_table(k, 14.9, r0 + 1.6, neon=Y.CYAN)
    k.box(13.4, r0 + 0.43, 1.1, 16.8, r0 + 0.47, 1.16, '#200818', 'booth_led', emit=(Y.PURP, 0.6))
    k.solid(13.4, r0, 16.8, r0 + 1.0)
    k.solid(16.3, r0, 16.8, r0 + 2.0)
# a velvet rope by the booths
for r in (8.6,):
    for x in (13.4, 16.6):
        k.cyl(x, r, 0.0, 0.9, 0.05, ('#c8a050', 0.05), 'rope_post', verts=8)
    k.tube((13.4, r, 0.8), (15.0, r, 0.6), 0.03, ('#a01830', 0.1), 'rope', verts=6)
    k.tube((15.0, r, 0.6), (16.6, r, 0.8), 0.03, ('#a01830', 0.1), 'rope', verts=6)
k.solid(13, 8, 17, 9)

# ---- light: the room dark, coloured light from the rig -----------------------------------------------------------
for (x, r, z, col, e) in ((6.0, 4.4, 2.6, Y.PINK, 26), (12.0, 4.4, 2.6, Y.CYAN, 26), (9.0, 7.6, 2.8, Y.PURP, 30),
                          (3.0, 5.0, 2.2, '#ff9050', 14), (15.0, 5.0, 2.2, Y.PURP, 14), (9.0, 3.4, 1.8, Y.CYAN, 10)):
    k.point_light(x, r, z, col, e, radius=0.4, group='flicker')
render(k, sys.argv[1], ambient=('#1a1030', 0.4))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Club Void', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'interior': True,
          'club': {'floor': list(DF), 'ball': [9.0, round(4.6 - 2.75 * math.cos(THETA), 3)]}})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-street', 'leaveSpawn': [41, 8], 'label': 'THE STREET', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 9, 'y': 6, 'type': 'dance', 'label': 'DANCE FLOOR', 'prompt': 'PRESS E TO DANCE'},
    {'x': 9, 'y': 3, 'type': 'dialog', 'label': 'KIRI', 'prompt': 'PRESS E TO TALK', 'dialog': 'KIRI NODS WITHOUT LOOKING UP FROM THE DECKS.'},
    {'x': 2, 'y': 3, 'type': 'vendor', 'label': 'BAR', 'prompt': 'PRESS E TO ORDER', 'items': [{'id': 'void_fizz', 'price': 6}, {'id': 'mug_of_ale', 'price': 8}]},
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'DEZ', 'prompt': 'PRESS E TO TALK', 'dialog': 'DEZ SLIDES A GLASS DOWN THE BAR TO SOMEONE ELSE.'},
    {'x': 14, 'y': 4, 'type': 'dialog', 'label': 'BOOTH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A BOOTH IN PURPLE VELVET, A TABLE RINGED IN LIGHT. SOMEONE HAS SCRATCHED INTO THE TABLETOP: NULL WAS HERE. AND UNDER IT, NEWER: SO WAS VEX.'},
    {'x': 9, 'y': 4, 'type': 'dialog', 'label': 'MIRROR BALL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A THOUSAND LITTLE SQUARES OF MIRROR, TURNING SLOWLY, THROWING THE ROOM AROUND ITSELF.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
DANCERS = [('npc-patron-a', 7, 7, 'up'), ('npc-patron-b', 11, 6, 'left'), ('npc-passerby', 10, 8, 'up'), ('npc-shopper', 6, 5, 'right')]
for (sheet, x, y, f) in DANCERS:
    k.solid(x, y, x + 1, y + 1)
k.solid(9, 3, 10, 4)
k.solid(3, 3, 4, 4)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID,
            actors=[{'sheet': 'npc-dj', 'x': 9, 'y': 3, 'facing': 'down'}, {'sheet': 'npc-mixer', 'x': 3, 'y': 2, 'facing': 'down'}] +
                   [{'sheet': s, 'x': x, 'y': y, 'facing': f, 'dance': True} for (s, x, y, f) in DANCERS])
print('club void done')
