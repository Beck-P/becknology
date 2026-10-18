"""Sylvara's places in the house style (workstream F: the city in the trees, the Silverrun, the Deepwood) — scenekit
builders made from the Look Book's Elderglade Brook (dioramas/sylvara_brook.py): land with shape, the old trees with
gnarled trunks and clumpy crowns, ferns and mushrooms and moss, and the wood elves' city — stalls under leaf awnings,
workshops against the trunks, looms, strings of leaf lanterns, basket lifts and stairs up the trunks, platforms, rope
bridges, canoes. assets_elves.py (Elderglade's own kit) is left as it is.

Tile units: x = column, r = row (toward the camera), z = height. Everything that stands on the ground asks the Land
for its height (L.z(x, r)), so the ground can rise round the trees' feet and fall into a river.
"""
import math

import bmesh
import bpy

from scenekit import S as SK, shade
import assets_elves as E
import assets_town as W

BARK, BARK_D, BARK_L = '#5e4430', '#3a281c', '#7a5a3e'
MOSS, MOSS_D, MOSS_L = '#4f7a34', '#365a28', '#76a048'
LEAF = '#3f6e30'
STONE = '#7e7c6c'
GLOW = '#ffcf80'
SPORE = '#86f2d6'
GOLD = '#d0a040'
ELFWOOD, ELFWOOD_D, ELFWOOD_L = '#9a7a52', '#5e4630', '#c8a878'      # the elves' pale carved wood
CLOTH = {'green': '#2a5a2e', 'leaf': '#5a8e40', 'gold': '#d0a040', 'cream': '#e8dcc0', 'violet': '#6a5690', 'russet': '#a04a22',
         'twilight': '#3a5a7a', 'moon': '#a8e0d8', 'rose': '#c87888'}


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def _vn(x, r, seed):
    def h(i, j):
        v = math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453
        return v - math.floor(v)
    i, j = math.floor(x), math.floor(r)
    u, v = x - i, r - j
    u, v = u * u * (3 - 2 * u), v * v * (3 - 2 * v)
    a, b, c, d = h(i, j), h(i + 1, j), h(i, j + 1), h(i + 1, j + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def noise(x, r, f, seed):
    """Cheap smooth value noise in [0, 1]. The lattice is turned by an angle of the seed's own and the domain warped a
    little, so its contours wander instead of running square to the tile grid (plain value noise thresholded came out
    as blocks along the grid)."""
    a = 0.6 + (seed * 0.618) % 1.0 * 0.9                  # 34°..86°: never near the grid's own angles
    ca, sa = math.cos(a), math.sin(a)
    x, r = x * f, r * f
    xr, rr = x * ca - r * sa, x * sa + r * ca
    wx = _vn(xr * 1.7 + 11.3, rr * 1.7, seed + 101) - 0.5
    wr = _vn(xr * 1.7, rr * 1.7 - 7.1, seed + 202) - 0.5
    return _vn(xr + 0.45 * wx, rr + 0.45 * wr, seed)


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


# ---- the land -------------------------------------------------------------------------------------------------------
class Land:
    """The ground as a heightfield. zfn(x, r) → height; matfn(x, r) → a material key (GROUND_ALB) or None (no ground:
    water, a hole). field() lays it as meshes, one per material, named ground_<key> so the finish reads them as ground."""

    ALB = {
        'moss': ('#567a36', 0.3), 'moss_dark': ('#46672e', 0.3), 'litter': ('#6a6838', 0.38), 'path': ('#8a6c46', 0.34),
        'bank': ('#4c3c2c', 0.36), 'bank_stones': ('#5c5446', 0.42), 'bed': ('#4a4a3c', 0.3), 'grass': ('#5a8a3a', 0.3),
        'meadow': ('#6a9a44', 0.3), 'mud': ('#4a3a28', 0.36), 'sand': ('#8a7a5a', 0.34), 'pebble': ('#6a665a', 0.4),
        'flag': ('#7e7c6c', 0.25), 'deep_moss': ('#3a5a2c', 0.3), 'gloom': ('#2e3a2a', 0.36),
    }

    TURF = ('moss', 'moss_dark', 'deep_moss', 'gloom', 'grass', 'meadow')

    def __init__(self, k, zfn, matfn, alb=None):
        self.k, self.zf, self.mf = k, zfn, matfn
        self.alb = dict(self.ALB)
        self.alb.update(alb or {})

    def z(self, x, r):
        return self.zf(x, r)

    def field(self, x0, r0, x1, r1, step=0.125, prefix='ground'):
        k = self.k
        nx, nr = int(round((x1 - x0) / step)), int(round((r1 - r0) / step))
        groups = {}
        for j in range(nr):
            for i in range(nx):
                key = self.mf(x0 + (i + 0.5) * step, r0 + (j + 0.5) * step)
                if key is not None:
                    groups.setdefault(key, []).append((i, j))
        for key, cells in groups.items():
            bm = bmesh.new()
            vm = {}

            def v(i, j):
                if (i, j) not in vm:
                    x, r = x0 + i * step, r0 + j * step
                    vm[(i, j)] = bm.verts.new((x, -r * SK, self.zf(x, r)))
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
            k._finish(o, self.alb[key], prefix + '_' + key)
            if key in self.TURF:                             # the forest floor is turf to the finish: the leaf pass marks it, so
                k.parts[-1]['nature'] = 'grass'              # it takes the drawn grass, the seasons and the wind as a meadow does


def water(k, x0, r0, x1, r1, inside, z, part='stream_water', tone='#3a7088', step=0.0625):
    """A still water surface at height z over the cells where inside(x, r) (named so the live light gives it Look Book
    water: stream_water, pond_water)."""
    nx, nr = int(round((x1 - x0) / step)), int(round((r1 - r0) / step))
    bm = bmesh.new()
    vm = {}

    def v(i, j):
        if (i, j) not in vm:
            vm[(i, j)] = bm.verts.new((x0 + i * step, -(r0 + j * step) * SK, z))
        return vm[(i, j)]
    n = 0
    for j in range(nr):
        for i in range(nx):
            if inside(x0 + (i + 0.5) * step, r0 + (j + 0.5) * step):
                bm.faces.new((v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)))
                n += 1
    if not n:
        bm.free()
        return
    me = bpy.data.meshes.new(part)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(part, me)
    k.scene.collection.objects.link(o)
    k._finish(o, (tone, 0.0), part)


# ---- the old trees ------------------------------------------------------------------------------------------------
def ancient_trunk(k, L, cx, cr, rad, h, seed=0, moss=True, ivy=3, roots=9, z0=None):
    """A gnarled trunk: rings lofted up from a buttressed foot, ridged all the way up (the ridges are in the bark
    itself, so they follow it), roots flaring over the ground, moss and ivy climbing the side toward you, the top
    closed. Marks its foot solid."""
    rng = k.rng
    base = L.z(cx, cr) if z0 is None else z0
    n = 56
    lobes = [(rng.uniform(0, math.tau), rng.uniform(0.08, 0.18)) for _ in range(5)]
    ph = rng.uniform(0, math.tau)
    nridge = int(12 + rad * 6)

    def radius(a, z):
        f = 1 + 0.42 * math.exp(-z * 1.6)
        bump = sum(amp * math.cos(3 * (a - p_)) for p_, amp in lobes) * (0.5 + 0.5 * math.exp(-z * 0.6))
        ridge = 0.05 * max(0.0, math.cos(nridge * a + ph + 0.3 * math.sin(z * 0.7))) ** 3 - 0.02
        return rad * f * (1 + bump + ridge + 0.04 * (noise(a * 2, z, 1.3, seed) - 0.5)) * (1 - 0.05 * z / h)
    rings = []
    for z in [-0.25, 0.1, 0.35, 0.7, 1.2] + [1.8 + i * (h - 1.8) / 7 for i in range(8)]:
        rings.append([(cx + math.cos(a) * radius(a, z), cr + math.sin(a) * radius(a, z) * 0.92, base + z) for a in [i / n * math.tau for i in range(n)]])
    k.loft(rings, (BARK, 0.38), 'giant_trunk', closed=True)
    k.blob(cx, cr, base + h, rad * 0.95, rad * 0.88, rad * 0.35, (shade(BARK, 0.85), 0.38), 'giant_trunk', segs=16)   # the top, closed
    for i in range(roots):                                                 # roots thick at the trunk, diving into the moss
        a = (i + 0.5) / roots * math.tau + rng.uniform(-0.18, 0.18)
        Ln = rad + rng.uniform(0.6, 1.3)
        mid = (cx + math.cos(a) * (rad + Ln) * 0.55, cr + math.sin(a) * (rad + Ln) * 0.5)
        end = (cx + math.cos(a) * Ln, cr + math.sin(a) * Ln * 0.92)
        start = (cx + math.cos(a) * rad * 0.85, cr + math.sin(a) * rad * 0.78, base + 0.75)
        mz, ez = L.z(*mid) + 0.22, L.z(*end) - 0.06
        w = rng.uniform(0.15, 0.22) * (0.75 + rad * 0.12)
        k.tube(start, (mid[0], mid[1], mz), w, (shade(BARK, 0.95), 0.32), 'root', rb=w * 0.7, verts=9)
        k.tube((mid[0], mid[1], mz), (end[0], end[1], ez), w * 0.7, (shade(BARK, 0.9), 0.32), 'root', rb=0.04, verts=8)
        if moss and math.sin(a) > -0.3 and rng.random() < 0.6:
            k.blob(mid[0], mid[1], mz + w * 0.7, w * 1.1, w * 0.7, w * 0.3, (shade(MOSS, rng.uniform(0.95, 1.2)), 0.4), 'root_moss', segs=8)
    if moss:
        for i in range(7):
            a = rng.uniform(math.pi * 0.2, math.pi * 0.8)
            z = rng.uniform(0.3, h * 0.5)
            r_ = radius(a, z)
            k.blob(cx + math.cos(a) * r_ * 1.02, cr + math.sin(a) * r_ * 0.94, base + z, rng.uniform(0.16, 0.28), 0.08, rng.uniform(0.2, 0.4),
                   (shade(MOSS, rng.uniform(0.95, 1.2)), 0.4), 'trunk_moss', segs=8)
    for s_ in range(ivy):
        a = rng.uniform(math.pi * 0.25, math.pi * 0.75)
        with k.foliage('leaf'):
            for j in range(16):
                z = 0.2 + j * 0.24
                aa = a + 0.12 * math.sin(j * 0.9 + s_)
                r_ = radius(aa, z)
                x, r = cx + math.cos(aa) * r_ * 1.04, cr + math.sin(aa) * r_ * 0.96
                k.blob(x + rng.uniform(-0.06, 0.06), r + 0.03, base + z, 0.09, 0.05, 0.08, (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25),
                       'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)
    k.solid(cx - rad * 1.05, cr - rad * 0.95, cx + rad * 1.05, cr + rad * 0.95)


def branches(k, cx, cr, rad, h, spread, n=5, z0=0.0):
    rng = k.rng
    for i in range(n):
        a = rng.uniform(0, math.tau)
        top = (cx + math.cos(a) * 1.9 * spread, cr + math.sin(a) * 1.5 * spread, z0 + h - 0.2)
        k.tube((cx + math.cos(a) * rad * 0.5, cr + math.sin(a) * rad * 0.5, z0 + h - 1.8), top, 0.22, (shade(BARK, 0.9), 0.3), 'branch', rb=0.07, verts=8)


def crown(k, cx, cr, z, spread=1.0, tone=LEAF, hang=True):
    """A great crown of leaves: several clumpy lobes, leaves hanging off the edge (the brook's)."""
    rng = k.rng
    lobes = [(0, -0.2, 0.0, 1.0), (-1.05, 0.0, -0.3, 0.8), (1.1, -0.05, -0.25, 0.82), (0.35, 0.35, -0.45, 0.66),
             (-0.5, -0.8, 0.3, 0.8), (0.75, -0.75, 0.25, 0.74), (-1.5, 0.45, -0.7, 0.58), (1.55, 0.4, -0.75, 0.56)]
    with k.foliage('leaf'):
        for (dx, dr, dz, s) in lobes:
            rx = 1.55 * spread * s
            W.leafy_crown(k, cx + dx * 1.7 * spread, cr + dr * 1.5 * spread, z + dz, rx, rx * 0.85, rx * 0.62,
                          shade(tone, rng.uniform(0.86, 1.08)), n=max(40, int(rx * rx * 40)), part='canopy')
        if hang:
            for _ in range(int(14 * spread)):
                a = rng.uniform(0, math.tau)
                if math.sin(a) > 0.35:
                    a = math.pi - a if rng.random() < 0.5 else -a
                x, r = cx + math.cos(a) * 2.6 * spread, cr + math.sin(a) * 2.1 * spread
                W.leafy_crown(k, x, r, z - 1.0 + rng.uniform(-0.3, 0.2), 0.42, 0.36, 0.48, shade('#4e8238', rng.uniform(0.85, 1.05)),
                              n=26, part='canopy', sprigs=False)


def old_tree(k, L, cx, cr, rad, h, seed=0, crown_z=None, spread=None, roots=9):
    """A giant of the old wood, whole: trunk, branches, crown (call after the ground)."""
    ancient_trunk(k, L, cx, cr, rad, h + 0.4, seed=seed, roots=roots)
    sp = spread or (1.0 + rad * 0.12)
    branches(k, cx, cr, rad, h, sp, z0=L.z(cx, cr))
    return lambda: crown(k, cx, cr, (crown_z or h) + L.z(cx, cr), sp)


# ---- small things of the forest floor ------------------------------------------------------------------------------
def fern(k, L, cx, cr, s=0.5, fronds=8, tone='#4a8a3a', z=None):
    """A fern: arching fronds, each a stem with leaflets either side, as one mesh."""
    rng = k.rng
    z0 = L.z(cx, cr) if z is None else z
    quads = []
    for i in range(fronds):
        a = i / fronds * math.tau + rng.uniform(-0.25, 0.25)
        Ln = s * rng.uniform(0.75, 1.1)
        rise = s * rng.uniform(0.45, 0.65)
        prev = None
        for j in range(9):
            t = j / 8
            x = cx + math.cos(a) * Ln * t
            r = cr + math.sin(a) * Ln * t * 0.85
            zz = z0 + 0.02 + rise * math.sin(t * math.pi * 0.85) * (1 - 0.3 * t)
            if prev:
                leaf = s * 0.16 * (1 - t * 0.7)
                nx, nr = -math.sin(a), math.cos(a) * 0.85
                for side in (-1, 1):
                    tip = (x + nx * leaf * side + math.cos(a) * leaf * 0.4, r + nr * leaf * side, zz - leaf * 0.35)
                    quads.append(((prev[0], prev[1], prev[2]), (x, r, zz), tip, ((prev[0] + tip[0]) / 2, (prev[1] + tip[1]) / 2, (prev[2] + tip[2]) / 2)))
            prev = (x, r, zz)
    with k.foliage('leaf'):
        k.quads(quads, (shade(tone, rng.uniform(0.85, 1.1)), 0.25), 'fern')


def glow_spores(k, L, cx, cr, n=6, spread=0.35, col=SPORE):
    rng = k.rng
    for _ in range(n):
        x, r = cx + rng.uniform(-spread, spread), cr + rng.uniform(-spread, spread) * 0.8
        z = L.z(x, r) + rng.uniform(0.02, 0.12)
        k.sphere(x, r, z, 0.03, 0.03, col, 'spore', emit=(col, 1.3), segs=6)


def mushroom_ring(k, L, cx, cr, n=4, glow=False, col=SPORE, cap='#b8402e', size=1.0, light=3.0):
    rng = k.rng
    for _ in range(n):
        x, r = cx + rng.uniform(-0.22, 0.22) * size, cr + rng.uniform(-0.16, 0.16) * size
        z0 = L.z(x, r)
        h = rng.uniform(0.08, 0.2) * size
        k.cyl(x, r, z0, z0 + h, 0.024 * size, '#ece2d0', 'mushroom_stem', verts=7)
        rad = rng.uniform(0.055, 0.09) * size
        if glow:
            k.sphere(x, r, z0 + h, rad, rad * 0.55, col, 'mushroom_cap', emit=(col, 1.5), segs=10)
        else:
            k.sphere(x, r, z0 + h, rad, rad * 0.6, (cap, 0.25), 'mushroom_cap', segs=10)
            for d in range(3):
                aa = rng.uniform(0, math.tau)
                k.sphere(x + math.cos(aa) * rad * 0.5, r + math.sin(aa) * rad * 0.4, z0 + h + rad * 0.42, 0.014, 0.008, '#f4ece0', 'mushroom_spot', segs=5)
    if glow and light:
        k.point_light(cx, cr + 0.1, L.z(cx, cr) + 0.3, col, light, radius=0.1)


def giant_mushroom(k, L, cx, cr, h=1.4, cap=0.7, col='#86f2d6', stem='#e8dccc', light=8.0):
    """A glowing mushroom taller than you: a fat pale stem, a domed cap glowing from underneath, gills, spots."""
    rng = k.rng
    z0 = L.z(cx, cr)
    lean = rng.uniform(-0.12, 0.12)
    k.tube((cx, cr, z0 - 0.05), (cx + lean, cr, z0 + h), cap * 0.22, (stem, 0.3), 'mushroom_stem', rb=cap * 0.16, verts=12)
    k.blob(cx + lean, cr, z0 + h, cap, cap * 0.9, cap * 0.5, (shade(col, 0.55), 0.3), 'mushroom_cap', emit=(col, 0.5), segs=16)
    k.blob(cx + lean, cr, z0 + h - cap * 0.12, cap * 0.92, cap * 0.82, cap * 0.16, (shade(col, 0.8), 0.2), 'mushroom_gills', emit=(col, 1.6), segs=14)
    for _ in range(int(6 + cap * 6)):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0.2, 0.75) * cap
        k.sphere(cx + lean + math.cos(a) * d, cr + math.sin(a) * d * 0.9, z0 + h + cap * 0.38 * (1 - (d / cap) ** 2) + 0.04,
                 0.05 * cap, 0.03 * cap, col, 'mushroom_spot', emit=(col, 2.0), segs=6)
    k.point_light(cx + lean, cr + 0.2, z0 + h - cap * 0.3, col, light, radius=0.2)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def boulder(k, L, cx, cr, s=0.5, moss=True, solid=True):
    z0 = L.z(cx, cr)
    k.rock(cx, cr, z0 + s * 0.15, s, s * 0.8, s * 0.62, (STONE, 0.35), part='rock', segs=10)
    k.rock(cx + s * 0.55, cr + s * 0.3, z0 + s * 0.05, s * 0.4, s * 0.34, s * 0.3, (shade(STONE, 0.9), 0.35), part='rock', segs=8)
    if moss:
        k.blob(cx - s * 0.1, cr - s * 0.1, z0 + s * 0.7, s * 0.75, s * 0.55, s * 0.18, (MOSS_L, 0.4), 'rock_moss', segs=10)
        for _ in range(3):
            k.blob(cx + k.rng.uniform(-s, s) * 0.6, cr + s * 0.3, z0 + s * k.rng.uniform(0.35, 0.6), s * 0.25, s * 0.15, s * 0.12,
                   (shade(MOSS, 1.1), 0.4), 'rock_moss', segs=7)
    if solid:
        k.solid(cx - s * 0.8, cr - s * 0.6, cx + s * 0.9, cr + s * 0.7)


def pebbles(k, L, x0, r0, x1, r1, n, ok=None, tone=STONE):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if ok and not ok(x, r):
            continue
        s = rng.uniform(0.04, 0.1)
        k.rock(x, r, L.z(x, r) + s * 0.2, s, s * 0.8, s * 0.5, (shade(tone, rng.uniform(0.8, 1.2)), 0.25), part='pebble', segs=6)


def flowers(k, L, x0, r0, x1, r1, n, ok=None, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8')):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if ok and not ok(x, r):
            continue
        z0, h = L.z(x, r), rng.uniform(0.06, 0.18)
        k.cone(x, r, z0, z0 + h, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
        k.sphere(x, r, z0 + h, 0.035, 0.03, rng.choice(cols), 'flower', segs=5)


def leaf_litter(k, L, x0, r0, x1, r1, n, ok=None):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if ok and not ok(x, r):
            continue
        col = rng.choice(('#a0682a', '#c08a30', '#7a4a22', '#8a9a3a', '#b05a2a'))
        k.blob(x, r, L.z(x, r) + 0.004, 0.06, 0.04, 0.008, (col, 0.25), 'leaf_litter', rot=(0, 0, rng.uniform(0, 360)), segs=5)


def moss_mounds(k, L, x0, r0, x1, r1, n, ok=None):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if ok and not ok(x, r):
            continue
        s_ = rng.uniform(0.14, 0.3)
        k.blob(x, r, L.z(x, r) + 0.01, s_, s_ * 0.8, s_ * 0.38, (shade(MOSS_L, rng.uniform(0.85, 1.12)), 0.4), 'moss_mound', segs=9)


def twigs(k, L, x0, r0, x1, r1, n, ok=None):
    rng = k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if ok and not ok(x, r):
            continue
        a = rng.uniform(0, math.pi)
        Ln = rng.uniform(0.25, 0.5)
        z = L.z(x, r) + 0.02
        k.tube((x, r, z), (x + math.cos(a) * Ln, r + math.sin(a) * Ln * 0.8, z + 0.01), 0.018, ('#5a4030', 0.3), 'twig', rb=0.01, verts=4)


def reeds(k, L, x, r, n=7, spread=0.12, h=(0.35, 0.6)):
    rng = k.rng
    for _ in range(n):
        xx, rr = x + rng.uniform(-spread, spread), r + rng.uniform(-spread * 1.2, spread * 1.2)
        z0 = L.z(xx, rr)
        hh = rng.uniform(*h)
        k.tube((xx, rr, z0), (xx + rng.uniform(-0.05, 0.05), rr, z0 + hh), 0.012, ('#5a7a3a', 0.2), 'reed', rb=0.006, verts=4)
        if rng.random() < 0.4:
            k.cyl(xx, rr, z0 + hh - 0.12, z0 + hh - 0.02, 0.022, ('#6a4a2a', 0.2), 'cattail', verts=6)


def log(k, L, x0, x1, cr, rad, seed=4, solid=True):
    rng = k.rng
    rings = []
    n = 16
    for i in range(12):
        t = i / 11
        x = x0 + (x1 - x0) * t
        rr = rad * (1.06 - 0.16 * t) * (1 + 0.08 * math.sin(t * 9 + seed))
        cz = L.z(x, cr) + rr * 0.85
        ring = []
        for j in range(n):
            a = j / n * math.tau
            bump = 1 + 0.07 * math.cos(5 * a + seed) + 0.04 * math.cos(9 * a)
            ring.append((x, cr + math.cos(a) * rr * bump * 0.95, cz + math.sin(a) * rr * bump))
        rings.append(ring)
    k.loft(rings, (BARK, 0.36), 'log', closed=True)
    for end, rr in ((rings[0], rad * 1.06), (rings[-1], rad * 0.9)):
        x = end[0][0]
        cz = L.z(x, cr) + rr * 0.85
        k.cyl_x(x - 0.012, x + 0.012, cr, cz, rr * 0.92, rr * 0.92, ('#c09a6c', 0.3), 'log_end', verts=16)
        k.cyl_x(x - 0.016, x + 0.016, cr, cz, rr * 0.45, rr * 0.45, ('#9a7448', 0.3), 'log_end', verts=12)
    for _ in range(int((x1 - x0) * 2)):
        x = rng.uniform(x0 + 0.2, x1 - 0.2)
        k.blob(x, cr - 0.05, L.z(x, cr) + rad * 1.75, 0.28, 0.18, 0.07, (shade(MOSS_L, rng.uniform(0.9, 1.1)), 0.4), 'log_moss', segs=8)
    if solid:
        k.solid(x0, cr - rad, x1, cr + rad)


def birch(k, L, cx, cr, h=3.2):
    """A silver birch (assets_elves'), on the land."""
    z0 = L.z(cx, cr)
    k.tube((cx, cr, z0), (cx + 0.08, cr, z0 + h * 0.75), 0.09, ('#e4e0d4', 0.2), 'birch', rb=0.05, verts=8)
    for i in range(6):
        z = z0 + k.rng.uniform(0.2, h * 0.7)
        k.box(cx - 0.06, cr + 0.06, z, cx + 0.04, cr + 0.1, z + 0.05, '#2a2622', 'birch_mark')
    with k.foliage('leaf'):
        for (dx, dz, s) in ((0, 0.85, 0.55), (-0.35, 0.72, 0.4), (0.4, 0.75, 0.42), (0.1, 1.0, 0.38)):
            W.leafy_crown(k, cx + dx, cr, z0 + h * dz, s, s * 0.8, s * 0.9, shade('#7aa048', k.rng.uniform(0.9, 1.1)), part='birch_leaves')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def shrub(k, L, cx, cr, s=0.4, tone='#3a6a30', berries=None, flowers_=None):
    z0 = L.z(cx, cr)
    with k.foliage('leaf'):
        W.leafy_crown(k, cx, cr, z0 + s * 0.62, s * 1.05, s * 0.85, s * 0.62, shade(tone, k.rng.uniform(0.94, 1.06)), part='bush')
    for col in [c for c in (berries, flowers_) if c]:
        for i in range(6):
            k.sphere(cx + k.rng.uniform(-s, s) * 0.75, cr + s * 0.62, z0 + s * k.rng.uniform(0.45, 0.95), 0.03, 0.03, col, 'berry', segs=5)


# ---- the elves' lights ------------------------------------------------------------------------------------------------
def leaf_lantern(k, cx, cr, z, s=0.12, energy=4.0, col=GLOW, leaf='#5a8e40'):
    """A lantern of folded leaves round a warm light, a gold cap (assets_elves', with a choice of leaf)."""
    k.sphere(cx, cr, z, s, s * 1.2, col, 'lantern_glow', emit=(col, 1.6), segs=10)
    for i in range(5):
        a = i / 5 * math.tau
        k.blob(cx + math.cos(a) * s * 0.75, cr + math.sin(a) * s * 0.6, z, s * 0.45, s * 0.3, s * 1.1, (leaf, 0.3), 'lantern_leaf', segs=6)
    k.cyl(cx, cr, z + s * 1.1, z + s * 1.4, s * 0.4, (GOLD, 0.25), 'lantern_cap', verts=8)
    if energy:
        k.point_light(cx, cr + 0.15, z, '#ffc880', energy, radius=0.1)


def lantern_post(k, L, cx, cr, h=1.7, energy=12.0, solid=True):
    z0 = L.z(cx, cr)
    k.tube((cx, cr, z0), (cx, cr, z0 + h), 0.05, ('#c8b48a', 0.2), 'post', verts=8)
    k.tube((cx, cr, z0 + h), (cx + 0.32, cr, z0 + h + 0.12), 0.04, ('#c8b48a', 0.2), 'post', verts=6)
    k.cyl(cx + 0.32, cr, z0 + h - 0.25, z0 + h + 0.1, 0.006, (GOLD, 0.25), 'chain', verts=4)
    leaf_lantern(k, cx + 0.32, cr, z0 + h - 0.32, energy=energy)
    if solid:
        k.solid_post(cx, cr)


def lantern_string(k, a, b, n=7, sag=0.4, energy=1.6, cols=(GLOW, '#ffe0a0', '#c8f0e0', '#f0c8ff')):
    """A cord strung between two points (x, r, z) with leaf lanterns hanging along it — the lantern makers' work."""
    pts = []
    for i in range(17):
        t = i / 16
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.012, ('#3a2a1a', 0.3), 'cord', verts=4)
    for i in range(n):
        t = (i + 0.5) / n
        x, r, z = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)
        drop = k.rng.uniform(0.12, 0.3)
        k.cyl(x, r, z - drop, z, 0.005, (GOLD, 0.25), 'chain', verts=4)
        leaf_lantern(k, x, r, z - drop - 0.1, s=k.rng.uniform(0.07, 0.1), energy=energy, col=k.rng.choice(cols))


# ---- the elves' city: stalls, workshops, signs ------------------------------------------------------------------------
def leaf_awning(k, x0, x1, r0, r1, z_back, z_front, col, col2=None, part='awning', scallop=True):
    """A cloth awning sloping toward you, its front edge cut into leaf points; stripes of col2 if given."""
    n = max(2, int((x1 - x0) / 0.45))
    for i in range(n):
        xa, xb = x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n
        c = col2 if (col2 and i % 2) else col
        k.poly([(xa, r0, z_back), (xb, r0, z_back), (xb, r1, z_front), (xa, r1, z_front)], (c, 0.3), part)
        if scallop:                                                          # a leaf point hanging off the front
            xm = (xa + xb) / 2
            k.poly([(xa, r1, z_front), (xb, r1, z_front), (xm, r1 + 0.05, z_front - 0.22)], (shade(c, 0.9), 0.3), part)


def leaf_thatch(k, x0, x1, r0, r1, z_back, z_front, tones=('#56723a', '#5c783c', '#628040', '#7a6e3a'), part='roof_thatch'):
    """A roof thatched with big leaves, sloping toward you: a dark deck, then courses of overlapping leaf shingles from
    the back down to the eave, each leaf its own tone (now and then a dry one), the eave ragged with leaf tips."""
    rng = k.rng
    k.poly([(x0, r0, z_back - 0.03), (x1, r0, z_back - 0.03), (x1, r1, z_front - 0.03), (x0, r1, z_front - 0.03)], ('#2e3a1e', 0.4), part)
    rows = max(3, int((r1 - r0) / 0.22))
    for j in range(rows + 1):
        t = j / rows
        r, z = r0 + (r1 - r0) * t, z_back + (z_front - z_back) * t
        x = x0 - rng.uniform(0, 0.2)
        while x < x1:
            w = rng.uniform(0.16, 0.24)
            xa, xb = max(x0, x), min(x1, x + w)
            col = tones[-1] if rng.random() < 0.03 else rng.choice(tones[:-1])
            col = shade(col, 0.9 + 0.16 * t + rng.uniform(-0.03, 0.03))   # lighter toward the eave, as the light falls
            lift = 0.03 + 0.01 * (j % 2)
            tip = (xa + xb) / 2 + rng.uniform(-0.04, 0.04)
            dr, dz = (r1 - r0) / rows * 1.6, (z_front - z_back) / rows * 1.6
            k.poly([(xa, r - dr * 0.25, z - dz * 0.25 + lift), (xb, r - dr * 0.25, z - dz * 0.25 + lift),
                    (xb - 0.02, r + dr * 0.55, z + dz * 0.55 + lift), (tip, r + dr, z + dz + lift - 0.04),
                    (xa + 0.02, r + dr * 0.55, z + dz * 0.55 + lift)], (col, 0.32), part)
            x += w * rng.uniform(0.8, 0.95)


def carved_post(k, x, r, z0, z1, rad=0.06, col=ELFWOOD, leaf=True):
    """A post of the elves' pale wood, a leaf carved at its head, a twist of gold."""
    k.cyl(x, r, z0, z1, rad, (col, 0.25), 'post', verts=8)
    k.cyl(x, r, z1 - 0.18, z1 - 0.12, rad * 1.35, (GOLD, 0.25), 'post_band', verts=8)
    if leaf:
        k.blob(x, r + 0.02, z1 + 0.08, rad * 1.2, rad * 0.6, 0.12, (shade(col, 1.1), 0.25), 'post_leaf', segs=7)


def goods(k, x0, x1, cr, z, kind):
    """What's on a stall: fruit in baskets, honey, cloth, carved toys, herbs, lanterns, arrows, bread, crystals."""
    rng = k.rng
    x = x0 + 0.18
    while x < x1 - 0.12:
        if kind == 'fruit':
            k.cyl(x, cr, z, z + 0.1, 0.13, ('#a07a40', 0.3), 'basket', verts=10)
            col = rng.choice(('#d84030', '#e8a030', '#f0d040', '#8a3a8a', '#7ab040'))
            for j in range(5):
                k.sphere(x + rng.uniform(-0.07, 0.07), cr + rng.uniform(-0.07, 0.07), z + 0.12 + rng.uniform(0, 0.05), 0.045, 0.045, col, 'fruit', segs=6)
            x += 0.32
        elif kind == 'honey':
            k.cyl(x, cr, z, z + rng.uniform(0.12, 0.18), 0.05, ('#e0a020', 0.1), 'honey_jar', emit=('#a06010', 0.25), verts=8)
            k.cyl(x, cr, z + 0.17, z + 0.19, 0.055, ('#c8b090', 0.3), 'jar_lid', verts=8)
            x += 0.16
        elif kind == 'cloth':
            col = rng.choice(list(CLOTH.values()))
            k.box(x - 0.12, cr - 0.16, z, x + 0.12, cr + 0.16, z + rng.uniform(0.08, 0.16), (col, 0.3), 'cloth')
            x += 0.28
        elif kind == 'toys':
            col = rng.choice((ELFWOOD, ELFWOOD_L, '#c8a060'))
            k.blob(x, cr, z + 0.08, 0.06, 0.05, 0.08, (col, 0.3), 'toy', segs=7)
            k.sphere(x, cr, z + 0.18, 0.04, 0.04, (col, 0.3), 'toy', segs=6)
            x += 0.18
        elif kind == 'herbs':
            k.cyl(x, cr, z, z + 0.16, 0.06, rng.choice(('#6a9a8a', '#9a7a5a', '#8a6a9a')), 'jar', verts=8)
            k.blob(x + 0.08, cr + 0.1, z + 0.04, 0.08, 0.05, 0.04, (rng.choice(('#6a8a3a', '#8a7a3a', '#9a5a6a')), 0.3), 'herb_bundle', segs=6)
            x += 0.24
        elif kind == 'lanterns':
            leaf_lantern(k, x, cr, z + 0.1, s=0.07, energy=0.6, col=rng.choice((GLOW, '#c8f0e0', '#f0c8ff')))
            x += 0.2
        elif kind == 'bread':
            k.blob(x, cr, z + 0.05, 0.11, 0.07, 0.05, ('#c88a48', 0.3), 'bread', segs=8)
            x += 0.24
        elif kind == 'crystals':
            col = rng.choice(('#a8e0d8', '#c8a8f0', '#e0b0ff'))
            k.cone(x, cr, z, z + 0.16, 0.04, 0.0, col, 'crystal', emit=(col, 0.8), verts=5)
            x += 0.14
        else:
            x += 0.3


def leaf_stall(k, L, x0, x1, cr, awning='green', awning2='gold', kind='fruit', solid=True, back=True):
    """A market stall of the elves' pale wood under a leaf-cut awning: a counter, carved posts, a shelf of goods behind,
    two baskets on the ground."""
    z0 = L.z((x0 + x1) / 2, cr)
    h = 0.78
    k.box(x0, cr - 0.28, z0 + h - 0.06, x1, cr + 0.28, z0 + h, (ELFWOOD, 0.25), 'stall_top')
    k.box(x0 + 0.05, cr + 0.18, z0, x1 - 0.05, cr + 0.26, z0 + h - 0.06, (shade(ELFWOOD, 0.85), 0.3), 'stall_front')
    for x in (x0 + 0.06, x1 - 0.06):
        carved_post(k, x, cr - 0.3, z0, z0 + 2.0)
        carved_post(k, x, cr + 0.3, z0, z0 + 1.7)
    leaf_awning(k, x0 - 0.2, x1 + 0.2, cr - 0.5, cr + 0.55, z0 + 2.05, z0 + 1.62, CLOTH[awning], CLOTH.get(awning2))
    goods(k, x0, x1, cr, z0 + h, kind)
    if back:                                                                  # a shelf behind with more
        k.box(x0 + 0.1, cr - 0.6, z0 + 1.0, x1 - 0.1, cr - 0.45, z0 + 1.04, (shade(ELFWOOD, 0.9), 0.25), 'shelf')
        goods(k, x0 + 0.1, x1 - 0.1, cr - 0.52, z0 + 1.04, kind)
    for (bx, br) in ((x0 - 0.25, cr + 0.4), (x1 + 0.22, cr + 0.35)):
        if k.rng.random() < 0.7:
            k.cyl(bx, br, z0, z0 + 0.22, 0.17, ('#a07a40', 0.3), 'basket', verts=10)
            goods(k, bx - 0.05, bx + 0.25, br, z0 + 0.18, kind if kind in ('fruit', 'bread') else 'fruit')
    if solid:
        k.solid(x0, cr - 0.6, x1, cr + 0.3)


def hanging_sign(k, x, r, z, icon='bow', board=ELFWOOD, h_off=0.0):
    """A leaf-shaped board hung from a bracket, an icon of what's sold burnt and gilded on it."""
    k.tube((x - 0.35, r, z + 0.3), (x + 0.1, r, z + 0.3), 0.025, (ELFWOOD_D, 0.25), 'bracket', verts=5)
    k.cyl(x - 0.05, r, z + 0.15, z + 0.3, 0.005, (GOLD, 0.25), 'chain', verts=4)
    k.blob(x - 0.05, r + 0.02, z, 0.24, 0.035, 0.17, (board, 0.25), 'sign_board', segs=10)
    c = (GOLD, 0.2)
    zz = z
    if icon == 'bow':
        for i in range(7):
            a = -1.0 + i / 6 * 2.0
            k.box(x - 0.05 + math.sin(a) * 0.04 - 0.012, r + 0.055, zz + a * 0.1 - 0.012, x - 0.05 + math.sin(a) * 0.04 + 0.012, r + 0.065, zz + a * 0.1 + 0.012, c, 'sign_icon')
        k.box(x - 0.05 - 0.13, r + 0.055, zz - 0.006, x - 0.05 + 0.13, r + 0.065, zz + 0.006, c, 'sign_icon')
    elif icon == 'lantern':
        k.sphere(x - 0.05, r + 0.06, zz, 0.06, 0.07, '#ffd890', 'sign_icon', emit=('#ffc870', 1.2), segs=8)
    elif icon == 'loom':
        for i in range(4):
            k.box(x - 0.13 + i * 0.08, r + 0.055, zz - 0.09, x - 0.12 + i * 0.08, r + 0.065, zz + 0.09, c, 'sign_icon')
    elif icon == 'mug':
        k.box(x - 0.1, r + 0.055, zz - 0.08, x + 0.0, r + 0.065, zz + 0.06, c, 'sign_icon')
    elif icon == 'leaf':
        k.blob(x - 0.05, r + 0.06, zz, 0.1, 0.01, 0.06, c, 'sign_icon', rot=(0, 30, 0), segs=6)


def trunk_front(k, L, cx, cr, rad, w=2.2, h=2.2, roof=CLOTH['green'], roof2=None, door=True, lit=True, icon=None, solid=True):
    """A shopfront built against the south face of a giant trunk: a timber frame of the elves' pale wood, an arched
    doorway into the hollow trunk glowing warm, a leaf awning over the front, a sign. Returns (door x, the row in front)."""
    z0 = L.z(cx, cr + rad)
    face = cr + rad * 0.92 + 0.1
    # the frame: posts, a carved lintel arched over the door
    for x in (cx - w / 2, cx + w / 2):
        carved_post(k, x, face + 0.05, z0, z0 + h, rad=0.08)
    k.box(cx - w / 2 - 0.1, face - 0.25, z0 + h - 0.06, cx + w / 2 + 0.1, face + 0.12, z0 + h + 0.08, (ELFWOOD, 0.25), 'lintel')
    k.box(cx - w / 2 + 0.05, face - 0.4, z0, cx + w / 2 - 0.05, face - 0.02, z0 + 0.06, (shade(ELFWOOD, 0.8), 0.3), 'floor_shop')
    if door:
        dw, dh = 0.8, 1.45
        k.box(cx - dw / 2 - 0.12, face - 0.35, z0, cx + dw / 2 + 0.12, face - 0.05, z0 + dh - dw / 2 + 0.06, (BARK_D, 0.3), 'door_frame')
        k.cyl_y(cx, face - 0.35, face - 0.05, z0 + dh - dw / 2, dw / 2 + 0.12, dw / 2 + 0.12, (BARK_D, 0.3), 'door_frame', verts=18)
        col = '#ffd890' if lit else '#3a2a1a'
        em = ('#ffc870', 1.2) if lit else None
        k.box(cx - dw / 2, face - 0.3, z0, cx + dw / 2, face - 0.02, z0 + dh - dw / 2, col, 'door_light', emit=em)
        k.cyl_y(cx, face - 0.3, face - 0.02, z0 + dh - dw / 2, dw / 2, dw / 2, col, 'door_light', emit=em, verts=18)
        if lit:
            k.point_light(cx, face + 0.5, z0 + 0.9, '#ffc870', 14, radius=0.3)
    leaf_awning(k, cx - w / 2 - 0.3, cx + w / 2 + 0.3, face - 0.2, face + 0.75, z0 + h + 0.05, z0 + h - 0.45, roof, roof2)
    if icon:
        hanging_sign(k, cx + w / 2 + 0.5, face + 0.3, z0 + h - 0.6, icon=icon)
    if solid:
        k.solid(cx - w / 2 - 0.1, face - 0.5, cx + w / 2 + 0.1, face - 0.1)
    return cx, int(face + 0.4)


def bow_rack(k, L, x, r, n=5):
    """A rack of bows standing, staves of yew and elm, a quiver of arrows."""
    z0 = L.z(x, r)
    k.box(x - 0.5, r - 0.08, z0 + 0.15, x + 0.5, r + 0.08, z0 + 0.22, (ELFWOOD_D, 0.25), 'rack')
    k.box(x - 0.5, r - 0.08, z0 + 1.2, x + 0.5, r + 0.08, z0 + 1.26, (ELFWOOD_D, 0.25), 'rack')
    for xx in (x - 0.48, x + 0.48):
        k.cyl(xx, r, z0, z0 + 1.3, 0.035, (ELFWOOD_D, 0.25), 'rack', verts=6)
    for i in range(n):
        bx = x - 0.38 + i * 0.76 / max(1, n - 1)
        col = k.rng.choice(('#8a5428', '#6e5232', '#a07a48'))
        pts = [(bx + 0.08 * math.sin(t * math.pi), r, z0 + 0.1 + t * 1.3) for t in [j / 6 for j in range(7)]]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.022, (col, 0.25), 'bow', verts=5)
        k.tube((bx, r + 0.01, z0 + 0.1), (bx, r + 0.01, z0 + 1.4), 0.005, ('#e8e2d4', 0.2), 'bowstring', verts=3)
    # a quiver
    k.cyl(x + 0.7, r, z0, z0 + 0.6, 0.1, ('#5a3a20', 0.3), 'quiver', verts=10)
    for i in range(6):
        a = i / 6 * math.tau
        k.tube((x + 0.7 + math.cos(a) * 0.04, r + math.sin(a) * 0.04, z0 + 0.5), (x + 0.7 + math.cos(a) * 0.07, r + math.sin(a) * 0.07, z0 + 0.82), 0.01,
               ('#b08a58', 0.25), 'arrow', verts=3)
        k.blob(x + 0.7 + math.cos(a) * 0.07, r + math.sin(a) * 0.07, z0 + 0.8, 0.02, 0.01, 0.04, ('#8ab858', 0.25), 'fletch', segs=5)


def staves_drying(k, L, x, r, n=6):
    """Bow staves leaning against a rail to season."""
    z0 = L.z(x, r)
    k.tube((x - 0.6, r - 0.2, z0 + 0.9), (x + 0.6, r - 0.2, z0 + 0.9), 0.03, (ELFWOOD_D, 0.25), 'rail', verts=5)
    for xx in (x - 0.6, x + 0.6):
        k.cyl(xx, r - 0.2, z0, z0 + 0.95, 0.035, (ELFWOOD_D, 0.25), 'rail', verts=6)
    for i in range(n):
        bx = x - 0.5 + i / max(1, n - 1)
        k.tube((bx + 0.15, r + 0.2, z0), (bx, r - 0.2, z0 + 1.5), 0.03, (k.rng.choice(('#c8a070', '#a07a48', '#d4b27a')), 0.25), 'stave', verts=5)


def loom(k, L, x, r, warp=None):
    """A standing loom: a frame of pale wood, the warp threads in colour, cloth wound on the beam, a bench."""
    z0 = L.z(x, r)
    warp = warp or k.rng.choice(list(CLOTH.values()))
    for xx in (x - 0.55, x + 0.55):
        k.box(xx - 0.04, r - 0.05, z0, xx + 0.04, r + 0.05, z0 + 1.5, (ELFWOOD, 0.25), 'loom')
    k.cyl_x(x - 0.55, x + 0.55, r, z0 + 1.45, 0.05, 0.05, (ELFWOOD_D, 0.25), 'loom', verts=8)
    k.cyl_x(x - 0.55, x + 0.55, r + 0.05, z0 + 0.55, 0.09, 0.09, (warp, 0.3), 'cloth', verts=10)
    for i in range(12):
        xx = x - 0.45 + i * 0.9 / 11
        k.box(xx - 0.008, r - 0.01, z0 + 0.62, xx + 0.008, r + 0.01, z0 + 1.42, (shade(warp, 1.25), 0.2), 'warp')
    k.box(x - 0.47, r - 0.02, z0 + 0.62, x + 0.47, r + 0.02, z0 + 0.95, (warp, 0.3), 'cloth')       # the woven part
    k.box(x - 0.4, r + 0.45, z0 + 0.4, x + 0.4, r + 0.7, z0 + 0.46, (ELFWOOD, 0.25), 'bench')
    for xx in (x - 0.35, x + 0.35):
        k.box(xx - 0.03, r + 0.5, z0, xx + 0.03, r + 0.65, z0 + 0.4, (ELFWOOD_D, 0.25), 'bench')
    k.solid(x - 0.6, r - 0.15, x + 0.6, r + 0.15)


def cloth_line(k, a, b, n=5, sag=0.15):
    """A line strung between two points with lengths of new cloth hung over it to dry."""
    for i in range(12):
        t0, t1 = i / 12, (i + 1) / 12
        p = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[2] - sag * math.sin(math.pi * t0))
        q = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] - sag * math.sin(math.pi * t1))
        k.tube(p, q, 0.01, ('#3a2a1a', 0.3), 'cord', verts=4)
    for i in range(n):
        t = (i + 0.5) / n
        x, r, z = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] - sag * math.sin(math.pi * t)
        col = k.rng.choice(list(CLOTH.values()))
        hw = (b[0] - a[0]) / n * 0.38
        Ln = k.rng.uniform(0.5, 0.9)
        k.poly([(x - hw, r, z), (x + hw, r, z), (x + hw, r + 0.02, z - Ln), (x - hw, r + 0.02, z - Ln)], (col, 0.3), 'cloth')


def spring_basin(k, L, cx, cr, rad=0.9):
    """A basin of carved stone fed by water running from a root spout — a place to fill your flask."""
    z0 = L.z(cx, cr)
    W.annulus(k, cx, cr, rad - 0.14, rad + 0.1, z0 - 0.02, z0 + 0.36, (shade(STONE, 1.1), 0.25), 'basin_rim', segs=32)
    water(k, cx - rad, cr - rad, cx + rad, cr + rad, lambda x, r: math.hypot(x - cx, (r - cr)) < rad - 0.12, z0 + 0.28, part='basin_water', tone='#3a7088', step=0.05)
    for i in range(12):                                                        # leaves carved round the rim
        a = i / 12 * math.tau
        if math.sin(a) < -0.3:
            continue
        k.blob(cx + math.cos(a) * (rad + 0.1), cr + math.sin(a) * (rad + 0.1), z0 + 0.2, 0.08, 0.03, 0.05, (GOLD, 0.25), 'rim_leaf', segs=6)
    # the spout: a root curling up behind it, water falling from its tip
    k.tube((cx - 0.2, cr - rad - 0.35, z0), (cx - 0.05, cr - rad - 0.1, z0 + 0.9), 0.12, (BARK, 0.3), 'root', rb=0.07, verts=8)
    k.tube((cx - 0.05, cr - rad - 0.1, z0 + 0.9), (cx, cr - rad + 0.15, z0 + 0.75), 0.07, (BARK, 0.3), 'root', rb=0.04, verts=8)
    k.box(cx - 0.03, cr - rad + 0.14, z0 + 0.3, cx + 0.03, cr - rad + 0.2, z0 + 0.74, ('#d6ecf0', 0.15), 'falls')
    for _ in range(6):
        k.blob(cx + k.rng.uniform(-0.15, 0.15), cr - rad + 0.25 + k.rng.uniform(0, 0.15), z0 + 0.29, 0.06, 0.05, 0.015, ('#eef6f6', 0.15), 'foam', segs=6)
    k.solid(cx - rad - 0.1, cr - rad - 0.4, cx + rad + 0.1, cr + rad + 0.1)


def basket_lift(k, L, cx, cr, rope_top=9.0):
    """A basket lift up into the canopy: a landing of planks, a great wicker basket on four ropes running up out of
    sight, a winch wheel and a counterweight of stones in a net. Returns where you stand to ride it."""
    z0 = L.z(cx, cr)
    k.box(cx - 1.0, cr - 0.7, z0, cx + 1.0, cr + 0.7, z0 + 0.12, (shade(ELFWOOD, 0.85), 0.3), 'floor_landing')
    for x in (cx - 0.95, cx + 0.95):
        for r in (cr - 0.65, cr + 0.65):
            k.cyl(x, r, z0, z0 + 0.12, 0.06, (ELFWOOD_D, 0.25), 'post', verts=6)
    # the basket: woven sides (rings of wicker), a rim, the ropes from its corners up out of the picture
    bz = z0 + 0.12
    for i in range(6):
        k.cyl(cx, cr - 0.05, bz + i * 0.11, bz + i * 0.11 + 0.1, 0.62 - 0.01 * i, (shade('#b08a50', 0.92 + 0.06 * (i % 2)), 0.3), 'basket', verts=20)
    k.cyl(cx, cr - 0.05, bz + 0.66, bz + 0.72, 0.64, ('#8a6a3a', 0.3), 'basket_rim', verts=20)
    for (dx, dr) in ((-0.5, -0.35), (0.5, -0.35), (-0.5, 0.3), (0.5, 0.3)):
        k.tube((cx + dx, cr + dr, bz + 0.72), (cx + dx * 0.2, cr - 0.05 + dr * 0.2, z0 + 2.4), 0.012, ('#c8b080', 0.25), 'rope', verts=4)
    k.tube((cx, cr - 0.05, z0 + 2.4), (cx, cr - 0.05, z0 + rope_top), 0.025, ('#c8b080', 0.25), 'rope', verts=5)
    k.sphere(cx, cr - 0.05, z0 + 2.4, 0.08, 0.08, (GOLD, 0.25), 'ring', segs=8)
    # the winch beside it
    wx = cx + 1.45
    k.cyl_y(wx, cr - 0.1, cr + 0.1, z0 + 0.7, 0.5, 0.5, (ELFWOOD, 0.25), 'winch', verts=16)
    for i in range(8):
        a = i / 8 * math.tau
        k.tube((wx, cr + 0.12, z0 + 0.7), (wx + math.cos(a) * 0.62, cr + 0.12, z0 + 0.7 + math.sin(a) * 0.62), 0.025, (ELFWOOD_D, 0.25), 'winch_spoke', verts=4)
    for x in (wx - 0.1, wx + 0.1):
        k.box(x - 0.04, cr - 0.25, z0, x + 0.04, cr - 0.12, z0 + 0.75, (ELFWOOD_D, 0.25), 'winch')
    k.tube((wx, cr, z0 + 1.2), (wx - 0.3, cr - 0.05, z0 + rope_top), 0.02, ('#c8b080', 0.25), 'rope', verts=4)
    k.blob(wx + 0.75, cr - 0.4, z0 + 0.3, 0.28, 0.25, 0.3, ('#7a786a', 0.35), 'counterweight', segs=10)
    for i in range(5):
        k.tube((wx + 0.75 + math.cos(i * 1.3) * 0.26, cr - 0.4, z0 + 0.1), (wx + 0.75, cr - 0.4, z0 + 1.0), 0.008, ('#c8b080', 0.25), 'rope', verts=3)
    k.tube((wx + 0.75, cr - 0.4, z0 + 1.0), (wx + 0.6, cr - 0.4, z0 + rope_top), 0.015, ('#c8b080', 0.25), 'rope', verts=4)
    k.solid(wx - 0.6, cr - 0.5, wx + 1.1, cr + 0.2)
    return int(cx), int(cr)


def spiral_stair(k, cx, cr, rad, z0, z1, turns=1.2, a0=0.5, width=0.75, step=0.18):
    """Steps spiralling up round a giant trunk, each a slab of pale wood on a bracket into the bark, a rope rail on
    the outside on carved posts, a leaf lantern now and then."""
    n = int((z1 - z0) / step)
    for i in range(n):
        a = a0 + turns * math.tau * i / n
        z = z0 + i * step
        if math.sin(a) < -0.55:                                             # round the back: hidden by the trunk
            continue
        ri, ro = rad + 0.02, rad + width
        pts = []
        for (rr, aa) in ((ri, a - 0.09), (ro, a - 0.07), (ro, a + 0.07), (ri, a + 0.09)):
            pts.append((cx + math.cos(aa) * rr, cr + math.sin(aa) * rr * 0.92, z))
        k.poly(pts, (shade(ELFWOOD, 0.9 + 0.1 * (i % 2)), 0.25), 'stair_step')
        k.poly([(p[0], p[1], p[2] - 0.06) for p in pts], (shade(ELFWOOD, 0.7), 0.3), 'stair_step')
        if i % 3 == 0:
            px, pr = cx + math.cos(a) * (ro - 0.05), cr + math.sin(a) * (ro - 0.05) * 0.92
            k.cyl(px, pr, z, z + 0.75, 0.03, (ELFWOOD_D, 0.25), 'rail_post', verts=5)
            k.tube((cx + math.cos(a) * rad * 0.9, cr + math.sin(a) * rad * 0.83, z - 0.5), (px, pr, z - 0.05), 0.03, (ELFWOOD_D, 0.25), 'bracket', verts=4)
            if i % 12 == 6:
                k.cyl(px, pr, z + 0.5, z + 0.75, 0.005, (GOLD, 0.25), 'chain', verts=4)
                leaf_lantern(k, px, pr, z + 0.42, s=0.08, energy=2.0)
    m = int(n / 3)
    for i in range(m):
        aa, ab = a0 + turns * math.tau * (i * 3) / n, a0 + turns * math.tau * (i * 3 + 3) / n
        if math.sin(aa) < -0.55 or math.sin(ab) < -0.55:
            continue
        za, zb = z0 + i * 3 * step + 0.72, z0 + (i * 3 + 3) * step + 0.72
        ro = rad + width - 0.05
        k.tube((cx + math.cos(aa) * ro, cr + math.sin(aa) * ro * 0.92, za), (cx + math.cos(ab) * ro, cr + math.sin(ab) * ro * 0.92, zb), 0.015,
               ('#c8b080', 0.25), 'rope', verts=4)


def rope_fence(k, L, pts, h=0.7, every=1.6, col='#c8b080'):
    """Posts and a sagging rope along a line of (x, r) points."""
    posts = []
    for a, b in zip(pts, pts[1:]):
        Ln = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, int(round(Ln / every)))
        for i in range(n):
            t = i / n
            posts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    posts.append(pts[-1])
    for (x, r) in posts:
        z0 = L.z(x, r)
        carved_post(k, x, r, z0, z0 + h, rad=0.045, leaf=False)
    for p, q in zip(posts, posts[1:]):
        za, zb = L.z(*p) + h - 0.1, L.z(*q) + h - 0.1
        for i in range(6):
            t0, t1 = i / 6, (i + 1) / 6
            k.tube((p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0, za + (zb - za) * t0 - 0.12 * math.sin(math.pi * t0)),
                   (p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1, za + (zb - za) * t1 - 0.12 * math.sin(math.pi * t1)), 0.014, (col, 0.25), 'rope', verts=4)
    return posts


def hay_target(k, L, x, r, s=0.45):
    """A straw boss on a stand: a fixed mark."""
    z0 = L.z(x, r)
    for dx in (-0.25, 0.25):
        k.tube((x + dx, r + 0.2, z0), (x + dx * 0.6, r - 0.05, z0 + 1.0), 0.035, (ELFWOOD_D, 0.25), 'stand', verts=5)
    k.cyl_y(x, r - 0.04, r + 0.08, z0 + 0.95, s, s, ('#d8c070', 0.35), 'target', verts=20)
    for (rr, col) in ((s * 0.8, '#e8dcc0'), (s * 0.6, '#3a6a3a'), (s * 0.4, '#e8dcc0'), (s * 0.24, '#a83a2a'), (s * 0.1, '#f0c040')):
        k.cyl_y(x, r + 0.08, r + 0.09, z0 + 0.95, rr, rr, (col, 0.3), 'target_face', verts=20)


def target_rail(k, L, x0, x1, r):
    """A rail of two poles low over the grass that a sled-borne mark runs along (js/bows.js draws the mark)."""
    for dr in (-0.12, 0.12):
        za, zb = L.z(x0, r) + 0.12, L.z(x1, r) + 0.12
        k.tube((x0, r + dr, za), (x1, r + dr, zb), 0.03, (ELFWOOD_D, 0.25), 'rail', verts=5)
    for x in (x0, (x0 + x1) / 2, x1):
        k.box(x - 0.06, r - 0.2, L.z(x, r), x + 0.06, r + 0.2, L.z(x, r) + 0.12, (ELFWOOD_D, 0.25), 'rail_post')
    for x in (x0, x1):                                                        # a pulley post at each end
        k.cyl(x, r, L.z(x, r), L.z(x, r) + 0.55, 0.05, (ELFWOOD, 0.25), 'post', verts=6)
        k.cyl_y(x, r - 0.06, r + 0.06, L.z(x, r) + 0.5, 0.09, 0.09, (GOLD, 0.25), 'pulley', verts=10)


def pennant_pole(k, L, x, r, h=2.4):
    z0 = L.z(x, r)
    k.cyl(x, r, z0, z0 + h, 0.04, (ELFWOOD, 0.25), 'pole', verts=8)
    k.sphere(x, r, z0 + h + 0.05, 0.06, 0.06, (GOLD, 0.25), 'pole_knob', segs=8)
    k.solid_post(x, r)


def bench(k, L, x0, x1, r, h=0.42):
    """A bench of a split log on two stumps."""
    z0 = L.z((x0 + x1) / 2, r)
    k.cyl_x(x0, x1, r, z0 + h - 0.06, 0.14, 0.08, (BARK, 0.3), 'bench', verts=10)
    k.box(x0 + 0.02, r - 0.12, z0 + h - 0.02, x1 - 0.02, r + 0.12, z0 + h, (ELFWOOD_L, 0.25), 'bench')
    for x in (x0 + 0.25, x1 - 0.25):
        k.cyl(x, r, z0, z0 + h - 0.1, 0.13, (BARK, 0.3), 'stump', verts=10)


def elf_oak(k, L, cx, cr, h=4.2, rad=0.42, tone=None, seed=0):
    """A middling tree of the wood (not a giant): a ridged trunk with a root flare and a clumpy crown of a few lobes —
    the brook's crowns, smaller. Fills the spaces between the giants and the south of a place."""
    rng = k.rng
    z0 = L.z(cx, cr)
    ancient_trunk(k, L, cx, cr, rad, h * 0.75, seed=seed, ivy=1, roots=6)
    tone = tone or shade(LEAF, rng.uniform(0.9, 1.12))
    with k.foliage('leaf'):
        for (dx, dr, dz, s) in ((0, 0, 0, 1.0), (-0.75, 0.15, -0.35, 0.7), (0.8, 0.1, -0.3, 0.72), (0.2, -0.5, 0.2, 0.7), (-0.2, 0.45, -0.5, 0.6)):
            rx = 1.1 * s * (h / 4.2)
            W.leafy_crown(k, cx + dx * (h / 4.2), cr + dr * (h / 4.2), z0 + h + dz, rx, rx * 0.85, rx * 0.65, shade(tone, rng.uniform(0.9, 1.08)),
                          n=max(30, int(rx * rx * 40)), part='canopy')


def gate_arch(k, L, x, r0, r1, h=2.8, col=ELFWOOD):
    """A gateway across a path running east-west at x: two carved posts either side, a bough of pale wood arched
    between, leaves and lanterns hung from it."""
    za, zb = L.z(x, r0), L.z(x, r1)
    carved_post(k, x, r0, za, za + h, rad=0.1, col=col)
    carved_post(k, x, r1, zb, zb + h, rad=0.1, col=col)
    pts = []
    for i in range(13):
        t = i / 12
        pts.append((x, r0 + (r1 - r0) * t, za + (zb - za) * t + h + 0.55 * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.09, (col, 0.25), 'arch', verts=8)
    with k.foliage('leaf'):
        for p in pts[1:-1]:
            for _ in range(2):
                k.blob(p[0] + k.rng.uniform(-0.12, 0.12), p[1] + k.rng.uniform(-0.1, 0.1), p[2] + 0.06, 0.12, 0.09, 0.08,
                       (shade('#4a8038', k.rng.uniform(0.85, 1.15)), 0.25), 'ivy', rot=(0, 0, k.rng.uniform(0, 360)), segs=6)
    for t in (0.3, 0.7):
        p = pts[int(t * 12)]
        k.cyl(p[0], p[1], p[2] - 0.35, p[2], 0.005, (GOLD, 0.25), 'chain', verts=4)
        leaf_lantern(k, p[0], p[1], p[2] - 0.45, s=0.1, energy=4.0)
    k.solid_post(x, r0)
    k.solid_post(x, r1)


def pavilion(k, L, x0, x1, r0, r1, h=2.2, cloth=CLOTH['green'], cloth2=CLOTH['gold']):
    """An open pavilion: four carved posts and a leaf-cut cloth roof, a bench under it."""
    z0 = L.z((x0 + x1) / 2, (r0 + r1) / 2)
    for x in (x0, x1):
        for r in (r0, r1):
            carved_post(k, x, r, z0, z0 + h)
    xm = (x0 + x1) / 2
    for side in (-1, 1):                                                   # a ridged roof, cut into leaves along both eaves
        xa, xb = (x0 - 0.3, xm) if side < 0 else (xm, x1 + 0.3)
        n = max(2, int((x1 - x0) / 0.5))
        for i in range(n):
            ra, rb = r0 - 0.3 + (r1 - r0 + 0.6) * i / n, r0 - 0.3 + (r1 - r0 + 0.6) * (i + 1) / n
            c = cloth2 if i % 2 else cloth
            hi, lo = (xb, xa) if side < 0 else (xa, xb)
            k.poly([(hi, ra, z0 + h + 0.55), (hi, rb, z0 + h + 0.55), (lo, rb, z0 + h - 0.05), (lo, ra, z0 + h - 0.05)], (c, 0.3), 'roof_cloth')
    bench(k, L, x0 + 0.3, x1 - 0.3, (r0 + r1) / 2)
    k.cyl(xm, (r0 + r1) / 2, z0 + h + 0.1, z0 + h + 0.5, 0.005, (GOLD, 0.25), 'chain', verts=4)
    leaf_lantern(k, xm, (r0 + r1) / 2, z0 + h + 0.0, s=0.1, energy=5.0)
    k.solid(x0, (r0 + r1) / 2 - 0.2, x1, (r0 + r1) / 2 + 0.2)


def flower_bed(k, L, cx, cr, rx, ry, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8', '#e88a5a'), n=None):
    """A bed of flowers edged with mossy stones: low leafy mounds and blooms in clumps of one colour."""
    rng = k.rng
    m = int(2 * math.pi * max(rx, ry) / 0.32)
    for i in range(m):
        a = i / m * math.tau
        x, r = cx + math.cos(a) * rx, cr + math.sin(a) * ry
        s = rng.uniform(0.09, 0.14)
        k.rock(x, r, L.z(x, r) + s * 0.3, s, s * 0.8, s * 0.6, (shade(STONE, rng.uniform(0.85, 1.12)), 0.3), part='bed_stone', segs=7)
    with k.foliage('leaf'):
        for _ in range(int(rx * ry * 6) + 3):
            a, d = rng.uniform(0, math.tau), math.sqrt(rng.random()) * 0.8
            x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
            s = rng.uniform(0.14, 0.24)
            k.blob(x, r, L.z(x, r) + s * 0.4, s, s * 0.85, s * 0.6, (shade('#4a7a34', rng.uniform(0.85, 1.15)), 0.3), 'bed_leaves', segs=8)
    for _ in range(n or int(rx * ry * 10) + 4):
        a, d = rng.uniform(0, math.tau), math.sqrt(rng.random()) * 0.85
        x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
        col = rng.choice(cols)
        for j in range(rng.randint(3, 6)):
            xx, rr = x + rng.uniform(-0.1, 0.1), r + rng.uniform(-0.08, 0.08)
            z = L.z(xx, rr) + rng.uniform(0.16, 0.32)
            k.sphere(xx, rr, z, 0.045, 0.04, col, 'flower', segs=6)
    k.solid(cx - rx * 0.8, cr - ry * 0.7, cx + rx * 0.8, cr + ry * 0.7)


def barrel(k, L, x, r, h=0.62, rad=0.24, col='#8a6a40'):
    z0 = L.z(x, r)
    k.cyl(x, r, z0, z0 + h, rad, (col, 0.3), 'barrel', verts=14)
    for zz in (0.1, h - 0.14):
        k.cyl(x, r, z0 + zz, z0 + zz + 0.05, rad + 0.012, ('#3a3430', 0.2), 'barrel_band', verts=14)
    k.cyl(x, r, z0 + h - 0.01, z0 + h + 0.005, rad * 0.9, (shade(col, 1.15), 0.3), 'barrel_top', verts=14)


def crate(k, L, x, r, s=0.36, col='#a07a48', goods_=None):
    z0 = L.z(x, r)
    k.box(x - s / 2, r - s / 2, z0, x + s / 2, r + s / 2, z0 + s * 0.8, (col, 0.3), 'crate')
    for d in (-s / 2, s / 2 - 0.04):
        k.box(x - s / 2 - 0.01, r + d, z0 + 0.04, x + s / 2 + 0.01, r + d + 0.04, z0 + s * 0.8 - 0.04, (shade(col, 0.75), 0.3), 'crate_slat')
    if goods_:
        goods(k, x - s / 2, x + s / 2, r, z0 + s * 0.7, goods_)


def clutter(k, L, x, r, kind='market'):
    """A little heap of the city's goods: barrels, crates, a basket, sacks."""
    rng = k.rng
    barrel(k, L, x, r)
    if rng.random() < 0.7:
        barrel(k, L, x + 0.45, r + 0.1, h=0.55, col='#7a5a38')
    crate(k, L, x - 0.15, r + 0.45, goods_='fruit' if kind == 'market' else None)
    if rng.random() < 0.6:
        z0 = L.z(x + 0.4, r + 0.55)
        k.blob(x + 0.45, r + 0.55, z0 + 0.15, 0.2, 0.16, 0.17, ('#c8b48a', 0.35), 'sack', segs=9)
    k.solid(x - 0.4, r - 0.2, x + 0.7, r + 0.7)


# ---- the canopy (the Boughs): platforms round the trunks, rope bridges, homes in the trees --------------------------------
def column_trunk(k, cx, cr, rad, z0, z1, seed=0, moss=True):
    """A giant's trunk passing through the canopy: from far below (z0) to far above (z1), ridged, mossy on its near side,
    a bough or two leaving it. (Walkable platforms are at z = 0.)"""
    rng = k.rng
    rings = []
    n = 26
    lobes = [(rng.uniform(0, math.tau), rng.uniform(0.06, 0.14)) for _ in range(4)]
    for z in (z0, z0 + (0 - z0) * 0.5, -1.0, 0.0, 1.5, 3.0, z1):
        ring = []
        for i in range(n):
            a = i / n * math.tau
            bump = sum(amp * math.cos(3 * (a - ph)) for ph, amp in lobes)
            rr = rad * (1 + bump + 0.04 * (noise(a * 2, z, 1.3, seed) - 0.5))
            ring.append((cx + math.cos(a) * rr, cr + math.sin(a) * rr * 0.92, z))
        rings.append(ring)
    k.loft(rings, (BARK, 0.38), 'giant_trunk', closed=True)
    k.poly([(p[0], p[1], z1) for p in rings[-1]], (shade(BARK, 0.8), 0.38), 'giant_trunk')     # the top closed (a crown sits on it)
    for i in range(int(12 + rad * 6)):
        a = i / (12 + rad * 6) * math.tau + rng.uniform(-0.06, 0.06)
        if math.sin(a) < -0.25:
            continue
        x, r = cx + math.cos(a) * rad * 1.02, cr + math.sin(a) * rad * 0.94
        k.tube((x, r, z0), (x + rng.uniform(-0.08, 0.08), r, z1), rng.uniform(0.04, 0.08), (shade(BARK, rng.choice((0.72, 0.82, 1.12, 1.22))), 0.3),
               'bark_ridge', verts=5, smooth=False)
    if moss:
        for i in range(8):
            a = rng.uniform(math.pi * 0.2, math.pi * 0.8)
            z = rng.uniform(z0 * 0.4, z1 * 0.6)
            k.blob(cx + math.cos(a) * rad * 1.04, cr + math.sin(a) * rad, z, rng.uniform(0.18, 0.32), 0.1, rng.uniform(0.3, 0.6),
                   (shade(MOSS, rng.uniform(0.85, 1.15)), 0.4), 'trunk_moss', segs=8)
        with k.foliage('leaf'):
            a = rng.uniform(math.pi * 0.3, math.pi * 0.7)
            for j in range(24):
                z = z0 * 0.3 + j * 0.3
                aa = a + 0.12 * math.sin(j * 0.9)
                k.blob(cx + math.cos(aa) * rad * 1.06, cr + math.sin(aa) * rad * 0.98, z, 0.09, 0.05, 0.08,
                       (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25), 'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)


def ring_platform(k, cx, cr, r_in, r_out, z=0.0, a0=0.0, a1=None, rail=True, gaps=()):
    """A platform of planks round a trunk (an annulus, or an arc from a0 to a1), brackets under it into the bark, a rail
    round the outside with gaps where bridges and stairs leave (gaps: angles). Returns the planks' (angle → edge) for
    placing. Planks run radially, a pixel's dark joint between."""
    rng = k.rng
    a1 = math.tau if a1 is None else a1
    full = abs(a1 - a0 - math.tau) < 1e-6
    n = max(12, int((a1 - a0) * r_out / 0.32))
    for i in range(n):
        aa, ab = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        gap = 0.012 / r_out
        pts = [(cx + math.cos(a) * rr, cr + math.sin(a) * rr * 0.92, z) for (a, rr) in ((aa + gap, r_in), (aa + gap, r_out), (ab - gap, r_out), (ab - gap, r_in))]
        k.poly(pts, (shade(ELFWOOD, rng.uniform(0.86, 1.08)), 0.25), 'floor_plank')
    k.cyl(cx, cr, z - 0.16, z - 0.01, r_out - 0.02, (ELFWOOD_D, 0.3), 'deck_under', verts=max(24, n), ry=(r_out - 0.02) * 0.92) if full else None
    if not full:                                                            # an arc: its underside as quads
        for i in range(n):
            aa, ab = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
            k.poly([(cx + math.cos(a) * rr, cr + math.sin(a) * rr * 0.92, z - 0.15) for (a, rr) in ((aa, r_in), (aa, r_out), (ab, r_out), (ab, r_in))],
                   (ELFWOOD_D, 0.3), 'deck_under')
    m = int((a1 - a0) / math.tau * 10) + 2                                  # brackets into the bark
    for i in range(m):
        a = a0 + (a1 - a0) * (i + 0.5) / m
        if math.sin(a) < -0.4:
            continue
        k.tube((cx + math.cos(a) * r_in, cr + math.sin(a) * r_in * 0.92, z - 1.4), (cx + math.cos(a) * (r_out - 0.2), cr + math.sin(a) * (r_out - 0.2) * 0.92, z - 0.12),
               0.06, (ELFWOOD_D, 0.3), 'bracket', verts=6)
    if rail:
        m = max(8, int((a1 - a0) * r_out / 0.55))
        for i in range(m + (0 if full else 1)):
            a = a0 + (a1 - a0) * i / m
            if any(abs(((a - g + math.pi) % math.tau) - math.pi) < 0.6 / r_out for g in gaps):
                continue
            x, r = cx + math.cos(a) * (r_out - 0.06), cr + math.sin(a) * (r_out - 0.06) * 0.92
            k.cyl(x, r, z, z + 0.72, 0.03, (ELFWOOD_D, 0.25), 'rail_post', verts=5)
            an = a0 + (a1 - a0) * (i + 1) / m
            if i < m and not any(abs(((ab_ - g + math.pi) % math.tau) - math.pi) < 0.6 / r_out for g in gaps for ab_ in (an, (a + an) / 2)):
                k.tube((x, r, z + 0.7), (cx + math.cos(an) * (r_out - 0.06), cr + math.sin(an) * (r_out - 0.06) * 0.92, z + 0.7), 0.025, (ELFWOOD, 0.25), 'rail', verts=5)


def deck(k, x0, r0, x1, r1, z=0.0, rail_sides='', posts=True, tone=ELFWOOD):
    """A rectangular deck of planks (running along x), beams under it; a rail on the sides named in rail_sides
    ('n', 's', 'e', 'w')."""
    rng = k.rng
    r = r0
    while r < r1 - 0.01:
        w = min(0.3, r1 - r)
        k.box(x0, r + 0.01, z - 0.06, x1, r + w - 0.01, z, (shade(tone, rng.uniform(0.86, 1.08)), 0.25), 'floor_plank')
        r += w
    k.box(x0 + 0.05, r0 + 0.05, z - 0.22, x1 - 0.05, r1 - 0.05, z - 0.06, (ELFWOOD_D, 0.3), 'deck_under')
    for side in rail_sides:
        if side in 'ns':
            rr = r0 + 0.05 if side == 'n' else r1 - 0.05
            xs = [x0 + 0.05 + i * (x1 - x0 - 0.1) / max(1, int((x1 - x0) / 0.6)) for i in range(int((x1 - x0) / 0.6) + 1)]
            for x in xs:
                k.cyl(x, rr, z, z + 0.72, 0.03, (ELFWOOD_D, 0.25), 'rail_post', verts=5)
            k.tube((x0 + 0.05, rr, z + 0.7), (x1 - 0.05, rr, z + 0.7), 0.025, (tone, 0.25), 'rail', verts=5)
        else:
            xx = x0 + 0.05 if side == 'w' else x1 - 0.05
            rs = [r0 + 0.05 + i * (r1 - r0 - 0.1) / max(1, int((r1 - r0) / 0.6)) for i in range(int((r1 - r0) / 0.6) + 1)]
            for rr in rs:
                k.cyl(xx, rr, z, z + 0.72, 0.03, (ELFWOOD_D, 0.25), 'rail_post', verts=5)
            k.tube((xx, r0 + 0.05, z + 0.7), (xx, r1 - 0.05, z + 0.7), 0.025, (tone, 0.25), 'rail', verts=5)


def rope_bridge(k, a, b, width=1.0, z=0.0, sag=0.18):
    """A bridge of planks hung on two ropes from a to b ((x, r) points at deck height z), sagging a little in the middle,
    hand ropes either side with uprights, lanterns at the ends."""
    rng = k.rng
    ax, ar = a
    bx, br = b
    Ln = math.hypot(bx - ax, br - ar)
    ux, ur = (bx - ax) / Ln, (br - ar) / Ln
    nx, nr = -ur, ux
    n = max(3, int(Ln / 0.24))
    hw = width / 2
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n - 0.25 / n
        z0 = z - sag * math.sin(math.pi * t0) * 4 * 0.25
        za, zb = z - sag * math.sin(math.pi * t0), z - sag * math.sin(math.pi * t1)
        pa, pb = (ax + (bx - ax) * t0, ar + (br - ar) * t0), (ax + (bx - ax) * t1, ar + (br - ar) * t1)
        k.poly([(pa[0] + nx * hw, pa[1] + nr * hw, za), (pb[0] + nx * hw, pb[1] + nr * hw, zb), (pb[0] - nx * hw, pb[1] - nr * hw, zb), (pa[0] - nx * hw, pa[1] - nr * hw, za)],
               (shade(ELFWOOD, rng.uniform(0.82, 1.08)), 0.25), 'floor_bridge')
        k.poly([(pa[0] + nx * hw, pa[1] + nr * hw, za - 0.05), (pb[0] + nx * hw, pb[1] + nr * hw, zb - 0.05), (pb[0] - nx * hw, pb[1] - nr * hw, zb - 0.05), (pa[0] - nx * hw, pa[1] - nr * hw, za - 0.05)],
               (ELFWOOD_D, 0.3), 'bridge_under')
    m = max(2, int(Ln / 0.8))
    for side in (-1, 1):
        prev = None
        for i in range(m + 1):
            t = i / m
            x, r = ax + (bx - ax) * t + nx * hw * side, ar + (br - ar) * t + nr * hw * side
            zz = z - sag * math.sin(math.pi * t)
            k.cyl(x, r, zz, zz + 0.72, 0.022, (ELFWOOD_D, 0.25), 'rail_post', verts=5)
            top = (x, r, zz + 0.7 + 0.12 * math.sin(math.pi * t) * 0)
            if prev:
                k.tube(prev, top, 0.018, ('#c8b080', 0.25), 'rope', verts=4)
            prev = top
            if 0 < i < m:                                                    # a rope down from the hand rope to the deck edge
                k.tube(top, (x, r, zz + 0.02), 0.008, ('#c8b080', 0.25), 'rope', verts=3)
        for i in range(n // 2):                                              # the ropes under the planks
            t0, t1 = i / (n // 2), (i + 1) / (n // 2)
            k.tube((ax + (bx - ax) * t0 + nx * hw * 0.85 * side, ar + (br - ar) * t0 + nr * hw * 0.85 * side, z - sag * math.sin(math.pi * t0) - 0.06),
                   (ax + (bx - ax) * t1 + nx * hw * 0.85 * side, ar + (br - ar) * t1 + nr * hw * 0.85 * side, z - sag * math.sin(math.pi * t1) - 0.06),
                   0.02, ('#a89060', 0.25), 'rope', verts=4)


def pod_house(k, cx, cr, z=0.0, rad=0.85, h=1.4, roof='#5a8a3a', door_ang=math.pi / 2, wall=ELFWOOD_L, lit=True, flowers_=True):
    """An elven home on a platform: a round wall of pale woven wood, a round door, round windows, a conical roof of
    leaf shingles with a curled tip, a flower box."""
    rng = k.rng
    k.cyl(cx, cr, z, z + h, rad, (wall, 0.25), 'pod_wall', verts=24)
    for i in range(int(h / 0.18)):                                        # the weave: bands a shade apart
        zz = z + 0.08 + i * 0.18
        k.cyl(cx, cr, zz, zz + 0.04, rad + 0.01, (shade(wall, 0.85), 0.25), 'pod_band', verts=24)
    # the roof: a dark deck under courses of flat leaf shingles laid round a cone, each course lapping the one below with a
    # pixel of shadow under its butt, a lighter eave band, the tip curled over (a roof that reads as a roof, not a bush)
    RH, RO = 1.0, rad + 0.32
    k.cone(cx, cr, z + h - 0.02, z + h + RH, RO - 0.04, 0.03, (shade(roof, 0.5), 0.3), 'roof_deck', verts=24)
    tones = [shade(roof, f) for f in (0.86, 1.0, 1.12)]
    beds = {t: [] for t in tones}
    courses = 7
    for c in range(courses):
        t0, t1 = c / courses, min(1.0, (c + 1.35) / courses)
        ra, rb = RO * (1 - t0 * 0.94), RO * (1 - t1 * 0.94)
        za, zb = z + h + t0 * RH, z + h + t1 * RH
        m = max(6, int(ra * 13))
        for i in range(m):
            a0 = (i + (c % 2) * 0.5) / m * math.tau
            a1 = a0 + math.tau / m * 1.08
            if math.sin((a0 + a1) / 2) < -0.7:
                continue
            col = tones[rng.randrange(3)] if rng.random() > 0.1 else tones[0]
            lift = 0.012
            q = ((cx + math.cos(a0) * ra, cr + math.sin(a0) * ra * 0.92, za + lift), (cx + math.cos(a1) * ra, cr + math.sin(a1) * ra * 0.92, za + lift),
                 (cx + math.cos(a1) * rb, cr + math.sin(a1) * rb * 0.92, zb + lift), (cx + math.cos(a0) * rb, cr + math.sin(a0) * rb * 0.92, zb + lift))
            beds[col].append(q)
    for col, qs in beds.items():
        if qs:
            k.quads(qs, (col, 0.25), 'roof_shingle')
    k.cyl(cx, cr, z + h - 0.06, z + h + 0.04, RO + 0.02, (GOLD, 0.25), 'roof_eave', verts=28)            # a gold-trimmed eave
    k.cone(cx, cr, z + h + RH * 0.5, z + h + RH + 0.04, RO * 0.52, 0.03, (shade(roof, 1.04), 0.25), 'roof_cap', verts=20)   # the top course closed over
    k.tube((cx, cr, z + h + RH - 0.05), (cx + 0.06, cr, z + h + RH + 0.3), 0.05, (shade(roof, 0.8), 0.3), 'roof_tip', rb=0.02, verts=6)
    k.tube((cx + 0.06, cr, z + h + RH + 0.3), (cx + 0.22, cr, z + h + RH + 0.36), 0.03, (shade(roof, 0.8), 0.3), 'roof_tip', rb=0.01, verts=6)
    # the door and windows (on the side toward you)
    dx, dr = cx + math.cos(door_ang) * rad, cr + math.sin(door_ang) * rad * 0.92
    k.box(dx - 0.28, dr - 0.1, z, dx + 0.28, dr + 0.04, z + 0.75, ('#5a3a24', 0.3), 'door')
    k.cyl_y(dx, dr - 0.1, dr + 0.04, z + 0.75, 0.28, 0.28, ('#5a3a24', 0.3), 'door', verts=14)
    k.sphere(dx + 0.17, dr + 0.06, z + 0.45, 0.035, 0.035, (GOLD, 0.25), 'door_knob', segs=6)
    for wa in (door_ang - 0.85, door_ang + 0.85):
        wx, wr = cx + math.cos(wa) * rad, cr + math.sin(wa) * rad * 0.92
        if math.sin(wa) < 0:
            continue
        k.cyl_y(wx, wr - 0.06, wr + 0.04, z + 0.85, 0.2, 0.2, (ELFWOOD_D, 0.3), 'window_frame', verts=12)
        k.cyl_y(wx, wr - 0.04, wr + 0.05, z + 0.85, 0.14, 0.14, '#ffd890' if lit else '#2a3a3a', 'window_light', emit=('#ffc870', 1.1) if lit else None, verts=12)
        if flowers_:
            k.box(wx - 0.22, wr + 0.02, z + 0.58, wx + 0.22, wr + 0.16, z + 0.66, ('#6a4a2a', 0.3), 'flower_box')
            for j in range(5):
                k.sphere(wx - 0.18 + j * 0.09, wr + 0.1, z + 0.72, 0.04, 0.035, rng.choice(('#f0b0c8', '#f0f0f0', '#c8a8f0', '#f0d070')), 'flower', segs=5)
    if lit:
        k.point_light(dx, dr + 0.4, z + 0.8, '#ffc870', 4.0, radius=0.2)
    k.solid(cx - rad, cr - rad * 0.92, cx + rad, cr + rad * 0.92)
    return (dx, dr)


def hollow_bough(k, x0, x1, cr, zc, rad, door_x, tavern='THE HOLLOW BOUGH'):
    """A bough so great it's a building: a huge branch lying along x at height zc, hollowed — a round door glowing on
    its near side, round windows, a sign of a gold mug, a balcony; moss and ferns along its top."""
    rng = k.rng
    rings = []
    n = 24
    for i in range(10):
        t = i / 9
        x = x0 + (x1 - x0) * t
        rr = rad * (1.15 - 0.4 * t)
        ring = []
        for j in range(n):
            a = j / n * math.tau
            bump = 1 + 0.06 * math.cos(3 * a + i) + 0.03 * noise(x, a, 1.0, 7)
            ring.append((x, cr + math.cos(a) * rr * bump * 0.92, zc + math.sin(a) * rr * bump))
        rings.append(ring)
    k.loft(rings, (BARK, 0.38), 'bough', closed=True)
    for i in range(18):                                                     # ridges along the bark
        a = rng.uniform(0.15, math.pi - 0.15)
        k.tube((x0 + 0.2, cr + math.cos(a) * rad * 1.1, zc + math.sin(a) * rad * 1.1), (x1 - 0.3, cr + math.cos(a) * rad * 0.75, zc + math.sin(a) * rad * 0.75),
               0.04, (shade(BARK, rng.choice((0.75, 1.2))), 0.3), 'bark_ridge', verts=4, smooth=False)
    with k.foliage('leaf'):
        for i in range(int((x1 - x0) * 3)):
            x = rng.uniform(x0 + 0.3, x1 - 0.4)
            t = (x - x0) / (x1 - x0)
            k.blob(x, cr - 0.1, zc + rad * (1.15 - 0.4 * t) - 0.02, 0.3, 0.22, 0.12, (shade(MOSS_L, rng.uniform(0.85, 1.12)), 0.4), 'bough_moss', segs=8)
    t = (door_x - x0) / (x1 - x0)
    rr = rad * (1.15 - 0.4 * t)
    face = cr + rr * 0.92
    dz = zc - rr * 0.35
    k.box(door_x - 0.55, face - 0.3, max(0.0, dz - 0.9), door_x + 0.55, face + 0.08, dz + 0.5, (BARK_D, 0.3), 'door_frame')
    k.cyl_y(door_x, face - 0.3, face + 0.08, dz + 0.5, 0.55, 0.55, (BARK_D, 0.3), 'door_frame', verts=18)
    k.box(door_x - 0.42, face - 0.25, max(0.0, dz - 0.9), door_x + 0.42, face + 0.1, dz + 0.5, '#ffd890', 'door_light', emit=('#ffc870', 1.6))
    k.cyl_y(door_x, face - 0.25, face + 0.1, dz + 0.5, 0.42, 0.42, '#ffd890', 'door_light', emit=('#ffc870', 1.6), verts=18)
    k.point_light(door_x, face + 0.8, 0.8, '#ffc870', 30, radius=0.3)
    for wx in (door_x - 1.8, door_x + 1.9, door_x + 3.4):
        if not (x0 + 0.5 < wx < x1 - 0.6):
            continue
        tt = (wx - x0) / (x1 - x0)
        r_ = rad * (1.15 - 0.4 * tt)
        k.cyl_y(wx, cr + r_ * 0.88 - 0.1, cr + r_ * 0.92 + 0.06, zc + 0.1, 0.3, 0.3, (BARK_D, 0.3), 'window_frame', verts=14)
        k.cyl_y(wx, cr + r_ * 0.88 - 0.08, cr + r_ * 0.92 + 0.08, zc + 0.1, 0.22, 0.22, '#ffd890', 'window_light', emit=('#ffc870', 1.3), verts=14)
    hanging_sign(k, door_x + 1.0, face + 0.25, dz + 0.9, icon='mug')
    return (door_x, face)


def branch_lantern(k, x, r, z, reach=1.2, ang=0.0, lit=False):
    """A high lantern at the end of a thin branch out over the drop — the kind only a fire arrow reaches. Unlit (js/bows.js
    draws the flame once one's lit), or lit."""
    bx, br = x - math.cos(ang) * reach, r - math.sin(ang) * reach * 0.6
    k.tube((bx, br, z + 0.2), (x, r, z + 0.55), 0.05, (BARK, 0.3), 'branch', rb=0.02, verts=6)
    with k.foliage('leaf'):
        for i in range(5):
            t = (i + 0.5) / 5
            k.blob(bx + (x - bx) * t, br + (r - br) * t, z + 0.25 + 0.3 * t + 0.08, 0.1, 0.07, 0.06, (shade(LEAF, k.rng.uniform(0.9, 1.2)), 0.3), 'leaves', segs=6)
    k.cyl(x, r, z + 0.18, z + 0.55, 0.005, (GOLD, 0.25), 'chain', verts=4)
    if lit:
        leaf_lantern(k, x, r, z + 0.1, s=0.11, energy=3.0)
    else:                                                                    # dark: the leaves round cold glass
        k.sphere(x, r, z + 0.1, 0.1, 0.12, ('#3a3a32', 0.3), 'lantern_cold', segs=10)
        for i in range(5):
            a = i / 5 * math.tau
            k.blob(x + math.cos(a) * 0.08, r + math.sin(a) * 0.06, z + 0.1, 0.05, 0.035, 0.12, ('#5a8e40', 0.3), 'lantern_leaf', segs=6)
        k.cyl(x, r, z + 0.21, z + 0.25, 0.04, (GOLD, 0.25), 'lantern_cap', verts=8)


def leaf_target(k, x, r, z, rope=1.2):
    """A switch: a round leaf-shaped target hung on a rope from a branch above — hit it with an arrow and the rope
    lets something down."""
    k.tube((x - 0.6, r, z + rope + 0.15), (x + 0.4, r, z + rope + 0.35), 0.05, (BARK, 0.3), 'branch', rb=0.03, verts=6)
    k.tube((x, r, z + rope + 0.25), (x, r, z + 0.3), 0.012, ('#c8b080', 0.25), 'rope', verts=4)
    k.cyl_y(x, r - 0.03, r + 0.03, z + 0.15, 0.2, 0.2, ('#5a8e40', 0.3), 'switch_leaf', verts=16)
    k.cyl_y(x, r + 0.03, r + 0.04, z + 0.15, 0.12, 0.12, ('#d0a040', 0.25), 'switch_mark', verts=14)
    k.cyl_y(x, r + 0.04, r + 0.05, z + 0.15, 0.05, 0.05, ('#a83a2a', 0.3), 'switch_mark', verts=10)


def zip_post(k, x, r, z=0.0):
    """Where a zip line starts or ends: a stout post with an iron ring, a coil of rope at its foot."""
    k.cyl(x, r, z, z + 1.7, 0.08, (ELFWOOD_D, 0.25), 'zip_post', verts=8)
    k.cyl_y(x, r + 0.05, r + 0.11, z + 1.45, 0.11, 0.11, ('#3a3430', 0.2), 'zip_ring', verts=12)
    k.cyl(x + 0.25, r + 0.15, z, z + 0.12, 0.16, ('#c8b080', 0.3), 'rope_coil', verts=14)
    k.solid_post(x, r)


def anchor_mark(k, cx, cr, rad, z=1.4):
    """An anchor tree's mark: an iron ring set in the bark facing you, a ring of gold leaves painted round it."""
    x, r = cx, cr + rad * 0.95
    k.cyl_y(x, r - 0.05, r + 0.08, z, 0.16, 0.16, ('#3a3430', 0.2), 'anchor_ring', verts=14)
    for i in range(10):
        a = i / 10 * math.tau
        k.blob(x + math.cos(a) * 0.3, r + 0.06, z + math.sin(a) * 0.3, 0.05, 0.02, 0.07, (GOLD, 0.25), 'anchor_leaf', rot=(0, math.degrees(a), 0), segs=5)


def rope_ladder_rolled(k, x, r, z):
    """A rope ladder rolled up and lashed under a platform's edge (a switch lets it down)."""
    k.cyl_x(x - 0.3, x + 0.3, r, z, 0.12, 0.12, ('#c8b080', 0.3), 'ladder_roll', verts=12)
    for dx in (-0.2, 0.2):
        k.cyl_x(x + dx - 0.02, x + dx + 0.02, r, z, 0.13, 0.13, ('#6a4a2a', 0.3), 'ladder_lash', verts=10)


def lower_canopy(k, x0, r0, x1, r1, z=-4.0, n=40, seed=0):
    """What you see far below the walkways: lower boughs and leaf masses fading down into the green gloom."""
    rng = k.rng
    with k.foliage('leaf'):
        for _ in range(n):
            x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
            zz = z + rng.uniform(-3.0, 1.0)
            s = rng.uniform(0.8, 1.6)
            W.leafy_crown(k, x, r, zz, 1.3 * s, 1.1 * s, 0.8 * s, shade(LEAF, rng.uniform(0.55, 0.85)), n=int(28 * s * s), part='canopy_low', sprigs=False)
