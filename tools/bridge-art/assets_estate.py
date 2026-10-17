"""Ashcombe House and the Starling — the grand Lumar interiors — for scenekit (bpy). Tile units: x = column, r = row
(toward the camera), z = height.

A captain's mansion on Crownhaven's waterfront, lit by candles and firelight: chevron parquet and cabochon marble, rugs
with real borders, guards and medallions, panelled walls under damask paper and deep cornices, tall sash windows with
swagged drapes (their glass a hole onto the live sky: js/estate.js draws it, `scene.windows`), gilt-framed portraits
that are paintings of someone, marble fireplaces with their garniture, crystal chandeliers, a grand staircase with a
runner and a gallery, floor-to-ceiling bookcases and a library ladder, a long table laid for dinner, a four-poster, a
roll-top bath. And the Starling's sun-bleached seaside pieces: rattan, palms in pots, ceiling fans, a cocktail bar, a
white balustrade over the sea.

Light groups the scenes use (see their light_states): 'flicker' (fire and candles), 'lamp' (oil lamps, chandeliers),
'sun' (daylight through the windows) and 'moon' (moonlight through them).
"""
import math

import bmesh
import bpy

from scenekit import S as ROW_S, shade
import assets_lumar as A

C45 = math.cos(math.radians(45))

# ---- the palette (Lumar's warm wood and brass, dressed up) ---------------------------------------------------------
GILT, GILT_L, GILT_D = '#c89a40', '#e8c464', '#7a5a1c'
MAHOG, MAHOG_D = '#5e2c1a', '#3c1a0e'
WALNUT, WALNUT_D = '#4e3220', '#2e1c10'
OAK, OAK_L = '#8a5a30', '#b07a44'
MARBLE_W, MARBLE_G, MARBLE_K = '#ece6dc', '#c4bcb0', '#24202a'
CREAM, IVORY, LINEN = '#e8dcc4', '#efe6d2', '#f4eee2'
VELVET_R, VELVET_G, VELVET_B = '#7a1a24', '#24503a', '#1e2c52'
DAMASK_G, DAMASK_R, DAMASK_B = '#3a5a46', '#6a2a2c', '#34445e'
SILVER = '#c8ccd2'
CANDLE = '#f2ead6'
FLAME, FLAME_HOT = '#ffb050', '#fff0b0'
LEAF = '#3e6a3a'
BOOKS = ['#6a2a2a', '#2a4a3a', '#3a3a6a', '#7a5a2a', '#4a2a4a', '#8a6a4a', '#2a2a2e', '#5a1a1a', '#1e3a4a', '#6a4a1e',
         '#8a3a24', '#3e5a2e']
FLOWERS = {'rose': ('#c8384a', '#e8708a', '#f2c0c8'), 'white': ('#f4f0e6', '#e8e4d8', '#f8e8a0'),
           'blue': ('#5a6ac8', '#8a9ae0', '#c8d0f0'), 'gold': ('#e8b030', '#f0d060', '#e88030'),
           'pink': ('#e890b0', '#f4c0d0', '#d0607a')}


# ---- geometry helpers ----------------------------------------------------------------------------------------------
def _link(k, bm, name, albedo, part, emit=None, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    k.scene.collection.objects.link(o)
    o = k._finish(o, albedo, part, emit)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def clip(poly, x0, r0, x1, r1):
    """A polygon [(x, r)] cut to the rectangle (Sutherland–Hodgman)."""
    def cut(pts, inside, at):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            if inside(b):
                if not inside(a):
                    out.append(at(a, b))
                out.append(b)
            elif inside(a):
                out.append(at(a, b))
        return out

    def on_x(xc):
        return lambda a, b: (xc, a[1] + (b[1] - a[1]) * (xc - a[0]) / (b[0] - a[0]))

    def on_r(rc):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (rc - a[1]) / (b[1] - a[1]), rc)
    p = list(poly)
    for inside, at in ((lambda q: q[0] >= x0, on_x(x0)), (lambda q: q[0] <= x1, on_x(x1)),
                       (lambda q: q[1] >= r0, on_r(r0)), (lambda q: q[1] <= r1, on_r(r1))):
        if len(p) < 3:
            return []
        p = cut(p, inside, at)
    return p if len(p) >= 3 else []


def flats(k, polys, z, albedo, part, emit=None):
    """Many flat polygons [(x, r)] lying at height z, as one part: floor patterns, rug motifs, inlays."""
    polys = [p for p in polys if len(p) >= 3]
    if not polys:
        return None
    bm = bmesh.new()
    for p in polys:
        bm.faces.new([bm.verts.new((x, -r * ROW_S, z)) for (x, r) in p])
    return _link(k, bm, 'flats', albedo, part, emit)


def facing(k, polys, r, albedo, part, emit=None):
    """Many flat polygons [(x, z)] standing at row r, facing the camera, as one part: what's painted on a canvas,
    wallpaper motifs, inlay on a cabinet's front."""
    polys = [p for p in polys if len(p) >= 3]
    if not polys:
        return None
    bm = bmesh.new()
    for p in polys:
        bm.faces.new([bm.verts.new((x, -r * ROW_S, z)) for (x, z) in p])
    return _link(k, bm, 'facing', albedo, part, emit)


def tris(k, items, albedo, part, emit=None, smooth=False):
    """Many triangles (each three (x, r, z) points) as one part: palm leaflets, petals, feathers."""
    bm = bmesh.new()
    for t in items:
        bm.faces.new([bm.verts.new((x, -r * ROW_S, z)) for (x, r, z) in t])
    return _link(k, bm, 'tris', albedo, part, emit, smooth)


def ell(cx, cy, rx, ry, n=16, a0=0.0, a1=2 * math.pi):
    """Points round an ellipse (or an arc of one)."""
    return [(cx + math.cos(a0 + (a1 - a0) * i / n) * rx, cy + math.sin(a0 + (a1 - a0) * i / n) * ry) for i in range(n)]


def star(cx, cy, rx, ry, n, inner=0.55, rot=0.0):
    """An n-pointed star (points alternate between the rim and `inner` of it)."""
    out = []
    for i in range(2 * n):
        a = rot + math.pi * i / n
        f = 1.0 if i % 2 == 0 else inner
        out.append((cx + math.cos(a) * rx * f, cy + math.sin(a) * ry * f))
    return out


def diamond(cx, cy, rx, ry):
    return [(cx, cy - ry), (cx + rx, cy), (cx, cy + ry), (cx - rx, cy)]


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def strip(a, b, w):
    """A thin quad along the segment a-b (2D points), w wide."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    return [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]


def groups(k, items, tones, weights=None):
    """Sorts items into one list per tone by the scene's dice."""
    out = [[] for _ in tones]
    for it in items:
        i = k.rng.choices(range(len(tones)), weights=weights)[0] if weights else k.rng.randrange(len(tones))
        out[i].append(it)
    return out


# ---- floors --------------------------------------------------------------------------------------------------------
def parquet_chevron(k, x0, r0, x1, r1, tones=('#8a5a30', '#7c5028', '#966438', '#845630'), col_w=0.5, slat=0.15,
                    gap=0.014, z=0.0, border=None):
    """Point de Hongrie: columns of slats cut at 45° meeting in chevrons, a dark joint between them. border: a band of
    (width, tone) laid round the edge in long boards first."""
    k.box(x0, r0, z - 0.1, x1, r1, z - 0.003, shade(tones[0], 0.4), 'subfloor')
    fx0, fr0, fx1, fr1 = x0, r0, x1, r1
    if border:
        bw, bt = border
        bands = [rect(x0, r0, x1, r0 + bw), rect(x0, r1 - bw, x1, r1), rect(x0, r0 + bw, x0 + bw, r1 - bw), rect(x1 - bw, r0 + bw, x1, r1 - bw)]
        flats(k, [rect(a[0] + gap, a[1] + gap, c[0] - gap, c[1] - gap) for (a, _, c, _) in bands], z, (bt, 0.06), 'floor')
        fx0, fr0, fx1, fr1 = x0 + bw, r0 + bw, x1 - bw, r1 - bw
    h = slat / C45
    polys = []
    j = 0
    x = fx0
    while x < fx1 - 1e-6:
        s = 1 if j % 2 == 0 else -1
        xa, xb = x + gap / 2, x + col_w - gap / 2
        rise = s * (xb - xa)
        r = fr0 - col_w - h
        while r < fr1 + col_w:
            a, b = r + gap / 2, r + h - gap / 2
            p = clip([(xa, a), (xb, a + rise), (xb, b + rise), (xa, b)], fx0, fr0, fx1, fr1)
            if p:
                polys.append(p)
            r += h
        x += col_w
        j += 1
    for i, g in enumerate(groups(k, polys, tones, (4, 3, 2, 2)[:len(tones)])):
        flats(k, g, z, (tones[i], 0.05), 'floor')


def parquet_planks(k, x0, r0, x1, r1, tones=('#8a5a30', '#7e522c', '#94623a'), plank=0.22, lengths=(1.0, 1.5, 2.0),
                   gap=0.012, z=0.0):
    """Long boards running across the room, joints staggered, a dark line between them."""
    k.box(x0, r0, z - 0.1, x1, r1, z - 0.003, shade(tones[0], 0.4), 'subfloor')
    polys = []
    r = r0
    while r < r1 - 1e-6:
        rb = min(r1, r + plank)
        x = x0 - k.rng.uniform(0, max(lengths))
        while x < x1:
            L = k.rng.choice(lengths)
            a, b = max(x, x0), min(x + L, x1)
            if b - a > 0.1:
                polys.append(rect(a + gap / 2, r + gap / 2, b - gap / 2, rb - gap / 2))
            x += L
        r = rb
    for i, g in enumerate(groups(k, polys, tones)):
        flats(k, g, z, (tones[i], 0.06), 'floor')


def marble_cabochon(k, x0, r0, x1, r1, size=1.0, white=(MARBLE_W, '#e4ddd0'), black=MARBLE_K, border=0.42,
                    inlay=GILT, z=0.0):
    """A great hall's floor: big white octagons with small black diamonds where their corners meet, veined, inside a
    border of black marble with a brass line."""
    k.box(x0, r0, z - 0.1, x1, r1, z - 0.003, '#1a161c', 'subfloor')
    g = 0.012
    if border:
        bands = [rect(x0, r0, x1, r0 + border), rect(x0, r1 - border, x1, r1), rect(x0, r0 + border, x0 + border, r1 - border),
                 rect(x1 - border, r0 + border, x1, r1 - border)]
        flats(k, bands, z, (black, 0.08), 'floor_border')
        line = border * 0.55
        flats(k, [rect(x0 + line, r0 + line, x1 - line, r0 + line + 0.035), rect(x0 + line, r1 - line - 0.035, x1 - line, r1 - line),
                  rect(x0 + line, r0 + line, x0 + line + 0.035, r1 - line), rect(x1 - line - 0.035, r0 + line, x1 - line, r1 - line)],
              z + 0.002, (inlay, 0.05), 'floor_inlay')
        x0, r0, x1, r1 = x0 + border, r0 + border, x1 - border, r1 - border
    nx = max(1, round((x1 - x0) / size))
    nr = max(1, round((r1 - r0) / size))
    sx, sr = (x1 - x0) / nx, (r1 - r0) / nr
    c = min(sx, sr) * 0.2
    octs, dias, veins = [], [], []
    for i in range(nx):
        for j in range(nr):
            xa, ra, xb, rb = x0 + i * sx + g, r0 + j * sr + g, x0 + (i + 1) * sx - g, r0 + (j + 1) * sr - g
            octs.append([(xa + c, ra), (xb - c, ra), (xb, ra + c), (xb, rb - c), (xb - c, rb), (xa + c, rb), (xa, rb - c), (xa, ra + c)])
            for _ in range(k.rng.randint(1, 3)):                 # grey veins wandering across the slab
                px, pr = k.rng.uniform(xa + 0.1, xb - 0.1), k.rng.uniform(ra + 0.1, rb - 0.1)
                a = k.rng.uniform(0, math.pi)
                pts = [(px, pr)]
                for _ in range(k.rng.randint(2, 4)):
                    a += k.rng.uniform(-0.6, 0.6)
                    L = k.rng.uniform(0.12, 0.3)
                    nxp = (min(xb - 0.05, max(xa + 0.05, pts[-1][0] + math.cos(a) * L)), min(rb - 0.05, max(ra + 0.05, pts[-1][1] + math.sin(a) * L)))
                    pts.append(nxp)
                for p, q in zip(pts, pts[1:]):
                    veins.append(strip(p, q, k.rng.uniform(0.012, 0.022)))
    for i in range(nx + 1):
        for j in range(nr + 1):
            dias.append(diamond(x0 + i * sx, r0 + j * sr, c - g * 0.5, c - g * 0.5))
    dias = [p for p in (clip(d, x0, r0, x1, r1) for d in dias) if p]
    for i, gr in enumerate(groups(k, octs, white)):
        flats(k, gr, z, (white[i], 0.04), 'floor')
    flats(k, veins, z + 0.001, ('#b8b0a6', 0.0), 'floor')
    flats(k, dias, z, (black, 0.06), 'floor_dot')
    flats(k, [diamond(x0 + i * sx, r0 + j * sr, c * 0.35, c * 0.35) for i in range(1, nx) for j in range(1, nr)], z + 0.002, (inlay, 0.0), 'floor_inlay')


def tiles_hex(k, x0, r0, x1, r1, size=0.13, tones=('#efebe2', '#e6e1d6'), dark='#2a2a30', z=0.0, rosettes=True):
    """Small hexagonal mosaic (a bathroom): white, with dark rosettes scattered through it."""
    k.box(x0, r0, z - 0.06, x1, r1, z - 0.002, '#9a968e', 'subfloor')
    w = size * math.sqrt(3)
    hexes, darks = [], []
    j = 0
    r = r0
    while r < r1 + size:
        x = x0 + (w / 2 if j % 2 else 0)
        i = 0
        while x < x1 + w:
            p = clip([(x + math.cos(math.pi / 6 + math.pi / 3 * q) * (size - 0.012), r + math.sin(math.pi / 6 + math.pi / 3 * q) * (size - 0.012)) for q in range(6)], x0, r0, x1, r1)
            if p:
                (darks if rosettes and (j % 4 == 1 and i % 4 == (j // 4) % 2 * 2) else hexes).append(p)
            x += w
            i += 1
        r += size * 1.5
        j += 1
    for i, g in enumerate(groups(k, hexes, tones)):
        flats(k, g, z, (tones[i], 0.0), 'floor')
    flats(k, darks, z, (dark, 0.0), 'floor_dot')


def flagstones(k, x0, r0, x1, r1, tones=('#d8d0c0', '#cfc6b4', '#e0d8c8', '#c4baa6'), z=0.0, grout='#8a8274'):
    """Pale limestone flags in courses of mixed widths: a terrace."""
    k.box(x0, r0, z - 0.12, x1, r1, z - 0.003, grout, 'subfloor')
    polys = []
    r = r0
    while r < r1 - 1e-6:
        h = min(r1 - r, k.rng.choice([0.5, 0.75, 1.0]))
        x = x0
        while x < x1 - 1e-6:
            w = min(x1 - x, k.rng.choice([0.5, 0.75, 1.0, 1.25]))
            polys.append(rect(x + 0.02, r + 0.02, x + w - 0.02, r + h - 0.02))
            x += w
        r += h
    for i, g in enumerate(groups(k, polys, tones)):
        flats(k, g, z, (tones[i], 0.1), 'terrace')


# ---- rugs ----------------------------------------------------------------------------------------------------------
def persian_rug(k, x0, r0, x1, r1, field='#7a1e22', border='#1e2a4a', accent='#d8b060', ivory='#e8dcc0', dark=None,
                z=0.0, bw=None, medallion=True, fringe=True, lattice=True):
    """A knotted rug with a real design: guard stripes, a border band of rosettes and vine, a field of small motifs, a
    star medallion with pendants along its long axis, corner spandrels, a fringe on the short ends."""
    dark = dark or shade(field, 0.62)
    W, D = x1 - x0, r1 - r0
    bw = bw or min(0.42, 0.13 * min(W, D) + 0.12)
    k.box(x0, r0, z, x1, r1, z + 0.012, (shade(field, 0.7), 0.08), 'rug')
    zz = [z + 0.0125]
    lay = {}

    def add(col, p):
        lay.setdefault(col, []).append(p)

    def ground(col, p):                                 # the big shapes, each laid over the last
        flats(k, [p], zz[0], (col, 0.07), 'rug')
        zz[0] += 0.0008
    g1 = 0.05
    ground(ivory, rect(x0 + 0.02, r0 + 0.02, x1 - 0.02, r1 - 0.02))                      # the outer guard
    ground(border, rect(x0 + g1, r0 + g1, x1 - g1, r1 - g1))
    ground(accent, rect(x0 + bw - 0.06, r0 + bw - 0.06, x1 - bw + 0.06, r1 - bw + 0.06))  # the inner guard
    ground(field, rect(x0 + bw - 0.03, r0 + bw - 0.03, x1 - bw + 0.03, r1 - bw + 0.03))
    # the border band: rosettes with a dot, linked by little lozenges, round all four sides
    mid = (g1 + bw - 0.06) / 2
    hb = (bw - 0.06 - g1) / 2 * 0.8
    for (ax, ar, bx, br) in ((x0 + mid, r0 + mid, x1 - mid, r0 + mid), (x0 + mid, r1 - mid, x1 - mid, r1 - mid),
                             (x0 + mid, r0 + mid, x0 + mid, r1 - mid), (x1 - mid, r0 + mid, x1 - mid, r1 - mid)):
        L = math.hypot(bx - ax, br - ar)
        n = max(2, int(L / (hb * 2.6)))
        for i in range(n + 1):
            px, pr = ax + (bx - ax) * i / n, ar + (br - ar) * i / n
            add(accent, star(px, pr, hb, hb, 8, 0.6, rot=math.pi / 8))
            add(field, diamond(px, pr, hb * 0.35, hb * 0.35))
            if i < n:
                qx, qr = px + (bx - ax) / n / 2, pr + (br - ar) / n / 2
                add(ivory, diamond(qx, qr, hb * 0.38, hb * 0.38))
    # the field: a lattice of small motifs, two colours in turn, kept off the medallion
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    mx, mr = W * 0.24, D * 0.24
    if lattice:
        fx0, fr0, fx1, fr1 = x0 + bw + 0.08, r0 + bw + 0.08, x1 - bw - 0.08, r1 - bw - 0.08
        step = 0.28
        j = 0
        rr = fr0 + 0.06
        while rr < fr1:
            xx = fx0 + 0.06 + (step / 2 if j % 2 else 0)
            while xx < fx1:
                if not medallion or ((xx - cx) / (mx * 1.25)) ** 2 + ((rr - cr) / (mr * 1.25)) ** 2 > 1:
                    add(dark if (j % 2) else ivory, diamond(xx, rr, 0.045, 0.045))
                    if j % 2 == 0:
                        add(accent, diamond(xx, rr, 0.016, 0.016))
                xx += step
            rr += step * 0.6
            j += 1
    for col, ps in lay.items():                          # the border's and field's motifs
        flats(k, ps, zz[0], (col, 0.05), 'rug')
        zz[0] += 0.0008
    lay = {}
    if medallion:
        ground(ivory, star(cx, cr, mx, mr, 16, 0.86))
        ground(border, star(cx, cr, mx * 0.88, mr * 0.88, 16, 0.84))
        ground(accent, star(cx, cr, mx * 0.62, mr * 0.62, 8, 0.7, rot=math.pi / 8))
        ground(field, star(cx, cr, mx * 0.5, mr * 0.5, 8, 0.72, rot=math.pi / 8))
        ground(ivory, diamond(cx, cr, mx * 0.22, mr * 0.22))
        ground(dark, diamond(cx, cr, mx * 0.1, mr * 0.1))
        long_x = W >= D
        for s in (-1, 1):                                   # pendants along the long axis
            if long_x:
                px = cx + s * (mx + 0.16)
                add(border, diamond(px, cr, 0.16, 0.12))
                add(accent, diamond(px, cr, 0.08, 0.06))
            else:
                pr = cr + s * (mr + 0.16)
                add(border, diamond(cx, pr, 0.12, 0.16))
                add(accent, diamond(cx, pr, 0.06, 0.08))
        for (sx, sr) in ((1, 1), (-1, 1), (1, -1), (-1, -1)):   # spandrels: a quarter of the medallion's star in each corner
            ox, orr = (x0 + bw - 0.03 if sx > 0 else x1 - bw + 0.03), (r0 + bw - 0.03 if sr > 0 else r1 - bw + 0.03)

            def quarter(rx, ry, inner):
                pts = [(ox, orr)]
                for i in range(9):
                    a = math.pi / 2 * i / 8
                    f = 1.0 if i % 2 == 0 else inner
                    pts.append((ox + sx * math.cos(a) * rx * f, orr + sr * math.sin(a) * ry * f))
                return pts
            q = min(W, D) * 0.2
            add(ivory, quarter(q, q, 0.8))
            add(border, quarter(q * 0.88, q * 0.88, 0.78))
            add(accent, quarter(q * 0.52, q * 0.52, 0.7))
            add(dark, quarter(q * 0.26, q * 0.26, 0.7))
            for a in (math.pi / 8, 3 * math.pi / 8):
                add(ivory, diamond(ox + sx * math.cos(a) * q * 0.7, orr + sr * math.sin(a) * q * 0.7, 0.03, 0.03))
        for col, ps in lay.items():
            flats(k, ps, zz[0], (col, 0.05), 'rug')
            zz[0] += 0.0008
    if fringe:
        long_x = W >= D
        fr = []
        n = int((D if long_x else W) / 0.07)
        for i in range(n):
            t0 = 0.05 + i * 0.07
            if long_x:
                fr += [rect(x0 - 0.09, r0 + t0, x0, r0 + t0 + 0.03), rect(x1, r0 + t0, x1 + 0.09, r0 + t0 + 0.03)]
            else:
                fr += [rect(x0 + t0, r0 - 0.09, x0 + t0 + 0.03, r0), rect(x0 + t0, r1, x0 + t0 + 0.03, r1 + 0.09)]
        flats(k, fr, z + 0.004, ('#e4d8bc', 0.0), 'rug_fringe')


def runner_carpet(k, x0, r0, x1, r1, col=VELVET_R, trim=GILT, z=0.0, motif=True):
    """A long runner: a border stripe each side and a repeat of small medallions down its length."""
    k.box(x0, r0, z, x1, r1, z + 0.012, (col, 0.08), 'runner')
    vert = (r1 - r0) > (x1 - x0)
    if vert:
        flats(k, [rect(x0 + 0.05, r0, x0 + 0.09, r1), rect(x1 - 0.09, r0, x1 - 0.05, r1)], z + 0.0125, (trim, 0.0), 'runner')
    else:
        flats(k, [rect(x0, r0 + 0.05, x1, r0 + 0.09), rect(x0, r1 - 0.09, x1, r1 - 0.05)], z + 0.0125, (trim, 0.0), 'runner')
    if motif:
        cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
        L = (r1 - r0) if vert else (x1 - x0)
        n = max(1, int(L / 0.7))
        ms, md = [], []
        for i in range(n):
            t = (i + 0.5) / n
            px, pr = (cx, r0 + (r1 - r0) * t) if vert else (x0 + (x1 - x0) * t, cr)
            ms.append(diamond(px, pr, 0.14, 0.14))
            md.append(diamond(px, pr, 0.06, 0.06))
        flats(k, ms, z + 0.0125, (trim, 0.0), 'runner')
        flats(k, md, z + 0.0133, (shade(col, 0.65), 0.0), 'runner')


# ---- walls ---------------------------------------------------------------------------------------------------------
def panelled_wall(k, x0, x1, r_face, H, paper=DAMASK_G, wood=CREAM, dado=0.95, pattern='damask', skip=(), doors=(),
                  thickness=0.5, frieze=None, rail=GILT, cornice_col=None):
    """A grand room's back wall: a skirting board, a dado of raised panels under a moulded rail, wallpaper (damask
    lozenges or stripes) up to a picture rail, a plain frieze, a deep cornice with dentils. skip: (xa, xb) stretches
    where the paper and dado aren't put (behind a chimney breast or a bookcase). doors: (xa, xb, top) openings, dark
    and lamplit beyond."""
    cornice_col = cornice_col or shade(wood, 1.04)
    frieze = frieze or shade(wood, 0.96)

    def free(a, b):
        """[a, b] less the skips and doors, as runs."""
        cuts = sorted([(s, e) for (s, e) in skip] + [(d[0], d[1]) for d in doors])
        runs, x = [], a
        for (s, e) in cuts:
            if e <= x or s >= b:
                continue
            if s > x:
                runs.append((x, s))
            x = max(x, e)
        if x < b:
            runs.append((x, b))
        return runs
    # the wall itself, round any doorways
    xs = x0
    for (da, db, top) in sorted(doors):
        if da > xs:
            k.box(xs, r_face - thickness, 0, da, r_face, H, (paper, 0.06), 'wall')
        k.box(da, r_face - thickness, top, db, r_face, H, (paper, 0.06), 'wall')
        k.box(da, r_face - thickness, 0, db, r_face - thickness + 0.06, top, '#140c08', 'doorway', emit=('#ffb060', 0.06))
        xs = db
    if xs < x1:
        k.box(xs, r_face - thickness, 0, x1, r_face, H, (paper, 0.06), 'wall')
    k.box(x0, r_face - thickness, H, x1, r_face + 0.02, H + 0.05, shade(wood, 0.7), 'wall_cap')
    fz0, fz1 = dado + 0.08, H - 0.62
    for (a, b) in free(x0, x1):
        # skirting and dado
        k.box(a, r_face, 0.0, b, r_face + 0.05, 0.16, (shade(wood, 0.82), 0.05), 'skirting')
        k.box(a, r_face, 0.16, b, r_face + 0.02, dado, (wood, 0.05), 'dado')
        n = max(1, int(round((b - a) / 0.85)))
        pw = (b - a) / n
        rails, fields = [], []
        for i in range(n):
            pa, pb = a + i * pw + 0.1, a + (i + 1) * pw - 0.1
            if pb - pa < 0.15:
                continue
            za, zb = 0.28, dado - 0.12
            rails += [(pa, r_face + 0.02, za, pb, r_face + 0.045, za + 0.035), (pa, r_face + 0.02, zb - 0.035, pb, r_face + 0.045, zb),
                      (pa, r_face + 0.02, za, pa + 0.035, r_face + 0.045, zb), (pb - 0.035, r_face + 0.02, za, pb, r_face + 0.045, zb)]
            fields.append((pa + 0.07, r_face + 0.02, za + 0.07, pb - 0.07, r_face + 0.035, zb - 0.07))
        if rails:
            k.boxes(rails, shade(wood, 1.1), 'dado_moulding')
            k.boxes(fields, shade(wood, 0.95), 'dado')
        k.box(a, r_face, dado, b, r_face + 0.07, dado + 0.07, (shade(wood, 1.08), 0.04), 'dado_rail')
        if rail:
            k.box(a, r_face + 0.07, dado + 0.025, b, r_face + 0.075, dado + 0.045, rail, 'dado_gilt')
        # the paper's pattern, just proud of the wall
        if pattern == 'damask':
            mot, dots = [], []
            sx, sz = 0.36, 0.42
            j = 0
            zz = fz0 + 0.22
            while zz < fz1 - 0.12:
                xx = a + 0.18 + (sx / 2 if j % 2 else 0)
                while xx < b - 0.1:
                    mot.append(diamond(xx, zz, 0.075, 0.12))
                    for (dx, dz) in ((0.13, 0), (-0.13, 0), (0, 0.18), (0, -0.18)):
                        if a + 0.04 < xx + dx < b - 0.04:
                            dots.append(diamond(xx + dx, zz + dz, 0.022, 0.03))
                    xx += sx
                zz += sz / 2
                j += 1
            facing(k, mot, r_face + 0.004, (shade(paper, 1.22), 0.05), 'wall')
            facing(k, dots, r_face + 0.004, (shade(paper, 1.12), 0.0), 'wall')
        elif pattern == 'stripe':
            st = []
            xx = a + 0.05
            while xx < b - 0.05:
                st.append(rect(xx, fz0, min(b, xx + 0.1), fz1))
                xx += 0.3
            facing(k, st, r_face + 0.004, (shade(paper, 1.18), 0.04), 'wall')
            fine = []
            xx = a + 0.2
            while xx < b - 0.05:
                fine.append(rect(xx, fz0, min(b, xx + 0.02), fz1))
                xx += 0.3
            facing(k, fine, r_face + 0.004, (shade(paper, 0.82), 0.0), 'wall')
        # picture rail, frieze, cornice with dentils
        k.box(a, r_face, fz1, b, r_face + 0.05, fz1 + 0.05, shade(wood, 0.9), 'picture_rail')
        k.box(a, r_face, fz1 + 0.05, b, r_face + 0.015, H - 0.2, (frieze, 0.04), 'frieze')
        k.box(a, r_face, H - 0.2, b, r_face + 0.06, H - 0.14, cornice_col, 'cornice')
        k.box(a, r_face, H - 0.14, b, r_face + 0.12, H - 0.06, (shade(cornice_col, 1.05), 0.03), 'cornice')
        k.box(a, r_face, H - 0.06, b, r_face + 0.18, H + 0.02, (shade(cornice_col, 1.1), 0.03), 'cornice')
        dent = []
        xx = a + 0.04
        while xx < b - 0.05:
            dent.append((xx, r_face + 0.06, H - 0.2, xx + 0.05, r_face + 0.1, H - 0.14))
            xx += 0.1
        k.boxes(dent, shade(cornice_col, 1.12), 'cornice')
        if rail:
            k.box(a, r_face + 0.12, H - 0.1, b, r_face + 0.125, H - 0.08, rail, 'cornice_gilt')


def side_wall(k, x0, x1, r0, r1, H, paper=DAMASK_G, wood=CREAM, openings=()):
    """A side wall (seen edge on): its top, a cap and the cut end toward the camera. openings: (ra, rb) doorways
    through it, framed by an architrave's top."""
    rs = r0
    for (ra, rb) in sorted(openings):
        if ra > rs:
            k.box(x0, rs, 0, x1, ra, H, (paper, 0.06), 'side_wall')
            k.box(x0 - 0.02, rs, H, x1 + 0.02, ra, H + 0.05, shade(wood, 0.7), 'wall_cap')
        k.box(x0, ra, 2.3, x1, rb, H, (paper, 0.06), 'side_wall')                       # over the doorway
        k.box(x0 - 0.06, ra - 0.1, 0, x1 + 0.06, ra, 2.4, (shade(wood, 0.9), 0.04), 'architrave')
        k.box(x0 - 0.06, rb, 0, x1 + 0.06, rb + 0.1, 2.4, (shade(wood, 0.9), 0.04), 'architrave')
        k.box(x0 - 0.08, ra - 0.12, 2.3, x1 + 0.08, rb + 0.12, 2.45, (shade(wood, 1.0), 0.04), 'architrave')
        k.box(x0 - 0.02, ra, H, x1 + 0.02, rb, H + 0.05, shade(wood, 0.7), 'wall_cap')
        rs = rb
    if rs < r1:
        k.box(x0, rs, 0, x1, r1, H, (paper, 0.06), 'side_wall')
        k.box(x0 - 0.02, rs, H, x1 + 0.02, r1, H + 0.05, shade(wood, 0.7), 'wall_cap')
    k.box(x0 - 0.02, r1, 0, x1 + 0.02, r1 + 0.03, H + 0.05, '#120c0a', 'wall_cut')


def front_wall(k, x0, x1, r0, door=None, height=0.42, wood=CREAM, stone=None):
    """The low cut-away front wall, panelled on its top, with a doorway and its threshold."""
    segs = [(x0, door[0]), (door[1], x1)] if door else [(x0, x1)]
    for (a, b) in segs:
        if b - a < 0.01:
            continue
        k.box(a, r0, 0, b, r0 + 0.55, height, (stone or shade(wood, 0.75), 0.06), 'front_wall')
        k.box(a - 0.02, r0 - 0.02, height, b + 0.02, r0 + 0.57, height + 0.06, (shade(wood, 0.95), 0.04), 'wall_cap')
    if door:
        k.box(door[0], r0, -0.01, door[1], r0 + 0.55, 0.02, (MARBLE_W, 0.06), 'threshold')


def doorway(k, xa, xb, r_face, top=2.4, wood=CREAM, glow='#ffb060', pediment=True, double=None):
    """A grand doorway in a back wall (left open in panelled_wall's `doors`): an architrave round it, a pediment over
    it, the doors folded back into the reveal, warm light from the room beyond. double: a door leaf colour to show
    the two leaves standing open."""
    k.box(xa - 0.14, r_face, 0, xa, r_face + 0.08, top + 0.14, (shade(wood, 1.02), 0.04), 'architrave')
    k.box(xb, r_face, 0, xb + 0.14, r_face + 0.08, top + 0.14, (shade(wood, 1.02), 0.04), 'architrave')
    k.box(xa - 0.14, r_face, top, xb + 0.14, r_face + 0.08, top + 0.14, (shade(wood, 1.02), 0.04), 'architrave')
    if pediment:
        k.box(xa - 0.24, r_face, top + 0.14, xb + 0.24, r_face + 0.16, top + 0.24, (shade(wood, 1.08), 0.04), 'pediment')
        cx = (xa + xb) / 2
        facing(k, [[(xa - 0.2, top + 0.24), (xb + 0.2, top + 0.24), (cx, top + 0.56)]], r_face + 0.1, (shade(wood, 1.05), 0.03), 'pediment')
        k.sphere(cx, r_face + 0.12, top + 0.36, 0.06, 0.06, GILT, 'pediment_gilt', segs=10)
    if double:
        for (a, b) in ((xa, xa + 0.12), (xb - 0.12, xb)):
            k.box(a, r_face - 0.45, 0, b, r_face - 0.02, top - 0.02, (double, 0.06), 'door_leaf')
    k.box(xa, r_face - 0.48, 0, xb, r_face - 0.4, top, '#1a100a', 'doorway_back', emit=(glow, 0.1))
    k.box(xa - 0.02, r_face - 0.5, -0.03, xb + 0.02, r_face + 0.01, 0.004, (MARBLE_W, 0.06), 'threshold')
    k.point_light((xa + xb) / 2, r_face - 0.2, 1.2, glow, 10, radius=0.3, group='lamp')


def sash_window(k, cx, r_face, w=1.1, z0=0.9, z1=3.0, frame=IVORY, sill=True, head=True, shutters=None):
    """A tall sash window: holdout glass (js/estate.js paints the live sky through it), glazing bars six over six, a
    moulded architrave with a cornice over it, a sill. shutters: a colour for panelled shutters folded into the
    reveals. Returns its glass as a screen rect [x0, y0, x1, y1] for `scene.windows`."""
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0 - 0.06, r_face - 0.3, z0 - 0.04, x1 + 0.06, r_face + 0.01, z1 + 0.04, '#1e1a16', 'window_reveal')
    k.box(x0, r_face + 0.005, z0, x1, r_face + 0.02, z1, 'HOLDOUT', 'window_glass')
    bars = []
    zm = (z0 + z1) / 2
    for zz in (z0 + (zm - z0) / 2, zm + (z1 - zm) / 2):
        bars.append((x0, r_face + 0.02, zz - 0.012, x1, r_face + 0.045, zz + 0.012))
    for xx in (x0 + w / 3, x0 + 2 * w / 3):
        bars.append((xx - 0.012, r_face + 0.02, z0, xx + 0.012, r_face + 0.045, z1))
    k.boxes(bars, frame, 'window_bar')
    k.box(x0, r_face + 0.02, zm - 0.035, x1, r_face + 0.06, zm + 0.035, frame, 'window_sash')           # the meeting rail
    for (a, b, c, d) in ((x0 - 0.05, z0 - 0.05, x0, z1 + 0.05), (x1, z0 - 0.05, x1 + 0.05, z1 + 0.05),
                         (x0, z0 - 0.05, x1, z0), (x0, z1, x1, z1 + 0.05)):
        k.box(a, r_face + 0.02, b, c, r_face + 0.06, d, frame, 'window_sash')
    k.box(x0 - 0.16, r_face, z0 - 0.08, x0 - 0.05, r_face + 0.09, z1 + 0.1, (shade(frame, 0.96), 0.03), 'architrave')
    k.box(x1 + 0.05, r_face, z0 - 0.08, x1 + 0.16, r_face + 0.09, z1 + 0.1, (shade(frame, 0.96), 0.03), 'architrave')
    if head:
        k.box(x0 - 0.2, r_face, z1 + 0.1, x1 + 0.2, r_face + 0.12, z1 + 0.2, (shade(frame, 1.02), 0.03), 'window_head')
        k.box(x0 - 0.26, r_face, z1 + 0.2, x1 + 0.26, r_face + 0.17, z1 + 0.26, (shade(frame, 1.06), 0.03), 'window_head')
        k.sphere(cx, r_face + 0.1, z1 + 0.14, 0.05, 0.04, GILT, 'window_gilt', segs=8)
    if sill:
        k.box(x0 - 0.22, r_face, z0 - 0.14, x1 + 0.22, r_face + 0.2, z0 - 0.06, (shade(frame, 1.04), 0.03), 'window_sill')
        k.box(x0 - 0.1, r_face, z0 - 0.3, x1 + 0.1, r_face + 0.06, z0 - 0.14, (shade(frame, 0.92), 0.03), 'window_apron')
    if shutters:
        for s in (-1, 1):
            xa = x0 - 0.05 if s < 0 else x1 + 0.05
            k.box(min(xa, xa + s * 0.06), r_face - 0.3, z0, max(xa, xa + s * 0.06), r_face - 0.02, z1, (shutters, 0.05), 'shutter')
    return [round(x0, 3), round(r_face - z1 * C45, 3), round(x1, 3), round(r_face - z0 * C45, 3)]


def window_light(k, cx, r_face, z, w, sun=55.0, moon=14.0):
    """Daylight and moonlight falling in through a window (light groups 'sun' and 'moon')."""
    rot = (math.radians(-62), 0, 0)
    k.area_light(cx, r_face + 0.35, z, '#fff2dc', sun, w + 0.5, rot=rot, group='sun')
    k.area_light(cx, r_face + 0.35, z, '#8aa0d8', moon, w + 0.5, rot=rot, group='moon')


def drapes(k, cx, r_face, w, z_top, col=VELVET_R, lining=IVORY, trim=GILT, tie=1.15, floor=0.0, swag=True, folds=4):
    """Curtains for a tall window: a shaped pelmet with a gilt edge, a swag of the same cloth, and a curtain each side
    hanging in folds, caught back by a tasselled rope and pooling on the floor."""
    ro = r_face + 0.05
    hw = w / 2
    k.box(cx - hw - 0.42, r_face, z_top, cx + hw + 0.42, r_face + 0.24, z_top + 0.26, (col, 0.08), 'pelmet')
    k.box(cx - hw - 0.44, r_face + 0.24, z_top + 0.2, cx + hw + 0.44, r_face + 0.26, z_top + 0.27, trim, 'pelmet_trim')
    k.box(cx - hw - 0.44, r_face + 0.24, z_top - 0.01, cx + hw + 0.44, r_face + 0.26, z_top + 0.03, trim, 'pelmet_trim')
    if swag:
        n = 14
        rings = []
        for i in range(n + 1):
            t = i / n
            x = cx - hw - 0.3 + (w + 0.6) * t
            sag = 0.34 * math.sin(math.pi * t) + 0.04
            rings.append([(x, r_face + 0.2, z_top + 0.02), (x, r_face + 0.29, z_top - sag * 0.45), (x, r_face + 0.27, z_top - sag),
                          (x, r_face + 0.2, z_top - sag - 0.05)])
        k.loft(rings, (col, 0.06), 'swag')
        rings = []
        for i in range(n + 1):
            t = i / n
            x = cx - hw - 0.25 + (w + 0.5) * t
            sag = 0.22 * math.sin(math.pi * t) + 0.03
            rings.append([(x, r_face + 0.27, z_top + 0.0), (x, r_face + 0.32, z_top - sag * 0.5), (x, r_face + 0.3, z_top - sag)])
        k.loft(rings, (shade(col, 1.12), 0.06), 'swag')
        for s in (-1, 1):                                    # jabots: the cloth falling at the swag's ends
            k.cone(cx + s * (hw + 0.3), r_face + 0.24, z_top - 0.6, z_top, 0.05, 0.12, (shade(col, 0.95), 0.06), 'swag', verts=8)
    for s in (-1, 1):
        x_out = cx + s * (hw + 0.38)                          # the outer edge, by the architrave
        rings = []
        levels = [(z_top, 0.42), (z_top - 0.4, 0.38), (tie + 0.25, 0.22), (tie, 0.13), (tie - 0.3, 0.2), (0.35, 0.32),
                  (floor + 0.02, 0.4)]
        m = 13
        for (z, width) in levels:
            ring = []
            for i in range(m):
                t = i / (m - 1)
                x = x_out - s * (width * t)
                rr = ro + 0.06 + 0.05 * math.sin(t * folds * 2 * math.pi) + (0.06 if z < 0.3 else 0.0) * (1 - t)
                ring.append((x, rr, z))
            rings.append(ring)
        k.loft(rings, (col, 0.07), 'curtain')
        k.loft([[(x_out - s * 0.42, ro + 0.02, z_top), (x_out - s * 0.42, ro + 0.04, z_top - 0.4)],
                [(x_out - s * 0.22, ro + 0.1, tie + 0.25), (x_out - s * 0.22, ro + 0.1, tie + 0.25)]], (lining, 0.05), 'curtain_lining')
        tx = x_out - s * 0.12
        k.tube((tx - 0.12, ro + 0.18, tie + 0.04), (tx + 0.12, ro + 0.18, tie - 0.02), 0.022, trim, 'tieback', verts=6)
        k.sphere(tx + s * 0.1, ro + 0.2, tie - 0.06, 0.035, 0.035, trim, 'tassel', segs=8)
        k.cone(tx + s * 0.1, ro + 0.2, tie - 0.3, tie - 0.08, 0.05, 0.02, trim, 'tassel', verts=8)
    k.cyl_x(cx - hw - 0.5, cx + hw + 0.5, r_face + 0.12, z_top + 0.3, 0.025, 0.025, trim, 'curtain_pole', verts=8)
    for s in (-1, 1):
        k.sphere(cx + s * (hw + 0.54), r_face + 0.12, z_top + 0.3, 0.05, 0.05, trim, 'curtain_finial', segs=8)


# ---- frames and what's in them --------------------------------------------------------------------------------------
def gilt_frame(k, x0, x1, r_face, z0, z1, depth=0.07, col=GILT, b=0.08, ornate=True):
    """A carved gilt frame: an outer moulding, a darker sight edge, corner rosettes and a cartouche on top. Returns the
    canvas's row (just in front of the wall)."""
    k.boxes([(x0 - b, r_face, z0 - b, x1 + b, r_face + depth, z0), (x0 - b, r_face, z1, x1 + b, r_face + depth, z1 + b),
             (x0 - b, r_face, z0, x0, r_face + depth, z1), (x1, r_face, z0, x1 + b, r_face + depth, z1)], col, 'frame')
    k.boxes([(x0 - 0.02, r_face, z0 - 0.02, x1 + 0.02, r_face + depth - 0.02, z0), (x0 - 0.02, r_face, z1, x1 + 0.02, r_face + depth - 0.02, z1 + 0.02),
             (x0 - 0.02, r_face, z0, x0, r_face + depth - 0.02, z1), (x1, r_face, z0, x1 + 0.02, r_face + depth - 0.02, z1)], GILT_D, 'frame_sight')
    if ornate:
        for (x, z) in ((x0 - b / 2, z0 - b / 2), (x1 + b / 2, z0 - b / 2), (x0 - b / 2, z1 + b / 2), (x1 + b / 2, z1 + b / 2)):
            k.sphere(x, r_face + depth, z, 0.05, 0.05, GILT_L, 'frame_rose', segs=8)
        cx = (x0 + x1) / 2
        k.sphere(cx, r_face + depth, z1 + b + 0.03, 0.09, 0.06, GILT_L, 'frame_rose', ry=0.03, segs=10)
        k.sphere(cx, r_face + depth + 0.01, z1 + b + 0.1, 0.04, 0.04, GILT_L, 'frame_rose', segs=8)
    k.box(x0, r_face, z0, x1, r_face + 0.02, z1, '#1a1612', 'canvas_back')
    return r_face + 0.021


def _canvas_ground(k, x0, x1, r, z0, z1, bands):
    """A painted ground: horizontal bands of colour from the bottom up (bands: [(fraction, colour)])."""
    zs = z0
    for i, (f, col) in enumerate(bands):
        ze = z1 if i == len(bands) - 1 else z0 + (z1 - z0) * f
        facing(k, [rect(x0, zs, x1, ze)], r, (col, 0.12), 'canvas')
        zs = ze


def portrait(k, cx, r_face, z0, w=0.85, h=1.15, sitter='admiral', coat='#1e2c4a', skin='#d8a888', hair='#e8e4dc',
             bg=('#2a2618', '#3a3420', '#262214'), drape='#6a1a1e', frame=GILT):
    """An oil portrait in a gilt frame — a painting of someone, not a brown board: the sitter half-length against a
    dark ground and a red curtain, their coat, collar and face, epaulettes and a medal for an admiral, pearls and a
    low neckline for a lady, a ship on the horizon behind a captain."""
    x0, x1, z1 = cx - w / 2, cx + w / 2, z0 + h
    r = gilt_frame(k, x0, x1, r_face, z0, z1, col=frame)
    _canvas_ground(k, x0, x1, r, z0, z1, [(0.35, bg[2]), (0.7, bg[0]), (1.0, bg[1])])
    r1, r2, r3, r4 = r + 0.003, r + 0.006, r + 0.009, r + 0.012
    facing(k, [[(x1, z1), (x1 - w * 0.28, z1), (x1 - w * 0.16, z0 + h * 0.55), (x1 - w * 0.22, z0), (x1, z0)]], r1, (drape, 0.15), 'canvas')
    facing(k, [[(x1 - w * 0.28, z1), (x1 - w * 0.24, z1), (x1 - w * 0.13, z0 + h * 0.56), (x1 - w * 0.16, z0 + h * 0.55)]], r2, (shade(drape, 1.4), 0.1), 'canvas')
    if sitter == 'captain':                                  # the sea and a ship behind the sitter
        facing(k, [rect(x0, z0 + h * 0.3, x0 + w * 0.42, z0 + h * 0.42)], r1, ('#3a5a6a', 0.1), 'canvas')
        facing(k, [[(x0 + w * 0.08, z0 + h * 0.43), (x0 + w * 0.2, z0 + h * 0.43), (x0 + w * 0.18, z0 + h * 0.46), (x0 + w * 0.1, z0 + h * 0.46)],
                   rect(x0 + w * 0.135, z0 + h * 0.46, x0 + w * 0.145, z0 + h * 0.6)], r2, '#2a1e14', 'canvas')
        facing(k, [[(x0 + w * 0.12, z0 + h * 0.48), (x0 + w * 0.135, z0 + h * 0.58), (x0 + w * 0.135, z0 + h * 0.48)],
                   [(x0 + w * 0.145, z0 + h * 0.48), (x0 + w * 0.145, z0 + h * 0.57), (x0 + w * 0.17, z0 + h * 0.48)]], r3, '#d8ccb0', 'canvas')
    # the body: shoulders and arms, a coat, the collar and the face
    sh = z0 + h * 0.52
    body = [(cx - w * 0.36, z0), (cx - w * 0.36, sh - h * 0.12), (cx - w * 0.28, sh), (cx - w * 0.1, sh + h * 0.04),
            (cx + w * 0.1, sh + h * 0.04), (cx + w * 0.28, sh), (cx + w * 0.36, sh - h * 0.12), (cx + w * 0.36, z0)]
    facing(k, [body], r2, (coat, 0.12), 'canvas')
    if sitter == 'lady':
        facing(k, [[(cx - w * 0.16, sh + h * 0.02), (cx + w * 0.16, sh + h * 0.02), (cx + w * 0.08, sh - h * 0.12), (cx - w * 0.08, sh - h * 0.12)]], r3, (skin, 0.06), 'canvas')
        facing(k, [diamond(cx + i * w * 0.04, sh - h * 0.02 - abs(i) * h * 0.012, 0.012, 0.012) for i in range(-3, 4)], r4, '#f4f0e8', 'canvas')
        facing(k, [ell(cx, sh + h * 0.13, w * 0.1, h * 0.085, 14)], r3, (skin, 0.06), 'canvas')
        facing(k, [ell(cx, sh + h * 0.2, w * 0.13, h * 0.08, 14, 0, math.pi), ell(cx, sh + h * 0.27, w * 0.07, h * 0.05, 12)], r4, (hair, 0.1), 'canvas')
    else:
        facing(k, [[(cx - w * 0.1, sh + h * 0.04), (cx, sh - h * 0.18), (cx + w * 0.1, sh + h * 0.04)]], r3, ('#ece6da', 0.04), 'canvas')   # shirt front
        facing(k, [[(cx - w * 0.05, sh + h * 0.03), (cx + w * 0.05, sh + h * 0.03), (cx, sh - h * 0.06)]], r4, '#f4f0e8', 'canvas')        # the stock
        facing(k, [[(cx - w * 0.1, sh + h * 0.04), (cx - w * 0.02, sh - h * 0.2), (cx - w * 0.14, sh - h * 0.1)],
                   [(cx + w * 0.1, sh + h * 0.04), (cx + w * 0.02, sh - h * 0.2), (cx + w * 0.14, sh - h * 0.1)]], r4, (shade(coat, 1.5), 0.08), 'canvas')   # lapels
        facing(k, [ell(cx, sh + h * 0.14, w * 0.1, h * 0.09, 14)], r3, (skin, 0.06), 'canvas')
        facing(k, [ell(cx, sh + h * 0.2, w * 0.12, h * 0.06, 12, 0, math.pi), ell(cx - w * 0.1, sh + h * 0.12, w * 0.035, h * 0.06, 8),
                   ell(cx + w * 0.1, sh + h * 0.12, w * 0.035, h * 0.06, 8)], r4, (hair, 0.1), 'canvas')
        if sitter in ('admiral', 'captain'):
            facing(k, [ell(cx - w * 0.29, sh - h * 0.01, w * 0.08, h * 0.03, 10), ell(cx + w * 0.29, sh - h * 0.01, w * 0.08, h * 0.03, 10)], r3, GILT_L, 'canvas')
            facing(k, [ell(cx - w * 0.2, sh - h * 0.2, w * 0.03, w * 0.03, 8), ell(cx - w * 0.13, sh - h * 0.22, w * 0.025, w * 0.025, 8)], r4, GILT_L, 'canvas')
        if sitter == 'admiral':
            facing(k, [strip((cx - w * 0.3, sh - h * 0.02), (cx + w * 0.24, z0 + h * 0.1), w * 0.06)], r3, '#8a1a24', 'canvas')
    facing(k, [ell(cx - w * 0.035, sh + h * 0.15, 0.012, 0.01, 6), ell(cx + w * 0.035, sh + h * 0.15, 0.012, 0.01, 6)], r4 + 0.002, '#2a1a12', 'canvas')
    facing(k, [ell(cx, sh + h * 0.09, w * 0.03, 0.008, 6)], r4 + 0.002, '#9a5a4a', 'canvas')


def seascape(k, cx, r_face, z0, w=1.3, h=0.8, frame=GILT, night=False):
    """A marine in a gilt frame: a sky, a green sea under the moon or the sun, a ship under full sail, a headland."""
    x0, x1, z1 = cx - w / 2, cx + w / 2, z0 + h
    r = gilt_frame(k, x0, x1, r_face, z0, z1, col=frame)
    sky = ('#1a2a3e', '#2a3a5a', '#3a4a6a') if night else ('#8ab0c8', '#b8d0d8', '#e8dcc0')
    _canvas_ground(k, x0, x1, r, z0, z1, [(0.42, '#1e4a44' if not night else '#12302e'), (0.7, sky[2]), (0.86, sky[1]), (1.0, sky[0])])
    ra, rb, rc = r + 0.003, r + 0.006, r + 0.009
    facing(k, [[(x1, z0 + h * 0.42), (x1 - w * 0.35, z0 + h * 0.42), (x1 - w * 0.22, z0 + h * 0.56), (x1 - w * 0.08, z0 + h * 0.6), (x1, z0 + h * 0.66)]], ra, '#3a4a32', 'canvas')
    facing(k, [rect(x1 - w * 0.12, z0 + h * 0.6, x1 - w * 0.09, z0 + h * 0.75)], rb, '#e8e0d0', 'canvas')
    for i in range(6):                                          # wave crests
        zz = z0 + h * (0.08 + i * 0.055)
        facing(k, [rect(x0 + w * (0.05 + 0.13 * (i % 3)), zz, x0 + w * (0.2 + 0.13 * (i % 3)), zz + 0.012)], ra, '#7ab0a0', 'canvas')
    sx, sz = x0 + w * 0.4, z0 + h * 0.4                         # the ship
    facing(k, [[(sx - w * 0.14, sz), (sx + w * 0.16, sz), (sx + w * 0.12, sz - h * 0.07), (sx - w * 0.12, sz - h * 0.07)]], rb, '#2a1a10', 'canvas')
    sails = []
    for (mx, top) in ((sx - w * 0.07, 0.42), (sx + w * 0.02, 0.5), (sx + w * 0.1, 0.38)):
        for j in range(3):
            za, zb = sz + h * (0.04 + j * top / 3.2), sz + h * (0.04 + (j + 1) * top / 3.2 - 0.02)
            sails.append([(mx - w * 0.05 + j * 0.01, za), (mx + w * 0.05 - j * 0.01, za), (mx + w * 0.045 - j * 0.01, zb), (mx - w * 0.045 + j * 0.01, zb)])
    facing(k, sails, rc, ('#f0e8d4', 0.05), 'canvas')
    if night:
        facing(k, [ell(x0 + w * 0.8, z0 + h * 0.85, 0.05, 0.05, 12)], ra, '#f0f0d0', 'canvas', emit=('#a0a080', 0.4))


def still_life(k, cx, r_face, z0, w=1.0, h=0.75, frame=GILT):
    """A Dutch still life: a dark ground, a table edge, a silver ewer, lemons, grapes and a peeled orange."""
    x0, x1, z1 = cx - w / 2, cx + w / 2, z0 + h
    r = gilt_frame(k, x0, x1, r_face, z0, z1, col=frame)
    _canvas_ground(k, x0, x1, r, z0, z1, [(0.3, '#3a2a1a'), (1.0, '#1a1610')])
    ra, rb = r + 0.003, r + 0.006
    facing(k, [rect(x0, z0 + h * 0.28, x1, z0 + h * 0.31)], ra, '#5a4026', 'canvas')
    facing(k, [ell(cx - w * 0.18, z0 + h * 0.5, w * 0.08, h * 0.2, 12), rect(cx - w * 0.2, z0 + h * 0.68, cx - w * 0.16, z0 + h * 0.78)], ra, '#a8acb0', 'canvas')
    facing(k, [ell(cx + w * 0.05, z0 + h * 0.36, w * 0.06, h * 0.06, 10), ell(cx + w * 0.17, z0 + h * 0.35, w * 0.055, h * 0.055, 10)], rb, '#e8c040', 'canvas')
    facing(k, [ell(cx + w * (0.25 + 0.03 * (i % 3)), z0 + h * (0.42 + 0.05 * (i // 3)), 0.025, 0.025, 8) for i in range(9)], rb, '#4a2a4a', 'canvas')
    facing(k, [ell(cx - w * 0.02, z0 + h * 0.4, w * 0.06, h * 0.06, 10)], rb, '#e88030', 'canvas')


def mirror(k, x0, x1, r_face, z0, z1, frame=GILT, arched=True):
    """A gilt overmantel or pier mirror: grey-blue glass with a pale streak of reflected light, an arched crest."""
    gilt_frame(k, x0, x1, r_face, z0, z1, col=frame, b=0.09)
    k.box(x0, r_face + 0.02, z0, x1, r_face + 0.03, z1, ('#5a6a74', 0.04), 'mirror_glass', emit=('#2a343c', 0.35))
    w = x1 - x0
    facing(k, [strip((x0 + w * 0.15, z0 + 0.1), (x0 + w * 0.55, z1 - 0.1), 0.05), strip((x0 + w * 0.32, z0 + 0.1), (x0 + w * 0.7, z1 - 0.15), 0.025)],
           r_face + 0.032, '#a8b8c0', 'mirror_glass', emit=('#5a6870', 0.3))
    if arched:
        cx = (x0 + x1) / 2
        facing(k, [ell(cx, z1 + 0.09, w * 0.36, 0.22, 12, 0, math.pi)], r_face + 0.05, (GILT, 0.05), 'frame')
        k.sphere(cx, r_face + 0.07, z1 + 0.22, 0.07, 0.07, GILT_L, 'frame_rose', segs=10)


# ---- the fireplace --------------------------------------------------------------------------------------------------
def grand_fireplace(k, cx, r_face, H, w=2.5, open_w=1.15, open_h=1.0, marble=MARBLE_W, breast=None, energy=150.0,
                    garniture=True):
    """A marble chimneypiece: the breast standing out from the wall, columns either side of the opening, a frieze with
    a carved tablet, the mantel shelf, a cast-iron grate with a log fire, the black hearth with a brass fender and the
    fire irons. Returns (shelf height, the breast's face row)."""
    D = 0.3
    F = r_face + D
    if breast:
        k.box(cx - w / 2 - 0.15, r_face - 0.1, 0, cx + w / 2 + 0.15, F, H, (breast, 0.06), 'chimney_breast')
    shelf = open_h + 0.42
    hw = w / 2
    # the surround, in pieces of marble standing proud of the breast
    k.box(cx - hw, F, 0, cx - open_w / 2, F + 0.08, shelf - 0.1, (marble, 0.08), 'mantel_surround')
    k.box(cx + open_w / 2, F, 0, cx + hw, F + 0.08, shelf - 0.1, (marble, 0.08), 'mantel_surround')
    k.box(cx - open_w / 2, F, open_h, cx + open_w / 2, F + 0.08, shelf - 0.1, (marble, 0.08), 'mantel_surround')
    for s in (-1, 1):                                         # columns
        x = cx + s * (hw - 0.22)
        k.box(x - 0.15, F + 0.06, 0, x + 0.15, F + 0.3, 0.12, (shade(marble, 0.94), 0.06), 'mantel_column')
        k.cyl(x, F + 0.18, 0.12, shelf - 0.28, 0.1, (marble, 0.05), 'mantel_column', verts=14)
        k.box(x - 0.15, F + 0.06, shelf - 0.28, x + 0.15, F + 0.3, shelf - 0.18, (shade(marble, 0.94), 0.06), 'mantel_column')
        k.box(x - 0.12, F + 0.08, shelf - 0.32, x + 0.12, F + 0.28, shelf - 0.28, GILT, 'mantel_gilt')
    k.box(cx - hw + 0.05, F + 0.06, shelf - 0.18, cx + hw - 0.05, F + 0.16, shelf - 0.04, (shade(marble, 0.98), 0.06), 'mantel_frieze')
    k.box(cx - 0.3, F + 0.16, shelf - 0.16, cx + 0.3, F + 0.19, shelf - 0.06, (shade(marble, 1.04), 0.04), 'mantel_tablet')
    k.sphere(cx, F + 0.2, shelf - 0.11, 0.07, 0.035, GILT, 'mantel_gilt', ry=0.02, segs=10)
    for s in (-1, 1):
        k.tube((cx + s * 0.32, F + 0.18, shelf - 0.1), (cx + s * (hw - 0.45), F + 0.18, shelf - 0.12), 0.018, GILT, 'mantel_gilt', verts=6)
    k.box(cx - hw - 0.12, r_face, shelf - 0.04, cx + hw + 0.12, F + 0.36, shelf + 0.04, (marble, 0.06), 'mantel_shelf')
    k.box(cx - hw - 0.08, r_face, shelf - 0.08, cx + hw + 0.08, F + 0.32, shelf - 0.04, (shade(marble, 0.9), 0.06), 'mantel_shelf')
    # the opening: a cast-iron arched insert, the firebox, the grate and the fire
    k.box(cx - open_w / 2, F - 0.02, 0, cx + open_w / 2, F + 0.02, open_h, '#1e1a1a', 'fire_insert')
    k.box(cx - open_w / 2 + 0.08, F - 0.3, 0, cx + open_w / 2 - 0.08, F + 0.03, open_h - 0.1, '#0c0806', 'firebox')
    k.cyl_y(cx, F + 0.02, F + 0.035, open_h - 0.12, open_w / 2 - 0.06, 0.12, '#2a2626', 'fire_insert', verts=16)
    gz = 0.16
    k.box(cx - 0.38, F - 0.22, gz - 0.02, cx + 0.38, F + 0.02, gz, '#1a1616', 'grate')
    for i in range(6):
        x = cx - 0.33 + i * 0.132
        k.box(x - 0.012, F + 0.0, gz, x + 0.012, F + 0.03, gz + 0.22, '#2a2424', 'grate')
    for (dx, dr, l) in ((-0.15, -0.1, 0.5), (0.12, -0.06, 0.46), (0.0, -0.16, 0.56)):
        k.cyl_x(cx + dx - l / 2, cx + dx + l / 2, F + dr, gz + 0.08, 0.06, 0.06, ('#3a2416', 0.2), 'log', verts=8)
    emb = []
    for i in range(16):
        x, rr = cx + k.rng.uniform(-0.3, 0.3), F + k.rng.uniform(-0.2, 0.0)
        emb.append((x - 0.03, rr - 0.02, gz + 0.02, x + 0.03, rr + 0.02, gz + 0.06))
    k.boxes(emb, '#ff6a20', 'embers', emit=('#ff6a20', 2.2))
    for (dx, h, rad, col, e) in ((0.0, 0.5, 0.2, FLAME, 3.0), (-0.17, 0.36, 0.12, FLAME_HOT, 4.0), (0.16, 0.4, 0.12, FLAME_HOT, 4.0),
                                 (-0.06, 0.28, 0.08, '#fff8d8', 5.0), (0.08, 0.3, 0.07, '#fff8d8', 5.0)):
        k.cone(cx + dx, F - 0.1, gz + 0.1, gz + 0.1 + h, rad, 0.01, col, 'fire', emit=(col, e), verts=10)
    k.point_light(cx, F + 0.35, 0.45, '#ff9440', energy, radius=0.3, group='flicker')
    k.point_light(cx, F + 1.2, 0.6, '#ffa860', energy * 0.25, radius=0.4, group='flicker')
    # the hearth, a brass fender, the fire irons
    k.box(cx - hw - 0.1, F, 0, cx + hw + 0.1, F + 0.62, 0.035, (MARBLE_K, 0.06), 'hearth')
    k.box(cx - open_w / 2 - 0.25, F + 0.5, 0.035, cx + open_w / 2 + 0.25, F + 0.56, 0.16, GILT, 'fender')
    for s in (-1, 1):
        k.box(cx + s * (open_w / 2 + 0.25) - 0.03, F + 0.1, 0.035, cx + s * (open_w / 2 + 0.25) + 0.03, F + 0.56, 0.16, GILT, 'fender')
    ix = cx + hw - 0.2
    k.cyl(ix, F + 0.42, 0.035, 0.06, 0.08, GILT, 'fire_irons', verts=10)
    k.cyl(ix, F + 0.42, 0.06, 0.62, 0.012, GILT, 'fire_irons', verts=6)
    for (dx, top) in ((-0.04, 0.58), (0.03, 0.6), (0.0, 0.56)):
        k.tube((ix + dx, F + 0.42, 0.08), (ix + dx * 2, F + 0.4, top), 0.012, '#2a2626', 'fire_irons', verts=5)
    k.sphere(ix, F + 0.42, 0.64, 0.025, 0.025, GILT, 'fire_irons', segs=8)
    if garniture:
        clock_on_mantel(k, cx, F + 0.12, shelf + 0.04)
        for s in (-1, 1):
            candelabrum(k, cx + s * (hw - 0.15), F + 0.1, shelf + 0.04, arms=3, s=0.85, energy=3.0)
            vase(k, cx + s * (hw * 0.5), F + 0.14, shelf + 0.04, s=0.7, col='#2a4a8a', band='#f0ece4')
    return shelf + 0.04, F


def clock_on_mantel(k, cx, cr, z, wood=MARBLE_K):
    """A bracket clock: a black marble case with an arched top, gilt feet and finial, a white enamel dial."""
    k.box(cx - 0.17, cr - 0.08, z, cx + 0.17, cr + 0.08, z + 0.04, GILT, 'clock_base')
    k.box(cx - 0.14, cr - 0.07, z + 0.04, cx + 0.14, cr + 0.07, z + 0.32, (wood, 0.06), 'clock_case')
    k.cyl_y(cx, cr - 0.07, cr + 0.07, z + 0.32, 0.14, 0.08, (wood, 0.06), 'clock_case', verts=14)
    k.cyl_y(cx, cr + 0.07, cr + 0.08, z + 0.22, 0.085, 0.085, '#f4f0e4', 'clock_face', verts=14)
    k.cyl_y(cx, cr + 0.068, cr + 0.075, z + 0.22, 0.098, 0.098, GILT, 'clock_rim', verts=14)
    k.box(cx - 0.004, cr + 0.08, z + 0.22, cx + 0.004, cr + 0.085, z + 0.29, '#1a1414', 'clock_hand')
    k.box(cx, cr + 0.08, z + 0.216, cx + 0.05, cr + 0.085, z + 0.224, '#1a1414', 'clock_hand')
    k.sphere(cx, cr, z + 0.43, 0.035, 0.035, GILT, 'clock_finial', segs=8)


def candelabrum(k, cx, cr, z, arms=3, s=1.0, col=SILVER, lit=True, energy=3.0, group='flicker'):
    """A branched candlestick: a round foot, a turned stem, curving arms with cups, candles and flames."""
    k.cyl(cx, cr, z, z + 0.03 * s, 0.09 * s, col, 'candelabrum', verts=12)
    k.cyl(cx, cr, z + 0.03 * s, z + 0.08 * s, 0.05 * s, col, 'candelabrum', verts=10)
    k.cyl(cx, cr, z + 0.08 * s, z + 0.36 * s, 0.018 * s, col, 'candelabrum', verts=8)
    k.sphere(cx, cr, z + 0.2 * s, 0.035 * s, 0.035 * s, col, 'candelabrum', segs=8)
    tops = [(cx, cr, z + 0.42 * s)]
    if arms >= 3:
        for a in ([0, math.pi] if arms == 3 else [0, math.pi / 2, math.pi, 3 * math.pi / 2]):
            ex, er = cx + math.cos(a) * 0.15 * s, cr + math.sin(a) * 0.06 * s
            k.tube((cx, cr, z + 0.34 * s), (ex, er, z + 0.3 * s), 0.012 * s, col, 'candelabrum', verts=5)
            k.tube((ex, er, z + 0.3 * s), (ex, er, z + 0.36 * s), 0.012 * s, col, 'candelabrum', verts=5)
            tops.append((ex, er, z + 0.36 * s))
    for (x, r, zz) in tops:
        k.cyl(x, r, zz - 0.02 * s, zz, 0.035 * s, col, 'candelabrum', verts=8)
        k.cyl(x, r, zz, zz + 0.13 * s, 0.017 * s, CANDLE, 'candle', verts=6)
        if lit:
            k.sphere(x, r, zz + 0.16 * s, 0.016 * s, 0.03 * s, FLAME_HOT, 'flame', emit=(FLAME_HOT, 4.0), segs=6)
    if lit and energy:
        k.point_light(cx, cr + 0.1, z + 0.6 * s, '#ffb868', energy, radius=0.08, group=group)


def vase(k, cx, cr, z, s=1.0, col='#2a4a8a', band='#f0ece4', kind='urn'):
    """A porcelain vase: an urn body, a neck, a lip, a painted band round its belly. Returns the mouth's height."""
    if kind == 'urn':
        k.cyl(cx, cr, z, z + 0.03 * s, 0.07 * s, col, 'vase', verts=12)
        k.sphere(cx, cr, z + 0.15 * s, 0.11 * s, 0.12 * s, (col, 0.04), 'vase', segs=14)
        k.cyl(cx, cr, z + 0.12 * s, z + 0.17 * s, 0.112 * s, band, 'vase_band', verts=14)
        k.cyl(cx, cr, z + 0.25 * s, z + 0.33 * s, 0.05 * s, (col, 0.04), 'vase', verts=12)
        k.cyl(cx, cr, z + 0.33 * s, z + 0.35 * s, 0.075 * s, band, 'vase_band', verts=12)
        return z + 0.35 * s
    k.cyl(cx, cr, z, z + 0.4 * s, 0.07 * s, (col, 0.04), 'vase', verts=12)
    k.cyl(cx, cr, z + 0.12 * s, z + 0.16 * s, 0.072 * s, band, 'vase_band', verts=12)
    return z + 0.4 * s


def bouquet(k, cx, cr, z, s=1.0, kind='rose', leaf=LEAF, mix=None, dome=0.2, drooping=True):
    """A bunch of flowers out of a vase's mouth at z: a dome of blooms in two or three shades, leaves round and under
    them, a few stems hanging over the side."""
    cols = FLOWERS.get(kind, FLOWERS['rose'])
    if mix:
        cols = cols + tuple(c for m in mix for c in FLOWERS[m])
    R = dome * s
    n = int(22 * s * s + 8)
    leaves = []
    for i in range(int(12 * s + 4)):
        a = i * 2.4
        lx, lr = cx + math.cos(a) * R * 0.95, cr + math.sin(a) * R * 0.5
        lz = z + R * 0.35 + (i % 3) * 0.03 * s
        tip = (cx + math.cos(a) * R * 1.45, cr + math.sin(a) * R * 0.8, lz - 0.05 * s)
        leaves.append([(lx - math.sin(a) * 0.035 * s, lr + math.cos(a) * 0.02 * s, lz), (lx + math.sin(a) * 0.035 * s, lr - math.cos(a) * 0.02 * s, lz), tip])
    tris(k, leaves, (leaf, 0.12), 'leaves')
    k.cyl(cx, cr, z - 0.02, z + R * 0.4, R * 0.25, (shade(leaf, 0.7), 0.1), 'stems', verts=8)
    for i in range(n):
        u = (i + 0.5) / n
        a = i * 2.39996
        rad = math.sqrt(u) * R
        x, r = cx + math.cos(a) * rad, cr + math.sin(a) * rad * 0.62
        zz = z + R * 0.45 + math.sqrt(max(0.0, R * R - rad * rad)) * 0.85
        big = 0.04 * s * (1.0 + 0.3 * ((i * 7) % 3) / 2)
        col = cols[(i * 5) % len(cols)]
        k.sphere(x, r, zz, big, big * 0.85, (col, 0.1), 'bloom', segs=8)
        if i % 3 == 0:
            k.sphere(x, r + 0.01, zz + big * 0.5, big * 0.45, big * 0.4, shade(col, 1.18), 'bloom', segs=6)
    if drooping:
        for a in (0.6, 2.6, 4.4):
            ex, er = cx + math.cos(a) * R * 1.3, cr + math.sin(a) * R * 0.7
            k.tube((cx + math.cos(a) * R * 0.6, cr + math.sin(a) * R * 0.35, z + R * 0.6), (ex, er, z + R * 0.2), 0.008 * s, shade(leaf, 0.8), 'stems', verts=4)
            k.sphere(ex, er, z + R * 0.18, 0.03 * s, 0.03 * s, cols[1], 'bloom', segs=6)


def vase_of_flowers(k, cx, cr, z, s=1.0, col='#2a4a8a', band='#f0ece4', kind='rose', mix=None):
    top = vase(k, cx, cr, z, s, col, band)
    bouquet(k, cx, cr, top, s=s * 1.2, kind=kind, mix=mix)


# ---- light ------------------------------------------------------------------------------------------------------------
def chandelier(k, cx, cr, z, rad=0.62, arms=8, tiers=2, chain_top=None, energy=110.0, col=GILT, group='lamp'):
    """A crystal chandelier: a gilt stem of balusters, two tiers of curving arms with candles in cups, a prism under
    every cup and festoons of beads swagged between the arms, a cascade of crystal under the bowl."""
    top = chain_top or z + 1.2
    k.cyl(cx, cr, z + 0.75, top, 0.018, col, 'chandelier_chain', verts=6)
    k.cyl(cx, cr, z + 0.62, z + 0.75, 0.09, col, 'chandelier', verts=12)
    k.sphere(cx, cr, z + 0.5, 0.07, 0.12, (col, 0.04), 'chandelier', segs=12)
    k.cyl(cx, cr, z + 0.12, z + 0.42, 0.035, col, 'chandelier', verts=10)
    k.sphere(cx, cr, z + 0.08, 0.13, 0.08, (col, 0.04), 'chandelier', segs=14)
    k.cone(cx, cr, z - 0.22, z + 0.02, 0.02, 0.12, ('#e8f0f4', 0.0), 'crystal', emit=('#8a9aa0', 0.35), verts=10)
    beads, prisms, flames = [], [], []
    for t in range(tiers):
        R = rad * (1.0 if t == 0 else 0.55)
        zt = z + (0.06 if t == 0 else 0.42)
        n = arms if t == 0 else max(4, arms // 2)
        tips = []
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * t) / n
            ex, er = cx + math.cos(a) * R, cr + math.sin(a) * R * 0.9
            mx, mr = cx + math.cos(a) * R * 0.55, cr + math.sin(a) * R * 0.5
            k.tube((cx, cr, zt + 0.02), (mx, mr, zt - 0.08), 0.017, col, 'chandelier', verts=5)
            k.tube((mx, mr, zt - 0.08), (ex, er, zt + 0.04), 0.017, col, 'chandelier', verts=5)
            k.cyl(ex, er, zt + 0.04, zt + 0.08, 0.045, col, 'chandelier', verts=8)
            k.cyl(ex, er, zt + 0.08, zt + 0.2, 0.017, CANDLE, 'candle', verts=6)
            flames.append((ex, er, zt + 0.23))
            prisms.append((ex, er, zt + 0.03))
            tips.append((ex, er, zt + 0.04))
        for (p, q) in zip(tips, tips[1:] + tips[:1]):           # a festoon of beads between each pair of arms
            for j in range(1, 6):
                u = j / 6
                beads.append((p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] - 0.12 * math.sin(math.pi * u)))
    for (x, r, zz) in flames:
        k.sphere(x, r, zz, 0.018, 0.034, FLAME_HOT, 'flame', emit=(FLAME_HOT, 4.0), segs=6)
    for (x, r, zz) in prisms:
        k.cone(x, r, zz - 0.14, zz - 0.01, 0.025, 0.004, ('#eef4f8', 0.0), 'crystal', emit=('#a0b0b8', 0.45), verts=6)
    k.boxes([(x - 0.014, r - 0.014, zz - 0.014, x + 0.014, r + 0.014, zz + 0.014) for (x, r, zz) in beads], '#f0f6fa', 'crystal_bead',
            emit=('#a8b8c0', 0.5))
    k.point_light(cx, cr + 0.05, z + 0.1, '#ffd49a', energy, radius=0.45, group=group)


def sconce(k, cx, r_face, z=1.75, arms=2, col=GILT, energy=5.0, group='lamp'):
    """A gilt wall sconce: a backplate, curling arms, candles under little silk shades."""
    k.box(cx - 0.05, r_face, z - 0.18, cx + 0.05, r_face + 0.03, z + 0.12, col, 'sconce')
    k.sphere(cx, r_face + 0.04, z - 0.18, 0.04, 0.04, col, 'sconce', segs=8)
    for s in ((-1, 1) if arms == 2 else (0,)):
        ex = cx + s * 0.16
        k.tube((cx, r_face + 0.03, z - 0.05), (ex, r_face + 0.18, z), 0.014, col, 'sconce', verts=5)
        k.cyl(ex, r_face + 0.18, z, z + 0.03, 0.035, col, 'sconce', verts=8)
        k.cyl(ex, r_face + 0.18, z + 0.03, z + 0.12, 0.014, CANDLE, 'candle', verts=6)
        k.cone(ex, r_face + 0.18, z + 0.08, z + 0.2, 0.065, 0.035, '#f0d8a8', 'lamp_shade', emit=('#ffc880', 0.9), verts=10)
    k.point_light(cx, r_face + 0.3, z + 0.1, '#ffc078', energy, radius=0.1, group=group)


def torchere(k, cx, cr, h=1.75, arms=5, col=GILT, energy=10.0, group='flicker'):
    """A floor candelabrum: a tripod of scrolled feet, a tall turned stem with a knop or two, a crown of candles."""
    for a in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189):
        k.tube((cx, cr, 0.18), (cx + math.cos(a) * 0.2, cr + math.sin(a) * 0.16, 0.02), 0.025, col, 'torchere', verts=5)
        k.sphere(cx + math.cos(a) * 0.2, cr + math.sin(a) * 0.16, 0.03, 0.035, 0.03, col, 'torchere', segs=6)
    k.cyl(cx, cr, 0.12, h - 0.2, 0.025, col, 'torchere', verts=8)
    for z in (0.3, h * 0.55):
        k.sphere(cx, cr, z, 0.05, 0.07, (col, 0.04), 'torchere', segs=8)
    k.cyl(cx, cr, h - 0.22, h - 0.18, 0.14, col, 'torchere', verts=10)
    for i in range(arms):
        a = 2 * math.pi * i / arms
        x, r = (cx, cr) if i == 0 and arms % 2 else (cx + math.cos(a) * 0.13, cr + math.sin(a) * 0.1)
        k.cyl(x, r, h - 0.18, h - 0.04, 0.018, CANDLE, 'candle', verts=6)
        k.sphere(x, r, h - 0.01, 0.017, 0.032, FLAME_HOT, 'flame', emit=(FLAME_HOT, 4.0), segs=6)
    k.point_light(cx, cr + 0.1, h + 0.25, '#ffb868', energy, radius=0.15, group=group)
    k.solid(cx - 0.22, cr - 0.18, cx + 0.22, cr + 0.18)


def table_lamp(k, cx, cr, z, base='#2a4a8a', shade_col='#f0dcb0', energy=6.0, group='lamp', s=1.0):
    """A lamp on a table: a ginger-jar base, a brass stem, a pleated shade glowing."""
    k.sphere(cx, cr, z + 0.1 * s, 0.07 * s, 0.1 * s, (base, 0.04), 'lamp_base', segs=12)
    k.cyl(cx, cr, z + 0.19 * s, z + 0.3 * s, 0.012 * s, GILT, 'lamp_stem', verts=6)
    k.cone(cx, cr, z + 0.26 * s, z + 0.42 * s, 0.13 * s, 0.075 * s, (shade_col, 0.05), 'lamp_shade', emit=('#ffc880', 0.7), verts=14)
    k.point_light(cx, cr + 0.05, z + 0.28 * s, '#ffc884', energy, radius=0.08, group=group)


# ---- furniture against the wall --------------------------------------------------------------------------------------
def console_table(k, x0, x1, r_face, d=0.42, h=0.86, top=MARBLE_W, gilt=GILT):
    """A pier table: a marble top on gilt cabriole legs, a carved apron with a shell at its middle."""
    k.box(x0, r_face + 0.02, h - 0.05, x1, r_face + d, h, (top, 0.08), 'console_top')
    k.box(x0 + 0.04, r_face + 0.04, h - 0.17, x1 - 0.04, r_face + d - 0.03, h - 0.05, (gilt, 0.05), 'console_apron')
    k.sphere((x0 + x1) / 2, r_face + d - 0.02, h - 0.13, 0.08, 0.06, GILT_L, 'console_shell', ry=0.03, segs=10)
    for x in (x0 + 0.07, x1 - 0.07):
        r = r_face + d - 0.06
        kx = x + (0.03 if x < (x0 + x1) / 2 else -0.03)
        k.tube((x, r, h - 0.15), (kx, r + 0.04, h * 0.55), 0.03, gilt, 'console_leg', rb=0.022, verts=6)
        k.tube((kx, r + 0.04, h * 0.55), (x, r, 0.05), 0.022, gilt, 'console_leg', rb=0.016, verts=6)
        k.sphere(x, r + 0.01, 0.04, 0.035, 0.035, gilt, 'console_leg', segs=8)
    k.box(x0 + 0.1, r_face + 0.06, 0.12, x1 - 0.1, r_face + d - 0.08, 0.15, (shade(gilt, 0.8), 0.05), 'console_stretcher')
    k.solid(x0, r_face, x1, r_face + d)
    return h


def side_table_round(k, cx, cr, h=0.62, rad=0.24, wood=MAHOG, top=None, cloth=None):
    """A round lamp table on a tripod (or under a cloth to the floor). Returns its top's height."""
    if cloth:
        k.cyl(cx, cr, 0, h, rad + 0.02, (cloth, 0.08), 'table_cloth', verts=18)
        k.cyl(cx, cr, h, h + 0.02, rad + 0.04, (shade(cloth, 1.08), 0.06), 'table_cloth', verts=18)
    else:
        k.cyl(cx, cr, h - 0.04, h, rad, (top or wood, 0.08), 'table_top', verts=18)
        k.cyl(cx, cr, 0.12, h - 0.04, 0.03, (wood, 0.06), 'table_leg', verts=8)
        k.sphere(cx, cr, h * 0.45, 0.045, 0.07, (wood, 0.06), 'table_leg', segs=8)
        for a in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189):
            k.tube((cx, cr, 0.16), (cx + math.cos(a) * rad * 0.9, cr + math.sin(a) * rad * 0.8, 0.02), 0.022, wood, 'table_leg', verts=5)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)
    return h + (0.02 if cloth else 0.0)


# ---- statues -----------------------------------------------------------------------------------------------------------
def plinth(k, cx, cr, h=0.85, w=0.5, stone=MARBLE_W, trim=None):
    """A pedestal: a stepped base, a die with a sunk panel, a moulded cap. Returns its top."""
    k.box(cx - w / 2 - 0.04, cr - w / 2 - 0.04, 0, cx + w / 2 + 0.04, cr + w / 2 + 0.04, 0.1, (shade(stone, 0.92), 0.06), 'plinth')
    k.box(cx - w / 2, cr - w / 2, 0.1, cx + w / 2, cr + w / 2, h - 0.1, (stone, 0.06), 'plinth')
    k.box(cx - w / 2 + 0.06, cr + w / 2, 0.2, cx + w / 2 - 0.06, cr + w / 2 + 0.01, h - 0.2, (shade(stone, 0.9), 0.05), 'plinth_panel')
    k.box(cx - w / 2 - 0.04, cr - w / 2 - 0.04, h - 0.1, cx + w / 2 + 0.04, cr + w / 2 + 0.04, h, (shade(stone, 1.04), 0.06), 'plinth')
    if trim:
        k.box(cx - w / 2 - 0.045, cr + w / 2 + 0.04, h - 0.06, cx + w / 2 + 0.045, cr + w / 2 + 0.045, h - 0.04, trim, 'plinth_trim')
    k.solid(cx - w / 2 - 0.04, cr - w / 2 - 0.04, cx + w / 2 + 0.04, cr + w / 2 + 0.04)
    return h


def statue(k, cx, cr, z, pose='venus', stone='#ece6da', s=1.0):
    """A classical figure in white marble, near life-size: contrapposto on a little base, drapery from the hip, an arm
    raised (venus: to her hair; muse: a lyre at her hip; navigator: a hand on a globe at his side, a cloak)."""
    S = s
    k.cyl(cx, cr, z, z + 0.06 * S, 0.2 * S, (shade(stone, 0.95), 0.06), 'statue_base', verts=14)
    zb = z + 0.06 * S
    hip = zb + 0.72 * S
    st = (stone, 0.05)
    k.tube((cx - 0.06 * S, cr, zb), (cx - 0.06 * S, cr, hip), 0.055 * S, st, 'statue', rb=0.075 * S, verts=8)
    k.tube((cx + 0.07 * S, cr + 0.04 * S, zb + 0.02 * S), (cx + 0.06 * S, cr + 0.08 * S, zb + 0.38 * S), 0.05 * S, st, 'statue', rb=0.06 * S, verts=8)
    k.tube((cx + 0.06 * S, cr + 0.08 * S, zb + 0.38 * S), (cx + 0.06 * S, cr, hip), 0.06 * S, st, 'statue', rb=0.075 * S, verts=8)
    if pose in ('venus', 'muse'):
        k.cone(cx + 0.01 * S, cr, zb + 0.05 * S, hip + 0.06 * S, 0.21 * S, 0.14 * S, st, 'statue', verts=12)
        for i in range(5):
            a = math.pi * (0.15 + 0.17 * i)
            k.tube((cx + math.cos(a) * 0.19 * S, cr + math.sin(a) * 0.19 * S, zb + 0.06 * S),
                   (cx + math.cos(a) * 0.13 * S, cr + math.sin(a) * 0.13 * S, hip), 0.018 * S, (shade(stone, 0.97), 0.05), 'statue', verts=5)
    else:
        k.cone(cx, cr, hip - 0.25 * S, hip + 0.06 * S, 0.17 * S, 0.14 * S, st, 'statue', verts=12)
    k.blob(cx, cr, hip + 0.18 * S, 0.13 * S, 0.09 * S, 0.2 * S, st, 'statue', rot=(0, 4, 0), segs=12)
    k.blob(cx, cr, hip + 0.38 * S, 0.17 * S, 0.1 * S, 0.08 * S, st, 'statue', rot=(0, -4, 0), segs=12)
    k.cyl(cx, cr, hip + 0.42 * S, hip + 0.5 * S, 0.035 * S, st, 'statue', verts=8)
    k.sphere(cx + 0.01 * S, cr + 0.01 * S, hip + 0.58 * S, 0.075 * S, 0.09 * S, st, 'statue', segs=12)
    k.sphere(cx - 0.01 * S, cr - 0.05 * S, hip + 0.62 * S, 0.06 * S, 0.05 * S, (shade(stone, 0.96), 0.05), 'statue', segs=10)
    sl, sr = (cx - 0.16 * S, cr, hip + 0.37 * S), (cx + 0.16 * S, cr, hip + 0.37 * S)
    if pose == 'venus':
        k.tube(sl, (cx - 0.2 * S, cr + 0.03 * S, hip + 0.1 * S), 0.035 * S, st, 'statue', verts=6)
        k.tube((cx - 0.2 * S, cr + 0.03 * S, hip + 0.1 * S), (cx - 0.08 * S, cr + 0.1 * S, hip - 0.02 * S), 0.03 * S, st, 'statue', verts=6)
        k.tube(sr, (cx + 0.22 * S, cr + 0.02 * S, hip + 0.6 * S), 0.035 * S, st, 'statue', verts=6)
        k.tube((cx + 0.22 * S, cr + 0.02 * S, hip + 0.6 * S), (cx + 0.07 * S, cr - 0.01 * S, hip + 0.66 * S), 0.03 * S, st, 'statue', verts=6)
    elif pose == 'muse':
        k.tube(sl, (cx - 0.12 * S, cr + 0.12 * S, hip + 0.18 * S), 0.035 * S, st, 'statue', verts=6)
        k.tube(sr, (cx + 0.1 * S, cr + 0.14 * S, hip + 0.22 * S), 0.035 * S, st, 'statue', verts=6)
        lx, lr = cx + 0.02 * S, cr + 0.16 * S
        k.tube((lx - 0.08 * S, lr, hip + 0.12 * S), (lx - 0.1 * S, lr, hip + 0.42 * S), 0.018 * S, st, 'statue', verts=5)
        k.tube((lx + 0.08 * S, lr, hip + 0.12 * S), (lx + 0.1 * S, lr, hip + 0.42 * S), 0.018 * S, st, 'statue', verts=5)
        k.tube((lx - 0.1 * S, lr, hip + 0.42 * S), (lx + 0.1 * S, lr, hip + 0.42 * S), 0.016 * S, st, 'statue', verts=5)
        k.cyl(lx, lr, hip + 0.08 * S, hip + 0.14 * S, 0.09 * S, st, 'statue', ry=0.04 * S, verts=10)
    else:
        k.tube(sl, (cx - 0.2 * S, cr + 0.02 * S, hip + 0.05 * S), 0.04 * S, st, 'statue', verts=6)
        k.tube(sr, (cx + 0.24 * S, cr + 0.05 * S, hip + 0.12 * S), 0.04 * S, st, 'statue', verts=6)
        k.sphere(cx + 0.3 * S, cr + 0.06 * S, hip + 0.02 * S, 0.12 * S, 0.12 * S, st, 'statue', segs=12)
        k.cyl(cx + 0.3 * S, cr + 0.06 * S, zb, hip - 0.1 * S, 0.035 * S, st, 'statue', verts=8)
        k.blob(cx - 0.02 * S, cr - 0.08 * S, hip + 0.1 * S, 0.2 * S, 0.06 * S, 0.34 * S, (shade(stone, 0.97), 0.05), 'statue', segs=10)


def bust(k, cx, cr, z, stone=MARBLE_W, s=1.0, wig=True):
    """A portrait bust on a little socle: shoulders, the neck, the head, the curls of a wig."""
    st = (stone, 0.05)
    k.cyl(cx, cr, z, z + 0.05 * s, 0.09 * s, st, 'bust', verts=10)
    k.cyl(cx, cr, z + 0.05 * s, z + 0.1 * s, 0.05 * s, st, 'bust', verts=10)
    k.blob(cx, cr, z + 0.19 * s, 0.17 * s, 0.09 * s, 0.1 * s, st, 'bust', segs=12)
    k.cyl(cx, cr, z + 0.26 * s, z + 0.32 * s, 0.04 * s, st, 'bust', verts=8)
    k.sphere(cx, cr + 0.01 * s, z + 0.39 * s, 0.075 * s, 0.09 * s, st, 'bust', segs=12)
    if wig:
        for (dx, dz) in ((-0.07, 0.36), (0.07, 0.36), (-0.065, 0.42), (0.065, 0.42), (0.0, 0.47), (-0.04, 0.46), (0.04, 0.46)):
            k.sphere(cx + dx * s, cr - 0.02 * s, z + dz * s, 0.035 * s, 0.035 * s, (shade(stone, 0.96), 0.05), 'bust', segs=8)
    k.cone(cx, cr + 0.085 * s, z + 0.38 * s, z + 0.41 * s, 0.014 * s, 0.004 * s, st, 'bust', verts=5)


def potted_palm(k, cx, cr, z=0.0, h=1.6, pot='#c86a3a', leaf='#4a7a3a', fronds=9, s=1.0, jardiniere=None, solid=True):
    """A palm in a pot: arching fronds of narrow leaflets on long stems, young ones standing up in the middle.
    jardiniere: a colour for a glazed pot (blue and white, celadon) instead of terracotta."""
    pc = jardiniere or pot
    k.cyl(cx, cr, z, z + 0.05 * s, 0.17 * s, (shade(pc, 0.85), 0.06), 'pot', verts=14)
    k.cone(cx, cr, z + 0.05 * s, z + 0.42 * s, 0.17 * s, 0.24 * s, (pc, 0.06), 'pot', verts=14)
    k.cyl(cx, cr, z + 0.42 * s, z + 0.47 * s, 0.26 * s, (shade(pc, 1.08), 0.06), 'pot', verts=14)
    if jardiniere:
        k.cyl(cx, cr, z + 0.22 * s, z + 0.27 * s, 0.215 * s, '#f0ece4', 'pot_band', verts=14)
    k.cyl(cx, cr, z + 0.44 * s, z + 0.46 * s, 0.23 * s, '#3a2a1e', 'soil', verts=14)
    top = z + 0.46 * s
    leaves, stems = [], []
    for f in range(fronds):
        a = f * 2.39996 + 0.3
        up = 0.55 + 0.35 * ((f * 7) % 5) / 4
        L = h * s * (0.55 + 0.25 * ((f * 3) % 4) / 3)
        pts = []
        for i in range(9):
            t = i / 8
            rad = L * t * (1 - up * 0.45)
            zz = top + L * (up * t - (1 - up) * 0.9 * t * t) * 0.9
            pts.append((cx + math.cos(a) * rad, cr + math.sin(a) * rad * 0.75, zz))
        stems += list(zip(pts, pts[1:]))
        for i in range(2, 9):
            p = pts[i]
            ln = 0.2 * s * (1 - abs(i - 5) / 6)
            for side in (-1, 1):
                ang = a + side * 1.25
                tip = (p[0] + math.cos(ang) * ln, p[1] + math.sin(ang) * ln * 0.75, p[2] - ln * 0.55)
                d = 0.018 * s
                leaves.append([(p[0] - math.cos(a) * d, p[1] - math.sin(a) * d, p[2]), (p[0] + math.cos(a) * d, p[1] + math.sin(a) * d, p[2]), tip])
    tris(k, leaves, (leaf, 0.12), 'palm')
    for (p, q) in stems:
        k.tube(p, q, 0.01 * s, (shade(leaf, 0.8), 0.06), 'palm_stem', verts=4, smooth=False)
    if solid:
        k.solid(cx - 0.26 * s, cr - 0.26 * s, cx + 0.26 * s, cr + 0.26 * s)


# ---- pieces that can face any way ------------------------------------------------------------------------------------
class Local:
    """A piece's own coordinates: u across it, v from its back toward its front (the way a sitter faces), z up —
    mapped onto the room for a piece facing 'down' (toward the camera), 'up', 'left' or 'right'."""
    DIRS = {'down': (0, 1), 'up': (0, -1), 'right': (1, 0), 'left': (-1, 0)}

    def __init__(self, k, cx, cr, facing='down'):
        self.k, self.cx, self.cr = k, cx, cr
        self.vx, self.vr = self.DIRS[facing]
        self.ux, self.ur = self.vr, -self.vx

    def at(self, u, v):
        return (self.cx + u * self.ux + v * self.vx, self.cr + u * self.ur + v * self.vr)

    def box(self, u0, v0, z0, u1, v1, z1, albedo, part, emit=None, bevel=0.0):
        a, b = self.at(u0, v0), self.at(u1, v1)
        return self.k.box(min(a[0], b[0]), min(a[1], b[1]), z0, max(a[0], b[0]), max(a[1], b[1]), z1, albedo, part, emit, bevel)

    def cyl(self, u, v, z0, z1, rad, albedo, part, verts=10, emit=None):
        x, r = self.at(u, v)
        return self.k.cyl(x, r, z0, z1, rad, albedo, part, emit=emit, verts=verts)

    def sphere(self, u, v, z, rad, rz, albedo, part, segs=8, emit=None):
        x, r = self.at(u, v)
        return self.k.sphere(x, r, z, rad, rz, albedo, part, emit=emit, segs=segs)

    def tube(self, a, b, rad, albedo, part, verts=6, rb=None):
        pa, pb = self.at(a[0], a[1]), self.at(b[0], b[1])
        return self.k.tube((pa[0], pa[1], a[2]), (pb[0], pb[1], b[2]), rad, albedo, part, rb=rb, verts=verts)

    def roll(self, axis, a0, a1, other, z, rad, albedo, part, verts=12):
        """A bolster lying along the piece's u or v axis, from a0 to a1, at `other` on the other axis."""
        (u0, v0), (u1, v1) = ((a0, other), (a1, other)) if axis == 'u' else ((other, a0), (other, a1))
        pa, pb = self.at(u0, v0), self.at(u1, v1)
        if abs(pa[1] - pb[1]) < 1e-6:
            return self.k.cyl_x(min(pa[0], pb[0]), max(pa[0], pb[0]), pa[1], z, rad, rad, albedo, part, verts=verts)
        return self.k.cyl_y(pa[0], min(pa[1], pb[1]), max(pa[1], pb[1]), z, rad, rad, albedo, part, verts=verts)

    def solid(self, u0, v0, u1, v1):
        a, b = self.at(u0, v0), self.at(u1, v1)
        self.k.solid(min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1]))


def wingback(k, cx, cr, facing='down', col=VELVET_G, legs=MAHOG, tufted=True, solid=True):
    """A wing chair: a deep seat with a cushion, a tall back with wings, rolled arms, turned legs, buttons."""
    L = Local(k, cx, cr, facing)
    c = (col, 0.1)
    for (u, v) in ((-0.26, -0.24), (0.26, -0.24), (-0.26, 0.24), (0.26, 0.24)):
        L.cyl(u, v, 0.0, 0.13, 0.03, legs, 'chair_leg', verts=6)
    L.box(-0.32, -0.3, 0.12, 0.32, 0.3, 0.4, c, 'chair', bevel=0.03)
    L.box(-0.25, -0.2, 0.4, 0.25, 0.28, 0.48, (shade(col, 1.12), 0.08), 'chair_cushion', bevel=0.03)
    L.box(-0.32, -0.34, 0.4, 0.32, -0.2, 1.12, (shade(col, 0.9), 0.1), 'chair_back', bevel=0.03)
    L.roll('u', -0.3, 0.3, -0.27, 1.12, 0.07, (shade(col, 0.95), 0.08), 'chair_back')
    for s in (-1, 1):
        L.box(s * 0.36 - 0.05, -0.32, 0.55, s * 0.36 + 0.05, -0.02, 1.05, (shade(col, 0.85), 0.1), 'chair_wing', bevel=0.02)
        L.roll('v', -0.22, 0.3, s * 0.3, 0.62, 0.07, (shade(col, 1.04), 0.08), 'chair_arm')
        L.box(s * 0.3 - 0.06, 0.18, 0.4, s * 0.3 + 0.06, 0.3, 0.6, (shade(col, 0.96), 0.08), 'chair_arm')
    if tufted:
        for (u, z) in ((-0.15, 0.75), (0.0, 0.75), (0.15, 0.75), (-0.08, 0.92), (0.08, 0.92), (-0.08, 0.58), (0.08, 0.58)):
            L.sphere(u, -0.19, z, 0.016, 0.016, shade(col, 0.55), 'chair_button', segs=6)
    if solid:
        L.solid(-0.36, -0.34, 0.36, 0.32)


def sofa(k, cx, cr, length=2.0, facing='down', col='#5a2418', legs=MAHOG, kind='chesterfield', cushions=None, solid=True):
    """A sofa. chesterfield: deep-buttoned leather, rolled arms as high as the back, nailheads along the arms.
    settee: a silk camelback with a carved show-wood frame and loose cushions."""
    L = Local(k, cx, cr, facing)
    h = length / 2
    c = (col, 0.1)
    for u in (-h + 0.1, h - 0.1):
        for v in (-0.3, 0.3):
            L.cyl(u, v, 0.0, 0.1, 0.035, legs, 'sofa_leg', verts=6)
            if kind == 'chesterfield':
                L.sphere(u, v, 0.05, 0.05, 0.05, legs, 'sofa_leg', segs=8)
    L.box(-h, -0.36, 0.1, h, 0.36, 0.38, c, 'sofa', bevel=0.03)
    n = 3 if length > 1.6 else 2
    sw = (length - 0.5) / n
    for i in range(n):
        u0 = -h + 0.25 + i * sw
        L.box(u0 + 0.01, -0.2, 0.38, u0 + sw - 0.01, 0.34, 0.47, (shade(col, 1.1), 0.08), 'sofa_cushion', bevel=0.03)
    if kind == 'chesterfield':
        L.box(-h, -0.4, 0.38, h, -0.2, 0.78, (shade(col, 0.92), 0.1), 'sofa_back', bevel=0.03)
        L.roll('u', -h + 0.05, h - 0.05, -0.3, 0.78, 0.09, (shade(col, 0.98), 0.08), 'sofa_back')
        for s in (-1, 1):
            L.box(s * (h - 0.11) - 0.11, -0.36, 0.38, s * (h - 0.11) + 0.11, 0.36, 0.7, c, 'sofa_arm', bevel=0.02)
            L.roll('v', -0.34, 0.38, s * (h - 0.1), 0.72, 0.1, (shade(col, 1.04), 0.08), 'sofa_arm')
            for i in range(7):
                L.sphere(s * (h - 0.01), -0.3 + i * 0.1, 0.52, 0.012, 0.012, GILT, 'nailhead', segs=4)
        for row, z in enumerate((0.5, 0.62, 0.74)):
            m = int(length / 0.2)
            for i in range(m):
                u = -h + 0.2 + (i + (0.5 if row % 2 else 0)) * (length - 0.4) / m
                if u < h - 0.2:
                    L.sphere(u, -0.2, z, 0.014, 0.014, shade(col, 0.5), 'sofa_button', segs=4)
    else:
        L.box(-h + 0.08, -0.38, 0.38, h - 0.08, -0.26, 0.78, (col, 0.08), 'sofa_back', bevel=0.03)
        rings = []
        for i in range(13):
            t = i / 12
            u = -h + 0.06 + (length - 0.12) * t
            zt = 0.8 + 0.18 * math.sin(math.pi * t) ** 2
            rings.append([L.at(u, -0.4) + (0.38,), L.at(u, -0.4) + (zt,), L.at(u, -0.3) + (zt + 0.02,), L.at(u, -0.24) + (zt - 0.04,)])
        k.loft(rings, (legs, 0.06), 'sofa_frame')
        for s in (-1, 1):
            L.box(s * (h - 0.07) - 0.07, -0.34, 0.38, s * (h - 0.07) + 0.07, 0.34, 0.66, (legs, 0.06), 'sofa_frame')
            L.roll('v', -0.34, 0.36, s * (h - 0.07), 0.66, 0.06, (legs, 0.06), 'sofa_frame')
        for i, ccol in enumerate(cushions or (GILT_L, shade(col, 1.3))):
            u = -h + 0.45 + i * (length - 0.9) / max(1, len(cushions or (1, 2)) - 1)
            L.box(u - 0.17, -0.26, 0.47, u + 0.17, -0.12, 0.78, (ccol, 0.08), 'sofa_pillow', bevel=0.05)
    if solid:
        L.solid(-h, -0.4, h, 0.36)


def tea_table(k, cx, cr, w=1.0, d=0.6, h=0.46, wood=MAHOG, tea=True, top=None):
    """A low table on turned legs, a tea service on a silver tray: teapot, cups and saucers, a cake stand."""
    k.box(cx - w / 2, cr - d / 2, h - 0.05, cx + w / 2, cr + d / 2, h, (top or wood, 0.08), 'table_top', bevel=0.01)
    k.box(cx - w / 2 + 0.04, cr - d / 2 + 0.04, h - 0.12, cx + w / 2 - 0.04, cr + d / 2 - 0.04, h - 0.05, (shade(wood, 0.85), 0.06), 'table_apron')
    for x in (cx - w / 2 + 0.07, cx + w / 2 - 0.07):
        for r in (cr - d / 2 + 0.07, cr + d / 2 - 0.07):
            k.cyl(x, r, 0, h - 0.1, 0.028, (wood, 0.06), 'table_leg', verts=8)
    k.box(cx - w / 2 + 0.1, cr - d / 2 + 0.1, 0.08, cx + w / 2 - 0.1, cr + d / 2 - 0.1, 0.1, (shade(wood, 0.9), 0.06), 'table_shelf')
    if tea:
        z = h
        k.cyl(cx - 0.08, cr, z, z + 0.015, 0.2, SILVER, 'tray', ry=0.14, verts=18)
        k.sphere(cx - 0.12, cr - 0.02, z + 0.08, 0.07, 0.065, '#f0ece4', 'teapot', segs=12)
        k.tube((cx - 0.06, cr - 0.02, z + 0.08), (cx + 0.0, cr - 0.02, z + 0.12), 0.012, '#f0ece4', 'teapot', verts=5)
        k.sphere(cx - 0.12, cr - 0.02, z + 0.15, 0.025, 0.02, GILT, 'teapot', segs=6)
        for (dx, dr) in ((0.04, 0.08), (-0.2, 0.08), (0.05, -0.08)):
            k.cyl(cx + dx, cr + dr, z + 0.015, z + 0.022, 0.05, '#f0ece4', 'saucer', verts=10)
            k.cyl(cx + dx, cr + dr, z + 0.022, z + 0.06, 0.03, '#f0ece4', 'cup', verts=10)
            k.cyl(cx + dx, cr + dr, z + 0.05, z + 0.055, 0.025, '#8a5a30', 'tea', verts=8)
        x = cx + 0.3
        for (zz, rad, cake) in ((z + 0.02, 0.1, '#e8a0b0'), (z + 0.14, 0.08, '#f0e0a0'), (z + 0.25, 0.06, '#c86a4a')):
            k.cyl(x, cr, zz, zz + 0.012, rad, '#f0ece4', 'cake_stand', verts=12)
            for i in range(4):
                a = i * math.pi / 2 + 0.4
                k.sphere(x + math.cos(a) * rad * 0.55, cr + math.sin(a) * rad * 0.45, zz + 0.03, 0.022, 0.018, cake, 'cake', segs=6)
        k.cyl(x, cr, z, z + 0.3, 0.008, GILT, 'cake_stand', verts=5)
    k.solid(cx - w / 2, cr - d / 2, cx + w / 2, cr + d / 2)


def globe_stand(k, cx, cr, s=1.0, wood=MAHOG):
    """A library globe on a stand: tripod legs, a horizon ring, the brass meridian, the old world painted on it."""
    z = 0.62 * s
    for a in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189):
        k.tube((cx + math.cos(a) * 0.24 * s, cr + math.sin(a) * 0.2 * s, 0.0), (cx + math.cos(a) * 0.17 * s, cr + math.sin(a) * 0.14 * s, z - 0.08 * s),
               0.025 * s, (wood, 0.06), 'globe_stand', verts=6)
    k.cyl(cx, cr, z - 0.08 * s, z - 0.05 * s, 0.3 * s, (wood, 0.06), 'globe_ring', verts=24)
    k.cyl(cx, cr, z - 0.06 * s, z - 0.045 * s, 0.31 * s, '#e8dcb0', 'globe_ring', verts=24)
    k.sphere(cx, cr, z + 0.12 * s, 0.25 * s, 0.25 * s, ('#c8b888', 0.12), 'globe', segs=18)
    for (dx, dr, dz, rx, rz, col) in ((-0.08, 0.2, 0.18, 0.1, 0.08, '#8a9a5a'), (0.1, 0.21, 0.06, 0.08, 0.12, '#9aa060'), (0.0, 0.24, 0.0, 0.05, 0.05, '#a89860')):
        k.blob(cx + dx * s, cr + dr * s, z + 0.12 * s + dz * s, rx * s, 0.04 * s, rz * s, (col, 0.1), 'globe_land', segs=8)
    k.cyl_y(cx, cr - 0.01 * s, cr + 0.01 * s, z + 0.12 * s, 0.29 * s, 0.29 * s, GILT, 'globe_meridian', verts=24)
    k.cyl_y(cx, cr - 0.02 * s, cr + 0.02 * s, z + 0.12 * s, 0.26 * s, 0.26 * s, '#c8b888', 'globe', verts=24)
    k.solid(cx - 0.3 * s, cr - 0.3 * s, cx + 0.3 * s, cr + 0.3 * s)


# ---- the staircase and the gallery -------------------------------------------------------------------------------------
def grand_stair(k, x0, x1, r_top, r_bottom, z_top, n=12, wood=MAHOG, tread='#6a3a22', runner=VELVET_R, trim=GILT,
                rod=GILT, baluster=IVORY, rail=MAHOG, open_side='right', newel_lamp=True):
    """A broad flight climbing away from the camera: treads with rounded nosings, a carpet runner held by brass rods,
    turned balusters two to a tread up the open side under a mahogany handrail, a newel post with a lamp on it."""
    run = (r_bottom - r_top) / n
    rise = z_top / n
    rx0, rx1 = x0 + (x1 - x0) * 0.17, x1 - (x1 - x0) * 0.17
    bx = x1 - 0.08 if open_side == 'right' else x0 + 0.08
    rods, bal, nos = [], [], []
    for i in range(n):
        rb = r_bottom - i * run
        ra = rb - run
        top = (i + 1) * rise
        k.box(x0, ra, 0, x1, rb, top - 0.03, (shade(wood, 0.78), 0.06), 'stair_riser')
        k.box(x0, ra, top - 0.03, x1, rb + 0.03, top, (tread, 0.08), 'stair_tread')
        nos.append((x0, rb, top - 0.035, x1, rb + 0.04, top - 0.005))
        k.box(rx0, ra, top, rx1, rb + 0.04, top + 0.012, (runner, 0.08), 'stair_runner')
        k.box(rx0, rb + 0.03, top - rise, rx1, rb + 0.045, top, (shade(runner, 0.9), 0.08), 'stair_runner')
        for xe in (rx0, rx1 - 0.04):
            k.box(xe, ra, top + 0.012, xe + 0.04, rb + 0.04, top + 0.016, trim, 'stair_runner_trim')
        rods.append((rx0 - 0.04, ra + 0.04, top + 0.012, rx1 + 0.04, ra + 0.065, top + 0.035))
        for f in (0.3, 0.75):
            bal.append((bx, ra + run * f, top))
    k.boxes(nos, shade(tread, 1.25), 'stair_nose')
    k.boxes(rods, rod, 'stair_rod')
    for (x, r, z) in bal:
        k.cyl(x, r, z, z + 0.08, 0.035, baluster, 'baluster', verts=8)
        k.cyl(x, r, z + 0.08, z + 0.82, 0.018, baluster, 'baluster', verts=6)
        k.sphere(x, r, z + 0.3, 0.032, 0.07, baluster, 'baluster', segs=8)
    k.tube((bx, r_bottom + 0.05, 0.95), (bx, r_top, z_top + 0.9), 0.04, (rail, 0.06), 'handrail', verts=8)
    k.cyl(bx, r_bottom + 0.08, 0.0, 1.0, 0.075, (rail, 0.06), 'newel', verts=8)
    k.box(bx - 0.09, r_bottom - 0.01, 0.0, bx + 0.09, r_bottom + 0.17, 0.18, (shade(rail, 0.9), 0.06), 'newel')
    k.sphere(bx, r_bottom + 0.08, 1.02, 0.09, 0.06, (rail, 0.06), 'newel', segs=10)
    if newel_lamp:                                            # a bronze lamp standard on the newel
        k.cyl(bx, r_bottom + 0.08, 1.05, 1.62, 0.025, GILT, 'newel_lamp', verts=6)
        k.sphere(bx, r_bottom + 0.08, 1.3, 0.045, 0.06, GILT, 'newel_lamp', segs=8)
        for a in (0.4, 0.4 + 2.094, 0.4 + 4.189):
            ex, er = bx + math.cos(a) * 0.14, r_bottom + 0.08 + math.sin(a) * 0.08
            k.tube((bx, r_bottom + 0.08, 1.55), (ex, er, 1.62), 0.012, GILT, 'newel_lamp', verts=5)
            k.sphere(ex, er, 1.7, 0.06, 0.07, '#fff0d0', 'lamp_globe', emit=('#ffd8a0', 1.2), segs=10)
        k.point_light(bx, r_bottom + 0.3, 1.8, '#ffd0a0', 14, radius=0.15, group='lamp')
    k.solid(x0, r_top, x1, r_bottom + 0.2)


def gallery(k, x0, x1, r_face, depth, z, gap=None, floor=MAHOG, fascia=IVORY, baluster=IVORY, rail=MAHOG, trim=GILT):
    """A landing along the back wall: its floor, a moulded fascia with a gilt line, brackets under it, a balustrade
    along its front edge (gap: (xa, xb) left open where the stair comes up)."""
    F = r_face + depth
    k.box(x0, r_face, z - 0.2, x1, F, z - 0.03, (fascia, 0.05), 'gallery')
    k.box(x0, r_face, z - 0.03, x1, F + 0.02, z, (floor, 0.08), 'gallery_floor')
    k.box(x0, F, z - 0.24, x1, F + 0.06, z - 0.04, (shade(fascia, 1.05), 0.04), 'gallery_fascia')
    k.box(x0, F + 0.06, z - 0.14, x1, F + 0.065, z - 0.12, trim, 'gallery_trim')
    br = []
    x = x0 + 0.4
    while x < x1 - 0.2:
        br.append((x - 0.06, F - 0.3, z - 0.5, x + 0.06, F + 0.02, z - 0.24))
        x += 1.1
    k.boxes(br, shade(fascia, 0.95), 'gallery_bracket')
    segs = [(x0, x1)] if not gap else [(x0, gap[0]), (gap[1], x1)]
    for (a, b) in segs:
        if b - a < 0.1:
            continue
        k.box(a, F - 0.06, z, b, F, z + 0.06, (rail, 0.06), 'gallery_rail')
        k.box(a, F - 0.08, z + 0.82, b, F + 0.02, z + 0.9, (rail, 0.06), 'gallery_rail')
        x = a + 0.1
        while x < b - 0.05:
            k.cyl(x, F - 0.03, z + 0.06, z + 0.82, 0.016, baluster, 'baluster', verts=6)
            k.sphere(x, F - 0.03, z + 0.3, 0.028, 0.06, baluster, 'baluster', segs=6)
            x += 0.18
        for xp in (a + 0.04, b - 0.04):
            k.box(xp - 0.06, F - 0.09, z, xp + 0.06, F + 0.03, z + 0.98, (rail, 0.06), 'gallery_post')
            k.sphere(xp, F - 0.03, z + 1.04, 0.06, 0.06, (rail, 0.06), 'gallery_post', segs=8)


# ---- books ---------------------------------------------------------------------------------------------------------------
def _books(k, x0, x1, r_back, z, hmax, out, depth=0.3, ornaments=True):
    """Fills a shelf: books standing in runs of a binding, the odd gap, a stack lying flat, gilt bands on the spines.
    out: {'books': {colour: [boxes]}, 'bands': [boxes], 'orn': [(x, z)]}"""
    x = x0 + 0.02
    while x < x1 - 0.05:
        roll = k.rng.random()
        if roll < 0.05:
            x += k.rng.uniform(0.08, 0.16)
            continue
        if roll < 0.11 and x < x1 - 0.3:                         # a stack lying on its side
            zz = z
            for j in range(k.rng.randint(2, 4)):
                w = k.rng.uniform(0.2, 0.28)
                t = k.rng.uniform(0.035, 0.055)
                col = k.rng.choice(BOOKS)
                out['books'].setdefault(col, []).append((x, r_back + 0.02, zz, x + w, r_back + depth - 0.04, zz + t))
                zz += t
            x += 0.32
            continue
        if ornaments and roll < 0.13 and x < x1 - 0.25:
            out['orn'].append((x + 0.1, z))
            x += 0.22
            continue
        col = k.rng.choice(BOOKS)
        run = k.rng.randint(1, 5)
        hh = hmax * k.rng.uniform(0.62, 0.95)
        for j in range(run):
            if x > x1 - 0.05:
                break
            w = k.rng.uniform(0.035, 0.075)
            h = min(hmax, hh * k.rng.uniform(0.96, 1.04))
            out['books'].setdefault(col, []).append((x, r_back + 0.02, z, x + w, r_back + depth - k.rng.uniform(0.0, 0.05), z + h))
            if k.rng.random() < 0.6:
                out['bands'].append((x, r_back + depth - 0.04, z + h * 0.78, x + w, r_back + depth - 0.035, z + h * 0.84))
                out['bands'].append((x, r_back + depth - 0.04, z + h * 0.18, x + w, r_back + depth - 0.035, z + h * 0.22))
            x += w + 0.006
        x += 0.004


def bookcase_wall(k, x0, x1, r_face, top=3.6, bay=1.05, wood=WALNUT, cupboard=0.78, d=0.42, shelf_h=0.43, rail=None,
                  cornice=True, ornaments=True):
    """Bookcases floor to ceiling: panelled cupboards below a moulded top, then bays of shelves between fluted
    pilasters, every shelf full of books, a cornice with dentils over it all, a brass rail for the library ladder.
    Returns the shelf heights and the bays' x ranges (for things to stand on the shelves)."""
    F = r_face + d
    k.box(x0, r_face, 0, x1, r_face + 0.03, top, (shade(wood, 0.42), 0.06), 'shelf_back')
    k.box(x0, r_face, 0, x1, F + 0.04, cupboard, (wood, 0.06), 'cupboard')
    k.box(x0 - 0.02, r_face, cupboard, x1 + 0.02, F + 0.1, cupboard + 0.05, (shade(wood, 1.15), 0.05), 'cupboard_top')
    k.box(x0, F + 0.02, 0, x1, F + 0.06, 0.1, (shade(wood, 0.75), 0.05), 'skirting')
    n = max(1, int(round((x1 - x0) / bay)))
    bw = (x1 - x0) / n
    doors, knobs = [], []
    for i in range(n):
        a = x0 + i * bw
        for j in range(2):
            da, db = a + 0.08 + j * (bw - 0.16) / 2 + 0.02, a + 0.08 + (j + 1) * (bw - 0.16) / 2 - 0.02
            doors += [(da, F + 0.04, 0.16, db, F + 0.065, 0.2), (da, F + 0.04, cupboard - 0.1, db, F + 0.065, cupboard - 0.06),
                      (da, F + 0.04, 0.16, da + 0.04, F + 0.065, cupboard - 0.06), (db - 0.04, F + 0.04, 0.16, db, F + 0.065, cupboard - 0.06)]
            knobs.append((db - 0.07 if j == 0 else da + 0.07, cupboard * 0.55))
    k.boxes(doors, shade(wood, 1.2), 'cupboard_moulding')
    for (x, z) in knobs:
        k.sphere(x, F + 0.075, z, 0.018, 0.018, GILT, 'knob', segs=6)
    levels = []
    z = cupboard + 0.05
    while z + shelf_h < top - 0.3:
        levels.append(z)
        z += shelf_h
    out = {'books': {}, 'bands': [], 'orn': []}
    boards, uprights, flutes = [], [], []
    for i in range(n):
        a, b = x0 + i * bw + 0.06, x0 + (i + 1) * bw - 0.06
        for zl in levels[1:] + [levels[-1] + shelf_h]:
            boards.append((a, r_face + 0.02, zl - 0.035, b, F - 0.02, zl))
        for zl in levels:
            _books(k, a + 0.02, b - 0.02, r_face + 0.04, zl, shelf_h - 0.06, out, depth=d - 0.08, ornaments=ornaments)
    for i in range(n + 1):
        x = x0 + i * bw
        uprights.append((x - 0.06, r_face, cupboard + 0.05, x + 0.06, F + 0.02, top - 0.24))
        for dx in (-0.025, 0.0, 0.025):
            flutes.append((x + dx - 0.006, F + 0.02, cupboard + 0.15, x + dx + 0.006, F + 0.026, top - 0.34))
    k.boxes(boards, (shade(wood, 1.1), 0.05), 'shelf')
    k.boxes(uprights, (wood, 0.05), 'bookcase_pilaster')
    k.boxes(flutes, shade(wood, 0.72), 'bookcase_pilaster')
    for col, bxs in out['books'].items():
        k.boxes(bxs, (col, 0.08), 'book')
    if out['bands']:
        k.boxes(out['bands'], GILT, 'book')
    for (x, z) in out['orn']:                                    # a few things among the books
        kind = k.rng.choice(('vase', 'skull', 'globe', 'box'))
        if kind == 'vase':
            vase(k, x, r_face + 0.2, z, s=0.6, col=k.rng.choice(('#2a4a8a', '#3a6a5a', '#8a2a2a')), band='#f0ece4')
        elif kind == 'skull':
            k.sphere(x, r_face + 0.22, z + 0.07, 0.06, 0.06, '#e8e0cc', 'curio', segs=10)
            k.box(x - 0.035, r_face + 0.22, z, x + 0.035, r_face + 0.3, z + 0.04, '#e8e0cc', 'curio')
        elif kind == 'globe':
            k.cyl(x, r_face + 0.2, z, z + 0.04, 0.05, GILT, 'curio', verts=8)
            k.sphere(x, r_face + 0.2, z + 0.13, 0.08, 0.08, ('#c8b888', 0.12), 'curio', segs=12)
        else:
            k.box(x - 0.08, r_face + 0.1, z, x + 0.08, r_face + 0.3, z + 0.09, ('#6a3a22', 0.1), 'curio')
            k.box(x - 0.085, r_face + 0.3, z + 0.03, x + 0.085, r_face + 0.305, z + 0.06, GILT, 'curio')
    if cornice:
        k.box(x0, r_face, top - 0.24, x1, F + 0.04, top - 0.12, (wood, 0.05), 'bookcase_cornice')
        k.box(x0 - 0.03, r_face, top - 0.12, x1 + 0.03, F + 0.1, top - 0.04, (shade(wood, 1.15), 0.05), 'bookcase_cornice')
        k.box(x0 - 0.06, r_face, top - 0.04, x1 + 0.06, F + 0.16, top + 0.04, (shade(wood, 1.05), 0.05), 'bookcase_cornice')
        dent = [(x, F + 0.04, top - 0.22, x + 0.05, F + 0.08, top - 0.14) for x in [x0 + 0.05 + 0.1 * i for i in range(int((x1 - x0 - 0.1) / 0.1))]]
        k.boxes(dent, shade(wood, 1.25), 'bookcase_cornice')
    if rail:
        k.cyl_x(x0 + 0.1, x1 - 0.1, F + 0.1, rail, 0.02, 0.02, GILT, 'ladder_rail', verts=8)
        brk = []
        x = x0 + 0.3
        while x < x1 - 0.2:
            brk.append((x - 0.02, F, rail - 0.02, x + 0.02, F + 0.1, rail + 0.02))
            x += 1.5
        k.boxes(brk, GILT, 'ladder_rail')
    k.solid(x0, r_face, x1, F + 0.08)
    return levels, [(x0 + i * bw, x0 + (i + 1) * bw) for i in range(n)]


def library_ladder(k, x, r_face, rail_z, foot_r, wood=MAHOG):
    """A library ladder hooked over the rail, its foot out on the floor on little wheels."""
    rails = []
    for s in (-1, 1):
        a = (x + s * 0.2, r_face + 0.12, rail_z + 0.05)
        b = (x + s * 0.24, foot_r, 0.06)
        k.tube(a, b, 0.025, (wood, 0.06), 'ladder', verts=6)
        rails.append((a, b))
        k.cyl_x(x + s * 0.24 - 0.02, x + s * 0.24 + 0.02, foot_r, 0.04, 0.04, 0.04, GILT, 'ladder_wheel', verts=10)
        k.tube((x + s * 0.2, r_face + 0.12, rail_z + 0.05), (x + s * 0.2, r_face + 0.1, rail_z + 0.12), 0.012, GILT, 'ladder_hook', verts=5)
    n = 9
    for i in range(1, n):
        t = i / n
        p = [rails[j][0][c] + (rails[j][1][c] - rails[j][0][c]) * t for j in range(2) for c in range(3)]
        k.tube((p[0], p[1], p[2]), (p[3], p[4], p[5]), 0.018, (shade(wood, 1.15), 0.06), 'ladder_rung', verts=5)
    k.solid(x - 0.3, foot_r - 0.4, x + 0.3, foot_r + 0.1)


def reading_lamp(k, cx, cr, z, energy=5.0, group='lamp'):
    """A banker's lamp: a brass stand, a green glass shade glowing on its underside."""
    k.cyl(cx, cr, z, z + 0.025, 0.07, GILT, 'lamp_base', verts=10)
    k.cyl(cx, cr - 0.03, z + 0.025, z + 0.2, 0.01, GILT, 'lamp_stem', verts=5)
    k.cyl_x(cx - 0.12, cx + 0.12, cr, z + 0.22, 0.06, 0.035, ('#1a6a3a', 0.04), 'lamp_shade', verts=10)
    k.box(cx - 0.11, cr - 0.04, z + 0.18, cx + 0.11, cr + 0.04, z + 0.19, '#fff0c0', 'lamp_glow', emit=('#ffe0a0', 1.5))
    k.point_light(cx, cr + 0.1, z + 0.15, '#ffe0a8', energy, radius=0.06, group=group)


def open_book(k, cx, cr, z, page='#f0e8d4', col='#6a2a2a'):
    k.box(cx - 0.15, cr - 0.1, z, cx + 0.15, cr + 0.1, z + 0.02, col, 'book_open')
    for s in (-1, 1):
        k.box(min(cx, cx + s * 0.14), cr - 0.09, z + 0.02, max(cx, cx + s * 0.14), cr + 0.09, z + 0.035 + (0.008 if s > 0 else 0), page, 'book_page')
    k.box(cx - 0.004, cr - 0.09, z + 0.02, cx + 0.004, cr + 0.09, z + 0.04, shade(page, 0.7), 'book_page')


def stack_of_books(k, cx, cr, z, n=4):
    for i in range(n):
        w, d = k.rng.uniform(0.22, 0.3), k.rng.uniform(0.15, 0.2)
        dx = k.rng.uniform(-0.03, 0.03)
        k.box(cx - w / 2 + dx, cr - d / 2, z, cx + w / 2 + dx, cr + d / 2, z + 0.045, (k.rng.choice(BOOKS), 0.08), 'book')
        z += 0.045
    return z


# ---- dining ---------------------------------------------------------------------------------------------------------------
def dining_chair(k, cx, cr, facing='down', seat=VELVET_R, wood=MAHOG, carver=False):
    """A dining chair: an upholstered seat, turned front legs, an oval back on carved stiles (arms for a carver)."""
    L = Local(k, cx, cr, facing)
    for (u, v) in ((-0.2, 0.18), (0.2, 0.18)):
        L.cyl(u, v, 0, 0.44, 0.022, (wood, 0.06), 'chair_leg', verts=6)
    for (u, v) in ((-0.19, -0.18), (0.19, -0.18)):
        L.box(u - 0.02, v - 0.02, 0, u + 0.02, v + 0.02, 1.05, (wood, 0.06), 'chair_stile')
    L.box(-0.23, -0.21, 0.4, 0.23, 0.22, 0.47, (wood, 0.06), 'chair_rail')
    L.box(-0.21, -0.19, 0.47, 0.21, 0.2, 0.52, (seat, 0.1), 'chair_seat', bevel=0.02)
    x, r = L.at(0, -0.19)
    if L.vr != 0:
        k.cyl_y(x, r - 0.015, r + 0.015, 0.8, 0.17, 0.22, (wood, 0.06), 'chair_back', verts=16)
        k.cyl_y(x, r - 0.02, r + 0.02, 0.8, 0.13, 0.17, (seat, 0.1), 'chair_back_pad', verts=16)
    else:
        k.cyl_x(x - 0.015, x + 0.015, r, 0.8, 0.17, 0.22, (wood, 0.06), 'chair_back', verts=16)
        k.cyl_x(x - 0.02, x + 0.02, r, 0.8, 0.13, 0.17, (seat, 0.1), 'chair_back_pad', verts=16)
    L.sphere(0, -0.19, 1.05, 0.03, 0.03, GILT, 'chair_crest', segs=6)
    if carver:
        for s in (-1, 1):
            L.box(s * 0.22 - 0.025, -0.15, 0.68, s * 0.22 + 0.025, 0.18, 0.72, (wood, 0.06), 'chair_arm')
            L.cyl(s * 0.22, 0.16, 0.47, 0.7, 0.018, (wood, 0.06), 'chair_arm', verts=6)


def place_setting(k, cx, cr, z, toward=1, gilt=GILT):
    """A place laid at a table, for someone sitting on the side `toward` points away from (+1: the far side): a gilt
    charger, a plate, a folded napkin, silver either side, a wine glass and a water glass."""
    k.cyl(cx, cr, z, z + 0.008, 0.13, gilt, 'charger', verts=16)
    k.cyl(cx, cr, z + 0.008, z + 0.016, 0.1, '#f4f0e8', 'plate', verts=16)
    k.cyl(cx, cr, z + 0.016, z + 0.018, 0.075, '#2a4a8a', 'plate_rim', verts=16)
    k.cyl(cx, cr, z + 0.018, z + 0.02, 0.068, '#f4f0e8', 'plate', verts=16)
    k.cone(cx, cr, z + 0.02, z + 0.12, 0.05, 0.008, '#f8f4ec', 'napkin', verts=4)
    for s in (-1, 1):
        for j in range(2):
            x = cx + s * (0.15 + j * 0.035)
            k.box(x - 0.008, cr - 0.08, z, x + 0.008, cr + 0.08, z + 0.008, SILVER, 'silver')
    gx, gr = cx + 0.14, cr - toward * 0.13
    k.cyl(gx, gr, z, z + 0.006, 0.03, '#d8e8f0', 'glass', verts=8)
    k.cyl(gx, gr, z, z + 0.08, 0.006, '#d8e8f0', 'glass', verts=5)
    k.cone(gx, gr, z + 0.08, z + 0.15, 0.022, 0.035, '#c8dce8', 'glass', emit=('#8090a0', 0.3), verts=10)
    k.cyl(gx, gr, z + 0.085, z + 0.11, 0.02, '#7a1a2a', 'wine', verts=8)
    k.cyl(gx - 0.08, gr, z, z + 0.11, 0.025, '#c8dce8', 'glass', emit=('#8090a0', 0.3), verts=10)


def long_table(k, x0, x1, cr, d=1.1, h=0.78, wood=MAHOG, cloth=LINEN, places=5, chairs=True, seat=VELVET_R, centre=True):
    """A long dining table laid for dinner: a damask cloth hanging to the knee, places down both sides with a carver
    at each end, candelabra and flowers down the middle, a silver tureen, fruit, decanters of wine."""
    r0, r1 = cr - d / 2, cr + d / 2
    for x in (x0 + 0.15, x1 - 0.15):
        for r in (r0 + 0.15, r1 - 0.15):
            k.cyl(x, r, 0, h - 0.1, 0.045, (wood, 0.06), 'table_leg', verts=8)
            k.sphere(x, r, 0.25, 0.06, 0.09, (wood, 0.06), 'table_leg', segs=8)
    k.box(x0 - 0.06, r0 - 0.06, h - 0.3, x1 + 0.06, r1 + 0.06, h, (cloth, 0.05), 'tablecloth')
    k.box(x0 - 0.065, r1 + 0.055, h - 0.31, x1 + 0.065, r1 + 0.065, h - 0.27, shade(cloth, 0.88), 'tablecloth_hem')
    k.box(x0, r0 + d * 0.38, h, x1, r1 - d * 0.38, h + 0.004, (VELVET_R, 0.06), 'table_runner')
    k.box(x0, r0 + d * 0.38 + 0.02, h + 0.004, x1, r0 + d * 0.38 + 0.04, h + 0.006, GILT, 'table_runner')
    k.box(x0, r1 - d * 0.38 - 0.04, h + 0.004, x1, r1 - d * 0.38 - 0.02, h + 0.006, GILT, 'table_runner')
    L = x1 - x0
    xs = [x0 + 0.5 + (L - 1.0) * (i + 0.5) / places for i in range(places)]
    z = h + 0.002
    for x in xs:
        place_setting(k, x, r0 + 0.2, z, toward=-1)
        place_setting(k, x, r1 - 0.2, z, toward=1)
    place_setting(k, x0 + 0.22, cr, z, toward=1)
    place_setting(k, x1 - 0.22, cr, z, toward=1)
    if chairs:
        for x in xs:
            dining_chair(k, x, r0 - 0.32, 'down', seat=seat, wood=wood)
            dining_chair(k, x, r1 + 0.32, 'up', seat=seat, wood=wood)
        dining_chair(k, x0 - 0.36, cr, 'right', seat=seat, wood=wood, carver=True)
        dining_chair(k, x1 + 0.36, cr, 'left', seat=seat, wood=wood, carver=True)
    if centre:
        zc = h + 0.006
        n = max(2, places - 1)
        mids = [x0 + L * (i + 1) / (n + 1) for i in range(n)]
        for i, x in enumerate(mids):
            if i % 2 == 0:
                candelabrum(k, x, cr, zc, arms=5, s=1.15, energy=4.0)
            else:
                k.cyl(x, cr, zc, zc + 0.04, 0.1, SILVER, 'epergne', verts=12)
                k.cyl(x, cr, zc + 0.04, zc + 0.22, 0.02, SILVER, 'epergne', verts=6)
                k.cyl(x, cr, zc + 0.22, zc + 0.27, 0.16, SILVER, 'epergne', verts=14)
                bouquet(k, x, cr, zc + 0.26, s=1.1, kind='white', mix=['rose'])
        for (x, kind) in ((x0 + L * 0.5 / (n + 1) + 0.05, 'fruit'), (x1 - L * 0.5 / (n + 1) - 0.05, 'tureen')):
            if kind == 'fruit':
                k.cyl(x, cr, zc, zc + 0.08, 0.04, SILVER, 'fruit_stand', verts=8)
                k.cyl(x, cr, zc + 0.08, zc + 0.11, 0.15, SILVER, 'fruit_stand', verts=14)
                for i in range(9):
                    a = i * 2.4
                    col = ('#e8c040', '#c84030', '#8ab040', '#5a2a5a')[i % 4]
                    k.sphere(x + math.cos(a) * 0.08 * (i % 3) / 2, cr + math.sin(a) * 0.06 * (i % 3) / 2, zc + 0.15 + 0.04 * (i // 4), 0.045, 0.045, col, 'fruit', segs=8)
            else:
                k.cyl(x, cr, zc, zc + 0.04, 0.08, SILVER, 'tureen', verts=12)
                k.sphere(x, cr, zc + 0.12, 0.14, 0.1, (SILVER, 0.03), 'tureen', ry=0.1, segs=14)
                k.sphere(x, cr, zc + 0.22, 0.03, 0.03, SILVER, 'tureen', segs=6)
        for (x, wine) in ((xs[0] + 0.3, '#6a1020'), (xs[-1] - 0.3, '#c8a040')):
            k.cyl(x, cr + 0.08, zc, zc + 0.16, 0.05, '#c8d8e0', 'decanter', emit=('#607080', 0.25), verts=10)
            k.cyl(x, cr + 0.08, zc + 0.01, zc + 0.12, 0.046, wine, 'decanter_wine', verts=10)
            k.sphere(x, cr + 0.08, zc + 0.2, 0.03, 0.035, '#c8d8e0', 'decanter', segs=8)
    k.solid(x0 - 0.06, r0 - 0.06, x1 + 0.06, r1 + 0.06)


def sideboard(k, x0, x1, r_face, d=0.55, h=0.95, wood=MAHOG, silver=True):
    """A serpentine mahogany sideboard: cupboards and drawers with brass handles, a gallery rail, and on it the silver:
    a tea urn, salvers, a pair of decanters, knife boxes, candlesticks."""
    F = r_face + d
    k.box(x0, r_face, 0.1, x1, F, h - 0.04, (wood, 0.06), 'sideboard')
    k.box(x0 - 0.03, r_face, h - 0.04, x1 + 0.03, F + 0.04, h, (shade(wood, 1.12), 0.05), 'sideboard_top')
    for x in (x0 + 0.06, x1 - 0.06, (x0 + x1) / 2 - 0.3, (x0 + x1) / 2 + 0.3):
        k.box(x - 0.04, F - 0.08, 0, x + 0.04, F, 0.12, (wood, 0.06), 'sideboard_leg')
    n = 3
    w = (x1 - x0) / n
    pan, pulls = [], []
    for i in range(n):
        a, b = x0 + i * w + 0.06, x0 + (i + 1) * w - 0.06
        pan += [(a, F, h - 0.24, b, F + 0.02, h - 0.1)]
        pan += [(a, F, 0.18, b, F + 0.015, h - 0.3)]
        pulls.append(((a + b) / 2, h - 0.17))
        pulls.append(((a + b) / 2 + (0.12 if i % 2 else -0.12), 0.45))
    k.boxes(pan, (shade(wood, 1.1), 0.06), 'sideboard_panel')
    for (x, z) in pulls:
        k.box(x - 0.05, F + 0.015, z - 0.012, x + 0.05, F + 0.03, z + 0.012, GILT, 'sideboard_pull')
    k.box(x0, r_face, h, x1, r_face + 0.04, h + 0.12, (wood, 0.06), 'sideboard_gallery')
    if silver:
        z = h
        cx = (x0 + x1) / 2
        k.cyl(cx, r_face + 0.25, z, z + 0.05, 0.07, SILVER, 'urn', verts=10)                       # the tea urn
        k.sphere(cx, r_face + 0.25, z + 0.2, 0.12, 0.15, (SILVER, 0.03), 'urn', segs=14)
        k.cyl(cx, r_face + 0.25, z + 0.33, z + 0.38, 0.05, SILVER, 'urn', verts=10)
        k.sphere(cx, r_face + 0.25, z + 0.41, 0.03, 0.03, SILVER, 'urn', segs=6)
        k.tube((cx, r_face + 0.36, z + 0.1), (cx, r_face + 0.42, z + 0.08), 0.012, SILVER, 'urn', verts=5)
        for s in (-1, 1):
            k.cyl(cx + s * 0.55, r_face + 0.26, z, z + 0.012, 0.16, SILVER, 'salver', verts=16)
            for (dx, wine) in ((-0.06, '#6a1020'), (0.06, '#b88a30')):
                x = cx + s * 0.55 + dx
                k.cyl(x, r_face + 0.26, z + 0.012, z + 0.2, 0.045, '#c8d8e0', 'decanter', emit=('#607080', 0.25), verts=10)
                k.cyl(x, r_face + 0.26, z + 0.02, z + 0.14, 0.042, wine, 'decanter_wine', verts=10)
                k.sphere(x, r_face + 0.26, z + 0.24, 0.025, 0.03, '#c8d8e0', 'decanter', segs=8)
            kx = x0 + 0.25 if s < 0 else x1 - 0.25                                                  # knife boxes
            k.box(kx - 0.12, r_face + 0.1, z, kx + 0.12, r_face + 0.34, z + 0.26, (shade(wood, 1.2), 0.06), 'knife_box')
            k.box(kx - 0.12, r_face + 0.1, z + 0.26, kx + 0.12, r_face + 0.24, z + 0.34, (shade(wood, 1.2), 0.06), 'knife_box')
            k.box(kx - 0.03, r_face + 0.34, z + 0.18, kx + 0.03, r_face + 0.345, z + 0.22, GILT, 'knife_box')
            candelabrum(k, cx + s * 0.95, r_face + 0.3, z, arms=1, s=1.0, energy=2.5)
    k.solid(x0, r_face, x1, F + 0.04)


def china_cabinet(k, x0, x1, r_face, top=2.5, d=0.42, wood=MAHOG):
    """A glazed cabinet of the best china: plates on stands, cups on hooks, a soup tureen, astragal glazing bars."""
    F = r_face + d
    k.box(x0, r_face, 0, x1, F, 0.9, (wood, 0.06), 'cabinet')
    k.box(x0 - 0.03, r_face, 0.9, x1 + 0.03, F + 0.05, 0.95, (shade(wood, 1.12), 0.05), 'cabinet')
    k.box(x0 + 0.02, r_face, 0.95, x1 - 0.02, r_face + 0.03, top, (shade(wood, 0.5), 0.05), 'cabinet_back')
    k.box(x0, r_face, 0.95, x0 + 0.06, F - 0.05, top, (wood, 0.06), 'cabinet')
    k.box(x1 - 0.06, r_face, 0.95, x1, F - 0.05, top, (wood, 0.06), 'cabinet')
    k.box(x0 - 0.05, r_face, top, x1 + 0.05, F + 0.06, top + 0.14, (shade(wood, 1.1), 0.05), 'cabinet')
    k.sphere((x0 + x1) / 2, r_face + 0.2, top + 0.2, 0.06, 0.06, GILT, 'cabinet', segs=8)
    shelves = [1.35, 1.8, 2.22]
    for z in [0.95] + shelves:
        k.box(x0 + 0.06, r_face + 0.03, z - 0.03, x1 - 0.06, F - 0.06, z, (shade(wood, 1.15), 0.05), 'cabinet_shelf')
        x = x0 + 0.18
        while x < x1 - 0.15:
            k.cyl_y(x, r_face + 0.06, r_face + 0.075, z + 0.14, 0.13, 0.13, '#f4f0e8', 'china', verts=14)
            k.cyl_y(x, r_face + 0.075, r_face + 0.08, z + 0.14, 0.1, 0.1, '#2a4a8a', 'china_rim', verts=14)
            k.cyl_y(x, r_face + 0.08, r_face + 0.085, z + 0.14, 0.08, 0.08, '#f4f0e8', 'china', verts=14)
            x += 0.3
        for i in range(int((x1 - x0 - 0.2) / 0.22)):
            xx = x0 + 0.2 + i * 0.22
            k.cyl(xx, r_face + 0.26, z, z + 0.07, 0.04, '#f4f0e8', 'china', verts=10)
    bars = []
    for i in range(1, 4):
        x = x0 + (x1 - x0) * i / 4
        bars.append((x - 0.012, F - 0.06, 0.95, x + 0.012, F - 0.04, top))
    for z in shelves:
        bars.append((x0, F - 0.06, z + 0.2, x1, F - 0.04, z + 0.22))
    k.boxes(bars, shade(wood, 1.05), 'cabinet_glazing')
    k.solid(x0, r_face, x1, F + 0.06)


# ---- the bedroom and the bath ----------------------------------------------------------------------------------------------
def four_poster(k, x0, x1, r0, r1, wood=MAHOG, drape=VELVET_B, cover=IVORY, accent=GILT, canopy_z=2.55, pattern=True):
    """A four-poster against the back wall: turned and reeded posts with urn finials, a carved headboard, an open
    tester with a pleated valance, curtains gathered at each post, piles of pillows and a bolster, an embroidered
    coverlet turned down over white sheets, a throw at the foot and a bench to sit on."""
    cxm = (x0 + x1) / 2
    posts = [(x0 + 0.06, r0 + 0.06), (x1 - 0.06, r0 + 0.06), (x0 + 0.06, r1 - 0.06), (x1 - 0.06, r1 - 0.06)]
    for (x, r) in posts:
        k.box(x - 0.07, r - 0.07, 0, x + 0.07, r + 0.07, 0.42, (wood, 0.06), 'bed_post')
        k.sphere(x, r, 0.5, 0.075, 0.09, (wood, 0.06), 'bed_post', segs=10)
        k.cone(x, r, 0.55, canopy_z, 0.055, 0.035, (wood, 0.06), 'bed_post', verts=10)
        for z in (0.95, 1.6, 2.2):
            k.cyl(x, r, z, z + 0.04, 0.055, (shade(wood, 1.15), 0.05), 'bed_post', verts=10)
        k.sphere(x, r, canopy_z + 0.08, 0.05, 0.06, accent, 'bed_finial', segs=8)
        k.cone(x, r, canopy_z + 0.12, canopy_z + 0.28, 0.04, 0.005, accent, 'bed_finial', verts=8)
    # the tester: rails round the top, a valance of pleats hanging from them (open above, so the bed shows)
    for (a, b) in ((posts[0], posts[1]), (posts[2], posts[3]), (posts[0], posts[2]), (posts[1], posts[3])):
        k.box(min(a[0], b[0]) - 0.04, min(a[1], b[1]) - 0.04, canopy_z - 0.06, max(a[0], b[0]) + 0.04, max(a[1], b[1]) + 0.04, canopy_z + 0.04, (wood, 0.06), 'bed_tester')
    pleats_a, pleats_b = [], []
    for (a, b, out) in ((posts[2], posts[3], 0.05), (posts[0], posts[1], -0.05)):
        x = a[0]
        i = 0
        while x < b[0]:
            (pleats_a if i % 2 else pleats_b).append((x, a[1] + out - 0.02, canopy_z - 0.28, x + 0.1, a[1] + out + 0.02, canopy_z - 0.04))
            x += 0.1
            i += 1
    k.boxes(pleats_a, (drape, 0.06), 'bed_valance')
    k.boxes(pleats_b, (shade(drape, 0.8), 0.06), 'bed_valance')
    k.box(posts[2][0], posts[2][1] + 0.06, canopy_z - 0.3, posts[3][0], posts[2][1] + 0.075, canopy_z - 0.27, accent, 'bed_valance_trim')
    for (x, r) in posts:                                       # curtains bunched at the posts
        side = -1 if x < cxm else 1
        k.cone(x - side * 0.08, r, 0.0, 0.5, 0.13, 0.09, (drape, 0.08), 'bed_curtain', verts=10)
        k.cyl(x - side * 0.08, r, 0.5, 1.1, 0.07, (drape, 0.08), 'bed_curtain', verts=10)
        k.cone(x - side * 0.08, r, 1.1, canopy_z - 0.1, 0.07, 0.13, (drape, 0.08), 'bed_curtain', verts=10)
        k.cyl(x - side * 0.08, r, 1.08, 1.13, 0.085, accent, 'bed_tieback', verts=10)
    # the headboard
    k.box(x0 + 0.12, r0, 0.3, x1 - 0.12, r0 + 0.1, 1.45, (wood, 0.06), 'headboard')
    k.cyl_y(cxm, r0, r0 + 0.1, 1.42, (x1 - x0) * 0.32, 0.22, (wood, 0.06), 'headboard', verts=20)
    k.box(x0 + 0.3, r0 + 0.1, 0.65, x1 - 0.3, r0 + 0.12, 1.3, (drape, 0.08), 'headboard_panel')
    k.box(x0 + 0.3, r0 + 0.12, 1.28, x1 - 0.3, r0 + 0.13, 1.3, accent, 'headboard_trim')
    k.sphere(cxm, r0 + 0.12, 1.55, 0.08, 0.06, accent, 'headboard_trim', ry=0.03, segs=10)
    # the bed itself
    k.box(x0 + 0.08, r0 + 0.1, 0.25, x1 - 0.08, r1 - 0.08, 0.45, (wood, 0.06), 'bed_frame')
    k.box(x0 + 0.1, r0 + 0.12, 0.45, x1 - 0.1, r1 - 0.1, 0.66, (LINEN, 0.04), 'mattress', bevel=0.03)
    k.box(x0 + 0.1, r0 + 0.12, 0.45, x1 - 0.1, r1 - 0.06, 0.62, (shade(cover, 0.9), 0.05), 'bed_skirt')
    cr0 = r0 + 0.95
    k.box(x0 + 0.06, cr0, 0.6, x1 - 0.06, r1 - 0.04, 0.7, (cover, 0.06), 'coverlet', bevel=0.02)
    k.box(x0 + 0.06, r1 - 0.06, 0.32, x1 - 0.06, r1 - 0.02, 0.7, (cover, 0.06), 'coverlet')
    k.box(x0 + 0.08, cr0 - 0.2, 0.66, x1 - 0.08, cr0 + 0.02, 0.72, (LINEN, 0.04), 'sheet_fold', bevel=0.02)
    if pattern:
        mot = []
        rr = cr0 + 0.18
        j = 0
        while rr < r1 - 0.15:
            xx = x0 + 0.25 + (0.12 if j % 2 else 0)
            while xx < x1 - 0.2:
                mot.append(diamond(xx, rr, 0.05, 0.05))
                xx += 0.24
            rr += 0.16
            j += 1
        flats(k, mot, 0.701, (shade(drape, 1.3), 0.0), 'coverlet')
        flats(k, [rect(x0 + 0.12, cr0 + 0.06, x1 - 0.12, cr0 + 0.09), rect(x0 + 0.12, r1 - 0.14, x1 - 0.12, r1 - 0.11)], 0.702, accent, 'coverlet')
    k.box(x0 + 0.06, r1 - 0.55, 0.7, x1 - 0.06, r1 - 0.25, 0.74, (drape, 0.08), 'bed_throw', bevel=0.02)
    k.cyl_x(x0 + 0.2, x1 - 0.2, r0 + 0.32, 0.74, 0.08, 0.08, (LINEN, 0.04), 'bolster', verts=12)
    pw = (x1 - x0 - 0.4) / 2
    for i in range(2):
        xa = x0 + 0.2 + i * pw
        k.box(xa + 0.02, r0 + 0.15, 0.66, xa + pw - 0.02, r0 + 0.45, 0.94, (LINEN, 0.04), 'pillow', bevel=0.06)
        k.box(xa + 0.08, r0 + 0.4, 0.66, xa + pw - 0.08, r0 + 0.62, 0.86, (shade(drape, 1.2), 0.06), 'cushion', bevel=0.05)
    k.box(cxm - 0.16, r0 + 0.55, 0.66, cxm + 0.16, r0 + 0.7, 0.86, (accent, 0.06), 'cushion', bevel=0.04)
    k.solid(x0, r0, x1, r1)


def bed_bench(k, x0, x1, cr, col=VELVET_B, wood=MAHOG):
    """An upholstered bench at the foot of a bed, buttoned, on turned legs."""
    for x in (x0 + 0.06, x1 - 0.06):
        for r in (cr - 0.16, cr + 0.16):
            k.cyl(x, r, 0, 0.3, 0.025, (wood, 0.06), 'bench_leg', verts=6)
    k.box(x0, cr - 0.2, 0.3, x1, cr + 0.2, 0.46, (col, 0.1), 'bench_seat', bevel=0.04)
    for i in range(int((x1 - x0) / 0.2)):
        k.sphere(x0 + 0.15 + i * 0.2, cr, 0.465, 0.014, 0.01, shade(col, 0.5), 'bench_button', segs=4)
    k.solid(x0, cr - 0.25, x1, cr + 0.25)


def dressing_table(k, cx, r_face, w=1.3, d=0.5, wood=MAHOG, skirt=None, mirror_col='#5a6a74'):
    """A dressing table: a kidney top on cabriole legs (or a silk skirt), a triple mirror with its wings angled in,
    scent bottles, a silver brush, a jewel box spilling pearls, a single rose; a stool before it."""
    F = r_face + d
    h = 0.74
    if skirt:
        k.box(cx - w / 2, r_face + 0.02, 0, cx + w / 2, F, h - 0.04, (skirt, 0.08), 'dressing_skirt')
        pl = []
        x = cx - w / 2
        while x < cx + w / 2 - 0.05:
            pl.append((x, F, 0, x + 0.05, F + 0.025, h - 0.06))
            x += 0.1
        k.boxes(pl, shade(skirt, 0.86), 'dressing_skirt')
    else:
        for x in (cx - w / 2 + 0.06, cx + w / 2 - 0.06):
            k.tube((x, F - 0.06, h - 0.1), (x, F - 0.02, 0.0), 0.025, (wood, 0.06), 'dressing_leg', rb=0.015, verts=6)
        k.box(cx - w / 2 + 0.04, r_face + 0.04, h - 0.18, cx + w / 2 - 0.04, F - 0.03, h - 0.04, (wood, 0.06), 'dressing_apron')
        k.box(cx - 0.2, F - 0.03, h - 0.15, cx + 0.2, F - 0.02, h - 0.07, (shade(wood, 1.15), 0.05), 'dressing_drawer')
    k.box(cx - w / 2 - 0.03, r_face, h - 0.04, cx + w / 2 + 0.03, F + 0.03, h, (shade(wood, 1.1), 0.05), 'dressing_top')
    mw = w * 0.34
    k.box(cx - mw / 2, r_face + 0.06, h, cx + mw / 2, r_face + 0.1, h + 0.78, (wood, 0.06), 'mirror_frame')
    k.box(cx - mw / 2 + 0.04, r_face + 0.1, h + 0.04, cx + mw / 2 - 0.04, r_face + 0.11, h + 0.74, (mirror_col, 0.04), 'mirror_glass', emit=('#2a343c', 0.35))
    k.cyl_y(cx, r_face + 0.06, r_face + 0.1, h + 0.78, mw / 2, 0.12, (wood, 0.06), 'mirror_frame', verts=16)
    for s in (-1, 1):                                         # the wings, angled in toward you
        xa, ra = cx + s * (mw / 2 + 0.01), r_face + 0.08
        xb, rb = cx + s * (mw / 2 + mw * 0.82), r_face + 0.28
        k.bar(xa, ra, xb, rb, h, h + 0.62, 0.035, (wood, 0.06), 'mirror_frame')
        k.bar(xa + (xb - xa) * 0.08, ra + (rb - ra) * 0.08 + 0.025, xa + (xb - xa) * 0.92, rb - (rb - ra) * 0.08 + 0.025, h + 0.04, h + 0.58, 0.01,
              (mirror_col, 0.04), 'mirror_glass', emit=('#2a343c', 0.35))
    z = h
    for (dx, col, hh) in ((-0.42, '#c86a8a', 0.1), (-0.35, '#8ab0c8', 0.13), (-0.28, '#e8c060', 0.08), (0.38, '#6a3a8a', 0.11)):
        k.cyl(cx + dx, F - 0.15, z, z + hh, 0.03, col, 'scent', emit=(shade(col, 0.5), 0.3), verts=8)
        k.sphere(cx + dx, F - 0.15, z + hh + 0.025, 0.02, 0.025, GILT, 'scent', segs=6)
    k.box(cx + 0.12, F - 0.25, z, cx + 0.3, F - 0.12, z + 0.08, ('#6a2a3a', 0.08), 'jewel_box')
    k.box(cx + 0.12, F - 0.27, z + 0.08, cx + 0.3, F - 0.25, z + 0.2, ('#6a2a3a', 0.08), 'jewel_box')
    for i in range(7):
        k.sphere(cx + 0.06 + i * 0.03, F - 0.06 - 0.02 * math.sin(i), z + 0.012, 0.012, 0.012, '#f4f0e8', 'pearls', segs=5)
    k.box(cx - 0.12, F - 0.16, z, cx + 0.04, F - 0.1, z + 0.025, SILVER, 'brush')
    k.cyl(cx + 0.5, r_face + 0.15, z, z + 0.18, 0.03, '#d8e8f0', 'bud_vase', emit=('#607080', 0.2), verts=8)
    k.sphere(cx + 0.5, r_face + 0.15, z + 0.24, 0.035, 0.035, '#c8384a', 'bloom', segs=8)
    candelabrum(k, cx - 0.55, r_face + 0.16, z, arms=1, s=0.9, energy=2.0)
    k.cyl(cx, F + 0.42, 0, 0.36, 0.2, (wood, 0.06), 'stool', verts=14)
    k.cyl(cx, F + 0.42, 0.36, 0.46, 0.22, (skirt or VELVET_R, 0.1), 'stool_cushion', verts=14)
    k.solid(cx - w / 2, r_face, cx + w / 2, F + 0.62)


def roll_top_bath(k, cx, cr, length=1.55, width=0.72, body='#2a4a5a', inside='#f2eee6', water='#9ab8c8', feet=GILT,
                  along='r'):
    """A roll-top bath on ball-and-claw feet: a deep tub (painted outside, white inside), its rolled rim, water in it
    with a glint, brass taps and a hand shower at one end, a caddy across it with a candle, soap and a book."""
    L, W = length / 2, width / 2

    def P(a, b):                                                   # along the bath, across it → room
        return (cx + b, cr + a) if along == 'r' else (cx + a, cr + b)
    rings = []
    for (z, f) in ((0.14, 0.82), (0.25, 0.92), (0.45, 0.98), (0.66, 1.0)):
        ring = []
        for i in range(28):
            t = 2 * math.pi * i / 28
            a, b = math.cos(t) * L * f, math.sin(t) * W * f
            a *= 1.0 + 0.06 * (1 if math.cos(t) > 0 else 0)
            x, r = P(a, b)
            ring.append((x, r, z))
        rings.append(ring)
    k.loft(rings, (body, 0.05), 'bath', closed=True)
    rim = []
    for i in range(28):
        t = 2 * math.pi * i / 28
        a, b = math.cos(t) * L * 1.02, math.sin(t) * W * 1.03
        rim.append(P(a, b))
    inner = []
    for i in range(28):
        t = 2 * math.pi * i / 28
        a, b = math.cos(t) * (L - 0.07), math.sin(t) * (W - 0.07)
        inner.append(P(a, b))
    import assets_casino as CA
    CA.rim(k, rim, inner, 0.64, 0.7, (inside, 0.03), 'bath_rim')
    k.loft([[(p[0], p[1], 0.64) for p in inner], [(p[0], p[1], 0.5) for p in inner]], (inside, 0.03), 'bath_inside', closed=True)
    CA.prism(k, inner, 0.49, 0.5, (water, 0.02), 'bath_water', emit=('#304858', 0.25))
    gx, gr = P(-L * 0.2, W * 0.2)
    k.box(gx - 0.18, gr - 0.02, 0.502, gx + 0.18, gr + 0.02, 0.503, '#e8f4f8', 'bath_water', emit=('#a0c0d0', 0.5))
    for (a, b) in ((L * 0.75, W * 0.7), (L * 0.75, -W * 0.7), (-L * 0.75, W * 0.7), (-L * 0.75, -W * 0.7)):
        x, r = P(a, b)
        k.sphere(x, r, 0.07, 0.06, 0.07, feet, 'bath_foot', segs=8)
        k.cone(x, r, 0.0, 0.05, 0.07, 0.04, feet, 'bath_foot', verts=8)
    tx, tr = P(-L - 0.02, 0)
    k.cyl(tx, tr, 0.0, 0.92, 0.025, feet, 'bath_taps', verts=6)
    k.tube((tx, tr, 0.92), P(-L + 0.18, 0) + (0.84,), 0.02, feet, 'bath_taps', verts=6)
    k.sphere(tx, tr, 0.78, 0.04, 0.03, feet, 'bath_taps', segs=8)
    for s in (-1, 1):
        x, r = P(-L - 0.02, s * 0.08)
        k.cyl(x, r, 0.8, 0.84, 0.03, '#f0ece4', 'bath_taps', verts=6)
    sx, sr = P(-L - 0.02, 0.12)
    k.tube((sx, sr, 0.82), (sx, sr, 1.1), 0.012, feet, 'bath_taps', verts=5)
    k.cyl(sx, sr, 1.1, 1.14, 0.04, feet, 'bath_taps', verts=8)
    cxa, cra = P(L * 0.15, -W - 0.04)
    cxb, crb = P(L * 0.15, W + 0.04)
    k.box(min(cxa, cxb) - (0.08 if along == 'r' else 0), min(cra, crb) - (0.08 if along != 'r' else 0), 0.7,
          max(cxa, cxb) + (0.08 if along == 'r' else 0), max(cra, crb) + (0.08 if along != 'r' else 0), 0.73, ('#8a6a44', 0.08), 'bath_caddy')
    mx, mr = P(L * 0.15, 0)
    k.cyl(mx, mr, 0.73, 0.82, 0.03, CANDLE, 'candle', verts=8)
    k.sphere(mx, mr, 0.85, 0.016, 0.03, FLAME_HOT, 'flame', emit=(FLAME_HOT, 4.0), segs=6)
    k.point_light(mx, mr + 0.1, 1.0, '#ffb868', 2.0, radius=0.05, group='flicker')
    bx, br = P(L * 0.15, W * 0.5)
    k.box(bx - 0.05, br - 0.04, 0.73, bx + 0.05, br + 0.04, 0.76, '#f0e0c0', 'soap')
    hx, hr = P(L * 0.15, -W * 0.55)
    k.box(hx - 0.07, hr - 0.06, 0.73, hx + 0.07, hr + 0.06, 0.76, '#3a4a6a', 'book')
    ax, ar = P(L * 0.5, W + 0.02)                                 # a towel over the side
    k.box(ax - (0.18 if along != 'r' else 0.02), ar - (0.18 if along == 'r' else 0.02), 0.3, ax + (0.18 if along != 'r' else 0.03),
          ar + (0.18 if along == 'r' else 0.03), 0.71, ('#f4f0e6', 0.08), 'towel', bevel=0.02)
    a, b = P(-L - 0.1, -W - 0.05), P(L + 0.1, W + 0.05)
    k.solid(min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1]))


def folding_screen(k, x0, r0, x1, r1, panels=4, h=1.7, frame=MAHOG, cloth='#e8dcc4', paint=True):
    """A folding screen zig-zagging from (x0, r0) to (x1, r1): framed panels of painted silk, birds on a branch."""
    pts = []
    for i in range(panels + 1):
        t = i / panels
        x = x0 + (x1 - x0) * t
        r = r0 + (r1 - r0) * t + (0.18 if i % 2 else 0.0)
        pts.append((x, r))
    for (a, b) in zip(pts, pts[1:]):
        k.bar(a[0], a[1], b[0], b[1], 0.06, h, 0.04, (cloth, 0.06), 'screen_panel')
        k.bar(a[0], a[1], b[0], b[1], h, h + 0.05, 0.05, (frame, 0.06), 'screen_frame')
        k.bar(a[0], a[1], b[0], b[1], 0.04, 0.1, 0.05, (frame, 0.06), 'screen_frame')
        k.cyl(a[0], a[1], 0.0, h + 0.06, 0.03, (frame, 0.06), 'screen_frame', verts=6)
        if paint:
            mx, mr = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            k.tube((a[0] + (b[0] - a[0]) * 0.2, a[1] + (b[1] - a[1]) * 0.2 + 0.025, 0.7), (mx, mr + 0.025, 1.2), 0.012, '#4a3a2a', 'screen_paint', verts=4)
            for j in range(3):
                k.sphere(mx + (b[0] - a[0]) * (0.1 * j - 0.1), mr + 0.03, 1.0 + 0.12 * j, 0.03, 0.03, ('#c8384a', '#e890a0', '#f0f0e8')[j], 'screen_paint', segs=6)
            k.sphere(mx + (b[0] - a[0]) * 0.15, mr + 0.03, 1.3, 0.04, 0.03, '#2a5a8a', 'screen_paint', segs=6)
    k.cyl(pts[-1][0], pts[-1][1], 0.0, h + 0.06, 0.03, (frame, 0.06), 'screen_frame', verts=6)
    k.solid(min(x0, x1), min(r0, r1), max(x0, x1), max(r0, r1) + 0.2)


def armoire(k, x0, x1, r_face, d=0.6, h=2.3, wood=MAHOG):
    """A tall armoire: panelled doors with a mirror in one, a carved cornice with a crest, bracket feet."""
    F = r_face + d
    k.box(x0, r_face, 0.1, x1, F, h, (wood, 0.06), 'armoire')
    for x in (x0 + 0.05, x1 - 0.05):
        k.box(x - 0.05, F - 0.1, 0, x + 0.05, F, 0.12, (wood, 0.06), 'armoire')
    k.box(x0 - 0.05, r_face, h, x1 + 0.05, F + 0.06, h + 0.1, (shade(wood, 1.1), 0.05), 'armoire_cornice')
    k.box(x0 - 0.08, r_face, h + 0.1, x1 + 0.08, F + 0.09, h + 0.16, (shade(wood, 1.15), 0.05), 'armoire_cornice')
    k.cyl_y((x0 + x1) / 2, F, F + 0.06, h + 0.16, 0.3, 0.14, (shade(wood, 1.15), 0.05), 'armoire_cornice', verts=14)
    xm = (x0 + x1) / 2
    k.box(xm - 0.005, F, 0.15, xm + 0.005, F + 0.01, h - 0.05, shade(wood, 0.5), 'armoire_seam')
    k.box(x0 + 0.1, F, 0.3, xm - 0.08, F + 0.015, h - 0.2, ('#5a6a74', 0.04), 'mirror_glass', emit=('#2a343c', 0.3))
    k.box(xm + 0.08, F, 0.3, x1 - 0.1, F + 0.02, h - 0.2, (shade(wood, 1.12), 0.06), 'armoire_panel')
    k.box(xm + 0.14, F + 0.02, 0.36, x1 - 0.16, F + 0.025, h - 0.26, (shade(wood, 0.95), 0.06), 'armoire_panel')
    for x in (xm - 0.04, xm + 0.04):
        k.box(x - 0.012, F + 0.01, h * 0.48, x + 0.012, F + 0.03, h * 0.56, GILT, 'armoire_handle')
    k.solid(x0, r_face, x1, F)


def chaise_longue(k, cx, cr, length=1.6, col='#c8a8b0', wood='#c8a050', head='left'):
    """A chaise longue: a long buttoned seat, a scrolled end to lean on, a bolster, a cashmere shawl thrown over it."""
    h = length / 2
    s = -1 if head == 'left' else 1
    for x in (cx - h + 0.08, cx + h - 0.08):
        for r in (cr - 0.24, cr + 0.24):
            k.cyl(x, r, 0, 0.16, 0.025, (wood, 0.06), 'chaise_leg', verts=6)
    k.box(cx - h, cr - 0.3, 0.16, cx + h, cr + 0.3, 0.42, (col, 0.08), 'chaise', bevel=0.04)
    hx = cx + s * (h - 0.12)
    k.box(hx - 0.13, cr - 0.3, 0.42, hx + 0.13, cr + 0.3, 0.72, (shade(col, 0.92), 0.08), 'chaise_end', bevel=0.04)
    k.cyl_y(hx + s * 0.06, cr - 0.32, cr + 0.32, 0.78, 0.12, 0.1, (shade(col, 0.98), 0.08), 'chaise_end', verts=14)
    k.cyl_y(hx - s * 0.2, cr - 0.28, cr + 0.28, 0.5, 0.08, 0.08, (shade(col, 1.12), 0.06), 'bolster', verts=12)
    k.box(cx - s * 0.2, cr - 0.3, 0.42, cx - s * 0.2 + s * 0.5, cr + 0.3, 0.46, ('#5a7a9a', 0.12), 'shawl', bevel=0.02)
    k.box(cx - s * 0.2, cr + 0.28, 0.12, cx - s * 0.2 + s * 0.5, cr + 0.33, 0.46, ('#5a7a9a', 0.12), 'shawl')
    k.solid(cx - h, cr - 0.3, cx + h, cr + 0.3)


# ---- the Starling: rattan, palms, fans, the bar ---------------------------------------------------------------------------
RATTAN, RATTAN_D, BAMBOO = '#c8a46a', '#9a7a48', '#d8bc80'
SEA_BLUE, SAIL_WHITE = '#2e5a8a', '#f2eee4'


def rattan_chair(k, cx, cr, facing='down', cushion=SAIL_WHITE, stripe=SEA_BLUE, solid=True):
    """A rattan tub chair: a round woven back sweeping into the arms (bands of cane, lighter and darker), a fat
    cushion with a blue ticking stripe, bamboo legs."""
    L = Local(k, cx, cr, facing)
    for (u, v) in ((-0.24, -0.2), (0.24, -0.2), (-0.24, 0.22), (0.24, 0.22)):
        L.cyl(u, v, 0, 0.2, 0.025, BAMBOO, 'rattan_leg', verts=6)
    L.box(-0.3, -0.28, 0.2, 0.3, 0.3, 0.36, (RATTAN, 0.12), 'rattan', bevel=0.03)
    rings_out = []
    for (z, f) in ((0.36, 1.0), (0.55, 1.02), (0.78, 1.04), (0.92, 1.0)):
        ring = []
        for i in range(15):
            t = math.pi * (1 + i / 14)                     # the back half of a circle, round to the arms
            u, v = math.cos(t) * 0.34 * f, math.sin(t) * 0.32 * f * (0.3 if z < 0.6 and abs(math.cos(t)) > 0.8 else 1.0)
            x, r = L.at(u, v + 0.02)
            ring.append((x, r, z if (abs(math.cos(t)) < 0.85 or z < 0.65) else min(z, 0.62)))
        rings_out.append(ring)
    k.loft(rings_out, (RATTAN, 0.14), 'rattan_back')
    for z in (0.5, 0.66, 0.82):                             # the weave's bands
        pts = []
        for i in range(15):
            t = math.pi * (1 + i / 14)
            x, r = L.at(math.cos(t) * 0.355, math.sin(t) * 0.34 + 0.02)
            pts.append((x, r, z if (abs(math.cos(t)) < 0.85 or z < 0.65) else 0.6))
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.012, RATTAN_D, 'rattan_band', verts=4, smooth=False)
    L.box(-0.24, -0.18, 0.36, 0.24, 0.26, 0.48, (cushion, 0.05), 'rattan_cushion', bevel=0.04)
    L.box(-0.06, -0.18, 0.48, 0.06, 0.26, 0.485, stripe, 'rattan_stripe')
    L.box(-0.2, -0.3, 0.46, 0.2, -0.18, 0.78, (cushion, 0.05), 'rattan_cushion', bevel=0.05)
    if solid:
        L.solid(-0.36, -0.34, 0.36, 0.32)


def peacock_chair(k, cx, cr, cushion='#e8b0a0', solid=True):
    """A peacock chair facing the room: a huge fan of a back in woven rattan with radiating ribs, on an hourglass base."""
    k.cone(cx, cr, 0.0, 0.3, 0.26, 0.12, (RATTAN, 0.12), 'rattan', verts=14)
    k.cone(cx, cr, 0.3, 0.42, 0.12, 0.3, (RATTAN, 0.12), 'rattan', verts=14)
    k.cyl(cx, cr, 0.42, 0.5, 0.28, (cushion, 0.06), 'rattan_cushion', verts=16)
    fan = [(cx, cr - 0.2, 0.5)]
    ribs = []
    for i in range(17):
        a = math.pi * i / 16
        p = (cx + math.cos(a) * 0.62, cr - 0.28, 0.5 + math.sin(a) * 1.0)
        fan.append(p)
        ribs.append(p)
    tri = [[fan[0], fan[i], fan[i + 1]] for i in range(1, len(fan) - 1)]
    tris(k, tri, (RATTAN, 0.14), 'rattan_back')
    for p in ribs[1:-1]:
        k.tube((cx, cr - 0.19, 0.52), (p[0], p[1] + 0.02, p[2]), 0.01, RATTAN_D, 'rattan_band', verts=4, smooth=False)
    for f in (0.55, 0.8):
        pts = [(cx + math.cos(math.pi * i / 16) * 0.62 * f, cr - 0.255, 0.5 + math.sin(math.pi * i / 16) * 1.0 * f) for i in range(17)]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.012, RATTAN_D, 'rattan_band', verts=4, smooth=False)
    if solid:
        k.solid(cx - 0.32, cr - 0.32, cx + 0.32, cr + 0.32)


def ceiling_fan(k, cx, cr, z, blades=5, rad=0.62, body='#b08a50', blade=RATTAN, top=None):
    """A ceiling fan hanging over the room: a downrod, the motor's brass housing, five woven palm-leaf blades on their
    irons, a frosted lamp under it."""
    k.cyl(cx, cr, z + 0.12, top or z + 0.6, 0.016, body, 'fan_rod', verts=6)
    k.cyl(cx, cr, z, z + 0.12, 0.09, (body, 0.04), 'fan_body', verts=12)
    k.sphere(cx, cr, z - 0.04, 0.06, 0.05, '#f4ecd8', 'fan_lamp', emit=('#ffe0b0', 0.5), segs=10)
    leaves = []
    for i in range(blades):
        a = 2 * math.pi * i / blades + 0.3
        ca, sa = math.cos(a), math.sin(a)
        k.tube((cx, cr, z + 0.06), (cx + ca * 0.18, cr + sa * 0.18 * 0.9, z + 0.05), 0.012, body, 'fan_iron', verts=4)
        pts = []
        for j in range(7):
            t = j / 6
            ln = 0.15 + t * (rad - 0.15)
            wdt = 0.07 * math.sin(math.pi * (0.15 + 0.85 * t)) + 0.02
            pts.append((ln, wdt))
        for (l0, w0), (l1, w1) in zip(pts, pts[1:]):
            p = [(cx + ca * l0 - sa * w0, cr + (sa * l0 + ca * w0) * 0.9, z + 0.05), (cx + ca * l1 - sa * w1, cr + (sa * l1 + ca * w1) * 0.9, z + 0.05),
                 (cx + ca * l1 + sa * w1, cr + (sa * l1 - ca * w1) * 0.9, z + 0.04), (cx + ca * l0 + sa * w0, cr + (sa * l0 - ca * w0) * 0.9, z + 0.04)]
            leaves.append([p[0], p[1], p[2]])
            leaves.append([p[0], p[2], p[3]])
    tris(k, leaves, (blade, 0.14), 'fan_blade')


def hurricane_lamp(k, cx, cr, z, energy=4.0, group='flicker', s=1.0):
    """A hurricane lamp: a brass base, a candle inside a tall glass chimney that glows."""
    k.cyl(cx, cr, z, z + 0.04 * s, 0.07 * s, GILT, 'lamp_base', verts=10)
    k.cyl(cx, cr, z + 0.04 * s, z + 0.12 * s, 0.025 * s, CANDLE, 'candle', verts=8)
    k.sphere(cx, cr, z + 0.15 * s, 0.018 * s, 0.03 * s, FLAME_HOT, 'flame', emit=(FLAME_HOT, 4.0), segs=6)
    k.cyl(cx, cr, z + 0.04 * s, z + 0.3 * s, 0.065 * s, '#e8f0f0', 'lamp_glass', emit=('#ffd8a0', 0.4), verts=12)
    if energy:
        k.point_light(cx, cr + 0.1, z + 0.25 * s, '#ffc078', energy, radius=0.06, group=group)


def life_ring(k, cx, r_face, z, name_col=SEA_BLUE):
    """A cork life ring on the wall, red and white quarters, a line round it."""
    for i in range(8):
        a0, a1 = 2 * math.pi * i / 8, 2 * math.pi * (i + 1) / 8
        pts = ell(cx, z, 0.24, 0.24, 4, a0, a1) + [(cx + math.cos(a1) * 0.24, z + math.sin(a1) * 0.24),
                                                    (cx + math.cos(a1) * 0.14, z + math.sin(a1) * 0.14)] + \
            list(reversed(ell(cx, z, 0.14, 0.14, 4, a0, a1)))
        facing(k, [pts], r_face + 0.06 + (i % 2) * 0.002, ('#d83a2e' if i % 2 else '#f2eee4', 0.06), 'life_ring')
    k.box(cx - 0.26, r_face, z - 0.02, cx + 0.26, r_face + 0.07, z + 0.02, '#c8b48a', 'life_ring_line')


def terrace_balustrade(k, x0, x1, r, h=0.95, col='#f0ece2', gaps=()):
    """A white stone balustrade: a plinth rail, vase-shaped balusters, a broad top rail, piers every couple of tiles."""
    segs = [(x0, x1)]
    for (ga, gb) in gaps:
        segs = [s for seg in segs for s in ((seg[0], min(seg[1], ga)), (max(seg[0], gb), seg[1])) if s[1] - s[0] > 0.05]
    for (a, b) in segs:
        k.box(a, r - 0.12, 0, b, r + 0.12, 0.14, (shade(col, 0.95), 0.06), 'balustrade')
        k.box(a - 0.02, r - 0.15, h - 0.12, b + 0.02, r + 0.15, h, (col, 0.06), 'balustrade_rail')
        x = a + 0.12
        while x < b - 0.08:
            k.cyl(x, r, 0.14, 0.24, 0.05, col, 'baluster', verts=8)
            k.sphere(x, r, 0.42, 0.065, 0.16, (col, 0.04), 'baluster', segs=10)
            k.cyl(x, r, 0.5, h - 0.12, 0.035, col, 'baluster', verts=8)
            x += 0.2
        n = max(1, int((b - a) / 2.2))
        for i in range(n + 1):
            px = a + (b - a) * i / n
            px = min(b - 0.14, max(a + 0.14, px))
            k.box(px - 0.14, r - 0.17, 0, px + 0.14, r + 0.17, h + 0.06, (shade(col, 1.02), 0.06), 'balustrade_pier')
    k.solid(x0, r - 0.17, x1, r + 0.17)


def bougainvillea(k, cx, cr, z=0.0, s=1.0, pot='#c86a3a', bloom=('#d83a8a', '#f070b0', '#b82a6a')):
    """A bougainvillea in a big terracotta pot: a mound of leaves smothered in magenta bracts."""
    k.cone(cx, cr, z, z + 0.4 * s, 0.17 * s, 0.24 * s, (pot, 0.08), 'pot', verts=14)
    k.cyl(cx, cr, z + 0.4 * s, z + 0.45 * s, 0.26 * s, (shade(pot, 1.08), 0.06), 'pot', verts=14)
    for i in range(14):
        a = i * 2.39996
        rad = 0.28 * s * math.sqrt((i + 1) / 14)
        k.sphere(cx + math.cos(a) * rad, cr + math.sin(a) * rad * 0.7, z + 0.62 * s + (i % 3) * 0.06 * s, 0.13 * s, 0.11 * s, ('#3e6a32', 0.14), 'shrub', segs=8)
    for i in range(34):
        a = i * 2.39996
        rad = 0.32 * s * math.sqrt((i + 0.5) / 34)
        zz = z + 0.6 * s + 0.2 * s * math.cos(rad / (0.34 * s) * math.pi / 2) + (i % 4) * 0.02 * s
        k.sphere(cx + math.cos(a) * rad, cr + math.sin(a) * rad * 0.7, zz, 0.045 * s, 0.035 * s, bloom[i % 3], 'bloom', segs=6)
    k.solid(cx - 0.27 * s, cr - 0.27 * s, cx + 0.27 * s, cr + 0.27 * s)


def colonnade(k, x0, x1, r, h=2.7, step=2.0, col='#f0ece2', beam=True, voile='#f6f2ea'):
    """A row of slim white columns with a beam over them (the line between the lobby and the terrace), white voile
    tied back at each column."""
    n = max(1, int(round((x1 - x0) / step)))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        k.box(x - 0.14, r - 0.14, 0, x + 0.14, r + 0.14, 0.14, (shade(col, 0.95), 0.05), 'column_base')
        k.cyl(x, r, 0.14, h - 0.16, 0.09, (col, 0.04), 'column', verts=14)
        k.box(x - 0.13, r - 0.13, h - 0.16, x + 0.13, r + 0.13, h - 0.06, (shade(col, 1.04), 0.05), 'column_cap')
        if voile and 0 < i < n:
            for s in (-1, 1):
                k.cone(x + s * 0.18, r + 0.05, 0.0, 1.1, 0.1, 0.05, (voile, 0.04), 'voile', verts=8)
                k.cone(x + s * 0.18, r + 0.05, 1.1, h - 0.1, 0.05, 0.12, (voile, 0.04), 'voile', verts=8)
    if beam:
        k.box(x0 - 0.14, r - 0.16, h - 0.06, x1 + 0.14, r + 0.16, h + 0.14, (col, 0.04), 'beam')
        k.box(x0 - 0.14, r + 0.16, h + 0.02, x1 + 0.14, r + 0.17, h + 0.06, SEA_BLUE, 'beam_trim')
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        k.solid_post(x, r)


def starling_bar(k, cx, cr, w=4.4, d=2.6, stools=()):
    """The Starling's cocktail bar, standing on its own: a racetrack of woven rattan banded in cane, a pale zinc top,
    a round tower of lit glass shelves in the middle, bottles in every colour of a sunset, glasses, a bowl of limes and
    lemons, a cocktail shaker; bamboo stools with striped cushions round the front."""
    import assets_casino as CA
    outer = CA.stadium(cx, cr, w, d, n=12)
    inner = CA.stadium(cx, cr, w - 1.0, d - 1.0, n=12)
    CA.rim(k, outer, inner, 0.0, 1.0, (RATTAN, 0.14), 'bar_ring')
    for z in (0.22, 0.48, 0.74):
        CA.rail(k, CA.stadium(cx, cr, w + 0.02, d + 0.02, n=12), z, 0.018, RATTAN_D, 'bar_band', verts=4)
    CA.rim(k, CA.stadium(cx, cr, w + 0.12, d + 0.12, n=12), CA.stadium(cx, cr, w - 1.1, d - 1.1, n=12), 1.0, 1.06, ('#b07a48', 0.08), 'bar_top')
    CA.rail(k, CA.stadium(cx, cr, w + 0.14, d + 0.14, n=12), 1.03, 0.03, SEA_BLUE, 'bar_edge', verts=6)
    rad = min(0.5, d / 2 - 0.75)
    k.cyl(cx, cr, 0.0, 2.3, rad * 0.55, ('#e8e0d0', 0.05), 'bar_tower', verts=16)
    cols = ('#e86a3a', '#e8c040', '#f0a0b0', '#40a0c8', '#80c060', '#f4f0e8', '#c84060')
    for li, zz in enumerate((1.2, 1.62, 2.04)):
        k.cyl(cx, cr, zz - 0.03, zz, rad, ('#d8f0f0', 0.02), 'bar_shelf', emit=('#6a8a8a', 0.3), verts=18)
        for i in range(12):
            a = 2 * math.pi * i / 12 + li * 0.3
            col = cols[(i + li * 2) % len(cols)]
            k.cyl(cx + math.cos(a) * (rad - 0.1), cr + math.sin(a) * (rad - 0.1) * 0.9, zz, zz + 0.26 + (i % 3) * 0.04, 0.04, (col, 0.05), 'bottle',
                  emit=(col, 0.3), verts=6)
    k.cyl(cx, cr, 2.3, 2.36, rad + 0.08, ('#c8a46a', 0.1), 'bar_tower', verts=18)
    k.point_light(cx, cr, 2.5, '#ffd8a0', 16, radius=0.3, group='lamp')
    k.point_light(cx, cr + d / 2 + 0.3, 1.4, '#ffc890', 8, radius=0.3, group='lamp')
    for i in range(8):                                       # what's on the counter
        x = cx - w / 2 + 0.8 + i * (w - 1.6) / 7
        r = cr + d / 2 - 0.25
        kind = i % 4
        if kind == 0:
            k.cyl(x, r, 1.06, 1.18, 0.04, '#d8e8f0', 'glass', emit=('#8090a0', 0.3), verts=8)
            k.cyl(x, r, 1.07, 1.15, 0.036, '#f08060', 'cocktail', emit=('#a05040', 0.4), verts=8)
            k.sphere(x + 0.03, r, 1.18, 0.02, 0.012, '#e8c040', 'garnish', segs=6)
        elif kind == 1:
            k.cyl(x, r, 1.06, 1.14, 0.006, '#d8e8f0', 'glass', verts=5)
            k.cone(x, r, 1.14, 1.2, 0.005, 0.045, '#d8e8f0', 'glass', emit=('#8090a0', 0.3), verts=10)
        elif kind == 2:
            k.cyl(x, r, 1.06, 1.12, 0.12, '#f0ece4', 'bowl', verts=12)
            for j in range(5):
                k.sphere(x + math.cos(j * 1.3) * 0.06, r + math.sin(j * 1.3) * 0.04, 1.13, 0.035, 0.03, ('#e8d040', '#70b040')[j % 2], 'fruit', segs=6)
        else:
            k.cyl(x, r, 1.06, 1.22, 0.035, '#c8ccd2', 'shaker', verts=10)
            k.cyl(x, r, 1.22, 1.27, 0.02, '#c8ccd2', 'shaker', verts=8)
    for (x, r) in stools:
        k.cyl(x, r, 0.0, 0.66, 0.025, BAMBOO, 'stool_leg', verts=6)
        for a in (0.3, 2.4, 4.5):
            k.tube((x + math.cos(a) * 0.16, r + math.sin(a) * 0.12, 0.0), (x, r, 0.5), 0.016, BAMBOO, 'stool_leg', verts=4)
        k.cyl(x, r, 0.66, 0.72, 0.16, (BAMBOO, 0.1), 'stool_seat', verts=12)
        k.cyl(x, r, 0.72, 0.77, 0.15, (SAIL_WHITE, 0.05), 'stool_cushion', verts=12)
        k.cyl(x, r, 0.771, 0.775, 0.05, SEA_BLUE, 'stool_cushion', verts=8)
    k.solid(cx - w / 2 + 0.2, cr - d / 2 + 0.1, cx + w / 2 - 0.2, cr + d / 2 - 0.05)


def reception(k, x0, x1, r0, r1, wood='#f0ece2', trim=SEA_BLUE, top='#8a6a44'):
    """A hotel's front desk: a panelled counter painted white with a blue moulding, a polished top, the brass bell, the
    guest book open, a little lamp, hydrangeas in a jug; behind it a cabinet of pigeonholes with the room keys hanging
    under their numbers, a chart of the holm in a frame, the ship's clock, a life ring."""
    k.box(x0, r0, 0, x1, r1, 0.98, (wood, 0.05), 'desk')
    pan = []
    n = max(2, int((x1 - x0) / 0.7))
    for i in range(n):
        a, b = x0 + i * (x1 - x0) / n + 0.08, x0 + (i + 1) * (x1 - x0) / n - 0.08
        pan += [(a, r1, 0.15, b, r1 + 0.02, 0.19), (a, r1, 0.78, b, r1 + 0.02, 0.82), (a, r1, 0.15, a + 0.04, r1 + 0.02, 0.82), (b - 0.04, r1, 0.15, b, r1 + 0.02, 0.82)]
    k.boxes(pan, shade(wood, 0.92), 'desk_panel')
    k.box(x0, r1, 0.86, x1, r1 + 0.03, 0.9, trim, 'desk_trim')
    k.box(x0 - 0.05, r0 - 0.05, 0.98, x1 + 0.05, r1 + 0.07, 1.04, (top, 0.08), 'desk_top')
    k.cyl(x1 - 0.5, r1 - 0.12, 1.04, 1.08, 0.07, GILT, 'bell', verts=10)
    k.sphere(x1 - 0.5, r1 - 0.12, 1.1, 0.055, 0.045, GILT, 'bell', segs=10)
    open_book(k, x0 + 1.2, r1 - 0.2, 1.04, page='#f4ecd8', col='#2e4a7a')
    k.cyl(x0 + 0.5, r0 + 0.2, 1.04, 1.24, 0.06, '#e8e4dc', 'jug', verts=10)
    bouquet(k, x0 + 0.5, r0 + 0.2, 1.24, s=0.8, kind='blue', mix=['white'], dome=0.18)
    table_lamp(k, x1 - 1.1, r0 + 0.2, 1.04, base='#f0ece4', shade_col='#f4e8d0', energy=4.0, s=0.8)
    # the key cabinet behind
    kr = r0 - 1.4
    k.box(x0 + 0.2, kr, 0, x1 - 0.4, kr + 0.32, 1.85, (wood, 0.05), 'key_cabinet')
    k.box(x0 + 0.15, kr - 0.02, 1.85, x1 - 0.35, kr + 0.36, 1.92, (trim, 0.05), 'key_cabinet')
    holes, keys = [], []
    for j in range(3):
        for i in range(int((x1 - x0 - 0.8) / 0.32)):
            x = x0 + 0.35 + i * 0.32
            z = 1.0 + j * 0.27
            holes.append((x, kr + 0.32, z, x + 0.24, kr + 0.325, z + 0.2))
            if (i + j * 3) % 4 != 1:
                keys.append((x + 0.1, kr + 0.325, z + 0.03, x + 0.14, kr + 0.34, z + 0.14))
    k.boxes(holes, '#5a4a3a', 'key_hole')
    k.boxes(keys, GILT, 'key')
    gilt_frame(k, x0 + 0.5, x0 + 1.2, kr + 0.32, 0.25, 0.75, b=0.05, ornate=False)
    facing(k, [rect(x0 + 0.5, 0.25, x0 + 1.2, 0.75)], kr + 0.345, ('#b8d0c8', 0.1), 'chart')
    facing(k, [ell(x0 + 0.85, 0.5, 0.2, 0.12, 12)], kr + 0.35, ('#7a9a5a', 0.1), 'chart')
    life_ring(k, x1 - 0.95, kr + 0.3, 0.5)
    k.solid(x0 - 0.05, kr, x1 + 0.05, r1 + 0.07)
