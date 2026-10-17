"""Verdance's farm kit: split-rail fences, a red barn, hay, a scarecrow, a pond with
reeds and lilies, the field's bare earth, beehives, a mailbox, a windsock, wildflowers,
apple trees, a seed stall. Tile units like every kit (x, row, z); the scene's sun does
the rest. Built on assets_town / assets_lumar where they already have the part.
"""
import math

from scenekit import shade
import assets_lumar as A
import assets_town as W

WOOD = '#8a6438'
WOOD_D = '#5a3e22'
BARN = '#9a3428'
TRIM = '#ece4d4'
EARTH = '#7a5634'
GRASS = '#5e9a3a'


def fence(k, a, b, h=0.72, tone=WOOD, every=1.0, solid=True):
    """Split-rail fence from a to b (floor points): posts every tile, two rails between."""
    (x0, r0), (x1, r1) = a, b
    L = math.hypot(x1 - x0, r1 - r0)
    n = max(1, int(round(L / every)))
    for i in range(n + 1):
        t = i / n
        x, r = x0 + (x1 - x0) * t, r0 + (r1 - r0) * t
        k.box(x - 0.05, r - 0.05, 0.0, x + 0.05, r + 0.05, h, (shade(tone, k.rng.uniform(0.85, 1.05)), 0.2), 'fence_post')
        k.box(x - 0.065, r - 0.065, h - 0.02, x + 0.065, r + 0.065, h + 0.02, shade(tone, 0.7), 'fence_cap')
    for z in (h * 0.42, h * 0.82):
        k.bar(x0, r0, x1, r1, z - 0.03, z + 0.03, 0.05, (tone, 0.2), 'fence_rail')
    if solid:
        k.solid(min(x0, x1) - 0.1, min(r0, r1) - 0.1, max(x0, x1) + 0.1, max(r0, r1) + 0.1)


def barn(k, x0, x1, r_back, r_front, wall_h=2.6, rise=1.6, wall=BARN, roof='#4a3a36'):
    """A red barn: plank walls, white-trimmed sliding doors with their X braces, a hayloft door, a gable roof."""
    k.box(x0, r_back, 0.0, x1, r_front, 0.25, ('#6a6a62', 0.2), 'barn_footing')
    k.box(x0 + 0.04, r_back + 0.04, 0.25, x1 - 0.04, r_front - 0.02, wall_h, (wall, 0.12), 'barn_wall')
    x = x0 + 0.04
    while x < x1 - 0.1:                                                   # plank seams on the front
        k.box(x, r_front - 0.025, 0.25, x + 0.02, r_front, wall_h, shade(wall, 0.72), 'barn_seam')
        x += 0.28
    for xe in (x0, x1):                                                    # white corner boards
        k.box(xe - 0.06, r_front - 0.06, 0.25, xe + 0.06, r_front + 0.02, wall_h, TRIM, 'barn_trim')
    cx = (x0 + x1) / 2
    dw, dh = 1.6, 1.9
    k.box(cx - dw / 2, r_front, 0.25, cx + dw / 2, r_front + 0.04, 0.25 + dh, ('#7a2620', 0.12), 'barn_door')
    for (xa, xb) in ((cx - dw / 2, cx), (cx, cx + dw / 2)):              # the X braces and frame of each leaf
        k.box(xa, r_front + 0.04, 0.25, xb, r_front + 0.07, 0.33, TRIM, 'barn_door_trim')
        k.box(xa, r_front + 0.04, 0.17 + dh, xb, r_front + 0.07, 0.25 + dh, TRIM, 'barn_door_trim')
        k.box(xa, r_front + 0.04, 0.25, xa + 0.07, r_front + 0.07, 0.25 + dh, TRIM, 'barn_door_trim')
        k.tube((xa + 0.05, r_front + 0.06, 0.3), (xb - 0.05, r_front + 0.06, 0.2 + dh), 0.03, TRIM, 'barn_brace', verts=4)
        k.tube((xb - 0.05, r_front + 0.06, 0.3), (xa + 0.05, r_front + 0.06, 0.2 + dh), 0.03, TRIM, 'barn_brace', verts=4)
    k.box(cx - 0.4, r_front, wall_h - 0.75, cx + 0.4, r_front + 0.04, wall_h - 0.12, ('#3a1a14', 0.1), 'hayloft')
    k.box(cx - 0.46, r_front + 0.04, wall_h - 0.8, cx + 0.46, r_front + 0.07, wall_h - 0.75, TRIM, 'hayloft_trim')
    for i in range(5):                                                     # hay spilling from the loft
        k.blob(cx + k.rng.uniform(-0.25, 0.25), r_front + 0.06, wall_h - 0.72 + k.rng.uniform(-0.04, 0.05), 0.12, 0.06, 0.05,
               ('#d8b858', 0.3), 'hay', segs=6)
    rm, zr = W._gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, over=0.3)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


def haybale(k, cx, cr, rolled=True):
    if rolled:
        k.cyl_x(cx - 0.32, cx + 0.32, cr, 0.32, 0.32, 0.32, ('#d8b858', 0.35), 'haybale', verts=14)
        for dx in (-0.2, 0.0, 0.2):
            k.cyl_x(cx + dx - 0.02, cx + dx + 0.02, cr, 0.32, 0.325, 0.325, '#b89838', 'hay_band', verts=14)
    else:
        k.box(cx - 0.4, cr - 0.25, 0.0, cx + 0.4, cr + 0.25, 0.4, ('#d8b858', 0.35), 'haybale', bevel=0.04)
        for dx in (-0.2, 0.2):
            k.box(cx + dx - 0.02, cr - 0.26, 0.0, cx + dx + 0.02, cr + 0.26, 0.41, '#8a6a28', 'hay_band')
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)


def scarecrow(k, cx, cr):
    k.box(cx - 0.035, cr - 0.035, 0.0, cx + 0.035, cr + 0.035, 1.5, (WOOD_D, 0.2), 'scare_pole')
    k.box(cx - 0.55, cr - 0.03, 1.12, cx + 0.55, cr + 0.03, 1.18, (WOOD_D, 0.2), 'scare_arm')
    k.box(cx - 0.24, cr - 0.12, 0.62, cx + 0.24, cr + 0.12, 1.22, ('#4a6a9a', 0.25), 'scare_shirt')
    for s in (-1, 1):
        k.box(cx + s * 0.24, cr - 0.08, 1.06, cx + s * 0.55, cr + 0.08, 1.22, ('#4a6a9a', 0.25), 'scare_sleeve')
        k.blob(cx + s * 0.6, cr, 1.12, 0.08, 0.05, 0.08, ('#d8b858', 0.3), 'straw', segs=6)
    k.sphere(cx, cr, 1.36, 0.16, 0.16, ('#d8c088', 0.3), 'scare_head', segs=10)
    k.cone(cx, cr, 1.46, 1.66, 0.3, 0.12, ('#8a6a3a', 0.25), 'scare_hat', verts=12)
    k.box(cx - 0.07, cr + 0.15, 1.36, cx - 0.03, cr + 0.16, 1.4, '#2a1a10', 'scare_eye')
    k.box(cx + 0.03, cr + 0.15, 1.36, cx + 0.07, cr + 0.16, 1.4, '#2a1a10', 'scare_eye')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def pond(k, cx, cr, rx, ry, seed=0):
    """A pond lying in the meadow: a muddy bank, still water with a faint glint, lily pads, reeds round the edge."""
    segs = 40
    def ring(scale, z0, z1, col, part, emit=None):
        k.cyl(cx, cr, z0, z1, rx * scale, col, part, verts=segs, ry=ry * scale, emit=emit)
    ring(1.08, -0.02, 0.012, ('#5a4a30', 0.3), 'pond_bank')
    ring(1.0, 0.012, 0.016, '#1e4a5a', 'pond_water', emit=('#3a7a9a', 0.12))
    ring(0.7, 0.016, 0.018, '#24566a', 'pond_deep')
    for i in range(7):                                                     # lily pads, a flower or two
        a = k.rng.uniform(0, math.tau); d = k.rng.uniform(0.25, 0.8)
        x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
        k.cyl(x, r, 0.018, 0.026, 0.13, ('#4a8a3a', 0.2), 'lily', verts=10)
        if i % 3 == 0:
            k.sphere(x + 0.04, r, 0.04, 0.05, 0.04, '#f0b8d0', 'lily_flower', segs=6)
    for i in range(46):                                                    # reeds and cattails round the bank
        a = i / 46 * math.tau + k.rng.uniform(-0.05, 0.05)
        if math.sin(a) > 0.55 and abs(math.cos(a)) < 0.35:
            continue                                                       # a gap on the near side for the jetty
        x, r = cx + math.cos(a) * rx * 1.02, cr + math.sin(a) * ry * 1.02
        h = k.rng.uniform(0.35, 0.7)
        k.cone(x, r, 0.0, h, 0.03, 0.006, (shade('#5a8a3a', k.rng.uniform(0.8, 1.2)), 0.2), 'reed', verts=4)
        if k.rng.random() < 0.3:
            k.cyl(x, r, h - 0.14, h - 0.02, 0.025, '#5a3a20', 'cattail', verts=6)


def earth(k, x0, r0, x1, r1):
    """The field: bare, crumbly earth waiting to be worked (the game tills it, a tile at a time)."""
    k.box(x0, r0, -0.02, x1, r1, 0.012, (EARTH, 0.35), 'field')
    k.later.append(lambda: W.ragged_edges(k, x0, r0, x1, r1, GRASS, z=0.012))
    for _ in range(int((x1 - x0) * (r1 - r0) * 1.4)):
        x, r = k.rng.uniform(x0 + 0.1, x1 - 0.1), k.rng.uniform(r0 + 0.1, r1 - 0.1)
        s = k.rng.uniform(0.04, 0.09)
        k.rock(x, r, 0.0, s, s * 0.8, 0.03, (shade(EARTH, k.rng.uniform(0.75, 1.2)), 0.3), part='clod', segs=6)


DIRT = '#a08a68'


def dirt_path(k, x0, r0, x1, r1):
    """A trodden earth path: sandy dirt speckled light and dark, small stones, the turf creeping over its edges."""
    k.box(x0, r0, -0.01, x1, r1, 0.006, (DIRT, 0.0), 'path')
    k.later.append(lambda: W.ragged_edges(k, x0, r0, x1, r1, GRASS, z=0.006))       # the turf creeping over its edges
    specks = {shade(DIRT, 0.8): [], shade(DIRT, 0.9): [], shade(DIRT, 1.12): [], shade(DIRT, 0.66): []}
    cols = list(specks)
    for _ in range(int((x1 - x0) * (r1 - r0) * 36)):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        a, b = k.rng.uniform(0.012, 0.03), k.rng.uniform(0.01, 0.022)
        specks[k.rng.choices(cols, (0.3, 0.35, 0.25, 0.1))[0]].append((x - a, r - b, 0.006, x + a, r + b, 0.0075))
    for col, rs in specks.items():
        k.boxes(rs, (col, 0.0), 'path')
    for _ in range(int((x1 - x0) * (r1 - r0) * 0.9)):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        sz = k.rng.uniform(0.025, 0.05)
        k.rock(x, r, 0.0, sz, sz * 0.85, sz * 0.5, (shade('#a09888', k.rng.uniform(0.75, 1.1)), 0.2), part='pebble', segs=5)


def beehive(k, cx, cr):
    k.box(cx - 0.18, cr - 0.18, 0.0, cx + 0.18, cr + 0.18, 0.28, (WOOD_D, 0.2), 'hive_stand')
    for i in range(5):
        r0 = 0.24 - i * 0.03
        k.cyl(cx, cr, 0.28 + i * 0.12, 0.4 + i * 0.12, r0, ('#d8a848', 0.3), 'skep', verts=12)
    k.box(cx - 0.05, cr + 0.2, 0.32, cx + 0.05, cr + 0.22, 0.38, '#2a1a10', 'hive_door')
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def mailbox(k, cx, cr):
    k.box(cx - 0.03, cr - 0.03, 0.0, cx + 0.03, cr + 0.03, 0.85, (WOOD_D, 0.2), 'mail_post')
    k.box(cx - 0.18, cr - 0.12, 0.85, cx + 0.18, cr + 0.12, 1.08, ('#3a5a8a', 0.2), 'mailbox')
    k.cyl_x(cx - 0.18, cx + 0.18, cr, 1.08, 0.12, 0.12, ('#3a5a8a', 0.2), 'mailbox_top', verts=10)
    k.box(cx + 0.18, cr - 0.02, 1.0, cx + 0.2, cr + 0.02, 1.25, '#d03030', 'mail_flag')


def windsock(k, cx, cr):
    k.box(cx - 0.03, cr - 0.03, 0.0, cx + 0.03, cr + 0.03, 2.2, ('#d0d0d8', 0.2), 'sock_pole')
    for i in range(4):
        k.cyl_x(cx + 0.05 + i * 0.16, cx + 0.2 + i * 0.16, cr, 2.08 - i * 0.02, 0.1 - i * 0.015, 0.1 - i * 0.015,
                ('#e86020' if i % 2 == 0 else '#f0f0f0', 0.2), 'sock', verts=10)
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


def wildflowers(k, x0, r0, x1, r1, n, cols=('#f0d040', '#e05070', '#a070e0', '#f0f0f0', '#f08030')):
    for _ in range(n):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        h = k.rng.uniform(0.08, 0.22)
        k.cone(x, r, 0.0, h, 0.012, 0.004, '#3a6a2a', 'stem', verts=3)
        k.sphere(x, r, h, 0.035, 0.03, k.rng.choice(cols), 'flower', segs=5)


def apple_tree(k, cx, cr, h=2.4):
    lobes = W.tree(k, cx, cr, h=h, tone='#3e7a34', lean=k.rng.uniform(-0.08, 0.08))
    for i in range(14):                                       # apples on the crown's face, toward you
        x, r, z, rx, ry, rz = lobes[i % len(lobes)]
        u, a = k.rng.uniform(-0.5, 0.6), k.rng.uniform(math.pi * 0.1, math.pi * 0.9)
        w = math.sqrt(1 - u * u)
        k.sphere(x + w * math.cos(a) * rx * 1.04, r + w * math.sin(a) * ry * 1.04, z + u * rz * 1.04, 0.065, 0.065,
                 ('#d02a2a', 0.2), 'apple', segs=6)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def seed_stall(k, x0, x1, r0, r1):
    """Hollin's stall: a counter under a green-and-cream awning, sacks of seed, seedlings in pots, a slate of prices."""
    W.market_stall(k, x0, x1, r0, r1, awning=('#3a7a3a', '#ece4c8'), goods=None)
    x = x0 + 0.25
    while x < x1 - 0.2:
        col = k.rng.choice(('#d8c090', '#c8a868', '#e0d0a8'))
        k.cyl(x, (r0 + r1) / 2, 0.86, 1.08, 0.13, (col, 0.35), 'seed_sack', verts=10)
        k.sphere(x, (r0 + r1) / 2, 1.08, 0.11, 0.05, k.rng.choice(('#7a5a30', '#c89040', '#4a3a2a', '#e8d070')), 'seeds', segs=6)
        x += 0.32
    for i in range(3):                                                     # seedlings in front of the counter
        px, pr = x0 + 0.4 + i * 0.6, r1 + 0.3
        k.cyl(px, pr, 0.0, 0.18, 0.1, ('#a85a30', 0.2), 'pot', verts=10)
        k.cone(px, pr, 0.18, 0.4, 0.1, 0.01, '#4a9a3a', 'seedling', verts=5)
    k.box(x1 + 0.05, r0, 0.3, x1 + 0.1, r1, 1.1, ('#2a2a2a', 0.1), 'slate')


def log_pile(k, cx, cr):
    for i, (dx, z) in enumerate(((-0.2, 0.12), (0.0, 0.12), (0.2, 0.12), (-0.1, 0.32), (0.1, 0.32), (0.0, 0.52))):
        k.cyl_y(cx + dx, cr - 0.3, cr + 0.3, z, 0.11, 0.11, ('#7a5030', 0.25), 'log', verts=10)
        k.cyl_y(cx + dx, cr + 0.3, cr + 0.31, z, 0.09, 0.09, '#c89a68', 'log_end', verts=10)
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)
