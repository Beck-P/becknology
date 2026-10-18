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


# ---- the megacity, modelled (October 2026: Beck's "a lot cooler… more of the modeled view with more detail") ------------
# A tower is built the way the District's frontages are, at a distance: floor slabs standing proud, windows in rows lit
# the way a city is lit (offices a floor at a time, flats a room at a time, some floors dark, each building its own
# light), balconies and AC units up the lower floors, a lift running up the face, neon bands and edges, real-typeface
# signs on the crowns and blades down the faces, and a roof crowded with tanks, dishes, masts, a pad or a crane.
# `detail` thins it out for the far layer.
BRANDS = [('HALCYON', 'Audiowide'), ('KAIJU', 'Bungee'), ('NOVA', 'ZenDots'), ('OMNI', 'RussoOne'), ('KITSUNE', 'Righteous'),
          ('SPIRAL', 'Monoton'), ('ZENITH', 'Audiowide'), ('ARC', 'RubikMonoOne'), ('AURA', 'Righteous'), ('VOLT', 'Bungee')]
GLYPHS = ('ネオン', 'ホテル', 'ゲーム', '未来', '電気', 'カフェ', '夜', 'ラーメン', '東京', '酒')
TOWER_WALLS = ['#1c1834', '#201a3a', '#181c34', '#241a36', '#1a2034', '#22162e', '#1c2232']
LIGHTS = {'office': ['#cfe6ff', '#a0d8ff', '#e8f0ff'], 'warm': ['#ffd890', '#ffc070', '#ffe8b0'],
          'pink': ['#ff90c0', '#ffb0d8', '#e070c0'], 'violet': ['#c0a0ff', '#a090f0', '#d8c0ff']}


def _facade(k, xa, xb, rf, z0, z1, rng, wall, light, lit, detail, fh, kind):
    """One tier's face: slabs, windows (lit in runs or whole floors), mullions, balconies and AC units."""
    floors = max(1, int((z1 - z0 - 0.15) / fh))
    sx = 0.36 if detail > 0.5 else 0.42
    n = max(1, int((xb - xa - 0.24) / sx))
    ox = xa + (xb - xa - n * sx) / 2
    slabs, glass, frames, ac, rails = [], [], [], [], []
    lit_by = {}
    tones = LIGHTS[light]
    for f in range(floors):
        zf = z0 + 0.1 + f * fh
        slabs.append((xa - 0.02, rf, zf - 0.035, xb + 0.02, rf + 0.06, zf))
        u = rng.random()
        mode = 'dark' if u < 0.12 else 'full' if (kind == 'office' and u < 0.42) else 'runs'
        tone = rng.choice(tones)
        j = 0
        while j < n:
            run = rng.randint(1, 5)
            on = mode == 'full' or (mode == 'runs' and rng.random() < lit)
            for jj in range(j, min(n, j + run)):
                wx = ox + jj * sx
                rect = (wx + sx * 0.14, rf + 0.005, zf + fh * 0.18, wx + sx * 0.86, rf + 0.012, zf + fh * 0.82)
                if on:
                    lit_by.setdefault(tone if rng.random() > 0.12 else rng.choice(tones), []).append(rect)
                    if kind == 'flats' and rng.random() < 0.25:          # a blind half down
                        frames.append((rect[0], rect[1] + 0.008, rect[5] - fh * 0.28, rect[3], rect[4] + 0.008, rect[5]))
                else:
                    glass.append(rect)
            j += run
        if detail > 0.5 and kind == 'flats' and f % 2 == 1 and f < floors - 1:
            for jj in range(n):
                if rng.random() < 0.3:
                    wx = ox + jj * sx
                    slabs.append((wx + 0.02, rf, zf - 0.02, wx + sx - 0.02, rf + 0.18, zf + 0.02))
                    rails.append((wx + 0.02, rf + 0.16, zf + 0.02, wx + sx - 0.02, rf + 0.18, zf + fh * 0.35))
        if detail > 0.5 and kind != 'office':
            for jj in range(n):
                if rng.random() < 0.08:
                    wx = ox + jj * sx + sx * 0.25
                    ac.append((wx, rf, zf + 0.02, wx + sx * 0.5, rf + 0.12, zf + fh * 0.3))
    if detail > 0.5:                                         # mullions between the columns
        frames += [(ox + jj * sx - 0.012, rf, z0 + 0.1, ox + jj * sx + 0.012, rf + 0.02, z0 + 0.1 + floors * fh) for jj in range(n + 1)]
    k.boxes(slabs, (shade(wall, 1.55), 0.08), 'tower_slab')
    if glass:
        k.boxes(glass, shade(wall, 0.55), 'tower_glass')
    if frames:
        k.boxes(frames, shade(wall, 1.25), 'tower_frame')
    if ac:
        k.boxes(ac, (shade('#8a8a96', 0.8), 0.08), 'tower_ac')
    if rails:
        k.boxes(rails, shade(wall, 1.8), 'tower_rail')
    for col, rects in lit_by.items():
        k.boxes(rects, shade(col, 0.5), 'tower_win', emit=(col, 0.8))


def _roof(k, xa, xb, rb, rf, z, rng, wall, neon, detail):
    """What crowds a roof: tanks, dishes, vents, a mast with a red light, sometimes a pad or a crane."""
    w = xb - xa
    k.box(xa - 0.04, rb - 0.04, z, xb + 0.04, rf + 0.04, z + 0.14, (shade(wall, 1.6), 0.08), 'tower_parapet')
    k.box(xa, rf + 0.01, z + 0.08, xb, rf + 0.05, z + 0.12, shade(neon, 0.45), 'tower_band', emit=(neon, 0.65))
    if detail <= 0.5:
        if rng.random() < 0.7:
            hh = rng.uniform(0.8, 2.2)
            cx = rng.uniform(xa + 0.2, xb - 0.2)
            k.tube((cx, (rb + rf) / 2, z), (cx, (rb + rf) / 2, z + hh), 0.04, '#2a2838', 'antenna', verts=4)
            k.sphere(cx, (rb + rf) / 2, z + hh, 0.08, 0.08, '#ff3040', 'antenna_light', emit=('#ff3040', 1.0), segs=6)
        return
    items = rng.sample(['tank', 'tank', 'dish', 'vent', 'mast', 'pad', 'crane', 'billboard'], k=min(4, max(1, int(w / 1.3))))
    for it in items:
        cx = rng.uniform(xa + 0.4, max(xa + 0.45, xb - 0.4))
        cr = rng.uniform(rb + 0.3, max(rb + 0.35, rf - 0.3))
        if it == 'tank':
            k.cyl(cx, cr, z + 0.14, z + 0.6, 0.24, (shade(wall, 1.9), 0.1), 'roof_tank', verts=10)
            k.cone(cx, cr, z + 0.6, z + 0.75, 0.26, 0.04, shade(wall, 1.4), 'roof_tank_cap', verts=10)
            k.cyl(cx, cr, z + 0.38, z + 0.42, 0.25, shade(neon, 0.45), 'tower_band', emit=(neon, 0.5), verts=10)
        elif it == 'dish':
            k.tube((cx, cr, z + 0.14), (cx, cr, z + 0.45), 0.03, '#3a3a44', 'dish_post', verts=4)
            k.blob(cx, cr + 0.05, z + 0.55, 0.26, 0.06, 0.22, ('#b0b0bc', 0.06), 'dish', rot=(25, 0, 0), segs=10)
        elif it == 'vent':
            k.box(cx - 0.3, cr - 0.25, z + 0.14, cx + 0.3, cr + 0.25, z + 0.5, (shade(wall, 2.1), 0.08), 'roof_vent')
            k.cyl(cx, cr, z + 0.5, z + 0.54, 0.18, '#2a2a32', 'roof_fan', verts=10)
        elif it == 'mast':
            hh = rng.uniform(1.4, 3.2)
            k.tube((cx, cr, z), (cx, cr, z + hh), 0.05, '#3a3848', 'antenna', verts=4)
            for zz in (z + hh * 0.45, z + hh * 0.75):
                k.box(cx - 0.25, cr - 0.02, zz, cx + 0.25, cr + 0.02, zz + 0.03, '#3a3848', 'antenna_arm')
            k.sphere(cx, cr, z + hh + 0.05, 0.09, 0.09, '#ff3040', 'antenna_light', emit=('#ff3040', 1.0), segs=6)
        elif it == 'pad' and w > 2.2:
            R = min(w, rf - rb) * 0.38
            k.cyl((xa + xb) / 2, (rb + rf) / 2, z + 0.14, z + 0.2, R, '#24203a', 'roof_pad', verts=20)
            for i in range(10):
                a = i * math.tau / 10
                k.sphere((xa + xb) / 2 + math.cos(a) * R * 0.9, (rb + rf) / 2 + math.sin(a) * R * 0.9, z + 0.21, 0.035, 0.03,
                         '#80e0e8', 'pad_light', emit=('#80e0e8', 1.0), segs=5)
        elif it == 'crane':
            hh = rng.uniform(2.0, 3.0)
            k.box(cx - 0.08, cr - 0.08, z + 0.14, cx + 0.08, cr + 0.08, z + hh, ('#c8a030', 0.08), 'crane')
            k.box(cx - 1.4, cr - 0.06, z + hh, cx + 0.6, cr + 0.06, z + hh + 0.14, ('#c8a030', 0.08), 'crane')
            k.tube((cx - 1.2, cr, z + hh), (cx - 1.2, cr, z + hh - 1.0), 0.01, '#2a2a30', 'crane_line', verts=3)
            k.sphere(cx + 0.55, cr, z + hh + 0.2, 0.06, 0.06, '#ff3040', 'antenna_light', emit=('#ff3040', 1.0), segs=6)
        elif it == 'billboard' and w > 2.0:
            bw = min(w - 0.4, 2.4)
            bx = (xa + xb) / 2
            for xx in (bx - bw / 2 + 0.15, bx + bw / 2 - 0.15):
                k.box(xx - 0.04, rf - 0.35, z + 0.14, xx + 0.04, rf - 0.27, z + 0.7, '#2a2832', 'billboard_leg')
            col = rng.choice(NEON)
            k.box(bx - bw / 2, rf - 0.3, z + 0.7, bx + bw / 2, rf - 0.2, z + 1.5, '#0a0810', 'billboard_frame')
            k.box(bx - bw / 2 + 0.06, rf - 0.2, z + 0.76, bx + bw / 2 - 0.06, rf - 0.19, z + 1.44, shade(col, 0.4), 'billboard_screen',
                  emit=(col, 0.55))


def megatower(k, x0, x1, rf, h, rng, depth=1.4, wall=None, neon=None, light=None, lit=None, detail=1.0, shape=None,
              ads=(), brand=None, blade=None, kind=None, fh=None):
    """A tower of the megacity, facing the camera at row rf. shape: 'setback' (tiers stepping in), 'slab', 'twin' (two
    towers on a podium joined by bridges), 'round' (a drum), 'spire' (tapering to a needle), 'stack' (offset blocks,
    cantilevered). ads: (fx0, fx1, fz0, fz1) facade fractions left as holo screens, anchored ad<N>_a / _b. Returns the
    roof height."""
    wall = wall or rng.choice(TOWER_WALLS)
    neon = neon or rng.choice(NEON)
    light = light or rng.choice(('office', 'warm', 'warm', 'pink', 'violet', 'office'))
    kind = kind or ('office' if light == 'office' else 'flats')
    lit = lit if lit is not None else rng.uniform(0.35, 0.6)
    shape = shape or rng.choice(('setback', 'setback', 'slab', 'twin', 'round', 'spire', 'stack'))
    fh = fh or (0.5 if detail > 0.5 else 0.44)
    rb = rf - depth
    top = 0.0

    def block(xa, xb, z0, z1, r_f=rf, d=depth):
        k.box(xa, r_f - d, z0, xb, r_f, z1, (wall, 0.06), 'tower')
        _facade(k, xa, xb, r_f, z0, z1, rng, wall, light, lit, detail, fh, kind)
        if rng.random() < 0.7:                                   # neon up the corners
            for xx in (xa + 0.02, xb - 0.07):
                k.box(xx, r_f, z0 + 0.1, xx + 0.05, r_f + 0.03, z1 - 0.05, shade(neon, 0.45), 'tower_neon', emit=(neon, 0.8))

    w = x1 - x0
    if shape == 'twin' and w > 4.0:
        pod = rng.uniform(1.5, 2.6)
        block(x0, x1, 0.0, pod)
        _roof(k, x0, x1, rb, rf, pod, rng, wall, neon, 0.3)
        g = w * 0.18
        a1, b0 = x0 + (w - g) / 2, x0 + (w + g) / 2
        h2 = h * rng.uniform(0.75, 0.95)
        block(x0 + 0.2, a1, pod, h, rf - 0.15, depth - 0.3)
        block(b0, x1 - 0.2, pod, h2, rf - 0.15, depth - 0.3)
        for zz in (pod + (h2 - pod) * 0.4, pod + (h2 - pod) * 0.8):     # sky bridges between them
            k.box(a1, rf - 0.9, zz, b0, rf - 0.3, zz + 0.4, (shade(wall, 1.3), 0.06), 'skybridge')
            k.box(a1, rf - 0.3, zz + 0.1, b0, rf - 0.28, zz + 0.3, shade(neon, 0.4), 'skybridge_glass', emit=(neon, 0.6))
        _roof(k, x0 + 0.2, a1, rb + 0.15, rf - 0.15, h, rng, wall, neon, detail)
        _roof(k, b0, x1 - 0.2, rb + 0.15, rf - 0.15, h2, rng, wall, neon, detail)
        top = h
        crown_x = (x0 + a1) / 2
    elif shape == 'round':
        ads = ()
        R0 = w * 0.46
        cx = (x0 + x1) / 2
        tones = LIGHTS[light]
        wins = {}
        z = 0.0
        for (R, th) in ((R0, h * 0.7), (R0 * 0.72, h * 0.3)):     # a drum, and a narrower drum on it
            cr = rf - R * 0.55
            k.cyl(cx, cr, z, z + th, R, (wall, 0.06), 'tower', verts=32)
            zz = z + 0.1
            nw = max(8, int(R * 2.6 / 0.36))
            while zz < z + th - 0.3:
                k.cyl(cx, cr, zz - 0.04, zz, R + 0.04, (shade(wall, 1.5), 0.08), 'tower_slab', verts=32)
                for i in range(nw):
                    a = math.pi * (0.1 + 0.8 * i / (nw - 1))
                    if rng.random() < lit:
                        px_, pr_ = cx - math.cos(a) * (R + 0.005), cr + math.sin(a) * (R + 0.005)
                        hw = 0.12 * max(0.35, math.sin(a))
                        wins.setdefault(rng.choice(tones), []).append((px_ - hw, pr_ - 0.02, zz + fh * 0.2, px_ + hw, pr_ + 0.02, zz + fh * 0.8))
                zz += fh
            k.cyl(cx, cr, z + th, z + th + 0.15, R + 0.06, shade(wall, 1.6), 'tower_parapet', verts=32)
            k.cyl(cx, cr, z + th + 0.05, z + th + 0.1, R + 0.07, shade(neon, 0.45), 'tower_band', emit=(neon, 0.8), verts=32)
            z += th + 0.15
        for col, rects in wins.items():
            k.boxes(rects, shade(col, 0.5), 'tower_win', emit=(col, 0.8))
        hh = rng.uniform(1.5, 3.0)                                # a mast on top
        k.tube((cx, rf - R0 * 0.55, z), (cx, rf - R0 * 0.55, z + hh), 0.05, '#3a3848', 'antenna', verts=4)
        k.sphere(cx, rf - R0 * 0.55, z + hh, 0.09, 0.09, '#ff3040', 'antenna_light', emit=('#ff3040', 1.0), segs=6)
        top = z
        crown_x = cx
    elif shape == 'spire':
        tiers = 4
        xa, xb, z = x0, x1, 0.0
        for t in range(tiers):
            th = h * (0.4, 0.27, 0.18, 0.15)[t]
            r_t = rf - t * 0.12
            block(xa, xb, z, z + th, r_t, depth - t * 0.25)
            k.box(xa - 0.05, r_t - depth + t * 0.25 - 0.05, z + th, xb + 0.05, r_t + 0.05, z + th + 0.1, (shade(wall, 1.7), 0.08), 'tower_ledge')
            k.box(xa, r_t + 0.03, z + th - 0.02, xb, r_t + 0.07, z + th + 0.04, shade(neon, 0.45), 'tower_band', emit=(neon, 0.7))
            z += th
            cut = (xb - xa) * 0.16
            xa, xb = xa + cut, xb - cut
        k.cone((xa + xb) / 2, rf - depth / 2, z, z + h * 0.35, (xb - xa) * 0.5, 0.02, (shade(wall, 1.4), 0.06), 'spire', verts=4)
        for i in range(5):
            zz = z + h * 0.35 * i / 6
            k.sphere((xa + xb) / 2, rf - depth / 2 + 0.2, zz + 0.2, 0.05, 0.05, neon, 'spire_light', emit=(neon, 1.0), segs=5)
        top = z
        crown_x = (xa + xb) / 2
    elif shape == 'stack':
        z, xa, xb = 0.0, x0, x1
        while z < h - 0.5:
            th = rng.uniform(2.2, 4.0)
            th = min(th, h - z)
            off = rng.uniform(-0.6, 0.6)
            wa, wb = max(x0 - 0.5, xa + off), min(x1 + 0.5, xb + off)
            r_t = rf + rng.uniform(-0.2, 0.25)
            block(wa, wb, z, z + th, r_t)
            k.box(wa - 0.05, r_t - depth - 0.05, z + th, wb + 0.05, r_t + 0.05, z + th + 0.12, (shade(wall, 1.7), 0.08), 'tower_ledge')
            z += th + 0.12
        _roof(k, xa, xb, rb, rf, z, rng, wall, neon, detail)
        top = z
        crown_x = (x0 + x1) / 2
    else:                                                    # setback / slab
        tiers = 1 if shape == 'slab' else rng.choice((2, 3))
        frac = {1: (1.0,), 2: (0.62, 0.38), 3: (0.5, 0.3, 0.2)}[tiers]
        xa, xb, z = x0, x1, 0.0
        for t in range(tiers):
            th = h * frac[t]
            r_t = rf - t * 0.2
            block(xa, xb, z, z + th, r_t, depth - t * 0.2)
            z += th
            if t < tiers - 1:
                k.box(xa - 0.05, r_t - depth - 0.05, z, xb + 0.05, r_t + 0.05, z + 0.12, (shade(wall, 1.7), 0.08), 'tower_ledge')
                k.box(xa, r_t + 0.03, z - 0.02, xb, r_t + 0.07, z + 0.04, shade(neon, 0.45), 'tower_band', emit=(neon, 0.7))
                if detail > 0.5:
                    _roof(k, xa, xb, r_t - depth, r_t, z + 0.12, rng, wall, neon, 0.3)
                cut = (xb - xa) * rng.uniform(0.1, 0.22)
                xa, xb = xa + cut * rng.uniform(0.4, 1.0), xb - cut * rng.uniform(0.4, 1.0)
        _roof(k, xa, xb, rf - depth, rf - (tiers - 1) * 0.2, z, rng, wall, neon, detail)
        top = z
        crown_x = (xa + xb) / 2
    # holo screens on the face (anchored for js/skyline.js)
    for (fx0, fx1, fz0, fz1) in ads:
        a0, a1 = x0 + w * fx0, x0 + w * fx1
        b0, b1 = h * fz0, h * fz1
        n = len([a for a in k.anchors if a.startswith('ad')]) // 2
        k.box(a0 - 0.08, rf + 0.02, b0 - 0.08, a1 + 0.08, rf + 0.1, b1 + 0.08, '#06040c', 'ad_frame')
        k.box(a0, rf + 0.1, b0, a1, rf + 0.11, b1, '#100830', 'ad_screen', emit=('#2a1460', 0.6))
        k.anchor('ad%d_a' % n, a0, rf + 0.11, b1)
        k.anchor('ad%d_b' % n, a1, rf + 0.11, b0)
    # a brand on the crown in real letters, and a blade of glyphs down the face
    if brand and detail > 0.5 and shape != 'round':
        text, font = brand
        import assets_signs as SG
        size = min(1.1, (w - 0.4) / max(1, len(text)) * 1.25)
        col = rng.choice(NEON)
        k.box(x0 + 0.1, rf + 0.12, top + 0.25, x1 - 0.1, rf + 0.16, top + 0.25 + size + 0.25, '#0a0812', 'brand_board')
        SG.letters(k, text, font, (x0 + x1) / 2, rf + 0.16, top + 0.38, size=size, col=col, energy=0)
    if blade and detail > 0.5:
        import assets_signs as SG
        bx = x1 + 0.12 if rng.random() < 0.5 else x0 - 0.12
        gl = rng.choice(GLYPHS)
        bh = min(h * 0.45, 0.62 * len(gl) + 0.4)
        bh = min(h * 0.5, 0.95 * len(gl) + 0.4)
        SG.blade(k, gl, 'DelaGothicOne', bx, rf, rng.uniform(1.5, max(1.6, h * 0.55 - bh)), bh, col=rng.choice(NEON), w=0.85, stand=0.35)
    # a lift running up the face
    if detail > 0.5 and shape in ('setback', 'slab') and not ads and rng.random() < 0.35:
        lx = rng.uniform(x0 + 0.4, x1 - 0.6)
        k.box(lx, rf + 0.02, 0.0, lx + 0.34, rf + 0.12, top * 0.85, '#1a3040', 'lift_shaft', emit=('#3a7a9a', 0.45))
        lz = rng.uniform(1.0, top * 0.7)
        k.box(lx + 0.03, rf + 0.12, lz, lx + 0.31, rf + 0.16, lz + 0.4, '#2a3a44', 'lift_car', emit=('#a0e0ff', 0.8))
    return top


def street_glow(k, x0, x1, r, z, cols=None, rng=None):
    """The light of the streets far below between the towers: a bar of glow along their feet."""
    rng = rng or k.rng
    cols = cols or ['#ff60b0', '#ffb060', '#60c0ff', '#c070ff']
    x = x0
    while x < x1:
        w = rng.uniform(1.5, 4.0)
        col = rng.choice(cols)
        k.box(x, r, z, x + w, r + 0.1, z + 0.18, shade(col, 0.35), 'street_glow', emit=(col, 0.45))
        x += w + rng.uniform(0.2, 1.0)


def roofscape_rich(k, x0, x1, r0, r1, rng=None, top=0.8):
    """The city under the walkway's railing, seen from above: blocks of roofs at different heights with parapets, tanks,
    vents, roof gardens, skylights and neon roof signs, lit windows down the faces you can see, and between the blocks
    streets of light — lane lines, headlights and tail-lights, the glow of the shops."""
    rng = rng or k.rng
    r = r0
    while r < r1:
        bh = rng.uniform(1.8, 3.0)
        x = x0
        while x < x1:
            bw = rng.uniform(1.6, 3.8)
            h = rng.uniform(top - 1.8, top)
            wall = rng.choice(TOWER_WALLS)
            xa, xb, ra, rb = x + 0.18, x + bw - 0.18, r + 0.18, r + bh - 0.18
            k.box(xa, ra, -4.0, xb, rb, h, (shade(wall, 1.15), 0.08), 'roof_block')
            k.box(xa - 0.04, ra - 0.04, h, xb + 0.04, rb + 0.04, h + 0.1, (shade(wall, 1.5), 0.08), 'roof_parapet')
            k.box(xa + 0.06, ra + 0.06, h, xb - 0.06, rb - 0.06, h + 0.04, (shade(wall, 0.75), 0.12), 'roof_deck')
            if rng.random() < 0.6:                               # the stair's housing, a door lit in it
                hx = rng.uniform(xa + 0.2, max(xa + 0.25, xb - 0.8))
                k.box(hx, ra + 0.15, h + 0.04, hx + 0.55, ra + 0.6, h + 0.5, (shade(wall, 1.2), 0.08), 'roof_housing')
                k.box(hx + 0.18, ra + 0.6, h + 0.06, hx + 0.36, ra + 0.62, h + 0.38, '#2a1a10', 'roof_door', emit=('#ffc070', 0.6))
            if rng.random() < 0.35:                               # solar panels in rows
                px0 = rng.uniform(xa + 0.2, max(xa + 0.25, xb - 1.2))
                k.boxes([(px0 + i * 0.3, ra + 0.8, h + 0.06, px0 + i * 0.3 + 0.24, rb - 0.25, h + 0.12) for i in range(3)],
                        ('#1a2a5a', 0.05), 'roof_solar')
            # windows down the front face: rows lit like flats
            tones = LIGHTS[rng.choice(('warm', 'warm', 'office', 'pink', 'violet'))]
            n = int((xb - xa - 0.2) / 0.3)
            rects = {}
            for i in range(4):
                wz = h - 0.45 - i * 0.42
                for j in range(n):
                    if rng.random() < 0.45:
                        col = rng.choice(tones)
                        rects.setdefault(col, []).append((xa + 0.12 + j * 0.3, rb, wz, xa + 0.3 + j * 0.3, rb + 0.02, wz + 0.22))
            for col, rr in rects.items():
                k.boxes(rr, shade(col, 0.5), 'roof_win', emit=(col, 0.8))
            # what's on the roof
            for _ in range(rng.randint(1, 3)):
                u = rng.random()
                cx, cr = rng.uniform(xa + 0.35, max(xa + 0.4, xb - 0.35)), rng.uniform(ra + 0.35, max(ra + 0.4, rb - 0.35))
                if u < 0.3:
                    k.cyl(cx, cr, h + 0.04, h + 0.45, 0.22, (shade(wall, 2.0), 0.1), 'roof_tank', verts=10)
                    k.cone(cx, cr, h + 0.45, h + 0.58, 0.24, 0.03, shade(wall, 1.5), 'roof_tank_cap', verts=10)
                elif u < 0.5:
                    k.box(cx - 0.3, cr - 0.22, h + 0.04, cx + 0.3, cr + 0.22, h + 0.36, ('#5a5866', 0.08), 'roof_vent')
                    k.cyl(cx, cr, h + 0.36, h + 0.4, 0.16, '#2a2a32', 'roof_fan', verts=10)
                elif u < 0.68:                                   # a roof garden
                    with k.foliage('leaf'):
                        for _g in range(rng.randint(2, 4)):
                            k.blob(cx + rng.uniform(-0.3, 0.3), cr + rng.uniform(-0.2, 0.2), h + 0.16, 0.16, 0.14, 0.12,
                                   (rng.choice(('#2a5a3a', '#3a6a40', '#2a4a3a')), 0.2), 'roof_garden', segs=8)
                    k.box(cx - 0.45, cr - 0.3, h + 0.04, cx + 0.45, cr + 0.3, h + 0.08, '#2a1e18', 'roof_soil')
                elif u < 0.85:
                    col = rng.choice(WIN)
                    k.box(cx - 0.35, cr - 0.25, h + 0.04, cx + 0.35, cr + 0.25, h + 0.08, '#140a20', 'skylight', emit=(col, 0.45))
                else:
                    col = rng.choice(NEON)                       # a neon sign on the roof's edge
                    k.box(cx - 0.5, rb - 0.06, h + 0.1, cx + 0.5, rb - 0.02, h + 0.45, shade(col, 0.4), 'roof_sign', emit=(col, 0.85))
            x += bw
        # the street in front of the block
        sr0, sr1 = r + bh - 0.18, r + bh + 0.5
        k.box(x0, sr0, -4.0, x1, sr1, top - 2.3, '#0a0812', 'road')
        k.box(x0, sr0 + 0.3, top - 2.3, x1, sr0 + 0.33, top - 2.28, '#2a1a10', 'lane', emit=('#ffb060', 0.45))
        cars = []
        for _ in range(int((x1 - x0) / 1.4)):
            cx = rng.uniform(x0, x1)
            lane = rng.random() < 0.5
            cr = sr0 + (0.18 if lane else 0.46)
            cars.append((cx, cr, lane))
        heads = [(cx, cr - 0.03, top - 2.28, cx + 0.14, cr + 0.03, top - 2.25) for cx, cr, lane in cars if lane]
        tails = [(cx, cr - 0.03, top - 2.28, cx + 0.14, cr + 0.03, top - 2.25) for cx, cr, lane in cars if not lane]
        if heads:
            k.boxes(heads, '#fff4e0', 'car_light', emit=('#fff0d0', 0.9))
        if tails:
            k.boxes(tails, '#ff4050', 'car_light', emit=('#ff3040', 0.9))
        street_glow(k, x0, x1, sr0 - 0.05, top - 2.3, rng=rng)
        r += bh + 0.5
