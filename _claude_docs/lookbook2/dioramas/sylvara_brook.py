"""Look Book 2 diorama: Elderglade Brook — a purpose-made corner of Sylvara in the Bridge's Blender kit (scenekit),
composed like Look Book 1's code-drawn glade: ancient trees whose canopies close over the top of the view, flared
mossy roots, a brook winding between real banks with a little cascade over a log and stepping stones, ferns,
mushrooms, mossy boulders, wildflowers, a fallen log, and an elven door in the right-hand trunk with lanterns; glowing
spores and mushrooms for the night.

  tools/render.sh dioramas/sylvara_brook.py renders/sylvara-brook --ts 32,48 --crop main 1 0.4 16 8.84375 --samples 24

Tile units: x = column, r = row (toward the camera), z = height. 17 × 11 tiles: the 15 × 8.4375 frame plus a margin.
"""
import math
import os
import sys

sys.path.insert(0, os.environ.get('BRIDGE_ART', '/home/user/becknology/tools/bridge-art'))
import bmesh  # noqa: E402
import bpy  # noqa: E402
from scenekit import Kit, S as SK, shade  # noqa: E402
import assets_elves as E  # noqa: E402
import assets_town as W  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/sylvara_brook'
COLS, ROWS = 17, 11
k = Kit(COLS, ROWS, margin_top=3.4, margin_bottom=0.9, seed=1717)
rng = k.rng

BARK, BARK_D, BARK_L = '#5e4430', '#3a281c', '#7a5a3e'
MOSS, MOSS_D, MOSS_L = '#4f7a34', '#365a28', '#76a048'
LEAF = '#3f6e30'
STONE = '#7e7c6c'
GLOW = '#ffcf80'
SPORE = '#86f2d6'


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


def seg_dist(x, r, a, b):
    ax, ar = a
    bx, br = b
    dx, dr = bx - ax, br - ar
    L2 = dx * dx + dr * dr or 1e-9
    t = max(0.0, min(1.0, ((x - ax) * dx + (r - ar) * dr) / L2))
    return math.hypot(x - (ax + dx * t), r - (ar + dr * t))


def line_dist(x, r, pts):
    return min(seg_dist(x, r, a, b) for a, b in zip(pts, pts[1:]))


# ---- the lie of the land --------------------------------------------------------------------------------------------
BROOK_CTRL = [(9.4, -4.5), (10.1, -1.6), (9.1, 0.5), (9.7, 1.9), (8.7, 3.1), (7.6, 4.3), (8.7, 5.6), (7.4, 6.6), (8.1, 7.6), (7.1, 9.1), (7.6, 11.0), (7.3, 13.0)]


def spline(pts, per=6):
    """Catmull-Rom through the points: a smooth, winding line."""
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(per):
            t = j / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2
                                    + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3) for c in (0, 1)))
    out.append(pts[-1])
    return out


BROOK = spline(BROOK_CTRL)
CASCADE_R = 3.05                     # the log across the brook; the water drops here
WZ_UP, WZ_DOWN = 0.14, -0.15
PATH_L = [(2.6, 11.5), (3.3, 9.7), (4.3, 8.5), (5.6, 7.75), (6.8, 7.35)]
PATH_R = [(9.3, 7.4), (10.3, 7.6), (11.9, 7.45), (13.3, 7.05), (14.1, 6.75)]
PATH_UP = [(5.6, 7.75), (5.0, 6.3), (4.4, 5.2)]           # up past the left giant's roots
TREES = [  # (x, r, trunk radius, height of the crown's centre)
    (2.4, 5.9, 1.2, 7.6),           # the old giant on the left
    (11.8, 1.3, 0.9, 6.2),          # across the brook, behind the cascade
    (13.4, 4.6, 1.3, 7.4),          # the door tree on the right
]
DOOR_TREE = TREES[2]


def width(r):
    return max(0.28, min(0.56, 0.3 + 0.032 * r)) * (1 + 0.3 * (noise(r, 0.0, 0.9, 3) - 0.5))


def water_z(r):
    return WZ_UP if r < CASCADE_R else WZ_DOWN


def base_z(x, r):
    z = 0.32 * smooth(CASCADE_R + 0.25, CASCADE_R - 0.9, r)        # the ground rises behind the cascade
    z += 0.09 * (noise(x, r, 0.55, 11) - 0.5) + 0.03 * (noise(x, r, 2.1, 12) - 0.5)
    for (tx, tr, rad, _h) in TREES:                                 # the ground swells round the old trees' feet
        d = math.hypot(x - tx, (r - tr) * 1.1)
        z += 0.2 * math.exp(-(d / (rad + 0.9)) ** 2)
    return z


def ground_z(x, r):
    d, w = line_dist(x, r, BROOK), width(r)
    b = base_z(x, r)
    t = smooth(w * 0.55, w + 0.45, d)
    bed = water_z(r) - 0.16
    return bed + (b - bed) * t


def material(x, r):
    d, w = line_dist(x, r, BROOK), width(r)
    if d < w * 0.8:
        return 'bed'
    jit = 0.12 * (noise(x, r, 3.0, 5) - 0.5)
    if d < w + 0.2 + jit:
        return 'bank_stones' if noise(x, r, 4.2, 6) > 0.62 else 'bank'
    pd = min(line_dist(x, r, PATH_L), line_dist(x, r, PATH_R), line_dist(x, r, PATH_UP) + 0.12)
    if pd < 0.4 + jit:
        return 'path'
    n = noise(x, r, 0.9, 7)
    if n > 0.74:
        return 'litter'
    if n < 0.3:
        return 'moss_dark'
    return 'moss'


GROUND_ALB = {
    'moss': ('#567a36', 0.3), 'moss_dark': ('#46672e', 0.3), 'litter': ('#6a6838', 0.38), 'path': ('#8a6c46', 0.34),
    'bank': ('#4c3c2c', 0.36), 'bank_stones': ('#5c5446', 0.42), 'bed': ('#4a4a3c', 0.3),
}


def field(x0, r0, x1, r1, step, keyfn, zfn, albedo, prefix):
    """A height-field surface: quads of `step` tiles, grouped into one mesh per material key (None: no surface)."""
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
        k._finish(o, albedo[key], prefix + '_' + key)


field(-1.5, -4.5, COLS + 1.5, ROWS + 1.5, 0.125, material, lambda x, r, key: ground_z(x, r), GROUND_ALB, 'ground')
# the water: two still surfaces, above and below the cascade
field(-1.5, -4.5, COLS + 1.5, ROWS + 1.5, 0.0625,
      lambda x, r: ('stream_water' if r < CASCADE_R else 'stream_deep') if line_dist(x, r, BROOK) < width(r) + 0.22 else None,
      lambda x, r, key: WZ_UP if key == 'stream_water' else WZ_DOWN,
      {'stream_water': ('#3a7088', 0.0), 'stream_deep': ('#2e6078', 0.0)}, 'ground')


def brook_x(r):
    """The brook's centre at row r."""
    for a, b in zip(BROOK, BROOK[1:]):
        if a[1] <= r <= b[1]:
            t = (r - a[1]) / (b[1] - a[1])
            return a[0] + (b[0] - a[0]) * t
    return BROOK[-1][0]


# ---- the old trees -------------------------------------------------------------------------------------------------
def ancient_trunk(cx, cr, rad, h, seed):
    """A gnarled trunk: rings lofted up from a buttressed foot, the bark in vertical ridges, roots flaring over the ground,
    moss and ivy climbing the side toward you."""
    n = 28
    rings = []
    lobes = [(rng.uniform(0, math.tau), rng.uniform(0.1, 0.22)) for _ in range(5)]
    for zi, z in enumerate((-0.15, 0.1, 0.35, 0.7, 1.2, 2.0, 3.0, 4.2, h)):
        f = 1 + 0.55 * math.exp(-z * 1.8)                                    # the buttressed foot
        ring = []
        for i in range(n):
            a = i / n * math.tau
            bump = sum(amp * math.cos(3 * (a - ph)) for ph, amp in lobes) * (0.5 + 0.5 * math.exp(-z * 0.6))
            rr = rad * f * (1 + bump + 0.05 * (noise(a * 2, z, 1.3, seed) - 0.5)) * (1 - 0.05 * z / h)
            ring.append((cx + math.cos(a) * rr, cr + math.sin(a) * rr * 0.92, z))
        rings.append(ring)
    k.loft(rings, (BARK, 0.38), 'giant_trunk', closed=True)
    # ridges and furrows in the bark (the side you see)
    for i in range(26):
        a = i / 26 * math.tau + rng.uniform(-0.06, 0.06)
        if math.sin(a) < -0.25:
            continue
        z0, z1 = rng.uniform(0.0, 0.6), rng.uniform(h * 0.55, h)
        x, r = cx + math.cos(a) * rad * 1.02, cr + math.sin(a) * rad * 0.94
        tone = shade(BARK, rng.choice((0.72, 0.82, 1.12, 1.22)))
        k.tube((x, r, z0), (x + rng.uniform(-0.08, 0.08), r, z1), rng.uniform(0.04, 0.08), (tone, 0.3), 'bark_ridge', verts=5, smooth=False)
    # roots: thick at the trunk, thinning as they dive into the moss, a second bend each
    for i in range(9):
        a = (i + 0.5) / 9 * math.tau + rng.uniform(-0.18, 0.18)
        L = rad + rng.uniform(0.7, 1.5)
        mid = (cx + math.cos(a) * (rad + L) * 0.55, cr + math.sin(a) * (rad + L) * 0.5, 0.32)
        start = (cx + math.cos(a) * rad * 0.8, cr + math.sin(a) * rad * 0.74, 0.85)
        end = (cx + math.cos(a) * L, cr + math.sin(a) * L * 0.92, -0.06)
        w = rng.uniform(0.2, 0.3)
        k.tube(start, mid, w, (shade(BARK, 0.92), 0.32), 'root', rb=w * 0.7, verts=9)
        k.tube(mid, end, w * 0.7, (shade(BARK, 0.86), 0.32), 'root', rb=0.05, verts=8)
        if math.sin(a) > -0.3 and rng.random() < 0.8:                         # moss along the roots you can see
            k.blob(mid[0], mid[1], mid[2] + w * 0.7, w * 1.2, w * 0.8, w * 0.35, (shade(MOSS, rng.uniform(0.9, 1.15)), 0.4), 'root_moss', segs=8)
    # moss patches and ivy strands up the trunk's near side
    for i in range(9):
        a = rng.uniform(math.pi * 0.2, math.pi * 0.8)
        z = rng.uniform(0.3, h * 0.55)
        k.blob(cx + math.cos(a) * rad * 1.04, cr + math.sin(a) * rad, z, rng.uniform(0.18, 0.32), 0.1, rng.uniform(0.2, 0.45),
               (shade(MOSS, rng.uniform(0.85, 1.15)), 0.4), 'trunk_moss', segs=8)
    for s in range(3):
        a = rng.uniform(math.pi * 0.25, math.pi * 0.75)
        with k.foliage('leaf'):
            for j in range(16):
                z = 0.2 + j * 0.24
                aa = a + 0.12 * math.sin(j * 0.9 + s)
                x, r = cx + math.cos(aa) * rad * 1.06, cr + math.sin(aa) * rad * 0.98
                k.blob(x + rng.uniform(-0.06, 0.06), r + 0.03, z, 0.09, 0.05, 0.08, (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25),
                       'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)


def crown(cx, cr, z, spread, seed):
    """A great crown of leaves: several clumpy lobes, branches reaching into them, leaves hanging off the edge."""
    lobes = [(0, -0.2, 0.0, 1.0), (-1.05, 0.0, -0.3, 0.8), (1.1, -0.05, -0.25, 0.82), (0.35, 0.35, -0.45, 0.66),
             (-0.5, -0.8, 0.3, 0.8), (0.75, -0.75, 0.25, 0.74), (-1.5, 0.45, -0.7, 0.58), (1.55, 0.4, -0.75, 0.56)]
    with k.foliage('leaf'):
        for (dx, dr, dz, s) in lobes:
            rx = 1.55 * spread * s
            W.leafy_crown(k, cx + dx * 1.7 * spread, cr + dr * 1.5 * spread, z + dz, rx, rx * 0.85, rx * 0.62,
                          shade(LEAF, rng.uniform(0.86, 1.08)), n=max(40, int(rx * rx * 40)), part='canopy')
        for _ in range(int(14 * spread)):                                 # hanging leaves at the crown's foot (sides, back)
            a = rng.uniform(0, math.tau)
            if math.sin(a) > 0.35:
                a = math.pi - a if rng.random() < 0.5 else -a
            x, r = cx + math.cos(a) * 2.6 * spread, cr + math.sin(a) * 2.1 * spread
            W.leafy_crown(k, x, r, z - 1.0 + rng.uniform(-0.3, 0.2), 0.42, 0.36, 0.48, shade('#4e8238', rng.uniform(0.85, 1.05)),
                          n=26, part='canopy', sprigs=False)


def branches(cx, cr, rad, h, spread):
    for i in range(5):
        a = rng.uniform(0, math.tau)
        top = (cx + math.cos(a) * 1.9 * spread, cr + math.sin(a) * 1.5 * spread, h - 0.2)
        k.tube((cx + math.cos(a) * rad * 0.5, cr + math.sin(a) * rad * 0.5, h - 1.8), top, 0.22, (shade(BARK, 0.9), 0.3), 'branch', rb=0.07, verts=8)


# ---- small things --------------------------------------------------------------------------------------------------
def fern(cx, cr, s=0.5, fronds=8, tone='#4a8a3a', z=None):
    """A fern: arching fronds, each a stem with leaflets either side, as one mesh."""
    z0 = ground_z(cx, cr) if z is None else z
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
                    quads.append(((prev[0], prev[1], prev[2]), (x, r, zz), tip, ((prev[0] + tip[0]) / 2, (prev[1] + tip[1]) / 2, (prev[2] + tip[2]) / 2)))
            prev = (x, r, zz)
    with k.foliage('leaf'):
        k.quads(quads, (shade(tone, rng.uniform(0.85, 1.1)), 0.25), 'fern')


def glow_spores(cx, cr, n=6, spread=0.35, col=SPORE):
    for _ in range(n):
        x, r = cx + rng.uniform(-spread, spread), cr + rng.uniform(-spread, spread) * 0.8
        z = ground_z(x, r) + rng.uniform(0.02, 0.12)
        k.sphere(x, r, z, 0.03, 0.03, col, 'spore', emit=(col, 1.3), segs=6)


def mushroom_ring(cx, cr, n=4, glow=False, col=SPORE, cap='#b8402e'):
    for _ in range(n):
        x, r = cx + rng.uniform(-0.22, 0.22), cr + rng.uniform(-0.16, 0.16)
        z0 = ground_z(x, r)
        h = rng.uniform(0.08, 0.2)
        k.cyl(x, r, z0, z0 + h, 0.024, '#ece2d0', 'mushroom_stem', verts=7)
        rad = rng.uniform(0.055, 0.09)
        if glow:
            k.sphere(x, r, z0 + h, rad, rad * 0.55, col, 'mushroom_cap', emit=(col, 1.5), segs=10)
        else:
            k.sphere(x, r, z0 + h, rad, rad * 0.6, (cap, 0.25), 'mushroom_cap', segs=10)
            for d in range(3):                                            # white spots
                aa = rng.uniform(0, math.tau)
                k.sphere(x + math.cos(aa) * rad * 0.5, r + math.sin(aa) * rad * 0.4, z0 + h + rad * 0.42, 0.014, 0.008, '#f4ece0', 'mushroom_spot', segs=5)
    if glow:
        k.point_light(cx, cr + 0.1, ground_z(cx, cr) + 0.3, col, 3.0, radius=0.1)


def boulder(cx, cr, s=0.5, moss=True):
    z0 = ground_z(cx, cr)
    k.rock(cx, cr, z0 + s * 0.15, s, s * 0.8, s * 0.62, (STONE, 0.35), part='rock', segs=10)
    k.rock(cx + s * 0.55, cr + s * 0.3, z0 + s * 0.05, s * 0.4, s * 0.34, s * 0.3, (shade(STONE, 0.9), 0.35), part='rock', segs=8)
    if moss:
        k.blob(cx - s * 0.1, cr - s * 0.1, z0 + s * 0.7, s * 0.75, s * 0.55, s * 0.18, (MOSS_L, 0.4), 'rock_moss', segs=10)
        for _ in range(3):
            k.blob(cx + rng.uniform(-s, s) * 0.6, cr + s * 0.3, z0 + s * rng.uniform(0.35, 0.6), s * 0.25, s * 0.15, s * 0.12,
                   (shade(MOSS, 1.1), 0.4), 'rock_moss', segs=7)


def pebbles(x0, r0, x1, r1, n, tone=STONE):
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if line_dist(x, r, BROOK) < width(r) * 0.95:
            continue
        s = rng.uniform(0.04, 0.1)
        k.rock(x, r, ground_z(x, r) + s * 0.2, s, s * 0.8, s * 0.5, (shade(tone, rng.uniform(0.8, 1.2)), 0.25), part='pebble', segs=6)


def flowers(x0, r0, x1, r1, n, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8')):
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if line_dist(x, r, BROOK) < width(r) + 0.3:
            continue
        z0, h = ground_z(x, r), rng.uniform(0.06, 0.18)
        k.cone(x, r, z0, z0 + h, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
        k.sphere(x, r, z0 + h, 0.035, 0.03, rng.choice(cols), 'flower', segs=5)


def leaf_litter(x0, r0, x1, r1, n):
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if line_dist(x, r, BROOK) < width(r) * 1.05:
            continue
        col = rng.choice(('#a0682a', '#c08a30', '#7a4a22', '#8a9a3a', '#b05a2a'))
        k.blob(x, r, ground_z(x, r) + 0.004, 0.06, 0.04, 0.008, (col, 0.25), 'leaf_litter', rot=(0, 0, rng.uniform(0, 360)), segs=5)


# ---- build: trunks and roots first (the grass grows round them), then the small things, then the grass, then crowns ----
for i, (tx, tr, rad, h) in enumerate(TREES):
    ancient_trunk(tx, tr, rad, h + 0.4, seed=10 + i)
    branches(tx, tr, rad, h, 1.0 + rad * 0.15)

# the elven door in the right-hand tree
dx, dr, drad, _dh = DOOR_TREE
front = dr + drad * 1.45
DW, DH = 1.0, 1.75
k.box(dx - DW / 2 - 0.16, front - 0.42, -0.1, dx + DW / 2 + 0.16, front - 0.04, DH - DW / 2 + 0.06, (BARK_D, 0.3), 'door_frame')
k.cyl_y(dx, front - 0.42, front - 0.04, DH - DW / 2 + 0.06, DW / 2 + 0.16, DW / 2 + 0.16, (BARK_D, 0.3), 'door_frame', verts=20)
for i in range(4):                                                          # planks
    x0 = dx - DW / 2 + i * DW / 4
    k.box(x0 + 0.01, front - 0.36, 0.0, x0 + DW / 4 - 0.01, front + 0.02, DH - DW / 2, (shade('#7a5232', 0.92 + 0.08 * (i % 2)), 0.3), 'door')
k.cyl_y(dx, front - 0.36, front + 0.02, DH - DW / 2, DW / 2, DW / 2, ('#7a5232', 0.3), 'door', verts=20)
for zz in (0.32, DH - DW / 2 - 0.12):                                       # iron bands, a gold ring for a knob
    k.box(dx - DW / 2, front - 0.0, zz, dx + DW / 2, front + 0.04, zz + 0.05, ('#3a3430', 0.2), 'door_band')
k.cyl_y(dx + DW * 0.28, front, front + 0.05, 0.7, 0.05, 0.05, ('#d8a840', 0.2), 'door_knob', verts=10)
k.cyl_y(dx, front - 0.25, front + 0.03, DH + 0.42, 0.22, 0.22, (BARK_D, 0.3), 'window_frame', verts=16)     # a round window above
k.cyl_y(dx, front - 0.2, front + 0.05, DH + 0.42, 0.15, 0.15, '#ffd890', 'window_glow', emit=('#ffc870', 1.4), verts=16)
k.box(dx - 0.012, front + 0.03, DH + 0.27, dx + 0.012, front + 0.07, DH + 0.57, (BARK_D, 0.3), 'window_bar')
k.box(dx - 0.15, front + 0.03, DH + 0.405, dx + 0.15, front + 0.07, DH + 0.435, (BARK_D, 0.3), 'window_bar')
k.box(dx - DW / 2 - 0.1, front - 0.1, -0.05, dx + DW / 2 + 0.1, front + 0.3, 0.12, (shade(STONE, 0.95), 0.3), 'step')   # a flat stone step
k.box(dx - DW / 2 - 0.25, front + 0.25, -0.1, dx + DW / 2 + 0.25, front + 0.62, 0.04, (shade(STONE, 0.85), 0.3), 'step')
for side in (-1, 1):                                                        # lanterns on brackets either side
    bx = dx + side * (DW / 2 + 0.38)
    k.tube((bx - side * 0.2, front - 0.05, 1.35), (bx, front + 0.1, 1.42), 0.025, ('#3a3430', 0.2), 'bracket', verts=5)
    E.leaf_lantern(k, bx, front + 0.12, 1.2, s=0.1, energy=6.0)
# ivy round the door
with k.foliage('leaf'):
    for j in range(26):
        a = j / 26 * math.pi
        x, z = dx + math.cos(a) * (DW / 2 + 0.28), DH - DW / 2 + math.sin(a) * (DW / 2 + 0.28)
        k.blob(x + rng.uniform(-0.05, 0.05), front + 0.02, z + rng.uniform(-0.05, 0.05), 0.08, 0.05, 0.07,
               (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25), 'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)

# the cascade: a mossy log across the brook, the water spilling over it in strands, foam where it lands
cx0, cx1 = brook_x(CASCADE_R) - width(CASCADE_R) - 0.35, brook_x(CASCADE_R) + width(CASCADE_R) + 0.35
k.cyl_x(cx0, cx1, CASCADE_R - 0.12, WZ_UP + 0.04, 0.2, 0.2, (BARK, 0.32), 'log', verts=14)
k.cyl_x(cx1, cx1 + 0.02, CASCADE_R - 0.12, WZ_UP + 0.04, 0.19, 0.19, ('#b08a62', 0.3), 'log_end', verts=14)
for _ in range(5):
    x = rng.uniform(cx0 + 0.1, cx1 - 0.1)
    k.blob(x, CASCADE_R - 0.16, WZ_UP + 0.22, 0.24, 0.14, 0.07, (MOSS_L, 0.4), 'log_moss', segs=8)
strands = []
bx0, bx1 = brook_x(CASCADE_R) - width(CASCADE_R) * 0.8, brook_x(CASCADE_R) + width(CASCADE_R) * 0.8
nstr = 11
for i in range(nstr):
    if i in (0, nstr - 1) or rng.random() < 0.15:
        continue
    x = bx0 + (bx1 - bx0) * (i + 0.5) / nstr + rng.uniform(-0.02, 0.02)
    w = (bx1 - bx0) / nstr * rng.uniform(0.28, 0.42)
    top = (CASCADE_R + 0.06, WZ_UP + 0.2)
    bot = (CASCADE_R + 0.3, WZ_DOWN + 0.01)
    strands.append(((x - w, top[0], top[1]), (x + w, top[0], top[1]), (x + w, bot[0], bot[1]), (x - w, bot[0], bot[1])))
k.quads(strands[0::2], ('#d6ecf0', 0.15), 'falls')
k.quads(strands[1::2], ('#9ccad6', 0.15), 'falls_shade')
for _ in range(22):
    x = rng.uniform(bx0 - 0.05, bx1 + 0.05)
    r = CASCADE_R + rng.uniform(0.3, 0.75)
    s = rng.uniform(0.05, 0.12)
    k.blob(x, r, WZ_DOWN + 0.01, s, s * 0.8, 0.025, ('#eef6f6', 0.15), 'foam', segs=7)

# stepping stones across the brook where the paths meet
sr = 7.35
sx = brook_x(sr)
for i, off in enumerate((-0.78, -0.27, 0.24, 0.74)):
    s = rng.uniform(0.2, 0.26)
    k.rock(sx + off, sr + rng.uniform(-0.08, 0.08), WZ_DOWN + 0.02, s, s * 0.85, 0.11, (shade('#8a887a', rng.uniform(0.9, 1.08)), 0.3), part='stone', segs=10, jitter=0.1)
    k.blob(sx + off - 0.05, sr - 0.04, WZ_DOWN + 0.11, s * 0.55, s * 0.4, 0.04, (MOSS_L, 0.35), 'stone_moss', segs=7)

# stones edging the paths
for path in (PATH_L, PATH_R):
    for a, b in zip(path, path[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        for i in range(int(L / 0.55)):
            t = (i + rng.uniform(0, 0.6)) / max(1, int(L / 0.55))
            x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            nx, nr = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
            side = rng.choice((-1, 1))
            px, pr = x + nx * 0.46 * side, r + nr * 0.46 * side
            s = rng.uniform(0.07, 0.13)
            k.rock(px, pr, ground_z(px, pr) + s * 0.25, s, s * 0.8, s * 0.55, (shade(STONE, rng.uniform(0.8, 1.15)), 0.3), part='path_stone', segs=7)

# boulders, the fallen log, birches, lantern posts
boulder(5.6, 4.8, 0.42)
boulder(10.3, 9.2, 0.34)
boulder(15.7, 8.3, 0.5)
boulder(0.6, 3.3, 0.55)
boulder(10.3, 3.7, 0.3, moss=True)
lx0, lx1, lr = -0.6, 2.4, 8.7


def log(x0, x1, cr, rad, seed=4):
    rings = []
    n = 16
    for i in range(12):
        t = i / 11
        x = x0 + (x1 - x0) * t
        rr = rad * (1.06 - 0.16 * t) * (1 + 0.08 * math.sin(t * 9 + seed))
        cz = ground_z(x, cr) + rr * 0.85
        ring = []
        for j in range(n):
            a = j / n * math.tau
            bump = 1 + 0.07 * math.cos(5 * a + seed) + 0.04 * math.cos(9 * a)
            ring.append((x, cr + math.cos(a) * rr * bump * 0.95, cz + math.sin(a) * rr * bump))
        rings.append(ring)
    k.loft(rings, (BARK, 0.36), 'log', closed=True)
    for end, rr in ((rings[0], rad * 1.06), (rings[-1], rad * 0.9)):         # the cut ends, pale, with a darker ring
        x = end[0][0]
        cz = ground_z(x, cr) + rr * 0.85
        k.cyl_x(x - 0.012, x + 0.012, cr, cz, rr * 0.92, rr * 0.92, ('#c09a6c', 0.3), 'log_end', verts=16)
        k.cyl_x(x - 0.016, x + 0.016, cr, cz, rr * 0.45, rr * 0.45, ('#9a7448', 0.3), 'log_end', verts=12)
    for i in range(9):                                                      # ridges along the bark
        a = rng.uniform(0.2, math.pi - 0.2)
        z = ground_z((x0 + x1) / 2, cr) + rad * 0.85 + math.sin(a) * rad
        k.tube((x0 + 0.15, cr + math.cos(a) * rad * 0.95, z), (x1 - 0.15, cr + math.cos(a) * rad * 0.85, z - 0.03), 0.025,
               (shade(BARK, rng.choice((0.75, 1.2))), 0.3), 'bark_ridge', verts=4, smooth=False)
    bx = x0 + (x1 - x0) * 0.62                                               # a broken branch stub
    k.tube((bx, cr - 0.1, ground_z(bx, cr) + rad * 1.5), (bx + 0.2, cr - 0.35, ground_z(bx, cr) + rad * 2.2), 0.07, (BARK, 0.3), 'branch', rb=0.04, verts=7)


log(lx0, lx1, lr, 0.28)
for _ in range(6):
    x = rng.uniform(lx0 + 0.2, lx1 - 0.2)
    k.blob(x, lr - 0.05, ground_z(x, lr) + 0.5, 0.28, 0.18, 0.07, (shade(MOSS_L, rng.uniform(0.9, 1.1)), 0.4), 'log_moss', segs=8)
for _ in range(4):                                                          # bracket fungi on the log's side
    x = rng.uniform(lx0 + 0.3, lx1 - 0.3)
    z = ground_z(x, lr) + rng.uniform(0.15, 0.35)
    k.cyl_y(x, lr + 0.22, lr + 0.34, z, 0.09, 0.03, ('#d8b880', 0.25), 'fungus', verts=10)
mushroom_ring(lx1 - 0.2, lr + 0.36, n=4)
E.birch(k, 6.3, 3.4, h=3.3)
E.birch(k, 12.1, 4.3, h=3.0)
E.lantern_post(k, 6.2, 7.0, h=1.6, energy=12.0)
E.lantern_post(k, 11.2, 7.0, h=1.6, energy=12.0)

# glowing mushrooms and spores for the night: in the roots, by the water
mushroom_ring(3.8, 7.3, n=4, glow=True)
mushroom_ring(15.2, 6.8, n=5, glow=True)
mushroom_ring(10.0, 2.3, n=3, glow=True, col='#a8d8ff')
mushroom_ring(13.2, 9.1, n=3)
mushroom_ring(1.2, 6.9, n=3)
for (x, r) in ((4.6, 6.6), (12.8, 6.4), (6.9, 5.6), (9.4, 6.0), (15.6, 4.6), (0.9, 7.6), (10.6, 2.8)):
    glow_spores(x, r, n=rng.randint(4, 7))

# ferns: clumps round the trees and the banks, two big ones framing the bottom corners
for (x, r, s) in ((4.4, 4.5, 0.5), (0.9, 5.2, 0.55), (9.6, 5.3, 0.42), (6.5, 6.2, 0.45), (10.4, 4.0, 0.4), (15.9, 6.4, 0.55),
                  (12.6, 3.0, 0.45), (7.0, 2.4, 0.4), (3.0, 3.0, 0.5), (13.5, 8.6, 0.45), (8.6, 9.4, 0.4), (16.3, 3.2, 0.5)):
    fern(x, r, s * 1.35, tone='#55963e')
fern(2.2, 7.85, 1.0, fronds=11, tone='#3e7a32')
fern(15.8, 8.9, 1.2, fronds=11, tone='#3e7a32')

# the forest floor's small things
pebbles(-0.5, -1.0, 17.5, 11.5, 70)
leaf_litter(-0.5, -1.0, 17.5, 11.5, 110)
flowers(9.0, 8.0, 14.5, 10.5, 30)
flowers(4.6, 9.0, 6.6, 10.2, 12)
flowers(12.4, 5.6, 16.5, 6.6, 12, cols=('#f0f0f0', '#c8a8f0', '#f0d870'))
for (r, side) in ((3.9, 1), (4.9, -1), (6.4, 1), (8.9, -1), (9.6, 1)):      # reeds at the water's edge
    x = brook_x(r) + side * (width(r) + 0.12)
    for _ in range(7):
        xx, rr = x + rng.uniform(-0.12, 0.12), r + rng.uniform(-0.15, 0.15)
        z0 = ground_z(xx, rr)
        hh = rng.uniform(0.35, 0.6)
        k.tube((xx, rr, z0), (xx + rng.uniform(-0.05, 0.05), rr, z0 + hh), 0.012, ('#5a7a3a', 0.2), 'reed', rb=0.006, verts=4)
        if rng.random() < 0.4:
            k.cyl(xx, rr, z0 + hh - 0.12, z0 + hh - 0.02, 0.022, ('#6a4a2a', 0.2), 'cattail', verts=6)

for _ in range(26):                                                         # soft moss mounds
    x, r = rng.uniform(-0.5, 17.5), rng.uniform(-0.5, 10.5)
    if line_dist(x, r, BROOK) < width(r) + 0.5 or min(line_dist(x, r, PATH_L), line_dist(x, r, PATH_R)) < 0.6:
        continue
    s_ = rng.uniform(0.14, 0.3)
    k.blob(x, r, ground_z(x, r) + 0.01, s_, s_ * 0.8, s_ * 0.38, (shade(MOSS_L, rng.uniform(0.85, 1.12)), 0.4), 'moss_mound', segs=9)
for r in (4.0, 5.2, 6.9, 8.4, 9.8):                                          # stones in the shallows
    for side in (-1, 1):
        if rng.random() < 0.55:
            continue
        x = brook_x(r) + side * (width(r) * rng.uniform(0.55, 0.85))
        s_ = rng.uniform(0.1, 0.18)
        k.rock(x, r + rng.uniform(-0.2, 0.2), water_z(r) + 0.01, s_, s_ * 0.8, 0.07, (shade('#9a988a', rng.uniform(0.9, 1.1)), 0.3), part='stone', segs=8)
for _ in range(10):                                                         # twigs
    x, r = rng.uniform(0, 17), rng.uniform(1, 10.5)
    if line_dist(x, r, BROOK) < width(r) + 0.3:
        continue
    a = rng.uniform(0, math.pi)
    L = rng.uniform(0.25, 0.5)
    z = ground_z(x, r) + 0.02
    k.tube((x, r, z), (x + math.cos(a) * L, r + math.sin(a) * L * 0.8, z + 0.01), 0.018, ('#5a4030', 0.3), 'twig', rb=0.01, verts=4)
for (x, r, s_) in ((2.0, 3.6, 0.55), (4.9, 7.0, 0.5), (10.6, 6.4, 0.5), (11.4, 8.9, 0.55), (15.6, 2.4, 0.5), (0.4, 8.2, 0.6)):
    fern(x, r, s_ * 1.3, tone='#5aa042')
mushroom_ring(5.6, 8.95, n=5)
mushroom_ring(12.0, 6.15, n=4)
mushroom_ring(0.9, 4.4, n=4, glow=True)

# the grass: tufts over the moss (only where the moss is still what's on top)
W.meadow(k, '#567a36', area=(-0.5, -1.5, 17.5, 11.5), ok=('ground_moss', 'ground_moss_dark', 'ground_litter'), density=0.85, flowers=0.8, h=(0.07, 0.15))

# the crowns last (the grass stops under the trunks, not under the leaves)
for i, (tx, tr, rad, h) in enumerate(TREES):
    crown(tx, tr, h, 1.0 + rad * 0.12, seed=i)
# a bough of the trees out of frame, leaning in over the brook so the canopy closes overhead
with k.foliage('leaf'):
    for (x, r, z, s) in ((7.0, 3.6, 5.6, 1.15), (9.0, 4.4, 5.9, 1.0), (5.2, 2.0, 5.2, 0.9), (16.4, 1.6, 4.8, 1.0), (-0.3, 3.0, 4.4, 1.1)):
        W.leafy_crown(k, x, r, z, 1.3 * s, 1.1 * s, 0.8 * s, shade(LEAF, rng.uniform(0.85, 1.05)), n=int(60 * s * s), part='canopy')

# no sun here: lookkit lights it (six suns, the sky, these lamps)
k.render(OUT)
