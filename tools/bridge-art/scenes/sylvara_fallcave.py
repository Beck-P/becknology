"""Behind the falls — the cave under the Silverrun's falls (world id "sylvara-fallcave").
Usage: BVENV/bin/python sylvara_fallcave.py RENDER_DIR

A ledge runs behind the curtain of water into a cave: wet rock walls and a ceiling you can't see for the dark, the falls
across the mouth glowing with daylight (or moonlight) from outside and roaring, a pool in the floor where the water
seeps through, pale crystals growing out of the rock, glowing moss, ferns where the spray reaches. Long ago the elves
carved the river's story along the back wall — the Moonwell, the river, the falls, the lake, the moon over it — and
left a box in a dry niche. Lit by the curtain's light and the crystals' glow.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_sylvan as A
import assets_sylvara_rich as RICH                  # noqa: E402                              # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = sys.argv[1]
WID = 'sylvara-fallcave'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 20, 16
H = 3.0 / math.cos(THETA)
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=0.5, seed=5151)
rng = k.rng
ROCK, ROCK_D, ROCK_L = '#5a5850', '#3a3832', '#7a786a'


def floor_z(x, r):
    return 0.04 * (A.noise(x, r, 1.2, 5) - 0.5)


L = A.Land(k, floor_z, lambda x, r: None)
POOL = (6.0, 8.0, 2.0, 1.3)


def pool_f(x, r):
    """< 1 inside the seep pool: an ellipse with a wandering edge (a lobe, a bay), never a plain oval."""
    a = math.atan2((r - POOL[1]) / POOL[3], (x - POOL[0]) / POOL[2])
    e = 1.0 + 0.16 * math.sin(3 * a + 0.7) + 0.09 * math.sin(5 * a + 2.1)
    return (((x - POOL[0]) / POOL[2]) ** 2 + ((r - POOL[1]) / POOL[3]) ** 2) / (e * e)


def in_pool(x, r):
    return pool_f(x, r) < 1.0


def cave(x, r):
    """Inside the cave's floor (an irregular blob, open to the south where the falls are)."""
    a = math.atan2((r - 8.5) / 0.7, x - 10.0)
    R = 8.6 + 0.8 * math.sin(3 * a + 0.4) + 0.5 * math.sin(5 * a + 1.3)
    return math.hypot(x - 10.0, (r - 8.5) / 0.7) < R and r > 2.6


# the floor: wet rock, a little uneven; the pool sunk into it
FL = A.Land(k, lambda x, r: -0.35 if in_pool(x, r) else floor_z(x, r),
            lambda x, r: (('bed' if in_pool(x, r) else 'cave_floor_wet' if A.noise(x, r, 1.4, 3) < 0.3 else
                           'cave_floor_pale' if A.noise(x, r, 3.2, 8) > 0.68 else 'cave_floor') if cave(x, r) or r > 12 else None),
            alb={'cave_floor': ('#5a574c', 0.4), 'cave_floor_wet': ('#40443f', 0.22), 'cave_floor_pale': ('#6c685a', 0.42)})
FL.field(-0.5, 1.5, COLS + 0.5, ROWS + 0.5, 0.125, prefix='floor')
A.water(k, POOL[0] - POOL[2] - 0.2, POOL[1] - POOL[3] - 0.2, POOL[0] + POOL[2] + 0.2, POOL[1] + POOL[3] + 0.2,
        lambda x, r: pool_f(x, r) < 1.12, -0.12, part='pond_water', tone='#2a5a6a', step=0.06)

# the walls: heaped rock all round the floor, rising into the dark
for i in range(140):
    a = i / 140 * math.tau
    if math.sin(a) > 0.55:                                        # the mouth to the south: open
        continue
    R = 8.6 + 0.8 * math.sin(3 * a + 0.4) + 0.5 * math.sin(5 * a + 1.3)
    x, r = 10.0 + math.cos(a) * (R + 0.3), 8.5 + math.sin(a) * (R + 0.3) * 0.7
    if math.hypot(x - 15.6, r - 3.0) < 1.6:                      # the dry niche with the box: open to the room
        continue
    for z in (0.3, 1.2, 2.2, 3.2):
        if 13.8 < x < 17.6 and r - z * 0.25 < 6.4 and z > 0.5:   # nothing high in the wall stands in front of it on screen
            continue
        s = rng.uniform(0.55, 0.9)
        k.rock(x + rng.uniform(-0.2, 0.2), r - z * 0.25, z, s, s * 0.7, s * 0.8, (shade(ROCK, rng.uniform(0.75, 1.1)), 0.35), part='cave_wall', segs=8)
k.box(-1, -1, 0.0, COLS + 1, 2.4, H + 0.5, (ROCK_D, 0.4), 'cave_wall')        # the back, into the dark
# the falls across the mouth: a curtain of water lit from outside
# (the curtain stands beyond the ledge, at row 15.3, and only its foot shows — a tall sheet there stood in front of
# anyone on the ledge and hid them; the light coming through it does the rest)
for i in range(70):
    x = 3.8 + i * 0.19 + rng.uniform(-0.04, 0.04)
    w = rng.uniform(0.025, 0.06)
    top = rng.uniform(0.7, 1.05)
    col = rng.choice(('#7aa8b4', '#5e8e9c', '#9cc4cc'))
    k.poly([(x - w, 15.3, top), (x + w, 15.3, top), (x + w * 1.3, 15.4, 0.0), (x - w * 1.3, 15.4, 0.0)], shade(col, 0.6), 'falls',
           emit=(col, 0.35))
k.box(3.6, 15.4, -0.12, 16.8, 15.9, -0.02, ('#1e3a44', 0.1), 'falls_foot', emit=('#4a7a8a', 0.2))
for _ in range(70):
    k.blob(rng.uniform(4, 16), rng.uniform(15.1, 15.7), 0.0, rng.uniform(0.04, 0.09), 0.04, 0.015, ('#c8dcdc', 0.15), 'foam', segs=6)
for _ in range(40):                                              # wet stones along the ledge's lip where the spray lands
    x = rng.uniform(4.0, 16.0)
    s_ = rng.uniform(0.1, 0.22)
    k.rock(x, rng.uniform(14.3, 14.9), 0.0, s_, s_ * 0.8, s_ * 0.5, (shade('#3e423e', rng.uniform(0.8, 1.15)), 0.2), part='floor_stone', segs=7)
k.area_light(10.0, 15.8, 1.4, '#c8e8f0', 420, 12.0, rot=(math.radians(80), 0, 0))

# crystals growing out of the rock, glowing moss, ferns where the spray reaches
for (x, r) in ((2.6, 5.0), (16.8, 4.6), (15.6, 10.4), (3.0, 11.0), (9.4, 3.4)):
    for j in range(rng.randint(3, 6)):
        a = rng.uniform(-0.7, 0.7)
        h = rng.uniform(0.35, 0.9)
        col = rng.choice(('#4ac8b8', '#9a6ae0', '#5aa8e8'))
        bx_, br_ = x + rng.uniform(-0.3, 0.3), r + rng.uniform(-0.2, 0.2)
        k.tube((bx_, br_, 0.0), (bx_ + math.sin(a) * h * 0.4, br_, h), rng.uniform(0.08, 0.13), (shade(col, 0.45), 0.15), 'crystal',
               emit=(col, 0.55), rb=0.0, verts=5, smooth=False)
    for _ in range(4):                                           # the rock they grow from
        k.rock(x + rng.uniform(-0.4, 0.4), r + rng.uniform(-0.25, 0.25), 0.0, 0.22, 0.18, 0.14, (shade(ROCK, rng.uniform(0.8, 1.05)), 0.35), part='cave_rock', segs=7)
    k.point_light(x, r + 0.3, 0.6, '#7ad8d0', 10, radius=0.2)
    k.solid(x - 0.4, r - 0.3, x + 0.4, r + 0.3)
for _ in range(9):                                               # glowing moss in patches near the walls, faint
    a = rng.uniform(math.pi * 0.75, math.pi * 2.25)
    cx_, cr_ = 10.0 + math.cos(a) * 7.0, 8.5 + math.sin(a) * 4.6
    for _ in range(rng.randint(5, 9)):
        x, r = cx_ + rng.uniform(-0.7, 0.7), cr_ + rng.uniform(-0.45, 0.45)
        if cave(x, r) and not in_pool(x, r) and r < 13.5:
            k.blob(x, r, 0.01, rng.uniform(0.05, 0.13), 0.05, 0.025, ('#2a4a34', 0.35), 'glow_moss', emit=('#6ad8b8', 0.18), segs=7)
for _ in range(90):                                              # pebbles and loose stones over the floor
    x, r = rng.uniform(1, 19), rng.uniform(3, 14)
    if cave(x, r) and pool_f(x, r) > 1.15:
        s_ = rng.uniform(0.04, 0.12)
        k.rock(x, r, 0.0, s_, s_ * 0.8, s_ * 0.5, (shade('#5e5a50', rng.uniform(0.75, 1.2)), 0.3), part='floor_stone', segs=6)
for i in range(22):                                              # the pool's rocky rim
    a = i / 22 * math.tau + rng.uniform(-0.1, 0.1)
    rr_ = 1.0
    while pool_f(POOL[0] + math.cos(a) * POOL[2] * rr_, POOL[1] + math.sin(a) * POOL[3] * rr_) < 1.05:
        rr_ += 0.03
    s_ = rng.uniform(0.12, 0.26)
    k.rock(POOL[0] + math.cos(a) * POOL[2] * rr_, POOL[1] + math.sin(a) * POOL[3] * rr_, -0.02, s_, s_ * 0.8, s_ * 0.55,
           (shade('#4e4c44', rng.uniform(0.8, 1.15)), 0.3), part='cave_rock', segs=7)
for (x, r) in ((4.2, 13.2), (15.8, 13.0), (13.0, 12.6)):
    A.fern(k, L, x, r, s=0.55, tone='#3e7a32')

# the carving along the back wall: the river's story in relief, picked out in silver
k.box(4.0, 2.38, 0.6, 16.0, 2.45, 2.4, (shade(ROCK_L, 1.05), 0.3), 'carving_panel')
for (x, z, s) in ((5.0, 1.6, 0.35), (16.0, 1.4, 0.3)):                         # the Moonwell; the moon over the lake
    k.cyl_y(x, 2.44, 2.5, z, s, s, '#c8f0e8', 'carving_moon', emit=('#a8e0d8', 0.5), verts=16)
pts = [(5.4, 1.4), (7.0, 1.0), (8.6, 1.6), (10.0, 1.2), (11.0, 1.2), (11.2, 0.8), (13.0, 1.0), (15.0, 1.0)]
for (a, b) in zip(pts, pts[1:]):
    k.tube((a[0], 2.47, a[1]), (b[0], 2.47, b[1]), 0.05, ('#d8e8f0', 0.2), 'carving_river', emit=('#a8c8d8', 0.25), verts=5)
for (x, z) in ((7.4, 1.9), (9.0, 2.0), (12.4, 1.9), (14.0, 2.0)):              # trees along it
    k.cone(x, 2.47, z - 0.2, z + 0.2, 0.15, 0.0, ('#a8c0a8', 0.3), 'carving_tree', verts=6)
k.box(11.0, 2.46, 0.8, 11.2, 2.49, 1.2, ('#d8e8f0', 0.2), 'carving_drop', emit=('#a8c8d8', 0.6))
# the dry niche and the box in it
# (a recess in the rock — it was one solid block with the box inside it, so the box never showed)
k.box(14.6, 2.3, 0.0, 16.6, 2.62, 1.5, (ROCK_D, 0.4), 'niche_back')
for (x0, x1) in ((14.5, 14.8), (16.4, 16.7)):
    k.box(x0, 2.3, 0.0, x1, 3.7, 1.3, (shade(ROCK, 0.85), 0.4), 'niche_side')
k.box(14.5, 2.3, 1.3, 16.7, 3.2, 1.55, (shade(ROCK, 0.9), 0.4), 'niche_lintel')
k.box(14.8, 2.62, 0.0, 16.4, 3.7, 0.08, (shade(ROCK_L, 0.85), 0.35), 'niche_shelf')
k.box(15.1, 2.9, 0.08, 16.0, 3.4, 0.46, ('#7a5a38', 0.3), 'chest')
for xx in (15.25, 15.85):
    k.box(xx - 0.03, 3.38, 0.1, xx + 0.03, 3.42, 0.46, ('#3a2a1a', 0.3), 'chest_band')
k.box(15.08, 2.88, 0.46, 16.02, 3.42, 0.53, (A.GOLD, 0.25), 'chest_lid')
k.point_light(15.55, 3.9, 0.9, '#a8e0d8', 6, radius=0.15)
k.solid(14.8, 2.5, 16.4, 3.6)
for c in range(COLS):                                            # the pool, by its own outline
    for rr in range(ROWS):
        if pool_f(c + 0.5, rr + 0.6) < 1.0:
            k.solid(c, rr, c + 1, rr + 1)

RICH.merge_parts(k)                                                  # one mesh per look: each render pass quick (assets_sylvara_rich)
k.render(OUT, light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 128)), world_light=('#24323a', 0.5))

walk = [(c, rr) for c in range(COLS) for rr in range(ROWS) if (cave(c + 0.5, rr + 0.7) and rr < 14) or (rr == 13 and 8 <= c <= 10)]
walk = [w_ for w_ in walk if w_ not in k.blocked]
reached, todo = {(9, 13)}, [(9, 13)]                              # only what can be walked to from the ledge
while todo:
    c, rr = todo.pop()
    for n in ((c + 1, rr), (c - 1, rr), (c, rr + 1), (c, rr - 1)):
        if n in walk and n not in reached:
            reached.add(n)
            todo.append(n)
walk = reached
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Behind the Falls', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [9, 13]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': 9, 'y': 13, 'type': 'enter_world', 'label': 'THE LEDGE', 'prompt': 'PRESS E TO GO BACK OUT', 'target': 'sylvara-falls', 'spawn': [21, 21]},
    {'x': 10, 'y': 3, 'type': 'dialog', 'label': 'THE CARVING', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'CARVED ALONG THE BACK WALL AND PICKED OUT IN SILVER: A WELL WITH A MOON IN IT, A RIVER RUNNING FROM IT THROUGH TREES, A FALL OF WATER, A LAKE, AND OVER THE LAKE THE SAME MOON. UNDERNEATH, IN OLD ELVISH, ONE WORD. MIRELLE WOULD KNOW WHAT IT MEANS. (SHE SAYS IT MEANS "HOME".)'},
    {'x': 14, 'y': 4, 'type': 'sylvan', 'kind': 'cache', 'cache': 'falls', 'label': 'OILED BOX', 'prompt': 'PRESS E TO OPEN'},
    {'x': int(POOL[0]), 'y': int(POOL[1] + POOL[3]) + 1, 'type': 'dialog', 'label': 'THE SEEP POOL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'WATER SEEPING THROUGH THE ROCK FROM THE RIVER ABOVE, SO CLEAR THE POOL LOOKS EMPTY. PALE FISH WITH NO EYES HANG IN IT, NOT BOTHERED BY YOU AT ALL.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for c in range(COLS):
    for rr in range(ROWS):
        if (c, rr) not in walk:
            k.solid(c, rr, c + 1, rr + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, doors=[(9, 13)], actors=[], scene_extra={})
print('fallcave done', 'walkable', len(walk))
