"""The richer house kit (Look Book 2, the house style since Oct 2026) — every function takes a Kit.

  import assets_house as HK
  HK.install()                      # patch assets_town.house, assets_village.shop_window and the main street's dirt
                                    # path (assets_farm.dirt_path) for every scene built after this
  HK.rich_house(k, x0, x1, r_back, r_front, ...)   same arguments as assets_town.house
  HK.bay_shop(k, x0, x1, r_face, ...)               same arguments as assets_village.shop_window, but a bay
  HK.street(k, x0, r0, x1, r1)                      a cobbled street with stone kerbs and a flagged pavement edge
  HK.garden(k, x0, x1, r_back, r_front)             a walled garden: dry-stone wall, a gate, an apple tree, a hedge
  HK.pump(k, cx, cr)  HK.tub(k, cx, cr)  HK.barrels(k, cx, cr)  HK.crate_stack(k, cx, cr)   street life

Same model world as the game's kit (scenekit + assets_*): chunky shapes that read at 32 px a tile, lit by the scene.
What it adds to a house: a thatched, clay-pantile or shingled roof by its colour (hipped now and then), deep eaves with
rafter ends and painted trim, a jettied upper floor on two-storey timber houses, a gabled porch bay or a door canopy,
windows with frames, mullions, sills, lintels, louvred shutters and flower boxes, a bow-fronted shop window, a stone
plinth, quoins on stone houses, braces in the timber, ivy and roses, barrels, a cat on the step.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
import assets_town as W  # noqa: E402
import assets_village as V  # noqa: E402
import assets_farm as F  # noqa: E402
from assets_lumar import barrel, IRON, STONE  # noqa: E402
from scenekit import shade  # noqa: E402

_orig = {'house': W.house, 'shop_window': V.shop_window, 'dirt_path': F.dirt_path}
STONES = ('#9a9080', '#8a8274', '#a89c88', '#7e786c')
TRIMS = ('#efe6d2', '#e8dcc0', '#3a5a4a', '#5a3a2a', '#e6d8b8', '#2e4a5a')


def louvred(k, x0, x1, r, z0, z1, col):
    k.box(x0, r, z0, x1, r + 0.045, z1, (col, 0.06), 'shutter')
    z = z0 + 0.06
    while z < z1 - 0.04:
        k.box(x0 + 0.02, r + 0.045, z, x1 - 0.02, r + 0.06, z + 0.025, shade(col, 0.72), 'shutter_slat')
        z += 0.085


def rich_window(k, cx, r_face, z0, w=0.58, h=0.68, shutters='#2a4a3a', box=True, stone='#a89c88', blooms=('#e04060', '#f0d040'), sides=(-1, 1)):
    WD = W.WOOD_DD
    k.box(cx - w / 2 - 0.07, r_face, z0 - 0.07, cx + w / 2 + 0.07, r_face + 0.07, z0 + h + 0.07, WD, 'window_frame')
    k.box(cx - w / 2, r_face + 0.01, z0, cx + w / 2, r_face + 0.075, z0 + h, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9))
    k.box(cx - 0.022, r_face + 0.07, z0, cx + 0.022, r_face + 0.09, z0 + h, WD, 'window_frame')               # mullion
    k.box(cx - w / 2, r_face + 0.07, z0 + h * 0.52 - 0.02, cx + w / 2, r_face + 0.09, z0 + h * 0.52 + 0.02, WD, 'window_frame')
    k.box(cx - w / 2 - 0.12, r_face, z0 + h + 0.07, cx + w / 2 + 0.12, r_face + 0.1, z0 + h + 0.17, (stone, 0.1), 'lintel')
    k.box(cx - w / 2 - 0.12, r_face, z0 - 0.15, cx + w / 2 + 0.12, r_face + 0.17, z0 - 0.07, (stone, 0.1), 'sill')
    if shutters:
        if -1 in sides:
            louvred(k, cx - w / 2 - 0.3, cx - w / 2 - 0.08, r_face + 0.01, z0, z0 + h, shutters)
        if 1 in sides:
            louvred(k, cx + w / 2 + 0.08, cx + w / 2 + 0.3, r_face + 0.01, z0, z0 + h, shutters)
    if box:
        k.box(cx - w / 2 - 0.06, r_face + 0.12, z0 - 0.36, cx + w / 2 + 0.06, r_face + 0.34, z0 - 0.15, (W.WOOD_D, 0.12), 'flower_box')
        x = cx - w / 2 + 0.01
        with k.foliage('leaf'):
            while x < cx + w / 2 + 0.02:
                k.sphere(x, r_face + 0.23, z0 - 0.11, 0.075, 0.065, ('#2e5a2e', 0.15), 'foliage', segs=8)
                if k.rng.random() < 0.55:                                  # trailing green over the front
                    k.blob(x, r_face + 0.36, z0 - 0.3, 0.04, 0.03, 0.09, shade('#3a6a30', k.rng.uniform(0.85, 1.1)), 'trail', segs=6)
                x += 0.11
        x = cx - w / 2 + 0.03
        while x < cx + w / 2:
            k.sphere(x + k.rng.uniform(-0.02, 0.02), r_face + 0.27, z0 - 0.06, 0.04, 0.038, k.rng.choice(blooms), 'flower', segs=6)
            x += 0.09
    k.point_light(cx, r_face + 0.6, z0 + h / 2, '#ffc070', 6, radius=0.2, group='flicker')


def canopy(k, cx, r_face, z, roof, w=1.05, d=0.5):
    """A little gabled canopy over the door on two curved brackets."""
    zr = z + 0.3
    for s in (-1, 1):
        k.quads([((cx, r_face, zr), (cx, r_face + d, zr - 0.02), (cx + s * (w / 2 + 0.06), r_face + d, z - 0.02), (cx + s * (w / 2 + 0.06), r_face, z))],
                shade(roof, 0.95 if s < 0 else 0.82), 'roof')
    k.tube((cx, r_face, zr + 0.02), (cx, r_face + d + 0.02, zr), 0.035, shade(roof, 0.62), 'ridge', verts=6)
    k.poly([(cx - w / 2, r_face + d - 0.02, z), (cx + w / 2, r_face + d - 0.02, z), (cx, r_face + d - 0.02, zr - 0.02)], W.WOOD_DD, 'canopy_gable')
    for s in (-1, 1):
        k.tube((cx + s * (w / 2 - 0.06), r_face, z - 0.36), (cx + s * (w / 2 - 0.06), r_face + d - 0.08, z - 0.02), 0.03, W.WOOD_DD, 'bracket', verts=4)


def rich_door(k, cx, r_face, roof, w=0.74, h=1.35, col=None, lamp_side=1, stone='#a89c88', bay=False):
    col = col or k.rng.choice(('#5a3e22', '#3a5a4a', '#6a2a2a', '#2e4a6a', '#7a5a2a'))
    W.door(k, cx, r_face, w=w, h=h, col=col)
    if not bay:
        k.box(cx - w / 2 - 0.3, r_face + 0.36, -0.02, cx + w / 2 + 0.3, r_face + 0.56, 0.035, (stone, 0.14), 'step')    # a lower, wider step
    k.box(cx - 0.26, r_face + 0.14, 0.06, cx + 0.26, r_face + 0.32, 0.075, ('#8a3a2a', 0.2), 'doormat')
    canopy(k, cx, r_face + 0.06, h + 0.32, roof, w=0.98 if bay else 1.05, d=0.42 if bay else 0.5)
    if not bay:
        W.wall_lantern(k, cx + lamp_side * (w / 2 + 0.36), r_face + 0.02, z=1.3, energy=9)


def cat(k, x, r, z):
    c = k.rng.choice(('#d8803a', '#3a3438', '#e8e0d4', '#8a7a6a'))
    k.blob(x, r, z + 0.1, 0.13, 0.09, 0.1, (c, 0.05), 'cat', segs=10)
    k.sphere(x + 0.1, r + 0.04, z + 0.22, 0.075, 0.07, (c, 0.05), 'cat', segs=10)
    for s in (-1, 1):
        k.cone(x + 0.1 + s * 0.04, r + 0.04, z + 0.27, z + 0.34, 0.03, 0.0, (c, 0.05), 'cat', verts=4)
    k.tube((x - 0.12, r, z + 0.04), (x - 0.06, r + 0.16, z + 0.02), 0.022, (c, 0.05), 'cat', verts=5)


def cross_gable(k, cx, r_front, wall_h, rise, z_main_eave, r_main_eave, rm, zr, roof, wall, timber, w=1.5, proj=0.3):
    """A gabled bay standing forward of the front wall over the door, with its own little roof meeting the main one."""
    rf = r_front + proj
    hg = min(1.05, rise * 0.85)
    apex = wall_h + hg
    k.box(cx - w / 2, r_front - 0.05, 0.35, cx + w / 2, rf, wall_h, (wall, 0.08), 'bay_wall')
    k.poly([(cx - w / 2, rf, wall_h - 0.02), (cx + w / 2, rf, wall_h - 0.02), (cx, rf, apex)], (wall, 0.08), 'gable')
    k.box(cx - 0.045, rf, wall_h, cx + 0.045, rf + 0.03, apex - 0.12, (timber, 0.1), 'timber')              # king post
    k.box(cx - w / 2 + 0.06, rf, wall_h - 0.06, cx + w / 2 - 0.06, rf + 0.03, wall_h + 0.04, (timber, 0.1), 'timber')
    for s in (-1, 1):                                                                                        # braces
        k.tube((cx + s * (w / 2 - 0.12), rf + 0.015, wall_h + 0.04), (cx + s * 0.06, rf + 0.015, wall_h + hg * 0.62), 0.03, timber, 'timber', verts=4)
    k.cyl_y(cx, rf - 0.01, rf + 0.05, wall_h + hg * 0.42, 0.15, 0.15, W.WOOD_DD, 'window_frame', verts=14)
    k.cyl_y(cx, rf + 0.0, rf + 0.06, wall_h + hg * 0.42, 0.1, 0.1, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9), verts=14)
    # its roof: two slopes from its eaves up to a ridge running back into the main roof
    over = 0.2
    ze = wall_h - 0.06
    t = (apex + 0.05 - z_main_eave) / max(0.1, zr - z_main_eave)
    r_meet = r_main_eave - (r_main_eave - rm) * min(1.0, t) - 0.12
    ra = rf + over
    tones = [shade(roof, f) for f in (0.88, 0.95, 1.0, 1.06)]
    clay = is_clay(roof)
    for s in (-1, 1):
        xe = cx + s * (w / 2 + over)
        k.quads([((xe, ra, ze), (cx, ra, apex + 0.05), (cx, r_meet, apex + 0.05), (xe, r_meet, ze))], shade(roof, 0.5), 'roof_deck')
        if clay:                                             # pantiles, like the main roof: columns running down this slope
            beds, n, rr = {}, 4, ra
            while rr > r_meet + 0.02:
                r_a, r_b = rr - 0.01, max(r_meet, rr - 0.25)
                rm0, rm1 = r_a - 0.085, r_a - 0.165
                for i in range(n):
                    f0, f1 = i / n, min(1.0, (i + 1.25) / n)
                    xa_, za_ = xe + (cx - xe) * f0, ze + (apex + 0.05 - ze) * f0
                    xb_, zb_ = xe + (cx - xe) * f1, ze + (apex + 0.05 - ze) * f1
                    f = k.rng.choices((1.0, 0.9, 1.08), (0.7, 0.18, 0.12))[0]
                    for (pa, pb, ha, hb, kk) in ((r_a, rm0, 0.0, 0.075, 1.1), (rm0, rm1, 0.075, 0.075, 1.0), (rm1, r_b, 0.075, 0.0, 0.78)):
                        c = shade(roof, kk * f)
                        beds.setdefault(c, []).append(((xa_, pa, za_ + ha), (xb_, pa, zb_ + ha), (xb_, pb, zb_ + hb), (xa_, pb, za_ + hb)))
                rr -= 0.25
            for c, qs in beds.items():
                k.quads(qs, c, 'roof_tile')
            continue
        n = 5
        for i in range(n):                                   # courses of shingles, lapping, like the big roof
            f0, f1 = i / n, min(1.0, (i + 1.3) / n)
            def at(f, up):
                return xe + (cx - xe) * f, ze + (apex + 0.05 - ze) * f + up
            xa, za = at(f0, 0.03)
            xb, zb = at(f1, 0.005)
            k.quads([((xa, ra, za), (xb, ra, zb), (xb, r_meet, zb), (xa, r_meet, za))], k.rng.choice(tones), 'roof')
            k.quads([((xa, ra, za + 0.002), (xa + (cx - xe) * 0.03, ra, za + 0.006), (xa + (cx - xe) * 0.03, r_meet, za + 0.006), (xa, r_meet, za + 0.002))],
                    shade(roof, 0.58), 'roof')
    k.tube((cx, ra + 0.02, apex + 0.08), (cx, r_meet, apex + 0.08), 0.06, shade(roof, 0.66), 'ridge', verts=8)
    for s in (-1, 1):                                        # bargeboards
        k.tube((cx + s * (w / 2 + over + 0.02), ra + 0.03, ze + 0.02), (cx, ra + 0.03, apex + 0.1), 0.04, W.WOOD_DD, 'bargeboard', verts=4)
    k.cone(cx, ra + 0.03, apex + 0.1, apex + 0.34, 0.05, 0.0, W.WOOD_DD, 'finial', verts=6)
    return rf


def scallop_trim(k, xa, xb, r, z, col):
    """Painted fascia under the eave with a scalloped edge — the gingerbread trim."""
    k.box(xa, r, z - 0.16, xb, r + 0.05, z - 0.04, (col, 0.04), 'fascia_paint')
    x = xa + 0.06
    while x < xb - 0.06:
        k.cyl_y(x + 0.07, r, r + 0.05, z - 0.16, 0.065, 0.06, (col, 0.04), 'fascia_paint', verts=8)
        x += 0.17



S2 = 1 / math.sin(math.radians(45))


def _rgb(h):
    h = h.lstrip('#')
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def is_thatch(col):
    r, g, b = _rgb(col)
    return r > 160 and g > 120 and b < 130 and r - b > 60 and r - g < 60


def is_clay(col):
    r, g, b = _rgb(col)
    return r > 140 and g < 120 and b < 100 and r - g > 50


def _ends(k, x0, x1, r_back, r_front, z_eave, rm, zr, xa, xb, ra, rb, ze, wall, barge=True):
    for xe in (x0, x1):
        k.poly([(xe, r_front, z_eave), (xe, r_back, z_eave), (xe, rm, zr)], (wall, 0.08), 'gable')
    if barge:
        for xe in (xa - 0.02, xb + 0.02):
            for r_e in (ra, rb):
                k.tube((xe, r_e, ze + 0.03), (xe, rm, zr + 0.07), 0.04, W.WOOD_DD, 'bargeboard', verts=4)


def thatch_roof(k, x0, x1, r_back, r_front, z_eave, rise, col, wall, over=0.34):
    """A thatched roof (the inn): thick straw laid in soft courses of bundles, a rolled, rounded eave and verges, and a
    ridge of combed straw with a scalloped edge pinned down by crossed hazel spars — the thatcher's signature."""
    rng = k.rng
    rm = (r_back + r_front) / 2
    T = 0.24                                              # the thatch is thick: its top stands proud of the rafters
    zr = z_eave + rise
    ra, rb = r_front + over, r_back - over
    xa, xb = x0 - over, x1 + over
    ze = z_eave - 0.16                                    # it hangs low over the walls
    zt = zr + T
    k.poly([(xa, ra, ze), (xb, ra, ze), (xb, rm, zt), (xa, rm, zt)], shade(col, 0.45), 'roof_deck')
    k.poly([(xa, rb, ze), (xb, rb, ze), (xb, rm, zt), (xa, rm, zt)], shade(col, 0.45), 'roof_deck')
    tones = [shade(col, f) for f in (0.8, 0.88, 0.95, 1.02, 1.09)]
    beds = {t: [] for t in tones}
    lines = []
    for r_e in (ra, rb):
        run = rm - r_e
        L = math.hypot(run * S2, zt - ze)
        n = max(3, int(round(L / 0.46)))
        for i in range(n):
            t0, t1 = i / n, min(1.0, (i + 1.35) / n)

            def at(t, up=0.0):
                return r_e + run * t, ze + (zt - ze) * t + up
            x = xa
            age = 1 - i / n                                   # straw weathers darker and greyer toward the eave
            while x < xb - 0.01:
                w = rng.uniform(0.05, 0.11)
                x1_ = min(xb, x + w)
                sag = rng.uniform(-0.05, 0.03) / max(L, 0.1)          # ragged, combed butts
                rb0, zb0 = at(max(0.0, t0 + sag), 0.05)
                rt0, zt0 = at(t1, 0.01)
                tone = tones[min(4, max(0, int(rng.random() * 5 - age * 1.2 + 0.4)))]   # vertical streaks of straw
                beds[tone].append(((x, rb0, zb0), (x1_, rb0, zb0), (x1_, rt0, zt0), (x, rt0, zt0)))
                x = x1_
            if i:
                rs0, zs0 = at(t0 - 0.035 / max(L, 0.1), 0.035)
                rs1, zs1 = at(t0 + 0.005 / max(L, 0.1), 0.05)
                lines.append(((xa, rs0, zs0), (xb, rs0, zs0), (xb, rs1, zs1), (xa, rs1, zs1)))
    for tone, qs in beds.items():
        if qs:
            k.quads(qs, tone, 'thatch')
    if lines:
        k.quads(lines, shade(col, 0.8), 'thatch')
    dots = {}
    for _ in range(int((xb - xa) * 5)):
        t = rng.random() ** 2.4 * 0.6
        x = rng.uniform(xa + 0.15, xb - 0.15)
        rr, zz = ra + (rm - ra) * t, ze + (zt - ze) * t + 0.06
        c = rng.choice(('#5a6a34', '#6a7a3a', '#4a5a30'))
        for _j in range(rng.randint(2, 5)):
            ox, oz, sz = rng.uniform(-0.1, 0.1), rng.uniform(-0.03, 0.03), rng.uniform(0.02, 0.045)
            dots.setdefault(c, []).append((x + ox - sz, rr - sz * 0.6, zz + oz, x + ox + sz, rr + sz * 0.6, zz + oz + 0.012))
    for c, rs in dots.items():
        k.boxes(rs, c, 'roof_moss')
    # the rolled eave and verges
    k.cyl_x(xa - 0.04, xb + 0.04, ra + 0.02, ze + 0.03, 0.12, 0.12, (shade(col, 0.9), 0.1), 'thatch', verts=10)
    for xe in (xa - 0.02, xb + 0.02):
        for r_e in (ra, rb):
            k.tube((xe, r_e, ze + 0.03), (xe, rm, zt + 0.02), 0.11, shade(col, 0.86), 'thatch', verts=8)
    # the ridge: a saddle of combed straw, its lower edge cut in scallops, crossed spars pinning it
    ridge = shade(col, 0.84)
    for r_e in (ra, rb):
        run = rm - r_e
        L = math.hypot(run * S2, zt - ze)
        tb = 1 - 0.55 / L                                  # the saddle's lower edge, ~0.55 down the slope

        def at(t, up):
            return r_e + run * t, ze + (zt - ze) * t + up
        r0_, z0_ = at(tb, 0.09)
        k.quads([((xa + 0.1, r0_, z0_), (xb - 0.1, r0_, z0_), (xb - 0.1, rm, zt + 0.11), (xa + 0.1, rm, zt + 0.11))], ridge, 'thatch_ridge')
        x = xa + 0.1
        sc = []
        while x < xb - 0.3:                               # scallops hanging below the saddle
            rp, zp = at(tb - 0.16 / L, 0.08)
            sc.append(((x, r0_, z0_), (x + 0.32, r0_, z0_), (x + 0.16, rp, zp), (x + 0.16, rp, zp)))
            x += 0.32
        k.quads(sc, ridge, 'thatch_ridge')
        if r_e == ra:                                     # the spars, on the side we see
            r1_, z1_ = at(1 - 0.18 / L, 0.115)
            r2_, z2_ = at(tb + 0.1 / L, 0.1)
            spar = '#6a5030'
            k.tube((xa + 0.15, r1_, z1_), (xb - 0.15, r1_, z1_), 0.02, spar, 'thatch_spar', verts=4)
            k.tube((xa + 0.15, r2_, z2_), (xb - 0.15, r2_, z2_), 0.02, spar, 'thatch_spar', verts=4)
            x = xa + 0.2
            while x < xb - 0.3:
                k.tube((x, r2_, z2_), (x + 0.24, r1_, z1_), 0.016, spar, 'thatch_spar', verts=4)
                k.tube((x + 0.24, r2_, z2_), (x, r1_, z1_), 0.016, spar, 'thatch_spar', verts=4)
                x += 0.48
    k.cyl_x(xa + 0.05, xb - 0.05, rm, zt + 0.1, 0.1, 0.09, (ridge, 0.06), 'thatch_ridge', verts=10)
    for xe in (x0, x1):
        k.poly([(xe, r_front, z_eave), (xe, r_back, z_eave), (xe, rm, zr)], (wall, 0.08), 'gable')
    return rm, zt


def pantile_roof(k, x0, x1, r_back, r_front, z_eave, rise, col, wall, over=0.3):
    """Clay pantiles (the bakery): columns of rounded tiles running down the slope, each a lit flank, a crown and a
    shaded flank, laid in courses with a dark lap line, the odd tile weathered or replaced; big ridge tiles on top."""
    rng = k.rng
    rm = (r_back + r_front) / 2
    zr = z_eave + rise
    ra, rb = r_front + over, r_back - over
    xa, xb = x0 - over, x1 + over
    ze = z_eave - 0.06
    k.poly([(xa, ra, ze), (xb, ra, ze), (xb, rm, zr), (xa, rm, zr)], shade(col, 0.42), 'roof_deck')
    k.poly([(xa, rb, ze), (xb, rb, ze), (xb, rm, zr), (xa, rm, zr)], shade(col, 0.42), 'roof_deck')
    beds = {}
    lines = []
    tw = 0.26                                              # a tile column's width
    for r_e in (ra, rb):
        run = rm - r_e
        L = math.hypot(run * S2, zr - ze)
        n = max(4, int(round(L / 0.3)))

        def at(t, up=0.0):
            return r_e + run * t, ze + (zr - ze) * t + up
        cx = xa + tw / 2
        while cx < xb:
            for i in range(n):
                t0, t1 = i / n, min(1.0, (i + 1.25) / n)
                f = rng.choices((1.0, 0.9, 1.08, 0.78), (0.62, 0.18, 0.14, 0.06))[0]
                ra0, za0 = at(t0, 0.0)
                ra1, za1 = at(t1, 0.0)
                xl, xm0, xm1, xr = cx - tw / 2 + 0.01, cx - 0.045, cx + 0.045, min(xb, cx + tw / 2 - 0.01)
                hgt = 0.075
                for (pa, pb, ha, hb, k_) in ((xl, xm0, 0.0, hgt, 1.12), (xm0, xm1, hgt, hgt, 1.0), (xm1, xr, hgt, 0.0, 0.76)):
                    c = shade(col, k_ * f)
                    beds.setdefault(c, []).append(((pa, ra0, za0 + ha), (pb, ra0, za0 + hb), (pb, ra1, za1 + hb), (pa, ra1, za1 + ha)))
            cx += tw
        for i in range(1, n):
            t0 = i / n
            rs0, zs0 = at(t0 - 0.04 / max(L, 0.1), 0.08)
            rs1, zs1 = at(t0, 0.09)
            lines.append(((xa, rs0, zs0), (xb, rs0, zs0), (xb, rs1, zs1), (xa, rs1, zs1)))
    for c, qs in beds.items():
        k.quads(qs, c, 'roof_tile')
    k.quads(lines, shade(col, 0.5), 'roof_tile')
    x = xa
    while x < xb - 0.05:                                   # big half-round ridge tiles
        x1_ = min(xb, x + 0.36)
        k.tube((x + 0.01, rm, zr + 0.07), (x1_ - 0.01, rm, zr + 0.07), 0.11, shade(col, rng.uniform(0.7, 0.8)), 'ridge', verts=8)
        x = x1_
    _ends(k, x0, x1, r_back, r_front, z_eave, rm, zr, xa, xb, ra, rb, ze, wall)
    k.box(xa, ra - 0.02, z_eave - 0.14, xb, ra + 0.04, z_eave - 0.04, W.WOOD_DD, 'fascia')
    k.tube((xa + 0.05, ra + 0.07, z_eave - 0.12), (xb - 0.05, ra + 0.07, z_eave - 0.12), 0.035, '#4a4a4c', 'gutter', verts=6)
    return rm, zr + 0.08



def hipped_thatch(k, x0, x1, r_back, r_front, z_eave, rise, col, over=0.34):
    """A thatched roof hipped at both ends (the big inn): the straw sweeps round the corners, the ridge shorter, its
    saddle scalloped and spar-pinned, hip ridges running down to the rolled eave."""
    rng = k.rng
    rm = (r_back + r_front) / 2
    T = 0.24
    zr = z_eave + rise
    ra, rb = r_front + over, r_back - over
    xa, xb = x0 - over, x1 + over
    ze = z_eave - 0.16
    zt = zr + T
    hx = min(1.5, (xb - xa) * 0.22)                       # how far the hips run in
    xr0, xr1 = xa + hx, xb - hx                           # the ridge
    tones = [shade(col, f) for f in (0.8, 0.88, 0.95, 1.02, 1.09)]
    beds = {t: [] for t in tones}
    lines = []
    deck = shade(col, 0.45)
    for r_e in (ra, rb):
        k.poly([(xa, r_e, ze), (xb, r_e, ze), (xr1, rm, zt), (xr0, rm, zt)], deck, 'roof_deck')
    for x_e, xr in ((xa, xr0), (xb, xr1)):
        k.poly([(x_e, ra, ze), (x_e, rb, ze), (xr, rm, zt)], deck, 'roof_deck')

    def straw(n, edge, L):
        """Courses of straw bundles over a slope: edge(t, u) → a point at height t (0 eave → 1 ridge) and u (0 → 1 across)."""
        for i in range(n):
            t0, t1 = i / n, min(1.0, (i + 1.35) / n)
            age = 1 - i / n
            u = 0.0
            while u < 1.0:
                w = rng.uniform(0.05, 0.11) / max(0.3, L)
                u1 = min(1.0, u + w)
                sag = rng.uniform(-0.05, 0.03) / max(1.0, n * 0.46)
                a, b = edge(max(0.0, t0 + sag), u, 0.05), edge(max(0.0, t0 + sag), u1, 0.05)
                c, d = edge(t1, u1, 0.01), edge(t1, u, 0.01)
                tone = tones[min(4, max(0, int(rng.random() * 5 - age * 1.2 + 0.4)))]
                beds[tone].append((a, b, c, d))
                u = u1
            if i:
                a, b = edge(t0 - 0.02, 0.0, 0.035), edge(t0 - 0.02, 1.0, 0.035)
                c, d = edge(t0 + 0.004, 1.0, 0.05), edge(t0 + 0.004, 0.0, 0.05)
                lines.append((a, b, c, d))
    for r_e in (ra, rb):
        L = math.hypot((rm - r_e) * S2, zt - ze)
        n = max(3, int(round(L / 0.62)))

        def edge(t, u, up, r_e=r_e):
            xl, xh = xa + (xr0 - xa) * t, xb + (xr1 - xb) * t
            return (xl + (xh - xl) * u, r_e + (rm - r_e) * t, ze + (zt - ze) * t + up)
        straw(n, edge, xb - xa)
    for x_e, xr in ((xa, xr0), (xb, xr1)):
        L = math.hypot(xr - x_e, zt - ze)
        n = max(3, int(round(L / 0.46)))

        def edge(t, u, up, x_e=x_e, xr=xr):
            rl, rh = ra + (rm - ra) * t, rb + (rm - rb) * t
            return (x_e + (xr - x_e) * t, rl + (rh - rl) * u, ze + (zt - ze) * t + up)
        straw(n, edge, (ra - rb) * 0.7)
    for tone, qs in beds.items():
        if qs:
            k.quads(qs, tone, 'thatch')
    if lines:
        k.quads(lines, shade(col, 0.86), 'thatch')
    # the rolled eave all round, and the hips
    roll = (shade(col, 0.9), 0.1)
    k.cyl_x(xa - 0.04, xb + 0.04, ra + 0.02, ze + 0.03, 0.12, 0.12, roll, 'thatch', verts=10)
    for x_e in (xa - 0.02, xb + 0.02):
        k.tube((x_e, ra + 0.02, ze + 0.03), (x_e, rb, ze + 0.03), 0.12, shade(col, 0.88), 'thatch', verts=8)
    ridge = shade(col, 0.84)
    for x_e, xr in ((xa, xr0), (xb, xr1)):
        for r_e in (ra, rb):
            k.tube((x_e, r_e, ze + 0.06), (xr, rm, zt + 0.08), 0.1, ridge, 'thatch_ridge', verts=8)
    # the ridge saddle, scallops and spars (front side)
    L = math.hypot((rm - ra) * S2, zt - ze)
    tb = 1 - 0.55 / L

    def at(t, up, x):
        return (x, ra + (rm - ra) * t, ze + (zt - ze) * t + up)
    for r_e in (ra, rb):
        rr0 = r_e + (rm - r_e) * tb
        zz0 = ze + (zt - ze) * tb + 0.09
        k.quads([((xr0, rr0, zz0), (xr1, rr0, zz0), (xr1, rm, zt + 0.11), (xr0, rm, zt + 0.11))], ridge, 'thatch_ridge')
    sc, x = [], xr0
    rr0, zz0 = at(tb, 0.09, 0)[1:]
    rp, zp = at(tb - 0.16 / L, 0.08, 0)[1:]
    while x < xr1 - 0.3:
        sc.append(((x, rr0, zz0), (x + 0.32, rr0, zz0), (x + 0.16, rp, zp), (x + 0.16, rp, zp)))
        x += 0.32
    k.quads(sc, ridge, 'thatch_ridge')
    r1_, z1_ = at(1 - 0.18 / L, 0.115, 0)[1:]
    r2_, z2_ = at(tb + 0.1 / L, 0.1, 0)[1:]
    spar = '#6a5030'
    k.tube((xr0 + 0.05, r1_, z1_), (xr1 - 0.05, r1_, z1_), 0.02, spar, 'thatch_spar', verts=4)
    k.tube((xr0 + 0.05, r2_, z2_), (xr1 - 0.05, r2_, z2_), 0.02, spar, 'thatch_spar', verts=4)
    x = xr0 + 0.1
    while x < xr1 - 0.3:
        k.tube((x, r2_, z2_), (x + 0.24, r1_, z1_), 0.016, spar, 'thatch_spar', verts=4)
        k.tube((x + 0.24, r2_, z2_), (x, r1_, z1_), 0.016, spar, 'thatch_spar', verts=4)
        x += 0.48
    k.cyl_x(xr0 - 0.05, xr1 + 0.05, rm, zt + 0.1, 0.1, 0.09, (ridge, 0.06), 'thatch_ridge', verts=10)
    dots = {}
    for _ in range(int((xb - xa) * 5)):
        t = rng.random() ** 2.4 * 0.6
        x = rng.uniform(xa + 0.3 + hx * t, xb - 0.3 - hx * t)
        rr, zz = ra + (rm - ra) * t, ze + (zt - ze) * t + 0.06
        c = rng.choice(('#5a6a34', '#6a7a3a', '#4a5a30'))
        for _j in range(rng.randint(2, 5)):
            ox, oz, sz = rng.uniform(-0.1, 0.1), rng.uniform(-0.03, 0.03), rng.uniform(0.02, 0.045)
            dots.setdefault(c, []).append((x + ox - sz, rr - sz * 0.6, zz + oz, x + ox + sz, rr + sz * 0.6, zz + oz + 0.012))
    for c, rs in dots.items():
        k.boxes(rs, c, 'roof_moss')
    return rm, zt


def rafter_ends(k, xa, xb, r_face, over, z_eave, timber):
    """The rafters' ends showing under a deep eave, every forty centimetres or so."""
    x = xa + 0.16
    while x < xb - 0.16:
        k.box(x - 0.04, r_face + 0.02, z_eave - 0.24, x + 0.04, r_face + over - 0.03, z_eave - 0.14, (timber, 0.1), 'rafter')
        x += 0.42


def bay_shop(k, x0, x1, r_face, z0=0.45, z1=1.55, frame='#2a3a2e', goods=('#c84a3a', '#e0b040', '#5a8a3a', '#e8e0c8', '#8a5a9a')):
    """A shop window that bows out into the street: glazed on three sides over a panelled stall board, the goods on
    show, a lead-capped lean-to roof with a fascia over it."""
    d = 0.34
    rf = r_face + d
    k.box(x0 - 0.08, r_face, 0.0, x1 + 0.08, rf + 0.03, z0 - 0.06, (shade(frame, 1.15), 0.12), 'shop_base')
    for x in (x0 + 0.06, (x0 + x1) / 2 + 0.03):                    # two sunk panels in the stall board
        k.box(x, rf + 0.03, 0.08, x + (x1 - x0) / 2 - 0.12, rf + 0.045, z0 - 0.16, (shade(frame, 0.82), 0.1), 'shop_base')
    _orig['shop_window'](k, x0, x1, rf, z0, z1, frame, goods)
    for xs in (x0 - 0.07, x1 + 0.02):                              # the sides, glazed back to the wall
        k.box(xs, r_face, z0, xs + 0.05, rf, z1, '#fff2c8', 'shop_glass', emit=('#ffe0a0', 0.35))
        k.box(xs - 0.01, r_face, z1, xs + 0.06, rf + 0.06, z1 + 0.08, (frame, 0.12), 'shop_frame')
        k.box(xs - 0.01, r_face + d / 2 - 0.02, z0, xs + 0.06, r_face + d / 2 + 0.02, z1, (frame, 0.12), 'shop_frame')
    zt, zb = z1 + 0.18, z1 + 0.06
    k.quads([((x0 - 0.14, r_face, zt), (x1 + 0.14, r_face, zt), (x1 + 0.14, rf + 0.14, zb), (x0 - 0.14, rf + 0.14, zb))],
            ('#5c6470', 0.1), 'bay_roof')
    k.box(x0 - 0.14, rf + 0.1, zb - 0.08, x1 + 0.14, rf + 0.16, zb + 0.01, (frame, 0.1), 'fascia')
    for xs in (x0 - 0.14, x1 + 0.14):
        k.poly([(xs, r_face, zt), (xs, rf + 0.14, zb), (xs, r_face, zb - 0.08)], (frame, 0.1), 'bay_roof')


def street(k, x0, r0, x1, r1, tone='#a39a8a', pave=0.22):
    """A cobbled street: a flagged pavement along the houses' side (from pave rows north of r0), stone kerbs, cobbles
    between, a kerb on the far side."""
    rng = k.rng
    flag = '#a89c88'
    rp0, kb0 = r0 - pave, r0 + 0.2            # the pavement, then the kerb
    k.box(x0, rp0, -0.02, x1, kb0, 0.035, ('#5a554c', 0.1), 'pavement')          # the joints, dark
    r, i = rp0, 0
    while r < kb0 - 0.02:
        x = x0 - (0.2 if i % 2 else 0)
        h = min(kb0, r + rng.uniform(0.2, 0.3))
        while x < x1:
            w = rng.uniform(0.32, 0.6)
            k.box(max(x0, x) + 0.015, r + 0.015, 0.035, min(x1, x + w) - 0.015, h - 0.015, 0.05,
                  (shade(flag, rng.uniform(0.86, 1.08)), 0.1), 'pavement', bevel=0.008)
            x += w
        r, i = h, i + 1
    for (ra_, rb_) in ((kb0, kb0 + 0.16), (r1 - 0.14, r1)):
        x = x0
        while x < x1:
            w = rng.uniform(0.5, 0.9)
            k.box(x + 0.012, ra_, -0.02, min(x1, x + w) - 0.012, rb_, 0.075, (shade('#b0a490', rng.uniform(0.86, 1.06)), 0.1), 'kerb', bevel=0.014)
            x += w
    W.cobbles(k, x0, kb0 + 0.16, x1, r1 - 0.14, tone=tone, size=0.24, lawn=True)


def _dirt_path(k, x0, r0, x1, r1):
    """The main street (a long east–west path) becomes a cobbled street; other paths stay earth."""
    if x1 - x0 > 20 and r1 - r0 >= 1.6:
        return street(k, x0, r0, x1, r1)
    return _orig['dirt_path'](k, x0, r0, x1, r1)


def stone_wall(k, xa, xb, r, h=0.55, d=0.24):
    """A dry-stone wall: rough blocks in courses, a row of rounded copestones on top."""
    rng = k.rng
    z, i = 0.0, 0
    while z < h - 0.08:
        x = xa - (0.1 if i % 2 else 0)
        zh = min(h - 0.08, z + rng.uniform(0.11, 0.16))
        while x < xb:
            w = rng.uniform(0.16, 0.3)
            k.box(max(xa, x) + 0.01, r - d / 2 + rng.uniform(0, 0.02), z + 0.01, min(xb, x + w) - 0.01, r + d / 2 - rng.uniform(0, 0.02), zh,
                  (shade(rng.choice(STONES), rng.uniform(0.85, 1.08)), 0.14), 'wall_stone', bevel=0.02)
            x += w
        z, i = zh, i + 1
    x = xa
    while x < xb - 0.05:
        w = rng.uniform(0.12, 0.18)
        k.blob(x + w / 2, r, h - 0.03, w / 2, d / 2 + 0.01, 0.07, (shade('#9a9080', rng.uniform(0.85, 1.05)), 0.1), 'copestone', segs=8)
        x += w
    k.solid(xa, r - 0.2, xb, r + 0.2)


def garden(k, x0, x1, r_back, r_front, tree=True):
    """A front garden between houses: a dry-stone wall with a wooden gate, a hedge up each side, a bed of flowers
    along the wall, an apple tree."""
    gx, gw = (x0 + x1) / 2, 0.56
    stone_wall(k, x0, gx - gw / 2 - 0.08, r_front)
    stone_wall(k, gx + gw / 2 + 0.08, x1, r_front)
    for s in (-1, 1):
        px = gx + s * (gw / 2 + 0.04)
        k.box(px - 0.08, r_front - 0.1, 0, px + 0.08, r_front + 0.1, 0.72, (shade('#9a9080', 1.05), 0.12), 'gate_pier', bevel=0.02)
        k.sphere(px, r_front, 0.78, 0.08, 0.07, (shade('#9a9080', 1.1), 0.08), 'gate_pier', segs=8)
    for i in range(5):                                                   # the gate, a little ajar
        x = gx - gw / 2 + 0.03 + i * (gw - 0.06) / 5
        k.box(x, r_front - 0.02, 0.06, x + 0.08, r_front + 0.02, 0.6, ('#8a6a44', 0.12), 'gate')
    for z in (0.16, 0.48):
        k.box(gx - gw / 2 + 0.02, r_front + 0.02, z, gx + gw / 2 - 0.02, r_front + 0.05, z + 0.06, ('#7a5a38', 0.12), 'gate')
    with k.foliage('leaf'):
        for x in (x0 + 0.18, x1 - 0.18):
            r = r_back + 0.3
            while r < r_front - 0.3:
                W.leafy_crown(k, x, r, 0.32, 0.22, 0.2, 0.3, shade('#3a6a30', k.rng.uniform(0.9, 1.08)), part='hedge')
                r += 0.36
    V.flower_bed(k, x0 + 0.35, r_front - 0.55, x1 - 0.35, r_front - 0.22)
    if tree:
        F.apple_tree(k, gx, r_back + (r_front - r_back) * 0.45, h=2.3)


def pump(k, cx, cr):
    """A cast-iron village pump with a long handle and a stone trough under the spout."""
    iron = '#2e3a34'
    k.box(cx - 0.16, cr - 0.16, 0, cx + 0.16, cr + 0.16, 0.08, (shade(STONE, 0.9), 0.12), 'pump_base', bevel=0.02)
    k.cyl(cx, cr, 0.08, 0.95, 0.075, (iron, 0.06), 'pump', verts=10)
    k.cyl(cx, cr, 0.95, 1.02, 0.1, (iron, 0.06), 'pump', verts=10)
    k.sphere(cx, cr, 1.08, 0.07, 0.07, (iron, 0.06), 'pump', segs=8)
    k.tube((cx, cr + 0.04, 0.78), (cx, cr + 0.32, 0.7), 0.03, iron, 'pump', verts=6)               # the spout
    k.tube((cx, cr - 0.02, 0.98), (cx - 0.12, cr - 0.5, 1.22), 0.022, iron, 'pump', verts=5)       # the handle
    k.sphere(cx - 0.12, cr - 0.5, 1.22, 0.035, 0.035, '#8a6a44', 'pump', segs=6)
    k.box(cx - 0.34, cr + 0.22, 0, cx + 0.34, cr + 0.58, 0.32, (shade(STONE, 0.95), 0.14), 'trough', bevel=0.02)
    k.box(cx - 0.28, cr + 0.27, 0.22, cx + 0.28, cr + 0.53, 0.28, ('#2a4a5a', 0.1), 'trough_water', emit=('#3a6a8a', 0.12))
    k.solid(cx - 0.35, cr - 0.2, cx + 0.35, cr + 0.6)


def tub(k, cx, cr, blooms=None):
    """Half a barrel of flowers: staves, two iron hoops, a mound of green and blooms."""
    blooms = blooms or k.rng.choice((('#e04060', '#f0d040'), ('#a060d0', '#f0f0f0'), ('#f080b0', '#ffffff'), ('#e07030', '#f0d040')))
    k.cyl(cx, cr, 0, 0.36, 0.24, ('#7a5a34', 0.14), 'tub', verts=14)
    for z in (0.07, 0.27):
        k.cyl(cx, cr, z, z + 0.04, 0.25, IRON, 'tub_hoop', verts=14)
    k.cyl(cx, cr, 0.3, 0.35, 0.21, '#2a1a10', 'soil', verts=12)
    with k.foliage('leaf'):
        W.leafy_crown(k, cx, cr, 0.48, 0.24, 0.2, 0.17, '#3a6a30', part='foliage')
    for _ in range(9):
        a = k.rng.uniform(0, 6.28)
        k.sphere(cx + math.cos(a) * 0.15, cr + math.sin(a) * 0.12, k.rng.uniform(0.5, 0.62), 0.04, 0.04, k.rng.choice(blooms), 'flower', segs=6)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def barrels(k, cx, cr):
    barrel(k, cx, cr, h=0.66, radius=0.24)
    barrel(k, cx + 0.5, cr + 0.05, h=0.6, radius=0.22, tone='#7a5a34')
    barrel(k, cx + 0.22, cr + 0.42, h=0.44, radius=0.2, upright=False)


def _frame(k, face, x0, x1, za, zb, busy, timber, braces=True):
    """Timber framing on one storey's face: corner posts, posts in the clear bays, a sill and a head rail, braces."""
    posts = [x0 + 0.04, x1 - 0.16]
    for xx in [x0 + (x1 - x0) * t for t in (0.25, 0.5, 0.75)]:
        if not any(a <= xx <= b for a, b in busy):
            posts.append(xx)
    for xx in posts:
        k.box(xx, face - 0.02, za, xx + 0.12, face + 0.035, zb, (timber, 0.1), 'timber')
    rails = (za, zb - 0.12) if zb - za < 1.5 else (za, za + (zb - za) * 0.52, zb - 0.12)
    for zz in rails:
        k.box(x0 + 0.04, face - 0.02, zz, x1 - 0.04, face + 0.035, zz + 0.12, (timber, 0.1), 'timber')
    if braces:
        ps = sorted(posts)
        for a, b in zip(ps, ps[1:]):
            if b - a > 0.5 and not any(not (b < p0 or a > p1) for p0, p1 in busy):
                k.tube((a + 0.12, face + 0.01, za + 0.12), (b, face + 0.01, zb - 0.12), 0.035, timber, 'timber', verts=4)


def rich_house(k, x0, x1, r_back, r_front, wall_h=2.0, rise=1.3, roof=W.ROOF_GREEN, wall=W.PLASTER, timber=W.WOOD_DD,
               door_x=None, windows=(), windows_up=(), chimney=None, sign=None, lanterns=(), stone=False, base=W.SALT[2]):
    """assets_town.house, richer: same arguments and footprint, returns (ridge row, ridge z)."""
    rng = k.rng
    wall_h *= 1.1
    rise *= 0.9
    if wall == W.PLASTER:
        wall = rng.choice((W.PLASTER, '#e8d8b8', '#e4c8b0', '#d8dccc', '#e8dcc8', '#d4c4a4'))
    if timber == W.WOOD_DD:
        timber = rng.choice((W.WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028'))
    shutters = rng.choice(('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#2a3a4a', '#7a6a3a', '#3a6a6a'))
    trim = rng.choice(TRIMS)
    pstone = rng.choice(STONES)
    if base == W.SALT[2]:
        base = rng.choice(STONES)
    blooms = rng.choice((('#e04060', '#f0d040'), ('#a060d0', '#f0f0f0'), ('#e07030', '#f0d040'), ('#f080b0', '#ffffff'), ('#e04040', '#f0a0c0')))
    kind = 'thatch' if is_thatch(roof) else 'clay' if is_clay(roof) else 'shingle'
    two = bool(windows_up)
    jet = 0.3 if two and not stone else 0.0          # a two-storey timber house: the upper floor juts out over the street
    zf = 1.75 if jet else wall_h
    rl = r_front - jet                                # the ground floor's face
    # footing and a plinth of rough stones under the ground floor
    k.box(x0 - 0.04, r_back - 0.04, 0, x1 + 0.04, rl + 0.04, 0.36, (shade(base, 0.85), 0.12), 'footing', bevel=0.02)
    x = x0 - 0.04
    while x < x1:
        sw = rng.uniform(0.28, 0.5)
        xb = min(x + sw, x1 + 0.04)
        k.box(x + 0.02, rl + 0.04, 0.02, xb - 0.02, rl + 0.075, rng.uniform(0.3, 0.36), (shade(base, rng.uniform(0.86, 1.12)), 0.14), 'plinth_stone', bevel=0.012)
        x = xb
    k.box(x0 + 0.04, r_back + 0.04, 0.36, x1 - 0.04, rl - 0.02, zf, (wall, 0.16 if stone else 0.08), 'house_wall')
    if jet:
        k.box(x0 + 0.04, r_back + 0.04, zf, x1 - 0.04, r_front - 0.02, wall_h, (wall, 0.08), 'house_wall')
        k.box(x0 + 0.02, r_front - 0.07, zf - 0.15, x1 - 0.02, r_front + 0.01, zf + 0.03, (timber, 0.1), 'timber')    # the bressumer
        x = x0 + 0.14
        while x < x1 - 0.14:                                                                              # joist ends
            k.box(x, rl - 0.02, zf - 0.14, x + 0.1, r_front - 0.07, zf - 0.04, (timber, 0.1), 'joist')
            x += 0.34
        for xb in (x0 + 0.1, x1 - 0.1):                                                                   # curved brackets
            k.tube((xb, rl + 0.03, zf - 0.6), (xb, r_front - 0.05, zf - 0.15), 0.045, timber, 'timber', verts=4)
    busy_lo = [(wx - 0.65, wx + 0.65) for wx, _ in windows] + ([(door_x - 0.85, door_x + 0.85)] if door_x is not None else [])
    busy_up = [(wx - 0.55, wx + 0.55) for wx, _ in windows_up]
    if stone:
        z, i = 0.36, 0
        while z < wall_h - 0.1:
            x = x0 + (0.0 if i % 2 else 0.25)
            while x < x1:
                k.box(max(x, x0 + 0.04), rl - 0.03, z + 0.015, min(x + 0.48, x1 - 0.04), rl + 0.0, z + 0.27,
                      (shade(wall, rng.uniform(0.85, 1.1)), 0.14), 'stone_block')
                x += 0.5
            z, i = z + 0.29, i + 1
        z, i = 0.36, 0
        while z < wall_h - 0.12:
            for xc, s in ((x0, 1), (x1, -1)):
                ln = 0.42 if i % 2 else 0.26
                xa, xb = (xc + 0.02, xc + ln) if s > 0 else (xc - ln, xc - 0.02)
                k.box(xa, rl - 0.035, z + 0.01, xb, rl + 0.02, z + 0.27, (shade(wall, 1.22), 0.08), 'quoin', bevel=0.01)
            z, i = z + 0.29, i + 1
    elif jet:
        _frame(k, rl, x0, x1, 0.36, zf - 0.15, busy_lo, timber)
        _frame(k, r_front, x0, x1, zf + 0.03, wall_h, busy_up, timber)
    else:
        _frame(k, rl, x0, x1, 0.36, wall_h, busy_lo + busy_up, timber)
    for xx in (x0 + 0.04, x1 - 0.16):
        if not stone:
            k.box(xx, r_back + 0.04, 0.36, xx + 0.12, rl, 0.48, (timber, 0.1), 'timber')
    # the roof
    over = 0.34 if kind == 'thatch' else (0.26 if two else 0.36)
    if kind == 'thatch' and x1 - x0 >= 6.0:
        rm, zr = hipped_thatch(k, x0, x1, r_back, r_front, wall_h, rise, roof, over=over)
    elif kind == 'thatch':
        rm, zr = thatch_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, wall, over=over)
    elif kind == 'clay':
        rm, zr = pantile_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, wall, over=over)
    else:
        rm, zr = W._gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, over=over)
    if kind != 'thatch':
        rafter_ends(k, x0 - over, x1 + over, r_front, over, wall_h, timber)
        scallop_trim(k, x0 - over, x1 + over, r_front + over + 0.045, wall_h, trim)
        for xe in (x0 - over - 0.02, x1 + over + 0.02):
            k.cone(xe, rm, zr + 0.06, zr + 0.36, 0.055, 0.0, W.WOOD_DD, 'finial', verts=6)
            k.sphere(xe, rm, zr + 0.36, 0.045, 0.045, W.BRASS, 'finial', segs=8)
    # the door: a gabled porch bay where there's room, a canopy, or (under a sign or an upper window) lanterns either side
    bay, bw, rf_door = False, 0.0, rl
    if door_x is not None:
        near = min([abs(wx - door_x) for wx, _ in windows] or [9.0])
        over_door = any(abs(wx - door_x) < 1.0 for wx, _ in windows_up)
        bw = min(1.6, 2 * near - 0.8)
        if bw >= 1.1 and not two and x1 - x0 >= 3.3:
            rf_door = cross_gable(k, door_x, rl, wall_h, rise, wall_h - 0.06, r_front + over, rm, zr, roof, wall, timber, w=bw)
            bay = True
        if over_door:
            W.door(k, door_x, rf_door, w=0.78, h=1.38, col=rng.choice(('#5a3e22', '#3a5a4a', '#6a2a2a', '#2e4a6a')))
            k.box(door_x - 0.62, rf_door + 0.36, -0.02, door_x + 0.62, rf_door + 0.56, 0.035, (pstone, 0.14), 'step')
            k.box(door_x - 0.26, rf_door + 0.14, 0.06, door_x + 0.26, rf_door + 0.32, 0.075, ('#8a3a2a', 0.2), 'doormat')
            for sd in (-1, 1):
                W.wall_lantern(k, door_x + sd * 0.64, rf_door + 0.02, z=1.3, energy=9)
        else:
            rich_door(k, door_x, rf_door, roof, lamp_side=rng.choice((-1, 1)), stone=pstone, bay=bay)
        if bay:
            W.wall_lantern(k, door_x + rng.choice((-1, 1)) * (bw / 2 - 0.12), rf_door + 0.02, z=1.45, energy=9)
    for (wx, wz) in windows:
        sides = (-1, 1)
        if bay and abs(wx - door_x) < bw / 2 + 0.75:
            sides = (-1,) if wx < door_x else (1,)
        h = 0.6 if jet else 0.68
        rich_window(k, wx, rl + 0.02, wz, h=h, shutters=shutters, box=True, stone=pstone, blooms=blooms, sides=sides)
    for (wx, wz) in windows_up:
        over_door_w = door_x is not None and abs(wx - door_x) < 1.0     # the sign over the door hangs there: no box
        rich_window(k, wx, r_front + 0.02, max(zf + 0.16, wz - 0.12), w=0.5, h=0.56, shutters=shutters, box=not over_door_w,
                    stone=pstone, blooms=blooms)
    if not bay and x1 - x0 >= 3.6 and kind != 'thatch':
        dx = x0 + (x1 - x0) * rng.uniform(0.35, 0.65)
        if chimney is None or abs(dx - chimney) >= 0.9:
            W.dormer(k, dx, r_front + over, rm, wall_h - 0.06, zr, roof, wall, shutters)
    if rng.random() < 0.3 and kind != 'thatch':
        W.weathervane(k, rng.choice((x0 + 0.3, x1 - 0.3)), rm, zr + 0.08)
    if chimney:
        ra_ = r_front + over
        rz = zr - (zr - wall_h + 0.06) * ((rm + 0.05) - rm) / max(0.1, ra_ - rm)
        W.chimney_stack(k, chimney, rm - 0.4, rm + 0.05, wall_h, zr + 1.0, roof_z=rz, pots=2)
    W.dress_front(k, x0, x1, rl, zf if jet else wall_h, None,
                  [w[0] for w in windows] + ([] if jet else [w[0] for w in windows_up]) + ([door_x] if door_x else []), ivy=0.75, pots=0.0)
    if door_x is not None and rng.random() < 0.5 and not any(abs(wx - door_x) < 1.0 for wx, _ in windows_up):
        side = rng.choice((-1, 1))
        rx = door_x + side * (0.95 if bay else 0.7)
        if not any(abs(rx - wx) < 0.55 for wx, _ in windows):
            with k.foliage('leaf'):
                for j in range(14):
                    z = 0.35 + ((zf if jet else wall_h) - 0.5) * j / 14
                    k.blob(rx + rng.uniform(-0.14, 0.14), rl + 0.06, z, rng.uniform(0.06, 0.1), 0.05, 0.08,
                           shade('#2e5a2a', rng.uniform(0.9, 1.1)), 'ivy', segs=8)
            for j in range(9):
                k.sphere(rx + rng.uniform(-0.16, 0.16), rl + 0.11, rng.uniform(0.5, (zf if jet else wall_h) - 0.2), 0.045, 0.04,
                         rng.choice(('#f080a0', '#e04870', '#fff0f4')), 'rose', segs=6)
    if rng.random() < 0.7:
        barrel(k, x1 + 0.3, rl - 0.3, h=0.62, radius=0.24)
        if rng.random() < 0.6:
            barrel(k, x1 + 0.32, rl - 0.85, h=0.55, radius=0.22, tone='#7a5a34')
    if door_x is not None and rng.random() < 0.6:
        cat(k, door_x + rng.choice((-0.3, 0.3)), rf_door + 0.26, 0.06)
    if sign:
        W.hanging_sign(k, sign[0], r_front, sign[1], icon=sign[2])
    for lx in lanterns:
        W.wall_lantern(k, lx, r_front + 0.02)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


def install():
    """Use the richer kit for every scene built from now on (this process only)."""
    W.house = rich_house
    V.shop_window = bay_shop
    F.dirt_path = _dirt_path
