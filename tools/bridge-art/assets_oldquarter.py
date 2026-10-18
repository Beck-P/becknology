"""Lantern Row, Arcadia's old quarter (tools/bridge-art/scenes/arcadia_oldquarter.py and its shrine roof): what the
city was before the towers — two-storey timber shophouses under curved tile roofs, lattice fronts and noren, paper
lanterns strung over a wet stone lane, a tea house open to the street, a rooftop shrine, and the Loop's viaduct
striding over all of it. Tile units: x = column, r = row (toward the camera), z = height.
"""
import math

from scenekit import shade
import assets_cyber as Y
import assets_house as HK
import assets_signs as SG

C45 = math.cos(math.radians(45))
TIMBER = '#3a2418'
TIMBER_L = '#5a3a24'
PLASTER = ('#c8bca4', '#b8ac94', '#d4c8ae', '#a89c88')
KAWARA = ('#4a5064', '#545a6e', '#46485a')        # the roof tiles: blue-grey fired clay, wet
STONE = ('#5a5660', '#4e4a54', '#66626c')
VERMILION = '#b8341e'


# ---- roofs ------------------------------------------------------------------------------------------------------
def tile_roof(k, x0, x1, r_back, r_front, z_eave, rise, col=KAWARA[0], wall=PLASTER[0], over=0.32):
    """A gable of fired-clay tiles along x (HK.pantile_roof's courses), its eave corners swept up and a ridge with
    the end tiles (onigawara) standing up at either end."""
    rm, zr = HK.pantile_roof(k, x0, x1, r_back, r_front, z_eave, rise, col, wall, over=over)
    ra = r_front + over
    for xe, s in ((x0 - over, -1), (x1 + over, 1)):                     # the swept-up corners
        k.tube((xe - s * 0.25, ra, z_eave - 0.06), (xe + s * 0.06, ra + 0.08, z_eave + 0.14), 0.05, shade(col, 0.8),
               'roof_corner', verts=6)
        k.box(xe - 0.1, rm - 0.12, zr - 0.02, xe + 0.1, rm + 0.12, zr + 0.3, shade(col, 0.7), 'roof_ridge_end', bevel=0.03)
        k.tube((xe, rm, zr + 0.3), (xe + s * 0.08, rm, zr + 0.42), 0.035, shade(col, 0.7), 'roof_ridge_end', verts=5)
    return rm, zr


def gable_roof(k, x0, x1, r_back, r_front, z_eave, rise, col=KAWARA[0], wall=PLASTER[0], over=0.28):
    """A gable end to the lane (the roof's ridge running back from the street): two tiled slopes falling left and
    right in courses of rounded tiles, a lit crown on every column, the barge boards swept up at the eaves, a ridge of
    big tiles with an end tile standing up over the gable, and the gable itself plastered over a timber frame with a
    little vent."""
    rng = k.rng
    xm = (x0 + x1) / 2
    zr = z_eave + rise
    xa, xb = x0 - over, x1 + over
    ze = z_eave - 0.08
    ra, rb = r_front + over, r_back - 0.1
    for (xe, sgn) in ((xa, -1), (xb, 1)):
        k.poly([(xm, rb, zr), (xm, ra, zr), (xe, ra, ze), (xe, rb, ze)], shade(col, 0.45), 'roof_deck')
        pans, crowns, laps = {}, [], []
        r = rb
        while r < ra - 0.02:
            r1 = min(ra, r + 0.25)
            f = rng.choices((1.0, 0.9, 1.1, 0.8), (0.6, 0.18, 0.16, 0.06))[0]
            c = shade(col, (0.95 if sgn < 0 else 0.82) * f)
            pans.setdefault(c, []).append(((xm, r, zr + 0.02), (xm, r1 - 0.06, zr + 0.02), (xe, r1 - 0.06, ze + 0.02), (xe, r, ze + 0.02)))
            crowns.append(((xm, r1 - 0.08, zr + 0.07), (xm, r1, zr + 0.07), (xe, r1, ze + 0.07), (xe, r1 - 0.08, ze + 0.07)))
            r = r1
        n = max(3, int(abs(xm - xe) / 0.28))
        for i in range(1, n):
            t = i / n
            x = xm + (xe - xm) * t
            z = zr + (ze - zr) * t
            laps.append(((x, rb, z + 0.08), (x, ra, z + 0.08), (x + sgn * 0.035, ra, z + 0.08 - 0.03), (x + sgn * 0.035, rb, z + 0.08 - 0.03)))
        for c, qs in pans.items():
            k.quads(qs, c, 'roof_tile')
        k.quads(crowns, shade(col, 1.25 if sgn < 0 else 1.05), 'roof_tile')
        k.quads(laps, shade(col, 0.55), 'roof_tile')
        k.tube((xm, ra + 0.04, zr + 0.05), (xe - sgn * 0.05, ra + 0.04, ze + 0.02), 0.045, shade(col, 0.7), 'roof_barge', verts=6)
        k.tube((xe - sgn * 0.05, ra + 0.04, ze + 0.02), (xe + sgn * 0.12, ra + 0.1, ze + 0.2), 0.045, shade(col, 0.7), 'roof_barge', verts=6)
    k.tube((xm, rb, zr + 0.09), (xm, ra + 0.04, zr + 0.09), 0.1, shade(col, 0.68), 'roof_ridge', verts=8)
    k.box(xm - 0.12, ra - 0.04, zr + 0.02, xm + 0.12, ra + 0.12, zr + 0.36, shade(col, 0.62), 'roof_ridge_end', bevel=0.03)
    k.poly([(x0, r_front, z_eave), (x1, r_front, z_eave), (xm, r_front, zr - 0.04)], (wall, 0.1), 'gable')
    k.box(x0, r_front, z_eave - 0.04, x1, r_front + 0.05, z_eave + 0.04, (TIMBER, 0.1), 'beam')
    k.tube((xm, r_front + 0.03, z_eave), (xm, r_front + 0.03, zr - 0.1), 0.03, TIMBER, 'king_post', verts=4)
    for s_ in (-1, 1):
        k.tube((xm + s_ * (x1 - x0) * 0.22, r_front + 0.03, z_eave), (xm + s_ * (x1 - x0) * 0.22, r_front + 0.03,
               z_eave + rise * 0.5), 0.025, TIMBER, 'gable_strut', verts=4)
    k.box(xm - 0.16, r_front + 0.01, z_eave + rise * 0.35, xm + 0.16, r_front + 0.05, z_eave + rise * 0.6, '#1a1214', 'gable_vent')
    return zr


def pent(k, x0, x1, r_face, z, d=0.6, col=KAWARA[1], drop=0.32):
    """The tiled skirt over a shophouse's ground floor (hisashi): courses of tiles sloping out from the wall on two
    timber brackets at each end."""
    n = 4
    rows = []
    for i in range(n):
        ra = r_face + d * i / n
        rb = r_face + d * (i + 1.2) / n
        za = z - drop * i / n
        zb = z - drop * (i + 1.2) / n
        rows.append(((x0 - 0.1, ra, za + 0.03), (x1 + 0.1, ra, za + 0.03), (x1 + 0.1, rb, zb + 0.03), (x0 - 0.1, rb, zb + 0.03)))
    k.quads(rows[::2], shade(col, 1.0), 'roof_tile')
    k.quads(rows[1::2], shade(col, 0.88), 'roof_tile')
    x = x0 - 0.1
    caps = []
    while x < x1 + 0.1:                                                     # the rounded tile columns' crowns
        caps.append(((x, r_face, z + 0.08), (x + 0.07, r_face, z + 0.08), (x + 0.07, r_face + d, z - drop + 0.08), (x, r_face + d, z - drop + 0.08)))
        x += 0.24
    k.quads(caps, shade(col, 1.15), 'roof_tile')
    k.box(x0 - 0.1, r_face + d - 0.03, z - drop - 0.04, x1 + 0.1, r_face + d + 0.04, z - drop + 0.06, shade(col, 0.7), 'roof_eave')
    for xb in (x0 + 0.05, x1 - 0.05):
        k.tube((xb, r_face, z - 0.45), (xb, r_face + d * 0.8, z - drop * 0.8), 0.035, TIMBER, 'bracket', verts=5)


# ---- the shophouse ----------------------------------------------------------------------------------------------
def lattice(k, x0, x1, r, z0, z1, col=TIMBER_L, step=0.07):
    k.boxes([(x, r, z0, x + 0.025, r + 0.03, z1) for x in [x0 + i * step for i in range(int((x1 - x0) / step) + 1)]],
            col, 'lattice')
    k.box(x0, r, z0, x1, r + 0.035, z0 + 0.04, shade(col, 0.8), 'lattice_rail')
    k.box(x0, r, z1 - 0.04, x1, r + 0.035, z1, shade(col, 0.8), 'lattice_rail')


def noren(k, x0, x1, r, z_top, h=0.42, col='#1e2a4a', mark='#e8e0d0', n=None):
    n = n or max(2, int((x1 - x0) / 0.3))
    w = (x1 - x0) / n
    for i in range(n):
        k.box(x0 + i * w + 0.012, r, z_top - h, x0 + (i + 1) * w - 0.012, r + 0.02, z_top, (col, 0.06), 'noren')
    k.box(x0 + w * (n / 2 - 0.5) + 0.08, r + 0.021, z_top - h * 0.62, x0 + w * (n / 2 + 0.5) - 0.08, r + 0.024, z_top - h * 0.3,
          mark, 'noren_mark')
    k.tube((x0 - 0.05, r + 0.01, z_top + 0.02), (x1 + 0.05, r + 0.01, z_top + 0.02), 0.018, TIMBER, 'noren_rod', verts=5)


def shophouse(k, x0, x1, r_front, depth=1.7, ground='lattice', glow='#ffb060', roof=KAWARA[0], wall=None, upper='frame',
              rise=0.85, balcony=False, rng=None, door_x=None, pent_col=None, storeys=2):
    """An old two-storey shophouse facing the lane: a timber ground floor (`lattice` — koshi slats over lit paper,
    a sliding door; `open` — a shop counter open to the lane, lit inside; `shutter` — wooden storm boards up), a tiled
    pent roof over it, a plastered upper floor framed in timber (`frame`) or with slatted windows (`slats`), a balcony
    rail, and the curved tile roof. Returns the eave height."""
    rng = rng or k.rng
    wall = wall or rng.choice(PLASTER)
    rb = r_front - depth
    G, U = 1.35, 1.15
    H = G + U * (storeys - 1)
    k.box(x0, rb, 0.0, x1, r_front, H, (wall, 0.12), 'house_wall')
    k.box(x0 - 0.02, r_front - 0.02, 0.0, x1 + 0.02, r_front + 0.05, 0.16, STONE[0], 'house_plinth')
    for xp in (x0 + 0.03, x1 - 0.03):                                       # corner posts
        k.box(xp - 0.06, r_front - 0.02, 0.0, xp + 0.06, r_front + 0.06, H, (TIMBER, 0.1), 'post')
    k.box(x0, r_front, G - 0.1, x1, r_front + 0.07, G + 0.02, (TIMBER, 0.1), 'beam')
    dx = door_x if door_x is not None else (x0 + x1) / 2
    # ---- ground floor
    if ground == 'lattice':
        k.box(x0 + 0.1, r_front + 0.0, 0.16, x1 - 0.1, r_front + 0.01, G - 0.1, shade(glow, 0.55), 'shoji', emit=(glow, 0.55))
        lattice(k, x0 + 0.1, x1 - 0.1, r_front + 0.02, 0.16, G - 0.1)
        k.box(dx - 0.36, r_front + 0.0, 0.16, dx + 0.36, r_front + 0.06, G - 0.1, shade(glow, 0.6), 'door_open', emit=(glow, 0.8))
        k.box(dx - 0.4, r_front + 0.05, 0.0, dx + 0.4, r_front + 0.25, 0.08, STONE[1], 'step')
    elif ground == 'shutter':
        k.boxes([(x, r_front + 0.0, 0.16, x + 0.2, r_front + 0.03, G - 0.1) for x in
                 [x0 + 0.1 + i * 0.21 for i in range(int((x1 - x0 - 0.2) / 0.21))]], (shade(TIMBER_L, 0.85), 0.12), 'storm_board')
        k.box(x0 + 0.1, r_front + 0.03, 0.6, x1 - 0.1, r_front + 0.05, 0.66, TIMBER, 'board_rail')
    elif ground == 'open':
        k.box(x0 + 0.1, r_front - 0.8, 0.0, x1 - 0.1, r_front - 0.78, G - 0.1, shade(glow, 0.5), 'shop_back', emit=(glow, 0.65))
        k.box(x0 + 0.1, r_front - 0.8, 0.0, x1 - 0.1, r_front, 0.02, ('#5a4030', 0.1), 'floor_boards')
        k.point_light(dx, r_front - 0.2, 1.0, glow, 18, radius=0.4, group='flicker')
    pent(k, x0, x1, r_front + 0.05, G + 0.12, d=0.45, drop=0.2, col=pent_col or shade(roof, 1.08))
    # ---- upper floor
    if storeys > 1:
        z = G + 0.25
        if upper == 'frame':
            for xp in [x0 + (x1 - x0) * t for t in (0.33, 0.66)]:
                k.box(xp - 0.04, r_front, G, xp + 0.04, r_front + 0.04, H, (TIMBER, 0.1), 'post')
            k.box(x0, r_front, z + 0.55, x1, r_front + 0.04, z + 0.6, (TIMBER, 0.1), 'beam')
        n = max(1, int((x1 - x0) / 1.1))
        for i in range(n):
            cx = x0 + (i + 0.5) * (x1 - x0) / n
            lit = rng.random() < 0.65
            gcol = rng.choice(('#ffc070', '#ffb060', '#ffd890', '#ff9a60'))
            k.box(cx - 0.32, r_front + 0.01, z, cx + 0.32, r_front + 0.02, z + 0.52, shade(gcol, 0.5) if lit else '#1a1418',
                  'window_paper', emit=(gcol, 0.6) if lit else None)
            if upper == 'slats':
                k.boxes([(cx - 0.32 + j * 0.08, r_front + 0.02, z, cx - 0.3 + j * 0.08, r_front + 0.06, z + 0.52) for j in range(9)],
                        TIMBER, 'slats')
            else:
                lattice(k, cx - 0.32, cx + 0.32, r_front + 0.02, z, z + 0.52, step=0.11)
            k.box(cx - 0.36, r_front + 0.02, z - 0.05, cx + 0.36, r_front + 0.1, z, TIMBER, 'sill')
        if balcony:
            k.box(x0 + 0.1, r_front, z - 0.08, x1 - 0.1, r_front + 0.4, z - 0.02, ('#4a3020', 0.1), 'balcony_floor')
            k.box(x0 + 0.1, r_front + 0.36, z + 0.32, x1 - 0.1, r_front + 0.4, z + 0.36, TIMBER, 'balcony_rail')
            k.boxes([(x, r_front + 0.36, z - 0.02, x + 0.03, r_front + 0.39, z + 0.32) for x in
                     [x0 + 0.15 + i * 0.16 for i in range(int((x1 - x0 - 0.3) / 0.16) + 1)]], TIMBER, 'balcony_post')
    gable_roof(k, x0, x1, rb, r_front, H, max(rise, (x1 - x0) * 0.22), col=roof, wall=wall)
    k.solid(x0, rb, x1, r_front)
    return H


# ---- small life -------------------------------------------------------------------------------------------------
def stone_lantern(k, cx, cr, h=1.1, lit=True, col='#ffb060'):
    """A tōrō: a stone post, a fire box with a lit window, a wide cap and a jewel on top."""
    s = h / 1.1
    k.box(cx - 0.2 * s, cr - 0.2 * s, 0.0, cx + 0.2 * s, cr + 0.2 * s, 0.1 * s, (STONE[0], 0.12), 'lantern_stone_base')
    k.cyl(cx, cr, 0.1 * s, 0.55 * s, 0.07 * s, (STONE[1], 0.12), 'lantern_stone_post', verts=8)
    k.box(cx - 0.17 * s, cr - 0.17 * s, 0.55 * s, cx + 0.17 * s, cr + 0.17 * s, 0.62 * s, (STONE[0], 0.12), 'lantern_stone_shelf')
    k.box(cx - 0.12 * s, cr - 0.12 * s, 0.62 * s, cx + 0.12 * s, cr + 0.12 * s, 0.84 * s, (STONE[2], 0.12), 'lantern_stone_box')
    if lit:
        k.box(cx - 0.07 * s, cr + 0.115 * s, 0.67 * s, cx + 0.07 * s, cr + 0.13 * s, 0.8 * s, shade(col, 0.5), 'lantern_stone_fire',
              emit=(col, 0.95))
        k.point_light(cx, cr + 0.25, 0.75 * s, col, 6 * s, radius=0.1, group='flicker')
    k.cone(cx, cr, 0.84 * s, 1.0 * s, 0.27 * s, 0.05 * s, (STONE[1], 0.12), 'lantern_stone_cap', verts=6)
    k.sphere(cx, cr, 1.04 * s, 0.05 * s, 0.06 * s, STONE[2], 'lantern_stone_jewel', segs=8)
    k.solid(cx - 0.22, cr - 0.22, cx + 0.22, cr + 0.22)


def torii(k, cx, cr, w=2.0, h=2.3, col=VERMILION):
    """A shrine gate: two posts with black feet, the tie beam, the upswept top beam over a black cap."""
    for s in (-1, 1):
        x = cx + s * w / 2
        k.cyl(x, cr, 0.0, h, 0.09, (col, 0.08), 'torii_post', verts=10)
        k.cyl(x, cr, 0.0, 0.3, 0.11, '#14100e', 'torii_foot', verts=10)
        k.solid_post(x, cr)
    k.box(cx - w / 2 - 0.25, cr - 0.08, h - 0.55, cx + w / 2 + 0.25, cr + 0.08, h - 0.42, (col, 0.08), 'torii_beam')
    k.box(cx - 0.08, cr - 0.06, h - 0.42, cx + 0.08, cr + 0.06, h - 0.08, (col, 0.08), 'torii_strut')
    pts = 7
    for i in range(pts - 1):                                                # the top beam, swept up at its ends
        t0, t1 = i / (pts - 1), (i + 1) / (pts - 1)
        xa, xb = cx - w / 2 - 0.45 + t0 * (w + 0.9), cx - w / 2 - 0.45 + t1 * (w + 0.9)
        za = h + 0.12 * (2 * t0 - 1) ** 2
        zb = h + 0.12 * (2 * t1 - 1) ** 2
        k.tube((xa, cr, za - 0.04), (xb, cr, zb - 0.04), 0.09, (col, 0.08), 'torii_kasagi', verts=6, smooth=False)
        k.tube((xa, cr, za + 0.07), (xb, cr, zb + 0.07), 0.07, '#141012', 'torii_cap', verts=6, smooth=False)


def shimenawa(k, xa, xb, r, z, sag=0.1):
    """A twisted straw rope with paper streamers (shide) hanging off it."""
    n = 8
    pts = [(xa + (xb - xa) * i / n, r, z - sag * math.sin(math.pi * i / n)) for i in range(n + 1)]
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.05, ('#c8b070', 0.1), 'shimenawa', verts=6)
    for i in (2, 4, 6):
        x, _, zz = pts[i]
        for j in range(3):
            k.box(x - 0.04, r + 0.03, zz - 0.12 - j * 0.09, x + 0.04, r + 0.035, zz - 0.06 - j * 0.09, '#f4f0e6', 'shide')


def bicycle(k, cx, cr, col='#2a6a5a'):
    for s in (-1, 1):
        x = cx + s * 0.36
        k.cyl_y(x, cr - 0.02, cr + 0.02, 0.24, 0.24, 0.24, '#141418', 'bike_tyre', verts=18)
        k.cyl_y(x, cr - 0.025, cr + 0.025, 0.24, 0.17, 0.17, '#4a4a54', 'bike_rim', verts=18)
    for a, b in (((cx - 0.36, 0.24), (cx - 0.02, 0.24)), ((cx - 0.02, 0.24), (cx + 0.2, 0.55)), ((cx - 0.36, 0.24), (cx - 0.12, 0.55)),
                 ((cx - 0.12, 0.55), (cx + 0.2, 0.55)), ((cx - 0.12, 0.55), (cx - 0.02, 0.24)), ((cx + 0.2, 0.55), (cx + 0.36, 0.24))):
        k.tube((a[0], cr, a[1]), (b[0], cr, b[1]), 0.022, col, 'bike_frame', verts=6)
    k.tube((cx + 0.2, cr, 0.55), (cx + 0.24, cr, 0.7), 0.02, '#3a3a44', 'bike_stem', verts=5)
    k.tube((cx + 0.24, cr - 0.16, 0.7), (cx + 0.24, cr + 0.16, 0.7), 0.018, '#3a3a44', 'bike_bars', verts=5)
    k.box(cx - 0.2, cr - 0.05, 0.6, cx - 0.04, cr + 0.05, 0.64, '#1a1a1e', 'bike_seat', bevel=0.01)
    k.box(cx + 0.28, cr - 0.12, 0.5, cx + 0.5, cr + 0.12, 0.66, ('#8a6a3a', 0.12), 'bike_basket')
    k.solid_post(cx, cr)


def sake_barrels(k, cx, cr, n=3):
    """Straw-wrapped sake casks stacked by a door, their brands painted on."""
    for i in range(n):
        x = cx + (i - (n - 1) / 2) * 0.46
        k.cyl(x, cr, 0.0, 0.55, 0.22, ('#d8c890', 0.1), 'sake_cask', verts=14)
        k.cyl(x, cr, 0.12, 0.16, 0.225, '#3a2a1a', 'sake_rope', verts=14)
        k.cyl(x, cr, 0.42, 0.46, 0.225, '#3a2a1a', 'sake_rope', verts=14)
        k.box(x - 0.1, cr + 0.2, 0.2, x + 0.1, cr + 0.225, 0.38, ('#a01818', '#1a2a5a', '#1a1a1a')[i % 3], 'sake_brand')
        k.cyl(x, cr, 0.55, 0.58, 0.2, '#8a6a3a', 'sake_lid', verts=14)
    k.solid(cx - n * 0.23, cr - 0.25, cx + n * 0.23, cr + 0.25)


def potted_plant(k, cx, cr, kind='bamboo', s=1.0):
    k.cyl(cx, cr, 0.0, 0.32 * s, 0.17 * s, ('#2a2a34', 0.1), 'pot', verts=10)
    if kind == 'bamboo':
        for i in range(5):
            a = i * 1.3
            x, r = cx + math.cos(a) * 0.07, cr + math.sin(a) * 0.05
            top = (1.1 + (i % 3) * 0.25) * s
            k.cyl(x, r, 0.3 * s, top, 0.02, '#4a7a3a', 'bamboo', verts=5)
            for j in range(3):
                z = 0.6 * s + j * 0.25 * s
                k.blob(x + 0.08, r, z, 0.12, 0.04, 0.03, ('#5a9a40', 0.2), 'leaves', segs=6, rot=(0, 0.4, a))
    else:                                                                           # a bonsai pine
        k.tube((cx, cr, 0.3 * s), (cx + 0.1, cr, 0.6 * s), 0.035, '#3a2618', 'trunk', verts=6)
        for (dx, dz, rr) in ((0.15, 0.62, 0.17), (-0.08, 0.7, 0.13), (0.05, 0.8, 0.11)):
            k.blob(cx + dx, cr, dz * s, rr, rr * 0.8, rr * 0.45, ('#2e5a34', 0.2), 'leaves', segs=8)
    k.solid(cx - 0.18, cr - 0.18, cx + 0.18, cr + 0.18)


def cat(k, cx, cr, z=0.0, col='#e8a050'):
    k.blob(cx, cr, z + 0.11, 0.15, 0.09, 0.09, (col, 0.1), 'cat', segs=10)
    k.sphere(cx + 0.14, cr + 0.03, z + 0.2, 0.065, 0.065, col, 'cat', segs=8)
    for s in (-1, 1):
        k.cone(cx + 0.14 + s * 0.035, cr + 0.03, z + 0.24, 0.31, 0.025, 0.004, col, 'cat_ear', verts=4)
    k.tube((cx - 0.14, cr, z + 0.08), (cx - 0.26, cr + 0.1, z + 0.18), 0.02, col, 'cat_tail', verts=5)


def goldfish_stall(k, x0, x1, r0, r1):
    """Kingyo-sukui: shallow tubs of water with goldfish turning in them, paper scoops in a rack, a striped awning."""
    k.box(x0, r0, 0.0, x1, r1, 0.42, ('#3a5a7a', 0.1), 'stall_base')
    n = int((x1 - x0) / 0.8)
    for i in range(n):
        cx = x0 + (i + 0.5) * (x1 - x0) / n
        k.box(cx - 0.34, r0 + 0.08, 0.42, cx + 0.34, r1 - 0.08, 0.5, '#5a8ab0', 'tub')
        k.box(cx - 0.3, r0 + 0.12, 0.46, cx + 0.3, r1 - 0.12, 0.49, '#123a5a', 'basin_water', emit=('#2a6a9a', 0.25))
        for j in range(4):
            fx = cx - 0.22 + ((i * 7 + j * 3) % 9) * 0.05
            fr = r0 + 0.2 + ((i + j * 5) % 7) * (r1 - r0 - 0.4) / 7
            k.blob(fx, fr, 0.495, 0.045, 0.025, 0.012, '#ff6a20', 'goldfish', emit=('#ff7a30', 0.35), segs=6)
    for i in range(6):
        k.cyl(x1 - 0.2, r0 + 0.1 + i * 0.07, 0.5, 0.52, 0.06, '#f4f0e6', 'scoop', verts=10)
    for x in (x0, x1):
        k.box(x - 0.04, r0 - 0.04, 0.0, x + 0.04, r0 + 0.04, 1.9, TIMBER, 'stall_post')
    stripes = int((x1 - x0) / 0.3)
    for i in range(stripes):
        a = x0 - 0.1 + i * (x1 - x0 + 0.2) / stripes
        b = a + (x1 - x0 + 0.2) / stripes
        k.poly([(a, r1 + 0.25, 1.65), (b, r1 + 0.25, 1.65), (b, r0 - 0.1, 2.0), (a, r0 - 0.1, 2.0)],
               (('#d83a3a' if i % 2 == 0 else '#f0ece0'), 0.1), 'awning')
    SG.letters(k, '金魚', 'DelaGothicOne', (x0 + x1) / 2, r1 + 0.01, 0.12, size=0.2, col='#ffd060', energy=3)
    k.solid(x0, r0 - 0.1, x1, r1)


def market_stall(k, x0, x1, r0, r1, goods='veg', awning=('#2a5a8a', '#e8e0d0'), lanterns=True):
    """A lane stall: a timber counter under a striped awning, its goods heaped in baskets and trays."""
    rng = k.rng
    k.box(x0, r0, 0.0, x1, r1, 0.75, ('#4a3020', 0.12), 'stall_counter', bevel=0.01)
    k.box(x0 - 0.04, r0 - 0.04, 0.75, x1 + 0.04, r1 + 0.06, 0.8, ('#6a4a2c', 0.12), 'stall_top')
    cols = {'veg': ('#5a9a3a', '#e05a2a', '#d8c040', '#7a3a8a', '#e8e0d0'),
            'dried': ('#8a5a2a', '#5a3a1a', '#c8a060', '#3a2a1a', '#a03a1a'),
            'fruit': ('#e84a3a', '#f0a030', '#e8d040', '#7ac040', '#c03060'),
            'charms': ('#d83a3a', '#e8c040', '#3a6ad0', '#40a060', '#f0f0f0')}[goods]
    n = int((x1 - x0) / 0.36)
    for i in range(n):
        cx = x0 + 0.2 + i * (x1 - x0 - 0.4) / max(1, n - 1)
        c = cols[i % len(cols)]
        if goods == 'charms':
            k.box(cx - 0.06, r1 - 0.12, 0.8, cx + 0.06, r1 - 0.1, 1.0, c, 'charm')
            k.cyl(cx, r1 - 0.11, 1.0, 1.08, 0.008, '#e8c040', 'charm_cord', verts=4)
        else:
            k.cyl(cx, (r0 + r1) / 2, 0.8, 0.86, 0.15, ('#8a6a3a', 0.12), 'basket', verts=10)
            for j in range(4):
                k.sphere(cx + (j % 2 - 0.5) * 0.12, (r0 + r1) / 2 + (j // 2 - 0.5) * 0.1, 0.9 + (j == 3) * 0.06, 0.06, 0.055,
                         shade(c, rng.uniform(0.85, 1.1)), 'produce', segs=6)
    for x in (x0, x1):
        k.box(x - 0.04, r0 - 0.04, 0.0, x + 0.04, r0 + 0.04, 2.0, TIMBER, 'stall_post')
    stripes = int((x1 - x0) / 0.3)
    for i in range(stripes):
        a = x0 - 0.1 + i * (x1 - x0 + 0.2) / stripes
        b = a + (x1 - x0 + 0.2) / stripes
        k.poly([(a, r1 + 0.3, 1.7), (b, r1 + 0.3, 1.7), (b, r0 - 0.1, 2.08), (a, r0 - 0.1, 2.08)],
               ((awning[i % 2]), 0.1), 'awning')
    if lanterns:
        for x in (x0 + 0.2, x1 - 0.2):
            Y.paper_lantern(k, x, r1 + 0.32, 1.42, col='#e83a2a', s=0.42, top=1.68)
    k.solid(x0, r0 - 0.1, x1, r1)


# ---- the Loop's viaduct ------------------------------------------------------------------------------------------
def viaduct(k, x0, x1, r, z, piers=(), w=1.5):
    """The Loop's track on its viaduct high over the quarter: a deck with parapets lit cyan underneath, rails and
    power posts on top, piers down behind the roofs."""
    rb, rf = r - w / 2, r + w / 2
    k.box(x0, rb, z - 0.55, x1, rf, z, ('#3a3a46', 0.08), 'viaduct_deck')
    k.box(x0, rf - 0.02, z - 0.55, x1, rf + 0.03, z - 0.5, shade(Y.CYAN, 0.4), 'viaduct_led', emit=(Y.CYAN, 0.8))
    k.boxes([(x, rf, z - 0.5, x + 0.05, rf + 0.02, z - 0.05) for x in [x0 + 0.5 + i * 1.0 for i in range(int(x1 - x0))]],
            '#2a2a34', 'viaduct_rib')
    for rr in (rb + 0.05, rf - 0.12):
        k.box(x0, rr, z, x1, rr + 0.07, z + 0.32, ('#4a4a56', 0.08), 'viaduct_parapet')
    for rr in (r - 0.3, r + 0.3):
        k.box(x0, rr - 0.03, z, x1, rr + 0.03, z + 0.06, '#8a8a96', 'viaduct_rail')
    for x in [x0 + 1.5 + i * 4.0 for i in range(int((x1 - x0) / 4.0))]:      # power posts with a lamp
        k.cyl(x, rb + 0.15, z, z + 1.1, 0.04, '#4a4a56', 'viaduct_mast', verts=6)
        k.box(x - 0.03, rb + 0.15, z + 1.05, x + 0.03, r + 0.1, z + 1.1, '#4a4a56', 'viaduct_mast_arm')
        k.sphere(x, rb + 0.15, z + 1.15, 0.045, 0.045, Y.RED, 'viaduct_beacon', emit=(Y.RED, 1.0), segs=6)
    k.box(x0, r - 0.02, z + 1.02, x1, r + 0.02, z + 1.05, '#2a2a30', 'catenary')
    for px in piers:
        k.box(px - 0.35, rb + 0.2, 0.0, px + 0.35, rb + 0.9, z - 0.55, ('#3a3a46', 0.1), 'viaduct_pier')


def station_block(k, x0, x1, r_front, z_deck, name='LANTERN ROW', depth=2.4, tag='L0'):
    """A Loop station at street level under the viaduct: concrete and steel, a wide stair going up behind glass
    doors and gates, the Loop's roundel, the station's name and the departures board."""
    rb = r_front - depth
    zt = z_deck - 0.55
    k.box(x0, rb, 0.0, x1, r_front - 2.0, zt, ('#4a4a58', 0.08), 'station_wall')            # the back, the wings, the lintel:
    k.box(x0, r_front - 2.0, 0.0, x0 + 1.6, r_front, zt, ('#4a4a58', 0.08), 'station_wall')  # an open entrance between them
    k.box(x1 - 1.6, r_front - 2.0, 0.0, x1, r_front, zt, ('#4a4a58', 0.08), 'station_wall')
    k.box(x0 + 1.6, r_front - 2.0, 2.15, x1 - 1.6, r_front, zt, ('#4a4a58', 0.08), 'station_wall')
    k.box(x0 + 1.6, r_front - 2.0, 1.95, x1 - 1.6, r_front - 1.98, 2.15, '#c8e8f0', 'station_light', emit=('#e0f8ff', 0.9))
    for (a, b) in ((x0 + 0.35, x0 + 1.6), (x1 - 1.6, x1 - 0.35)):         # glass either side of the open entrance
        k.box(a, r_front - 0.02, 0.0, b, r_front + 0.02, 2.1, '#0c1a24', 'station_glass', emit=('#1a5a6a', 0.45))
    k.box(x0 + 1.6, r_front - 2.0, 0.0, x1 - 1.6, r_front, 0.02, ('#5a5a66', 0.08), 'floor_station')
    # the stair seen through the glass: treads climbing back, lit
    for i in range(9):
        z = 0.15 + i * 0.22
        k.box(x0 + 0.9, r_front - 0.2 - i * 0.18, z - 0.04, x1 - 0.9, r_front - 0.02 - i * 0.18, z, '#9aa0b0', 'station_stair',
              emit=('#80d0e0', 0.25))
    for x in [x0 + 1.8 + i * 0.6 for i in range(int((x1 - x0 - 3.4) / 0.6) + 1)]:     # ticket gates, just inside
        k.box(x - 0.08, r_front - 0.5, 0.0, x + 0.08, r_front - 0.1, 0.85, ('#c8ccd8', 0.06), 'gate')
        k.box(x - 0.06, r_front - 0.13, 0.7, x + 0.06, r_front - 0.09, 0.8, '#0c2a20', 'gate_light', emit=(Y.GREEN, 0.95))
    for xp in (x0 + 0.2, x1 - 0.2):
        k.box(xp - 0.15, r_front - 0.05, 0.0, xp + 0.15, r_front + 0.12, z_deck - 0.55, ('#5a5a68', 0.08), 'station_pillar')
    # up the front: ribbed panels and bands of lit windows on the stair hall, rising to the platform
    k.boxes([(x, r_front, 2.2, x + 0.05, r_front + 0.04, zt) for x in [x0 + 0.3 + i * 0.5 for i in range(int((x1 - x0 - 0.4) / 0.5))]],
            '#3a3a46', 'station_rib')
    for z in [2.75 + i * 0.85 for i in range(int((zt - 3.0) / 0.85))]:
        k.box(x0 + 0.5, r_front + 0.01, z, x1 - 0.5, r_front + 0.05, z + 0.42, '#c8e8f0', 'station_window', emit=('#a8e0f0', 0.55))
        k.boxes([(x, r_front + 0.05, z, x + 0.04, r_front + 0.07, z + 0.42) for x in [x0 + 0.5 + i * 0.7 for i in range(int((x1 - x0 - 1.0) / 0.7) + 1)]],
                '#2a2a34', 'station_mullion')
    # canopy and the platform up on the viaduct
    k.box(x0 - 0.3, rb - 0.6, z_deck + 1.3, x1 + 0.3, r_front + 0.2, z_deck + 1.42, ('#2a2a34', 0.08), 'station_roof')
    k.box(x0 - 0.3, r_front + 0.17, z_deck + 1.24, x1 + 0.3, r_front + 0.21, z_deck + 1.3, shade(Y.CYAN, 0.4), 'station_led',
          emit=(Y.CYAN, 0.9))
    for xp in (x0, (x0 + x1) / 2, x1):
        k.cyl(xp, r_front, z_deck, z_deck + 1.3, 0.05, '#5a5a68', 'station_column', verts=8)
    # the platform's ends: a portal at either end over the track, so the Loop's train comes out of them (js/transit.js
    # draws it on the track between them; the world's `loop.track`)
    for (a, b) in ((x0 - 0.7, x0), (x1, x1 + 0.7)):
        k.box(a, rb - 0.75, z_deck - 0.6, b, rb + 2.3, z_deck + 1.42, ('#4a4a58', 0.08), 'station_portal')
        k.box(a, rb + 2.3, z_deck + 1.0, b, rb + 2.34, z_deck + 1.06, shade(Y.CYAN, 0.4), 'station_led', emit=(Y.CYAN, 0.9))
    # the roundel: a cyan ring with a bar across it
    cx, cz = x0 + 0.9, 2.5
    k.cyl_y(cx, r_front + 0.02, r_front + 0.08, cz, 0.42, 0.42, '#0c2a30', 'roundel', emit=(Y.CYAN, 0.9), verts=24)
    k.cyl_y(cx, r_front + 0.08, r_front + 0.1, cz, 0.28, 0.28, '#e8f4f8', 'roundel_face', verts=24)
    k.box(cx - 0.52, r_front + 0.1, cz - 0.09, cx + 0.52, r_front + 0.13, cz + 0.09, '#0c2a40', 'roundel_bar', emit=('#3a8ae0', 0.7))
    SG.letters(k, 'LOOP', 'Audiowide', cx, r_front + 0.13, cz - 0.06, size=0.11, col='#f0faff', energy=2)
    SG.lightbox(k, name + '  ' + tag, 'RussoOne', (x0 + x1) / 2 + 0.4, r_front + 0.02, 2.3, (x1 - x0) - 2.4, 0.42,
                bg='#e8f4ff', ink='#0c2a50', glow='#a0e0ff')
    # departures board
    bx = x1 - 1.1
    k.box(bx - 0.55, r_front + 0.02, 1.0, bx + 0.55, r_front + 0.08, 1.65, '#0c0c14', 'board_frame')
    for i in range(3):
        k.box(bx - 0.48, r_front + 0.08, 1.48 - i * 0.16, bx + 0.48, r_front + 0.09, 1.56 - i * 0.16, '#1a1004',
              'board_line', emit=('#ffb030', 0.9))
    k.point_light((x0 + x1) / 2, r_front + 0.6, 1.8, '#a0e8ff', 26, radius=0.6, group='flicker')
    k.solid(x0, rb, x1, r_front)
