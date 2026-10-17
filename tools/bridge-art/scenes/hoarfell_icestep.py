"""Hoarfell — the Ice Step on the Last Ridge, climbed in the world. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_icestep.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-icestep

The wall of ice across the Last Ridge (hoarfell-ridge): the only way on past the crevasse field. Built like the
Hoarspire face (hoarfell_face.py, whose notes below still hold) but narrower and colder: one line, almost all ice,
two ledges, a little loose rock, the cornice at the top where you step out onto the high ridge. The evening is
further gone up here — the light lower and bluer.

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
WID = 'hoarfell-icestep'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 24, 34
C = math.cos(math.radians(45))
FACE_R, TOP = 27.0, 25.0                     # the face's foot (row) and height (tiles)
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.6, seed=7219)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the lines up the face ----------------------------------------------------------------------------------------
ROUTES = {
    'icestep': {'x': 12.0, 'w': 3.4, 'mix': {'ice': 9, 'crimp': 1, 'jug': 1}, 'ledge_every': 9.0, 'loose': 0.06, 'col': '#3a8ae0',
                'step': (1.1, 1.7), 'decoys': 2},
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
# hoar crystals, off the lines where you have to go out of your way
CRYST = []
for rid in ('icestep', 'icestep', 'icestep'):
    cand = [m for m in MAIN[rid] if m[0] != 'ledge' and m[2] > 6]
    m = cand[rnd.randrange(len(cand))]
    c = [round(m[1] + (1 if rnd.random() < 0.5 else -1) * rnd.uniform(1.4, 1.9), 2), round(m[2] + 0.3, 2), 'crystal']
    HOLDS.append(c)
    CRYST.append(c)


# ---- the face: one sheet of rock with relief, banded by strata ---------------------------------------------------
def relief(x, z):
    """How far (tiles) the face stands out toward the camera at (x, z) — 0 to about 1; the surface is at surf()."""
    d = 0.16 * n2(x, z, 0.55, 3) + 0.08 * n2(x * 2.1, z * 1.7, 0.9, 7)
    d += 0.3 * math.exp(-((x - 4.0) / 1.6) ** 2) + 0.3 * math.exp(-((x - 20.0) / 1.8) ** 2)       # rock ribs either side of the ice
    return d


def surf(x, z):
    """The face's row at (x, z): never nearer the camera than FACE_R, so a climber drawn there is always in front."""
    return FACE_R - 1.0 + min(1.0, relief(x, z) + 0.25)


def pn(x, z, f, seed):
    """Perlin noise, about -1..1."""
    return noise.noise(Vector((x * f, z * f, seed * 7.31)))


def ice_at(x, z):
    return abs(x - (12.0 + 0.9 * math.sin(z / 5.0))) < 6.2 + 1.0 * pn(x, z, 0.35, 2) and z < TOP - 0.6


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
# ---- the foot: a shelf of wind-packed snow, the climb's start, the way back to the crevasse field ---------------------------
N.snowfield(k, -4, FACE_R - 2.0, COLS + 4, ROWS + 0.6)
N.trodden(k, 11.5, FACE_R + 0.6, 12.6, ROWS + 0.6)
N.route_foot(k, ROUTES['icestep']['x'], FACE_R + 0.8, 1.4, 0.6, ROUTES['icestep']['col'])
N.icefall(k, 12.0, FACE_R - 0.2, FACE_R + 0.6, 1.0)
for (x, r, s_) in ((3.0, 29.6, 0.6), (20.5, 29.2, 0.5), (6.5, 31.6, 0.4), (18.0, 32.4, 0.45), (1.6, 32.8, 0.5), (22.4, 31.8, 0.55)):
    k.rock(x, r, 0.1, s_, s_ * 0.8, s_ * 0.7, ('#5a6272', 0.06), part='boulder', segs=8)
    k.blob(x, r, s_ * 0.6, s_ * 0.75, s_ * 0.6, s_ * 0.3, (N.SNOW, 0.03), 'boulder_snow', segs=8)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)
k.solid(0, 0, COLS, int(FACE_R) + 1)                                          # the wall
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)

# ---- the light: the village's alpenglow ----------------------------------------------------------------------------------------------
k.sun((0.7, -0.5, -0.4), '#ff9a88', 2.6, angle=3.0)        # lower and redder up here: the sun nearly down
# by night the moon from in front too (from behind, the face was in its own shadow all night)
k.render(OUT, cycle={'base': 'day', 'moon': ((0.3, -0.6, -0.74), '#8a98d0', 1.0)}, light_states={'full': {}}, light_samples=64, world_light=('#7a86c8', 0.95))

FOOT = int(FACE_R) + 1
CLIMB = {
    'face': FACE_R, 'top': TOP, 'foot': FOOT,
    'routes': {rid: {'x': R['x'], 'start': [R['x'], FOOT + 0.6]} for rid, R in ROUTES.items()},
    # each with its screen row (tiles): where on screen the hold is, relief and all
    'holds': [[h[0], h[1], h[2], round(surf(h[0], h[1]) + 0.05 - h[1] * C, 3)] for h in HOLDS],
    'ledges': [[l[0], l[1], l[2], round(max(surf(l[0], l[2]), surf((l[0] + l[1]) / 2, l[2]), surf(l[1], l[2])) + 0.1 - l[2] * C, 3)] for l in LEDGES],
    'topRow': round(surf(12, TOP) - TOP * C, 3),
}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Ice Step', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [12, 32]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 2})
w['interactions'] = [
    {'x': 12, 'y': FOOT, 'type': 'climb', 'route': 'icestep', 'label': 'THE ICE STEP', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 12, 'y': ROWS - 1, 'type': 'enter_world', 'label': 'BACK TO THE CREVASSE FIELD', 'prompt': 'PRESS E TO GO BACK',
     'target': 'hoarfell-ridge', 'spawn': [14, 36]},
]
w['climb'] = CLIMB
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=[], scene_extra={'backdrop': True})
print('hoarfell-icestep done', len(HOLDS), 'holds', len(LEDGES), 'ledges')
