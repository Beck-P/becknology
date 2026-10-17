"""Sylvara builders for scenekit (bpy): the wood elves' forest — giant trees and the Great Tree, mossy flagstones,
leaf lanterns, the Moonwell, ferns and glowing mushrooms, and the elven fittings of the Heartwood Hall.
Tile units: x = column, r = row (toward the camera), z = height. See scenes/sylvara.py and scenes/sylvara_hall.py.
"""
import math
import random

from scenekit import shade
import assets_town as W

BARK = '#5a4232'          # the giant trees' bark, warm grey-brown
BARK_D = '#3a2a20'
MOSS = '#4a7a3a'
MOSS_L = '#6a9a48'
LEAF = '#3e6e34'
LEAF_L = '#5a8e40'
GOLD = '#d0a040'
GLOW = '#ffd890'          # lantern light, warm
MOON = '#a8e0d8'          # the Moonwell's light, pale green-silver
STONE = '#8a8a7a'
WOOD = '#7a5a3a'
WOOD_D = '#4a3424'


# ---- ground ---------------------------------------------------------------------------------------------------------
def forest_floor(k, x0, r0, x1, r1, tone='#3e5a30'):
    """Moss and leaf litter: a mossy ground with clumps of moss and fallen leaves scattered over it."""
    k.box(x0, r0, -0.1, x1, r1, 0.0, (tone, 0.35), 'forest_floor')
    for _ in range(int((x1 - x0) * (r1 - r0) * 0.7)):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        s = k.rng.uniform(0.12, 0.3)
        k.blob(x, r, 0.0, s, s * 0.8, 0.035, (shade(tone, k.rng.uniform(0.85, 1.3)), 0.4), 'moss', segs=8)
    for _ in range(int((x1 - x0) * (r1 - r0) * 0.5)):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        col = k.rng.choice(('#a0682a', '#c08a30', '#7a4a22', '#8a9a3a'))
        k.blob(x, r, 0.004, 0.05, 0.035, 0.008, (col, 0.3), 'leaf_litter', segs=5)


def flag_path(k, cells, tone=STONE):
    """Mossy flagstones over a list of (x, r) cells: two or three worn slabs a cell, moss in the joints."""
    for (c, r) in cells:
        k.box(c, r, -0.02, c + 1, r + 1, 0.002, ('#3a4a2e', 0.4), 'path_moss')
        for (a, b, d, e) in ((0.04, 0.04, 0.54, 0.46), (0.58, 0.04, 0.96, 0.52), (0.04, 0.5, 0.42, 0.96), (0.46, 0.56, 0.96, 0.96)):
            if k.rng.random() < 0.9:
                k.box(c + a, r + b, 0.0, c + d, r + e, 0.02, (shade(tone, k.rng.uniform(0.8, 1.08)), 0.2), 'flagstone')


def stone_trail(k, points, width=1.6, tone=STONE, step=0.42):
    """A path of rounded, mossy stepping stones laid along a polyline of (x, r) points."""
    for (a, b) in zip(points, points[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, int(L / step))
        nx, nr = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
        for i in range(n):
            t = (i + k.rng.uniform(0, 0.6)) / n
            x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            for j in range(3):
                o = (j - 1) * width / 3 + k.rng.uniform(-0.12, 0.12)
                s = k.rng.uniform(0.2, 0.3)
                k.blob(x + nx * o, r + nr * o, 0.0, s, s * k.rng.uniform(0.7, 1.0), 0.03,
                       (shade(tone, k.rng.uniform(0.75, 1.08)), 0.25), 'flagstone', segs=8)


def mossy_rock(k, cx, cr, s=0.5):
    k.rock(cx, cr, 0.0, s, s * 0.8, s * 0.6, ('#6a6a5c', 0.3), part='rock', segs=8)
    k.blob(cx, cr - 0.05, s * 0.5, s * 0.8, s * 0.6, s * 0.2, (MOSS, 0.4), 'rock_moss', segs=8)
    k.solid(cx - s, cr - s * 0.8, cx + s, cr + s * 0.8)


def fallen_log(k, x0, x1, cr, rad=0.28):
    k.cyl_x(x0, x1, cr, rad, rad, rad, (BARK, 0.3), 'log', verts=12)
    k.cyl_x(x0 - 0.01, x0, cr, rad, rad * 0.9, rad * 0.9, ('#a08060', 0.3), 'log_end', verts=12)
    for _ in range(4):
        x = k.rng.uniform(x0 + 0.2, x1 - 0.2)
        k.blob(x, cr, rad * 1.8, 0.3, 0.2, 0.1, (MOSS_L, 0.4), 'log_moss', segs=8)
    mushrooms(k, x1 - 0.3, cr + rad + 0.1, n=3)
    k.solid(x0, cr - rad, x1, cr + rad)


def path_cells(points, width=2):
    """Cells along a polyline of (x, r) points, `width` cells wide."""
    out = set()
    for (a, b) in zip(points, points[1:]):
        n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
        for i in range(n + 1):
            x = a[0] + (b[0] - a[0]) * i / n
            r = a[1] + (b[1] - a[1]) * i / n
            for dx in range(width):
                for dr in range(width):
                    out.add((int(x) + dx - width // 2, int(r) + dr - width // 2))
    return sorted(out)


# ---- trees ----------------------------------------------------------------------------------------------------------
def giant_tree(k, cx, cr, rad=1.4, h=7.0, roots=7, canopy=True, seed=0):
    """A giant of the old wood: a ridged trunk, root flares spreading over the ground, moss up its north side, and a
    crown of great leaf masses at the top (mostly out of frame). Marks its foot solid."""
    k.cyl(cx, cr, -0.05, h, rad, (BARK, 0.3), 'giant_trunk', verts=28)
    for i in range(18):                                                   # bark ridges
        a = i / 18 * math.tau + k.rng.uniform(-0.08, 0.08)
        if math.sin(a) < -0.5:
            continue                                                      # the far side never shows
        x, r = cx + math.cos(a) * rad, cr + math.sin(a) * rad
        k.tube((x, r, 0.0), (x + k.rng.uniform(-0.05, 0.05), r, h), 0.07, (shade(BARK, k.rng.uniform(0.75, 1.15)), 0.3),
               'bark_ridge', verts=5, smooth=False)
    for i in range(roots):                                                # root flares
        a = (i + 0.5) / roots * math.tau + k.rng.uniform(-0.2, 0.2)
        L = rad + k.rng.uniform(0.6, 1.2)
        k.tube((cx + math.cos(a) * rad * 0.7, cr + math.sin(a) * rad * 0.7, 0.9),
               (cx + math.cos(a) * L, cr + math.sin(a) * L, -0.05), k.rng.uniform(0.22, 0.34), (shade(BARK, 0.9), 0.3), 'root',
               rb=0.06, verts=8)
    for i in range(6):                                                    # moss up the trunk
        a = k.rng.uniform(math.pi * 0.15, math.pi * 0.85)
        z = k.rng.uniform(0.2, h * 0.6)
        k.blob(cx + math.cos(a) * rad, cr + math.sin(a) * rad, z, 0.3, 0.12, k.rng.uniform(0.3, 0.6), (MOSS, 0.4), 'trunk_moss', segs=8)
    if canopy:
        with k.foliage('leaf'):
            f = max(1.0, rad / 1.5)                                           # a wider trunk carries a wider crown
            for (dx, dr, dz, s) in ((0, 0, 0.0, 2.6), (-2.2, 0.4, -0.5, 1.8), (2.3, 0.3, -0.4, 1.9), (0.6, 1.2, -0.7, 1.6),
                                    (-1.0, -0.8, 0.4, 1.8), (1.4, -0.9, 0.3, 1.6), (-1.6, 1.0, -0.9, 1.3), (2.0, 1.1, -1.0, 1.2)):
                k.blob(cx + dx * f, cr + dr * f, h + dz, s * f, s * f * 0.85, s * 0.6, (shade(LEAF, k.rng.uniform(0.75, 1.1)), 0.35), 'canopy', segs=14)
            for _ in range(int(10 * f)):                                      # leaves hanging off the crown's edge
                a = k.rng.uniform(0, math.tau)
                x, r = cx + math.cos(a) * 2.4 * f, cr + math.sin(a) * 1.9 * f
                k.blob(x, r, h - 1.1 + k.rng.uniform(-0.3, 0.3), 0.5, 0.4, 0.5, (shade(LEAF_L, k.rng.uniform(0.75, 1.0)), 0.35), 'canopy', segs=10)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def birch(k, cx, cr, h=3.2):
    """A silver birch: a pale trunk with dark marks and a light, airy crown."""
    k.tube((cx, cr, 0.0), (cx + 0.08, cr, h * 0.75), 0.09, ('#e4e0d4', 0.2), 'birch', rb=0.05, verts=8)
    for i in range(6):
        z = k.rng.uniform(0.2, h * 0.7)
        k.box(cx - 0.06, cr + 0.06, z, cx + 0.04, cr + 0.1, z + 0.05, '#2a2622', 'birch_mark')
    with k.foliage('leaf'):
        for (dx, dz, s) in ((0, 0.85, 0.55), (-0.35, 0.72, 0.4), (0.4, 0.75, 0.42), (0.1, 1.0, 0.38)):
            W.leafy_crown(k, cx + dx, cr, h * dz, s, s * 0.8, s * 0.9, shade('#7aa048', k.rng.uniform(0.9, 1.1)), part='birch_leaves')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def fern(k, cx, cr, s=0.45):
    for i in range(7):
        a = i / 7 * math.tau + k.rng.uniform(-0.2, 0.2)
        k.tube((cx, cr, 0.02), (cx + math.cos(a) * s, cr + math.sin(a) * s * 0.8, s * 0.5), 0.05,
               (shade('#4a8a3a', k.rng.uniform(0.8, 1.2)), 0.3), 'fern', rb=0.01, verts=4, smooth=False)


def mushrooms(k, cx, cr, n=4, glow=True, col='#80e0c0'):
    """A cluster of mushrooms; the elves' kind glow softly at dusk."""
    for _ in range(n):
        x, r = cx + k.rng.uniform(-0.25, 0.25), cr + k.rng.uniform(-0.2, 0.2)
        h = k.rng.uniform(0.08, 0.22)
        k.cyl(x, r, 0.0, h, 0.025, '#e8e0d0', 'mushroom_stem', verts=6)
        if glow:
            k.sphere(x, r, h, 0.07, 0.04, col, 'mushroom_cap', emit=(col, 1.4), segs=8)
        else:
            k.sphere(x, r, h, 0.07, 0.04, ('#b04a3a', 0.3), 'mushroom_cap', segs=8)
    if glow:
        k.point_light(cx, cr + 0.15, 0.25, col, 2.0, radius=0.1)


def flowers(k, x0, r0, x1, r1, n, cols=('#f0e0a0', '#f0f0f0', '#c8a8f0', '#f0b0c8')):
    for _ in range(n):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        h = k.rng.uniform(0.06, 0.18)
        k.cone(x, r, 0.0, h, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
        k.sphere(x, r, h, 0.035, 0.03, k.rng.choice(cols), 'flower', segs=5)


# ---- elven things ---------------------------------------------------------------------------------------------------
def leaf_lantern(k, cx, cr, z, s=0.12, energy=4.0, col=GLOW):
    """A lantern of folded leaves round a warm light, hung from a fine gold chain."""
    k.sphere(cx, cr, z, s, s * 1.2, col, 'lantern_glow', emit=(col, 1.6), segs=10)
    for i in range(5):
        a = i / 5 * math.tau
        k.blob(cx + math.cos(a) * s * 0.75, cr + math.sin(a) * s * 0.6, z, s * 0.45, s * 0.3, s * 1.1, (LEAF_L, 0.3), 'lantern_leaf', segs=6)
    k.cyl(cx, cr, z + s * 1.1, z + s * 1.4, s * 0.4, (GOLD, 0.25), 'lantern_cap', verts=8)
    if energy:
        k.point_light(cx, cr + 0.15, z, '#ffc880', energy, radius=0.1)


def lantern_post(k, cx, cr, h=1.7, energy=14.0):
    """A curved post of pale wood with a leaf lantern hanging from its crook."""
    k.tube((cx, cr, 0.0), (cx, cr, h), 0.05, ('#c8b48a', 0.2), 'post', verts=8)
    k.tube((cx, cr, h), (cx + 0.32, cr, h + 0.12), 0.04, ('#c8b48a', 0.2), 'post', verts=6)
    k.cyl(cx + 0.32, cr, h - 0.25, h + 0.1, 0.006, (GOLD, 0.25), 'chain', verts=4)
    leaf_lantern(k, cx + 0.32, cr, h - 0.32, energy=energy)
    k.solid_post(cx, cr)


def great_tree(k, cx, cr, rad=3.0, h=8.0, door_w=1.3, door_h=2.0):
    """The Great Tree: the queen's hall is inside it. A giant trunk with a tall arched doorway glowing gold at the front
    (on the row cr + rad), carved steps up to it, round windows lit above, a walkway ringing it with lanterns, gold leaves
    inlaid round the arch. Returns the row of its front face."""
    giant_tree(k, cx, cr, rad=rad, h=h, roots=10)
    front = cr + rad
    # the doorway: a dark frame, the gold light within, an arch of carved wood
    k.box(cx - door_w / 2 - 0.18, front - 0.3, 0.0, cx + door_w / 2 + 0.18, front + 0.06, door_h + 0.1, (BARK_D, 0.3), 'door_frame')
    k.box(cx - door_w / 2, front - 0.25, 0.0, cx + door_w / 2, front + 0.08, door_h - door_w / 2, '#ffd890', 'door_light',
          emit=('#ffc870', 1.8))
    k.cyl_y(cx, front - 0.25, front + 0.08, door_h - door_w / 2, door_w / 2, door_w / 2, '#ffd890', 'door_light', emit=('#ffc870', 1.8))
    zc, ra = door_h - door_w / 2, door_w / 2 + 0.28
    for i in range(1, 12):                                                # gold leaves round the arch
        a = math.pi * i / 12
        k.blob(cx + math.cos(a) * ra, front + 0.1, zc + math.sin(a) * ra, 0.07, 0.03, 0.11, (GOLD, 0.25), 'arch_leaf',
               rot=(0, a - math.pi / 2, 0), segs=6)
    for sx in (-1, 1):                                                    # and down the jambs
        for zz in (0.4, 0.8, 1.2):
            k.blob(cx + sx * ra, front + 0.1, zz, 0.06, 0.03, 0.1, (GOLD, 0.25), 'arch_leaf', segs=6)
    k.point_light(cx, front + 0.6, 1.0, '#ffc870', 30, radius=0.3)
    for i, (w, d) in enumerate(((door_w + 1.2, 0.5), (door_w + 0.8, 0.5))):  # steps up to it
        k.box(cx - w / 2, front - 0.1, 0.0, cx + w / 2, front + d * (2 - i), 0.12 * (i + 1), (shade('#9a8e78', 1 + 0.04 * i), 0.2), 'step')
    # round windows, lit
    for (dx, z) in ((-1.6, 3.0), (1.7, 3.4), (-0.4, 4.6), (1.0, 5.6)):
        a = math.asin(max(-0.99, min(0.99, dx / rad)))
        wr = cr + math.cos(a) * rad
        k.cyl_y(cx + dx, wr - 0.1, wr + 0.06, z, 0.3, 0.3, (BARK_D, 0.3), 'window_frame', verts=14)
        k.cyl_y(cx + dx, wr - 0.08, wr + 0.08, z, 0.22, 0.22, '#ffd890', 'window_light', emit=('#ffc870', 1.3), verts=14)
    # the ring walkway at 2.6, its rail, and lanterns hung under it
    k.cyl(cx, cr, 2.5, 2.62, rad + 0.7, (WOOD, 0.2), 'walkway', verts=40)
    for i in range(12):                                                   # brackets under it
        a = i / 12 * math.tau
        if math.sin(a) < 0:
            continue
        k.tube((cx + math.cos(a) * rad, cr + math.sin(a) * rad, 1.9), (cx + math.cos(a) * (rad + 0.6), cr + math.sin(a) * (rad + 0.6), 2.5),
               0.05, (WOOD_D, 0.2), 'bracket', verts=5)
    for i in range(24):
        a = i / 24 * math.tau
        if math.sin(a) < -0.3:
            continue
        x, r = cx + math.cos(a) * (rad + 0.66), cr + math.sin(a) * (rad + 0.66)
        k.cyl(x, r, 2.62, 3.0, 0.03, (WOOD_D, 0.2), 'rail_post', verts=5)
        if i % 3 == 1 and math.sin(a) > 0.1:
            k.cyl(x, r, 2.2, 2.5, 0.006, (GOLD, 0.25), 'chain', verts=4)
            leaf_lantern(k, x, r, 2.12, s=0.11, energy=3.0)
    for i in range(40):                                                   # the rail itself, in short straight runs
        a0, a1 = i / 40 * math.tau, (i + 1) / 40 * math.tau
        if math.sin(a0) < -0.3:
            continue
        k.tube((cx + math.cos(a0) * (rad + 0.66), cr + math.sin(a0) * (rad + 0.66), 3.0),
               (cx + math.cos(a1) * (rad + 0.66), cr + math.sin(a1) * (rad + 0.66), 3.0), 0.025, (WOOD_D, 0.2), 'rail', verts=5)
    return front


def treehouse_door(k, cx, cr, rad, ang=math.pi / 2, h=1.3, w=0.7, col='#6a4a2a'):
    """A round-topped door in a giant tree's trunk, a little lantern beside it. ang: where on the trunk (pi/2 = facing you)."""
    x, r = cx + math.cos(ang) * rad, cr + math.sin(ang) * rad
    k.box(x - w / 2, r - 0.2, 0.0, x + w / 2, r + 0.06, h - w / 2, (col, 0.25), 'tree_door')
    k.cyl_y(x, r - 0.2, r + 0.06, h - w / 2, w / 2, w / 2, (col, 0.25), 'tree_door', verts=14)
    k.sphere(x + w * 0.3, r + 0.08, h * 0.45, 0.04, 0.04, (GOLD, 0.25), 'door_knob', segs=6)
    k.cyl(x + w / 2 + 0.2, r + 0.05, 1.05, 1.35, 0.005, (GOLD, 0.25), 'chain', verts=4)
    leaf_lantern(k, x + w / 2 + 0.2, r + 0.05, 0.98, s=0.09, energy=3.0)


def moonwell(k, cx, cr, rad=1.3):
    """The Moonwell: a round pool rimmed with pale carved stone, its water glowing silver-green, a willow bending over it."""
    k.cyl(cx, cr, -0.02, 0.22, rad + 0.25, (shade(STONE, 1.15), 0.2), 'well_rim', verts=32)
    k.cyl(cx, cr, 0.0, 0.24, rad, '#20504c', 'well_water', emit=(MOON, 0.7), verts=32)
    k.cyl(cx, cr, 0.24, 0.245, rad * 0.55, '#3a7a70', 'well_glow', emit=(MOON, 1.4), verts=24)
    for i in range(10):                                                   # runes on the rim
        a = i / 10 * math.tau
        if math.sin(a) < -0.2:
            continue
        k.box(cx + math.cos(a) * (rad + 0.12) - 0.04, cr + math.sin(a) * (rad + 0.12) - 0.02, 0.22,
              cx + math.cos(a) * (rad + 0.12) + 0.04, cr + math.sin(a) * (rad + 0.12) + 0.02, 0.226, MOON, 'rune', emit=(MOON, 2.0))
    k.point_light(cx, cr, 0.6, MOON, 40, radius=0.6)
    k.solid(cx - rad - 0.25, cr - rad - 0.25, cx + rad + 0.25, cr + rad + 0.25)


def willow(k, cx, cr, h=3.4, toward=1.0):
    """A weeping willow, its curtain of fronds trailing to the ground. toward: which way it leans (+1 right)."""
    top = (cx + 0.5 * toward, cr, h * 0.8)
    k.tube((cx, cr, 0.0), top, 0.18, (BARK, 0.3), 'willow_trunk', rb=0.1, verts=8)
    for (dx, dr, dz, s) in ((0, 0, 0.9, 1.4), (-0.7, 0.2, 0.8, 0.9), (0.8, 0.1, 0.82, 1.0)):
        k.blob(top[0] + dx, cr + dr, h * dz, s, s * 0.85, s * 0.5, (shade('#6a9a48', k.rng.uniform(0.85, 1.0)), 0.35), 'willow_crown', segs=12)
    for i in range(54):                                                   # the curtain of fronds
        a = i / 54 * math.tau + k.rng.uniform(-0.05, 0.05)
        d = k.rng.uniform(0.9, 1.6)
        x0, r0 = top[0] + math.cos(a) * d, cr + math.sin(a) * d * 0.8
        z1 = k.rng.uniform(0.15, 0.9)
        k.tube((x0, r0, h * 0.85), (x0 + math.cos(a) * 0.15, r0 + math.sin(a) * 0.12, z1), 0.09,
               (shade('#7aa850', k.rng.uniform(0.75, 1.15)), 0.35), 'frond', rb=0.03, verts=4)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def willow_keepsake(k, cx, cr, h=3.4, toward=1.0):
    """What's left in the willow once the first sword has said it (the quest under-the-willow): Sefa's ribbons, green
    silk and gold like Beckolas's favour, swagged round the willow's curtain of fronds in two garlands, ribbon tails
    streaming down from each knot, and Faelan's leaf lanterns hung from the knots. Its own dice (0403), so the rest of
    the glade renders exactly as before. Returns each lantern in screen tiles (x, r - z·cos45), for its glow."""
    rng = random.Random(403)
    tx = cx + 0.5 * toward                                                # the crown's centre, as willow() builds it
    C45 = math.cos(math.pi / 4)
    lit = []

    def ribbon(pts, col, w=0.05):                                         # a flat strip along a line of points, facing up
        for (xa, ra, za), (xb, rb, zb) in zip(pts, pts[1:]):
            dx, dr = xb - xa, rb - ra
            L = math.hypot(dx, dr) or 1.0
            nx, nr = -dr / L * w, dx / L * w
            if L < 0.02:                                                  # hanging straight down: face the camera
                nx, nr = w, 0.0
            k.poly([(xa - nx, ra - nr, za), (xa + nx, ra + nr, za), (xb + nx, rb + nr, zb), (xb - nx, rb - nr, zb)], col, 'keepsake_ribbon',
                   emit=SHEEN.get(col))

    def ring(a, rad):                                                     # a point round the curtain (rows foreshortened like the fronds)
        return tx + math.cos(a) * rad, cr + math.sin(a) * rad * 0.8

    GREEN, GOLDR = ('#3e9a4a', 0.35), ('#f0c860', 0.25)
    SHEEN = {GOLDR: ('#a89040', 0.3), GREEN: ('#2a6a30', 0.3)}          # the silk catching the lanterns' light, even in shade
    # two garlands round the front and sides of the curtain (the back is under the crown anyway), swagged between knots
    for (rad, z, n, col, a0, a1) in ((1.75, 1.95, 7, GOLDR, -0.25, math.pi + 0.25), (1.85, 1.35, 6, GREEN, -0.1, math.pi + 0.1)):
        knots = [a0 + (a1 - a0) * j / n for j in range(n + 1)]
        for j in range(n):
            pts = []
            for t in [q / 8 for q in range(9)]:
                a = knots[j] + (knots[j + 1] - knots[j]) * t
                x, r = ring(a, rad)
                pts.append((x, r, z - 0.32 * math.sin(math.pi * t)))      # the swag sags between knots
            ribbon(pts, col, 0.055)
        for j, a in enumerate(knots):
            x, r = ring(a, rad + 0.02)
            k.blob(x, r, z, 0.08, 0.06, 0.06, GOLDR, 'keepsake_knot', emit=SHEEN[GOLDR], segs=6)
            tail = GREEN if col is GOLDR else GOLDR                       # ribbon tails from each knot, the other colour
            ph = rng.uniform(0, math.tau)
            ribbon([(x + math.sin(ph + q) * 0.05, r + 0.04, z - 0.1 - q * 0.16) for q in range(5)], tail, 0.04)
            if col is GOLDR and 0 < j < n:                                # a lantern hung under each inner knot of the high garland
                lz = z - 0.55
                k.cyl(x, r, lz + 0.12, z, 0.006, (GOLD, 0.25), 'keepsake_chain', verts=4)
                k.sphere(x, r, lz, 0.1, 0.12, ('#6a4416', 0.3), 'keepsake_lantern', emit=('#ffb040', 1.0), segs=10)
                for q in range(5):
                    b = q / 5 * math.tau
                    k.blob(x + math.cos(b) * 0.075, r + math.sin(b) * 0.06, lz, 0.045, 0.03, 0.11, (LEAF_L, 0.3), 'lantern_leaf', segs=6)
                k.cyl(x, r, lz + 0.11, lz + 0.14, 0.04, (GOLD, 0.25), 'lantern_cap', verts=8)
                k.point_light(x, r + 0.15, lz, '#ffc070', 3.0, radius=0.1)
                lit.append([round(x, 3), round(r - lz * C45, 3)])
    return lit


def herb_stall(k, x0, x1, cr):
    """The herbalist's table under a leaf awning: jars, bundles of drying herbs hung from the beam."""
    k.box(x0, cr - 0.3, 0.72, x1, cr + 0.3, 0.8, (WOOD, 0.2), 'stall_top')
    for x in (x0 + 0.1, x1 - 0.1):
        for r in (cr - 0.22, cr + 0.22):
            k.cyl(x, r, 0.0, 0.72, 0.04, (WOOD_D, 0.2), 'stall_leg', verts=6)
        k.cyl(x, cr - 0.3, 0.0, 1.9, 0.04, (WOOD_D, 0.2), 'stall_pole', verts=6)
    k.poly([(x0 - 0.15, cr - 0.45, 1.9), (x1 + 0.15, cr - 0.45, 1.9), (x1 + 0.15, cr + 0.45, 1.6), (x0 - 0.15, cr + 0.45, 1.6)],
           (LEAF, 0.35), 'awning')
    x = x0 + 0.25
    while x < x1 - 0.1:
        k.cyl(x, cr, 0.8, 0.98, 0.06, k.rng.choice(('#6a9a8a', '#9a7a5a', '#8a6a9a')), 'jar', verts=8)
        k.blob(x, cr - 0.2, 1.55, 0.06, 0.05, 0.18, (k.rng.choice(('#6a8a3a', '#8a7a3a', '#9a5a6a')), 0.3), 'herb_bundle', segs=6)
        x += 0.3
    k.solid(x0, cr - 0.4, x1, cr + 0.4)


def harp(k, cx, cr, z=0.0):
    """A small elven harp of pale wood and gold strings."""
    k.tube((cx - 0.15, cr, z), (cx - 0.15, cr, z + 0.75), 0.03, ('#d8c49a', 0.2), 'harp', verts=6)
    k.tube((cx - 0.15, cr, z + 0.75), (cx + 0.25, cr, z + 0.55), 0.03, ('#d8c49a', 0.2), 'harp', verts=6)
    k.tube((cx - 0.15, cr, z), (cx + 0.25, cr, z + 0.55), 0.025, ('#d8c49a', 0.2), 'harp', verts=6)
    for i in range(5):
        t = (i + 1) / 6
        k.tube((cx - 0.15, cr, z + 0.75 * t), (cx - 0.15 + 0.4 * t, cr, z + 0.75 - 0.2 * t), 0.004, GOLD, 'harp_string', verts=3)
