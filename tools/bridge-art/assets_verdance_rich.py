"""Verdance, rebuilt in the house style (Look Book 2, Oct 2026): the pieces the farm and Brambleford share that the
older kits don't have — every function takes a Kit, tile units (x, row, z) like every kit.

  import assets_verdance_rich as VR
  VR.well(k, cx, cr)                       a stone well in courses under a shingled gable on two posts, winch and bucket
  VR.tool_shed(k, x0, x1, r_back, r_front) a board-and-batten shed, shingled, a ledged door, tools, a water butt, pots
  VR.tower_mill(k, cx, cr, h, rad)         a whitewashed tower mill: stone foot, door and windows, a boat cap, sails, fantail
  VR.dry_wall(k, a, b, h)                  a dry-stone wall along any line, copestones on top (k.solid off by default)
  VR.terrace_face(k, x0, x1, r, z_top)     a retaining wall's stone face, a lip of turf, ivy, crevice flowers, ferns
  VR.hedge(k, a, b, h)                     a hedgerow of leafy clumps along a line (one tree id per few metres)
  VR.verge(k, x0, r0, x1, r1, n)           tall grass, foxgloves, cow parsley, ox-eye daisies in clumps
  VR.washing_line / wheelbarrow / churns / trough / field_gate / ladder / basket / ducks / chopping_block /
  VR.water_butt / pots / hay_cart / bee_bench / fallen_apples / stepping_stones / crow
Lines go round what stands up (scene_post); flat ground things take ground words (path, grass) so none ring them.
"""
import math

from scenekit import shade
import assets_town as W
from assets_lumar import barrel

STONES = ('#a09888', '#8e8678', '#b0a690', '#7e786e', '#9a9282', '#a89c86')
WOOD, WOOD_D, WOOD_DD = '#8a6438', '#5a3e22', '#3e2a18'
IRON = '#2e2c30'


def _dir(a, b):
    (x0, r0), (x1, r1) = a, b
    L = math.hypot(x1 - x0, r1 - r0) or 1e-6
    return (x1 - x0) / L, (r1 - r0) / L, L


# ---- stone ---------------------------------------------------------------------------------------------------------
def dry_wall(k, a, b, h=0.5, d=0.26, solid=False, tones=STONES, moss=0.12):
    """A dry-stone wall from a to b (floor points): rough blocks laid in courses along the line, each its own tone, the
    odd mossy one, rounded copestones along the top."""
    rng = k.rng
    ux, ur, L = _dir(a, b)
    z, i = 0.0, 0
    while z < h - 0.09:
        zh = min(h - 0.09, z + rng.uniform(0.1, 0.15))
        t = -(0.09 if i % 2 else 0.0)
        while t < L:
            w = rng.uniform(0.17, 0.32)
            t0, t1 = max(0.0, t) + 0.012, min(L, t + w) - 0.012
            if t1 > t0 + 0.04:
                col = shade(rng.choice(tones), rng.uniform(0.85, 1.08))
                k.bar(a[0] + ux * t0, a[1] + ur * t0, a[0] + ux * t1, a[1] + ur * t1, z + 0.01, zh, d - rng.uniform(0, 0.04),
                      (col, 0.14), 'wall_stone', bevel=0.02)
                if rng.random() < moss:
                    tm = (t0 + t1) / 2
                    k.blob(a[0] + ux * tm, a[1] + ur * tm + 0.02, zh, (t1 - t0) * 0.35, d * 0.4, 0.035,
                           (shade('#4a7a36', rng.uniform(0.85, 1.1)), 0.2), 'moss', segs=7)
            t += w
        z, i = zh, i + 1
    t = 0.0
    ang = math.degrees(math.atan2(-ur, ux))
    while t < L - 0.04:
        w = rng.uniform(0.12, 0.19)
        tm = t + w / 2
        k.blob(a[0] + ux * tm, a[1] + ur * tm, h - 0.04, w / 2 + 0.01, d / 2 + 0.01, 0.075,
               (shade('#9a9080', rng.uniform(0.85, 1.07)), 0.1), 'copestone', rot=(0, 0, ang), segs=8)
        t += w
    if solid:
        k.solid(min(a[0], b[0]) - 0.15, min(a[1], b[1]) - 0.15, max(a[0], b[0]) + 0.15, max(a[1], b[1]) + 0.15)


def terrace_face(k, x0, x1, r, z_top, gaps=(), z_foot=-0.05, green='#5e9a3a', ivy=(), flowers=14, ferns=0.55):
    """The face of a retaining wall running along row r from x0 to x1 (the ground behind it at z_top, in front at
    z_foot): courses of stacked stones over dark mortar, moss on a stone's top now and then, a ragged lip of turf with
    grass hanging over, ivy spilling down at `ivy` xs, flowers in the crevices, ferns and dock at the foot.
    `gaps`: (xa, xb) runs left open (steps, a waterfall)."""
    rng = k.rng

    def free(x, pad=0.0):
        return not any(ga - pad < x < gb + pad for ga, gb in gaps)
    k.box(x0, r - 0.3, z_foot - 0.1, x1, r - 0.03, z_top - 0.06, ('#4a4440', 0.2), 'mortar')
    z = z_foot
    course = 0
    while z < z_top - 0.08:
        hh = rng.uniform(0.2, 0.32)
        x = x0 + (0.0 if course % 2 else rng.uniform(0.12, 0.3))
        while x < x1:
            w = rng.uniform(0.36, 0.8)
            xb = min(x + w, x1)
            if free(x + (xb - x) / 2, 0.05) and xb - x > 0.1:
                out = rng.uniform(0.0, 0.05)
                col = shade(rng.choice(STONES), rng.uniform(0.9, 1.08))
                k.box(x + 0.02, r - 0.08, z + 0.02, xb - 0.02, r + 0.02 + out, min(z_top - 0.01, z + hh - 0.02),
                      (col, 0.16), 'wall_stone', bevel=0.03)
                if rng.random() < 0.15:
                    k.blob(x + (xb - x) * rng.uniform(0.3, 0.7), r + out, min(z_top - 0.02, z + hh - 0.02), (xb - x) * 0.3, 0.05,
                           0.04, (shade('#4a7a36', rng.uniform(0.85, 1.1)), 0.2), 'moss', segs=8)
            x += w
        z += hh
        course += 1
    lip, hang = [], {shade(green, 0.85): [], green: [], shade(green, 1.15): []}
    x = x0
    while x < x1:
        w = rng.uniform(0.15, 0.4)
        if free(x + w / 2, 0.1):
            d = rng.uniform(0.04, 0.12)
            lip.append((x, r - 0.12, z_top - 0.05, min(x1, x + w), r + d, z_top + 0.012))
            for _ in range(int(w * 18)):
                hang[rng.choice(list(hang))].append((x + rng.uniform(0, w), r + d * 0.6, z_top + 0.005,
                                                     -rng.uniform(0.07, 0.16), 0.022, rng.uniform(-0.02, 0.02), rng.uniform(0.03, 0.08)))
        x += w
    if lip:
        k.boxes(lip, (green, 0.12), 'grass')
    for col, bs in hang.items():
        if bs:
            k.blades(bs, (col, 0.25), 'grass')
    for ix in ivy:
        with k.foliage('leaf'):
            for j in range(26):
                x = ix + rng.uniform(-0.55, 0.55)
                zz = z_top - rng.uniform(0.0, 0.9) * (1 - abs(x - ix) / 0.7) * (z_top - z_foot)
                k.blob(x, r + 0.06, zz, rng.uniform(0.07, 0.12), 0.05, rng.uniform(0.06, 0.1),
                       shade(rng.choice(('#2e5a2a', '#3a6a30', '#2a4e26')), rng.uniform(0.9, 1.1)), 'ivy', segs=8)
    for _ in range(flowers):
        x, zz = rng.uniform(x0 + 0.3, x1 - 0.3), rng.uniform(z_foot + 0.12, z_top - 0.12)
        if not free(x, 0.3):
            continue
        for j in range(3):
            k.sphere(x + rng.uniform(-0.05, 0.05), r + 0.06, zz + rng.uniform(-0.04, 0.04), 0.03, 0.025,
                     rng.choice(('#f0f0e0', '#f0d040', '#b080e0')), 'wall_flower', segs=5)
    with k.foliage('leaf'):
        x = x0 + 0.2
        while x < x1 - 0.2:
            if free(x, 0.4) and rng.random() < ferns:
                fern(k, x, r + rng.uniform(0.1, 0.22), z_foot + 0.04)
            x += rng.uniform(0.35, 0.8)


def fern(k, x, r, z=0.0, s=1.0, tone=None):
    """A fern or dock: fronds fanned toward you (call inside k.foliage)."""
    rng = k.rng
    col = shade(tone or rng.choice(('#3e7a34', '#4a8a3a', '#356a30')), rng.uniform(0.9, 1.1))
    n = rng.randint(5, 8)
    fronds = []
    for j in range(n):
        a = math.pi * (0.1 + 0.8 * j / (n - 1)) + rng.uniform(-0.1, 0.1)
        L = rng.uniform(0.22, 0.36) * s
        fronds.append((x, r, z, L * 0.55, 0.05 * s, -math.cos(a) * L, math.sin(a) * L * 0.35))
    k.blades(fronds, (col, 0.2), 'fern')


# ---- green -----------------------------------------------------------------------------------------------------------
def hedge(k, a, b, h=0.75, w=0.5, tone='#3a6a30', flowers=None, z0=0.0):
    """A hedgerow along a line: a dark body and leafy crowns along it, a few tones, the odd tall shoot; hawthorn or
    dog-rose flowers if given. Each 1.6 tiles is its own 'tree' for the seasons."""
    rng = k.rng
    ux, ur, L = _dir(a, b)
    t = 0.0
    while t < L:
        seg = min(1.6, L - t)
        with k.foliage('leaf'):
            s = 0.0
            while s < seg:
                tm = t + s + rng.uniform(-0.05, 0.05)
                x, r = a[0] + ux * tm, a[1] + ur * tm
                hh = h * rng.uniform(0.85, 1.15)
                W.leafy_crown(k, x, r, z0 + hh * 0.55, w * 0.62, w * 0.5, hh * 0.55,
                              shade(tone, rng.uniform(0.88, 1.08)), part='hedge', sprigs=True)
                s += rng.uniform(0.38, 0.5)
        if flowers:
            for _ in range(int(seg * 6)):
                tm = t + rng.uniform(0, seg)
                x, r = a[0] + ux * tm, a[1] + ur * tm
                k.sphere(x + rng.uniform(-0.15, 0.15), r + w * 0.45, z0 + h * rng.uniform(0.35, 1.0), 0.04, 0.035,
                         rng.choice(flowers), 'hedge_flower', segs=5)
        t += seg


def verge(k, x0, r0, x1, r1, n=20, avoid=None, kinds=('grass', 'grass', 'foxglove', 'parsley', 'daisy')):
    """Clumps of the wilder edge: tall seeding grass, foxgloves, cow parsley, ox-eye daisies."""
    rng = k.rng
    tall = {'#6a9a3a': [], '#5a8a34': [], '#8aa848': []}
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if avoid and avoid(x, r):
            continue
        kind = rng.choice(kinds)
        if kind == 'grass':
            for _ in range(rng.randint(8, 14)):
                h = rng.uniform(0.25, 0.48)
                tall[rng.choice(list(tall))].append((x + rng.uniform(-0.12, 0.12), r + rng.uniform(-0.06, 0.06), 0.0, h, 0.018,
                                                    rng.uniform(-0.1, 0.1), rng.uniform(-0.03, 0.03)))
            for _ in range(rng.randint(1, 3)):
                k.blob(x + rng.uniform(-0.1, 0.1), r, rng.uniform(0.35, 0.5), 0.02, 0.02, 0.06, ('#c8b878', 0.3), 'seedhead', segs=5)
        elif kind == 'foxglove':
            for _ in range(rng.randint(1, 3)):
                fx, h = x + rng.uniform(-0.12, 0.12), rng.uniform(0.45, 0.7)
                k.cone(fx, r, 0.0, h, 0.02, 0.008, '#4a7a34', 'stem', verts=4)
                col = rng.choice(('#c860a8', '#d878b8', '#e8d0e8'))
                for j in range(6):
                    k.sphere(fx + 0.02, r + 0.03, h * (0.5 + j * 0.08), 0.035 - j * 0.003, 0.03, col, 'flower', segs=5)
            with k.foliage('leaf'):
                fern(k, x, r, 0.0, s=0.6, tone='#4a7a34')
        elif kind == 'parsley':
            for _ in range(rng.randint(2, 4)):
                fx, h = x + rng.uniform(-0.15, 0.15), rng.uniform(0.35, 0.55)
                k.cone(fx, r, 0.0, h, 0.012, 0.006, '#5a8a3a', 'stem', verts=3)
                k.blob(fx, r, h, 0.08, 0.06, 0.025, ('#f2f0e4', 0.3), 'flower', segs=7)
        else:
            for _ in range(rng.randint(3, 6)):
                fx, fr, h = x + rng.uniform(-0.15, 0.15), r + rng.uniform(-0.06, 0.06), rng.uniform(0.15, 0.3)
                k.cone(fx, fr, 0.0, h, 0.01, 0.005, '#4a7a30', 'stem', verts=3)
                k.cyl(fx, fr, h, h + 0.012, 0.045, '#f4f2ea', 'flower', verts=8)
                k.sphere(fx, fr, h + 0.015, 0.018, 0.012, '#f0c830', 'flower', segs=5)
    for col, bl in tall.items():
        if bl:
            k.blades(bl, (col, 0.2), 'tall_grass')


def flower_patch(k, cx, cr, rad=0.6, cols=None, n=40):
    """A drift of one or two kinds of wildflower, thick in the middle and thinning out (poppies, buttercups, campion,
    cornflowers), low enough to walk through."""
    rng = k.rng
    cols = cols or rng.choice((('#e03a2a',), ('#f4d040', '#f0e070'), ('#e86aa8',), ('#5a8ae0', '#f4f0e4'), ('#f4f0e4', '#f4d040')))
    for _ in range(n):
        a, d = rng.uniform(0, math.tau), rad * rng.random() ** 0.8
        x, r = cx + math.cos(a) * d, cr + math.sin(a) * d * 0.75
        h = rng.uniform(0.08, 0.2)
        k.cone(x, r, 0.0, h, 0.012, 0.005, '#3a6a2a', 'flower', verts=3)
        k.sphere(x, r, h, 0.055, 0.04, rng.choice(cols), 'flower', segs=6)


def willow(k, cx, cr, h=2.9, tone='#6a9a44'):
    """A weeping willow: a leaning, gnarled trunk forking low, a crown of leaf clumps, and curtains of hanging strands
    falling from its rim nearly to the ground (one tree for the seasons)."""
    rng = k.rng
    k.tube((cx, cr, 0.0), (cx + 0.15, cr, h * 0.45), 0.14, ('#5a4a3a', 0.15), 'trunk', rb=0.09, verts=8)
    for a in (0.6, 2.6, 4.5):
        k.tube((cx, cr, 0.12), (cx + math.cos(a) * 0.3, cr + math.sin(a) * 0.2, -0.02), 0.06, ('#5a4a3a', 0.15), 'root', rb=0.02, verts=5)
    for a in (0.3, 2.2, 3.9, 5.2):
        k.tube((cx + 0.15, cr, h * 0.42), (cx + math.cos(a) * 0.55, cr + math.sin(a) * 0.35, h * 0.72), 0.05, ('#5a4a3a', 0.15), 'branch', rb=0.025, verts=5)
    with k.foliage('leaf'):
        W.leafy_crown(k, cx + 0.1, cr, h * 0.78, 1.05, 0.8, 0.5, tone, part='leaves')
        strands = {shade(tone, 0.82): [], tone: [], shade(tone, 1.14): []}
        for i in range(260):
            a = rng.uniform(0, math.tau)
            if math.sin(a) < -0.5 and rng.random() < 0.7:
                continue
            R = rng.uniform(0.75, 1.15)
            x, r = cx + 0.1 + math.cos(a) * R, cr + math.sin(a) * R * 0.78
            z = h * rng.uniform(0.62, 0.86)
            L = rng.uniform(0.9, z - 0.1)
            strands[rng.choice(list(strands))].append((x, r, z - L, L, 0.035, math.cos(a) * 0.05, math.sin(a) * 0.04))
        for col, bl in strands.items():
            k.blades([(x + lx, r + lr, z0 + L, -L, w, -lx, -lr) for (x, r, z0, L, w, lx, lr) in bl], (col, 0.22), 'leaves')
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


# ---- buildings -------------------------------------------------------------------------------------------------------
def well(k, cx, cr, stone=None, roof='#3a5a7a'):
    """A village well: a drum of dressed stones in courses with a capstone ring, two oak posts, a shingled gable over a
    winch with its crank, a rope down to the water and a bucket on the rim. Solid one tile, as before."""
    rng = k.rng
    ring = 0.48
    z, i = 0.0, 0
    while z < 0.55:
        n = 11
        hh = rng.uniform(0.13, 0.17)
        for j in range(n):
            a0 = (j + (0.5 if i % 2 else 0.0)) / n * math.tau
            a1 = a0 + math.tau / n
            am = (a0 + a1) / 2
            col = shade(stone or rng.choice(STONES), rng.uniform(0.86, 1.1))
            xa, ra = cx + math.cos(a0) * ring, cr + math.sin(a0) * ring * 0.95
            xb, rb = cx + math.cos(a1) * ring, cr + math.sin(a1) * ring * 0.95
            k.bar(xa + math.cos(am) * -0.01, ra, xb, rb, z + 0.01, z + hh - 0.01, 0.2, (col, 0.14), 'well_stone', bevel=0.02)
        z, i = z + hh, i + 1
    W.annulus(k, cx, cr, 0.3, 0.54, z, z + 0.08, (shade('#b0a690', 1.02), 0.12), 'well_cap')
    k.cyl(cx, cr, -0.2, z - 0.1, 0.3, '#0a1420', 'well_water', emit=('#2a4a8a', 0.25), verts=14)
    k.cyl(cx, cr, z - 0.16, z - 0.1, 0.32, '#141a20', 'well_shaft', verts=14)
    zt = z + 0.08
    for s in (-1, 1):
        k.box(cx + s * 0.46 - 0.05, cr - 0.05, zt - 0.1, cx + s * 0.46 + 0.05, cr + 0.05, 1.45, (WOOD_D, 0.15), 'well_post')
        k.tube((cx + s * 0.46, cr, 1.12), (cx + s * 0.2, cr, 1.38), 0.025, WOOD_D, 'well_brace', verts=4)
    k.cyl_x(cx - 0.5, cx + 0.5, cr, 1.2, 0.06, 0.06, (WOOD, 0.15), 'well_axle', verts=10)
    for dx in (-0.12, -0.05, 0.02, 0.09):                                  # rope wound on the drum
        k.cyl_x(cx + dx, cx + dx + 0.05, cr, 1.2, 0.075, 0.075, '#c8b080', 'well_rope', verts=10)
    k.tube((cx + 0.5, cr, 1.2), (cx + 0.62, cr, 1.2), 0.02, IRON, 'well_crank', verts=5)
    k.tube((cx + 0.62, cr, 1.2), (cx + 0.62, cr + 0.04, 0.98), 0.018, IRON, 'well_crank', verts=5)
    k.tube((cx - 0.02, cr + 0.06, 1.14), (cx - 0.02, cr + 0.06, 0.75), 0.01, '#b8a070', 'well_rope', verts=4)
    k.cyl(cx - 0.02, cr + 0.06, 0.6, 0.78, 0.09, ('#7a5a34', 0.15), 'well_bucket', verts=10)
    k.cyl(cx - 0.02, cr + 0.06, 0.66, 0.69, 0.095, IRON, 'well_hoop', verts=10)
    W._gable_roof(k, cx - 0.62, cx + 0.62, cr - 0.42, cr + 0.42, 1.45, 0.48, roof, over=0.08, moss=0.3)
    k.cyl(cx + 0.3, cr + 0.42, zt, zt + 0.18, 0.11, ('#6a4a2a', 0.15), 'well_bucket', verts=10)   # a second bucket on the rim
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.5)


def tool_shed(k, x0, x1, r_back, r_front, wall_h=1.65, roof='#5a5650', door_x=None):
    """A board-and-batten timber shed on a stone sill: vertical boards with battens over the joints, a ledged-and-braced
    door, a little four-pane window, a shingled gable roof, a hoe, rake and spade against the front, a water butt."""
    rng = k.rng
    door_x = (x0 + x1) / 2 - 0.25 if door_x is None else door_x
    tone = '#7a5a38'
    k.box(x0 - 0.04, r_back - 0.04, 0.0, x1 + 0.04, r_front + 0.04, 0.16, (shade('#8a8274', 0.95), 0.14), 'footing', bevel=0.02)
    k.box(x0 + 0.03, r_back + 0.03, 0.16, x1 - 0.03, r_front - 0.03, wall_h, (tone, 0.18), 'shed_wall')
    x = x0 + 0.03
    while x < x1 - 0.05:                                                   # boards, each its own tone, battens over joints
        w = rng.uniform(0.16, 0.22)
        k.box(x, r_front - 0.035, 0.17, min(x + w, x1 - 0.03) - 0.008, r_front, wall_h - 0.02,
              (shade(tone, rng.uniform(0.86, 1.08)), 0.2), 'shed_board')
        k.box(x - 0.018, r_front - 0.005, 0.17, x + 0.018, r_front + 0.02, wall_h - 0.02, shade(tone, 0.7), 'shed_batten')
        x += w
    dw, dh = 0.62, 1.32
    k.box(door_x - dw / 2 - 0.05, r_front, 0.16, door_x + dw / 2 + 0.05, r_front + 0.03, 0.16 + dh + 0.05, WOOD_DD, 'door_frame')
    dcol = '#4a6a5a'
    k.box(door_x - dw / 2, r_front + 0.02, 0.17, door_x + dw / 2, r_front + 0.05, 0.16 + dh, (dcol, 0.15), 'shed_door')
    for zz in (0.3, 0.16 + dh - 0.18):
        k.box(door_x - dw / 2 + 0.03, r_front + 0.05, zz, door_x + dw / 2 - 0.03, r_front + 0.07, zz + 0.08, shade(dcol, 0.75), 'door_ledge')
    k.tube((door_x - dw / 2 + 0.08, r_front + 0.06, 0.4), (door_x + dw / 2 - 0.08, r_front + 0.06, 0.16 + dh - 0.24), 0.025,
           shade(dcol, 0.75), 'door_brace', verts=4)
    k.box(door_x + dw / 2 - 0.13, r_front + 0.06, 0.82, door_x + dw / 2 - 0.08, r_front + 0.09, 0.9, IRON, 'latch')
    wx = x1 - 0.42 if door_x < (x0 + x1) / 2 else x0 + 0.42
    k.box(wx - 0.24, r_front, 0.85, wx + 0.24, r_front + 0.05, 1.3, WOOD_DD, 'window_frame')
    k.box(wx - 0.19, r_front + 0.02, 0.9, wx + 0.19, r_front + 0.07, 1.25, '#3a4a50', 'window_glass', emit=(W.GLOW, 0.3))
    k.box(wx - 0.015, r_front + 0.06, 0.9, wx + 0.015, r_front + 0.08, 1.25, WOOD_DD, 'window_frame')
    k.box(wx - 0.19, r_front + 0.06, 1.06, wx + 0.19, r_front + 0.08, 1.09, WOOD_DD, 'window_frame')
    k.box(wx - 0.3, r_front, 0.78, wx + 0.3, r_front + 0.12, 0.85, '#8a8274', 'sill')
    W._gable_roof(k, x0, x1, r_back, r_front, wall_h, 0.62, roof, over=0.18)
    for (tx, h, head) in ((x0 + 0.14, 1.25, 'rake'), (x0 + 0.3, 1.15, 'hoe'), (x1 - 0.16, 1.05, 'spade')):
        if abs(tx - door_x) < dw / 2 + 0.1 or abs(tx - wx) < 0.3:
            continue
        k.tube((tx, r_front + 0.18, 0.0), (tx + 0.05, r_front + 0.05, h), 0.022, WOOD, 'tool_handle', verts=5)
        if head == 'rake':
            k.box(tx - 0.16, r_front + 0.17, 0.0, tx + 0.16, r_front + 0.21, 0.04, IRON, 'tool_head')
        elif head == 'hoe':
            k.box(tx - 0.08, r_front + 0.18, 0.0, tx + 0.08, r_front + 0.24, 0.08, IRON, 'tool_head')
        else:
            k.box(tx - 0.08, r_front + 0.15, 0.0, tx + 0.08, r_front + 0.21, 0.24, '#8a8e94', 'tool_head')
    k.solid(x0, r_back, x1, r_front)


def tower_mill(k, cx, cr, h=4.2, rad=0.8, wall='#ece4d4', cap='#6a5248', sail_cloth=('#ece2cc', '#e2d4b8')):
    """A tower mill: a stone foot, a tapering whitewashed tower of courses (a little weathered toward the foot), a
    timber door under a hood and small windows up it, a boat-shaped timber cap with a finial, the windshaft, four
    lattice sails (two clothed, two bare), a fantail behind. Solid on its footprint."""
    rng = k.rng
    top = rad * 0.6
    k.cyl(cx, cr, 0.0, 0.42, rad + 0.08, (shade('#9a9282', 0.95), 0.2), 'mill_foot', verts=18, ry=(rad + 0.08) * 0.95)
    for j in range(18):                                                    # the foot's stones
        a = (j + 0.5) / 18 * math.tau
        if math.sin(a) < -0.3:
            continue
        col = shade(rng.choice(STONES), rng.uniform(0.86, 1.08))
        k.blob(cx + math.cos(a) * (rad + 0.09), cr + math.sin(a) * (rad + 0.09) * 0.95, rng.uniform(0.1, 0.3), 0.14, 0.06, 0.1,
               (col, 0.16), 'mill_stone', rot=(0, 0, math.degrees(a) + 90), segs=7)
    n = 9
    for i in range(n):                                                     # the tower in courses, tapering
        z0, z1 = 0.42 + (h - 0.42) * i / n, 0.42 + (h - 0.42) * (i + 1) / n
        r0, r1 = rad + (top - rad) * i / n, rad + (top - rad) * (i + 1) / n
        col = shade(wall, 0.92 + 0.08 * i / n + rng.uniform(-0.02, 0.02))
        k.cone(cx, cr, z0, z1, r0, r1, (col, 0.16), 'mill_tower', verts=20)
        k.cone(cx, cr, z1 - 0.025, z1, r1 + 0.012, r1 + 0.012, shade(col, 0.86), 'mill_course', verts=20)
    face = lambda z: cr + (rad + (top - rad) * (z - 0.42) / (h - 0.42)) * 0.98
    k.box(cx - 0.3, face(0.6) - 0.04, 0.42, cx + 0.3, face(0.6) + 0.06, 1.42, WOOD_DD, 'door_frame')
    k.box(cx - 0.25, face(0.6) + 0.02, 0.42, cx + 0.25, face(0.6) + 0.08, 1.36, ('#5a3e22', 0.15), 'mill_door')
    for zz in (0.62, 1.12):
        k.box(cx - 0.23, face(0.6) + 0.08, zz, cx + 0.23, face(0.6) + 0.1, zz + 0.07, shade('#5a3e22', 0.75), 'door_ledge')
    k.poly([(cx - 0.38, face(1.4) + 0.32, 1.45), (cx + 0.38, face(1.4) + 0.32, 1.45), (cx + 0.38, face(1.4) - 0.02, 1.68),
            (cx - 0.38, face(1.4) - 0.02, 1.68)], (cap, 0.15), 'roof_hood')
    for (wz, wx) in ((2.05, -0.18), (2.85, 0.14)):
        fr = face(wz)
        k.box(wx + cx - 0.15, fr - 0.04, wz - 0.04, wx + cx + 0.15, fr + 0.05, wz + 0.34, WOOD_DD, 'window_frame')
        k.box(wx + cx - 0.1, fr + 0.0, wz, wx + cx + 0.1, fr + 0.07, wz + 0.3, '#4a2a18', 'mill_window', emit=('#ffd890', 0.7))
        k.box(wx + cx - 0.18, fr + 0.0, wz - 0.08, wx + cx + 0.18, fr + 0.1, wz - 0.03, '#b0a690', 'sill')
    # the cap: a curb, then a tall shingled cap in courses with a finial
    k.cyl(cx, cr, h, h + 0.1, top + 0.1, (WOOD_D, 0.15), 'mill_curb', verts=20)
    ch = 1.05
    n = 6
    for j in range(n):
        z0, z1 = h + 0.1 + ch * j / n, h + 0.1 + ch * (j + 1) / n + 0.04
        R0 = (top + 0.2) * (1 - j / n) ** 0.85
        R1 = (top + 0.2) * (1 - (j + 1) / n) ** 0.85
        k.cone(cx, cr, z0, z1, R0 + 0.02, R1, (shade(cap, 0.92 + 0.12 * (j % 2)), 0.16), 'roof_cap', verts=20)
    k.cone(cx, cr, h + 0.1 + ch, h + 0.45 + ch, 0.05, 0.0, WOOD_DD, 'finial', verts=6)
    k.sphere(cx, cr, h + 0.42 + ch, 0.05, 0.05, '#c8a040', 'finial', segs=8)
    # the windshaft and four sails, leaning back a little as real ones do
    hz = h + 0.3
    hr = cr + top + 0.36
    k.cyl_y(cx, cr + top - 0.1, hr + 0.06, hz, 0.11, 0.11, WOOD_DD, 'mill_shaft', verts=10)
    k.cyl_y(cx, hr, hr + 0.12, hz, 0.17, 0.17, IRON, 'mill_poll', verts=10)
    span = h * 0.68
    for i in range(4):
        a = i * math.tau / 4 + 0.42
        ca, sa = math.cos(a), math.sin(a)
        px, pz = -sa, ca
        tip = (cx + ca * span, hr + 0.1, hz + sa * span)
        k.tube((cx, hr + 0.1, hz), tip, 0.045, ('#4a3020', 0.15), 'mill_whip', verts=5)
        clothed = True
        w = 0.4
        for side in (1, -1) if not clothed else (1,):
            ww = w if side > 0 else w * 0.45
            edge = [(cx + ca * span * t + px * ww * side, hr + 0.11, hz + sa * span * t + pz * ww * side) for t in (0.22, 1.0)]
            k.tube(edge[0], edge[1], 0.014, '#4a3020', 'mill_lath', verts=4)
            for t in [0.22 + j * 0.0975 for j in range(9)]:
                c = (cx + ca * span * t, hr + 0.11, hz + sa * span * t)
                k.tube(c, (c[0] + px * ww * side, c[1], c[2] + pz * ww * side), 0.011, '#4a3020', 'mill_lath', verts=4)
        if clothed:
            for j in range(4):                                           # the cloth in panels between the bars
                t0, t1 = 0.24 + j * 0.19, 0.24 + (j + 1) * 0.19 - 0.02
                p0 = (cx + ca * span * t0, hr + 0.125, hz + sa * span * t0)
                p1 = (cx + ca * span * t1, hr + 0.125, hz + sa * span * t1)
                k.poly([p0, p1, (p1[0] + px * w * 0.95, p1[1], p1[2] + pz * w * 0.95),
                        (p0[0] + px * w * 0.95, p0[1], p0[2] + pz * w * 0.95)], (sail_cloth[j % 2], 0.3), 'mill_sail')
    # the fantail behind the cap
    fr_ = cr - top - 0.45
    k.tube((cx, cr - top + 0.05, h + 0.25), (cx, fr_, h + 0.55), 0.03, WOOD_D, 'mill_fan_arm', verts=4)
    for j in range(6):
        a = j / 6 * math.tau
        k.poly([(cx, fr_, h + 0.55), (cx + math.cos(a) * 0.32, fr_, h + 0.55 + math.sin(a) * 0.32),
                (cx + math.cos(a + 0.4) * 0.32, fr_, h + 0.55 + math.sin(a + 0.4) * 0.32)], ('#e8dcc8', 0.2), 'mill_fan')
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


# ---- farm life -------------------------------------------------------------------------------------------------------
def washing_line(k, x0, x1, r, h=1.35, cloths=None):
    """Two T-posts and a sagging line, sheets and shirts pegged out on it."""
    for x in (x0, x1):
        k.box(x - 0.04, r - 0.04, 0.0, x + 0.04, r + 0.04, h + 0.08, (WOOD_D, 0.15), 'line_post')
        k.box(x - 0.04, r - 0.2, h, x + 0.04, r + 0.2, h + 0.06, (WOOD_D, 0.15), 'line_post')
    pts = [(x0 + (x1 - x0) * t, r, h + 0.02 - 0.18 * 4 * t * (1 - t)) for t in [i / 12 for i in range(13)]]
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.008, '#e8e0d0', 'line', verts=4)
    cloths = cloths or ['#f2eee4', '#8ab0d8', '#f2eee4', '#d07060', '#e8d890', '#f2eee4']
    x = x0 + 0.25
    i = 0
    while x < x1 - 0.35 and i < len(cloths):
        w = k.rng.uniform(0.26, 0.42)
        t = (x + w / 2 - x0) / (x1 - x0)
        z = h + 0.02 - 0.18 * 4 * t * (1 - t)
        dz = k.rng.uniform(0.32, 0.55)
        k.box(x, r - 0.012, z - dz, x + w, r + 0.012, z, (cloths[i], 0.3), 'washing')
        k.box(x + 0.03, r - 0.02, z - 0.04, x + 0.06, r + 0.02, z + 0.03, '#c8b090', 'peg')
        k.box(x + w - 0.06, r - 0.02, z - 0.04, x + w - 0.03, r + 0.02, z + 0.03, '#c8b090', 'peg')
        x += w + k.rng.uniform(0.06, 0.16)
        i += 1
    k.solid_post(x0, r)
    k.solid_post(x1, r)


def wheelbarrow(k, cx, cr, load='#7a5634', yaw_left=True):
    """A wooden barrow, its wheel forward, handles back, a load heaped in it."""
    s = -1 if yaw_left else 1
    k.box(cx - 0.32, cr - 0.2, 0.22, cx + 0.32, cr + 0.2, 0.42, (WOOD, 0.16), 'barrow')
    k.box(cx - 0.28, cr - 0.16, 0.38, cx + 0.28, cr + 0.16, 0.43, shade(WOOD, 0.6), 'barrow')
    k.blob(cx, cr, 0.44, 0.26, 0.15, 0.08, (load, 0.3), 'barrow_load', segs=8)
    k.cyl_y(cx - s * 0.42, cr - 0.04, cr + 0.04, 0.16, 0.16, 0.16, WOOD_DD, 'barrow_wheel', verts=12)
    for dr in (-0.14, 0.14):
        k.tube((cx - s * 0.3, cr + dr, 0.3), (cx + s * 0.62, cr + dr * 1.3, 0.3), 0.025, WOOD_D, 'barrow_handle', verts=5)
        k.tube((cx + s * 0.25, cr + dr, 0.24), (cx + s * 0.25, cr + dr, 0.0), 0.022, WOOD_D, 'barrow_leg', verts=4)


def churns(k, cx, cr, n=3):
    """Milk churns: tapered steel cans with a lid and handles."""
    for i in range(n):
        x, r = cx + i * 0.3 + k.rng.uniform(-0.03, 0.03), cr + (0.12 if i % 2 else 0.0)
        k.cyl(x, r, 0.0, 0.34, 0.13, ('#a8acb0', 0.08), 'churn', verts=12)
        k.cone(x, r, 0.34, 0.45, 0.13, 0.07, ('#b4b8bc', 0.08), 'churn', verts=12)
        k.cyl(x, r, 0.45, 0.53, 0.085, ('#8a8e94', 0.08), 'churn_lid', verts=12)
        k.cyl(x, r, 0.06, 0.09, 0.135, '#7a7e84', 'churn_band', verts=12)


def trough(k, x0, x1, cr, wood=False):
    """A stone (or plank) water trough on its feet, water in it."""
    tone = WOOD if wood else '#9a9282'
    k.box(x0, cr - 0.2, 0.06, x1, cr + 0.2, 0.36, (tone, 0.16), 'trough', bevel=0.02)
    k.box(x0 + 0.06, cr - 0.14, 0.26, x1 - 0.06, cr + 0.14, 0.32, ('#2a4a5a', 0.1), 'trough_water', emit=('#3a6a8a', 0.08))
    for x in (x0 + 0.1, x1 - 0.2):
        k.box(x, cr - 0.16, 0.0, x + 0.1, cr + 0.16, 0.08, '#7a746a', 'trough_foot')


def field_gate(k, xa, xb, r, open_to=None, h=0.72, leaf=None):
    """A five-bar field gate between two stout posts; `open_to` swings it back along a row (angle in degrees), `leaf`
    its length (default: the gap)."""
    for x in (xa, xb):
        k.box(x - 0.07, r - 0.07, 0.0, x + 0.07, r + 0.07, h + 0.12, (shade(WOOD, 0.85), 0.2), 'gate_post')
        k.box(x - 0.08, r - 0.08, h + 0.1, x + 0.08, r + 0.08, h + 0.15, shade(WOOD, 0.62), 'gate_cap')
    L = leaf or (xb - xa) - 0.14
    ang = math.radians(open_to or 0.0)
    ox, orr = math.cos(ang), math.sin(ang)
    hx = xa + 0.07
    p = lambda t: (hx + ox * L * t, r + orr * L * t)
    for z in [0.12 + i * (h - 0.12) / 4 for i in range(5)]:
        a, b = p(0.0), p(1.0)
        k.bar(a[0], a[1], b[0], b[1], z - 0.025, z + 0.025, 0.035, ('#b89a6a', 0.15), 'gate')
    for t in (0.0, 1.0):
        a = p(t)
        k.box(a[0] - 0.03, a[1] - 0.03, 0.06, a[0] + 0.03, a[1] + 0.03, h + 0.02, ('#b89a6a', 0.15), 'gate')
    a, b = p(0.04), p(0.96)
    k.tube((a[0], a[1], 0.14), (b[0], b[1], h - 0.04), 0.02, '#a88a5a', 'gate', verts=4)


def ladder(k, x, r, top_z, lean=0.45, w=0.34):
    """A wooden ladder leaning back (toward -row) against something."""
    for s in (-1, 1):
        k.tube((x + s * w / 2, r, 0.0), (x + s * w / 2 * 0.9, r - lean, top_z), 0.022, WOOD, 'ladder', verts=5)
    n = int(top_z / 0.26)
    for i in range(1, n):
        t = i / n
        k.tube((x - w / 2, r - lean * t, top_z * t), (x + w / 2, r - lean * t, top_z * t), 0.014, WOOD_D, 'ladder', verts=4)


def basket(k, cx, cr, fruit='#d02a2a', n=7):
    """A wicker basket heaped with fruit."""
    k.cyl(cx, cr, 0.0, 0.22, 0.2, ('#b08850', 0.3), 'basket', verts=12)
    for z in (0.06, 0.13, 0.2):
        k.cyl(cx, cr, z, z + 0.02, 0.205, '#8a6a3a', 'basket_weave', verts=12)
    for i in range(n):
        a = i / n * math.tau
        k.sphere(cx + math.cos(a) * 0.1, cr + math.sin(a) * 0.08, 0.25 + (0.05 if i % 3 == 0 else 0), 0.065, 0.065, fruit, 'apple', segs=6)
    k.tube((cx - 0.17, cr, 0.22), (cx, cr, 0.42), 0.012, '#8a6a3a', 'basket_handle', verts=4)
    k.tube((cx, cr, 0.42), (cx + 0.17, cr, 0.22), 0.012, '#8a6a3a', 'basket_handle', verts=4)


def fallen_apples(k, cx, cr, n=6, rad=0.7):
    for _ in range(n):
        a, d = k.rng.uniform(0, math.tau), rad * math.sqrt(k.rng.random())
        k.sphere(cx + math.cos(a) * d, cr + math.sin(a) * d * 0.8, 0.05, 0.055, 0.05,
                 k.rng.choice(('#c82a2a', '#d84a2a', '#b83020', '#a8b030')), 'apple', segs=6)


def ducks(k, pts, water_z=0.0):
    """Ducks on the water (mallards and a white one): a body, a head on a neck, a tail."""
    for i, (x, r, yaw) in enumerate(pts):
        white = i % 3 == 2
        body = '#f0ece0' if white else '#8a6a4a'
        c, s = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        k.blob(x, r, water_z + 0.07, 0.17, 0.1, 0.08, (body, 0.2), 'duck', rot=(0, 0, yaw), segs=10)
        k.blob(x - c * 0.14, r + s * 0.06, water_z + 0.1, 0.06, 0.05, 0.04, (shade(body, 0.8), 0.2), 'duck', rot=(0, 0, yaw), segs=6)
        hx, hr = x + c * 0.13, r - s * 0.08
        k.sphere(hx, hr, water_z + 0.2, 0.065, 0.06, ('#f0ece0' if white else '#2a6a3a', 0.15), 'duck_head', segs=8)
        k.cone(hx + c * 0.06, hr - s * 0.04, water_z + 0.19, water_z + 0.19, 0.025, 0.0, '#e8a030', 'duck_bill', verts=5)
        k.box(hx + c * 0.04, hr + 0.02, water_z + 0.18, hx + c * 0.1, hr + 0.06, water_z + 0.2, '#e8a030', 'duck_bill')
        if not white:
            k.cyl(hx - c * 0.03, hr + s * 0.02, water_z + 0.13, water_z + 0.15, 0.05, '#f0ece0', 'duck_collar', verts=8)


def chopping_block(k, cx, cr):
    k.cyl(cx, cr, 0.0, 0.32, 0.2, ('#8a6438', 0.2), 'stump', verts=12)
    k.cyl(cx, cr, 0.32, 0.34, 0.18, '#c89a68', 'stump_top', verts=12)
    k.tube((cx - 0.1, cr, 0.34), (cx + 0.25, cr + 0.15, 0.62), 0.025, '#7a5a34', 'axe', verts=6)
    k.box(cx - 0.17, cr - 0.04, 0.3, cx - 0.02, cr + 0.04, 0.42, '#7a7e86', 'axe_head')
    for i in range(4):                                                    # split logs about
        a = k.rng.uniform(0, math.tau)
        k.cyl_x(cx + math.cos(a) * 0.38 - 0.13, cx + math.cos(a) * 0.38 + 0.13, cr + math.sin(a) * 0.3, 0.06, 0.06, 0.05,
                ('#a07848', 0.2), 'log', verts=6)


def water_butt(k, cx, cr):
    barrel(k, cx, cr, h=0.62, radius=0.24, tone='#6a5034')
    k.cyl(cx, cr, 0.6, 0.63, 0.2, ('#2a4a5a', 0.1), 'butt_water', verts=12)


def pots(k, cx, cr, n=5):
    """Terracotta pots, stacked and standing, a seedling in some."""
    for i in range(n):
        x, r = cx + (i % 3) * 0.2, cr + (i // 3) * 0.18
        k.cone(x, r, 0.0, 0.18, 0.07, 0.09, ('#b8603a', 0.25), 'pot', verts=10)
        if i % 2 == 0:
            k.cone(x, r, 0.17, 0.32, 0.07, 0.01, '#4a9a3a', 'seedling', verts=5)


def hay_cart(k, cx, cr, hay=True):
    """A farm wagon, its shafts down, heaped with hay."""
    k.box(cx - 0.85, cr - 0.42, 0.42, cx + 0.85, cr + 0.42, 0.52, (WOOD, 0.15), 'wagon_bed')
    for s in (-1, 1):
        k.box(cx - 0.85, cr + s * 0.42 - 0.03, 0.52, cx + 0.85, cr + s * 0.42 + 0.03, 0.78, (WOOD_D, 0.15), 'wagon_side')
        for x in (cx - 0.55, cx + 0.55):
            k.cyl_y(x, cr + s * 0.47 - 0.04, cr + s * 0.47 + 0.04, 0.34, 0.34, 0.34, WOOD_DD, 'wagon_wheel', verts=16)
            k.cyl_y(x, cr + s * 0.47 - 0.05, cr + s * 0.47 + 0.05, 0.34, 0.07, 0.07, IRON, 'wagon_hub', verts=8)
            for j in range(4):                                             # spokes on the near wheels
                a = j * math.pi / 4
                k.tube((x - math.cos(a) * 0.28, cr + s * 0.52, 0.34 - math.sin(a) * 0.28),
                       (x + math.cos(a) * 0.28, cr + s * 0.52, 0.34 + math.sin(a) * 0.28), 0.018, WOOD_D, 'wagon_spoke', verts=4)
    for dr in (-0.25, 0.25):
        k.tube((cx - 0.85, cr + dr, 0.45), (cx - 1.9, cr + dr * 0.6, 0.06), 0.03, WOOD_D, 'wagon_shaft', verts=5)
    if hay:
        k.blob(cx, cr, 0.82, 0.88, 0.5, 0.36, ('#d8b858', 0.35), 'hay', segs=14)
        for _ in range(16):
            k.blob(cx + k.rng.uniform(-0.8, 0.8), cr + k.rng.uniform(-0.4, 0.45), k.rng.uniform(0.85, 1.1), 0.14, 0.1, 0.06,
                   (shade('#d8b858', k.rng.uniform(0.85, 1.12)), 0.35), 'hay', segs=6)
    k.solid(cx - 1.0, cr - 0.45, cx + 0.9, cr + 0.45)


def bee_bench(k, x0, x1, cr):
    """A low plank bench the skeps stand on (they go on it at z 0.3), a little thatched hood behind."""
    k.box(x0, cr - 0.24, 0.24, x1, cr + 0.24, 0.3, (WOOD, 0.16), 'bee_bench')
    for x in (x0 + 0.08, x1 - 0.16):
        for s in (-1, 1):
            k.box(x, cr + s * 0.17 - 0.04, 0.0, x + 0.08, cr + s * 0.17 + 0.04, 0.24, WOOD_D, 'bee_bench_leg')


def skep(k, cx, cr, z=0.3):
    """A straw skep: coils of straw, a dark doorway at the foot (on a bench at z)."""
    for i in range(6):
        r0 = 0.25 - i * 0.034
        k.cyl(cx, cr, z + i * 0.1, z + i * 0.1 + 0.1, r0, (shade('#d8a848', 1.0 - (i % 2) * 0.08), 0.3), 'skep', verts=14)
    k.sphere(cx, cr, z + 0.6, 0.07, 0.05, ('#c89838', 0.3), 'skep', segs=8)
    k.box(cx - 0.06, cr + 0.21, z + 0.02, cx + 0.06, cr + 0.25, z + 0.09, '#2a1a10', 'hive_door')


def stepping_stones(k, pts, tone='#a89c88'):
    for (x, r) in pts:
        s = k.rng.uniform(0.18, 0.24)
        k.cyl(x, r, -0.02, 0.03, s, (shade(tone, k.rng.uniform(0.86, 1.08)), 0.14), 'path_stone', verts=9, ry=s * 0.8)


def crow(k, x, r, z, yaw=0):
    k.blob(x, r, z + 0.07, 0.09, 0.06, 0.06, ('#1e1e24', 0.15), 'crow', rot=(0, 0, yaw), segs=8)
    k.sphere(x + 0.08, r, z + 0.13, 0.045, 0.045, ('#1e1e24', 0.15), 'crow', segs=6)
    k.box(x + 0.11, r - 0.01, z + 0.11, x + 0.16, r + 0.01, z + 0.13, '#3a3a3a', 'crow_beak')
    k.box(x - 0.16, r - 0.03, z + 0.06, x - 0.06, r + 0.03, z + 0.09, '#1e1e24', 'crow')


# ---- speed --------------------------------------------------------------------------------------------------------------
def fast_top(k):
    """Kit.top, answered from one BVH of everything placed so far (built at the first question, like Kit.top's own
    depsgraph): a scene of many thousand parts asked tens of thousands of times by the meadow took half an hour casting
    into the whole scene each time. Same answers for what was there at the first question; what's added after (the
    meadow's own tufts) isn't seen, so the grass grows round it instead of skipping it. Variants are left out (the
    grass grows under a parked shuttle). k._dg stays set for whatever casts into the scene itself."""
    import bpy
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    from scenekit import S
    st = {}

    def build():
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        k._dg = dg
        k._names = {p['obj'].name: p.get('pname') for p in k.parts}
        verts, polys, owner = [], [], []
        for p in k.parts:
            if p.get('var') is not None:
                continue
            o = p['obj']
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            M = o.matrix_world
            base = len(verts)
            verts.extend(M @ v.co for v in me.vertices)
            for poly in me.polygons:
                polys.append([base + i for i in poly.vertices])
                owner.append(p.get('pname'))
            ev.to_mesh_clear()
        st['bvh'] = BVHTree.FromPolygons(verts, polys)
        st['owner'] = owner

    def top(x, r):
        if 'bvh' not in st:
            build()
        loc, _n, idx, _d = st['bvh'].ray_cast(Vector((x, -r * S, 30.0)), Vector((0, 0, -1)))
        if loc is None:
            return None, None
        return st['owner'][idx], loc.z
    k.top = top
