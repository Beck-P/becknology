"""The Spires — Arcadia above the smog (L480): white stone, gold and soft pastel neon under real stars. Pieces for
tools/bridge-art/scenes/arcadia_spires.py and the Spires' rooms, for scenekit (bpy). Tile units: x = column, r = row
(toward the camera), z = height.
"""
import math

from scenekit import shade
import assets_casino as CA
import assets_estate as E
import assets_signs as S
import assets_town as T

C45 = math.cos(math.radians(45))
STONE, STONE_L, STONE_D, STONE_K = '#e2dccf', '#eee9de', '#c9c1b2', '#a39a88'
GOLD, GOLD_L, GOLD_D = '#d8b060', '#f0d088', '#9a7834'
PINK, BLUE, LILAC, MINT, PEACH = '#f4a8d0', '#9ad8f0', '#c8b0f8', '#a8f0d0', '#ffc8a0'
PASTELS = (PINK, BLUE, LILAC, MINT, PEACH)
WARM = '#ffe0b0'
GLASS = '#1a2a48'
NIGHT_GLASS = ('#141c38', '#2a3a70')          # glass with the room's glow behind it


# ---- the ground: pale stone slabs, gold strips, inlaid stars ----------------------------------------------------------
def paving(k, x0, r0, x1, r1, size=1.0, strip=4, tones=('#ddd7ca', '#e4dfd3', '#d6cfc1', '#e8e3d8'), part='paving'):
    """Big slabs of pale stone, each its own tone, with a thin grout line and a gold strip every `strip` slabs."""
    groups = {t: [] for t in tones}
    r, j = r0, 0
    while r < r1 - 1e-6:
        rb = min(r1, r + size)
        x, i = x0, 0
        while x < x1 - 1e-6:
            xb = min(x1, x + size)
            t = tones[int(k.rng.random() * len(tones))]
            groups[t].append((x + 0.015, r + 0.015, -0.06, xb - 0.015, rb - 0.015, 0.0))
            x, i = xb, i + 1
        r, j = rb, j + 1
    for t, rects in groups.items():
        k.boxes(rects, (t, 0.06), part)
    k.box(x0, r0, -0.08, x1, r1, -0.02, ('#8f8676', 0.1), part + '_grout')
    if strip:
        golds = []
        x = x0 + strip
        while x < x1 - 0.5:
            golds.append((x - 0.03, r0, -0.005, x + 0.03, r1, 0.004))
            x += strip
        r = r0 + strip
        while r < r1 - 0.5:
            golds.append((x0, r - 0.03, -0.005, x1, r + 0.03, 0.004))
            r += strip
        k.boxes(golds, (GOLD, 0.25), part + '_gold')


def star_inlay(k, cx, cr, rad, points=8, col=GOLD, ink='#e8e2d6'):
    """A compass star inlaid flush in the paving: gold points on a pale disc ringed in gold."""
    E.flats(k, [E.ell(cx, cr, rad + 0.08, rad + 0.08, n=40)], 0.002, (col, 0.25), 'paving_inlay')
    E.flats(k, [E.ell(cx, cr, rad, rad, n=40)], 0.004, (ink, 0.08), 'paving_inlay')
    E.flats(k, [E.star(cx, cr, rad * 0.92, rad * 0.92, points, inner=0.28, rot=math.pi / points)], 0.006, (col, 0.25), 'paving_inlay')
    E.flats(k, [E.star(cx, cr, rad * 0.55, rad * 0.55, points, inner=0.35)], 0.008, ('#c8a8e8', 0.15), 'paving_inlay')
    E.flats(k, [E.ell(cx, cr, rad * 0.12, rad * 0.12, n=16)], 0.01, (GOLD_L, 0.3), 'paving_inlay')


def gravel(k, x0, r0, x1, r1, tone='#cfc6b4'):
    """A pale gravel walk, speckled."""
    k.box(x0, r0, -0.06, x1, r1, -0.005, (tone, 0.18), 'path')
    dots = {}
    n = int((x1 - x0) * (r1 - r0) * 10)
    for _ in range(n):
        x, r = k.rng.uniform(x0 + 0.05, x1 - 0.05), k.rng.uniform(r0 + 0.05, r1 - 0.05)
        c = k.rng.choice((shade(tone, 0.82), shade(tone, 1.1), shade(tone, 0.9)))
        dots.setdefault(c, []).append((x, r, -0.005, x + 0.05, r + 0.04, 0.0))
    for c, rr in dots.items():
        k.boxes(rr, c, 'path')


# ---- the edge of the world: the deck's face, the balustrade --------------------------------------------------------------
def deck_face(k, x0, x1, r, depth=3.0, led=LILAC):
    """The front of the platform falling away under the rail: white stone fascia, a gold band, a pastel light strip, the
    underside's ribs going down into the smog."""
    k.box(x0, r, -depth, x1, r + 0.25, -0.02, (STONE_D, 0.06), 'deck_face')
    k.box(x0, r + 0.25, -0.42, x1, r + 0.28, -0.3, (GOLD, 0.2), 'deck_gold')
    k.box(x0, r + 0.25, -0.62, x1, r + 0.27, -0.56, shade(led, 0.5), 'deck_led', emit=(led, 0.8))
    ribs = []
    x = x0 + 0.6
    while x < x1:
        ribs.append((x - 0.08, r, -depth, x + 0.08, r + 0.32, -0.7))
        x += 1.5
    k.boxes(ribs, (STONE_K, 0.08), 'deck_rib')


def deck_side(k, x, r0, r1, depth=3.0, face=1, led=LILAC):
    """The side of the platform, seen edge-on."""
    xa, xb = (x, x + 0.25) if face > 0 else (x - 0.25, x)
    k.box(xa, r0, -depth, xb, r1, -0.02, (STONE_D, 0.06), 'deck_face')
    k.box(xa, r0, -0.62, xb, r1, -0.56, shade(led, 0.5), 'deck_led', emit=(led, 0.8))


def balustrade(k, xa, xb, r, h=0.95, lamps=4.0, glow=LILAC):
    """A white stone balustrade along a row: a plinth, turned balusters, a broad top rail, piers with a gold cap every
    few tiles, now and then a frosted globe on a pier."""
    x0, x1 = min(xa, xb), max(xa, xb)
    k.box(x0, r - 0.14, 0.0, x1, r + 0.14, 0.14, (STONE_D, 0.06), 'balustrade_plinth')
    k.box(x0 - 0.02, r - 0.17, h - 0.1, x1 + 0.02, r + 0.17, h, (STONE_L, 0.05), 'balustrade_rail')
    bal = []
    x = x0 + 0.14
    while x < x1 - 0.1:
        bal.append(x)
        x += 0.22
    for bx in bal:
        k.cyl(bx, r, 0.14, h - 0.1, 0.045, (STONE, 0.05), 'baluster', verts=8)
        k.sphere(bx, r, 0.42, 0.065, 0.1, (STONE, 0.05), 'baluster', segs=8)
    n = max(1, int(round((x1 - x0) / lamps)))
    for i in range(n + 1):
        px = x0 + (x1 - x0) * i / n
        k.box(px - 0.17, r - 0.19, 0.0, px + 0.17, r + 0.19, h + 0.08, (STONE_L, 0.05), 'balustrade_pier')
        k.box(px - 0.2, r - 0.22, h + 0.08, px + 0.2, r + 0.22, h + 0.14, (GOLD, 0.2), 'pier_cap')
        if i % 2 == 0:
            k.sphere(px, r, h + 0.32, 0.17, 0.17, shade(glow, 0.6), 'pier_globe', emit=(glow, 0.9), segs=10)
            k.point_light(px, r + 0.3, h + 0.4, glow, 7, radius=0.2, group='flicker')
    k.solid(x0, r - 0.2, x1, r + 0.2)


def balustrade_v(k, x, ra, rb, h=0.95, lamps=4.0, glow=LILAC):
    """The same running back from the camera (a side edge)."""
    r0, r1 = min(ra, rb), max(ra, rb)
    k.box(x - 0.14, r0, 0.0, x + 0.14, r1, 0.14, (STONE_D, 0.06), 'balustrade_plinth')
    k.box(x - 0.17, r0 - 0.02, h - 0.1, x + 0.17, r1 + 0.02, h, (STONE_L, 0.05), 'balustrade_rail')
    r = r0 + 0.14
    while r < r1 - 0.1:
        k.cyl(x, r, 0.14, h - 0.1, 0.045, (STONE, 0.05), 'baluster', verts=8)
        r += 0.22
    n = max(1, int(round((r1 - r0) / lamps)))
    for i in range(n + 1):
        pr = r0 + (r1 - r0) * i / n
        k.box(x - 0.19, pr - 0.17, 0.0, x + 0.19, pr + 0.17, h + 0.08, (STONE_L, 0.05), 'balustrade_pier')
        k.box(x - 0.22, pr - 0.2, h + 0.08, x + 0.22, pr + 0.2, h + 0.14, (GOLD, 0.2), 'pier_cap')
        if i % 2 == 0:
            k.sphere(x, pr, h + 0.32, 0.17, 0.17, shade(glow, 0.6), 'pier_globe', emit=(glow, 0.9), segs=10)
    k.solid(x - 0.2, r0, x + 0.2, r1)


# ---- street furniture -----------------------------------------------------------------------------------------------------
def lamp(k, cx, cr, h=2.6, glow=WARM, energy=26):
    """A slender white-and-gold lamp standard, fluted, with a frosted globe in a gold cage."""
    k.cyl(cx, cr, 0.0, 0.2, 0.16, (STONE_L, 0.05), 'lamp_base', verts=10)
    k.cyl(cx, cr, 0.2, h - 0.3, 0.05, (STONE_L, 0.05), 'lamp_post', verts=10)
    for z in (0.5, h * 0.55):
        k.cyl(cx, cr, z, z + 0.05, 0.075, (GOLD, 0.2), 'lamp_ring', verts=10)
    k.cyl(cx, cr, h - 0.3, h - 0.24, 0.12, (GOLD, 0.2), 'lamp_cup', verts=10)
    k.sphere(cx, cr, h, 0.2, 0.22, shade(glow, 0.65), 'lamp_globe', emit=(glow, 0.95), segs=12)
    for a in range(4):
        aa = a * math.pi / 2 + math.pi / 4
        k.tube((cx + math.cos(aa) * 0.12, cr + math.sin(aa) * 0.12, h - 0.24), (cx + math.cos(aa) * 0.2, cr + math.sin(aa) * 0.2, h + 0.05),
               0.012, GOLD, 'lamp_cage', verts=4)
    k.cone(cx, cr, h + 0.18, h + 0.36, 0.08, 0.01, (GOLD, 0.2), 'lamp_finial', verts=8)
    k.point_light(cx, cr + 0.15, h, glow, energy, radius=0.25, group='flicker')
    k.point_light(cx, cr + 0.15, 0.8, glow, energy * 0.6, radius=0.3, group='flicker')
    k.solid_post(cx, cr)


def bench(k, x0, x1, cr, back=None):
    """A white stone bench on two scrolled ends, a gold rail along the back (back=-1 behind it, 1 in front, None none)."""
    k.box(x0, cr - 0.22, 0.36, x1, cr + 0.22, 0.46, (STONE_L, 0.05), 'bench_seat', bevel=0.02)
    for x in (x0 + 0.12, x1 - 0.32):
        k.box(x, cr - 0.2, 0.0, x + 0.2, cr + 0.2, 0.36, (STONE_D, 0.06), 'bench_end')
    if back:
        rb = cr + back * 0.2
        for x in (x0 + 0.2, x1 - 0.2):
            k.box(x - 0.03, rb - 0.03, 0.46, x + 0.03, rb + 0.03, 0.85, GOLD, 'bench_post')
        k.box(x0 + 0.1, rb - 0.04, 0.78, x1 - 0.1, rb + 0.04, 0.88, (GOLD, 0.2), 'bench_back')
    k.solid(x0, cr - 0.25, x1, cr + 0.25)


def planter(k, cx, cr, w=0.9, d=0.9, kind='ball', tone='#2e5038', h=0.6, bloom=None):
    """A square white stone planter, gold-rimmed, with something clipped in it: 'ball', 'cone', 'tree' (a small real
    tree), 'flowers'."""
    k.box(cx - w / 2, cr - d / 2, 0.0, cx + w / 2, cr + d / 2, h, (STONE, 0.06), 'planter', bevel=0.02)
    k.box(cx - w / 2 - 0.04, cr - d / 2 - 0.04, h, cx + w / 2 + 0.04, cr + d / 2 + 0.04, h + 0.06, (GOLD, 0.2), 'planter_rim')
    k.box(cx - w / 2 + 0.06, cr - d / 2 + 0.06, h, cx + w / 2 - 0.06, cr + d / 2 - 0.06, h + 0.04, '#2a2018', 'soil')
    if kind == 'ball':
        with k.foliage('needle'):
            T.leafy_crown(k, cx, cr, h + 0.42, w * 0.42, d * 0.42, 0.42, shade(tone, k.rng.uniform(0.95, 1.05)), part='topiary')
    elif kind == 'cone':
        with k.foliage('needle'):
            for i in range(4):
                z = h + 0.15 + i * 0.32
                s = (1 - i / 4.4) * w * 0.42
                T.leafy_crown(k, cx, cr, z + 0.12, s, s, 0.24, shade(tone, 0.95 + i * 0.04), part='topiary', sprigs=False)
    elif kind == 'tree':
        k.cyl(cx, cr, h, h + 0.9, 0.06, ('#5a4632', 0.12), 'trunk', verts=6)
        with k.foliage('leaf'):
            T.leafy_crown(k, cx, cr, h + 1.25, 0.55, 0.5, 0.48, tone)
            if bloom:
                for _ in range(14):
                    a, z = k.rng.uniform(0, math.tau), k.rng.uniform(-0.2, 0.35)
                    k.sphere(cx + math.cos(a) * 0.5, cr + math.sin(a) * 0.42 + 0.1, h + 1.25 + z, 0.06, 0.05, bloom, 'blossom', segs=5)
    else:
        cols = bloom or (PINK, '#f0f0f0', LILAC, PEACH)
        for _ in range(int(w * d * 22)):
            x, r = cx + k.rng.uniform(-w / 2 + 0.1, w / 2 - 0.1), cr + k.rng.uniform(-d / 2 + 0.1, d / 2 - 0.1)
            k.cone(x, r, h, h + 0.14, 0.03, 0.005, '#3a6a3a', 'leaf_stem', verts=3)
            k.sphere(x, r, h + 0.16, 0.05, 0.04, k.rng.choice(cols), 'flower', segs=5)
    k.solid(cx - w / 2, cr - d / 2, cx + w / 2, cr + d / 2)


def hedge(k, x0, x1, cr, h=0.7, d=0.5, tone='#2a4a32'):
    """A clipped box hedge along a row: a dark core under small clumps (it reads as leaves), clipped flat on top."""
    with k.foliage('needle'):
        x = x0
        while x < x1 - 0.05:
            xb = min(x1, x + 0.6)
            T.leafy_crown(k, (x + xb) / 2, cr, h * 0.55, (xb - x) * 0.62, d * 0.55, h * 0.5, shade(tone, k.rng.uniform(0.95, 1.05)),
                          part='hedge', sprigs=False)
            x = xb
    k.solid(x0, cr - d / 2, x1, cr + d / 2)


def flower_border(k, x0, x1, cr, d=0.5, cols=(PINK, '#f8f0f4', LILAC, PEACH, '#e8e070')):
    """Flowers in clumps of one kind along the foot of a hedge or a wall."""
    x = x0
    while x < x1:
        c = k.rng.choice(cols)
        for _ in range(7):
            fx, fr = x + k.rng.uniform(0, 0.5), cr + k.rng.uniform(-d / 2, d / 2)
            k.cone(fx, fr, 0.0, 0.18, 0.035, 0.005, '#3a6a3a', 'leaf_stem', verts=3)
            k.sphere(fx, fr, 0.2, 0.055, 0.045, c, 'flower', segs=5)
        x += 0.55


def garden_tree(k, cx, cr, h=3.0, tone='#2e5a3a', bloom=None):
    """A real tree in a stone-ringed bed: T.tree's crown, blossom on some."""
    k.cyl(cx, cr, -0.02, 0.12, 0.62, (STONE, 0.06), 'tree_ring', verts=18)
    k.cyl(cx, cr, 0.1, 0.13, 0.54, '#2a2018', 'soil', verts=18)
    lobes = T.tree(k, cx, cr, h=h, tone=tone)
    if bloom:
        with k.foliage('leaf'):
            for (x, r, z, rx, ry, rz) in lobes:
                for _ in range(int(rx * 22)):
                    u, v = k.rng.uniform(-0.4, 1.0), k.rng.uniform(0, math.tau)
                    w = math.sqrt(max(0, 1 - u * u))
                    k.sphere(x + w * math.cos(v) * rx, r + w * math.sin(v) * ry, z + u * rz, 0.05, 0.045, bloom, 'blossom', segs=5)
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def statue(k, cx, cr, h=1.6):
    """A winged figure in white marble on a stepped plinth, one arm raised, gilt laurel in its hand."""
    k.box(cx - 0.55, cr - 0.55, 0.0, cx + 0.55, cr + 0.55, 0.14, (STONE_D, 0.06), 'plinth_step')
    k.box(cx - 0.42, cr - 0.42, 0.14, cx + 0.42, cr + 0.42, 0.9, (STONE, 0.06), 'plinth', bevel=0.03)
    k.box(cx - 0.47, cr - 0.47, 0.9, cx + 0.47, cr + 0.47, 0.98, (GOLD, 0.2), 'plinth_cap')
    m = ('#f2efe8', 0.04)
    k.cone(cx, cr, 0.98, 0.98 + h * 0.55, 0.24, 0.13, m, 'statue', verts=12)
    k.blob(cx, cr, 0.98 + h * 0.62, 0.16, 0.12, 0.17, m, 'statue', segs=10)
    k.sphere(cx, cr, 0.98 + h * 0.8, 0.09, 0.1, m, 'statue', segs=10)
    k.tube((cx + 0.12, cr, 0.98 + h * 0.66), (cx + 0.24, cr - 0.05, 0.98 + h * 1.02), 0.035, m, 'statue', verts=6)
    k.sphere(cx + 0.25, cr - 0.05, 0.98 + h * 1.05, 0.07, 0.04, (GOLD, 0.2), 'statue_laurel', segs=6)
    for s in (-1, 1):                                       # wings
        k.poly([(cx + s * 0.1, cr + 0.08, 0.98 + h * 0.7), (cx + s * 0.55, cr + 0.15, 0.98 + h * 0.95),
                (cx + s * 0.42, cr + 0.12, 0.98 + h * 0.5), (cx + s * 0.12, cr + 0.06, 0.98 + h * 0.45)], m, 'statue_wing')
    k.box(cx - 0.22, cr + 0.42, 0.4, cx + 0.22, cr + 0.44, 0.62, (GOLD, 0.2), 'plaque')
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.5)


def cafe_table(k, cx, cr, cloth='#f4f0ea', chairs=(-1, 1), china=True):
    """A round marble table with gilt bistro chairs either side, a little lamp, china for tea or a coupe."""
    k.cyl(cx, cr, 0.0, 0.04, 0.2, GOLD_D, 'table_foot', verts=10)
    k.cyl(cx, cr, 0.04, 0.68, 0.035, GOLD, 'table_stem', verts=8)
    k.cyl(cx, cr, 0.68, 0.73, 0.36, (cloth, 0.05), 'table_top', verts=18)
    k.cyl(cx, cr, 0.73, 0.76, 0.06, GOLD, 'table_lamp', verts=8)
    k.sphere(cx, cr, 0.84, 0.06, 0.08, '#ffe8c0', 'table_lamp_glow', emit=(WARM, 0.9), segs=8)
    k.point_light(cx, cr, 0.95, WARM, 3.5, radius=0.1, group='flicker')
    if china:
        for s in (-1, 1):
            k.cyl(cx + s * 0.18, cr + 0.08, 0.73, 0.745, 0.08, '#f8f8f4', 'saucer', verts=10)
            k.cyl(cx + s * 0.18, cr + 0.08, 0.745, 0.8, 0.045, ('#f8f8f4', 0.05), 'cup', verts=8)
    for s in chairs:
        x = cx + s * 0.6
        k.cyl(x, cr, 0.42, 0.47, 0.2, (PINK if s < 0 else LILAC, 0.06), 'chair_seat', verts=12)
        for (dx, dr) in ((-0.13, -0.13), (0.13, -0.13), (-0.13, 0.13), (0.13, 0.13)):
            k.tube((x + dx, cr + dr, 0.0), (x + dx * 0.9, cr + dr * 0.9, 0.42), 0.015, GOLD, 'chair_leg', verts=4)
        bx = x + s * 0.18
        k.tube((bx, cr - 0.16, 0.47), (bx, cr - 0.16, 0.9), 0.015, GOLD, 'chair_back', verts=4)
        k.tube((bx, cr + 0.16, 0.47), (bx, cr + 0.16, 0.9), 0.015, GOLD, 'chair_back', verts=4)
        k.tube((bx, cr - 0.16, 0.9), (bx, cr + 0.16, 0.9), 0.018, GOLD, 'chair_back', verts=4)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def viewer(k, cx, cr):
    """A brass telescope on a fluted stone pedestal, aimed down at the smog."""
    k.cyl(cx, cr, 0.0, 0.1, 0.22, (STONE_D, 0.06), 'viewer_base', verts=12)
    k.cyl(cx, cr, 0.1, 0.95, 0.07, (STONE_L, 0.05), 'viewer_post', verts=10)
    k.tube((cx, cr - 0.25, 1.15), (cx, cr + 0.32, 0.98), 0.07, (GOLD, 0.25), 'viewer_tube', rb=0.09, verts=10)
    k.cyl_y(cx, cr + 0.32, cr + 0.35, 0.98, 0.07, 0.07, '#0c2a40', 'viewer_glass', emit=(BLUE, 0.5), verts=10)
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


# ---- the crown fountain ---------------------------------------------------------------------------------------------------
def crown_fountain(k, cx, cr, rad=2.2):
    """Halcyon's fountain: a wide stone basin, a second bowl raised in it, and on a fluted column a great gilt crown
    whose points spill thin falls of water lit pale from inside."""
    T.annulus(k, cx, cr, rad - 0.2, rad, 0.0, 0.48, (STONE, 0.06), 'basin', segs=40)
    T.annulus(k, cx, cr, rad - 0.24, rad + 0.06, 0.48, 0.56, (STONE_L, 0.05), 'basin_rim', segs=40)
    T.annulus(k, cx, cr, rad + 0.02, rad + 0.03, 0.2, 0.26, (GOLD, 0.2), 'basin_band', segs=40)
    k.cyl(cx, cr, 0.0, 0.36, rad - 0.18, '#141c2a', 'basin_floor', verts=40)
    k.cyl(cx, cr, 0.36, 0.38, rad - 0.19, '#1a3a5a', 'basin_water', emit=('#3a6a9a', 0.35), verts=40)
    for i in range(14):                                    # coins under the water
        a, d = k.rng.uniform(0, math.tau), k.rng.uniform(0.9, rad - 0.35)
        k.cyl(cx + math.cos(a) * d, cr + math.sin(a) * d, 0.38, 0.386, 0.03, '#a08030', 'coin', emit=('#e0c060', 0.4), verts=6)
    for i in range(10):                                    # under-lights round the basin's inside
        a = i * math.tau / 10
        k.sphere(cx + math.cos(a) * (rad - 0.3), cr + math.sin(a) * (rad - 0.3), 0.36, 0.05, 0.03, BLUE, 'basin_light', emit=(BLUE, 0.9), segs=6)
    r2 = rad * 0.45
    k.cyl(cx, cr, 0.38, 0.8, r2 * 0.35, (STONE, 0.06), 'bowl_stem', verts=16)
    k.cone(cx, cr, 0.8, 1.0, r2 * 0.4, r2, (STONE_L, 0.05), 'bowl', verts=24)
    k.cyl(cx, cr, 0.98, 1.0, r2 - 0.06, '#1a3a5a', 'basin_water', emit=('#4a7aaa', 0.4), verts=24)
    k.cyl(cx, cr, 1.0, 2.2, 0.14, (STONE_L, 0.05), 'fountain_column', verts=12)
    for z in (1.3, 1.9):
        k.cyl(cx, cr, z, z + 0.05, 0.17, (GOLD, 0.2), 'column_ring', verts=12)
    # the crown: a gold band with jewels and seven points
    T.annulus(k, cx, cr, 0.42, 0.52, 2.2, 2.5, (GOLD, 0.25), 'crown_band', segs=28)
    for i in range(7):
        a = i * math.tau / 7 + 0.2
        px, pr = cx + math.cos(a) * 0.47, cr + math.sin(a) * 0.47
        k.cone(px, pr, 2.5, 3.0, 0.1, 0.015, (GOLD_L, 0.25), 'crown_point', verts=5)
        k.sphere(px, pr, 3.02, 0.045, 0.045, '#fff4d0', 'crown_pearl', segs=6)
        k.sphere(cx + math.cos(a + 0.45) * 0.52, cr + math.sin(a + 0.45) * 0.52, 2.35, 0.05, 0.05, (PINK, BLUE, LILAC)[i % 3], 'crown_gem',
                 emit=((PINK, BLUE, LILAC)[i % 3], 0.8), segs=6)
        # falls of water from the band into the bowl
        k.tube((cx + math.cos(a) * 0.55, cr + math.sin(a) * 0.55, 2.25), (cx + math.cos(a) * (r2 - 0.1), cr + math.sin(a) * (r2 - 0.1), 1.0),
               0.03, '#a8d8f0', 'fountain_jet', emit=('#c8e8ff', 0.55), verts=5)
    k.sphere(cx, cr, 2.6, 0.18, 0.16, shade(PINK, 0.6), 'crown_orb', emit=(PINK, 0.9), segs=10)
    k.point_light(cx, cr, 2.7, '#ffc8e8', 30, radius=0.3, group='flicker')
    k.point_light(cx, cr + rad * 0.6, 0.6, BLUE, 18, radius=0.4, group='static')
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


# ---- buildings' feet -------------------------------------------------------------------------------------------------------
def stone_facade(k, x0, x1, r, H, fins=1.2, band=None, glass=True, glow=WARM, wall=STONE, part='facade'):
    """A tall face of white stone: a plinth, gold-capped pilasters every `fins` tiles, tall lit glass between them, a
    cornice band at `band`."""
    k.box(x0, r - 1.2, 0.0, x1, r, H, (wall, 0.05), part)
    k.box(x0 - 0.05, r - 0.05, 0.0, x1 + 0.05, r + 0.12, 0.35, (STONE_D, 0.06), part + '_plinth')
    n = max(1, int(round((x1 - x0) / fins)))
    pil, wins = [], []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        pil.append((x - 0.1, r, 0.35, x + 0.1, r + 0.16, H))
        if glass and i < n:
            xa, xb = x + 0.22, x0 + (x1 - x0) * (i + 1) / n - 0.22
            wins.append((xa, r + 0.01, 0.6, xb, r + 0.03, H - 0.5))
    k.boxes(pil, (STONE_L, 0.05), part + '_pilaster')
    k.boxes([(a - 0.02, b + 0.12, H - 0.42, c + 0.02, d + 0.06, H - 0.3) for (a, b, _, c, d, _) in pil], (GOLD, 0.2), part + '_capital')
    if wins:
        k.boxes(wins, NIGHT_GLASS[0], part + '_glass', emit=(glow, 0.35))
        mull = [(a, b + 0.02, z, c, d + 0.02, z + 0.04) for (a, b, _, c, d, _) in wins for z in [0.6 + j * 0.8 for j in range(int((H - 1.1) / 0.8) + 1)]]
        k.boxes(mull, (GOLD, 0.2), part + '_mullion')
    if band:
        k.box(x0 - 0.08, r - 0.1, band, x1 + 0.08, r + 0.22, band + 0.18, (STONE_L, 0.05), part + '_cornice')
        k.box(x0 - 0.08, r + 0.22, band + 0.04, x1 + 0.08, r + 0.24, band + 0.14, (GOLD, 0.2), part + '_cornice_gold')


def lift_doors(k, cx, r, label, sub='L480', glow=BLUE, font='PoiretOne', w=1.3):
    """Express lift doors set in the stone: a deep gold surround, brushed bronze doors, a lit floor display and an arrow
    over them, the lift's name in letters above, a call panel beside."""
    k.box(cx - w / 2 - 0.25, r - 0.1, 0.0, cx + w / 2 + 0.25, r + 0.14, 2.65, (GOLD, 0.2), 'lift_surround', bevel=0.02)
    k.box(cx - w / 2, r + 0.1, 0.0, cx + w / 2, r + 0.16, 2.2, ('#8a7350', 0.15), 'lift_door')
    k.box(cx - 0.015, r + 0.16, 0.0, cx + 0.015, r + 0.18, 2.2, '#3a2e1c', 'lift_seam')
    for s in (-1, 1):                                        # an engraved sunburst on each leaf
        for i in range(5):
            a = math.pi * (0.15 + 0.7 * i / 4)
            k.tube((cx + s * w / 4, r + 0.17, 1.3), (cx + s * w / 4 + math.cos(a) * 0.22 * s, r + 0.17, 1.3 + math.sin(a) * 0.3),
                   0.008, GOLD_L, 'lift_engrave', verts=3)
    k.box(cx - 0.42, r + 0.14, 2.3, cx + 0.42, r + 0.18, 2.55, '#0c1020', 'lift_display', emit=(glow, 0.3))
    S.letters(k, sub, 'RussoOne', cx - 0.08, r + 0.18, 2.34, size=0.17, col=glow, energy=8)
    k.cone(cx + 0.3, r + 0.19, 2.37, 2.5, 0.06, 0.0, shade(glow, 0.5), 'lift_arrow', emit=(glow, 0.9), verts=3)
    k.box(cx + w / 2 + 0.32, r + 0.14, 0.95, cx + w / 2 + 0.52, r + 0.18, 1.35, (GOLD, 0.2), 'lift_panel')
    k.sphere(cx + w / 2 + 0.42, r + 0.19, 1.2, 0.05, 0.02, shade(glow, 0.5), 'lift_button', emit=(glow, 1.0), segs=6)
    S.letters(k, label, font, cx, r + 0.16, 2.78, size=0.28, col=GOLD_L, energy=6)
    k.point_light(cx, r + 0.6, 2.4, glow, 8, radius=0.2, group='flicker')


def grand_doors(k, cx, r, w=2.4, h=2.8, glow=WARM):
    """A tower's great entrance: tall gold-framed glass doors in a stone arch, light spilling out, a canopy of gold
    fins over it."""
    k.box(cx - w / 2 - 0.3, r - 0.1, 0.0, cx + w / 2 + 0.3, r + 0.12, h + 0.3, (STONE_L, 0.05), 'door_frame')
    k.box(cx - w / 2, r + 0.12, 0.0, cx + w / 2, r + 0.14, h, '#1a1810', 'door_glass', emit=(glow, 0.65))
    bars = [(cx - w / 2 + i * w / 4 - 0.03, r + 0.14, 0.0, cx - w / 2 + i * w / 4 + 0.03, r + 0.17, h) for i in range(5)]
    bars += [(cx - w / 2, r + 0.14, z, cx + w / 2, r + 0.17, z + 0.05) for z in (1.0, h - 0.05)]
    k.boxes(bars, (GOLD, 0.2), 'door_bar')
    for i in range(9):                                       # the canopy's fins fanning out
        x = cx - w / 2 - 0.2 + i * (w + 0.4) / 8
        k.box(x - 0.03, r + 0.12, h + 0.05, x + 0.03, r + 1.1, h + 0.1, (GOLD, 0.2), 'canopy_fin')
    k.box(cx - w / 2 - 0.3, r + 1.05, h + 0.02, cx + w / 2 + 0.3, r + 1.12, h + 0.12, (GOLD_L, 0.2), 'canopy_edge')
    k.point_light(cx, r + 0.8, 1.6, glow, 26, radius=0.5, group='static')


def shop_window(k, x0, x1, r, z0=0.45, z1=2.2, glow=WARM, frame=GOLD):
    """A tall display window with a lit back, a gold frame and a sill."""
    k.box(x0, r + 0.0, z0, x1, r + 0.03, z1, '#14101c', 'shop_glass', emit=(glow, 0.45))
    k.box(x0 - 0.06, r, z0 - 0.08, x1 + 0.06, r + 0.12, z0, (STONE_L, 0.05), 'shop_sill')
    for (a, b, c, d) in ((x0 - 0.06, z0, x0, z1), (x1, z0, x1 + 0.06, z1), (x0 - 0.06, z1, x1 + 0.06, z1 + 0.06)):
        k.box(a, r, b, c, r + 0.06, d, (frame, 0.2), 'shop_frame')


# ---- the opera ----------------------------------------------------------------------------------------------------------
def fluted_column(k, cx, cr, h, col=STONE_L):
    k.box(cx - 0.22, cr - 0.22, 0.0, cx + 0.22, cr + 0.22, 0.16, (STONE_D, 0.06), 'column_base')
    k.cyl(cx, cr, 0.16, h - 0.26, 0.15, (col, 0.04), 'column', verts=16)
    for i in range(8):
        a = i * math.tau / 8
        k.box(cx + math.cos(a) * 0.15 - 0.01, cr + math.sin(a) * 0.15 - 0.01, 0.3, cx + math.cos(a) * 0.15 + 0.01,
              cr + math.sin(a) * 0.15 + 0.01, h - 0.4, shade(col, 0.82), 'column_flute')
    k.cone(cx, cr, h - 0.26, h - 0.1, 0.16, 0.24, (GOLD, 0.2), 'column_capital', verts=12)
    k.box(cx - 0.26, cr - 0.26, h - 0.1, cx + 0.26, cr + 0.26, h, (STONE, 0.05), 'column_abacus')
    k.solid_post(cx, cr)


def stairs(k, x0, x1, r_top, n=3, tread=0.45, rise=0.12, tone=STONE_L):
    """Broad steps coming down toward the camera from r_top (the landing's level n * rise)."""
    for i in range(n):
        z = (n - i) * rise
        r = r_top + i * tread
        k.box(x0, r, 0.0, x1, r + tread, z, (shade(tone, 1 - i * 0.02), 0.05), 'stair_floor')
        k.box(x0, r + tread - 0.02, z - 0.02, x1, r + tread + 0.005, z, (GOLD, 0.2), 'stair_nosing')


def poster(k, cx, r, z0, w=0.9, h=1.3, kind=0):
    """A playbill in a gold frame, lit: a diva in a gown under stars, a masked dancer, a moon over a lake."""
    k.box(cx - w / 2 - 0.06, r, z0 - 0.06, cx + w / 2 + 0.06, r + 0.05, z0 + h + 0.06, (GOLD, 0.2), 'poster_frame')
    bgs = ('#1a1440', '#3a0c2a', '#0c2440')
    k.box(cx - w / 2, r + 0.05, z0, cx + w / 2, r + 0.06, z0 + h, bgs[kind % 3], 'poster', emit=(bgs[kind % 3], 0.4))
    if kind % 3 == 0:
        k.cone(cx, r + 0.065, z0 + 0.15, z0 + h * 0.6, w * 0.32, 0.04, shade(PINK, 0.6), 'poster_art', emit=(PINK, 0.6), verts=8)
        k.sphere(cx, r + 0.065, z0 + h * 0.68, 0.08, 0.08, '#f0d8c8', 'poster_art', emit=('#f0d8c8', 0.4), segs=6)
    elif kind % 3 == 1:
        k.blob(cx, r + 0.065, z0 + h * 0.6, w * 0.3, 0.01, h * 0.12, shade(GOLD_L, 0.6), 'poster_art', emit=(GOLD_L, 0.6), segs=8)
    else:
        k.sphere(cx + w * 0.15, r + 0.065, z0 + h * 0.72, 0.13, 0.13, '#f0f0ff', 'poster_art', emit=('#f0f0ff', 0.6), segs=8)
        k.box(cx - w / 2 + 0.05, r + 0.065, z0 + 0.1, cx + w / 2 - 0.05, r + 0.067, z0 + h * 0.35, shade(BLUE, 0.5), 'poster_art', emit=(BLUE, 0.5))
    for i in range(4):
        k.box(cx - w * 0.36, r + 0.066, z0 + 0.1 + i * 0.06, cx - w * 0.36 + w * (0.72 - i * 0.12), r + 0.068, z0 + 0.13 + i * 0.06,
              '#f0e0b0', 'poster_text', emit=('#f0e0b0', 0.3))
    k.point_light(cx, r + 0.5, z0 + h + 0.3, WARM, 3, radius=0.1, group='static')


# ---- the sky docks ------------------------------------------------------------------------------------------------------
def bollard(k, cx, cr):
    k.cyl(cx, cr, 0.0, 0.42, 0.11, (GOLD_D, 0.2), 'bollard', verts=10)
    k.cyl(cx, cr, 0.42, 0.5, 0.15, (GOLD, 0.2), 'bollard_cap', verts=10)
    k.solid_post(cx, cr)


def cab_pad(k, cx, cr, rad=1.6, glow=MINT):
    """An air cab pad: a raised disc ringed with lights, a painted C, a sign on a post, a little waiting bench."""
    k.cyl(cx, cr, 0.0, 0.06, rad, ('#2a2a36', 0.08), 'pad_floor', verts=40)
    k.cyl(cx, cr, 0.06, 0.07, rad - 0.15, ('#34343f', 0.08), 'pad_floor', verts=40)
    for i in range(24):
        a = i * math.tau / 24
        k.cyl(cx + math.cos(a) * (rad - 0.08), cr + math.sin(a) * (rad - 0.08), 0.06, 0.1, 0.045, '#103a30', 'pad_light',
              emit=((glow if i % 2 else WARM), 0.95), verts=6)
    E.flats(k, [E.ell(cx, cr, rad * 0.55, rad * 0.55, n=32, a0=0.6, a1=math.tau - 0.6)], 0.075, ('#e8e2d0', 0.1), 'pad_mark')
    E.flats(k, [E.ell(cx, cr, rad * 0.4, rad * 0.4, n=32, a0=0.6, a1=math.tau - 0.6)], 0.078, ('#34343f', 0.08), 'pad_mark')
    k.point_light(cx, cr, 0.5, glow, 14, radius=0.6, group='flicker')


def dock_light(k, cx, cr, glow=BLUE):
    k.cyl(cx, cr, 0.0, 0.7, 0.05, (GOLD, 0.2), 'dock_light_post', verts=8)
    k.cyl(cx, cr, 0.7, 0.85, 0.08, shade(glow, 0.6), 'dock_light', emit=(glow, 0.95), verts=8)
    k.point_light(cx, cr, 0.9, glow, 6, radius=0.15, group='flicker')
    k.solid_post(cx, cr)


def yacht(k, x0, x1, cr, z=0.4, name_col=GOLD_L):
    """A sky yacht lying alongside, floating on her lift fields: a long white hull, a gold sheer line, two decks of
    dark glass stepping back, a mast with lights, pale lift pods glowing under her, the gangway down to the dock."""
    L = x1 - x0
    rings = []
    for i in range(15):
        t = i / 14
        x = x0 + t * L
        prof = math.sin(math.pi * min(1.0, t * 1.15)) ** 0.55 if t < 0.87 else (1 - t) / 0.13 * 0.9
        prof = max(0.08, prof)
        half, depth = 0.95 * prof, 0.55 * prof + 0.12
        ring = []
        for j in range(12):
            a = j * math.tau / 12
            ring.append((x, cr + math.cos(a) * half, z + 0.55 + math.sin(a) * depth * (0.7 if math.sin(a) > 0 else 1.0)))
        rings.append(ring)
    k.loft(rings, ('#f2f0ec', 0.05), 'yacht_hull', closed=True)
    k.box(x0 + L * 0.12, cr + 0.9, z + 0.62, x0 + L * 0.84, cr + 0.94, z + 0.7, (GOLD, 0.2), 'yacht_sheer')
    k.box(x0 + L * 0.1, cr - 0.75, z + 0.85, x0 + L * 0.82, cr + 0.75, z + 0.9, ('#c8a070', 0.12), 'yacht_deck')
    k.box(x0 + L * 0.28, cr - 0.6, z + 0.9, x0 + L * 0.7, cr + 0.6, z + 1.45, ('#f4f2ee', 0.05), 'yacht_cabin', bevel=0.08)
    k.box(x0 + L * 0.29, cr + 0.6, z + 1.0, x0 + L * 0.69, cr + 0.62, z + 1.35, '#141c30', 'yacht_glass', emit=('#ffd8a0', 0.4))
    k.box(x0 + L * 0.38, cr - 0.45, z + 1.45, x0 + L * 0.62, cr + 0.45, z + 1.85, ('#f4f2ee', 0.05), 'yacht_bridge', bevel=0.06)
    k.box(x0 + L * 0.39, cr + 0.45, z + 1.52, x0 + L * 0.61, cr + 0.47, z + 1.78, '#141c30', 'yacht_glass', emit=('#a8d8ff', 0.45))
    for i in range(6):
        k.sphere(x0 + L * (0.18 + i * 0.12), cr + 0.92, z + 0.45, 0.05, 0.05, '#0c1828', 'yacht_port', emit=('#ffe0b0', 0.8), segs=6)
    mx = x0 + L * 0.5
    k.cyl(mx, cr, z + 1.85, z + 3.3, 0.035, (GOLD, 0.2), 'yacht_mast', verts=6)
    k.box(mx - 0.4, cr - 0.02, z + 2.9, mx + 0.4, cr + 0.02, z + 2.94, GOLD, 'yacht_spar')
    for (dx, c) in ((-0.4, '#ff3040'), (0.4, '#30ff70'), (0.0, '#ffffff')):
        k.sphere(mx + dx, cr, z + (3.32 if dx == 0 else 2.92), 0.045, 0.045, c, 'yacht_light', emit=(c, 1.0), segs=6)
    k.poly([(x0 + L * 0.97, cr, z + 0.7), (x0 + L * 1.02, cr, z + 1.4), (x0 + L * 0.92, cr, z + 1.1)], (PINK, 0.1), 'yacht_pennant')
    for t in (0.22, 0.5, 0.78):                              # lift pods under her, glowing
        k.cyl(x0 + L * t, cr, z - 0.18, z + 0.12, 0.22, ('#d8d4cc', 0.06), 'yacht_pod', verts=12)
        k.cyl(x0 + L * t, cr, z - 0.24, z - 0.18, 0.18, shade(MINT, 0.5), 'yacht_pod_glow', emit=(MINT, 0.95), verts=12)
        k.point_light(x0 + L * t, cr, z - 0.4, MINT, 10, radius=0.3, group='flicker')
    S.letters(k, 'LUMIERE', 'PoiretOne', x0 + L * 0.2, cr + 0.95, z + 0.35, size=0.2, col=name_col, energy=5)
    k.solid(x0, cr - 1.0, x1, cr + 1.0)


def gangway(k, xa, ra, xb, rb, z0, z1):
    """A gold-railed gangway from the dock up to her deck."""
    k.bar(xa, ra, xb, rb, z0, z0 + 0.05, 0.5, ('#c8a070', 0.12), 'gangway_deck')
    for s in (-0.24, 0.24):
        k.tube((xa, ra + s, z0 + 0.6), (xb, rb + s, z1 + 0.6), 0.02, GOLD, 'gangway_rail', verts=4)


def luggage(k, cx, cr):
    """A brass luggage trolley piled with cases and a hatbox."""
    k.box(cx - 0.4, cr - 0.25, 0.08, cx + 0.4, cr + 0.25, 0.12, (GOLD, 0.2), 'trolley_base')
    for s in (-1, 1):
        k.tube((cx + s * 0.38, cr - 0.24, 0.12), (cx + s * 0.38, cr - 0.24, 1.0), 0.02, GOLD, 'trolley_post', verts=4)
    k.tube((cx - 0.38, cr - 0.24, 1.0), (cx + 0.38, cr - 0.24, 1.0), 0.025, GOLD, 'trolley_bar', verts=4)
    z = 0.12
    for (w, h, c) in ((0.7, 0.24, '#5a2a3a'), (0.6, 0.22, '#e8dcc8'), (0.5, 0.2, '#2a3a5a')):
        k.box(cx - w / 2, cr - 0.2, z, cx + w / 2, cr + 0.2, z + h, (c, 0.1), 'suitcase', bevel=0.02)
        k.box(cx - w / 2, cr + 0.2, z + h * 0.45, cx + w / 2, cr + 0.21, z + h * 0.55, GOLD, 'suitcase_band')
        z += h
    k.cyl(cx + 0.1, cr, z, z + 0.22, 0.17, ('#f0c8d8', 0.08), 'hatbox', verts=12)
    for (dx, dr) in ((-0.32, -0.18), (0.32, -0.18), (-0.32, 0.18), (0.32, 0.18)):
        k.sphere(cx + dx, cr + dr, 0.05, 0.05, 0.05, '#2a2a2a', 'trolley_wheel', segs=6)
    k.solid(cx - 0.4, cr - 0.25, cx + 0.4, cr + 0.25)


# ---- the gardens --------------------------------------------------------------------------------------------------------
def pergola(k, x0, x1, r0, r1, h=2.4, bloom=LILAC):
    """White posts and gold beams with wisteria hanging from them in long pale trusses."""
    for x in (x0, x1):
        for r in (r0, r1):
            k.box(x - 0.08, r - 0.08, 0.0, x + 0.08, r + 0.08, h, (STONE_L, 0.05), 'pergola_post')
            k.solid_post(x, r)
    for r in (r0, r1):
        k.box(x0 - 0.2, r - 0.05, h, x1 + 0.2, r + 0.05, h + 0.14, (GOLD, 0.2), 'pergola_beam')
    x = x0 + 0.1
    while x < x1:
        k.box(x - 0.03, r0 - 0.25, h + 0.14, x + 0.03, r1 + 0.25, h + 0.22, (STONE_L, 0.05), 'pergola_slat')
        x += 0.45
    with k.foliage('leaf'):
        for _ in range(int((x1 - x0) * 4)):
            px, pr = k.rng.uniform(x0, x1), k.rng.choice((r0, r1)) + k.rng.uniform(-0.25, 0.25)
            T.leafy_crown(k, px, pr, h + 0.2, 0.25, 0.2, 0.12, '#3a5a34', part='wisteria_leaves', sprigs=False)
            for j in range(3):
                k.cone(px + k.rng.uniform(-0.1, 0.1), pr + 0.12, h - 0.5 - j * 0.12, h + 0.05, 0.004, 0.06, (shade(bloom, 1.05 - j * 0.08), 0.1),
                       'wisteria', verts=6)


def reflecting_pool(k, x0, r0, x1, r1):
    """A long formal pool sunk in the lawn: a stone coping, dark still water with the stars in it, a jet at each end."""
    k.box(x0 - 0.22, r0 - 0.22, -0.1, x1 + 0.22, r0, 0.1, (STONE_L, 0.05), 'pool_coping')
    k.box(x0 - 0.22, r1, -0.1, x1 + 0.22, r1 + 0.22, 0.1, (STONE_L, 0.05), 'pool_coping')
    k.box(x0 - 0.22, r0, -0.1, x0, r1, 0.1, (STONE_L, 0.05), 'pool_coping')
    k.box(x1, r0, -0.1, x1 + 0.22, r1, 0.1, (STONE_L, 0.05), 'pool_coping')
    k.box(x0, r0, -0.4, x1, r1, -0.12, '#101828', 'pool_floor')
    k.box(x0, r0, -0.12, x1, r1, -0.1, '#16243a', 'basin_water', emit=('#203a5a', 0.25))
    for x in (x0 + 0.5, x1 - 0.5):
        k.tube((x, (r0 + r1) / 2, -0.1), (x, (r0 + r1) / 2, 0.55), 0.025, '#a8d8f0', 'fountain_jet', emit=('#c8e8ff', 0.5), verts=5)
    for _ in range(6):
        x = k.rng.uniform(x0 + 0.4, x1 - 0.4)
        k.cyl(x, k.rng.uniform(r0 + 0.2, r1 - 0.2), -0.1, -0.09, 0.12, '#3a6a3a', 'lily', verts=8)
    k.solid(x0 - 0.2, r0 - 0.2, x1 + 0.2, r1 + 0.2)


def tea_counter(k, x0, x1, r0, r1):
    """The tea salon's counter: pale wood under a marble top, a samovar, tiers of cakes under glass domes, tins of tea
    on a gold étagère behind."""
    k.box(x0, r0, 0.0, x1, r1, 0.95, ('#d8c8b0', 0.08), 'counter', bevel=0.02)
    k.box(x0 - 0.05, r0 - 0.05, 0.95, x1 + 0.05, r1 + 0.05, 1.0, ('#f0ece4', 0.05), 'counter_top')
    k.box(x0, r1, 0.08, x1, r1 + 0.02, 0.14, (GOLD, 0.2), 'counter_trim')
    k.cyl(x0 + 0.45, (r0 + r1) / 2, 1.0, 1.55, 0.18, (GOLD, 0.25), 'samovar', verts=12)
    k.sphere(x0 + 0.45, (r0 + r1) / 2, 1.62, 0.12, 0.1, (GOLD_L, 0.25), 'samovar', segs=8)
    for i, x in enumerate((x0 + 1.2, x0 + 1.9)):
        k.cyl(x, (r0 + r1) / 2, 1.0, 1.04, 0.24, '#f8f8f4', 'cake_plate', verts=12)
        for j, (rad, c) in enumerate(((0.18, '#f4c8d8'), (0.13, '#c8e8d8'), (0.08, '#f8e8b0'))):
            k.cyl(x, (r0 + r1) / 2, 1.04 + j * 0.09, 1.12 + j * 0.09, rad, (c, 0.08), 'cake', verts=12)
        k.sphere(x, (r0 + r1) / 2, 1.1, 0.27, 0.32, ('#c8e0f0', 0.02), 'cake_dome', segs=12)
    # the étagère behind
    for z in (1.2, 1.7, 2.2):
        k.box(x0, r0 - 0.5, z, x1, r0 - 0.25, z + 0.04, (GOLD, 0.2), 'shelf')
        for i in range(int((x1 - x0) / 0.22)):
            c = ('#e86a8a', '#6ab0d8', '#e8c050', '#8ad0a0', '#b090e0')[(i + int(z * 3)) % 5]
            k.cyl(x0 + 0.12 + i * 0.22, r0 - 0.38, z + 0.04, z + 0.26, 0.07, (c, 0.08), 'tea_tin', verts=8)
    k.solid(x0, r0 - 0.5, x1, r1)


def awning(k, x0, x1, r, z, depth=1.2, cols=('#f6f0ea', PINK)):
    """A striped canvas awning on gold rods."""
    n = int((x1 - x0) / 0.3)
    for i in range(n):
        xa = x0 + i * (x1 - x0) / n
        k.bar(xa, r, xa, r + depth, z, z + 0.04, (x1 - x0) / n, (cols[i % 2], 0.08), 'awning')
    k.box(x0, r + depth - 0.02, z - 0.25, x1, r + depth + 0.02, z + 0.02, (cols[1], 0.08), 'awning_valance')
    for x in (x0 + 0.05, x1 - 0.05):
        k.tube((x, r, z + 0.4), (x, r + depth, z), 0.02, GOLD, 'awning_rod', verts=4)
