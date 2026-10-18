"""The Sapphire Glassworks (world id "lumar-sapphire-glassworks"), off the floating market's quay. Workstream B1.
Usage: BVENV/bin/python lumar_sapphire_glassworks.py RENDER_DIR

The hall under the brick cone. At the back the great furnace, its glory holes glowing white-orange, the cone's throat
going up into the dark over it; the blowers' benches with their long arms either side, pipes racked on the wall, the
marvering slab, buckets of water steaming; down the east side the lehr where the work cools for a day and a night;
shelves of finished blue glass by the door, floats in nets, lamp chimneys, a bowl being argued over. The master at the
furnace, a blower at her bench. Take the pipe (`glassblow`, js/sapphire.js) and blow something of your own.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_town as W  # noqa: E402

OUT = sys.argv[1]
WID = 'lumar-sapphire-glassworks'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 12
H = 2.6 / math.cos(THETA)
FLOOR = (1, 3, 14, 9)
DOORS = [(7, 10), (8, 10)]
BRICK = '#8a5440'

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=3317)
A.room(k, 1, 3, 15, 10, H, door=(7.0, 9.0), floor='flags', floor_tone='#5a5650', plaster='#7a4a3a', wainscot=0,
       beams_every=0, stone=True)
rng = k.rng

# ---- the furnace at the back: a brick beehive with three glory holes, the cone's throat over it ---------------------
FX, FR = 8.0, 3.0
k.box(FX - 2.6, FR - 1.0, 0.0, FX + 2.6, FR + 0.55, 1.5, (BRICK, 0.2), 'furnace_brick', bevel=0.06)
k.sphere(FX, FR - 0.2, 1.4, 2.4, 1.1, (shade(BRICK, 0.92), 0.2), 'furnace_dome', ry=0.8, segs=20)
zz, i = 0.05, 0
while zz < 1.45:                                              # its brick courses
    xx = FX - 2.6 + (0.0 if i % 2 else 0.12)
    rects = []
    while xx < FX + 2.55:
        rects.append((xx + 0.01, FR + 0.54, zz + 0.01, min(FX + 2.6, xx + 0.24) - 0.01, FR + 0.57, zz + 0.1))
        xx += 0.25
    k.boxes(rects, (shade('#9a6450', 1.0 + 0.07 * ((i * 5) % 3 - 1)), 0.2), 'brick')
    zz += 0.11
    i += 1
for dx in (-1.5, 0.0, 1.5):                                  # the glory holes, white-hot
    k.cyl_y(FX + dx, FR + 0.5, FR + 0.6, 0.85, 0.3, 0.3, '#1a0a04', 'glory_rim', verts=16)
    k.cyl_y(FX + dx, FR + 0.52, FR + 0.62, 0.85, 0.22, 0.22, '#3a1206', 'glory_hole', emit=('#ffb050', 1.0), verts=14)
    k.point_light(FX + dx, FR + 1.0, 0.85, '#ff9a40', 70, radius=0.25, group='flicker')
k.cone(FX, FR - 0.4, 2.2, H + 0.6, 1.4, 0.8, ('#6a3a2c', 0.25), 'cone_throat', verts=20)
k.point_light(FX, FR + 2.0, 1.4, '#ff8a30', 120, radius=0.6, group='flicker')
k.solid(FX - 2.7, 1.9, FX + 2.7, FR + 0.6)

# ---- the benches: a seat with long flat arms for rolling the pipe, a bucket, the tools ------------------------------
def bench(cx, cr):
    k.box(cx - 0.35, cr - 0.25, 0.0, cx + 0.35, cr + 0.25, 0.45, (A.WOOD_D, 0.15), 'bench_seat')
    for dr in (-0.32, 0.32):
        k.box(cx - 0.9, cr + dr - 0.05, 0.6, cx + 0.9, cr + dr + 0.05, 0.68, (A.WOOD, 0.15), 'bench_arm')
        for dx in (-0.8, 0.8):
            k.box(cx + dx - 0.04, cr + dr - 0.04, 0.0, cx + dx + 0.04, cr + dr + 0.04, 0.6, A.WOOD_D, 'bench_leg')
    k.tube((cx - 1.1, cr, 0.72), (cx + 0.6, cr, 0.72), 0.025, '#4a4a52', 'blowpipe', verts=6)
    k.sphere(cx + 0.66, cr, 0.72, 0.13, 0.12, '#3a1006', 'gather', emit=('#ff8a30', 0.9), segs=10)
    k.cyl(cx - 0.5, cr + 0.55, 0.0, 0.3, 0.2, ('#6a4a2a', 0.2), 'bucket', verts=12)
    k.cyl(cx - 0.5, cr + 0.55, 0.27, 0.29, 0.17, '#2a3a4a', 'basin_water', verts=12)
    k.solid(cx - 0.9, cr - 0.4, cx + 0.9, cr + 0.6)


bench(4.0, 5.4)
bench(12.0, 5.4)
# the marvering slab: an iron-topped table, polished
k.box(7.0, 6.2, 0.0, 9.0, 7.0, 0.72, ('#3a3a40', 0.2), 'marver_base', bevel=0.03)
k.box(6.95, 6.15, 0.72, 9.05, 7.05, 0.8, ('#8a8e98', 0.06), 'marver_top', bevel=0.02)
k.solid(7, 6, 9, 7)

# ---- pipes racked on the west wall, the lehr down the east side ----------------------------------------------------
for i in range(9):
    x = 1.3 + i * 0.12
    k.tube((x, 3.15, 0.1), (x + 0.05, 3.15, 2.2), 0.02, '#4a4a52', 'blowpipe', verts=5)
k.box(1.1, 3.05, 1.9, 2.5, 3.25, 1.98, A.WOOD_D, 'pipe_rack')
k.box(13.2, 6.2, 0.0, 14.9, 9.6, 1.0, (BRICK, 0.2), 'lehr', bevel=0.04)
k.box(13.15, 6.4, 0.25, 13.22, 9.4, 0.75, '#2a1006', 'lehr_glow', emit=('#ff7a30', 0.35))
for i in range(5):                                          # the work cooling inside, glimpsed through its hatch
    k.sphere(13.3, 6.8 + i * 0.6, 0.5, 0.08, 0.12, '#1a3a6a', 'lehr_glass', emit=('#4a7ad8', 0.4), segs=8)
k.point_light(12.6, 7.9, 0.6, '#ff8a40', 20, radius=0.2, group='flicker')
k.solid(13, 6, 15, 10)

# ---- the shelves of finished glass by the door ---------------------------------------------------------------------
GLASS = ('#2a5ad8', '#5a8ae8', '#8ab0f0', '#2a8a9a', '#1e40a0', '#6ac8e0')
for (x0, x1) in ((1.2, 3.6),):
    for lv, z in enumerate((0.45, 0.95, 1.45)):
        k.box(x0, 7.0, z - 0.05, x1, 7.5, z, (A.WOOD_D, 0.15), 'shelf')
        xx = x0 + 0.2
        while xx < x1 - 0.1:
            kind = rng.random()
            col = rng.choice(GLASS)
            if kind < 0.4:
                k.sphere(xx, 7.25, z + 0.12, 0.11, 0.12, '#0e1e3a', 'glass_float', emit=(col, 0.35), segs=10)
            elif kind < 0.75:
                k.cyl(xx, 7.25, z, z + 0.3, 0.07, '#0e1e3a', 'glass_bottle', emit=(col, 0.3), verts=10)
            else:
                k.cone(xx, 7.25, z, z + 0.16, 0.06, 0.15, '#0e1e3a', 'glass_bowl', emit=(col, 0.3), verts=12)
            xx += 0.3
    for x in (x0, x1):
        k.box(x - 0.04, 7.0, 0.0, x + 0.04, 7.5, 1.55, A.WOOD_DD, 'shelf_post')
k.solid(1, 7, 4, 8)
# floats in nets hung from the beam over the door, a crate of straw, a broken piece swept into a pile
for i in range(5):
    x = 5.6 + i * 0.5
    k.tube((x, 9.0, H - 0.3), (x, 9.0, 1.9 + (i % 2) * 0.2), 0.008, '#8a7450', 'cord', verts=3)
    k.sphere(x, 9.0, 1.78 + (i % 2) * 0.2, 0.13, 0.14, '#0e1e3a', 'glass_float', emit=(GLASS[i], 0.45), segs=10)
A.crate(k, 10.6, 8.8, s=0.55, tone=A.WOOD_L)
k.blob(10.6, 8.8, 0.6, 0.25, 0.25, 0.08, ('#c8b070', 0.4), 'straw', segs=8)
k.solid(10, 8, 11, 9)
for i in range(8):
    k.cone(11.6 + rng.uniform(-0.2, 0.2), 9.3 + rng.uniform(-0.1, 0.1), 0.0, 0.05, 0.05, 0.0, '#1a3a6a', 'glass_shard',
           emit=(rng.choice(GLASS), 0.4), verts=3)

# ---- light ----------------------------------------------------------------------------------------------------------
A.hanging_lamp(k, 4.0, 7.6, energy=50, visible=True)
A.hanging_lamp(k, 12.0, 7.6, energy=50, visible=True)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=int(os.environ.get('GW_SAMPLES', 128)),
         world_light=('#3a3040', 0.35))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Sapphire Glassworks', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-sapphire-market', 'leaveSpawn': [5, 5], 'label': 'THE QUAY', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 8, 'y': 4, 'type': 'dialog', 'label': 'MASTER STAVROU', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
    {'x': 12, 'y': 4, 'type': 'dialog', 'label': 'IONE', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
    {'x': 4, 'y': 6, 'type': 'sapphire', 'act': 'glassblow', 'label': 'THE PIPE', 'prompt': 'PRESS E TO BLOW GLASS'},
    {'x': 8, 'y': 5, 'type': 'dialog', 'label': 'THE FURNACE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THREE GLORY HOLES IN A WALL OF BRICK, WHITE-ORANGE INSIDE. THE HEAT PRESSES ON YOUR FACE FROM FOUR STEPS AWAY.\n\nOVER IT THE CONE\'S THROAT GOES UP INTO THE DARK, AND SOMEWHERE AT THE TOP OF IT, THE NIGHT.'},
    {'x': 12, 'y': 7, 'type': 'dialog', 'label': 'THE LEHR', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE LONG BRICK OVEN WHERE THE WORK COOLS FOR A DAY AND A NIGHT. COOL IT FASTER AND IT CRACKS, IONE SAYS. "LIKE PEOPLE."'},
    {'x': 2, 'y': 6, 'type': 'dialog', 'label': 'FINISHED GLASS', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'FLOATS, BOTTLES, BOWLS, LAMP CHIMNEYS, ALL IN THE SAPPHIRE BLUE THAT NOBODY ELSE ON THE SEAS CAN MATCH. THE GLASS SHOP NEXT DOOR SELLS THEM; THE BEST GO TO THE CAPITAL.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (ax, ay) in ((8, 4), (12, 4)):
    k.solid(ax, ay, ax + 1, ay + 1)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-glass-master', 'x': 8, 'y': 4, 'facing': 'down'},
    {'sheet': 'npc-glassblower', 'x': 12, 'y': 4, 'facing': 'left'},
])
print('glassworks done')
