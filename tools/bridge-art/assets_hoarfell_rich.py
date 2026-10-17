"""Hoarfell, richer (the Look Book 2 house style, Oct 2026) — builders for Fellhaven and the mountain's surroundings.

  import assets_hoarfell_rich as HR
  height = HR.crag(k, x0, x1, tiers, recess=(xa, xb))      a rock face in tiers of blocks, snow on every ledge
  HR.icefall(k, xa, xb, r_top, z_top)                      a frozen waterfall hung in the crag's recess
  HR.chalet(k, x0, x1, r_back, r_front, gable='front'|'side', ...)   a log chalet with a deep snow roof
  HR.fir(k, x, r, h)  HR.sapling(k, x, r)  HR.shrub(k, x, r)  HR.birch(k, x, r)    vegetation in layers
  HR.rock(k, x, r, s)  HR.fence(k, pts)  HR.prints(k, pts, height)  HR.skis(k, x, r)  ...   small life

Builds on assets_snow (the colours, the old chalet's pieces), assets_town and assets_house. The crag and the gable
chalet grew out of the Look Book's tarn (dioramas/hoarfell_tarn.py): blocks of rock in beds stepping back up the slope,
each with a dark face, a jagged top, cracks and a snow ledge with a rounded lip; chalets in log courses with notched
corner ends, a timber gable, a balcony, a thick blanket of snow on the roof with a cornice rolling over the eaves.
Tile units: x = column, r = row (toward the camera), z = height.
"""
import math
import random

from scenekit import shade
import assets_house as HK
import assets_snow as N
import assets_town as W

SNOW, SNOW_SH, PACKED, ICE, ROOF_SNOW = N.SNOW, N.SNOW_SH, N.PACKED, N.ICE, N.ROOF_SNOW
LOG, LOG_D, LOG_L = N.LOG, N.LOG_D, N.LOG_L
FACE = ('#5c6276', '#666c80', '#545a6c', '#70768a')
ICES = ('#d8eef8', '#b4dcee', '#8cc4e2', '#6aa4cc')
C45 = math.cos(math.radians(45))


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- the crag ------------------------------------------------------------------------------------------------------
def _block(k, x0, x1, rf, rback, z_top, lean, col, rr, icicles=0.5, z_base=0.0):
    """One block of the face: a jagged top, the face leaning back, the sides, snow on its top with a rounded lip."""
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
    outline = [(x0, rf, z_base)] + [(x, rf - lean, z) for (x, z) in tops] + [(x1, rf, z_base)]
    k.poly([(xm, rf, z_base)] + outline, (col, 0.07), 'crag_face')
    # a bedding line across the face, a shade darker
    zb = z_base + (z_top - z_base) * rr.uniform(0.35, 0.6)
    if x1 - x0 > 0.5:
        k.tube((x0 + 0.03, rf - lean * (zb - z_base) / (z_top - z_base) + 0.006, zb), (x1 - 0.03, rf - lean * (zb - z_base) / (z_top - z_base) + 0.006,
               zb + rr.uniform(-0.06, 0.06)), 0.022, (shade(col, 0.7), 0.06), 'crag_seam', verts=4)
    for (x, z) in (tops[0], tops[-1]):
        k.loft([[(x, rf, z_base), (x, rf - lean, z)], [(x, rback, z_base), (x, rback, z)]], (shade(col, 0.8), 0.07), 'crag_side', smooth=False)
    k.loft([[(x, rf - lean, z + 0.01) for (x, z) in tops], [(x, rback, z + 0.01) for (x, z) in tops]], (ROOF_SNOW, 0.03), 'ledge_snow', smooth=True)
    for (xa, za), (xb, zb_) in zip(tops, tops[1:]):
        k.tube((xa, rf - lean + 0.02, za + 0.03), (xb, rf - lean + 0.02, zb_ + 0.03), 0.065, (ROOF_SNOW, 0.03), 'ledge_snow', verts=8)
    for _ in range(rr.randint(0, 2)):
        cx = rr.uniform(x0 + 0.15, x1 - 0.15)
        zc = z_base + rr.uniform(0.3, 0.8) * (z_top - z_base)
        k.tube((cx, rf + 0.004, z_base + 0.02), (cx + rr.uniform(-0.08, 0.08), rf - lean * (zc - z_base) / (z_top - z_base) + 0.004, zc),
               0.018, (shade(col, 0.55), 0.05), 'crack', verts=4)
    if rr.random() < icicles:
        ix = rr.uniform(x0 + 0.15, max(x0 + 0.16, x1 - 0.3))
        for j in range(rr.randint(2, 5)):
            L = rr.uniform(0.12, 0.34)
            k.cone(ix + j * 0.09, rf - lean + 0.03, z_top - L, z_top - 0.02, 0.028, 0.005, (ICE, 0.05), 'icicle', verts=5)
    return tops


def crag(k, x0, x1, tiers, seed=7, recess=(), shelf_firs=0.08, firs=True, rr=None, wave=0.45):
    """A rock face in tiers: tiers = [(z_top, front_row)] front to back. Blocks of rock along each tier (a dark face,
    a bedding seam, cracks, icicles off the lip, snow lying on top), a solid core behind so nothing shows through
    the cracks, boulders and drifts along the foot, the odd small fir on a wide ledge. recess: (xa, xb) spans where
    the lower three tiers are cut back (a waterfall hangs there). Returns height(x, r): the snow's height on the crag
    at (x, r) (0 in front of it)."""
    rr = rr or random.Random(seed)
    fronts = []                                          # (tier, x0, x1, front, top) of every block, for height()
    for ti, (zt, rf) in enumerate(tiers):
        rf_next = tiers[ti + 1][1] if ti + 1 < len(tiers) else rf - 0.9
        x = x0 - rr.uniform(0.0, 0.5)
        while x < x1:
            w = rr.uniform(0.5, 1.7) if ti < 3 else rr.uniform(1.0, 2.6) if ti < 5 else rr.uniform(1.6, 3.4)
            xb = min(x1, x + w)
            cut = any(a < (x + xb) / 2 < b for (a, b) in recess) and ti < 3
            if cut:
                x = xb
                continue
            gap = rr.uniform(0.03, 0.08)
            xm_ = (x + xb) / 2                       # the beds rise and fall along the face, not ruled straight
            wv = wave * (math.sin(xm_ * 0.23 + ti * 1.7 + seed) * 0.6 + math.sin(xm_ * 0.61 + ti * 0.9) * 0.4) * min(1.0, ti / 2 + 0.3)
            front = rf + rr.uniform(-0.12, 0.1) - wv * 0.35
            top = zt + rr.uniform(-0.18, 0.12) + wv
            _block(k, x + gap / 2, xb - gap / 2, front, rf_next - 0.05, top, rr.uniform(0.06, 0.2), FACE[rr.randrange(len(FACE))], rr)
            k.box(x, rf_next - 0.3, 0.0, xb, front - 0.25, top - 0.15, ('#3c4252', 0.05), 'crag_core')
            fronts.append((ti, x, xb, front, top))
            # a small fir clinging to a wide ledge
            if firs and ti >= 1 and rr.random() < shelf_firs and xb - x > 1.0:
                fx = rr.uniform(x + 0.3, xb - 0.3)
                fr = (front + rf_next) / 2
                _ledge_fir(k, fx, fr, top, rr)
            x = xb
    for (a, b) in recess:                                # the recess: a darker wall standing back, its top snowy
        zr = tiers[min(2, len(tiers) - 1)][0] - 0.05
        rb = tiers[min(3, len(tiers) - 1)][1] - 0.1
        k.box(a, rb - 1.0, 0.0, b, rb + 0.35, zr, ('#4a5062', 0.08), 'crag_face', bevel=0.04)
        k.loft([[(a, rb + 0.35, zr + 0.01), (b, rb + 0.35, zr + 0.01)], [(a, rb - 1.0, zr + 0.01), (b, rb - 1.0, zr + 0.01)]],
               (ROOF_SNOW, 0.03), 'ledge_snow', smooth=False)
    # snow banked along the foot of the face, boulders fallen to it
    zt0, rf0 = tiers[0]
    x = x0
    while x < x1:
        if not any(a - 0.3 < x < b + 0.3 for (a, b) in recess):
            k.blob(x, rf0 + 0.14, 0.02, rr.uniform(0.4, 0.75), 0.24, rr.uniform(0.12, 0.22), (SNOW, 0.04), 'foot_drift', segs=10)
        x += rr.uniform(0.45, 0.7)

    def height(x, r):
        best = 0.0
        for (ti, a, b, front, top) in fronts:
            if a <= x <= b and r <= front - 0.15:
                best = max(best, top)
        return best
    return height


def _ledge_fir(k, x, r, z, rr):
    h = rr.uniform(0.7, 1.15)
    k.cyl(x, r, z, z + h * 0.25, 0.04, (LOG_D, 0.12), 'trunk', verts=5)
    with k.foliage('needle'):
        for i in range(3):
            t = i / 2
            zb = z + h * (0.18 + t * 0.55)
            R = 0.32 * (1 - t * 0.6)
            k.cone(x, r, zb, zb + h * 0.32, R, 0.02, (shade(N.PINE, 0.9 + 0.2 * t), 0.18), 'pine', verts=9)
            k.cone(x, r, zb + h * 0.12, zb + h * 0.3, R * 0.75, 0.04, (ROOF_SNOW, 0.2), 'pine_snow', verts=8)


def icefall(k, xa, xb, r_top, z_top, r_bot=None, rr=None):
    """A frozen waterfall: a curtain of ice columns hanging from the lip at (r_top, z_top), bulging where it froze in
    layers, a pool of ice at its foot, icicles off the lip."""
    rr = rr or random.Random(int(xa * 100))
    r_bot = r_top + z_top * 0.32 if r_bot is None else r_bot
    i, x = 0, xa
    while x < xb:
        mid = 1 - abs((x - (xa + xb) / 2) / ((xb - xa) / 2))
        top = z_top + 0.08 * math.sin(x * 7.1)
        bot = 0.05 + (1 - mid) * rr.uniform(0.2, 0.9) * z_top / 2.6
        rad = 0.08 + 0.1 * mid * rr.uniform(0.6, 1.2)
        col = ICES[(i * 3 + int(x * 13)) % 4 if mid > 0.3 else 3 - (i % 2)]
        rb_ = r_top + (r_bot - r_top) * (1 - bot / top)
        k.tube((x, r_top, top), (x + rr.uniform(-0.04, 0.04), rb_, bot), rad, (col, 0.05), 'icefall', rb=rad * 0.55, verts=6)
        zz = 0.5
        while zz < top - 0.2:
            if rr.random() < 0.5 * mid + 0.2:
                t = (zz - bot) / max(0.1, top - bot)
                if 0 < t < 1:
                    k.blob(x, rb_ - t * (rb_ - r_top), zz, rad * 1.6, rad * 1.2, rad * 1.9, (ICES[rr.randrange(3)], 0.05), 'icefall', segs=8)
            zz += rr.uniform(0.45, 0.7)
        x += rr.uniform(0.09, 0.16)
        i += 1
    k.blob((xa + xb) / 2, r_bot + 0.2, 0.02, (xb - xa) / 2 + 0.25, 0.45, 0.16, (ICES[1], 0.05), 'ice_pool', segs=14)
    k.tube((xa - 0.2, r_top - 0.02, z_top + 0.06), (xb + 0.2, r_top - 0.02, z_top + 0.06), 0.1, (ROOF_SNOW, 0.04), 'ledge_snow', verts=10)
    for j in range(int((xb - xa) / 0.3) + 2):
        x = xa - 0.2 + j * 0.3
        L = 0.25 + 0.35 * abs(math.sin(j * 2.3))
        k.cone(x, r_top, z_top - L, z_top, 0.05, 0.008, (ICES[0], 0.05), 'icicle', verts=6)


def fixed_line(k, pts, col, bolts=True):
    """A route's fixed rope up the face: a coloured line through `pts` (x, r, z) with a bolt at every other point."""
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.02, (col, 0.1), 'fixed_line', verts=4)
    if bolts:
        for p in pts[1::2]:
            k.sphere(p[0], p[1] + 0.03, p[2], 0.045, 0.045, ('#c0c4cc', 0.1), 'bolt', segs=5)


def route_foot(k, cx, cr, col):
    """Where a route leaves the ground: a cairn and a plaque on a post in the route's colour."""
    for (dx, dr, s, z) in ((-0.5, 0.3, 0.2, 0.1), (-0.45, 0.28, 0.15, 0.27), (-0.48, 0.3, 0.1, 0.4)):
        k.rock(cx + dx, cr + dr, z, s, s, s * 0.8, ('#5a5e6a', 0.2), part='cairn', segs=6)
    k.blob(cx - 0.47, cr + 0.3, 0.48, 0.09, 0.09, 0.05, (ROOF_SNOW, 0.1), 'cairn_snow', segs=6)
    k.box(cx + 0.45, cr + 0.25, 0, cx + 0.51, cr + 0.31, 0.95, (LOG_D, 0.1), 'plaque_post')
    k.box(cx + 0.28, cr + 0.31, 0.6, cx + 0.68, cr + 0.34, 0.88, (col, 0.1), 'plaque')
    k.box(cx + 0.33, cr + 0.34, 0.66, cx + 0.63, cr + 0.345, 0.69, ('#f2ead6', 0.1), 'plaque_paint')
    k.box(cx + 0.33, cr + 0.34, 0.75, cx + 0.55, cr + 0.345, 0.78, ('#f2ead6', 0.1), 'plaque_paint')
    k.blob(cx + 0.48, cr + 0.32, 0.92, 0.22, 0.06, 0.04, (ROOF_SNOW, 0.1), 'plaque_snow', segs=6)


# ---- the chalet ------------------------------------------------------------------------------------------------------
def _logs(k, x0, x1, r, z0, z1, wall):
    """Log courses across a face, each a round log, a little proud and alternating in tone; notched ends standing out
    past the corners."""
    z, j = z0 + 0.06, 0
    while z < z1 - 0.04:
        k.cyl_x(x0 - 0.1, x1 + 0.1, r - 0.02, z, 0.075, 0.075, (shade(wall, 0.9 if j % 2 else 1.06), 0.1), 'log', verts=8)
        for xe in (x0 - 0.1, x1 + 0.1):                                         # the end grain at each corner
            k.cyl_y(xe, r - 0.1, r + 0.06, z, 0.076, 0.076, (shade(LOG_L, 1.1 if j % 2 else 1.0), 0.1), 'log_end', verts=8)
        z += 0.15
        j += 1


def winter_window(k, cx, r_face, z0, w=0.56, h=0.66, shutters='#7a2a22', box=True, rr=None):
    """A chalet window: HK's framed window with louvred shutters, a heart cut in each shutter, a box of evergreen
    sprigs and red berries under it, snow on the sill and the box."""
    rr = rr or k.rng
    HK.rich_window(k, cx, r_face, z0, w=w, h=h, shutters=shutters, box=False, stone=LOG_L)
    if shutters:
        for s in (-1, 1):
            hx = cx + s * (w / 2 + 0.19)
            k.sphere(hx - 0.025, r_face + 0.065, z0 + h * 0.62, 0.028, 0.026, '#2a1808', 'shutter_heart', segs=6)
            k.sphere(hx + 0.025, r_face + 0.065, z0 + h * 0.62, 0.028, 0.026, '#2a1808', 'shutter_heart', segs=6)
            k.cone(hx, r_face + 0.065, z0 + h * 0.54, z0 + h * 0.6, 0.004, 0.045, '#2a1808', 'shutter_heart', verts=4)
    k.blob(cx, r_face + 0.17, z0 - 0.05, w / 2 + 0.12, 0.1, 0.045, (ROOF_SNOW, 0.05), 'sill_snow', segs=8)
    if box:
        k.box(cx - w / 2 - 0.06, r_face + 0.12, z0 - 0.38, cx + w / 2 + 0.06, r_face + 0.32, z0 - 0.17, (LOG_D, 0.12), 'flower_box')
        x = cx - w / 2 + 0.02
        with k.foliage('needle'):
            while x < cx + w / 2 + 0.02:
                k.blob(x, r_face + 0.22, z0 - 0.13, 0.08, 0.07, 0.06, (shade('#2a4a32', rr.uniform(0.85, 1.12)), 0.15), 'sprig', segs=7)
                x += 0.12
        for _ in range(5):
            k.sphere(cx + rr.uniform(-w / 2, w / 2), r_face + 0.3, z0 - 0.1, 0.03, 0.03, '#c8202a', 'berry', segs=5)
        k.blob(cx, r_face + 0.22, z0 - 0.07, w / 2 + 0.04, 0.09, 0.03, (ROOF_SNOW, 0.05), 'box_snow', segs=8)


def alpine_door(k, cx, r_face, col=None, wreath=True, lamp=1, canopy=True, rr=None):
    """A plank door in a heavy frame, a wreath on it, a snow-laden canopy on brackets, a stone step swept clear,
    a boot scraper and a mat, a lantern beside it."""
    rr = rr or k.rng
    col = col or rr.choice(('#5a3420', '#3a5a4a', '#6a2a22', '#2e4a6a'))
    W.door(k, cx, r_face, w=0.74, h=1.36, col=col)
    if wreath:
        for i in range(10):
            a = i * math.tau / 10
            k.sphere(cx + math.cos(a) * 0.13, r_face + 0.13, 0.98 + math.sin(a) * 0.13, 0.05, 0.045, ('#2a5a2e', 0.15), 'wreath', segs=6)
        k.sphere(cx, r_face + 0.15, 0.86, 0.04, 0.04, '#c8202a', 'wreath_bow', segs=6)
    k.box(cx - 0.28, r_face + 0.14, 0.06, cx + 0.28, r_face + 0.34, 0.075, ('#8a3a2a', 0.2), 'doormat')
    if canopy:
        z = 1.62
        for s in (-1, 1):
            k.quads([((cx, r_face, z + 0.32), (cx, r_face + 0.6, z + 0.3), (cx + s * 0.62, r_face + 0.6, z - 0.02), (cx + s * 0.62, r_face, z))],
                    (LOG_D, 0.1), 'roof_canopy')
            k.blob(cx + s * 0.3, r_face + 0.3, z + 0.24, 0.36, 0.34, 0.07, (ROOF_SNOW, 0.04), 'canopy_snow', rot=(0, s * 24, 0), segs=10)
            k.tube((cx + s * 0.42, r_face, z - 0.45), (cx + s * 0.42, r_face + 0.45, z - 0.02), 0.04, (LOG_D, 0.1), 'bracket', verts=5)
            for j in range(3):
                L = rr.uniform(0.08, 0.22)
                k.cone(cx + s * (0.2 + j * 0.15), r_face + 0.6, z - L + 0.08 - j * 0.03, z + 0.06 - j * 0.04, 0.022, 0.004, (ICE, 0.06), 'icicle', verts=5)
    if lamp:
        W.wall_lantern(k, cx + lamp * 0.72, r_face + 0.02, z=1.25, energy=9)
    k.box(cx + 0.5 * (-lamp or 1), r_face + 0.42, 0.0, cx + 0.5 * (-lamp or 1) + 0.12, r_face + 0.48, 0.16, ('#2e3038', 0.1), 'boot_scraper')


def snow_sheet(k, a, b, c, d, nu, nv, amp=0.07, seed=0, part='roof_snow'):
    """A blanket of snow over the quad a-b-c-d (corners (x, r, z); a-b along u, a-d along v), gently lumpy, so the
    light finds soft hollows in it instead of one flat slab."""
    def at(u, v):
        p = [a[i] + (b[i] - a[i]) * u + (d[i] - a[i]) * v + (a[i] - b[i] + c[i] - d[i]) * u * v for i in range(3)]
        edge = min(u, 1 - u, v, 1 - v)
        f = min(1.0, edge * 6)
        p[2] += amp * f * (math.sin(u * 7.3 + seed) * math.sin(v * 5.1 + seed * 0.7) * 0.6 + math.sin(u * 17.0 + v * 9.0 + seed) * 0.4)
        return tuple(p)
    q = []
    for i in range(nu):
        for j in range(nv):
            u0, u1, v0, v1 = i / nu, (i + 1) / nu, j / nv, (j + 1) / nv
            q.append((at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)))
    k.quads(q, (ROOF_SNOW, 0.03), part)


def _snow_slope(k, xa, xb, ra, rb, za, zb, s_, rr, n_drift=2):
    """Snow on one slope of a roof between the ridge (x=xa, z=za) and the eave (x=xb, z=zb) from row ra to rb:
    a blanket, long low drifts down it."""
    snow_sheet(k, (xa, ra, za + 0.14), (xb, ra, zb + 0.1), (xb, rb, zb + 0.1), (xa, rb, za + 0.14), max(3, int(abs(xb - xa) / 0.25)),
               max(3, int((rb - ra) / 0.25)), seed=xa + ra)
    ang = math.degrees(math.atan2(za - zb, abs(xb - xa)))
    for j in range(n_drift):
        r = ra + (0.25 + 0.5 * j / max(1, n_drift - 1)) * (rb - ra) + rr.uniform(-0.15, 0.15)
        k.blob(xa + (xb - xa) * 0.45, r, za + (zb - za) * 0.45 + 0.12, abs(xb - xa) * 0.42, min(0.6, (rb - ra) * 0.25), 0.03,
               (ROOF_SNOW, 0.03), 'roof_drift', rot=(0, -s_ * ang, 0), segs=12)


def _shakes(k, x_lo, x_hi, ra, rb, z_lo, z_hi, rr):
    """One course of wooden shakes along an eave, under the cornice."""
    rects = {0: [], 1: [], 2: []}
    r = ra
    while r < rb - 0.05:
        L = rr.uniform(0.16, 0.26)
        rects[rr.randrange(3)].append((x_lo, r, z_lo, x_hi, min(rb - 0.02, r + L - 0.03), z_hi))
        r += L
    for j, tone in enumerate(('#5a3420', '#4a2a18', '#6a4026')):
        if rects[j]:
            k.boxes(rects[j], (tone, 0.08), 'roof_shakes')


def _shakes_x(k, xa, xb, r_lo, r_hi, z_lo, z_hi, rr):
    """Shakes along a front eave (the course runs along x)."""
    rects = {0: [], 1: [], 2: []}
    x = xa
    while x < xb - 0.05:
        L = rr.uniform(0.16, 0.26)
        rects[rr.randrange(3)].append((x, r_lo, z_lo, min(xb, x + L - 0.03), r_hi, z_hi))
        x += L
    for j, tone in enumerate(('#5a3420', '#4a2a18', '#6a4026')):
        if rects[j]:
            k.boxes(rects[j], (tone, 0.08), 'roof_shakes')


def dormer(k, dx, rm, rs, zt, zs, rr, w=0.9):
    """A dormer in a front slope (ridge at row rm, height zt; the slope's foot at row rs, height zs): log cheeks, a lit
    window, its own little gable under snow."""
    t = 0.62
    rd = rm + (rs - rm) * t                       # its face
    zb = zt + (zs - zt) * t                       # the slope's height there
    h = 0.62
    slope = (zt - zs) / max(0.1, rs - rm)
    D = min(rs - rm - 0.1, 1.15 / max(0.2, slope))   # deep enough that its back runs in under the main roof
    k.box(dx - w / 2, rd - D, zb - 0.25, dx + w / 2, rd, zb + h, (LOG, 0.1), 'dormer_wall')
    k.box(dx - w / 2 - 0.05, rd - 0.02, zb - 0.05, dx + w / 2 + 0.05, rd + 0.06, zb + 0.06, (LOG_D, 0.1), 'dormer_sill')
    k.box(dx - 0.2, rd, zb + 0.1, dx + 0.2, rd + 0.05, zb + 0.5, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9))
    k.box(dx - 0.26, rd + 0.01, zb + 0.06, dx + 0.26, rd + 0.06, zb + 0.54, W.WOOD_DD, 'window_frame')
    k.box(dx - 0.2, rd + 0.01, zb + 0.1, dx + 0.2, rd + 0.065, zb + 0.5, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9))
    k.box(dx - 0.015, rd + 0.06, zb + 0.1, dx + 0.015, rd + 0.075, zb + 0.5, W.WOOD_DD, 'window_frame')
    k.point_light(dx, rd + 0.5, zb + 0.3, '#ffc070', 4, radius=0.12, group='flicker')
    rf_ = rd + 0.18
    zr = zb + h + 0.38
    for s_ in (-1, 1):
        xe = dx + s_ * (w / 2 + 0.14)
        k.poly([(dx, rd - D, zr), (dx, rf_, zr), (xe, rf_, zb + h - 0.06), (xe, rd - D, zb + h - 0.06)], (LOG_D, 0.08), 'roof_deck')
        k.poly([(dx, rd - D, zr + 0.1), (dx, rf_ - 0.03, zr + 0.1), (xe - s_ * 0.04, rf_ - 0.03, zb + h + 0.02), (xe - s_ * 0.04, rd - D, zb + h + 0.02)],
               (ROOF_SNOW, 0.03), 'roof_snow')
        for j in range(3):
            L = rr.uniform(0.06, 0.18)
            k.cone(xe, rd - 0.6 + j * 0.3, zb + h - 0.06 - L, zb + h - 0.06, 0.02, 0.004, (ICE, 0.06), 'icicle', verts=5)
    k.tube((dx - w / 2 - 0.14, rf_ + 0.01, zb + h - 0.08), (dx, rf_ + 0.01, zr), 0.04, (LOG_D, 0.08), 'bargeboard', verts=6)
    k.tube((dx + w / 2 + 0.14, rf_ + 0.01, zb + h - 0.08), (dx, rf_ + 0.01, zr), 0.04, (LOG_D, 0.08), 'bargeboard', verts=6)
    k.poly([(dx - w / 2, rd + 0.0, zb + h), (dx + w / 2, rd + 0.0, zb + h), (dx, rd + 0.0, zr - 0.04)], (LOG_L, 0.08), 'gable')


def front_gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, over=0.42, front_over=0.65, rr=None):
    """The roof of a front-gabled chalet: two slopes to the sides, a deep overhang over the gable, a blanket of snow,
    a cornice rolling over each side eave, rolls along the verges, shakes showing at the eave, bargeboards, icicles.
    Returns (ridge row, ridge z)."""
    rr = rr or k.rng
    xc, zt = (x0 + x1) / 2, wall_h + rise
    rb, rf = r_back - 0.3, r_front + front_over
    half = (x1 - x0) / 2
    for s_ in (-1, 1):
        xe = xc + s_ * (half + over)
        ze = wall_h - over * rise / half
        k.poly([(xc, rb, zt), (xc, rf, zt), (xe, rf, ze), (xe, rb, ze)], (LOG_D, 0.08), 'roof_deck')
        SN = 0.9
        xs_, zs_ = xc + (xe - xc) * SN, zt + (ze - zt) * SN
        _snow_slope(k, xc, xs_, rb + 0.05, rf - 0.08, zt, zs_, s_, rr)
        n = max(5, int((rf - rb) / 0.5))
        for j in range(n):
            ra_ = rb + 0.02 + j / n * (rf - rb - 0.08)
            rb2 = rb + 0.02 + (j + 1) / n * (rf - rb - 0.08)
            sag = 0.03 * math.sin(j * 1.7)
            k.tube((xs_ + s_ * 0.04, ra_, zs_ + 0.06 - sag), (xs_ + s_ * 0.04, rb2, zs_ + 0.06 + sag), 0.15, (ROOF_SNOW, 0.03), 'cornice', verts=12)
        xa, xb_ = xc + (xe - xc) * (SN + 0.02), xe
        za, zb_ = zt + (ze - zt) * (SN + 0.02), ze
        lo, hi = (xa, xb_) if xa < xb_ else (xb_, xa)
        _shakes(k, lo, hi, rb, rf, min(za, zb_) + 0.01, max(za, zb_) + 0.06, rr)
        for rv in (rf - 0.06, rb + 0.04):
            k.tube((xc, rv, zt + 0.14), (xs_ + s_ * 0.04, rv, zs_ + 0.08), 0.12, (ROOF_SNOW, 0.03), 'verge_snow', verts=10)
        k.bar(xc, rf + 0.02, xe, rf + 0.02, ze - 0.02, ze + 0.02, 0.06, (LOG_D, 0.08), 'bargeboard')
        k.tube((xc, rf + 0.04, zt - 0.02), (xe, rf + 0.04, ze - 0.06), 0.045, (LOG_D, 0.08), 'bargeboard', verts=6)
        # carved ends under the bargeboard: little teeth
        t = 0.08
        while t < 0.95:
            xx, zz = xc + (xe - xc) * t, zt + (ze - zt) * t
            k.cone(xx, rf + 0.03, zz - 0.14, zz - 0.04, 0.025, 0.0, (LOG_L, 0.08), 'barge_tooth', verts=4)
            t += 0.09
        r = rb + 0.15
        while r < rf - 0.1:
            L = rr.uniform(0.08, 0.3)
            k.cone(xe - s_ * 0.08, r, ze - L, ze, 0.025, 0.004, (ICE, 0.06), 'icicle', verts=5)
            r += rr.uniform(0.14, 0.26)
    k.tube((xc, rb + 0.04, zt + 0.17), (xc, rf - 0.06, zt + 0.17), 0.13, (ROOF_SNOW, 0.03), 'ridge_snow', verts=12)
    for j in range(9):
        t = (j + 0.5) / 9
        xx = x0 - over + t * (x1 - x0 + 2 * over)
        zz = zt - abs(xx - xc) * rise / half - 0.1
        if zz > wall_h - 0.3:
            k.cone(xx, rf - 0.02, zz - rr.uniform(0.1, 0.32), zz, 0.03, 0.005, (ICE, 0.06), 'icicle', verts=5)
    return (rb + rf) / 2, zt


def side_gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, over=0.4, side_over=0.4, rr=None, pillows=3, dormers=()):
    """A side-gabled roof: the front slope faces the camera as a broad blanket of snow with pillows on it, a fat
    cornice along the front eave over a course of shakes and a fringe of icicles, rolls along the verges. Returns
    (ridge row, ridge z)."""
    rr = rr or k.rng
    rm = (r_back + r_front) / 2
    zt = wall_h + rise
    depth = (r_front - r_back) / 2
    rfe, rbe = r_front + over, r_back - over
    ze = wall_h - over * rise / depth
    xa, xb = x0 - side_over, x1 + side_over
    for (re_, s_) in ((rfe, 1), (rbe, -1)):
        k.poly([(xa, rm, zt), (xb, rm, zt), (xb, re_, ze), (xa, re_, ze)], (LOG_D, 0.08), 'roof_deck')
    SN = 0.9
    rs, zs = rm + (rfe - rm) * SN, zt + (ze - zt) * SN
    snow_sheet(k, (xa + 0.05, rm, zt + 0.14), (xb - 0.05, rm, zt + 0.14), (xb - 0.05, rs, zs + 0.1), (xa + 0.05, rs, zs + 0.1),
               max(4, int((xb - xa) / 0.25)), max(3, int((rs - rm) / 0.25)), seed=xa + rm)
    k.poly([(xa + 0.05, rm, zt + 0.14), (xb - 0.05, rm, zt + 0.14), (xb - 0.05, rbe + 0.1, ze + 0.1), (xa + 0.05, rbe + 0.1, ze + 0.1)],
           (ROOF_SNOW, 0.03), 'roof_snow')
    ang = math.degrees(math.atan2(rise, depth))
    for j in range(pillows):                                                      # long, low wind ripples across the slope
        t = rr.uniform(0.25, 0.75)
        px = xa + (j + 0.5) / pillows * (xb - xa) + rr.uniform(-0.3, 0.3)
        k.blob(px, rm + (rs - rm) * t, zt + (zs - zt) * t + 0.135, min(1.6, (xb - xa) / pillows * 0.55), (rs - rm) * 0.12, 0.022,
               (ROOF_SNOW, 0.03), 'roof_snow', rot=(ang, 0, rr.uniform(-6, 6)), segs=12)
    for dx in dormers:                                                            # dormers in the front slope
        dormer(k, dx, rm, rs, zt, zs, rr)
    x = xa
    while x < xb - 0.05:                                                           # the cornice along the front eave
        x2 = min(xb, x + 0.5)
        sag = 0.03 * math.sin(x * 2.3)
        k.tube((x, rs + 0.04, zs + 0.06 - sag), (x2, rs + 0.04, zs + 0.06 + sag), 0.16, (ROOF_SNOW, 0.03), 'cornice', verts=12)
        x = x2
    _shakes_x(k, xa, xb, rs + 0.02, rfe, ze + 0.01, zs + 0.0, rr)
    for xv in (xa + 0.04, xb - 0.04):                                              # verges
        k.tube((xv, rm, zt + 0.14), (xv, rs + 0.04, zs + 0.08), 0.12, (ROOF_SNOW, 0.03), 'verge_snow', verts=10)
        k.tube((xv, rm, zt - 0.02), (xv, rfe + 0.02, ze - 0.06), 0.05, (LOG_D, 0.08), 'bargeboard', verts=6)
        k.tube((xv, rm, zt - 0.02), (xv, rbe - 0.02, ze - 0.06), 0.05, (LOG_D, 0.08), 'bargeboard', verts=6)
    # the gable ends' triangles
    for xg in (x0, x1):
        k.poly([(xg, r_back + 0.02, wall_h), (xg, r_front - 0.02, wall_h), (xg, rm, zt - 0.05)], (LOG_L, 0.08), 'gable')
    k.tube((xa, rm, zt + 0.17), (xb, rm, zt + 0.17), 0.13, (ROOF_SNOW, 0.03), 'ridge_snow', verts=12)
    x = xa + 0.1                                                                    # icicles along the front eave
    while x < xb - 0.1:
        L = rr.uniform(0.08, 0.34)
        k.cone(x, rfe + 0.02, ze - L, ze, 0.026, 0.004, (ICE, 0.06), 'icicle', verts=5)
        x += rr.uniform(0.13, 0.25)
    for x in [xa + 0.3 + i * 0.34 for i in range(int((xb - xa) / 0.34))]:          # rafter ends under the eave
        k.box(x, r_front, wall_h - 0.12, x + 0.09, rfe - 0.04, wall_h - 0.04, (LOG_D, 0.08), 'rafter')
    return rm, zt


def chalet(k, x0, x1, r_back, r_front, wall_h=2.0, rise=1.4, gable='front', door_x=None, windows=(), windows_up=(),
           chimney=None, balcony=False, lanterns=(), shutters=None, wall=LOG, door_col=None, wreath=True, canopy=True,
           blankets=True, gable_window=True, dormers=(), rail_boxes=True, rr=None):
    """A log chalet: a stone footing in rough blocks, log courses with notched ends standing out at the corners,
    framed windows with heart-cut shutters and boxes of evergreens, a plank door with a wreath under a snowy canopy,
    a carved balcony (front gable: across the gable; side gable: across the upper floor), a deep roof under a thick
    blanket of snow with cornices and icicles, a chimney of stone with snow on its cap. Returns the chimney's smoke
    point in screen tiles (or None)."""
    rr = rr or k.rng
    shutters = shutters or rr.choice(('#7a2a22', '#2a4a3a', '#2e4a6a', '#6a4a22'))
    # footing: rough stones
    k.box(x0 - 0.05, r_back - 0.05, 0, x1 + 0.05, r_front + 0.05, 0.34, ('#6a6e78', 0.14), 'footing', bevel=0.02)
    x = x0 - 0.05
    while x < x1:
        sw = rr.uniform(0.26, 0.48)
        xb = min(x + sw, x1 + 0.05)
        k.box(x + 0.02, r_front + 0.05, 0.02, xb - 0.02, r_front + 0.085, rr.uniform(0.28, 0.34), (shade('#7a7e88', rr.uniform(0.85, 1.12)), 0.14),
              'plinth_stone', bevel=0.012)
        x = xb
    k.box(x0 + 0.04, r_back + 0.04, 0.34, x1 - 0.04, r_front - 0.02, wall_h, (wall, 0.1), 'chalet_wall')
    _logs(k, x0, x1, r_front, 0.34, wall_h, wall)
    # roof
    if gable == 'front':
        rm, zr = front_gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, rr=rr)
        xc = (x0 + x1) / 2
        k.poly([(x0, r_front + 0.02, wall_h), (x1, r_front + 0.02, wall_h), (xc, r_front + 0.02, wall_h + rise)], (LOG_L, 0.08), 'gable')
        bx = x0 + 0.12
        while bx < x1 - 0.1:                                                       # vertical boards over the gable
            hgt = (1 - abs(bx - xc) / ((x1 - x0) / 2)) * rise
            if hgt > 0.08:
                k.box(bx - 0.015, r_front + 0.03, wall_h, bx + 0.015, r_front + 0.05, wall_h + hgt - 0.03, (LOG_D, 0.08), 'board_joint')
            bx += 0.2
        if gable_window:
            gz = wall_h + rise * 0.5
            k.cyl_y(xc, r_front + 0.02, r_front + 0.08, gz, 0.2, 0.2, LOG_D, 'gable_window_frame', verts=14)
            k.cyl_y(xc, r_front + 0.04, r_front + 0.1, gz, 0.14, 0.14, '#5a3a18', 'window_glass', emit=('#ffc870', 0.9), verts=14)
            k.point_light(xc, r_front + 0.6, gz, '#ffc070', 4, radius=0.15, group='flicker')
    else:
        rm, zr = side_gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, rr=rr, pillows=max(2, int((x1 - x0) / 2.0)), dormers=dormers)
    if balcony:
        bz = wall_h - 0.12 if gable == 'front' else wall_h * 0.55
        bx0, bx1 = (x0 + 0.05, x1 - 0.05) if balcony is True else balcony
        k.box(bx0, r_front, bz, bx1, r_front + 0.55, bz + 0.09, (LOG_D, 0.08), 'balcony')
        xx = bx0 + 0.07
        j = 0
        while xx < bx1 - 0.1:                                                       # cut-out boards, the classic chalet rail
            k.box(xx, r_front + 0.49, bz + 0.09, xx + 0.13, r_front + 0.55, bz + 0.5, (LOG_L if j % 2 == 0 else shade(LOG_L, 0.9), 0.08), 'baluster')
            k.sphere(xx + 0.065, r_front + 0.555, bz + 0.33, 0.03, 0.03, '#2a1808', 'baluster_cut', segs=5)
            xx += 0.15
            j += 1
        k.box(bx0, r_front + 0.47, bz + 0.5, bx1, r_front + 0.57, bz + 0.57, (LOG_D, 0.08), 'rail')
        k.tube((bx0, r_front + 0.52, bz + 0.62), (bx1, r_front + 0.52, bz + 0.62), 0.06, (ROOF_SNOW, 0.04), 'rail_snow', verts=8)
        for xb_ in (bx0 + 0.1, bx1 - 0.1):
            k.tube((xb_, r_front + 0.02, bz - 0.4), (xb_, r_front + 0.5, bz - 0.02), 0.04, (LOG_D, 0.1), 'bracket', verts=5)
        if blankets:
            for (b2, bc) in ((bx0 + 0.45, rr.choice(('#c83a2e', '#d8a030'))), (bx1 - 0.85, rr.choice(('#3a7ac0', '#2a7a5a')))):
                k.box(b2, r_front + 0.56, bz + 0.2, b2 + 0.4, r_front + 0.6, bz + 0.6, (bc, 0.1), 'blanket')
                k.box(b2 + 0.05, r_front + 0.6, bz + 0.25, b2 + 0.35, r_front + 0.605, bz + 0.29, (shade(bc, 1.3), 0.1), 'blanket_stripe')
        # boxes of evergreens on the rail
        for bxx in ((bx0 + (bx1 - bx0) * 0.33, bx0 + (bx1 - bx0) * 0.66) if rail_boxes else ()):
            k.box(bxx - 0.3, r_front + 0.58, bz + 0.3, bxx + 0.3, r_front + 0.72, bz + 0.48, (LOG_D, 0.1), 'flower_box')
            with k.foliage('needle'):
                for i in range(5):
                    k.blob(bxx - 0.24 + i * 0.12, r_front + 0.65, bz + 0.52, 0.08, 0.07, 0.06, ('#2a4a32', 0.15), 'sprig', segs=6)
    for (wx, wz) in windows:
        winter_window(k, wx, r_front + 0.04, wz, shutters=shutters, rr=rr)
    for (wx, wz) in windows_up:
        winter_window(k, wx, r_front + 0.04, wall_h + wz if gable == 'front' else wz, w=0.46, h=0.52, shutters=shutters,
                      box=not balcony, rr=rr)
    if door_x is not None:
        alpine_door(k, door_x, r_front + 0.04, col=door_col, wreath=wreath, lamp=rr.choice((-1, 1)), canopy=canopy and not (balcony and gable != 'front'), rr=rr)
        k.box(door_x - 0.6, r_front + 0.05, 0, door_x + 0.6, r_front + 0.5, 0.12, ('#8a8e98', 0.15), 'step')
    for lx in lanterns:
        W.wall_lantern(k, lx, r_front + 0.04)
    smoke = None
    if chimney is not None:
        cx = chimney
        if gable == 'front':
            xc = (x0 + x1) / 2
            cz = wall_h + rise * (1 - abs(cx - xc) / ((x1 - x0) / 2))
            cr0, cr1 = r_back + 0.4, r_back + 0.85
        else:
            cz = zr - 0.15
            cr0, cr1 = rm - 0.45, rm + 0.0
        k.box(cx - 0.22, cr0, wall_h, cx + 0.22, cr1, cz + 0.65, ('#6a6870', 0.14), 'chimney', bevel=0.02)
        z = wall_h + 0.1
        while z < cz + 0.6:                                                          # stone courses on its face
            k.box(cx - 0.225, cr1, z, cx + 0.225, cr1 + 0.01, z + 0.025, ('#4e4c54', 0.1), 'chimney_joint')
            z += 0.16
        k.box(cx - 0.27, cr0 - 0.05, cz + 0.65, cx + 0.27, cr1 + 0.05, cz + 0.72, ('#4e4c54', 0.1), 'chimney_cap')
        k.blob(cx, (cr0 + cr1) / 2, cz + 0.76, 0.3, 0.28, 0.08, (ROOF_SNOW, 0.05), 'chimney_snow', segs=10)
        smoke = [round(cx, 3), round((cr0 + cr1) / 2 - (cz + 0.85) * C45, 3)]
    k.solid(x0, r_back, x1, r_front)
    return smoke


# ---- vegetation --------------------------------------------------------------------------------------------------------
def fir(k, x, r, h=2.6, rr=None, tone=N.PINE, solid=True):
    """A snowy fir (assets_snow's) on a little mound of snow round its foot."""
    rr = rr or k.rng
    tone = shade(tone, rr.uniform(0.88, 1.12))
    k.cyl(x, r, 0, h * 0.25, 0.07 * h / 2.6, (LOG_D, 0.12), 'trunk', verts=6)
    W.pine_tiers(k, x, r, h, tone, rad=0.64 * h / 2.6, z0=0.15, tiers=5 if h > 1.8 else 4, snow=ROOF_SNOW)
    k.blob(x, r, 0.0, 0.62 * h / 2.6, 0.5 * h / 2.6, 0.08, (SNOW_SH, 0.1), 'tree_well', segs=10)
    if solid:
        k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)


def sapling(k, x, r, rr=None):
    """A young fir half under the snow."""
    rr = rr or k.rng
    h = rr.uniform(0.55, 1.0)
    with k.foliage('needle'):
        for i in range(3):
            t = i / 2
            zb = h * (0.05 + t * 0.5)
            R = 0.3 * (1 - t * 0.6) * h
            k.cone(x, r, zb, zb + h * 0.36, R + 0.06, 0.02, (shade(N.PINE, 0.9 + 0.2 * t), 0.18), 'pine', verts=9)
            k.cone(x, r, zb + h * 0.15, zb + h * 0.33, (R + 0.06) * 0.72, 0.03, (ROOF_SNOW, 0.2), 'pine_snow', verts=8)
    k.blob(x, r, 0.0, 0.32, 0.26, 0.09, (SNOW, 0.05), 'drift', segs=8)


def shrub(k, x, r, s=1.0, rr=None, berries=False):
    """A snow-covered shrub, dark twigs poking out of it (and red berries, sometimes)."""
    rr = rr or k.rng
    k.blob(x, r, 0.1 * s, 0.32 * s, 0.25 * s, 0.2 * s, (ROOF_SNOW, 0.06), 'shrub_snow', segs=10)
    for j in range(rr.randint(4, 7)):
        a = j * 1.3 + rr.uniform(-0.3, 0.3)
        k.tube((x, r, 0.08 * s), (x + math.cos(a) * 0.38 * s, r + math.sin(a) * 0.16 * s, (0.32 + 0.12 * (j % 2)) * s), 0.012, (LOG_D, 0.1), 'twig', verts=4)
    if berries:
        for _ in range(6):
            k.sphere(x + rr.uniform(-0.25, 0.25) * s, r + 0.2 * s, rr.uniform(0.18, 0.34) * s, 0.03, 0.03, '#c8202a', 'berry', segs=5)


def birch(k, x, r, h=2.4, rr=None):
    """A bare birch in winter: a white trunk banded with black, a fan of thin branches and twigs, snow along them."""
    rr = rr or k.rng
    top = (x + rr.uniform(-0.1, 0.1), r, h * 0.62)
    k.tube((x, r, 0.0), top, 0.07, ('#e8e4dc', 0.08), 'birch_trunk', rb=0.04, verts=7)
    for j in range(5):
        z = 0.3 + j * h * 0.11
        k.tube((x - 0.05, r + 0.05, z), (x + 0.05, r + 0.05, z + 0.03), 0.02, ('#2a2624', 0.1), 'birch_band', verts=4)
    for j in range(9):
        a = j * 2.4 + rr.uniform(-0.3, 0.3)
        z0 = h * rr.uniform(0.35, 0.62)
        L = h * rr.uniform(0.25, 0.42)
        tip = (x + math.cos(a) * L * 0.7, r + math.sin(a) * L * 0.3, z0 + L * 0.8)
        k.tube((x, r, z0), tip, 0.025, ('#d8d2c8', 0.1), 'birch_branch', rb=0.008, verts=5)
        for t in range(3):
            a2 = a + rr.uniform(-0.8, 0.8)
            k.tube(tip, (tip[0] + math.cos(a2) * 0.25, tip[1] + math.sin(a2) * 0.1, tip[2] + rr.uniform(0.05, 0.25)), 0.008,
                   ('#4a3a32', 0.1), 'twig', verts=3)
        k.tube((x + math.cos(a) * L * 0.2, r + math.sin(a) * L * 0.08, z0 + L * 0.25), (tip[0], tip[1], tip[2] + 0.03), 0.018,
               (ROOF_SNOW, 0.05), 'branch_snow', verts=4)
    k.blob(x, r, 0.0, 0.4, 0.32, 0.07, (SNOW_SH, 0.1), 'tree_well', segs=10)
    k.solid_post(x, r)


def rock(k, x, r, s, z=0.0, rr=None, part='boulder'):
    """A boulder with a cap of snow."""
    rr = rr or k.rng
    k.rock(x, r, z + s * 0.32, s, s * 0.8, s * 0.72, ('#6a7084', 0.12), part=part, segs=9, jitter=0.16)
    k.blob(x - s * 0.06, r - s * 0.06, z + s * 0.72, s * 0.78, s * 0.62, s * 0.2, (ROOF_SNOW, 0.05), part + '_snow', segs=10)


# ---- small life ------------------------------------------------------------------------------------------------------
def fence(k, pts, height=None, rr=None):
    """A split-rail fence half under the snow along `pts` (x, r): posts with snow caps, rails with snow along them."""
    rr = rr or k.rng
    hz = height or (lambda x, r: 0.0)
    for i, (x, r) in enumerate(pts):
        z = hz(x, r)
        k.box(x - 0.04, r - 0.04, z - 0.05, x + 0.04, r + 0.04, z + 0.58, (LOG_D, 0.1), 'fence_post')
        k.blob(x, r, z + 0.61, 0.06, 0.06, 0.04, (ROOF_SNOW, 0.05), 'post_snow', segs=6)
        if i + 1 < len(pts):
            x2, r2 = pts[i + 1]
            z2 = hz(x2, r2)
            for (zz, rad) in ((0.42, 0.025), (0.2, 0.022)):
                k.tube((x, r, z + zz), (x2, r2, z2 + zz), rad, (LOG, 0.1), 'fence_rail', verts=5)
            k.tube((x, r, z + 0.46), (x2, r2, z2 + 0.46), 0.03, (ROOF_SNOW, 0.05), 'rail_snow', verts=5)


def prints(k, pts, height=None, step=0.42, rr=None, col='#a8b6ce', part='print'):
    """Boot prints in pairs along a polyline."""
    rr = rr or k.rng
    hz = height or (lambda x, r: 0.0)
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, br - ar)
        n = max(1, int(L / step))
        nx, nr = -(br - ar) / L, (bx - ax) / L
        for i in range(n):
            t = (i + 0.5) / n
            off = 0.1 if i % 2 else -0.1
            x, r = ax + (bx - ax) * t + nx * off + rr.uniform(-0.03, 0.03), ar + (br - ar) * t + nr * off + rr.uniform(-0.03, 0.03)
            k.blob(x, r, hz(x, r) + 0.004, 0.055, 0.085, 0.012, (col, 0.05), part, segs=6)


def sled_tracks(k, pts, height=None):
    """Two runner tracks along a polyline."""
    hz = height or (lambda x, r: 0.0)
    fine = []
    for (ax, ar), (bx, br) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(bx - ax, br - ar) / 0.25))
        fine += [(ax + (bx - ax) * t / n, ar + (br - ar) * t / n) for t in range(n)]
    fine.append(pts[-1])
    for (ax, ar), (bx, br) in zip(fine, fine[1:]):
        L = math.hypot(bx - ax, br - ar)
        nx, nr = -(br - ar) / L, (bx - ax) / L
        for s in (-0.13, 0.13):
            k.tube((ax + nx * s, ar + nr * s, hz(ax, ar) + 0.006), (bx + nx * s, br + nr * s, hz(bx, br) + 0.006), 0.018,
                   ('#b0bcd2', 0.05), 'print', verts=4, smooth=False)


def skis(k, x, r, cols=('#c83a2e', '#e8e8f0'), lean=0.08, z=0.0):
    """A pair of skis stood upright in the snow (or leant on a wall), poles beside them."""
    for i, c in enumerate(cols):
        k.tube((x + i * 0.09, r, z), (x + i * 0.09 + lean, r - 0.02, z + 1.25), 0.032, (c, 0.1), 'ski', verts=4)
        k.sphere(x + i * 0.09 + lean, r - 0.02, z + 1.25, 0.04, 0.04, (c, 0.1), 'ski_tip', segs=5)
    for i in range(2):
        k.tube((x + 0.3 + i * 0.06, r + 0.04, z), (x + 0.3 + i * 0.06 + lean * 0.8, r + 0.02, z + 1.05), 0.012, ('#3a3a42', 0.1), 'ski_pole', verts=4)
        k.cyl(x + 0.3 + i * 0.06, r + 0.04, z + 0.12, z + 0.14, 0.06, ('#3a3a42', 0.1), 'pole_basket', verts=6)


def barrel_snow(k, x, r, h=0.55, rad=0.21, col='#6a4a2a'):
    k.cyl(x, r, 0, h, rad, (col, 0.12), 'barrel', verts=12)
    for z in (h * 0.2, h * 0.8):
        k.cyl(x, r, z - 0.02, z + 0.02, rad + 0.012, ('#3a3a40', 0.1), 'barrel_hoop', verts=12)
    k.blob(x, r, h + 0.02, rad * 1.05, rad * 1.05, 0.06, (ROOF_SNOW, 0.05), 'barrel_snow', segs=10)


def crate_snow(k, x, r, s=0.32):
    k.box(x - s, r - s * 0.7, 0, x + s, r + s * 0.7, s * 1.1, ('#7a5232', 0.12), 'crate')
    for dz in (0.08, s * 1.1 - 0.08):
        k.box(x - s - 0.005, r + s * 0.7, dz - 0.03, x + s + 0.005, r + s * 0.7 + 0.01, dz + 0.03, ('#5a3a20', 0.1), 'crate_slat')
    k.blob(x, r, s * 1.1 + 0.02, s * 0.95, s * 0.7, 0.05, (ROOF_SNOW, 0.05), 'crate_snow', segs=8)


def snowshoes(k, x, r_face, z=0.6):
    """A pair of snowshoes hung on a wall."""
    for dx in (-0.12, 0.12):
        k.cyl_y(x + dx, r_face, r_face + 0.03, z, 0.1, 0.18, ('#7a5232', 0.1), 'snowshoe', verts=10)
        k.cyl_y(x + dx, r_face + 0.02, r_face + 0.035, z, 0.07, 0.14, ('#c8b48a', 0.1), 'snowshoe_web', verts=10)


def bird_feeder(k, x, r, h=1.3):
    k.cyl(x, r, 0, h, 0.035, (LOG_D, 0.1), 'feeder_post', verts=5)
    k.box(x - 0.18, r - 0.14, h, x + 0.18, r + 0.14, h + 0.04, (LOG, 0.1), 'feeder')
    for s in (-1, 1):
        k.quads([((x, r - 0.18, h + 0.26), (x, r + 0.18, h + 0.26), (x + s * 0.25, r + 0.18, h + 0.1), (x + s * 0.25, r - 0.18, h + 0.1))],
                (LOG_D, 0.1), 'roof_feeder')
    k.blob(x, r, h + 0.27, 0.2, 0.18, 0.05, (ROOF_SNOW, 0.05), 'feeder_snow', segs=8)
    for (dx, c) in ((-0.1, '#c84a2a'), (0.08, '#3a5a8a')):
        k.sphere(x + dx, r + 0.1, h + 0.08, 0.04, 0.04, (c, 0.1), 'bird', segs=6)
    k.solid_post(x, r)


def brazier(k, x, r, energy=14):
    """An iron fire basket on legs with a fire in it — glows, warms whoever stands by it."""
    for a in (0.3, 2.4, 4.4):
        k.tube((x + math.cos(a) * 0.2, r + math.sin(a) * 0.2, 0.0), (x + math.cos(a) * 0.12, r + math.sin(a) * 0.12, 0.5), 0.02, ('#2e3038', 0.1), 'brazier_leg', verts=4)
    k.cyl(x, r, 0.5, 0.72, 0.22, ('#2e3038', 0.1), 'brazier', verts=12)
    k.cyl(x, r, 0.7, 0.74, 0.18, '#3a1808', 'brazier_coals', emit=('#ff8a30', 1.2), verts=10)
    for j in range(5):
        a = j * 1.3
        k.cone(x + math.cos(a) * 0.08, r + math.sin(a) * 0.06, 0.72, 0.95 + 0.06 * (j % 2), 0.06, 0.0, '#8a3a08', 'flame', emit=('#ffb040', 1.5), verts=5)
    k.point_light(x, r + 0.1, 1.0, '#ff9a40', energy, radius=0.2, group='flicker')
    k.solid_post(x, r)


def barrel_table(k, x, r, mugs=2):
    k.cyl(x, r, 0, 0.7, 0.22, ('#6a4a2a', 0.12), 'barrel', verts=12)
    for z in (0.15, 0.55):
        k.cyl(x, r, z - 0.02, z + 0.02, 0.232, ('#3a3a40', 0.1), 'barrel_hoop', verts=12)
    k.cyl(x, r, 0.7, 0.74, 0.3, (LOG_D, 0.1), 'table_top', verts=12)
    for i in range(mugs):
        k.cyl(x - 0.1 + i * 0.18, r + 0.05, 0.74, 0.86, 0.05, (('#c83a2e', '#e8e4dc', '#2a6ac0')[i % 3], 0.1), 'mug', verts=8)
    k.solid_post(x, r)


def string_lights(k, a, b, sag=0.3, n=None, energy=0.0):
    """Festoon lights between two points (x, r, z): a dark wire and warm bulbs (glow only)."""
    n = n or max(4, int(math.dist(a[:2], b[:2]) / 0.35))
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.008, ('#1a1a1e', 0.1), 'wire', verts=3)
    for p in pts[1:-1]:
        k.sphere(p[0], p[1], p[2] - 0.05, 0.035, 0.04, '#5a3a10', 'bulb', emit=('#ffd070', 1.4), segs=6)
