"""Hoarfell — the face of the Hoarspire, climbed in the world. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_face.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-face

One great wall of rock facing the camera, climbed at the world's own scale
(js/climb.js): a snowy shelf along its foot (where the routes start, the path
back down to Fellhaven), then the face — strata, cracks, snow on every
shelf, ledges to rest on — rising some forty tiles to a corniced crest, the
sky behind it (a backdrop world: js/worlds/hoarfell.js draws the evening).

Three lines go up it, each its own kind of climbing: the Staircase on the
left (big jugs, a yellow fixed line, ledges close together), the Icefall up
the middle (a frozen waterfall: ice you need an axe for), the Hoarspire on
the right (crimps and slopers, rust-coloured loose rock, few ledges, wind).
But the face is one face: every hold is real and you can traverse between
lines. Holds are built where the world JSON's `climb` block says they are —
the game reads the same list (x, z on the face, kind).

The face is a vertical plane at row FACE_R with relief; a point on it at
height z shows on screen at row FACE_R - z * cos 45.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade, S as KS  # noqa: E402
import bmesh                                  # noqa: E402
import bpy                                    # noqa: E402
from mathutils import Vector, noise           # noqa: E402
import assets_isle as I                       # noqa: E402
import assets_snow as N                       # noqa: E402
import assets_town as W                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-face'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 36, 40
C = math.cos(math.radians(45))
FACE_R, TOP = 33.0, 44.0                     # the face's foot (row) and height (tiles)
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.6, seed=6113)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the lines up the face ----------------------------------------------------------------------------------------
ROUTES = {
    'staircase': {'x': 7.5, 'w': 3.2, 'mix': {'jug': 7, 'crimp': 2, 'sloper': 1}, 'ledge_every': 8.0, 'loose': 0.0, 'col': '#e0b030',
                  'step': (1.0, 1.5), 'decoys': 1},
    'icefall':   {'x': 18.0, 'w': 3.0, 'mix': {'ice': 8, 'jug': 1, 'crimp': 1}, 'ledge_every': 11.0, 'loose': 0.05, 'col': '#3a8ae0',
                  'step': (1.1, 1.7), 'decoys': 2},
    'hoarspire': {'x': 28.5, 'w': 3.4, 'mix': {'jug': 3, 'crimp': 4, 'sloper': 3}, 'ledge_every': 14.0, 'loose': 0.14, 'col': '#c83a2e',
                  'step': (1.2, 1.9), 'decoys': 2},
}
rnd = random.Random(4242)


def pick(mix):
    tot = sum(mix.values())
    r = rnd.random() * tot
    for key, v in mix.items():
        r -= v
        if r <= 0:
            return key
    return 'jug'


HOLDS, LEDGES, MAIN = [], [], {}
for rid, R in ROUTES.items():
    x, z, nxt, main, last_loose = R['x'], 1.6, R['ledge_every'], [], False
    while z < TOP - 2.2:
        if z >= nxt:
            lx = max(R['x'] - R['w'], min(R['x'] + R['w'], x + rnd.uniform(-0.6, 0.6)))
            lz = z + rnd.uniform(0.4, 0.7)
            L = [round(lx - rnd.uniform(1.0, 1.6), 2), round(lx + rnd.uniform(1.0, 1.6), 2), round(lz, 2)]
            LEDGES.append(L)
            main.append(('ledge', lx, lz))
            x, z = lx, lz + 0.4
            nxt += R['ledge_every']
            continue
        x = max(R['x'] - R['w'], min(R['x'] + R['w'], x + rnd.uniform(-1.1, 1.1)))
        z += rnd.uniform(*R['step'])
        kind = pick(R['mix'])
        if not last_loose and rnd.random() < R['loose']:
            kind = 'loose'
        last_loose = kind == 'loose'
        HOLDS.append([round(x, 2), round(z, 2), kind])
        main.append((kind, x, z))
        for _ in range(R['decoys']):                      # other ways up, some of them bad
            if rnd.random() < 0.45:
                continue
            dx = (1 if rnd.random() < 0.5 else -1) * rnd.uniform(1.0, 2.0)
            k2 = 'loose' if rnd.random() < R['loose'] * 2.2 else pick(R['mix'])
            HOLDS.append([round(x + dx, 2), round(z + rnd.uniform(-0.6, 0.9), 2), k2])
    MAIN[rid] = main
# traverses between the lines: a few holds across the gaps, every so often
for (a, b) in ((ROUTES['staircase']['x'] + 3.0, ROUTES['icefall']['x'] - 3.0), (ROUTES['icefall']['x'] + 3.0, ROUTES['hoarspire']['x'] - 3.4)):
    z = 5.0
    while z < TOP - 4:
        n = int((b - a) / 1.5) + 1
        for i in range(n + 1):
            HOLDS.append([round(a + (b - a) * i / n, 2), round(z + rnd.uniform(-0.4, 0.4), 2), 'crimp' if i % 2 else 'jug'])
        z += rnd.uniform(8, 12)
# hoar crystals, off the lines where you have to go out of your way
CRYST = []
for rid in ('staircase', 'icefall', 'icefall', 'hoarspire', 'hoarspire', 'hoarspire'):
    cand = [m for m in MAIN[rid] if m[0] != 'ledge' and m[2] > 6]
    m = cand[rnd.randrange(len(cand))]
    c = [round(m[1] + (1 if rnd.random() < 0.5 else -1) * rnd.uniform(1.4, 1.9), 2), round(m[2] + 0.3, 2), 'crystal']
    HOLDS.append(c)
    CRYST.append(c)


# ---- the face: one sheet of rock with relief, banded by strata ---------------------------------------------------
def relief(x, z):
    """How far (tiles) the face stands out toward the camera at (x, z) — 0 to about 1; the surface is at surf()."""
    d = 0.16 * n2(x, z, 0.55, 3) + 0.08 * n2(x * 2.1, z * 1.7, 0.9, 7)
    d += 0.35 * math.exp(-((x - 12.8) / 1.6) ** 2) + 0.35 * math.exp(-((x - 23.4) / 1.8) ** 2)    # buttresses between the lines
    if z > TOP - 7 and 25 < x < 32:                                                           # the Hoarspire's roof near the top
        d += 0.4 * math.sin(min(1.0, (z - (TOP - 7)) / 3.0) * math.pi / 2)
    return d


def surf(x, z):
    """The face's row at (x, z): never nearer the camera than FACE_R, so a climber drawn there is always in front."""
    return FACE_R - 1.0 + min(1.0, relief(x, z) + 0.25)


def pn(x, z, f, seed):
    """Perlin noise, about -1..1."""
    return noise.noise(Vector((x * f, z * f, seed * 7.31)))


def ice_at(x, z):
    return abs(x - (18.0 + 0.8 * math.sin(z / 6.0))) < 2.6 + 0.7 * pn(x, z, 0.35, 2) and z < TOP - 1.0


def face_key(x, z):
    if ice_at(x, z):
        return 'ice2' if pn(x * 4.0, z * 0.5, 0.6, 9) > 0.18 else 'ice'      # streaks down the fall
    if abs(pn(x * 3.0, z * 0.4, 0.5, 7)) < 0.018 and pn(x, z, 0.2, 8) > 0:
        return 'crack'
    if pn(x * 0.7, z * 3.0, 0.45, 5) > 0.42:
        return 'snow'                                                  # snow lodged along little horizontal shelves
    b = z * 0.42 + 1.6 * pn(x, z, 0.09, 4)                             # strata: wide wavy beds
    return 'rock%d' % (int(math.floor(b)) % 4)


STEP = 0.25
faces = {}
nx_, nz_ = int((COLS + 8) / STEP), int((TOP + 0.6) / STEP)
for j in range(nz_):
    for i in range(nx_):
        x, z = -4 + (i + 0.5) * STEP, (j + 0.5) * STEP
        a = (i, j)
        faces.setdefault(face_key(x, z), []).append((a, (i + 1, j), (i + 1, j + 1), (i, j + 1)))


def fvert(p):
    x, z = -4 + p[0] * STEP, p[1] * STEP
    return x, surf(x, z), z


FACE_ALB = {'rock0': ('#6a7284', 0.05), 'rock1': ('#58606e', 0.05), 'rock2': ('#7c8496', 0.05), 'rock3': ('#646a7a', 0.05),
            'crack': ('#2e3240', 0.02), 'snow': (N.ROOF_SNOW, 0.02), 'ice': ('#b4e0f4', 0.03), 'ice2': ('#86bcdc', 0.03)}
# one mesh per band, every quad facing the camera (assets_isle._mesh turns faces up, which a wall isn't)
for key, quads in faces.items():
    bm = bmesh.new()
    vm = {}
    for q in quads:
        vs = []
        for p in q:
            if p not in vm:
                x, r, z = fvert(p)
                vm[p] = bm.verts.new((x, -r * KS, z))
            vs.append(vm[p])
        bm.faces.new(vs)
    bm.normal_update()
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    me = bpy.data.meshes.new('face')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('face', me)
    k.scene.collection.objects.link(o)
    k._finish(o, FACE_ALB[key], 'face_' + key)

# the crest: a snow cornice along the top, the rock running back behind it
for x0 in range(-4, COLS + 4, 2):
    k.box(x0, FACE_R - 4.0, TOP - 0.1, x0 + 2, surf(x0 + 1, TOP) + 0.05, TOP + 0.1, ('#5e6678', 0.05), 'crest_rock')
k.loft([[(x, surf(x, TOP) + 0.25, TOP + 0.05 + 0.08 * math.sin(x * 1.3)),
         (x, surf(x, TOP) - 0.3, TOP + 0.45 + 0.1 * n2(x, 0, 0.6, 3)),
         (x, FACE_R - 4.0, TOP + 0.35)] for x in [i * 0.5 - 4 for i in range(2 * COLS + 17)]], (N.ROOF_SNOW, 0.02), 'cornice')
N.summit_flag(k, 28.6, FACE_R - 2.2, TOP + 0.4, h=1.6)

# ---- holds, ledges, the fixed line --------------------------------------------------------------------------------------------
def on_face(x, z, out=0.0):
    return (x, surf(x, z) + out, z)


for (x, z, kind) in HOLDS:
    fx, fr, fz = on_face(x, z)
    if kind == 'ice':
        k.blob(fx, fr + 0.06, fz, 0.2, 0.12, 0.16, ('#d8f0fc', 0.03), 'ice_hold', segs=8)
    elif kind == 'crystal':
        W.shore_crystals(k, fx, fr + 0.05, col=('#2a4a7a', '#a8dcff'), s=0.42, energy=4)
    else:
        size = {'jug': 0.25, 'crimp': 0.16, 'sloper': 0.26, 'loose': 0.22}[kind]
        tone = {'jug': '#b0a08c', 'crimp': '#a0927e', 'sloper': '#bcae9c', 'loose': '#b0643a'}[kind]
        k.rock(fx, fr + 0.06, fz, size, 0.14 if kind != 'sloper' else 0.1, size * 0.6, (tone, 0.03), part='hold', segs=7)
        if kind != 'loose':
            k.blob(fx, fr + 0.12, fz + size * 0.3, size * 0.75, 0.08, 0.05, ('#fbfaf6', 0.0), 'chalk', segs=6)     # chalk on the top
for (x0, x1, z) in LEDGES:
    xm = (x0 + x1) / 2
    lr = max(surf(x0, z), surf(xm, z), surf(x1, z))
    k.box(x0, lr - 0.3, z - 0.22, x1, lr + 0.45, z, ('#5e6678', 0.05), 'ledge', bevel=0.03)
    k.box(x0 + 0.05, lr - 0.25, z, x1 - 0.05, lr + 0.42, z + 0.07, (N.ROOF_SNOW, 0.02), 'ledge_snow')
    bx, br, bz = on_face(xm + 0.4, z + 0.55, 0.04)
    k.cyl_y(bx, br - 0.02, br + 0.06, bz, 0.06, 0.06, ('#c0c4cc', 0.05), 'bolt', verts=8)               # a bolt to clip into
prev = None
for (kind, x, z) in MAIN['staircase']:                                                             # the fixed line, hold to hold
    p = on_face(x + 0.3, z - 0.15, 0.08)
    if prev:
        k.tube(prev, p, 0.022, ('#e0b030', 0.04), 'fixed_line', verts=4)
    prev = p
k.tube(prev, on_face(ROUTES['staircase']['x'], TOP, 0.1), 0.022, ('#e0b030', 0.04), 'fixed_line', verts=4)

# ---- the foot: the shelf of snow, the routes' starts, the path down ------------------------------------------------------------------
N.snowfield(k, -4, FACE_R - 2.0, COLS + 4, ROWS + 0.6)
N.trodden(k, -2, FACE_R + 0.6, COLS + 2, FACE_R + 1.8)
N.trodden(k, 16.6, FACE_R + 1.8, 19.4, ROWS + 0.6)                            # down to Fellhaven
for rid, R in ROUTES.items():
    N.route_foot(k, R['x'], FACE_R + 0.8, 1.4, 0.6, R['col'])
N.icefall(k, 18.0, FACE_R - 0.2, FACE_R + 0.6, 1.0)
for (x, r) in ((1.0, 36.5), (3.0, 38.2), (33.5, 36.8), (35.0, 38.6), (11.5, 38.4), (25.5, 38.6)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.3, 3.0))
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)
for (x, r, s) in ((13.0, 35.0, 0.5), (23.5, 35.1, 0.45), (32.0, 35.4, 0.4)):
    k.rock(x, r, 0.1, s, s * 0.8, s * 0.7, ('#5a6272', 0.06), part='boulder', segs=8)
    k.blob(x, r, s * 0.6, s * 0.75, s * 0.6, s * 0.3, (N.SNOW, 0.03), 'boulder_snow', segs=8)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)
W.bench(k, 20.6, 22.6, 37.4)
k.solid(0, 0, COLS, int(FACE_R) + 1)                                          # the mountain
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)

# ---- the light: the village's alpenglow ----------------------------------------------------------------------------------------------
k.sun((0.55, -0.62, -0.56), '#ffc4a4', 3.4, angle=3.0)      # the face catches the last of the sun, full on (row -: away from you)
# by night the moon from in front too (from behind, the face was in its own shadow all night)
k.render(OUT, cycle={'base': 'day', 'moon': ((0.3, -0.6, -0.74), '#8a98d0', 1.0)}, light_states={'full': {}}, light_samples=64, world_light=('#8a96cc', 0.8))

FOOT = int(FACE_R) + 1
CLIMB = {
    'face': FACE_R, 'top': TOP, 'foot': FOOT,
    'routes': {rid: {'x': R['x'], 'start': [R['x'], FOOT + 0.6]} for rid, R in ROUTES.items()},
    # each with its screen row (tiles): where on screen the hold is, relief and all
    'holds': [[h[0], h[1], h[2], round(surf(h[0], h[1]) + 0.05 - h[1] * C, 3)] for h in HOLDS],
    'ledges': [[l[0], l[1], l[2], round(max(surf(l[0], l[2]), surf((l[0] + l[1]) / 2, l[2]), surf(l[1], l[2])) + 0.1 - l[2] * C, 3)] for l in LEDGES],
    'topRow': round(surf(18, TOP) - TOP * C, 3),
}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hoarspire Face', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [18, 38]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True})
w['interactions'] = [
    {'x': int(R['x']), 'y': FOOT, 'type': 'climb', 'route': rid, 'label': {'staircase': 'THE STAIRCASE', 'icefall': 'THE ICEFALL',
                                                                             'hoarspire': 'THE HOARSPIRE'}[rid], 'prompt': 'PRESS E TO CLIMB'}
    for rid, R in ROUTES.items()
] + [
    {'x': 18, 'y': 39, 'type': 'enter_world', 'label': 'TO FELLHAVEN', 'prompt': 'PRESS E TO WALK DOWN', 'target': 'hoarfell', 'spawn': [26, 9]},
]
w['climb'] = CLIMB
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=[], scene_extra={'backdrop': True})
print('hoarfell-face done', len(HOLDS), 'holds', len(LEDGES), 'ledges')
