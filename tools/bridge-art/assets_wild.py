"""Lumar's wilder islands in the house style (Look Book 2): Rose Cove, Crimson Reach, Midnight Isle.

  import assets_wild as WL

Small builders the three island scripts share, on top of assets_isle / assets_town / assets_house: land that has
shape (a pool sunk into the ground with a bank of stones and reeds, never a circle in a field), vegetation in layers
(boulders with moss and tufts at their feet, ferns, shrubs, rose bushes, heather, reeds), crystals grown in clusters,
dry-stone walls, and small life (crates, lanterns, baskets). Tile units: x = column, r = row (toward the camera),
z = height. Every builder here rolls its own dice (seeded by where it stands), never the scene's (k.rng), so the
scene's dice — and everything they place after, trees and graves that are solid among them — stay as they were;
own_dice() does the same for a block of the kit's own builders.
"""
import math
import random

from scenekit import shade
import assets_isle as I
import assets_lumar as A
import assets_town as W


class own_dice:
    """with WL.own_dice(k, seed): ...  — what's built inside rolls its own dice (k.rng swapped for a Random(seed) and put
    back after), so the scene's dice place everything after the block exactly where they always did (trees and graves
    that are solid: the walkable map stays the map)."""
    def __init__(self, k, seed):
        self.k, self.seed = k, seed

    def __enter__(self):
        self.saved = self.k.rng
        self.k.rng = random.Random(self.seed)
        return self.k.rng

    def __exit__(self, *a):
        self.k.rng = self.saved


def _rng(x, r, salt=0):
    return random.Random(int(x * 1013 + r * 7919 + salt * 104729))


# ---- shaped outlines ----------------------------------------------------------------------------------------------
def blob_outline(cx, cr, rx, ry, seed=0, wob=0.12):
    """An irregular closed outline round an ellipse: R(th), relative to (rx, ry). Returns (R, inside_d) where
    inside_d(x, r) is < 1 inside the outline (0 at the centre)."""
    rr = random.Random(seed)
    harm = [(n, rr.uniform(0, math.tau), wob / n ** 0.7 * rr.uniform(0.5, 1.0)) for n in (2, 3, 5, 7, 11)]

    def R(th):
        return 1.0 + sum(a * math.sin(n * th + p) for (n, p, a) in harm)

    def d(x, r):
        u, v = (x - cx) / rx, (r - cr) / ry
        return math.hypot(u, v) / R(math.atan2(v, u))

    def edge(th, f=1.0):
        return cx + math.cos(th) * rx * R(th) * f, cr + math.sin(th) * ry * R(th) * f
    return R, d, edge


def water(k, cx, cr, edge, z, col, part='pond_water', n=96):
    """A still surface inside an outline (edge(th) -> (x, r)), as one fan at height z."""
    pts = [edge(i / n * math.tau) for i in range(n)][::-1]          # wound so the fan faces up (the normal pass)
    k.poly([(cx, cr, z)] + [(x, r, z) for (x, r) in pts] + [(pts[0][0], pts[0][1], z)], col, part)


# ---- stones, reeds and banks ---------------------------------------------------------------------------------------
STONES = ('#8a8478', '#9a9080', '#7a766c')


def stone(k, x, r, z, s, tone=None, rng=None, part='rock'):
    rng = rng or _rng(x, r, 23)
    tone = tone or rng.choice(STONES)
    k.rock(x, r, z - s * 0.25, s, s * 0.8, s * 0.6, (shade(tone, rng.uniform(0.8, 1.1)), 0.2), part=part, segs=8,
           seed=rng.randrange(10 ** 6))


def reeds(k, pts, tones=('#4a7a34', '#5a8a3a', '#6e9a44'), h=(0.38, 0.85), cattails=0.2, seed=0):
    """Reed clumps: pts are (x, r, z) roots; blades in three greens as foliage (they turn with the year)."""
    rng = random.Random(seed)
    beds = {t: [] for t in tones}
    tails = []
    for (x, r, z) in pts:
        hh = rng.uniform(*h)
        lean = rng.uniform(-0.14, 0.14)
        beds[rng.choice(tones)].append((x, r, z, hh, 0.03, lean, rng.uniform(-0.04, 0.04)))
        if rng.random() < cattails:
            tails.append((x + lean * 0.9, r, z + hh * 0.82, z + hh * 0.98))
    with k.foliage('leaf'):
        for t, bl in beds.items():
            if bl:
                k.blades(bl, (t, 0.2), 'reed')
    for (x, r, z0, z1) in tails:
        k.cyl(x, r, z0, z1, 0.028, '#5a3a20', 'cattail', verts=6)


def bank(k, edge, z_at, wz, free=lambda x, r: True, seed=0, stones=26, clumps=8, lilies=0, reed_tones=None,
         stone_tones=STONES, lily='#4a8a3a', bloom='#f0b8d0'):
    """Dress a pool's edge (edge(th, f) -> (x, r)): stones of a few sizes half in the water, clumps of reeds and
    cattails, lily pads on the water. free(x, r) keeps them off a jetty, steps or a path down."""
    rng = random.Random(seed)
    for _ in range(stones):
        th = rng.uniform(-math.pi, math.pi)
        x, r = edge(th, rng.uniform(0.93, 1.12))
        if not free(x, r):
            continue
        s = rng.choice((0.07, 0.1, 0.14, 0.2, 0.27)) * rng.uniform(0.85, 1.15)
        k.rock(x, r, max(z_at(x, r), wz - 0.08) - s * 0.25, s, s * 0.8, s * 0.6,
               (shade(rng.choice(stone_tones), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8, seed=rng.randrange(10 ** 6))
    pts = []
    for _ in range(clumps):
        th = rng.uniform(-math.pi, math.pi)
        for j in range(rng.randint(12, 26)):
            t = th + rng.uniform(-0.15, 0.15)
            x, r = edge(t, rng.uniform(0.93, 1.06))
            if free(x, r):
                pts.append((x, r, max(z_at(x, r), wz)))
    if pts:
        reeds(k, pts, tones=reed_tones or ('#4a7a34', '#5a8a3a', '#6e9a44'), seed=seed + 1)
    for _ in range(lilies):
        th, dd = rng.uniform(-math.pi, math.pi), rng.uniform(0.3, 0.8)
        x, r = edge(th, dd)
        s = rng.uniform(0.1, 0.16)
        k.cyl(x, r, wz, wz + 0.012, s, (lily, 0.2), 'lily', verts=12, ry=s * 0.8)
        if rng.random() < 0.35:
            k.sphere(x + 0.04, r, wz + 0.04, 0.05, 0.04, bloom, 'lily_flower', segs=6)


# ---- vegetation ------------------------------------------------------------------------------------------------------
def shrub(k, x, r, s=0.32, tone='#3a6030', blooms=None, bloom_glow=None, z=0.0, seed=None, part='bush'):
    """A shrub: a leafy crown sitting low on the ground; blooms = colour of flowers dotted over its face (glowing if
    bloom_glow: a colour)."""
    rng = _rng(x, r, 7) if seed is None else random.Random(seed)
    with k.foliage('leaf'), own_dice(k, rng.randrange(10 ** 6)):
        W.leafy_crown(k, x, r, z + s * 0.62, s * 1.08, s * 0.88, s * 0.66, shade(tone, rng.uniform(0.92, 1.08)), part=part)
    if blooms:
        for _ in range(int(5 + 14 * s)):
            a = rng.uniform(-0.3, math.pi + 0.3)                  # the face toward the camera and the top
            u = rng.uniform(0.1, 0.9)
            bx = x + math.cos(a) * s * 1.0 * math.sqrt(1 - u * u)
            br = r + abs(math.sin(a)) * s * 0.8 * math.sqrt(1 - u * u) * 0.8 + 0.05
            bz = z + s * 0.62 + u * s * 0.6
            if bloom_glow:
                k.sphere(bx, br, bz, 0.045, 0.04, (blooms, 0.2), 'rose', emit=(bloom_glow, 0.45), segs=6)
            else:
                k.sphere(bx, br, bz, 0.04, 0.035, (blooms, 0.3), 'bloom', segs=6)


def heather(k, x, r, s=0.25, tone='#6a3a5a', z=0.0, seed=None):
    """A low mound of heather: small dark clumps under a haze of tiny flower heads."""
    rng = _rng(x, r, 11) if seed is None else random.Random(seed)
    with k.foliage('leaf'):
        for i in range(int(4 + 10 * s)):
            a = rng.uniform(0, math.tau)
            d = rng.uniform(0, s)
            q = rng.uniform(0.06, 0.1)
            k.blob(x + math.cos(a) * d, r + math.sin(a) * d * 0.7, z + q * 0.6, q * 1.2, q, q * 0.7,
                   (shade('#3a4a2e', rng.uniform(0.8, 1.1)), 0.3), 'heather', segs=6)
            k.blob(x + math.cos(a) * d, r + math.sin(a) * d * 0.7 + 0.02, z + q * 1.15, q * 0.9, q * 0.8, q * 0.4,
                   (shade(tone, rng.uniform(0.85, 1.2)), 0.3), 'heather', segs=6)


# ---- crystals ------------------------------------------------------------------------------------------------------
def crystal_cluster(k, x, r, s=1.0, col=('#6a2a4a', '#f080b0'), z=0.0, energy=8, glow=0.7, solid=False, seed=None,
                    base='#6a6068'):
    """Crystals grown in a cluster out of a rock: a few tall six-sided points leaning out from one root, smaller
    ones round them, a rock they break out of, chips on the ground."""
    rng = _rng(x, r, 17) if seed is None else random.Random(seed)
    k.rock(x, r, z + 0.05 * s, 0.32 * s, 0.26 * s, 0.18 * s, (shade(base, rng.uniform(0.85, 1.05)), 0.22), part='crystal_rock',
           segs=8, seed=rng.randrange(10 ** 6))
    n = rng.randint(5, 8)
    for i in range(n):
        a = rng.uniform(0, math.tau)
        big = i < 2
        h = s * (rng.uniform(0.6, 0.95) if big else rng.uniform(0.2, 0.5))
        rad = s * (rng.uniform(0.08, 0.11) if big else rng.uniform(0.04, 0.07))
        lean = 0.0 if i == 0 else rng.uniform(0.2, 0.55)
        bx, br = x + math.cos(a) * 0.08 * s, r + math.sin(a) * 0.06 * s
        top = (bx + math.cos(a) * h * lean, br + math.sin(a) * h * lean * 0.6, z + 0.05 + h)
        body = (bx + (top[0] - bx) * 0.8, br + (top[1] - br) * 0.8, z + 0.05 + h * 0.8)
        lit = rng.uniform(0.85, 1.15)
        k.tube((bx, br, z + 0.02), body, rad, shade(col[0], lit), 'crystal', rb=rad * 0.92, emit=(col[1], glow * lit), verts=6,
               smooth=False)
        k.tube(body, top, rad * 0.92, shade(col[0], lit * 1.15), 'crystal', rb=0.004, emit=(col[1], glow * lit * 1.1), verts=6,
               smooth=False)
    for _ in range(rng.randint(2, 4)):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0.3, 0.5) * s
        cx_, cr_ = x + math.cos(a) * d, r + math.sin(a) * d * 0.7
        k.tube((cx_, cr_, z), (cx_ + rng.uniform(-0.04, 0.04), cr_, z + rng.uniform(0.08, 0.16) * s), 0.025 * s, col[0], 'crystal',
               rb=0.003, emit=(col[1], glow * 0.8), verts=5, smooth=False)
    if energy:
        k.point_light(x, r + 0.3, z + 0.5 * s, col[1], energy, radius=0.12, group='flicker')
    if solid:
        k.solid(x - 0.35 * s, r - 0.3 * s, x + 0.35 * s, r + 0.3 * s)


# ---- built things --------------------------------------------------------------------------------------------------
def drystone(k, pts, h=0.42, d=0.26, tone='#8a8274', cap='#7a7468', moss='#4e6a34', seed=0, gaps=(), solid=False):
    """A dry-stone wall along a polyline: courses of stones of uneven length, each its own tone, a cap of upright
    stones, moss on top here and there. gaps: (x, r, rad) left open (a gateway). solid: block the cell under each
    stone (a staircase of cells along a slanting wall: short runs are obstacles, never a barrier)."""
    rng = random.Random(seed)
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, br - ar)
        ux, ur = (bx - ax) / L, (br - ar) / L
        t = 0.0
        while t < L - 0.05:
            sl = min(rng.uniform(0.22, 0.42), L - t)
            mx, mr = ax + ux * (t + sl / 2), ar + ur * (t + sl / 2)
            if any(math.hypot(mx - gx, mr - gr) < grad for (gx, gr, grad) in gaps):
                t += sl
                continue
            nz = 0.0
            for c in range(3):
                ch = h * rng.uniform(0.28, 0.36) if c < 2 else h * rng.uniform(0.18, 0.28)
                off = rng.uniform(-0.04, 0.04)
                xa, ra = ax + ux * (t + 0.012), ar + ur * (t + 0.012)
                xb, rb = ax + ux * (t + sl - 0.012), ar + ur * (t + sl - 0.012)
                ww = d * (1 - 0.15 * c)
                k.bar(xa - ur * off, ra + ux * off, xb - ur * off, rb + ux * off, nz, nz + ch - 0.01, ww,
                      (shade(cap if c == 2 else tone, rng.uniform(0.82, 1.14)), 0.2), 'drystone')
                nz += ch
            if moss and rng.random() < 0.3:
                k.blob(mx, mr, nz, sl * 0.45, d * 0.45, 0.04, (moss, 0.3), 'wall_moss', segs=7)
            if solid:
                k.solid(mx - 0.05, mr - 0.05, mx + 0.05, mr + 0.05)
            t += sl


def lantern_post(k, x, r, h=1.9, energy=16, glow=None, light='#ffd8a0'):
    """A lamp post (assets_town's) with an optional tinted point light."""
    W.lantern_post(k, x, r, h=h, energy=energy)
    if glow:
        k.point_light(x + 0.3, r + 0.2, h - 0.2, glow, energy * 0.5, radius=0.1, group='flicker')


def crates(k, x, r, n=2, seed=None):
    rng = _rng(x, r, 19) if seed is None else random.Random(seed)
    A.crate(k, x, r, s=rng.uniform(0.5, 0.58))
    if n > 1:
        A.crate(k, x + rng.uniform(-0.05, 0.05), r + 0.02, s=rng.uniform(0.38, 0.44), z0=0.52, solid=False)


def basket(k, x, r, fill='#e05a8a', glow=None, s=0.18):
    """A wicker basket, filled (glowing if glow)."""
    k.cyl(x, r, 0.0, s * 1.1, s, ('#9a7444', 0.3), 'basket', verts=10)
    for j in range(3):
        k.cyl(x, r, s * (0.25 + 0.3 * j), s * (0.3 + 0.3 * j), s * 1.02, '#7a5a34', 'basket_band', verts=10)
    k.blob(x, r, s * 1.1, s * 0.85, s * 0.85, s * 0.3, shade(fill, 0.6) if glow else (fill, 0.3), 'basket_fill',
           emit=(glow, 0.5) if glow else None, segs=8)


def signpost(k, x, r, arms=((0.6, '#d8c8a0'), (-0.6, '#c8b890')), h=1.45, wood='#5a3a22'):
    """A wooden finger post: arms pointing along the paths (dx sign)."""
    k.box(x - 0.05, r - 0.05, 0.0, x + 0.05, r + 0.05, h, (wood, 0.2), 'sign_post')
    for i, (dx, col) in enumerate(arms):
        z = h - 0.18 - i * 0.24
        x1 = x + dx
        k.box(min(x, x1), r + 0.05, z, max(x, x1), r + 0.09, z + 0.16, (col, 0.25), 'sign_arm')
        tip = x1 + (0.08 if dx > 0 else -0.08)
        k.poly([(x1, r + 0.091, z), (tip, r + 0.091, z + 0.08), (x1, r + 0.091, z + 0.16)], (col, 0.25), 'sign_arm')
    k.solid_post(x, r)


def footprints(k, pts, z_at, tone, every=0.32, seed=0):
    """A trail of worn footprints along a polyline (a path's middle)."""
    rng = random.Random(seed)
    i = 0
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, br - ar)
        t = 0.0
        while t < L:
            x, r = ax + (bx - ax) * t / L, ar + (br - ar) * t / L
            nx, nr = -(br - ar) / L, (bx - ax) / L
            off = 0.1 if i % 2 else -0.1
            px, pr = x + nx * off + rng.uniform(-0.02, 0.02), r + nr * off
            k.blob(px, pr, z_at(px, pr) + 0.004, 0.05, 0.075, 0.01, (tone, 0.3), 'path_print', segs=6)
            t += every
            i += 1


# ---- test renders ---
_T0 = [None]


def tick(label):
    """Print how long the build has taken so far (SCENE_TICK=1): where a slow scene spends its time."""
    import os
    import time
    if not os.environ.get('SCENE_TICK'):
        return
    if _T0[0] is None:
        _T0[0] = time.time()
    print('[%6.1fs] %s' % (time.time() - _T0[0], label), flush=True)


# ---- (the crop and sample cap) ----------------------------------------------------------------------------------------------------
def test_hooks(k):
    """For quick looks while building: SCENE_CROP='x0,r0,x1,r1' (tiles) renders only that window of the frame (every
    pass, so scene_post finishes the crop on its own); SCENE_SAMPLES caps the light samples. Off unless set."""
    import os
    crop = os.environ.get('SCENE_CROP')
    cap = os.environ.get('SCENE_SAMPLES')
    if crop or cap:
        settings = k._settings

        def patched(samples, *a, **kw):
            settings(min(samples, int(cap)) if cap else samples, *a, **kw)      # the probes too (they ask for 64)
            if crop:
                x0, r0, x1, r1 = (float(v) for v in crop.split(','))
                rd, ts = k.scene.render, 32
                ox, oy = k.origin
                rd.use_border, rd.use_crop_to_border = True, True
                rd.border_min_x, rd.border_max_x = (ox + x0 * ts) / k.resx, (ox + x1 * ts) / k.resx
                rd.border_min_y, rd.border_max_y = 1 - (oy + r1 * ts) / k.resy, 1 - (oy + r0 * ts) / k.resy
        k._settings = patched
    if crop:                                         # the grass grows only in the window (the slowest part of a build)
        meadow = W.meadow
        x0, r0, x1, r1 = (float(v) for v in crop.split(','))

        def cropped(k_, tone, area=None, cells=None, **kw):
            if cells is not None:
                cells = [(c, r) for (c, r) in cells if x0 - 1 <= c <= x1 and r0 - 1 <= r <= r1 + 2]
            return meadow(k_, tone, area=area, cells=cells, **kw)
        W.meadow = cropped


# ---- fewer objects ---------------------------------------------------------------------------------------------------
def merge_parts(k, block=3.0):
    """Join the scene's many small parts into a few meshes before it renders: parts alike (the same name, colour, glow,
    tree, variant) within the same block × block tiles become one object. A rich island is tens of thousands of blobs
    (every leaf clump, flower and fern frond its own object) and Blender pays for each one on every pass; joined, a
    full render takes a fraction of the time and looks the same. The ground and coast (already a few big meshes whose
    grain is laid in tile units by their size) are left as they are. Run last in k.later (after the grass)."""
    import bmesh
    import bpy
    from collections import defaultdict
    from mathutils import Vector
    from scenekit import S
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    groups = defaultdict(list)
    for p in k.parts:
        n = p.get('pname') or ''
        if p['albedo'] == 'HOLDOUT' or n.startswith(k.GROUND) or n.startswith(('ridge', 'coast')):
            continue
        o = p['obj']
        c = o.matrix_world @ (sum((Vector(b) for b in o.bound_box), Vector()) / 8)
        key = (n, repr(p['albedo']), repr(p['emit']), p.get('fol'), p.get('tree', 0), id(p['var']) if p['var'] else 0,
               p.get('nature'), int(c.x // block), int((-c.y / S) // block))
        groups[key].append(p)
    before = len(k.parts)
    gone = set()
    for key, ps in groups.items():
        if len(ps) < 2:
            continue
        bm = bmesh.new()
        for p in ps:
            o = p['obj']
            me = o.evaluated_get(dg).to_mesh()
            me.transform(o.matrix_world)
            bm.from_mesh(me)
            o.evaluated_get(dg).to_mesh_clear()
        me = bpy.data.meshes.new('merged')
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new('merged', me)
        k.scene.collection.objects.link(ob)
        ob.data.materials.append(bpy.data.materials.new('tmp'))
        d = {kk: v for kk, v in ps[0].items() if kk != 'obj'}
        d['obj'] = ob
        for p in ps:
            gone.add(id(p))
            bpy.data.objects.remove(p['obj'], do_unlink=True)
        k.parts.append(d)
        if d['var'] is not None:
            d['var']['parts'] = [q for q in d['var']['parts'] if id(q) not in gone] + [d]
    k.parts = [p for p in k.parts if id(p) not in gone]
    for v in k.variants:
        v['parts'] = [q for q in v['parts'] if id(q) not in gone]
        for p in k.parts:
            if p['var'] is v and p not in v['parts']:
                v['parts'].append(p)
    print('merge_parts: %d parts -> %d' % (before, len(k.parts)), flush=True)



# ---- the Look Book's own small things (dioramas/sylvara_brook.py), lifted as they are --------------------------------------
# Elderglade Brook's builders, fitted to an island: the ground's height comes from z (a function (x, r) -> z, default
# flat), the scene's dice are left alone (each call rolls its own: own_dice), and the colours default to the brook's.
BARK, MOSS, MOSS_L, STONE_LB, LEAF = '#5e4430', '#4f7a34', '#76a048', '#7e7c6c', '#3f6e30'
_flat = lambda x, r: 0.0


def fern(k, cx, cr, s=0.5, fronds=8, tone='#4a8a3a', z=None, z_at=_flat, seed=None):
    """A fern: arching fronds, each a stem with leaflets either side, as one mesh (sylvara_brook.fern)."""
    rng = _rng(cx, cr, 5) if seed is None else random.Random(seed)
    z0 = z_at(cx, cr) if z is None else z
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
                    quads.append(((prev[0], prev[1], prev[2]), (x, r, zz), tip,
                                  ((prev[0] + tip[0]) / 2, (prev[1] + tip[1]) / 2, (prev[2] + tip[2]) / 2)))
            prev = (x, r, zz)
    with k.foliage('leaf'):
        k.quads(quads, (shade(tone, rng.uniform(0.85, 1.1)), 0.25), 'fern')


def boulder(k, cx, cr, s=0.5, tone=STONE_LB, moss=MOSS_L, z=None, z_at=_flat, tufts=None, solid=True, seed=None):
    """A mossy boulder with a smaller stone at its foot (sylvara_brook.boulder); tufts: grass round its foot (a colour);
    solid: blocks the tile under it."""
    rng = _rng(cx, cr, 3) if seed is None else random.Random(seed)
    z0 = z_at(cx, cr) if z is None else z
    with own_dice(k, rng.randrange(10 ** 6)):
        k.rock(cx, cr, z0 + s * 0.15, s, s * 0.8, s * 0.62, (tone, 0.35), part='rock', segs=10)
        k.rock(cx + s * 0.55, cr + s * 0.3, z0 + s * 0.05, s * 0.4, s * 0.34, s * 0.3, (shade(tone, 0.9), 0.35), part='rock', segs=8)
    if moss:
        k.blob(cx - s * 0.1, cr - s * 0.1, z0 + s * 0.7, s * 0.75, s * 0.55, s * 0.18, (moss, 0.4), 'rock_moss', segs=10)
        for _ in range(3):
            k.blob(cx + rng.uniform(-s, s) * 0.6, cr + s * 0.3, z0 + s * rng.uniform(0.35, 0.6), s * 0.25, s * 0.15, s * 0.12,
                   (shade(moss, 0.95), 0.4), 'rock_moss', segs=7)
    if tufts:
        k.blades([(cx + math.cos(a) * s * rng.uniform(0.9, 1.2), cr + math.sin(a) * s * rng.uniform(0.7, 1.0), z0,
                   rng.uniform(0.08, 0.18), 0.022, rng.uniform(-0.06, 0.06), rng.uniform(-0.04, 0.04))
                  for a in [rng.uniform(0, math.tau) for _ in range(int(10 + 14 * s))]], (tufts, 0.25), 'tuft')
    if solid:
        k.solid(cx - s * 0.6, cr - s * 0.5, cx + s * 0.6, cr + s * 0.5)


def pebbles(k, x0, r0, x1, r1, n, tone=STONE_LB, z_at=_flat, ok=lambda x, r: True, seed=0):
    rng = random.Random(seed)
    with own_dice(k, seed + 1):
        for _ in range(n):
            x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
            if not ok(x, r):
                continue
            s = rng.uniform(0.04, 0.1)
            k.rock(x, r, z_at(x, r) + s * 0.2, s, s * 0.8, s * 0.5, (shade(tone, rng.uniform(0.8, 1.2)), 0.25), part='pebble', segs=6)


def flowers(k, x, r, n=8, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8'), spread=0.35, z_at=_flat, seed=None):
    """Small flowers on stems over a patch (sylvara_brook.flowers): n of them within spread of (x, r)."""
    rng = _rng(x, r, 13) if seed is None else random.Random(seed)
    for _ in range(n):
        fx, fr = x + rng.uniform(-spread, spread), r + rng.uniform(-spread, spread) * 0.8
        z0, h = z_at(fx, fr), rng.uniform(0.06, 0.18)
        k.cone(fx, fr, z0, z0 + h, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
        k.sphere(fx, fr, z0 + h, 0.035, 0.03, rng.choice(cols), 'flower', segs=5)


def leaf_litter(k, x0, r0, x1, r1, n, ok=lambda x, r: True, z_at=_flat, cols=('#a0682a', '#c08a30', '#7a4a22', '#8a9a3a', '#b05a2a'),
                seed=0):
    rng = random.Random(seed)
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if not ok(x, r):
            continue
        k.blob(x, r, z_at(x, r) + 0.004, 0.06, 0.04, 0.008, (rng.choice(cols), 0.25), 'leaf_litter', rot=(0, 0, rng.uniform(0, 360)), segs=5)


def mushroom_ring(k, cx, cr, n=4, glow=False, col='#86f2d6', cap='#b8402e', z_at=_flat, light=3.0, seed=None):
    rng = _rng(cx, cr, 29) if seed is None else random.Random(seed)
    for _ in range(n):
        x, r = cx + rng.uniform(-0.22, 0.22), cr + rng.uniform(-0.16, 0.16)
        z0 = z_at(x, r)
        h = rng.uniform(0.08, 0.2)
        k.cyl(x, r, z0, z0 + h, 0.024, '#ece2d0', 'mushroom_stem', verts=7)
        rad = rng.uniform(0.055, 0.09)
        if glow:
            k.sphere(x, r, z0 + h, rad, rad * 0.55, col, 'mushroom_cap', emit=(col, 1.5), segs=10)
        else:
            k.sphere(x, r, z0 + h, rad, rad * 0.6, (cap, 0.25), 'mushroom_cap', segs=10)
            for d in range(3):                                            # white spots
                aa = rng.uniform(0, math.tau)
                k.sphere(x + math.cos(aa) * rad * 0.5, r + math.sin(aa) * rad * 0.4, z0 + h + rad * 0.42, 0.014, 0.008, '#f4ece0',
                         'mushroom_spot', segs=5)
    if glow and light:
        k.point_light(cx, cr + 0.1, z_at(cx, cr) + 0.3, col, light, radius=0.1)


def glow_spores(k, cx, cr, n=6, spread=0.35, col='#86f2d6', z_at=_flat, seed=None):
    rng = _rng(cx, cr, 31) if seed is None else random.Random(seed)
    for _ in range(n):
        x, r = cx + rng.uniform(-spread, spread), cr + rng.uniform(-spread, spread) * 0.8
        k.sphere(x, r, z_at(x, r) + rng.uniform(0.02, 0.12), 0.03, 0.03, col, 'spore', emit=(col, 1.3), segs=6)


def log(k, x0, x1, cr, rad, bark=BARK, moss=MOSS_L, z_at=_flat, fungi=True, seed=4):
    """A fallen log (sylvara_brook.log): lofted with a bumpy section, pale cut ends with a darker ring, bark ridges, a
    broken branch stub, moss along its top, bracket fungi on its side. Blocks the tiles under it."""
    rng = random.Random(seed)
    rings = []
    n = 16
    for i in range(12):
        t = i / 11
        x = x0 + (x1 - x0) * t
        rr = rad * (1.06 - 0.16 * t) * (1 + 0.08 * math.sin(t * 9 + seed))
        cz = z_at(x, cr) + rr * 0.85
        ring = []
        for j in range(n):
            a = j / n * math.tau
            bump = 1 + 0.07 * math.cos(5 * a + seed) + 0.04 * math.cos(9 * a)
            ring.append((x, cr + math.cos(a) * rr * bump * 0.95, cz + math.sin(a) * rr * bump))
        rings.append(ring)
    k.loft(rings, (bark, 0.36), 'log', closed=True)
    for end, rr in ((rings[0], rad * 1.06), (rings[-1], rad * 0.9)):
        x = end[0][0]
        cz = z_at(x, cr) + rr * 0.85
        k.cyl_x(x - 0.012, x + 0.012, cr, cz, rr * 0.92, rr * 0.92, ('#c09a6c', 0.3), 'log_end', verts=16)
        k.cyl_x(x - 0.016, x + 0.016, cr, cz, rr * 0.45, rr * 0.45, ('#9a7448', 0.3), 'log_end', verts=12)
    for i in range(9):
        a = rng.uniform(0.2, math.pi - 0.2)
        z = z_at((x0 + x1) / 2, cr) + rad * 0.85 + math.sin(a) * rad
        k.tube((x0 + 0.15, cr + math.cos(a) * rad * 0.95, z), (x1 - 0.15, cr + math.cos(a) * rad * 0.85, z - 0.03), 0.025,
               (shade(bark, rng.choice((0.75, 1.2))), 0.3), 'bark_ridge', verts=4, smooth=False)
    bx = x0 + (x1 - x0) * 0.62
    k.tube((bx, cr - 0.1, z_at(bx, cr) + rad * 1.5), (bx + 0.2, cr - 0.35, z_at(bx, cr) + rad * 2.2), 0.07, (bark, 0.3), 'branch', rb=0.04, verts=7)
    for _ in range(6):
        x = rng.uniform(x0 + 0.2, x1 - 0.2)
        k.blob(x, cr - 0.05, z_at(x, cr) + rad * 1.75, rad, rad * 0.65, rad * 0.25, (shade(moss, rng.uniform(0.9, 1.1)), 0.4), 'log_moss', segs=8)
    if fungi:
        for _ in range(4):
            x = rng.uniform(x0 + 0.3, x1 - 0.3)
            z = z_at(x, cr) + rng.uniform(0.15, 0.35) * rad / 0.28
            k.cyl_y(x, cr + rad * 0.78, cr + rad * 1.2, z, 0.09, 0.03, ('#d8b880', 0.25), 'fungus', verts=10)
    k.solid(min(x0, x1), cr - rad, max(x0, x1), cr + rad)


def moss_mound(k, x, r, s, moss=MOSS_L, z_at=_flat, seed=None):
    rng = _rng(x, r, 37) if seed is None else random.Random(seed)
    k.blob(x, r, z_at(x, r) + 0.01, s, s * 0.8, s * 0.38, (shade(moss, rng.uniform(0.85, 1.12)), 0.4), 'moss_mound', segs=9)


def twig(k, x, r, z_at=_flat, seed=None):
    rng = _rng(x, r, 41) if seed is None else random.Random(seed)
    a = rng.uniform(0, math.pi)
    L = rng.uniform(0.25, 0.5)
    z = z_at(x, r) + 0.02
    k.tube((x, r, z), (x + math.cos(a) * L, r + math.sin(a) * L * 0.8, z + 0.01), 0.018, ('#5a4030', 0.3), 'twig', rb=0.01, verts=4)


def path_stones(k, path, z_at=_flat, tone=STONE_LB, half=0.46, every=0.55, seed=0):
    """Stones edging a path (sylvara_brook's), one side or the other every `every` tiles."""
    rng = random.Random(seed)
    with own_dice(k, seed + 7):
        for a, b in zip(path, path[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            for i in range(int(L / every)):
                t = (i + rng.uniform(0, 0.6)) / max(1, int(L / every))
                x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                nx, nr = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
                side = rng.choice((-1, 1))
                px, pr = x + nx * half * side, r + nr * half * side
                s = rng.uniform(0.07, 0.13)
                k.rock(px, pr, z_at(px, pr) + s * 0.25, s, s * 0.8, s * 0.55, (shade(tone, rng.uniform(0.8, 1.15)), 0.3), part='path_stone',
                       segs=7)


def fast_top(k):
    """Swap k.top (a ray straight down: the part on top and its height, what the grass asks before every blade) for one
    that asks a single BVH tree over everything built, made once on the first call. Blender's scene ray cast tests every
    object in turn: with thousands of parts the grass took most of an hour. Same answers, by part name."""
    import bpy
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    from scenekit import S
    state = {}

    def build():
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        verts, polys, names = [], [], []
        for p in k.parts:
            o = p['obj']
            if p['var'] is not None or o.hide_render:
                continue
            me = o.evaluated_get(dg).to_mesh()
            M = o.matrix_world
            base = len(verts)
            verts.extend(M @ v.co for v in me.vertices)
            for f in me.polygons:
                polys.append([base + i for i in f.vertices])
                names.append(p.get('pname'))
            o.evaluated_get(dg).to_mesh_clear()
        state['tree'] = BVHTree.FromPolygons(verts, polys, all_triangles=False)
        state['names'] = names

    def top(x, r):
        if 'tree' not in state:
            build()
        loc, _n, i, _d = state['tree'].ray_cast(Vector((x, -r * S, 30.0)), Vector((0, 0, -1)))
        if loc is None:
            return None, None
        return state['names'][i], loc.z
    k.top = top
