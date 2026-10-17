"""Hoarfell's grand places (Workstream E) — the château and its resort town, Fellhaven's promenade, the mountain
railway's stations. Builders for scenekit (bpy), in tile units: x = column, r = row (toward the camera), z = height.
Buildings face the camera.

  import assets_alpine as A
  A.grand_block(k, x0, x1, r_back, r_front, floors=3, ...)    a stone block of the hotel: ashlar, tall windows with
                                                               iron balconies, string courses, a slate mansard with dormers
  A.turret(k, cx, cr, rad, h, roof_h)                          a round tower under a tall cone of verdigris copper
  A.porte_cochere(k, cx, r_face, w, d)                         the glass canopy over the hotel's door, on iron columns
  A.balustrade(k, xa, ra, xb, rb)                              stone balusters under a rail with snow on it
  A.heated_pool(k, x0, r0, x1, r1)                             a pool sunk into a stone terrace, steps, loungers; returns
                                                               where the steam rises (screen tiles, for the engine)
  A.rink(k, x0, r0, x1, r1)                                    an ice rink inside its boards, skate marks, lamps
  A.sleigh(k, cx, cr, facing) / A.horse(k, cx, cr, facing)    a red sleigh with gold scrolls; its horse in a bell harness
  A.track(k, x0, x1, r) / A.platform / A.station_house         the railway
  A.heater, A.fondue_table, A.lounger, A.parasol_snow, A.lit_fir, A.ice_swan, A.awning, A.flag, A.fur_rail

The look is Hoarfell's (apps/bridge/CLAUDE.md, *Hoarfell*), finished as toys: cream limestone, slate and verdigris,
gilt, warm windows, and snow on whatever faces up.
"""
import math

from scenekit import shade
import assets_town as W
import assets_snow as N

STONE = '#e2d8c4'          # cream limestone
STONE_D = '#c8bca4'
SLATE = '#4a5264'
SLATE_D = '#363c4c'
COPPER = '#5e9e8e'          # verdigris
COPPER_D = '#3e7466'
GILT = '#d8b060'
IRON = '#24262e'
IVORY = '#f0e8d8'
GLASS = '#5a3a18'
GLOW = '#ffc870'
SNOW = N.ROOF_SNOW
VELVET = '#8a1a2a'
NAVY = '#1e2a4a'


# ---- batching: the kit's many small boxes go into one mesh per material (a château is thousands of stones, window
# bars and sleepers; as separate objects Blender spends minutes syncing them before every pass) -------------------------
_BATCH = {}


def qb(k, x0, r0, z0, x1, r1, z1, albedo, part, emit=None, bevel=0.0):
    """k.box, collected: flushed as one k.boxes per (albedo, part, emit) by flush(k) — call it before k.render."""
    if bevel or k._var is not None or k._fol is not None:          # bevelled, in a variant or a tree: as it was
        return k.box(x0, r0, z0, x1, r1, z1, albedo, part, emit=emit, bevel=bevel)
    key = (albedo if isinstance(albedo, str) else tuple(albedo), part, emit if emit is None or isinstance(emit, str) else tuple(emit))
    _BATCH.setdefault(id(k), {}).setdefault(key, []).append((min(x0, x1), min(r0, r1), min(z0, z1), max(x0, x1), max(r0, r1), max(z0, z1)))


def flush(k):
    """Build the collected boxes (see qb). Safe to call more than once."""
    for (albedo, part, emit), rects in _BATCH.pop(id(k), {}).items():
        k.boxes(rects, albedo, part, emit=emit)


def _r(k):
    return k.rng


# ---- walls and windows ----------------------------------------------------------------------------------------------
def ashlar(k, x0, x1, r_face, z0, z1, col=STONE, course=0.28, block=(0.4, 0.62), skip=(), part='stone_block'):
    """Dressed stone in courses on a face: each block its own tone, a pixel of joint between. skip: (xa, za, xb, zb)
    openings to leave bare (the windows go in them)."""
    rng = _r(k)
    z, i = z0, 0
    while z < z1 - 0.04:
        zt = min(z1, z + course)
        x = x0 - (0.2 if i % 2 else 0.0)
        while x < x1:
            w = rng.uniform(*block)
            xa, xb = max(x0, x) + 0.012, min(x1, x + w) - 0.012
            if xb > xa + 0.05 and not any(sa - 0.02 < (xa + xb) / 2 < sb + 0.02 and sz < (z + zt) / 2 < tz for (sa, sz, sb, tz) in skip):
                qb(k, xa, r_face - 0.02, z + 0.012, xb, r_face + 0.012, zt - 0.012, (shade(col, rng.uniform(0.9, 1.06)), 0.08), part)
            x += w
        z, i = zt, i + 1


def quoins(k, x, r_face, z0, z1, side, col=STONE):
    """Long and short stones up a corner (side -1 the left corner, +1 the right)."""
    z, i = z0, 0
    while z < z1 - 0.1:
        ln = 0.44 if i % 2 else 0.26
        xa, xb = (x, x + ln) if side < 0 else (x - ln, x)
        qb(k, xa, r_face - 0.01, z + 0.012, xb, r_face + 0.05, z + 0.27, (shade(col, 1.1), 0.06), 'quoin', bevel=0.012)
        z, i = z + 0.29, i + 1


def string_course(k, x0, x1, r_face, z, col=STONE, d=0.08, h=0.08):
    qb(k, x0 - 0.03, r_face - 0.02, z, x1 + 0.03, r_face + d, z + h, (shade(col, 1.08), 0.05), 'cornice')
    qb(k, x0 - 0.03, r_face + d - 0.02, z + h - 0.01, x1 + 0.03, r_face + d + 0.02, z + h + 0.03, (SNOW, 0.04), 'ledge_snow')


def grand_window(k, cx, r_face, z0, w=0.46, h=0.86, frame=IVORY, lit=True, balcony=False, head='flat', shutters=None, light=True):
    """A tall window: stone architrave, a keystone or a pediment over it, glazing bars, a sill; an iron balconette on
    the upper floors (snow on its rail)."""
    qb(k, cx - w / 2 - 0.08, r_face - 0.01, z0 - 0.06, cx + w / 2 + 0.08, r_face + 0.05, z0 + h + 0.08, (shade(STONE, 1.1), 0.05), 'architrave')
    qb(k, cx - w / 2, r_face + 0.02, z0, cx + w / 2, r_face + 0.06, z0 + h, GLASS if lit else '#1a2232', 'window_glass',
          emit=(GLOW, 0.85) if lit else None)
    for f in (0.33, 0.66):                                        # glazing bars
        qb(k, cx - w / 2, r_face + 0.06, z0 + h * f - 0.012, cx + w / 2, r_face + 0.075, z0 + h * f + 0.012, frame, 'window_frame')
    qb(k, cx - 0.012, r_face + 0.06, z0, cx + 0.012, r_face + 0.075, z0 + h, frame, 'window_frame')
    qb(k, cx - w / 2 - 0.12, r_face - 0.01, z0 - 0.11, cx + w / 2 + 0.12, r_face + 0.13, z0 - 0.05, (shade(STONE, 1.12), 0.05), 'sill')
    qb(k, cx - w / 2 - 0.1, r_face + 0.02, z0 - 0.05, cx + w / 2 + 0.1, r_face + 0.12, z0 - 0.02, (SNOW, 0.04), 'sill_snow')
    if head == 'pediment':
        zt = z0 + h + 0.09
        qb(k, cx - w / 2 - 0.14, r_face - 0.01, zt, cx + w / 2 + 0.14, r_face + 0.1, zt + 0.05, (shade(STONE, 1.12), 0.05), 'cornice')
        k.poly([(cx - w / 2 - 0.14, r_face + 0.1, zt + 0.05), (cx + w / 2 + 0.14, r_face + 0.1, zt + 0.05), (cx, r_face + 0.1, zt + 0.24)],
               (shade(STONE, 1.08), 0.05), 'pediment')
        k.tube((cx - w / 2 - 0.12, r_face + 0.08, zt + 0.08), (cx, r_face + 0.08, zt + 0.27), 0.03, (SNOW, 0.04), 'ledge_snow', verts=5)
        k.tube((cx, r_face + 0.08, zt + 0.27), (cx + w / 2 + 0.12, r_face + 0.08, zt + 0.08), 0.03, (SNOW, 0.04), 'ledge_snow', verts=5)
    elif head == 'arch':
        k.cyl_y(cx, r_face - 0.01, r_face + 0.05, z0 + h, w / 2 + 0.08, 0.2, (shade(STONE, 1.1), 0.05), 'architrave', verts=14)
        k.cyl_y(cx, r_face + 0.02, r_face + 0.06, z0 + h, w / 2, 0.14, GLASS if lit else '#1a2232', 'window_glass',
                emit=(GLOW, 0.85) if lit else None, verts=14)
    else:                                                          # a keystone
        qb(k, cx - 0.07, r_face - 0.01, z0 + h + 0.02, cx + 0.07, r_face + 0.08, z0 + h + 0.16, (shade(STONE, 1.16), 0.05), 'keystone')
    if shutters:
        for s in (-1, 1):
            xa = cx + s * (w / 2 + 0.1)
            qb(k, min(xa, xa + s * 0.22), r_face + 0.01, z0, max(xa, xa + s * 0.22), r_face + 0.05, z0 + h, (shutters, 0.08), 'shutter')
            for j in range(5):
                zz = z0 + 0.08 + j * (h - 0.12) / 5
                qb(k, min(xa, xa + s * 0.22) + 0.02, r_face + 0.05, zz, max(xa, xa + s * 0.22) - 0.02, r_face + 0.065, zz + 0.03,
                      (shade(shutters, 0.8), 0.06), 'shutter')
    if balcony:
        bz = z0 - 0.06
        qb(k, cx - w / 2 - 0.16, r_face, bz - 0.06, cx + w / 2 + 0.16, r_face + 0.28, bz, (shade(STONE, 1.05), 0.05), 'balcony_slab')
        qb(k, cx - w / 2 - 0.14, r_face + 0.02, bz, cx + w / 2 + 0.14, r_face + 0.26, bz + 0.03, (SNOW, 0.04), 'balcony_snow')
        x = cx - w / 2 - 0.12
        while x <= cx + w / 2 + 0.13:
            qb(k, x - 0.008, r_face + 0.24, bz, x + 0.008, r_face + 0.26, bz + 0.34, IRON, 'railing')
            x += 0.07
        qb(k, cx - w / 2 - 0.16, r_face + 0.23, bz + 0.33, cx + w / 2 + 0.16, r_face + 0.28, bz + 0.37, IRON, 'railing')
        qb(k, cx - w / 2 - 0.16, r_face + 0.22, bz + 0.37, cx + w / 2 + 0.16, r_face + 0.29, bz + 0.41, (SNOW, 0.04), 'rail_snow')
        for s in (-1, 1):                                          # a scroll at each end
            k.tube((cx + s * (w / 2 + 0.16), r_face + 0.26, bz + 0.36), (cx + s * (w / 2 + 0.16), r_face + 0.02, bz - 0.04), 0.014, IRON, 'railing', verts=4)
    if lit and light:
        k.point_light(cx, r_face + 0.5, z0 + h / 2, '#ffc070', 3.5, radius=0.2, group='flicker')


# ---- the mansard ---------------------------------------------------------------------------------------------------------
def slates(k, pts_lo, pts_hi, rows, col=SLATE, part='roof_slate'):
    """Courses of slates over a quad (lo edge left→right, hi edge left→right), each course its own tone and lapping
    the one above it — a few quads a course."""
    rng = _r(k)
    (a0, a1), (b0, b1) = pts_lo, pts_hi
    lerp = lambda p, q, t: tuple(p[i] + (q[i] - p[i]) * t for i in range(3))
    items = {0: [], 1: [], 2: []}
    for i in range(rows):
        t0, t1 = i / rows, (i + 1) / rows
        lo0, lo1 = lerp(a0, b0, t0), lerp(a1, b1, t0)
        hi0, hi1 = lerp(a0, b0, t1), lerp(a1, b1, t1)
        n = max(2, int(math.dist(lo0, lo1) / 0.36))
        for j in range(n):
            u0, u1 = (j + rng.uniform(-0.1, 0.1) * (j > 0)) / n, (j + 1) / n
            p = [lerp(lo0, lo1, u0), lerp(lo0, lo1, u1), lerp(hi0, hi1, u1), lerp(hi0, hi1, u0)]
            p = [(q[0], q[1] + 0.012, q[2] + 0.012) for q in p]       # standing a hair proud of the deck
            items[rng.randrange(3)].append(tuple(p))
    for j, f in enumerate((0.92, 1.0, 1.1)):
        if items[j]:
            k.quads(items[j], (shade(col, f), 0.06), part)


def mansard(k, x0, x1, r_back, r_front, z0, h=1.2, inset=0.32, col=SLATE, dormers=(), top_snow=True, crest=True):
    """A mansard: a steep slate face on the front and sides rising `h` and leaning in `inset`, a flat snowy top with a
    gilt cresting, dormers through the front face. Returns the top z."""
    zt = z0 + h
    fa, fb = x0 + inset, x1 - inset
    rf, rb = r_front, r_back
    # the deck under the slates, and the slates in courses
    k.quads([((x0, rf, z0), (x1, rf, z0), (fb, rf - inset, zt), (fa, rf - inset, zt))], (shade(col, 0.6), 0.05), 'roof_deck')
    slates(k, ((x0, rf, z0), (x1, rf, z0)), ((fa, rf - inset, zt), (fb, rf - inset, zt)), 5, col)
    for (xe, xi) in ((x0, fa), (x1, fb)):                          # the sides, end-on
        k.quads([((xe, rb, z0), (xe, rf, z0), (xi, rf - inset, zt), (xi, rb + inset, zt))], (shade(col, 0.85), 0.06), 'roof_slate')
    qb(k, fa, rb + inset, zt - 0.02, fb, rf - inset, zt + 0.03, (shade(col, 0.7), 0.05), 'roof_deck')
    if top_snow:
        qb(k, fa + 0.04, rb + inset + 0.04, zt + 0.03, fb - 0.04, rf - inset - 0.04, zt + 0.1, (SNOW, 0.03), 'roof_snow')
        n = max(3, int((fb - fa) / 0.4))
        for i in range(n):                                          # a soft lip of snow along the top's front edge
            xa = fa + (fb - fa) * i / n
            k.blob(xa + (fb - fa) / n / 2, rf - inset - 0.04, zt + 0.1, (fb - fa) / n * 0.62, 0.1, 0.06, (SNOW, 0.03), 'roof_snow', segs=8)
    # the eave: a moulded cornice and a gutter of snow along the foot of the slates
    qb(k, x0 - 0.06, rf - 0.02, z0 - 0.12, x1 + 0.06, rf + 0.12, z0, (shade(STONE, 1.1), 0.05), 'cornice')
    qb(k, x0 - 0.08, rf + 0.02, z0 - 0.2, x1 + 0.08, rf + 0.1, z0 - 0.12, (shade(STONE, 0.92), 0.05), 'cornice')
    k.tube((x0 - 0.04, rf + 0.06, z0 + 0.04), (x1 + 0.04, rf + 0.06, z0 + 0.04), 0.07, (SNOW, 0.03), 'ledge_snow', verts=8)
    N.icicles(k, x0, x1, rf + 0.12, z0 - 0.2, every=0.3)
    if crest:                                                       # gilt iron cresting round the flat top
        x = fa + 0.08
        while x < fb - 0.05:
            qb(k, x - 0.01, rf - inset - 0.01, zt + 0.08, x + 0.01, rf - inset + 0.01, zt + 0.24, GILT, 'cresting')
            k.sphere(x, rf - inset, zt + 0.26, 0.022, 0.022, GILT, 'cresting', segs=6)
            x += 0.18
        qb(k, fa, rf - inset - 0.01, zt + 0.18, fb, rf - inset + 0.01, zt + 0.2, GILT, 'cresting')
    for dx in dormers:
        dormer(k, dx, rf, z0, h, inset)
    return zt


def dormer(k, cx, r_face, z0, h, inset, w=0.5):
    """A dormer through a mansard's slate face: a stone surround, a lit arched window, a little round pediment, snow on
    its cap."""
    zb = z0 + 0.12
    rr = r_face - inset * 0.25
    qb(k, cx - w / 2 - 0.06, rr - 0.25, zb, cx + w / 2 + 0.06, rr + 0.04, zb + 0.66, (shade(STONE, 1.05), 0.05), 'dormer')
    qb(k, cx - w / 2 + 0.04, rr + 0.03, zb + 0.08, cx + w / 2 - 0.04, rr + 0.07, zb + 0.5, GLASS, 'window_glass', emit=(GLOW, 0.8))
    qb(k, cx - 0.012, rr + 0.06, zb + 0.08, cx + 0.012, rr + 0.08, zb + 0.5, IVORY, 'window_frame')
    k.cyl_y(cx, rr - 0.25, rr + 0.06, zb + 0.66, w / 2 + 0.1, 0.2, (shade(STONE, 1.1), 0.05), 'dormer', verts=14)
    k.blob(cx, rr - 0.08, zb + 0.84, w / 2 + 0.08, 0.2, 0.07, (SNOW, 0.03), 'roof_snow', segs=10)


def hip_roof(k, x0, x1, r_back, r_front, z0, rise, col=SLATE, dormers=(), over=0.12):
    """A steep hipped roof of slate over a block: the front slope in courses with dormers through it, the hips at the
    ends, a ridge with gilt cresting and snow lying along it, snow caught on the dormers' caps and along the eave.
    Returns the ridge z."""
    xa, xb, ra, rb = x0 - over, x1 + over, r_back - over, r_front + over
    d = (rb - ra) / 2
    rm = (ra + rb) / 2
    zr = z0 + rise
    inset = min(d, (xb - xa) / 2 - 0.2)
    pa, pb = xa + inset, xb - inset                                  # the ridge's ends
    k.quads([((xa, rb, z0), (xb, rb, z0), (pb, rm, zr), (pa, rm, zr))], (shade(col, 0.6), 0.05), 'roof_deck')
    k.quads([((xb, ra, z0), (xa, ra, z0), (pa, rm, zr), (pb, rm, zr))], (shade(col, 0.6), 0.05), 'roof_deck')
    k.poly([(xa, ra, z0), (xa, rb, z0), (pa, rm, zr)], (shade(col, 0.85), 0.06), 'roof_slate')
    k.poly([(xb, rb, z0), (xb, ra, z0), (pb, rm, zr)], (shade(col, 0.85), 0.06), 'roof_slate')
    slates(k, ((xa, rb, z0), (xb, rb, z0)), ((pa, rm, zr), (pb, rm, zr)), 9, col)
    # the ridge: lead roll, snow lying along it, gilt cresting
    k.tube((pa, rm, zr + 0.02), (pb, rm, zr + 0.02), 0.06, (shade(col, 0.7), 0.05), 'roof_ridge', verts=8)
    k.tube((pa, rm + 0.04, zr + 0.08), (pb, rm + 0.04, zr + 0.08), 0.1, (SNOW, 0.03), 'roof_snow', verts=10)
    x = pa + 0.1
    while x < pb - 0.05:
        qb(k, x - 0.008, rm - 0.008, zr + 0.12, x + 0.008, rm + 0.008, zr + 0.34, GILT, 'cresting')
        x += 0.22
    qb(k, pa, rm - 0.008, zr + 0.28, pb, rm + 0.008, zr + 0.3, GILT, 'cresting')
    for xe in (pa, pb):
        k.cone(xe, rm, zr + 0.05, zr + 0.6, 0.05, 0.005, GILT, 'finial', verts=6)
    # the hips: snow down each
    for (xe, xr) in ((xa, pa), (xb, pb)):
        k.tube((xe, rb, z0 + 0.02), (xr, rm, zr + 0.04), 0.06, (SNOW, 0.03), 'roof_snow', verts=8)
    # snow in drifts low on the front slope, where the eave stops it sliding
    rng = _r(k)
    n = max(3, int((xb - xa) / 0.9))
    for i in range(n):
        t = rng.uniform(0.05, 0.3)
        xx = xa + (xb - xa) * (i + rng.uniform(0.2, 0.8)) / n
        if pa - 0.2 < xx < pb + 0.2 or True:
            k.blob(xx, rb - (rb - rm) * t, z0 + rise * t + 0.05, rng.uniform(0.3, 0.6), 0.16, 0.05, (SNOW, 0.03), 'roof_snow',
                   rot=(-math.degrees(math.atan2(rise, rb - rm)), 0, 0), segs=8)
    # the eave: cornice, a roll of snow, icicles
    qb(k, x0 - 0.06, r_front - 0.02, z0 - 0.12, x1 + 0.06, r_front + 0.12, z0, (shade(STONE, 1.1), 0.05), 'cornice')
    qb(k, x0 - 0.08, r_front + 0.02, z0 - 0.2, x1 + 0.08, r_front + 0.1, z0 - 0.12, (shade(STONE, 0.92), 0.05), 'cornice')
    k.tube((xa + 0.05, rb - 0.02, z0 + 0.05), (xb - 0.05, rb - 0.02, z0 + 0.05), 0.075, (SNOW, 0.03), 'ledge_snow', verts=8)
    N.icicles(k, x0, x1, r_front + 0.14, z0 - 0.2, every=0.3)
    for dx in dormers:
        t = 0.28
        dormer_hip(k, dx, rb - (rb - rm) * t, z0 + rise * t)
    return zr


def dormer_hip(k, cx, rr, zb, w=0.5):
    """A dormer standing up through a steep slate slope: a stone surround, a lit arched window, a round pediment, snow."""
    qb(k, cx - w / 2 - 0.06, rr - 0.45, zb - 0.1, cx + w / 2 + 0.06, rr + 0.02, zb + 0.66, (shade(STONE, 1.05), 0.05), 'dormer')
    qb(k, cx - w / 2 + 0.04, rr + 0.01, zb + 0.08, cx + w / 2 - 0.04, rr + 0.05, zb + 0.5, GLASS, 'window_glass', emit=(GLOW, 0.8))
    qb(k, cx - 0.012, rr + 0.04, zb + 0.08, cx + 0.012, rr + 0.06, zb + 0.5, IVORY, 'window_frame')
    k.cyl_y(cx, rr - 0.45, rr + 0.04, zb + 0.66, w / 2 + 0.1, 0.2, (shade(STONE, 1.1), 0.05), 'dormer', verts=14)
    k.blob(cx, rr - 0.2, zb + 0.84, w / 2 + 0.08, 0.26, 0.07, (SNOW, 0.03), 'roof_snow', segs=10)


def grand_block(k, x0, x1, r_back, r_front, floors=3, floor_h=0.95, bays=None, door=None, base_h=0.5, roof_h=1.2,
                col=STONE, slate=SLATE, balconies=(1, 2), dormers=True, rustic=True, chimneys=(), pediments=(1,), shutters=None, roof='hip'):
    """A block of the grand hotel: a rusticated ground floor, ashlar above, a string course at each floor, tall lit
    windows in `bays` (x positions; default every ~0.95), iron balconettes on the floors in `balconies`, a slate
    mansard with dormers over the bays, chimney stacks. door: an x where the ground floor's window is a door instead.
    Returns (eave z, top z)."""
    if bays is None:
        n = max(1, int((x1 - x0 - 0.4) / 0.95))
        bays = [x0 + (x1 - x0) * (i + 0.5) / n for i in range(n)]
    rf = r_front
    z_eave = base_h + floors * floor_h
    qb(k, x0 - 0.05, r_back, 0.0, x1 + 0.05, rf + 0.05, base_h, (shade(col, 0.8), 0.08), 'footing')
    qb(k, x0, r_back + 0.02, base_h, x1, rf - 0.04, z_eave, (shade(col, 0.95), 0.06), 'house_wall')
    # ground floor rusticated: deep horizontal joints
    if rustic:
        z = base_h
        while z < base_h + floor_h - 0.05:
            qb(k, x0 - 0.01, rf - 0.04, z + 0.015, x1 + 0.01, rf + 0.01, z + 0.2, (shade(col, _r(k).uniform(0.94, 1.02)), 0.06), 'stone_block')
            z += 0.22
    holes = []
    for f in range(floors):
        zf = base_h + f * floor_h
        for bx in bays:
            holes.append((bx - 0.35, zf + 0.1, bx + 0.35, zf + floor_h - 0.05))
    ashlar(k, x0, x1, rf - 0.02, base_h + floor_h, z_eave, col, skip=holes)
    for s, xc in ((-1, x0), (1, x1)):
        quoins(k, xc, rf - 0.02, base_h + floor_h, z_eave, s, col)
    for f in range(floors):
        zf = base_h + f * floor_h
        if f:
            string_course(k, x0, x1, rf - 0.02, zf - 0.06, col)
        for bx in bays:
            if f == 0 and door is not None and abs(bx - door) < 0.3:
                continue
            h = floor_h * (0.72 if f == 0 else 0.68 if f < floors - 1 else 0.58)
            grand_window(k, bx, rf - 0.02, zf + (0.16 if f else 0.18), h=h, lit=(hash((round(bx * 10), f)) % 7) != 0,
                         balcony=f in balconies, head='pediment' if f in pediments else 'arch' if f == 0 else 'flat', shutters=shutters,
                         light=(f + int(bx * 3)) % 4 == 0)
    if roof == 'hip':
        zt = hip_roof(k, x0 - 0.04, x1 + 0.04, r_back, rf + 0.04, z_eave, rise=roof_h, col=slate, dormers=bays if dormers else ())
    else:
        zt = mansard(k, x0 - 0.04, x1 + 0.04, r_back, rf + 0.04, z_eave, h=roof_h, col=slate, dormers=bays if dormers else ())
    for cx in chimneys:                                             # tall stone stacks with pots, snow on their caps
        qb(k, cx - 0.22, r_back + 0.3, z_eave, cx + 0.22, r_back + 0.85, zt + 0.75, (shade(col, 0.9), 0.08), 'chimney', bevel=0.02)
        qb(k, cx - 0.27, r_back + 0.25, zt + 0.75, cx + 0.27, r_back + 0.9, zt + 0.84, (shade(col, 1.08), 0.05), 'chimney')
        for dx in (-0.1, 0.1):
            k.cyl(cx + dx, r_back + 0.58, zt + 0.84, zt + 1.0, 0.06, ('#9a5a3a', 0.1), 'chimney_pot', verts=8)
        k.blob(cx, r_back + 0.58, zt + 0.86, 0.26, 0.28, 0.05, (SNOW, 0.03), 'chimney_snow', segs=8)
    k.solid(x0, r_back, x1, rf)
    return z_eave, zt


def turret(k, cx, cr, rad, h, roof_h, col=STONE, roof=COPPER, windows=3, flag=None, base=0.0, lit=True):
    """A round tower: stone in courses, a ring of tall windows on each floor, a corbelled cornice, a tall cone roof
    of verdigris copper with seams, snow caught on its lower slope, a gilt finial (and a pennant)."""
    rng = _r(k)
    k.cyl(cx, cr, base, base + h, rad, (shade(col, 0.95), 0.06), 'tower_wall', verts=32)
    z = base + 0.3
    while z < base + h - 0.1:                                       # coursing rings
        k.cyl(cx, cr, z, z + 0.02, rad + 0.012, (shade(col, 0.82), 0.04), 'tower_joint', verts=32)
        z += 0.29
    nf = max(1, int((h - 0.6) / 0.95))
    for f in range(nf):
        zf = base + 0.6 + f * 0.95
        for a in (-0.6, 0.0, 0.6)[:windows]:                        # windows on the faces turned to the camera
            ang = math.pi / 2 + a
            wx, wr = cx + math.cos(ang) * rad, cr + math.sin(ang) * rad
            qb(k, wx - 0.13, wr - 0.04, zf, wx + 0.13, wr + 0.03, zf + 0.6, (shade(STONE, 1.1), 0.05), 'architrave')
            qb(k, wx - 0.09, wr + 0.0, zf + 0.05, wx + 0.09, wr + 0.05, zf + 0.55, GLASS if lit else '#1a2232', 'window_glass',
                  emit=(GLOW, 0.85) if lit and (f + int(a * 10)) % 3 else None)
            qb(k, wx - 0.12, wr - 0.02, zf - 0.05, wx + 0.12, wr + 0.08, zf, (SNOW, 0.04), 'sill_snow')
    zt = base + h
    for i in range(16):                                             # corbels under the cornice
        a = i / 16 * math.tau
        qb(k, cx + math.cos(a) * rad - 0.04, cr + math.sin(a) * rad - 0.04, zt - 0.22, cx + math.cos(a) * rad + 0.04,
              cr + math.sin(a) * rad + 0.04, zt - 0.06, (shade(col, 1.05), 0.05), 'corbel')
    k.cyl(cx, cr, zt - 0.08, zt + 0.06, rad + 0.1, (shade(col, 1.1), 0.05), 'cornice', verts=32)
    # the cone: the copper in panels between standing seams, a band of snow lying on the lower slope
    k.cone(cx, cr, zt + 0.04, zt + roof_h, rad + 0.16, 0.02, (roof, 0.1), 'roof_copper', verts=24)
    for i in range(12):
        a = i / 12 * math.tau
        k.tube((cx + math.cos(a) * (rad + 0.165), cr + math.sin(a) * (rad + 0.165), zt + 0.04), (cx, cr, zt + roof_h), 0.012,
               (shade(roof, 0.75), 0.05), 'roof_seam', verts=4)
    k.cone(cx, cr, zt + 0.05, zt + roof_h * 0.32, rad + 0.2, (rad + 0.16) * 0.7, (SNOW, 0.03), 'roof_snow', verts=24)
    for i in range(10):
        a = math.pi / 2 + (i - 4.5) * 0.3
        L = rng.uniform(0.08, 0.26)
        k.cone(cx + math.cos(a) * (rad + 0.18), cr + math.sin(a) * (rad + 0.18), zt + 0.04 - L, zt + 0.04, 0.022, 0.004, (N.ICE, 0.05), 'icicle', verts=5)
    k.sphere(cx, cr, zt + roof_h + 0.06, 0.06, 0.06, GILT, 'finial', segs=8)
    k.cyl(cx, cr, zt + roof_h, zt + roof_h + 0.5, 0.015, GILT, 'finial', verts=6)
    if flag:
        k.poly([(cx, cr, zt + roof_h + 0.48), (cx + 0.55, cr, zt + roof_h + 0.4), (cx, cr, zt + roof_h + 0.3)], (flag, 0.08), 'pennant')
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)
    return zt + roof_h


def porte_cochere(k, cx, r_face, w=3.2, d=1.6, h=1.7, carpet=VELVET):
    """The glass canopy over the hotel's door on four iron columns: a gilt fascia lettered later, glass panes with
    snow lying on them, lanterns hanging under it, a red carpet out to the drive."""
    rf = r_face + d
    for (x, r) in ((cx - w / 2 + 0.15, rf - 0.1), (cx + w / 2 - 0.15, rf - 0.1)):
        k.cyl(x, r, 0.0, h, 0.07, IRON, 'column', verts=10)
        k.cyl(x, r, 0.0, 0.18, 0.12, (STONE_D, 0.05), 'column_base', verts=10)
        k.cyl(x, r, h - 0.12, h, 0.11, GILT, 'capital', verts=10)
    qb(k, cx - w / 2, r_face, h, cx + w / 2, rf, h + 0.1, IRON, 'canopy_frame')
    qb(k, cx - w / 2, rf - 0.04, h - 0.02, cx + w / 2, rf + 0.04, h + 0.24, (GILT, 0.05), 'fascia')
    qb(k, cx - w / 2 + 0.05, r_face + 0.05, h + 0.1, cx + w / 2 - 0.05, rf - 0.05, h + 0.12, '#9ab4c8', 'canopy_glass')
    x = cx - w / 2 + 0.3
    while x < cx + w / 2 - 0.2:
        qb(k, x - 0.01, r_face, h + 0.1, x + 0.01, rf, h + 0.14, IRON, 'canopy_frame')
        x += 0.4
    for i in range(4):                                              # snow lying in drifts on the glass
        k.blob(cx - w / 2 + 0.5 + i * (w - 1.0) / 3, r_face + d * 0.5, h + 0.14, 0.45, d * 0.36, 0.05, (SNOW, 0.03), 'roof_snow', segs=10)
    for x in (cx - w / 4, cx + w / 4):                              # lanterns hung under it
        qb(k, x - 0.006, r_face + d / 2, h - 0.3, x + 0.006, r_face + d / 2 + 0.01, h, IRON, 'chain')
        W.lantern(k, x, r_face + d / 2, h - 0.62, h - 0.3, s=0.09, energy=8)
    qb(k, cx - 0.55, r_face, 0.0, cx + 0.55, rf + 0.9, 0.025, (carpet, 0.06), 'carpet')
    qb(k, cx - 0.55, r_face, 0.025, cx - 0.5, rf + 0.9, 0.03, GILT, 'carpet')
    qb(k, cx + 0.5, r_face, 0.025, cx + 0.55, rf + 0.9, 0.03, GILT, 'carpet')
    for (x, r) in ((cx - w / 2 + 0.15, rf - 0.1), (cx + w / 2 - 0.15, rf - 0.1)):
        k.solid_post(x, r)


def double_door(k, cx, r_face, w=1.0, h=1.5, col='#2a1a12', glow=True):
    """Tall glazed double doors under a fanlight, brass handles."""
    qb(k, cx - w / 2 - 0.12, r_face - 0.02, 0.0, cx + w / 2 + 0.12, r_face + 0.06, h + 0.1, (shade(STONE, 1.12), 0.05), 'architrave')
    k.cyl_y(cx, r_face - 0.02, r_face + 0.06, h + 0.1, w / 2 + 0.12, 0.34, (shade(STONE, 1.12), 0.05), 'architrave', verts=16)
    k.cyl_y(cx, r_face + 0.0, r_face + 0.07, h + 0.1, w / 2, 0.24, GLASS, 'window_glass', emit=(GLOW, 0.9) if glow else None, verts=16)
    for s in (-1, 1):
        xa, xb = (cx - w / 2, cx - 0.02) if s < 0 else (cx + 0.02, cx + w / 2)
        qb(k, xa, r_face + 0.01, 0.0, xb, r_face + 0.08, h, (col, 0.08), 'door')
        qb(k, xa + 0.07, r_face + 0.06, 0.55, xb - 0.07, r_face + 0.09, h - 0.12, GLASS, 'window_glass', emit=(GLOW, 0.7) if glow else None)
        k.cyl(cx + s * 0.09, r_face + 0.1, 0.55, 0.95, 0.018, GILT, 'door_handle', verts=6)
    if glow:
        k.point_light(cx, r_face + 0.6, 0.9, '#ffc070', 5, radius=0.25, group='flicker')


def balustrade(k, xa, ra, xb, rb, z=0.0, h=0.55, col=STONE, every=0.14):
    """A stone balustrade: a plinth, turned balusters, a rail with snow along it; a pier at each end."""
    L = math.hypot(xb - xa, rb - ra)
    n = max(2, int(L / every))
    k.bar(xa, ra, xb, rb, z, z + 0.08, 0.2, (shade(col, 0.92), 0.05), 'plinth')
    for i in range(n + 1):
        t = i / n
        x, r = xa + (xb - xa) * t, ra + (rb - ra) * t
        k.cyl(x, r, z + 0.08, z + h - 0.08, 0.035, (shade(col, 1.04), 0.05), 'baluster', verts=8)
        k.sphere(x, r, z + h * 0.42, 0.05, 0.06, (shade(col, 1.04), 0.05), 'baluster', segs=8)
    k.bar(xa, ra, xb, rb, z + h - 0.08, z + h, 0.22, (shade(col, 1.1), 0.05), 'rail')
    k.bar(xa, ra, xb, rb, z + h, z + h + 0.05, 0.18, (SNOW, 0.03), 'rail_snow')
    for (x, r) in ((xa, ra), (xb, rb)):
        qb(k, x - 0.13, r - 0.13, z, x + 0.13, r + 0.13, z + h + 0.12, (shade(col, 1.0), 0.05), 'pier')
        k.cyl(x, r, z + h + 0.12, z + h + 0.3, 0.09, (shade(col, 1.08), 0.05), 'urn', verts=10)
        k.blob(x, r, z + h + 0.32, 0.12, 0.12, 0.06, (SNOW, 0.03), 'urn_snow', segs=8)


def urn_planter(k, cx, cr, fir=True):
    """A stone urn on a pedestal with a clipped little fir in it, snow on its tiers."""
    qb(k, cx - 0.2, cr - 0.2, 0.0, cx + 0.2, cr + 0.2, 0.3, (STONE_D, 0.05), 'pedestal')
    k.cone(cx, cr, 0.3, 0.62, 0.14, 0.26, (shade(STONE, 1.05), 0.05), 'urn', verts=12)
    if fir:
        W.pine_tiers(k, cx, cr, 0.9, N.PINE, rad=0.22, z0=0.6, tiers=3, snow=SNOW)
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


# ---- warm things outdoors ----------------------------------------------------------------------------------------
def heated_pool(k, x0, r0, x1, r1, coping=STONE, tile='#2a8aa0', loungers=True, z0=0.0):
    """A heated pool sunk into a stone terrace: dressed coping with snow on its outer edge only (the warmth keeps it
    off the water side), blue tiles down its sides, a ladder and steps, a pale band where the water meets the tiles.
    The water is still water (`basin_water`): the live light mirrors the château in it. Returns steam points (x, r)."""
    rng = _r(k)
    z = z0 - 0.4
    qb(k, x0, r0, z - 0.02, x1, r1, z, (shade(tile, 0.7), 0.05), 'pool_floor')
    for (a, b, c, d) in ((x0, r0, x1, r0 + 0.08), (x0, r1 - 0.08, x1, r1), (x0, r0, x0 + 0.08, r1), (x1 - 0.08, r0, x1, r1)):
        qb(k, a, b, z, c, d, z0, (tile, 0.06), 'pool_tiles')
    qb(k, x0 + 0.08, r0 + 0.08, z + 0.24, x1 - 0.08, r1 - 0.08, z + 0.26, ('#3ab0c0', 0.04), 'basin_water')
    # coping all round
    w = 0.28
    for (a, b, c, d) in ((x0 - w, r0 - w, x1 + w, r0), (x0 - w, r1, x1 + w, r1 + w), (x0 - w, r0, x0, r1), (x1, r0, x1 + w, r1)):
        x = a
        while x < c - 0.02:
            xb = min(c, x + rng.uniform(0.45, 0.7)) if c - a > w + 0.01 else c
            qb(k, x + 0.01, b, z0, xb - 0.01, d, z0 + 0.05, (shade(coping, rng.uniform(0.95, 1.06)), 0.04), 'coping')
            x = xb
    # steps down at the shallow end (left), a ladder at the deep end
    for i in range(3):
        qb(k, x0 + 0.08, r0 + 0.5 + i * 0.0, z + 0.05 + i * 0.0, x0 + 0.38 + i * 0.25, r1 - 0.5, z + 0.22 - i * 0.07, (shade(coping, 0.9), 0.04), 'pool_step')
    for dr in (-0.15, 0.15):
        k.tube((x1 - 0.06, (r0 + r1) / 2 + dr, z0 + 0.4), (x1 - 0.14, (r0 + r1) / 2 + dr, z0 - 0.25), 0.018, ('#c8ccd4', 0.04), 'ladder', verts=6)
    # snow banked outside the coping (not on it)
    for i in range(int((x1 - x0) / 0.5) + 2):
        x = x0 - w + i * 0.5
        for r in (r0 - w - 0.12, r1 + w + 0.12):
            k.blob(x, r, z0, rng.uniform(0.25, 0.4), 0.14, rng.uniform(0.05, 0.12), (SNOW, 0.03), 'drift', segs=8)
    steam = []
    x = x0 + 0.6
    while x < x1 - 0.4:
        steam.append([round(x, 2), round((r0 + r1) / 2 + rng.uniform(-0.3, 0.3), 2)])
        x += 1.3
    k.solid(x0, r0, x1, r1)
    return steam


def lounger(k, cx, cr, facing=1, col='#e8e0d0', frame='#5a3a22', towel=None):
    """A teak lounger, backrest up at one end (facing: +1 the back to the left), a folded towel."""
    s = facing
    qb(k, cx - 0.55, cr - 0.18, 0.18, cx + 0.55, cr + 0.18, 0.24, (frame, 0.06), 'lounger')
    for dx in (-0.48, 0.48):
        for dr in (-0.15, 0.15):
            qb(k, cx + dx - 0.025, cr + dr - 0.025, 0.0, cx + dx + 0.025, cr + dr + 0.025, 0.18, frame, 'lounger_leg')
    qb(k, cx - 0.5, cr - 0.16, 0.24, cx + 0.5, cr + 0.16, 0.29, (col, 0.05), 'cushion')
    xb = cx - s * 0.5
    k.quads([((xb, cr - 0.16, 0.29), (xb, cr + 0.16, 0.29), (xb + s * 0.25, cr + 0.16, 0.62), (xb + s * 0.25, cr - 0.16, 0.62))], (col, 0.05), 'cushion')
    if towel:
        qb(k, cx + s * 0.15 - 0.12, cr - 0.14, 0.29, cx + s * 0.15 + 0.12, cr + 0.14, 0.34, (towel, 0.05), 'towel')


def heater(k, cx, cr, h=1.5):
    """A patio heater: a steel post, a glowing element under a round reflector hat."""
    k.cyl(cx, cr, 0.0, 0.08, 0.2, ('#3a3c44', 0.05), 'heater_base', verts=12)
    k.cyl(cx, cr, 0.08, h, 0.035, ('#8a8e98', 0.05), 'heater_post', verts=8)
    k.cyl(cx, cr, h - 0.32, h - 0.06, 0.08, '#3a1a10', 'heater_glow', emit=('#ff7a2a', 1.6), verts=10)
    k.cone(cx, cr, h, h + 0.12, 0.42, 0.06, ('#a8acb4', 0.05), 'heater_hat', verts=16)
    k.cone(cx, cr, h + 0.12, h + 0.16, 0.08, 0.0, (SNOW, 0.03), 'heater_snow', verts=10)
    k.point_light(cx, cr, h - 0.2, '#ff8a3a', 9, radius=0.1, group='flicker')
    k.solid_post(cx, cr)


def fire_pit(k, cx, cr, rad=0.5):
    """A stone ring with logs burning in it."""
    W.annulus(k, cx, cr, rad - 0.14, rad, 0.0, 0.22, (STONE_D, 0.08), 'firepit', segs=18)
    for i in range(4):
        a = i * 0.8
        k.tube((cx + math.cos(a) * 0.25, cr + math.sin(a) * 0.15, 0.06), (cx - math.cos(a) * 0.25, cr - math.sin(a) * 0.15, 0.12), 0.05,
               ('#4a2a18', 0.1), 'log', verts=6)
    k.cone(cx, cr, 0.08, 0.5, 0.2, 0.02, '#6a2a08', 'flame', emit=('#ff9a30', 1.6), verts=8)
    k.point_light(cx, cr, 0.45, '#ff9040', 22, radius=0.2, group='flicker')
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def fondue_table(k, cx, cr, cloth='#b82a2a', check=True):
    """A round table under a red check cloth, the caquelon on its burner in the middle, forks, bread, glasses."""
    k.cyl(cx, cr, 0.0, 0.5, 0.05, ('#3a2416', 0.06), 'table_leg', verts=8)
    k.cyl(cx, cr, 0.5, 0.56, 0.42, (cloth, 0.05), 'tablecloth', verts=20)
    if check:
        for i in range(-2, 3):
            qb(k, cx + i * 0.14 - 0.03, cr - 0.38, 0.561, cx + i * 0.14 + 0.03, cr + 0.38, 0.565, '#f0e8e0', 'tablecloth_check')
    k.cyl(cx, cr, 0.56, 0.62, 0.06, ('#2a2a30', 0.05), 'burner', verts=8)
    k.cyl(cx, cr, 0.58, 0.6, 0.03, '#3a1a08', 'burner_flame', emit=('#4a8aff', 1.2), verts=8)
    k.cyl(cx, cr, 0.62, 0.74, 0.13, ('#c84a2a', 0.06), 'caquelon', verts=14)
    k.cyl(cx, cr, 0.74, 0.75, 0.11, ('#f0d070', 0.04), 'cheese', verts=14)
    for i in range(4):
        a = i * math.pi / 2 + 0.4
        k.tube((cx + math.cos(a) * 0.08, cr + math.sin(a) * 0.08, 0.76), (cx + math.cos(a) * 0.3, cr + math.sin(a) * 0.3, 0.6), 0.008,
               ('#c8ccd4', 0.04), 'fork', verts=4)
        k.sphere(cx + math.cos(a + 0.8) * 0.28, cr + math.sin(a + 0.8) * 0.28, 0.6, 0.04, 0.03, ('#d8a858', 0.06), 'bread', segs=6)
    k.solid_post(cx, cr)


def bistro_chair(k, cx, cr, col='#2a2a30', cushion='#c8b8a0'):
    k.cyl(cx, cr, 0.0, 0.3, 0.02, col, 'chair_leg', verts=6)
    k.cyl(cx, cr, 0.3, 0.34, 0.17, (cushion, 0.05), 'chair_seat', verts=12)
    qb(k, cx - 0.15, cr - 0.17, 0.34, cx + 0.15, cr - 0.14, 0.68, col, 'chair_back')
    qb(k, cx - 0.18, cr - 0.2, 0.62, cx + 0.18, cr - 0.1, 0.66, ('#e8d8c8', 0.05), 'fur_throw')


def lit_fir(k, cx, cr, h=3.2, lights=('#ffd080', '#ff6050', '#80c0ff', '#f0f0ff'), star=True):
    """A great fir dressed in lights: snowy tiers, strings of glowing bulbs spiralling down, a gilt star."""
    W.pine_tiers(k, cx, cr, h, N.PINE, rad=h * 0.28, z0=0.15, tiers=6, snow=SNOW)
    rng = _r(k)
    for i in range(int(h * 22)):
        t = i / (h * 22)
        z = 0.35 + t * (h - 0.5)
        rad = h * 0.28 * (1 - t) * 0.95 + 0.05
        a = t * 16 + rng.uniform(-0.2, 0.2)
        if math.sin(a) < -0.3:
            continue
        k.sphere(cx + math.cos(a) * rad, cr + math.sin(a) * rad * 0.8, z, 0.035, 0.035, '#3a2a10', 'bulb',
                 emit=(lights[i % len(lights)], 1.6), segs=6)
    if star:
        k.sphere(cx, cr, h + 0.12, 0.1, 0.1, '#6a5010', 'star', emit=('#ffe080', 2.0), segs=8)
    k.point_light(cx, cr + 0.6, h * 0.5, '#ffd080', 14, radius=0.3, group='flicker')
    k.solid(cx - 0.45, cr - 0.45, cx + 0.45, cr + 0.45)


def ice_swan(k, cx, cr, plinth=True):
    """An ice sculpture of a swan on a stone plinth, lit from below."""
    if plinth:
        qb(k, cx - 0.45, cr - 0.35, 0.0, cx + 0.45, cr + 0.35, 0.42, (STONE_D, 0.06), 'plinth')
        qb(k, cx - 0.5, cr - 0.4, 0.42, cx + 0.5, cr + 0.4, 0.48, (shade(STONE, 1.08), 0.05), 'plinth')
    z = 0.48 if plinth else 0.0
    ICE = ('#cfe8f6', 0.05)
    k.blob(cx, cr, z + 0.3, 0.38, 0.24, 0.24, ICE, 'ice_sculpture', segs=14)
    k.blob(cx + 0.22, cr, z + 0.38, 0.16, 0.2, 0.18, ICE, 'ice_sculpture', segs=12, rot=(0, -20, 0))
    k.tube((cx - 0.2, cr, z + 0.4), (cx - 0.24, cr, z + 0.85), 0.07, ICE, 'ice_sculpture', rb=0.05, verts=10)
    k.tube((cx - 0.24, cr, z + 0.85), (cx - 0.08, cr, z + 0.98), 0.05, ICE, 'ice_sculpture', rb=0.04, verts=10)
    k.cone(cx - 0.02, cr, z + 0.92, z + 0.98, 0.04, 0.0, ('#a8d0e8', 0.05), 'ice_sculpture', verts=6)
    for s in (-1, 1):                                               # the wings raised
        k.blob(cx + 0.05, cr + s * 0.2, z + 0.48, 0.3, 0.06, 0.18, ('#e0f0fa', 0.04), 'ice_sculpture', rot=(s * 25, -30, 0), segs=10)
    k.point_light(cx, cr + 0.5, z + 0.1, '#a8d8ff', 6, radius=0.15, group='static')
    k.solid(cx - 0.45, cr - 0.35, cx + 0.45, cr + 0.35)


# ---- the rink -----------------------------------------------------------------------------------------------------------
def rink(k, x0, r0, x1, r1, board='#f0ece4', rail='#b83a2e', ads=('#2a4a8a', '#b83a2e', '#d8b060')):
    """An ice rink with rounded corners inside its boards: white boards with a red rail and painted panels, the ice
    swept with skate marks and a centre circle, lamps on poles at the corners. Returns where skaters go round
    (a loop of points)."""
    rng = _r(k)
    cr_ = 0.9
    cx, cy = (x0 + x1) / 2, (r0 + r1) / 2
    hw, hh = (x1 - x0) / 2, (r1 - r0) / 2

    def outline(inset, n=64):
        pts = []
        for i in range(n):
            a = i / n * math.tau
            ux, uy = math.cos(a), math.sin(a)
            # a rounded rectangle by its superellipse
            p = 6.0
            sx = math.copysign(abs(ux) ** (2 / p), ux) * (hw - inset)
            sy = math.copysign(abs(uy) ** (2 / p), uy) * (hh - inset)
            pts.append((cx + sx, cy + sy))
        return pts
    ice = outline(0.12)
    k.poly([(cx, cy, 0.01)] + [(x, r, 0.01) for (x, r) in ice[::-1]] + [(ice[-1][0], ice[-1][1], 0.01)], ('#d8ecf6', 0.04), 'ice')
    W.annulus  # (kept for reference)
    for i in range(48):                                              # skate marks: loops round the rink
        a0 = rng.uniform(0, math.tau)
        rr = rng.uniform(0.35, 0.92)
        pts = [(cx + math.cos(a0 + j * 0.16) * (hw - 0.4) * rr, cy + math.sin(a0 + j * 0.16) * (hh - 0.4) * rr) for j in range(6)]
        for (ax, ar), (bx, br) in zip(pts, pts[1:]):
            k.tube((ax, ar, 0.016), (bx, br, 0.016), 0.006, ('#f8fcff', 0.03), 'ice_marks', verts=4)
    for i in range(32):                                              # the centre circle and line
        a, b = i / 32 * math.tau, (i + 1) / 32 * math.tau
        k.tube((cx + math.cos(a) * 0.9, cy + math.sin(a) * 0.6, 0.014), (cx + math.cos(b) * 0.9, cy + math.sin(b) * 0.6, 0.014), 0.012,
               ('#c83a3a', 0.04), 'ice_line', verts=4)
    qb(k, cx - 0.012, r0 + 0.2, 0.012, cx + 0.012, r1 - 0.2, 0.016, ('#c83a3a', 0.04), 'ice_line')
    # the boards: a run of panels round the outline, a red rail on top, ad panels on the front run
    ring = outline(0.0, 72)
    for i in range(len(ring)):
        (ax, ar), (bx, br) = ring[i], ring[(i + 1) % len(ring)]
        front = (ar + br) / 2 > cy + hh * 0.6
        col = ads[(i // 5) % len(ads)] if front and (i // 5) % 2 == 0 else board
        k.bar(ax, ar, bx, br, 0.0, 0.42, 0.06, (col, 0.04), 'rink_board')
        k.bar(ax, ar, bx, br, 0.42, 0.48, 0.09, (rail, 0.05), 'rink_rail')
        k.bar(ax, ar, bx, br, 0.48, 0.52, 0.07, (SNOW, 0.03), 'rail_snow')
    for (x, r) in ((x0 - 0.2, r0 - 0.2), (x1 + 0.2, r0 - 0.2), (x0 - 0.2, r1 + 0.2), (x1 + 0.2, r1 + 0.2)):
        k.cyl(x, r, 0.0, 2.6, 0.04, IRON, 'lamp_post', verts=8)
        qb(k, x - 0.2, r - 0.08, 2.5, x + 0.2, r + 0.08, 2.62, ('#3a3c44', 0.05), 'floodlight')
        qb(k, x - 0.17, r - 0.05, 2.47, x + 0.17, r + 0.05, 2.5, '#5a4a20', 'floodlight_glass', emit=('#fff4d8', 1.4))
        k.point_light(x + (0.6 if x < cx else -0.6), r + (0.6 if r < cy else -0.6), 2.3, '#fff0d0', 18, radius=0.2, group='flicker')
        k.solid_post(x, r)
    loop = [[round(cx + math.cos(a) * (hw - 0.9), 2), round(cy + math.sin(a) * (hh - 0.7), 2)] for a in [i / 12 * math.tau for i in range(12)]]
    return loop


def rink_cells(x0, r0, x1, r1):
    """The cells inside a rink's boards (walkable: skating), and the board ring (solid)."""
    inside, ring = [], []
    for c in range(int(math.floor(x0)), int(math.ceil(x1))):
        for r in range(int(math.floor(r0)), int(math.ceil(r1))):
            if c == int(math.floor(x0)) or c == int(math.ceil(x1)) - 1 or r == int(math.floor(r0)) or r == int(math.ceil(r1)) - 1:
                ring.append((c, r))
            else:
                inside.append((c, r))
    return inside, ring


# ---- sleigh and horse ---------------------------------------------------------------------------------------------
def horse(k, cx, cr, facing=1, coat='#5a3a24', mane='#2a1a10', blanket='#1e2a4a', bells=True):
    """A stout chibi horse standing, facing along x (+1 right): barrel body, legs with feathered hooves, an arched
    neck and head, mane and tail, a blanket and a harness strung with brass bells."""
    s = facing
    k.blob(cx, cr, 0.78, 0.5, 0.24, 0.26, (coat, 0.08), 'horse', segs=14)
    for (dx, dr) in ((-0.32, -0.12), (-0.32, 0.12), (0.32, -0.12), (0.32, 0.12)):
        k.tube((cx + dx, cr + dr, 0.7), (cx + dx + 0.02 * s, cr + dr, 0.1), 0.07, (coat, 0.08), 'horse', rb=0.055, verts=8)
        k.cyl(cx + dx + 0.02 * s, cr + dr, 0.0, 0.12, 0.08, ('#e8e0d0', 0.06), 'horse_feather', verts=8)
        k.cyl(cx + dx + 0.02 * s, cr + dr, 0.0, 0.03, 0.07, ('#2a2420', 0.05), 'hoof', verts=8)
    k.tube((cx + s * 0.38, cr, 0.92), (cx + s * 0.58, cr, 1.32), 0.13, (coat, 0.08), 'horse', rb=0.1, verts=10)
    k.blob(cx + s * 0.72, cr, 1.32, 0.2, 0.11, 0.11, (coat, 0.08), 'horse', rot=(0, s * 30, 0), segs=12)
    k.blob(cx + s * 0.86, cr, 1.24, 0.09, 0.09, 0.08, (shade(coat, 0.8), 0.06), 'horse', segs=8)
    for dr in (-0.06, 0.06):
        k.cone(cx + s * 0.6, cr + dr, 1.42, 1.56, 0.035, 0.0, (coat, 0.08), 'horse', verts=5)
        k.sphere(cx + s * 0.76, cr + dr * 1.6, 1.38, 0.022, 0.022, '#1a1210', 'horse_eye', segs=5)
    for i in range(6):                                              # the mane down the neck
        t = i / 5
        k.blob(cx + s * (0.4 + 0.18 * t), cr, 1.06 + 0.32 * t + 0.08, 0.06, 0.05, 0.08, (mane, 0.08), 'horse_mane', segs=6)
    k.tube((cx - s * 0.48, cr, 0.88), (cx - s * 0.66, cr, 0.42), 0.06, (mane, 0.08), 'horse_tail', rb=0.03, verts=6)
    k.blob(cx - 0.05 * s, cr, 0.98, 0.34, 0.26, 0.1, (blanket, 0.06), 'horse_blanket', segs=12)
    qb(k, cx - 0.3, cr - 0.255, 0.86, cx + 0.2, cr + 0.255, 0.9, GILT, 'horse_blanket')
    k.tube((cx + s * 0.42, cr - 0.2, 0.98), (cx + s * 0.42, cr + 0.2, 0.98), 0.03, ('#6a1a1a', 0.05), 'harness', verts=6)
    if bells:
        for i in range(5):
            a = (i - 2) * 0.4
            k.sphere(cx + s * 0.44 + math.sin(a) * 0.04, cr + 0.22 * math.sin(a * 1.2), 0.94 - abs(a) * 0.08, 0.035, 0.035, GILT, 'bell', segs=6)
    k.solid(cx - 0.6, cr - 0.3, cx + 0.6, cr + 0.3)


def sleigh(k, cx, cr, facing=1, body=VELVET, trim=GILT, seat='#2a1a2a', rug='#e8dccc', shafts=True):
    """A one-horse open sleigh: curling runners, a swan-necked dash in front, the body lacquered red with gilt
    scrollwork, a buttoned seat, a fur rug thrown over it, a lantern on the dash. facing +1: it runs to the right."""
    s = facing
    for dr in (-0.28, 0.28):                                        # runners curling up at the front
        k.tube((cx - s * 0.75, cr + dr, 0.06), (cx + s * 0.6, cr + dr, 0.06), 0.025, IRON, 'runner', verts=6)
        k.tube((cx + s * 0.6, cr + dr, 0.06), (cx + s * 0.86, cr + dr, 0.24), 0.025, IRON, 'runner', verts=6)
        k.tube((cx + s * 0.86, cr + dr, 0.24), (cx + s * 0.8, cr + dr, 0.48), 0.025, IRON, 'runner', verts=6)
        for t in (-0.5, 0.0, 0.45):
            k.tube((cx + s * t, cr + dr, 0.06), (cx + s * t, cr + dr * 0.9, 0.28), 0.02, IRON, 'runner', verts=4)
    qb(k, cx - 0.72, cr - 0.34, 0.28, cx + 0.5, cr + 0.34, 0.66, (body, 0.06), 'sleigh')
    k.loft([[(cx + s * 0.5, cr - 0.34, 0.28), (cx + s * 0.5, cr + 0.34, 0.28)],
            [(cx + s * 0.7, cr - 0.3, 0.5), (cx + s * 0.7, cr + 0.3, 0.5)],
            [(cx + s * 0.66, cr - 0.28, 0.86), (cx + s * 0.66, cr + 0.28, 0.86)],
            [(cx + s * 0.5, cr - 0.26, 0.98), (cx + s * 0.5, cr + 0.26, 0.98)]], (body, 0.06), 'sleigh', smooth=True)
    qb(k, cx - 0.72, cr - 0.34, 0.66, cx - 0.45, cr + 0.34, 1.05, (body, 0.06), 'sleigh')        # the seat back
    qb(k, cx - 0.47, cr - 0.3, 0.6, cx + 0.2, cr + 0.3, 0.7, (seat, 0.06), 'sleigh_seat')
    qb(k, cx - 0.45, cr - 0.31, 0.7, cx + 0.15, cr + 0.31, 0.74, (rug, 0.08), 'fur_rug')
    k.blob(cx - 0.1, cr + 0.3, 0.6, 0.3, 0.06, 0.16, (rug, 0.08), 'fur_rug', segs=8)
    for z in (0.32, 0.62):                                          # gilt lines and scrolls along the side
        qb(k, cx - 0.72, cr + 0.34, z, cx + 0.5, cr + 0.36, z + 0.02, trim, 'sleigh_trim')
    for t in (-0.35, 0.15):
        k.cyl_y(cx + t, cr + 0.34, cr + 0.37, 0.47, 0.09, 0.09, trim, 'sleigh_trim', verts=10)
        k.cyl_y(cx + t, cr + 0.35, cr + 0.38, 0.47, 0.06, 0.06, body, 'sleigh', verts=10)
    qb(k, cx + s * 0.62 - 0.02, cr - 0.02, 0.98, cx + s * 0.62 + 0.02, cr + 0.02, 1.1, IRON, 'lantern_bracket')
    W.lantern(k, cx + s * 0.62, cr, 1.1, 1.3, s=0.07, energy=5)
    if shafts:
        for dr in (-0.26, 0.26):
            k.tube((cx + s * 0.55, cr + dr, 0.45), (cx + s * 1.5, cr + dr * 0.7, 0.8), 0.02, ('#3a2416', 0.06), 'shaft', verts=4)
    k.solid(cx - 0.75, cr - 0.35, cx + 0.75, cr + 0.35)


# ---- the railway ------------------------------------------------------------------------------------------------------
def track(k, x0, x1, r, gauge=0.5, ballast='#8a8478', snow=True):
    """A railway line along x: a ballast bed, sleepers, two rails, snow lying between the sleepers."""
    rng = _r(k)
    qb(k, x0, r - 0.55, 0.0, x1, r + 0.55, 0.06, (ballast, 0.18), 'ballast')
    x = x0 + 0.1
    while x < x1:
        qb(k, x, r - 0.42, 0.06, x + 0.14, r + 0.42, 0.11, (shade('#5a4030', rng.uniform(0.85, 1.1)), 0.1), 'sleeper')
        if snow and rng.random() < 0.7:
            k.blob(x + 0.2, r + rng.uniform(-0.3, 0.3), 0.07, rng.uniform(0.08, 0.15), 0.12, 0.03, (SNOW, 0.03), 'snow', segs=6)
        x += 0.3
    for dr in (-gauge / 2, gauge / 2):
        qb(k, x0, r + dr - 0.03, 0.11, x1, r + dr + 0.03, 0.17, ('#6a6c74', 0.05), 'rail')
        qb(k, x0, r + dr - 0.015, 0.17, x1, r + dr + 0.015, 0.18, ('#c8ccd4', 0.03), 'rail')


def platform(k, x0, x1, r0, r1, z=0.35, canopy=True, edge='#e0c040', span=None):
    """A station platform: stone edged, a yellow line, flagged top; a canopy of glass on cast-iron columns with
    lacy brackets and a valance of fretted boards, lamps hanging."""
    rng = _r(k)
    qb(k, x0, r0, 0.0, x1, r1, z, (STONE_D, 0.08), 'platform_wall')
    r = r0
    while r < r1 - 0.02:
        rb = min(r1, r + rng.uniform(0.35, 0.5))
        x = x0
        while x < x1:
            xb = min(x1, x + rng.uniform(0.45, 0.75))
            qb(k, x + 0.01, r + 0.01, z, xb - 0.01, rb - 0.01, z + 0.03, (shade('#bdb3a0', rng.uniform(0.92, 1.06)), 0.06), 'platform_paving')
            x = xb
        r = rb
    qb(k, x0, r1 - 0.12, z + 0.03, x1, r1 - 0.06, z + 0.035, (edge, 0.04), 'platform_paving')
    if canopy:
        x0, x1 = span or (x0, x1)                                   # the canopy over part of the platform only
        h = z + 2.0
        x = x0 + 0.6
        cols = []
        while x < x1 - 0.4:
            cols.append(x)
            x += 2.4
        rc = (r0 + r1) / 2
        for cx in cols:
            k.cyl(cx, rc, z, h, 0.05, ('#2a4a3a', 0.06), 'column', verts=8)
            k.cyl(cx, rc, h - 0.15, h, 0.09, ('#2a4a3a', 0.06), 'capital', verts=8)
            for s in (-1, 1):
                k.tube((cx, rc, h - 0.4), (cx + s * 0.6, rc, h - 0.02), 0.02, ('#2a4a3a', 0.06), 'bracket', verts=4)
            k.solid_post(cx, rc)
        qb(k, x0 - 0.1, r0 - 0.1, h, x1 + 0.1, r1 + 0.2, h + 0.08, ('#2a4a3a', 0.06), 'canopy_frame')
        k.quads([((x0 - 0.1, r0 - 0.1, h + 0.08), (x1 + 0.1, r0 - 0.1, h + 0.08), (x1 + 0.1, rc, h + 0.35), (x0 - 0.1, rc, h + 0.35))],
                ('#5a6270', 0.05), 'roof_canopy')
        k.quads([((x0 - 0.1, rc, h + 0.35), (x1 + 0.1, rc, h + 0.35), (x1 + 0.1, r1 + 0.2, h + 0.08), (x0 - 0.1, r1 + 0.2, h + 0.08))],
                ('#5a6270', 0.05), 'roof_canopy')
        k.quads([((x0 - 0.05, rc + 0.05, h + 0.36), (x1 + 0.05, rc + 0.05, h + 0.36), (x1 + 0.05, r1 + 0.12, h + 0.14), (x0 - 0.05, r1 + 0.12, h + 0.14))],
                (SNOW, 0.03), 'roof_snow')
        x = x0 - 0.1
        while x < x1 + 0.1:                                         # the fretted valance along the front
            qb(k, x, r1 + 0.18, h - 0.22, x + 0.1, r1 + 0.22, h + 0.06, ('#e8e0cc', 0.05), 'valance')
            k.cone(x + 0.05, r1 + 0.2, h - 0.3, h - 0.22, 0.005, 0.05, ('#e8e0cc', 0.05), 'valance', verts=4)
            x += 0.14
        for cx in cols[:-1]:
            lx = cx + 1.2
            qb(k, lx - 0.006, rc, h - 0.5, lx + 0.006, rc + 0.01, h, IRON, 'chain')
            W.lantern(k, lx, rc, h - 0.8, h - 0.5, s=0.09, energy=8)
    return z


def station_house(k, x0, x1, r_back, r_front, clock=True, col=STONE, roof=SLATE, door_x=None, windows=()):
    """A small stone station building with a hipped slate roof and a clock gable."""
    wall_h = 2.2
    qb(k, x0 - 0.04, r_back, 0.0, x1 + 0.04, r_front + 0.04, 0.35, (shade(col, 0.8), 0.08), 'footing')
    qb(k, x0, r_back + 0.02, 0.35, x1, r_front - 0.04, wall_h, (shade(col, 0.95), 0.06), 'house_wall')
    holes = [(wx - 0.4, 0.4, wx + 0.4, 1.7) for wx in windows] + ([(door_x - 0.6, 0.0, door_x + 0.6, 1.9)] if door_x else [])
    ashlar(k, x0, x1, r_front - 0.04, 0.35, wall_h, col, skip=holes)
    for s, xc in ((-1, x0), (1, x1)):
        quoins(k, xc, r_front - 0.04, 0.35, wall_h, s, col)
    for wx in windows:
        grand_window(k, wx, r_front - 0.04, 0.6, w=0.5, h=1.0, head='arch', light=False)
    if door_x is not None:
        double_door(k, door_x, r_front - 0.04, w=0.9, h=1.35)
    zr = mansard(k, x0 - 0.06, x1 + 0.06, r_back, r_front + 0.06, wall_h, h=0.9, col=roof, dormers=(), crest=False)
    if clock:
        cx = (x0 + x1) / 2
        qb(k, cx - 0.55, r_front - 0.06, wall_h - 0.1, cx + 0.55, r_front + 0.1, wall_h + 1.2, (shade(col, 1.05), 0.05), 'gable')
        k.poly([(cx - 0.65, r_front + 0.1, wall_h + 1.2), (cx + 0.65, r_front + 0.1, wall_h + 1.2), (cx, r_front + 0.1, wall_h + 1.62)],
               (shade(col, 1.08), 0.05), 'pediment')
        k.tube((cx - 0.66, r_front + 0.06, wall_h + 1.24), (cx, r_front + 0.06, wall_h + 1.68), 0.04, (SNOW, 0.03), 'ledge_snow', verts=6)
        k.tube((cx, r_front + 0.06, wall_h + 1.68), (cx + 0.66, r_front + 0.06, wall_h + 1.24), 0.04, (SNOW, 0.03), 'ledge_snow', verts=6)
        k.cyl_y(cx, r_front + 0.1, r_front + 0.14, wall_h + 0.62, 0.38, 0.38, (GILT, 0.04), 'clock_rim', verts=24)
        k.cyl_y(cx, r_front + 0.12, r_front + 0.16, wall_h + 0.62, 0.32, 0.32, '#f4ecd8', 'clock_face', emit=('#fff2d0', 0.35), verts=24)
        for i in range(12):
            a = i / 12 * math.tau
            qb(k, cx + math.cos(a) * 0.26 - 0.015, r_front + 0.16, wall_h + 0.62 + math.sin(a) * 0.26 - 0.015,
                  cx + math.cos(a) * 0.26 + 0.015, r_front + 0.17, wall_h + 0.62 + math.sin(a) * 0.26 + 0.015, IRON, 'clock_mark')
        k.bar(cx, r_front + 0.17, cx + 0.001, r_front + 0.17, wall_h + 0.62, wall_h + 0.84, 0.025, IRON, 'clock_hand')
        k.tube((cx, r_front + 0.17, wall_h + 0.62), (cx + 0.15, r_front + 0.17, wall_h + 0.55), 0.015, IRON, 'clock_hand', verts=4)
    k.solid(x0, r_back, x1, r_front)
    return zr


def bench_iron(k, x0, x1, cr):
    """A station bench: slats on cast-iron ends, snow on the seat's back half."""
    W.bench(k, x0, x1, cr, tone='#5a3a22')
    qb(k, x0 + 0.05, cr - 0.12, 0.46, x1 - 0.05, cr + 0.02, 0.5, (SNOW, 0.03), 'bench_snow')


def luggage(k, cx, cr):
    """A stack of trunks and a hatbox, waiting for the train."""
    qb(k, cx - 0.35, cr - 0.22, 0.0, cx + 0.35, cr + 0.22, 0.34, ('#6a3a1e', 0.08), 'trunk')
    for dx in (-0.22, 0.22):
        qb(k, cx + dx - 0.03, cr - 0.23, 0.0, cx + dx + 0.03, cr + 0.23, 0.35, GILT, 'trunk_strap')
    qb(k, cx - 0.26, cr - 0.17, 0.34, cx + 0.22, cr + 0.17, 0.58, ('#2a3a5a', 0.08), 'trunk')
    k.cyl(cx + 0.08, cr - 0.02, 0.58, 0.76, 0.14, ('#d8c8a8', 0.06), 'hatbox', verts=14)
    k.cyl(cx + 0.08, cr - 0.02, 0.73, 0.76, 0.145, ('#8a1a2a', 0.05), 'hatbox', verts=14)
    k.solid(cx - 0.35, cr - 0.22, cx + 0.35, cr + 0.22)


# ---- shopfronts ---------------------------------------------------------------------------------------------------------
def awning(k, x0, x1, r_face, z, d=0.7, cols=('#1e2a4a', '#f0e8d8'), stripe=0.18, snow=True):
    """A striped canvas awning sloping out from the wall, a scalloped valance, snow along its top."""
    rf = r_face + d
    zb = z - 0.35
    x, i = x0, 0
    while x < x1 - 0.005:
        xb = min(x1, x + stripe)
        col = cols[i % len(cols)]
        k.quads([((x, r_face, z), (xb, r_face, z), (xb, rf, zb), (x, rf, zb))], (col, 0.04), 'awning')
        qb(k, x, rf - 0.01, zb - 0.14, xb, rf + 0.01, zb, (col, 0.04), 'awning')
        k.cyl_y((x + xb) / 2, rf - 0.01, rf + 0.01, zb - 0.14, (xb - x) / 2, 0.06, (col, 0.04), 'awning', verts=8)
        x, i = xb, i + 1
    for s in (x0, x1):
        k.tube((s, r_face, z - 0.02), (s, rf, zb), 0.012, IRON, 'awning_arm', verts=4)
    if snow:
        k.quads([((x0 + 0.04, r_face + 0.06, z + 0.02), (x1 - 0.04, r_face + 0.06, z + 0.02), (x1 - 0.04, r_face + d * 0.6, z - 0.19), (x0 + 0.04, r_face + d * 0.6, z - 0.19))],
                (SNOW, 0.03), 'roof_snow')


def flag(k, cx, cr, z, h=2.2, col=VELVET, emblem=GILT):
    """A flagpole with a banner hanging from a crossbar (a château's colours)."""
    k.cyl(cx, cr, z, z + h, 0.03, ('#c8ccd4', 0.04), 'flagpole', verts=8)
    k.sphere(cx, cr, z + h + 0.04, 0.05, 0.05, GILT, 'finial', segs=8)
    qb(k, cx - 0.3, cr - 0.01, z + h - 0.1, cx + 0.3, cr + 0.01, z + h - 0.06, ('#c8ccd4', 0.04), 'flagpole')
    qb(k, cx - 0.28, cr + 0.01, z + h - 0.95, cx + 0.28, cr + 0.04, z + h - 0.1, (col, 0.05), 'banner')
    k.poly([(cx - 0.28, cr + 0.04, z + h - 0.95), (cx + 0.28, cr + 0.04, z + h - 0.95), (cx, cr + 0.04, z + h - 1.15)], (col, 0.05), 'banner')
    k.sphere(cx, cr + 0.05, z + h - 0.5, 0.1, 0.1, emblem, 'banner_emblem', segs=8)


def fur_rail(k, x0, x1, cr, furs=('#e8dcc8', '#6a4a32', '#f4f0ea', '#2a2420', '#a8865a')):
    """Fur coats on a brass rail outside a boutique (under its awning)."""
    k.cyl(x0, cr, 0.0, 1.5, 0.02, GILT, 'rail_post', verts=6)
    k.cyl(x1, cr, 0.0, 1.5, 0.02, GILT, 'rail_post', verts=6)
    k.tube((x0, cr, 1.5), (x1, cr, 1.5), 0.02, GILT, 'rail', verts=6)
    n = max(2, int((x1 - x0) / 0.26))
    for i in range(n):
        x = x0 + (i + 0.5) * (x1 - x0) / n
        c = furs[i % len(furs)]
        k.blob(x, cr, 1.05, 0.12, 0.1, 0.4, (c, 0.12), 'fur_coat', segs=10)
        k.blob(x, cr, 1.38, 0.14, 0.11, 0.1, (shade(c, 1.08), 0.12), 'fur_collar', segs=8)
    k.solid(x0, cr - 0.2, x1, cr + 0.2)


def ski_in_arch(k, cx, cr, w=3.0, h=2.4, col='#2a4a8a'):
    """The finish of the run into town: two timber posts, a banner across."""
    for s in (-1, 1):
        qb(k, cx + s * w / 2 - 0.12, cr - 0.12, 0.0, cx + s * w / 2 + 0.12, cr + 0.12, h, ('#5a3a22', 0.08), 'arch_post')
        k.blob(cx + s * w / 2, cr, h + 0.06, 0.16, 0.16, 0.07, (SNOW, 0.03), 'post_snow', segs=8)
        k.solid_post(cx + s * w / 2, cr)
    qb(k, cx - w / 2 + 0.12, cr - 0.03, h - 0.6, cx + w / 2 - 0.12, cr + 0.03, h - 0.1, (col, 0.05), 'banner')
    qb(k, cx - w / 2 + 0.12, cr + 0.03, h - 0.6, cx + w / 2 - 0.12, cr + 0.04, h - 0.56, GILT, 'banner_trim')
    qb(k, cx - w / 2 + 0.12, cr + 0.03, h - 0.14, cx + w / 2 - 0.12, cr + 0.04, h - 0.1, GILT, 'banner_trim')


# ---- the train -------------------------------------------------------------------------------------------------------
RED_CAR = '#a8222a'
CREAM = '#efe4cc'


def bogie(k, cx, r, z=0.06):
    qb(k, cx - 0.45, r - 0.36, z + 0.06, cx + 0.45, r + 0.36, z + 0.26, ('#2a2a30', 0.06), 'bogie')
    for dx in (-0.26, 0.26):
        for s in (-1, 1):
            k.cyl_y(cx + dx, r + s * 0.3 - 0.04, r + s * 0.3 + 0.04, z + 0.14, 0.13, 0.13, ('#3a3a42', 0.05), 'wheel', verts=12)
            k.cyl_y(cx + dx, r + s * 0.3 + (0.04 if s > 0 else -0.06), r + s * 0.3 + (0.06 if s > 0 else -0.04), z + 0.14, 0.05, 0.05,
                    ('#9a1a1a', 0.05), 'wheel_hub', verts=8)


def carriage(k, x0, x1, r, z=0.06, body=RED_CAR, band=CREAM, lit=True, name=None, snow=True):
    """A panoramic carriage side-on to the camera: a red body with a cream band, windows that curve up into the roof,
    a dark roof with snow on it, bogies under each end, a gilt crest. Faces along x."""
    zb, zt = z + 0.32, z + 1.25
    qb(k, x0, r - 0.44, zb, x1, r + 0.44, z + 0.62, (body, 0.05), 'carriage')
    qb(k, x0, r + 0.43, z + 0.55, x1, r + 0.455, z + 0.6, (band, 0.04), 'carriage_band')
    qb(k, x0 + 0.02, r - 0.42, z + 0.62, x1 - 0.02, r + 0.42, zt - 0.1, ('#2a3440', 0.05), 'carriage_frame')
    # the panoramic glass: tall panes up the side, curving into the roof
    x = x0 + 0.25
    while x < x1 - 0.5:
        xb = x + 0.62
        qb(k, x, r + 0.4, z + 0.66, xb, r + 0.44, zt - 0.16, GLASS if lit else '#1a2a3a', 'window_glass', emit=(GLOW, 0.7) if lit else None)
        k.quads([((x, r + 0.44, zt - 0.16), (xb, r + 0.44, zt - 0.16), (xb, r + 0.22, zt + 0.06), (x, r + 0.22, zt + 0.06))],
                ('#6a8aa8', 0.04), 'carriage_glass')
        x = xb + 0.08
    qb(k, x0, r - 0.44, zt - 0.12, x1, r + 0.22, zt + 0.1, ('#2a2e36', 0.05), 'roof_carriage')
    if snow:
        qb(k, x0 + 0.1, r - 0.4, zt + 0.1, x1 - 0.1, r + 0.1, zt + 0.15, (SNOW, 0.03), 'roof_snow')
    qb(k, x0 - 0.04, r - 0.42, z + 0.24, x1 + 0.04, r + 0.42, zb, ('#1e1e24', 0.05), 'carriage_floor')
    for xs in (x0, x1):                                             # the gangway bellows
        qb(k, xs - 0.08, r - 0.3, z + 0.4, xs + 0.08, r + 0.3, zt - 0.05, ('#1a1a1e', 0.05), 'gangway')
    bogie(k, x0 + 0.9, r, z)
    bogie(k, x1 - 0.9, r, z)
    k.cyl_y((x0 + x1) / 2, r + 0.44, r + 0.47, z + 0.46, 0.09, 0.09, GILT, 'crest', verts=10)
    if lit:
        k.point_light((x0 + x1) / 2, r + 0.9, z + 0.9, '#ffc070', 6, radius=0.3, group='flicker')


def locomotive(k, x0, x1, r, z=0.06, facing=1, body=RED_CAR, band=CREAM):
    """An electric mountain locomotive: a boxy red body, a raked nose with a wide windscreen and two headlamps, louvres
    along the side, a pantograph up to the wire."""
    s = facing
    xn, xb = (x1, x0) if s > 0 else (x0, x1)
    zt = z + 1.3
    qb(k, min(x0, x1), r - 0.44, z + 0.32, max(x0, x1), r + 0.44, zt - 0.1, (body, 0.05), 'loco')
    qb(k, min(x0, x1), r + 0.43, z + 0.55, max(x0, x1), r + 0.455, z + 0.6, (band, 0.04), 'loco_band')
    # the cab at the nose: a raked windscreen
    k.quads([((xn - s * 0.6, r - 0.44, zt - 0.1), (xn - s * 0.6, r + 0.44, zt - 0.1), (xn + s * 0.1, r + 0.44, z + 0.85), (xn + s * 0.1, r - 0.44, z + 0.85))],
            ('#2a3a4a', 0.04), 'loco_glass')
    qb(k, min(xn, xn + s * 0.1), r - 0.44, z + 0.32, max(xn, xn + s * 0.1), r + 0.44, z + 0.85, (body, 0.05), 'loco')
    qb(k, xn - s * 1.15 - 0.25, r + 0.4, z + 0.7, xn - s * 1.15 + 0.25, r + 0.45, zt - 0.2, ('#2a3a4a', 0.04), 'loco_glass')
    for dr in (-0.28, 0.28):
        k.cyl_x(xn + s * 0.08, xn + s * 0.14, r + dr, z + 0.5, 0.07, 0.07, '#4a3a10', 'headlamp', emit=('#fff4d0', 1.6), verts=8)
    qb(k, min(x0, x1), r - 0.44, zt - 0.12, max(x0, x1), r + 0.44, zt, ('#2a2e36', 0.05), 'roof_loco')
    x = min(x0, x1) + 1.6
    while x < max(x0, x1) - 1.8:                                     # louvres along the side
        qb(k, x, r + 0.44, z + 0.75, x + 0.5, r + 0.46, zt - 0.3, ('#7a1a20', 0.05), 'louvre')
        for j in range(4):
            qb(k, x + 0.02, r + 0.46, z + 0.8 + j * 0.06, x + 0.48, r + 0.47, z + 0.82 + j * 0.06, '#5a1218', 'louvre')
        x += 0.65
    bogie(k, min(x0, x1) + 0.9, r, z)
    bogie(k, max(x0, x1) - 0.9, r, z)
    px = (x0 + x1) / 2 + s * 0.6                                    # the pantograph
    qb(k, px - 0.3, r - 0.2, zt, px + 0.3, r + 0.2, zt + 0.06, ('#3a3c44', 0.05), 'pantograph')
    k.tube((px - 0.25, r, zt + 0.06), (px + 0.1, r, zt + 0.55), 0.015, ('#3a3c44', 0.05), 'pantograph', verts=4)
    k.tube((px + 0.1, r, zt + 0.55), (px - 0.15, r, zt + 0.95), 0.015, ('#3a3c44', 0.05), 'pantograph', verts=4)
    qb(k, px - 0.4, r - 0.3, zt + 0.94, px + 0.1, r + 0.3, zt + 0.98, ('#c8ccd4', 0.04), 'pantograph')
    k.cyl_y(min(x0, x1) + (max(x0, x1) - min(x0, x1)) / 2, r + 0.44, r + 0.47, z + 0.46, 0.11, 0.11, GILT, 'crest', verts=10)


def train(k, x0, r, cars=2, facing=1, car_len=4.2, loco_len=3.4, lit=True, z=0.06):
    """The whole train standing along x from x0: the locomotive at the front end, `cars` panoramic carriages behind."""
    x = x0
    parts = []
    if facing > 0:
        for i in range(cars):
            carriage(k, x, x + car_len, r, z=z, lit=lit)
            x += car_len + 0.12
        locomotive(k, x, x + loco_len, r, z=z, facing=1)
        x += loco_len
    else:
        locomotive(k, x, x + loco_len, r, z=z, facing=-1)
        x += loco_len + 0.12
        for i in range(cars):
            carriage(k, x, x + car_len, r, z=z, lit=lit)
            x += car_len + 0.12
    k.solid(x0, r - 0.45, x, r + 0.45)
    return x


def catenary_mast(k, cx, r, h=2.6, arm=0.9):
    """An overhead-line mast beside the track: a lattice post, an arm out over the rails, the insulators."""
    qb(k, cx - 0.06, r - 0.06, 0.0, cx + 0.06, r + 0.06, h, ('#4a4e58', 0.05), 'mast')
    for j in range(int(h / 0.25)):
        k.tube((cx - 0.06, r + 0.06, j * 0.25), (cx + 0.06, r + 0.06, j * 0.25 + 0.25), 0.008, ('#4a4e58', 0.05), 'mast', verts=4)
    k.tube((cx, r, h - 0.1), (cx, r + arm, h - 0.1), 0.02, ('#4a4e58', 0.05), 'mast_arm', verts=5)
    k.cyl(cx, r + arm, h - 0.35, h - 0.12, 0.03, ('#8a5a3a', 0.06), 'insulator', verts=6)
    k.solid_post(cx, r)


# ---- the grand chalet (Fellhaven's promenade) ---------------------------------------------------------------------------
def grand_chalet(k, x0, x1, r_back, r_front, wall_h=2.9, rise=1.6, door_x=None, floors=2, base=0.45, chimney_x=None,
                 shutters='#7a2a22', sign=None, lit=True):
    """A big front-gabled chalet hotel: a stone ground floor, log floors above with a balcony across each (carved
    balusters, window boxes of red geraniums under snow), shuttered windows, a gable of vertical boards with a round
    window in its peak, a deep snow roof with a cornice and icicles, a chimney. Returns a smoke point (screen tiles)."""
    rng = _r(k)
    xc, zt = (x0 + x1) / 2, wall_h + rise
    rf = r_front
    LOG, LOG_D, LOG_L = N.LOG, N.LOG_D, N.LOG_L
    qb(k, x0 - 0.05, r_back, 0.0, x1 + 0.05, rf + 0.05, base, ('#6a6e78', 0.14), 'footing', bevel=0.03)
    qb(k, x0, r_back + 0.02, base, x1, rf - 0.02, base + 1.0, ('#9a96a0', 0.12), 'house_wall')
    ashlar(k, x0, x1, rf - 0.02, base, base + 1.0, '#a8a4ac', course=0.24, block=(0.3, 0.5))
    qb(k, x0, r_back + 0.02, base + 1.0, x1, rf - 0.04, wall_h, (LOG, 0.08), 'chalet_wall')
    z, j = base + 1.06, 0
    while z < wall_h - 0.05:
        k.cyl_x(x0 - 0.1, x1 + 0.1, rf - 0.04, z, 0.075, 0.075, (shade(LOG, 0.9 if j % 2 else 1.06), 0.1), 'log', verts=8)
        z += 0.15
        j += 1
    n = max(2, int((x1 - x0) / 1.1))
    bays = [x0 + (x1 - x0) * (i + 0.5) / n for i in range(n)]
    for bx in bays:                                                     # the ground floor: arched windows in the stone
        if door_x is not None and abs(bx - door_x) < 0.7:
            continue
        grand_window(k, bx, rf - 0.02, base + 0.18, w=0.5, h=0.62, head='arch', light=(int(bx * 10) % 2 == 0))
    fz = [base + 1.0 + i * (wall_h - base - 1.0) / max(1, floors - 1 + 0.0001) for i in range(floors - 1)] if floors > 1 else []
    fz = [base + 1.15 + i * 0.95 for i in range(floors - 1)]
    for zf in fz:                                                       # each upper floor: windows, a balcony across
        for bx in bays:
            W.window(k, bx, rf + 0.0, zf + 0.12, w=0.48, h=0.56, shutters=shutters, lit=lit and rng.random() < 0.7)
        bz = zf - 0.02
        qb(k, x0 + 0.05, rf, bz, x1 - 0.05, rf + 0.5, bz + 0.08, (LOG_D, 0.08), 'balcony')
        x = x0 + 0.12
        while x < x1 - 0.1:                                             # carved balusters, a heart cut in each
            qb(k, x, rf + 0.44, bz + 0.08, x + 0.1, rf + 0.5, bz + 0.52, (LOG_L, 0.08), 'baluster')
            x += 0.16
        qb(k, x0 + 0.05, rf + 0.42, bz + 0.52, x1 - 0.05, rf + 0.52, bz + 0.58, (LOG_D, 0.08), 'rail')
        k.tube((x0 + 0.05, rf + 0.47, bz + 0.62), (x1 - 0.05, rf + 0.47, bz + 0.62), 0.05, (SNOW, 0.04), 'rail_snow', verts=8)
        for bx in bays:                                                 # geraniums in boxes on the rail
            qb(k, bx - 0.3, rf + 0.5, bz + 0.38, bx + 0.3, rf + 0.62, bz + 0.52, (LOG_D, 0.08), 'flower_box')
            for t in range(5):
                k.sphere(bx - 0.24 + t * 0.12, rf + 0.58, bz + 0.56, 0.05, 0.045, ('#c8282a', 0.1), 'flower', segs=6)
        for s_ in (-1, 1):                                              # brackets under the balcony
            k.tube((x0 + 0.3 if s_ < 0 else x1 - 0.3, rf - 0.02, bz - 0.4), (x0 + 0.3 if s_ < 0 else x1 - 0.3, rf + 0.45, bz - 0.02), 0.04,
                   (LOG_D, 0.08), 'bracket', verts=4)
    # the gable: boards, a round window, a painted sun
    gz0 = wall_h
    k.poly([(x0, rf + 0.0, gz0), (x1, rf + 0.0, gz0), (xc, rf + 0.0, zt)], (LOG_L, 0.08), 'gable')
    bx = x0 + 0.14
    while bx < x1 - 0.1:
        hgt = (1 - abs(bx - xc) / ((x1 - x0) / 2)) * rise
        if hgt > 0.08:
            qb(k, bx - 0.015, rf + 0.01, gz0, bx + 0.015, rf + 0.03, gz0 + hgt - 0.03, (LOG_D, 0.08), 'board_joint')
        bx += 0.2
    k.cyl_y(xc, rf, rf + 0.06, gz0 + rise * 0.45, 0.24, 0.24, LOG_D, 'gable_window_frame', verts=16)
    k.cyl_y(xc, rf + 0.02, rf + 0.08, gz0 + rise * 0.45, 0.17, 0.17, GLASS, 'window_glass', emit=(GLOW, 0.9), verts=16)
    k.point_light(xc, rf + 0.6, gz0 + rise * 0.45, '#ffc070', 4, radius=0.15, group='flicker')
    # the roof, deep and snow-laden (as the tarn's chalet)
    over, front_over = 0.5, 0.75
    rb, rff = r_back - 0.3, rf + front_over
    for s_ in (-1, 1):
        xe = xc + s_ * ((x1 - x0) / 2 + over)
        ze = wall_h - over * rise / ((x1 - x0) / 2)
        k.poly([(xc, rb, zt), (xc, rff, zt), (xe, rff, ze), (xe, rb, ze)], (LOG_D, 0.08), 'roof_deck')
        SN = 0.9
        xs_, zs_ = xc + (xe - xc) * SN, zt + (ze - zt) * SN
        k.poly([(xc, rb + 0.05, zt + 0.15), (xc, rff - 0.08, zt + 0.15), (xs_, rff - 0.08, zs_ + 0.1), (xs_, rb + 0.05, zs_ + 0.1)], (SNOW, 0.03), 'roof_snow')
        m = 8
        for j in range(m):
            ra_ = rb + 0.02 + j / m * (rff - rb - 0.08)
            rb2 = rb + 0.02 + (j + 1) / m * (rff - rb - 0.08)
            sag = 0.03 * math.sin(j * 1.7)
            k.tube((xs_ + s_ * 0.04, ra_, zs_ + 0.06 - sag), (xs_ + s_ * 0.04, rb2, zs_ + 0.06 + sag), 0.16, (SNOW, 0.03), 'cornice', verts=12)
        for rv in (rff - 0.06, rb + 0.04):
            k.tube((xc, rv, zt + 0.15), (xs_ + s_ * 0.04, rv, zs_ + 0.08), 0.13, (SNOW, 0.03), 'verge_snow', verts=10)
        k.bar(xc, rff + 0.02, xe, rff + 0.02, ze - 0.02, ze + 0.02, 0.07, (LOG_D, 0.08), 'bargeboard')
        rr = rb + 0.15
        while rr < rff - 0.1:
            L = rng.uniform(0.08, 0.3)
            k.cone(xe - s_ * 0.08, rr, ze - L, ze, 0.025, 0.004, (N.ICE, 0.06), 'icicle', verts=5)
            rr += rng.uniform(0.14, 0.26)
    k.tube((xc, rb + 0.04, zt + 0.18), (xc, rff - 0.06, zt + 0.18), 0.14, (SNOW, 0.03), 'ridge_snow', verts=12)
    for j in range(11):
        t = (j + 0.5) / 11
        xx = x0 - over + t * (x1 - x0 + 2 * over)
        zz = zt - abs(xx - xc) * rise / ((x1 - x0) / 2) - 0.1
        if zz > wall_h - 0.4:
            k.cone(xx, rff - 0.02, zz - rng.uniform(0.1, 0.32), zz, 0.03, 0.005, (N.ICE, 0.06), 'icicle', verts=5)
    if door_x is not None:
        double_door(k, door_x, rf - 0.02, w=0.9, h=1.3, col='#4a2a18')
        qb(k, door_x - 0.75, rf, 0.0, door_x + 0.75, rf + 0.55, 0.12, ('#8a8e98', 0.15), 'step')
        W.wall_lantern(k, door_x - 0.8, rf, z=1.2)
        W.wall_lantern(k, door_x + 0.8, rf, z=1.2)
    smoke = None
    if chimney_x is not None:
        cz = wall_h + rise * (1 - abs(chimney_x - xc) / ((x1 - x0) / 2))
        qb(k, chimney_x - 0.22, r_back + 0.4, wall_h, chimney_x + 0.22, r_back + 0.85, cz + 0.65, ('#5c5a62', 0.14), 'chimney', bevel=0.02)
        k.blob(chimney_x, r_back + 0.62, cz + 0.7, 0.3, 0.28, 0.08, (SNOW, 0.05), 'chimney_snow', segs=10)
        smoke = [round(chimney_x, 3), round(r_back + 0.62 - (cz + 0.8) * math.cos(math.radians(45)), 3)]
    k.solid(x0, r_back, x1, r_front)
    return smoke



# ---- the Place's garden ------------------------------------------------------------------------------------------------
BOX = '#24482e'


def parterre(k, x0, r0, x1, r1, urn=True):
    """A formal bed under snow: a low clipped box hedge round it (snow on its top), a scroll of hedge inside, little
    clipped firs at the corners, a stone urn in the middle. Built as needles, so the hedges stay green all year."""
    k.blob((x0 + x1) / 2, (r0 + r1) / 2, 0.0, (x1 - x0) / 2 - 0.1, (r1 - r0) / 2 - 0.1, 0.16, (SNOW, 0.03), 'snow_bed', segs=16)
    with k.foliage('needle'):
        for (a, b, c, d) in ((x0, r0, x1, r0 + 0.22), (x0, r1 - 0.22, x1, r1), (x0, r0, x0 + 0.22, r1), (x1 - 0.22, r0, x1, r1)):
            qb(k, a, b, 0.0, c, d, 0.24, (BOX, 0.18), 'hedge', bevel=0.04)
        cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
        rx, ry = (x1 - x0) / 2 - 0.6, (r1 - r0) / 2 - 0.5
        pts = [(cx + math.cos(t / 24 * math.tau) * rx, cr + math.sin(t / 24 * math.tau) * ry) for t in range(25)]
        for (ax, ar), (bx, br) in zip(pts, pts[1:]):
            k.tube((ax, ar, 0.1), (bx, br, 0.1), 0.09, (BOX, 0.18), 'hedge', verts=6)
    for (a, b, c, d) in ((x0, r0, x1, r0 + 0.22), (x0, r1 - 0.22, x1, r1), (x0, r0, x0 + 0.22, r1), (x1 - 0.22, r0, x1, r1)):
        qb(k, a + 0.02, b + 0.02, 0.24, c - 0.02, d - 0.02, 0.29, (SNOW, 0.03), 'hedge_snow', bevel=0.03)
    for (x, r) in ((x0 + 0.25, r0 + 0.25), (x1 - 0.25, r0 + 0.25), (x0 + 0.25, r1 - 0.25), (x1 - 0.25, r1 - 0.25)):
        W.pine_tiers(k, x, r, 0.9, BOX, rad=0.2, z0=0.2, tiers=3, snow=SNOW)
    if urn:
        urn_planter(k, (x0 + x1) / 2, (r0 + r1) / 2)
    k.solid(x0, r0, x1, r1)


def setts(k, x0, r0, x1, r1, tone='#b4ae9e', w=(0.26, 0.42), d=0.2, grout='#6a665e', part='setts'):
    """Granite setts in running courses over dark grout — the whole run as a few meshes (one per tone), not one object
    a stone: a big square stays cheap to build and render."""
    rng = _r(k)
    qb(k, x0, r0, -0.04, x1, r1, 0.012, (grout, 0.12), 'grout')
    tones = {0: [], 1: [], 2: [], 3: []}
    r = r0
    while r < r1 - 0.02:
        rb = min(r1, r + d)
        x = x0 - rng.uniform(0.0, 0.2)
        while x < x1 - 0.02:
            xb = min(x1, x + rng.uniform(*w))
            if xb - max(x0, x) > 0.06:
                tones[rng.randrange(4)].append((max(x0, x) + 0.018, r + 0.018, 0.012, xb - 0.018, rb - 0.018, 0.045 + rng.uniform(0, 0.012)))
            x = xb
        r = rb
    for j, f in enumerate((0.88, 0.96, 1.04, 1.12)):
        if tones[j]:
            k.boxes(tones[j], (shade(tone, f), 0.1), part)


def snow_edge(k, x0, r0, x1, r1, every=0.5):
    """Snow swept up along the edges of a paved run."""
    rng = _r(k)
    for (a, b, c, d) in ((x0, r0, x1, r0), (x0, r1, x1, r1), (x0, r0, x0, r1), (x1, r0, x1, r1)):
        L = math.hypot(c - a, d - b)
        n = max(1, int(L / every))
        for i in range(n + 1):
            t = i / n
            k.blob(a + (c - a) * t, b + (d - b) * t, 0.0, rng.uniform(0.18, 0.32), rng.uniform(0.14, 0.24), rng.uniform(0.04, 0.09),
                   (SNOW, 0.03), 'drift', segs=7)


# ---- the hidden valley (Workstream E): warm from below --------------------------------------------------------------------
TRAV = ('#e8d8b8', '#d8b888', '#c89a68')          # travertine: cream rims, ochre and rust where the water runs
SPRING = '#4ab8c0'
MOSS = ('#3e6a34', '#5a8a3e', '#7aa84a')


def spring_terraces(k, cx, cr, steps=4, w=2.6, d=1.0, z0=0.0, drop=0.16, seed=0):
    """Hot springs stepping down a slope in travertine terraces: each pool a kidney of still blue water (`pond_water`,
    so the live light gives it Look Book water) inside a scalloped rim of cream stone stained ochre where it spills, the
    next one below and a little to the side. Returns (steam points, the pools' ellipses (x, r, rx, ry))."""
    rng = _r(k)
    steam, pools = [], []
    x, r, z = cx, cr, z0 + drop * steps
    for i in range(steps):
        rx, ry = w * (0.75 + 0.25 * rng.random()) / 2, d * (0.8 + 0.3 * rng.random()) / 2
        n = 28
        rim = []
        for j in range(n):
            a = j / n * math.tau
            f = 1 + 0.08 * math.sin(3 * a + seed + i) + 0.05 * math.sin(5 * a + i * 2)
            rim.append((x + math.cos(a) * rx * f, r + math.sin(a) * ry * f))
        # the rim: a thick lip of travertine all round, scalloped where it spills (the front), stained below
        for j, (px_, pr_) in enumerate(rim):
            front = math.sin(j / n * math.tau) > 0.3
            col = TRAV[1] if front else TRAV[0]
            k.blob(px_, pr_, z - 0.02, 0.16 if front else 0.13, 0.1, 0.07, (col, 0.1), 'travertine', segs=6)
            if front:
                k.blob(px_, pr_ + 0.12, z - 0.12, 0.14, 0.12, 0.09, (TRAV[2], 0.12), 'travertine', segs=6)
        k.poly([(x, r, z)] + [(px_, pr_, z) for (px_, pr_) in rim[::-1]] + [(rim[-1][0], rim[-1][1], z)], (SPRING, 0.04), 'pond_water')
        k.poly([(x, r, z - 0.06)] + [(px_, pr_, z - 0.06) for (px_, pr_) in rim[::-1]] + [(rim[-1][0], rim[-1][1], z - 0.06)],
               ('#d8c8a0', 0.1), 'pool_floor')
        # the step down: a wall of travertine below the lip, draped
        k.blob(x, r + ry * 0.6, z - drop * 0.6, rx * 1.05, ry * 0.7, drop * 0.7 + 0.04, (TRAV[1], 0.12), 'travertine', segs=12)
        steam.append([round(x, 2), round(r, 2)])
        pools.append((x, r, rx, ry))
        x += rng.uniform(-0.8, 0.8)
        r += d * 0.95
        z -= drop
    return steam, pools


def chorten(k, cx, cr, s=1.0, z0=0.0, flags=True):
    """A white stupa: a stepped base, the dome, a square harmika with painted eyes, a spire of gilt rings, a parasol;
    snow on its steps."""
    W_ = '#f0ece2'
    for i in range(3):
        a = (0.7 - i * 0.14) * s
        qb(k, cx - a, cr - a * 0.8, z0 + i * 0.16 * s, cx + a, cr + a * 0.8, z0 + (i + 1) * 0.16 * s, (shade(W_, 1 - i * 0.03), 0.06), 'chorten')
        qb(k, cx - a + 0.02, cr + a * 0.8 - 0.04, z0 + (i + 1) * 0.16 * s, cx + a - 0.02, cr + a * 0.8, z0 + (i + 1) * 0.16 * s + 0.03,
           (SNOW, 0.03), 'ledge_snow')
    zb = z0 + 0.48 * s
    k.sphere(cx, cr, zb + 0.32 * s, 0.4 * s, 0.38 * s, (W_, 0.06), 'chorten', segs=16)
    qb(k, cx - 0.16 * s, cr - 0.14 * s, zb + 0.62 * s, cx + 0.16 * s, cr + 0.14 * s, zb + 0.82 * s, ('#e8e0cc', 0.05), 'chorten')
    for dx in (-0.06, 0.06):                                        # the eyes, painted on the harmika's face
        qb(k, cx + dx * s - 0.03 * s, cr + 0.14 * s, zb + 0.7 * s, cx + dx * s + 0.03 * s, cr + 0.15 * s, zb + 0.73 * s, '#1a2a6a', 'chorten_eye')
    for i in range(7):
        rad = (0.13 - i * 0.012) * s
        k.cyl(cx, cr, zb + (0.84 + i * 0.07) * s, zb + (0.89 + i * 0.07) * s, rad, (GILT, 0.05), 'spire', verts=12)
    k.cone(cx, cr, zb + 1.36 * s, zb + 1.48 * s, 0.16 * s, 0.02, (GILT, 0.05), 'spire', verts=12)
    k.sphere(cx, cr, zb + 1.54 * s, 0.05 * s, 0.05 * s, (GILT, 0.05), 'spire', segs=8)
    k.solid(cx - 0.7 * s, cr - 0.56 * s, cx + 0.7 * s, cr + 0.56 * s)
    return (cx, cr, zb + 1.5 * s)


def prayer_wheels(k, x0, x1, r_face, n=None):
    """A row of prayer wheels under a little roof: red drums with gilt bands on spindles, a timber frame, a snowy
    shingle roof."""
    n = n or max(2, int((x1 - x0) / 0.4))
    qb(k, x0 - 0.1, r_face - 0.5, 0.0, x1 + 0.1, r_face + 0.1, 0.2, ('#8a8478', 0.1), 'plinth')
    for i in range(n):
        x = x0 + (i + 0.5) * (x1 - x0) / n
        k.cyl(x, r_face - 0.2, 0.25, 0.85, 0.15, ('#a8222a', 0.08), 'prayer_wheel', verts=12)
        for z in (0.32, 0.55, 0.78):
            k.cyl(x, r_face - 0.2, z, z + 0.03, 0.155, GILT, 'prayer_wheel_band', verts=12)
        k.cyl(x, r_face - 0.2, 0.2, 1.0, 0.015, ('#3a2a1a', 0.06), 'spindle', verts=5)
    for x in (x0 - 0.05, x1 + 0.05):
        qb(k, x - 0.05, r_face - 0.25, 0.2, x + 0.05, r_face - 0.15, 1.15, ('#6a2a1a', 0.08), 'post')
    qb(k, x0 - 0.2, r_face - 0.6, 1.1, x1 + 0.2, r_face + 0.15, 1.2, ('#6a2a1a', 0.08), 'beam')
    k.quads([((x0 - 0.3, r_face + 0.25, 1.15), (x1 + 0.3, r_face + 0.25, 1.15), (x1 + 0.3, r_face - 0.4, 1.45), (x0 - 0.3, r_face - 0.4, 1.45))],
            (SNOW, 0.03), 'roof_snow')
    k.solid(x0 - 0.1, r_face - 0.5, x1 + 0.1, r_face + 0.1)


def mani_flags(k, a, b, sag=0.35, n=None):
    """A line of prayer flags in the five colours."""
    W.bunting(k, a, b, sag=sag, cols=('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030'), n=n)


WHITE = '#efeae0'
MAROON = '#6a2420'


def gompa(k, x0, x1, r_back, r_front, h=2.2, z0=0.0, windows=3, door=None, roof='flat', gold=True, floors=None):
    """A monastery building: whitewashed walls leaning in a little as they rise, a deep band of maroon under the roof
    (the penbey frieze, with gilt roundels), small windows in black trapezoid frames with a striped awning, a flat roof
    with snow and gilt finials at the corners — or a gilt pagoda roof over the main hall. Returns the roof z."""
    rng = _r(k)
    zt = z0 + h
    lean = 0.12
    k.loft([[(x0, r_back, z0), (x1, r_back, z0), (x1, r_front, z0), (x0, r_front, z0)],
            [(x0 + lean, r_back + lean, zt - 0.4), (x1 - lean, r_back + lean, zt - 0.4), (x1 - lean, r_front - lean, zt - 0.4), (x0 + lean, r_front - lean, zt - 0.4)]],
           (WHITE, 0.08), 'gompa_wall', closed=True, smooth=False)
    qb(k, x0 + lean - 0.04, r_back + lean - 0.04, zt - 0.4, x1 - lean + 0.04, r_front - lean + 0.04, zt - 0.05, (MAROON, 0.12), 'penbey')
    qb(k, x0 + lean - 0.06, r_back + lean - 0.06, zt - 0.05, x1 - lean + 0.06, r_front - lean + 0.06, zt, ('#2a1a14', 0.08), 'parapet')
    x = x0 + 0.4
    while x < x1 - 0.3:
        k.cyl_y(x, r_front - lean + 0.04, r_front - lean + 0.07, zt - 0.22, 0.07, 0.07, GILT, 'roundel', verts=10)
        x += 0.7
    nf = floors or max(1, int((h - 0.6) / 0.85))
    for f in range(nf):
        zf = z0 + 0.35 + f * 0.85
        nw = windows
        for i in range(nw):
            wx = x0 + (x1 - x0) * (i + 0.5) / nw
            if door is not None and f == 0 and abs(wx - door) < 0.5:
                continue
            rf = r_front - lean * (zf - z0) / max(0.1, h - 0.4) + 0.02
            k.quads([((wx - 0.26, rf, zf), (wx + 0.26, rf, zf), (wx + 0.18, rf, zf + 0.46), (wx - 0.18, rf, zf + 0.46))], ('#14100e', 0.06), 'window_frame')
            qb(k, wx - 0.11, rf + 0.005, zf + 0.08, wx + 0.11, rf + 0.02, zf + 0.4, '#2a1a10', 'window_glass', emit=('#ffb060', 0.6) if rng.random() < 0.5 else None)
            for j, c in enumerate(('#c83a2e', '#2a6ac0', '#e0b030', '#3aa060')):   # the striped awning over it
                qb(k, wx - 0.24 + j * 0.12, rf, zf + 0.5, wx - 0.12 + j * 0.12, rf + 0.12, zf + 0.56, (c, 0.06), 'awning')
    if door is not None:
        qb(k, door - 0.32, r_front - 0.02, z0, door + 0.32, r_front + 0.04, z0 + 0.95, ('#6a1a14', 0.08), 'door')
        qb(k, door - 0.4, r_front - 0.02, z0 + 0.95, door + 0.4, r_front + 0.08, z0 + 1.05, (MAROON, 0.08), 'lintel')
        for s_ in (-1, 1):
            k.sphere(door + s_ * 0.12, r_front + 0.05, z0 + 0.5, 0.03, 0.03, GILT, 'door_ring', segs=6)
    if roof == 'gold':
        ri = r_back + lean
        rf2 = r_front - lean
        hr = 0.6
        k.quads([((x0 - 0.1, rf2 + 0.25, zt), (x1 + 0.1, rf2 + 0.25, zt), (x1 - 0.4, (ri + rf2) / 2, zt + hr), (x0 + 0.4, (ri + rf2) / 2, zt + hr))],
                (GILT, 0.06), 'roof_gold')
        k.quads([((x1 + 0.1, ri - 0.25, zt), (x0 - 0.1, ri - 0.25, zt), (x0 + 0.4, (ri + rf2) / 2, zt + hr), (x1 - 0.4, (ri + rf2) / 2, zt + hr))],
                (shade(GILT, 0.85), 0.06), 'roof_gold')
        for (xa, xb) in ((x0 - 0.1, x0 + 0.4), (x1 + 0.1, x1 - 0.4)):
            k.poly([(xa, ri - 0.25, zt), (xa, rf2 + 0.25, zt), (xb, (ri + rf2) / 2, zt + hr)], (shade(GILT, 0.9), 0.06), 'roof_gold')
        k.cone((x0 + x1) / 2, (ri + rf2) / 2, zt + hr, zt + hr + 0.5, 0.12, 0.02, GILT, 'finial', verts=8)
        for xe in (x0 - 0.1, x1 + 0.1):                              # the upturned eaves
            k.cone(xe, rf2 + 0.25, zt - 0.05, zt + 0.15, 0.05, 0.005, GILT, 'finial', verts=6)
    else:
        qb(k, x0 + lean + 0.04, r_back + lean + 0.04, zt, x1 - lean - 0.04, r_front - lean - 0.04, zt + 0.05, (SNOW, 0.03), 'roof_snow')
        if gold:
            for (xe, re_) in ((x0 + lean, r_front - lean), (x1 - lean, r_front - lean)):     # victory banners at the corners
                k.cyl(xe, re_, zt, zt + 0.42, 0.06, (GILT, 0.05), 'finial', verts=8)
                k.sphere(xe, re_, zt + 0.46, 0.05, 0.05, GILT, 'finial', segs=6)
    k.solid(x0, r_back, x1, r_front)
    return zt
