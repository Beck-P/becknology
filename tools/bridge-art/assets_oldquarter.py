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
    awning(k, x0 - 0.1, x1 + 0.1, r0 - 0.1, r1 + 0.25, 2.0, 1.65)
    SG.letters(k, '金魚', 'DelaGothicOne', (x0 + x1) / 2, r1 + 0.01, 0.12, size=0.2, col='#ffd060', energy=3)
    k.solid(x0, r0 - 0.1, x1, r1)


def awning(k, x0, x1, r_back, r_front, z_back, z_front, cols=('#d83a3a', '#f0ece0'), stripe=0.3, valance=0.2):
    """A cloth awning: stripes that sag a little between the frame's ribs (each stripe a shallow fold, its middle lower
    than its edges), the cloth rolled over a bar at the back and, along the front, a valance hanging in scallops."""
    n = max(2, int((x1 - x0) / stripe))
    wdt = (x1 - x0) / n
    sag = 0.05
    for i in range(n):
        a, b = x0 + i * wdt, x0 + (i + 1) * wdt
        m = (a + b) / 2
        c = cols[i % len(cols)]
        for (p, q, ds) in ((a, m, (0.0, sag)), (m, b, (sag, 0.0))):       # two faces: the fold dips to the middle
            k.poly([(p, r_front, z_front - ds[0]), (q, r_front, z_front - ds[1]),
                    (q, r_back, z_back - ds[1] * 0.6), (p, r_back, z_back - ds[0] * 0.6)],
                   (shade(c, 0.92 if p == a else 1.0), 0.1), 'awning')
        pts = [(a, r_front + 0.005, z_front - 0.01), (b, r_front + 0.005, z_front - 0.01)]   # the scallop under it
        for j in range(7):
            t = j / 6
            pts.append((b - t * wdt, r_front + 0.005, z_front - valance + 0.06 - math.sin(t * math.pi) * 0.07))
        k.poly(pts, (shade(c, 0.85), 0.1), 'awning_valance')
    k.cyl_x(x0 - 0.05, x1 + 0.05, r_back, z_back + 0.03, 0.05, 0.05, ('#5a3a24', 0.1), 'awning_roll', verts=8)
    k.cyl_x(x0 - 0.05, x1 + 0.05, r_front, z_front, 0.025, 0.025, '#3a2418', 'awning_bar', verts=6)
    for xx in [x0 + (i + 0.5) * (x1 - x0) / 3 for i in range(3)]:                           # ribs under the cloth
        k.tube((xx, r_back, z_back - 0.05), (xx, r_front, z_front - 0.05), 0.012, '#3a2418', 'awning_rib', verts=4)


def market_stall(k, x0, x1, r0, r1, goods='veg', awning=('#2a5a8a', '#e8e0d0'), lanterns=True):
    awning_ = globals()['awning']
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
    awning_(k, x0 - 0.1, x1 + 0.1, r0 - 0.1, r1 + 0.3, 2.08, 1.7, cols=awning)
    if lanterns:
        for x in (x0 + 0.2, x1 - 0.2):
            Y.paper_lantern(k, x, r1 + 0.32, 1.42, col='#e83a2a', s=0.42, top=1.68)
    k.solid(x0, r0 - 0.1, x1, r1)


# ---- the Loop's viaduct ------------------------------------------------------------------------------------------
def viaduct(k, x0, x1, r, z, piers=(), w=1.5, gaps=()):
    """The Loop's track on its viaduct over the quarter, built as the thing it is: a concrete deck poured in spans (each
    its own tone, a dark joint between), deep edge beams along both sides with stiffeners under them and a drip line, a
    strip of cyan light under the front beam throwing pools down onto the roofs; on top a ballast bed, sleepers, two
    rails, a low front parapet (so the train shows over it), catenary masts with their cantilevers, the contact and
    messenger wires and the droppers between; under it piers of twin columns with a hammerhead cap and cross-bracing.
    `gaps`: (xa, xb) stretches the deck leaves out (a station's own platform deck goes there)."""
    rng = k.rng
    rb, rf = r - w / 2, r + w / 2
    zd = z - 0.42                                                      # the slab's soffit

    def spans(xa, xb):
        out, x = [], xa
        for (ga, gb) in sorted(gaps):
            if gb <= x or ga >= xb:
                continue
            if ga > x:
                out.append((x, ga))
            x = max(x, gb)
        if x < xb:
            out.append((x, xb))
        return out
    for (sa, sb) in spans(x0, x1):
        x = sa
        while x < sb - 1e-6:                                           # the deck, span by span
            xe = min(sb, x + 2.0)
            t = shade(rng.choice(('#4a4854', '#44424e', '#4e4c58')), rng.uniform(0.94, 1.05))
            k.box(x + 0.01, rb + 0.12, zd, xe - 0.01, rf - 0.12, z - 0.02, (t, 0.08), 'viaduct_deck')
            x = xe
        for (ra, rb_) in ((rb, rb + 0.14), (rf - 0.14, rf)):           # edge beams, deeper than the slab
            k.box(sa, ra, zd - 0.22, sb, rb_, z + 0.04, ('#55535e', 0.06), 'viaduct_beam')
        k.box(sa, rf, zd - 0.2, sb, rf + 0.03, zd - 0.16, '#2a2832', 'viaduct_drip')
        k.boxes([(xx, rf - 0.02, zd - 0.2, xx + 0.06, rf + 0.04, z - 0.04) for xx in [sa + 0.45 + i * 0.9 for i in range(int((sb - sa) / 0.9))]],
                '#3e3c48', 'viaduct_stiffener')
        k.box(sa, rf - 0.1, zd - 0.24, sb, rf - 0.02, zd - 0.21, shade(Y.CYAN, 0.45), 'viaduct_led', emit=(Y.CYAN, 0.95))
        for xx in [sa + 2.0 + i * 5.0 for i in range(int((sb - sa - 1.0) / 5.0) + 1)]:
            if xx < sb - 0.5:
                k.point_light(xx, rf + 0.3, zd - 0.5, Y.CYAN, 14, radius=0.3)
        # the bed: ballast, sleepers, two rails
        k.box(sa, r - 0.55, z - 0.02, sb, r + 0.55, z + 0.06, ('#2e2c34', 0.14), 'viaduct_ballast')
        k.boxes([(xx, r - 0.48, z + 0.06, xx + 0.12, r + 0.48, z + 0.1) for xx in [sa + 0.1 + i * 0.32 for i in range(int((sb - sa) / 0.32))]],
                ('#4a4038', 0.1), 'viaduct_sleeper')
        for rr in (r - 0.3, r + 0.3):
            k.box(sa, rr - 0.035, z + 0.1, sb, rr + 0.035, z + 0.17, '#6a6a76', 'viaduct_rail')
            k.box(sa, rr - 0.02, z + 0.17, sb, rr + 0.02, z + 0.18, '#c8ccd8', 'viaduct_rail_head')
        # parapets: a low wall at the front (the train rides over it), a taller one at the back
        k.box(sa, rf - 0.12, z + 0.04, sb, rf - 0.02, z + 0.24, ('#5a5864', 0.06), 'viaduct_parapet')
        k.box(sa, rb + 0.02, z + 0.04, sb, rb + 0.12, z + 0.4, ('#5a5864', 0.06), 'viaduct_parapet')
        k.boxes([(xx, rf - 0.13, z + 0.04, xx + 0.03, rf - 0.01, z + 0.25) for xx in [sa + 1.0 + i * 2.0 for i in range(int((sb - sa) / 2.0))]],
                '#2e2c36', 'viaduct_joint')
        # catenary: masts at the back, a cantilever out over the track, the messenger and contact wires, droppers
        for xx in [sa + 1.2 + i * 3.0 for i in range(int((sb - sa - 0.6) / 3.0))]:
            k.box(xx - 0.05, rb + 0.06, z + 0.04, xx + 0.05, rb + 0.16, z + 1.45, ('#5a5a66', 0.06), 'catenary_mast')
            k.tube((xx, rb + 0.12, z + 1.35), (xx, r + 0.08, z + 1.3), 0.02, '#6a6a76', 'catenary_arm', verts=5)
            k.tube((xx, rb + 0.12, z + 1.05), (xx, r + 0.08, z + 1.24), 0.015, '#6a6a76', 'catenary_arm', verts=5)
            k.box(xx - 0.03, r + 0.02, z + 1.18, xx + 0.03, r + 0.12, z + 1.3, '#8a8a96', 'catenary_insulator')
        k.tube((sa, r + 0.05, z + 1.3), (sb, r + 0.05, z + 1.3), 0.012, '#24242a', 'catenary_wire', verts=4)
        k.tube((sa, r + 0.05, z + 1.08), (sb, r + 0.05, z + 1.08), 0.01, '#24242a', 'catenary_wire', verts=4)
        k.boxes([(xx, r + 0.04, z + 1.08, xx + 0.012, r + 0.06, z + 1.3) for xx in [sa + 0.5 + i * 0.75 for i in range(int((sb - sa) / 0.75))]],
                '#24242a', 'catenary_dropper')
        for xx in [sa + 2.7 + i * 6.0 for i in range(int((sb - sa) / 6.0))]:              # a red beacon now and then
            k.sphere(xx, rb + 0.11, z + 1.5, 0.045, 0.045, Y.RED, 'viaduct_beacon', emit=(Y.RED, 1.0), segs=6)
    for px in piers:          # twin columns side by side at the back (clear of the houses), a hammerhead, cross-bracing
        cb = zd - 0.22
        k.box(px - 0.9, rb + 0.0, cb - 0.4, px + 0.9, rf - 0.1, cb, ('#4e4c58', 0.06), 'viaduct_pier_cap', bevel=0.04)
        k.box(px - 0.9, rb + 0.0, cb - 0.55, px + 0.9, rb + 0.55, cb - 0.4, ('#46444f', 0.06), 'viaduct_pier_cap')
        for cx in (px - 0.62, px + 0.62):
            k.box(cx - 0.18, rb + 0.08, 0.0, cx + 0.18, rb + 0.5, cb - 0.55, ('#4a4854', 0.08), 'viaduct_pier')
            k.boxes([(cx - 0.185, rb + 0.075, zz, cx + 0.185, rb + 0.505, zz + 0.03) for zz in [0.6 + i * 0.8 for i in range(int((cb - 1.2) / 0.8))]],
                    '#3a3844', 'viaduct_pier_band')
            k.solid(cx - 0.2, rb + 0.1, cx + 0.2, rb + 0.5)
        y0, y1 = 0.9, cb - 0.8
        for (za, zb_) in ((y0, y1), (y1, y0)):
            k.tube((px - 0.44, rb + 0.3, za), (px + 0.44, rb + 0.3, zb_), 0.04, '#5a5a66', 'viaduct_brace', verts=6)
        for zz in (y0, y1):
            k.box(px - 0.44, rb + 0.26, zz - 0.03, px + 0.44, rb + 0.34, zz + 0.03, '#5a5a66', 'viaduct_brace')


def station_block(k, x0, x1, r_front, z_deck, name='LANTERN ROW', depth=2.4, tag='L0', vr_=None):
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
    # the platform up on the viaduct: its own deck in front of the track (the viaduct leaves a gap for it), a yellow
    # safety line and tactile strip along its edge, benches, lamps and the name boards; a light canopy over the platform
    # only, never over the track, so the train shows from the lane as she runs in
    vr = rb + 0.75 if vr_ is None else vr_
    pr0, pr1 = vr + 0.62, vr + 1.9
    k.box(x0 - 0.3, vr - 0.75, z_deck - 0.64, x1 + 0.3, pr1, z_deck - 0.02, ('#4e4c58', 0.06), 'viaduct_deck')
    k.box(x0 - 0.3, pr1 - 0.02, z_deck - 0.86, x1 + 0.3, pr1 + 0.02, z_deck + 0.04, ('#55535e', 0.06), 'viaduct_beam')
    k.box(x0 - 0.3, pr1 - 0.1, z_deck - 0.9, x1 + 0.3, pr1 - 0.02, z_deck - 0.86, shade(Y.CYAN, 0.45), 'station_led', emit=(Y.CYAN, 0.95))
    k.box(x0, vr - 0.55, z_deck - 0.02, x1, vr + 0.55, z_deck + 0.06, ('#2e2c34', 0.14), 'viaduct_ballast')
    k.boxes([(xx, vr - 0.48, z_deck + 0.06, xx + 0.12, vr + 0.48, z_deck + 0.1) for xx in [x0 + 0.1 + i * 0.32 for i in range(int((x1 - x0) / 0.32))]],
            ('#4a4038', 0.1), 'viaduct_sleeper')
    for rr in (vr - 0.3, vr + 0.3):
        k.box(x0, rr - 0.035, z_deck + 0.1, x1, rr + 0.035, z_deck + 0.17, '#6a6a76', 'viaduct_rail')
        k.box(x0, rr - 0.02, z_deck + 0.17, x1, rr + 0.02, z_deck + 0.18, '#c8ccd8', 'viaduct_rail_head')
    k.box(x0, vr - 0.75, z_deck - 0.02, x1, vr - 0.62, z_deck + 0.4, ('#5a5864', 0.06), 'viaduct_parapet')
    k.box(x0, pr0, z_deck - 0.02, x1, pr1, z_deck + 0.3, ('#6a6874', 0.06), 'floor_platform')
    k.box(x0, pr0 - 0.02, z_deck + 0.3, x1, pr0 + 0.1, z_deck + 0.305, '#e8c030', 'floor_platform_line')
    k.boxes([(xx, pr0 + 0.12, z_deck + 0.3, xx + 0.07, pr0 + 0.3, z_deck + 0.304) for xx in [x0 + 0.05 + i * 0.12 for i in range(int((x1 - x0) / 0.12))]],
            '#c8a828', 'floor_platform_tactile')
    k.box(x0, pr0 - 0.03, z_deck + 0.1, x1, pr0, z_deck + 0.3, '#3a3844', 'platform_edge')
    for bx_ in (x0 + 1.6, x1 - 2.4):                                       # benches
        k.box(bx_, pr1 - 0.55, z_deck + 0.3, bx_ + 0.8, pr1 - 0.3, z_deck + 0.52, ('#2a6a7a', 0.06), 'bench', bevel=0.02)
        k.box(bx_, pr1 - 0.32, z_deck + 0.52, bx_ + 0.8, pr1 - 0.28, z_deck + 0.78, ('#2a6a7a', 0.06), 'bench_back')
    for xp in [x0 + 0.5 + i * 2.0 for i in range(int((x1 - x0) / 2.0) + 1)]:        # canopy columns along the back of it
        k.cyl(xp, pr1 - 0.15, z_deck + 0.3, z_deck + 1.5, 0.045, '#5a5a68', 'station_column', verts=8)
    k.box(x0 - 0.3, pr0 + 0.25, z_deck + 1.5, x1 + 0.3, pr1 + 0.05, z_deck + 1.56, ('#2a2a34', 0.08), 'station_roof')
    k.boxes([(xx, pr0 + 0.25, z_deck + 1.56, xx + 0.04, pr1 + 0.05, z_deck + 1.62) for xx in [x0 + 0.2 + i * 0.5 for i in range(int((x1 - x0) / 0.5) + 1)]],
            '#3a3a46', 'station_roof_rib')
    k.box(x0 - 0.3, pr1 + 0.02, z_deck + 1.44, x1 + 0.3, pr1 + 0.06, z_deck + 1.5, shade(Y.CYAN, 0.4), 'station_led', emit=(Y.CYAN, 0.9))
    for xx in (x0 + 1.2, (x0 + x1) / 2, x1 - 1.2):                        # lamps under the canopy, pooling on the platform
        k.box(xx - 0.25, pr0 + 0.6, z_deck + 1.42, xx + 0.25, pr0 + 0.75, z_deck + 1.5, '#e8f4ff', 'station_lamp', emit=('#e0f4ff', 1.0))
        k.point_light(xx, pr0 + 0.6, z_deck + 1.2, '#d0ecff', 16, radius=0.3)
    SG.lightbox(k, name, 'RussoOne', (x0 + x1) / 2, pr1 + 0.06, z_deck + 0.95, 2.8, 0.34, bg='#e8f4ff', ink='#0c2a50', glow='#a0e0ff')
    for xx in (x0 + 0.7, x1 - 0.7):                                       # the roundel on the platform too
        k.cyl_y(xx, pr1 + 0.04, pr1 + 0.08, z_deck + 1.0, 0.22, 0.22, '#0c2a30', 'roundel', emit=(Y.CYAN, 0.9), verts=20)
        k.cyl_y(xx, pr1 + 0.08, pr1 + 0.1, z_deck + 1.0, 0.14, 0.14, '#e8f4ff', 'roundel_face', verts=20)
    # the platform's ends: a portal at either end over the track, so the Loop's train comes out of them (js/transit.js
    # draws it on the track between them; the world's `loop.track`)
    for (a, b) in ((x0 - 0.7, x0), (x1, x1 + 0.7)):
        k.box(a, vr - 0.8, z_deck - 0.64, b, vr - 0.45, z_deck + 1.62, ('#4a4a58', 0.08), 'station_portal')
        k.box(a, vr - 0.8, z_deck + 1.3, b, pr1 + 0.1, z_deck + 1.62, ('#4a4a58', 0.08), 'station_portal')
        k.box(a, pr1 + 0.1, z_deck + 1.3, b, pr1 + 0.14, z_deck + 1.36, shade(Y.CYAN, 0.4), 'station_led', emit=(Y.CYAN, 0.9))
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
