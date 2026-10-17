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
import assets_crypt as Crypt           # noqa: E402
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
FJ, FLEN = (30, 33), 6                     # the fishing jetty: east from the south shore, into the mist
FJET = I.jetty_cells(FJ, FLEN, 'e')
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
WAY = (22.4, 26.6)                     # the processional way's outer reach (trees and scatter keep off it)
WAY_X = 24.5
GRAVES = (11.0, 23.0, 6.0, 6.6)        # the graveyard: an irregular plot round this ellipse
UC = (4.0, 6.6, 20.4, 21.6)            # the Undercroft's portal in the graveyard's west side (x0, x1, back, front); its door (5, 21)


def way_hw(r):
    """Half-width of the processional way at row r: it wanders, worn and overgrown at the edges."""
    return 1.35 + 0.3 * I.n2(WAY_X, r, 0.45, 13)


def on_way(x, r, pad=0.0):
    return 12.0 < r < pier_top + 0.2 and abs(x - WAY_X) < way_hw(r) + pad


def grave_d(x, r):
    cx, cr, rx, ry = GRAVES
    return math.hypot((x - cx) / rx, (r - cr) / ry) + 0.12 * I.n2(x, r, 0.7, 19)


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def height(x, r):
    d = pool_d(x, r)
    return -0.9 * math.sqrt(max(0.0, 1 - d)) if d < 1 else 0.0


def material(x, r):
    if pool_d(x, r) < 1.3:
        return 'pool_bed' if pool_d(x, r) < 1.0 else 'stone'
    if on_way(x, r, 0.15):              # moss between the paving stones (built below)
        return 'way_moss'
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.42:
        return 'path'
    if grave_d(x, r) < 1.0:
        return 'grave' if I.n2(x, r, 0.8, 9) > -0.3 else 'moss'
    m = I.n2(x, r, 0.4, 11) + 0.4 * I.n2(x, r, 1.5, 12)
    return 'moor' if m > -0.2 else ('moss' if m > -0.55 else 'stone')


ALB = {'way_moss': ('#2a302e', 0.3), 'path': ('#5e5a6a', 0.3), 'grave': ('#2c3430', 0.3),
       'moss': ('#2e3434', 0.3), 'moor': ('#3a3446', 0.3), 'stone': ('#4a4658', 0.25), 'pool_bed': ('#2a2438', 0.3)}
I.ground(k, land, material, ALB, height=height)
terrain = C.coast(k, land, ground=(material, ALB), palette='midnight', grass='#3a3446', rock='#3a3644', seed=51, beachiness=-0.3,
                  keep_clear=[(PX - 0.4, pier_top - 0.4, PX + 1.4, SHIP_R + 0.2),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9),
                              (FJ[0] - 0.4, FJ[1] - 0.6, FJ[0] + FLEN + 1.4, FJ[1] + 1.6)])

# ---- the pier, your sloop's berth--------------------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, pier_top - 0.4, SHIP_R + 0.0, z=0.02)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, pier_top + 0.6)
I.fishing_jetty(k, FJ, FLEN, 'e', lamp_energy=8, glow='#a080ff', tone='#5a4a52')

# ---- the processional way and the tower -----------------------------------------------------------------------------
I.octagon_tower(k, *TOWER)
r = 12.25                                               # the way: worn slabs in courses, some lifted, some gone
while r < pier_top - 0.05:
    h = min(k.rng.uniform(0.4, 0.62), pier_top - 0.05 - r)
    hw = way_hw(r + h / 2)
    x, xe = WAY_X - hw + k.rng.uniform(-0.12, 0.12), WAY_X + hw + k.rng.uniform(-0.12, 0.12)
    while x < xe - 0.12:
        x1 = min(x + k.rng.uniform(0.45, 0.95), xe)
        edge = x - (WAY_X - hw) < 0.5 or xe - x1 < 0.5
        if k.rng.random() > (0.3 if edge else 0.07):
            k.box(x + 0.035, r + 0.035, -0.05, x1 - 0.035, r + h - 0.035, k.rng.uniform(-0.015, 0.03),
                  (shade('#6a6478', k.rng.uniform(0.8, 1.12)), 0.2), 'way_stone', bevel=0.025)
        x = x1
    r += h
STATUES = {(22, 17), (27, 23), (22, 26)}
for i, r in enumerate((14.5, 17.5, 20.5, 23.5, 26.5)):
    if r > pier_top - 1:
        continue
    for x in (21.3, 27.7):
        I.plinth(k, x, r, empty=(int(x), int(r)) not in STATUES)
for (x, r) in ((21.4, 12.6), (27.6, 12.6), (21.4, 29.0), (27.6, 29.0)):
    I.wisp_lantern(k, x, r)

# ---- west: the graveyard of the drowned ------------------------------------------------------------------------
for j, r in enumerate((18.2, 20.0, 22.0, 24.0, 26.0, 27.9)):
    for i in range(7):
        x = 5.4 + i * 1.45 + (0.6 if j % 2 else 0) + k.rng.uniform(-0.3, 0.3)
        rr = r + k.rng.uniform(-0.18, 0.18)
        if (int(x), int(rr)) in walk and pd(x, rr) > 0.7 and grave_d(x, rr) < 0.88 and k.rng.random() > 0.15 and not (UC[0] - 0.5 < x < UC[1] + 0.5 and UC[2] - 0.6 < rr < UC[3] + 0.6):
            I.headstone(k, x, rr, lean=k.rng.uniform(-14, 14), kind=k.rng.choice((0, 0, 1, 2)))
# an iron railing round the east side of the plot, rusted through in places, the gate hanging open on the path
fence = []
for i in range(46):
    a = -1.35 + i * 2.7 / 45
    cx, cr, rx, ry = GRAVES
    x, r = cx + math.cos(a) * rx * 1.02, cr + math.sin(a) * ry * 1.02
    if (int(x), int(r)) in land and pd(x, r) > 0.75 and k.rng.random() > 0.12:
        fence.append((x, r))
for (x, r), (x2, r2) in zip(fence, fence[1:]):
    k.cyl(x, r, 0.0, 0.85, 0.025, '#2a2630', 'fence_post', verts=5)
    k.cone(x, r, 0.85, 0.95, 0.03, 0.005, '#2a2630', 'fence_spike', verts=4)
    if math.hypot(x2 - x, r2 - r) < 0.5:
        for z in (0.25, 0.7):
            k.tube((x, r, z), (x2, r2, z + k.rng.uniform(-0.03, 0.03)), 0.015, '#2a2630', 'fence_rail', verts=4)
        k.solid(min(x, x2) - 0.05, min(r, r2) - 0.05, max(x, x2) + 0.05, max(r, r2) + 0.05)
I.mausoleum(k, 7.0, 10.4, 15.6, 18.0)
Crypt.crypt_portal(k, *UC)                                  # the way down to the Undercroft (scenes/lumar_undercroft.py)
gap = [(GRAVES[0] + math.cos(a) * GRAVES[2] * 1.02, GRAVES[1] + math.sin(a) * GRAVES[3] * 1.02)
       for a in (-1.35 + i * 2.7 / 45 for i in range(46))]
gap = [p_ for p_ in gap if pd(*p_) <= 0.75]
if gap:                                                    # the gate where the path goes in, one leaf hanging open
    (gx0, gr0), (gx1, gr1) = gap[0], gap[-1]
    for (x, r) in ((gx0, gr0 - 0.15), (gx1, gr1 + 0.15)):
        k.box(x - 0.07, r - 0.07, 0.0, x + 0.07, r + 0.07, 1.25, '#2a2630', 'gate_post')
        k.sphere(x, r, 1.3, 0.07, 0.07, '#2a2630', 'gate_finial', segs=6)
    hx, hr = gx1, gr1 + 0.15                               # hinged on the south post, swung in toward the graves
    ex, er = hx - 0.75, hr + 0.35
    for z in (0.3, 0.75, 1.05):
        k.tube((hx, hr, z), (ex, er, z - 0.08), 0.015, '#2a2630', 'gate_bar', verts=4)
    for t in (0.0, 0.33, 0.66, 1.0):
        x, r = hx + (ex - hx) * t, hr + (er - hr) * t
        k.tube((x, r, 0.25 - 0.08 * t), (x, r, 1.1 - 0.08 * t), 0.012, '#2a2630', 'gate_bar', verts=4)
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
    if grave_d(x, r) < 1.15 or pool_d(x, r) < 3.5 or (36 < x < 46 and 16 < r < 22):
        continue
    if any(math.hypot(x - a, r - b) < 1.3 for (a, b) in trees):
        continue
    trees.append((x, r))
    if k.rng.random() < 0.55:
        I.dead_tree(k, x, r, h=k.rng.uniform(1.6, 2.6), tone='#2a2430')
    else:
        I.red_pine(k, x, r, h=k.rng.uniform(2.2, 3.0), tone='#2a2a40', trunk='#1a1820')

# ---- scatter -------------------------------------------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6 or on_way(x, r, 0.3)
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('moor', 'moss', 'grave')], '#3e4448', per_cell=1.0, avoid=busy, flowers=0.12)
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
         {'x': 5, 'y': 21, 'type': 'enter_world', 'target': 'lumar-undercroft', 'spawn': [7, 4], 'label': 'THE UNDERCROFT', 'prompt': 'PRESS E TO GO DOWN'},
         look('TOMB', 9, 19, 'A SMALL STONE TOMB, ITS DOOR AJAR, VIOLET LIGHT INSIDE.\n\nCARVED ABOVE THE DOOR: "THEY LISTENED TOO."'),
         look('MOON POOL', 36, 27, 'A ROUND POOL RINGED WITH STANDING STONES. THE WATER IS PERFECTLY STILL.\n\nTHE MOON IN IT IS NOT THE MOON IN THE SKY. IT IS FULL, AND GREEN.'),
         look('ABBEY RUINS', 41, 19, 'THREE ARCHES OF AN ABBEY WHOSE WALLS ARE GONE, AND ONE OF THOSE ARCHES HALF FALLEN.\n\nTHE MONKS HERE KEPT A RECORD OF EVERY SHIP THAT PASSED. THE BOOK IS GONE TOO.'),
         look('WISP LANTERN', 22, 13, 'A VIOLET FLAME IN AN IRON CAGE. NOTHING FEEDS IT.\n\nWHEN YOU STEP AWAY IT LEANS AFTER YOU.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FJET, scene_id='lumar-midnight',
            scene_extra={'backdrop': True, 'mist': True})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER and (c, r) not in FJET:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -3.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('midnight done; pier', pier_top, 'door row', door_row, 'walkable', len(walk))
