"""Hoarfell — the summit of the Hoarspire. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_summit.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-summit

The top of the mountain: a snowfield over a sea of cloud (the scene is a
backdrop world — js/worlds/hoarfell.js draws the sky, the cloud sea and the
far range wherever the render is empty), its rim dropping away in cliffs. The
rock crown with the red flag, the chairlift's top station, the start gate
for the ski runs, the summit register on its cairn, an old observatory, prayer
flags, a bench facing the view, and the three routes' anchors at the rim.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                       # noqa: E402
import assets_signs as G                      # noqa: E402
import assets_snow as N                       # noqa: E402
import assets_town as W                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-summit'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 28, 20
C = math.cos(math.radians(45))
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=4.6, seed=4411)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the plateau: one surface traced round a wobbly oval, its rim dropping away in strata --------------------------------------
# (one polygon, not slabs: slabs butting in rows show their seams in the snow)
CX, CR, AX, AR = 14.0, 9.6, 12.6, 8.6


def inside(x, r):
    return ((x - CX) / AX) ** 2 + ((r - CR) / AR) ** 2 + 0.1 * n2(x, r, 0.6, 3) <= 1.0


def rim_t(a):
    lo, hi = 0.0, 1.4
    for _ in range(26):
        mid = (lo + hi) / 2
        if inside(CX + AX * mid * math.cos(a), CR + AR * mid * math.sin(a)):
            lo = mid
        else:
            hi = mid
    return lo


NO = 200
outline = []
for i in range(NO):
    a = i * math.tau / NO
    t = rim_t(a)
    outline.append((CX + AX * t * math.cos(a), CR + AR * t * math.sin(a), a))
k.poly([(CX, CR, 0.0)] + [(x, r, 0.0) for (x, r, a) in outline] + [(outline[0][0], outline[0][1], 0.0)], (N.SNOW, 0.1), 'snow')
STRATA = ('#5a6274', '#4a5264', '#6a7286', '#3e4658')
levels, z = [0.0], 0.0
while z > -6.0:
    z -= 0.42 + 0.2 * abs(n2(z * 3, 1, 1.3, 5))
    levels.append(z)


def ring(z, j):
    pts = []
    for (x, r, a) in outline:
        push = 0.0 if j == 0 else 0.06 * n2(a * 9, z * 3, 1.0, 9) + 0.05 * j      # wandering, and widening toward the foot
        pts.append((x + math.cos(a) * push, r + math.sin(a) * push * 0.8, z))
    return pts


rings = [ring(z, j) for j, z in enumerate(levels)]
for j in range(len(rings) - 1):
    k.loft([rings[j], rings[j + 1]], (STRATA[j % 4], 0.14), 'cliff', closed=True, smooth=False)
for i, (x, r, a) in enumerate(outline):
    if i % 4 == 0:
        k.blob(x - math.cos(a) * 0.12, r - math.sin(a) * 0.1, 0.0, 0.48, 0.2, 0.1, (N.SNOW, 0.1), 'cornice', segs=8)
    if math.sin(a) > 0.25 and k.rng.random() < 0.12:
        d = k.rng.uniform(0.8, 4.0)
        k.rock(x + math.cos(a) * 0.05 * d, r + math.sin(a) * (0.1 + 0.04 * d), -d, 0.32, 0.2, 0.28, ('#4a5264', 0.18), part='crag', segs=7)


def rim_row(x):
    """The rim's row on the south side at column x."""
    south = [(abs(px - x), pr) for (px, pr, a) in outline if math.sin(a) > 0]
    return min(south)[1]


cells = {(c, r) for c in range(COLS) for r in range(ROWS)
         if all(inside(c + dx, r + dr) for dx in (0.1, 0.9) for dr in (0.1, 0.9))}

# the rock crown, the true summit, and its flag
crown = [(c, r) for c in range(9, 20) for r in range(0, 5) if (c, r) in cells]
H = I.ridge(k, crown, top=2.6, slope=1.2, seed=31, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'),
            moss=N.ROOF_SNOW, foot=0.5, patchy=False)
N.summit_flag(k, 14.6, 1.6, H(14.6, 1.6) - 0.05, h=1.8)
k.solid(9, 0, 20, 4)

# ---- the chairlift's top station, the cable dropping away south ---------------------------------------------------------
LX, LR = 21.5, 14.6
bull = N.lift_station(k, LX, LR)
far = [(bull[0][0], LR + 14.0, -12.0), (bull[1][0], LR + 14.0, -12.0)]
lines = []
for s in (0, 1):
    pts = [far[s], bull[s]] if s == 0 else [bull[s], far[s]]
    N.cable(k, pts)
    lines.append([screen(*p) for p in pts])
lines[1] = lines[1][::-1]
k.solid(LX - 1.6, LR - 1.1, LX + 1.6, LR - 0.6)

# ---- the start gate for the ski runs -------------------------------------------------------------------------------------
for x in (6.2, 9.8):
    k.box(x - 0.08, 12.9, 0, x + 0.08, 13.06, 2.2, (N.RED, 0.12), 'gate_post')
k.box(6.0, 12.95, 1.75, 10.0, 13.05, 2.2, ('#f4f0e8', 0.1), 'banner')
G.letters(k, 'START', 'Righteous', 8.0, 13.05, 1.8, size=0.32, col='#c83a2e', lit=False)
for i, col in enumerate(('#3aa060', '#3a7ae0', '#2a2a34')):
    x = 6.6 + i * 1.4
    k.box(x - 0.04, 12.4, 0, x + 0.04, 12.48, 1.1, (N.LOG_D, 0.1), 'run_post')
    k.box(x - 0.35, 12.48, 0.75, x + 0.35, 12.52, 1.1, (col, 0.1), 'run_board')
k.solid(6, 12, 10, 13)
N.ski_rack(k, 3.0, 4.6, 12.8)

# ---- the summit register, the observatory, prayer flags, a bench with the view -------------------------------------------------
for (dx, dr, s) in ((0, 0, 0.45), (0.1, -0.05, 0.34), (-0.05, 0.02, 0.24)):
    k.rock(13.6 + dx, 6.4 + dr, 0.2 + (0.45 - s) * 1.4, s, s * 0.9, s * 0.7, ('#5a6272', 0.18), part='cairn', segs=7)
k.box(13.35, 6.55, 0.95, 13.85, 6.85, 1.3, ('#8a8e98', 0.1), 'register_box')
k.box(13.33, 6.53, 1.3, 13.87, 6.87, 1.36, (N.ROOF_SNOW, 0.1), 'register_snow')
k.solid(13, 6, 14, 7)

k.box(2.4, 5.2, 0, 5.6, 7.8, 1.8, ('#7a7e8a', 0.16), 'obs_wall', bevel=0.02)
k.sphere(4.0, 6.5, 1.8, 1.45, 1.1, ('#c8ccd6', 0.12), 'obs_dome', segs=20)
k.box(3.85, 5.0, 1.9, 4.15, 7.9, 2.95, ('#20222c', 0.1), 'obs_slit')
k.tube((4.0, 6.0, 2.2), (4.0, 5.2, 3.0), 0.12, ('#a08040', 0.1), 'telescope', verts=10)
W.door(k, 4.0, 7.82, col=N.LOG_D)
W.window(k, 3.0, 7.84, 0.8, w=0.4, h=0.45)
W.window(k, 5.0, 7.84, 0.8, w=0.4, h=0.45)
k.solid(2, 5, 6, 8)

for (a, b) in (((9.5, 4.6, 1.5), (13.0, 7.2, 1.2)), ((14.2, 7.2, 1.2), (19.2, 4.8, 1.5))):
    W.bunting(k, a, b, sag=0.3, cols=('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030'))
for (x, r) in ((9.5, 4.6), (13.6, 7.2), (19.2, 4.8)):
    k.cyl(x, r, 0, 1.6, 0.03, (N.LOG_D, 0.1), 'flag_pole', verts=6)

W.bench(k, 14.2, 15.8, 16.6)
for (x, r, s) in ((3.4, 15.0, 0.5), (24.6, 9.0, 0.6), (25.4, 12.0, 0.4), (2.2, 10.6, 0.45), (17.6, 11.4, 0.35)):
    k.rock(x, r, 0.1, s, s * 0.8, s * 0.7, ('#5a6272', 0.2), part='boulder', segs=8)
    k.blob(x, r, s * 0.6, s * 0.75, s * 0.6, s * 0.3, (N.SNOW, 0.1), 'boulder_snow', segs=8)
    k.solid(x - s, r - s * 0.8, x + s, r + s * 0.8)

# ---- the routes' anchors at the rim: a bolt plate, a coil of rope, the line over the edge -----------------------------------------
TOPS = {'staircase': (6, 16, '#e0b030'), 'icefall': (12, 17, '#3a8ae0'), 'hoarspire': (19, 17, N.RED)}
for rid, (x, r, col) in TOPS.items():
    while (x, r + 1) in cells:
        r += 1
    rr = rim_row(x + 0.5)
    k.box(x + 0.3, r + 0.5, 0, x + 0.7, r + 0.62, 0.12, ('#c0c4cc', 0.1), 'anchor')
    k.cyl(x + 0.25, r + 0.2, 0, 0.1, 0.22, (col, 0.12), 'rope_coil', verts=12)
    k.tube((x + 0.5, r + 0.56, 0.06), (x + 0.5, rr + 0.04, 0.03), 0.02, (col, 0.1), 'rope', verts=4)
    k.tube((x + 0.5, rr + 0.04, 0.03), (x + 0.56, rr + 0.5, -4.5), 0.02, (col, 0.1), 'rope', verts=4)
    TOPS[rid] = (x, r, col)

# ---- the light: the same evening, higher up: the sun lower and pinker, the cloud sea's blue in the shadows -------------------------
k.sun((0.85, 0.2, -0.3), '#ffb894', 3.4, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#8a90d0', 0.95))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hoarspire', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [20, 15]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'summit': True})
FEET = {'staircase': [8, 7], 'icefall': [22, 7], 'hoarspire': [35, 7]}
NAMES = {'staircase': 'THE STAIRCASE', 'icefall': 'THE ICEFALL', 'hoarspire': 'THE HOARSPIRE'}
w['interactions'] = [
    {'x': 21, 'y': 13, 'type': 'lift', 'label': 'CHAIRLIFT', 'prompt': 'PRESS E TO RIDE DOWN', 'down': True},
    {'x': 8, 'y': 12, 'type': 'ski_start', 'label': 'START GATE', 'prompt': 'PRESS E TO SKI'},
    {'x': 13, 'y': 6, 'type': 'climb_register', 'label': 'SUMMIT REGISTER', 'prompt': 'PRESS E TO SIGN'},
    {'x': 4, 'y': 7, 'type': 'dialog', 'label': 'OBSERVATORY', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A STONE HUT WITH A COPPER DOME, ITS SLIT OPEN TO THE SKY. NOBODY HAS WATCHED FROM HERE IN YEARS, BUT THE BRASS IS POLISHED.'},
    {'x': 14, 'y': 3, 'type': 'dialog', 'label': 'SUMMIT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE TOP OF THE HOARSPIRE. A RED FLAG CRACKING IN THE WIND, AND BELOW YOU, IN EVERY DIRECTION, CLOUD.'},
]
for rid, (x, r, col) in TOPS.items():
    w['interactions'].append({'x': x, 'y': r, 'type': 'leave_world', 'label': NAMES[rid], 'prompt': 'PRESS E TO ABSEIL DOWN',
                              'leaveTo': 'hoarfell', 'leaveSpawn': FEET[rid]})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, extra_walkable=(),
            scene_extra={'backdrop': True, 'smoke': [], 'lift': {'lines': lines}})
# only the plateau is ground: everything off it is air
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in cells:
            w['collisions'][r][c] = 1
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('summit done', {k_: v[:2] for k_, v in TOPS.items()})
