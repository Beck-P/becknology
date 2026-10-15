"""Brambleford, the farm town on Verdance: the kit for its own buildings and bits.

Painted board signs with real lettering (assets_signs, the farm-town faces: Rye,
IM Fell English SC, Alegreya SC), a striped shop awning and a glazed shop window,
an open-fronted forge with a live hearth, a watermill's wheel, the stream that
runs through the village and the bridges over it, a lych-gate chapel, picnic
tables, a picket fence, a signpost, sacks and crates. Tile units like every kit
(x, row, z); the scene's sun does the lighting.
"""
import math

from scenekit import shade
import assets_lumar as A
import assets_signs as S
import assets_town as W

WOOD = '#8a6438'
WOOD_D = '#5a3e22'
IRON = '#2e2c30'
WATER = '#2a5a6a'


def board_sign(k, text, fontname, cx, r_face, z, size=0.26, board='#3a2414', ink='#f0d890', trim='#c8a050', pad=0.14):
    """A painted signboard on a facade: a dark board in a gilt trim with the name lettered on it."""
    w = S.width(text, fontname, size)
    x0, x1 = cx - w / 2 - pad, cx + w / 2 + pad
    k.box(x0 - 0.03, r_face, z - 0.09, x1 + 0.03, r_face + 0.04, z + size + 0.11, (trim, 0.12), 'sign_trim')
    k.box(x0, r_face + 0.04, z - 0.06, x1, r_face + 0.06, z + size + 0.08, (board, 0.12), 'sign_board')
    S.letters(k, text, fontname, cx, r_face + 0.06, z, size=size, col=ink, depth=0.02, lit=False)
    return w + 2 * pad


def awning(k, x0, x1, r_face, z_top, depth=0.75, drop=0.32, cols=('#b83a32', '#f0e6d0'), stripes=None):
    """A striped canvas awning sloping out from a shop front, a scalloped valance along its edge."""
    n = stripes or max(4, int((x1 - x0) / 0.32))
    sw = (x1 - x0) / n
    for i in range(n):
        xa, xb = x0 + i * sw, x0 + (i + 1) * sw
        c = (cols[i % 2], 0.25)
        k.poly([(xa, r_face, z_top), (xb, r_face, z_top), (xb, r_face + depth, z_top - drop), (xa, r_face + depth, z_top - drop)], c, 'awning')
        k.poly([(xa, r_face + depth, z_top - drop), (xb, r_face + depth, z_top - drop), (xb - sw / 2, r_face + depth + 0.01, z_top - drop - 0.14),
                (xa + sw / 2, r_face + depth + 0.01, z_top - drop - 0.14)], c, 'awning_valance')
    for x in (x0, x1):
        k.tube((x, r_face, z_top - 0.02), (x, r_face + depth, z_top - drop - 0.02), 0.012, IRON, 'awning_arm', verts=4)


def shop_window(k, x0, x1, r_face, z0=0.45, z1=1.55, frame='#2a3a2e', goods=('#c84a3a', '#e0b040', '#5a8a3a', '#e8e0c8', '#8a5a9a')):
    """A wide glazed shop window, its sill and glazing bars, jars and parcels on display inside."""
    k.box(x0 - 0.06, r_face - 0.02, z0 - 0.08, x1 + 0.06, r_face + 0.1, z0, (frame, 0.12), 'shop_sill')
    k.box(x0, r_face - 0.01, z0, x1, r_face + 0.005, z1, '#fff2c8', 'shop_glass', emit=('#ffe0a0', 0.35))
    for i in range(int((x1 - x0) / 0.24)):                                     # goods on two shelves behind the glass
        for j, zz in enumerate((z0 + 0.05, z0 + 0.5)):
            x = x0 + 0.12 + i * 0.24
            if x > x1 - 0.1:
                continue
            col = goods[(i + j * 2) % len(goods)]
            if (i + j) % 3 == 0:
                k.box(x - 0.08, r_face - 0.01, zz, x + 0.08, r_face + 0.012, zz + 0.2, (col, 0.2), 'shop_goods')
            else:
                k.cyl(x, r_face + 0.0, zz, zz + 0.24, 0.07, (col, 0.2), 'shop_jar', verts=8)
    k.box(x0 - 0.05, r_face + 0.005, z1, x1 + 0.05, r_face + 0.07, z1 + 0.08, (frame, 0.12), 'shop_frame')
    for x in (x0 - 0.05, (x0 + x1) / 2 - 0.025, x1):
        k.box(x, r_face + 0.005, z0, x + 0.05, r_face + 0.06, z1, (frame, 0.12), 'shop_frame')
    k.box(x0, r_face + 0.005, (z0 + z1) / 2 - 0.02, x1, r_face + 0.05, (z0 + z1) / 2 + 0.02, (frame, 0.12), 'shop_frame')


def forge(k, x0, x1, r_back, r_front, wall='#8a8278', roof='#5a4a40', energy=90):
    """The farrier's forge: stone walls three sides, open to the yard in front under a deep roof on two oak
    posts; the hearth glowing at the back, a hood over it, the anvil, a quench tub, horseshoes on a board."""
    h = 2.3
    k.box(x0, r_back, 0, x1, r_front, 0.04, ('#4a4440', 0.3), 'forge_floor')
    k.box(x0, r_back, 0, x1, r_back + 0.35, h, (wall, 0.2), 'forge_wall', bevel=0.02)
    for xa in (x0, x1 - 0.35):
        k.box(xa, r_back, 0, xa + 0.35, r_front - 0.6, h, (wall, 0.2), 'forge_wall', bevel=0.02)
    for xx in (x0 + 0.1, x1 - 0.3):                                            # oak posts at the open front
        k.box(xx, r_front - 0.35, 0, xx + 0.2, r_front - 0.15, h, (WOOD_D, 0.14), 'forge_post')
    k.box(x0 - 0.1, r_front - 0.4, h - 0.18, x1 + 0.1, r_front - 0.1, h, (WOOD_D, 0.14), 'forge_beam')
    W._gable_roof(k, x0 - 0.05, x1 + 0.05, r_back, r_front - 0.1, h, 1.1, roof)
    hx = x0 + (x1 - x0) * 0.32                                                  # the hearth and its hood
    k.box(hx - 0.7, r_back + 0.35, 0, hx + 0.7, r_back + 1.2, 0.75, ('#6a625a', 0.2), 'hearth', bevel=0.03)
    k.box(hx - 0.5, r_back + 0.45, 0.75, hx + 0.5, r_back + 1.05, 0.82, '#ff8030', 'coals', emit=('#ff6020', 1.0))
    k.poly([(hx - 0.75, r_back + 1.25, 1.55), (hx + 0.75, r_back + 1.25, 1.55), (hx + 0.35, r_back + 0.4, h + 0.6),
            (hx - 0.35, r_back + 0.4, h + 0.6)], ('#4a4440', 0.2), 'hood')
    k.point_light(hx, r_back + 1.0, 1.0, '#ff8a40', energy, radius=0.3, group='flicker')
    ax, ar = x0 + (x1 - x0) * 0.62, r_back + 1.9                                # the anvil on its stump
    k.cyl(ax, ar, 0, 0.45, 0.22, ('#6a4a2a', 0.2), 'anvil_stump', verts=10)
    k.box(ax - 0.28, ar - 0.1, 0.45, ax + 0.22, ar + 0.1, 0.62, (IRON, 0.1), 'anvil')
    k.cone(ax + 0.22, ar, 0.53, 0.62, 0.08, 0.01, IRON, 'anvil_horn', verts=6)
    k.cyl(x1 - 0.8, r_back + 1.0, 0, 0.5, 0.3, ('#5a4028', 0.2), 'quench_tub', verts=12)
    k.cyl(x1 - 0.8, r_back + 1.0, 0.45, 0.48, 0.26, '#2a3a40', 'quench_water', verts=12)
    k.box(x0 + 0.4, r_back + 0.35, 1.2, x0 + 1.2, r_back + 0.4, 1.8, ('#6a4a2a', 0.15), 'shoe_board')
    for i in range(6):                                                          # horseshoes hung on the board
        cx, cz = x0 + 0.55 + (i % 3) * 0.25, 1.38 + (i // 3) * 0.24
        k.cyl_y(cx, r_back + 0.4, r_back + 0.43, cz, 0.08, 0.08, (IRON, 0.1), 'horseshoe', verts=8)
    k.solid(x0, r_back, x1, r_back + 1.4)
    k.solid(x0, r_back, x0 + 0.35, r_front - 0.6)                              # the side walls; the floor between is yours to walk
    k.solid(x1 - 0.35, r_back, x1, r_front - 0.6)
    k.solid(ax - 0.3, ar - 0.2, ax + 0.3, ar + 0.2)


def waterwheel(k, cx, cr, rad=1.15, width=0.45, wood=WOOD_D, paddles=12):
    """A mill wheel turning in the stream, its face to the camera: two rims, spokes, the paddles between."""
    for dr in (-width / 2, width / 2):
        k.cyl_y(cx, cr + dr - 0.04, cr + dr + 0.04, rad * 0.55, rad, rad, (wood, 0.18), 'wheel_rim', verts=28)
        k.cyl_y(cx, cr + dr - 0.05, cr + dr + 0.05, rad * 0.55, rad - 0.12, rad - 0.12, ('#2a2a26', 0.2), 'wheel_rim_in', verts=28)
    k.cyl_y(cx, cr - width / 2 - 0.15, cr + width / 2 + 0.15, rad * 0.55, 0.12, 0.12, (IRON, 0.1), 'wheel_axle', verts=10)
    for i in range(paddles):
        a = i / paddles * math.tau
        px, pz = cx + math.cos(a) * (rad - 0.06), rad * 0.55 + math.sin(a) * (rad - 0.06)
        k.box(px - 0.05, cr - width / 2, pz - 0.05, px + 0.05, cr + width / 2, pz + 0.05, (shade(wood, 1.15), 0.18), 'wheel_paddle')
        if i % 2 == 0:
            k.tube((cx, cr + width / 2 + 0.02, rad * 0.55), (px, cr + width / 2 + 0.02, pz), 0.03, (wood, 0.18), 'wheel_spoke', verts=5)
    for i in range(10):                                                         # white water churned off it
        x = cx + k.rng.uniform(-rad, rad)
        k.blob(x, cr + k.rng.uniform(-0.3, 0.5), 0.02, k.rng.uniform(0.1, 0.2), 0.08, 0.02, '#e8f4f4', 'foam', segs=6)


def stream(k, x0, x1, r0, r1, seed=0):
    """A clear stream across the map: muddy banks, the water with a faint sheen, stones, reeds and lilies."""
    k.box(x0, r0 - 0.25, -0.06, x1, r1 + 0.25, 0.005, ('#6a5a3a', 0.3), 'stream_bank')
    k.box(x0, r0, -0.04, x1, r1, 0.012, WATER, 'stream_water', emit=('#4a8aa0', 0.14))
    k.box(x0, r0 + 0.35, -0.03, x1, r1 - 0.35, 0.014, '#244e5c', 'stream_deep')
    x = x0
    while x < x1:
        if k.rng.random() < 0.35:
            k.rock(x, k.rng.uniform(r0 + 0.1, r1 - 0.1), 0.01, k.rng.uniform(0.1, 0.2), 0.1, 0.06, ('#8a8478', 0.25), part='stream_stone', segs=6)
        if k.rng.random() < 0.5:
            for rr in (r0 - 0.12, r1 + 0.12):
                h = k.rng.uniform(0.3, 0.6)
                k.cone(x + k.rng.uniform(-0.2, 0.2), rr, 0.0, h, 0.03, 0.006, (shade('#5a8a3a', k.rng.uniform(0.8, 1.2)), 0.2), 'reed', verts=4)
        x += 0.5


def footbridge(k, x0, x1, r0, r1, z=0.18):
    """A plank footbridge over the stream (planks across the way, along rows), a rail each side."""
    r = r0
    while r < r1 - 1e-6:
        k.box(x0, r + 0.02, z - 0.05, x1, min(r1, r + 0.26) - 0.02, z, (shade(WOOD, k.rng.uniform(0.85, 1.1)), 0.16), 'bridge_plank')
        r += 0.26
    for x in (x0 + 0.04, x1 - 0.08):
        k.box(x, r0, z - 0.2, x + 0.06, r1, z - 0.05, (WOOD_D, 0.14), 'bridge_beam')
        for rr in (r0 + 0.1, (r0 + r1) / 2, r1 - 0.1):
            k.box(x, rr - 0.03, z, x + 0.05, rr + 0.03, z + 0.7, (WOOD_D, 0.14), 'bridge_post')
        k.box(x - 0.01, r0 + 0.05, z + 0.62, x + 0.07, r1 - 0.05, z + 0.7, (WOOD, 0.14), 'bridge_rail')


def stone_bridge(k, x0, x1, r0, r1, tone='#a89c88'):
    """A humped stone bridge (along rows): a cobbled deck rising to the middle, parapets each side."""
    n = 8
    for i in range(n):
        ra, rb = r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n
        za = 0.05 + 0.28 * math.sin(math.pi * i / n)
        zb = 0.05 + 0.28 * math.sin(math.pi * (i + 1) / n)
        k.poly([(x0, ra, za), (x1, ra, za), (x1, rb, zb), (x0, rb, zb)], (shade(tone, 0.9 + 0.08 * (i % 2)), 0.25), 'bridge_deck')
        for x in (x0, x1 - 0.22):
            k.box(x, ra, 0.0, x + 0.22, rb, max(za, zb) + 0.45, (shade(tone, k.rng.uniform(0.85, 1.05)), 0.22), 'parapet', bevel=0.02)


def picnic_table(k, cx, cr, tone=WOOD):
    k.box(cx - 0.6, cr - 0.25, 0.68, cx + 0.6, cr + 0.25, 0.74, (tone, 0.15), 'table_top')
    for dr in (-0.48, 0.48):
        k.box(cx - 0.6, cr + dr - 0.1, 0.4, cx + 0.6, cr + dr + 0.1, 0.45, (tone, 0.15), 'table_bench')
    for dx in (-0.45, 0.45):
        k.box(cx + dx - 0.04, cr - 0.55, 0, cx + dx + 0.04, cr + 0.55, 0.12, (WOOD_D, 0.15), 'table_foot')
        k.box(cx + dx - 0.04, cr - 0.04, 0, cx + dx + 0.04, cr + 0.04, 0.7, (WOOD_D, 0.15), 'table_leg')
    k.solid(cx - 0.6, cr - 0.55, cx + 0.6, cr + 0.55)


def picket_fence(k, a, b, h=0.6, tone='#f0ece0'):
    """A white picket fence along a straight line a -> b."""
    ax, ar = a
    bx, br = b
    L = math.hypot(bx - ax, br - ar)
    n = max(2, int(L / 0.2))
    for i in range(n + 1):
        t = i / n
        x, r = ax + (bx - ax) * t, ar + (br - ar) * t
        k.box(x - 0.035, r - 0.035, 0, x + 0.035, r + 0.035, h, (tone, 0.12), 'picket')
        k.cone(x, r, h, h + 0.08, 0.035, 0.005, (tone, 0.12), 'picket_tip', verts=4)
    for z in (h * 0.3, h * 0.75):
        k.tube((ax, ar, z), (bx, br, z), 0.02, (tone, 0.12), 'picket_rail', verts=4)


def signpost(k, cx, cr, arms, font='IMFellEnglishSC'):
    """A wooden fingerpost: arms = [(text, 'w'|'e', z)], each a pointed board with its name lettered on it."""
    k.box(cx - 0.06, cr - 0.06, 0, cx + 0.06, cr + 0.06, 1.9, (WOOD_D, 0.15), 'post')
    for (text, d, z) in arms:
        s = 1 if d == 'e' else -1
        w = S.width(text, font, 0.13) + 0.25
        x0, x1 = (cx + 0.06, cx + 0.06 + w) if s > 0 else (cx - 0.06 - w, cx - 0.06)
        k.box(x0, cr - 0.03, z - 0.1, x1, cr + 0.03, z + 0.1, ('#e8dcc0', 0.15), 'sign_arm')
        tip = x1 if s > 0 else x0
        k.poly([(tip, cr + 0.031, z - 0.1), (tip + s * 0.14, cr + 0.031, z), (tip, cr + 0.031, z + 0.1)], ('#e8dcc0', 0.15), 'sign_arm')
        S.letters(k, text, font, (x0 + x1) / 2, cr + 0.03, z - 0.06, size=0.13, col='#2a1a10', depth=0.01, lit=False)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def sacks(k, cx, cr, n=4, col=('#d8c8a0', '#c8b488', '#e0d4b4')):
    """Flour sacks, slumped against each other."""
    for i in range(n):
        x, r = cx + (i % 2) * 0.32 - 0.16, cr + (i // 2) * 0.28 - 0.14
        z = 0.0 if i < 2 else 0.0
        k.blob(x, r, z + 0.2, 0.17, 0.14, 0.22, (col[i % len(col)], 0.35), 'sack', segs=10)
        k.cyl(x, r, z + 0.38, z + 0.46, 0.05, '#a89470', 'sack_tie', verts=6)


def crates(k, cx, cr, fruit=('#c83a2a', '#e0a030', '#6a9a3a')):
    """Two crates of produce, one on the other's corner."""
    for i, (dx, z) in enumerate(((0.0, 0.0), (0.12, 0.34))):
        k.box(cx + dx - 0.24, cr - 0.18, z, cx + dx + 0.24, cr + 0.18, z + 0.32, (WOOD, 0.2), 'crate')
        for j in range(5):
            k.sphere(cx + dx - 0.16 + j * 0.08, cr + k.rng.uniform(-0.08, 0.08), z + 0.33, 0.055, 0.05, (fruit[(i + j) % len(fruit)], 0.3), 'fruit', segs=6)


def flower_bed(k, x0, r0, x1, r1, cols=('#e05070', '#f0d040', '#a070e0', '#f0f0f0', '#f08030'), n=None):
    k.box(x0, r0, 0, x1, r1, 0.08, ('#5a4028', 0.3), 'bed_soil')
    for x in (x0, x1 - 0.08):
        k.box(x, r0, 0, x + 0.08, r1, 0.14, ('#a89c88', 0.2), 'bed_edge')
    for r in (r0, r1 - 0.08):
        k.box(x0, r, 0, x1, r + 0.08, 0.14, ('#a89c88', 0.2), 'bed_edge')
    for _ in range(n or int((x1 - x0) * (r1 - r0) * 14)):
        x, r = k.rng.uniform(x0 + 0.12, x1 - 0.12), k.rng.uniform(r0 + 0.12, r1 - 0.12)
        h = k.rng.uniform(0.12, 0.3)
        k.cone(x, r, 0.08, 0.08 + h, 0.03, 0.01, '#4a8a3a', 'stem', verts=4)
        k.sphere(x, r, 0.08 + h, 0.05, 0.04, k.rng.choice(cols), 'bloom', segs=6)
