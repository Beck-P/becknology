"""Harbour-town pieces for Lumar's ports rebuilt in the Look Book style (Sapphire Port, Tern Holm) — every function takes
a Kit. Built from Lantern Quay (dioramas/lantern_quay.py): dressed stone coping along a quay, the wall below it in
courses going wet and weedy toward the water, steps down and ladders, mooring rings; flagged pavements; the small life of
a fishing town (lobster pots, coils of rope, fish baskets, nets drying on a rack, floats, gulls, an anchor, washing on a
line); and the land's dressing (gorse and heather, wildflowers in clumps, boulders half sunk in the turf, reeds round a
pond sunk into the ground).

  import assets_fishport as P
  P.quay_wall(k, x0, x1, q, wz)        the coping and the wall along a quay whose land ends at row q
  P.quay_steps(k, x0, q, wz)           steps down the wall, an iron rail
  P.ladder(k, x, q, wz)                an iron ladder down the wall
  P.flags(k, x0, r0, x1, r1)           flagged paving in running courses
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assets_town as W  # noqa: E402
import assets_lumar as A  # noqa: E402
import assets_coast as C  # noqa: E402
from scenekit import shade  # noqa: E402

STONE_L = '#9a9284'
WEED = ('#2a3a26', '#334428', '#3e4a2c', '#5a5a48')


def mix(a, b, t):
    return W._mix(a, b, t)


# ---- the quay -------------------------------------------------------------------------------------------------------
def quay_wall(k, x0, x1, q, wz, stone=A.STONE, coping=STONE_L, rings=(), skip=()):
    """Long dressed coping stones a little proud along the quay's edge (q-0.3 .. q), the wall under it in courses of
    blocks down past the water (wetter and greener toward it), a band of weed and barnacles at the tide line, iron
    mooring rings. skip: (xa, xb) spans left open (a pier's foot)."""
    rng = k.rng
    x = x0
    while x < x1 - 0.02:
        w = min(rng.uniform(0.55, 0.95), x1 - x)
        if not any(a < x + w / 2 < b for (a, b) in skip):
            k.box(x + 0.015, q - 0.3, -0.04, x + w - 0.015, q + 0.04, 0.05, (shade(coping, rng.uniform(0.88, 1.08)), 0.14),
                  'quay_coping', bevel=0.025)
        x += w
    k.box(x0, q - 0.3, wz - 0.8, x1, q - 0.0, -0.04, (W.SALT[2], 0.1), 'quay_core')
    z, i = -0.06, 0
    while z > wz - 0.7:
        hgt = rng.uniform(0.18, 0.24)
        x = x0 - (0.25 if i % 2 else 0.0)
        while x < x1:
            w = rng.uniform(0.42, 0.78)
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.08:
                wet = max(0.0, min(1.0, (wz + 0.12 - z) / 0.28 + 0.4))
                base = mix(shade(stone, rng.uniform(0.78, 1.02)), '#3a463a', 0.55 * wet)
                k.box(a + 0.02, q - 0.02, z - hgt + 0.02, b - 0.02, q + 0.035 + rng.uniform(0, 0.015), z, (base, 0.16), 'quay_wall',
                      bevel=0.02)
            x += w
        z -= hgt
        i += 1
    for _ in range(int((x1 - x0) * 4)):
        x = rng.uniform(x0 + 0.1, x1 - 0.1)
        k.blob(x, q + 0.05, wz + rng.uniform(0.02, 0.14), rng.uniform(0.06, 0.16), 0.03, rng.uniform(0.03, 0.06),
               (rng.choice(WEED), 0.2), 'weed', segs=6)
    for rx in rings:
        k.cyl_y(rx, q + 0.03, q + 0.07, -0.2, 0.09, 0.09, A.IRON, 'mooring_ring', verts=12)
        k.cyl_y(rx, q + 0.02, q + 0.08, -0.2, 0.05, 0.05, W.SALT[1], 'mooring_ring_hole', verts=10)


def quay_steps(k, x0, q, wz, n=6, rail=True):
    """Steps cut down along the face of the wall (west to east, going down), an iron rail on the open side."""
    rng = k.rng
    step = (0.0 - wz) / n
    for i in range(n):
        xa = x0 + i * 0.36
        zt = -0.02 - (i + 1) * step
        k.box(xa, q + 0.02, zt - 0.14, xa + 0.36, q + 0.62, zt, (shade(STONE_L, rng.uniform(0.85, 1.0)), 0.14), 'steps', bevel=0.02)
        k.box(xa, q + 0.58, zt - 0.02, xa + 0.36, q + 0.62, zt, shade(STONE_L, 1.15), 'step_nose')
    k.box(x0 - 0.12, q + 0.62, wz - 0.5, x0 + n * 0.36, q + 0.72, wz + 0.1, (W.SALT[2], 0.15), 'steps_side')
    if rail:
        for i in range(n - 1):
            z = -0.12 - i * step * 1.2
            k.cyl(x0 + 0.1 + i * 0.44, q + 0.68, z, z + 0.6, 0.022, A.IRON, 'rail', verts=6)
        k.tube((x0 + 0.1, q + 0.68, 0.48), (x0 + 0.1 + (n - 2) * 0.44, q + 0.68, 0.48 - (n - 2) * step * 1.2), 0.025, A.IRON, 'rail', verts=6)


def ladder(k, x, q, wz):
    for dx in (-0.16, 0.16):
        k.tube((x + dx, q + 0.07, 0.32), (x + dx, q + 0.07, wz - 0.3), 0.022, A.IRON, 'ladder', verts=6)
    z = 0.2
    while z > wz - 0.2:
        k.cyl_x(x - 0.16, x + 0.16, q + 0.07, z, 0.016, 0.016, A.IRON, 'ladder', verts=6)
        z -= 0.17


def bollard(k, x, r):
    k.cyl(x, r, 0.0, 0.08, 0.17, A.IRON, 'bollard', verts=12)
    k.cyl(x, r, 0.08, 0.42, 0.11, ('#2e3238', 0.1), 'bollard', verts=12)
    k.sphere(x, r, 0.44, 0.15, 0.08, '#2e3238', 'bollard', segs=12)
    k.solid_post(x, r)


def line(k, a, b, sag=0.15, n=4):
    """A mooring line between two points, sagging."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.013, '#b8a070', 'mooring_line', verts=4)


def flags(k, x0, r0, x1, r1, tone='#8a8478', part='flagstone'):
    """Big flags in running courses, a hair apart over dark joints."""
    rng = k.rng
    k.box(x0, r0, -0.14, x1, r1, -0.03, ('#2a2724', 0.15), 'grout')
    r = r0 + 0.02
    while r < r1 - 0.06:
        x = x0 - rng.uniform(0, 0.3)
        h = min(rng.choice((0.36, 0.4, 0.44)), r1 - r)
        while x < x1:
            w = rng.choice((0.48, 0.56, 0.62, 0.7))
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.1:
                k.box(a + 0.02, r + 0.02, -0.05, b - 0.02, r + h - 0.02, 0.0, (shade(tone, rng.uniform(0.86, 1.1)), 0.12), part, bevel=0.012)
            x += w
        r += h


def kerb(k, x0, x1, r, tone='#b0a490', d=0.16):
    x = x0
    while x < x1 - 0.02:
        w = min(k.rng.uniform(0.5, 0.9), x1 - x)
        k.box(x + 0.012, r, -0.02, x + w - 0.012, r + d, 0.06, (shade(tone, k.rng.uniform(0.86, 1.06)), 0.1), 'kerb', bevel=0.014)
        x += w


def kerb_r(k, x, r0, r1, tone='#b0a490', d=0.16):
    r = r0
    while r < r1 - 0.02:
        h = min(k.rng.uniform(0.5, 0.9), r1 - r)
        k.box(x, r + 0.012, -0.02, x + d, r + h - 0.012, 0.06, (shade(tone, k.rng.uniform(0.86, 1.06)), 0.1), 'kerb', bevel=0.014)
        r += h


# ---- the small life of a fishing town --------------------------------------------------------------------------------
def lobster_pot(k, px, pr, solid=False):
    k.box(px - 0.26, pr - 0.17, 0.0, px + 0.26, pr + 0.17, 0.05, (A.WOOD, 0.14), 'pot_base')
    k.cyl_x(px - 0.26, px + 0.26, pr, 0.08, 0.17, 0.2, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
    for dx in (-0.2, 0.0, 0.2):
        k.cyl_x(px + dx - 0.015, px + dx + 0.015, pr, 0.08, 0.175, 0.205, A.WOOD_D, 'pot_hoop', verts=10)
    if solid:
        k.solid(px - 0.26, pr - 0.17, px + 0.26, pr + 0.17)


def pot_stack(k, px, pr):
    """Three pots stacked, two and one, and a float on a line."""
    lobster_pot(k, px - 0.28, pr)
    lobster_pot(k, px + 0.28, pr)
    since = len(k.parts)
    lobster_pot(k, px, pr)
    for p in k.parts[since:]:
        p['obj'].location.z += 0.42
    k.sphere(px + 0.6, pr + 0.2, 0.08, 0.08, 0.07, '#e05a30', 'float', segs=10)
    k.solid(px - 0.55, pr - 0.17, px + 0.55, pr + 0.17)


def rope_coil(k, cx, cr, n=3, tone='#b8a070'):
    for j in range(n):
        W.annulus(k, cx, cr, 0.08, 0.24 - j * 0.02, j * 0.07, j * 0.07 + 0.07, (tone, 0.25), 'rope', segs=20)


def fish_basket(k, bx, br, fish=('#a4b8bc', '#b8c4c8', '#c87a5a')):
    k.cyl(bx, br, 0.0, 0.26, 0.2, ('#a88a58', 0.3), 'basket', verts=12)
    k.cyl(bx, br, 0.24, 0.27, 0.205, '#7a603a', 'basket_rim', verts=12)
    for _ in range(4):
        k.blob(bx + k.rng.uniform(-0.1, 0.1), br + k.rng.uniform(-0.08, 0.08), 0.29, 0.08, 0.035, 0.025, k.rng.choice(fish), 'fish', segs=8)


def net_rack(k, x0, x1, r, h=1.35, col='#4a5a52', float_col='#e8a040'):
    """Nets hung to dry on a pole between two posts, floats along the foot."""
    for nx in (x0, x1):
        k.cyl(nx, r, 0.0, h, 0.045, (A.WOOD_D, 0.12), 'net_post', verts=8)
    k.cyl_x(x0 - 0.08, x1 + 0.08, r, h - 0.05, 0.035, 0.035, (A.WOOD, 0.12), 'net_pole', verts=8)
    cords = []
    n = max(6, int((x1 - x0) / 0.13))
    for i in range(n + 1):
        x = x0 + 0.08 + (x1 - x0 - 0.16) * i / n
        sag = 0.05 * math.sin(i * 1.7)
        cords.append((x - 0.008, r - 0.01, 0.28 + sag, x + 0.008, r + 0.01, h - 0.07))
    z = 0.3
    while z < h - 0.08:
        cords.append((x0 + 0.08, r - 0.01, z - 0.008, x1 - 0.08, r + 0.01, z + 0.008))
        z += 0.11
    k.boxes(cords, col, 'net')
    x = x0 + 0.2
    while x < x1 - 0.1:
        k.sphere(x, r + 0.02, 0.27, 0.045, 0.045, float_col, 'float', segs=8)
        x += 0.3
    k.solid(x0, r - 0.2, x1, r + 0.2)


def gull(k, x, r, z=0.0, facing=1):
    k.blob(x, r, z + 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(x + 0.08 * facing, r, z + 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
    k.cone(x + 0.14 * facing, r, z + 0.17, z + 0.19, 0.02, 0.0, '#e0a030', 'gull', verts=4)
    k.blob(x - 0.04 * facing, r, z + 0.13, 0.08, 0.05, 0.02, '#8a9098', 'gull', segs=8)


def anchor(k, ax, ar):
    k.tube((ax - 0.55, ar, 0.07), (ax + 0.55, ar, 0.07), 0.04, '#2e2e34', 'anchor', verts=8)
    k.tube((ax - 0.5, ar - 0.3, 0.06), (ax - 0.5, ar + 0.3, 0.06), 0.035, '#2e2e34', 'anchor', verts=8)
    for s in (-1, 1):
        k.tube((ax + 0.55, ar, 0.07), (ax + 0.75, ar + s * 0.32, 0.07), 0.035, '#2e2e34', 'anchor', verts=8)
        k.blob(ax + 0.78, ar + s * 0.36, 0.07, 0.09, 0.06, 0.03, '#2e2e34', 'anchor', segs=8)
    k.cyl_y(ax - 0.68, ar - 0.06, ar + 0.06, 0.1, 0.1, 0.1, '#2e2e34', 'anchor', verts=10)


def washing(k, x0, x1, r, cols=('#e8e4dc', '#c8d8e8', '#e0b0a0', '#a8c0a0', '#f0e0b0', '#8a9ac8')):
    """A washing line between two poles: shirts, sheets and socks pegged out."""
    for x in (x0, x1):
        k.cyl(x, r, 0.0, 1.5, 0.035, (A.WOOD_D, 0.12), 'post', verts=6)
        k.solid_post(x, r)
    k.tube((x0, r, 1.42), ((x0 + x1) / 2, r, 1.32), 0.008, '#d8d0c0', 'washing_line', verts=4)
    k.tube(((x0 + x1) / 2, r, 1.32), (x1, r, 1.42), 0.008, '#d8d0c0', 'washing_line', verts=4)
    x = x0 + 0.2
    while x < x1 - 0.25:
        w = k.rng.choice((0.22, 0.3, 0.42))
        t = (x + w / 2 - x0) / (x1 - x0)
        zt = 1.42 - 0.1 * math.sin(math.pi * t) * 2 * min(t, 1 - t) * 2
        h = w * k.rng.uniform(0.9, 1.3) if w > 0.25 else 0.18
        k.box(x, r - 0.012, zt - h, x + w, r + 0.012, zt - 0.01, (k.rng.choice(cols), 0.2), 'washing')
        x += w + k.rng.uniform(0.06, 0.14)


def cat(k, x, r, z=0.0, col='#e8a050'):
    k.blob(x, r, z + 0.08, 0.11, 0.08, 0.07, col, 'cat', segs=10)
    k.sphere(x + 0.1, r + 0.05, z + 0.12, 0.06, 0.05, col, 'cat', segs=8)
    k.tube((x - 0.1, r - 0.05, z + 0.04), (x - 0.2, r + 0.07, z + 0.02), 0.02, shade(col, 0.85), 'cat', verts=5)


# ---- the land's dressing --------------------------------------------------------------------------------------------
def gorse(k, cx, cr, s=0.36, bloom='#f0c838'):
    """A gorse bush: a dark spiky mound starred with yellow flowers (a leaf crown, so it turns with the year)."""
    with k.foliage('leaf'):
        W.leafy_crown(k, cx, cr, s * 0.6, s * 1.1, s * 0.85, s * 0.62, shade('#3a5a2a', k.rng.uniform(0.85, 1.05)), part='bush')
    for _ in range(int(14 * s / 0.36)):
        a = k.rng.uniform(0, 6.28)
        rr = k.rng.uniform(0.3, 1.0)
        k.sphere(cx + math.cos(a) * s * rr, cr + math.sin(a) * s * 0.8 * rr + 0.1 * s, s * k.rng.uniform(0.6, 1.15), 0.035, 0.03, bloom, 'flower', segs=5)


def heather(k, cx, cr, rad=0.5, n=10, tones=('#8a5a8a', '#a06a9a', '#6a4a6a')):
    """A low patch of heather: small mounds of purple."""
    with k.foliage('leaf'):
        for _ in range(n):
            a, d = k.rng.uniform(0, 6.28), rad * math.sqrt(k.rng.random())
            s = k.rng.uniform(0.08, 0.14)
            k.blob(cx + math.cos(a) * d, cr + math.sin(a) * d * 0.8, s * 0.5, s * 1.2, s, s * 0.7, (shade(k.rng.choice(tones), k.rng.uniform(0.9, 1.1)), 0.3),
                   'heather', segs=7)


def wildflowers(k, cx, cr, rad=0.4, n=14, cols=None):
    """A clump of one kind of flower on short stems."""
    col = cols or k.rng.choice(('#f0f0f0', '#f0d040', '#e05070', '#a070e0', '#80a0f0', '#f08030'))
    stems = []
    for _ in range(n):
        a, d = k.rng.uniform(0, 6.28), rad * math.sqrt(k.rng.random())
        x, r = cx + math.cos(a) * d, cr + math.sin(a) * d * 0.8
        h = k.rng.uniform(0.1, 0.22)
        stems.append((x, r, 0.0, h, 0.012, k.rng.uniform(-0.03, 0.03), 0.0))
        k.sphere(x, r, h, 0.035, 0.03, col, 'flower', segs=5)
    k.blades(stems, ('#4a7a3a', 0.2), 'grass')


def boulder(k, cx, cr, s=0.4, tone='#7a7e86', moss='#4a6a3a', z=0.0, solid=True):
    """A boulder half sunk in the turf, a cap of moss, a pebble or two at its foot."""
    k.rock(cx, cr, z - s * 0.3, s, s * 0.8, s * 0.7, (shade(tone, k.rng.uniform(0.85, 1.08)), 0.22), part='rock', segs=9)
    if moss:
        k.blob(cx - s * 0.1, cr - s * 0.1, z + s * 0.32, s * 0.55, s * 0.4, s * 0.12, (moss, 0.3), 'moss', segs=8)
    for _ in range(2):
        a = k.rng.uniform(0, 6.28)
        p = k.rng.uniform(0.05, 0.09)
        k.rock(cx + math.cos(a) * s * 1.2, cr + math.sin(a) * s, z - 0.02, p, p * 0.8, p * 0.6, (shade(tone, k.rng.uniform(0.8, 1.1)), 0.2), part='pebble', segs=5)
    if solid:
        k.solid(cx - s * 0.8, cr - s * 0.6, cx + s * 0.8, cr + s * 0.6)


def reeds(k, pts, z=0.0):
    """Reeds and the odd cattail in clumps at the given (x, r[, z]) points."""
    clump = {shade('#5a8a3a', 0.8): [], '#5a8a3a': [], shade('#6a9a44', 1.12): []}
    for p in pts:
        x, r = p[0], p[1]
        zb = p[2] if len(p) > 2 else z
        for _ in range(k.rng.randint(8, 14)):
            xx, rr = x + k.rng.uniform(-0.18, 0.18), r + k.rng.uniform(-0.12, 0.12)
            h = k.rng.uniform(0.38, 0.8)
            lean = k.rng.uniform(-0.14, 0.14)
            clump[k.rng.choice(list(clump))].append((xx, rr, zb, h, 0.03, lean, k.rng.uniform(-0.04, 0.04)))
            if k.rng.random() < 0.2:
                k.cyl(xx + lean * 0.9, rr, zb + h * 0.82, zb + h * 0.98, 0.028, '#5a3a20', 'cattail', verts=6)
    with k.foliage('leaf'):
        for col, bl in clump.items():
            if bl:
                k.blades(bl, (col, 0.2), 'reed')


# ---- Lantern Quay's own builders (dioramas/lantern_quay.py), lifted as they are and put on a footprint ----------------
ZJ = 1.62        # the jetty's height (ground floors tall enough for our chibis to walk in)
J = 0.2          # how far an upper floor oversails
SALT = W.SALT
STONE = A.STONE


def shop_window(k, x0, x1, z0, z1, rf, frame='#3a2a1e', panes=(4, 2)):
    k.box(x0 - 0.08, rf, z0 - 0.08, x1 + 0.08, rf + 0.08, z1 + 0.08, (frame, 0.08), 'window_frame', bevel=0.01)
    k.box(x0, rf + 0.01, z0, x1, rf + 0.075, z1, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85))
    nx, nz = panes
    bars = []
    for i in range(1, nx):
        xx = x0 + (x1 - x0) * i / nx
        bars.append((xx - 0.018, rf + 0.07, z0, xx + 0.018, rf + 0.09, z1))
    for j in range(1, nz):
        zz = z0 + (z1 - z0) * j / nz
        bars.append((x0, rf + 0.07, zz - 0.018, x1, rf + 0.09, zz + 0.018))
    k.boxes(bars, frame, 'window_frame')
    k.box(x0 - 0.14, rf, z0 - 0.16, x1 + 0.14, rf + 0.2, z0 - 0.08, (A.WOOD, 0.12), 'sill', bevel=0.01)
    k.point_light((x0 + x1) / 2, rf + 0.7, (z0 + z1) / 2, '#ffc070', 10, radius=0.3, group='flicker')


def corbels(k, x0, x1, F):
    x = x0 + 0.25
    while x < x1 - 0.2:
        k.box(x - 0.05, F - 0.02, ZJ - 0.34, x + 0.05, F + J - 0.04, ZJ - 0.22, A.WOOD_DD, 'corbel')
        k.box(x - 0.05, F - 0.02, ZJ - 0.22, x + 0.05, F + J, ZJ - 0.08, A.WOOD_DD, 'corbel')
        x += 0.62


def framing(k, x0, x1, z0, z1, rf, timber, openings):
    """Posts, rails and braces on a plastered upper floor, clear of the windows (openings: [(xa, xb)])."""
    T = []
    posts = [x0 + 0.02, x1 - 0.14]
    for (a, b) in openings:
        posts += [a - 0.16, b + 0.04]
    posts = sorted(set(round(p, 3) for p in posts if x0 <= p <= x1 - 0.1))
    for p in posts:
        T.append((p, rf - 0.01, z0, p + 0.12, rf + 0.04, z1))
    for zz in (z0, z1 - 0.12):
        T.append((x0 + 0.02, rf - 0.01, zz, x1 - 0.02, rf + 0.04, zz + 0.12))
    k.boxes(T, (timber, 0.12), 'timber')
    # braces in the bays without a window
    for a, b in zip(posts, posts[1:]):
        mid = (a + b) / 2
        if b - a > 0.45 and not any(oa - 0.2 < mid < ob + 0.2 for (oa, ob) in openings):
            k.tube((a + 0.12, rf + 0.03, z0 + 0.12), (b, rf + 0.03, z1 - 0.12), 0.045, (timber, 0.12), 'timber', verts=4,
                   smooth=False)


def coursed(k, x0, x1, z0, z1, rf, tone, skip=()):
    rng = k.rng
    zz, i = z0, 0
    while zz < z1 - 0.05:
        h = rng.uniform(0.2, 0.26)
        x = x0 + (0.0 if i % 2 else 0.22)
        while x < x1:
            w = rng.uniform(0.36, 0.58)
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.06 and not any(sa < (a + b) / 2 < sb and sz0 < zz + h / 2 < sz1 for (sa, sb, sz0, sz1) in skip):
                k.box(a + 0.015, rf - 0.02, zz + 0.015, b - 0.015, rf + 0.01 + rng.uniform(0, 0.012), min(z1, zz + h) - 0.015,
                      (shade(tone, rng.uniform(0.82, 1.12)), 0.16), 'stone_block', bevel=0.012)
            x += w
        zz += h
        i += 1


def harbour_house(k, x0, x1, r_back, F, wall_h, rise, roof, wall, ground='stone', timber=None, door_x=None, door_w=0.72,
                  shop=None, win_down=(), win_up=(), win_up2=(), chimney=None, sign=None, lanterns=(), dormers=(),
                  awning=None, hoist=False, boards=False, pots=0.6):
    """Lantern Quay's harbour house (dioramas/lantern_quay.py) on a footprint: x0..x1, from r_back to its ground-floor
    front at row F; the upper floor oversails the street by J on corbels. Returns (ridge row, ridge z)."""
    rng = k.rng
    timber = timber or rng.choice((A.WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028'))
    shutters = rng.choice(('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#2a3a4a', '#7a6a3a'))
    rb = r_back
    k.box(x0, rb, -0.02, x1, F, 0.3, (SALT[2], 0.16), 'footing', bevel=0.02)
    k.box(x0 + 0.04, rb + 0.04, 0.3, x1 - 0.04, F - 0.02, ZJ, (wall if ground != 'stone' else STONE, 0.08), 'house_wall')
    # openings on the ground floor (for the stones to leave clear)
    holes = []
    if door_x is not None:
        holes.append((door_x - door_w / 2 - 0.1, door_x + door_w / 2 + 0.1, 0.0, 1.7))
    if shop:
        holes.append((shop[0] - 0.12, shop[1] + 0.12, 0.3, ZJ))
    for (wx, wz) in win_down:
        holes.append((wx - 0.4, wx + 0.4, wz - 0.12, wz + 0.88))
    if ground == 'stone':
        coursed(k, x0 + 0.04, x1 - 0.04, 0.3, ZJ - 0.06, F - 0.0, STONE, skip=holes)
    else:
        T = [(x0 + 0.04, F - 0.03, 0.3, x0 + 0.16, F + 0.02, ZJ), (x1 - 0.16, F - 0.03, 0.3, x1 - 0.04, F + 0.02, ZJ)]
        k.boxes(T, (timber, 0.12), 'timber')
    # the upper floor oversails the ground floor on its corbels
    k.box(x0 + 0.01, rb + 0.04, ZJ, x1 - 0.01, F + J, wall_h, (wall, 0.08), 'house_wall')
    k.box(x0 - 0.01, F - 0.06, ZJ - 0.1, x1 + 0.01, F + J + 0.03, ZJ + 0.03, (timber, 0.12), 'timber', bevel=0.01)
    corbels(k, x0, x1, F)
    rf = F + J
    if boards:          # the warehouse: weatherboards up there instead of plaster and timber
        zz = ZJ + 0.04
        while zz < wall_h - 0.05:
            k.box(x0 + 0.02, rf - 0.005, zz, x1 - 0.02, rf + 0.03, zz + 0.16, (shade(wall, rng.uniform(0.86, 1.06)), 0.14), 'boards')
            k.box(x0 + 0.02, rf + 0.02, zz, x1 - 0.02, rf + 0.035, zz + 0.025, shade(wall, 0.6), 'board_shadow')
            zz += 0.17
    else:
        opens = [(wx - 0.3, wx + 0.3) for (wx, _wz) in list(win_up) + list(win_up2)]
        framing(k, x0, x1, ZJ + 0.03, wall_h, rf, timber, opens)
    flowers_pick = lambda: rng.choice((None, ('#e04060', '#e0c040'), ('#a060d0', '#e0e0f0'), ('#e07030', '#e0c040'), ('#f0f0f0', '#e04060')))
    for (wx, wz) in win_up:
        W.window(k, wx, rf + 0.02, wz, w=0.48, h=0.6, shutters=shutters, flowers=flowers_pick())
    for (wx, wz) in win_up2:
        W.window(k, wx, rf + 0.02, wz, w=0.44, h=0.52, shutters=shutters)
    for (wx, wz) in win_down:
        W.window(k, wx, F + 0.02, wz, w=0.52, h=0.72, shutters=shutters, flowers=flowers_pick())
    if shop:
        shop_window(k, shop[0], shop[1], 0.52, 1.36, F)
    if door_x is not None:
        W.door(k, door_x, F, w=door_w, h=1.48, col=rng.choice((A.WOOD_D, '#3a4a3a', '#4a2a2a', '#2a3a4a')))
    rm, zr = W._gable_roof(k, x0, x1, rb, rf, wall_h, rise, roof)
    for cx in dormers:
        W.dormer(k, cx, rf + 0.25, rm, wall_h - 0.06, zr, roof, wall, shutters)
    if chimney is not None:
        ra_ = rf + 0.25
        rz = zr - (zr - wall_h + 0.06) * 0.05 / max(0.1, ra_ - rm)
        W.chimney_stack(k, chimney, rm - 0.35, rm + 0.05, wall_h, zr + 0.75, roof_z=rz)
    if door_x is not None and door_w < 1 and rng.random() < 0.5 and not awning:
        W.door_hood(k, door_x, F + 0.03, 1.86, roof)
    if sign:
        W.hanging_sign(k, sign[0], rf, sign[1], icon=sign[2])
    for lx in lanterns:
        W.wall_lantern(k, lx, F + 0.02, z=1.32, energy=12)
    W.dress_front(k, x0, x1, F, ZJ, door_x, [w[0] for w in win_down] + ([sum(shop) / 2] if shop else []), ivy=0.3, pots=pots)
    if awning:
        stripe_a, stripe_b = awning
        ax0, ax1 = shop[0] - 0.25, shop[1] + 0.25
        n = int((ax1 - ax0) / 0.22)
        for i in range(n):
            a = ax0 + (ax1 - ax0) * i / n
            b = ax0 + (ax1 - ax0) * (i + 1) / n
            k.quads([((a, F + 0.02, ZJ - 0.05), (b, F + 0.02, ZJ - 0.05), (b, F + 0.95, ZJ - 0.42), (a, F + 0.95, ZJ - 0.42))],
                    stripe_a if i % 2 == 0 else stripe_b, 'awning')
            k.blob((a + b) / 2, F + 0.97, ZJ - 0.47, (b - a) / 2, 0.03, 0.06, stripe_a if i % 2 == 0 else stripe_b, 'awning', segs=8)
        for sx in (ax0 + 0.05, ax1 - 0.05):
            k.tube((sx, F + 0.02, ZJ - 0.1), (sx, F + 0.95, ZJ - 0.45), 0.018, A.IRON, 'awning_rod', verts=5)
    if hoist:
        hx = (x0 + x1) / 2
        k.box(hx - 0.07, rf - 0.3, wall_h + 0.2, hx + 0.07, rf + 0.85, wall_h + 0.34, (A.WOOD_D, 0.12), 'hoist_beam')
        k.cyl_x(hx - 0.06, hx + 0.06, rf + 0.72, wall_h + 0.1, 0.09, 0.09, A.IRON, 'pulley', verts=10)
        k.tube((hx, rf + 0.72, wall_h + 0.02), (hx, rf + 0.72, 2.0), 0.014, '#a08a60', 'rope', verts=5)
        A.crate(k, hx - 0.25, rf + 0.47, s=0.5, z0=1.55, tone=A.WOOD_L, solid=False)
        # the loft door it serves
        k.box(hx - 0.42, rf, wall_h - 1.05, hx + 0.42, rf + 0.06, wall_h - 0.08, (A.WOOD_D, 0.16), 'loft_door')
        k.box(hx - 0.46, rf, wall_h - 1.09, hx + 0.46, rf + 0.05, wall_h - 1.04, A.WOOD_DD, 'door_frame')
    k.solid(x0, rb, x1, F)
    return rm, zr


def sloop(k, x0, x1, rc, beam=1.2, hull='#3a2a1c', strake='#2a5a52', sail='#e4d8bc', wz=-0.55):
    """Lantern Quay's moored sloop: cabin, hatch, cask and rope on deck, mast, the mainsail furled on the boom, stays
    and shrouds, a bowsprit, a stern lantern, fenders; lowered to ride at wz."""
    rng = k.rng
    since, lsince = len(k.parts), len(k.lights)
    L = x1 - x0
    shape = lambda t: max(0.05, math.sin(math.pi * (0.03 + 0.9 * t)) ** 0.5 * (1 - 0.35 * max(0.0, t - 0.75) / 0.25))
    gun = lambda t: 0.55 + 0.22 * (t - 0.62) ** 2 * 2.2
    W._hull(k, x0, x1, rc, beam, gun, lambda t: -0.5, shape, (hull, 0.14), 'boat_hull', n=28)
    W._hull(k, x0 - 0.01, x1 + 0.01, rc, beam + 0.05, lambda t: gun(t) + 0.02, lambda t: gun(t) - 0.12, shape, (strake, 0.1),
            'boat_strake', n=28)
    deck = [(x0 + t * L, rc + s * beam / 2 * shape(t) * 0.94, gun(t) - 0.06) for s, ts in ((-1, range(0, 21)), (1, range(20, -1, -1)))
            for t in (i / 20 for i in ts)]
    k.poly(deck, ('#94704a', 0.16), 'deck')
    for i in range(1, 7):          # deck planks
        rr = rc - beam * 0.42 + beam * 0.84 * i / 7
        k.box(x0 + L * 0.1, rr - 0.007, gun(0.5) - 0.06, x0 + L * 0.92, rr + 0.007, gun(0.5) - 0.042, '#5a3e24', 'deck_seam')
    # a hatch, a coil of rope, a crate and a water cask on deck
    hx = x0 + L * 0.72
    k.box(hx - 0.22, rc - 0.2, gun(0.72) - 0.06, hx + 0.22, rc + 0.2, gun(0.72) + 0.06, (A.WOOD_D, 0.12), 'hatch', bevel=0.015)
    W.annulus(k, x0 + L * 0.84, rc + beam * 0.18, 0.05, 0.15, gun(0.84) - 0.06, gun(0.84) + 0.0, ('#b8a070', 0.25), 'rope', segs=16)
    A.crate(k, x0 + L * 0.62, rc - beam * 0.38, s=0.3, z0=gun(0.62) - 0.06, solid=False)
    k.cyl(x0 + L * 0.5, rc + beam * 0.3, gun(0.5) - 0.06, gun(0.5) + 0.22, 0.1, (A.WOOD, 0.12), 'cask', verts=12)
    cx0, cx1 = x0 + L * 0.18, x0 + L * 0.46            # the cabin aft
    k.box(cx0, rc - beam * 0.28, gun(0.3) - 0.06, cx1, rc + beam * 0.28, gun(0.3) + 0.36, ('#d8ccb0', 0.08), 'cabin', bevel=0.02)
    k.box(cx0 - 0.04, rc - beam * 0.31, gun(0.3) + 0.36, cx1 + 0.04, rc + beam * 0.31, gun(0.3) + 0.42, (A.WOOD_D, 0.1), 'cabin_roof', bevel=0.015)
    for wx in (cx0 + 0.3, cx0 + 0.65, cx1 - 0.25):
        k.cyl_y(wx, rc + beam * 0.28, rc + beam * 0.28 + 0.02, gun(0.3) + 0.17, 0.07, 0.07, '#5a3a18', 'porthole', emit=(W.GLOW, 0.8), verts=10)
        k.cyl_y(wx, rc + beam * 0.28 - 0.005, rc + beam * 0.28 + 0.015, gun(0.3) + 0.17, 0.09, 0.09, A.BRASS, 'porthole_rim', verts=10)
    mx = x0 + L * 0.58
    k.cyl(mx, rc, gun(0.58) - 0.06, gun(0.58) + 3.6, 0.055, (A.WOOD, 0.1), 'mast', verts=10)
    k.cyl(mx, rc, gun(0.58) + 3.6, gun(0.58) + 3.7, 0.04, A.WOOD_D, 'mast', verts=8)
    zb = gun(0.58) + 0.75
    k.cyl_x(x0 + L * 0.06, mx, rc, zb, 0.04, 0.04, (A.WOOD, 0.1), 'boom', verts=8)
    # the mainsail furled along the boom: lumpy folds and a few ties
    x = x0 + L * 0.1
    while x < mx - 0.1:
        k.blob(x + 0.12, rc, zb + 0.09, 0.16, 0.09 + rng.uniform(-0.01, 0.015), 0.08, (shade(sail, rng.uniform(0.92, 1.04)), 0.06), 'furled_sail', segs=10)
        x += 0.22
    for t in (0.2, 0.33, 0.46):
        xx = x0 + L * t + 0.4
        k.cyl_x(xx - 0.015, xx + 0.015, rc, zb + 0.09, 0.105, 0.1, '#8a6a40', 'sail_tie', verts=8)
    top = (mx, rc, gun(0.58) + 3.55)
    k.tube(top, (x1 - 0.05, rc, gun(1.0) + 0.05), 0.012, '#4a3a2a', 'rigging', verts=4)        # the forestay
    k.tube(top, (x0 + 0.1, rc, gun(0.0) + 0.1), 0.012, '#4a3a2a', 'rigging', verts=4)          # the backstay
    for s in (-1, 1):
        k.tube((mx, rc, gun(0.58) + 2.6), (mx - 0.1, rc + s * beam * 0.48, gun(0.58)), 0.01, '#4a3a2a', 'rigging', verts=4)
    k.tube((x1 - 0.1, rc, gun(1.0)), (x1 + 0.7, rc, gun(1.0) + 0.15), 0.035, (A.WOOD, 0.1), 'bowsprit', verts=8)
    W.lantern(k, x0 + 0.2, rc, gun(0.0) + 0.05, gun(0.0) + 0.27, s=0.07, energy=10)
    k.cyl(x0 + 0.2, rc, gun(0.0) - 0.05, gun(0.0) + 0.05, 0.02, A.IRON, 'lantern_post', verts=6)
    # fenders over the side
    for t in (0.35, 0.55, 0.75):
        k.blob(x0 + L * t, rc - beam * 0.52, gun(t) - 0.28, 0.07, 0.07, 0.13, '#e8e0d0', 'fender', segs=10)
    C.sink(k, since, wz + 0.08, lights_since=lsince)
