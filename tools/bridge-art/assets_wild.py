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
def boulder(k, x, r, s=0.4, tone='#7a766c', moss='#4e6a34', z=0.0, tufts='#5a7a3a', seed=None):
    """A boulder sitting in the turf: faceted rock, a cap of moss on the side facing up, grass at its foot."""
    rng = _rng(x, r, 3) if seed is None else random.Random(seed)
    k.rock(x, r, z + s * 0.32, s, s * 0.82, s * 0.72, (shade(tone, rng.uniform(0.85, 1.1)), 0.2), part='boulder', segs=10,
           jitter=0.16, seed=rng.randrange(10 ** 6))
    if moss:
        k.blob(x - s * 0.1, r - s * 0.05, z + s * 0.78, s * 0.62, s * 0.5, s * 0.16, (moss, 0.3), 'boulder_moss', segs=10)
    if tufts:
        bl = []
        for i in range(int(10 + 14 * s)):
            a = rng.uniform(0, math.tau)
            d = s * rng.uniform(0.85, 1.15)
            bl.append((x + math.cos(a) * d, r + math.sin(a) * d * 0.8, z, rng.uniform(0.08, 0.18), 0.022,
                       rng.uniform(-0.06, 0.06), rng.uniform(-0.04, 0.04)))
        k.blades(bl, (tufts, 0.25), 'tuft')
    k.solid(x - s * 0.8, r - s * 0.6, x + s * 0.8, r + s * 0.6)


def fern(k, x, r, s=0.45, tone='#4a7a34', z=0.0, fronds=None, seed=None):
    """A fern: arching fronds round its heart, each a strip of leaflets (foliage)."""
    rng = _rng(x, r, 5) if seed is None else random.Random(seed)
    n = fronds or rng.randint(6, 9)
    with k.foliage('leaf'):
        for i in range(n):
            a = i / n * math.tau + rng.uniform(-0.2, 0.2)
            L = s * rng.uniform(0.8, 1.15)
            col = shade(tone, rng.uniform(0.82, 1.15))
            pts = []
            for j in range(5):
                t = (j + 1) / 5
                pts.append((x + math.cos(a) * L * t, r + math.sin(a) * L * t * 0.75, z + L * 0.75 * math.sin(math.pi * t * 0.75)))
            prev = (x, r, z + 0.02)
            for j, p in enumerate(pts):
                k.blob((prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2, (prev[2] + p[2]) / 2, L * 0.13 * (1.2 - j * 0.18),
                       L * 0.06, L * 0.022, (col, 0.25), 'fern', rot=(0, 0, math.degrees(a)), segs=6)
                prev = p


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
                k.sphere(bx, br, bz, 0.045, 0.04, shade(blooms, 0.6), 'rose', emit=(bloom_glow, 0.55), segs=6)
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


def flowers(k, x, r, n=8, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8'), spread=0.35, z=0.0, seed=None):
    """A clump of one kind of small flower on short stems."""
    rng = _rng(x, r, 13) if seed is None else random.Random(seed)
    col = rng.choice(cols)
    bl = []
    for _ in range(n):
        fx, fr = x + rng.uniform(-spread, spread), r + rng.uniform(-spread, spread) * 0.7
        h = rng.uniform(0.08, 0.16)
        bl.append((fx, fr, z, h, 0.015, rng.uniform(-0.03, 0.03), 0.0))
        k.sphere(fx, fr, z + h, 0.035, 0.03, (col, 0.3), 'bloom', segs=5)
    k.blades(bl, ('#4a7a34', 0.25), 'tuft')


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


# ---- test renders ----------------------------------------------------------------------------------------------------
def test_hooks(k):
    """For quick looks while building: SCENE_CROP='x0,r0,x1,r1' (tiles) renders only that window of the frame (every
    pass, so scene_post finishes the crop on its own); SCENE_SAMPLES caps the light samples. Off unless set."""
    import os
    crop = os.environ.get('SCENE_CROP')
    if crop:
        x0, r0, x1, r1 = (float(v) for v in crop.split(','))
        settings = k._settings

        def patched(*a, **kw):
            settings(*a, **kw)
            rd, ts = k.scene.render, 32
            ox, oy = k.origin
            rd.use_border, rd.use_crop_to_border = True, True
            rd.border_min_x, rd.border_max_x = (ox + x0 * ts) / k.resx, (ox + x1 * ts) / k.resx
            rd.border_min_y, rd.border_max_y = 1 - (oy + r1 * ts) / k.resy, 1 - (oy + r0 * ts) / k.resy
        k._settings = patched
    cap = os.environ.get('SCENE_SAMPLES')
    if cap:
        render = k.render

        def capped(out, *a, **kw):
            kw['light_samples'] = min(kw.get('light_samples', 160), int(cap))
            return render(out, *a, **kw)
        k.render = capped


# ---- crags ----------------------------------------------------------------------------------------------------------
def rock_block(k, x0, x1, rf, rback, z_top, lean, col, seed, ledge=None, lip=None, cracks=None, part='crag'):
    """One block of a crag face (the Hoarfell tarn's): a jagged top edge, the face leaning back by `lean`, its sides
    seen in the cracks between blocks, the top lying back to the next tier — `ledge` (colour) lies over it (ash, turf,
    snow) with a rounded `lip` along the front edge; `cracks` (colour) runs a seam or two up the face (glowing if a
    (colour, glow) pair)."""
    rr = random.Random(seed)
    n = max(3, int((x1 - x0) / 0.18))
    tops = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        if 0 < i < n:
            z = z_top + rr.uniform(-0.1, 0.08) + (0.14 if rr.random() < 0.15 else 0.0) * rr.choice((-1, 1))
        else:
            z = z_top + rr.uniform(-0.12, -0.02)
        tops.append((x, z))
    xm = (x0 + x1) / 2
    outline = [(x0, rf, 0.0)] + [(x, rf - lean, z) for (x, z) in tops] + [(x1, rf, 0.0)]
    k.poly([(xm, rf, 0.0)] + outline, (col, 0.07), part + '_face')
    for (x, z) in (tops[0], tops[-1]):
        k.loft([[(x, rf, 0.0), (x, rf - lean, z)], [(x, rback, 0.0), (x, rback, z)]], (shade(col, 0.8), 0.07), part + '_side', smooth=False)
    top_col = ledge or shade(col, 1.12)
    k.loft([[(x, rf - lean, z + 0.01) for (x, z) in tops], [(x, rback, z + 0.01) for (x, z) in tops]], (top_col, 0.05),
           part + '_ledge', smooth=True)
    if lip:
        for (xa, za), (xb, zb) in zip(tops, tops[1:]):
            k.tube((xa, rf - lean + 0.02, za + 0.025), (xb, rf - lean + 0.02, zb + 0.025), 0.05, (lip, 0.05), part + '_lip', verts=6)
    # bedding lines across the face, a step in it here and there
    for f in (0.35, 0.68):
        if rr.random() < 0.8:
            zl = z_top * f + rr.uniform(-0.05, 0.05)
            k.tube((x0 + 0.03, rf - lean * f + 0.006, zl), (x1 - 0.03, rf - lean * f + 0.006, zl + rr.uniform(-0.05, 0.05)), 0.016,
                   (shade(col, 0.62), 0.07), part + '_bed', verts=4)
    if cracks:
        cc, glow = cracks if isinstance(cracks, tuple) else (cracks, None)
        for _ in range(rr.randint(0, 2)):
            cx = rr.uniform(x0 + 0.15, x1 - 0.15)
            zc = rr.uniform(0.35, 0.85) * z_top
            k.tube((cx, rf + 0.004, 0.02), (cx + rr.uniform(-0.08, 0.08), rf - lean * zc / z_top + 0.004, zc), 0.02,
                   cc if glow else (cc, 0.05), part + '_crack', emit=(glow, 0.8) if glow else None, verts=4)


def crag(k, front, x0, x1, tiers, faces, seed=0, skip=(), ledge=None, lip=None, cracks=None, core='#2a2426', part='crag'):
    """A crag of tiers stepping back up a slope: front(x) -> the row of its foot at x; tiers: [(top z, set back)], front
    to back; each tier a run of blocks split by cracks, a solid core behind so nothing shows through. skip: (xa, xb)
    spans left open in the lower tiers (a cave mouth, a recess)."""
    rr = random.Random(seed)
    for ti, (zt, back) in enumerate(tiers):
        nxt = tiers[ti + 1][1] if ti + 1 < len(tiers) else back + 0.8
        x = x0 - rr.uniform(0.0, 0.5)
        while x < x1:
            w = rr.uniform(0.5, 1.7) if ti < len(tiers) - 1 else rr.uniform(1.0, 2.0)
            xe = min(x1, x + w)
            xm = (x + xe) / 2
            if any(a < xm < b for (a, b) in skip) and ti < len(tiers) - 1:
                x = xe
                continue
            gap = rr.uniform(0.03, 0.08)
            f = front(xm) - back + rr.uniform(-0.12, 0.1)
            top = zt + rr.uniform(-0.18, 0.12)
            rock_block(k, x + gap / 2, xe - gap / 2, f, front(xm) - nxt - 0.05, top, rr.uniform(0.06, 0.2), faces[rr.randrange(len(faces))],
                       rr.randrange(10 ** 6), ledge=ledge, lip=lip, cracks=cracks, part=part)
            k.box(x, front(xm) - nxt - 0.3, 0.0, xe, f - 0.25, top - 0.15, (core, 0.05), part + '_core')
            x = xe
