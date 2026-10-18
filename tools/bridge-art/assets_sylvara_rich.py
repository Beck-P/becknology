"""Elderglade rebuilt to Look Book 2 (October 2026): the builders behind scenes/sylvara.py, after the reference
diorama dioramas/sylvara_brook.py (Elderglade Brook) — land as a heightfield (moss, leaf litter, dirt paths, a brook
sunk between real banks), ancient trunks lofted from a buttressed foot with bark ridges, roots diving into the moss,
ivy and moss up the near side, great crowns of leaf clumps, arching ferns, mossy boulders, fallen logs with bracket
fungi, mushrooms (red by day, glowing by night), pebbles, leaf litter and twigs, reeds and lilies at the water.

Everything stands on the land: call `use(land)` with the scene's Land first (its `.z(x, r)`), then build.
Tile units: x = column, r = row (toward the camera), z = height.
"""
import math

import bmesh
import numpy as np
import bpy

from scenekit import S as SK, shade
import assets_elves as E
import assets_town as W

BARK, BARK_D, BARK_L = '#5e4430', '#3a281c', '#7a5a3e'
MOSS, MOSS_D, MOSS_L = '#4f7a34', '#365a28', '#76a048'
LEAF = '#3f6e30'
STONE = '#7e7c6c'
SPORE = '#86f2d6'
GOLD = E.GOLD
GLOW = E.GLOW
MOON = E.MOON

_L = None


def use(land):
    global _L
    _L = land


def gz(x, r):
    return _L.z(x, r) if _L else 0.0


# ---- maths ------------------------------------------------------------------------------------------------------------
def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def noise(x, r, f, seed):
    """Cheap smooth value noise in [0, 1]."""
    def h(i, j):
        v = math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453
        return v - math.floor(v)
    x, r = x * f, r * f
    i, j = math.floor(x), math.floor(r)
    u, v = x - i, r - j
    u, v = u * u * (3 - 2 * u), v * v * (3 - 2 * v)
    a, b, c, d = h(i, j), h(i + 1, j), h(i, j + 1), h(i + 1, j + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def fbm(x, r, f, seed, octaves=3):
    """Noise in [0, 1] without the grid showing: octaves of value noise, each turned and shifted (plain value noise
    thresholded draws boxes)."""
    tot, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        a = 0.6 + o * 1.1 + seed * 0.37
        ca, sa = math.cos(a), math.sin(a)
        u, v = x * ca - r * sa + o * 17.3, x * sa + r * ca - o * 9.1
        tot += amp * noise(u, v, f * (2.03 ** o), seed + o * 13)
        norm += amp
        amp *= 0.5
    return tot / norm


def seg_dist(x, r, a, b):
    ax, ar = a
    bx, br = b
    dx, dr = bx - ax, br - ar
    L2 = dx * dx + dr * dr or 1e-9
    t = max(0.0, min(1.0, ((x - ax) * dx + (r - ar) * dr) / L2))
    return math.hypot(x - (ax + dx * t), r - (ar + dr * t))


def line_dist(x, r, pts):
    return min(seg_dist(x, r, a, b) for a, b in zip(pts, pts[1:]))


def spline(pts, per=6):
    """Catmull-Rom through the points: a smooth, winding line."""
    out = []
    P = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(per):
            t = j / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2
                                    + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3) for c in (0, 1)))
    out.append(tuple(pts[-1]))
    return out


def along(pts, step):
    """Points every `step` along a polyline, with the direction there: (x, r, dx, dr)."""
    out, acc = [], 0.0
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-6:
            continue
        while acc < L:
            t = acc / L
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / L, (b[1] - a[1]) / L))
            acc += step
        acc -= L
    return out


# ---- the land -----------------------------------------------------------------------------------------------------------
def field(k, x0, r0, x1, r1, step, keyfn, zfn, albedo, prefix='ground'):
    """A height-field surface: quads of `step` tiles, one mesh per part — keyfn(x, r) names the part there (None: no
    surface), zfn(x, r, part) its height, albedo[part] its colour."""
    nx, nr = int(round((x1 - x0) / step)), int(round((r1 - r0) / step))
    groups = {}
    for j in range(nr):
        for i in range(nx):
            key = keyfn(x0 + (i + 0.5) * step, r0 + (j + 0.5) * step)
            if key is not None:
                groups.setdefault(key, []).append((i, j))
    for key, cells in groups.items():
        bm = bmesh.new()
        vm = {}

        def v(i, j):
            if (i, j) not in vm:
                x, r = x0 + i * step, r0 + j * step
                vm[(i, j)] = bm.verts.new((x, -r * SK, zfn(x, r, key)))
            return vm[(i, j)]
        for (i, j) in cells:
            bm.faces.new((v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)))
        for f in bm.faces:
            if f.normal.z < 0:
                f.normal_flip()
        me = bpy.data.meshes.new(prefix)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(prefix, me)
        k.scene.collection.objects.link(o)
        for p in o.data.polygons:
            p.use_smooth = True
        k._finish(o, albedo[key], key)


# ---- the old trees ------------------------------------------------------------------------------------------------------
def ancient_trunk(k, cx, cr, rad, h, seed, buttress=0.32, door=None, ivy=3, roots=11, moss=9, squash=0.92):
    """A gnarled trunk: rings lofted up from a buttressed foot, the bark in vertical ridges, roots flaring over the
    ground and diving into the moss, moss patches and ivy climbing the side toward you. `door`: an angle (pi/2 faces
    you) where the trunk stays smooth and true to `rad`, for a door."""
    rng = k.rng
    n = 32
    lobes = [(rng.uniform(0, math.tau), rng.uniform(0.08, 0.18)) for _ in range(5)]
    base = gz(cx, cr)
    rings = []
    for z in (-0.3, 0.1, 0.35, 0.7, 1.2, 2.0, 3.0, 4.2, 5.5, h):
        f = 1 + buttress * math.exp(-z * 1.8)                                 # the buttressed foot
        ring = []
        for i in range(n):
            a = i / n * math.tau
            bump = sum(amp * math.cos(3 * (a - ph)) for ph, amp in lobes) * (0.5 + 0.5 * math.exp(-z * 0.6))
            rr = rad * f * (1 + bump + 0.05 * (noise(a * 2, z, 1.3, seed) - 0.5)) * (1 - 0.05 * z / h)
            if door is not None:                                              # smooth where the door goes
                d = math.atan2(math.sin(a - door), math.cos(a - door))
                w = math.exp(-(d / 0.55) ** 2) * (1.0 if z < 2.6 else math.exp(-(z - 2.6)))
                rr = rr * (1 - w) + rad * (1 - 0.05 * z / h) * w
            ring.append((cx + math.cos(a) * rr, cr + math.sin(a) * rr * squash, base + z))
        rings.append(ring)
    top = rings[-1]                                                           # closed at the top (up in the crown)
    rings.append([(cx + (x - cx) * 0.3, cr + (r - cr) * 0.3, base + h + 0.6) for (x, r, _z) in top])
    k.loft(rings, (BARK, 0.38), 'giant_trunk', closed=True)
    nr = int(16 + 12 * rad)                                                  # ridges and furrows in the bark, hugging the trunk
    for i in range(nr):
        f = (i + rng.uniform(-0.3, 0.3)) / nr * n
        a = f / n * math.tau
        if math.sin(a) < -0.3:
            continue
        if door is not None and abs(math.atan2(math.sin(a - door), math.cos(a - door))) < 0.45:
            continue
        i0, t = int(f) % n, f - int(f)
        z0i, z1i = rng.choice((1, 1, 2)), len(rings) - rng.choice((1, 2, 3))
        pts = []
        for ring in rings[z0i:z1i]:
            p0, p1 = ring[i0], ring[(i0 + 1) % n]
            x, r, z = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2]
            pts.append((x + math.cos(a) * 0.02, r + math.sin(a) * 0.02, z))
        tone = shade(BARK, rng.choice((0.66, 0.74, 1.14, 1.24)))
        w = rng.uniform(0.04, 0.08) * (rad / 1.4) ** 0.3
        for pa, pb in zip(pts, pts[1:]):
            k.tube(pa, pb, w, (tone, 0.3), 'bark_ridge', verts=5, smooth=False)
    for i in range(roots):                                                    # roots: thick at the trunk, thinning into the moss
        a = (i + 0.5) / roots * math.tau + rng.uniform(-0.18, 0.18)
        if door is not None and abs(math.atan2(math.sin(a - door), math.cos(a - door))) < 0.5:
            continue
        L = rad * (1 + buttress * 0.6) + rng.uniform(0.5, 1.2)
        start = (cx + math.cos(a) * rad * 0.85, cr + math.sin(a) * rad * 0.78, base + 0.7)
        mx, mr = cx + math.cos(a) * (rad + L) * 0.55, cr + math.sin(a) * (rad + L) * 0.5
        mid = (mx, mr, gz(mx, mr) + 0.22)
        ex, er = cx + math.cos(a) * L, cr + math.sin(a) * L * 0.92
        end = (ex, er, gz(ex, er) - 0.06)
        w = rng.uniform(0.17, 0.26) * (rad / 1.4) ** 0.4
        k.tube(start, mid, w, (shade(BARK, 0.92), 0.32), 'root', rb=w * 0.68, verts=9)
        k.tube(mid, end, w * 0.68, (shade(BARK, 0.86), 0.32), 'root', rb=0.04, verts=8)
        if math.sin(a) > -0.3 and rng.random() < 0.8:                         # moss along the roots you can see
            k.blob(mid[0], mid[1], mid[2] + w * 0.6, w * 1.2, w * 0.8, w * 0.32, (shade(MOSS, rng.uniform(0.9, 1.15)), 0.4), 'root_moss', segs=8)
    for i in range(moss):                                                     # moss patches up the near side
        a = rng.uniform(math.pi * 0.15, math.pi * 0.85)
        if door is not None and abs(math.atan2(math.sin(a - door), math.cos(a - door))) < 0.5:
            continue
        z = rng.uniform(0.3, h * 0.5)
        k.blob(cx + math.cos(a) * rad * 1.04, cr + math.sin(a) * rad * 0.96, base + z, rng.uniform(0.18, 0.34), 0.1, rng.uniform(0.2, 0.5),
               (shade(MOSS, rng.uniform(0.85, 1.15)), 0.4), 'trunk_moss', segs=8)
    for i in range(rng.randint(1, 3)):                                        # bracket fungi
        a = rng.uniform(math.pi * 0.2, math.pi * 0.8)
        if door is not None and abs(math.atan2(math.sin(a - door), math.cos(a - door))) < 0.6:
            continue
        z = rng.uniform(0.6, 2.4)
        for j in range(rng.randint(2, 4)):
            x, r = cx + math.cos(a) * rad * 1.05 + rng.uniform(-0.12, 0.12), cr + math.sin(a) * rad * 0.98
            k.cyl(x, r + 0.05, base + z + j * 0.13, base + z + j * 0.13 + 0.04, 0.12 - j * 0.02, ('#d8b880', 0.25), 'fungus', verts=10, ry=0.07)
    for s in range(ivy):                                                      # ivy strands climbing
        a = rng.uniform(math.pi * 0.22, math.pi * 0.78)
        if door is not None and abs(math.atan2(math.sin(a - door), math.cos(a - door))) < 0.6:
            continue
        with k.foliage('leaf'):
            for j in range(18):
                z = 0.2 + j * 0.24
                aa = a + 0.12 * math.sin(j * 0.9 + s)
                x, r = cx + math.cos(aa) * rad * 1.06, cr + math.sin(aa) * rad * 0.98
                k.blob(x + rng.uniform(-0.06, 0.06), r + 0.03, base + z, 0.09, 0.05, 0.08, (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25),
                       'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)


def crown(k, cx, cr, z, spread, dense=1.0, tone=LEAF):
    """A great crown of leaves: clumpy lobes, branches reaching into them, leaves hanging off the edge."""
    rng = k.rng
    lobes = [(0, -0.2, 0.0, 1.0), (-1.05, 0.0, -0.3, 0.8), (1.1, -0.05, -0.25, 0.82), (0.35, 0.35, -0.45, 0.66),
             (-0.5, -0.8, 0.3, 0.8), (0.75, -0.75, 0.25, 0.74), (-1.5, 0.45, -0.7, 0.58), (1.55, 0.4, -0.75, 0.56)]
    with k.foliage('leaf'):
        for (dx, dr, dz, s) in lobes:
            rx = 1.55 * spread * s
            W.leafy_crown(k, cx + dx * 1.7 * spread, cr + dr * 1.5 * spread, z + dz, rx, rx * 0.85, rx * 0.62,
                          shade(tone, rng.uniform(0.86, 1.08)), n=max(36, int(rx * rx * 30 * dense)), part='canopy')
        for _ in range(int(12 * spread * dense)):                             # hanging leaves at the crown's foot
            a = rng.uniform(0, math.tau)
            x, r = cx + math.cos(a) * 2.6 * spread, cr + math.sin(a) * 2.1 * spread
            W.leafy_crown(k, x, r, z - 1.0 + rng.uniform(-0.3, 0.2), 0.42, 0.36, 0.48, shade('#4e8238', rng.uniform(0.85, 1.05)),
                          n=22, part='canopy', sprigs=False)


def branches(k, cx, cr, rad, h, spread):
    rng = k.rng
    base = gz(cx, cr)
    for i in range(6):
        a = rng.uniform(0, math.tau)
        top = (cx + math.cos(a) * 1.9 * spread, cr + math.sin(a) * 1.5 * spread, base + h - 0.2)
        k.tube((cx + math.cos(a) * rad * 0.5, cr + math.sin(a) * rad * 0.5, base + h - 2.0), top, 0.24, (shade(BARK, 0.9), 0.3), 'branch', rb=0.07, verts=8)


def giant(k, cx, cr, rad, h, seed, door=None, dense=1.0, crown_tone=LEAF, **kw):
    ancient_trunk(k, cx, cr, rad, h + 0.4, seed, door=door, **kw)
    spread = 1.0 + rad * 0.14
    branches(k, cx, cr, rad, h, spread)
    crown(k, cx, cr, gz(cx, cr) + h, spread, dense=dense, tone=crown_tone)


def birch(k, cx, cr, h=3.2):
    """A silver birch: a pale, slightly leaning trunk with dark marks, a twig or two, an airy crown in a few lobes."""
    rng = k.rng
    z0 = gz(cx, cr)
    lean = rng.uniform(-0.15, 0.15)
    k.tube((cx, cr, z0 - 0.05), (cx + lean, cr, z0 + h * 0.78), 0.085, ('#e4e0d4', 0.2), 'birch', rb=0.045, verts=9)
    for i in range(9):
        t = rng.uniform(0.05, 0.7)
        z = z0 + h * 0.78 * t
        x = cx + lean * t
        w = rng.uniform(0.03, 0.06)
        k.box(x - w, cr + 0.055, z, x + w * rng.uniform(0.3, 1.0), cr + 0.09, z + rng.uniform(0.025, 0.05), '#2a2622', 'birch_mark')
    for (dz, a) in ((0.5, -1), (0.62, 1)):
        k.tube((cx + lean * dz, cr, z0 + h * dz), (cx + lean * dz + a * 0.35, cr, z0 + h * (dz + 0.12)), 0.025, ('#d8d2c4', 0.2), 'birch', verts=5)
    with k.foliage('leaf'):
        for (dx, dr, dz, s) in ((0, 0, 0.86, 0.55), (-0.38, 0.05, 0.72, 0.4), (0.42, -0.05, 0.75, 0.42), (0.1, 0.1, 1.0, 0.36),
                                (-0.15, -0.15, 0.95, 0.32)):
            W.leafy_crown(k, cx + lean + dx, cr + dr, z0 + h * dz, s, s * 0.8, s * 0.85, shade('#7aa048', rng.uniform(0.88, 1.1)), part='birch_leaves')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def sapling(k, cx, cr, h=1.3, tone='#4a7e36'):
    """A young tree of the wood: a thin stem and a small crown."""
    z0 = gz(cx, cr)
    k.tube((cx, cr, z0), (cx + k.rng.uniform(-0.06, 0.06), cr, z0 + h * 0.7), 0.035, (BARK_L, 0.3), 'sapling_stem', rb=0.02, verts=6)
    with k.foliage('leaf'):
        W.leafy_crown(k, cx, cr, z0 + h * 0.78, 0.34, 0.3, 0.36, shade(tone, k.rng.uniform(0.9, 1.1)), part='sapling_leaves')


# ---- the small things of the wood ---------------------------------------------------------------------------------------
def fern(k, cx, cr, s=0.5, fronds=8, tone='#4a8a3a'):
    """A fern: arching fronds, each a stem with leaflets either side, as one mesh."""
    rng = k.rng
    z0 = gz(cx, cr)
    quads = []
    for i in range(fronds):
        a = i / fronds * math.tau + rng.uniform(-0.25, 0.25)
        L = s * rng.uniform(0.75, 1.1)
        rise = s * rng.uniform(0.45, 0.65)
        prev = None
        for j in range(9):
            t = j / 8
            x = cx + math.cos(a) * L * t
            r = cr + math.sin(a) * L * t * 0.85
            zz = z0 + 0.02 + rise * math.sin(t * math.pi * 0.85) * (1 - 0.3 * t)
            if prev:
                leaf = s * 0.16 * (1 - t * 0.7)
                nx, nr = -math.sin(a), math.cos(a) * 0.85
                for side in (-1, 1):
                    tip = (x + nx * leaf * side + math.cos(a) * leaf * 0.4, r + nr * leaf * side, zz - leaf * 0.35)
                    quads.append((prev, (x, r, zz), tip, ((prev[0] + tip[0]) / 2, (prev[1] + tip[1]) / 2, (prev[2] + tip[2]) / 2)))
            prev = (x, r, zz)
    with k.foliage('leaf'):
        k.quads(quads, (shade(tone, rng.uniform(0.85, 1.1)), 0.25), 'fern')


def glow_spores(k, cx, cr, n=6, spread=0.35, col=SPORE):
    rng = k.rng
    for _ in range(n):
        x, r = cx + rng.uniform(-spread, spread), cr + rng.uniform(-spread, spread) * 0.8
        z = gz(x, r) + rng.uniform(0.02, 0.12)
        k.sphere(x, r, z, 0.03, 0.03, col, 'spore', emit=(col, 1.3), segs=6)


def mushroom_ring(k, cx, cr, n=4, glow=False, col=SPORE, cap='#b8402e', light=3.0):
    rng = k.rng
    for _ in range(n):
        x, r = cx + rng.uniform(-0.22, 0.22), cr + rng.uniform(-0.16, 0.16)
        z0 = gz(x, r)
        h = rng.uniform(0.08, 0.2)
        k.cyl(x, r, z0, z0 + h, 0.024, '#ece2d0', 'mushroom_stem', verts=7)
        rad = rng.uniform(0.055, 0.09)
        if glow:
            k.sphere(x, r, z0 + h, rad, rad * 0.55, col, 'mushroom_cap', emit=(col, 1.5), segs=10)
        else:
            k.sphere(x, r, z0 + h, rad, rad * 0.6, (cap, 0.25), 'mushroom_cap', segs=10)
            for d in range(3):                                                # white spots
                aa = rng.uniform(0, math.tau)
                k.sphere(x + math.cos(aa) * rad * 0.5, r + math.sin(aa) * rad * 0.4, z0 + h + rad * 0.42, 0.014, 0.008, '#f4ece0', 'mushroom_spot', segs=5)
    if glow and light:
        k.point_light(cx, cr + 0.1, gz(cx, cr) + 0.3, col, light, radius=0.1)


def boulder(k, cx, cr, s=0.5, moss=True, solid=True):
    rng = k.rng
    z0 = gz(cx, cr)
    k.rock(cx, cr, z0 + s * 0.15, s, s * 0.8, s * 0.62, (STONE, 0.35), part='rock', segs=10)
    k.rock(cx + s * 0.55, cr + s * 0.3, z0 + s * 0.05, s * 0.4, s * 0.34, s * 0.3, (shade(STONE, 0.9), 0.35), part='rock', segs=8)
    if moss:
        k.blob(cx - s * 0.1, cr - s * 0.1, z0 + s * 0.7, s * 0.75, s * 0.55, s * 0.18, (MOSS_L, 0.4), 'rock_moss', segs=10)
        for _ in range(3):
            k.blob(cx + rng.uniform(-s, s) * 0.6, cr + s * 0.3, z0 + s * rng.uniform(0.35, 0.6), s * 0.25, s * 0.15, s * 0.12,
                   (shade(MOSS, 1.1), 0.4), 'rock_moss', segs=7)
    if solid:
        k.solid(cx - s * 0.8, cr - s * 0.6, cx + s * 0.8, cr + s * 0.6)


def log(k, x0, x1, cr, rad, seed=4, solid=True):
    """A fallen trunk lying across the view (along the columns): lofted, bark ridges, pale cut ends with rings, moss on top, bracket fungi, a
    broken branch stub, mushrooms at its foot."""
    rng = k.rng
    rings = []
    n = 16
    for i in range(12):
        t = i / 11
        x = x0 + (x1 - x0) * t
        rr = rad * (1.06 - 0.16 * t) * (1 + 0.08 * math.sin(t * 9 + seed))
        cz = gz(x, cr) + rr * 0.8
        ring = []
        for j in range(n):
            a = j / n * math.tau
            bump = 1 + 0.07 * math.cos(5 * a + seed) + 0.04 * math.cos(9 * a)
            ring.append((x, cr + math.cos(a) * rr * bump * 0.95, cz + math.sin(a) * rr * bump))
        rings.append(ring)
    k.loft(rings, (BARK, 0.36), 'log', closed=True)
    for end, rr in ((rings[0], rad * 1.06), (rings[-1], rad * 0.9)):
        x = end[0][0]
        cz = gz(x, cr) + rr * 0.8
        k.cyl_x(x - 0.012, x + 0.012, cr, cz, rr * 0.92, rr * 0.92, ('#c09a6c', 0.3), 'log_end', verts=16)
        k.cyl_x(x - 0.016, x + 0.016, cr, cz, rr * 0.45, rr * 0.45, ('#9a7448', 0.3), 'log_end', verts=12)
    zm = gz((x0 + x1) / 2, cr) + rad * 0.8
    for i in range(9):
        a = rng.uniform(0.2, math.pi - 0.2)
        z = zm + math.sin(a) * rad
        k.tube((x0 + 0.15, cr + math.cos(a) * rad * 0.95, z), (x1 - 0.15, cr + math.cos(a) * rad * 0.85, z - 0.03), 0.025,
               (shade(BARK, rng.choice((0.75, 1.2))), 0.3), 'bark_ridge', verts=4, smooth=False)
    bx = x0 + (x1 - x0) * 0.62
    k.tube((bx, cr - 0.1, zm + rad * 0.7), (bx + 0.2, cr - 0.35, zm + rad * 1.4), 0.07, (BARK, 0.3), 'branch', rb=0.04, verts=7)
    for _ in range(int(abs(x1 - x0) * 2)):
        x = rng.uniform(x0 + 0.2, x1 - 0.2)
        k.blob(x, cr - 0.05, gz(x, cr) + rad * 1.75, 0.28, 0.18, 0.07, (shade(MOSS_L, rng.uniform(0.9, 1.1)), 0.4), 'log_moss', segs=8)
    for _ in range(4):
        x = rng.uniform(x0 + 0.3, x1 - 0.3)
        z = gz(x, cr) + rng.uniform(0.15, 0.35)
        k.cyl_y(x, cr + rad * 0.8, cr + rad * 1.2, z, 0.09, 0.03, ('#d8b880', 0.25), 'fungus', verts=10)
    mushroom_ring(k, x1 - 0.2, cr + rad + 0.12, n=4)
    if solid:
        k.solid(min(x0, x1), cr - rad, max(x0, x1), cr + rad)


def pebbles(k, x0, r0, x1, r1, n, ok=lambda x, r: True, tone=STONE):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if not ok(x, r):
            continue
        s = rng.uniform(0.04, 0.1)
        k.rock(x, r, gz(x, r) + s * 0.2, s, s * 0.8, s * 0.5, (shade(tone, rng.uniform(0.8, 1.2)), 0.25), part='pebble', segs=6)


def flowers(k, x0, r0, x1, r1, n, ok=lambda x, r: True, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8')):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if not ok(x, r):
            continue
        col = rng.choice(cols)
        for _ in range(rng.randint(2, 5)):                                    # in little clumps of one kind
            xx, rr = x + rng.uniform(-0.14, 0.14), r + rng.uniform(-0.1, 0.1)
            z0, h = gz(xx, rr), rng.uniform(0.06, 0.18)
            k.cone(xx, rr, z0, z0 + h, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
            k.sphere(xx, rr, z0 + h, 0.035, 0.03, col, 'flower', segs=5)


def leaf_litter(k, x0, r0, x1, r1, n, ok=lambda x, r: True):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if not ok(x, r):
            continue
        col = rng.choice(('#a0682a', '#c08a30', '#7a4a22', '#8a9a3a', '#b05a2a'))
        k.blob(x, r, gz(x, r) + 0.004, 0.06, 0.04, 0.008, (col, 0.25), 'leaf_litter', rot=(0, 0, rng.uniform(0, 360)), segs=5)


def twigs(k, x0, r0, x1, r1, n, ok=lambda x, r: True):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if not ok(x, r):
            continue
        a = rng.uniform(0, math.pi)
        L = rng.uniform(0.25, 0.5)
        z = gz(x, r) + 0.02
        k.tube((x, r, z), (x + math.cos(a) * L, r + math.sin(a) * L * 0.8, z + 0.01), 0.018, ('#5a4030', 0.3), 'twig', rb=0.01, verts=4)


def moss_mounds(k, x0, r0, x1, r1, n, ok=lambda x, r: True):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if not ok(x, r):
            continue
        s_ = rng.uniform(0.14, 0.3)
        k.blob(x, r, gz(x, r) + 0.01, s_, s_ * 0.8, s_ * 0.38, (shade(MOSS_L, rng.uniform(0.85, 1.12)), 0.4), 'moss_mound', segs=9)


def reeds(k, x, r, n=7, spread=0.12):
    rng = k.rng
    for _ in range(n):
        xx, rr = x + rng.uniform(-spread, spread), r + rng.uniform(-spread, spread)
        z0 = gz(xx, rr)
        hh = rng.uniform(0.35, 0.6)
        k.tube((xx, rr, z0), (xx + rng.uniform(-0.05, 0.05), rr, z0 + hh), 0.012, ('#5a7a3a', 0.2), 'reed', rb=0.006, verts=4)
        if rng.random() < 0.4:
            k.cyl(xx, rr, z0 + hh - 0.12, z0 + hh - 0.02, 0.022, ('#6a4a2a', 0.2), 'cattail', verts=6)


def lily(k, x, r, z, s=0.12, flower=None):
    """A lily pad on still water, a notch cut out, now and then a flower."""
    pts = []
    for i in range(11):
        a = 0.35 + i / 10 * (math.tau - 0.7)
        pts.append((x + math.cos(a) * s, r + math.sin(a) * s * 0.85, z))
    k.poly([(x, r, z)] + pts, (shade('#4a8a3a', k.rng.uniform(0.85, 1.1)), 0.3), 'lily_pad')
    if flower:
        k.sphere(x + 0.02, r, z + 0.03, 0.04, 0.03, flower, 'lily_flower', segs=6)


def lantern_post(k, cx, cr, h=1.7, energy=14.0):
    """E.lantern_post on the land: a curved post of pale wood, a leaf lantern from its crook, a stone at its foot."""
    z0 = gz(cx, cr)
    k.tube((cx, cr, z0 - 0.05), (cx, cr, z0 + h), 0.05, ('#c8b48a', 0.2), 'post', verts=8)
    k.tube((cx, cr, z0 + h), (cx + 0.32, cr, z0 + h + 0.12), 0.04, ('#c8b48a', 0.2), 'post', verts=6)
    for (a, zz) in ((0.4, 0.5), (2.6, 0.95)):                                 # carved leaves wound up the post
        k.blob(cx + math.cos(a) * 0.06, cr + math.sin(a) * 0.05, z0 + zz, 0.05, 0.025, 0.09, (GOLD, 0.25), 'post_leaf', rot=(0, 20, 0), segs=6)
    k.cyl(cx + 0.32, cr, z0 + h - 0.25, z0 + h + 0.1, 0.006, (GOLD, 0.25), 'chain', verts=4)
    E.leaf_lantern(k, cx + 0.32, cr, z0 + h - 0.32, energy=energy)
    k.rock(cx, cr + 0.02, z0 + 0.02, 0.1, 0.08, 0.06, (shade(STONE, 0.95), 0.3), part='post_stone', segs=7)
    k.solid_post(cx, cr)


# ---- rendering a wood ----------------------------------------------------------------------------------------------------
def _quant(albedo, step=8):
    """A colour rounded to `step`/255 a channel (so the thousand shades of a crown's clumps fall into a few dozen)."""
    h, rest = (albedo, None) if isinstance(albedo, str) else (albedo[0], albedo[1:])
    if not (isinstance(h, str) and h.startswith('#') and len(h) == 7):
        return albedo
    q = '#' + ''.join('%02x' % min(255, int(round(int(h[i:i + 2], 16) / step) * step)) for i in (1, 3, 5))
    return q if rest is None else (q,) + tuple(rest)


def merge_parts(k):
    """Join the parts that render alike — the same part name, colour, glow, tree and decor slot — into one mesh each, just
    before the render. A wood is tens of thousands of leaf clumps, stones and stems, and Blender spends over a minute
    syncing that many objects on every pass; joined, each pass is quick, and every pass (albedo, id, leaf, depth, light)
    comes out the same. Ground parts keep their own extent (it sets their grain) and parts with modifiers are left be."""
    groups = {}
    for p in k.parts:
        o = p['obj']
        if p['var'] is not None or o.modifiers or (p.get('pname') or '').startswith(k.GROUND) or p['albedo'] == 'HOLDOUT':
            continue
        alb = _quant(p['albedo']) if not p['emit'] else p['albedo']
        key = (p['pname'], repr(alb), repr(p['emit']), p.get('fol'), p.get('tree', 0), p.get('nature'))
        groups.setdefault(key, []).append((p, alb))
    gone, n0 = set(), len(k.parts)
    for key, ps in groups.items():
        if len(ps) < 2:
            continue
        cos, vidx, starts, smooth_ = [], [], [], []
        nv = nl = 0
        ps, alb = [p for p, _a in ps], ps[0][1]
        for p in ps:
            o = p['obj']
            me = o.data
            v, L, P = len(me.vertices), len(me.loops), len(me.polygons)
            co = np.empty(v * 3, dtype=np.float32)
            me.vertices.foreach_get('co', co)
            M = np.array(o.matrix_basis, dtype=np.float64)
            co = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
            vi = np.empty(L, dtype=np.int32)
            me.loops.foreach_get('vertex_index', vi)
            ls = np.empty(P, dtype=np.int32)
            me.polygons.foreach_get('loop_start', ls)
            sm = np.empty(P, dtype=bool)
            me.polygons.foreach_get('use_smooth', sm)
            cos.append(co)
            vidx.append(vi + nv)
            starts.append(ls + nl)
            smooth_.append(sm)
            nv, nl = nv + v, nl + L
        me = bpy.data.meshes.new('merged')
        co = np.concatenate(cos).astype(np.float32).ravel()
        me.vertices.add(len(co) // 3)
        me.vertices.foreach_set('co', co)
        vi = np.concatenate(vidx)
        me.loops.add(len(vi))
        me.loops.foreach_set('vertex_index', vi)
        ls = np.concatenate(starts)
        me.polygons.add(len(ls))
        me.polygons.foreach_set('loop_start', ls)
        me.update(calc_edges=True)
        me.polygons.foreach_set('use_smooth', np.concatenate(smooth_))
        o = bpy.data.objects.new('merged', me)
        k.scene.collection.objects.link(o)
        o.data.materials.append(ps[0]['obj'].data.materials[0])
        keep = dict(ps[0])
        keep['obj'], keep['albedo'] = o, alb
        k.parts.append(keep)
        for p in ps:
            gone.add(id(p))
    olds = [p['obj'] for p in k.parts if id(p) in gone]
    meshes = [ob.data for ob in olds]
    k.parts[:] = [p for p in k.parts if id(p) not in gone]
    bpy.data.batch_remove(olds)
    bpy.data.batch_remove([m for m in meshes if m.users == 0])
    print('merged %d parts into %d' % (n0, len(k.parts)), flush=True)
