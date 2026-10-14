"""Lumar outdoor builders for scenekit (bpy): houses, streets, harbour.
Tile units: x = column, r = row (toward the camera), z = height.

Buildings face the camera (front wall at r_front), so their facades and the
front slope of the roof read at the 45° camera — the Stardew-style high
oblique view. Water is left out: the world's own animated sea shows through.
"""
import math

from scenekit import shade
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
def cobbles(k, x0, r0, x1, r1, tone='#55524c', size=0.3, skip=None):
    """Rounded, irregular cobblestones (jittered, varied in size and tone)
    over dark grout. skip(x, r) -> True leaves a spot bare."""
    k.box(x0, r0, -0.12, x1, r1, -0.03, ('#24221e', 0.25), 'grout')
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
                k.cyl(cx, cr, -0.05, 0.0 + k.rng.uniform(0.0, 0.02), rx, (shade(tone, k.rng.uniform(0.8, 1.12)), 0.12),
                      'cobble', ry=ry, verts=k.rng.choice((6, 7, 8)), bevel=0.02)
            x += size * k.rng.uniform(0.95, 1.05)
        r += size
        i += 1


def grass(k, x0, r0, x1, r1, tone='#2a4a2a', tufts=0.6):
    k.box(x0, r0, -0.1, x1, r1, 0.0, (tone, 0.3), 'grass')
    n = int((x1 - x0) * (r1 - r0) * tufts)
    for _ in range(n):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        for j in range(3):
            k.cone(x + j * 0.04 - 0.04, r, 0.0, k.rng.uniform(0.08, 0.16), 0.025, 0.002,
                   shade(tone, k.rng.uniform(1.0, 1.4)), 'tuft', verts=3)


def sand(k, x0, r0, x1, r1, tone='#8a7a5a'):
    k.box(x0, r0, -0.1, x1, r1, 0.0, (tone, 0.25), 'sand')


# ---- houses -------------------------------------------------------------------------------
def _gable_roof(k, x0, x1, r_back, r_front, z_eave, rise, col, over=0.25, strips=9):
    """Gable roof, ridge along x. Shingle courses on the front slope."""
    rm = (r_back + r_front) / 2
    zr = z_eave + rise
    ra, rb = r_front + over, r_back - over
    xa, xb = x0 - over, x1 + over
    # front slope as shingle strips (each strip a slightly different shade)
    for i in range(strips):
        t0, t1 = i / strips, (i + 1) / strips
        ra0, za0 = ra + (rm - ra) * t0, z_eave - 0.06 + (zr - z_eave + 0.06) * t0
        ra1, za1 = ra + (rm - ra) * t1, z_eave - 0.06 + (zr - z_eave + 0.06) * t1
        c = (shade(col, k.rng.uniform(0.88, 1.08) * (0.94 if i % 2 else 1.0)), 0.18)
        k.poly([(xa, ra0, za0), (xb, ra0, za0), (xb, ra1, za1), (xa, ra1, za1)], c, 'roof')
        k.poly([(xa, ra0 + 0.005, za0 - 0.02), (xb, ra0 + 0.005, za0 - 0.02), (xb, ra0 - 0.03, za0 + 0.02),
                (xa, ra0 - 0.03, za0 + 0.02)], shade(col, 0.6), 'roof_edge')
        x = xa + (0.17 if i % 2 else 0.0) + k.rng.uniform(0.0, 0.08)
        while x < xb - 0.05:     # joints between the shingles of this course
            p0 = (x, ra0 + (ra1 - ra0) * 0.12, za0 + (za1 - za0) * 0.12 + 0.012)
            p1 = (x, ra0 + (ra1 - ra0) * 0.9, za0 + (za1 - za0) * 0.9 + 0.012)
            k.tube(p0, p1, 0.012, shade(col, 0.62), 'roof_edge', verts=4)
            x += 0.34 + k.rng.uniform(-0.03, 0.03)
    k.poly([(xa, rb, z_eave - 0.06), (xb, rb, z_eave - 0.06), (xb, rm, zr), (xa, rm, zr)], (shade(col, 0.75), 0.18), 'roof_back')
    for xe in (x0, x1):   # gable ends
        k.poly([(xe, r_front, z_eave), (xe, r_back, z_eave), (xe, rm, zr)], (PLASTER, 0.08), 'gable')
    k.tube((xa, rm, zr + 0.03), (xb, rm, zr + 0.03), 0.06, shade(col, 0.55), 'ridge', verts=6)
    # eave fascia
    k.box(xa, ra - 0.02, z_eave - 0.14, xb, ra + 0.04, z_eave - 0.04, WOOD_DD, 'fascia')
    return rm, zr


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
    elif icon == 'fish':
        k.blob(ix, ir, iz, 0.01, 0.14, 0.06, '#90c0d0', 'sign_icon', segs=8)
        k.cone(ix, ir + 0.16, iz - 0.06, iz + 0.06, 0.01, 0.005, '#90c0d0', 'sign_icon', verts=3)


def house(k, x0, x1, r_back, r_front, wall_h=2.0, rise=1.3, roof=ROOF_GREEN, wall=PLASTER, timber=WOOD_DD,
          door_x=None, windows=(), windows_up=(), chimney=None, sign=None, lanterns=(), stone=False, base=SALT[2]):
    """A Lumar house: saltstone footing, plaster and timber (or stone)
    walls, glowing windows, door with a step, gable roof, chimney, sign.
    Returns (ridge row, ridge z) for smoke and the like."""
    k.box(x0, r_back, 0, x1, r_front, 0.35, (base, 0.16), 'footing', bevel=0.02)
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
    if door_x is not None:
        door(k, door_x, r_front)
    for (wx, wz) in windows:
        window(k, wx, r_front + 0.02, wz,
               flowers=k.rng.choice((None, ('#e04060', '#e0c040'), ('#a060d0', '#e0e0f0'), ('#e07030', '#e0c040'))))
    for (wx, wz) in windows_up:
        window(k, wx, r_front + 0.02, wz, w=0.45, h=0.5)
    rm, zr = _gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof)
    if chimney:
        cx = chimney
        k.box(cx - 0.2, rm - 0.35, wall_h, cx + 0.2, rm + 0.05, zr + 0.55, (STONE_D, 0.16), 'chimney', bevel=0.02)
        k.box(cx - 0.25, rm - 0.4, zr + 0.55, cx + 0.25, rm + 0.1, zr + 0.65, (STONE, 0.12), 'chimney_cap')
    if sign:
        hanging_sign(k, sign[0], r_front, sign[1], icon=sign[2])
    for lx in lanterns:
        wall_lantern(k, lx, r_front + 0.02)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


# ---- street furniture --------------------------------------------------------------------
def lantern_post(k, cx, cr, h=2.2, energy=40):
    k.cyl(cx, cr, 0, 0.12, 0.16, IRON, 'post_base', verts=8)
    k.cyl(cx, cr, 0.12, h, 0.045, IRON, 'post', verts=8)
    k.box(cx - 0.02, cr - 0.02, h - 0.15, cx + 0.3, cr + 0.02, h - 0.1, IRON, 'post_arm')
    lx = cx + 0.28
    k.cone(lx, cr, h - 0.2, h - 0.1, 0.03, 0.01, IRON, 'post_hook', verts=4)
    lantern(k, lx, cr, h - 0.5, h - 0.24, s=0.1, energy=energy)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


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
    else:
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


def island_ground(k, cells, tone='#5a6058', cliff=SALT[1], depth=0.9, grass='#34462e', rim=()):
    """Island ground: flagstones in the middle, grass and moss toward the
    rocky rim (and under the rim boulders); rock faces drop into the sea
    along the edges that face the camera, boulders along the rest."""
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


def shore_crystals(k, cx, cr, col=('#6a1a2a', '#e04060'), s=1.0, energy=8):
    """Spore crystals growing out of the rocks, glowing."""
    for (dx, dr, h, rad, lean) in ((0.0, 0.0, 0.8, 0.1, 0), (0.15, 0.08, 0.5, 0.07, 22), (-0.14, 0.1, 0.45, 0.07, -18),
                                   (0.05, -0.12, 0.35, 0.06, 8)):
        top = (cx + dx + math.sin(math.radians(lean)) * h * s * 0.5, cr + dr, h * s)
        k.tube((cx + dx, cr + dr, 0.0), top, rad * s, col[0], 'crystal', rb=0.004, emit=(col[1], 0.75), verts=6, smooth=False)
    k.point_light(cx, cr + 0.3, 0.5 * s, col[1], energy, radius=0.12, group='flicker')
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
            masts=1.0):
    """Lumar's trading galleon berthed broadside to the camera: lofted hull
    with a gilded wale and gunports, a stern castle with lit windows, three
    masts with sails furled on their yards, rigging, bowsprit, lanterns.
    Stern at x0, bow at x1."""
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
        window(k, wx, rc + hw(0.05) * 0.85, 0.95, w=0.24, h=0.3, shutters=None)
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
    for (t, h) in ((0.32, 4.5 * masts), (0.54, 5.1 * masts), (0.76, 4.2 * masts)):
        mx = x0 + t * L
        k.cyl(mx, rc, zd, zd + h, 0.065, (WOOD_D, 0.12), 'mast', verts=10)
        k.cyl(mx, rc, zd + h * 0.62, zd + h * 0.65, 0.2, WOOD_DD, 'mast_top', verts=10)
        for (f, span) in ((0.45, 1.1), (0.8, 0.8)):
            z = zd + h * f
            k.cyl_x(mx - span, mx + span, rc, z, 0.03, 0.03, WOOD_DD, 'yard', verts=6)
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
def pine(k, cx, cr, h=2.4, tone='#28483a'):
    """Seaside pine: a short trunk and four stacked, faceted cones."""
    k.cyl(cx, cr, 0, h * 0.3, 0.07, (WOOD_D, 0.12), 'trunk', verts=6)
    for i in range(4):
        z0 = h * (0.18 + i * 0.19)
        rad = 0.58 * (1 - i * 0.2) * k.rng.uniform(0.9, 1.1)
        k.cone(cx, cr, z0, z0 + h * 0.36, rad, 0.02, (shade(tone, 1 + i * 0.07), 0.18), 'pine', verts=9)


def bush(k, cx, cr, s=0.3, tone='#2a4a2e', berries=None):
    for i in range(3):
        a = i * 2.1 + k.rng.uniform(0, 0.6)
        k.blob(cx + math.cos(a) * s * 0.5, cr + math.sin(a) * s * 0.4, s * 0.55, s * 0.7, s * 0.6, s * 0.55,
               (shade(tone, k.rng.uniform(0.9, 1.15)), 0.2), 'bush', segs=8)
    if berries:
        for i in range(4):
            k.sphere(cx + k.rng.uniform(-s, s) * 0.7, cr + s * 0.4, s * k.rng.uniform(0.6, 1.0), 0.03, 0.03, berries, 'berry', segs=5)


def tree(k, cx, cr, h=2.6, tone='#2e5434', lean=0.1):
    """Round-crowned town tree: a leaning trunk and a crown of lumpy blobs."""
    top = (cx + lean, cr, h * 0.62)
    k.tube((cx, cr, 0.0), top, 0.1, (WOOD_D, 0.14), 'trunk', rb=0.06, verts=8)
    k.tube((cx + lean * 0.6, cr, h * 0.45), (cx + lean + 0.35, cr - 0.05, h * 0.7), 0.04, (WOOD_D, 0.14), 'branch', verts=6)
    for (dx, dr, dz, s_) in ((0, 0, 0.78, 0.62), (-0.38, 0.05, 0.66, 0.44), (0.4, 0.04, 0.68, 0.46), (0.05, 0.12, 0.95, 0.42),
                             (-0.15, 0.2, 0.62, 0.36), (0.25, -0.15, 0.9, 0.36)):
        k.blob(cx + lean + dx, cr + dr, h * dz, s_, s_ * 0.85, s_ * 0.8, (shade(tone, k.rng.uniform(0.9, 1.15)), 0.22), 'leaves',
               segs=12)


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
