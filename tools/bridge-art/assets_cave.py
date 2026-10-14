"""Cave builders for scenekit (bpy): rock faces, lava, the dragon and its
hoard. Tile units: x = column, r = row (toward the camera), z = height.
"""
import math

from scenekit import shade
from assets_lumar import BRASS, IRON, WOOD, WOOD_D, WOOD_DD

ROCK = '#5a4440'
ROCK_D = '#3a2c2c'
ROCK_L = '#7a5e54'
LAVA = '#ff6a1c'
LAVA_HOT = '#ffc850'
GOLD = '#e0b040'
GOLD_D = '#a07020'
SCALE = '#9a2a1e'
SCALE_D = '#5e1612'
BELLY = '#c8865a'
BONE = '#d8ccb0'


def rock_wall(k, x0, x1, r_face, height, gaps=(), size=(0.45, 0.7), backing='#140c0c'):
    """Jagged rock face whose front sits around row r_face: stacked faceted
    boulders over a dark backing. gaps: [(xa, xb, z_top)] — openings."""
    k.box(x0, r_face - 1.2, 0, x1, r_face - 0.4, height, backing, 'rock_back')
    x = x0
    while x < x1:
        rad = k.rng.uniform(*size)
        z = rad * 0.7
        while z < height:
            if not any(a <= x <= b and z < zt for a, b, zt in gaps):
                k.rock(x, r_face - rad * 0.55 + k.rng.uniform(-0.12, 0.12), z, rad, rad * 0.75, rad * 0.8,
                       (shade(ROCK, k.rng.uniform(0.7, 1.1)), 0.2))
            z += rad * k.rng.uniform(1.0, 1.3)
            rad *= k.rng.uniform(0.82, 1.0)
        x += k.rng.uniform(0.45, 0.65)


def rock_edge(k, x, r0, r1, h=(0.5, 1.2), size=(0.3, 0.55)):
    """A run of boulders along a side of the cave (column x, rows r0..r1)."""
    r = r0
    while r < r1:
        rad = k.rng.uniform(*size)
        k.rock(x + k.rng.uniform(-0.15, 0.15), r, rad * 0.6, rad, rad * 0.8, k.rng.uniform(*h) * 0.6,
               (shade(ROCK, k.rng.uniform(0.7, 1.05)), 0.2))
        r += k.rng.uniform(0.4, 0.6)


def rock_row(k, x0, x1, r, h=(0.25, 0.5), size=(0.3, 0.5)):
    """Low boulders along the front edge (kept low so the floor shows)."""
    x = x0
    while x < x1:
        rad = k.rng.uniform(*size)
        k.rock(x, r + k.rng.uniform(-0.1, 0.1), 0.05, rad, rad * 0.7, k.rng.uniform(*h),
               (shade(ROCK, k.rng.uniform(0.65, 0.95)), 0.2))
        x += k.rng.uniform(0.4, 0.6)


def _seg_dist(px, pr, a, b):
    dx, dr = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dr * dr or 1e-9
    t = max(0.0, min(1.0, ((px - a[0]) * dx + (pr - a[1]) * dr) / L2))
    return math.hypot(px - (a[0] + t * dx), pr - (a[1] + t * dr))


def cave_floor(k, x0, r0, x1, r1, holes=(), avoid=(), tone='#4a3632', density=1.7):
    """Rough cave floor: gritty ground strewn with flat, faceted stones.
    holes: [(cx, cr, rx, ry)] ellipses kept clear (lava); avoid: polylines
    (fissures) the stones stay off."""
    k.box(x0, r0, -0.3, x1, r1, -0.02, ('#2e201c', 0.3), 'ground')
    n = int((x1 - x0) * (r1 - r0) * density)
    for _ in range(n):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        s = k.rng.uniform(0.16, 0.42)
        if any(((x - hx) / (hrx + s)) ** 2 + ((r - hr) / (hry + s)) ** 2 < 1.0 for hx, hr, hrx, hry in holes):
            continue
        if any(_seg_dist(x, r, a, b) < s * 0.85 + 0.06 for pts in avoid for a, b in zip(pts, pts[1:])):
            continue
        k.rock(x, r, -0.03, s, s * k.rng.uniform(0.6, 0.9), k.rng.uniform(0.035, 0.06),
               (shade(tone, k.rng.uniform(0.72, 1.15)), 0.22), part='floor', segs=8, jitter=0.25)


def lava_crack(k, pts, w=0.085):
    """Glowing fissure through the floor along a polyline: a scorched band
    with the molten seam inside it."""
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        ww = w * (1.0 - 0.6 * i / max(1, len(pts) - 1))
        k.bar(a[0], a[1], b[0], b[1], -0.03, 0.004, ww + 0.16, ('#1e100c', 0.2), 'scorch')
        k.bar(a[0], a[1], b[0], b[1], -0.03, 0.01, ww, '#6a2008', 'lava_crack', emit=(LAVA, 1.0))


def wander(k, x, r, n, step=0.3, turn=0.9, ang=None, bounds=None):
    """Jagged random walk from (x, r); stops at bounds (x0, r0, x1, r1)."""
    ang = k.rng.uniform(0, 2 * math.pi) if ang is None else ang
    pts = [(x, r)]
    heading = ang
    for _ in range(n):
        a = heading + k.rng.uniform(-turn, turn)
        x, r = x + math.cos(a) * step, r + math.sin(a) * step
        if bounds and not (bounds[0] <= x <= bounds[2] and bounds[1] <= r <= bounds[3]):
            break
        pts.append((x, r))
        heading += k.rng.uniform(-0.25, 0.25)
    return pts


def lava_pool(k, cx, cr, rx, ry, energy=110.0):
    """Molten pool sunk into the floor: hot surface, drifting crust, a rim
    of scorched rocks, and the light it throws."""
    k.cyl(cx, cr, -0.03, -0.01, rx, '#8a2008', 'lava', ry=ry, emit=('#f05010', 1.0), verts=24)
    k.cyl(cx + rx * 0.1, cr - ry * 0.05, -0.01, -0.004, rx * 0.5, '#a03010', 'lava_hot', ry=ry * 0.42,
          emit=('#ff8a28', 0.95), verts=18)
    for _ in range(7):   # crust plates
        a = k.rng.uniform(0, 2 * math.pi)
        d = k.rng.uniform(0.2, 0.75)
        k.blob(cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d, -0.01, k.rng.uniform(0.07, 0.15),
               k.rng.uniform(0.05, 0.1), 0.02, '#3a1a10', 'lava_crust', rot=(0, 0, k.rng.uniform(0, 180)), segs=6, smooth=False)
    n = int(2 * math.pi * max(rx, ry) / 0.32)
    for i in range(n):
        a = i * 2 * math.pi / n + k.rng.uniform(-0.1, 0.1)
        rad = k.rng.uniform(0.16, 0.26)
        k.rock(cx + math.cos(a) * (rx + 0.06), cr + math.sin(a) * (ry + 0.06), 0.0, rad, rad * 0.8, rad * 0.6,
               (shade(ROCK_D, k.rng.uniform(0.8, 1.1)), 0.2))
    k.point_light(cx, cr + 0.2, 0.6, '#ff6a20', energy, radius=0.6, group='flicker')
    k.solid(cx - rx * 0.8, cr - ry * 0.6, cx + rx * 0.8, cr + ry * 0.6)


def stalagmite(k, cx, cr, h=1.3, rad=0.28):
    k.cone(cx, cr, 0, h, rad, 0.02, (shade(ROCK_L, 0.95), 0.18), 'stalagmite', verts=9)
    for dx, dr, hh, rr in ((0.22, 0.12, 0.55, 0.13), (-0.2, 0.15, 0.4, 0.11), (0.05, -0.18, 0.7, 0.12)):
        k.cone(cx + dx, cr + dr, 0, h * hh, rad * rr / 0.28, 0.01, (shade(ROCK_L, 0.85), 0.18), 'stalagmite', verts=7)
    k.rock(cx, cr, 0.05, rad * 1.2, rad, 0.12, (ROCK_D, 0.2))
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def stalactites(k, x0, x1, r, z_top, n=10):
    for _ in range(n):
        x = k.rng.uniform(x0, x1)
        L = k.rng.uniform(0.3, 0.9)
        k.cone(x, r + k.rng.uniform(-0.2, 0.25), z_top - L, z_top, 0.01, k.rng.uniform(0.07, 0.14),
               (shade(ROCK_L, k.rng.uniform(0.75, 0.95)), 0.15), 'stalactite', verts=7)


def mine_entrance(k, x0, x1, r_face, z_top=1.6):
    """Timber-framed tunnel mouth in the back rock face."""
    k.box(x0, r_face - 1.3, 0, x1, r_face - 0.2, z_top, '#030202', 'tunnel')
    k.box(x0 + 0.05, r_face - 0.3, 0, x1 - 0.05, r_face + 0.02, 0.0, '#1a1210', 'tunnel_floor')
    for x in (x0, x1 - 0.14):
        k.box(x, r_face - 0.2, 0, x + 0.14, r_face + 0.02, z_top, (WOOD_D, 0.18), 'timber', bevel=0.02)
    k.box(x0 - 0.12, r_face - 0.22, z_top, x1 + 0.12, r_face + 0.04, z_top + 0.16, (WOOD_D, 0.18), 'timber', bevel=0.02)
    # lantern hanging from the lintel, long dead
    k.cyl(x1 - 0.3, r_face + 0.05, z_top - 0.4, z_top - 0.1, 0.08, IRON, 'lantern', verts=8)
    k.cyl(x1 - 0.3, r_face + 0.05, z_top - 0.1, z_top, 0.01, IRON, 'lantern_chain', verts=4)


def timber_support(k, cx, cr, to_x, z=1.55):
    """Old mining prop: post, beam into the wall, a brace."""
    k.box(cx - 0.08, cr - 0.08, 0, cx + 0.08, cr + 0.08, z + 0.15, (WOOD_D, 0.2), 'timber', bevel=0.015)
    k.bar(to_x, cr, cx + 0.12, cr, z, z + 0.16, 0.16, (WOOD_D, 0.2), 'timber', bevel=0.015)
    k.tube((cx - 0.05, cr, 0.9), (cx - 0.55, cr, z), 0.04, WOOD_DD, 'brace', verts=6)
    k.box(cx - 0.11, cr - 0.11, z - 0.06, cx + 0.11, cr + 0.11, z, IRON, 'timber_band')
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


def rails(k, x, r0, r1, gauge=0.4):
    r = r0
    while r < r1:
        k.box(x - gauge / 2 - 0.08, r, 0.0, x + gauge / 2 + 0.08, r + 0.1, 0.04, (WOOD_DD, 0.15), 'sleeper')
        r += 0.42
    for dx in (-gauge / 2, gauge / 2):
        k.box(x + dx - 0.025, r0, 0.04, x + dx + 0.025, r1, 0.08, '#4a4048', 'rail')


def mine_cart(k, cx, cr):
    k.box(cx - 0.32, cr - 0.24, 0.16, cx + 0.32, cr + 0.24, 0.55, ('#5a4a40', 0.12), 'cart', bevel=0.02)
    k.box(cx - 0.27, cr - 0.19, 0.5, cx + 0.27, cr + 0.19, 0.552, '#1a1414', 'cart_in')
    for i in range(5):
        k.rock(cx + k.rng.uniform(-0.2, 0.2), cr + k.rng.uniform(-0.12, 0.12), 0.56, 0.1, 0.08, 0.07, ('#3a3036', 0.2), seed=i + 90)
    k.sphere(cx + 0.08, cr, 0.6, 0.05, 0.04, GOLD, 'ore_gold', emit=(GOLD_D, 0.4), segs=6)
    for dx in (-0.33, 0.33):
        for dr in (-0.15, 0.15):
            k.cyl_x(cx + dx - 0.03, cx + dx + 0.03, cr + dr, 0.13, 0.12, 0.12, IRON, 'wheel', verts=10)
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)


def skeleton(k, cx, cr):
    """An old pilot's bones, a tarnished medal still in one hand."""
    k.sphere(cx - 0.32, cr - 0.05, 0.1, 0.1, 0.09, BONE, 'skull', segs=10)
    for sx in (-0.04, 0.03):
        k.box(cx - 0.33 + sx, cr + 0.03, 0.1, cx - 0.31 + sx, cr + 0.05, 0.13, '#1a1410', 'skull_eye')
    k.tube((cx - 0.22, cr, 0.05), (cx + 0.3, cr + 0.02, 0.05), 0.025, BONE, 'bone', verts=6)       # spine
    for i in range(4):
        x = cx - 0.12 + i * 0.07
        k.tube((x, cr - 0.15, 0.03), (x, cr + 0.15, 0.03), 0.015, BONE, 'rib', verts=5)
    k.tube((cx - 0.1, cr - 0.05, 0.03), (cx - 0.05, cr - 0.4, 0.03), 0.02, BONE, 'bone', verts=6)    # arm
    k.tube((cx - 0.1, cr + 0.05, 0.03), (cx + 0.05, cr + 0.38, 0.03), 0.02, BONE, 'bone', verts=6)
    k.cyl(cx + 0.08, cr + 0.42, 0.02, 0.035, 0.05, '#8a7a3a', 'medal', verts=10)                   # the medal
    for dr in (-0.08, 0.08):                                                                    # legs
        k.tube((cx + 0.3, cr + dr, 0.03), (cx + 0.72, cr + dr * 1.8, 0.03), 0.025, BONE, 'bone', verts=6)
    k.cyl(cx + 0.55, cr - 0.3, 0.0, 0.08, 0.1, '#4a3a2a', 'helmet', verts=10)
    k.solid(cx - 0.4, cr - 0.3, cx + 0.4, cr + 0.3)


def glow_mushrooms(k, cx, cr, col='#b070ff'):
    for (dx, dr, h, cap) in ((0.0, 0.0, 0.32, 0.13), (0.18, 0.1, 0.22, 0.09), (-0.16, 0.12, 0.18, 0.08),
                             (0.1, -0.15, 0.26, 0.1), (-0.12, -0.1, 0.14, 0.06), (0.25, -0.05, 0.12, 0.05)):
        k.cyl(cx + dx, cr + dr, 0, h, 0.025, '#d8c8e8', 'stem', verts=6)
        k.blob(cx + dx, cr + dr, h, cap, cap, cap * 0.45, '#4a2a6a', 'mushroom_cap', emit=(col, 0.9), segs=10)
    k.point_light(cx, cr + 0.2, 0.5, col, 10, radius=0.2, group='flicker')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def ore_vein(k, x0, x1, r_face, z0, z1):
    """Gold glittering in the rock face."""
    for _ in range(14):
        x = k.rng.uniform(x0, x1)
        z = k.rng.uniform(z0, z1)
        k.blob(x, r_face + 0.02, z, k.rng.uniform(0.03, 0.07), 0.02, k.rng.uniform(0.02, 0.05), GOLD, 'ore_gold',
               emit=(GOLD_D, 0.5), rot=(0, k.rng.uniform(0, 180), 0), segs=6)
    k.point_light((x0 + x1) / 2, r_face + 0.4, (z0 + z1) / 2, '#ffd080', 3, radius=0.1)


def hoard(k, cx, cr, rx=0.95, ry=0.75):
    """Heaped gold: a coin mound, scattered coins, gems, a chalice, a crown,
    a sword driven into the pile and an open chest."""
    mounds = [(0.0, 0.0, 0.8, 0.8, 0.45), (-0.4, -0.25, 0.45, 0.45, 0.33), (0.42, 0.22, 0.42, 0.4, 0.27),
              (-0.15, 0.38, 0.45, 0.32, 0.2), (0.35, -0.3, 0.35, 0.3, 0.22)]

    def height(x, r):
        h = 0.0
        for dx, dr, sx, sy, hh in mounds:
            d = ((x - cx - dx * rx) / (rx * sx)) ** 2 + ((r - cr - dr * ry) / (ry * sy)) ** 2
            if d < 1:
                h = max(h, hh * (1 - d) ** 0.5)
        return h
    for dx, dr, sx, sy, hh in mounds:
        k.blob(cx + dx * rx, cr + dr * ry, 0.0, rx * sx, ry * sy, hh, ('#a87420', 0.3), 'gold_mound', segs=18)
    golds = ['#e8b840', '#d8a030', '#f0cc60', '#c08a24', '#f8dc80']
    for _ in range(150):
        a = k.rng.uniform(0, 2 * math.pi)
        d = k.rng.uniform(0.0, 1.3) ** 0.8
        x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
        z = height(x, r)
        k.cyl(x, r, z - 0.005, z + 0.02, k.rng.uniform(0.04, 0.055), k.rng.choice(golds), 'coin', verts=8)
    for col in ('#e02040', '#20c060', '#3070f0', '#e02040', '#b040e0'):
        a = k.rng.uniform(0, 2 * math.pi)
        d = k.rng.uniform(0.2, 0.7)
        x, r = cx + math.cos(a) * rx * d, cr + math.sin(a) * ry * d
        k.blob(x, r, height(x, r) + 0.03, 0.05, 0.05, 0.05, col, 'gem', emit=(col, 0.7), segs=6, smooth=False)
    # chalice
    zc = height(cx + 0.45, cr + 0.35) - 0.02
    k.cyl(cx + 0.45, cr + 0.35, zc, zc + 0.02, 0.07, GOLD, 'chalice', verts=10)
    k.cyl(cx + 0.45, cr + 0.35, zc + 0.02, zc + 0.14, 0.018, GOLD, 'chalice', verts=6)
    k.cone(cx + 0.45, cr + 0.35, zc + 0.14, zc + 0.28, 0.03, 0.09, GOLD, 'chalice', verts=12)
    # crown
    zr = height(cx - 0.05, cr + 0.1) - 0.03
    k.cyl(cx - 0.05, cr + 0.1, zr, zr + 0.07, 0.11, GOLD, 'crown', verts=12)
    for i in range(6):
        a = i * math.pi / 3
        k.cone(cx - 0.05 + math.cos(a) * 0.1, cr + 0.1 + math.sin(a) * 0.08, zr + 0.07, zr + 0.16, 0.025, 0.002, GOLD, 'crown', verts=4)
    k.sphere(cx - 0.05, cr + 0.19, zr + 0.04, 0.025, 0.025, '#e02040', 'gem', emit=('#e02040', 0.8), segs=6)
    # sword driven into the pile
    k.tube((cx + 0.25, cr - 0.15, 0.3), (cx + 0.38, cr - 0.25, 1.05), 0.025, '#c8ccd4', 'blade', verts=4)
    k.box(cx + 0.27, cr - 0.24, 1.02, cx + 0.5, cr - 0.17, 1.06, BRASS, 'guard')
    k.tube((cx + 0.385, cr - 0.255, 1.06), (cx + 0.41, cr - 0.27, 1.25), 0.025, '#5a2a1a', 'grip', verts=6)
    # open chest
    ch = (cx - 0.75, cr - 0.55)
    k.box(ch[0] - 0.3, ch[1] - 0.2, 0, ch[0] + 0.3, ch[1] + 0.2, 0.32, ('#6a3a1e', 0.15), 'chest', bevel=0.015)
    k.box(ch[0] - 0.3, ch[1] - 0.25, 0.32, ch[0] + 0.3, ch[1] - 0.2, 0.68, ('#6a3a1e', 0.15), 'chest_lid', bevel=0.015)
    k.box(ch[0] - 0.26, ch[1] - 0.16, 0.3, ch[0] + 0.26, ch[1] + 0.16, 0.36, GOLD, 'chest_gold', emit=(GOLD_D, 0.25))
    for x in (ch[0] - 0.2, ch[0] + 0.16):
        k.box(x, ch[1] - 0.21, 0, x + 0.05, ch[1] + 0.21, 0.33, IRON, 'chest_band')
    k.point_light(cx - 0.3, cr + 0.9, 1.6, '#ffd890', 9, radius=0.4)


def egg_nest(k, cx, cr):
    """Dark twig nest cradling a softly glowing egg."""
    for i in range(22):
        a = k.rng.uniform(0, 2 * math.pi)
        d = k.rng.uniform(0.22, 0.36)
        x0, r0 = cx + math.cos(a) * d, cr + math.sin(a) * d * 0.85
        b = a + math.pi / 2 + k.rng.uniform(-0.5, 0.5)
        L = k.rng.uniform(0.2, 0.36)
        z = k.rng.uniform(0.02, 0.16)
        k.tube((x0 - math.cos(b) * L / 2, r0 - math.sin(b) * L / 2, z), (x0 + math.cos(b) * L / 2, r0 + math.sin(b) * L / 2, z + 0.03),
               0.018, (shade('#3a2618', k.rng.uniform(0.8, 1.2)), 0.1), 'twig', verts=5)
    k.blob(cx, cr, 0.32, 0.19, 0.19, 0.27, '#8a3a2a', 'egg', emit=('#c05030', 0.55), segs=16)
    for _ in range(6):
        a = k.rng.uniform(-1.2, 1.2)
        zz = k.rng.uniform(0.18, 0.5)
        k.blob(cx + math.sin(a) * 0.16, cr + math.cos(a) * 0.16, zz, 0.025, 0.01, 0.025, '#e8a060', 'egg_spot',
               emit=('#ff9040', 0.9), segs=6)
    k.point_light(cx, cr + 0.35, 0.4, '#ff8040', 7, radius=0.15, group='flicker')
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def _chain(k, pts, r0, r1, col, part, verts=12):
    """Tapering tube through points (x, r, z), with spheres at the joints."""
    n = len(pts) - 1
    for i in range(n):
        ra = r0 + (r1 - r0) * i / n
        rb = r0 + (r1 - r0) * (i + 1) / n
        k.tube(pts[i], pts[i + 1], ra, col, part, rb=rb, verts=verts)
        k.sphere(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], rb, rb, col, part, segs=verts)


def dragon(k, cx, cr, z0=0.5):
    """The red dragon resting on its ledge, facing the cave: head down on its
    forepaws at the lip, wings half-raised either side, tail curled round
    to the right. One eye open. (cx, cr) is the middle of its back."""
    sc = (SCALE, 0.16)
    sd = (SCALE_D, 0.12)
    # body, haunches, spine
    k.blob(cx, cr, z0 + 0.45, 0.72, 1.0, 0.5, sc, 'dragon', segs=24)
    for s in (-1, 1):
        k.blob(cx + s * 0.6, cr - 0.55, z0 + 0.32, 0.36, 0.42, 0.34, sc, 'dragon_leg', segs=14)
        k.blob(cx + s * 0.75, cr - 0.2, z0 + 0.06, 0.16, 0.24, 0.07, sd, 'dragon_foot', segs=10)
    for i in range(8):
        t = i / 7
        r = cr - 0.9 + t * 1.6
        z = z0 + 0.9 + 0.08 * math.sin(t * math.pi)
        k.cone(cx, r, z, z + 0.22 - 0.1 * abs(t - 0.4), 0.075, 0.005, SCALE_D, 'dragon_spine', verts=5)
    # tail: from the rump round the right side, tip by the head
    tail = [(cx, cr - 0.95, z0 + 0.35), (cx + 0.75, cr - 1.25, z0 + 0.25), (cx + 1.45, cr - 0.85, z0 + 0.2),
            (cx + 1.6, cr + 0.05, z0 + 0.16), (cx + 1.35, cr + 0.95, z0 + 0.13), (cx + 0.8, cr + 1.45, z0 + 0.11)]
    _chain(k, tail, 0.3, 0.07, sc, 'dragon_tail')
    tip = tail[-1]
    k.poly([(tip[0] - 0.05, tip[1] + 0.02, tip[2] + 0.02), (tip[0] - 0.3, tip[1] - 0.1, tip[2]),
            (tip[0] - 0.42, tip[1] + 0.12, tip[2] + 0.01), (tip[0] - 0.25, tip[1] + 0.25, tip[2] + 0.02)], SCALE_D, 'dragon_spine')
    for i in range(1, 5):
        p = tail[i]
        k.cone(p[0], p[1], p[2] + 0.2 - 0.03 * i, p[2] + 0.33 - 0.04 * i, 0.05, 0.004, SCALE_D, 'dragon_spine', verts=5)
    # wings, half raised: bones + membrane panels fanned from the shoulder
    for s in (-1, 1):
        S_ = (cx + s * 0.38, cr + 0.05, z0 + 0.85)
        E = (cx + s * 1.05, cr - 0.25, z0 + 1.75)
        W = (cx + s * 1.5, cr - 0.45, z0 + 2.15)
        F = [(cx + s * 2.2, cr - 0.3, z0 + 1.45), (cx + s * 2.05, cr + 0.05, z0 + 0.85), (cx + s * 1.45, cr + 0.3, z0 + 0.6)]
        mem = ('#7a1e16', 0.1)
        k.poly([S_, E, W], mem, 'dragon_wing')
        prev = W
        for f in F:
            mid = ((prev[0] + f[0]) / 2 - s * 0.08, (prev[1] + f[1]) / 2 + 0.02, (prev[2] + f[2]) / 2 - 0.12)
            k.poly([S_, prev, mid, f], mem, 'dragon_wing')
            prev = f
        k.poly([S_, prev, (cx + s * 0.55, cr + 0.4, z0 + 0.7)], mem, 'dragon_wing')
        k.tube(S_, E, 0.07, sc, 'dragon_wingbone', rb=0.055, verts=8)
        k.tube(E, W, 0.055, sc, 'dragon_wingbone', rb=0.04, verts=8)
        k.cone(W[0], W[1], W[2], W[2] + 0.18, 0.04, 0.003, '#e8dcc0', 'claw', verts=5)
        for f in F:
            k.tube(W, f, 0.032, SCALE_D, 'dragon_wingbone', rb=0.012, verts=6)
    # neck down to the head resting on its forepaws at the lip
    neck = [(cx, cr + 0.7, z0 + 0.62), (cx, cr + 1.1, z0 + 0.55), (cx, cr + 1.42, z0 + 0.42)]
    _chain(k, neck, 0.36, 0.27, sc, 'dragon_neck')
    for s in (-1, 1):   # forelegs reaching forward, paws at the lip
        k.tube((cx + s * 0.5, cr + 0.6, z0 + 0.35), (cx + s * 0.42, cr + 1.65, z0 + 0.1), 0.15, sc, 'dragon_leg', rb=0.11, verts=10)
        k.blob(cx + s * 0.42, cr + 1.75, z0 + 0.07, 0.17, 0.2, 0.08, sd, 'dragon_foot', segs=10)
        for i in range(3):
            fx = cx + s * 0.42 + (i - 1) * 0.08
            k.tube((fx, cr + 1.86, z0 + 0.06), (fx, cr + 2.0, z0 + 0.0), 0.024, '#e8dcc0', 'claw', rb=0.004, verts=5)
    hx, hr, hz = cx, cr + 1.7, z0 + 0.36
    k.blob(hx, hr, hz, 0.33, 0.3, 0.24, sc, 'dragon_head', segs=16)
    k.blob(hx, hr + 0.38, hz - 0.06, 0.22, 0.28, 0.15, sc, 'dragon_head', segs=14)            # snout
    k.blob(hx, hr + 0.3, hz - 0.16, 0.2, 0.3, 0.06, (BELLY, 0.1), 'dragon_jaw', segs=12)
    for s in (-1, 1):
        k.sphere(hx + s * 0.07, hr + 0.62, hz - 0.01, 0.03, 0.025, '#1a0806', 'nostril', segs=6)
        k.blob(hx + s * 0.17, hr - 0.02, hz + 0.18, 0.1, 0.16, 0.06, sd, 'dragon_brow', segs=8)
        k.tube((hx + s * 0.17, hr - 0.1, hz + 0.2), (hx + s * 0.4, hr - 0.6, hz + 0.55), 0.06, '#e8d8b8', 'horn', rb=0.006, verts=8)
        k.tube((hx + s * 0.28, hr + 0.05, hz + 0.05), (hx + s * 0.52, hr - 0.15, hz + 0.12), 0.035, '#e8d8b8', 'horn', rb=0.004, verts=6)
        for i in range(3):   # jaw frills
            k.cone(hx + s * (0.24 + i * 0.05), hr + 0.15 - i * 0.12, hz - 0.08, hz + 0.1, 0.035, 0.003, SCALE_D, 'dragon_spine', verts=4)
    # eyes: the left one open, glowing; the right one shut
    k.blob(hx - 0.15, hr + 0.18, hz + 0.16, 0.075, 0.04, 0.035, '#ffd030', 'dragon_eye', emit=('#ffb000', 1.2), segs=8)
    k.box(hx - 0.158, hr + 0.2, hz + 0.13, hx - 0.142, hr + 0.24, hz + 0.2, '#1a0804', 'pupil')
    k.box(hx + 0.08, hr + 0.18, hz + 0.15, hx + 0.22, hr + 0.22, hz + 0.17, SCALE_D, 'eyelid')
    k.point_light(hx - 0.15, hr + 0.5, hz + 0.25, '#ffb030', 2, radius=0.05)
    k.point_light(hx, hr + 0.9, hz, '#ff6020', 3, radius=0.1, group='flicker')   # ember breath
