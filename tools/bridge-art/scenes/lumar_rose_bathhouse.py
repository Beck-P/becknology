"""Rosewell's bathhouse (world id "lumar-rose-bathhouse"). Workstream B1.
Usage: BVENV/bin/python lumar_rose_bathhouse.py RENDER_DIR

Under the three rose domes: a hall of blue tiles (the Sapphire Glassworks made them, a hundred all the same), the great
round bath sunk in the middle of the floor, its water hot from the springs and faintly pink, steps down into it all
round, columns holding up the dome's ring, lattice windows lit from outside, benches with folded towels, a fountain
of a fish spitting hot water into the bath, Oda at her counter by the door. Wade in: the floor's height (scene.lift)
takes you down the steps up to your shoulders. Use the bath (`bath`, js/rose.js) to rest and warm up.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_town as W  # noqa: E402

OUT = sys.argv[1]
WID = 'lumar-rose-bathhouse'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 18, 13
H = 2.6 / math.cos(THETA)
FLOOR = (1, 3, 16, 10)
DOORS = [(8, 11), (9, 11)]
BATH = (8.5, 6.6, 3.6, 2.3)                       # centre, radii (the water)
WZ = -0.12

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=4427)
rng = k.rng
A.room(k, 1, 3, 17, 11, H, door=(8.0, 10.0), floor='flags', floor_tone='#4a6a8a', plaster='#e8d4d0', wainscot=1.1,
       wainscot_col='#2a5ad8', beams_every=0)


def bath_d(x, r):
    return math.hypot((x - BATH[0]) / BATH[2], (r - BATH[1]) / BATH[3])


def floor_z(x, r):
    d = bath_d(x, r)
    if d < 1.0:                                       # the steps down: three rings, then the floor of the bath
        return max(-0.55, -0.55 * min(1.0, (1.12 - d) / 0.4))
    return 0.0


# blue and white tiles over the floor round the bath, the bath itself lined in pale rose
TILE = ('#2a5ad8', '#e8eef8', '#3a6ae0', '#d8e4f4')
rects = {}
for r10 in range(30, 110, 4):
    for x10 in range(10, 170, 4):
        x, r = x10 / 10, r10 / 10
        if bath_d(x + 0.2, r + 0.2) < 1.16:
            continue
        t = ((x10 // 4) + (r10 // 4)) % 2 * (1 if (x10 // 8 + r10 // 8) % 2 else 2)
        rects.setdefault(t % 4, []).append((x + 0.015, r + 0.015, -0.01, x + 0.385, r + 0.385, 0.012))
for t, rs in rects.items():
    k.boxes(rs, (TILE[t], 0.08), 'floor_tile')
for ring in range(3):                                 # the steps, three rings of rose stone
    rad = 1.12 - ring * 0.12
    z = -0.18 * (ring + 1)
    n = 40
    for i in range(n):
        a0, a1 = i / n * math.pi * 2, (i + 1) / n * math.pi * 2
        pts = [(BATH[0] + math.cos(a) * BATH[2] * rr, BATH[1] + math.sin(a) * BATH[3] * rr) for a in (a0, a1) for rr in (rad, rad - 0.12)]
        k.quads([((pts[0][0], pts[0][1], z + 0.18), (pts[2][0], pts[2][1], z + 0.18), (pts[3][0], pts[3][1], z), (pts[1][0], pts[1][1], z))],
                ('#d8b8b8', 0.12), 'bath_step')
        k.quads([((pts[1][0], pts[1][1], z), (pts[3][0], pts[3][1], z), (pts[3][0], pts[3][1], z - 0.002), (pts[1][0], pts[1][1], z - 0.002))],
                ('#c8a8a8', 0.12), 'bath_step')
k.blob(BATH[0], BATH[1], -0.6, BATH[2] * 0.8, BATH[3] * 0.8, 0.02, ('#c8a0a8', 0.12), 'bath_floor', segs=28)
for i in range(36):                                   # the rim: a coping of pale stone round the edge
    a = i / 36 * math.pi * 2
    k.blob(BATH[0] + math.cos(a) * BATH[2] * 1.15, BATH[1] + math.sin(a) * BATH[3] * 1.15, 0.02, 0.24, 0.16, 0.04, ('#f0e4e0', 0.12), 'bath_rim', segs=8)
k.blob(BATH[0], BATH[1], WZ, BATH[2] * 1.02, BATH[3] * 1.02, 0.015, ('#7ab0b8', 0.05), 'basin_water', segs=32)
# the fish fountain at the back of the bath, spitting a stream
FX, FR = BATH[0], BATH[1] - BATH[3] * 1.2
k.box(FX - 0.5, FR - 0.5, 0.0, FX + 0.5, FR + 0.1, 0.5, ('#d8c8c4', 0.15), 'fountain_base', bevel=0.04)
k.blob(FX, FR - 0.2, 0.85, 0.35, 0.22, 0.28, ('#b08a3a', 0.2), 'fountain_fish', segs=12)
k.tube((FX, FR + 0.05, 0.8), (FX, FR + 0.9, WZ + 0.02), 0.03, '#cfe8f0', 'fountain_stream', verts=6)
# columns round the bath holding up the dome's ring (only their feet and shafts show), lattice windows on the back wall
for i in range(6):
    a = i / 6 * math.pi * 2 + 0.26
    cx, cr = BATH[0] + math.cos(a) * (BATH[2] + 1.5), BATH[1] + math.sin(a) * (BATH[3] + 1.2)
    if cr > 9.6 or cr < 3.4:
        continue
    k.cyl(cx, cr, 0.0, 0.2, 0.32, ('#d8c8c4', 0.15), 'column_base', verts=14)
    k.cyl(cx, cr, 0.2, H - 0.1, 0.22, ('#f0e4e0', 0.15), 'column', verts=14)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
for wx in (3.0, 6.0, 11.0, 14.0):
    k.box(wx - 0.55, 2.99, 1.3, wx + 0.55, 3.05, 2.6, '#3a1a20', 'window_glass', emit=('#ffb8c8', 0.5))
    k.cyl_y(wx, 2.99, 3.05, 2.6, 0.55, 0.45, '#3a1a20', 'window_glass', emit=('#ffb8c8', 0.5), verts=14)
    for q in range(5):
        k.box(wx - 0.55 + q * 0.27, 3.05, 1.3, wx - 0.53 + q * 0.27, 3.08, 2.9, '#4a2a2a', 'lattice')
# benches with towels, a shelf of oils, lanterns
for (x0, x1, rr) in ((1.4, 3.8, 9.4), (13.2, 15.6, 9.4), (1.4, 3.8, 4.2), (13.2, 15.6, 4.2)):
    A.bench(k, x0, x1, rr, tone='#8a5a40')
    for q in range(2):
        k.box(x0 + 0.3 + q * 1.0, rr - 0.15, 0.48, x0 + 0.8 + q * 1.0, rr + 0.15, 0.6, (rng.choice(('#f4f0ec', '#f0c8d8', '#c8d8f0')), 0.3), 'towel', bevel=0.03)
    k.solid(x0, rr - 0.2, x1, rr + 0.3)
# Oda's counter by the door, east
k.box(12.6, 10.0, 0.0, 15.4, 10.6, 0.95, ('#6a3a2a', 0.15), 'counter', bevel=0.03)
k.box(12.55, 9.95, 0.95, 15.45, 10.65, 1.02, ('#8a5a40', 0.12), 'counter_top')
for q in range(4):
    k.cyl(13.0 + q * 0.6, 10.3, 1.02, 1.18, 0.07, '#3a1a2a', 'oil_bottle', emit=(('#f080b0', '#80b0ff', '#ffd070', '#a0f0c0')[q], 0.4), verts=8)
k.solid(12.5, 10.0, 15.5, 10.7)
for (lx, lr) in ((4.6, 6.6), (12.4, 6.6)):
    W.lantern_post(k, lx, lr, h=1.8, energy=30)
    k.solid_post(lx, lr)
A.hanging_lamp(k, 8.5, 4.2, energy=40, visible=True)
k.point_light(BATH[0], BATH[1], 0.4, '#ffb0c0', 30, radius=1.0, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=int(os.environ.get('BH_SAMPLES', 128)),
         world_light=('#4a3848', 0.4))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Bathhouse', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [8, 10]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-rose-springs', 'leaveSpawn': [7, 21], 'label': 'ROSEWELL', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 14, 'y': 9, 'type': 'dialog', 'label': 'ODA', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
    {'x': 13, 'y': 9, 'type': 'rose', 'act': 'bath', 'label': 'THE BATH', 'prompt': 'PRESS E TO BATHE'},
    {'x': 8, 'y': 6, 'type': 'rose', 'act': 'bath', 'label': 'THE BATH', 'prompt': 'PRESS E TO BATHE'},
    {'x': 8, 'y': 3, 'type': 'dialog', 'label': 'THE FISH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A BRONZE FISH SPITTING HOT WATER INTO THE BATH. ITS NOSE IS RUBBED BRIGHT GOLD WHERE A THOUSAND BATHERS HAVE TOUCHED IT FOR LUCK.'},
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'TILES', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'BLUE AND WHITE TILES FROM THE SAPPHIRE GLASSWORKS. A HUNDRED OF THEM, ALL THE SAME. SOMEBODY HAS SCRATCHED "IONE WAS HERE" ON ONE NEAR THE FLOOR.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(14, 9, 15, 10)
LIFT = [[round(floor_z(c + 0.5, r + 0.5), 2) for c in range(COLS)] for r in range(ROWS)]
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-rose-oda', 'x': 14, 'y': 9, 'facing': 'down'},
    {'sheet': 'npc-rose-bather-a', 'x': 6, 'y': 6, 'facing': 'right', 'pose': 'sit'},
    {'sheet': 'npc-rose-bather-b', 'x': 11, 'y': 7, 'facing': 'left', 'pose': 'sit'},
], scene_extra={'lift': LIFT, 'steam': [[BATH[0] - 1.5, BATH[1]], [BATH[0] + 1.5, BATH[1] + 0.3], [BATH[0], BATH[1] - 0.8]]})
print('bathhouse done')
