"""Arcadia's streets rebuilt to Look Book 2 (Rainline Street, `dioramas/arcadia_rainline.py`): the ground and the small life
between the District's frontages, for the street, the Backs, the Skywalk and Skyport 7. Tile units: x = column, r = row
(toward the camera), z = height.

The ground is built of pieces, never one board: paving slabs half a tile square, each its own tone, the odd one cracked,
sunk or stained; dressed kerbs with drains; an asphalt hover lane with patches, cracks, lane paint, studs and crossings;
puddles. `WET` names what's wet after the rain — set `k.wet = AR.WET` and scenekit renders the mirror passes that
scene_post lays over the street (the signs showing twice, once on the wall and once smeared down the road).

Then what people leave about: bikes, cones, bollards, news boxes, A-boards, crates of fruit, takeaway boxes, flyers, a
cat, pigeons, a hover taxi and a van waiting in the lane. Each piece rolls the dice it's given (the scene's own, or one
seeded by where it stands), so a scene can add them without moving anything else it places.
"""
import math
import random

from scenekit import shade
import assets_cyber as Y

C45 = math.cos(math.radians(45))
PAVE = ('#3c3848', '#38344a', '#363242', '#3e3a4a')
WET = {'road': 0.55, 'puddle': 1.0, 'paving': 0.2, 'kerb': 0.15, 'crosswalk': 0.45, 'paint': 0.45, 'manhole': 0.3,
       'marble': 0.3}


def _rng(k, rng, x, r):
    return rng or random.Random(int(x * 1000) * 7919 + int(r * 1000))


# ---- the ground --------------------------------------------------------------------------------------------------------
def paving(k, x0, r0, x1, r1, size=0.5, tones=PAVE, seam='#16121e', rng=None, crack=0.05, sunk=0.03, stain=0.06,
           part='paving', bond=False):
    """Slabs `size` square butted over a dark bed (the joints): each its own tone, the odd one cracked in two, one sunk with
    water standing in it, dark stains (gum, oil, rain)."""
    rng = rng or k.rng
    k.box(x0, r0, -0.1, x1, r1, -0.03, seam, part + '_bed')
    by_tone = {}
    r, i = r0, 0
    while r < r1 - 1e-6:
        x, j = x0 + (size / 2 if bond and i % 2 else 0), 0
        if x > x0:                                           # a half slab to start an offset course
            by_tone.setdefault(shade(tones[0], 0.96), []).append((x0 + 0.016, r + 0.016, -0.03, x - 0.016, min(r1, r + size) - 0.016, 0.0))
        while x < x1 - 1e-6:
            xa, xb, ra, rb = x + 0.016, min(x1, x + size) - 0.016, r + 0.016, min(r1, r + size) - 0.016
            t = shade(rng.choice(tones), rng.uniform(0.88, 1.12))
            u = rng.random()
            if u < sunk:                                     # sunk: lower, a puddle in it
                by_tone.setdefault(shade(t, 0.85), []).append((xa, ra, -0.05, xb, rb, -0.02))
                rng.choice((0, 1, 2))                        # (a tint it once had: the dice stay as they were)
                k.box(xa + 0.03, ra + 0.03, -0.02, xb - 0.03, rb - 0.03, -0.012, '#16121e', 'puddle')
            elif u < sunk + crack:                           # cracked across, the halves a shade apart
                c = rng.uniform(0.35, 0.65)
                cr_ = ra + (rb - ra) * c
                by_tone.setdefault(t, []).append((xa, ra, -0.03, xb, cr_ - 0.008, 0.0))
                by_tone.setdefault(shade(t, 0.9), []).append((xa, cr_ + 0.008, -0.03, xb, rb, -0.004))
            else:
                by_tone.setdefault(t, []).append((xa, ra, -0.03, xb, rb, 0.0))
            x += size
            j += 1
        r += size
        i += 1
    for t, rects in by_tone.items():
        k.boxes(rects, (t, 0.06), part)
    for _ in range(int((x1 - x0) * (r1 - r0) * stain)):     # stains, flat on top
        cx, cr_ = rng.uniform(x0 + 0.2, x1 - 0.2), rng.uniform(r0 + 0.15, r1 - 0.15)
        s = rng.uniform(0.04, 0.14)
        k.cyl(cx, cr_, 0.0, 0.002, s, shade(tones[2], 0.72), part + '_stain', verts=8, ry=s * rng.uniform(0.5, 0.9))


def kerb(k, x0, x1, r0, r1, h=0.07, line=None, drains=(), part='kerb'):
    """Dressed kerbstones a tile long, a pixel of joint between, a painted line along the top if `line`, iron drains."""
    stones = []
    x = x0
    while x < x1 - 1e-6:
        stones.append((x, r0, -0.06, min(x1, x + 0.98), r1, h))
        x += 1.0
    k.boxes(stones, ('#57536a', 0.06), part)
    k.box(x0, r0 - 0.002, -0.06, x1, r1 + 0.002, h - 0.02, '#221e2c', part + '_joint')
    if line:
        k.box(x0, r0 + (r1 - r0) * 0.3, h, x1, r0 + (r1 - r0) * 0.75, h + 0.004, line, 'kerb_paint')
    for dx in drains:
        k.box(dx - 0.22, r0 - 0.16, 0.0, dx + 0.22, r0 + 0.01, 0.004, '#120e18', 'drain')
        k.boxes([(dx - 0.2 + i * 0.065, r0 - 0.15, 0.004, dx - 0.17 + i * 0.065, r0, 0.008) for i in range(7)], '#2e2a38',
                'drain_grate')


def road(k, x0, r0, x1, r1, z=-0.06, rng=None, dashes=True, studs=Y.CYAN):
    """An asphalt lane sunk below the kerbs: patched where it's been dug up, cracked, oil-stained; a dashed centre line
    and glowing studs either side (the hover lane's guides)."""
    rng = rng or k.rng
    k.box(x0, r0, z - 0.06, x1, r1, z, ('#1d1a27', 0.16), 'road')
    for _ in range(int((x1 - x0) / 5)):                     # patches
        px, pr = rng.uniform(x0 + 0.5, x1 - 2), rng.uniform(r0 + 0.1, r1 - 0.8)
        w, d = rng.uniform(0.6, 1.6), rng.uniform(0.3, 0.7)
        k.box(px, pr, z, px + w, pr + d, z + 0.003, (rng.choice(('#242030', '#191623')), 0.1), 'road_patch')
    for _ in range(int((x1 - x0) / 3)):                     # cracks: thin dark lines wandering
        cx, cr_ = rng.uniform(x0, x1), rng.uniform(r0 + 0.1, r1 - 0.1)
        a = rng.uniform(0, math.pi)
        for _s in range(rng.randint(2, 4)):
            nx, nr = cx + math.cos(a) * rng.uniform(0.15, 0.35), cr_ + math.sin(a) * rng.uniform(0.08, 0.2)
            k.bar(cx, cr_, nx, nr, z, z + 0.004, 0.018, '#0e0c14', 'road_crack')
            cx, cr_, a = nx, nr, a + rng.uniform(-0.8, 0.8)
    for _ in range(int((x1 - x0) / 4)):                     # oil
        cx, cr_ = rng.uniform(x0 + 0.3, x1 - 0.3), rng.uniform(r0 + 0.3, r1 - 0.3)
        s = rng.uniform(0.12, 0.3)
        k.cyl(cx, cr_, z, z + 0.004, s, '#121018', 'road_oil', verts=10, ry=s * 0.55)
    mid = (r0 + r1) / 2
    if dashes:
        x = x0 + 0.3
        while x < x1 - 0.6:
            k.box(x, mid - 0.03, z, x + 0.62, mid + 0.03, z + 0.005, ('#bca63c', 0.1), 'road_paint')
            x += 1.2
    if studs:
        for rr in (r0 + 0.12, r1 - 0.12):
            x = x0 + 0.5
            while x < x1:
                k.box(x - 0.04, rr - 0.025, z, x + 0.04, rr + 0.025, z + 0.012, shade(studs, 0.45), 'road_stud',
                      emit=(studs, 0.75))
                x += 1.5


def crosswalk(k, x0, x1, r0, r1, z=-0.06):
    """Zebra stripes across the lane: bars the crossing's width, stacked down it (as Rainline has them), worn a little."""
    rr = r0 + 0.1
    while rr < r1 - 0.2:
        k.box(x0, rr, z, x1, rr + 0.15, z + 0.005, (shade('#d6d6de', k.rng.uniform(0.85, 1.0)), 0.12), 'crosswalk')
        rr += 0.3


def tactile(k, x0, x1, r0, r1, z=0.0):
    k.box(x0, r0, z, x1, r1, z + 0.006, ('#7a6a34', 0.06), 'paving_tactile')
    dots = []
    x = x0 + 0.06
    while x < x1 - 0.04:
        rr = r0 + 0.06
        while rr < r1 - 0.04:
            dots.append((x - 0.015, rr - 0.015, z + 0.006, x + 0.015, rr + 0.015, z + 0.016))
            rr += 0.09
        x += 0.09
    k.boxes(dots, '#9a8840', 'paving_tactile_dot')


def puddles(k, spots, z=0.0):
    for (x, r, rx, ry, c) in spots:
        puddle(k, x, r, rx, ry, tint=c, z=z)


def flyers(k, x0, r0, x1, r1, n, rng=None, z=0.0):
    """Wet flyers, a crushed can, takeaway boxes, cigarette ends: flat on the ground (named as ground: no lines round
    them)."""
    rng = rng or k.rng
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        u = rng.random()
        if u < 0.45:
            a = rng.uniform(0, math.pi)
            w, d = 0.07, 0.05
            pts = [(x + math.cos(a) * w - math.sin(a) * d, r + math.sin(a) * w + math.cos(a) * d),
                   (x - math.cos(a) * w - math.sin(a) * d, r - math.sin(a) * w + math.cos(a) * d),
                   (x - math.cos(a) * w + math.sin(a) * d, r - math.sin(a) * w - math.cos(a) * d),
                   (x + math.cos(a) * w + math.sin(a) * d, r + math.sin(a) * w - math.cos(a) * d)]
            col = rng.choice(('#a84060', '#a89040', '#4a8a98', '#8a8a96', '#7a5aa0'))
            k.poly([(p[0], p[1], z + 0.004) for p in pts], (shade(col, 0.55), 0.1), 'litter')
        elif u < 0.7:
            k.box(x - 0.03, r - 0.012, z, x + 0.03, r + 0.012, z + 0.01, '#d8d0c0', 'litter')
        elif u < 0.85:
            k.cyl(x, r, z, z + 0.05, 0.035, ('#c83030' if rng.random() < 0.5 else '#3a8ad0', 0.1), 'can', verts=8)
        else:
            k.box(x - 0.09, r - 0.07, z, x + 0.09, r + 0.07, z + 0.09, ('#e8e0d0', 0.06), 'takeaway_box', bevel=0.01)
            k.box(x - 0.07, r - 0.072, z + 0.03, x + 0.07, r - 0.07, z + 0.07, '#c83030', 'takeaway_box_print')


# ---- on the walls -----------------------------------------------------------------------------------------------------
def pipe(k, x, r_face, z0, z1, rad=0.035, col='#4a4a56'):
    """A pipe up a face with clamps every storey and a shoe kicked out at the foot."""
    k.cyl(x, r_face + rad + 0.03, z0 + 0.12, z1, rad, col, 'pipe', verts=8)
    k.tube((x, r_face + rad + 0.03, z0 + 0.12), (x, r_face + rad + 0.12, z0 + 0.02), rad, col, 'pipe', verts=8)
    clamps = [(x - rad - 0.02, r_face, zz, x + rad + 0.02, r_face + 2 * rad + 0.06, zz + 0.05)
              for zz in [z0 + 0.6 + i * 0.9 for i in range(int((z1 - z0 - 0.6) / 0.9) + 1)] if zz < z1 - 0.05]
    if clamps:
        k.boxes(clamps, shade(col, 0.8), 'pipe_clamp')


def sill_plants(k, xs, r_face, z, rng=None):
    rng = rng or k.rng
    for x in xs:
        k.cyl(x, r_face + 0.1, z, z + 0.12, 0.07, rng.choice(('#5a2a20', '#3a3a44', '#6a4a2a')), 'pot', verts=8)
        k.blob(x, r_face + 0.1, z + 0.22, 0.12, 0.1, 0.12, (rng.choice(('#3a7a40', '#2a6a50', '#4a8a3a')), 0.2), 'plant',
               segs=8)


def wall_sign(k, x, r_face, z, w, h, col, glyph='#1a0c1a', rng=None):
    """A small lit box sign flat on a wall, two lines of dark glyphs."""
    rng = rng or k.rng
    k.box(x - w / 2, r_face, z, x + w / 2, r_face + 0.06, z + h, shade(col, 0.35), 'side_sign', emit=(col, 0.7))
    for j in range(2):
        gz = z + h * (0.28 + 0.38 * j)
        gw = w * rng.uniform(0.5, 0.8) / 2
        k.box(x - gw, r_face + 0.06, gz - 0.02, x + gw, r_face + 0.07, gz + 0.025, glyph, 'sign_glyph')


def meter_box(k, x, r_face, z=0.7):
    """A utility box on a wall: a grey cabinet, a meter's lit dial, conduit up."""
    k.box(x - 0.16, r_face, z, x + 0.16, r_face + 0.12, z + 0.4, ('#5a5a66', 0.08), 'meter_box', bevel=0.01)
    k.box(x - 0.08, r_face + 0.12, z + 0.22, x + 0.08, r_face + 0.125, z + 0.32, '#0c1a14', 'meter_dial', emit=(Y.GREEN, 0.5))
    k.cyl(x + 0.1, r_face + 0.04, z + 0.4, z + 1.3, 0.02, '#3a3a44', 'conduit', verts=6)


# ---- on the pavement --------------------------------------------------------------------------------------------------
def bollard(k, x, r, band='#e8c040'):
    k.cyl(x, r, 0.0, 0.5, 0.075, ('#2a2834', 0.06), 'bollard', verts=10)
    k.cyl(x, r, 0.36, 0.42, 0.078, band, 'bollard_band', emit=(band, 0.25), verts=10)
    k.sphere(x, r, 0.5, 0.075, 0.04, '#3a3846', 'bollard_cap', segs=8)
    k.solid_post(x, r)


def cones(k, spots):
    for (x, r) in spots:
        k.cone(x, r, 0.0, 0.42, 0.11, 0.02, ('#e86020', 0.06), 'cone', verts=10)
        k.cyl(x, r, 0.18, 0.24, 0.075, '#f0f0f0', 'cone_band', verts=10)
        k.box(x - 0.13, r - 0.13, 0.0, x + 0.13, r + 0.13, 0.03, '#2a2a30', 'cone_base')


def newsbox(k, x, r_face, col='#2a5a8a'):
    k.box(x - 0.15, r_face + 0.02, 0.0, x + 0.15, r_face + 0.3, 0.55, (col, 0.1), 'newsbox', bevel=0.02)
    k.box(x - 0.13, r_face + 0.3, 0.3, x + 0.13, r_face + 0.31, 0.5, '#0c1830', 'newsbox_screen', emit=('#80c0ff', 0.6))


def fruit_crates(k, x, r_face, n=2, rng=None):
    rng = rng or k.rng
    for i in range(n):
        xx = x + i * 0.32
        k.box(xx, r_face + 0.08, 0.0, xx + 0.28, r_face + 0.4, 0.22, ('#8a6a3a', 0.12), 'crate', bevel=0.01)
        col = rng.choice(('#e84030', '#e8c040', '#70c040', '#e88030', '#b040c0'))
        for j in range(3):
            for jj in range(2):
                k.sphere(xx + 0.06 + j * 0.08, r_face + 0.18 + jj * 0.12, 0.24, 0.045, 0.04, col, 'fruit', segs=6)


def a_board(k, x, r, col='#2a1a14', glow='#ff9a60'):
    """A menu board on the pavement, its chalk face lit by the shop."""
    k.box(x - 0.24, r - 0.12, 0.0, x + 0.24, r + 0.12, 0.6, (col, 0.1), 'a_board', bevel=0.01)
    k.box(x - 0.2, r + 0.12, 0.08, x + 0.2, r + 0.13, 0.54, '#1a0c10', 'a_board_face', emit=(glow, 0.35))
    for i in range(4):
        k.box(x - 0.15, r + 0.13, 0.42 - i * 0.09, x + 0.15 - (i % 2) * 0.06, r + 0.135, 0.44 - i * 0.09, '#f0e8d8',
              'a_board_chalk')


def bicycle(k, cx, cr, col='#d03040', solid=False):
    for s in (-1, 1):
        x = cx + s * 0.36
        k.cyl_y(x, cr - 0.02, cr + 0.02, 0.24, 0.24, 0.24, '#141418', 'bike_tyre', verts=18)
        k.cyl_y(x, cr - 0.025, cr + 0.025, 0.24, 0.17, 0.17, '#4a4a54', 'bike_rim', verts=18)
        k.cyl_y(x, cr - 0.03, cr + 0.03, 0.24, 0.04, 0.04, '#9a9aa4', 'bike_hub', verts=8)
    for a, b in (((cx - 0.36, 0.24), (cx - 0.02, 0.24)), ((cx - 0.02, 0.24), (cx + 0.2, 0.55)), ((cx - 0.36, 0.24), (cx - 0.12, 0.55)),
                 ((cx - 0.12, 0.55), (cx + 0.2, 0.55)), ((cx - 0.12, 0.55), (cx - 0.02, 0.24)), ((cx + 0.2, 0.55), (cx + 0.36, 0.24))):
        k.tube((a[0], cr, a[1]), (b[0], cr, b[1]), 0.022, col, 'bike_frame', verts=6)
    k.tube((cx + 0.2, cr, 0.55), (cx + 0.24, cr, 0.7), 0.02, '#3a3a44', 'bike_stem', verts=5)
    k.tube((cx + 0.24, cr - 0.16, 0.7), (cx + 0.24, cr + 0.16, 0.7), 0.018, '#3a3a44', 'bike_bars', verts=5)
    k.box(cx - 0.2, cr - 0.05, 0.6, cx - 0.04, cr + 0.05, 0.64, '#1a1a1e', 'bike_seat', bevel=0.01)
    k.tube((cx - 0.12, cr, 0.55), (cx - 0.12, cr, 0.6), 0.015, '#3a3a44', 'bike_post', verts=4)
    if solid:
        k.solid_post(cx, cr)


def cat(k, cx, cr, z=0.0, col='#1a1a1e', eyes='#e8d040'):
    """A cat sat facing the street, tail curled round."""
    k.blob(cx, cr, z + 0.12, 0.12, 0.1, 0.13, (col, 0.1), 'cat', segs=10)
    k.blob(cx, cr + 0.04, z + 0.3, 0.08, 0.075, 0.07, (col, 0.1), 'cat', segs=10)
    for s in (-1, 1):
        k.cone(cx + s * 0.045, cr + 0.04, z + 0.35, z + 0.42, 0.03, 0.0, col, 'cat_ear', verts=4)
        k.sphere(cx + s * 0.03, cr + 0.11, z + 0.31, 0.014, 0.012, eyes, 'cat_eye', emit=(eyes, 0.8), segs=5)
    k.tube((cx + 0.1, cr - 0.02, z + 0.02), (cx + 0.16, cr + 0.12, z + 0.02), 0.025, col, 'cat_tail', verts=5)


def pigeons(k, cx, cr, n=3, rng=None, z=0.0):
    """Pigeons pecking about: grey bodies, a darker head, a pink foot or two."""
    rng = rng or k.rng
    for _ in range(n):
        x, r = cx + rng.uniform(-0.4, 0.4), cr + rng.uniform(-0.15, 0.15)
        a = rng.uniform(-0.6, 0.6)
        k.blob(x, r, z + 0.07, 0.07, 0.045, 0.045, ('#6a6a7a', 0.1), 'pigeon', segs=8, rot=(0, 0, math.degrees(a)))
        hx, hz = x + math.cos(a) * 0.06, z + (0.06 if rng.random() < 0.5 else 0.11)
        k.sphere(hx, r + math.sin(a) * 0.06, hz, 0.025, 0.025, '#4a4a5a', 'pigeon', segs=6)
        k.box(hx + 0.02, r - 0.005, hz - 0.005, hx + 0.035, r + 0.005, hz + 0.003, '#c88a50', 'pigeon_beak')


def umbrella_dropped(k, x, r, col='#2a6ad0'):
    for i in range(6):
        a0, a1 = i * math.pi / 3, (i + 1) * math.pi / 3
        k.poly([(x, r, 0.22), (x + math.cos(a0) * 0.3, r + math.sin(a0) * 0.2, 0.02 + 0.2 * (1 + math.cos(a0)) / 2),
                (x + math.cos(a1) * 0.3, r + math.sin(a1) * 0.2, 0.02 + 0.2 * (1 + math.cos(a1)) / 2)],
               (col if i % 2 else shade(col, 0.8), 0.1), 'umbrella')
    k.tube((x, r, 0.22), (x - 0.35, r + 0.1, 0.03), 0.012, '#2a2a30', 'umbrella_shaft', verts=4)


def recycler(k, x, r, solid=True):
    k.cyl(x, r, 0.0, 0.7, 0.22, ('#3a6a4a', 0.06), 'recycler', verts=12)
    k.cyl(x, r, 0.7, 0.77, 0.24, '#2a4434', 'recycler_lid', verts=12)
    k.box(x - 0.1, r + 0.2, 0.42, x + 0.1, r + 0.23, 0.55, '#0c2a20', 'recycler_screen', emit=(Y.GREEN, 0.6))
    if solid:
        k.solid(x - 0.25, r - 0.25, x + 0.25, r + 0.25)


def delivery_bot(k, x, r, col='#e8e8f0'):
    """A six-wheeled delivery robot waiting at a door, its flag up and a smile on its screen."""
    k.box(x - 0.2, r - 0.15, 0.08, x + 0.2, r + 0.15, 0.4, (col, 0.05), 'deliverybot', bevel=0.04)
    k.box(x - 0.18, r - 0.13, 0.4, x + 0.18, r + 0.13, 0.44, '#2a2a34', 'deliverybot_lid', bevel=0.02)
    for dx in (-0.14, 0.0, 0.14):
        k.cyl_y(x + dx, r + 0.13, r + 0.17, 0.07, 0.06, 0.06, '#141418', 'deliverybot_wheel', verts=10)
    k.box(x - 0.1, r + 0.15, 0.22, x + 0.1, r + 0.155, 0.34, '#0c1a24', 'deliverybot_face', emit=(Y.CYAN, 0.8))
    k.tube((x - 0.15, r - 0.1, 0.44), (x - 0.15, r - 0.1, 0.95), 0.008, '#3a3a44', 'deliverybot_mast', verts=3)
    k.box(x - 0.15, r - 0.1, 0.83, x - 0.02, r - 0.098, 0.93, '#e86020', 'deliverybot_flag', emit=('#ff7030', 0.5))


# ---- in the lane ------------------------------------------------------------------------------------------------------
def hover_taxi(k, cx, cr, z=0.0, col='#e8b830', solid=True):
    """Rainline's taxi: checker band, a lit roof sign, lift pods glowing underneath."""
    k.box(cx - 0.9, cr - 0.36, z + 0.22, cx + 0.9, cr + 0.36, z + 0.6, (col, 0.06), 'taxi_body', bevel=0.12)
    k.cyl_x(cx - 0.98, cx + 0.98, cr, z + 0.4, 0.34, 0.18, (col, 0.06), 'taxi_body', verts=14)
    k.box(cx - 0.5, cr - 0.3, z + 0.58, cx + 0.32, cr + 0.3, z + 0.86, '#141c2c', 'taxi_glass', emit=('#2a4060', 0.35), bevel=0.1)
    k.box(cx - 0.46, cr - 0.3, z + 0.84, cx + 0.28, cr + 0.3, z + 0.9, (col, 0.06), 'taxi_roof', bevel=0.04)
    k.box(cx - 0.12, cr + 0.29, z + 0.6, cx - 0.08, cr + 0.31, z + 0.86, col, 'taxi_pillar')
    k.box(cx - 0.98, cr + 0.3, z + 0.42, cx + 0.98, cr + 0.33, z + 0.46, '#141416', 'taxi_stripe')
    k.boxes([(cx - 0.9 + i * 0.18, cr + 0.33, z + 0.42, cx - 0.72 + i * 0.18, cr + 0.335, z + 0.46) for i in range(10) if i % 2],
            '#f0f0f0', 'taxi_check')
    k.box(cx - 0.3, cr - 0.08, z + 0.9, cx + 0.06, cr + 0.08, z + 1.0, '#2a2a2a', 'taxi_sign_base', bevel=0.01)
    k.box(cx - 0.28, cr + 0.08, z + 0.91, cx + 0.04, cr + 0.09, z + 0.99, '#e8c040', 'taxi_sign', emit=('#ffd860', 0.95))
    for s in (-1, 1):
        k.cyl(cx + s * 0.62, cr, z + 0.08, z + 0.2, 0.16, '#2a2a30', 'taxi_pod', verts=14)
        k.cyl(cx + s * 0.62, cr, z + 0.05, z + 0.08, 0.13, shade(Y.CYAN, 0.45), 'taxi_pod_glow', emit=(Y.CYAN, 0.95), verts=14)
    for dr in (-0.2, 0.2):
        k.sphere(cx + 0.98, cr + dr, z + 0.44, 0.06, 0.04, '#fff6e0', 'taxi_head', emit=('#fff2d0', 1.0), segs=8)
        k.sphere(cx - 0.99, cr + dr, z + 0.46, 0.05, 0.04, '#e83040', 'taxi_tail', emit=('#ff3040', 0.95), segs=8)
    k.point_light(cx, cr + 0.1, z + 0.06, Y.CYAN, 6, radius=0.3, group='flicker')
    k.point_light(cx + 1.4, cr, z + 0.4, '#fff0d0', 5, radius=0.2, group='flicker')
    if solid:
        k.solid(cx - 1.0, cr - 0.38, cx + 1.0, cr + 0.38)


def hover_van(k, cx, cr, z=0.0, stripe='#2a6ad0', logo=None, solid=True):
    """A delivery van: white body, a roof rack with a crate, a police-style light bar off."""
    k.box(cx - 1.05, cr - 0.4, z + 0.22, cx + 1.05, cr + 0.4, z + 1.12, ('#d8dce4', 0.05), 'van_body', bevel=0.1)
    k.box(cx + 0.55, cr - 0.37, z + 0.62, cx + 1.06, cr + 0.37, z + 1.02, '#141c2c', 'van_glass', emit=('#2a4060', 0.3), bevel=0.06)
    k.box(cx - 1.0, cr + 0.39, z + 0.62, cx + 0.5, cr + 0.41, z + 0.82, stripe, 'van_stripe')
    k.box(cx - 0.9, cr + 0.41, z + 0.66, cx + 0.3, cr + 0.42, z + 0.78, '#f0f4ff', 'van_logo', emit=('#c0d8ff', 0.4))
    for s in (-1, 1):
        k.cyl(cx + s * 0.65, cr, z + 0.08, z + 0.2, 0.17, '#2a2a30', 'van_pod', verts=14)
        k.cyl(cx + s * 0.65, cr, z + 0.05, z + 0.08, 0.14, shade(Y.PINK, 0.45), 'van_pod_glow', emit=(Y.PINK, 0.9), verts=14)
    for dr in (-0.24, 0.24):
        k.sphere(cx + 1.06, cr + dr, z + 0.45, 0.06, 0.05, '#fff6e0', 'van_head', emit=('#fff2d0', 0.9), segs=8)
        k.sphere(cx - 1.07, cr + dr, z + 0.5, 0.05, 0.05, '#e83040', 'van_tail', emit=('#ff3040', 0.95), segs=8)
    for x in (cx - 0.8, cx - 0.35, cx + 0.1):
        k.box(x, cr - 0.34, z + 1.12, x + 0.05, cr + 0.34, z + 1.18, '#5a5e6a', 'van_rack')
    k.box(cx - 0.85, cr - 0.34, z + 1.16, cx + 0.15, cr - 0.3, z + 1.2, '#5a5e6a', 'van_rack')
    k.box(cx - 0.85, cr + 0.3, z + 1.16, cx + 0.15, cr + 0.34, z + 1.2, '#5a5e6a', 'van_rack')
    k.box(cx - 0.7, cr - 0.2, z + 1.18, cx - 0.2, cr + 0.15, z + 1.3, ('#3a5a8a', 0.1), 'van_crate', bevel=0.02)
    k.box(cx + 0.3, cr - 0.25, z + 1.12, cx + 0.5, cr + 0.25, z + 1.17, '#3a3e48', 'van_vent')
    k.box(cx - 1.06, cr - 0.3, z + 0.3, cx - 1.04, cr + 0.3, z + 1.0, '#9aa0aa', 'van_door_seam')
    k.point_light(cx, cr + 0.1, z + 0.06, Y.PINK, 5, radius=0.3, group='flicker')
    if solid:
        k.solid(cx - 1.05, cr - 0.4, cx + 1.05, cr + 0.4)


def steam_pipe(k, st, x, r, h=0.9, col='#e86020'):
    """A striped steam stack in the road where the works are: steam out of its top."""
    k.cyl(x, r, -0.06, h, 0.09, (col, 0.08), 'steam_stack', verts=10)
    for i in range(int(h / 0.24)):
        k.cyl(x, r, i * 0.24, i * 0.24 + 0.1, 0.095, '#f0f0f0', 'steam_stack_band', verts=10)
    st.vent(x, r, h)
    k.solid_post(x, r)


def planter(k, cx, cr, leaf='#2a5a48', glow=Y.CYAN, w=0.4, solid=True):
    """A concrete planter, its rim lit, a small tree with a real crown of leaves strung with fairy lights, ivy over the
    edge, a few weeds and a can someone left on it."""
    import assets_town as T
    k.box(cx - w, cr - w, 0, cx + w, cr + w, 0.45, ('#3a384a', 0.06), 'planter', bevel=0.02)
    k.box(cx - w, cr + w - 0.01, 0.36, cx + w, cr + w + 0.01, 0.4, shade(glow, 0.4), 'planter_led', emit=(glow, 0.7))
    k.box(cx - w + 0.06, cr - w + 0.06, 0.4, cx + w - 0.06, cr + w - 0.06, 0.45, '#1a1210', 'soil')
    k.tube((cx, cr, 0.45), (cx + 0.05, cr, 1.25), 0.05, '#2a1c14', 'trunk', rb=0.03, verts=6)
    with k.foliage('leaf'):
        T.leafy_crown(k, cx + 0.05, cr, 1.45, 0.42, 0.36, 0.34, leaf)
        for s in (-1, 1):                                   # ivy trailing over the rim
            for i in range(3):
                k.blob(cx + s * (w - 0.02), cr + w - 0.1 - i * 0.18, 0.36 - i * 0.04, 0.05, 0.08, 0.1, (shade(leaf, 1.15), 0.2),
                       'ivy', segs=6)
    for i in range(9):
        a = i * 0.75
        k.sphere(cx + 0.05 + math.cos(a) * 0.38, cr + 0.22 + math.sin(a) * 0.12, 1.25 + (i % 3) * 0.14, 0.03, 0.03, glow,
                 'fairy_light', emit=(glow, 1.0), segs=5)
    k.point_light(cx, cr + 0.5, 1.4, glow, 4, radius=0.2, group='flicker')
    if solid:
        k.solid(cx - w - 0.05, cr - w - 0.05, cx + w + 0.05, cr + w + 0.05)


def puddle(k, cx, cr, rx, ry, tint=Y.PINK, z=0.0):
    """Y.puddle at any height (in the sunk lane): dark water in lobes, faintly tinted, a bright streak."""
    for i, (dx, dr, sx, sy) in enumerate(((0, 0, 1, 1), (rx * 0.5, ry * 0.35, 0.6, 0.7), (-rx * 0.45, -ry * 0.25, 0.55, 0.6))):
        k.cyl(cx + dx, cr + dr, z, z + 0.004 + i * 0.001, rx * sx, '#0c0816', 'puddle', emit=(tint, 0.16), verts=12, ry=ry * sy)
    k.box(cx - rx * 0.45, cr - 0.015, z + 0.006, cx + rx * 0.25, cr + 0.015, z + 0.008, '#0c0816', 'puddle_glint', emit=(tint, 0.6))


def manhole(k, cx, cr, z=0.0):
    k.cyl(cx, cr, z, z + 0.008, 0.3, ('#2a2638', 0.1), 'manhole', verts=16)
    k.cyl(cx, cr, z + 0.008, z + 0.01, 0.26, '#221e30', 'manhole_rim', verts=16)
    k.boxes([(cx - 0.2, cr - 0.12 + i * 0.12 - 0.015, z + 0.008, cx + 0.2, cr - 0.12 + i * 0.12 + 0.015, z + 0.012) for i in range(3)],
            '#1a1626', 'manhole_grid')


def grate(k, st, cx, cr, z=0.0):
    """A steam grate (its steam drawn by the engine: st.steam)."""
    k.box(cx - 0.3, cr - 0.2, z, cx + 0.3, cr + 0.2, z + 0.01, '#14121a', 'grate')
    k.boxes([(cx - 0.28 + i * 0.07, cr - 0.18, z + 0.01, cx - 0.25 + i * 0.07, cr + 0.18, z + 0.015) for i in range(9)], '#2a2832',
            'grate_bars')
    st.vent(cx, cr, z)


def island(k, x0, r0, x1, r1, rng=None):
    """A refuge in the lane: a kerbed oval of paving raised to pavement height."""
    k.box(x0, r0, -0.06, x1, r1, 0.07, ('#4a4658', 0.06), 'kerb', bevel=0.03)
    k.box(x0 + 0.1, r0 + 0.08, 0.07, x1 - 0.1, r1 - 0.08, 0.075, ('#2e2a3a', 0.1), 'paving')
    k.box(x0 + 0.1, r1 - 0.11, 0.07, x1 - 0.1, r1 - 0.08, 0.08, shade(Y.YEL, 0.5), 'kerb_paint', emit=(Y.YEL, 0.3))


# ---- the Backs --------------------------------------------------------------------------------------------------------
def channel(k, x0, x1, r, w=0.36, z=0.0):
    """A dished stone gutter down the middle of a lane, water standing along it."""
    k.box(x0, r - w / 2, z - 0.05, x1, r + w / 2, z - 0.005, ('#2c2836', 0.08), 'paving_channel')
    for e in (-1, 1):
        k.boxes([(x, r + e * w / 2 - (0.06 if e > 0 else 0), z - 0.03, min(x1, x + 0.48), r + e * w / 2 + (0.0 if e > 0 else 0.06), z)
                 for x in [x0 + i * 0.5 for i in range(int((x1 - x0) / 0.5) + 1)] if x < x1], ('#4a4658', 0.06), 'kerb')
    k.box(x0, r - w / 2 + 0.08, z - 0.035, x1, r + w / 2 - 0.08, z - 0.03, '#0c0816', 'puddle', emit=('#7a50c0', 0.1))


def weeds(k, spots, rng=None):
    """Weeds in the cracks: a few green blades and a dandelion now and then."""
    rng = rng or k.rng
    for (x, r) in spots:
        for _ in range(rng.randint(3, 6)):
            a = rng.uniform(0, math.tau)
            k.cone(x + math.cos(a) * 0.04, r + math.sin(a) * 0.03, 0.0, rng.uniform(0.06, 0.13), 0.02, 0.002,
                   shade('#3a6a34', rng.uniform(0.8, 1.2)), 'weed', verts=3)
        if rng.random() < 0.3:
            k.sphere(x, r + 0.02, 0.1, 0.022, 0.018, '#e8c840', 'weed', segs=5)


def pallets(k, x, r, n=3, tone='#7a6040'):
    """Pallets stacked flat, a slat or two broken."""
    for i in range(n):
        z = i * 0.13
        k.boxes([(x, r + j * 0.2, z + 0.08, x + 0.9, r + j * 0.2 + 0.14, z + 0.11) for j in range(4)], (shade(tone, 1 - i * 0.05), 0.14),
                'pallet')
        k.boxes([(x + dx, r, z, x + dx + 0.1, r + 0.74, z + 0.08) for dx in (0.0, 0.4, 0.8)], (shade(tone, 0.8), 0.14), 'pallet')
    k.solid(x, r, x + 0.9, r + 0.74)


def gas_bottles(k, x, r, n=2, col='#c83a30'):
    for i in range(n):
        xx = x + i * 0.24
        k.cyl(xx, r, 0.0, 0.62, 0.1, (col, 0.08), 'gas_bottle', verts=10)
        k.sphere(xx, r, 0.62, 0.1, 0.06, (col, 0.08), 'gas_bottle', segs=8)
        k.cyl(xx, r, 0.66, 0.74, 0.03, '#8a8a90', 'gas_valve', verts=6)


def chairs_and_crate(k, x, r, rng=None):
    """Where NULL's crew sits out: two plastic chairs round an upturned crate with cans, a full ashtray, a speaker."""
    rng = rng or k.rng
    for (dx, col) in ((-0.55, '#d84a4a'), (0.55, '#3a8ad0')):
        cx = x + dx
        k.box(cx - 0.2, r - 0.18, 0.36, cx + 0.2, r + 0.18, 0.4, (col, 0.08), 'chair_seat', bevel=0.02)
        k.box(cx - 0.2, r - 0.2, 0.4, cx + 0.2, r - 0.16, 0.8, (col, 0.08), 'chair_back', bevel=0.02)
        for (lx, lr) in ((-0.17, -0.15), (0.17, -0.15), (-0.17, 0.15), (0.17, 0.15)):
            k.cyl(cx + lx, r + lr, 0.0, 0.36, 0.02, shade(col, 0.8), 'chair_leg', verts=5)
    k.box(x - 0.26, r - 0.22, 0, x + 0.26, r + 0.22, 0.42, ('#8a7050', 0.14), 'crate')
    for i in range(3):
        k.cyl(x - 0.14 + i * 0.12, r + rng.uniform(-0.08, 0.08), 0.42, 0.53, 0.035, ('#c83030', '#3ab0a0', '#e8c040')[i], 'can', verts=8)
    k.cyl(x + 0.14, r - 0.05, 0.42, 0.45, 0.06, '#2a2a30', 'ashtray', verts=10)
    k.solid(x - 0.8, r - 0.25, x + 0.8, r + 0.25)


def shopping_trolley(k, x, r, tipped=False):
    col = '#9a9aa4'
    z0 = 0.18
    k.boxes([(x - 0.3, r - 0.2, z0, x + 0.3, r - 0.18, z0 + 0.4), (x - 0.3, r + 0.18, z0, x + 0.3, r + 0.2, z0 + 0.4),
             (x - 0.3, r - 0.2, z0, x - 0.28, r + 0.2, z0 + 0.4), (x + 0.28, r - 0.2, z0, x + 0.3, r + 0.2, z0 + 0.4)], col, 'trolley')
    k.boxes([(x - 0.3 + i * 0.1, r + 0.2, z0, x - 0.29 + i * 0.1, r + 0.21, z0 + 0.4) for i in range(7)], shade(col, 0.8), 'trolley')
    k.tube((x - 0.34, r - 0.2, z0 + 0.5), (x - 0.34, r + 0.2, z0 + 0.5), 0.02, '#c83030', 'trolley_handle', verts=5)
    for (dx, dr) in ((-0.25, -0.15), (0.25, -0.15), (-0.25, 0.15), (0.25, 0.15)):
        k.cyl(x + dx, r + dr, 0.0, 0.06, 0.04, '#141418', 'trolley_wheel', verts=6)
        k.tube((x + dx, r + dr, 0.06), (x + dx, r + dr, z0), 0.012, col, 'trolley', verts=4)
    k.blob(x, r, z0 + 0.3, 0.2, 0.14, 0.12, ('#1a1a20', 0.15), 'trash_bag', segs=8)


def rat(k, x, r, col='#3a3236'):
    k.blob(x, r, 0.05, 0.07, 0.035, 0.04, (col, 0.1), 'rat', segs=8)
    k.sphere(x + 0.07, r, 0.05, 0.025, 0.022, col, 'rat', segs=6)
    k.tube((x - 0.07, r, 0.03), (x - 0.18, r + 0.05, 0.01), 0.008, '#8a6a70', 'rat_tail', verts=3)


def neon_arrow(k, x, r_face, z, col='#e040c0', w=0.8, energy=0.9):
    """A neon arrow on a wall, pointing the way (right)."""
    pts = [(x - w / 2, z), (x + w / 2 - 0.15, z), (x + w / 2 - 0.15, z + 0.1), (x + w / 2, z - 0.02), (x + w / 2 - 0.15, z - 0.14),
           (x + w / 2 - 0.15, z - 0.04), (x - w / 2, z - 0.04)]
    for a, b in zip(pts, pts[1:] + pts[:1]):
        k.tube((a[0], r_face + 0.04, a[1]), (b[0], r_face + 0.04, b[1]), 0.016, shade(col, 0.5), 'arrow_neon', emit=(col, energy), verts=4)


def chain_fence(k, x0, x1, r, h=1.6, col='#5a5a64'):
    """Chain-link between posts, a top rail, barbed wire coiled along it."""
    for x in [x0 + i * (x1 - x0) / max(1, round(x1 - x0)) for i in range(int(round(x1 - x0)) + 1)]:
        k.cyl(x, r, 0.0, h, 0.03, col, 'fence_post', verts=6)
    k.tube((x0, r, h - 0.05), (x1, r, h - 0.05), 0.02, col, 'fence_rail', verts=5)
    lines = []
    s = 0.09
    x = x0
    while x < x1:
        lines.append(((x, 0.05), (min(x1, x + h * 0.55), h - 0.08)))
        lines.append(((min(x1, x + h * 0.55), 0.05), (x, h - 0.08)))
        x += s * 2
    for (a, b) in lines:
        k.tube((a[0], r, a[1]), (b[0], r, b[1]), 0.004, shade(col, 0.9), 'fence_mesh', verts=3)
    import assets_district as D
    D.razor_wire(k, x0, x1, r - 0.1, h - 0.08)


# ---- up high: the Skywalk and Skyport 7 -------------------------------------------------------------------------------
def tower_face(k, x0, x1, r_face, z0, z1, rng=None, wall='#16122a', neon=Y.CYAN, floor_h=1.05):
    """A tower's face seen close: floor slabs standing proud, framed windows (some lit, blinds, a plant, someone in one),
    a neon strip up one edge, AC units, a blade sign."""
    import assets_district as D
    rng = rng or k.rng
    k.box(x0, r_face - 1.0, z0, x1, r_face, z1, (wall, 0.08), 'tower')
    z = z0 + 0.1
    bands = []
    while z < z1 - 0.3:
        bands.append((x0, r_face, z, x1, r_face + 0.08, z + 0.09))
        D.window_row(k, x0 + 0.2, x1 - 0.2, r_face, z + 0.28, h=0.55, lit=rng.uniform(0.35, 0.7), rng=rng)
        if rng.random() < 0.35:
            D.ac_unit(k, rng.uniform(x0 + 0.3, x1 - 0.3), r_face, z + 0.12)
        z += floor_h
    k.boxes(bands, shade(wall, 1.5), 'tower_band')
    ex = x1 - 0.08 if rng.random() < 0.5 else x0 + 0.04
    k.box(ex, r_face, z0, ex + 0.04, r_face + 0.05, z1, shade(neon, 0.4), 'tower_neon', emit=(neon, 0.8))


def deck_plates(k, x0, r0, x1, r1, rng=None, tones=('#2e2a3a', '#2a2636', '#322e3e', '#282434'), part='deck'):
    """Steel deck plates a tile square: each its own tone, a tread of raised dots, a rivet at each corner."""
    rng = rng or k.rng
    paving(k, x0, r0, x1, r1, size=1.0, tones=tones, seam='#0e0c16', rng=rng, crack=0.0, sunk=0.0, stain=0.08, part=part)
    rivets, tread = [], []
    x = x0
    while x < x1 - 0.5:
        r = r0
        while r < r1 - 0.5:
            for (dx, dr) in ((0.08, 0.08), (0.92, 0.08), (0.08, 0.92), (0.92, 0.92)):
                rivets.append((x + dx - 0.02, r + dr - 0.02, 0.0, x + dx + 0.02, r + dr + 0.02, 0.008))
            if rng.random() < 0.3:
                for i in range(4):
                    for j in range(4):
                        tread.append((x + 0.25 + i * 0.16, r + 0.25 + j * 0.16, 0.0, x + 0.3 + i * 0.16, r + 0.28 + j * 0.16, 0.006))
            r += 1.0
        x += 1.0
    k.boxes(rivets, '#4a4658', part + '_rivet')
    if tread:
        k.boxes(tread, '#36324a', part + '_tread')


def wet_sign(k, x, r):
    """A yellow WET FLOOR A-frame."""
    k.box(x - 0.17, r - 0.1, 0.0, x + 0.17, r + 0.1, 0.55, ('#e8c030', 0.06), 'wet_sign', bevel=0.02)
    k.box(x - 0.1, r + 0.1, 0.25, x + 0.1, r + 0.105, 0.42, '#1a1a1a', 'wet_sign_mark')


def coffee_cup(k, x, r, z=0.0, tipped=False):
    if tipped:
        k.cyl_x(x - 0.05, x + 0.05, r, z + 0.035, 0.035, 0.035, '#e8e0d0', 'cup', verts=8)
        k.cyl(x + 0.1, r + 0.02, z, z + 0.002, 0.08, '#3a2418', 'litter', verts=8, ry=0.04)
    else:
        k.cone(x, r, z, z + 0.1, 0.03, 0.038, '#e8e0d0', 'cup', verts=8)
        k.cyl(x, r, z + 0.1, z + 0.115, 0.04, '#2a2a30', 'cup_lid', verts=8)


def floodlight(k, x, r, h=2.2, aim=1, col='#e8f0ff', energy=40):
    """A floodlight on a pole, its head tipped toward the pad."""
    k.cyl(x, r, 0.0, 0.1, 0.12, '#2a2832', 'flood_base', verts=8)
    k.cyl(x, r, 0.1, h, 0.04, '#4a4a58', 'flood_pole', verts=6)
    k.box(x - 0.16, r - 0.05, h, x + 0.16, r + 0.12, h + 0.18, '#2a2a32', 'flood_head', bevel=0.02)
    k.box(x - 0.13, r + 0.12, h + 0.03, x + 0.13, r + 0.13, h + 0.15, '#e8f0ff', 'flood_lens', emit=(col, 0.95))
    k.point_light(x, r + 0.6 * aim, h - 0.2, col, energy, radius=0.2, group='flicker')
    k.solid_post(x, r)


def hazard_stripes(k, x0, r0, x1, r1, z=0.0, w=0.18):
    """Yellow and black diagonal stripes painted on the deck (a keep-clear zone)."""
    k.box(x0, r0, z, x1, r1, z + 0.003, ('#1a1a1e', 0.06), 'paving_hatch')
    strokes = []
    t = x0 - (r1 - r0)
    while t < x1:
        a, b = max(x0, t), min(x1, t + (r1 - r0))
        if b > a:
            strokes.append((a, r0 + (a - t), b, r0 + (b - t)))
        t += 2 * w
    for (xa, ra, xb, rb) in strokes:
        k.bar(xa, ra, xb, rb, z + 0.003, z + 0.006, w * 0.7, ('#d8b030', 0.08), 'paving_hatch_paint')


def windsock(k, x, r, h=2.6):
    k.cyl(x, r, 0.0, h, 0.035, '#4a4a58', 'sock_mast', verts=6)
    k.sphere(x, r, h + 0.04, 0.05, 0.05, Y.RED, 'sock_light', emit=(Y.RED, 1.0), segs=6)
    rings = []
    for i in range(6):
        t = i / 5
        rad = 0.14 * (1 - 0.5 * t)
        rings.append([(x + 0.05 + t * 0.7, r + math.cos(a) * rad, h - 0.15 - t * 0.12 + math.sin(a) * rad)
                      for a in [j * math.tau / 10 for j in range(10)]])
    k.loft(rings, ('#e86020', 0.08), 'sock', closed=True)
    for i in (1, 3):
        t = i / 5 + 0.1
        k.cyl_x(x + 0.05 + t * 0.7 - 0.06, x + 0.05 + t * 0.7 + 0.06, r, h - 0.15 - t * 0.12, 0.14 * (1 - 0.5 * t) + 0.005,
                0.14 * (1 - 0.5 * t) + 0.005, '#f0f0f0', 'sock_band', verts=10)
    k.solid_post(x, r)
