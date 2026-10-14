"""The Singularity's shattered planes: floating shards of rock and of other
worlds round the black hole (js/blackhole.js draws the hole itself).
Tile units: x = column, r = row (toward the camera), z = height.

A shard is an irregular slab: a stone top at z = 0 you can walk on, a
broken rim, and a rock underside tapering away to a point — a floating
island seen from above. Light-bridges join them. Fragments of other
worlds (Lumar cobbles and a lantern, a slab of Arcadia street, station
hull) have been caught and dragged here, still half lit.
"""
import math

from scenekit import shade

STONE = ['#0e0820', '#1a1430', '#252038', '#32284a', '#40345a']
GLOW = '#a080e0'
AMBER = '#ffb060'


def blob(cx, cr, rx, ry, rng, n=16, jag=0.22, notch=0.25):
    """An irregular outline round (cx, cr): (x, r) points, counter-clockwise."""
    pts = []
    for i in range(n):
        a = i * 2 * math.pi / n + rng.uniform(-0.12, 0.12)
        f = 1 + rng.uniform(-jag, jag)
        if rng.random() < notch:
            f *= rng.uniform(0.7, 0.85)                       # a bite out of the rim
        pts.append((cx + math.cos(a) * rx * f, cr + math.sin(a) * ry * f))
    return pts


def inside(pts, x, r):
    c = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, ri = pts[i]
        xj, rj = pts[j]
        if (ri > r) != (rj > r) and x < (xj - xi) * (r - ri) / (rj - ri + 1e-9) + xi:
            c = not c
        j = i
    return c


def edge_dist(pts, x, r):
    best = 1e9
    for (a, b) in zip(pts, pts[1:] + pts[:1]):
        dx, dr = b[0] - a[0], b[1] - a[1]
        t = max(0, min(1, ((x - a[0]) * dx + (r - a[1]) * dr) / (dx * dx + dr * dr + 1e-9)))
        best = min(best, math.hypot(x - a[0] - t * dx, r - a[1] - t * dr))
    return best


def cells_in(pts, margin=0.3):
    xs = [p[0] for p in pts]
    rs = [p[1] for p in pts]
    out = []
    for c in range(int(min(xs)), int(max(xs)) + 1):
        for r in range(int(min(rs)), int(max(rs)) + 1):
            if inside(pts, c + 0.5, r + 0.5) and edge_dist(pts, c + 0.5, r + 0.5) >= margin:
                out.append((c, r))
    return out


def shard(k, pts, top=0.0, depth=3.0, tone=STONE[3], under=STONE[1], rng=None, crack=GLOW, cracks=4, top_alb=None):
    """A floating shard with outline pts: top slab, rim, tapering underside."""
    rng = rng or k.rng
    cx = sum(p[0] for p in pts) / len(pts)
    cr = sum(p[1] for p in pts) / len(pts)
    # the top: a fan from the middle
    k.poly([(cx, cr, top)] + [(x, r, top) for (x, r) in pts] + [(pts[0][0], pts[0][1], top)],
           top_alb or (tone, 0.2), 'shard_top')
    # the underside: rings shrinking down to a point, jittered
    rings = []
    for (f, dz) in ((1.0, 0.0), (1.0, -0.18), (0.82, -0.6), (0.58, -depth * 0.45), (0.3, -depth * 0.75), (0.06, -depth)):
        ring = []
        for (x, r) in pts:
            j = 0 if f >= 1.0 else rng.uniform(-0.12, 0.12)
            ring.append((cx + (x - cx) * (f + j * f), cr + (r - cr) * (f + j * f), top + dz + (rng.uniform(-0.15, 0.1) if dz < 0 else 0)))
        rings.append(ring)
    k.loft(rings, (under, 0.22), 'shard_under', closed=True, smooth=False)
    # a lit rim round the top edge (the hole's light catching it)
    for (a, b) in zip(pts, pts[1:] + pts[:1]):
        k.bar(a[0], a[1], b[0], b[1], top - 0.04, top + 0.01, 0.05, shade(tone, 1.35), 'shard_rim')
    # glowing cracks wandering across the top
    for _ in range(cracks):
        x, r = cx + rng.uniform(-0.4, 0.4), cr + rng.uniform(-0.4, 0.4)
        a = rng.uniform(0, 2 * math.pi)
        for _ in range(rng.randint(4, 9)):
            a += rng.uniform(-0.7, 0.7)
            nx, nr = x + math.cos(a) * 0.35, r + math.sin(a) * 0.35
            if not inside(pts, nx, nr) or edge_dist(pts, nx, nr) < 0.15:
                break
            k.bar(x, r, nx, nr, top - 0.01, top + 0.004, 0.045, '#2a1050', 'void_crack', emit=(crack, 0.7))
            x, r = nx, nr
    # rubble on the top near the rim
    for _ in range(int(len(pts) * 0.6)):
        i = rng.randrange(len(pts))
        x, r = pts[i]
        x, r = x + (cx - x) * rng.uniform(0.08, 0.2), r + (cr - r) * rng.uniform(0.08, 0.2)
        s = rng.uniform(0.08, 0.16)
        k.rock(x, r, top + s * 0.3, s, s * 0.8, s * 0.6, (shade(tone, rng.uniform(0.8, 1.2)), 0.2), part='rubble')


def bridge(k, a, b, col='#80c0ff', top=0.0, width=0.55):
    """A light-bridge: a thin glowing walkway between two shards. Returns
    the cells it crosses."""
    k.bar(a[0], a[1], b[0], b[1], top - 0.05, top, width, ('#1a2440', 0.06), 'bridge_deck', emit=('#2a4a80', 0.35))
    dx, dr = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dr)
    nx, nr = -dr / L, dx / L
    for s in (-1, 1):
        ex, er = nx * width / 2 * s, nr * width / 2 * s
        k.bar(a[0] + ex, a[1] + er, b[0] + ex, b[1] + er, top, top + 0.03, 0.04, shade(col, 0.5), 'bridge_edge', emit=(col, 0.9))
    n = int(L / 0.6)
    for i in range(1, n):
        t = i / n
        k.sphere(a[0] + dx * t, a[1] + dr * t, top + 0.02, 0.05, 0.02, col, 'bridge_node', emit=(col, 1.0), segs=6)
    k.point_light((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.6, col, 10, radius=0.3, group='flicker')
    cells = set()
    steps = int(L * 4) + 1
    for i in range(steps + 1):
        t = i / steps
        cells.add((int(math.floor(a[0] + dx * t)), int(math.floor(a[1] + dr * t))))
    return cells


def stretched_shard(k, x, r, z, length, toward, tone=STONE[2], glow=AMBER):
    """Rock pulled thin by the hole: a long spike pointing at it."""
    ax, ar = toward
    d = math.hypot(ax - x, ar - r)
    ux, ur = (ax - x) / d, (ar - r) / d
    k.tube((x - ux * length * 0.5, r - ur * length * 0.5, z - 0.1), (x + ux * length * 0.5, r + ur * length * 0.5, z + 0.25),
           0.14, (tone, 0.2), 'stretched', rb=0.01, verts=5, smooth=False)
    k.sphere(x + ux * length * 0.5, r + ur * length * 0.5, z + 0.25, 0.04, 0.04, glow, 'stretched_tip', emit=(glow, 0.9), segs=5)


def float_rock(k, x, r, z, s, rng, tone=STONE[2]):
    k.rock(x, r, z, s, s * rng.uniform(0.6, 0.9), s * rng.uniform(0.5, 0.8), (shade(tone, rng.uniform(0.8, 1.2)), 0.2),
           part='float_rock')


def altar(k, cx, cr, col=GLOW):
    """The Singularity's altar at the edge: a ring of standing stones round a
    plinth, a broken arch facing the hole."""
    for i in range(6):
        a = i * math.pi / 3 + 0.3
        x, r = cx + math.cos(a) * 1.1, cr + math.sin(a) * 0.8
        h = k.rng.uniform(0.7, 1.3)
        k.box(x - 0.12, r - 0.1, 0.0, x + 0.12, r + 0.1, h, (STONE[3], 0.18), 'standing_stone', bevel=0.03)
        k.box(x - 0.06, r + 0.1, h * 0.4, x + 0.06, r + 0.11, h * 0.8, '#1a0c30', 'stone_rune', emit=(col, 0.7))
    k.cyl(cx, cr, 0.0, 0.35, 0.42, (STONE[4], 0.16), 'plinth', verts=8)
    k.cyl(cx, cr, 0.35, 0.4, 0.46, '#1a0c30', 'plinth_cap', verts=8)
    k.sphere(cx, cr, 0.75, 0.2, 0.2, '#0a0418', 'void_orb', segs=14)
    k.cyl(cx, cr, 0.72, 0.76, 0.3, shade(AMBER, 0.5), 'orb_ring', emit=(AMBER, 0.95), verts=20)
    k.point_light(cx, cr + 0.4, 0.9, AMBER, 30, radius=0.2, group='flicker')
    # the broken arch behind, framing the hole
    for s in (-1, 1):
        k.box(cx + s * 0.7 - 0.12, cr - 1.2, 0.0, cx + s * 0.7 + 0.12, cr - 1.0, 2.0 - (0.5 if s > 0 else 0), (STONE[3], 0.18),
              'arch_post', bevel=0.03)
    k.bar(cx - 0.8, cr - 1.1, cx + 0.1, cr - 1.1, 1.95, 2.15, 0.22, (STONE[3], 0.18), 'arch_lintel')
    k.solid(cx - 1.3, cr - 1.0, cx + 1.3, cr + 1.0)


# ---- the shattered plain: one continuous broken landmass ------------------------------------------
def plain(k, land, cols, rows, seed=5, step=0.125, plate=3.4, fissure=0.05, tones=None, glow=GLOW, bounds=None,
          rift_frac=0.45, rift_w=0.9, keep=None):
    """A continuous plain cracked into plates: land(x, r) -> bool says where
    there is ground. Plates (jittered Voronoi cells about `plate` tiles
    across) each get their own stone tone; the cracks between them glow
    from below; the land's edges hang rock into the void. Returns the set
    of cells you can walk on (on land, clear of its edge)."""
    import numpy as np
    from mathutils import noise as mnoise, Vector
    import bmesh
    import bpy
    from scenekit import S as RS
    rng = __import__('random').Random(seed)
    tones = tones or ['#6a5a7a', '#5e5072', '#76648a', '#56486a', '#806e92']
    x0, x1, r0, r1 = bounds or (-1.0, cols + 1.0, -2.0, rows + 1.0)
    nx = int(round((x1 - x0) / step))
    nr = int(round((r1 - r0) / step))
    xs = x0 + (np.arange(nx) + 0.5) * step
    rs = r0 + (np.arange(nr) + 0.5) * step
    X, R = np.meshgrid(xs, rs)
    L = np.vectorize(lambda a, b: 1 if land(a, b) else 0)(X, R).astype(bool)
    # plates: nearest of jittered seeds; a fissure where two seeds are near-equidistant
    seeds = []
    yy = r0
    while yy < r1 + plate:
        xx = x0
        while xx < x1 + plate:
            seeds.append((xx + rng.uniform(0.15, 0.85) * plate, yy + rng.uniform(0.15, 0.85) * plate))
            xx += plate
        yy += plate
    seeds = np.array(seeds)
    d1 = np.full(X.shape, 1e9)
    d2 = np.full(X.shape, 1e9)
    pid = np.zeros(X.shape, int)
    pid2 = np.zeros(X.shape, int)
    for i, (sx, sr) in enumerate(seeds):
        d = np.hypot(X - sx, R - sr)
        closer = d < d1
        second = (~closer) & (d < d2)
        pid2 = np.where(closer, pid, np.where(second, i, pid2))
        d2 = np.where(closer, d1, np.where(second, d, d2))
        pid = np.where(closer, i, pid)
        d1 = np.where(closer, d, d1)
    crack = (d2 - d1) < fissure * 2
    # rifts: some plates have drifted apart, open void between them (the sky shows through)
    lo, hi = np.minimum(pid, pid2), np.maximum(pid, pid2)
    pair = np.vectorize(lambda a, b: (math.sin(a * 91.7 + b * 13.3) * 43758.5453) % 1.0)(lo, hi)
    rift = (pair < rift_frac) & ((d2 - d1) < rift_w)
    if keep is not None:
        K = np.vectorize(lambda a, b: 1 if keep(a, b) else 0)(X, R).astype(bool)
        rift &= ~K
    L = L & ~rift
    top = L & ~crack
    glowc = L & crack
    # land edge distance (in raster cells) for the rim and walkability
    edge = np.zeros(X.shape, bool)
    edge[1:, :] |= L[1:, :] & ~L[:-1, :]
    edge[:-1, :] |= L[:-1, :] & ~L[1:, :]
    edge[:, 1:] |= L[:, 1:] & ~L[:, :-1]
    edge[:, :-1] |= L[:, :-1] & ~L[:, 1:]

    def build(mask, z_of, alb, part, emit=None):
        bm = bmesh.new()
        js, is_ = np.nonzero(mask)
        for j, i in zip(js, is_):
            xa, xb = x0 + i * step, x0 + (i + 1) * step
            ra, rb = r0 + j * step, r0 + (j + 1) * step
            z = z_of(j, i)
            v = [bm.verts.new((xa, -ra * RS, z)), bm.verts.new((xb, -ra * RS, z)), bm.verts.new((xb, -rb * RS, z)),
                 bm.verts.new((xa, -rb * RS, z))]
            bm.faces.new(v)
        if not len(bm.faces):
            bm.free()
            return
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        for f in bm.faces:
            if f.normal.z < 0:
                f.normal_flip()
        me = bpy.data.meshes.new(part)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(part, me)
        k.scene.collection.objects.link(o)
        k._finish(o, alb, part, emit)

    # plate tops, grouped by tone; each plate a hair above or below its neighbours
    ptone = {i: rng.randrange(len(tones)) for i in range(len(seeds))}
    pz = {i: rng.choice((0.0, 0.0, 0.015, -0.015)) for i in range(len(seeds))}
    tone_of = np.vectorize(lambda p: ptone[p])(pid)
    for t, col in enumerate(tones):
        build(top & (tone_of == t), lambda j, i: pz[pid[j, i]], (col, 0.22), 'plain_top')
    build(glowc, lambda j, i: -0.12, '#1a0a30', 'fissure', emit=(glow, 0.8))
    # the edge: a lit lip, and rock hanging into the void below it
    bm_edge = edge & L
    js, is_ = np.nonzero(bm_edge)
    for n, (j, i) in enumerate(zip(js, is_)):
        if n % 3:
            continue
        x, r = X[j, i], R[j, i]
        s = rng.uniform(0.18, 0.4)
        k.rock(x, r, -0.25 - rng.uniform(0, 0.4), s, s * 0.9, rng.uniform(0.4, 1.0), (shade(STONE[1], rng.uniform(0.8, 1.2)), 0.2),
               part='plain_under')
        if rng.random() < 0.18:
            k.cone(x, r, -rng.uniform(1.5, 3.2), -0.3, 0.03, rng.uniform(0.2, 0.4), (STONE[1], 0.2), 'plain_spike', verts=5)
    # walkable cells: on land, clear of the edge
    def on(x, r):
        i = int((x - x0) / step)
        j = int((r - r0) / step)
        return 0 <= i < nx and 0 <= j < nr and bool(L[j, i])
    walk = set()
    for c in range(cols):
        for r in range(rows):
            pts = [(c + dx, r + dr) for (dx, dr) in ((0.5, 0.5), (0.15, 0.15), (0.85, 0.15), (0.15, 0.85), (0.85, 0.85))]
            pts += [(c + 0.5 + ex, r + 0.5 + er) for (ex, er) in ((-0.45, 0), (0.45, 0), (0, -0.45), (0, 0.45))]
            if all(on(x, r) for (x, r) in pts):
                walk.add((c, r))
    return walk, (lambda x, r: pz[int(pid[min(nr - 1, max(0, int((r - r0) / step))), min(nx - 1, max(0, int((x - x0) / step)))])])
