"""The glasshouse on Rose Cove's terraces — where the roseite is grown (world id "lumar-rose-glasshouse").
Usage: BVENV/bin/python lumar_rose_glasshouse.py RENDER_DIR

A long house of glass in iron frames, warm and damp inside, pink light fogging the panes: raised beds of grit down both
sides with roseite growing out of them in clusters — seedlings at the front, the big ones at the back taller than you,
humming. Gravel paths, a dripping cistern, the potting bench with its tools and a tray of seed-crystals, the gardener,
Liesl Marrow. The beds' ripe clusters are forage spots (assets/forage.json) that grow back.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-rose-glasshouse'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 12
H = 2.6 / math.cos(THETA)
FLOOR = (1, 2, 14, 9)
DOORS = [(7, 10), (8, 10)]
IRON = '#2a2e34'
ROSE, ROSE_D = '#e070a0', '#6a2a4a'

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=6301)

# ---- the shell: gravel and flags, glass walls in iron frames ------------------------------------------------------
k.box(0.4, 1.5, -0.12, 15.6, 10.0, -0.02, '#4a4038', 'subfloor')
for c0, c1 in ((1, 6), (10, 15)):                       # gravel either side, one run each (no seams)
    k.box(c0, 2.0, -0.04, c1, 10.0, 0.0, ('#6a6058', 0.3), 'gravel')
for (x, r) in [(1.3 + (i * 1.37) % 13.6, 2.2 + (i * 2.71) % 7.6) for i in range(60) if not (5.8 < 1.3 + (i * 1.37) % 13.6 < 10.2)]:
    k.box(x, r, 0.0, x + 0.08, r + 0.06, 0.012, ('#8a8070', 0.2), 'pebble')
for r in range(2, 10):                                  # the flagged path down the middle
    for c in range(6, 10):
        k.box(c + 0.03, r + 0.03, -0.04, c + 0.97, r + 0.97, 0.0, (shade('#8a8478', k.rng.uniform(0.9, 1.08)), 0.2), 'flag')
k.box(0.4, 1.5, 0, 15.6, 2.0, 0.6, ('#6a645a', 0.12), 'sill_wall')          # a low brick sill, the glass above it
for i in range(14):                                     # the back wall: panes in iron frames, the night pink through them
    x0 = 0.5 + i * 1.08
    k.box(x0 + 0.04, 1.96, 0.6, x0 + 1.04, 1.98, H - 0.05, ('#3a2a3a', 0.04), 'pane', emit=('#5a3a5a', 0.55))
    k.box(x0, 1.94, 0.6, x0 + 0.05, 2.04, H, (IRON, 0.25), 'frame')
    for zz in (1.3, 2.0, 2.7):
        k.box(x0, 1.95, zz - 0.02, x0 + 1.08, 2.03, zz + 0.02, (IRON, 0.25), 'frame')
k.box(0.4, 1.9, H - 0.06, 15.6, 2.06, H + 0.04, (IRON, 0.25), 'frame_top')
for x0, x1 in ((0.4, 1.0), (15.0, 15.6)):               # end walls of glass
    k.box(x0, 1.5, 0.0, x1, 10.0, 0.6, ('#6a645a', 0.12), 'sill_wall')
    k.box(x0, 1.5, 0.6, x1, 10.0, H, ('#3a2a3a', 0.04), 'side_glass', emit=('#4a3048', 0.35))
    k.box(x0 - 0.02, 1.5, H, x1 + 0.02, 10.0, H + 0.05, (IRON, 0.25), 'frame_top')
    k.box(x0 - 0.02, 10.0, 0, x1 + 0.02, 10.03, H + 0.05, '#120c0a', 'wall_cut')
A.front_wall(k, 0.4, 15.6, 10.0, gaps=[(7.0, 9.0)])
A.door_frame(k, 7.0, 9.0, 10.0)

# ---- the beds: raised grit beds down both sides, roseite growing out of them -------------------------------------


def crystal(x, r, h, w=0.09, lean=0.0, glow=0.8):
    tip = (x + lean, r - lean * 0.3, h)
    k.tube((x, r, 0.42), tip, w, (ROSE_D, 0.05), 'roseite', rb=0.01, verts=6, smooth=False)
    k.tube((x + 0.01, r, 0.45), (tip[0] + 0.01, tip[1], h * 0.95), w * 0.55, (ROSE, 0.05), 'roseite_core', rb=0.005, verts=6,
           smooth=False)
    k.sphere(tip[0], tip[1], h * 0.85, w * 0.8, w * 0.8, '#ff9ac8', 'roseite_glow', emit=('#ff70b0', glow), segs=6)


def bed(x0, x1, r0, r1, sizes):
    k.box(x0, r0, 0.0, x1, r1, 0.4, ('#5a3a2a', 0.12), 'bed_edge', bevel=0.02)
    k.box(x0 + 0.08, r0 + 0.08, 0.38, x1 - 0.08, r1 - 0.08, 0.42, ('#4a4048', 0.25), 'bed_grit')
    n = len(sizes)
    for i, s in enumerate(sizes):
        cx = x0 + 0.35 + (x1 - x0 - 0.7) * (i + 0.5) / n
        cr = (r0 + r1) / 2 + (k.rng.uniform(-0.15, 0.15))
        for j in range(3):                              # a cluster: three blades of crystal
            crystal(cx + (j - 1) * 0.12 * s, cr + (j % 2) * 0.08, 0.42 + s * (0.55 + 0.25 * (j == 1)), w=0.06 + s * 0.035,
                    lean=(j - 1) * 0.08 * s, glow=0.5 + s * 0.25)
    k.solid(x0, r0, x1, r1)


bed(1.2, 5.6, 2.3, 3.4, [2.0, 2.6, 1.8, 2.4])          # the big ones, against the glass
bed(10.4, 14.8, 2.3, 3.4, [2.2, 1.9, 2.8, 2.1])
bed(1.2, 5.6, 5.0, 6.0, [1.2, 0.9, 1.4, 1.0])            # half-grown
bed(10.4, 14.8, 5.0, 6.0, [1.0, 1.3, 0.8, 1.2])
bed(1.2, 5.6, 7.6, 8.5, [0.4, 0.5, 0.35, 0.45, 0.5])     # seedlings by the door
bed(10.4, 14.8, 7.6, 8.5, [0.45, 0.35, 0.5, 0.4, 0.4])
k.point_light(3.4, 3.4, 1.6, '#ff80b8', 30, radius=0.6)
k.point_light(12.6, 3.4, 1.6, '#ff80b8', 30, radius=0.6)

# ---- the cistern at the back of the path, the potting bench, watering cans ---------------------------------------
CS = (8.0, 2.8)
k.cyl(CS[0], CS[1], 0.0, 0.7, 0.55, ('#6a645a', 0.14), 'cistern', verts=16)
k.cyl(CS[0], CS[1], 0.62, 0.66, 0.48, ('#3a5a6a', 0.05), 'cistern_water', verts=16, emit=('#4a3a5a', 0.3))
k.tube((CS[0], CS[1] - 0.6, 1.6), (CS[0], CS[1] - 0.5, 0.9), 0.03, (IRON, 0.25), 'pipe', verts=6)
k.tube((CS[0], CS[1] - 0.6, 1.6), (CS[0], 2.0, 1.6), 0.03, (IRON, 0.25), 'pipe', verts=6)
k.solid(CS[0] - 0.6, CS[1] - 0.6, CS[0] + 0.6, CS[1] + 0.6)
PB = (10.6, 7.0)                                        # the potting bench (by the right seedling bed)
k.box(PB[0], 6.35, 0.72, PB[0] + 1.9, 6.9, 0.8, ('#7a5a34', 0.12), 'potting_top', bevel=0.02)
for x in (PB[0] + 0.1, PB[0] + 1.75):
    k.box(x, 6.4, 0, x + 0.08, 6.85, 0.72, ('#4a2e18', 0.12), 'potting_leg')
for i in range(5):                                      # a tray of seed-crystals
    k.sphere(PB[0] + 0.3 + i * 0.12, 6.6, 0.84, 0.035, 0.04, '#ffb0d8', 'seed_crystal', emit=('#ff70b0', 0.9), segs=6)
k.box(PB[0] + 0.2, 6.45, 0.8, PB[0] + 0.95, 6.8, 0.82, ('#3a2a1a', 0.12), 'seed_tray')
k.tube((PB[0] + 1.2, 6.5, 0.82), (PB[0] + 1.6, 6.75, 0.82), 0.02, ('#9a9aa0', 0.3), 'trowel', verts=4)
k.cyl(PB[0] + 1.45, 6.6, 0.8, 0.98, 0.09, ('#8a5a3a', 0.12), 'pot', verts=10)
k.solid(PB[0], 6.3, PB[0] + 1.9, 6.95)
for (x, r) in ((1.6, 9.2), (14.3, 9.2)):                # watering cans
    k.cyl(x, r, 0.0, 0.32, 0.14, ('#5a7a6a', 0.3), 'can', verts=10)
    k.tube((x + 0.12, r, 0.2), (x + 0.34, r - 0.05, 0.38), 0.025, ('#5a7a6a', 0.3), 'can_spout', verts=6)

# ---- light: the crystals' glow, a lamp over the path ----------------------------------------------------------------
A.hanging_lamp(k, 8.0, 6.0, energy=60, visible=False)
k.area_light(8.0, 2.5, 2.4, '#c080d0', 40, 1.6, rot=(math.radians(-60), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.85}}, light_samples=128, world_light=('#4a3a58', 0.55))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Glasshouse', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [7, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-rose', 'leaveSpawn': [42, 10], 'label': 'THE TERRACES', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 3, 'y': 2, 'type': 'dialog', 'label': 'THE BIG ONES', 'prompt': 'PRESS E TO LISTEN',
     'dialog': 'THE BIG ONES, TALLER THAN YOU, HUMMING SO LOW YOU FEEL IT IN YOUR TEETH. A SLATE: "DO NOT SING NEAR THE BIG ONES."\n\nYOU HUM, VERY QUIETLY. THE NEAREST ONE HUMS BACK, A LITTLE HIGHER. THE GLASS RINGS.'},
    {'x': 8, 'y': 3, 'type': 'dialog', 'label': 'CISTERN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'RAINWATER OFF THE GLASS, INTO THE CISTERN. ROSEITE GROWS ON A DROP OF WATER - TOO MUCH AND IT GROWS INTO THE BED, AND THEN INTO THE FLOOR, AND THEN YOU HAVE A PROBLEM.'},
    {'x': 11, 'y': 6, 'type': 'dialog', 'label': 'POTTING BENCH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A TRAY OF SEED-CRYSTALS, EACH THE SIZE OF A LENTIL AND GLOWING. A LABEL IN LIESL\'S HAND: "FOR THE SAILMAKERS - DO NOT EAT (PIP)."'},
    {'x': 13, 'y': 6, 'type': 'dialog', 'label': 'LIESL', 'prompt': 'PRESS E TO TALK',
     'dialog': 'LIESL MARROW, THE GLASSHOUSE KEEPER, IN A LEATHER APRON STUDDED WITH PINK GRIT. "MIND WHERE YOU STEP. THAT ONE\'S THREE DAYS OLD."'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(13, 6, 14, 7)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-liesl', 'x': 13, 'y': 6, 'facing': 'left'},
])
print('glasshouse done')
