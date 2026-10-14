"""The Wayfarer's bridge as a captain's deck — wood and brass under a stern
gallery of arched windows (scenekit, bpy). Tile units: x = column,
r = row (toward the camera), z = height.

The windows are HOLDOUT (the engine draws the place the ship is parked over
through them). Decor the pilot can buy for the deck — plants, lamps, rugs,
a curio on the plinth, a flag — are variants (`with k.variant(slot, key):`),
built here in DECOR so the scene and the catalog previews share one list.
"""
import math

from scenekit import shade
from assets_lumar import BRASS, CANDLE, WOOD, WOOD_D, WOOD_DD, WOOD_L, rug, desk_lamp
from assets_town import lantern

DECK_WALL = ['#24160c', '#3e2614', '#55361c', '#6e4828']
BRASS_D = '#a08040'
LEATHER = '#6a2a22'
PARCH = '#d8c8a0'
INK = '#3a2a1a'
NAVY = '#16233e'
CYAN = '#40c8d8'
AMBER = '#ffb050'
AETHER = '#9a7aff'


# ---- shell ------------------------------------------------------------------------------------
def gallery_wall(k, x0, x1, r_face, height, win, lights=5):
    """Panelled back wall with a stern gallery: `lights` tall arched windows
    between wooden mullions over a wainscot and brass sill. win = (wx0, wx1,
    z0, z1). Returns the mullion x positions (for lanterns)."""
    wx0, wx1, z0, z1 = win
    W = DECK_WALL
    k.box(x0, r_face - 0.5, 0, x1, r_face, height, (W[1], 0.08), 'wall')
    k.box(x0, r_face - 0.5, height, x1, r_face + 0.12, height + 0.05, W[0], 'wall_cap')
    k.box(x0, r_face - 0.02, 0, x1, r_face + 0.08, 0.2, (W[0], 0.05), 'skirting')
    # wainscot: raised panels under the sill, the length of the wall
    x = x0 + 0.1
    while x < x1 - 0.3:
        xe = min(x1 - 0.1, x + 1.0)
        k.box(x + 0.06, r_face, 0.26, xe - 0.06, r_face + 0.04, z0 - 0.16, (W[2], 0.08), 'wainscot')
        k.box(x + 0.14, r_face + 0.04, 0.34, xe - 0.14, r_face + 0.055, z0 - 0.24, (W[3], 0.08), 'wainscot_raise')
        x = xe
    # piers either side of the gallery: tall panels, a brass rib
    for a, b in ((x0, wx0 - 0.2), (wx1 + 0.2, x1)):
        if b - a > 0.3:
            k.box(a + 0.08, r_face, z0, b - 0.08, r_face + 0.04, height - 0.4, (W[2], 0.08), 'wall_panel')
            k.box(a + 0.18, r_face + 0.04, z0 + 0.1, b - 0.18, r_face + 0.055, height - 0.5, (W[3], 0.08), 'wall_panel')
    # the gallery
    k.box(wx0, r_face - 0.02, z0, wx1, r_face + 0.02, z1, 'HOLDOUT', 'viewport')
    k.box(wx0 - 0.2, r_face, z0 - 0.12, wx1 + 0.2, r_face + 0.22, z0, (W[0], 0.06), 'sill')
    k.box(wx0 - 0.22, r_face + 0.2, z0 - 0.04, wx1 + 0.22, r_face + 0.24, z0, BRASS, 'sill_brass')
    k.box(wx0 - 0.2, r_face, z1, wx1 + 0.2, r_face + 0.18, z1 + 0.32, (W[0], 0.06), 'header')
    k.box(wx0 - 0.22, r_face + 0.18, z1 + 0.06, wx1 + 0.22, r_face + 0.2, z1 + 0.1, BRASS, 'header_brass')
    k.box(wx0 - 0.22, r_face + 0.18, z1 + 0.22, wx1 + 0.22, r_face + 0.2, z1 + 0.25, BRASS_D, 'header_brass')
    for xx in (wx0 - 0.2, wx1):
        k.box(xx, r_face, z0, xx + 0.2, r_face + 0.18, z1, (W[0], 0.06), 'window_post')
    step = (wx1 - wx0) / lights
    mull = [wx0 + step * i for i in range(1, lights)]
    for mx in mull:
        k.box(mx - 0.1, r_face, z0, mx + 0.1, r_face + 0.16, z1, (W[0], 0.06), 'mullion')
        k.box(mx - 0.03, r_face + 0.16, z0 + 0.1, mx + 0.03, r_face + 0.17, z1 - 0.1, BRASS_D, 'mullion_brass')
    # arched heads: wooden spandrels fill each light's top corners
    rx, rz, n = step / 2 - 0.1, min(0.9, (z1 - z0) * 0.35), 16
    for i in range(lights):
        a, b = wx0 + step * i + (0.1 if i else 0), wx0 + step * (i + 1) - (0.1 if i < lights - 1 else 0)
        cx = (a + b) / 2
        zs = z1 - rz
        for j in range(n):
            za, zb = zs + rz * j / n, zs + rz * (j + 1) / n
            t = min(1.0, ((za + zb) / 2 - zs) / rz)
            w = rx * math.sqrt(max(0.0, 1 - t * t))
            if cx - w > a + 0.005:
                k.box(a, r_face, za, cx - w, r_face + 0.12, zb + 0.004, (W[0], 0.06), 'arch')
                k.box(cx + w, r_face, za, b, r_face + 0.12, zb + 0.004, (W[0], 0.06), 'arch')
        k.box(cx - 0.05, r_face + 0.1, z1 - 0.05, cx + 0.05, r_face + 0.16, z1 + 0.05, BRASS, 'keystone')
    return mull


def side_wall(k, x0, x1, r0, r1, height, door=None, face=1):
    """Side wall seen end-on from the camera; door = (ra, rb) leaves a gap;
    face: which side the room is on (+1: the room is east of the wall)."""
    W = DECK_WALL
    spans = [(r0, r1)] if not door else [(r0, door[0]), (door[1], r1)]
    for a, b in spans:
        k.box(x0, a, 0, x1, b, height, (W[1], 0.08), 'side_wall')
        k.box(x0 - 0.02, a, height, x1 + 0.02, b, height + 0.05, W[0], 'wall_cap')
    k.box(x0 - 0.02, r1, 0, x1 + 0.02, r1 + 0.03, height + 0.05, '#0a0604', 'wall_cut')
    if door:
        ra, rb = door
        k.box(x0, ra, 2.3, x1, rb, height, (W[1], 0.08), 'door_lintel')
        k.box(x0 - 0.02, ra, height, x1 + 0.02, rb, height + 0.05, W[0], 'wall_cap')
        for rr in (ra, rb - 0.18):
            k.box(x0, rr, 0.0, x1, rr + 0.18, 2.3, (W[0], 0.05), 'door_post')
            px = x1 if face > 0 else x0
            k.box(px - 0.02, rr + 0.06, 1.0, px + 0.01, rr + 0.12, 1.2, BRASS, 'door_plate')
        k.box(x0, ra + 0.18, -0.01, x1, rb - 0.18, 0.02, (BRASS_D, 0.06), 'threshold')


def front_wall(k, x0, x1, r0, door, height=0.4):
    W = DECK_WALL
    for a, b in ((x0, door[0]), (door[1], x1)):
        k.box(a, r0, 0, b, r0 + 0.6, height, (W[1], 0.08), 'front_wall')
        k.box(a, r0, height, b, r0 + 0.6, height + 0.05, W[0], 'wall_cap')
        k.box(a, r0 - 0.01, height - 0.08, b, r0 + 0.02, height - 0.05, BRASS_D, 'rail')
    k.box(door[0], r0, -0.01, door[1], r0 + 0.6, 0.02, (BRASS_D, 0.06), 'threshold')
    for xx in (door[0] - 0.18, door[1]):
        k.box(xx, r0, 0, xx + 0.18, r0 + 0.6, height + 0.3, (W[0], 0.05), 'door_post')
        k.cyl(xx + 0.09, r0 + 0.3, height + 0.3, height + 0.36, 0.08, BRASS, 'post_cap', verts=10)


def deck_floor(k, x0, r0, x1, r1, tone='#6a4422'):
    """Scrubbed deck planks running across the room, joints staggered,
    a pale caulking line between strakes."""
    k.box(x0, r0, -0.12, x1, r1, -0.02, WOOD_DD, 'subfloor')
    r = r0
    while r < r1 - 1e-6:
        rn = min(r1, r + 1 / 3)
        x = x0 - k.rng.uniform(0, 2.0)
        while x < x1 - 1e-6:
            ln = k.rng.choice([2.0, 2.5, 3.0, 3.5])
            a, b = max(x, x0), min(x + ln, x1)
            if b - a > 0.2:
                k.box(a + 0.015, r + 0.02, -0.04, b - 0.015, rn - 0.02, 0.0, (shade(tone, k.rng.uniform(0.88, 1.1)), 0.12), 'floor')
                if b - a > 1.2:   # trenails at the plank ends
                    for xx in (a + 0.12, b - 0.16):
                        k.box(xx, r + 0.12, 0.0, xx + 0.04, r + 0.16, 0.003, shade(tone, 0.6), 'trenail')
            x += ln
        r = rn


def compass_rose(k, cx, cr, rad, z=0.0, col=BRASS, dark=BRASS_D):
    """Eight-point star inlaid in the deck, in a ring."""
    for i in range(8):
        a = i * math.pi / 4 - math.pi / 2
        L = rad if i % 2 == 0 else rad * 0.62
        tip = (cx + math.cos(a) * L, cr + math.sin(a) * L, z + 0.006)
        for s_, c_ in ((-1, col), (1, dark)):
            b = a + s_ * math.pi / 8
            side = (cx + math.cos(b) * rad * 0.2, cr + math.sin(b) * rad * 0.2, z + 0.006)
            k.poly([(cx, cr, z + 0.006), side, tip] if s_ < 0 else [(cx, cr, z + 0.006), tip, side], c_, 'rose')
    n = 36
    for i in range(n):
        a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
        k.bar(cx + math.cos(a0) * rad * 0.8, cr + math.sin(a0) * rad * 0.8, cx + math.cos(a1) * rad * 0.8,
              cr + math.sin(a1) * rad * 0.8, z, z + 0.005, 0.03, col, 'rose_ring')


def helm_dais(k, x0, r0, x1, r1, tone='#4e301a'):
    """The quarterdeck round the helm: darker planks laid the other way,
    a brass nosing along its front edge."""
    x = x0
    while x < x1 - 1e-6:
        xn = min(x1, x + 0.25)
        k.box(x + 0.012, r0, 0.0, xn - 0.012, r1, 0.012, (shade(tone, k.rng.uniform(0.88, 1.1)), 0.12), 'dais')
        x = xn
    k.box(x0, r1 - 0.04, 0.0, x1, r1 + 0.02, 0.018, BRASS_D, 'dais_nosing')


def hanging_lantern(k, cx, r, z_top, drop=1.1, energy=30):
    """A ship's lantern on a chain from the gallery header."""
    zl = z_top - drop
    k.tube((cx, r, zl + 0.44), (cx, r, z_top), 0.012, '#2a2a30', 'chain', verts=6)
    lantern(k, cx, r, zl, zl + 0.34, s=0.13)
    k.point_light(cx, r + 0.3, zl + 0.12, '#ffb060', energy, radius=0.12, group='flicker')


# ---- the helm --------------------------------------------------------------------------------
def ships_wheel(k, cx, r, zc, R=0.56, spokes=8):
    """Spoked wheel on a post, facing the gallery (the helmsman stands on the
    camera side). The wheel's plane runs across the room."""
    k.box(cx - 0.13, r - 0.42, 0, cx + 0.13, r - 0.1, zc + 0.12, (WOOD_D, 0.1), 'helm_post', bevel=0.02)
    for z in (0.12, zc - 0.25):
        k.box(cx - 0.15, r - 0.44, z, cx + 0.15, r - 0.08, z + 0.05, BRASS, 'helm_band')
    k.cyl_y(cx, r - 0.12, r + 0.02, zc, 0.06, 0.06, BRASS, 'axle', verts=10)
    n = 28
    for ring_r, rad, col in ((R, 0.04, (WOOD, 0.08)), (R - 0.07, 0.015, BRASS), (R * 0.42, 0.025, BRASS)):
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.tube((cx + math.cos(a0) * ring_r, r + 0.04, zc + math.sin(a0) * ring_r),
                   (cx + math.cos(a1) * ring_r, r + 0.04, zc + math.sin(a1) * ring_r), rad, col, 'wheel_rim', verts=6)
    for i in range(spokes):
        a = i * 2 * math.pi / spokes + math.pi / spokes
        p_in = (cx + math.cos(a) * 0.08, r + 0.04, zc + math.sin(a) * 0.08)
        p_rim = (cx + math.cos(a) * R, r + 0.04, zc + math.sin(a) * R)
        p_out = (cx + math.cos(a) * (R + 0.2), r + 0.04, zc + math.sin(a) * (R + 0.2))
        k.tube(p_in, p_rim, 0.022, (WOOD_L, 0.08), 'spoke', verts=6)
        k.tube(p_rim, p_out, 0.032, (WOOD_L, 0.08), 'handle', rb=0.024, verts=8)
        k.sphere(p_out[0], p_out[1], p_out[2], 0.035, 0.035, (WOOD_L, 0.08), 'handle_knob', segs=8)
    k.cyl_y(cx, r + 0.0, r + 0.1, zc, 0.11, 0.11, BRASS, 'hub', verts=14)
    k.cyl_y(cx, r + 0.1, r + 0.12, zc, 0.05, 0.05, shade(BRASS, 1.25), 'hub_cap', verts=10)
    k.solid(cx - 0.3, r - 0.4, cx + 0.3, r + 0.1)


def binnacle(k, cx, cr):
    """Compass binnacle: wooden pillar, brass hood with a lit card, the two
    iron correcting spheres."""
    k.cyl(cx, cr, 0, 0.08, 0.22, (WOOD_D, 0.1), 'binnacle_foot', verts=12)
    k.cyl(cx, cr, 0.08, 0.86, 0.15, (WOOD, 0.1), 'binnacle', verts=12)
    k.cyl(cx, cr, 0.86, 0.92, 0.2, BRASS, 'binnacle_rim', verts=14)
    k.cyl(cx, cr, 0.92, 0.94, 0.16, '#1a1408', 'compass_card', emit=('#ffd890', 0.6), verts=14)
    n = 12   # the hood's open ring round the card
    for i in range(n):
        a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
        k.tube((cx + math.cos(a0) * 0.17, cr + math.sin(a0) * 0.17, 0.95), (cx + math.cos(a1) * 0.17, cr + math.sin(a1) * 0.17,
               0.95), 0.015, BRASS, 'binnacle_hood', verts=4)
    k.sphere(cx, cr, 1.08, 0.05, 0.04, BRASS, 'binnacle_finial', segs=8)
    for s_ in (-1, 1):
        k.box(cx + s_ * 0.2 - 0.02, cr - 0.02, 0.86, cx + s_ * 0.3 + 0.02, cr + 0.02, 0.9, BRASS_D, 'binnacle_arm')
        k.sphere(cx + s_ * 0.34, cr, 0.92, 0.08, 0.08, '#2a3a5a', 'corrector', segs=10)
    k.point_light(cx, cr + 0.2, 1.2, '#ffd890', 4, radius=0.05, group='flicker')
    k.solid(cx - 0.3, cr - 0.2, cx + 0.3, cr + 0.2)


def telegraph(k, cx, cr):
    """Engine-order telegraph: a brass pillar with a round dial and a lever."""
    k.cyl(cx, cr, 0, 0.06, 0.18, BRASS_D, 'tele_foot', verts=10)
    k.cyl(cx, cr, 0.06, 0.95, 0.06, BRASS, 'tele_post', verts=10)
    zc = 1.15
    k.cyl_y(cx, cr - 0.08, cr + 0.08, zc, 0.24, 0.24, BRASS, 'tele_drum', verts=18)
    k.cyl_y(cx, cr + 0.08, cr + 0.09, zc, 0.2, 0.2, '#e8dcc0', 'tele_face', emit=('#ffe8b0', 0.25), verts=18)
    for i in range(6):   # sectors: ahead / astern
        a = math.pi * (0.15 + i * 0.14)
        col = '#a02a20' if i in (0, 5) else INK
        k.tube((cx + math.cos(a) * 0.08, cr + 0.095, zc + math.sin(a) * 0.08),
               (cx + math.cos(a) * 0.18, cr + 0.095, zc + math.sin(a) * 0.18), 0.008, col, 'tele_mark', verts=4)
    k.tube((cx, cr + 0.1, zc), (cx + 0.1, cr + 0.1, zc + 0.16), 0.012, INK, 'tele_needle', verts=4)
    k.tube((cx, cr + 0.12, zc), (cx - 0.16, cr + 0.16, zc + 0.36), 0.022, BRASS, 'tele_lever', verts=6)
    k.sphere(cx - 0.16, cr + 0.16, zc + 0.38, 0.05, 0.05, '#2a1a10', 'tele_grip', segs=8)
    k.solid(cx - 0.25, cr - 0.15, cx + 0.25, cr + 0.15)


def curio_cabinet(k, cx, cr, w=1.5, h=1.95):
    """A glass-fronted cabinet of things picked up on the way: glowing jars,
    a crystal cluster, a nautilus, a skull, a sextant, old books."""
    x0, x1, d = cx - w / 2, cx + w / 2, 0.5
    r0, r1 = cr - d / 2, cr + d / 2
    k.box(x0, r0, 0, x1, r0 + 0.05, h, (WOOD_DD, 0.1), 'cab_back')
    for xs in (x0, x1 - 0.06):
        k.box(xs, r0, 0, xs + 0.06, r1, h, (WOOD_D, 0.1), 'cab_side')
    k.box(x0 - 0.04, r0, h, x1 + 0.04, r1 + 0.05, h + 0.08, (WOOD, 0.08), 'cab_crown')
    k.box(x0, r0, 0, x1, r1, 0.22, (WOOD_D, 0.1), 'cab_plinth')
    levels = (0.22, 0.75, 1.3)
    for z in levels[1:]:
        k.box(x0 + 0.05, r0, z - 0.03, x1 - 0.05, r1 - 0.04, z, (WOOD, 0.08), 'cab_shelf')
    k.box(x0 + 0.06, r0 + 0.05, levels[0], x1 - 0.06, r0 + 0.06, h, '#1a2a2a', 'cab_inside', emit=('#203838', 0.15))
    # shelf 1: jars and a crystal cluster
    for i, col in enumerate(('#60f0c0', '#c080ff', '#ffb050', '#60f0c0')):
        jx = x0 + 0.22 + i * 0.3
        k.cyl(jx, cr, 0.22, 0.42, 0.07, '#1a2a2a', 'jar', emit=(col, 0.6), verts=10)
        k.cyl(jx, cr, 0.42, 0.45, 0.05, '#6a4a2a', 'jar_cork', verts=8)
    # shelf 2: a nautilus, a skull, books
    k.blob(x0 + 0.3, cr, 0.88, 0.13, 0.08, 0.12, ('#e8d8c0', 0.08), 'nautilus', segs=12)
    k.blob(x0 + 0.33, cr + 0.05, 0.86, 0.06, 0.04, 0.06, '#c89a70', 'nautilus_mouth', segs=8)
    k.blob(cx + 0.05, cr, 0.86, 0.1, 0.09, 0.09, ('#e8e0d0', 0.06), 'skull', segs=10)
    for dx in (-0.04, 0.04):
        k.sphere(cx + 0.05 + dx, cr + 0.08, 0.88, 0.022, 0.022, '#2a2018', 'skull_eye', segs=6)
    for i in range(5):
        k.box(x1 - 0.42 + i * 0.065, cr - 0.12, 0.75, x1 - 0.37 + i * 0.065, cr + 0.12, 1.0 + (i % 2) * 0.05,
              (k.rng.choice(['#6a2a2a', '#2a4a3a', '#3a3a6a', '#7a5a2a']), 0.08), 'book')
    # shelf 3: a sextant and a crystal cluster that glows
    k.tube((x0 + 0.25, cr, 1.32), (x0 + 0.45, cr, 1.6), 0.012, BRASS, 'sextant', verts=4)
    k.tube((x0 + 0.45, cr, 1.6), (x0 + 0.62, cr, 1.32), 0.012, BRASS, 'sextant', verts=4)
    k.tube((x0 + 0.25, cr, 1.34), (x0 + 0.62, cr, 1.34), 0.012, BRASS, 'sextant', verts=4)
    for (dx, hgt, col) in ((0.0, 0.35, '#80c0ff'), (-0.08, 0.24, '#c080ff'), (0.09, 0.27, '#80c0ff')):
        k.cone(x1 - 0.4 + dx, cr, 1.3, 1.3 + hgt, 0.05, 0.0, '#20304a', 'crystal', emit=(col, 0.9), verts=6)
    k.point_light(x1 - 0.4, cr + 0.35, 1.5, '#90b0ff', 4, radius=0.05, group='pulse')
    # the glass doors' frames
    for xx in (x0 + 0.03, cx - 0.015, x1 - 0.06):
        k.box(xx, r1 - 0.03, 0.22, xx + 0.035, r1, h, (WOOD, 0.08), 'cab_door')
    for zz in (0.22, h - 0.04):
        k.box(x0, r1 - 0.03, zz, x1, r1, zz + 0.04, (WOOD, 0.08), 'cab_door')
    for xx in (cx - 0.08, cx + 0.05):
        k.box(xx, r1, 1.0, xx + 0.03, r1 + 0.02, 1.08, BRASS, 'cab_knob')
    k.solid(x0, r0, x1, r1)


def tripod_telescope(k, cx, cr):
    """A brass telescope on a wooden tripod, trained on the gallery."""
    top = (cx, cr, 1.05)
    for i in range(3):
        a = i * 2 * math.pi / 3 + 0.5
        k.tube((cx + math.cos(a) * 0.32, cr + math.sin(a) * 0.32, 0.0), top, 0.022, (WOOD, 0.1), 'tripod', verts=6)
    k.sphere(cx, cr, 1.06, 0.05, 0.05, BRASS_D, 'tripod_head', segs=8)
    k.tube((cx + 0.12, cr + 0.42, 1.0), (cx - 0.1, cr - 0.5, 1.42), 0.065, BRASS, 'telescope', rb=0.045, verts=14)
    for t in (0.25, 0.6):
        p = (cx + 0.12 - 0.22 * t, cr + 0.42 - 0.92 * t, 1.0 + 0.42 * t)
        k.tube((p[0] + 0.004, p[1] + 0.017, p[2] - 0.008), (p[0] - 0.004, p[1] - 0.017, p[2] + 0.008), 0.072, BRASS_D,
               'telescope_band', verts=14)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def side_table_lamp(k, cx, cr):
    """A small round table by the captain's chair: a lamp, a cup of tea."""
    k.cyl(cx, cr, 0, 0.05, 0.16, (WOOD_D, 0.1), 'st_foot', verts=10)
    k.cyl(cx, cr, 0.05, 0.56, 0.04, (WOOD, 0.1), 'st_post', verts=8)
    k.cyl(cx, cr, 0.56, 0.62, 0.26, (WOOD, 0.08), 'st_top', verts=16)
    desk_lamp(k, cx - 0.08, cr - 0.05, 0.62, energy=5.0)
    k.cyl(cx + 0.12, cr + 0.08, 0.62, 0.64, 0.07, CANDLE, 'saucer', verts=10)
    k.cyl(cx + 0.12, cr + 0.08, 0.64, 0.71, 0.045, CANDLE, 'cup', verts=10)
    k.cyl(cx + 0.12, cr + 0.08, 0.705, 0.712, 0.038, '#6a3a1a', 'tea', verts=10)
    k.solid(cx - 0.28, cr - 0.28, cx + 0.28, cr + 0.28)


def ship_bell(k, cx, r_face, z):
    k.box(cx - 0.03, r_face, z + 0.3, cx + 0.03, r_face + 0.3, z + 0.36, BRASS_D, 'bell_bracket')
    k.box(cx - 0.03, r_face, z + 0.1, cx + 0.03, r_face + 0.05, z + 0.36, BRASS_D, 'bell_bracket')
    k.cone(cx, r_face + 0.27, z - 0.02, z + 0.28, 0.17, 0.07, BRASS, 'bell', verts=16)
    k.sphere(cx, r_face + 0.27, z + 0.3, 0.06, 0.04, BRASS, 'bell_crown', segs=8)
    k.tube((cx, r_face + 0.27, z - 0.02), (cx + 0.02, r_face + 0.3, z - 0.32), 0.012, '#d8c8a0', 'bell_rope', verts=5)


def wall_clock(k, cx, r_face, z, rad=0.26):
    k.cyl_y(cx, r_face, r_face + 0.06, z, rad + 0.05, rad + 0.05, BRASS, 'clock_rim', verts=20)
    k.cyl_y(cx, r_face + 0.06, r_face + 0.07, z, rad, rad, '#efe6cc', 'clock_face', verts=20)
    for i in range(12):
        a = i * math.pi / 6
        k.box(cx + math.cos(a) * rad * 0.82 - 0.012, r_face + 0.07, z + math.sin(a) * rad * 0.82 - 0.012,
              cx + math.cos(a) * rad * 0.82 + 0.012, r_face + 0.075, z + math.sin(a) * rad * 0.82 + 0.012, INK, 'clock_tick')
    k.tube((cx, r_face + 0.075, z), (cx + 0.08, r_face + 0.075, z + 0.14), 0.01, INK, 'clock_hand', verts=4)
    k.tube((cx, r_face + 0.075, z), (cx - 0.15, r_face + 0.075, z - 0.04), 0.008, INK, 'clock_hand', verts=4)


def ship_portrait(k, cx, r_face, z0, w=1.4, h=0.85):
    """A painting of the Wayfarer under full light-sail, in a gilt frame."""
    k.box(cx - w / 2 - 0.08, r_face, z0 - 0.08, cx + w / 2 + 0.08, r_face + 0.06, z0 + h + 0.08, BRASS, 'frame')
    k.box(cx - w / 2, r_face + 0.04, z0, cx + w / 2, r_face + 0.08, z0 + h, '#141c34', 'canvas')
    for i in range(14):
        k.box(cx - w / 2 + k.rng.uniform(0.05, w - 0.05), r_face + 0.08, z0 + k.rng.uniform(0.35, h - 0.05),
              cx - w / 2 + 0.02 + k.rng.uniform(0.05, w - 0.05), r_face + 0.085, z0 + 0.02 + k.rng.uniform(0.35, h - 0.05),
              '#e8e0ff', 'canvas_star')
    k.box(cx - 0.42, r_face + 0.08, z0 + 0.14, cx + 0.38, r_face + 0.095, z0 + 0.26, '#2a3a6a', 'canvas_hull')
    k.box(cx - 0.36, r_face + 0.08, z0 + 0.1, cx + 0.3, r_face + 0.095, z0 + 0.14, '#c8a040', 'canvas_keel')
    for i, mx in enumerate((-0.22, 0.0, 0.2)):
        k.box(cx + mx - 0.012, r_face + 0.08, z0 + 0.26, cx + mx + 0.012, r_face + 0.095, z0 + 0.7 - abs(mx), '#3a2a1a', 'canvas_mast')
        k.box(cx + mx - 0.1, r_face + 0.085, z0 + 0.34, cx + mx + 0.1, r_face + 0.1, z0 + 0.62 - abs(mx), '#2a6a7a',
              'canvas_sail', emit=('#40c8d8', 0.35))


# ---- the chart table ---------------------------------------------------------------------------
def chart_table(k, cx, cr, R=1.05):
    """Round chart table: carved pedestal, brass rim, a star chart inlaid in
    the top that glows faintly (the hologram rises over it, drawn live)."""
    k.cyl(cx, cr, 0, 0.1, 0.5, (WOOD_D, 0.1), 'table_foot', verts=16)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        k.bar(cx, cr, cx + math.cos(a) * 0.62, cr + math.sin(a) * 0.62, 0.0, 0.14, 0.14, (WOOD_D, 0.1), 'table_claw', bevel=0.03)
    k.cyl(cx, cr, 0.1, 0.66, 0.26, (WOOD, 0.1), 'table_column', verts=14)
    for z in (0.18, 0.56):
        k.cyl(cx, cr, z, z + 0.05, 0.3, BRASS, 'table_band', verts=14)
    k.cyl(cx, cr, 0.66, 0.74, R - 0.08, (WOOD_D, 0.1), 'table_apron', verts=32)
    k.cyl(cx, cr, 0.74, 0.8, R, (WOOD, 0.08), 'table_top', verts=40)
    k.cyl(cx, cr, 0.78, 0.815, R + 0.03, BRASS, 'table_rim', verts=40)
    k.cyl(cx, cr, 0.8, 0.82, R - 0.06, (WOOD_D, 0.08), 'table_top', verts=40)
    k.cyl(cx, cr, 0.82, 0.826, R - 0.14, NAVY, 'chart_glass', emit=('#203a6a', 0.35), verts=40)
    # the chart: rings of orbits, routes, stars
    for rr in (0.25, 0.5, 0.75):
        n = 30
        for i in range(n):
            if i % 3 == 2:
                continue
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.bar(cx + math.cos(a0) * rr, cr + math.sin(a0) * rr, cx + math.cos(a1) * rr, cr + math.sin(a1) * rr,
                  0.826, 0.83, 0.012, '#0c2030', 'chart_orbit', emit=(CYAN, 0.45))
    marks = [(0.5, 0.6, '#60e090'), (0.75, 2.2, '#c060f0'), (0.25, 3.8, '#ffb050'), (0.75, 5.0, '#e8e0ff')]
    for rr, a, col in marks:
        k.cyl(cx + math.cos(a) * rr, cr + math.sin(a) * rr, 0.826, 0.836, 0.05, '#0c2030', 'chart_world', emit=(col, 0.9), verts=8)
    for i in range(40):
        a, rr = k.rng.uniform(0, 2 * math.pi), k.rng.uniform(0.1, R - 0.2)
        k.box(cx + math.cos(a) * rr - 0.01, cr + math.sin(a) * rr - 0.01, 0.826, cx + math.cos(a) * rr + 0.01,
              cr + math.sin(a) * rr + 0.01, 0.832, '#0c2030', 'chart_star', emit=('#c0e0ff', 0.6))
    # instruments left on the rim: dividers and a rolled chart
    k.tube((cx - 0.7, cr + 0.55, 0.84), (cx - 0.35, cr + 0.72, 0.84), 0.008, BRASS, 'dividers', verts=4)
    k.tube((cx - 0.7, cr + 0.55, 0.84), (cx - 0.42, cr + 0.48, 0.84), 0.008, BRASS, 'dividers', verts=4)
    k.cyl_x(cx + 0.35, cx + 0.95, cr + 0.62, 0.86, 0.045, 0.045, (PARCH, 0.05), 'chart_roll', verts=10)
    k.point_light(cx, cr, 1.3, CYAN, 18, radius=0.4, group='pulse')
    k.solid(cx - R + 0.1, cr - R + 0.25, cx + R - 0.1, cr + R - 0.25)


def wingback(k, cx, cr, tone=LEATHER):
    """Captain's wingback armchair, back to the camera, facing the chart
    table: buttoned leather, rolled arms, brass nailheads, claw feet."""
    lt = (tone, 0.08)
    for dx, dr in ((-0.36, -0.28), (0.36, -0.28), (-0.36, 0.26), (0.36, 0.26)):
        k.cyl(cx + dx, cr + dr, 0, 0.16, 0.05, (WOOD_DD, 0.1), 'chair_leg', verts=8)
        k.sphere(cx + dx, cr + dr, 0.03, 0.05, 0.03, BRASS, 'chair_foot', segs=8)
    k.box(cx - 0.42, cr - 0.34, 0.16, cx + 0.42, cr + 0.32, 0.46, lt, 'chair_base', bevel=0.04)
    k.box(cx - 0.34, cr - 0.34, 0.46, cx + 0.34, cr + 0.16, 0.56, (shade(tone, 1.15), 0.08), 'chair_cushion', bevel=0.04)
    k.box(cx - 0.42, cr + 0.12, 0.46, cx + 0.42, cr + 0.34, 1.32, lt, 'chair_back', bevel=0.06)
    k.cyl_y(cx, cr + 0.12, cr + 0.34, 1.32, 0.42, 0.14, lt, 'chair_crest', verts=16)
    for s_ in (-1, 1):
        k.box(cx + s_ * 0.42 - 0.07, cr - 0.06, 0.7, cx + s_ * 0.42 + 0.07, cr + 0.34, 1.3, lt, 'chair_wing', bevel=0.04)
        k.box(cx + s_ * 0.42 - 0.08, cr - 0.34, 0.46, cx + s_ * 0.42 + 0.08, cr + 0.1, 0.66, lt, 'chair_arm', bevel=0.04)
        k.cyl_y(cx + s_ * 0.42, cr - 0.36, cr + 0.1, 0.68, 0.09, 0.07, (shade(tone, 1.1), 0.08), 'chair_roll', verts=12)
    # the back, seen from the camera: buttons, piping and a row of nailheads
    for z in (0.75, 1.0, 1.22):
        for dx in (-0.2, 0.0, 0.2):
            k.sphere(cx + dx + (0.1 if z == 1.0 else 0), cr + 0.35, z, 0.025, 0.025, shade(tone, 0.6), 'chair_button', segs=6)
    x = cx - 0.38
    while x <= cx + 0.38:
        k.sphere(x, cr + 0.35, 0.5, 0.018, 0.018, BRASS, 'nailhead', segs=6)
        x += 0.07
    k.solid(cx - 0.45, cr - 0.35, cx + 0.45, cr + 0.35)


# ---- stations along the gallery ---------------------------------------------------------------
def chart_desk(k, x0, x1, r_face, d=0.82):
    """Navigator's desk under the windows: map drawers, a slanted top with a
    chart pinned down by brass weights, a lamp, rolled charts in a rack."""
    r1 = r_face + d
    k.box(x0, r_face, 0, x1, r1, 0.74, (WOOD_D, 0.1), 'desk', bevel=0.02)
    rows = 4
    for i in range(rows):
        za, zb = 0.08 + i * 0.16, 0.08 + i * 0.16 + 0.13
        k.box(x0 + 0.06, r1, za, x1 - 0.06, r1 + 0.02, zb, (WOOD, 0.1), 'drawer')
        for xx in (x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.7):
            k.box(xx - 0.06, r1 + 0.02, (za + zb) / 2 - 0.015, xx + 0.06, r1 + 0.035, (za + zb) / 2 + 0.015, BRASS, 'pull')
    k.box(x0 - 0.03, r_face, 0.74, x1 + 0.03, r1 + 0.04, 0.8, (WOOD, 0.08), 'desk_top', bevel=0.01)
    # slanted chart board
    zb_, zt_, rb_, rt_ = 0.82, 1.0, r1 - 0.06, r_face + 0.1
    k.poly([(x0 + 0.1, rb_, zb_), (x1 - 0.9, rb_, zb_), (x1 - 0.9, rt_, zt_), (x0 + 0.1, rt_, zt_)], (WOOD_DD, 0.08), 'chart_board')
    cx0, cx1 = x0 + 0.2, x1 - 1.0
    k.poly([(cx0, rb_ - 0.05, zb_ + 0.012), (cx1, rb_ - 0.05, zb_ + 0.012), (cx1, rt_ + 0.05, zt_ - 0.005),
            (cx0, rt_ + 0.05, zt_ - 0.005)], (PARCH, 0.06), 'chart')
    def on(tx, tr):   # a point on the chart surface (tx, tr in 0..1)
        rr = rb_ - 0.05 + (rt_ + 0.05 - (rb_ - 0.05)) * tr
        zz = zb_ + 0.012 + (zt_ - 0.005 - zb_ - 0.012) * tr + 0.006
        return (cx0 + (cx1 - cx0) * tx, rr, zz)
    coast = [(0.05, 0.3), (0.2, 0.45), (0.3, 0.35), (0.42, 0.6), (0.5, 0.55), (0.6, 0.75), (0.75, 0.7), (0.9, 0.85)]
    for a, b in zip(coast, coast[1:]):
        k.tube(on(*a), on(*b), 0.006, INK, 'chart_ink', verts=4)
    route = [(0.15, 0.8), (0.35, 0.65), (0.55, 0.3), (0.85, 0.2)]
    for a, b in zip(route, route[1:]):
        k.tube(on(*a), on(*b), 0.007, '#a02a20', 'chart_route', verts=4)
    for t in ((0.05, 0.05), (0.95, 0.05), (0.05, 0.95), (0.95, 0.95)):
        p = on(*t)
        k.cyl(p[0], p[1], p[2], p[2] + 0.04, 0.035, BRASS, 'chart_weight', verts=8)
    desk_lamp(k, x1 - 0.7, r_face + 0.35, 0.8, energy=6.0)
    # rolled charts standing in a rack at the end of the desk
    k.box(x1 - 0.5, r_face + 0.12, 0.8, x1 - 0.08, r1 - 0.12, 0.98, (WOOD, 0.1), 'chart_rack')
    for i in range(7):
        cx = x1 - 0.44 + (i % 4) * 0.1
        cr = r_face + 0.24 + (i // 4) * 0.2
        h = k.rng.uniform(1.15, 1.4)
        k.cyl(cx, cr, 0.8, h, 0.04, (k.rng.choice([PARCH, '#c8b080', '#e0d4b0']), 0.06), 'chart_roll', verts=8)
    k.solid(x0, r_face, x1, r1)


def radio_desk(k, x0, x1, r_face, d=0.82):
    """Comms: a desk with a wooden wireless set (cloth grille, a lit amber
    tuning dial), a brass horn, a headset and a telegraph key."""
    r1 = r_face + d
    k.box(x0, r_face, 0, x1, r1, 0.74, (WOOD_D, 0.1), 'desk', bevel=0.02)
    for xx in (x0 + 0.05, x1 - 0.55):
        k.box(xx, r1, 0.08, xx + 0.5, r1 + 0.02, 0.66, (WOOD, 0.1), 'desk_door')
        k.box(xx + (0.42 if xx == x0 + 0.05 else 0.04), r1 + 0.02, 0.36, xx + (0.46 if xx == x0 + 0.05 else 0.08),
              r1 + 0.035, 0.44, BRASS, 'pull')
    k.box(x0 - 0.03, r_face, 0.74, x1 + 0.03, r1 + 0.04, 0.8, (WOOD, 0.08), 'desk_top', bevel=0.01)
    # the set
    sx0, sx1 = x0 + 0.5, x1 - 0.7
    k.box(sx0, r_face + 0.05, 0.8, sx1, r_face + 0.5, 1.42, (WOOD_L, 0.1), 'radio', bevel=0.03)
    k.cyl_y((sx0 + sx1) / 2, r_face + 0.05, r_face + 0.5, 1.42, (sx1 - sx0) / 2, 0.16, (WOOD_L, 0.1), 'radio_crown', verts=18)
    k.box(sx0 + 0.12, r_face + 0.5, 1.02, sx1 - 0.12, r_face + 0.51, 1.36, ('#5a3a28', 0.2), 'grille')
    for i in range(5):
        xx = sx0 + 0.2 + i * (sx1 - sx0 - 0.4) / 4
        k.box(xx - 0.01, r_face + 0.51, 1.04, xx + 0.01, r_face + 0.52, 1.34, WOOD_D, 'grille_slat')
    k.box(sx0 + 0.12, r_face + 0.5, 0.86, sx1 - 0.12, r_face + 0.52, 0.97, '#2a1a08', 'dial', emit=(AMBER, 0.85))
    k.box((sx0 + sx1) / 2 - 0.01, r_face + 0.52, 0.87, (sx0 + sx1) / 2 + 0.01, r_face + 0.53, 0.96, '#a02a20', 'dial_needle')
    for xx in (sx0 + 0.06, sx1 - 0.06):
        k.cyl_y(xx, r_face + 0.5, r_face + 0.56, 0.92, 0.045, 0.045, BRASS, 'knob', verts=10)
    k.point_light((sx0 + sx1) / 2, r_face + 0.8, 1.0, AMBER, 8, radius=0.1, group='pulse')
    # horn speaker
    hx = x1 - 0.35
    k.cyl(hx, r_face + 0.3, 0.8, 0.86, 0.12, BRASS_D, 'horn_base', verts=10)
    k.tube((hx, r_face + 0.3, 0.86), (hx, r_face + 0.3, 1.2), 0.025, BRASS, 'horn_neck', verts=8)
    k.tube((hx, r_face + 0.3, 1.2), (hx + 0.05, r_face + 0.42, 1.42), 0.04, BRASS, 'horn', rb=0.2, verts=16)
    # headset and telegraph key
    k.tube((x0 + 0.15, r_face + 0.45, 0.83), (x0 + 0.35, r_face + 0.45, 0.83), 0.02, '#2a1a10', 'headset', verts=6)
    for xx in (x0 + 0.13, x0 + 0.37):
        k.cyl(xx, r_face + 0.45, 0.8, 0.86, 0.05, '#3a2a1a', 'earpiece', verts=8)
    k.box(x1 - 0.65, r1 - 0.3, 0.8, x1 - 0.45, r1 - 0.15, 0.82, WOOD_DD, 'key_base')
    k.tube((x1 - 0.64, r1 - 0.22, 0.85), (x1 - 0.46, r1 - 0.22, 0.83), 0.008, BRASS, 'key_lever', verts=4)
    k.sphere(x1 - 0.47, r1 - 0.22, 0.85, 0.02, 0.015, '#1a1a1a', 'key_knob', segs=6)
    # a speaking tube out of the wall
    k.tube((x0 + 0.15, r_face, 1.5), (x0 + 0.15, r_face + 0.2, 1.5), 0.03, BRASS, 'speaking_tube', verts=8)
    k.tube((x0 + 0.15, r_face + 0.2, 1.5), (x0 + 0.15, r_face + 0.3, 1.42), 0.03, BRASS, 'speaking_tube', rb=0.07, verts=10)
    k.solid(x0, r_face, x1, r1)


def letter_rack(k, x0, x1, r_face, z0=0.95, z1=2.25, cols=4, rows=3):
    """Pigeonholes for letters on the wall, a writing shelf under them with
    an inkwell and a quill. Returns the slots (x, z) for envelopes."""
    d = 0.3
    k.box(x0, r_face, z0, x1, r_face + d, z1, (WOOD_D, 0.1), 'rack_back')
    cw, rh = (x1 - x0) / cols, (z1 - z0) / rows
    slots = []
    for i in range(cols):
        for j in range(rows):
            a, b = x0 + i * cw + 0.03, x0 + (i + 1) * cw - 0.03
            za, zb = z0 + j * rh + 0.03, z0 + (j + 1) * rh - 0.03
            k.box(a, r_face + d - 0.02, za, b, r_face + d, zb, '#140c06', 'hole')
            slots.append(((a + b) / 2, za, b - a))
    for i in range(cols + 1):
        xx = x0 + i * cw
        k.box(xx - 0.025, r_face, z0, xx + 0.025, r_face + d + 0.02, z1, (WOOD, 0.1), 'rack_div')
    for j in range(rows + 1):
        zz = z0 + j * rh
        k.box(x0, r_face, zz - 0.025, x1, r_face + d + 0.02, zz + 0.025, (WOOD, 0.1), 'rack_shelf')
    k.cyl_y((x0 + x1) / 2, r_face, r_face + d + 0.02, z1 + 0.02, (x1 - x0) / 2, 0.14, (WOOD, 0.1), 'rack_crown', verts=16)
    k.box(x0 - 0.05, r_face, z0 - 0.08, x1 + 0.05, r_face + 0.42, z0 - 0.02, (WOOD, 0.08), 'writing_shelf')
    k.cyl(x0 + 0.2, r_face + 0.25, z0 - 0.02, z0 + 0.06, 0.05, '#1a2a3a', 'inkwell', verts=10)
    k.tube((x0 + 0.2, r_face + 0.25, z0 + 0.04), (x0 + 0.34, r_face + 0.18, z0 + 0.28), 0.012, '#f0ece0', 'quill', rb=0.03, verts=6)
    return slots


def envelope(k, x, z, w, r_face, d=0.3, seal=True):
    k.box(x - w * 0.36, r_face + d - 0.12, z, x + w * 0.36, r_face + d - 0.01, z + 0.16, (CANDLE, 0.05), 'envelope')
    if seal:
        k.cyl_y(x, r_face + d - 0.01, r_face + d + 0.005, z + 0.08, 0.025, 0.025, '#a02a20', 'seal', verts=8)


def gauge_cabinet(k, cx, cr, w=1.6):
    """Engineering: a wood-and-brass cabinet of aether gauges with a caged
    glass column glowing violet, pipes running off into the wall."""
    x0, x1, d = cx - w / 2, cx + w / 2, 0.66
    r0, r1 = cr - d / 2, cr + d / 2
    k.box(x0, r0, 0, x1, r1, 1.05, (WOOD_D, 0.1), 'cabinet', bevel=0.02)
    k.box(x0 - 0.03, r0, 1.05, x1 + 0.03, r1 + 0.03, 1.12, (WOOD, 0.08), 'cabinet_top', bevel=0.01)
    k.box(x0 + 0.06, r1, 0.08, x1 - 0.06, r1 + 0.02, 0.36, (WOOD, 0.1), 'cabinet_panel')
    for i, xx in enumerate((x0 + 0.32, cx, x1 - 0.32)):
        zc = 0.72
        k.cyl_y(xx, r1, r1 + 0.05, zc, 0.2, 0.2, BRASS, 'gauge_bezel', verts=18)
        k.cyl_y(xx, r1 + 0.05, r1 + 0.06, zc, 0.16, 0.16, '#efe6cc', 'gauge_face', emit=('#ffe8b0', 0.3), verts=18)
        a = math.radians([130, 70, 30][i])
        k.tube((xx, r1 + 0.07, zc), (xx + math.cos(a) * 0.13, r1 + 0.07, zc + math.sin(a) * 0.13), 0.008, '#a02a20', 'needle', verts=4)
        k.box(xx - 0.06, r1 + 0.06, zc - 0.13, xx + 0.06, r1 + 0.065, zc - 0.11, '#a02a20', 'redline')
    # the aether column
    tc = x1 - 0.3
    k.cyl(tc, cr - 0.05, 1.12, 1.2, 0.17, BRASS, 'column_base', verts=14)
    k.cyl(tc, cr - 0.05, 1.2, 2.05, 0.12, '#2a1a4a', 'aether', emit=(AETHER, 1.0), verts=14)
    k.cyl(tc, cr - 0.05, 2.05, 2.14, 0.17, BRASS, 'column_cap', verts=14)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        k.box(tc + math.cos(a) * 0.15 - 0.015, cr - 0.05 + math.sin(a) * 0.15 - 0.015, 1.2,
              tc + math.cos(a) * 0.15 + 0.015, cr - 0.05 + math.sin(a) * 0.15 + 0.015, 2.05, BRASS_D, 'cage')
    k.point_light(tc, cr + 0.3, 1.6, AETHER, 16, radius=0.12, group='pulse')
    # pipes and a valve wheel
    k.tube((x0 + 0.2, cr - 0.1, 1.12), (x0 + 0.2, cr - 0.1, 1.7), 0.05, BRASS_D, 'pipe', verts=10)
    k.tube((x0 + 0.2, cr - 0.1, 1.7), (x0 - 0.2, cr - 0.1, 1.7), 0.05, BRASS_D, 'pipe', verts=10)
    k.cyl_y(x0 + 0.2, cr - 0.05, cr + 0.05, 1.45, 0.12, 0.12, '#a02a20', 'valve', verts=12)
    k.cyl_y(x0 + 0.2, cr - 0.06, cr + 0.06, 1.45, 0.07, 0.07, '#5a1a14', 'valve_hole', verts=10)
    k.solid(x0, r0, x1, r1)


def aether_scope(k, cx, cr, w=1.5):
    """Sensors: a brass scope on a wooden stand beside a round green scan
    screen, a sweep line across it."""
    x0, x1, d = cx - w / 2, cx + w / 2, 0.62
    r0, r1 = cr - d / 2, cr + d / 2
    k.box(x0, r0, 0, x1, r1, 0.86, (WOOD_D, 0.1), 'scope_cab', bevel=0.02)
    k.box(x0 - 0.03, r0, 0.86, x1 + 0.03, r1 + 0.03, 0.92, (WOOD, 0.08), 'scope_top', bevel=0.01)
    sx = x0 + 0.5
    k.cyl_y(sx, r1, r1 + 0.05, 0.5, 0.3, 0.3, BRASS, 'screen_bezel', verts=22)
    k.cyl_y(sx, r1 + 0.05, r1 + 0.06, 0.5, 0.25, 0.25, '#0a2a14', 'scan', emit=('#30a060', 0.8), verts=22)
    for rr in (0.08, 0.16, 0.23):
        n = 20
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.tube((sx + math.cos(a0) * rr, r1 + 0.065, 0.5 + math.sin(a0) * rr),
                   (sx + math.cos(a1) * rr, r1 + 0.065, 0.5 + math.sin(a1) * rr), 0.004, '#0a2a14', 'scan_ring',
                   emit=('#80ffa0', 0.7), verts=4)
    k.tube((sx, r1 + 0.07, 0.5), (sx + 0.17, r1 + 0.07, 0.67), 0.008, '#0a2a14', 'sweep', emit=('#c0ffd0', 1.0), verts=4)
    k.cyl_y(sx + 0.1, r1 + 0.06, r1 + 0.07, 0.42, 0.02, 0.02, '#0a2a14', 'blip', emit=('#e0ffe0', 1.0), verts=6)
    k.point_light(sx, r1 + 0.4, 0.6, '#40c080', 6, radius=0.1, group='pulse')
    # the scope, angled up at the windows
    tx = x1 - 0.45
    k.cyl(tx, cr, 0.92, 1.0, 0.16, BRASS_D, 'scope_mount', verts=12)
    k.tube((tx, cr, 1.0), (tx, cr, 1.3), 0.04, BRASS, 'scope_post', verts=8)
    k.tube((tx + 0.08, cr + 0.25, 1.2), (tx - 0.1, cr - 0.45, 1.65), 0.07, BRASS, 'scope_tube', rb=0.05, verts=14)
    k.cyl(tx + 0.08, cr + 0.25, 1.17, 1.23, 0.07, '#2a2a2a', 'eyepiece', verts=10)
    for i in range(4):
        k.box(x0 + 0.95 + i * 0.1, r1, 0.7, x0 + 1.0 + i * 0.1, r1 + 0.02, 0.76, k.rng.choice(['#60e090', AMBER, '#e84040']),
              'lamp', emit=(k.rng.choice(['#60e090', AMBER]), 0.8))
    k.solid(x0, r0, x1, r1)


def lectern(k, cx, cr):
    """The ship's chandler: a lectern with the stores ledger open on it."""
    k.box(cx - 0.3, cr - 0.2, 0, cx + 0.3, cr + 0.2, 0.08, (WOOD_D, 0.1), 'lectern_foot')
    k.box(cx - 0.12, cr - 0.08, 0.08, cx + 0.12, cr + 0.08, 0.9, (WOOD, 0.1), 'lectern_post', bevel=0.02)
    zb, zt, rb, rt = 0.92, 1.08, cr + 0.26, cr - 0.24
    k.poly([(cx - 0.38, rb, zb), (cx + 0.38, rb, zb), (cx + 0.38, rt, zt), (cx - 0.38, rt, zt)], (WOOD_D, 0.08), 'lectern_top')
    k.box(cx - 0.38, rb - 0.02, zb - 0.06, cx + 0.38, rb + 0.02, zb + 0.02, (WOOD, 0.08), 'lectern_lip')
    for s_ in (-1, 1):
        xa, xb = (cx - 0.34, cx - 0.01) if s_ < 0 else (cx + 0.01, cx + 0.34)
        k.poly([(xa, rb - 0.03, zb + 0.015), (xb, rb - 0.03, zb + 0.015 + (0.01 if s_ < 0 else 0.0)),
                (xb, rt + 0.03, zt + 0.0), (xa, rt + 0.03, zt - (0.0 if s_ < 0 else 0.01))], (CANDLE, 0.05), 'ledger_page')
        for i in range(5):
            t = 0.2 + i * 0.13
            rr, zz = rb - 0.03 + (rt + 0.03 - rb + 0.03) * t, zb + 0.02 + (zt - zb) * t
            k.box(xa + 0.04, rr - 0.006, zz, xb - 0.08 * k.rng.random() - 0.04, rr + 0.006, zz + 0.006, INK, 'ledger_line')
    k.tube((cx + 0.2, cr + 0.05, 1.04), (cx + 0.36, cr - 0.1, 1.3), 0.01, '#f0ece0', 'quill', rb=0.03, verts=6)
    k.solid(cx - 0.35, cr - 0.25, cx + 0.35, cr + 0.25)


def sea_chest(k, cx, cr, w=0.84, d=0.5, h=0.44):
    x0, x1, r0, r1 = cx - w / 2, cx + w / 2, cr - d / 2, cr + d / 2
    k.box(x0, r0, 0, x1, r1, h - 0.08, ('#5a3418', 0.12), 'chest', bevel=0.02)
    k.cyl_x(x0, x1, cr, h - 0.08, d / 2, 0.1, ('#5a3418', 0.12), 'chest_lid', verts=14)
    for xx in (x0 + 0.1, x1 - 0.14):
        k.box(xx, r0 - 0.01, 0, xx + 0.04, r1 + 0.01, h + 0.02, '#2a2a30', 'chest_strap')
    k.box(cx - 0.05, r1, h - 0.18, cx + 0.05, r1 + 0.02, h - 0.06, BRASS, 'chest_lock')
    k.solid(x0, r0, x1, r1)


def coil_of_rope(k, cx, cr, z=0.0):
    for i in range(4):
        k.cyl(cx, cr, z + i * 0.05, z + i * 0.05 + 0.05, 0.22 - i * 0.02, ('#b09060', 0.15), 'rope', verts=14)
    k.cyl(cx, cr, z + 0.2, z + 0.205, 0.08, '#3a2a1a', 'rope_hole', verts=10)


def plinth(k, cx, cr):
    """Wooden plinth for a curio; returns its top height."""
    k.box(cx - 0.3, cr - 0.3, 0, cx + 0.3, cr + 0.3, 0.1, (WOOD_D, 0.1), 'plinth_base')
    k.box(cx - 0.22, cr - 0.22, 0.1, cx + 0.22, cr + 0.22, 0.86, (WOOD, 0.1), 'plinth', bevel=0.02)
    k.box(cx - 0.28, cr - 0.28, 0.86, cx + 0.28, cr + 0.28, 0.92, (WOOD_D, 0.1), 'plinth_top', bevel=0.01)
    k.box(cx - 0.23, cr + 0.22, 0.78, cx + 0.23, cr + 0.23, 0.8, BRASS, 'plinth_band')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
    return 0.92


def planter(k, cx, cr):
    """Brass-banded tub for a deck plant; returns the soil height."""
    k.cyl(cx, cr, 0, 0.42, 0.28, ('#6a4422', 0.12), 'planter', verts=14)
    for z in (0.06, 0.34):
        k.cyl(cx, cr, z, z + 0.04, 0.29, BRASS_D, 'planter_band', verts=14)
    k.cyl(cx, cr, 0.42, 0.44, 0.25, '#2a1a10', 'soil', verts=14)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
    return 0.44


def lamp_plate(k, cx, cr):
    k.cyl(cx, cr, 0, 0.012, 0.24, BRASS_D, 'lamp_plate', verts=12)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def flag_socket(k, cx, cr):
    k.cyl(cx, cr, 0, 0.1, 0.16, BRASS_D, 'flag_socket', verts=10)
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


# ---- decor (variants) ------------------------------------------------------------------------
def spore_fern(k, cx, cr, z):
    for i in range(11):
        a = i * 2 * math.pi / 11 + k.rng.uniform(-0.2, 0.2)
        L = k.rng.uniform(0.45, 0.7)
        tip = (cx + math.cos(a) * L * 0.7, cr + math.sin(a) * L * 0.45, z + k.rng.uniform(0.45, 0.85))
        mid = (cx + math.cos(a) * L * 0.35, cr + math.sin(a) * L * 0.22, z + 0.4)
        k.tube((cx, cr, z), mid, 0.03, ('#2a6a4a', 0.1), 'frond', rb=0.025, verts=5)
        k.tube(mid, tip, 0.025, ('#3a8a5a', 0.1), 'frond', rb=0.008, verts=5)
        if i % 3 == 0:
            k.sphere(tip[0], tip[1], tip[2], 0.03, 0.03, '#0a3a30', 'spore', emit=('#60f0c0', 1.0), segs=6)
    k.point_light(cx, cr + 0.3, z + 0.6, '#60f0c0', 3, radius=0.1)


def lemon_tree(k, cx, cr, z):
    k.tube((cx, cr, z), (cx + 0.05, cr, z + 0.75), 0.04, ('#5a3a20', 0.1), 'trunk', rb=0.03, verts=8)
    for (dx, dr, dz, rx) in ((0, 0, 1.05, 0.38), (-0.2, 0.05, 0.9, 0.24), (0.22, -0.03, 0.95, 0.26), (0.05, 0.1, 1.28, 0.24)):
        k.blob(cx + dx, cr + dr, z + dz, rx, rx * 0.8, rx * 0.75, ('#3e6a2a', 0.15), 'leaves', segs=10)
    for i in range(7):
        a = k.rng.uniform(0, 2 * math.pi)
        k.sphere(cx + math.cos(a) * 0.3, cr + 0.12 + math.sin(a) * 0.12, z + k.rng.uniform(0.85, 1.25), 0.045, 0.05,
                 '#f0d040', 'lemon', segs=8)


def station_vine(k, cx, cr, z):
    """A hydroponic vine from Enigma under its own violet grow light."""
    k.tube((cx - 0.2, cr, z), (cx - 0.2, cr, z + 1.6), 0.015, BRASS_D, 'trellis', verts=5)
    k.tube((cx + 0.2, cr, z), (cx + 0.2, cr, z + 1.6), 0.015, BRASS_D, 'trellis', verts=5)
    for zz in (0.5, 1.0, 1.5):
        k.tube((cx - 0.2, cr, z + zz), (cx + 0.2, cr, z + zz), 0.012, BRASS_D, 'trellis', verts=5)
    for i in range(18):
        t = i / 17
        x = cx + math.sin(t * 9) * 0.18
        k.blob(x, cr + 0.03, z + 0.1 + t * 1.45, 0.09, 0.05, 0.07, ('#3a7a3a', 0.1), 'leaf', segs=8)
        if i % 4 == 1:
            k.sphere(x + 0.05, cr + 0.07, z + 0.1 + t * 1.45, 0.03, 0.03, '#c050c0', 'bloom', segs=6)
    k.box(cx - 0.26, cr - 0.05, z + 1.62, cx + 0.26, cr + 0.05, z + 1.68, '#2a1a3a', 'growlight', emit=('#c080ff', 1.0))
    k.point_light(cx, cr + 0.2, z + 1.4, '#b070ff', 8, radius=0.1)


def ship_lantern(k, cx, cr):
    k.cyl(cx, cr, 0.01, 0.06, 0.16, BRASS_D, 'stand_foot', verts=10)
    k.tube((cx, cr, 0.06), (cx, cr, 1.45), 0.025, BRASS, 'stand', verts=8)
    k.tube((cx, cr, 1.45), (cx + 0.25, cr, 1.5), 0.02, BRASS, 'stand_arm', verts=6)
    lantern(k, cx + 0.25, cr, 1.12, 1.4, s=0.11)
    k.tube((cx + 0.25, cr, 1.52), (cx + 0.25, cr, 1.5), 0.02, '#2a2a30', 'hook', verts=6)
    k.point_light(cx + 0.25, cr + 0.3, 1.25, '#ffb060', 40, radius=0.12, group='flicker')


def neon_tube(k, cx, cr):
    k.cyl(cx, cr, 0.01, 0.07, 0.15, '#1a1a24', 'neon_foot', verts=10)
    k.cyl(cx, cr, 0.07, 1.55, 0.04, '#1a0a2a', 'neon', emit=('#ff40c0', 1.0), verts=10)
    k.cyl(cx, cr, 1.55, 1.6, 0.05, '#1a1a24', 'neon_cap', verts=10)
    k.point_light(cx, cr + 0.25, 1.0, '#ff40c0', 22, radius=0.1)


def crystal_brazier(k, cx, cr):
    for i in range(3):
        a = i * 2 * math.pi / 3 + 0.4
        k.tube((cx + math.cos(a) * 0.22, cr + math.sin(a) * 0.22, 0.0), (cx, cr, 0.62), 0.018, BRASS_D, 'tripod', verts=6)
    k.cyl(cx, cr, 0.6, 0.72, 0.2, BRASS, 'bowl', verts=14)
    for (dx, dr, h, col) in ((0, 0, 0.42, '#c080ff'), (-0.08, 0.03, 0.28, '#ff80c0'), (0.09, -0.02, 0.32, '#80c0ff'),
                             (0.04, 0.07, 0.22, '#c080ff')):
        k.cone(cx + dx, cr + dr, 0.7, 0.7 + h, 0.06, 0.0, '#3a2050', 'crystal', emit=(col, 1.0), verts=6)
    k.point_light(cx, cr + 0.3, 1.0, '#c090ff', 18, radius=0.15, group='pulse')


def compass_rug(k, x0, r0, x1, r1):
    k.box(x0, r0, 0.0, x1, r1, 0.012, ('#0e1830', 0.1), 'rug')
    k.box(x0 + 0.1, r0 + 0.1, 0.012, x1 - 0.1, r1 - 0.1, 0.016, ('#1a2a50', 0.12), 'rug')
    k.box(x0 + 0.2, r0 + 0.2, 0.016, x1 - 0.2, r1 - 0.2, 0.019, '#c89a48', 'rug_trim')
    k.box(x0 + 0.26, r0 + 0.26, 0.019, x1 - 0.26, r1 - 0.26, 0.022, ('#1e3260', 0.12), 'rug')
    compass_rose(k, (x0 + x1) / 2, (r0 + r1) / 2, min(x1 - x0, r1 - r0) * 0.48, z=0.018, col='#d8b060', dark='#a07830')


def crimson_rug(k, x0, r0, x1, r1):
    rug(k, x0, r0, x1, r1, col='#7a1a1a', trim='#d8b060', pattern=True)


def woven_mat(k, x0, r0, x1, r1):
    k.box(x0, r0, 0.0, x1, r1, 0.012, ('#8a7a4a', 0.15), 'mat')
    r = r0 + 0.1
    i = 0
    while r < r1 - 0.1:
        k.box(x0 + 0.08, r, 0.012, x1 - 0.08, r + 0.08, 0.016, ('#a8946a' if i % 2 else '#6a5a3a', 0.15), 'mat_weave')
        r += 0.16
        i += 1
    for (a, b) in ((x0 + 0.3, x0 + 0.42), (x1 - 0.42, x1 - 0.3)):
        k.box(a, r0 + 0.1, 0.016, b, r1 - 0.1, 0.02, '#2a6a6a', 'mat_band')


def globe(k, cx, cr, z):
    k.cyl(cx, cr, z, z + 0.04, 0.14, BRASS_D, 'globe_foot', verts=12)
    k.tube((cx, cr, z + 0.04), (cx, cr, z + 0.2), 0.02, BRASS, 'globe_stem', verts=6)
    k.sphere(cx, cr, z + 0.42, 0.22, 0.22, ('#2a5a7a', 0.1), 'globe', segs=16)
    for (dx, dr, dz, s) in ((0.08, 0.12, 0.08, 0.1), (-0.1, 0.1, -0.05, 0.08), (0.02, 0.15, -0.1, 0.07)):
        k.blob(cx + dx, cr + dr, z + 0.42 + dz, s, 0.05, s * 0.8, ('#c8b070', 0.1), 'globe_land', segs=8)
    n = 24
    for i in range(n):
        a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
        k.tube((cx + math.cos(a0) * 0.26, cr, z + 0.42 + math.sin(a0) * 0.26),
               (cx + math.cos(a1) * 0.26, cr, z + 0.42 + math.sin(a1) * 0.26), 0.012, BRASS, 'meridian', verts=4)


def ship_bottle(k, cx, cr, z):
    k.box(cx - 0.12, cr - 0.08, z, cx + 0.12, cr + 0.08, z + 0.05, (WOOD_D, 0.1), 'bottle_cradle')
    for i in range(7):   # the glass: highlights along it, the ship shows between
        a = i * 2 * math.pi / 7 + 0.3
        k.tube((cx - 0.26, cr + math.cos(a) * 0.1, z + 0.15 + math.sin(a) * 0.1),
               (cx + 0.14, cr + math.cos(a) * 0.1, z + 0.15 + math.sin(a) * 0.1), 0.008, '#a8d8c8', 'bottle',
               emit=('#a8e8d8', 0.25), verts=4)
    k.cyl_x(cx - 0.27, cx - 0.25, cr, z + 0.15, 0.1, 0.1, '#7ab0a0', 'bottle_end', verts=14)
    k.cyl_x(cx + 0.14, cx + 0.3, cr, z + 0.15, 0.04, 0.04, '#7ab0a0', 'bottle_neck', verts=10)
    k.cyl_x(cx + 0.3, cx + 0.34, cr, z + 0.15, 0.035, 0.035, '#8a6a40', 'cork', verts=8)
    k.box(cx - 0.18, cr - 0.03, z + 0.07, cx + 0.08, cr + 0.03, z + 0.11, '#3a2a5a', 'tiny_hull')
    for xx in (-0.12, -0.04, 0.03):
        k.box(cx + xx - 0.004, cr - 0.004, z + 0.11, cx + xx + 0.004, cr + 0.004, z + 0.22, WOOD_D, 'tiny_mast')
        k.box(cx + xx - 0.025, cr + 0.005, z + 0.13, cx + xx + 0.025, cr + 0.01, z + 0.2, '#e8e0c8', 'tiny_sail')


def orrery(k, cx, cr, z):
    k.cyl(cx, cr, z, z + 0.05, 0.16, BRASS_D, 'orrery_foot', verts=12)
    k.tube((cx, cr, z + 0.05), (cx, cr, z + 0.45), 0.02, BRASS, 'orrery_stem', verts=6)
    k.sphere(cx, cr, z + 0.5, 0.07, 0.07, '#3a2a10', 'orrery_sun', emit=('#ffc040', 1.0), segs=10)
    for rr, a, col, s in ((0.15, 0.5, '#80c0ff', 0.025), (0.25, 2.4, '#60e090', 0.035), (0.34, 4.2, '#e09060', 0.03)):
        n = 22
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.tube((cx + math.cos(a0) * rr, cr + math.sin(a0) * rr * 0.6, z + 0.5), (cx + math.cos(a1) * rr,
                   cr + math.sin(a1) * rr * 0.6, z + 0.5), 0.005, BRASS, 'orrery_ring', verts=4)
        k.sphere(cx + math.cos(a) * rr, cr + math.sin(a) * rr * 0.6, z + 0.5, s, s, col, 'orrery_planet', segs=8)
    k.point_light(cx, cr + 0.2, z + 0.55, '#ffc040', 5, radius=0.06)


def _flag_pole(k, cx, cr, h=2.3):
    k.tube((cx, cr, 0.1), (cx, cr, h), 0.025, (WOOD_D, 0.1), 'pole', verts=8)
    k.sphere(cx, cr, h + 0.04, 0.05, 0.05, BRASS, 'finial', segs=8)


def _cloth(k, cx, cr, z0, z1, w, col, part='flag', sag=0.06, n=6, side=-1):
    """A flag hanging off the pole (toward -x by default: into the room from
    a pole by the east wall) in gentle folds (row offsets)."""
    for i in range(n):
        xa, xb = cx + side * w * i / n, cx + side * w * (i + 1) / n
        ra = cr + (sag if i % 2 else -sag) * (i / n)
        rb = cr + (sag if (i + 1) % 2 else -sag) * ((i + 1) / n)
        k.poly([(xa, ra, z0), (xb, rb, z0 + 0.02 * (i + 1) / n), (xb, rb, z1 - 0.02 * (i + 1) / n), (xa, ra, z1)], col, part)


def wayfarer_flag(k, cx, cr):
    _flag_pole(k, cx, cr)
    _cloth(k, cx - 0.03, cr, 1.45, 2.2, 0.9, ('#22304a', 0.1))
    for i in range(6):   # a gold ship's mark: a ring and a star
        a0, a1 = i * math.pi / 3, (i + 1) * math.pi / 3
        k.tube((cx - 0.48 + math.cos(a0) * 0.16, cr + 0.02, 1.82 + math.sin(a0) * 0.16),
               (cx - 0.48 + math.cos(a1) * 0.16, cr + 0.02, 1.82 + math.sin(a1) * 0.16), 0.015, '#d8b060', 'flag_mark', verts=4)
    k.sphere(cx - 0.48, cr + 0.02, 1.82, 0.05, 0.05, '#d8b060', 'flag_mark', segs=6)


def pirate_flag(k, cx, cr):
    _flag_pole(k, cx, cr)
    _cloth(k, cx - 0.03, cr, 1.45, 2.2, 0.9, ('#141414', 0.1))
    k.sphere(cx - 0.48, cr + 0.03, 1.9, 0.09, 0.08, '#e8e0d0', 'skull', segs=8)
    for s_ in (-1, 1):
        k.tube((cx - 0.48 - 0.16, cr + 0.03, 1.82 + s_ * 0.1), (cx - 0.48 + 0.16, cr + 0.03, 1.82 - s_ * 0.1), 0.018,
               '#e8e0d0', 'bones', verts=4)


def neon_banner(k, cx, cr):
    k.tube((cx, cr, 0.1), (cx, cr, 2.3), 0.025, '#1a1a24', 'pole', verts=8)
    k.box(cx - 0.5, cr - 0.02, 1.0, cx - 0.03, cr + 0.02, 2.2, '#140a1e', 'banner')
    for i, col in enumerate(('#ff40c0', '#40e0ff', '#ff40c0', '#ffe040')):
        z = 1.15 + i * 0.27
        k.box(cx - 0.43, cr + 0.02, z, cx - 0.1, cr + 0.035, z + 0.04, '#1a0a2a', 'neon_stroke', emit=(col, 1.0))
        k.box(cx - 0.43 + (i % 2) * 0.29, cr + 0.02, z - 0.1, cx - 0.39 + (i % 2) * 0.29, cr + 0.035, z, '#1a0a2a',
              'neon_stroke', emit=(col, 1.0))
    k.point_light(cx - 0.27, cr + 0.3, 1.6, '#ff60d0', 14, radius=0.1)


# slot → [(key, builder)] — scenes/bridge.py builds each in its place; the
# catalog (js/catalog.js) sells them by these keys.
DECOR = {
    'deck_plant': [('spore_fern', spore_fern), ('lemon_tree', lemon_tree), ('station_vine', station_vine)],
    'deck_lamp': [('ship_lantern', ship_lantern), ('neon_tube', neon_tube), ('crystal_brazier', crystal_brazier)],
    'deck_rug': [('compass_rug', compass_rug), ('crimson_rug', crimson_rug), ('woven_mat', woven_mat)],
    'deck_curio': [('globe', globe), ('ship_bottle', ship_bottle), ('orrery', orrery)],
    'deck_flag': [('wayfarer_flag', wayfarer_flag), ('pirate_flag', pirate_flag), ('neon_banner', neon_banner)],
}
