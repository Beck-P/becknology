"""Lumar's harbour kit for the rebuilt Diggen's Point and the Market Square (the new look, Oct 2026) — every function
takes a Kit. Same model world as assets_town / assets_house: chunky shapes that read at 32 px a tile.

  fish_shed(k, x0, x1, r_back, r_front, ...)   a weatherboarded fish shed / net loft with a pantile or slate roof
  cutter_on_stocks(k, x0, x1, rc, ...)         a cutter half-built on a slip: planked aft, ribs bare at the bow
  pier(k, x0, x1, r0, r1, z)                   a plank pier on piles with braces, rubbing strakes, bollards, a ladder
  lighthouse(k, cx, cr, ...)                   Diggen's light: coursed stone in red and white bands, gallery, lantern
  dry_wall(k, a, b, h)                         a dry-stone wall between two floor points, copestones on top
  lobster_pots / fish_boxes / net_rack / capstan / anchor / gull / crab / thrift / gorse / heather   small life
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assets_town as W  # noqa: E402
import assets_lumar as A  # noqa: E402
from scenekit import shade  # noqa: E402

STONES = ('#a09888', '#8e8678', '#b0a690', '#7e786e', '#9a9282', '#a89c86')
ROPE = '#b8a070'


def dry_wall(k, a, b, h=0.5, d=0.26, part='wall_stone', solid=True):
    """A dry-stone wall from floor point a to b (x, row): rough blocks in courses along it, rounded copestones on top."""
    rng = k.rng
    L = math.dist(a, b)
    ux, ur = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    z, i = 0.0, 0
    while z < h - 0.08:
        t = -(0.08 if i % 2 else 0.0)
        zh = min(h - 0.08, z + rng.uniform(0.11, 0.16))
        while t < L:
            w = rng.uniform(0.16, 0.3)
            t0, t1 = max(0.0, t), min(L, t + w)
            if t1 - t0 > 0.04:
                p, q = (a[0] + ux * (t0 + 0.01), a[1] + ur * (t0 + 0.01)), (a[0] + ux * (t1 - 0.01), a[1] + ur * (t1 - 0.01))
                k.bar(p[0], p[1], q[0], q[1], z + 0.01, zh, d - rng.uniform(0, 0.03), (shade(rng.choice(STONES), rng.uniform(0.85, 1.08)), 0.14),
                      part, bevel=0.02)
            t += w
        z, i = zh, i + 1
    t = 0.0
    while t < L - 0.05:
        w = rng.uniform(0.12, 0.18)
        m = (a[0] + ux * (t + w / 2), a[1] + ur * (t + w / 2))
        k.blob(m[0], m[1], h - 0.03, w / 2 + abs(ur) * 0.06, d / 2 + abs(ux) * 0.01, 0.07, (shade('#9a9080', rng.uniform(0.85, 1.05)), 0.1),
               'copestone', segs=8)
        if rng.random() < 0.2:
            k.blob(m[0], m[1], h + 0.02, w * 0.4, d * 0.4, 0.03, (shade('#5a7a40', rng.uniform(0.85, 1.1)), 0.2), 'moss', segs=6)
        t += w
    if solid:
        k.solid(min(a[0], b[0]) - 0.12, min(a[1], b[1]) - 0.12, max(a[0], b[0]) + 0.12, max(a[1], b[1]) + 0.12)


def weatherboards(k, x0, x1, r_face, z0, z1, tone, part='boards'):
    """Overlapping horizontal boards on a wall face, each its own tone, a dark lap line under each."""
    rng = k.rng
    z = z0
    while z < z1 - 0.04:
        h = min(0.17, z1 - z)
        k.box(x0, r_face - 0.01, z, x1, r_face + 0.025, z + h, (shade(tone, rng.uniform(0.86, 1.08)), 0.16), part)
        k.box(x0, r_face + 0.02, z, x1, r_face + 0.034, z + 0.022, shade(tone, 0.55), part + '_lap')
        z += 0.17


def side_boards(k, xe, r0, r1, z0, z1, tone, part='boards'):
    """Boards along a gable-end wall (facing ±x); the east end shows at the 45° camera only by its edge."""
    k.box(xe - 0.02, r0, z0, xe + 0.02, r1, z1, (shade(tone, 0.8), 0.16), part)


def fish_shed(k, x0, x1, r_back, r_front, wall_h=1.75, rise=1.05, roof='#9a4a32', boards='#5a4a3c', trim='#e8dcc0',
              doors=(), windows=(), hoist=None, sign=None, lamp=None):
    """A harbour shed of tarred weatherboard on a stone footing: wide double doors (doors: [(cx, w)]), small lit windows
    (windows: [(cx, z)]), a pantile or slate roof (assets_house picks pantiles for a clay colour), white-painted
    bargeboards, a loft door and hoist over `hoist` (an x), a sign board (sign: (cx, z, w)), a lamp over the door."""
    import assets_house as HK
    rng = k.rng
    k.box(x0 - 0.03, r_back, 0, x1 + 0.03, r_front + 0.03, 0.22, (shade(STONES[1], 0.8), 0.14), 'footing', bevel=0.015)
    x = x0 - 0.03
    while x < x1:
        w = rng.uniform(0.26, 0.46)
        k.box(x + 0.015, r_front + 0.02, 0.01, min(x + w, x1 + 0.03) - 0.015, r_front + 0.06, rng.uniform(0.18, 0.23),
              (shade(rng.choice(STONES), rng.uniform(0.82, 1.05)), 0.14), 'plinth_stone', bevel=0.01)
        x += w
    k.box(x0 + 0.02, r_back + 0.03, 0.22, x1 - 0.02, r_front - 0.02, wall_h, (boards, 0.16), 'shed_wall')
    weatherboards(k, x0 + 0.02, x1 - 0.02, r_front, 0.22, wall_h, boards)
    for xe in (x0 + 0.02, x1 - 0.14):                                                   # corner posts, painted
        k.box(xe, r_front - 0.02, 0.22, xe + 0.12, r_front + 0.05, wall_h, (trim, 0.1), 'corner_post')
    for (cx, w) in doors:
        k.box(cx - w / 2 - 0.08, r_front + 0.01, 0.0, cx + w / 2 + 0.08, r_front + 0.07, 1.42, (trim, 0.1), 'door_frame')
        for s in (-1, 1):
            xa, xb = (cx - w / 2, cx - 0.01) if s < 0 else (cx + 0.01, cx + w / 2)
            k.box(xa, r_front + 0.04, 0.02, xb, r_front + 0.09, 1.34, ('#3a4a42', 0.16), 'shed_door')
            nb = max(2, int((xb - xa) / 0.14))
            for i in range(1, nb):                                                       # vertical boards
                xx = xa + (xb - xa) * i / nb
                k.box(xx - 0.008, r_front + 0.09, 0.04, xx + 0.008, r_front + 0.1, 1.32, '#26302c', 'shed_door_seam')
            k.tube((xa + 0.04, r_front + 0.1, 0.12), (xb - 0.04, r_front + 0.1, 1.22), 0.025, '#4a5a52', 'shed_door_brace', verts=4, smooth=False)
            k.boxes([(xa + 0.02, r_front + 0.09, zz, xb - 0.02, r_front + 0.11, zz + 0.08) for zz in (0.14, 1.12)], '#4a5a52', 'shed_door_rail')
        for zz in (0.35, 1.0):                                                           # strap hinges
            k.box(cx - w / 2 + 0.02, r_front + 0.1, zz, cx - w / 2 + 0.26, r_front + 0.115, zz + 0.04, A.IRON, 'hinge')
            k.box(cx + w / 2 - 0.26, r_front + 0.1, zz, cx + w / 2 - 0.02, r_front + 0.115, zz + 0.04, A.IRON, 'hinge')
        if rng.random() < 0.6:                                                            # one leaf ajar: lamplight inside
            k.box(cx + 0.02, r_front + 0.0, 0.05, cx + w / 2 - 0.05, r_front + 0.035, 1.3, '#4a2a10', 'doorway_glow', emit=(W.GLOW_D, 0.5))
    for (cx, z) in windows:
        HK.rich_window(k, cx, r_front + 0.03, z, w=0.42, h=0.46, shutters=None, box=rng.random() < 0.5, stone='#d8ccb0')
    if hoist is not None:
        hx = hoist
        k.box(hx - 0.36, r_front + 0.02, wall_h - 0.8, hx + 0.36, r_front + 0.07, wall_h - 0.06, ('#3a4a42', 0.16), 'loft_door')
        k.box(hx - 0.4, r_front + 0.02, wall_h - 0.84, hx + 0.4, r_front + 0.06, wall_h - 0.8, (trim, 0.1), 'door_frame')
        k.box(hx - 0.06, r_back + 0.4, wall_h + 0.28, hx + 0.06, r_front + 0.7, wall_h + 0.4, (A.WOOD_D, 0.12), 'hoist_beam')
        k.cyl_x(hx - 0.05, hx + 0.05, r_front + 0.6, wall_h + 0.2, 0.08, 0.08, A.IRON, 'pulley', verts=10)
        k.tube((hx, r_front + 0.6, wall_h + 0.12), (hx, r_front + 0.6, 0.85), 0.012, ROPE, 'rope', verts=5)
        k.tube((hx + 0.04, r_front + 0.62, wall_h + 0.12), (hx + 0.32, r_front + 0.14, 1.2), 0.012, ROPE, 'rope', verts=5)
        k.blob(hx, r_front + 0.6, 0.75, 0.14, 0.12, 0.16, ('#b8a47a', 0.3), 'sack', segs=8)       # a sack on the hook
    if sign:
        sx, sz, sw = sign
        k.box(sx - sw / 2, r_front + 0.05, sz, sx + sw / 2, r_front + 0.1, sz + 0.26, ('#2a3a32', 0.14), 'sign_board')
        k.box(sx - sw / 2 + 0.05, r_front + 0.1, sz + 0.1, sx + sw / 2 - 0.05, r_front + 0.11, sz + 0.15, '#e8d8a8', 'sign_letters')
    if lamp is not None:
        W.wall_lantern(k, lamp, r_front + 0.05, z=1.55, energy=10)
    rm, zr = (HK.pantile_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, boards, over=0.28) if HK.is_clay(roof)
              else W._gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, over=0.28))
    HK.rafter_ends(k, x0 - 0.28, x1 + 0.28, r_front, 0.28, wall_h, A.WOOD_DD)
    for xe in (x0 - 0.3, x1 + 0.3):                                                      # white bargeboards
        k.tube((xe, r_front + 0.3, wall_h - 0.02), (xe, rm, zr + 0.06), 0.035, trim, 'bargeboard', verts=4)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


def lobster_pots(k, cx, cr, n=3, z0=0.0):
    """Willow lobster pots stacked on their flat bases: half-barrels of withies with dark hoops and a funnel mouth."""
    rng = k.rng
    spots = [(0, 0, 0), (0.48, 0.05, 0), (0.24, 0.0, 0.33), (0.0, 0.42, 0), (0.48, 0.45, 0)][:n]
    for (dx, dr, dz) in spots:
        px, pr, z = cx + dx, cr + dr, z0 + dz
        tone = shade('#8a7448', rng.uniform(0.85, 1.1))
        k.box(px - 0.22, pr - 0.15, z, px + 0.22, pr + 0.15, z + 0.04, (A.WOOD, 0.14), 'pot_base')
        k.cyl_x(px - 0.22, px + 0.22, pr, z + 0.04, 0.15, 0.2, (tone, 0.3), 'lobster_pot', verts=10)
        for ddx in (-0.17, 0.0, 0.17):
            k.cyl_x(px + ddx - 0.015, px + ddx + 0.015, pr, z + 0.04, 0.155, 0.205, A.WOOD_DD, 'pot_hoop', verts=10)
        k.cyl_y(px, pr + 0.13, pr + 0.16, z + 0.12, 0.07, 0.06, '#2a2016', 'pot_mouth', verts=8)


def fish_boxes(k, cx, cr, n=3, fish=True):
    """Shallow slatted fish boxes stacked crosswise, the top one full of fish on ice."""
    rng = k.rng
    for i in range(n):
        z = i * 0.16
        ox = rng.uniform(-0.04, 0.04)
        tone = shade(rng.choice(('#a8885a', '#8a6a44', '#b89a6a')), rng.uniform(0.9, 1.05))
        k.box(cx - 0.3 + ox, cr - 0.2, z, cx + 0.3 + ox, cr + 0.2, z + 0.15, (tone, 0.16), 'fish_box')
        k.box(cx - 0.3 + ox, cr + 0.2, z + 0.06, cx + 0.3 + ox, cr + 0.205, z + 0.075, shade(tone, 0.55), 'fish_box_slat')
    if fish:
        z = n * 0.16
        k.box(cx - 0.26, cr - 0.16, z - 0.03, cx + 0.26, cr + 0.16, z - 0.005, ('#dfeef2', 0.06), 'ice')
        for j in range(5):
            k.blob(cx - 0.18 + j * 0.09, cr + rng.uniform(-0.06, 0.06), z + 0.01, 0.1, 0.035, 0.025,
                   (rng.choice(('#9ab0b8', '#b8c4c8', '#8a9aa6', '#c87a5a')), 0.08), 'fish', rot=(0, 0, rng.uniform(-30, 30)), segs=8)
    k.solid(cx - 0.3, cr - 0.2, cx + 0.3, cr + 0.2)


def net_rack(k, x0, x1, cr, h=1.3, col='#4a5a52', floats='#e8a040'):
    """Nets hung to dry over a pole on two posts: cords down and across, a row of cork floats along the foot."""
    for nx in (x0, x1):
        k.cyl(nx, cr, 0.0, h + 0.05, 0.045, (A.WOOD_D, 0.12), 'net_post', verts=8)
    k.cyl_x(x0 - 0.08, x1 + 0.08, cr, h, 0.035, 0.035, (A.WOOD, 0.12), 'net_pole', verts=8)
    cords = []
    n = max(6, int((x1 - x0) / 0.14))
    for i in range(n):
        x = x0 + 0.08 + (x1 - x0 - 0.16) * i / (n - 1)
        sag = 0.05 * math.sin(i * 1.7)
        cords.append((x - 0.008, cr - 0.01, 0.28 + sag, x + 0.008, cr + 0.01, h - 0.02))
    for j in range(int((h - 0.3) / 0.11)):
        z = 0.3 + j * 0.11
        cords.append((x0 + 0.08, cr - 0.01, z - 0.008, x1 - 0.08, cr + 0.01, z + 0.008))
    k.boxes(cords, col, 'net')
    for i in range(int((x1 - x0) / 0.3)):
        k.sphere(x0 + 0.2 + i * 0.3, cr + 0.02, 0.27, 0.045, 0.045, floats, 'float', segs=8)


def capstan(k, cx, cr):
    k.cyl(cx, cr, 0.0, 0.1, 0.26, (A.WOOD_D, 0.14), 'capstan', verts=12)
    k.cyl(cx, cr, 0.1, 0.55, 0.17, (A.WOOD, 0.14), 'capstan', verts=12)
    k.cyl(cx, cr, 0.55, 0.62, 0.22, (A.WOOD_D, 0.14), 'capstan', verts=12)
    for i in range(4):
        a = i * math.pi / 2 + 0.4
        k.tube((cx, cr, 0.58), (cx + math.cos(a) * 0.55, cr + math.sin(a) * 0.45, 0.6), 0.025, A.WOOD_L, 'capstan_bar', verts=5)
    W.annulus(k, cx, cr, 0.17, 0.22, 0.2, 0.32, (ROPE, 0.25), 'rope', segs=16)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def anchor(k, ax, ar, z=0.07, col='#2e2e34'):
    k.tube((ax - 0.55, ar, z), (ax + 0.55, ar, z), 0.04, col, 'anchor', verts=8)
    k.tube((ax - 0.5, ar - 0.3, z - 0.01), (ax - 0.5, ar + 0.3, z - 0.01), 0.035, col, 'anchor', verts=8)
    for s in (-1, 1):
        k.tube((ax + 0.55, ar, z), (ax + 0.75, ar + s * 0.32, z), 0.035, col, 'anchor', verts=8)
        k.blob(ax + 0.78, ar + s * 0.36, z, 0.09, 0.06, 0.03, col, 'anchor', segs=8)
    k.cyl_y(ax - 0.68, ar - 0.06, ar + 0.06, z + 0.03, 0.1, 0.1, col, 'anchor', verts=10)


def gull(k, x, r, z, facing=1):
    k.blob(x, r, z + 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(x + facing * 0.08, r, z + 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
    k.cone(x + facing * 0.14, r, z + 0.17, z + 0.19, 0.02, 0.0, '#e0a030', 'gull', verts=4)
    k.blob(x - facing * 0.04, r, z + 0.13, 0.08, 0.05, 0.02, '#8a9098', 'gull', segs=8)
    for s in (-0.03, 0.03):
        k.cyl(x + s, r, z, z + 0.05, 0.008, '#d08a40', 'gull', verts=4)


def crab(k, x, r, z=0.0, col='#c04a2a'):
    k.blob(x, r, z + 0.04, 0.07, 0.05, 0.03, col, 'crab', segs=8)
    for s in (-1, 1):
        k.blob(x + s * 0.09, r + 0.04, z + 0.04, 0.03, 0.025, 0.02, shade(col, 1.1), 'crab', segs=6)
        for j in range(3):
            k.tube((x + s * 0.05, r - 0.02 + j * 0.03, z + 0.04), (x + s * 0.12, r - 0.04 + j * 0.03, z), 0.008, shade(col, 0.8), 'crab', verts=4)


def thrift(k, x, r, z, s=1.0):
    """Sea pinks: a cushion of grey-green with pink heads on it, growing on a ledge."""
    with k.foliage('leaf'):
        k.blob(x, r, z + 0.03 * s, 0.11 * s, 0.09 * s, 0.05 * s, (shade('#5a7a54', k.rng.uniform(0.9, 1.1)), 0.3), 'tuft_cushion', segs=8)
    for _ in range(int(4 * s) + 2):
        k.sphere(x + k.rng.uniform(-0.08, 0.08) * s, r + k.rng.uniform(-0.05, 0.07) * s, z + k.rng.uniform(0.08, 0.13) * s, 0.025, 0.025,
                 k.rng.choice(('#f090c0', '#e870a8', '#f8b0d0')), 'flower', segs=5)


def gorse(k, cx, cr, z=0.0, s=0.3):
    """A gorse bush: a dark spiny crown, scattered with yellow flowers on its lit side."""
    with k.foliage('needle'):
        W.leafy_crown(k, cx, cr, z + s * 0.62, s * 1.1, s * 0.85, s * 0.66, shade('#3a5a2e', k.rng.uniform(0.92, 1.06)), part='gorse')
    for _ in range(int(9 * s / 0.3)):
        a, u = k.rng.uniform(0, math.tau), k.rng.uniform(0.0, 1.0)
        k.sphere(cx + math.cos(a) * s * 0.95, cr + abs(math.sin(a)) * s * 0.7, z + s * (0.45 + 0.55 * u), 0.03, 0.028,
                 k.rng.choice(('#f0c830', '#f8d848', '#e8b020')), 'gorse_flower', segs=5)


def heather(k, cx, cr, z=0.0, n=6):
    for _ in range(n):
        x, r = cx + k.rng.uniform(-0.22, 0.22), cr + k.rng.uniform(-0.16, 0.16)
        with k.foliage('needle'):
            k.blob(x, r, z + 0.05, 0.08, 0.06, 0.06, (shade('#4a5a3a', k.rng.uniform(0.85, 1.1)), 0.3), 'heather', segs=7)
        k.blob(x, r + 0.02, z + 0.1, 0.06, 0.05, 0.03, k.rng.choice(('#a060a8', '#b878c0', '#8a5098')), 'heather_bloom', segs=6)


def pier(k, x0, x1, r0, r1, z=0.05, bed=-1.4, bollards=True):
    """A plank pier on piles: planks laid across with a hair between, two stringers under them, a rubbing strake down
    each side, a pile every metre or so with cross-braces below the deck, bollards at the end corners, a ladder down
    the far end, mooring rings. Built for the camera: what's under the deck shows only toward the water."""
    rng = k.rng
    r = r0
    while r < r1 - 1e-6:
        w = min(r1, r + 0.25) - r
        tone = shade(A.WOOD, rng.uniform(0.82, 1.12))
        if rng.random() < 0.08:
            tone = shade('#7a6a54', rng.uniform(0.9, 1.05))                          # a grey, weathered plank
        k.box(x0 + rng.uniform(-0.02, 0.02), r + 0.012, z - 0.06, x1 + rng.uniform(-0.02, 0.02), r + w - 0.012, z, (tone, 0.18), 'deck_plank')
        for xx in (x0 + 0.18, x1 - 0.18):                                              # nail heads
            k.box(xx - 0.015, r + w / 2 - 0.015, z, xx + 0.015, r + w / 2 + 0.015, z + 0.004, '#2a2a2e', 'deck_nail')
        r += w
    for xx in (x0 + 0.25, x1 - 0.25):
        k.box(xx - 0.06, r0, z - 0.2, xx + 0.06, r1, z - 0.06, A.WOOD_DD, 'pier_stringer')
    for xa, xb in ((x0 - 0.06, x0 + 0.02), (x1 - 0.02, x1 + 0.06)):
        k.box(xa, r0, z - 0.2, xb, r1, z + 0.04, (A.WOOD_D, 0.14), 'pier_strake')
    piles = []
    rr = r0 + 0.35
    while rr < r1:
        piles.append(rr)
        rr += 1.05
    piles.append(r1 - 0.1)
    for rr in piles:
        for xx in (x0 - 0.04, x1 + 0.04):
            k.cyl(xx, rr, bed, z + 0.32, 0.085, (shade(A.WOOD_D, rng.uniform(0.85, 1.05)), 0.16), 'pile', verts=9)
            k.cyl(xx, rr, z + 0.32, z + 0.35, 0.09, A.WOOD_DD, 'pile_cap', verts=9)
            k.cyl(xx, rr, -0.62, -0.3, 0.095, ('#2e3a2a', 0.3), 'pile_weed', verts=9)         # weed and barnacles at the tide
        k.tube((x0 - 0.04, rr, z - 0.22), (x1 + 0.04, rr, -0.75), 0.03, A.WOOD_DD, 'pier_brace', verts=5)
        k.tube((x1 + 0.04, rr, z - 0.22), (x0 - 0.04, rr, -0.75), 0.03, A.WOOD_DD, 'pier_brace', verts=5)
    for xx in ((x0 + 0.12, x1 - 0.12) if bollards else ()):                         # bollards at the end corners
        k.cyl(xx, r1 - 0.2, z, z + 0.08, 0.14, A.IRON, 'bollard', verts=12)
        k.cyl(xx, r1 - 0.2, z + 0.08, z + 0.34, 0.09, ('#2e3238', 0.1), 'bollard', verts=12)
        k.sphere(xx, r1 - 0.2, z + 0.36, 0.12, 0.06, '#2e3238', 'bollard', segs=12)
    for dx in (-0.16, 0.16):                                                            # the ladder down the end
        k.tube((x1 - 0.55 + dx, r1 + 0.04, z + 0.3), (x1 - 0.55 + dx, r1 + 0.04, -1.0), 0.02, A.IRON, 'ladder', verts=6)
    zz = z - 0.1
    while zz > -1.0:
        k.cyl_x(x1 - 0.71, x1 - 0.39, r1 + 0.04, zz, 0.015, 0.015, A.IRON, 'ladder', verts=6)
        zz -= 0.17
    for rr in piles[1:-1]:
        k.cyl_x(x0 - 0.12, x0 - 0.06, rr + 0.5, z - 0.08, 0.06, 0.06, A.IRON, 'mooring_ring', verts=10)


def lighthouse(k, cx, cr, h=3.7, rad=0.56, wall='#ece4d4', band='#b0342a', lamp='#ffd060', energy=120):
    """Diggen's light: a tapering tower of dressed stone in courses, painted in red and white bands; a plinth with
    steps up to an arched door under a hood, two small windows up the stair, a corbelled gallery with an iron rail,
    the lantern — glazing in a frame of astragals round the lamp — a copper dome gone green, a ventilator ball and a vane."""
    rng = k.rng
    k.cyl(cx, cr, 0.0, 0.2, rad + 0.16, (shade(STONES[1], 0.9), 0.14), 'lh_plinth', verts=18)
    nb = 7
    for i in range(nb):
        z0, z1 = h * i / nb, h * (i + 1) / nb
        r0_, r1_ = rad * (1 - 0.2 * i / nb), rad * (1 - 0.2 * (i + 1) / nb)
        col = band if i % 2 else wall
        k.cone(cx, cr, z0 + 0.2 * (i == 0), z1, r0_, r1_, (col, 0.12), 'lh_tower', verts=20)
        zz = z0 + 0.24
        while zz < z1 - 0.05:                                                           # the courses' joints
            rr = rad * (1 - 0.2 * zz / h) + 0.004
            W.annulus(k, cx, cr, rr - 0.01, rr, zz, zz + 0.012, shade(col, 0.72), 'lh_course', segs=20)
            zz += 0.24
    # the door, its hood and the steps
    rf = cr + rad * 0.98
    k.box(cx - 0.36, rf - 0.1, 0.0, cx + 0.36, rf + 0.38, 0.1, (shade(STONES[0], 0.95), 0.14), 'steps', bevel=0.01)
    k.box(cx - 0.3, rf - 0.1, 0.1, cx + 0.3, rf + 0.18, 0.2, (shade(STONES[0], 1.05), 0.14), 'steps', bevel=0.01)
    W.door(k, cx, rf, w=0.46, h=0.95, col='#2a4a6a', arch=True)
    k.box(cx - 0.34, rf, 1.15, cx + 0.34, rf + 0.22, 1.2, (shade(STONES[2], 0.9), 0.1), 'door_hood')
    for s in (-1, 1):
        k.tube((cx + s * 0.28, rf + 0.01, 0.95), (cx + s * 0.28, rf + 0.2, 1.15), 0.02, A.IRON, 'door_hood_bracket', verts=4)
    W.wall_lantern(k, cx + 0.42, rf - 0.06, z=1.0, energy=8)
    for (z, a) in ((1.65, 0.0), (2.6, 0.5)):
        ra = rad * (1 - 0.2 * z / h)
        wx, wr = cx + math.sin(a) * ra, cr + math.cos(a) * ra
        k.box(wx - 0.1, wr - 0.04, z, wx + 0.1, wr + 0.04, z + 0.3, '#3a2a14', 'lh_window', emit=(W.GLOW, 0.8))
        k.box(wx - 0.13, wr - 0.02, z + 0.3, wx + 0.13, wr + 0.06, z + 0.36, (STONES[2], 0.1), 'lh_lintel')
        k.box(wx - 0.13, wr - 0.02, z - 0.06, wx + 0.13, wr + 0.07, z, (STONES[2], 0.1), 'lh_sill')
    # the gallery: corbels, a deck, posts and a rail
    top = rad * 0.8
    for i in range(14):
        a = i * math.tau / 14
        k.box(cx + math.cos(a) * top - 0.04, cr + math.sin(a) * top - 0.04, h - 0.22, cx + math.cos(a) * (top + 0.12) + 0.04,
              cr + math.sin(a) * (top + 0.12) + 0.04, h, (shade(STONES[1], 0.9), 0.12), 'lh_corbel')
    k.cyl(cx, cr, h, h + 0.1, top + 0.26, ('#2e3036', 0.12), 'lh_gallery', verts=20)
    for i in range(16):
        a = i * math.tau / 16
        k.cyl(cx + math.cos(a) * (top + 0.22), cr + math.sin(a) * (top + 0.22), h + 0.1, h + 0.45, 0.014, '#2a2a30', 'lh_rail', verts=4)
    W.annulus(k, cx, cr, top + 0.2, top + 0.24, h + 0.42, h + 0.47, '#2a2a30', 'lh_rail', segs=20)
    W.annulus(k, cx, cr, top + 0.2, top + 0.24, h + 0.24, h + 0.27, '#2a2a30', 'lh_rail', segs=20)
    # the lantern
    lr = top * 0.78
    k.cyl(cx, cr, h + 0.1, h + 0.24, lr + 0.03, ('#2e3036', 0.12), 'lh_lantern_base', verts=12)
    k.cyl(cx, cr, h + 0.24, h + 0.86, lr, '#3a2a10', 'lh_glass', emit=(lamp, 1.0), verts=12)
    for i in range(8):
        a = i * math.tau / 8
        k.box(cx + math.cos(a) * lr - 0.02, cr + math.sin(a) * lr - 0.02, h + 0.24, cx + math.cos(a) * lr + 0.02,
              cr + math.sin(a) * lr + 0.02, h + 0.86, '#2a2a30', 'lh_astragal')
    W.annulus(k, cx, cr, lr - 0.01, lr + 0.02, h + 0.54, h + 0.57, '#2a2a30', 'lh_astragal', segs=12)
    k.cone(cx, cr, h + 0.86, h + 1.22, lr + 0.1, 0.06, ('#4a8a76', 0.12), 'lh_dome', verts=14)
    k.sphere(cx, cr, h + 1.28, 0.08, 0.08, ('#4a8a76', 0.12), 'lh_vent', segs=10)
    W.weathervane(k, cx, cr, h + 1.34)
    k.point_light(cx, cr + 0.3, h + 0.55, '#ffd070', energy, radius=0.3, group='flicker')
    k.solid(math.floor(cx), math.floor(cr), math.floor(cx) + 1, math.floor(cr) + 1)     # its own cell: the path runs round it


def cutter_on_stocks(k, x0, x1, rc, beam=1.15, z=0.32, planked=0.62, hull='#4a5a62', strake='#e8dcc0'):
    """A cutter half-built on the slip, lying along the columns with her bow toward x1: a keel on blocks, shores
    propping her upright, planked from the stern to `planked` of her length and her ribs bare beyond, a staging plank
    along her side with a ladder, offcuts, a saw horse and a pot of tar."""
    rng = k.rng
    L = x1 - x0
    shape = lambda t: max(0.04, math.sin(math.pi * (0.04 + 0.9 * t)) ** 0.55 * (1 - 0.3 * max(0.0, t - 0.75) / 0.25))
    gun = lambda t: z + 0.72 + 0.22 * (t - 0.55) ** 2 * 2.4
    keel = lambda t: z
    # the keel blocks and the keel
    xx = x0 + 0.2
    while xx < x1 - 0.1:
        k.box(xx - 0.12, rc - 0.16, 0.0, xx + 0.12, rc + 0.16, z - 0.02, (shade(A.WOOD_D, rng.uniform(0.85, 1.1)), 0.16), 'keel_block')
        xx += 0.6
    k.box(x0, rc - 0.05, z - 0.04, x1 + 0.1, rc + 0.05, z + 0.08, A.WOOD_DD, 'keel')
    k.tube((x1 + 0.08, rc, z), (x1 + 0.22, rc, gun(1.0) + 0.12), 0.05, A.WOOD_DD, 'stem', verts=6)
    k.box(x0 - 0.06, rc - 0.08, z, x0 + 0.04, rc + 0.08, gun(0.0) + 0.05, A.WOOD_DD, 'transom_post')
    # planked part
    tp = planked
    sx1 = x0 + L * tp
    W._hull(k, x0, sx1, rc, beam, lambda t: gun(t * tp), lambda t: keel(t * tp), lambda t: shape(t * tp), (hull, 0.16), 'boat_hull', n=14)
    k.poly([(x0 + t * L, rc + sd * beam / 2 * shape(t) * 0.86, z + 0.1) for sd, ts in ((-1, range(0, 11)), (1, range(10, -1, -1)))
            for t in (i / 10 * tp for i in ts)], (A.WOOD_D, 0.16), 'boat_inside')                  # her floor, seen inside
    for t in [i / 7 * tp for i in range(1, 7)]:                                         # frames inside the planking
        x = x0 + L * t
        hw = beam / 2 * shape(t)
        k.tube((x, rc - hw * 0.9, gun(t) - 0.05), (x, rc + hw * 0.9, gun(t) - 0.05), 0.022, A.WOOD_L, 'thwart', verts=4)
    for sd in (-1, 1):                                                                  # the painted sheer strake
        pts = [(x0 + L * t, rc + sd * beam / 2 * shape(t) * 1.01, gun(t) - 0.04) for t in [i / 12 * tp for i in range(13)]]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.035, (strake, 0.1), 'boat_strake', verts=5)
    for j in range(1, 5):                                                               # plank seams
        f = j / 5
        pts = [(x0 + L * t, rc + beam / 2 * shape(t) * 1.005, gun(t) - (gun(t) - z) * f) for t in [i / 10 * tp for i in range(11)]]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.006, shade(hull, 0.6), 'boat_hull_seam', verts=4)
    # bare ribs toward the bow, and the ribbands that hold them
    for i in range(6):
        t = tp + (1 - tp) * (i + 0.5) / 6
        x = x0 + L * t
        hw = beam / 2 * shape(t)
        k.tube((x, rc - hw * 0.15, z + 0.04), (x, rc + hw, gun(t) - 0.2), 0.03, A.WOOD_L, 'rib', verts=5)
        k.tube((x, rc + hw, gun(t) - 0.2), (x, rc + hw * 0.95, gun(t)), 0.03, A.WOOD_L, 'rib', verts=5)
        k.tube((x, rc + hw * 0.15, z + 0.04), (x, rc - hw, gun(t) - 0.2), 0.03, shade(A.WOOD_L, 0.85), 'rib', verts=5)
    for f in (0.35, 0.8):
        pts = [(x0 + L * t, rc + beam / 2 * shape(t) * (0.9 + 0.1 * f), gun(t) - (gun(t) - z) * (1 - f) * 0.9) for t in
               [tp - 0.05 + (1.0 - tp + 0.05) * i / 6 for i in range(7)]]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.018, A.WOOD_L, 'ribband', verts=4)
    # shores propping her
    for t in (0.2, 0.45, 0.75):
        x = x0 + L * t
        hw = beam / 2 * shape(t)
        k.tube((x, rc + hw * 0.92, gun(t) - 0.35), (x + 0.05, rc + hw + 0.55, 0.0), 0.035, ('#8a6a44', 0.16), 'shore_prop', verts=5)
        k.tube((x, rc - hw * 0.92, gun(t) - 0.35), (x + 0.05, rc - hw - 0.55, 0.0), 0.035, ('#8a6a44', 0.16), 'shore_prop', verts=5)
    # staging plank on trestles along her near side, a ladder up
    sr = rc + beam / 2 + 0.38
    for x in (x0 + 0.3, x0 + L * 0.55):
        for s in (-0.12, 0.12):
            k.tube((x + s, sr - 0.1, 0.0), (x, sr, 0.62), 0.02, A.WOOD_D, 'trestle', verts=4)
            k.tube((x + s, sr + 0.1, 0.0), (x, sr, 0.62), 0.02, A.WOOD_D, 'trestle', verts=4)
    k.box(x0 + 0.15, sr - 0.1, 0.62, x0 + L * 0.6, sr + 0.1, 0.66, ('#b08a5a', 0.16), 'staging_plank')
    for s in (-0.13, 0.13):
        k.tube((x0 + L * 0.68 + s, sr + 0.3, 0.0), (x0 + L * 0.66 + s, sr - 0.05, 1.0), 0.02, A.WOOD_L, 'ladder_wood', verts=4)
    for i in range(4):
        zz = 0.2 + i * 0.22
        k.tube((x0 + L * 0.68 - 0.13 - 0.005 * i, sr + 0.3 - 0.087 * i * 1.0 - 0.03, zz), (x0 + L * 0.68 + 0.13 - 0.005 * i, sr + 0.3 - 0.087 * i - 0.03, zz),
               0.015, A.WOOD_L, 'ladder_wood', verts=4)
    k.cyl(x0 + L * 0.3, sr + 0.55, 0.0, 0.2, 0.09, '#1a1614', 'tar_pot', verts=10)
    for i in range(4):                                                                  # offcuts and shavings
        x = x0 + rng.uniform(0.2, L - 0.2)
        k.box(x, sr + 0.3 + rng.uniform(0, 0.25), 0.0, x + rng.uniform(0.15, 0.4), sr + 0.36 + rng.uniform(0, 0.25), 0.04,
              (shade(A.WOOD_L, rng.uniform(0.9, 1.15)), 0.18), 'offcut')
    k.solid(x0, rc - beam / 2 - 0.4, x1, rc + beam / 2 + 0.5)
