"""Hoarfell — the Col du Vent, the second day of the High Route (js/touring.js). Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_col.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-col

At the top, the col: a saddle of wind-packed snow between two rock peaks, a cornice curling over the east side, prayer
flags strung from a cairn with an iron cross on it — where you arrive at first light from the Cabane Bleue. Below it the
bowl: a long open slope of powder, skied free (js/ski.js reads the `ski` block) round rock outcrops and, lower down,
through larches (they turn gold in autumn) to the Refuge du Col on its bench of rock at the foot, Bram's lamp in the window.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_alpine as A              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_signs as G               # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-col'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 42
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=6.0, margin_bottom=0.6, seed=8311)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- the bowl's sides: where the rock walls stand ---------------------------------------------------------------------
def walls(r):
    """(west edge, east edge) of the open bowl at row r: a narrow saddle at the top, opening out below."""
    open_ = 4.0 + 13.0 * sm(2.0, 18.0, r)
    mid = 22.0 + 1.5 * math.sin(r * 0.15)
    return mid - open_ + 0.6 * math.sin(r * 0.7), mid + open_ + 0.6 * math.sin(r * 0.5 + 1.0)


def inside(x, r):
    lo, hi = walls(r)
    return min(x - lo, hi - x)


def height(x, r):
    d = inside(x, r)
    h = 0.0
    n = I.n2(x * 0.45, r * 0.6, 1.0, 71) * 0.6 + I.n2(x * 1.1, r * 1.4, 1.0, 73) * 0.4
    h += max(0.0, n) * 0.16 * sm(0.5, 2.0, d)                         # wind ripples and soft pillows
    h += 0.4 * sm(1.5, -0.5, d)                                        # banks rising to the walls
    return h


ROCKS = [(16.4, 13.2, 0.95), (27.6, 16.0, 1.1), (21.0, 20.8, 0.8), (12.4, 23.4, 0.9), (31.8, 22.6, 0.85), (24.6, 27.0, 0.7),
         (9.8, 30.0, 0.8), (34.6, 29.6, 0.9)]
LARCH = [(8.6, 26.6), (11.0, 28.4), (7.2, 31.6), (13.6, 32.0), (10.4, 34.6), (33.4, 26.2), (36.0, 28.8), (31.6, 31.4), (35.2, 33.2),
         (29.4, 34.2), (16.6, 35.6), (14.4, 29.6), (18.6, 31.0), (27.8, 29.4), (38.2, 31.0), (6.0, 35.0), (37.6, 35.8)]


def material(x, r):
    d = inside(x, r)
    if d < -0.2:
        return 'snow'
    if r < 8:
        return 'windpack' if I.n2(x, r, 0.8, 5) > 0.2 else 'snow'
    return 'powder'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, ROWS + 1)]
I.ground(k, cells, material, {'snow': (N.SNOW, 0.04), 'powder': ('#e6eef8', 0.03), 'windpack': ('#d4dcea', 0.05)},
         step=0.25 if QUICK else 0.125, bump=0.01, seed=31, height=height, dither=0.07)
# ski tracks: two lines of turns down the bowl (someone was here yesterday)
for (x0, ph) in ((19.0, 0.0), (25.0, 1.4)):
    pts = [(x0 + 3.0 * math.sin(r * 0.55 + ph), r) for r in [8 + i * 0.25 for i in range(100)]]
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        if inside(ax, ar) > 1.0:
            for dx in (-0.08, 0.08):
                k.tube((ax + dx, ar, height(ax, ar) + 0.005), (bx + dx, br, height(bx, br) + 0.005), 0.012, ('#c8d4e6', 0.04), 'ski_tracks', verts=4)

# the rock walls either side, the peaks over the col
wall_cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, ROWS + 1) if inside(c + 0.5, r + 0.5) < -0.6]
I.ridge(k, wall_cells, top=4.6, slope=1.8, seed=79, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'), moss=N.ROOF_SNOW, foot=0.7, patchy=False)
peaks = [(c, r) for c in range(-1, COLS + 1) for r in range(-10, -1) if abs(c - 22) > 4]
I.ridge(k, peaks, top=10.0, slope=2.6, seed=83, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'), moss=N.ROOF_SNOW, foot=0.9, patchy=False)

# ---- the col: the cornice, the cairn and its iron cross, prayer flags ---------------------------------------------------
for i in range(10):                                                # drifts carved by the wind across the saddle
    x, r = k.rng.uniform(19.0, 26.0), k.rng.uniform(0.0, 7.0)
    k.blob(x, r, height(x, r), k.rng.uniform(0.6, 1.2), k.rng.uniform(0.2, 0.35), k.rng.uniform(0.08, 0.16), (N.ROOF_SNOW, 0.03), 'drift',
           rot=(0, 0, k.rng.uniform(-20, 20)), segs=10)
for (dx, dr, f) in ((0, 0, 1.0), (0.08, -0.04, 0.78), (-0.04, 0.02, 0.56), (0.02, 0.0, 0.36)):
    s = 0.55 * f
    k.rock(19.6 + dx, 2.4 + dr, 0.18 + (1 - f) * 1.1, s, s * 0.9, s * 0.62, ('#5a6272', 0.18), part='cairn', segs=7)
k.cyl(19.6, 2.4, 1.0, 2.4, 0.035, ('#3a3c44', 0.08), 'cross', verts=6)
k.box(19.3, 2.37, 2.0, 19.9, 2.43, 2.08, ('#3a3c44', 0.08), 'cross')
k.solid(19, 2, 21, 3)
for (b, cols) in (((24.2, 1.2, 1.4), ('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030')),):
    W.bunting(k, (19.6, 2.4, 2.2), b, sag=0.35, cols=cols)
k.cyl(24.2, 1.2, 0.0, 1.5, 0.03, ('#6a4a2a', 0.1), 'flagpole', verts=6)
k.solid_post(24.2, 1.2)
k.box(17.6, 4.6, 0.0, 17.7, 4.7, 1.3, ('#6a4a2a', 0.1), 'post')
k.box(17.0, 4.6, 0.95, 18.4, 4.72, 1.3, ('#e0b030', 0.06), 'sign_board')
G.letters(k, 'COL DU VENT', 'Righteous', 17.7, 4.73, 1.02, size=0.14, col='#1e1e26', lit=False)
k.solid(17.0, 4.5, 18.4, 4.8)

# ---- the bowl: rock outcrops, larches lower down -------------------------------------------------------------------------
OBST = []
for (x, r, s) in ROCKS:                                                  # crags breaking through: dark rock, snow on their tops, a drift in their lee
    z = height(x, r)
    for j in range(3):
        dx, dr = k.rng.uniform(-0.3, 0.3) * s, k.rng.uniform(-0.2, 0.2) * s
        ss = s * (1 - j * 0.25)
        k.rock(x + dx, r + dr, z + ss * 0.35, ss * 0.7, ss * 0.55, ss * 0.65, ('#4e5664', 0.2), part='crag', segs=7, jitter=0.22)
    k.blob(x - 0.1, r - 0.1, z + s * 0.75, s * 0.55, s * 0.4, s * 0.16, (N.ROOF_SNOW, 0.06), 'crag_snow', segs=8)
    k.blob(x + s * 0.9, r + 0.2, z, s * 0.9, s * 0.35, s * 0.18, (N.SNOW, 0.04), 'drift', segs=9)
    k.solid(x - s * 0.5, r - s * 0.4, x + s * 0.5, r + s * 0.4)
    OBST.append([x, r, round(s * 0.6, 2), 'rock'])
for _ in range(60 if not QUICK else 30):                                 # sastrugi: wind ripples across the upper bowl
    x, r = k.rng.uniform(12, 32), k.rng.uniform(7, 22)
    if inside(x, r) < 1.5:
        continue
    k.blob(x, r, height(x, r), k.rng.uniform(0.5, 1.1), 0.07, 0.03, ('#dce6f2', 0.03), 'drift', rot=(0, 0, k.rng.uniform(-10, 10)), segs=8)


def larch(x, r, h):
    """A larch: a slim leaning trunk, airy whorls of soft needles in tufts along drooping boughs (deciduous — they go gold
    in autumn, so they're leaves, not needles), snow caught in them."""
    z0 = height(x, r)
    lean = k.rng.uniform(-0.08, 0.08)
    k.tube((x, r, z0), (x + lean, r, z0 + h), 0.06, ('#5a3a24', 0.12), 'trunk', rb=0.015, verts=6)
    green = k.rng.choice(('#7a9a4a', '#6a8e44', '#88a452'))
    with k.foliage('leaf'):
        n = 7
        for i in range(n):
            t = i / n
            zz = z0 + 0.35 + t * (h - 0.5)
            rad = 0.6 * (1 - t * 0.8) + 0.08
            for j in range(5):                                              # tufts round each whorl, drooping at their tips
                a = j / 5 * math.tau + i * 0.9
                bx, br = x + lean * t + math.cos(a) * rad, r + math.sin(a) * rad * 0.8
                k.blob(bx, br, zz - 0.05, rad * 0.45, rad * 0.35, 0.12, (shade(green, k.rng.uniform(0.85, 1.12)), 0.18), 'larch', segs=7)
            k.blob(x + lean * t, r, zz, rad * 0.55, rad * 0.45, 0.14, (shade(green, 0.8), 0.18), 'larch', segs=7)
    for i in range(0, 7, 2):
        t = i / 7
        zz = z0 + 0.35 + t * (h - 0.5)
        rad = 0.6 * (1 - t * 0.8) + 0.08
        k.blob(x - rad * 0.25, r - 0.05, zz + 0.1, rad * 0.5, rad * 0.4, 0.05, (N.ROOF_SNOW, 0.08), 'larch_snow', segs=7)


for (x, r) in LARCH:
    h = k.rng.uniform(2.0, 2.8)
    larch(x, r, h)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)
    OBST.append([x, r, 0.35, 'tree'])

# ---- the Refuge du Col on its bench ---------------------------------------------------------------------------------------
bench = [(c, r) for c in range(18, 30) for r in range(32, 36)]
HX0, HX1, HR0, HR1 = 20.6, 27.4, 33.2, 36.4
k.box(HX0 - 0.1, HR0 - 0.1, 0.0, HX1 + 0.1, HR1 + 0.1, 0.4, ('#6a6e78', 0.16), 'footing', bevel=0.03)
k.box(HX0, HR0, 0.4, HX1, HR1, 2.0, ('#8a8e98', 0.16), 'hut_wall')
A.ashlar(k, HX0, HX1, HR1, 0.4, 2.0, '#9a9ea8', course=0.24, block=(0.3, 0.55))
for wx in (21.8, 26.2):
    W.window(k, wx, HR1 + 0.02, 0.9, w=0.5, h=0.52, shutters='#a83a2e')
W.door(k, 24.0, HR1 + 0.02, col='#a83a2e')
k.box(22.8, HR1 + 0.02, 1.55, 25.2, HR1 + 0.06, 1.88, ('#f0ece4', 0.05), 'sign_board')
G.letters(k, 'REFUGE DU COL', 'Righteous', 24.0, HR1 + 0.07, 1.6, size=0.17, col='#a83a2e', lit=False)
rm, zr = W._gable_roof(k, HX0, HX1, HR0, HR1, 2.0, 1.1, N.ROOF_SNOW, over=0.35, strips=7)
N.icicles(k, HX0 - 0.3, HX1 + 0.3, HR1 + 0.36, 1.86)
k.cyl(26.6, 34.0, 2.0, 3.4, 0.07, (N.IRON, 0.1), 'stovepipe', verts=8)
SMOKE = [screen(26.6, 34.0, 3.5)]
N.woodpile(k, 27.8, 29.2, 35.6)
N.ski_rack(k, 18.6, 20.2, 36.8)
W.lantern_post(k, 25.8, 37.2, h=1.8, energy=18)
k.solid(HX0, HR0, HX1, HR1)
k.solid(27.6, 35.2, 29.4, 36.0)

# ---- the edges ----------------------------------------------------------------------------------------------------------
for (c, r) in wall_cells:
    if 0 <= c < COLS and 0 <= r < ROWS:
        k.solid(c, r, c + 1, r + 1)
k.solid(-1, -10, COLS + 1, 0)
k.solid(-1, ROWS - 2, COLS + 1, ROWS + 1)

A.flush(k)
k.sun((0.8, 0.25, -0.38), '#ffd8b8', 3.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 64, world_light=('#8a96cc', 0.95))

# ---- the ski block: the bowl skied free from the col down to the bench ------------------------------------------------------
grade, zone = [], []
for r in range(ROWS):
    g, z = '', ''
    for c in range(COLS):
        cx, cr = c + 0.5, r + 0.5
        d = inside(cx, cr)
        if d < 0.3 or cr < 5 or cr > 33:
            gv = 0
        elif cr < 9:
            gv = 4
        elif cr < 26:
            gv = 7 if d > 3 else 5
        else:
            gv = 4
        g += str(gv)
        z += '~' if cr > 9 and d > 1.5 else '.'
    grade.append(g)
    zone.append(z)
SKI = {'name': 'THE BOWL BELOW THE COL', 'hello': 'THE BOWL. KNEE-DEEP AND UNTRACKED BUT FOR YESTERDAY\'S TWO LINES.', 'start': 5.0, 'finish': 33.0,
       'runs': {}, 'jumps': [], 'grade': grade, 'zone': zone, 'obstacles': OBST}

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Col du Vent', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [22, 4]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 1.6, 'view': [0.0, -6.0, COLS, ROWS], 'ski': SKI, 'touring': {'day': 2}})
w['interactions'] = [
    {'x': 22, 'y': 5, 'type': 'ski_here', 'label': 'THE BOWL', 'prompt': 'PRESS E TO SKI'},
    {'x': 20, 'y': 3, 'type': 'dialog', 'label': 'THE CROSS', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'AN IRON CROSS ON A CAIRN, RIMED WHITE ON ITS WINDWARD SIDE, PRAYER FLAGS SNAPPING FROM IT TO A POLE. BEHIND YOU THE GLACIER YOU CAME UP; IN FRONT, THE BOWL, AND FAR BELOW IT A SMUDGE OF STEAM WHERE NO STEAM SHOULD BE.'},
    {'x': 17, 'y': 5, 'type': 'dialog', 'label': 'SIGN', 'prompt': 'PRESS E TO READ',
     'dialog': 'COL DU VENT, 3,412.\nREFUGE DU COL ..... 1 H 30 (ON FOOT)\n................... 6 MIN (ON SKIS, IF YOU\'RE GOOD)'},
    {'x': 24, 'y': 36, 'type': 'touring', 'action': 'hut', 'label': 'REFUGE DU COL', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-hut-col', 'spawn': [8, 9]},
]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, scene_extra={'smoke': SMOKE})
print('col done')
