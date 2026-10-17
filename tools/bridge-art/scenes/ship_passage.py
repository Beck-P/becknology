"""The passage aboard the Wayfarer — Blender scene: the companionway running aft from the bridge's south door, where the
ship grows longer (js/wayfarer.js).

  BVENV/bin/python tools/bridge-art/scenes/ship_passage.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/ship-passage

A long panelled passage under ship's lanterns, a runner down the middle, round ports onto space between three module
bays in the back wall. Each bay is a variant: `sealed` (an iron blank, riveted, a builder's tag, a coil of cable
waiting) or `fitted` (a panelled door with a light in it, a lamp over it and its nameboard): the galley and mess, the
observatory, the greenhouse deck. The watch bill by the bridge door (a hole: js/worlds/wayfarer.js pins the crew's faces
to it), the scuttlebutt and the fire buckets, the crew's lockers, and at the far end the hatch down to their berths,
open and lamplit. The world JSON is written here, then apply_world fits its collisions. SCENE_SAMPLES=12 previews.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_deck as D                        # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_wayfarer as F                    # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'ship-passage.json')
COLS, ROWS = 30, 9
RF = 4.0
H = 3.2 / math.cos(THETA)
C = math.cos(THETA)
# the bays: module → (xa, xb), the door tiles under them, its glow and the colour of its nameboard
BAYS = {
    'galley':      ((5.2, 6.8), (5, 6), '#ffc070', '#f0c060'),
    'observatory': ((12.2, 13.8), (12, 13), '#8aa8ff', '#a0c0ff'),
    'greenhouse':  ((19.2, 20.8), (19, 20), '#a8f070', '#b0e870'),
}
PORTS = [(3.6, 1.75, 0.36), (9.6, 1.75, 0.36), (16.5, 1.75, 0.36), (22.6, 1.75, 0.36)]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=1717)

# ---- shell ----------------------------------------------------------------------------------------------------------
HATCH = (25.9, 27.3, 5.0, 6.4)
hx0, hx1, hr0, hr1 = HATCH[0] - 0.12, HATCH[1] + 0.12, HATCH[2] - 0.12, HATCH[3] + 0.12
for (a, b, c, d) in ((1, RF, hx0, 8), (hx0, RF, hx1, hr0), (hx0, hr1, hx1, 8), (hx1, RF, 29, 8)):   # round the hatch's hole
    D.deck_floor(k, a, b, c, d)
F.back_wall(k, 0.5, 29.5, RF, H, doors=[b[0] for b in BAYS.values()], portholes=PORTS)
D.side_wall(k, 0.4, 1.0, 3.5, 8.0, H, door=(5.0, 7.0))                    # to the bridge
D.side_wall(k, 29.0, 29.6, 3.5, 8.0, H, face=-1)
F.front_wall(k, 0.4, 29.6, 8.0)
F.runner(k, 1.6, 5.35, 25.0, 6.55)
k.area_light(14.5, RF + 0.6, 3.0, '#6a80d0', 18, 12.0, rot=(math.radians(-55), 0, 0))    # starlight through the ports

# ---- the bays (variants: js/wayfarer.js shows each as fitted or not) -------------------------------------------------
for i, (mod, ((xa, xb), _t, glow, sign)) in enumerate(BAYS.items()):
    with k.variant('bay_' + mod, 'sealed'):
        F.sealed_bay(k, xa, xb, RF, i + 1)
    with k.variant('bay_' + mod, 'fitted'):
        F.bay_door(k, xa, xb, RF, glow=glow, sign_glow=sign)

# ---- along the wall --------------------------------------------------------------------------------------------------
BILL = F.watch_bill(k, 1.35, 2.85, RF + 0.06, 1.0, 2.3)
F.fire_buckets(k, 7.75, RF, n=3)
F.water_butt(k, 8.3, RF + 0.45)
k.solid(7.9, RF, 8.8, RF + 0.75)
D.wall_clock(k, 10.9, RF + 0.06, 2.45, rad=0.22)
A.crate(k, 10.6, RF + 0.1, s=0.55)
A.crate(k, 10.75, RF + 0.12, s=0.45, z0=0.55, tone=A.WOOD)
F.lockers(k, 14.6, 15.8, RF)
F.lockers(k, 17.3, 18.6, RF)
F.rope_coil(k, 21.9, RF + 0.45)
D.sea_chest(k, 24.0, RF + 0.35)
for x in (23.6, 23.95, 24.3, 24.65):                                         # oilskins on pegs
    k.box(x - 0.02, RF, 1.95, x + 0.02, RF + 0.12, 1.99, A.WOOD_DD, 'peg')
for x, col in ((23.6, '#c8a030'), (24.3, '#2a4a6a')):
    k.blob(x, RF + 0.14, 1.55, 0.16, 0.08, 0.4, (col, 0.08), 'oilskin', segs=10)
    k.sphere(x, RF + 0.14, 1.95, 0.1, 0.07, (col, 0.08), 'sou_wester', segs=8)
F.hatch_down(k, *HATCH)
F.rope_coil(k, 26.6, 7.4, rad=0.24)
A.bucket(k, 28.5, RF + 0.4)
A.barrel(k, 28.5, 7.2, h=0.85)

# ---- light ----------------------------------------------------------------------------------------------------------
for x in (4.45, 7.38, 11.5, 21.6, 25.6):
    F.wall_lantern(k, x, RF, energy=9)
for x in (3.0, 8.5, 14.0, 19.5, 25.0):
    k.point_light(x, 6.2, 2.5, '#ffc890', 42, radius=0.5)

SAMPLES = int(os.environ.get('SCENE_SAMPLES', '96'))
k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}},
         light_samples=SAMPLES, world_light=('#2a2438', 0.4))

# ---- the world -------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Passage', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'wayfarer',
          'spawns': {'player': [1, 5]}, 'leaveLabel': '&#8592; BRIDGE', 'leaveTo': 'bridge'})


def it(x, y, typ, label, prompt, **kw):
    d = {'x': x, 'y': y, 'type': typ, 'label': label, 'prompt': prompt}
    d.update(kw)
    return d


def say(xs, y, label, text, prompt='LOOK'):
    return [it(x, y, 'dialog', label, prompt, dialog=text) for x in xs]


ROOMS = {'galley': ('ship-galley', 'THE GALLEY', [8, 10]), 'observatory': ('ship-observatory', 'THE OBSERVATORY', [9, 10]),
         'greenhouse': ('ship-greenhouse', 'THE GREENHOUSE', [9, 10])}
bays = []
for mod, (_x, tiles, _g, _s) in BAYS.items():
    target, label, spawn = ROOMS[mod]
    bays += [it(x, 3, 'enter_world', label, 'PRESS E TO ENTER', target=target, spawn=spawn, module=mod, noBeacon=True) for x in tiles]
w['interactions'] = (
    [it(0, y, 'enter_world', 'BRIDGE', 'TO THE BRIDGE', target='bridge', spawn=[13, 12], noBeacon=True) for y in (5, 6)] +
    bays +
    [it(x, 4, 'wayfarer', 'WATCH BILL', 'PRESS E TO READ', part='watch') for x in (1, 2)] +
    [it(8, 4, 'wayfarer', 'SCUTTLEBUTT', 'PRESS E TO DRINK', part='butt')] +
    [it(26, 5, 'wayfarer', 'HATCH', 'PRESS E TO LOOK DOWN', part='hatch'), it(26, 6, 'wayfarer', 'HATCH', 'PRESS E TO LOOK DOWN', part='hatch')] +
    say((14, 15, 17, 18), 4, 'LOCKERS', "THE CREW'S LOCKERS. EACH HAS A NAME CHALKED ON IT, AND ONE HAS A SECOND NAME CHALKED OVER THE FIRST.") +
    say((7,), 4, 'FIRE BUCKETS', 'LEATHER BUCKETS, FULL OF SAND. NOBODY HAS EVER HAD TO USE THEM, WHICH THE COOK PUTS DOWN TO HER.') +
    say((10,), 4, 'SHIP\'S CLOCK', "THE SHIP'S CLOCK. IT KEEPS THE WATCHES: SIX OF THEM TO THE SHIP'S DAY, AND THE SHIP'S DAY IS FOUR HOURS OF YOURS.") +
    say((23, 24), 4, 'OILSKINS', 'OILSKINS AND SOU\'WESTERS ON PEGS. THERE IS NO RAIN IN SPACE. THE CREW KEEP THEM ANYWAY.')
)
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
bx0, bz0, bx1, bz1, br = BILL
doors = [(0, 5), (0, 6)] + [(x, 3) for (_x, tiles, _g, _s) in BAYS.values() for x in tiles]
apply_world(WORLD, k, (1, 4, 28, 7), doors=doors, scene_id='ship-passage',
            scene_extra={'flicker': {'mode': 'pulse'}, 'layers': {'bay_' + m: 'sealed' for m in BAYS},
                         'sky': [2.9, round(RF - 2.2 * C, 3), 23.3, round(RF - 1.3 * C, 3)],
                         'bill': [round(bx0, 3), round(br - bz1 * C, 3), round(bx1, 3), round(br - bz0 * C, 3)]})
print('passage done')
