"""Lumar outdoor builders for scenekit (bpy): houses, streets, harbour.
Tile units: x = column, r = row (toward the camera), z = height.

Buildings face the camera (front wall at r_front), so their facades and the
front slope of the roof read at the 45° camera — the Stardew-style high
oblique view. Water is left out: the world's own animated sea shows through.
"""
import math
import random

from scenekit import S, shade
from assets_lumar import (BRASS, FIRE, FIRE_HOT, IRON, PLASTER, STONE, STONE_D, WOOD, WOOD_D, WOOD_DD, WOOD_L,
                          barrel, candle, crate, loaf)

SALT = ['#1a1e20', '#252a28', '#3a4848', '#4a5a58']     # saltstone
ROOF_GREEN = '#3e6a3a'
ROOF_SLATE = '#44567a'
ROOF_RED = '#8a3a28'
ROOF_PURPLE = '#5a4270'
GLOW = '#ffe080'
GLOW_D = '#c08840'
SEA_FOAM = '#90e0a8'


def pyramid(k, x0, r0, x1, r1, z0, z1, albedo, part, top=0.02):
    """Square pyramid lined up with the walls (a 4-sided cone sits at 45°)."""
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    base = [(x0, r0, z0), (x1, r0, z0), (x1, r1, z0), (x0, r1, z0)]
    k.loft([base, [(cx + (x - cx) * top, cr + (r - cr) * top, z1) for (x, r, _) in base]], albedo, part, closed=True,
           smooth=False)


def annulus(k, cx, cr, r_in, r_out, z0, z1, albedo, part, segs=28):
    """Ring wall (a hollow cylinder): basins, wells, rims."""
    rings = []
    for i in range(segs + 1):
        a = 2 * math.pi * i / segs
        c, s_ = math.cos(a), math.sin(a)
        rings.append([(cx + c * r_in, cr + s_ * r_in, z0), (cx + c * r_out, cr + s_ * r_out, z0),
                      (cx + c * r_out, cr + s_ * r_out, z1), (cx + c * r_in, cr + s_ * r_in, z1)])
    k.loft(rings, albedo, part, closed=True, smooth=False)


def lantern(k, lx, lr, z0, z1, s=0.1, energy=0.0, light_dr=0.2):
    """Iron lantern: lit glass, corner bars, a base plate and a pyramid cap."""
    k.box(lx - s * 0.8, lr - s * 0.8, z0, lx + s * 0.8, lr + s * 0.8, z1, '#ffd080', 'lantern_glass', emit=('#ffb050', 1.0))
    for (dx, dr) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        k.box(lx + dx * s - 0.016, lr + dr * s - 0.016, z0, lx + dx * s + 0.016, lr + dr * s + 0.016, z1, '#2a2a30',
              'lantern_cage')
    k.box(lx - s, lr - s, z0 - 0.03, lx + s, lr + s, z0, '#2a2a30', 'lantern_cage')
    pyramid(k, lx - s * 1.3, lr - s * 1.3, lx + s * 1.3, lr + s * 1.3, z1, z1 + s * 1.2, '#2a2a30', 'lantern_cap')
    if energy:
        k.point_light(lx, lr + light_dr, (z0 + z1) / 2, '#ffb060', energy, radius=0.12, group='flicker')


# ---- ground ------------------------------------------------------------------------------
def cobbles(k, x0, r0, x1, r1, tone='#55524c', size=0.3, skip=None, lawn=False):
    """Rounded, irregular cobblestones (jittered, varied in size and tone)
    over dark grout. skip(x, r) -> True leaves a spot bare. lawn: the square is
    laid over a lawn (W.grass), so the grout and stones sit just above its turf."""
    lift = 0.033 if lawn else 0.0
    k.box(x0, r0, -0.12, x1, r1, -0.03 + lift, ('#3a3730', 0.1) if lawn else ('#24221e', 0.25), 'grout')
    k.sparse = getattr(k, 'sparse', []) + [(x0, r0, x1, r1, 0.08)]   # a lawn under a square grows only a little moss between the stones
    r = r0
    i = 0
    while r < r1 - 1e-6:
        x = x0 - (size / 2 if i % 2 else 0)
        while x < x1 - 1e-6:
            cx = x + size / 2 + k.rng.uniform(-0.04, 0.04)
            cr = r + size / 2 + k.rng.uniform(-0.03, 0.03)
            if x0 <= cx <= x1 and not (skip and skip(cx, cr)):
                rx = size * k.rng.uniform(0.4, 0.5)
                ry = size * k.rng.uniform(0.38, 0.47)
                k.cyl(cx, cr, -0.05, lift + k.rng.uniform(0.0, 0.02), rx, (shade(tone, k.rng.uniform(0.8, 1.12)), 0.12),
                      'cobble', ry=ry, verts=k.rng.choice((6, 7, 8)), bevel=0.02)
            x += size * k.rng.uniform(0.95, 1.05)
        r += size
        i += 1


def grass(k, x0, r0, x1, r1, tone='#2a4a2a', tufts=0.6):
    """A lawn: the turf, and over it, once the whole scene is laid out (k.later), the grass itself (meadow) wherever the
    turf is still what's on top - so nothing grows through the paths, the floors or under the houses."""
    k.box(x0, r0, -0.1, x1, r1, 0.0, (tone, 0.12), 'grass')
    k.later.append(lambda: meadow(k, tone, area=(x0, r0, x1, r1), ok=('grass',), density=0.6 + tufts))


def _mix(a, b, t):
    from scenekit import hexc
    ca, cb = hexc(a), hexc(b)
    return '#' + ''.join('%02x' % max(0, min(255, round(255 * (ca[i] + (cb[i] - ca[i]) * t)))) for i in range(3))


FLOWERS = ('#f4f0e4', '#f8d848', '#e87aa8', '#a88ae8', '#f4f0e4', '#80b8f0')


EDGES = ('path', 'field', 'sand', 'cobble', 'flag', 'yard', 'lane')   # what the grass spills over the edge of


def ragged_edges(k, x0, r0, x1, r1, tone, z=0.006):
    """Turf creeping over the edges of a path or a field, the way Stardew draws them: a ragged border of bumps of turf
    a few pixels into it, each with a tuft leaning out, wherever there's turf just beyond the edge (k.later: after the
    layout, so a path meeting a path stays clear)."""
    mid, deep, lit = shade(tone, 1.0), _mix(tone, '#0e2a14', 0.35), _mix(shade(tone, 1.4), '#d8f070', 0.32)
    rects = {mid: [], deep: []}
    blades = {mid: [], lit: [], deep: []}

    def grassy(x, r):
        p_ = k.top(x, r)[0]
        return p_ is not None and p_.startswith('grass')
    for kind, at, out in (('h', r0, -1), ('h', r1, 1), ('v', x0, -1), ('v', x1, 1)):
        a, b = (x0, x1) if kind == 'h' else (r0, r1)
        t = a + k.rng.uniform(0, 0.1)
        while t < b - 0.05:
            w = min(k.rng.uniform(0.07, 0.22), b - t)
            d = k.rng.uniform(0.04, 0.15)
            m = t + w / 2
            px, pr = (m, at + out * 0.1) if kind == 'h' else (at + out * 0.1, m)
            if k.rng.random() < 0.8 and grassy(px, pr):
                lo, hi = sorted((at - out * d, at + out * 0.03))
                col = mid if k.rng.random() < 0.75 else deep
                rects[col].append((t, lo, z + 0.0005, t + w, hi, z + 0.004) if kind == 'h' else (lo, t, z + 0.0005, hi, t + w, z + 0.004))
                for j in range(k.rng.choice((1, 2, 3))):              # a tuft on it, leaning out over the path
                    u = t + k.rng.uniform(0.02, max(0.03, w - 0.02))
                    bx, br = (u, at - out * d * 0.5) if kind == 'h' else (at - out * d * 0.5, u)
                    lx, lr = (k.rng.uniform(-0.03, 0.03), -out * 0.04) if kind == 'h' else (-out * 0.06, 0.0)
                    blades[k.rng.choice((mid, lit, deep))].append((bx, br, z + 0.004, k.rng.uniform(0.08, 0.14), 0.024, lx, lr))
            t += w + k.rng.uniform(0.0, 0.1)
    for col, rs in rects.items():
        if rs:
            k.boxes(rs, (col, 0.12), 'grass')
    for col, bs in blades.items():
        if bs:
            k.blades(bs, (col, 0.25), 'grass')


def _vnoise(x, y, seed=0):
    """Smooth value noise, 0..1 (the slow light and dark drifts across a meadow)."""
    def h(i, j):
        v = math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453
        return v - math.floor(v)
    xi, yi = math.floor(x), math.floor(y)
    fx, fy = x - xi, y - yi
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = h(xi, yi), h(xi + 1, yi), h(xi, yi + 1), h(xi + 1, yi + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def meadow(k, tone, area=None, cells=None, ok=('grass',), density=1.0, avoid=None, flowers=1.0, tall=0.04, h=(0.09, 0.17)):
    """Grass as a lush carpet, the way Stardew draws it: blades packed close in greens only a little apart - the
    shadowed ones between, the turf's own, sunlit ones with a few bright tips - drifting lighter and darker across the
    meadow in slow patches; flowers and clover in clumps, the odd tall clump and pebble. Grows wherever the part on top is
    one of `ok` (k.top), over `area` (x0, r0, x1, r1) or `cells`."""
    deep, mid, lit = _mix(tone, '#10301a', 0.4), shade(tone, 1.02), _mix(shade(tone, 1.26), '#d0e868', 0.22)
    tips = _mix(lit, '#eaf8a0', 0.3)
    beds = {deep: [], mid: [], lit: [], tips: []}
    dots = {}
    if cells is None:
        x0, r0, x1, r1 = area
        cells = [(c, r) for c in range(int(math.floor(x0)), int(math.ceil(x1))) for r in range(int(math.floor(r0)), int(math.ceil(r1)))]
        inside = lambda x, r: x0 <= x < x1 and r0 <= r < r1
    else:
        inside = lambda x, r: True

    def isok(p_):
        return p_ is not None and any(p_ == o or p_.startswith(o + '_') for o in ok)

    sparse = getattr(k, 'sparse', [])

    def spot(x, r):                                            # grass can grow here: its height, else None
        if not inside(x, r) or (avoid and avoid(x, r)):
            return None
        for (sx0, sr0, sx1, sr1, keep) in sparse:            # between cobbles: only now and then
            if sx0 <= x < sx1 and sr0 <= r < sr1 and k.rng.random() > keep:
                return None
        p_, z = k.top(x, r)
        return z + 0.002 if isok(p_) else None
    per = 20.0 * density
    seed = k.rng.random() * 100
    for (c, rr) in cells:
        m_ = int(per) + (1 if k.rng.random() < per % 1 else 0)
        for _ in range(m_):
            x, r = c + k.rng.random(), rr + k.rng.random()
            z = spot(x, r)
            if z is None:
                continue
            light = _vnoise(x / 3.4, r / 3.4, seed) * 0.75 + _vnoise(x / 1.1, r / 1.1, seed + 9) * 0.25    # the slow drifts
            col = k.rng.choices((deep, mid, lit), (0.2 + 0.12 * (1 - light), 0.52, 0.12 + 0.12 * light))[0]   # (drifts kept faint: strong ones read as blobs)
            nb = k.rng.choice((3, 3, 4, 5))
            for j in range(nb):
                dx = (j - (nb - 1) / 2) * 0.03 + k.rng.uniform(-0.01, 0.01)
                hh = k.rng.uniform(*h) * (1.12 if j == nb // 2 else 1.0)
                lean = dx * 0.7 + k.rng.uniform(-0.015, 0.015)
                beds[col].append((x + dx, r, z, hh, 0.02, lean, k.rng.uniform(-0.015, 0.015)))
                if col == lit and k.rng.random() < 0.3:              # a few tips catching the sun
                    beds[tips].append((x + dx + lean * 0.6, r, z + hh * 0.6, hh * 0.42, 0.01, lean * 0.4, 0.0))
        # where the turf meets a path or a field in this cell: grass spilling over the edge
        corners = [k.top(c + ax, rr + ar)[0] for (ax, ar) in ((0.05, 0.05), (0.95, 0.05), (0.05, 0.95), (0.95, 0.95), (0.5, 0.5))]
        if any(isok(p_) for p_ in corners) and any(p_ is not None and any(p_.startswith(e) for e in EDGES) for p_ in corners):
            for _ in range(int(16 * density)):
                x, r = c + k.rng.random(), rr + k.rng.random()
                part, z = k.top(x, r)
                if part is None or not any(part.startswith(e) for e in EDGES) or not inside(x, r):
                    continue
                for (ex, er) in ((0.16, 0), (-0.16, 0), (0, 0.16), (0, -0.16)):
                    if isok(k.top(x + ex, r + er)[0]):
                        for j in range(k.rng.choice((2, 3))):
                            beds[k.rng.choice((deep, mid, mid))].append((x + ex * 0.5 + (j - 1) * 0.035, r + er * 0.5, z + 0.002, k.rng.uniform(0.08, 0.14), 0.02,
                                                                          -ex * 0.4 + (j - 1) * 0.025, -er * 0.3))
                        break
        # a tall clump now and then
        if k.rng.random() < tall:
            x, r = c + k.rng.random(), rr + k.rng.random()
            z = spot(x, r)
            if z is not None:
                for j in range(9):
                    a = j / 9 * math.pi * 2 + k.rng.uniform(-0.3, 0.3)
                    hh = k.rng.uniform(0.18, 0.28)
                    beds[deep if j % 3 == 0 else mid].append((x + math.cos(a) * 0.05, r + math.sin(a) * 0.03, z, hh, 0.022,
                                                             math.cos(a) * 0.08, math.sin(a) * 0.04))
        # flowers grow in clumps of one kind; clover in patches; the odd pebble
        if k.rng.random() < 0.05 * flowers:
            fc, cx_, cr_ = k.rng.choice(FLOWERS), c + k.rng.random(), rr + k.rng.random()
            for _ in range(k.rng.randint(4, 11)):
                a, d = k.rng.uniform(0, math.tau), k.rng.uniform(0, 0.38) ** 1.3
                x, r = cx_ + math.cos(a) * d, cr_ + math.sin(a) * d * 0.8
                z = spot(x, r)
                if z is None:
                    continue
                hh = k.rng.uniform(0.07, 0.13)
                beds[mid].append((x, r, z, hh, 0.008, 0.0, 0.0))
                sz = k.rng.uniform(0.022, 0.03)
                dots.setdefault(fc, []).append((x - sz, r - sz * 0.8, z + hh - 0.012, x + sz, r + sz * 0.8, z + hh + 0.026))
                if fc != '#f8d848':
                    dots.setdefault('#f8e070', []).append((x - 0.006, r + sz * 0.8 - 0.004, z + hh + 0.008, x + 0.006, r + sz * 0.8 + 0.002, z + hh + 0.02))
        if k.rng.random() < 0.05 * flowers:
            cx_, cr_ = c + k.rng.random(), rr + k.rng.random()
            for _ in range(k.rng.randint(4, 9)):
                x, r = cx_ + k.rng.uniform(-0.3, 0.3), cr_ + k.rng.uniform(-0.22, 0.22)
                z = spot(x, r)
                if z is None:
                    continue
                for j in range(3):
                    a = j * 2.1 + k.rng.uniform(0, 0.5)
                    dots.setdefault(_mix(deep, mid, 0.5), []).append((x + math.cos(a) * 0.028 - 0.018, r + math.sin(a) * 0.02 - 0.014, z,
                                                                       x + math.cos(a) * 0.028 + 0.018, r + math.sin(a) * 0.02 + 0.014, z + 0.012))
        if k.rng.random() < 0.04:
            x, r = c + k.rng.random(), rr + k.rng.random()
            z = spot(x, r)
            if z is not None:
                sz = k.rng.uniform(0.03, 0.06)
                dots.setdefault('#8a8478', []).append((x - sz, r - sz * 0.7, z, x + sz, r + sz * 0.7, z + sz * 0.6))
    for col, items in beds.items():
        if items:
            k.blades(items, (col, 0.25), 'grass')     # one with the turf: no line work round each blade
    for col, rects in dots.items():
        k.boxes(rects, (col, 0.25), 'meadow_flower' if col in FLOWERS else 'grass')


def sand(k, x0, r0, x1, r1, tone='#8a7a5a'):
    k.box(x0, r0, -0.1, x1, r1, 0.0, (tone, 0.25), 'sand')


# ---- houses -------------------------------------------------------------------------------
def _gable_roof(k, x0, x1, r_back, r_front, z_eave, rise, col, over=0.25, strips=9, moss=0.6):
    """Gable roof, ridge along x (Beck: "the roof is just like kind of a square with like some lines on it… we could do
    a little bit better"): a dark deck under courses of separate shingles on both slopes, each course lapping the one
    below with its butt edge standing proud (so the light catches it and it shadows the course under it), the shingles
    a hair apart (the joints show the deck through them), a few tones and the odd weathered one; half-round ridge tiles,
    bargeboards up the gable ends, a gutter along the front eave with a downpipe, moss and lichen. Snow (ROOF_SNOW) lies
    in soft pillows instead, with a cornice over the eave. Returns (ridge row, ridge z)."""
    rm = (r_back + r_front) / 2
    zr = z_eave + rise
    ra, rb = r_front + over, r_back - over
    xa, xb = x0 - over, x1 + over
    snowy = col.lower() in ('#f2f5fa',)
    ze = z_eave - 0.06
    # the deck the shingles lie on (seen only through the joints)
    deck = shade(col, 0.5) if not snowy else shade(col, 0.82)
    k.poly([(xa, ra, ze), (xb, ra, ze), (xb, rm, zr), (xa, rm, zr)], deck, 'roof_deck')
    k.poly([(xa, rb, ze), (xb, rb, ze), (xb, rm, zr), (xa, rm, zr)], deck, 'roof_deck')
    tones = [shade(col, 0.9), shade(col, 0.96), shade(col, 1.02), shade(col, 1.07), _mix(shade(col, 0.94), '#8a8a80', 0.25)]
    if snowy:
        tones = [shade(col, 0.94), shade(col, 0.98), shade(col, 1.0), shade(col, 1.0), shade(col, 0.9)]
    beds = {t: [] for t in tones}
    course = 0.34 if snowy else 0.21                 # along the slope
    sw = (0.55, 1.0) if snowy else (0.24, 0.33)      # shingle widths
    lift = 0.022 if snowy else 0.034                 # how proud a course's butt stands
    gap = 0.0 if snowy else 0.032                    # a pixel's joint between shingles, the deck dark through it
    lines = []                                        # the shadow each course casts on the one below
    for (r_e, back) in ((ra, False), (rb, True)):
        run = rm - r_e
        L = math.hypot(run * S, zr - ze)
        n = max(3, int(round(L / course)))
        if snowy:                                     # a smooth blanket, soft lumps where it's drifted
            k.poly([(xa, r_e, ze + 0.05), (xb, r_e, ze + 0.05), (xb, rm, zr + 0.05), (xa, rm, zr + 0.05)], col, 'roof')
            for _ in range(int((xb - xa) * 1.6)):
                t = k.rng.uniform(0.05, 0.9)
                x = k.rng.uniform(xa + 0.3, xb - 0.3)
                rr, zz = r_e + run * t, ze + (zr - ze) * t + 0.05
                k.blob(x, rr, zz, k.rng.uniform(0.3, 0.7), k.rng.uniform(0.12, 0.22), 0.05, shade(col, k.rng.uniform(0.97, 1.0)), 'roof', segs=10)
            continue
        for i in range(n):
            t0, t1 = i / n, min(1.0, (i + 1.35) / n)  # each course laps over the next one up
            def at(t, up=0.0):
                return r_e + run * t, ze + (zr - ze) * t + up
            x = xa + (k.rng.uniform(0.0, sw[0] * 0.5) if i % 2 else 0.0)
            if i and not snowy:
                rs0, zs0 = at(t0 - 0.045 / max(L, 0.1), lift * 0.6)
                rs1, zs1 = at(t0 + 0.005 / max(L, 0.1), lift * 1.05)
                lines.append(((xa, rs0, zs0), (xb, rs0, zs0), (xb, rs1, zs1), (xa, rs1, zs1)))
            while x < xb - 0.02:
                w = k.rng.uniform(*sw)
                x1_ = min(xb, x + w - gap)
                b0 = k.rng.uniform(-0.012, 0.012)                      # butts not quite in a line
                rb0, zb0 = at(max(0.0, t0 + b0 / max(L, 0.1)), lift)
                rt0, zt0 = at(t1, 0.004)
                tone = k.rng.choices(tones, (0.22, 0.32, 0.28, 0.14, 0.04))[0]
                beds[tone].append(((x, rb0, zb0), (x1_, rb0, zb0), (x1_, rt0, zt0), (x, rt0, zt0)))
                x += w
    for tone, qs in beds.items():
        if qs:
            k.quads(qs, tone, 'roof')
    if lines:
        k.quads(lines, shade(col, 0.58), 'roof')
    # half-round ridge tiles
    x = xa
    while x < xb - 0.05:
        x1_ = min(xb, x + 0.3)
        k.tube((x + 0.01, rm, zr + 0.035), (x1_ - 0.01, rm, zr + 0.035), 0.075, shade(col, k.rng.uniform(0.62, 0.72)) if not snowy else shade(col, 0.96), 'ridge', verts=8)
        x = x1_
    # gable ends: the wall, and a bargeboard up each edge
    for xe in (x0, x1):
        k.poly([(xe, r_front, z_eave), (xe, r_back, z_eave), (xe, rm, zr)], (PLASTER, 0.08), 'gable')
    for xe in (xa - 0.02, xb + 0.02):
        for r_e in (ra, rb):
            k.tube((xe, r_e, ze + 0.03), (xe, rm, zr + 0.07), 0.04, WOOD_DD if not snowy else shade(col, 0.95), 'bargeboard', verts=4)
    # eave fascia, the gutter along it and a downpipe at the corner
    k.box(xa, ra - 0.02, z_eave - 0.14, xb, ra + 0.04, z_eave - 0.04, WOOD_DD, 'fascia')
    if snowy:
        k.tube((xa, ra + 0.04, ze + 0.02), (xb, ra + 0.04, ze + 0.02), 0.07, shade(col, 0.97), 'cornice', verts=8)
    else:
        k.tube((xa + 0.05, ra + 0.07, z_eave - 0.12), (xb - 0.05, ra + 0.07, z_eave - 0.12), 0.035, '#4a4a4c', 'gutter', verts=6)
        dx = x1 - 0.1                                    # down the wall's corner, into a water butt (house: wall_foot)
        k.tube((dx, ra + 0.07, z_eave - 0.12), (dx, r_front + 0.08, z_eave - 0.3), 0.025, '#4a4a4c', 'downpipe', verts=6)
        k.tube((dx, r_front + 0.08, z_eave - 0.3), (dx, r_front + 0.08, 0.08), 0.025, '#4a4a4c', 'downpipe', verts=6)
        for zz in (0.5, z_eave - 0.55):                  # its brackets
            k.box(dx - 0.04, r_front + 0.0, zz, dx + 0.04, r_front + 0.1, zz + 0.03, '#3a3a3c', 'downpipe')
        # moss and lichen, thicker toward the eaves and on the back (shaded) slope
        dots = {}
        for _ in range(int((xb - xa) * 9 * moss)):
            back = k.rng.random() < 0.55
            r_e = rb if back else ra
            t = k.rng.random() ** 2.2 * 0.8
            x = k.rng.uniform(xa + 0.1, xb - 0.1)
            rr, zz = r_e + (rm - r_e) * t, ze + (zr - ze) * t + 0.04
            c = k.rng.choices(('#4a6a34', '#5a7a3a', '#3a5a2e', '#b8b48a'), (0.35, 0.25, 0.25, 0.15))[0]
            for _j in range(k.rng.randint(2, 6)):
                ox, oz = k.rng.uniform(-0.09, 0.09), k.rng.uniform(-0.03, 0.03)
                sz = k.rng.uniform(0.018, 0.04)
                dots.setdefault(c, []).append((x + ox - sz, rr - sz * 0.6, zz + oz, x + ox + sz, rr + sz * 0.6, zz + oz + 0.012))
        for c, rs in dots.items():
            k.boxes(rs, c, 'roof_moss')
    return rm, zr


def weathervane(k, cx, cr, z, col='#2a2a2c'):
    """An iron weathervane: a post, the compass arms, a cockerel-and-arrow on top."""
    k.cyl(cx, cr, z, z + 0.5, 0.018, (col, 0.0), 'vane', verts=6)
    k.box(cx - 0.18, cr - 0.01, z + 0.28, cx + 0.18, cr + 0.01, z + 0.3, (col, 0.0), 'vane')
    k.box(cx - 0.01, cr - 0.18, z + 0.28, cx + 0.01, cr + 0.18, z + 0.3, (col, 0.0), 'vane')
    k.box(cx - 0.22, cr - 0.008, z + 0.46, cx + 0.2, cr + 0.008, z + 0.48, (col, 0.0), 'vane')
    k.poly([(cx + 0.2, cr, z + 0.43), (cx + 0.28, cr, z + 0.47), (cx + 0.2, cr, z + 0.51)], (col, 0.0), 'vane')
    k.poly([(cx - 0.12, cr, z + 0.48), (cx - 0.02, cr, z + 0.48), (cx - 0.04, cr, z + 0.6), (cx - 0.1, cr, z + 0.62)], (col, 0.0), 'vane')


def chimney_stack(k, cx, r0, r1, z0, z1, brick='#8a5a48', mortar='#5a4a42', pots=None, cap=None, roof_z=None):
    """A brick chimney (Beck: chimneys were "a couple squares"): bricks you can count, laid in courses on every face you
    see, a corbelled band of two courses standing out near the top, soot darkening the last few, a stone cap, clay pots
    with dark mouths, and lead flashing where it leaves the roof."""
    w = 0.26
    rc = (r0 + r1) / 2
    k.box(cx - w, r0, z0, cx + w, r1, z1, (mortar, 0.0), 'chimney')
    bh, bw = 0.085, 0.19                                # a brick: about 3 × 6 pixels
    z, i = z0, 0
    while z < z1 - 0.02:
        top = (z1 - z) < 0.36                            # sooty toward the top
        corbel = 0.12 < (z1 - z) < 0.12 + 2 * bh + 0.01  # two courses standing out
        o = 0.025 if corbel else 0.0
        x = cx - w - o + (0.0 if i % 2 else -bw / 2)
        while x < cx + w + o - 0.01:
            xa_, xb_ = max(x, cx - w - o), min(x + bw, cx + w + o)
            if xb_ - xa_ > 0.04:
                c = shade(brick, k.rng.uniform(0.82, 1.14) * (0.72 if top else 1.0))
                k.box(xa_ + 0.008, r1 - 0.01, z + 0.01, xb_ - 0.008, r1 + 0.014 + o, z + bh - 0.004, (c, 0.0), 'brick')
            x += bw
        for side in (-1, 1):                              # the sides' courses
            xs = cx + side * (w + o)
            y = r0 + (0.0 if i % 2 else bw / 2)
            while y < r1 - 0.02:
                c = shade(brick, k.rng.uniform(0.75, 0.98) * (0.72 if top else 1.0))
                k.box(xs - 0.014, max(y, r0) + 0.008, z + 0.01, xs + 0.014, min(y + bw, r1) - 0.008, z + bh - 0.004, (c, 0.0), 'brick')
                y += bw
        z += bh
        i += 1
    k.box(cx - w - 0.035, r0 - 0.035, z1, cx + w + 0.035, r1 + 0.035, z1 + 0.06, (cap or STONE, 0.0), 'chimney_cap')
    k.box(cx - w + 0.02, r0 + 0.02, z1 + 0.06, cx + w - 0.02, r1 - 0.02, z1 + 0.11, (shade(cap or STONE, 0.8), 0.0), 'chimney_cap')
    n = pots if pots is not None else k.rng.choice((1, 2, 2, 3))
    for j in range(n):
        px = cx + (j - (n - 1) / 2) * 0.17
        h = k.rng.uniform(0.16, 0.26)
        k.cyl(px, rc, z1 + 0.11, z1 + 0.11 + h, 0.055, (shade('#a8583a', k.rng.uniform(0.9, 1.08)), 0.0), 'chimney_pot', verts=12)
        k.cyl(px, rc, z1 + 0.09 + h, z1 + 0.12 + h, 0.07, ('#8a4a32', 0.0), 'chimney_pot', verts=12)
        k.cyl(px, rc, z1 + 0.12 + h, z1 + 0.125 + h, 0.045, ('#1a1412', 0.0), 'chimney_mouth', verts=12)
    if roof_z is not None:                               # lead flashing round its foot
        k.box(cx - w - 0.05, r1 - 0.02, roof_z - 0.02, cx + w + 0.05, r1 + 0.05, roof_z + 0.07, ('#5a5e64', 0.0), 'flashing')


def window(k, cx, r_face, z0, w=0.55, h=0.65, lit=True, shutters='#2a4a3a', flowers=None):
    k.box(cx - w / 2 - 0.06, r_face, z0 - 0.06, cx + w / 2 + 0.06, r_face + 0.06, z0 + h + 0.06, WOOD_DD, 'window_frame')
    k.box(cx - w / 2, r_face + 0.01, z0, cx + w / 2, r_face + 0.065, z0 + h, '#5a3a18' if lit else '#1a2030', 'window_glass',
          emit=(GLOW, 0.9) if lit else None)
    k.box(cx - 0.02, r_face + 0.06, z0, cx + 0.02, r_face + 0.08, z0 + h, WOOD_DD, 'window_frame')
    k.box(cx - w / 2, r_face + 0.06, z0 + h / 2 - 0.02, cx + w / 2, r_face + 0.08, z0 + h / 2 + 0.02, WOOD_DD, 'window_frame')
    k.box(cx - w / 2 - 0.1, r_face, z0 - 0.12, cx + w / 2 + 0.1, r_face + 0.14, z0 - 0.06, WOOD, 'sill')
    if shutters:
        for s in (-1, 1):
            k.box(cx + s * (w / 2 + 0.07) - 0.11 * (s < 0), r_face + 0.01, z0, cx + s * (w / 2 + 0.07) + 0.11 * (s > 0),
                  r_face + 0.05, z0 + h, (shutters, 0.1), 'shutter')
    if flowers:     # a window box of flowers under the sill
        k.box(cx - w / 2 - 0.05, r_face + 0.1, z0 - 0.3, cx + w / 2 + 0.05, r_face + 0.3, z0 - 0.12, (WOOD_D, 0.12), 'flower_box')
        x = cx - w / 2 + 0.02
        while x < cx + w / 2:
            k.sphere(x, r_face + 0.2, z0 - 0.08, 0.07, 0.06, ('#2e5a2e', 0.15), 'foliage', segs=8)
            k.sphere(x + 0.03, r_face + 0.26, z0 - 0.04, 0.035, 0.035, k.rng.choice(flowers), 'flower', segs=6)
            x += 0.12
    if lit:
        k.point_light(cx, r_face + 0.6, z0 + h / 2, '#ffc070', 6, radius=0.2, group='flicker')


def door(k, cx, r_face, w=0.7, h=1.3, col=WOOD_D, arch=True):
    k.box(cx - w / 2 - 0.08, r_face, 0.0, cx + w / 2 + 0.08, r_face + 0.08, h + 0.08, WOOD_DD, 'door_frame')
    k.box(cx - w / 2, r_face + 0.02, 0.0, cx + w / 2, r_face + 0.1, h, (col, 0.14), 'door')
    if arch:
        k.cyl_y(cx, r_face + 0.0, r_face + 0.08, h, w / 2 + 0.08, 0.22, WOOD_DD, 'door_frame', verts=16)
        k.cyl_y(cx, r_face + 0.02, r_face + 0.1, h, w / 2, 0.16, (col, 0.14), 'door', verts=16)
    for i in range(3):
        k.box(cx - w / 2 + 0.08 + i * (w - 0.16) / 2 - 0.01, r_face + 0.1, 0.05, cx - w / 2 + 0.08 + i * (w - 0.16) / 2 + 0.01,
              r_face + 0.11, h - 0.05, shade(col, 0.7), 'door_plank')
    k.sphere(cx + w / 2 - 0.12, r_face + 0.12, h * 0.48, 0.035, 0.035, BRASS, 'door_knob', segs=6)
    k.box(cx - w / 2 - 0.2, r_face + 0.08, -0.01, cx + w / 2 + 0.2, r_face + 0.4, 0.06, (STONE, 0.12), 'step')


def wall_lantern(k, x, r_face, z=1.25, energy=10):
    k.box(x - 0.03, r_face, z + 0.15, x + 0.03, r_face + 0.22, z + 0.19, IRON, 'lantern_bracket')
    lantern(k, x, r_face + 0.22, z - 0.12, z + 0.1, s=0.08, energy=energy, light_dr=0.3)


def hanging_sign(k, x, r_face, z, icon='mug', board='#5a3a1e'):
    """Wrought-iron bracket with a painted board; icon drawn on the board."""
    k.box(x - 0.02, r_face, z + 0.35, x + 0.02, r_face + 0.65, z + 0.39, IRON, 'sign_bracket')
    k.tube((x, r_face, z + 0.05), (x, r_face + 0.5, z + 0.37), 0.012, IRON, 'sign_bracket', verts=4)
    for dr in (0.2, 0.58):
        k.box(x - 0.006, r_face + dr, z + 0.22, x + 0.006, r_face + dr + 0.01, z + 0.36, IRON, 'sign_chain')
    k.box(x - 0.025, r_face + 0.12, z - 0.25, x + 0.025, r_face + 0.66, z + 0.23, (board, 0.12), 'sign_board')
    k.box(x - 0.03, r_face + 0.1, z - 0.27, x + 0.03, r_face + 0.68, z - 0.24, BRASS, 'sign_trim')
    # icon on the side facing the street (+x face, visible at an angle) and its edge
    ix, ir, iz = x + 0.03, r_face + 0.39, z
    col = '#e0c060'
    if icon == 'mug':
        k.box(ix, ir - 0.09, iz - 0.12, ix + 0.01, ir + 0.07, iz + 0.1, col, 'sign_icon')
        k.box(ix, ir + 0.07, iz - 0.05, ix + 0.01, ir + 0.13, iz + 0.05, col, 'sign_icon')
    elif icon == 'bread':
        k.blob(ix, ir, iz, 0.01, 0.16, 0.08, col, 'sign_icon', segs=8)
    elif icon == 'anvil':
        k.box(ix, ir - 0.14, iz + 0.02, ix + 0.01, ir + 0.14, iz + 0.1, col, 'sign_icon')
        k.box(ix, ir - 0.05, iz - 0.12, ix + 0.01, ir + 0.05, iz + 0.02, col, 'sign_icon')
    elif icon == 'bottle':
        k.box(ix, ir - 0.06, iz - 0.14, ix + 0.01, ir + 0.06, iz + 0.04, '#a070d0', 'sign_icon')
        k.box(ix, ir - 0.02, iz + 0.04, ix + 0.01, ir + 0.02, iz + 0.14, '#a070d0', 'sign_icon')
    elif icon == 'bed':
        k.box(ix, ir - 0.15, iz - 0.06, ix + 0.01, ir + 0.15, iz + 0.02, '#80a0e0', 'sign_icon')
        k.box(ix, ir - 0.15, iz + 0.02, ix + 0.01, ir - 0.06, iz + 0.1, '#e0e0e0', 'sign_icon')
    elif icon == 'compass':        # the cartographer: a compass rose
        k.cyl_x(ix, ix + 0.01, ir, iz, 0.13, 0.13, col, 'sign_icon', verts=14)
        k.cyl_x(ix + 0.01, ix + 0.012, ir, iz, 0.09, 0.09, '#3a2416', 'sign_icon', verts=14)
        k.box(ix + 0.012, ir - 0.015, iz - 0.17, ix + 0.02, ir + 0.015, iz + 0.17, col, 'sign_icon')
        k.box(ix + 0.012, ir - 0.17, iz - 0.015, ix + 0.02, ir + 0.17, iz + 0.015, col, 'sign_icon')
    elif icon == 'fish':
        k.blob(ix, ir, iz, 0.01, 0.14, 0.06, '#90c0d0', 'sign_icon', segs=8)
        k.cone(ix, ir + 0.16, iz - 0.06, iz + 0.06, 0.01, 0.005, '#90c0d0', 'sign_icon', verts=3)


def house(k, x0, x1, r_back, r_front, wall_h=2.0, rise=1.3, roof=ROOF_GREEN, wall=PLASTER, timber=WOOD_DD,
          door_x=None, windows=(), windows_up=(), chimney=None, sign=None, lanterns=(), stone=False, base=SALT[2]):
    """A Lumar house: saltstone footing, plaster and timber (or stone)
    walls, glowing windows, door with a step, gable roof, chimney, sign.
    Each has its own character (Beck: "more variation in character"): its plaster's tint, its timbers' and shutters'
    colours, sometimes a dormer in the roof, a hood over the door, a weathervane — picked by the scene's dice, so a
    street of them isn't one house over and over. Returns (ridge row, ridge z) for smoke and the like."""
    if wall == PLASTER:
        wall = k.rng.choice((PLASTER, PLASTER, '#e8d8b8', '#e4c8b0', '#d8dccc', '#e8dcc8', '#d4c4a4'))
    if timber == WOOD_DD:
        timber = k.rng.choice((WOOD_DD, WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028'))
    shutters = k.rng.choice(('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#5a4a3a', '#2a3a4a', '#7a6a3a'))
    k.box(x0, r_back, 0, x1, r_front, 0.35, (shade(base, 0.72), 0.16), 'footing', bevel=0.02)
    rr = random.Random(int(x0 * 7919 + r_front * 104729) & 0xffffff)   # its own dice: the scene's stay as they were
    footing_face(k, x0, x1, r_front, 0.35, base, rr, skip=[(door_x - 0.5, door_x + 0.5)] if door_x is not None else ())
    wall_alb = (wall, 0.16 if stone else 0.08)
    k.box(x0 + 0.04, r_back + 0.04, 0.35, x1 - 0.04, r_front - 0.02, wall_h, wall_alb, 'house_wall')
    if stone:   # coursed blocks on the facade
        z, i = 0.35, 0
        while z < wall_h - 0.1:
            x = x0 + (0.0 if i % 2 else 0.25)
            while x < x1:
                k.box(max(x, x0 + 0.04), r_front - 0.03, z + 0.015, min(x + 0.48, x1 - 0.04), r_front + 0.0, z + 0.27,
                      (shade(wall, k.rng.uniform(0.85, 1.1)), 0.14), 'stone_block')
                x += 0.5
            z += 0.29
            i += 1
    else:         # timber framing on the facade
        for xx in [x0 + 0.04] + [x0 + (x1 - x0) * t for t in (0.33, 0.66)] + [x1 - 0.16]:
            k.box(xx, r_front - 0.02, 0.35, xx + 0.12, r_front + 0.03, wall_h, (timber, 0.1), 'timber')
        for zz in (0.35, wall_h * 0.58, wall_h - 0.12):
            k.box(x0 + 0.04, r_front - 0.02, zz, x1 - 0.04, r_front + 0.03, zz + 0.12, (timber, 0.1), 'timber')
        for xx in (x0 + 0.04, x1 - 0.16):   # timber on the visible gable-side corners
            k.box(xx, r_back + 0.04, 0.35, xx + 0.12, r_front, 0.47, (timber, 0.1), 'timber')
    if not stone:   # above the sill rail, clear of the posts and the middle rail
        posts = [x0 + 0.04, x0 + (x1 - x0) * 0.33, x0 + (x1 - x0) * 0.66, x1 - 0.16]
        weather_wall(k, x0 + 0.04, x1 - 0.04, r_front - 0.02, 0.47, wall_h, wall, rr, door_x=door_x,
                     windows=[(w[0], w[1], 0.55) for w in windows] + [(w[0], w[1], 0.45) for w in windows_up],
                     posts=[(p_ - 0.05, p_ + 0.17) for p_ in posts], patch_top=wall_h * 0.58)
    if door_x is not None:
        door(k, door_x, r_front)
    for (wx, wz) in windows:
        window(k, wx, r_front + 0.02, wz, shutters=shutters,
               flowers=k.rng.choice((None, ('#e04060', '#e0c040'), ('#a060d0', '#e0e0f0'), ('#e07030', '#e0c040'))))
    for (wx, wz) in windows_up:
        window(k, wx, r_front + 0.02, wz, w=0.45, h=0.5, shutters=shutters)
    rm, zr = _gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof)
    # a dormer or two in the front slope of a wide house, clear of the chimney
    if x1 - x0 >= 4.0 and k.rng.random() < 0.5:
        n = 1 if x1 - x0 < 6.0 or k.rng.random() < 0.5 else 2
        for j in range(n):
            dx = x0 + (x1 - x0) * ((j + 1) / (n + 1) if n > 1 else k.rng.uniform(0.35, 0.65))
            if chimney is not None and abs(dx - chimney) < 0.9:
                dx = x0 + (x1 - x0) - (dx - x0)
            if chimney is None or abs(dx - chimney) >= 0.9:
                dormer(k, dx, r_front + 0.25, rm, wall_h - 0.06, zr, roof, wall, shutters)
    if door_x is not None and k.rng.random() < 0.45:
        door_hood(k, door_x, r_front + 0.03, 1.8, roof)
    if k.rng.random() < 0.15:
        weathervane(k, k.rng.choice((x0 + 0.3, x1 - 0.3)), rm, zr + 0.08)
    if chimney:
        # where the chimney's front face leaves the front slope (it stands just in front of the ridge)
        ra_ = r_front + 0.25
        rz = zr - (zr - wall_h + 0.06) * ((rm + 0.05) - rm) / max(0.1, ra_ - rm)
        chimney_stack(k, chimney, rm - 0.35, rm + 0.05, wall_h, zr + 0.8, roof_z=rz)
    dress_front(k, x0, x1, r_front, wall_h, door_x, [w[0] for w in windows] + [w[0] for w in windows_up])
    wall_foot(k, x0, x1, r_front, door_x, rr, butt=roof.lower() != '#f2f5fa')
    if sign:
        hanging_sign(k, sign[0], r_front, sign[1], icon=sign[2])
    for lx in lanterns:
        wall_lantern(k, lx, r_front + 0.02)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


def footing_face(k, x0, x1, r_face, h, base, rr, skip=()):
    """The footing's face in dressed stone: two courses of blocks of uneven length, each its own tone, a pixel of dark
    joint round every one (the footing behind shows through), the odd one chipped or mossy at its foot."""
    ch = h / 2
    for i in range(2):
        z = i * ch
        x = x0 - (rr.uniform(0.1, 0.3) if i % 2 else 0.0)
        while x < x1 - 0.02:
            L = rr.uniform(0.3, 0.58)
            xa, xb = max(x, x0), min(x + L, x1)
            x += L
            if xb - xa < 0.08 or any(a < (xa + xb) / 2 < b for a, b in skip):
                continue
            c = shade(base, rr.uniform(0.92, 1.22))
            if i == 0 and rr.random() < 0.18:
                c = _mix(c, '#4a6a3a', 0.35)                 # moss low down
            k.box(xa + 0.016, r_face - 0.01, z + 0.016, xb - 0.016, r_face + 0.016, z + ch - 0.012, (c, 0.12), 'footing')


def weather_wall(k, x0, x1, r_face, z0, wall_h, wall, rr, door_x=None, windows=(), posts=(), patch_top=None):
    """Weather on a plaster wall, as the wall's own colour so no line work rings it: rising damp along its foot (a
    darker, greener band, ragged on top), rain streaks under the sills, and now and then a patch where the plaster's
    fallen and the brick shows."""
    damp = _mix(shade(wall, 0.84), '#6a7a5a', 0.2)
    x = x0
    while x < x1 - 0.02:
        w = rr.uniform(0.14, 0.34)
        k.box(x, r_face - 0.004, z0, min(x + w, x1), r_face + 0.006, z0 + rr.uniform(0.06, 0.2), (damp, 0.1), 'house_wall')
        x += w
    for (wx, wz, ww) in windows:                             # streaks under each sill
        for _ in range(rr.choice((1, 2, 2, 3))):
            sx = wx + rr.uniform(-ww / 2, ww / 2)
            L = rr.uniform(0.18, 0.42)
            k.box(sx - 0.016, r_face - 0.004, max(z0 + 0.1, wz - 0.12 - L), sx + 0.016, r_face + 0.007, wz - 0.12,
                  (shade(wall, rr.uniform(0.86, 0.92)), 0.06), 'house_wall')
    if rr.random() < 0.45:                                   # fallen plaster, brick behind
        busy = [(door_x - 0.6, door_x + 0.6)] if door_x is not None else []
        busy += [(wx - ww / 2 - 0.2, wx + ww / 2 + 0.2) for (wx, wz, ww) in windows]
        pw, ph = rr.uniform(0.16, 0.26), rr.uniform(0.12, 0.2)
        busy = [(a - pw, b + pw) for a, b in busy] + [(a - pw, b + pw) for a, b in posts]
        for _ in range(12):
            cx = rr.uniform(x0 + 0.3, x1 - 0.3)
            if not any(a < cx < b for a, b in busy):
                break
        else:
            return
        top = (patch_top if patch_top else wall_h - 0.3) - ph - 0.04
        if top < z0 + ph + 0.04:
            return
        cz = rr.uniform(z0 + ph + 0.04, top)
        k.box(cx - pw, r_face - 0.004, cz - ph, cx + pw, r_face + 0.009, cz + ph, ('#6a4a3a', 0.0), 'house_wall')
        bh, bw, row = 0.085, 0.19, 0
        z = cz - ph
        while z < cz + ph - 0.03:
            half = ph * (1 - ((z + bh / 2 - cz) / ph) ** 2) ** 0.5    # ragged oval edge
            x = cx - pw * half / ph - (bw / 2 if row % 2 else 0)
            while x < cx + pw * half / ph:
                xa, xb = max(x, cx - pw * half / ph), min(x + bw, cx + pw * half / ph)
                if xb - xa > 0.05:
                    k.box(xa + 0.01, r_face + 0.006, z + 0.01, xb - 0.01, r_face + 0.016, z + bh - 0.006,
                          (shade('#9a5a44', rr.uniform(0.8, 1.12)), 0.0), 'house_wall')
                x += bw
            z += bh
            row += 1


def _clear_round(k, x, r, rad):
    """Nothing standing round (x, r) but the ground: rays straight down from under the eaves (1.2 up) at its middle
    and four points round it all land below 0.2 — so the bits at a house's foot never go through a bench, a stall
    or a barrel a scene put there. Asked once the scene is laid out (k.later)."""
    from mathutils import Vector
    k.top(x, r)                                          # (sets up the evaluated scene to cast into)
    for dx, dr in ((0, 0), (rad, 0), (-rad, 0), (0, rad), (0, -rad)):
        hit, loc, _n, _i, _ob, _m = k.scene.ray_cast(k._dg, Vector((x + dx, -(r + dr) * S, 1.2)), Vector((0, 0, -1)))
        if hit and loc.z > 0.2:
            return False
    return True


def wall_foot(k, x0, x1, r_face, door_x, rr, butt=True):
    """Small life at a house's foot, inside its own frontage: a water butt under the downpipe (it comes down the
    wall's right-hand corner), and now and then a barrel, a pair of crates or a broom at the other end — clear of
    the door, the pots beside it and the step, and of anything the scene has already stood there."""
    free = lambda x, w: door_x is None or abs(x - door_x) > 0.75 + w       # noqa: E731
    want_butt = butt and free(x1 - 0.24, 0.2) and rr.random() < 0.7
    tone_b = shade('#6a4628', rr.uniform(0.9, 1.1))
    x = x0 + 0.28
    pick = rr.random() if free(x, 0.2) else 1.0
    tones = [rr.uniform(0.88, 1.1) for _ in range(3)]
    second = rr.random() < 0.6

    def build():
        if want_butt and _clear_round(k, x1 - 0.24, r_face + 0.2, 0.17):
            bx, br = x1 - 0.24, r_face + 0.2
            k.cyl(bx, br, 0.0, 0.52, 0.17, (tone_b, 0.14), 'water_butt', verts=14)
            for zz in (0.08, 0.42):
                k.cyl(bx, br, zz, zz + 0.04, 0.178, '#3a3a3c', 'water_butt', verts=14)
            k.cyl(bx, br, 0.5, 0.525, 0.15, ('#1e2a30', 0.0), 'butt_water', verts=14)
        if pick >= 0.58 or not _clear_round(k, x, r_face + 0.24, 0.18):    # (its back point clear of the footing)
            return
        if pick < 0.25:                                     # a barrel
            k.cyl(x, r_face + 0.2, 0.0, 0.46, 0.16, (shade('#7a5230', tones[0]), 0.14), 'barrel', verts=14)
            for zz in (0.06, 0.36):
                k.cyl(x, r_face + 0.2, zz, zz + 0.035, 0.168, '#3a3a3c', 'barrel', verts=14)
        elif pick < 0.45:                                   # slatted crates, one on another
            crate(k, x - 0.2, r_face + 0.0, s=0.4, tone=shade('#9a7448', tones[1]), solid=False)
            if second:
                crate(k, x - 0.15, r_face + 0.06, s=0.3, z0=0.34, tone=shade('#a8844e', tones[2]), solid=False)
        else:                                               # a broom leant on the wall
            k.tube((x, r_face + 0.22, 0.02), (x + 0.12, r_face + 0.04, 1.0), 0.018, '#8a6a40', 'broom', verts=5)
            k.cone(x, r_face + 0.22, 0.0, 0.26, 0.07, 0.03, ('#b89a58', 0.2), 'broom', verts=8)
    k.later.append(build)


PAVING = ('flagstone', 'cobble', 'grout')


def street_clutter(k, area, seed, density=1.0, straw=(), chalk=None):
    """Small life on a square's paving (Beck: walls and clutter, then "street clutter in the open squares"): an iron
    drain with a damp stain running to it, weeds and a dandelion in the joints, a cracked stone with its chips, a
    stone sunk dark, a fallen leaf or a feather; straw and a dropped apple round the stalls (`straw`: rects), chalk
    hopscotch where children play (`chalk`: (x, r) of its foot, running up the screen). All of it flat - nothing to
    walk round - and placed once the scene is laid out (k.later), only where paving is what's on top, with its own
    dice (seeded), so the scene's dice and everything else they place stay as they were."""
    def paving(x, r):
        name, z = k.top(x, r)
        if name in PAVING and z is not None and z < 0.08:
            on[0] = name                                                     # flat bits take the paving's own part:
            return z                                                         # no line work round a speck
        return None
    on = ['flagstone']

    def damp(rr, x, r, z, rad):
        for _ in range(rr.randint(6, 11)):
            k.cyl(x + rr.uniform(-rad, rad), r + rr.uniform(-rad * 0.7, rad * 0.7), z - 0.01, z + 0.004, rr.uniform(0.04, 0.09),
                  ('#57534a', 0.3), on[0], ry=rr.uniform(0.03, 0.07), verts=8)

    def weeds(rr, x, r, z):
        items = []
        a = rr.uniform(0, math.pi)                                          # along a joint
        for _ in range(rr.randint(7, 14)):
            t, h = rr.uniform(-0.12, 0.12), rr.uniform(0.08, 0.17)
            items.append((x + math.cos(a) * t, r + math.sin(a) * t * 0.7, z, h, rr.uniform(0.012, 0.02),
                          rr.uniform(-0.06, 0.06), rr.uniform(-0.04, 0.02)))
        k.blades(items, (shade('#4e8a36', rr.uniform(0.85, 1.2)), 0.3), on[0])
        if rr.random() < 0.35:
            k.sphere(x + rr.uniform(-0.04, 0.04), r, z + 0.12, 0.03, 0.022, ('#f0c830', 0.2), 'weed_flower', segs=6)

    def run():
        rr = random.Random(seed)
        x0, r0, x1, r1 = area
        for _ in range(int((x1 - x0) * (r1 - r0) * 0.3 * density)):
            x, r = rr.uniform(x0 + 0.3, x1 - 0.3), rr.uniform(r0 + 0.3, r1 - 0.3)
            z = paving(x, r)
            roll = rr.random()
            if z is None:
                continue
            if roll < 0.07:                                                   # an iron drain, damp running to it
                if any(paving(x + dx, r + dr) is None for dx, dr in ((-0.25, -0.18), (0.25, -0.18), (-0.25, 0.18), (0.25, 0.18))):
                    continue
                damp(rr, x, r + 0.22, z, 0.2)
                k.box(x - 0.22, r - 0.15, z - 0.03, x + 0.22, r + 0.15, z + 0.006, '#0c0c0e', 'drain')
                for a, b, c, d in ((-0.22, -0.15, 0.22, -0.11), (-0.22, 0.11, 0.22, 0.15), (-0.22, -0.15, -0.18, 0.15), (0.18, -0.15, 0.22, 0.15)):
                    k.box(x + a, r + b, z + 0.004, x + c, r + d, z + 0.016, ('#34343a', 0.12), 'drain_grate')
                for i in range(5):
                    gx = x - 0.14 + i * 0.07
                    k.box(gx - 0.012, r - 0.12, z + 0.004, gx + 0.012, r + 0.12, z + 0.014, ('#3c3c42', 0.12), 'drain_grate')
            elif roll < 0.42:
                weeds(rr, x, r, z)
            elif roll < 0.55:
                damp(rr, x, r, z, rr.uniform(0.12, 0.22))
            elif roll < 0.68:                                                 # a cracked stone, its chips beside it
                a = rr.uniform(0, math.pi)
                k.bar(x - math.cos(a) * 0.14, r - math.sin(a) * 0.1, x + math.cos(a) * 0.14, r + math.sin(a) * 0.1, z - 0.004, z + 0.003,
                      0.016, '#3a3630', on[0])
                for _ in range(rr.randint(2, 3)):
                    rad = rr.uniform(0.025, 0.045)
                    k.rock(x + rr.uniform(-0.18, 0.18), r + rr.uniform(-0.12, 0.12), z + 0.01, rad, rad * 0.8, rad * 0.6,
                           (shade('#9a9488', rr.uniform(0.85, 1.1)), 0.2), part=on[0], seed=rr.randint(0, 1 << 30))
            elif roll < 0.78:                                                 # a stone sunk and dark, water standing in it
                k.cyl(x, r, z - 0.012, z + 0.002, rr.uniform(0.1, 0.15), ('#4a4c52', 0.04), on[0], ry=rr.uniform(0.07, 0.1), verts=7)
            else:                                                             # a fallen leaf, a feather
                if rr.random() < 0.7:
                    k.cyl(x, r, z, z + 0.006, rr.uniform(0.035, 0.05), (rr.choice(('#8a6a2a', '#a0782e', '#6a7a2e', '#7a4a22')), 0.3),
                          on[0], ry=rr.uniform(0.018, 0.026), verts=6)
                else:
                    a = rr.uniform(0, math.pi)
                    k.bar(x, r, x + math.cos(a) * 0.12, r + math.sin(a) * 0.06, z, z + 0.008, 0.016, ('#e8e4dc', 0.2), on[0])
        for (a0, b0, a1, b1) in straw:                                        # round the stalls: straw, a dropped apple
            for _ in range(int((a1 - a0) * (b1 - b0) * 22)):
                x, r = rr.uniform(a0, a1), rr.uniform(b0, b1)
                z = paving(x, r)
                if z is None:
                    continue
                a, l = rr.uniform(0, math.pi), rr.uniform(0.06, 0.14)
                k.bar(x, r, x + math.cos(a) * l, r + math.sin(a) * l * 0.7, z, z + 0.006, 0.012,
                      (shade('#c8a858', rr.uniform(0.8, 1.15)), 0.3), on[0])
            for _ in range(rr.randint(0, 2)):
                x, r = rr.uniform(a0, a1), rr.uniform(b0, b1)
                z = paving(x, r)
                if z is not None:
                    k.sphere(x, r, z + 0.035, 0.038, 0.035, (rr.choice(('#b02a22', '#c8a028', '#5a8a2a')), 0.2), 'apple', segs=8)
        if chalk:                                                             # hopscotch: 1, 2, 1, 2, 1, and the round home
            s, rows = 0.3, (1, 2, 1, 2, 1)

            def clear(x, r):                                                  # bare paving under all of it, with a margin
                return all(paving(x + dx, r - dy) is not None for dx in (-0.42, -0.2, 0.0, 0.2, 0.42)
                           for dy in [i * 0.15 - 0.1 for i in range(int((s * 5 + 0.55) / 0.15) + 1)])
            # the nearest clear spot to the one asked for (a stall, a lamp post or a planter is often just where it was
            # asked: then the next one along, never on top of it)
            cx, cr = chalk
            spots = sorted(((dx * 0.25, dy * 0.25) for dx in range(-16, 17) for dy in range(-16, 17)),
                           key=lambda d: (d[0] ** 2 + d[1] ** 2, d))
            found = next(((cx + dx, cr + dy) for dx, dy in spots
                          if x0 + 0.4 <= cx + dx <= x1 - 0.4 and r0 + s * 5 + 0.5 <= cr + dy <= r1 and clear(cx + dx, cr + dy)), None)
            print('street clutter: hopscotch', 'at (%.2f, %.2f)' % found if found else 'nowhere clear near (%.2f, %.2f)' % (cx, cr))
            if found:
                cx, cr = found
                c, w = ('#e4e0d4', 0.3), 0.036

                def line(p, q, u, v):                                         # chalk follows the stones' own tops in short
                    across = u - p > v - q                                    # pieces (over cobbles' humps and into their
                    n = max(1, int(((u - p) if across else (v - q)) / 0.05 + 0.5))   # joints), and takes their part, so no
                    for i in range(n):                                        # line work rings it
                        if across:
                            a, b, e, f = p + (u - p) * i / n, q, p + (u - p) * (i + 1) / n, v
                        else:
                            a, b, e, f = p, q + (v - q) * i / n, u, q + (v - q) * (i + 1) / n
                        z = paving((a + e) / 2, (b + f) / 2)
                        if z is not None:
                            k.box(a, b, z - 0.02, e, f, z + 0.004, c, on[0])
                for i, n in enumerate(rows):
                    y1 = cr - i * s
                    for j in range(n):
                        xa = cx - n * s / 2 + j * s
                        for (p, q, u, v) in ((xa, y1 - s, xa + s, y1 - s + w), (xa, y1 - w, xa + s, y1),   # a pixel wide
                                             (xa, y1 - s, xa + w, y1), (xa + s - w, y1 - s, xa + s, y1)):
                            line(p, q, u, v)
                hz = paving(cx, cr - 5 * s - 0.2)
                if hz is not None:
                    annulus(k, cx, cr - 5 * s - 0.2, 0.16, 0.196, hz - 0.02, hz + 0.004, c, on[0], segs=20)
    k.later.append(run)


def dormer(k, cx, ra, rm, ze, zr, roof, wall, shutters, w=0.95):
    """A shed dormer in a front slope (eave at row ra, height ze; ridge at rm, zr): its face upright a third of the
    way up the slope with a window, cheeks back to the roof, a shallow roof of its own, shingled."""
    t = 0.32
    rd, zb = ra + (rm - ra) * t, ze + (zr - ze) * t
    hd = 0.62
    t2 = min(0.92, (zb + hd + 0.02 - ze) / (zr - ze))
    r2 = ra + (rm - ra) * t2
    k.box(cx - w / 2, r2, zb - 0.1, cx + w / 2, rd, zb + hd, (wall, 0.0), 'dormer')
    window(k, cx, rd + 0.01, zb + 0.1, w=0.42, h=0.38, shutters=shutters)
    over = 0.08
    k.quads([((cx - w / 2 - over, rd + 0.12, zb + hd + 0.02), (cx + w / 2 + over, rd + 0.12, zb + hd + 0.02),
              (cx + w / 2 + over, r2, zb + hd + 0.12), (cx - w / 2 - over, r2, zb + hd + 0.12))], shade(roof, 0.95), 'roof')
    zz, i = 0.0, 0
    rows = []
    while zz < 0.95:                                     # a few courses of shingle lines on it
        rr = rd + 0.12 + (r2 - rd - 0.12) * zz
        z_ = zb + hd + 0.02 + 0.1 * zz + 0.004
        rows.append(((cx - w / 2 - over, rr, z_), (cx + w / 2 + over, rr, z_), (cx + w / 2 + over, rr - 0.025, z_ + 0.003), (cx - w / 2 - over, rr - 0.025, z_ + 0.003)))
        zz += 0.24
    k.quads(rows, shade(roof, 0.58), 'roof')
    k.box(cx - w / 2 - over, rd + 0.1, zb + hd - 0.04, cx + w / 2 + over, rd + 0.15, zb + hd + 0.03, WOOD_DD, 'fascia')


def door_hood(k, cx, r_face, z, roof, w=1.1):
    """A little lean-to hood over a door on two brackets, roofed to match."""
    d = 0.42
    k.quads([((cx - w / 2, r_face, z + 0.2), (cx + w / 2, r_face, z + 0.2), (cx + w / 2, r_face + d, z), (cx - w / 2, r_face + d, z))], shade(roof, 0.92), 'roof')
    for j in range(3):                                   # its shingle lines
        rr = r_face + d * (j + 1) / 4
        zz = z + 0.2 - 0.2 * (j + 1) / 4 + 0.005
        k.quads([((cx - w / 2, rr, zz), (cx + w / 2, rr, zz), (cx + w / 2, rr - 0.02, zz + 0.01), (cx - w / 2, rr - 0.02, zz + 0.01))], shade(roof, 0.6), 'roof')
    k.box(cx - w / 2, r_face + d - 0.03, z - 0.06, cx + w / 2, r_face + d + 0.02, z + 0.01, WOOD_DD, 'fascia')
    for sx in (-1, 1):
        k.box(cx + sx * (w / 2 - 0.08) - 0.03, r_face, z - 0.32, cx + sx * (w / 2 - 0.08) + 0.03, r_face + 0.32, z - 0.02, WOOD_DD, 'bracket')


def dress_front(k, x0, x1, r_face, wall_h, door_x=None, window_xs=(), ivy=0.35, pots=0.5):
    """Life on a house front: ivy climbing a stretch of wall clear of the door and windows (leaves, so it turns red in
    autumn and goes bare in winter, js/foliage.js), and potted plants by the door."""
    busy = [(door_x - 0.55, door_x + 0.55)] if door_x is not None else []
    busy += [(wx - 0.42, wx + 0.42) for wx in window_xs]
    clear = [x for x in [x0 + 0.25 + 0.2 * i for i in range(int((x1 - x0 - 0.5) / 0.2) + 1)] if not any(a <= x <= b for a, b in busy)]
    if clear and k.rng.random() < ivy:
        cx = k.rng.choice(clear)
        with k.foliage('leaf'):
            for j in range(18):
                z = 0.3 + (wall_h - 0.4) * (j / 18) ** 0.8
                spread = 0.12 + 0.18 * (1 - j / 18)
                x = cx + k.rng.uniform(-spread, spread)
                if any(a <= x <= b for a, b in busy):
                    continue
                c = shade(k.rng.choice(('#2e5a2a', '#3a6a30', '#2a4e26')), k.rng.uniform(0.9, 1.1))
                k.blob(x, r_face + 0.05, z, k.rng.uniform(0.06, 0.11), 0.05, k.rng.uniform(0.06, 0.1), c, 'ivy', segs=8)
    if door_x is not None and k.rng.random() < pots:
        for side in (-1, 1):
            if k.rng.random() < 0.3:
                continue
            px = door_x + side * k.rng.uniform(0.52, 0.62)
            k.cyl(px, r_face + 0.16, 0.0, 0.2, 0.1, ('#a8583a', 0.08), 'pot', verts=10)
            with k.foliage('leaf'):
                k.blob(px, r_face + 0.16, 0.3, 0.13, 0.11, 0.13, shade('#3a6a30', k.rng.uniform(0.9, 1.1)), 'pot_plant', segs=8)
            if k.rng.random() < 0.6:
                fc = k.rng.choice(('#e04060', '#e0c040', '#a060d0', '#f0f0f0'))
                k.boxes([(px + k.rng.uniform(-0.08, 0.08) - 0.02, r_face + 0.16 - 0.015, 0.38, px + k.rng.uniform(-0.08, 0.08) + 0.02, r_face + 0.16 + 0.015, 0.42)
                         for _ in range(4)], fc, 'pot_flower')


# ---- street furniture --------------------------------------------------------------------
def lantern_post(k, cx, cr, h=2.2, energy=40):
    k.cyl(cx, cr, 0, 0.12, 0.16, IRON, 'post_base', verts=8)
    k.cyl(cx, cr, 0.12, h, 0.045, IRON, 'post', verts=8)
    k.box(cx - 0.02, cr - 0.02, h - 0.15, cx + 0.3, cr + 0.02, h - 0.1, IRON, 'post_arm')
    lx = cx + 0.28
    k.cone(lx, cr, h - 0.2, h - 0.1, 0.03, 0.01, IRON, 'post_hook', verts=4)
    lantern(k, lx, cr, h - 0.5, h - 0.24, s=0.1, energy=energy)
    if energy:      # its pool on the ground: a lamp up a post alone lights the ground no more than the moon does
        k.point_light(lx, cr + 0.12, 0.85, '#ffb060', energy * 1.6, radius=0.3, group='flicker')
    k.solid_post(cx, cr)


def fountain(k, cx, cr, rad=0.95):
    """Round stone basin (a ring wall round dark water), central column with
    a bowl and three brass spouts; the engine adds the spray and ripples."""
    st = shade(STONE, 0.78)
    annulus(k, cx, cr, rad - 0.14, rad, 0.0, 0.5, (st, 0.14), 'basin')
    annulus(k, cx, cr, rad - 0.18, rad + 0.05, 0.5, 0.58, (shade(STONE, 0.92), 0.12), 'basin_rim')
    annulus(k, cx, cr, rad - 0.01, rad + 0.015, 0.16, 0.22, (shade(STONE, 0.6), 0.1), 'basin_band')
    k.cyl(cx, cr, 0.0, 0.44, rad - 0.12, '#141c1e', 'basin_floor', verts=28)
    k.cyl(cx, cr, 0.44, 0.46, rad - 0.13, '#123038', 'basin_water', emit=('#1a4a52', 0.35), verts=28)
    for i in range(10):   # coins glinting under the water
        a = k.rng.uniform(0, 2 * math.pi)
        d = k.rng.uniform(0.3, rad - 0.25)
        k.cyl(cx + math.cos(a) * d, cr + math.sin(a) * d, 0.46, 0.466, 0.03, '#a08030', 'coin', emit=('#e0c060', 0.4), verts=6)
    k.cyl(cx, cr, 0.46, 0.6, 0.24, (st, 0.12), 'fountain_column', verts=12)
    k.cyl(cx, cr, 0.6, 1.25, 0.13, (st, 0.12), 'fountain_column', verts=12)
    annulus(k, cx, cr, 0.24, 0.34, 1.2, 1.35, (shade(STONE, 0.92), 0.12), 'fountain_bowl', segs=18)
    k.cyl(cx, cr, 1.2, 1.31, 0.25, '#123038', 'fountain_bowl_water', emit=('#1a4a52', 0.35), verts=16)
    k.cyl(cx, cr, 1.35, 1.6, 0.06, (st, 0.12), 'fountain_column', verts=10)
    k.sphere(cx, cr, 1.66, 0.09, 0.09, BRASS, 'fountain_finial', segs=10)
    for i in range(3):
        a = i * 2 * math.pi / 3 + math.pi / 2
        tip = (cx + math.cos(a) * 0.36, cr + math.sin(a) * 0.3, 1.42)
        k.tube((cx, cr, 1.5), tip, 0.025, BRASS, 'spout', rb=0.018, verts=6)
    k.point_light(cx, cr + 0.6, 0.9, '#90c0c0', 4, radius=0.3)
    k.solid(cx - rad, cr - rad * 0.8, cx + rad, cr + rad * 0.8)


def bell_tower(k, cx, r_front, w=1.6, h=4.4):
    """Square stone tower with an open belfry, bell and pyramid roof."""
    x0, x1 = cx - w / 2, cx + w / 2
    r0 = r_front - w
    k.box(x0, r0, 0, x1, r_front, h - 1.1, (SALT[3], 0.18), 'tower')
    z, i = 0.0, 0
    while z < h - 1.2:
        x = x0 + (0.0 if i % 2 else 0.2)
        while x < x1:
            k.box(max(x, x0), r_front - 0.02, z + 0.02, min(x + 0.38, x1), r_front + 0.01, z + 0.22,
                  (shade(SALT[3], k.rng.uniform(0.85, 1.1)), 0.14), 'tower_block')
            x += 0.4
        z += 0.24
        i += 1
    door(k, cx, r_front, w=0.6, h=1.1, arch=True)
    window(k, cx, r_front + 0.02, 1.9, w=0.3, h=0.55, shutters=None)
    zb = h - 1.1
    for (xa, ra) in ((x0, r0), (x1 - 0.16, r0), (x0, r_front - 0.16), (x1 - 0.16, r_front - 0.16)):
        k.box(xa, ra, zb, xa + 0.16, ra + 0.16, zb + 0.75, (SALT[3], 0.18), 'belfry_post')
    k.box(x0 - 0.05, r0 - 0.05, zb + 0.75, x1 + 0.05, r_front + 0.05, zb + 0.87, (SALT[2], 0.16), 'belfry_top')
    pyramid(k, x0 - 0.15, r0 - 0.15, x1 + 0.15, r_front + 0.15, zb + 0.87, zb + 1.9, (ROOF_SLATE, 0.16), 'tower_roof')
    k.cone(cx, (r0 + r_front) / 2, zb + 0.15, zb + 0.6, 0.06, 0.32, (BRASS, 0.06), 'bell', verts=14)
    k.sphere(cx, (r0 + r_front) / 2, zb + 0.12, 0.05, 0.05, BRASS, 'bell_clapper', segs=6)
    k.tube((cx, (r0 + r_front) / 2, zb + 1.9), (cx, (r0 + r_front) / 2, zb + 2.25), 0.015, IRON, 'weathervane', verts=4)
    k.box(cx - 0.12, (r0 + r_front) / 2 - 0.01, zb + 2.15, cx + 0.12, (r0 + r_front) / 2 + 0.01, zb + 2.22, IRON, 'weathervane')
    k.solid(x0, r0, x1, r_front)


def market_stall(k, x0, x1, r0, r1, awning=('#a03a2e', '#e8dcc0'), goods='fish'):
    """Wooden stall with a striped awning; fish on ice or produce."""
    k.box(x0, r0, 0, x1, r1, 0.8, (WOOD, 0.14), 'stall_counter', bevel=0.015)
    k.box(x0 - 0.04, r0 - 0.04, 0.8, x1 + 0.04, r1 + 0.04, 0.86, WOOD_D, 'stall_top')
    for xx in (x0, x1 - 0.08):
        for rr in (r0, r1 - 0.08):
            k.box(xx, rr, 0.86, xx + 0.08, rr + 0.08, 1.95, WOOD_D, 'stall_post')
    n = 6
    w = (x1 - x0 + 0.3) / n
    for i in range(n):
        xa = x0 - 0.15 + i * w
        col = awning[i % 2]
        k.poly([(xa, r1 + 0.35, 1.7), (xa + w, r1 + 0.35, 1.7), (xa + w, r0 - 0.1, 2.15), (xa, r0 - 0.1, 2.15)], (col, 0.1), 'awning')
        k.poly([(xa, r1 + 0.35, 1.7), (xa + w, r1 + 0.35, 1.7), (xa + w * 0.5, r1 + 0.38, 1.55)], (col, 0.1), 'awning_flap')
    if goods == 'fish':
        k.box(x0 + 0.08, r0 + 0.08, 0.86, x1 - 0.08, r1 - 0.08, 0.9, '#c8e0e8', 'ice')
        x = x0 + 0.2
        while x < x1 - 0.2:
            col = k.rng.choice(('#7a9aa8', '#a0b8c0', '#c87060', '#8a8a6a'))
            k.blob(x, (r0 + r1) / 2 + k.rng.uniform(-0.1, 0.1), 0.94, 0.14, 0.05, 0.035, col, 'fish', rot=(0, 0, k.rng.uniform(-20, 20)),
                   segs=8)
            x += 0.2
    elif goods:
        for i in range(int((x1 - x0) / 0.35)):
            cx = x0 + 0.2 + i * 0.35
            k.cyl(cx, (r0 + r1) / 2, 0.86, 0.96, 0.15, ('#a07040', 0.15), 'basket', verts=10)
            for j in range(4):
                k.sphere(cx + (j % 2) * 0.08 - 0.04, (r0 + r1) / 2 + (j // 2) * 0.06 - 0.03, 0.99, 0.05, 0.05,
                         k.rng.choice(('#c02020', '#e0a020', '#60a030')), 'produce', segs=8)
    k.solid(x0, r0, x1, r1)


def cart(k, cx, cr):
    """Hand cart heaped with sacks and a crate of apples."""
    k.box(cx - 0.6, cr - 0.35, 0.35, cx + 0.6, cr + 0.35, 0.45, (WOOD, 0.14), 'cart_bed')
    for s in (-1, 1):
        k.box(cx - 0.6, cr + s * 0.35 - 0.03, 0.45, cx + 0.6, cr + s * 0.35 + 0.03, 0.65, WOOD_D, 'cart_side')
    for s in (-1, 1):
        k.cyl_y(cx + 0.1, cr + s * 0.4 - 0.03, cr + s * 0.4 + 0.03, 0.3, 0.3, 0.3, WOOD_DD, 'cart_wheel', verts=14)
        k.cyl_y(cx + 0.1, cr + s * 0.4 - 0.04, cr + s * 0.4 + 0.04, 0.3, 0.06, 0.06, IRON, 'cart_hub', verts=8)
    k.tube((cx - 0.6, cr - 0.2, 0.4), (cx - 1.2, cr - 0.25, 0.15), 0.03, WOOD_D, 'cart_handle', verts=6)
    k.tube((cx - 0.6, cr + 0.2, 0.4), (cx - 1.2, cr + 0.25, 0.15), 0.03, WOOD_D, 'cart_handle', verts=6)
    for (dx, dr) in ((-0.3, -0.12), (0.0, 0.1), (0.25, -0.1)):
        k.blob(cx + dx, cr + dr, 0.62, 0.2, 0.15, 0.17, ('#c8b890', 0.08), 'sack', segs=10)
    crate(k, cx + 0.15, cr - 0.05, s=0.36, z0=0.45, tone=WOOD_L, solid=False, contents='apples')
    k.solid(cx - 1.2, cr - 0.4, cx + 0.6, cr + 0.4)


def bulletin_board(k, cx, cr, w=1.3):
    for s in (-1, 1):
        k.box(cx + s * w / 2 - 0.05, cr - 0.05, 0, cx + s * w / 2 + 0.05, cr + 0.05, 1.7, WOOD_D, 'board_post')
    k.box(cx - w / 2, cr - 0.03, 0.75, cx + w / 2, cr + 0.03, 1.55, (WOOD, 0.12), 'board')
    k.poly([(cx - w / 2 - 0.12, cr + 0.15, 1.6), (cx + w / 2 + 0.12, cr + 0.15, 1.6), (cx + w / 2 + 0.12, cr - 0.15, 1.78),
            (cx - w / 2 - 0.12, cr - 0.15, 1.78)], (ROOF_GREEN, 0.15), 'board_roof')
    for i in range(6):
        x = cx - w / 2 + 0.12 + (i % 3) * 0.4 + k.rng.uniform(-0.03, 0.03)
        z = 0.85 + (i // 3) * 0.33 + k.rng.uniform(-0.03, 0.03)
        k.box(x, cr + 0.03, z, x + 0.26, cr + 0.035, z + 0.26, k.rng.choice(('#e8dcc0', '#d8c8a0', '#f0e8d0')), 'notice')
        k.sphere(x + 0.13, cr + 0.04, z + 0.22, 0.015, 0.015, '#c02020', 'pin', segs=4)
    k.solid(cx - w / 2, cr - 0.3, cx + w / 2, cr + 0.3)


def planter(k, x0, x1, cr, flowers=('#e04060', '#e0c040', '#a060d0')):
    k.box(x0, cr - 0.2, 0, x1, cr + 0.2, 0.32, (WOOD_D, 0.12), 'planter')
    k.box(x0 + 0.04, cr - 0.16, 0.28, x1 - 0.04, cr + 0.16, 0.32, '#2a1a10', 'soil')
    x = x0 + 0.1
    while x < x1 - 0.08:
        k.sphere(x, cr + k.rng.uniform(-0.08, 0.08), 0.42, 0.1, 0.09, ('#2e5a2e', 0.15), 'foliage', segs=8)
        k.sphere(x + 0.03, cr + 0.05, 0.5, 0.04, 0.04, k.rng.choice(flowers), 'flower', segs=6)
        x += 0.17
    k.solid(x0, cr - 0.25, x1, cr + 0.25)


def statue(k, cx, cr):
    """Captain Mira Lumar in bronze on a stone plinth: long coat, tricorn,
    spyglass raised toward the sea, a hand on the anchor at her side."""
    k.box(cx - 0.55, cr - 0.55, 0, cx + 0.55, cr + 0.55, 0.12, (shade(STONE, 0.85), 0.14), 'plinth_step')
    k.box(cx - 0.42, cr - 0.42, 0.12, cx + 0.42, cr + 0.42, 0.85, (shade(STONE, 0.95), 0.14), 'plinth', bevel=0.03)
    k.box(cx - 0.48, cr - 0.48, 0.85, cx + 0.48, cr + 0.48, 0.95, (STONE, 0.12), 'plinth_top')
    k.box(cx - 0.25, cr + 0.42, 0.35, cx + 0.25, cr + 0.44, 0.6, BRASS, 'plaque')
    br = ('#5e8e7a', 0.14)    # verdigris bronze
    for s_ in (-1, 1):        # boots and legs
        k.cyl(cx + s_ * 0.09, cr, 0.95, 1.4, 0.065, br, 'statue', verts=8)
    k.cone(cx, cr, 1.12, 1.75, 0.27, 0.17, br, 'statue_coat', verts=12)
    k.blob(cx, cr, 1.85, 0.2, 0.15, 0.2, br, 'statue', segs=12)
    k.sphere(cx, cr, 2.12, 0.1, 0.11, br, 'statue', segs=10)
    k.blob(cx, cr, 2.22, 0.2, 0.17, 0.05, br, 'statue_hat', segs=10)          # tricorn brim
    k.cone(cx, cr, 2.22, 2.36, 0.12, 0.05, br, 'statue_hat', verts=3)
    k.tube((cx + 0.17, cr, 1.95), (cx + 0.3, cr + 0.12, 2.12), 0.045, br, 'statue_arm', verts=6)
    k.tube((cx + 0.3, cr + 0.12, 2.12), (cx + 0.18, cr + 0.16, 2.14), 0.04, br, 'statue_arm', verts=6)
    k.tube((cx + 0.16, cr + 0.17, 2.14), (cx + 0.42, cr + 0.25, 2.24), 0.035, BRASS, 'spyglass', rb=0.025, verts=8)
    k.tube((cx - 0.17, cr, 1.95), (cx - 0.3, cr + 0.08, 1.55), 0.045, br, 'statue_arm', verts=6)
    k.cyl(cx - 0.33, cr + 0.1, 0.95, 1.55, 0.025, br, 'statue_anchor', verts=6)          # anchor shank
    k.cyl_x(cx - 0.45, cx - 0.21, cr + 0.1, 1.45, 0.025, 0.025, br, 'statue_anchor', verts=6)
    k.tube((cx - 0.5, cr + 0.1, 1.1), (cx - 0.33, cr + 0.1, 0.97), 0.03, br, 'statue_anchor', verts=6)
    k.tube((cx - 0.16, cr + 0.1, 1.1), (cx - 0.33, cr + 0.1, 0.97), 0.03, br, 'statue_anchor', verts=6)
    k.point_light(cx, cr + 1.0, 0.25, '#ffd0a0', 6, radius=0.2)          # lit from below
    k.solid(cx - 0.55, cr - 0.55, cx + 0.55, cr + 0.55)


def stone_steps(k, x0, x1, r0, r1, z_top=0.0, z_bot=-0.9, n=6):
    """Steps going down toward the camera (a trail off the edge of the map)."""
    for i in range(n):
        ra = r0 + (r1 - r0) * i / n
        rb = r0 + (r1 - r0) * (i + 1) / n
        z = z_top + (z_bot - z_top) * (i + 1) / n
        k.box(x0, ra, z - 0.2, x1, rb, z + (z_top - z_bot) / n * 0.2, (shade(STONE, k.rng.uniform(0.95, 1.12)), 0.14), 'steps')
        k.box(x0, rb - 0.04, z + (z_top - z_bot) / n * 0.2 - 0.03, x1, rb, z + (z_top - z_bot) / n * 0.2,
              shade(STONE, 1.25), 'step_nose')
    for xx in (x0 - 0.3, x1):
        k.box(xx, r0, z_bot - 0.3, xx + 0.3, r1, 0.25, (SALT[3], 0.18), 'trail_wall')
        k.box(xx - 0.03, r0, 0.25, xx + 0.33, r1, 0.32, (shade(STONE, 0.9), 0.12), 'trail_wall_cap')
    k.point_light((x0 + x1) / 2, (r0 + r1) / 2 + 0.5, 0.8, '#ffc890', 12, radius=0.4)


# ---- harbour -------------------------------------------------------------------------------
def dock(k, x0, x1, r0, r1, z=0.1, piles=True):
    """Plank pier over the water, piles below."""
    r = r0
    while r < r1 - 1e-6:
        k.box(x0, r + 0.02, z - 0.06, x1, min(r1, r + 0.3) - 0.02, z, (shade(WOOD, k.rng.uniform(0.85, 1.1)), 0.16), 'dock_plank')
        r += 0.3
    k.box(x0, r0, z - 0.2, x0 + 0.08, r1, z - 0.06, WOOD_DD, 'dock_beam')
    k.box(x1 - 0.08, r0, z - 0.2, x1, r1, z - 0.06, WOOD_DD, 'dock_beam')
    if piles:
        r = r0 + 0.2
        while r < r1:
            for xx in (x0 + 0.05, x1 - 0.05):
                k.cyl(xx, r, -0.9, z + 0.25, 0.08, (WOOD_D, 0.14), 'pile', verts=8)
            r += 1.2


def rock_shore(k, cells, tone=SALT[2]):
    """Saltstone rocks along a shoreline: cells = [(x, r)] points."""
    for (x, r) in cells:
        s = k.rng.uniform(0.25, 0.45)
        k.rock(x, r, -0.05, s, s * 0.8, s * 0.55, (shade(tone, k.rng.uniform(0.8, 1.1)), 0.18), part='shore_rock')


def boat(k, cx, cr, length=2.4, hull=WOOD_D, sail=None):
    """Rowing boat (or a small sailboat) moored along the rows axis."""
    L = length
    k.blob(cx, cr, 0.05, 0.42, L / 2, 0.28, (hull, 0.14), 'boat_hull', segs=18)
    k.blob(cx, cr, 0.18, 0.34, L / 2 - 0.12, 0.08, '#2a1a0a', 'boat_inside', segs=16)
    for dr in (-0.35, 0.3):
        k.box(cx - 0.3, cr + dr - 0.06, 0.12, cx + 0.3, cr + dr + 0.06, 0.18, WOOD, 'boat_seat')
    if sail:
        k.cyl(cx, cr - 0.2, 0.15, 2.1, 0.03, WOOD_D, 'mast', verts=6)
        k.poly([(cx, cr - 0.2, 2.05), (cx, cr - 0.2, 0.5), (cx + 0.05, cr + 0.9, 0.5)], (sail, 0.05), 'sail')


def ship_at_dock(k, cx, cr, length=5.0, hull='#3a2410', sail='#d8ccb0'):
    """The Meridian-style trading ship berthed along a pier (long axis along
    rows), two masts with furled sails, lanterns at the stern."""
    L = length
    k.blob(cx, cr, 0.2, 0.9, L / 2, 0.55, (hull, 0.16), 'ship_hull', segs=24)
    k.box(cx - 0.75, cr - L / 2 + 0.6, 0.5, cx + 0.75, cr + L / 2 - 0.5, 0.6, (WOOD, 0.14), 'ship_deck')
    k.box(cx - 0.6, cr + L / 2 - 1.3, 0.6, cx + 0.6, cr + L / 2 - 0.4, 1.1, (WOOD_D, 0.14), 'ship_cabin')
    window(k, cx, cr + L / 2 - 0.4, 0.75, w=0.3, h=0.22, shutters=None)
    for (rm, h) in ((cr - L * 0.2, 3.2), (cr + L * 0.08, 2.8)):
        k.cyl(cx, rm, 0.6, 0.6 + h, 0.05, WOOD_D, 'mast', verts=8)
        k.box(cx - 0.8, rm - 0.04, 0.6 + h * 0.7, cx + 0.8, rm + 0.04, 0.6 + h * 0.7 + 0.08, WOOD_D, 'yard')
        k.cyl_x(cx - 0.75, cx + 0.75, rm, 0.6 + h * 0.7 - 0.06, 0.08, 0.08, (sail, 0.08), 'furled_sail', verts=8)
    k.tube((cx, cr - L / 2 + 0.3, 0.6), (cx, cr - L / 2 - 0.6, 0.9), 0.04, WOOD_D, 'bowsprit', verts=6)
    for s in (-1, 1):
        wall_lantern(k, cx + s * 0.5, cr + L / 2 - 0.42, z=1.25, energy=8)


# ---- islands -------------------------------------------------------------------------------------
def _cell_pieces(rect, cells):
    """Split a rectangle into the parts lying on `cells` (whole if it lies
    entirely on them)."""
    x0, r0, x1, r1 = rect
    cover = [(c, r) for c in range(int(math.floor(x0)), int(math.ceil(x1))) for r in range(int(math.floor(r0)), int(math.ceil(r1)))]
    if all(cr in cells for cr in cover):
        return [rect]
    return [(max(x0, c), max(r0, r), min(x1, c + 1), min(r1, r + 1)) for (c, r) in cover if (c, r) in cells]


def flagstones(k, cells, tone, gap=0.03):
    """Running-bond flagstones over the cells: courses of random height,
    stones of random length, so the seams never line up with the tiles."""
    cells = set(cells)
    if not cells:
        return
    c0, c1 = min(c for c, r in cells), max(c for c, r in cells) + 1
    r0, r1 = min(r for c, r in cells), max(r for c, r in cells) + 1
    r = r0
    while r < r1 - 1e-6:
        h = min(k.rng.uniform(0.42, 0.68), r1 - r)
        if r1 - (r + h) < 0.25:
            h = r1 - r
        x = c0 - k.rng.uniform(0.0, 0.6)
        while x < c1 - 1e-6:
            w = k.rng.uniform(0.5, 1.15)
            a0, a1 = max(x, c0), min(x + w, c1)
            if a1 - a0 > 0.08:
                for (px0, pr0, px1, pr1) in _cell_pieces((a0, r, a1, r + h), cells):
                    if px1 - px0 > 0.12 and pr1 - pr0 > 0.12:
                        k.box(px0 + gap, pr0 + gap, -0.05, px1 - gap, pr1 - gap, k.rng.uniform(-0.01, 0.012),
                              (shade(tone, k.rng.uniform(0.85, 1.12)), 0.16), 'flagstone', bevel=0.02)
            x += w
        r += h


def island_ground(k, cells, tone='#5a6058', cliff=SALT[1], depth=0.9, grass='#34462e', rim=(), coast=False):
    """Island ground: flagstones in the middle, grass and moss toward the
    rocky rim (and under the rim boulders); rock faces drop into the sea
    along the edges that face the camera, boulders along the rest — or,
    with coast=True, nothing at the edges: assets_coast builds the shore."""
    cells = set(cells)
    rim = set(rim)

    def edge(c, r):
        return any((c + dc, r + dr) not in cells or (c + dc, r + dr) in rim for dc in (-1, 0, 1) for dr in (-1, 0, 1))

    green = {(c, r) for (c, r) in cells if (c, r) in rim or (edge(c, r) and k.rng.random() < 0.55)}
    flagstones(k, cells - green, tone)
    for (c, r) in cells:
        k.box(c, r, -0.25, c + 1, r + 1, -0.05, ('#2e2c28', 0.2), 'ground_fill')
        if (c, r) in green:
            k.box(c, r, -0.07, c + 1, r + 1, -0.02, (shade(grass, k.rng.uniform(0.9, 1.1)), 0.3), 'grass')
            for _ in range(4):
                x, rr = c + k.rng.uniform(0.1, 0.9), r + k.rng.uniform(0.1, 0.9)
                for j in range(3):
                    k.cone(x + j * 0.04 - 0.04, rr, -0.02, k.rng.uniform(0.08, 0.15), 0.025, 0.002,
                           shade(grass, k.rng.uniform(1.1, 1.5)), 'tuft', verts=3)
        elif k.rng.random() < 0.35:     # moss creeping into the joints
            k.blob(c + k.rng.uniform(0.2, 0.8), r + k.rng.uniform(0.2, 0.8), 0.0, 0.16, 0.1, 0.02,
                   (shade(grass, 1.1), 0.2), 'moss', segs=8)
        if coast:
            continue
        if (c, r + 1) not in cells:      # south edge: a rock face into the water
            k.box(c, r + 0.92, -depth, c + 1, r + 1.05, -0.03, (cliff, 0.2), 'island_face')
            for i in range(2):
                s = k.rng.uniform(0.25, 0.4)
                k.rock(c + 0.25 + i * 0.5, r + 1.05, -0.35, s, s * 0.6, s, (shade(cliff, k.rng.uniform(0.8, 1.2)), 0.2),
                       part='island_rock')
        for (dc, dr) in ((-1, 0), (1, 0), (0, -1)):
            if (c + dc, r + dr) not in cells:
                x = c + 0.5 + dc * 0.55
                rr = r + 0.5 + dr * 0.55
                s = k.rng.uniform(0.28, 0.42)
                k.rock(x, rr, -0.2, s, s * 0.8, s * 0.9, (shade(cliff, k.rng.uniform(0.8, 1.2)), 0.2), part='island_rock')


def border_rocks(k, cells, tone=SALT[2]):
    """Piled boulders on the island's rocky rim cells (non-walkable)."""
    for (c, r) in cells:
        for i in range(2):
            s = k.rng.uniform(0.22, 0.36)
            k.rock(c + k.rng.uniform(0.25, 0.75), r + k.rng.uniform(0.3, 0.7), s * 0.3, s, s * 0.8, s * 0.8,
                   (shade(tone, k.rng.uniform(0.75, 1.1)), 0.2), part='rim_rock')
        k.solid(c, r, c + 1, r + 1)


def shore_crystals(k, cx, cr, col=('#6a1a2a', '#e04060'), s=1.0, energy=8, z=0.0, solid=True):
    """Spore crystals growing out of the rocks, glowing. solid=False for a small clump you can walk past."""
    for (dx, dr, h, rad, lean) in ((0.0, 0.0, 0.8, 0.1, 0), (0.15, 0.08, 0.5, 0.07, 22), (-0.14, 0.1, 0.45, 0.07, -18),
                                   (0.05, -0.12, 0.35, 0.06, 8)):
        top = (cx + dx + math.sin(math.radians(lean)) * h * s * 0.5, cr + dr, z + h * s)
        k.tube((cx + dx, cr + dr, z), top, rad * s, col[0], 'crystal', rb=0.004, emit=(col[1], 0.75), verts=6, smooth=False)
    k.point_light(cx, cr + 0.3, z + 0.5 * s, col[1], energy, radius=0.12, group='flicker')
    if solid:
        k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def silver_post(k, cx, cr):
    k.cyl(cx, cr, -0.6, 0.7, 0.07, ('#a8b0b8', 0.06), 'silver_post', verts=8)
    k.sphere(cx, cr, 0.74, 0.08, 0.08, '#c8d0d8', 'post_cap', segs=8)
    k.tube((cx, cr, 0.6), (cx + 0.6, cr - 0.1, 0.25), 0.012, '#8a7a5a', 'mooring_rope', verts=4)


def wanted_poster(k, cx, cr):
    k.box(cx - 0.05, cr - 0.05, 0, cx + 0.05, cr + 0.05, 1.5, WOOD_D, 'poster_post')
    k.box(cx - 0.3, cr + 0.05, 0.8, cx + 0.3, cr + 0.08, 1.45, '#d8c8a0', 'wanted')
    k.box(cx - 0.2, cr + 0.08, 1.25, cx + 0.2, cr + 0.09, 1.35, '#3a2010', 'wanted_text')
    k.blob(cx, cr + 0.09, 1.05, 0.12, 0.005, 0.12, '#6a4a30', 'wanted_face', segs=8)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def cave_mouth(k, cx, r_face, w=1.2, h=1.1):
    """Rocky outcrop with a black cave opening facing the camera."""
    for i in range(7):
        a = i * math.pi / 6
        s = k.rng.uniform(0.35, 0.5)
        k.rock(cx + math.cos(a) * (w * 0.75), r_face - 0.3, math.sin(a) * h * 0.9 + 0.1, s, s * 0.8, s,
               (shade(SALT[2], k.rng.uniform(0.75, 1.0)), 0.2), part='cave_rock')
    k.rock(cx, r_face - 0.6, h + 0.3, 0.9, 0.6, 0.45, (SALT[2], 0.2), part='cave_rock')
    k.cyl_y(cx, r_face - 0.4, r_face - 0.05, h * 0.45, w * 0.5, h * 0.55, '#050302', 'cave_dark', verts=16)
    k.box(cx - w * 0.5, r_face - 0.4, 0.0, cx + w * 0.5, r_face - 0.05, h * 0.45, '#050302', 'cave_dark')
    k.point_light(cx, r_face - 0.1, 0.4, '#ff5020', 4, radius=0.1, group='flicker')   # a glow from deep inside


def workshop(k, x0, x1, r_back, r_front):
    """Sprouter's workshop: small stone hut, round window, silver trim."""
    house(k, x0, x1, r_back, r_front, wall_h=1.7, rise=0.9, roof='#5a2a40', wall='#a89aa0', door_x=(x0 + x1) / 2,
          windows=[(x0 + 0.5, 0.8)], stone=True)


def wind_chimes(k, cx, cr):
    k.box(cx - 0.04, cr - 0.04, 0, cx + 0.04, cr + 0.04, 1.6, WOOD_D, 'chime_post')
    k.box(cx - 0.04, cr - 0.04, 1.56, cx + 0.35, cr + 0.04, 1.62, WOOD_D, 'chime_arm')
    for i in range(5):
        x = cx + 0.08 + i * 0.06
        L = 0.2 + 0.06 * (i % 3)
        k.cyl(x, cr, 1.56 - L - 0.12, 1.56 - 0.12, 0.012, '#e8e0f0', 'chime', verts=5)
        k.cyl(x, cr, 1.56 - 0.12, 1.56, 0.003, '#8a8a8a', 'chime_string', verts=3)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def potter_wheel(k, cx, cr):
    k.cyl(cx, cr, 0, 0.45, 0.2, (WOOD_D, 0.12), 'wheel_base', verts=12)
    k.cyl(cx, cr, 0.45, 0.5, 0.28, (WOOD, 0.12), 'wheel', verts=16)
    k.cyl(cx, cr, 0.5, 0.68, 0.11, ('#a05a3a', 0.1), 'clay_pot', verts=12)
    for (dx, dr, h) in ((0.45, 0.2, 0.3), (0.62, -0.05, 0.22), (0.5, -0.25, 0.35)):
        k.cyl(cx + dx, cr + dr, 0, h, 0.09, ('#2a5a9a' if h > 0.3 else '#a05a3a', 0.1), 'pot', verts=10)
    k.solid(cx - 0.35, cr - 0.35, cx + 0.75, cr + 0.35)


# ---- ships, broadside to the camera -------------------------------------------------------------
def _hull(k, x0, x1, rc, beam, zt, zb, shape, col, part, n=24):
    """Lofted open hull along the columns: `shape(t)` gives the half-beam
    fraction at t (0 stern → 1 bow), zt(t)/zb(t) the gunwale and keel."""
    rings = []
    for i in range(n + 1):
        t = i / n
        hw = beam / 2 * max(0.03, shape(t))
        top, bot = zt(t), zb(t)
        ring = []
        for j in range(9):
            th = math.pi + j * math.pi / 8
            c, s = math.cos(th), abs(math.sin(th))
            ring.append((x0 + t * (x1 - x0), rc + hw * math.copysign(abs(c) ** 0.55, c), top - (top - bot) * s ** 0.75))
        rings.append(ring)
    k.loft(rings, col, part)
    return rings


def galleon(k, x0, x1, rc, beam=1.6, hull='#3a2410', wale='#8a6a30', paint='#2a5446', sail='#d8ccb0', flag='#2e8a5a',
            masts=1.0, sails='furled', waterline=True, wreck=False):
    """Lumar's trading galleon berthed broadside to the camera: lofted hull
    with a gilded wale and gunports, a stern castle with lit windows, three
    masts with sails furled on their yards, rigging, bowsprit, lanterns.
    Stern at x0, bow at x1. wreck=True: masts snapped off, one yard and a
    rag of sail hanging, holes stove in the side, no lights."""
    L = x1 - x0
    shape = lambda t: (0.84 + 0.16 * min(1.0, t / 0.25)) if t < 0.6 else math.sqrt(max(0.0, 1 - ((t - 0.6) / 0.4) ** 2))
    zt = lambda t: 1.0 + 0.3 * max(0.0, t - 0.8) / 0.2
    zb = lambda t: -0.45 + 0.75 * max(0.0, t - 0.7) / 0.3 + 0.15 * max(0.0, 0.15 - t) / 0.15
    _hull(k, x0, x1, rc, beam, zt, zb, shape, (hull, 0.16), 'ship_hull')
    hw = lambda t: beam / 2 * max(0.03, shape(t))
    # transom
    k.poly([(x0, rc + hw(0) * s, z) for s, z in ((-1, zt(0)), (-0.9, 0.2), (0, zb(0)), (0.9, 0.2), (1, zt(0)))],
           (shade(hull, 0.85), 0.16), 'ship_hull')
    # deck, inside the bulwarks
    zd = 0.72
    edge = [t / 20 for t in range(21)]
    pts = [(x0 + t * L, rc - hw(t) * 0.9, zd) for t in edge] + [(x0 + t * L, rc + hw(t) * 0.9, zd) for t in reversed(edge)]
    k.poly(pts, (shade(WOOD_D, 1.05), 0.16), 'ship_deck')
    for i in range(1, 6):     # deck planking seams
        rr = rc - hw(0.5) * 0.9 + i * hw(0.5) * 1.8 / 6
        k.box(x0 + 0.1, rr - 0.008, zd, x0 + L * 0.82, rr + 0.008, zd + 0.004, WOOD_DD, 'deck_seam')

    # gilded wale and a row of gunports along the side facing the camera
    for i in range(20):
        ta, tb = i / 20, (i + 1) / 20
        if tb > 0.97:
            break
        k.tube((x0 + ta * L, rc + hw(ta) * 1.0, zt(ta) - 0.2), (x0 + tb * L, rc + hw(tb) * 1.0, zt(tb) - 0.2), 0.035, wale,
               'ship_wale', verts=6)
    band = [[(x0 + t * L, rc + hw(t) * 0.975 + 0.012, 0.32), (x0 + t * L, rc + hw(t) * 0.997 + 0.012, 0.64)]
            for t in (0.02 + i * 0.91 / 24 for i in range(25))]
    k.loft(band, (paint, 0.12), 'ship_band')
    # the sea is the engine's backdrop: a holdout plane at the waterline hides
    # the hull below it, and a line of foam sits where it meets the water
    if waterline:
        k.box(x0 - 0.7, rc - beam / 2 - 0.05, -0.02, x1 + 1.7, rc + beam / 2 + 0.7, 0.0, 'HOLDOUT', 'waterline')
    for i in range(22):
        ta, tb = i / 22, (i + 1) / 22
        k.tube((x0 + ta * L, rc + hw(ta) * 0.88 + 0.03, 0.02), (x0 + tb * L, rc + hw(tb) * 0.88 + 0.03, 0.02), 0.03,
               '#2a4a40', 'foam', emit=(SEA_FOAM, 0.14), verts=6)
    t = 0.24
    while t < 0.74:
        x = x0 + t * L
        k.box(x - 0.11, rc + hw(t) * 0.97, 0.38, x + 0.11, rc + hw(t) + 0.03, 0.56, '#120a04', 'gunport')
        k.box(x - 0.13, rc + hw(t) + 0.02, 0.56, x + 0.13, rc + hw(t) + 0.05, 0.6, wale, 'gunport_lid')
        t += 0.085

    # stern castle
    cx1 = x0 + L * 0.2
    k.box(x0 + 0.04, rc - hw(0.05) * 0.85, zd, cx1, rc + hw(0.05) * 0.85, 1.55, (shade(hull, 1.15), 0.14), 'ship_castle')
    k.box(x0 - 0.02, rc - hw(0.05) * 0.9, 1.55, cx1 + 0.06, rc + hw(0.05) * 0.9, 1.6, (WOOD_D, 0.14), 'ship_castle_top')
    k.box(x0 - 0.02, rc + hw(0.05) * 0.9 - 0.02, 1.5, cx1 + 0.06, rc + hw(0.05) * 0.9 + 0.02, 1.6, wale, 'ship_trim')
    for i in range(4):                 # gilded pilasters between the stern windows
        px = x0 + 0.12 + i * (cx1 - x0 - 0.2) / 3
        k.box(px - 0.025, rc + hw(0.05) * 0.85, zd + 0.05, px + 0.025, rc + hw(0.05) * 0.85 + 0.03, 1.5, wale, 'ship_trim')
    # ship's wheel on the poop deck
    k.cyl_y(cx1 - 0.35, rc + 0.05, rc + 0.09, 1.85, 0.2, 0.2, WOOD_DD, 'ship_wheel', verts=12)
    k.cyl_y(cx1 - 0.35, rc + 0.09, rc + 0.1, 1.85, 0.15, 0.15, (WOOD_D, 0.1), 'ship_wheel_hub', verts=12)
    k.box(cx1 - 0.38, rc + 0.0, 1.6, cx1 - 0.32, rc + 0.08, 1.85, WOOD_DD, 'ship_wheel_post')
    for i in range(int((cx1 - x0) / 0.25)):
        xx = x0 + 0.12 + i * 0.25
        k.box(xx - 0.02, rc + hw(0.05) * 0.85 - 0.04, 1.62, xx + 0.02, rc + hw(0.05) * 0.85, 1.85, WOOD_DD, 'ship_rail')
    k.box(x0 + 0.04, rc + hw(0.05) * 0.85 - 0.04, 1.85, cx1, rc + hw(0.05) * 0.85, 1.89, WOOD_DD, 'ship_rail')
    for i in range(3):
        wx = x0 + 0.3 + i * (cx1 - x0 - 0.4) / 2
        if wreck:
            k.box(wx - 0.12, rc + hw(0.05) * 0.85, 0.8, wx + 0.12, rc + hw(0.05) * 0.85 + 0.02, 1.1, '#0a0604', 'dead_window')
        else:
            window(k, wx, rc + hw(0.05) * 0.85, 0.95, w=0.24, h=0.3, shutters=None)
    if wreck:                          # holes stove in below the wale, planks sprung round them
        for (t, w, h) in ((0.36, 0.5, 0.3), (0.58, 0.32, 0.22), (0.8, 0.26, 0.2)):
            x = x0 + t * L
            k.box(x - w / 2, rc + hw(t) * 0.99, 0.12, x + w / 2, rc + hw(t) + 0.04, 0.12 + h, '#0a0604', 'hull_hole')
            for j in range(3):
                a = (j - 1) * 0.5
                k.tube((x + (j - 1) * w * 0.35, rc + hw(t) + 0.03, 0.12 + h), (x + (j - 1) * w * 0.4 + a * 0.1, rc + hw(t) + 0.12, 0.12 + h + 0.12),
                       0.02, shade(hull, 1.2), 'sprung_plank', verts=4)
    k.box(cx1 - 0.3, rc - 0.2, zd, cx1 + 0.02, rc + 0.2, 1.3, WOOD_DD, 'castle_door')
    # forecastle
    fx0 = x0 + L * 0.74
    k.box(fx0, rc - hw(0.76) * 0.8, zd, x0 + L * 0.9, rc + hw(0.76) * 0.8, 1.2, (shade(hull, 1.1), 0.14), 'ship_castle')
    k.box(fx0 - 0.03, rc - hw(0.76) * 0.85, 1.2, x0 + L * 0.9, rc + hw(0.76) * 0.85, 1.24, (WOOD_D, 0.14), 'ship_castle_top')
    k.box(fx0 - 0.03, rc + hw(0.76) * 0.85 - 0.02, 1.16, x0 + L * 0.9, rc + hw(0.76) * 0.85 + 0.02, 1.24, wale, 'ship_trim')
    # cargo amidships: a hatch grating, barrels, crates, a coil of rope, the capstan
    hx = x0 + L * 0.43
    k.box(hx - 0.35, rc - 0.3, zd, hx + 0.35, rc + 0.3, zd + 0.12, WOOD_DD, 'hatch')
    for i in range(5):
        k.box(hx - 0.3 + i * 0.15, rc - 0.26, zd + 0.12, hx - 0.27 + i * 0.15, rc + 0.26, zd + 0.14, WOOD, 'hatch_grate')
    for (bx, br) in ((x0 + L * 0.25, rc - 0.25), (x0 + L * 0.25 + 0.3, rc - 0.3), (x0 + L * 0.25 + 0.15, rc + 0.1)):
        k.cyl(bx, br, zd, zd + 0.4, 0.14, (WOOD, 0.1), 'barrel', verts=12)
        k.cyl(bx, br, zd + 0.28, zd + 0.32, 0.145, IRON, 'barrel_hoop', verts=12)
    crate(k, x0 + L * 0.62, rc - 0.4, s=0.38, z0=zd, solid=False)
    crate(k, x0 + L * 0.62 + 0.05, rc - 0.35, s=0.3, z0=zd + 0.33, solid=False, tone=WOOD)
    for i in range(3):
        k.cyl(x0 + L * 0.66, rc + 0.25, zd + i * 0.03, zd + 0.03 + i * 0.03, 0.17 - i * 0.03, '#8a7450', 'rope', verts=12)
    k.cyl(fx0 - 0.3, rc, zd, zd + 0.3, 0.12, (WOOD_D, 0.1), 'capstan', verts=10)
    k.cyl(fx0 - 0.3, rc, zd + 0.3, zd + 0.36, 0.16, WOOD_DD, 'capstan_top', verts=10)
    # bowsprit
    bow = (x1 - 0.2, rc, zt(1) - 0.05)
    tip = (x1 + 1.4, rc, zt(1) + 0.75)
    k.tube(bow, tip, 0.05, WOOD_D, 'bowsprit', rb=0.025, verts=8)
    k.blob(x1 - 0.05, rc, zt(1) - 0.25, 0.14, 0.09, 0.18, (wale, 0.1), 'figurehead', segs=10)

    # masts, furled sails on yards running along the keel so they read side-on
    tops = []
    if wreck:                          # stumps snapped off at a slant, a yard and a rag of sail hanging from the main
        for (t, h) in ((0.32, 1.6 * masts), (0.54, 2.9 * masts), (0.76, 0.9 * masts)):
            mx = x0 + t * L
            k.cyl(mx, rc, zd, zd + h, 0.065, (WOOD_D, 0.12), 'mast', verts=10)
            k.cone(mx, rc, zd + h, zd + h + 0.22, 0.065, 0.012, (shade(WOOD_D, 1.2), 0.12), 'mast_break', verts=6)
        mx = x0 + 0.54 * L
        top = (mx - 0.9, rc + 0.1, zd + 2.6 * masts)
        bot = (mx + 0.8, rc + 0.25, zd + 1.3 * masts)
        k.tube(top, bot, 0.03, WOOD_DD, 'yard', verts=6)
        k.poly([top, (top[0] + 0.3, top[1] + 0.05, top[2] - 0.9), (bot[0] - 0.4, bot[1] + 0.05, bot[2] - 0.5), bot],
               (sail, 0.1), 'sail_rag')
        k.tube((mx, rc, zd + 2.9 * masts), (x0 + 0.2, rc + 0.4, 1.7), 0.012, '#2a2018', 'rigging', verts=4)
        k.tube((mx, rc, zd + 2.9 * masts), (x1 - 0.3, rc - 0.3, 0.9), 0.012, '#2a2018', 'rigging', verts=4)
        for c in range(int(x0), int(math.ceil(x1))):
            k.solid(c, int(rc - beam / 2 + 0.2), c + 1, int(rc + beam / 2) + 1)
        return
    for (t, h) in ((0.32, 4.5 * masts), (0.54, 5.1 * masts), (0.76, 4.2 * masts)):
        mx = x0 + t * L
        k.cyl(mx, rc, zd, zd + h, 0.065, (WOOD_D, 0.12), 'mast', verts=10)
        k.cyl(mx, rc, zd + h * 0.62, zd + h * 0.65, 0.2, WOOD_DD, 'mast_top', verts=10)
        for (f, span) in ((0.45, 1.1), (0.8, 0.8)):
            z = zd + h * f
            k.cyl_x(mx - span, mx + span, rc, z, 0.03, 0.03, WOOD_DD, 'yard', verts=6)
            if sails == 'set':            # sail set and drawing, bellied out toward the camera
                z_bot = zd + h * (0.17 if f < 0.6 else 0.5)
                rows = []
                for j, ff in enumerate((0.0, 0.33, 0.66, 1.0)):
                    zz = z - (z - z_bot) * ff
                    bel = math.sin(math.pi * ff) * 0.26
                    wid = span * (1 + 0.06 * ff)
                    rows.append([(mx + wid * u, rc + 0.06 + bel * (1 - abs(u) * 0.6), zz) for u in (-1, -0.5, 0, 0.5, 1)])
                k.loft([[rows[j][i] for j in range(4)] for i in range(5)], (sail, 0.1), 'sail_set')
                for i in (1, 2, 3):
                    k.tube(rows[0][i], rows[1][i], 0.008, shade(sail, 0.72), 'sail_seam', verts=3)
                    k.tube(rows[1][i], rows[2][i], 0.008, shade(sail, 0.72), 'sail_seam', verts=3)
                    k.tube(rows[2][i], rows[3][i], 0.008, shade(sail, 0.72), 'sail_seam', verts=3)
                k.tube(rows[0][0], rows[3][0], 0.01, shade(sail, 0.7), 'sail_leech', verts=3)
                k.tube(rows[0][4], rows[3][4], 0.01, shade(sail, 0.7), 'sail_leech', verts=3)
                k.tube(rows[3][0], rows[3][4], 0.012, shade(sail, 0.75), 'sail_foot', verts=4)
            else:
                k.cyl_x(mx - span * 0.92, mx + span * 0.92, rc + 0.02, z - 0.08, 0.1, 0.09, (sail, 0.1), 'furled_sail', verts=8)
                for s in (-0.5, 0.0, 0.5):      # gaskets binding the furled sail
                    k.cyl_x(mx + s * span - 0.02, mx + s * span + 0.02, rc + 0.02, z - 0.08, 0.11, 0.1, WOOD_DD, 'gasket', verts=6)
        tops.append((mx, rc, zd + h))
        k.poly([(mx, rc, zd + h + 0.02), (mx, rc, zd + h - 0.3), (mx + 0.75, rc + 0.02, zd + h - 0.12)], (flag, 0.08), 'pennant')
    # rigging: shrouds down to both rails, stays fore and aft
    for (mx, mr, mz) in tops:
        for s in (-1, 1):
            for dx in (-0.3, 0.0, 0.3):
                t = (mx + dx - x0) / L
                k.tube((mx, mr, mz * 0.62 + 0.3), (mx + dx, rc + s * hw(t) * 0.95, zt(t)), 0.012, '#2a2018', 'rigging', verts=4)
    for a, b in zip(tops, tops[1:]):
        k.tube(a, (b[0], b[1], b[2] * 0.62), 0.012, '#2a2018', 'rigging', verts=4)
    k.tube(tops[-1], tip, 0.012, '#2a2018', 'rigging', verts=4)
    k.tube(tops[0], (x0 + 0.1, rc, 1.85), 0.012, '#2a2018', 'rigging', verts=4)
    # lanterns: one hung off the stern, two on the rails
    k.tube((x0 + 0.1, rc + 0.3, 1.85), (x0 - 0.35, rc + 0.35, 2.1), 0.02, IRON, 'lantern_bracket', verts=4)
    lantern(k, x0 - 0.35, rc + 0.35, 1.76, 2.0, s=0.1)
    k.point_light(x0 - 0.35, rc + 0.7, 1.9, '#ffb060', 18, radius=0.1, group='flicker')
    for t in (0.42, 0.66):
        wall_lantern(k, x0 + t * L, rc + hw(t) * 0.9 - 0.12, z=zt(t) + 0.25, energy=8)
    for c in range(int(x0), int(math.ceil(x1))):
        k.solid(c, int(rc - beam / 2 + 0.2), c + 1, int(rc + beam / 2) + 1)


def rowboat(k, x0, x1, cr, beam=0.8, hull=WOOD_D, inside=WOOD_DD, oars=True):
    """Rowing boat pulled up on the sand, lying along the columns."""
    L = x1 - x0
    shape = lambda t: max(0.05, math.sin(math.pi * (0.06 + 0.88 * t)) ** 0.55)
    _hull(k, x0, x1, cr, beam, lambda t: 0.36 + 0.1 * abs(t - 0.5) * 2, lambda t: -0.08, shape, (hull, 0.14), 'boat_hull',
          n=16)
    k.poly([(x0 + t * L, cr + s * beam / 2 * shape(t) * 0.85, 0.04) for s, ts in ((-1, range(0, 11)), (1, range(10, -1, -1)))
            for t in (i / 10 for i in ts)], (inside, 0.14), 'boat_inside')
    for t in (0.32, 0.62):
        x = x0 + t * L
        k.box(x - 0.07, cr - beam / 2 * shape(t) * 0.9, 0.2, x + 0.07, cr + beam / 2 * shape(t) * 0.9, 0.25, WOOD, 'boat_seat')
    if oars:
        k.tube((x0 + L * 0.2, cr - 0.08, 0.3), (x0 + L * 0.85, cr + 0.12, 0.27), 0.025, WOOD_L, 'oar', verts=6)
        k.blob(x0 + L * 0.88, cr + 0.13, 0.27, 0.16, 0.06, 0.015, WOOD_L, 'oar_blade', segs=8)
    k.cyl_x(x0 + 0.02, x0 + 0.12, cr, 0.3, 0.03, 0.03, IRON, 'boat_ring', verts=6)


# ---- vegetation -------------------------------------------------------------------------------------
# Foliage is built inside k.foliage(): 'leaf' for trees and bushes that turn with the seasons, 'needle' for evergreens
# (js/foliage.js recolours them by the planet's season from the render's leaf pass).
KEY = (-0.45, 0.35, 0.82)          # toward the key light (upper left, toward the camera): lit clumps get a lighter albedo


def leafy_crown(k, cx, cr, z, rx, ry, rz, tone, n=None, part='leaves', sprigs=True):
    """A crown of leaves: a dark core with many small clumps over it, lighter toward the light, and sprigs breaking
    the outline — at 32 px a tile it reads as leaves, where one smooth ball read as a lump."""
    k.blob(cx, cr, z, rx * 0.84, ry * 0.84, rz * 0.84, (shade(tone, 0.6), 0.25), part, segs=10)
    rr = (rx + ry + rz) / 3
    n = n or max(10, int(4 * math.pi * rr * rr / 0.075))
    cs = max(0.11, min(0.26, rr * 0.34))                      # clump size grows a little with the crown
    for i in range(n):
        u, v = k.rng.uniform(-1, 1), k.rng.uniform(0, math.tau)
        w = math.sqrt(1 - u * u)
        d = (w * math.cos(v), w * math.sin(v), u)           # a direction on the sphere (x, row, z)
        if d[1] < -0.55 and d[2] < 0.1:
            continue                                          # back and below: never seen
        lit = d[0] * KEY[0] + d[1] * KEY[1] + d[2] * KEY[2]
        f = 0.78 + 0.34 * max(0.0, lit) + k.rng.uniform(-0.07, 0.07)
        out = k.rng.uniform(0.86, 1.02)
        s_ = cs * k.rng.uniform(0.75, 1.2)
        k.blob(cx + d[0] * rx * out, cr + d[1] * ry * out, z + d[2] * rz * out, s_, s_ * 0.9, s_ * 0.72,
               (shade(tone, f), 0.24), part, rot=(k.rng.uniform(-30, 30), k.rng.uniform(-30, 30), k.rng.uniform(0, 360)), segs=7)
    if sprigs:
        for i in range(max(6, n // 4)):                       # sprigs past the edge, mostly round the sides and top
            a = k.rng.uniform(0, math.tau)
            u = k.rng.uniform(-0.2, 0.9)
            w = math.sqrt(1 - u * u)
            d = (w * math.cos(a), w * math.sin(a), u)
            s_ = cs * k.rng.uniform(0.45, 0.7)
            lit = d[0] * KEY[0] + d[1] * KEY[1] + d[2] * KEY[2]
            k.blob(cx + d[0] * rx * 1.1, cr + d[1] * ry * 1.1, z + d[2] * rz * 1.1, s_, s_ * 0.8, s_ * 0.6,
                   (shade(tone, 0.85 + 0.3 * max(0.0, lit)), 0.24), part, rot=(0, 0, k.rng.uniform(0, 360)), segs=6)


def pine_tiers(k, cx, cr, h, tone, rad=0.6, z0=0.16, tiers=5, lean=0.0, snow=None, part='pine'):
    """An evergreen's boughs: tiers of cones, each fringed with drooping sprays so the outline is ragged; `snow`
    lays snow on each tier's top (a colour). Built as needles (they stay green through the year)."""
    with k.foliage('needle'):
        for i in range(tiers):
            t = i / (tiers - 1)
            zb = h * (z0 + t * (0.8 - z0))
            R = rad * (1 - t * 0.78) * k.rng.uniform(0.9, 1.1)
            hh = h * 0.3 * (1 - t * 0.35)
            x = cx + lean * t
            col = shade(tone, 0.88 + t * 0.26)
            k.cone(x, cr, zb, zb + hh, R, 0.02, (col, 0.18), part, verts=11)
            m = max(6, int(R * 17))
            for j in range(m):
                a = j / m * math.tau + k.rng.uniform(-0.18, 0.18)
                L = R * k.rng.uniform(0.32, 0.46)
                sx, sr = x + math.cos(a) * R * 0.8, cr + math.sin(a) * R * 0.8
                k.blob(sx, sr, zb + 0.04, L, L * 0.45, 0.05,
                       (shade(col, k.rng.uniform(0.82, 1.12)), 0.18), part, rot=(0, -16, math.degrees(a)), segs=6)
                if snow and math.sin(a) > -0.6:               # snow lying along the sprays you can see
                    k.blob(sx - math.cos(a) * L * 0.2, sr - math.sin(a) * L * 0.2, zb + 0.1, L * 0.7, L * 0.35, 0.035,
                           (snow, 0.2), part + '_snow', rot=(0, -12, math.degrees(a)), segs=6)
            if snow:
                k.cone(x, cr, zb + hh * 0.3, zb + hh * 0.92, R * 0.78, 0.05, (snow, 0.2), part + '_snow', verts=10)
        k.cone(cx + lean, cr, h * 0.86, h * 1.02, 0.08, 0.01, (shade(tone, 1.15), 0.18), part, verts=6)


def pine(k, cx, cr, h=2.4, tone='#28483a'):
    """Seaside pine: a short trunk and ragged tiers of boughs."""
    k.cyl(cx, cr, 0, h * 0.3, 0.07, (WOOD_D, 0.12), 'trunk', verts=6)
    pine_tiers(k, cx, cr, h, tone, rad=0.6)


def bush(k, cx, cr, s=0.3, tone='#2a4a2e', berries=None):
    with k.foliage('leaf'):
        leafy_crown(k, cx, cr, s * 0.62, s * 1.05, s * 0.85, s * 0.62, shade(tone, k.rng.uniform(0.94, 1.06)), part='bush')
    if berries:
        for i in range(5):
            k.sphere(cx + k.rng.uniform(-s, s) * 0.75, cr + s * 0.62, s * k.rng.uniform(0.45, 0.95), 0.03, 0.03, berries, 'berry', segs=5)


def tree(k, cx, cr, h=2.6, tone='#2e5434', lean=0.1):
    """Round-crowned town tree: a tapering trunk with a root flare, forking into branches under a crown of leaf clumps
    in a few lobes (so it isn't a ball)."""
    tone = shade(tone, k.rng.uniform(0.93, 1.07))
    top = (cx + lean, cr, h * 0.56)
    k.tube((cx, cr, 0.0), top, 0.11, (WOOD_D, 0.14), 'trunk', rb=0.065, verts=8)
    for a in (0.5 + k.rng.uniform(0, 0.4), 2.5 + k.rng.uniform(0, 0.4), 4.4 + k.rng.uniform(0, 0.4)):
        k.tube((cx, cr, 0.14), (cx + math.cos(a) * 0.24, cr + math.sin(a) * 0.16, -0.02), 0.055, (WOOD_D, 0.14), 'root', rb=0.02, verts=5)
    lobes = [(0.0, 0.0, 0.78, 0.6, 0.54, 0.5), (-0.36, 0.06, 0.66, 0.42, 0.38, 0.36), (0.4, 0.02, 0.68, 0.44, 0.4, 0.37),
             (0.06, 0.1, 0.95, 0.4, 0.36, 0.34)]
    k.rng.shuffle(lobes)
    for (dx, dr, dz, rx, ry, rz) in lobes[:3] + [(0.06, 0.1, 0.95, 0.4, 0.36, 0.34)]:
        k.tube((top[0], cr, top[2] * 0.92), (cx + lean + dx * 0.8, cr + dr, h * dz * 0.92), 0.04, (WOOD_D, 0.14), 'branch', rb=0.02, verts=5)
    out = []
    with k.foliage('leaf'):
        for (dx, dr, dz, rx, ry, rz) in lobes:
            c = (cx + lean + dx, cr + dr, h * dz, rx * h / 2.6, ry * h / 2.6, rz * h / 2.6)
            leafy_crown(k, c[0], c[1], c[2], c[3], c[4], c[5], tone)
            out.append(c)
    return out                                                # the crown's lobes (x, row, z, rx, ry, rz): fruit goes on them


def tree_bed(k, cx, cr, rad=0.55, grass='#34462e'):
    """Ring of stones round a patch of grass at a tree's foot."""
    k.cyl(cx, cr, -0.04, 0.0, rad, (grass, 0.3), 'grass', verts=18)
    for i in range(10):
        a = i * 2 * math.pi / 10
        k.rock(cx + math.cos(a) * rad, cr + math.sin(a) * rad, 0.02, 0.09, 0.07, 0.06, (shade(STONE, k.rng.uniform(0.7, 0.9)), 0.15),
               part='bed_stone', segs=6)
    for _ in range(5):
        x, r = cx + k.rng.uniform(-rad, rad) * 0.7, cr + k.rng.uniform(-rad, rad) * 0.7
        k.cone(x, r, 0.0, k.rng.uniform(0.08, 0.14), 0.025, 0.002, shade(grass, 1.4), 'tuft', verts=3)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def round_bench(k, cx, cr, r_in=0.55, r_out=0.88, h=0.4, tone=WOOD, sides=8):
    """A bench round a tree: eight sides of three planks each, a pixel's gap between them so the seat reads as slats
    (a solid ring read as an orange doughnut), on legs at every corner."""
    angs = [2 * math.pi * (i + 0.5) / sides for i in range(sides)]
    span = (r_out - r_in) / 3
    for i in range(sides):
        a0, a1 = angs[i], angs[(i + 1) % sides]
        for j in range(3):
            rr = r_in + span * (j + 0.5)
            p0 = (cx + math.cos(a0) * rr, cr + math.sin(a0) * rr * 0.92)
            p1 = (cx + math.cos(a1) * rr, cr + math.sin(a1) * rr * 0.92)
            k.bar(p0[0], p0[1], p1[0], p1[1], h - 0.05, h, span * 0.6, (shade(tone, k.rng.uniform(0.72, 0.95)), 0.18), 'bench_plank')
        for rr in (r_in + 0.04, r_out - 0.04):
            x, y = cx + math.cos(a0) * rr, cr + math.sin(a0) * rr * 0.92
            k.box(x - 0.03, y - 0.03, 0.0, x + 0.03, y + 0.03, h - 0.05, shade(tone, 0.6), 'bench_leg')
    # (the scene marks its tiles solid: a ring round a tree sits across tile lines however it's placed)


def bench(k, x0, x1, cr, tone=WOOD):
    """Park bench along the columns, its back to the north."""
    for x in (x0 + 0.08, x1 - 0.14):
        k.box(x, cr - 0.18, 0, x + 0.06, cr + 0.18, 0.42, IRON, 'bench_leg')
        k.box(x, cr - 0.2, 0.42, x + 0.06, cr - 0.14, 0.85, IRON, 'bench_leg')
    for i in range(3):
        k.box(x0, cr - 0.15 + i * 0.12, 0.38, x1, cr - 0.06 + i * 0.12, 0.43, (tone, 0.14), 'bench_slat')
    for z in (0.58, 0.74):
        k.box(x0, cr - 0.2, z, x1, cr - 0.15, z + 0.1, (tone, 0.14), 'bench_slat')
    for c in range(int(x0), int(math.ceil(x1))):
        k.solid(c, int(cr), c + 1, int(cr) + 1)


def bunting(k, a, b, sag=0.45, cols=('#c03a3a', '#e0c040', '#3a7ac0', '#e8dcc0', '#3a9a5a'), n=None):
    """A string of pennant flags hung between two points (x, row, z)."""
    L = math.dist(a[:2], b[:2])
    n = n or max(4, int(L / 0.32))
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.01, '#2a2018', 'bunting_string', verts=4)
    for i, (p, q) in enumerate(zip(pts, pts[1:])):
        m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2 - 0.2)
        k.poly([(p[0], p[1] + 0.01, p[2] - 0.01), (q[0], q[1] + 0.01, q[2] - 0.01), (m[0], m[1] + 0.01, m[2])],
               (cols[i % len(cols)], 0.08), 'bunting_flag')
