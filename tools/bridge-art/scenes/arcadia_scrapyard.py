"""The Scrapyards — the Rust Saints' ground, east of the Warrens (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_scrapyard.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-scrapyard

Where the District's broken things come down to: heaps of scrap with lanes between them, crushed hover cars stacked
three high, a magnet crane over it all with its hook hanging, a compactor, burning drums, and the Saints' camp at the
back — shacks of sheet and doors, their halo-and-wrench painted on everything, and on a stage of pallets Saint Ruin's
throne (a car seat on a heap of engine blocks) under an orange halo of neon. The columns go up into the dark behind.
Fights all over (js/undercity.js ROSTER), scrap piles to search, Saint Ruin once a day. World: arcadia-scrapyard, 64 x 36.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_under as U                    # noqa: E402
import assets_cyber as Y                    # noqa: E402
import assets_district as D                 # noqa: E402
import assets_signs as S                    # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-scrapyard'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 64, 36
RF = 7.0
SAINT = '#ff7a2a'

k = Kit(COLS, ROWS, margin_top=0.0, margin_bottom=0.5, seed=6464)
dr = U.Drips()
rng = k.rng

# ---- the ground: oily concrete going to packed dirt and grit ---------------------------------------------------------------
U.concrete(k, -0.5, RF - 0.2, COLS + 0.5, ROWS + 0.6, tones=('#3a3634', '#36322e', '#3e3a36', '#34302c'), rng=rng)
for _ in range(60):                                                              # grit, rust flakes, bolts
    x, r = rng.uniform(0, COLS), rng.uniform(RF, ROWS)
    k.box(x, r, 0.0, x + rng.uniform(0.05, 0.15), r + rng.uniform(0.04, 0.1), 0.01, (rng.choice((U.RUST, '#5a5a60', '#4a3a2a')), 0.2), 'floor_grit')

# ---- the back: the stacks behind, the columns, the Saints' camp --------------------------------------------------------------
U.shanty(k, dr, -0.5, 20.0, RF, 10, top=12.5, base=1.6, rng=rng, lit=0.35, ground=False)
U.column(k, dr, 21.6, RF + 0.4, w=2.8, d=2.6, top=14.0, rng=rng)
U.shanty(k, dr, 23.0, 46.0, RF, 10, top=12.5, base=1.6, rng=rng, lit=0.3, ground=False)
U.column(k, dr, 47.6, RF + 0.4, w=2.8, d=2.6, top=14.0, rng=rng)
U.shanty(k, dr, 49.0, COLS + 0.5, RF, 10, top=12.5, base=1.6, rng=rng, lit=0.35, ground=False)
for (x0, x1) in ((2.0, 8.0), (11.0, 17.0), (25.0, 31.0), (51.0, 57.0)):
    U.tag(k, x0, x1, RF, 0.2, 1.4, SAINT, rng=rng)


def shack(x0, x1, rb, depth=2.0, h=2.2, door=True, col=None):
    """A Saints' shack: sheet walls, a door that was someone's front door once, a sloped tin roof, a lamp."""
    col = col or rng.choice(('#5a4a3a', '#4a5a5a', '#5a3a2a', '#4a4a50'))
    rf = rb + depth
    k.box(x0, rb, 0, x1, rf, h, (col, 0.15), 'shack')
    U._clad(k, x0, x1, rf, 0, h, col, 'corrugated', rng)
    k.poly([(x0 - 0.15, rb - 0.1, h + 0.35), (x1 + 0.15, rb - 0.1, h + 0.35), (x1 + 0.15, rf + 0.3, h - 0.05), (x0 - 0.15, rf + 0.3, h - 0.05)],
           (rng.choice(('#6a6a70', '#5a4030', '#3a4a4a')), 0.15), 'roof_tin')
    if door:
        dx = rng.uniform(x0 + 0.3, x1 - 1.2)
        k.box(dx, rf, 0, dx + 0.8, rf + 0.04, 1.75, (rng.choice(('#3a5a8a', '#8a2a2a', '#c8c0a0', '#2a5a3a')), 0.15), 'shack_door')
        k.sphere(dx + 0.65, rf + 0.05, 0.9, 0.035, 0.035, '#c8a040', 'door_knob', segs=6)
    U.caged_bulb(k, x0 + 0.4, rf + 0.25, h - 0.2, energy=10)
    k.solid(x0, rb, x1, rf)


shack(34.0, 37.4, RF, depth=2.2, h=2.4)
shack(38.0, 41.6, RF, depth=2.4, h=2.2)
shack(52.0, 55.6, RF, depth=2.0, h=2.3)
shack(56.2, 60.0, RF, depth=2.4, h=2.4)
# Saint Ruin's throne: a stage of pallets, engine blocks heaped, a car seat on top, the halo in neon over it
k.box(42.4, RF + 0.2, 0.0, 49.6, RF + 3.6, 0.3, ('#6a5a40', 0.15), 'pallet_stage')
k.boxes([(42.4, r, 0.3, 49.6, r + 0.1, 0.32) for r in [RF + 0.3 + i * 0.25 for i in range(13)]], '#5a4a30', 'pallet_slat')
for (x, r, z) in ((45.2, RF + 1.0, 0.3), (46.2, RF + 1.0, 0.3), (46.8, RF + 1.4, 0.3), (45.7, RF + 1.2, 0.75), (46.5, RF + 1.0, 0.75)):
    k.box(x - 0.4, r - 0.3, z, x + 0.4, r + 0.3, z + 0.45, ('#4a4a50', 0.15), 'engine_block', bevel=0.03)
k.box(45.4, RF + 1.2, 1.2, 46.6, RF + 1.9, 1.5, ('#2a2a2e', 0.1), 'throne_seat', bevel=0.06)
k.box(45.4, RF + 0.9, 1.4, 46.6, RF + 1.25, 2.6, ('#2a2a2e', 0.1), 'throne_back', bevel=0.06)
S._tubes(k, [(46.0 + 0.8 * math.cos(a * math.pi / 10), 3.4 + 0.3 * math.sin(a * math.pi / 10)) for a in range(21)], RF + 0.85, SAINT, tube=0.03)
k.point_light(46.0, RF + 1.6, 3.2, SAINT, 50, radius=0.6, group='flicker')
k.solid(44.4, RF + 0.6, 47.4, RF + 2.0)
U.drum_fire(k, 43.2, RF + 3.0)
U.drum_fire(k, 48.8, RF + 3.0)

# ---- the yard: walls of scrap with lanes between, containers stacked, crushed cars, floodlights ---------------------------------
RIDGES = [(5.0, 17.0, 16.8), (22.0, 31.0, 16.8), (35.0, 44.0, 16.8), (50.0, 59.0, 16.8),
          (2.0, 13.0, 22.8), (17.0, 27.0, 22.8), (32.0, 41.0, 22.8), (46.0, 56.0, 22.8),
          (6.0, 19.0, 28.8), (24.0, 37.0, 28.8), (42.0, 52.0, 28.8), (56.0, 63.0, 28.8)]
for (a0, a1, r) in RIDGES:
    U.scrap_ridge(k, a0, a1, r, h=rng.uniform(1.8, 2.6), rng=rng)
HEAPS = [(((a0 + a1) / 2 + rng.uniform(-2, 2)), r + 0.8, 1.0) for (a0, a1, r) in RIDGES]   # where to search: the foot of each wall
for (x0, r0, n, cols) in ((1.0, 8.0, 2, ('#c86a2a', '#2a6a8a')), (1.0, 10.6, 1, ('#a02a2a',)), (24.6, 8.0, 2, ('#2a8a5a', '#c8a030')),
                          (28.0, 8.0, 1, ('#3a5aa0',))):
    for j, col in enumerate(cols):
        k.box(x0, r0, j * 1.25, x0 + 3.2, r0 + 1.3, j * 1.25 + 1.22, (col, 0.15), 'container', bevel=0.03)
        k.boxes([(x0 + 0.1 + i * 0.2, r0 + 1.3, j * 1.25 + 0.05, x0 + 0.16 + i * 0.2, r0 + 1.32, j * 1.25 + 1.17) for i in range(15)], shade(col, 1.25), 'container_rib')
        k.box(x0 + 0.2, r0 + 1.32, j * 1.25 + 0.7, x0 + 1.4, r0 + 1.33, j * 1.25 + 0.95, '#e8e8e0', 'container_mark')
    k.solid(x0, r0, x0 + 3.2, r0 + 1.3)
def car_stack(x, r, n=3):
    """Crushed hover cars stacked: flattened slabs of colour, glass crazed."""
    for i in range(n):
        col = rng.choice(('#c8a030', '#a02a2a', '#2a5a9a', '#c8c8d0', '#2a7a4a', '#d06020'))
        dx = rng.uniform(-0.15, 0.15)
        z = i * 0.55
        k.box(x - 1.0 + dx, r - 0.45, z, x + 1.0 + dx, r + 0.45, z + 0.5, (col, 0.25), 'crushed_car', bevel=0.06)
        k.box(x - 0.5 + dx, r + 0.44, z + 0.25, x + 0.3 + dx, r + 0.46, z + 0.45, '#2a3a4a', 'car_glass', emit=('#4060a0', 0.1))
    k.solid(x - 1.1, r - 0.5, x + 1.1, r + 0.5)


for (x, r, n) in ((19.6, 16.8, 3), (47.0, 16.8, 2), (15.0, 22.8, 3), (29.5, 22.8, 2), (43.6, 22.8, 3), (21.6, 28.8, 2), (39.5, 28.8, 3),
                  (54.0, 28.8, 2), (61.0, 16.8, 2), (33.0, 33.6, 3), (12.0, 33.6, 2)):
    car_stack(x, r, n)
for (x, r) in ((20.0, 20.6), (44.0, 26.6), (8.0, 26.6), (58.0, 32.6), (33.0, 13.6)):
    U.floodlight(k, x, r, h=6.0)

# the magnet crane: a lattice tower, a jib over the yard, the cab lit, the magnet hanging
CX, CR = 9.0, 9.4
for (dx, dd) in ((-0.5, -0.4), (0.5, -0.4), (-0.5, 0.4), (0.5, 0.4)):
    k.cyl(CX + dx, CR + dd, 0, 7.0, 0.06, '#c8a030', 'crane_leg', verts=6)
for z in [0.8 + i * 0.9 for i in range(7)]:
    k.boxes([(CX - 0.55, CR - 0.45, z, CX + 0.55, CR - 0.4, z + 0.06), (CX - 0.55, CR + 0.4, z, CX + 0.55, CR + 0.45, z + 0.06)], '#c8a030', 'crane_brace')
k.box(CX - 0.8, CR - 0.7, 7.0, CX + 0.9, CR + 0.7, 8.0, ('#c8a030', 0.12), 'crane_cab', bevel=0.04)
k.box(CX + 0.9, CR - 0.4, 7.2, CX + 0.92, CR + 0.4, 7.8, '#0c1a28', 'crane_glass', emit=('#ffd080', 0.6))
k.box(CX - 0.3, CR - 0.15, 7.9, CX + 14.0, CR + 0.15, 8.2, ('#c8a030', 0.12), 'crane_jib')
k.boxes([(CX + i * 1.0, CR - 0.16, 7.75, CX + i * 1.0 + 0.06, CR + 0.16, 7.9) for i in range(14)], '#a88020', 'crane_brace')
k.tube((CX + 11.0, CR, 7.9), (CX + 11.0, CR + 3.0, 3.4), 0.02, '#2a2a2e', 'crane_cable', verts=4)
k.cyl(CX + 11.0, CR + 3.0, 3.0, 3.4, 0.7, ('#3a3a40', 0.1), 'crane_magnet', verts=18)
k.cyl(CX + 11.0, CR + 3.0, 2.95, 3.0, 0.65, '#5a5a60', 'crane_magnet_face', verts=18)
k.sphere(CX - 0.6, CR, 8.3, 0.08, 0.08, '#ff3030', 'crane_light', emit=('#ff3030', 1.0), segs=6)
k.point_light(CX + 11.0, CR + 3.0, 2.6, '#ffd080', 20, radius=0.3, group='flicker')
k.solid(CX - 0.6, CR - 0.5, CX + 0.6, CR + 0.5)
# the compactor
k.box(54.0, 11.0, 0.0, 59.0, 14.0, 2.0, ('#5a5a3a', 0.12), 'compactor', bevel=0.04)
k.box(54.2, 14.0, 0.3, 58.8, 14.05, 1.7, '#1a1a14', 'compactor_mouth')
k.boxes([(54.2 + i * 0.6, 14.05, 0.3, 54.4 + i * 0.6, 14.08, 1.7) for i in range(8)], '#c8a030', 'hazard_paint')
k.box(57.6, 13.6, 2.0, 58.6, 14.0, 2.5, '#2a2a30', 'compactor_panel')
k.sphere(58.1, 14.02, 2.3, 0.06, 0.06, '#ff3030', 'panel_light', emit=('#ff3030', 1.0), segs=6)
k.solid(54.0, 11.0, 59.0, 14.0)

# ---- the gate back to the Warrens on the west edge; drum fires; lamps; drips ---------------------------------------------------
k.box(-0.5, 12.6, 0, 0.4, 12.8, 2.6, '#3a3842', 'gate_post')
k.box(-0.5, 17.2, 0, 0.4, 17.4, 2.6, '#3a3842', 'gate_post')
S.lightbox(k, '← THE WARRENS', 'RussoOne', 1.4, 12.5, 2.4, 2.0, 0.3, bg='#2a1a08', ink='#ffb050', size=0.18, energy=3)
U.chainlink(k, 0.0, RF + 0.6, 0.0, 12.6, h=2.4)
U.chainlink(k, 0.0, 17.4, 0.0, ROWS + 0.5, h=2.4)
for (x, r) in ((10.0, 19.6), (26.0, 20.0), (38.0, 26.0), (52.0, 20.0), (17.0, 26.0), (60.0, 33.0)):
    U.drum_fire(k, x, r)
for (x, r) in ((3.0, 16.2), (22.0, 27.0), (44.0, 24.0), (62.0, 22.0), (32.0, 11.0)):
    U.sodium(k, x, r, z=3.0, energy=60)
for (x, r) in ((8.0, 26.0), (28.0, 20.0), (42.0, 33.0), (58.0, 20.0), (16.0, 19.0)):
    U.grate_drip(k, dr, x, r, top=13.0)
U.puddles(k, 1, 12, 63, 35, 14, (U.SODIUM, SAINT, '#2a7a5a'), rng=rng)

k.area_light(16, 22, 9.0, '#c08060', 80, 28.0, rot=(math.radians(35), 0, 0))
k.area_light(48, 22, 9.0, '#c07050', 80, 28.0, rot=(math.radians(35), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96, world_light=('#2e2634', 1.4))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Scrapyards', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [1, 15]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


piles = []
for i, (x, r, s) in enumerate(HEAPS):
    piles.append({'x': int(x), 'y': int(r), 'type': 'under', 'act': 'search', 'pile': 'heap%d' % i,
                  'label': 'SCRAP PILE', 'prompt': 'PRESS E TO SEARCH'})
w['interactions'] = [
    {'x': 0, 'y': y, 'type': 'leave_world', 'label': 'THE WARRENS', 'prompt': 'PRESS E TO GO BACK', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [78, 22]}
    for y in (13, 14, 15, 16)] + piles + [
    look(46, 9, 'THRONE', 'A CAR SEAT ON A HEAP OF ENGINE BLOCKS, A HALO OF ORANGE NEON OVER IT. SAINT RUIN HOLDS COURT HERE. THE SEAT IS STILL WARM.'),
    look(9, 10, 'CRANE', 'A MAGNET CRANE, ITS CAB LIT. NOBODY IS IN IT. THE MAGNET SWINGS A LITTLE ANYWAY.'),
    look(56, 14, 'COMPACTOR', 'A COMPACTOR\'S MOUTH, TEETH OF STEEL. A HAND-PAINTED SIGN: "TALK TO THE SAINTS FIRST. OR AFTER." THE "AFTER" IS UNDERLINED.'),
    look(35, 9, 'SHACK', 'A SHACK BUILT FROM DOORS. ONE STILL HAS A NUMBER ON IT: 4B. SOMEONE, ONCE, LIVED BEHIND IT.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, int(RF), COLS - 1, ROWS - 1), doors=[(0, 13), (0, 14), (0, 15), (0, 16)], scene_id=WID, actors=[])
w = json.load(open(WORLD))
w['view'] = [-0.5, 0.0, COLS + 0.5, ROWS + 0.5]
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity', 'turf': {'gang': 'saints', 'rect': [6, 9, 62, 34]},
                  'boss': [46, 11], 'safe': [[0, 11, 5, 19]]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('scrapyard done', len(k.parts), 'parts')
