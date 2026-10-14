"""The four Lumar islands — Blender scenes driven by each island's tile map.

  BVENV/bin/python tools/bridge-art/scenes/lumar_islands.py RENDER_DIR crimson|rose|sapphire|midnight
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-<island>

Flagstone ground on the island cells, boulders on the rocky rim, spore
crystals in the island's colour, a pier south to the moored ship — then each
island's own features. The sea is left out: the zone's animated sea (the
world's backdrop) shows all round.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT, ISLAND = sys.argv[1], sys.argv[2]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-' + ISLAND + '.json')
w = json.load(open(WORLD))
names = {int(k_): v for k_, v in w.get('designTileNames', w['tileNames']).items()}
T = w.get('designTiles', w['tiles'])
COLS, ROWS = w['width'], w['height']
SEA = {'emerald_sea', 'crimson_sea', 'sapphire_sea', 'rose_sea', 'midnight_sea', 'void'}

CRYSTAL = {'crimson': ('#6a1a2a', '#e04060'), 'rose': ('#6a2a4a', '#f080b0'), 'sapphire': ('#1a2a6a', '#4080f0'),
           'midnight': ('#2a1a4a', '#8060e0')}[ISLAND]
GROUND = {'crimson': '#7a6460', 'rose': '#8a7880', 'sapphire': '#727a86', 'midnight': '#585870'}[ISLAND]
LIGHT = {'crimson': ('#3a2430', 0.75), 'rose': ('#3a2a40', 0.75), 'sapphire': ('#26344e', 0.8), 'midnight': ('#1e1e3a', 0.7)}[ISLAND]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=1.5, seed=200 + len(ISLAND))

cells, rim, crystals, dock = [], [], [], []
for r in range(ROWS):
    for c in range(COLS):
        n = names.get(T[r][c], 'void')
        if n == 'dock_planks':
            dock.append((c, r))
        elif n in ('ship_dock_png', 'silver_post') or n in SEA or n == 'void' and T[r][c] == 0:
            continue
        else:
            cells.append((c, r))
            if n in ('small_rock', 'saltstone_wall'):
                rim.append((c, r))
            elif n == 'crystal':
                crystals.append((c, r))
if ISLAND == 'midnight':      # ground under the tower (its footprint spans the inlet)
    cells += [(7, 4), (8, 4), (9, 4), (9, 5)]
# the pier runs over the water: planks from the island edge down to the ship
dock_cells = [d for d in dock if d not in cells]
land_dock = [d for d in dock if d in cells]

W.island_ground(k, [c for c in cells if c not in land_dock], tone=GROUND, rim=rim + crystals)
W.border_rocks(k, rim)
for (c, r) in crystals:
    k.rock(c + 0.5, r + 0.5, 0.0, 0.32, 0.26, 0.2, (W.SALT[2], 0.2), part='rim_rock')
    W.shore_crystals(k, c + 0.5, r + 0.45, col=CRYSTAL, s=0.9)
dx = min(c for c, r in dock)
W.dock(k, dx + 0.05, dx + 0.95, min(r for c, r in dock), max(r for c, r in dock) + 1.0, z=0.02)
for (c, r) in dock:
    if (c, r) in cells:
        k.box(c, r, -0.3, c + 1, r + 1, -0.06, '#14181a', 'ground_fill')
ship_r = max(r for c, r in dock) + 1
SL = 7.0     # the galleon lies broadside across the pier's end, the pier meeting it amidships
W.galleon(k, dx + 0.5 - 0.45 * SL, dx + 0.5 + 0.55 * SL, ship_r + 0.75, beam=1.4, masts=0.8)
k.poly([(dx + 0.3, ship_r - 0.3, 0.03), (dx + 0.7, ship_r - 0.3, 0.03), (dx + 0.7, ship_r + 0.25, 0.95),
        (dx + 0.3, ship_r + 0.25, 0.95)], (A.WOOD, 0.14), 'gangplank')
for r in range(ROWS):
    for c in range(COLS):
        if names.get(T[r][c]) == 'silver_post':
            W.silver_post(k, c + 0.5, r + 0.5)

moves, actors, extra = {}, [], {'backdrop': True}

# ---- each island's own features ---------------------------------------------------------------
if ISLAND == 'crimson':
    W.wanted_poster(k, 5.5, 4.4)
    W.lantern_post(k, 5.5, 5.5, energy=20)
    k.point_light(5.8, 5.7, 1.9, '#ff4030', 10, radius=0.1, group='flicker')          # the pirate's red flame
    W.cave_mouth(k, 6.5, 10.0)
    k.solid(6, 9, 7, 10)
    k.box(7.0, 9.0, 0.0, 8.0, 10.0, 0.7, (W.SALT[2], 0.2), 'low_wall')
    k.solid(7, 9, 8, 10)
    for i in range(6):                                                                 # charcoal mark
        a = i * math.pi / 3
        k.bar(9.5, 7.5, 9.5 + math.cos(a) * 0.35, 7.5 + math.sin(a) * 0.3, 0.012, 0.016, 0.04, '#141010', 'charcoal')
    for i in range(4):                                                                 # old rope coil
        k.cyl(4.5, 6.5, 0.01 + i * 0.025, 0.035 + i * 0.025, 0.26 - i * 0.04, '#8a7450', 'rope', verts=14)
    k.solid(8, 6, 9, 7)
    actors = [{'sheet': 'npc-watcher', 'x': 8, 'y': 6, 'facing': 'down'}]
    moves = {"DRAGON'S CAVE": (6, 9), 'DOCK': (8, 12)}
elif ISLAND == 'rose':
    W.workshop(k, 6.0, 9.0, 4.7, 6.0)
    k.cyl(7.5, 6.6, 0.0, 0.12, 0.04, '#e8d0e0', 'vial', emit=('#f080b0', 0.4), verts=8)
    W.wind_chimes(k, 6.5, 8.5)
    W.lantern_post(k, 9.5, 8.5, energy=18)
    k.point_light(9.8, 8.7, 1.9, '#ff70c0', 10, radius=0.1, group='flicker')
    k.solid(8, 7, 9, 8)
    actors = [{'sheet': 'npc-harvester', 'x': 8, 'y': 7, 'facing': 'down'}]
    moves = {'ROSE CRYSTAL': (5, 6), 'DIGGEN\'S POINT': (7, 12)}
elif ISLAND == 'sapphire':
    W.market_stall(k, 5.05, 6.95, 4.1, 4.8, awning=('#2a4a9a', '#e8e8f0'), goods='produce')
    W.market_stall(k, 9.05, 10.95, 4.1, 4.8, awning=('#e8e8f0', '#2a4a9a'), goods='fish')
    for x in (6.5, 10.5):
        W.wall_lantern(k, x, 3.3, z=0.9, energy=8)
    W.lantern_post(k, 5.5, 5.6, energy=18)
    k.point_light(5.8, 5.8, 1.9, '#4080ff', 12, radius=0.1, group='flicker')          # blue flame
    A.crate(k, 10.2, 5.2, s=0.6, tone=A.WOOD_L)
    k.box(4.45, 4.45, 0.0, 4.55, 4.55, 1.3, A.WOOD_D, 'note_post')
    k.box(4.3, 4.55, 0.85, 4.7, 4.58, 1.25, '#e8dcc0', 'note')
    k.solid(4, 4, 5, 5)
    W.potter_wheel(k, 9.7, 8.4)
    k.solid(6, 6, 7, 7)
    actors = [{'sheet': 'npc-trader', 'x': 6, 'y': 6, 'facing': 'down'},
              {'sheet': 'npc-potter', 'x': 9, 'y': 8, 'facing': 'down'}]
    moves = {'STALL': [(5, 4), (9, 4)], 'DIGGEN\'S POINT': (7, 12), 'POTTER': (9, 8)}
elif ISLAND == 'midnight':
    # the sorceress's tower from outside: octagonal stone, conical roof, lit windows
    tx, tr = 8.5, 4.8
    for i in range(8):
        a0, a1 = i * math.pi / 4 + math.pi / 8, (i + 1) * math.pi / 4 + math.pi / 8
        R = 1.25
        k.bar(tx + math.cos(a0) * R, tr + math.sin(a0) * R, tx + math.cos(a1) * R, tr + math.sin(a1) * R, 0.0, 3.4, 0.25,
              ('#4a4458', 0.18), 'tower_wall')
    k.cyl(tx, tr, 0.0, 3.4, 1.2, ('#3e3a4c', 0.16), 'tower_core', verts=8)
    k.cone(tx, tr, 3.4, 5.6, 1.5, 0.02, ('#2a2040', 0.16), 'tower_roof', verts=8)
    k.cyl(tx, tr, 3.35, 3.5, 1.45, '#2a2438', 'tower_eave', verts=8)
    k.sphere(tx, tr, 5.65, 0.1, 0.1, '#b48cff', 'tower_orb', emit=('#9a6af0', 1.0), segs=10)
    W.door(k, tx, tr + 1.15, w=0.7, h=1.3, col='#3a2a4a')
    for (wx, wz) in ((tx - 0.65, 1.9), (tx + 0.65, 1.9), (tx, 2.6)):
        W.window(k, wx, tr + 1.12, wz, w=0.3, h=0.45, shutters=None)
    k.point_light(tx, tr + 2.0, 5.6, '#a080ff', 30, radius=0.3, group='flicker')
    k.solid(7, 4, 10, 6)
    moves = {"SORCERESS'S TOWER": (8, 5), 'DOCK': (7, 13)}

if ISLAND != 'midnight':
    k.point_light(7.5, 7.5, 3.0, '#ffd8b0', 45, radius=1.0)
k.area_light(8.0, 9.0, 10.0, '#8090c8', 600, 16.0, rot=(math.radians(-35), 0, 0))       # moonlight

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128, world_light=LIGHT)

if ISLAND == 'crimson':
    k.solid(6, 8, 7, 9)                 # behind the cave mouth's rocks
xs = [c for c, r in cells]
rs = [r for c, r in cells]
for r in range(min(rs), max(rs) + 1):          # the floor rectangle is only the island: no walking on water
    for c in range(min(xs), max(xs) + 1):
        if (c, r) not in cells and (c, r) not in dock:
            k.solid(c, r, c + 1, r + 1)
apply_world(WORLD, k, (min(xs), min(rs), max(xs), max(rs)), doors=dock_cells, scene_id='lumar-' + ISLAND, moves=moves,
            actors=actors, scene_extra=extra)
print(ISLAND, 'done')
