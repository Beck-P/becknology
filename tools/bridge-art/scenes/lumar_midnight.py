"""Midnight Isle — the sorceress's island (world id "lumar-midnight").

  BVENV/bin/python tools/bridge-art/scenes/lumar_midnight.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-midnight

Mist on black water. From the pier a processional way runs north between
plinths — most of them empty: the stone sentinels walked off them and
roam the island — to the sorceress's octagonal tower. West lies the
graveyard of the drowned, its headstones leaning, a tomb glowing violet;
east the moon pool, ringed with runestones, beside the broken arches of an
old abbey; wisp-lanterns burn along the paths and twisted trees crowd the
north shore.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-midnight.json')
COLS, ROWS = 52, 42
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=1.0, margin_x=0.5, seed=1777)
C45 = math.cos(math.radians(45))
VIOLET = ('#2a1a4a', '#a080ff')

LOBES = [(26, 19.5, 19, 12.5), (40, 12, 8, 7), (10, 23, 7, 9), (24, 32, 6, 4.5)]
land = I.mask(COLS, ROWS, LOBES, seed=21, amp=0.17)
land = I.flood(land, (24, 20))

PX = 24
pier_top = max(r for (c, r) in land if c == PX) + 1
PIER = [(PX, r) for r in range(pier_top, pier_top + 2)]
SHIP_R = pier_top + 2
SL = 7.0
TOWER = (24.5, 9.4)
POOL = (36.5, 24.5, 2.2, 1.5)


def pool_d(x, r):
    cx, cr, rx, ry = POOL
    return ((x - cx) / rx) ** 2 + ((r - cr) / ry) ** 2


POOL_CELLS = {(c, r) for (c, r) in land if any(((c + dx - POOL[0]) / (POOL[2] + 0.3)) ** 2 + ((r + dr - POOL[1]) / (POOL[3] + 0.3)) ** 2 < 1
                                               for dx in (0.1, 0.9) for dr in (0.1, 0.9))}
walk = land - POOL_CELLS

PATHS = [
    [(PX + 0.5, pier_top + 0.2), (24.5, 12.0)],
    [(24.5, 21.0), (17.0, 21.5), (12.0, 22.5)],
    [(24.5, 26.0), (31.0, 25.5), (33.6, 24.8)],
    [(24.5, 16.0), (33.0, 15.0), (39.0, 18.0)],
]
WAY = (22.4, 26.6)                     # the processional way's kerbs


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def height(x, r):
    d = pool_d(x, r)
    return -0.9 * math.sqrt(max(0.0, 1 - d)) if d < 1 else 0.0


def material(x, r):
    if pool_d(x, r) < 1.3:
        return 'pool_bed' if pool_d(x, r) < 1.0 else 'stone'
    if WAY[0] < x < WAY[1] and 12.0 < r < pier_top + 0.2:
        return 'way' if (int(r * 2) + int(x * 2)) % 7 else 'way_dark'
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.42:
        return 'path'
    if 5 < x < 17 and 16 < r < 30:
        return 'grave' if I.n2(x, r, 0.8, 9) > -0.3 else 'moss'
    m = I.n2(x, r, 0.4, 11) + 0.4 * I.n2(x, r, 1.5, 12)
    return 'moor' if m > -0.2 else ('moss' if m > -0.55 else 'stone')


ALB = {'way': ('#6a6478', 0.25), 'way_dark': ('#5a5468', 0.25), 'path': ('#5e5a6a', 0.3), 'grave': ('#2c3430', 0.3),
       'moss': ('#2e3434', 0.3), 'moor': ('#3a3446', 0.3), 'stone': ('#4a4658', 0.25), 'pool_bed': ('#2a2438', 0.3)}
I.ground(k, land, material, ALB, height=height)
terrain = C.coast(k, land, ground=(material, ALB), palette='midnight', grass='#3a3446', rock='#3a3644', seed=51, beachiness=-0.3,
                  keep_clear=[(PX - 0.4, pier_top - 0.4, PX + 1.4, SHIP_R + 0.2),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9)])

# ---- the pier and the galleon -----------------------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, pier_top - 0.4, SHIP_R + 0.0, z=0.02)
n0, l0 = len(k.parts), len(k.lights)
W.galleon(k, PX + 0.5 - 0.45 * SL, PX + 0.5 + 0.55 * SL, SHIP_R + 0.75, beam=1.4, masts=0.8, waterline=False,
          paint='#2a2040', flag='#8060e0', sail='#a8a0b8')
C.sink(k, n0, C.WZ, l0)
DECK = 0.95 + C.WZ
k.poly([(PX + 0.3, SHIP_R - 0.3, 0.03), (PX + 0.7, SHIP_R - 0.3, 0.03), (PX + 0.7, SHIP_R + 0.25, DECK),
        (PX + 0.3, SHIP_R + 0.25, DECK)], (A.WOOD, 0.14), 'gangplank')
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, pier_top + 0.6)

# ---- the processional way and the tower -----------------------------------------------------------------------------
I.octagon_tower(k, *TOWER)
for x in WAY:                                            # kerbstones along the way
    r = 12.2
    while r < pier_top - 0.3:
        k.box(x - 0.08, r, 0.0, x + 0.08, r + 0.45, 0.08, ('#7a7488', 0.2), 'kerb')
        r += 0.5
STATUES = {(22, 17), (27, 23), (22, 26)}
for i, r in enumerate((14.5, 17.5, 20.5, 23.5, 26.5)):
    if r > pier_top - 1:
        continue
    for x in (21.3, 27.7):
        I.plinth(k, x, r, empty=(int(x), int(r)) not in STATUES)
for (x, r) in ((21.4, 12.6), (27.6, 12.6), (21.4, 29.0), (27.6, 29.0)):
    I.wisp_lantern(k, x, r)

# ---- west: the graveyard of the drowned ------------------------------------------------------------------------
for j, r in enumerate((19.6, 21.6, 24.0, 26.2)):
    for i in range(5):
        x = 6.6 + i * 1.6 + (0.5 if j % 2 else 0) + k.rng.uniform(-0.15, 0.15)
        if (int(x), int(r)) in walk and pd(x, r) > 0.7:
            I.headstone(k, x, r, lean=k.rng.uniform(-14, 14), kind=k.rng.choice((0, 0, 1, 2)))
I.mausoleum(k, 7.0, 10.4, 15.6, 18.0)
for x in (13.0, 14.6):                                     # the crooked gate
    k.box(x - 0.08, 21.9, 0.0, x + 0.08, 22.1, 1.4, '#2a2630', 'gate_post')
k.tube((13.0, 22.0, 1.2), (14.6, 22.0, 1.05), 0.02, '#2a2630', 'gate_bar', verts=4)
k.tube((13.0, 22.0, 0.6), (14.6, 22.0, 0.75), 0.02, '#2a2630', 'gate_bar', verts=4)
for (x, r) in ((12.4, 19.0), (6.4, 28.4), (15.6, 27.0)):
    I.wisp_lantern(k, x, r)

# ---- east: the moon pool and the abbey ruins -------------------------------------------------------------------
cx, cr, rx, ry = POOL
for i in range(8):
    a = i * math.tau / 8 + 0.2
    I.standing_stone(k, cx + math.cos(a) * (rx + 0.9), cr + math.sin(a) * (ry + 0.75), h=k.rng.uniform(1.0, 1.5),
                     tone='#4a4458', glyph=VIOLET[1] if i % 2 else None)
k.point_light(cx, cr, 0.3, VIOLET[1], 25, radius=1.0, group='flicker')
I.ruined_arch(k, 37.4, 39.4, 18.2)
I.ruined_arch(k, 40.4, 42.4, 18.2, broken=True)
I.ruined_arch(k, 43.4, 45.4, 18.2)
for (x, r) in ((38.0, 21.0), (44.5, 21.4), (41.0, 15.6)):
    k.rock(x, r, 0.15, 0.4, 0.3, 0.3, ('#5a5468', 0.2), part='rubble')
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)

# ---- the twisted woods ------------------------------------------------------------------------------------------
trees = []
for i in range(60):
    x, r = k.rng.uniform(4, 48), k.rng.uniform(6, 30)
    if (int(x), int(r)) not in walk or pd(x, r) < 1.2 or WAY[0] - 1 < x < WAY[1] + 1 or math.hypot(x - TOWER[0], r - TOWER[1]) < 3.5:
        continue
    if 5 < x < 17 and 15 < r < 29 or pool_d(x, r) < 3.5 or (36 < x < 46 and 16 < r < 22):
        continue
    if any(math.hypot(x - a, r - b) < 1.3 for (a, b) in trees):
        continue
    trees.append((x, r))
    if k.rng.random() < 0.55:
        I.dead_tree(k, x, r, h=k.rng.uniform(1.6, 2.6), tone='#2a2430')
    else:
        I.red_pine(k, x, r, h=k.rng.uniform(2.2, 3.0), tone='#2a2a40', trunk='#1a1820')

# ---- scatter -------------------------------------------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6 or WAY[0] < x < WAY[1]
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('moor', 'moss', 'grave')], '#3e4448', per_cell=1.0, avoid=busy)
I.pebbles(k, walk, '#4a4658', per_cell=0.2, avoid=busy)
for (x, r, s) in ((45.0, 10.0, 0.9), (8.0, 14.6, 0.8), (31.0, 31.0, 0.7), (44.0, 26.0, 0.8)):
    W.shore_crystals(k, x, r, col=VIOLET, s=s, energy=10)

k.area_light(26.0, 16.0, 16.0, '#7a78b8', 2000, 40.0, rot=(math.radians(-35), 0, 0))     # a thin moon
k.point_light(24.5, 18.0, 4.0, '#c0b0ff', 40, radius=1.5)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=96,
         world_light=('#1e1e3a', 0.7))

# ---- the world ------------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
byl = {}
for i in old['interactions']:
    byl.setdefault(i.get('label'), []).append(i)


def keep(label, x, y, n=0):
    it = dict(byl[label][n])
    it.update({'x': x, 'y': y})
    return it


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


tx, tr = TOWER
door_row = int(tr + 1.6 + 0.5) + 1
w = {'name': 'Midnight Isle', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, pier_top - 1]}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         keep('DOCK', PX, pier_top),
         keep("SORCERESS'S TOWER", 24, door_row - 1),
         keep('STONE SENTINEL', 20, 18, 0),
         keep('STONE SENTINEL', 29, 22, 1),
         keep('STONE SENTINEL', 17, 14, 2),
         keep('STONE SENTINEL', 32, 18, 0),
         keep('STONE SENTINEL', 12, 25, 1),
         look('EMPTY PLINTH', 21, 15, 'A PLINTH WITH NOTHING ON IT BUT TWO WORN FOOTPRINTS IN THE STONE.\n\nWHATEVER STOOD HERE STOOD HERE A VERY LONG TIME, AND THEN LEFT.'),
         look('STATUE', 22, 18, 'A SENTINEL STILL ON ITS PLINTH, HEAD BOWED.\n\nIT HASN\'T MOVED. YOU ARE ALMOST SURE IT HASN\'T MOVED.'),
         look('GRAVEYARD', 14, 23, 'THE GRAVEYARD OF THE DROWNED. NO BODIES UNDER THESE STONES - ONLY NAMES, FOR THOSE THE SEA KEPT.\n\nONE STONE IS NEW AND STILL BLANK, AS IF IT IS WAITING FOR A NAME.'),
         look('TOMB', 9, 19, 'A SMALL STONE TOMB, ITS DOOR AJAR, VIOLET LIGHT INSIDE.\n\nCARVED ABOVE THE DOOR: "THEY LISTENED TOO."'),
         look('MOON POOL', 36, 27, 'A ROUND POOL RINGED WITH STANDING STONES. THE WATER IS PERFECTLY STILL.\n\nTHE MOON IN IT IS NOT THE MOON IN THE SKY. IT IS FULL, AND GREEN.'),
         look('ABBEY RUINS', 41, 19, 'THREE ARCHES OF AN ABBEY WHOSE WALLS ARE GONE, AND ONE OF THOSE ARCHES HALF FALLEN.\n\nTHE MONKS HERE KEPT A RECORD OF EVERY SHIP THAT PASSED. THE BOOK IS GONE TOO.'),
         look('WISP LANTERN', 22, 13, 'A VIOLET FLAME IN AN IRON CAGE. NOTHING FEEDS IT.\n\nWHEN YOU STEP AWAY IT LEANS AFTER YOU.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER, scene_id='lumar-midnight',
            scene_extra={'backdrop': True, 'mist': True})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -3.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('midnight done; pier', pier_top, 'door row', door_row, 'walkable', len(walk))
