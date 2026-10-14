"""Arcadia's skyline: the megacity round the District, rendered as backdrop
layers (tools/bridge-art/skyline.py). Tile units: x = column, r = row
(toward the camera), z = height. Only the faces toward the camera and the
roofs show, so towers are built as facades: tiers stepping back as they
rise, grids of lit windows (one batched part per colour), neon edges,
crowns, antennas, sky bridges and blank holo-ad screens the engine fills
with animation (their corners are CineKit anchors).
"""
import math

from scenekit import shade

NEON = ['#f078a8', '#5cc8d0', '#7080e8', '#e8c040', '#a040c0', '#40e0b0']
WIN = ['#ffd890', '#a0e0ff', '#ff90c0', '#c0a0ff', '#fff0d0']
WALLS = ['#14102a', '#1a1630', '#101826', '#1c1424', '#121a2a']


def tower(k, x0, x1, r_front, h, depth=1.0, wall=None, tiers=2, win=(0.32, 0.4), lit=0.45, neon=None,
          crown='antenna', ads=(), detail=1.0, rng=None, style=None):
    """A tower whose front face stands at r_front. ads: list of (fx0, fx1, fz0,
    fz1) facade fractions to leave as holo screens — their corners are
    anchored as ad<N>_a (top-left) / ad<N>_b (bottom-right). Returns the
    roof height."""
    rng = rng or k.rng
    wall = wall or rng.choice(WALLS)
    neon = neon or rng.choice(NEON)
    style = style or rng.choice(('grid', 'grid', 'strips', 'bands', 'sparse'))
    z = 0.0
    xa, xb = x0, x1
    lit_boxes = {}
    tier_h = [h * f for f in ((1.0,) if tiers == 1 else (0.62, 0.38) if tiers == 2 else (0.5, 0.3, 0.2))]
    ad_rects = []
    for t, th in enumerate(tier_h):
        rf = r_front - t * 0.35 * depth / max(1, tiers)
        k.box(xa, rf - depth, z, xb, rf, z + th, (shade(wall, rng.uniform(0.9, 1.1)), 0.06), 'tower')
        sx, sz = win
        # holo screens on this tier
        for (fx0, fx1, fz0, fz1) in ads:
            if t != 0:
                continue
            a0, a1 = xa + (xb - xa) * fx0, xa + (xb - xa) * fx1
            b0, b1 = z + th * fz0, z + th * fz1
            ad_rects.append((a0 - sx, a1, b0 - sz, b1))
            n = len([a for a in k.anchors if a.startswith('ad')]) // 2
            k.box(a0 - 0.06, rf, b0 - 0.06, a1 + 0.06, rf + 0.05, b1 + 0.06, '#06040c', 'ad_frame')
            k.box(a0, rf + 0.05, b0, a1, rf + 0.06, b1, '#100830', 'ad_screen', emit=('#2a1460', 0.6))
            k.anchor('ad%d_a' % n, a0, rf + 0.06, b1)
            k.anchor('ad%d_b' % n, a1, rf + 0.06, b0)
        # windows: a grid on the facade, some floors dark, some columns dark
        nx = max(1, int((xb - xa - 0.2) / sx))
        nz = max(1, int((th - 0.3) / sz))
        ox = xa + (xb - xa - nx * sx) / 2
        dark_floor = {i for i in range(nz) if rng.random() < 0.18}
        dark_col = {j for j in range(nx) if rng.random() < 0.12}
        tone = rng.choice(WIN)
        for i in range(nz):
            if i in dark_floor and style != 'strips':
                continue
            for j in range(nx):
                wx, wz = ox + j * sx, z + 0.2 + i * sz
                if any(a0 <= wx <= a1 and b0 <= wz <= b1 for (a0, a1, b0, b1) in ad_rects):
                    continue
                if style == 'strips':           # light running up the window columns
                    if j % 2 or j in dark_col or rng.random() < 0.08:
                        continue
                    lit_boxes.setdefault(tone, []).append((wx + sx * 0.3, rf, wz - sz * 0.2, wx + sx * 0.7, rf + 0.02, wz + sz * 0.8))
                elif style == 'bands':          # office floors lit edge to edge
                    if i % 3 == 1 or rng.random() > 0.92:
                        continue
                    lit_boxes.setdefault(tone, []).append((wx, rf, wz + sz * 0.15, wx + sx, rf + 0.02, wz + sz * 0.55))
                else:
                    if j in dark_col or rng.random() > (lit * (0.4 if style == 'sparse' else 1)):
                        continue
                    col = rng.choice(WIN)
                    lit_boxes.setdefault(col, []).append((wx + sx * 0.18, rf, wz, wx + sx * 0.82, rf + 0.02, wz + sz * 0.62))
        # vertical fins: relief and shadow up the facade
        if detail > 0.5 and rng.random() < 0.6:
            step = rng.choice((2, 3, 4))
            fins = [(ox + j * sx - 0.03, rf, z, ox + j * sx + 0.03, rf + 0.12, z + th) for j in range(0, nx + 1, step)]
            k.boxes(fins, shade(wall, 1.35), 'tower_fin')
        # neon edges up the corners, a lit band at the tier's top
        if rng.random() < 0.8 * detail:
            for xx in (xa + 0.02, xb - 0.08):
                k.box(xx, rf, z + 0.1, xx + 0.06, rf + 0.03, z + th - 0.05, shade(neon, 0.45), 'tower_neon', emit=(neon, 0.85))
        k.box(xa, rf, z + th - 0.12, xb, rf + 0.04, z + th - 0.04, shade(neon, 0.4), 'tower_band', emit=(neon, 0.6))
        k.box(xa - 0.05, rf - depth - 0.05, z + th, xb + 0.05, rf + 0.05, z + th + 0.1, (shade(wall, 1.8), 0.1), 'tower_ledge')
        if detail > 0.5:                     # roof clutter on each step back
            for _ in range(rng.randint(1, 3)):
                cx0 = rng.uniform(xa + 0.1, max(xa + 0.15, xb - 0.6))
                k.box(cx0, rf - depth + 0.15, z + th + 0.1, cx0 + rng.uniform(0.25, 0.5), rf - 0.15, z + th + rng.uniform(0.2, 0.5),
                      (shade(wall, 2.0), 0.1), 'roof_box')
        z += th
        w = xb - xa
        if t < len(tier_h) - 1:
            cut = w * rng.uniform(0.12, 0.25)
            xa, xb = xa + cut * rng.uniform(0.3, 1.0), xb - cut * rng.uniform(0.3, 1.0)
    for col, rects in lit_boxes.items():
        k.boxes(rects, shade(col, 0.5), 'tower_win', emit=(col, 0.8))
    # the crown
    cx = (xa + xb) / 2
    rc = r_front - depth / 2
    if crown == 'antenna':
        for dx in ((0,) if xb - xa < 1.5 else (-0.3, 0.4)):
            hh = rng.uniform(1.0, 2.6)
            k.tube((cx + dx, rc, z), (cx + dx, rc, z + hh), 0.04, '#2a2838', 'antenna', verts=4)
            k.sphere(cx + dx, rc, z + hh + 0.05, 0.08, 0.08, '#ff3040', 'antenna_light', emit=('#ff3040', 1.0), segs=6)
    elif crown == 'spire':
        k.cone(cx, rc, z, z + rng.uniform(2.0, 4.0), (xb - xa) * 0.35, 0.02, (shade(wall, 1.3), 0.06), 'spire', verts=4)
        k.sphere(cx, rc, z + 0.2, 0.12, 0.12, neon, 'spire_light', emit=(neon, 1.0), segs=6)
    elif crown == 'pad':
        k.cyl(cx, rc, z, z + 0.12, min(xb - xa, depth) * 0.45, '#24203a', 'roof_pad', verts=16)
        for i in range(8):
            a = i * math.pi / 4
            rr = min(xb - xa, depth) * 0.4
            k.sphere(cx + math.cos(a) * rr, rc + math.sin(a) * rr, z + 0.13, 0.04, 0.04, '#80e0e8', 'pad_light',
                     emit=('#80e0e8', 1.0), segs=5)
    elif crown == 'halo':                    # a neon ring floating over the roof
        R = (xb - xa) * 0.42
        pts = [(cx + math.cos(i * math.pi / 8) * R, rc + math.sin(i * math.pi / 8) * R * 0.6, z + 0.9) for i in range(17)]
        for a, b in zip(pts, pts[1:]):
            k.tube(a, b, 0.05, shade(neon, 0.45), 'crown_ring', emit=(neon, 0.9), verts=4)
        k.tube((cx, rc, z), (cx, rc, z + 0.8), 0.06, '#2a2838', 'crown_post', verts=6)
    return z


def blade_sign(k, x, r_front, z0, h, col, glyphs=5, rng=None):
    """A tall vertical sign standing off a facade, lit glyph strokes down it."""
    rng = rng or k.rng
    k.box(x - 0.05, r_front, z0, x + 0.05, r_front + 0.7, z0 + h, '#0a0614', 'blade')
    gh = h / glyphs
    for i in range(glyphs):
        gz = z0 + h - (i + 0.5) * gh
        for _ in range(rng.randint(2, 4)):
            a = (rng.uniform(0.1, 0.6), gz + rng.uniform(-0.3, 0.3) * gh)
            b = (rng.uniform(0.1, 0.6), gz + rng.uniform(-0.3, 0.3) * gh)
            k.tube((x + 0.06, r_front + a[0], a[1]), (x + 0.06, r_front + b[0], b[1]), 0.025, shade(col, 0.5), 'glyph',
                   emit=(col, 0.95), verts=4)


def sky_bridge(k, xa, xb, r, z, col='#5cc8d0'):
    k.box(xa, r - 0.5, z, xb, r, z + 0.45, ('#1a1830', 0.06), 'skybridge')
    k.box(xa, r, z + 0.12, xb, r + 0.02, z + 0.32, shade(col, 0.4), 'skybridge_glass', emit=(col, 0.6))


def roofscape(k, x0, x1, r0, r1, rng=None, top=1.2):
    """The city below the walkway, seen from above: blocks of roofs with
    vents and lights, streets of light between them."""
    rng = rng or k.rng
    r = r0
    while r < r1:
        bh = rng.uniform(1.6, 2.6)
        x = x0
        while x < x1:
            bw = rng.uniform(1.5, 3.5)
            h = rng.uniform(top - 1.6, top)
            wall = rng.choice(WALLS)
            k.box(x + 0.15, r + 0.15, -4.0, x + bw - 0.15, r + bh - 0.15, h, (shade(wall, 1.2), 0.08), 'roof_block')
            if rng.random() < 0.6:     # roof deck glow (skylights)
                sx = x + rng.uniform(0.3, bw - 0.9)
                k.box(sx, r + 0.4, h, sx + 0.5, r + bh - 0.5, h + 0.03, '#140a20',
                      'skylight', emit=(rng.choice(WIN), 0.5))
            if rng.random() < 0.45:   # neon edge on the roof
                col = rng.choice(NEON)
                k.box(x + 0.15, r + bh - 0.2, h, x + bw - 0.15, r + bh - 0.15, h + 0.04, shade(col, 0.4), 'roof_neon',
                      emit=(col, 0.85))
            if rng.random() < 0.5:
                k.box(x + bw * 0.6, r + 0.4, h, x + bw * 0.6 + 0.4, r + 0.8, h + 0.3, '#3a3848', 'roof_vent')
            # lit windows on the front face (what shows of it)
            n = int((bw - 0.4) / 0.3)
            rects = []
            for j in range(n):
                for i in range(3):
                    if rng.random() < 0.4:
                        wz = h - 0.4 - i * 0.4
                        rects.append((x + 0.25 + j * 0.3, r + bh - 0.15, wz, x + 0.4 + j * 0.3, r + bh - 0.13, wz + 0.2))
            if rects:
                col = rng.choice(WIN)
                k.boxes(rects, shade(col, 0.5), 'roof_win', emit=(col, 0.8))
            x += bw
        # the street in front of the block: a dark road with lane light
        k.box(x0, r + bh - 0.15, -4.0, x1, r + bh + 0.35, top - 2.2, '#08060e', 'road')
        k.box(x0, r + bh + 0.05, top - 2.2, x1, r + bh + 0.1, top - 2.18, '#2a1a10', 'lane', emit=('#ffb060', 0.5))
        r += bh + 0.5
