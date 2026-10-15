"""Fellhaven's ski hire, inside — Inge Brask's shop (world id "hoarfell-skihire").
Usage: BVENV/bin/python hoarfell_skihire.py RENDER_DIR

Log walls hung with skis, tips up, in every colour; the trail map; a
window on the range at alpenglow; a wall of boots on shelves behind the
counter, where Inge keeps the goggles in a glass case and the till; the
waxing bench with a ski in the vice and the iron warming; the outerwear
rail of quilted suits and a tall mirror (the Alpine Outfitters, js/gear.js);
a barrel of poles; the iron stove in the corner.
"""
import json
import math
import os
import sys

from _snow_room import A, H, Kit, N, alpenglow_window, log_room, shade  # noqa: F401
from _lumar_room import ROOT, apply_world

OUT = sys.argv[1]
WID = 'hoarfell-skihire'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 11
FLOOR = (1, 2, 14, 8)
DOORS = [(7, 9), (8, 9)]
SKI = ['#c83a2e', '#2a6ac0', '#e0b030', '#2a9a5a', '#e8e8f0', '#a040c0', '#f07830', '#1e1e26']

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=97)
log_room(k, 1, 2, 15, 9, door=(7.0, 9.0), floor='#7a5638')

# ---- the ski wall: pairs standing tips up against the logs, a rail holding them -----------------------------------------
x = 1.35
for i in range(8):
    c = SKI[i % len(SKI)]
    for dx in (0.0, 0.1):
        k.tube((x + dx, 2.62, 0.02), (x + dx, 2.28, 1.95), 0.032, (c, 0.12), 'ski', verts=4)
    k.box(x - 0.02, 2.5, 0.55, x + 0.12, 2.56, 0.66, ('#2a2a30', 0.1), 'binding')
    x += 0.52
k.box(1.2, 2.2, 1.45, 5.6, 2.4, 1.52, (N.LOG_D, 0.1), 'ski_rail')
k.solid(1.0, 2.0, 5.6, 3.0)

# the trail map: the three runs drawn on the mountain, the finish in red
k.box(5.75, 2.15, 0.9, 7.05, 2.21, 1.95, ('#3e2414', 0.12), 'map_frame')
k.box(5.82, 2.21, 0.97, 6.98, 2.23, 1.88, ('#e8eef6', 0.06), 'map_snow')
k.poly([(5.9, 2.235, 1.5), (6.4, 2.235, 1.86), (6.95, 2.235, 1.42)], ('#8a96cc', 0.06), 'map_peak')
for (col, pts) in (('#2a9a5a', [(6.62, 1.78), (6.8, 1.4), (6.72, 1.05)]), ('#2a6ac0', [(6.4, 1.84), (6.3, 1.45), (6.42, 1.05)]),
                   ('#1e1e26', [(6.3, 1.82), (6.05, 1.5), (6.18, 1.05)])):
    for a, b in zip(pts, pts[1:]):
        k.tube((a[0], 2.24, a[1]), (b[0], 2.24, b[1]), 0.018, col, 'map_run', verts=4)
k.box(6.2, 2.24, 1.0, 6.75, 2.25, 1.05, ('#d83a2e', 0.1), 'map_finish')

alpenglow_window(k, 8.6, w=1.2)

# ---- the counter and the boot wall behind it ------------------------------------------------------------------------------
for z in (0.45, 0.95, 1.45):
    k.box(10.0, 2.15, z - 0.05, 14.8, 2.5, z, (N.LOG_L, 0.1), 'boot_shelf')
    bx, i = 10.15, 0
    while bx < 14.5:
        c = ['#2a2a30', '#c83a2e', '#e8e8f0', '#2a6ac0', '#e0b030'][(i + int(z * 4)) % 5]
        for dx in (0.0, 0.17):
            k.box(bx + dx, 2.2, z, bx + dx + 0.14, 2.45, z + 0.28, (c, 0.1), 'boot', bevel=0.02)
            k.box(bx + dx, 2.3, z + 0.02, bx + dx + 0.14, 2.47, z + 0.08, ('#1a1a20', 0.1), 'boot_buckle')
        bx += 0.48
        i += 1
k.solid(9.5, 2.0, 15.0, 4.0)                                               # behind the counter is Inge's
A.bar_counter(k, 9.6, 14.8, 4.2, 4.75, height=0.98)
k.box(10.0, 4.3, 0.98, 11.6, 4.7, 1.24, '#101828', 'goggle_case', emit=('#2a4a6a', 0.35))
for i, c in enumerate(('#ff8a30', '#40c8d8', '#e8c040', '#c040a0', '#80e080')):
    gx = 10.15 + i * 0.29
    k.blob(gx + 0.1, 4.5, 1.08, 0.11, 0.05, 0.05, (c, 0.05), 'goggles', emit=(c, 0.5), segs=8)
k.box(12.6, 4.35, 0.98, 13.2, 4.7, 1.22, ('#3a3a44', 0.1), 'till', bevel=0.02)
k.box(12.65, 4.6, 1.15, 13.15, 4.72, 1.2, '#0c2018', 'till_screen', emit=('#40e080', 0.6))
k.cyl(14.0, 4.5, 0.98, 1.03, 0.07, ('#d0a048', 0.25), 'bell', verts=10)
k.sphere(14.0, 4.5, 1.05, 0.05, 0.05, ('#d0a048', 0.25), 'bell')
k.box(13.4, 4.3, 0.98, 13.85, 4.7, 1.0, ('#f4ecd8', 0.08), 'rental_book')

# ---- the waxing bench: a ski in the vice, the iron, blocks of wax ---------------------------------------------------------
k.box(2.9, 5.0, 0.78, 5.6, 5.6, 0.86, (N.LOG_L, 0.12), 'wax_bench', bevel=0.02)
for (bx, br) in ((3.0, 5.1), (5.4, 5.1), (3.0, 5.45), (5.4, 5.45)):
    k.box(bx, br, 0.0, bx + 0.1, br + 0.1, 0.78, (N.LOG_D, 0.12), 'bench_leg')
for vx in (3.3, 5.1):
    k.box(vx - 0.08, 5.15, 0.86, vx + 0.08, 5.45, 1.0, ('#3a3a44', 0.1), 'vice')
k.box(2.75, 5.24, 0.98, 5.75, 5.36, 1.02, ('#2a6ac0', 0.12), 'waxed_ski')
k.box(4.0, 5.2, 1.02, 4.35, 5.38, 1.1, ('#c83a2e', 0.12), 'wax_iron', bevel=0.02)
k.tube((4.05, 5.29, 1.1), (4.3, 5.29, 1.16), 0.02, '#1a1a20', 'wax_iron_handle', verts=6)
for i, c in enumerate(('#e04090', '#40a0e0', '#e0e040')):
    k.box(4.6 + i * 0.16, 5.12, 0.86, 4.72 + i * 0.16, 5.24, 0.92, (c, 0.1), 'wax_block')
k.solid(2.9, 5.0, 5.6, 5.6)

# ---- the outerwear rail and the mirror ---------------------------------------------------------------------------------------
for px in (1.35, 3.75):
    k.cyl(px, 7.35, 0.0, 1.65, 0.035, '#3a3a44', 'rail_post', verts=6)
k.cyl_x(1.35, 3.75, 7.35, 1.62, 0.03, 0.03, '#5a5a66', 'rail', verts=6)
for i, c in enumerate(('#e06a20', '#1a8a8a', '#b82a2e', '#6a3aa0', '#d8a020', '#2a4a8a')):
    sx = 1.6 + i * 0.36
    k.box(sx - 0.15, 7.27, 0.62, sx + 0.15, 7.43, 1.5, (c, 0.12), 'suit', bevel=0.04)
    for zq in (0.85, 1.1, 1.35):
        k.box(sx - 0.15, 7.43, zq, sx + 0.15, 7.44, zq + 0.02, shade(c, 0.7), 'suit_quilt')
    k.cyl(sx, 7.35, 1.5, 1.6, 0.015, '#8a8a94', 'hanger', verts=4)
k.solid(1.2, 7.0, 3.9, 7.7)
k.box(4.35, 7.25, 0.0, 5.05, 7.45, 0.06, ('#3e2414', 0.12), 'mirror_foot')
k.box(4.4, 7.32, 0.06, 5.0, 7.4, 1.95, ('#5e3b1e', 0.12), 'mirror_frame')
k.box(4.48, 7.4, 0.14, 4.92, 7.42, 1.87, '#6a7a90', 'mirror_glass', emit=('#a8c0d8', 0.35))
k.box(4.52, 7.42, 1.2, 4.6, 7.43, 1.7, '#e8f0f8', 'mirror_glint', emit=('#ffffff', 0.5))
k.solid(4.35, 7.2, 5.05, 7.5)

# ---- the stove, a barrel of poles, a bench to pull boots on, a rug ----------------------------------------------------------
SX, SR = 13.9, 7.6
k.cyl(SX, SR, 0.0, 0.85, 0.36, ('#2a2a30', 0.14), 'stove', verts=16)
k.cyl(SX, SR, 0.85, 0.92, 0.4, ('#3a3a44', 0.14), 'stove_top', verts=16)
k.cyl(SX, SR, 0.92, H + 0.2, 0.08, ('#2a2a30', 0.14), 'stove_pipe', verts=10)
k.box(SX - 0.16, SR + 0.33, 0.2, SX + 0.16, SR + 0.37, 0.5, '#2a1008', 'stove_door', emit=('#ff7a20', 1.0))
k.point_light(SX, SR + 0.6, 0.4, '#ff9a40', 45, radius=0.2, group='flicker')
k.solid(13.4, 7.1, 14.4, 8.1)
N.woodpile(k, 12.2, 13.0, 7.9)
A.barrel(k, 14.3, 5.6, h=0.7, radius=0.28)
k.solid(14.0, 5.3, 14.6, 5.9)
for i in range(7):
    a = i * 0.9
    k.tube((14.3 + math.cos(a) * 0.12, 5.6 + math.sin(a) * 0.08, 0.6), (14.3 + math.cos(a) * 0.26, 5.6 + math.sin(a) * 0.14, 1.65),
           0.015, (SKI[i % len(SKI)], 0.12), 'pole', verts=5)
A.bench(k, 9.8, 11.6, 6.9)
A.rug(k, 6.4, 7.4, 9.6, 8.8, col='#2a5a8a')

# ---- light -------------------------------------------------------------------------------------------------------------------
A.hanging_lamp(k, 4.0, 4.6, energy=110, visible=False)
A.hanging_lamp(k, 11.8, 5.6, energy=110, visible=False)
A.hanging_lamp(k, 8.0, 7.6, energy=60, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128, world_light=('#5a6488', 0.5))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Brask\'s Ski Hire', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [7, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'hoarfell', 'leaveSpawn': [30, 14], 'label': 'FELLHAVEN', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 10, 'y': 4, 'type': 'vendor', 'label': 'COUNTER', 'prompt': 'PRESS E TO SHOP',
     'items': [{'id': 'skis', 'price': 120}, {'id': 'ski_goggles', 'price': 40}, {'id': 'hot_cocoa', 'price': 8}]},
    {'x': 12, 'y': 4, 'type': 'dialog', 'label': 'INGE', 'prompt': 'PRESS E TO TALK',
     'dialog': 'INGE BRASK LOOKS UP FROM A BINDING SHE\'S ADJUSTING WITH A SCREWDRIVER IN HER TEETH. "SKIS? GOGGLES? WAX? ALL THREE. TRUST ME."'},
    {'x': 4, 'y': 5, 'type': 'ski_wax', 'label': 'WAX BENCH', 'prompt': 'PRESS E TO WAX YOUR SKIS'},
    {'x': 2, 'y': 7, 'type': 'dialog', 'label': 'OUTERWEAR', 'prompt': 'PRESS E TO BROWSE', 'dialog': 'QUILTED SUITS ON A RAIL.'},
    {'x': 4, 'y': 7, 'type': 'dialog', 'label': 'MIRROR', 'prompt': 'PRESS E TO CHANGE', 'dialog': 'A TALL MIRROR.'},
    {'x': 13, 'y': 7, 'type': 'lodge_fire', 'label': 'STOVE', 'prompt': 'PRESS E TO WARM UP'},
    {'x': 6, 'y': 2, 'type': 'dialog', 'label': 'TRAIL MAP', 'prompt': 'PRESS E TO READ',
     'dialog': 'THE MOUNTAIN IN PEN AND INK. GREEN: THE NURSERY SLOPE, BROAD AND KIND. BLUE: PINEWOOD, THROUGH THE TREES. BLACK: THE COULOIR, "EXPERTS ONLY, AND NOT ALL OF THEM." SOMEONE HAS ADDED THE PARK IN PENCIL, WITH A SMILEY FACE.'},
    {'x': 3, 'y': 2, 'type': 'dialog', 'label': 'SKI WALL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'PAIRS OF SKIS IN EVERY COLOUR, TIPS UP, EACH WITH A PAPER TAG: A NAME, A LENGTH, A NOTE. "BENT. DO NOT HIRE TO TOURISTS." "LIV\'S. DO NOT TOUCH. SERIOUSLY."'},
    {'x': 8, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE CHAIRLIFT CLIMBING INTO THE PINK, AND THE PISTES LAID OUT UNDER IT LIKE CORDUROY.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-inge', 'x': 12, 'y': 3, 'facing': 'down'},
])
print('ski hire done')
