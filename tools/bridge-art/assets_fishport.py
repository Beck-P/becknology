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
