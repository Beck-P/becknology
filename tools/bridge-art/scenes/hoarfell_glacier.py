"""Hoarfell — the Aurelle Glacier, the first day of the High Route (hut to hut from Aurelle to the hidden valley;
js/touring.js). Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_glacier.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-glacier

A great glacier coming down between two rock ridges, its lateral moraines banked along either side: the guides'
trail climbs the west moraine from the foot (where you come up from Aurelle), crosses the crevasse field on the wands
— open crevasses going down blue into the dark, their hidden ends under the snow (`expedition`, the Last Ridge's own
crevasse field: js/expedition.js) — and climbs past the icefall's seracs to the Cabane Bleue on its rock knoll at the
glacier's head, blue shutters and prayer flags, a hut for the night. Tile units: x = column, r = row, z = height.
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
WID = 'hoarfell-glacier'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 48, 42
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=5.0, margin_bottom=0.6, seed=7243)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- the glacier's banks: where the ice runs between the moraines ------------------------------------------------------------
def banks(r):
    """(west edge, east edge) of the ice at row r: it narrows toward its head and wanders."""
    w = 0.5 * math.sin(r * 0.31) + 0.3 * math.sin(r * 0.83 + 1.0)
    return 12.0 + 1.6 * sm(30, 6, r) + w, 39.0 - 3.0 * sm(30, 4, r) + 0.6 * math.sin(r * 0.4 + 2.0)


def ice_in(x, r):
    lo, hi = banks(r)
    return min(x - lo, hi - x)                                  # > 0 on the ice


# the cracks across the field: (row at x 25, tilt, seed, open stretches, the snow bridge the wands cross by)
CRACKS = [
    (31.6, 0.05, 1, [(14.0, 19.6), (24.4, 35.0)], (20.4, 23.4)),
    (27.4, -0.06, 2, [(15.2, 22.6), (27.6, 36.4)], (23.2, 26.8)),
    (23.0, 0.04, 3, [(13.6, 17.0), (21.6, 33.6)], (17.6, 20.8)),
    (18.8, -0.04, 4, [(15.6, 24.8), (29.0, 34.6)], (25.4, 28.4)),
    (14.8, 0.05, 5, [(17.4, 22.0), (26.0, 33.0)], (22.4, 25.4)),
]


def crack_row(i, x):
    r0, tilt, sd = CRACKS[i][:3]
    return r0 + tilt * (x - 25) + 0.35 * math.sin(x * 0.9 + sd * 1.7) + 0.15 * math.sin(x * 2.3 + sd)


def crack_w(i, x):
    best = -0.15
    for (a, b) in CRACKS[i][3]:
        if a < x < b:
            s = math.sin(math.pi * (x - a) / (b - a)) ** 0.6
            best = max(best, (0.42 * (0.85 + 0.15 * math.sin(x * 3.1 + i))) * s - 0.15 * (1 - s))
    return best


def crev(x, r):
    return max(crack_w(i, x) - abs(r - crack_row(i, x)) for i in range(len(CRACKS)))


# the wand line: up the west moraine, out over each crack's bridge, back to the moraine below the icefall, up to the hut
PATH = [(9.6, 40.0), (10.4, 36.0), (13.4, 34.4), (17.6, 33.2), (21.9, 31.6), (24.2, 29.4), (25.0, 27.4), (23.6, 25.2),
        (19.2, 23.0), (18.6, 21.0), (22.6, 19.6), (26.9, 18.6), (25.8, 16.4), (23.9, 14.8), (19.0, 12.4), (14.6, 11.0),
        (12.4, 8.6), (10.6, 7.2)]
CAIRNS = [(11.4, 35.4), (22.4, 29.6), (17.6, 22.0), (25.0, 16.8), (14.0, 10.0)]


def path_d(x, r):
    return I.path_dist([PATH], x, r)


def hidden_at(i, x):
    lo, hi = CRACKS[i][4]
    return crack_w(i, x) <= 0.0 and not (lo <= x <= hi)


# ---- the ground ---------------------------------------------------------------------------------------------------------------
def height(x, r):
    d = ice_in(x, r)
    h = 0.0
    lo, hi = banks(r)
    # the moraines: rubble banks along each edge, higher than the ice
    h += 0.45 * math.exp(-((x - (lo - 0.9)) / 1.1) ** 2) + 0.45 * math.exp(-((x - (hi + 0.9)) / 1.1) ** 2)
    # the ice: a little convex, dropping as it goes down the valley
    if d > 0:
        h += 0.12 * sm(0, 6, d)
    # the icefall step at its head: the ice rises in a step between rows 8 and 12
    h += 0.9 * sm(12.0, 7.0, r) * sm(-1.0, 2.0, d)
    return h


def material(x, r):
    d = ice_in(x, r)
    if path_d(x, r) < 0.42 and d < 0.3:
        return 'path'
    if d > 0.6:
        n = I.n2(x * 0.6, r * 0.9, 1.0, 13)
        return 'ice_blue' if n > 0.55 else 'glacier_snow'
    if d > -0.4:
        return 'ice_edge'
    return 'moraine' if d > -2.4 else 'snow'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-8, ROWS + 1)]
I.ground(k, cells, material, {'snow': (N.SNOW, 0.04), 'glacier_snow': ('#e2ebf6', 0.04), 'ice_blue': ('#b8d8ec', 0.05),
                              'ice_edge': ('#c8d4e2', 0.06), 'moraine': ('#8a8a90', 0.18), 'path': (N.PACKED, 0.06)},
         step=0.25 if QUICK else 0.125, bump=0.01, seed=21, height=height, dither=0.07)
# rubble on the moraines: boulders and stones
for _ in range(260 if not QUICK else 90):
    r = k.rng.uniform(1, ROWS)
    lo, hi = banks(r)
    side = k.rng.choice((-1, 1))
    x = (lo - k.rng.uniform(0.2, 2.2)) if side < 0 else (hi + k.rng.uniform(0.2, 2.2))
    if path_d(x, r) < 0.8:
        continue
    s = k.rng.uniform(0.08, 0.32)
    z = height(x, r)
    k.rock(x, r, z + s * 0.3, s, s * 0.8, s * 0.65, (shade('#7a7a82', k.rng.uniform(0.85, 1.15)), 0.18), part='moraine_rock', segs=7)
    if s > 0.22:
        k.blob(x, r, z + s * 0.75, s * 0.7, s * 0.6, s * 0.25, (N.SNOW, 0.06), 'rock_snow', segs=6)
# the glacier's surface: banded ogives and long cracks of blue
for i in range(26):
    r = 6 + i * 1.4
    lo, hi = banks(r)
    k.tube((lo + 1.0, r + 0.6, height(lo + 1, r) + 0.004), ((lo + hi) / 2, r, height((lo + hi) / 2, r) + 0.004), 0.03, ('#cfe0ee', 0.04), 'ice_band', verts=4)
    k.tube(((lo + hi) / 2, r, height((lo + hi) / 2, r) + 0.004), (hi - 1.0, r + 0.6, height(hi - 1, r) + 0.004), 0.03, ('#cfe0ee', 0.04), 'ice_band', verts=4)

# the ridges either side and the peaks at the head
west = [(c, r) for c in range(-1, 7) for r in range(-8, ROWS + 1)]
east = [(c, r) for c in range(44, COLS + 1) for r in range(-8, ROWS + 1)]
head = [(c, r) for c in range(-1, COLS + 1) for r in range(-8, 2)]
for cs, top, sd in ((west, 4.2, 51), (east, 4.6, 53), (head, 6.4, 57)):
    I.ridge(k, cs, top=top, slope=1.6, seed=sd, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'), moss=N.ROOF_SNOW, foot=0.7, patchy=False)
far = [(c, r) for c in range(-1, COLS + 1) for r in range(-8, -3)]
I.ridge(k, far, top=10.5, slope=2.8, seed=59, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'), moss=N.ROOF_SNOW, foot=0.9, patchy=False)

# ---- the open crevasses ----------------------------------------------------------------------------------------------------------
DEPTH = (('#a8d4ea', 0.0), ('#7ab4d8', 0.35), ('#4a7ea8', 0.8), ('#24466c', 1.4), ('#0e1c32', 2.1), ('#060c18', 2.8))
for i in range(len(CRACKS)):
    for (a, b) in CRACKS[i][3]:
        xs = [a + (b - a) * t / 60 for t in range(61)]
        xs = [x for x in xs if crack_w(i, x) > 0.004]
        if len(xs) < 4:
            continue
        z0 = height(xs[len(xs) // 2], crack_row(i, xs[len(xs) // 2]))
        rings_c = []
        for (col, zz) in DEPTH:
            f = max(0.0, 1 - (zz / 2.8) ** 1.2) if zz < 2.8 else 0.0
            near = [(x, crack_row(i, x) - crack_w(i, x) * f, height(x, crack_row(i, x)) + 0.01 - zz) for x in xs]
            far_ = [(x, crack_row(i, x) + crack_w(i, x) * f, height(x, crack_row(i, x)) + 0.01 - zz) for x in reversed(xs)]
            rings_c.append(near + far_)
        for j in range(len(rings_c) - 1):
            k.loft([rings_c[j], rings_c[j + 1]], (DEPTH[j][0], 0.08), 'crevasse', closed=True, smooth=False)
        for x in xs[2:-2:5]:
            w = crack_w(i, x)
            if w > 0.15:
                z = height(x, crack_row(i, x))
                k.blob(x, crack_row(i, x) - w - 0.04, z, 0.22, 0.1, 0.06, (N.SNOW, 0.1), 'lip_snow', segs=6)
                if k.rng.random() < 0.5:
                    k.tube((x, crack_row(i, x) - w + 0.03, z), (x, crack_row(i, x) - w + 0.03, z - 0.5), 0.05, (N.ICE, 0.05), 'icicle', rb=0.006, verts=5)

# seracs: the icefall at the head, and a few in the field
SERACS = [(x, r, s) for (x, r, s) in ((20.0, 9.4, 0.7), (22.6, 8.4, 0.8), (25.4, 9.6, 0.75), (28.0, 8.2, 0.85), (30.8, 9.4, 0.7),
                                      (33.4, 8.6, 0.8), (35.6, 9.8, 0.65), (24.0, 11.2, 0.55), (29.2, 11.0, 0.6), (32.6, 11.4, 0.5),
                                      (36.2, 21.6, 0.5), (14.6, 26.4, 0.45), (34.8, 30.0, 0.5), (17.6, 16.8, 0.45))]
for (x, r, s) in SERACS:
    z = height(x, r)
    k.blob(x, r, z + s * 0.7, s, s * 0.8, s * 0.9, ('#bcdcef', 0.06), 'serac', rot=(k.rng.uniform(-14, 14), k.rng.uniform(-10, 10), k.rng.uniform(0, 90)),
           segs=6, smooth=False)
    k.blob(x - 0.05, r - 0.05, z + s * 1.45, s * 0.7, s * 0.55, s * 0.25, (N.ROOF_SNOW, 0.08), 'serac_snow', segs=6)
    k.solid(math.floor(x - s * 0.6), math.floor(r - s * 0.4), math.floor(x + s * 0.6) + 1, math.floor(r + s * 0.4) + 1)
k.solid(18, 7, 38, 12)                                                  # the icefall: not a way up

# ---- the wands and the cairns ---------------------------------------------------------------------------------------------------
def along(path, every):
    out, carry = [], 0.0
    for (ax, ar), (bx, br) in zip(path, path[1:]):
        L = math.hypot(bx - ax, br - ar)
        d = carry
        while d < L:
            u = d / L
            out.append((ax + (bx - ax) * u, ar + (br - ar) * u, (bx - ax) / L, (br - ar) / L))
            d += every
        carry = d - L
    return out


WANDS = []
for n, (x, r, dx, dr) in enumerate(along(PATH, 1.8)):
    s = 1 if n % 2 else -1
    wx, wr = x - dr * 0.5 * s, r + dx * 0.5 * s
    WANDS.append([round(wx, 2), round(wr, 2)])
    z = height(wx, wr)
    lean = k.rng.uniform(-0.05, 0.05)
    k.tube((wx, wr, z), (wx + lean, wr, z + 1.05), 0.022, ('#c8a060', 0.1), 'wand', verts=5)
    k.box(wx + lean, wr - 0.015, z + 0.82, wx + lean + 0.24, wr + 0.015, z + 1.02, ('#e8602a', 0.1), 'wand_flag')


def cairn(x, r, s=0.42):
    z = height(x, r)
    for (dx, dr, f) in ((0, 0, 1.0), (0.08, -0.04, 0.78), (-0.04, 0.02, 0.56), (0.02, 0.0, 0.36)):
        sz = s * f
        k.rock(x + dx, r + dr, z + 0.15 + (1 - f) * s * 2.1, sz, sz * 0.9, sz * 0.62, ('#5a6272', 0.18), part='cairn', segs=7)
    k.blob(x, r, z + s * 2.1, s * 0.3, s * 0.28, s * 0.16, (N.ROOF_SNOW, 0.1), 'cairn_snow', segs=6)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)


for (x, r) in CAIRNS:
    cairn(x, r)

# ---- the Cabane Bleue on its knoll ---------------------------------------------------------------------------------------------
knoll = [(c, r) for c in range(3, 13) for r in range(1, 6)]
HK_ = I.ridge(k, knoll, top=0.55, slope=1.4, seed=61, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'), moss=N.ROOF_SNOW,
              foot=0.4, patchy=False)
HX0, HX1, HR0, HR1 = 5.6, 10.4, 3.0, 6.0
k.box(HX0 - 0.1, HR0 - 0.1, 0.0, HX1 + 0.1, HR1 + 0.1, 0.4, ('#6a6e78', 0.16), 'footing', bevel=0.03)
k.box(HX0, HR0, 0.4, HX1, HR1, 1.9, ('#8a8e98', 0.16), 'hut_wall')
A.ashlar(k, HX0, HX1, HR1, 0.4, 1.9, '#9a9ea8', course=0.24, block=(0.3, 0.55))
for (wx, sh) in ((6.6, '#2a5aa8'), (9.4, '#2a5aa8')):
    W.window(k, wx, HR1 + 0.02, 0.85, w=0.48, h=0.5, shutters=sh)
    k.box(wx - 0.36, HR1 + 0.04, 0.77, wx + 0.36, HR1 + 0.2, 0.8, (N.ROOF_SNOW, 0.1), 'sill_snow')
W.door(k, 8.0, HR1 + 0.02, col='#2a5aa8')
k.box(7.3, HR1 + 0.02, 1.5, 8.7, HR1 + 0.06, 1.8, ('#f0ece4', 0.05), 'sign_board')
G.letters(k, 'CABANE BLEUE', 'Righteous', 8.0, HR1 + 0.07, 1.56, size=0.16, col='#2a5aa8', lit=False)
rm, zr = W._gable_roof(k, HX0, HX1, HR0, HR1, 1.9, 1.0, N.ROOF_SNOW, over=0.35, strips=7)
N.icicles(k, HX0 - 0.3, HX1 + 0.3, HR1 + 0.36, 1.76)
k.cyl(9.6, 3.8, 1.9, 3.2, 0.07, (N.IRON, 0.1), 'stovepipe', verts=8)
SMOKE = [screen(9.6, 3.8, 3.3)]
k.box(HX1 + 0.15, 3.4, 0.0, HX1 + 1.0, 5.4, 0.55, (N.LOG, 0.12), 'woodstack')
k.box(HX1 + 0.13, 3.38, 0.55, HX1 + 1.02, 5.42, 0.62, (N.ROOF_SNOW, 0.1), 'woodstack_snow')
W.bunting(k, (4.4, 6.4, 1.6), (HX0 + 0.2, HR1, 2.2), sag=0.25, cols=('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030'))
W.bunting(k, (HX1 - 0.2, HR1, 2.2), (12.2, 6.6, 1.4), sag=0.25, cols=('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030'))
for x in (4.4, 12.2):
    k.cyl(x, 6.5, 0.0, 1.65, 0.03, ('#6a4a2a', 0.1), 'flagpole', verts=6)
N.ski_rack(k, 3.6, 5.2, 6.8)
k.solid(HX0, HR0, HX1 + 1.0, HR1)

# ---- what the game needs ----------------------------------------------------------------------------------------------------------------
k.solid(-1, -8, COLS + 1, 2)                                            # the head of the valley
for r in range(ROWS + 1):                                               # the ridges either side, the far moraine
    lo, hi = banks(r)
    k.solid(-1, r, 7, r + 1)
    k.solid(min(COLS, int(hi + 2.6)), r, COLS + 1, r + 1)
cellset = {(c, r) for c in range(COLS) for r in range(ROWS)}
for (c, r) in list(cellset):
    if any(crev(c + dx, r + dr) > -0.02 for dx in (0.1, 0.5, 0.9) for dr in (0.1, 0.5, 0.9)):
        k.solid(c, r, c + 1, r + 1)
hidden = set()
for i in range(len(CRACKS)):
    for c in range(8, 42):
        x = c + 0.5
        if not hidden_at(i, x) or ice_in(x, crack_row(i, x)) < 0.8:
            continue
        r = int(math.floor(crack_row(i, x)))
        if (c, r) not in k.blocked and path_d(x, r + 0.5) > 1.0:
            hidden.add((c, r))

k.sun((0.8, 0.25, -0.38), '#ffd8b8', 3.2, angle=3.0)
A.flush(k)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 64, world_light=('#8a96cc', 0.95))

EXP = {'crevasses': sorted([list(t) for t in hidden]), 'cairns': [[int(x), int(r)] for (x, r) in CAIRNS],
       'field': [8, 12, 42, 34], 'wands': WANDS, 'arrive': [10, 39]}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Aurelle Glacier', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [10, 39]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 1.5, 'view': [0.0, -4.5, COLS, ROWS], 'expedition': EXP, 'touring': {'day': 1}})
w['interactions'] = [
    {'x': 10, 'y': 40, 'type': 'touring', 'action': 'back', 'label': 'THE WAY DOWN', 'prompt': 'PRESS E TO GO BACK', 'target': 'hoarfell-aurelle', 'spawn': [9, 17]},
    {'x': 8, 'y': 5, 'type': 'touring', 'action': 'hut', 'label': 'CABANE BLEUE', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-hut-bleue', 'spawn': [8, 10]},
    {'x': 12, 'y': 38, 'type': 'dialog', 'label': 'SIGNPOST', 'prompt': 'PRESS E TO READ',
     'dialog': 'A YELLOW SIGN NAILED TO A POST IN THE MORAINE:\n\nCABANE BLEUE ...... 4 H\nCOL DU VENT ...... 1 DAY\n\nUNDER IT, IN MARKER: "ROPE UP. KEEP TO THE WANDS. THE GLACIER IS NOT YOUR FRIEND." AND UNDER THAT, IN A DIFFERENT HAND: "IT\'S A BIT YOUR FRIEND."'},
] + [{'x': int(x), 'y': int(r), 'type': 'expedition', 'action': 'cairn', 'label': 'CAIRN', 'prompt': 'PRESS E TO LOOK'} for (x, r) in CAIRNS]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, scene_extra={'smoke': SMOKE})
print('glacier done', len(hidden), 'hidden crevasse tiles')
