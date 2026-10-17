"""A mountain hut on the High Route (js/touring.js): one room for the night, used by both huts — the Cabane Bleue at
the head of the Aurelle Glacier (world "hoarfell-hut-bleue") and the Refuge du Col below the Col du Vent ("hoarfell-hut-col").
Usage: BVENV/bin/python hoarfell_hut.py RENDER_DIR   (scene id "hoarfell-hut")

Log walls, a low room smelling of soup and wet wool: the warden's stove with the pot on it and her shelf of tins; a
long table with benches and a candle in a bottle; the bunks along the back wall, two tiers of mattresses under grey
and red blankets; boots and skins drying on a rack by the stove; ropes, harnesses and ice axes on pegs; the hut book
on its shelf; a small window onto the glacier going pink.
"""
import json
import math
import os
import sys

from _snow_room import A, H, Kit, N, alpenglow_window, log_room, shade  # noqa: F401
from _lumar_room import ROOT, apply_world

OUT = sys.argv[1]
SID = 'hoarfell-hut'
COLS, ROWS = 18, 12
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=313)
log_room(k, 1, 2, 17, 10, door=(8.0, 10.0), floor='#6a4a30')

# ---- the bunks along the back wall: two tiers, mattresses, blankets, a ladder ---------------------------------------------------
BX0, BX1 = 1.1, 8.6
for z in (0.42, 1.32):
    k.box(BX0, 2.1, z - 0.08, BX1, 3.5, z, (N.LOG_L, 0.1), 'bunk')
    k.box(BX0, 3.4, z - 0.25, BX1, 3.5, z + 0.12, (N.LOG_D, 0.1), 'bunk_edge')
    x, i = BX0 + 0.08, 0
    while x < BX1 - 0.6:
        c = ('#7a7e88', '#a83a2e', '#5a6a7a', '#8a5a3a')[(i + int(z * 3)) % 4]
        k.box(x, 2.18, z, x + 0.66, 3.38, z + 0.1, ('#e8e0d0', 0.08), 'mattress', bevel=0.02)
        k.box(x + 0.02, 2.6, z + 0.1, x + 0.64, 3.36, z + 0.17, (c, 0.12), 'blanket', bevel=0.02)
        k.box(x + 0.08, 2.22, z + 0.1, x + 0.58, 2.48, z + 0.2, ('#f0ece4', 0.08), 'pillow', bevel=0.03)
        x += 0.74
        i += 1
for px in (BX0 + 0.05, BX1 - 0.1):
    k.box(px, 3.38, 0.0, px + 0.1, 3.5, 1.9, (N.LOG_D, 0.1), 'bunk_post')
for j in range(5):                                                 # the ladder up to the top tier
    k.box(8.0, 3.52, 0.25 + j * 0.27, 8.5, 3.58, 0.29 + j * 0.27, (N.LOG_L, 0.1), 'ladder')
for xx in (8.0, 8.46):
    k.box(xx, 3.5, 0.0, xx + 0.04, 3.6, 1.6, (N.LOG_D, 0.1), 'ladder')
k.solid(1.0, 2.0, 8.7, 3.6)

alpenglow_window(k, 11.0, w=1.0)

# ---- the warden's corner: the stove, the pot, her shelf of tins --------------------------------------------------------------
SX, SR = 14.6, 3.2
k.box(SX - 0.6, SR - 0.45, 0.0, SX + 0.6, SR + 0.45, 0.82, ('#2a2a30', 0.14), 'stove', bevel=0.03)
k.box(SX - 0.64, SR - 0.49, 0.82, SX + 0.64, SR + 0.49, 0.88, ('#3a3a44', 0.14), 'stove_top')
k.box(SX - 0.3, SR + 0.43, 0.18, SX + 0.3, SR + 0.47, 0.5, '#2a1008', 'stove_door', emit=('#ff7a20', 1.0))
k.cyl(SX + 0.4, SR - 0.2, 0.88, H + 0.2, 0.08, ('#2a2a30', 0.14), 'stove_pipe', verts=10)
k.cyl(SX - 0.2, SR, 0.88, 1.18, 0.24, ('#8a8e98', 0.1), 'pot', verts=14)
k.cyl(SX - 0.2, SR, 1.17, 1.19, 0.21, ('#c87a30', 0.1), 'soup', verts=14)
k.point_light(SX, SR + 0.7, 0.4, '#ff9a40', 50, radius=0.2, group='flicker')
k.solid(SX - 0.7, SR - 0.5, SX + 0.7, SR + 0.5)
A.open_shelves(k, 15.6, 16.9, 2.1, top=1.9, levels=(0.5, 0.95, 1.4), depth=0.3)
for i in range(9):
    k.cyl(15.75 + (i % 3) * 0.4, 2.3, 0.5 + (i // 3) * 0.45, 0.72 + (i // 3) * 0.45, 0.08,
          (('#c83a2e', '#e0b030', '#2a6ac0')[i % 3], 0.1), 'tin', verts=8)
k.solid(15.5, 2.0, 17.0, 2.6)
# the boot rack by the stove: boots upside down on pegs, skins hung to dry
k.box(12.2, 4.6, 0.0, 13.4, 4.75, 1.2, (N.LOG_D, 0.1), 'boot_rack')
for i in range(4):
    c = ('#2a2a30', '#b83a2e', '#2a4a8a', '#e0b030')[i]
    k.box(12.3 + i * 0.28, 4.75, 0.7, 12.5 + i * 0.28, 4.95, 1.05, (c, 0.1), 'boot', bevel=0.02)
for i in range(3):
    k.box(12.3 + i * 0.36, 4.78, 0.05, 12.58 + i * 0.36, 4.82, 0.65, ('#c83a6a' if i == 1 else '#3a3a44', 0.1), 'skin')
k.solid(12.1, 4.5, 13.5, 4.9)

# ---- the long table and its benches ----------------------------------------------------------------------------------------
TX0, TX1, TR = 4.0, 9.6, 6.4
k.box(TX0, TR - 0.45, 0.72, TX1, TR + 0.45, 0.8, (N.LOG_L, 0.1), 'table_top', bevel=0.02)
for xx in (TX0 + 0.3, TX1 - 0.4):
    k.box(xx, TR - 0.35, 0.0, xx + 0.1, TR + 0.35, 0.72, (N.LOG_D, 0.1), 'table_leg')
for rr in (TR - 0.9, TR + 0.9):
    A.bench(k, TX0, TX1, rr)
for (x, food) in ((5.0, '#c87a30'), (6.6, '#e8d8b0'), (8.4, '#c87a30')):
    A.plate(k, x, TR - 0.15, 0.8, food=food)
    A.mug(k, x + 0.4, TR + 0.1, 0.8)
k.cyl(7.0, TR, 0.8, 1.05, 0.06, ('#2a5a3a', 0.08), 'bottle', verts=8)
A.candle(k, 7.0, TR, 1.05, energy=3)
A.stack = None
k.solid(TX0, TR - 0.5, TX1, TR + 0.5)

# ---- pegs: ropes, harnesses, axes; the hut book; a radio -----------------------------------------------------------------------
k.box(1.2, 8.3, 1.4, 1.4, 9.8, 1.48, (N.LOG_D, 0.1), 'peg_rail')
for i, c in enumerate(('#e0b030', '#2a6ac0', '#c83a2e')):
    rr = 8.5 + i * 0.45
    for j in range(6):
        a = j / 6 * math.tau
        k.tube((1.42, rr + math.cos(a) * 0.14, 1.2 + math.sin(a) * 0.14), (1.42, rr + math.cos(a + 1.05) * 0.14, 1.2 + math.sin(a + 1.05) * 0.14),
               0.025, (c, 0.1), 'rope', verts=5)
k.box(1.3, 7.0, 1.6, 1.5, 7.9, 1.66, (N.LOG_L, 0.1), 'shelf')
k.box(1.35, 7.1, 1.66, 1.5, 7.5, 1.74, ('#6a2a2a', 0.1), 'hut_book')
k.box(1.35, 7.55, 1.66, 1.5, 7.85, 1.92, ('#3a3c44', 0.1), 'radio', bevel=0.02)
k.box(1.48, 7.6, 1.8, 1.5, 7.8, 1.86, '#0a1a10', 'radio_dial', emit=('#60e090', 0.6))
for (x, r) in ((2.0, 8.2),):
    k.tube((x, r, 0.0), (x + 0.1, r - 0.1, 1.0), 0.025, ('#8a8e98', 0.1), 'axe_shaft', verts=5)
    k.box(x - 0.05, r - 0.18, 0.95, x + 0.25, r - 0.02, 1.05, ('#c8ccd4', 0.1), 'axe_head')
k.solid(1.0, 6.8, 1.8, 9.9)
A.rug(k, 9.8, 6.0, 12.4, 8.4, col='#7a3a2a')

# ---- light ------------------------------------------------------------------------------------------------------------------
A.hanging_lamp(k, 6.8, 6.4, energy=120, visible=True)
A.hanging_lamp(k, 13.0, 5.6, energy=70, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=int(os.environ.get('SAMPLES', 128)),
         world_light=('#5a6488', 0.5))

# ---- the two huts' worlds ---------------------------------------------------------------------------------------------------
HUTS = {
    'hoarfell-hut-bleue': {'name': 'The Cabane Bleue', 'out': 'hoarfell-glacier', 'outSpawn': [8, 6], 'warden': 'ODILE',
                           'next': 'hoarfell-col', 'nextLabel': 'ON TO THE COL'},
    'hoarfell-hut-col': {'name': 'The Refuge du Col', 'out': 'hoarfell-col', 'outSpawn': [24, 37], 'warden': 'BRAM',
                         'next': 'hoarfell-valley', 'nextLabel': 'DOWN TO THE VALLEY'},
}
for wid, h in HUTS.items():
    path = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', wid + '.json')
    w = json.load(open(path)) if os.path.exists(path) else {}
    w.update({'name': h['name'], 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
              'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
              'shipExit': False, 'cold': False, 'indoors': True, 'touring': {'hut': wid}})
    w['interactions'] = [
        {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': h['out'], 'leaveSpawn': h['outSpawn'], 'label': 'OUTSIDE', 'prompt': 'PRESS E TO GO OUT'}
        for (x, y) in DOORS] + [
        {'x': 14, 'y': 4, 'type': 'dialog', 'label': h['warden'], 'prompt': 'PRESS E TO TALK', 'dialog': 'THE WARDEN WIPES HER HANDS.' if h['warden'] == 'ODILE' else 'THE WARDEN WIPES HIS HANDS.'},
        {'x': 13, 'y': 4, 'type': 'touring', 'action': 'soup', 'label': 'THE POT', 'prompt': 'PRESS E FOR SOUP'},
        {'x': 4, 'y': 3, 'type': 'touring', 'action': 'bunk', 'label': 'BUNKS', 'prompt': 'PRESS E TO SLEEP'},
        {'x': 2, 'y': 7, 'type': 'touring', 'action': 'book', 'label': 'HUT BOOK', 'prompt': 'PRESS E TO READ'},
        {'x': 2, 'y': 8, 'type': 'touring', 'action': 'radio', 'label': 'RADIO', 'prompt': 'PRESS E TO LISTEN'},
        {'x': 13, 'y': 3, 'type': 'lodge_fire', 'label': 'STOVE', 'prompt': 'PRESS E TO WARM UP'},
        {'x': 11, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
         'dialog': 'THE GLACIER GOING PINK, THEN BLUE, THEN GONE. ONE LIGHT, VERY FAR OFF: AURELLE.'},
    ]
    open(path, 'w').write(json.dumps(w, indent=2) + '\n')
    k.solid(14, 3, 15, 4)
    apply_world(path, k, FLOOR, doors=DOORS, scene_id=SID, actors=[{'sheet': 'npc-hut-' + h['warden'].lower(), 'x': 14, 'y': 3, 'facing': 'down'}])
print('hut done')
