"""Sylvara — Elderglade, the wood elves' capital among the giant trees. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara

Dusk in the old wood: a low gold sun slanting between trunks wider than houses, the shadows going green-blue,
leaf lanterns lit along the paths. At the top of the glade the Great Tree, the queen's hall inside it (a tall
arched door glowing gold, round windows, a walkway ringing it with lanterns); giants of the wood all round with
doors in their trunks where elves live. A mossy flagstone path winds down from the Great Tree past the bard on his
stone seat and the herbalist's stall to the landing ring in the south-east, where the shuttle sets down among ferns
and glowing mushrooms. West, under a willow, the Moonwell: a round pool of pale silver-green light.

Queen Alyssa of the wood elves holds court in the Heartwood Hall (scenes/sylvara_hall.py), Beckolas her first sword
at her side.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_elves as E               # noqa: E402
import assets_ship as P                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'sylvara'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 34

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, seed=403)

# ---- the ground: moss and leaf litter, the flagstone paths --------------------------------------------------------
E.forest_floor(k, 0, -3.2, COLS, ROWS + 0.6)
GT = (23.0, 3.6, 3.0)                                               # the Great Tree: centre x, row, radius
PX, PR = 38.6, 27.6                                                 # the landing ring
TRAILS = [[(23.0, 7.6), (23.6, 10.5), (25.5, 13.5), (28.5, 16.5), (32.5, 20.0), (36.4, 23.6)],
          [(24.4, 12.0), (20.5, 13.6), (16.0, 15.8), (12.6, 18.4), (10.6, 21.6)],
          [(28.5, 16.5), (30.4, 14.6), (31.8, 12.6)]]
for t in TRAILS:
    E.stone_trail(k, t)
for t in TRAILS:                                                     # leaf lanterns along the paths, sides alternating
    side, acc = 1, 0.0
    for (pa, pb) in zip(t, t[1:]):
        L = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
        while acc < L:
            f = acc / L
            nx, nr = -(pb[1] - pa[1]) / L, (pb[0] - pa[0]) / L
            E.lantern_post(k, pa[0] + (pb[0] - pa[0]) * f + nx * 1.3 * side, pa[1] + (pb[1] - pa[1]) * f + nr * 1.3 * side)
            side, acc = -side, acc + 4.2
        acc -= L
TRUNK = E.path_cells(TRAILS[0])
WEST = E.path_cells(TRAILS[1])
EAST = E.path_cells(TRAILS[2])

# ---- the Great Tree -------------------------------------------------------------------------------------------------
front = E.great_tree(k, GT[0], GT[1], rad=GT[2], h=8.4)
E.lantern_post(k, 20.6, 8.4)
E.lantern_post(k, 25.0, 8.4)

# ---- giants of the wood all round, elves' doors in two of them -------------------------------------------------------
GIANTS = [(7.0, 3.0, 1.7), (14.0, 4.6, 1.3), (33.0, 4.4, 1.5), (40.5, 3.0, 1.8), (2.2, 12.5, 1.3), (44.0, 13.5, 1.3),
          (2.6, 24.5, 1.4), (44.2, 22.0, 1.2), (12.0, 10.5, 1.0), (38.5, 11.0, 1.1), (5.0, 31.5, 1.2)]
for i, (x, r, rad) in enumerate(GIANTS):
    E.giant_tree(k, x, r, rad=rad, h=k.rng.uniform(7.0, 8.0), roots=6)
E.treehouse_door(k, 7.0, 3.0, 1.7)
E.treehouse_door(k, 33.0, 4.4, 1.5, col='#5a3e2a')

# ---- the Moonwell under its willow (west) ------------------------------------------------------------------------------
MW = (9.0, 19.0)
E.moonwell(k, MW[0], MW[1], rad=1.3)
E.willow(k, 7.0, 16.4, h=3.4, toward=1.0)
for (x, r) in ((5.4, 20.6), (12.4, 17.2), (12.6, 21.2), (6.0, 22.0)):
    E.mushrooms(k, x, r, n=5)
E.flowers(k, 4.0, 15.0, 14.0, 23.5, 70, cols=('#f0f0f0', '#c8a8f0', '#a8e0d8'))

# ---- the bard on his stone seat, by the path ---------------------------------------------------------------------------
BS = (17.5, 11.5)
k.rock(BS[0], BS[1], 0.0, 0.5, 0.36, 0.45, ('#7a7a6a', 0.3), part='bard_seat', segs=10)
k.box(BS[0] - 0.42, BS[1] - 0.3, 0.38, BS[0] + 0.42, BS[1] + 0.3, 0.45, ('#6a8a4a', 0.4), 'seat_moss')
E.harp(k, BS[0] + 0.75, BS[1] + 0.05)
k.solid(BS[0] - 0.5, BS[1] - 0.4, BS[0] + 1.0, BS[1] + 0.4)

# ---- a waystone where the paths meet -----------------------------------------------------------------------------------
k.rock(26.5, 15.4, 0.0, 0.32, 0.22, 1.1, ('#8a8a7a', 0.3), part='waystone', segs=8)
for z in (0.4, 0.7):
    k.blob(26.5, 15.62, z, 0.12, 0.02, 0.06, E.MOON, 'waystone_leaf', emit=(E.MOON, 1.2), segs=6)
k.solid(26, 15, 27, 16)

# ---- the herbalist's stall (east) -------------------------------------------------------------------------------------
E.herb_stall(k, 31.2, 34.0, 11.4)
HB = (34, 11)                                                        # Mirelle stands at its east end (behind it the awning hid her)
E.lantern_post(k, 35.0, 12.4)

# ---- the landing ring: mossy stone, glowing runes, ferns round it -------------------------------------------------------
k.cyl(PX, PR, -0.01, 0.014, 2.95, ('#7a7a6c', 0.3), 'pad', verts=48)
k.cyl(PX, PR, 0.0, 0.02, 2.55, ('#4a6a3a', 0.35), 'pad_moss', verts=48)
k.cyl(PX, PR, 0.0, 0.026, 2.38, ('#86867a', 0.3), 'pad', verts=48)
for i in range(16):
    a = i * math.tau / 16
    k.box(PX + math.cos(a) * 2.7 - 0.06, PR + math.sin(a) * 2.7 - 0.03, 0.02, PX + math.cos(a) * 2.7 + 0.06,
          PR + math.sin(a) * 2.7 + 0.03, 0.03, E.MOON, 'pad_rune', emit=(E.MOON, 1.6))
for i in range(6):
    a = i * math.tau / 6 + 0.3
    E.lantern_post(k, PX + math.cos(a) * 3.3, PR + math.sin(a) * 3.3, h=1.4, energy=10)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.1, PX + 2.0, PR + 0.9)

# ---- the wood: birches, ferns, mushrooms, flowers, bushes --------------------------------------------------------------
used = set(TRUNK) | set(WEST) | set(EAST)


def clear(x, r, pad=1):
    if any((int(x) + dx, int(r) + dr) in used for dx in range(-pad, pad + 1) for dr in range(-pad, pad + 1)):
        return False
    if (x - MW[0]) ** 2 + (r - MW[1]) ** 2 < 9 or (x - PX) ** 2 + (r - PR) ** 2 < 16 or (x - GT[0]) ** 2 + (r - GT[1]) ** 2 < 25:
        return False
    return all((x - gx) ** 2 + (r - gr) ** 2 > (rad + 1.2) ** 2 for (gx, gr, rad) in GIANTS)


for (x, r) in ((11.0, 8.5), (16.5, 7.8), (29.0, 8.4), (37.0, 9.0), (6.0, 9.5), (39.5, 15.5), (17.0, 25.0), (25.0, 27.5),
               (20.5, 29.5), (8.5, 28.5), (13.5, 29.0), (29.5, 22.5), (41.0, 18.5)):
    if clear(x, r, 0):
        E.birch(k, x, r, h=k.rng.uniform(2.8, 3.6))
for _ in range(90):
    x, r = k.rng.uniform(1.5, COLS - 1.5), k.rng.uniform(6.0, ROWS - 2.5)
    if clear(x, r):
        E.fern(k, x, r, s=k.rng.uniform(0.35, 0.55))
for _ in range(16):
    x, r = k.rng.uniform(2.0, COLS - 2.0), k.rng.uniform(7.0, ROWS - 3.0)
    if clear(x, r):
        E.mushrooms(k, x, r, n=k.rng.randint(3, 5), col=k.rng.choice((E.MOON, '#a0c0ff', '#e0b0ff')))
E.flowers(k, 14.0, 20.0, 34.0, 30.0, 120)
for _ in range(14):
    x, r = k.rng.uniform(2.0, COLS - 2.0), k.rng.uniform(26.0, ROWS - 1.0)
    if clear(x, r):
        W.bush(k, x, r, s=k.rng.uniform(0.35, 0.5), tone=k.rng.choice(('#3a6a30', '#4a7a34')), berries=k.rng.choice((None, '#f0f0f0')))

for (x, r, s_) in ((15.0, 20.5, 0.5), (34.0, 16.5, 0.45), (25.5, 24.5, 0.55), (41.5, 26.5, 0.4), (10.0, 26.0, 0.5)):
    E.mossy_rock(k, x, r, s_)
E.fallen_log(k, 14.5, 17.5, 26.6)
E.fallen_log(k, 30.0, 32.4, 8.6, rad=0.24)

# ---- the edges of the glade --------------------------------------------------------------------------------------------
for x in [i * 2.4 + 1.0 for i in range(19)]:
    if 33.0 < x < 44.0:
        continue
    W.bush(k, x, ROWS - 1.2, s=0.55, tone=k.rng.choice(('#2e5a2a', '#3a6a30')))
k.solid(0, 0, COLS, 2)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(0, ROWS - 2, COLS, ROWS)

# ---- the light: dusk — a low gold sun from the west between the trunks, the shadows green-blue -----------------------------
k.sun((0.78, 0.3, -0.36), '#ffb070', 1.8, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#3a5a7a', 0.55))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
SPAWN = [39, 24]
w.update({'name': 'Elderglade', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': SPAWN}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.0, COLS, ROWS], 'shuttle': {'spawn': SPAWN}})
DX = int(GT[0])
w['interactions'] = [
    {'x': 39, 'y': int(PR), 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
    {'x': DX - 1, 'y': int(front), 'type': 'enter_world', 'label': 'THE GREAT TREE', 'prompt': 'PRESS E TO GO IN',
     'target': 'sylvara-hall', 'spawn': [10, 12]},
    {'x': DX, 'y': int(front), 'type': 'enter_world', 'label': 'THE GREAT TREE', 'prompt': 'PRESS E TO GO IN',
     'target': 'sylvara-hall', 'spawn': [11, 12]},
    {'x': 7, 'y': 5, 'type': 'dialog', 'label': 'ELVEN HOME', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'A ROUND DOOR IN THE TRUNK OF A TREE OLDER THAN THE CITY. SOMEONE INSIDE IS SINGING, AND STOPS TO LISTEN, AND STARTS AGAIN.'},
    {'x': 33, 'y': 6, 'type': 'dialog', 'label': 'ELVEN HOME', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'A NOTE PINNED TO THE DOOR WITH A THORN: "GONE TO THE MOONWELL. BACK WHEN THE MOON IS."'},
    {'x': int(MW[0]), 'y': int(MW[1] + 2), 'type': 'dialog', 'label': 'MOONWELL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE MOONWELL. THE WATER IS STILL AND FULL OF A LIGHT THAT ISN\'T THE SKY\'S. THE ELVES SAY IT SHOWS YOU WHAT YOU\'D CROSS THE SEAS FOR. YOU LOOK, AND IT DOES.'},
    {'x': 6, 'y': 17, 'type': 'dialog', 'label': 'WILLOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A WILLOW BENDING OVER THE MOONWELL, ITS FRONDS TRAILING IN THE WATER. SOMETHING IS CAUGHT HIGH IN THEM.'},
    {'x': int(BS[0]), 'y': int(BS[1]), 'type': 'dialog', 'label': 'BARD', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE BARD PLAYS ON.'},
    {'x': HB[0], 'y': HB[1], 'type': 'dialog', 'label': 'HERBALIST', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE HERBALIST NODS, HANDS FULL OF THYME.'},
    {'x': 34, 'y': 24, 'type': 'dialog', 'label': 'WARDEN', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE WARDEN WATCHES YOU.'},
    {'x': 26, 'y': 15, 'type': 'dialog', 'label': 'WAYSTONE', 'prompt': 'PRESS E TO READ',
     'dialog': 'A WAYSTONE CARVED WITH LEAVES. NORTH: THE GREAT TREE, AND THE QUEEN. WEST: THE MOONWELL. SOUTH: THE RING, FOR THOSE WHO COME FROM THE STARS.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x, y) in (HB, (34, 24)):                                       # the herbalist at the end of her stall, the warden by the ring
    k.solid(x, y, x + 1, y + 1)
k.solid(31, 10, 34, 11)                                             # behind the stall: the awning would hide you there
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-elf-bard', 'x': BS[0] - 0.5, 'y': BS[1] - 0.35, 'facing': 'down', 'pose': 'sit'},
                    {'sheet': 'npc-elf-herbalist', 'x': HB[0], 'y': HB[1], 'facing': 'down', 'light': [HB[0], HB[1] + 1]},   # by the lantern
                    {'sheet': 'npc-elf-warden', 'x': 34, 'y': 24, 'facing': 'left', 'light': [34, 25]}],   # (a post's shadow falls on her own tile)
            scene_extra={'layers': {'shuttle': 'parked'}})
print('sylvara done')
