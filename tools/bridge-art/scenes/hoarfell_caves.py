"""Hoarfell — the ice caves under the glacier's tongue, in the hidden valley. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_caves.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-caves

Inside the glacier: walls of blue ice in layers rising all round, lit from within, pillars where the roof comes down to
the floor, a frozen waterfall, a black pool, hoar crystals glowing in clusters, icicles hanging in curtains where the ice
bats roost and rime-crusted mounds where the beetles nest (js/valley.js). A chasm splits the cave with one ice bridge
over it; the monks left lanterns on poles and a rope along the way. Something enormous and very old is frozen in the
north wall. The way out to the valley is in the south-west; in the north-east the monks' stair climbs into the monastery's
lower halls.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_alpine as A              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-caves'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 38, 30
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=4.0, margin_bottom=0.6, seed=1113)
ICE = ('#bcdcef', '#8cc4e2', '#5a9ac8', '#3a74a8')


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- the cave's outline: a blob of floor inside the ice --------------------------------------------------------------------
LOBES = [(10.0, 20.0, 7.0, 6.5), (19.0, 15.0, 8.5, 7.0), (28.0, 10.0, 7.5, 6.0), (31.0, 18.0, 5.0, 5.0), (8.0, 25.5, 4.0, 3.0)]


def floor_d(x, r):
    """> 0 inside the cave (roughly tiles from the wall)."""
    best = -9.0
    for (cx, cr, rx, ry) in LOBES:
        d = 1 - math.hypot((x - cx) / rx, (r - cr) / ry)
        best = max(best, d * min(rx, ry))
    return best + 0.35 * I.n2(x, r, 0.7, 5)


CHASM = [(14.0, 8.0), (16.5, 13.0), (17.6, 18.0), (16.0, 23.0), (17.0, 28.0)]
BRIDGE = (17.2, 16.0)                                                      # where the one ice bridge crosses


def chasm_d(x, r):
    return I.path_dist([CHASM], x, r) - 0.55 - 0.15 * math.sin(r * 1.3)


def height(x, r):
    d = floor_d(x, r)
    h = 0.0
    h += 0.08 * max(0.0, I.n2(x * 0.9, r * 0.9, 1.0, 11))
    if d < 0.6:
        h += 0.5 * sm(0.6, -0.4, d)
    return h


def material(x, r):
    if floor_d(x, r) < -0.2:
        return 'ice_wall_foot'
    n = I.n2(x * 1.1, r * 1.1, 1.0, 13)
    return 'ice_floor' if n > 0.15 else 'rubble'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-6, ROWS + 1) if floor_d(c + 0.5, r + 0.5) > -1.5]
I.ground(k, cells, material, {'ice_floor': ('#a8cce4', 0.06), 'rubble': ('#8a96a8', 0.16), 'ice_wall_foot': ('#7aa8cc', 0.08)},
         step=0.25 if QUICK else 0.125, bump=0.012, seed=17, height=height, dither=0.08)

# the walls: blue ice in layers, all round the outline, rising up out of the top of the view
wall = [(c, r) for c in range(-2, COLS + 2) for r in range(-8, ROWS + 2) if floor_d(c + 0.5, r + 0.5) <= -0.1]
I.ridge(k, wall, top=4.2, slope=1.0, seed=29, rock='#cfe4f2', strata=ICE, moss='#e2f0f8', foot=0.45, patchy=False)

# ---- the chasm and its one bridge -------------------------------------------------------------------------------------------
DEPTH = (('#5a9ac8', 0.0), ('#3a74a8', 0.5), ('#1e4a7a', 1.2), ('#0c2244', 2.0), ('#040a18', 3.0))
xs = []
for (ax, ar), (bx, br) in zip(CHASM, CHASM[1:]):
    for i in range(12):
        t = i / 12
        xs.append((ax + (bx - ax) * t, ar + (br - ar) * t))
xs.append(CHASM[-1])
rings = []
for (col, zz) in DEPTH:
    f = 1 - (zz / 3.0) * 0.6
    left, right = [], []
    for j, (x, r) in enumerate(xs):
        w = (0.55 + 0.15 * math.sin(r * 1.3)) * f
        left.append((x - w, r, -zz))
        right.append((x + w, r, -zz))
    rings.append(left + right[::-1])
for j in range(len(rings) - 1):
    k.loft([rings[j], rings[j + 1]], (DEPTH[j][0], 0.08), 'chasm', closed=True, smooth=False)
bx_, br_ = BRIDGE
k.box(bx_ - 1.0, br_ - 0.55, -0.25, bx_ + 1.0, br_ + 0.55, 0.04, ('#c8e2f2', 0.05), 'ice_bridge', bevel=0.05)
k.box(bx_ - 0.9, br_ - 0.45, 0.04, bx_ + 0.9, br_ + 0.45, 0.07, (N.SNOW, 0.04), 'bridge_snow')
for i in range(6):
    k.cone(bx_ - 0.8 + i * 0.32, br_ + 0.5, -0.7, -0.22, 0.005, 0.04, ('#a8d4ea', 0.05), 'icicle', verts=5)

# ---- pillars, the frozen fall, the pool, crystals, icicle curtains, nests ------------------------------------------------------
PILLARS = [(12.6, 13.4, 0.6), (24.0, 19.4, 0.7), (29.4, 14.0, 0.55), (7.2, 18.0, 0.5)]
for (x, r, s) in PILLARS:
    k.tube((x, r, 0.0), (x + 0.05, r, 4.0), s, (ICE[1], 0.06), 'ice_pillar', rb=s * 0.7, verts=10)
    for z in (0.6, 1.4, 2.4):
        k.blob(x, r, z, s * 1.2, s * 1.0, 0.35, (ICE[0], 0.05), 'ice_pillar', segs=8)
    k.solid(x - s, r - s * 0.8, x + s, r + s * 0.8)
# the frozen waterfall down the north wall into the pool
FX, FR = 26.0, 5.6
for i in range(14):
    x = FX - 1.2 + i * 0.18
    mid = 1 - abs((i - 6.5) / 7)
    k.tube((x, FR - 0.6, 4.2), (x + k.rng.uniform(-0.04, 0.04), FR + 0.4, 0.2 + (1 - mid) * 0.8), 0.08 + 0.08 * mid,
           (ICE[i % 3], 0.05), 'icefall', rb=0.05, verts=6)
POOL = (27.2, 7.8, 2.0, 1.2)
k.cyl(POOL[0], POOL[1], -0.12, -0.08, POOL[2], ('#0e2a40', 0.04), 'pond_water', verts=28, ry=POOL[3])
k.cyl(POOL[0], POOL[1], -0.2, -0.12, POOL[2] + 0.1, ('#2a4a6a', 0.06), 'pool_floor', verts=28, ry=POOL[3] + 0.08)
k.point_light(POOL[0], POOL[1], 0.3, '#4ab0e0', 10, radius=0.3, group='static')
k.solid(POOL[0] - POOL[2], POOL[1] - POOL[3], POOL[0] + POOL[2], POOL[1] + POOL[3])
k.solid(FX - 1.4, FR - 1.0, FX + 1.4, FR + 0.6)
# hoar crystals glowing in clusters along the walls
CRYST = [(5.0, 21.0), (13.0, 9.6), (21.6, 9.4), (33.4, 13.6), (34.0, 20.4), (22.0, 22.6), (9.6, 26.0), (30.6, 6.4)]
for (x, r) in CRYST:
    W.shore_crystals(k, x, r, col=('#1a3a6a', '#7ac8ff'), s=0.8, energy=6)
# icicle curtains where the bats roost (hung from the wall's lip)
for (x0, x1, r) in ((9.0, 12.0, 14.2), (30.0, 33.0, 22.8), (20.0, 23.0, 8.6)):
    x = x0
    while x < x1:
        L = k.rng.uniform(0.3, 1.0)
        k.cone(x, r, 3.6 - L, 3.6, 0.005, 0.06, (ICE[0], 0.05), 'icicle', verts=5)
        x += k.rng.uniform(0.12, 0.22)
# rime-crusted mounds: the beetles' nests
for (x, r) in ((27.6, 17.2), (31.0, 11.4), (22.2, 13.2)):
    for j in range(4):
        k.blob(x + k.rng.uniform(-0.4, 0.4), r + k.rng.uniform(-0.3, 0.3), 0.1, k.rng.uniform(0.25, 0.4), 0.2, 0.18,
               ('#d8e8f0', 0.12), 'rime_mound', segs=8)
    k.solid(x - 0.5, r - 0.4, x + 0.5, r + 0.4)
# something enormous frozen in the north wall: a great curled shape, a tusk, an eye
k.blob(17.0, 4.6, 2.2, 2.4, 0.7, 1.4, ('#4a5a6a', 0.12), 'frozen_beast', segs=14)
k.tube((15.0, 5.0, 1.6), (13.6, 5.2, 0.9), 0.18, ('#d8d0b8', 0.08), 'frozen_tusk', rb=0.04, verts=8)
k.sphere(15.8, 5.2, 2.5, 0.12, 0.1, '#0a1218', 'frozen_eye', segs=8)
k.box(14.2, 5.4, 0.2, 19.8, 5.5, 3.6, ('#a8d4ea', 0.03), 'ice_veil')
# the monks' lanterns on poles, a rope along the way
LANT = [(8.6, 23.4), (11.6, 18.4), (15.6, 16.2), (19.4, 16.0), (24.0, 13.0), (28.8, 9.6), (32.6, 7.4)]
for (x, r) in LANT:
    k.cyl(x, r, 0.0, 1.6, 0.025, ('#5a3a24', 0.1), 'pole', verts=6)
    W.lantern(k, x, r, 1.45, 1.7, s=0.07, energy=6)
    k.solid_post(x, r)
for (a, b) in zip(LANT, LANT[1:]):
    k.tube((a[0], a[1], 1.4), (b[0], b[1], 1.4), 0.012, ('#a88a50', 0.1), 'rope', verts=4)

# ---- the ways: out to the valley (south-west), the monks' stair (north-east) ------------------------------------------------
k.box(4.8, 28.2, 0.0, 7.6, 28.6, 2.0, '#0a1a10', 'daylight', emit=('#e8f0ff', 0.8))
k.point_light(6.2, 27.6, 1.0, '#e8f0ff', 30, radius=0.6, group='static')
for i in range(6):                                                       # the stair: steps cut up into the ice
    k.box(33.0 + i * 0.3, 4.6 - i * 0.35, i * 0.3, 34.6 + i * 0.3, 5.2 - i * 0.35, i * 0.3 + 0.12, ('#9a96a0', 0.1), 'stair_step', bevel=0.02)
k.box(34.2, 2.2, 1.8, 36.0, 2.6, 3.2, '#2a1808', 'doorway', emit=('#ffb060', 0.5))

# ---- what the game needs ----------------------------------------------------------------------------------------------------
for r in range(ROWS):
    for c in range(COLS):
        if floor_d(c + 0.5, r + 0.5) < 0.25:
            k.blocked.add((c, r))
for (x, r) in xs:
    if abs(r - BRIDGE[1]) > 0.7:
        for dx in (-0.5, 0.0, 0.5):
            k.blocked.add((int(x + dx), int(r)))

A.flush(k)
k.render(OUT, light_states={'full': {'flicker': 1.0, 'static': 1.0}, 'dim': {'flicker': 0.75, 'static': 1.0}},
         light_samples=24 if QUICK else 128, world_light=('#6a90c0', 0.75))

VALLEY = {'spawns': [['beetle', 27, 18], ['beetle', 31, 12], ['beetle', 22, 14], ['beetle', 11, 21],
                     ['bat', 10, 15], ['bat', 31, 21], ['bat', 21, 10], ['bat', 25, 17], ['bat', 8, 19]]}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Ice Caves', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [6, 26]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 1.2, 'hollow': True, 'valley': VALLEY,
          'onFaint': {'world': 'hoarfell-valley', 'spawn': [23, 45], 'who': 'A YETI',
                      'line': 'YOU COME ROUND BY THE SHELTER\'S FIRE IN THE VALLEY, WRAPPED IN SOMETHING THAT SMELLS OF WET FUR. BIG FOOTPRINTS LEAD AWAY TOWARD THE CAVES.'}})
w['interactions'] = [
    {'x': 6, 'y': 27, 'type': 'enter_world', 'label': 'THE VALLEY', 'prompt': 'PRESS E TO GO OUT', 'target': 'hoarfell-valley', 'spawn': [43, 21]},
    {'x': 34, 'y': 4, 'type': 'enter_world', 'label': 'THE MONKS\' STAIR', 'prompt': 'PRESS E TO CLIMB', 'target': 'hoarfell-monastery', 'spawn': [6, 26]},
    {'x': 17, 'y': 6, 'type': 'dialog', 'label': 'IN THE ICE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'DEEP IN THE BLUE WALL, CURLED UP AS IF ASLEEP: SOMETHING THE SIZE OF A HOUSE, A TUSK AS LONG AS YOU ARE, ONE EYE HALF OPEN. THE MONKS HAVE LEFT A BOWL OF RICE AND A CANDLE IN FRONT OF IT.'},
    {'x': 27, 'y': 9, 'type': 'dialog', 'label': 'BLACK POOL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'WATER SO STILL AND DARK IT LOOKS SOLID. A BLUE LIGHT DEEP DOWN THAT MOVES WHEN YOU DON\'T LOOK AT IT.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, scene_extra={'smoke': []})
print('caves done')
