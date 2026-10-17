"""Hoarfell — the heart of the hidden valley: the high snowfield where the glacier begins, through the monastery's ice gate.
Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_heart.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-heart

A great bowl of smooth snow under a ring of ice cliffs and seracs, the peaks standing over it. Smooth on purpose: the
glacier wyrm swims under it (js/valley.js) and the snow has to show its ripples. Round the edge, what it has eaten —
ribs as tall as a house half sunk in the drifts, a sledge, a tusk — a frozen tarn black and glassy on the east, sastrugi
carved by the wind, and on a ledge of rock in the north the old monks' shrine to it, a cairn of offerings. The gate back
to the monastery is at the south.
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
WID = 'hoarfell-heart'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 40
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=7.0, margin_bottom=0.6, seed=3779)
ICE = ('#bcdcef', '#8cc4e2', '#5a9ac8', '#3a74a8')


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bowl_d(x, r):
    """> 0 inside the bowl."""
    d = 1 - math.hypot((x - 23.0) / 19.5, (r - 20.0) / 16.5)
    return d * 16 + 0.6 * I.n2(x, r, 0.4, 5)


def height(x, r):
    d = bowl_d(x, r)
    h = 0.35 * sm(2.0, -1.0, d)
    if d > 2.0:                                                       # wind-carved sastrugi out toward the edge
        h += 0.05 * max(0.0, math.sin(x * 2.2 + r * 0.7 + I.n2(x, r, 0.6, 3) * 3)) * sm(6.0, 2.0, d)
    return h


TARN = (37.0, 22.0, 3.2, 2.2)


def material(x, r):
    if bowl_d(x, r) < 0.5:
        return 'snow'
    return 'snowfield' if I.n2(x * 0.6, r * 0.6, 1.0, 9) > -0.2 else 'windpack'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, ROWS + 1)]
I.ground(k, cells, material, {'snow': (N.SNOW, 0.04), 'snowfield': ('#eaf0f8', 0.02), 'windpack': ('#d8e0ec', 0.04)},
         step=0.25 if QUICK else 0.125, bump=0.006, seed=41, height=height, dither=0.06)

# the ring of ice cliffs and seracs, the peaks over them
ring = [(c, r) for c in range(-2, COLS + 2) for r in range(-10, ROWS + 2) if bowl_d(c + 0.5, r + 0.5) < -0.4 and not (20 <= c <= 26 and r >= 34)]
I.ridge(k, ring, top=3.4, slope=1.2, seed=149, rock='#e2ecf6', strata=('#8ab8d8', '#6a9ac0', '#a8d0e8', '#5a8ab0'), moss=N.ROOF_SNOW,
        foot=0.5, patchy=False)
far = [(c, r) for c in range(-2, COLS + 2) for r in range(-10, -2)]
I.ridge(k, far, top=11.5, slope=2.8, seed=151, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'), moss=N.ROOF_SNOW, foot=0.9, patchy=False)
for i in range(26):                                                    # seracs along the foot of the ring
    a = i / 26 * math.tau
    x, r = 23.0 + math.cos(a) * 19.0, 20.0 + math.sin(a) * 16.0
    if r > 33 and 18 < x < 28:
        continue
    s = k.rng.uniform(0.5, 0.9)
    k.blob(x, r, s * 0.7, s, s * 0.8, s * 0.9, (ICE[k.rng.randrange(3)], 0.06), 'serac', rot=(k.rng.uniform(-14, 14), k.rng.uniform(-10, 10), k.rng.uniform(0, 90)),
           segs=6, smooth=False)
    k.blob(x - 0.05, r - 0.05, s * 1.45, s * 0.7, s * 0.55, s * 0.25, (N.ROOF_SNOW, 0.08), 'serac_snow', segs=6)

# ---- what it has eaten: ribs, a tusk, a sledge -----------------------------------------------------------------------------
BONE = '#e2dac8'
for (x0, r0, L, rot) in ((9.0, 12.0, 4.4, 0.3), (33.0, 31.0, 3.6, -0.2)):
    n = 7
    for i in range(n):
        x = x0 + math.cos(rot) * L * i / n
        r = r0 + math.sin(rot) * L * i / n
        h = 1.6 * math.sin(math.pi * (i + 0.5) / n) + 0.4
        k.tube((x, r - 0.6, height(x, r) - 0.1), (x + 0.1, r - 0.2, height(x, r) + h), 0.09, (BONE, 0.08), 'rib', rb=0.06, verts=7)
        k.tube((x + 0.1, r - 0.2, height(x, r) + h), (x + 0.15, r + 0.5, height(x, r) + h * 0.5), 0.07, (BONE, 0.08), 'rib', rb=0.05, verts=7)
        k.blob(x, r - 0.6, height(x, r), 0.3, 0.25, 0.12, (N.SNOW, 0.04), 'drift', segs=7)
    k.tube((x0 - 0.4, r0, height(x0, r0) + 0.3), (x0 + math.cos(rot) * L, r0 + math.sin(rot) * L, height(x0, r0) + 0.25), 0.12, (BONE, 0.08), 'spine',
           rb=0.08, verts=8)
    k.solid(x0 - 0.6, r0 - 1.0, x0 + math.cos(rot) * L + 0.6, r0 + math.sin(rot) * L + 0.6)
k.tube((13.6, 30.0, 0.0), (15.2, 30.6, 1.1), 0.16, (BONE, 0.08), 'tusk', rb=0.04, verts=8)
k.solid(13, 29, 16, 31)
k.box(29.0, 9.0, 0.0, 30.4, 9.4, 0.22, (N.LOG, 0.12), 'sledge', bevel=0.02)
k.box(28.9, 9.0, 0.22, 30.5, 9.08, 0.42, (N.LOG_D, 0.12), 'sledge_rail')
k.blob(29.4, 9.2, 0.3, 0.6, 0.35, 0.18, (N.SNOW, 0.04), 'drift', segs=8)
k.solid(28.6, 8.6, 30.8, 9.8)

# ---- the frozen tarn on the east ---------------------------------------------------------------------------------------------
k.cyl(TARN[0], TARN[1], -0.06, -0.02, TARN[2], ('#1e3a52', 0.04), 'pond_water', verts=32, ry=TARN[3])
k.cyl(TARN[0], TARN[1], -0.02, 0.0, TARN[2] * 0.96, ('#6a96b8', 0.04), 'ice', verts=32, ry=TARN[3] * 0.94)
for i in range(10):
    a = k.rng.uniform(0, math.tau)
    p = [(TARN[0] + math.cos(a) * 0.3, TARN[1] + math.sin(a) * 0.2)]
    for j in range(4):
        a += k.rng.uniform(-0.7, 0.7)
        p.append((p[-1][0] + math.cos(a) * 0.6, p[-1][1] + math.sin(a) * 0.35))
    for (ax, ar), (bx, br) in zip(p, p[1:]):
        if math.hypot((bx - TARN[0]) / TARN[2], (br - TARN[1]) / TARN[3]) < 0.9:
            k.tube((ax, ar, 0.005), (bx, br, 0.005), 0.012, ('#bcdcef', 0.04), 'crack', verts=4)
k.solid(TARN[0] - TARN[2], TARN[1] - TARN[3], TARN[0] + TARN[2], TARN[1] + TARN[3])

# ---- the monks' shrine to it, on a ledge in the north -----------------------------------------------------------------------
ledge = [(c, r) for c in range(18, 29) for r in range(3, 7)]
LH = I.ridge(k, ledge, top=0.7, slope=1.0, seed=157, rock='#c8ced8', strata=('#6a6e7c', '#565a68', '#7a7e8c'), moss=N.ROOF_SNOW, foot=0.4,
             patchy=False)
A.chorten(k, 23.0, 4.6, s=0.9, z0=0.65)
for (dx, dr, f) in ((-1.6, 0.4, 0.5), (1.6, 0.3, 0.45)):
    for j, ff in enumerate((1.0, 0.7, 0.45)):
        s = f * ff
        k.rock(23.0 + dx, 4.6 + dr, 0.7 + j * s * 1.2, s, s * 0.9, s * 0.6, ('#5a6272', 0.18), part='cairn', segs=7)
A.mani_flags(k, (20.4, 4.8, 1.8), (23.0, 4.6, 2.2), sag=0.3)
A.mani_flags(k, (23.0, 4.6, 2.2), (25.6, 4.8, 1.8), sag=0.3)
for (x, r) in ((20.4, 4.8), (25.6, 4.8)):
    k.cyl(x, r, 0.6, 1.9, 0.03, ('#6a4a2a', 0.1), 'flagpole', verts=6)
k.solid(18, 3, 29, 6)

# ---- the gate back to the monastery (south) ------------------------------------------------------------------------------------
k.box(20.6, 37.4, 0.0, 25.4, 38.2, 2.4, ('#efeae0', 0.08), 'gompa_wall')
k.box(20.5, 37.3, 2.0, 25.5, 38.3, 2.4, ('#6a2420', 0.12), 'penbey')
k.box(22.2, 37.3, 0.0, 23.8, 37.4, 1.8, ('#1a0e08', 0.06), 'doorway', emit=('#ffb060', 0.25))
k.solid(20, 37, 26, 39)

# ---- the edges ---------------------------------------------------------------------------------------------------------------
for r in range(ROWS):
    for c in range(COLS):
        if bowl_d(c + 0.5, r + 0.5) < 0.4 and not (21 <= c <= 24 and r >= 33):
            k.blocked.add((c, r))

A.flush(k)
k.sun((0.8, 0.25, -0.38), '#ffe0c8', 3.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 96, world_light=('#8a96cc', 0.95))

VALLEY = {'spawns': [['wyrm', 23, 19]], 'arena': [6, 6, 40, 34]}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Heart of the Glacier', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [23, 35]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 1.6, 'view': [0.0, -7.0, COLS, ROWS], 'valley': VALLEY,
          'onFaint': {'world': 'hoarfell-monastery', 'spawn': [9, 14], 'who': 'BROTHER ANSELM',
                      'line': 'YOU COME ROUND BY THE BRAZIER, BROTHER ANSELM POURING TEA. "A YETI CARRIED YOU TO THE GATE AND KNOCKED. VERY POLITELY. WATCH THE SNOW, I SAID. IT TELLS YOU WHERE IT RISES."'}})
w['interactions'] = [
    {'x': 23, 'y': 36, 'type': 'enter_world', 'label': 'THE GATE', 'prompt': 'PRESS E TO GO BACK', 'target': 'hoarfell-monastery', 'spawn': [38, 4]},
    {'x': 23, 'y': 6, 'type': 'dialog', 'label': 'THE SHRINE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A CHORTEN ON A LEDGE OF ROCK, PRAYER FLAGS RAGGED IN THE WIND, AND HEAPED ROUND IT A THOUSAND YEARS OF OFFERINGS TO WHATEVER SWIMS UNDER THE SNOW: BUTTER LAMPS, COINS, BONES, A CHILD\'S WOODEN HORSE. SOMEBODY CARVED ON THE ROCK: "LET IT SLEEP."'},
    {'x': 9, 'y': 13, 'type': 'dialog', 'label': 'RIBS', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'RIBS AS TALL AS A HOUSE, SMOOTH AS OLD IVORY, STICKING UP OUT OF THE SNOW LIKE THE FRAME OF A BOAT. WHATEVER THIS WAS, SOMETHING BIGGER ATE IT.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, scene_extra={'smoke': []})
print('heart done')
