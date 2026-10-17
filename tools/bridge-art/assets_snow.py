"""Hoarfell builders for scenekit (bpy): snow, log chalets, the chairlift,
the frozen pond, the climbing routes' feet. Tile units: x = column,
r = row (toward the camera), z = height. Buildings face the camera.
"""
import math

from scenekit import shade
import assets_town as W

SNOW = '#e8eef6'
SNOW_SH = '#c4d0e2'
PACKED = '#b4c0d6'
ICE = '#9ccce4'
ICE_D = '#5a8aac'
LOG = '#7a4a2a'
LOG_D = '#4e2e18'
LOG_L = '#9a6438'
ROOF_SNOW = '#f2f5fa'
PINE = '#1f3c32'
IRON = '#2e3038'
RED = '#b83a2e'


def snowfield(k, x0, r0, x1, r1, drifts=0.0):
    """The ground: one sheet of snow (drifts: low mounds per tile, off by default — they read as stones)."""
    k.box(x0, r0, -0.1, x1, r1, 0.0, (SNOW, 0.1), 'snow')
    for _ in range(int((x1 - x0) * (r1 - r0) * drifts)):
        x, r = k.rng.uniform(x0 + 0.5, x1 - 0.5), k.rng.uniform(r0 + 0.5, r1 - 0.5)
        k.blob(x, r, -0.02, k.rng.uniform(0.35, 0.8), k.rng.uniform(0.25, 0.5), k.rng.uniform(0.06, 0.1),
               (shade(SNOW, k.rng.uniform(0.97, 1.02)), 0.3), 'drift', segs=10)


def trodden(k, x0, r0, x1, r1, z=0.006, prints=0.5):
    """A path stamped flat into the snow, boot prints and sled tracks."""
    k.box(x0, r0, -0.02, x1, r1, z, (PACKED, 0.12), 'path')
    for _ in range(int((x1 - x0) * (r1 - r0) * prints)):
        x, r = k.rng.uniform(x0 + 0.1, x1 - 0.1), k.rng.uniform(r0 + 0.1, r1 - 0.1)
        k.cyl(x, r, z - 0.004, z + 0.002, 0.05, (SNOW_SH, 0.2), 'print', verts=6, ry=0.08)


def snow_pine(k, cx, cr, h=2.6, tone=PINE):
    """A fir in deep snow: ragged dark tiers, each with snow lying on top."""
    k.cyl(cx, cr, 0, h * 0.25, 0.07, (LOG_D, 0.12), 'trunk', verts=6)
    W.pine_tiers(k, cx, cr, h, tone, rad=0.64, z0=0.15, tiers=5, snow=ROOF_SNOW)
    k.cyl(cx, cr, 0.0, 0.03, 0.55, (SNOW_SH, 0.2), 'tree_well', verts=12)


def icicles(k, xa, xb, r, z, every=0.22):
    x = xa + 0.08
    while x < xb - 0.05:
        L = k.rng.uniform(0.08, 0.26)
        k.cone(x, r, z - L, z, 0.004, 0.028, (ICE, 0.1), 'icicle', verts=5)
        x += every * k.rng.uniform(0.7, 1.3)


def chalet(k, x0, x1, r_back, r_front, wall_h=2.0, rise=1.5, wall=LOG, door_x=None, windows=(), windows_up=(),
           chimney=None, balcony=False, lanterns=()):
    """A log chalet: stone footing, log courses, glowing windows with snowy
    sills, a steep snow-laden roof with icicles. Returns (ridge row, ridge z)."""
    k.box(x0, r_back, 0, x1, r_front, 0.3, ('#6a6e78', 0.16), 'footing', bevel=0.02)
    k.box(x0 + 0.04, r_back + 0.04, 0.3, x1 - 0.04, r_front - 0.02, wall_h, (wall, 0.1), 'chalet_wall')
    z, i = 0.36, 0
    while z < wall_h - 0.05:                                   # log courses on the facade
        k.cyl_x(x0 - 0.06, x1 + 0.06, r_front - 0.02, z, 0.075, 0.075, (shade(wall, 0.92 if i % 2 else 1.05), 0.12), 'log', verts=8)
        z += 0.15
        i += 1
    for xe in (x0 - 0.04, x1 - 0.12):                          # corner posts
        k.box(xe, r_front - 0.1, 0.3, xe + 0.16, r_front + 0.06, wall_h, (LOG_D, 0.1), 'corner')
    if door_x is not None:
        W.door(k, door_x, r_front + 0.04, col=LOG_D)
        k.box(door_x - 0.5, r_front, 0, door_x + 0.5, r_front + 0.45, 0.12, ('#8a8e98', 0.15), 'step')
    for (wx, wz) in windows:
        W.window(k, wx, r_front + 0.06, wz, shutters='#7a2a22', flowers=None)
        k.box(wx - 0.38, r_front + 0.04, wz - 0.06, wx + 0.38, r_front + 0.2, wz - 0.01, (ROOF_SNOW, 0.2), 'sill_snow')
    for (wx, wz) in windows_up:
        W.window(k, wx, r_front + 0.06, wz, w=0.45, h=0.5, shutters='#7a2a22')
    if balcony:
        bz = wall_h * 0.56
        k.box(x0 + 0.2, r_front, bz, x1 - 0.2, r_front + 0.5, bz + 0.08, (LOG_D, 0.1), 'balcony')
        x = x0 + 0.25
        while x < x1 - 0.2:
            k.box(x, r_front + 0.44, bz + 0.08, x + 0.05, r_front + 0.5, bz + 0.5, (LOG_L, 0.1), 'baluster')
            x += 0.18
        k.box(x0 + 0.2, r_front + 0.42, bz + 0.5, x1 - 0.2, r_front + 0.52, bz + 0.56, (LOG_D, 0.1), 'rail')
        k.box(x0 + 0.2, r_front + 0.42, bz + 0.56, x1 - 0.2, r_front + 0.52, bz + 0.62, (ROOF_SNOW, 0.2), 'rail_snow')
    rm, zr = W._gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, ROOF_SNOW, over=0.35, strips=7)
    icicles(k, x0 - 0.3, x1 + 0.3, r_front + 0.36, wall_h - 0.14)
    if chimney:
        cx = chimney
        k.box(cx - 0.2, rm - 0.35, wall_h, cx + 0.2, rm + 0.05, zr + 0.55, ('#5a5a64', 0.16), 'chimney', bevel=0.02)
        k.box(cx - 0.25, rm - 0.4, zr + 0.55, cx + 0.25, rm + 0.1, zr + 0.68, (ROOF_SNOW, 0.12), 'chimney_snow')
    for lx in lanterns:
        W.wall_lantern(k, lx, r_front + 0.04)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


def lift_station(k, cx, cr):
    """The chairlift's bottom terminal: a deck, a roof on posts, the big
    bullwheel the cable turns round, the motor house behind."""
    k.box(cx - 1.4, cr - 1.0, 0, cx + 1.4, cr + 0.9, 0.25, ('#7a7e88', 0.15), 'lift_deck', bevel=0.02)
    k.box(cx - 1.3, cr - 2.2, 0, cx + 1.3, cr - 1.0, 1.5, (LOG, 0.1), 'motor_house')
    k.box(cx - 1.4, cr - 2.3, 1.5, cx + 1.4, cr - 0.9, 1.62, (ROOF_SNOW, 0.15), 'motor_roof')
    for (dx, dr) in ((-1.25, -0.9), (1.25, -0.9), (-1.25, 0.75), (1.25, 0.75)):
        k.box(cx + dx - 0.07, cr + dr - 0.07, 0.25, cx + dx + 0.07, cr + dr + 0.07, 2.35, (RED, 0.12), 'lift_post')
    k.box(cx - 1.55, cr - 1.05, 2.35, cx + 1.55, cr + 0.95, 2.45, (RED, 0.12), 'lift_roof_frame')
    k.box(cx - 1.6, cr - 1.1, 2.45, cx + 1.6, cr + 1.0, 2.6, (ROOF_SNOW, 0.15), 'lift_roof')
    icicles(k, cx - 1.6, cx + 1.6, cr + 1.0, 2.43)
    k.cyl(cx, cr - 0.05, 1.82, 1.95, 1.0, (IRON, 0.1), 'bullwheel', verts=24)
    k.cyl(cx, cr - 0.05, 1.95, 2.35, 0.12, (IRON, 0.1), 'bullwheel_axle', verts=8)
    k.box(cx - 1.0, cr + 0.6, 0.25, cx + 1.0, cr + 0.68, 0.32, ('#e0c040', 0.1), 'load_line')
    k.solid(cx - 1.4, cr - 2.2, cx + 1.4, cr - 0.6)
    return [(cx - 1.0, cr - 0.05, 1.95), (cx + 1.0, cr - 0.05, 1.95)]


def pylon(k, cx, cr, h, z0=0.0, arm=1.1):
    """A lift tower: a steel column, a crossarm with sheave wheels for each line."""
    k.cyl(cx, cr, z0, z0 + 0.15, 0.22, ('#6a6e78', 0.15), 'pylon_foot', verts=8)
    k.cyl(cx, cr, z0, z0 + h, 0.08, (IRON, 0.12), 'pylon', verts=8)
    k.box(cx - arm, cr - 0.06, z0 + h - 0.05, cx + arm, cr + 0.06, z0 + h + 0.06, (IRON, 0.12), 'pylon_arm')
    for s in (-1, 1):
        k.cyl_y(cx + s * (arm - 0.1), cr - 0.1, cr + 0.1, z0 + h - 0.1, 0.09, 0.09, ('#8a8e98', 0.1), 'sheave', verts=10)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
    return [(cx - arm + 0.1, cr, z0 + h - 0.02), (cx + arm - 0.1, cr, z0 + h - 0.02)]


def cable(k, pts):
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.016, (IRON, 0.1), 'cable', verts=4)


def ski_rack(k, x0, x1, cr, cols=('#c83a2e', '#2a6ac0', '#e0b030', '#2a9a5a', '#e8e8f0', '#a040c0')):
    k.box(x0, cr - 0.05, 0.7, x1, cr + 0.05, 0.78, (LOG_D, 0.1), 'rack_bar')
    for x in (x0 + 0.05, x1 - 0.1):
        k.box(x, cr - 0.05, 0, x + 0.06, cr + 0.05, 0.78, (LOG_D, 0.1), 'rack_leg')
    x, i = x0 + 0.15, 0
    while x < x1 - 0.12:
        c = cols[i % len(cols)]
        k.tube((x, cr + 0.18, 0.0), (x + 0.04, cr - 0.02, 1.25), 0.03, (c, 0.1), 'ski', verts=4)
        k.tube((x + 0.09, cr + 0.18, 0.0), (x + 0.13, cr - 0.02, 1.25), 0.03, (c, 0.1), 'ski', verts=4)
        x += 0.32
        i += 1
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def snowman(k, cx, cr, scarf=RED):
    for (z, rr) in ((0.32, 0.34), (0.82, 0.25), (1.18, 0.18)):
        k.sphere(cx, cr, z, rr, rr, (SNOW, 0.25), 'snowman', segs=14)
    for dx in (-0.06, 0.06):
        k.sphere(cx + dx, cr + 0.16, 1.24, 0.025, 0.025, '#141418', 'coal', segs=5)
    k.tube((cx, cr + 0.16, 1.18), (cx + 0.02, cr + 0.38, 1.16), 0.035, ('#f08020', 0.1), 'carrot', rb=0.004, verts=6)
    k.cyl(cx, cr, 0.98, 1.06, 0.2, (scarf, 0.12), 'scarf', verts=12)
    k.box(cx + 0.12, cr + 0.12, 0.7, cx + 0.2, cr + 0.2, 1.0, (scarf, 0.12), 'scarf_end')
    k.cyl(cx, cr, 1.32, 1.34, 0.18, '#1a1a20', 'hat_brim', verts=12)
    k.cyl(cx, cr, 1.34, 1.56, 0.12, '#1a1a20', 'hat', verts=12)
    for s in (-1, 1):
        k.tube((cx + s * 0.2, cr, 0.86), (cx + s * 0.55, cr + 0.05, 1.12), 0.02, (LOG_D, 0.1), 'arm', verts=4)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def sled(k, cx, cr, col=RED):
    for s in (-1, 1):
        k.tube((cx - 0.45, cr + s * 0.18, 0.04), (cx + 0.4, cr + s * 0.18, 0.04), 0.02, (IRON, 0.1), 'runner', verts=4)
        k.tube((cx + 0.4, cr + s * 0.18, 0.04), (cx + 0.5, cr + s * 0.18, 0.18), 0.02, (IRON, 0.1), 'runner', verts=4)
    k.box(cx - 0.4, cr - 0.24, 0.12, cx + 0.38, cr + 0.24, 0.17, (col, 0.12), 'sled')


def ice_pond(k, cx, cr, rx, ry):
    """A frozen pond: pale glassy ice, cracks, a snow bank round it."""
    k.cyl(cx, cr, -0.02, 0.012, rx, (ICE, 0.05), 'ice', verts=40, ry=ry)
    for _ in range(9):
        a = k.rng.uniform(0, math.tau)
        d0, d1 = k.rng.uniform(0.1, 0.5), k.rng.uniform(0.55, 0.9)
        k.tube((cx + math.cos(a) * rx * d0, cr + math.sin(a) * ry * d0, 0.014),
               (cx + math.cos(a + 0.2) * rx * d1, cr + math.sin(a + 0.2) * ry * d1, 0.014), 0.008, (ICE_D, 0.1), 'crack', verts=4)
    for i in range(44):                                          # a low lip of snow round the edge
        a = i * math.tau / 44
        k.blob(cx + math.cos(a) * (rx + 0.06), cr + math.sin(a) * (ry + 0.05), -0.01, 0.26, 0.16, 0.05,
               (SNOW, 0.1), 'bank', segs=8)


def fishing_hole(k, cx, cr):
    """Somebody's ice-fishing hole: dark water in a cut circle, a stool, a bucket."""
    k.cyl(cx, cr, -0.02, 0.016, 0.2, ('#10283a', 0.05), 'hole', verts=14)
    k.cyl(cx + 0.45, cr + 0.15, 0, 0.32, 0.12, (LOG, 0.1), 'stool', verts=8)
    k.cyl(cx - 0.4, cr + 0.2, 0, 0.22, 0.1, ('#8a8e98', 0.1), 'bucket', verts=8)


def route_foot(k, cx, cr, top, slope, col, label_col='#e8e0c8'):
    """Where a climbing route leaves the ground: a cairn, a plaque on a post,
    and the route's fixed line running up the face to the top."""
    for (dx, dr, s) in ((-0.5, 0.3, 0.16), (-0.42, 0.28, 0.12), (-0.47, 0.3, 0.08)):
        k.rock(cx + dx, cr + dr, 0.1 + (0.16 - s), s, s, s * 0.8, ('#5a5e6a', 0.2), part='cairn', segs=6)
    k.box(cx + 0.45, cr + 0.25, 0, cx + 0.5, cr + 0.3, 0.9, (LOG_D, 0.1), 'plaque_post')
    k.box(cx + 0.3, cr + 0.3, 0.6, cx + 0.65, cr + 0.33, 0.85, (col, 0.1), 'plaque')
    pts = [(cx, cr - 0.05, 0.05)]
    n = 8
    for i in range(1, n + 1):
        t = i / n
        pts.append((cx + 0.08 * math.sin(i * 1.3), cr - 0.05 - slope * t, top * t + 0.05))
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.018, (col, 0.1), 'fixed_line', verts=4)
    for p in pts[1::2]:
        k.sphere(p[0], p[1] + 0.03, p[2], 0.04, 0.04, ('#c0c4cc', 0.1), 'bolt', segs=5)


def icefall(k, cx, r_top, r_foot, top):
    """A frozen waterfall poured down the cliff: stacked lumps of blue ice."""
    n = 14
    for i in range(n):
        t = i / (n - 1)
        r = r_foot + (r_top - r_foot) * t
        z = top * t
        w = 0.55 + 0.25 * math.sin(i * 1.7)
        k.blob(cx + 0.12 * math.sin(i * 2.1), r + 0.1, z, w, 0.3, 0.38, (shade(ICE, 0.95 + 0.1 * (i % 2)), 0.06), 'icefall', segs=10)
    k.blob(cx, r_foot + 0.3, 0.05, 1.0, 0.55, 0.22, (ICE, 0.06), 'ice_pool', segs=12)


def summit_flag(k, cx, cr, z0, h=1.6, col=RED):
    k.cyl(cx, cr, z0, z0 + h, 0.03, ('#c0c4cc', 0.1), 'flagpole', verts=6)
    k.poly([(cx, cr, z0 + h - 0.05), (cx + 0.6, cr + 0.05, z0 + h - 0.2), (cx, cr, z0 + h - 0.45)], (col, 0.1), 'flag')


def cocoa_hut(k, x0, x1, r0, r1):
    """A kiosk: counter, a lean-to roof heavy with snow, a steaming kettle, mugs."""
    k.box(x0, r0, 0, x1, r1, 1.0, (LOG, 0.1), 'kiosk')
    k.box(x0 - 0.05, r1 - 0.05, 1.0, x1 + 0.05, r1 + 0.25, 1.08, (LOG_L, 0.1), 'counter')
    for x in (x0 + 0.05, x1 - 0.12):
        k.box(x, r1 + 0.05, 1.0, x + 0.07, r1 + 0.12, 2.0, (LOG_D, 0.1), 'kiosk_post')
    k.poly([(x0 - 0.25, r1 + 0.5, 1.95), (x1 + 0.25, r1 + 0.5, 1.95), (x1 + 0.25, r0 - 0.1, 2.35), (x0 - 0.25, r0 - 0.1, 2.35)],
           (ROOF_SNOW, 0.15), 'kiosk_roof')
    icicles(k, x0 - 0.2, x1 + 0.2, r1 + 0.5, 1.93)
    k.cyl(x0 + 0.4, r1 + 0.05, 1.08, 1.28, 0.12, ('#3a3a42', 0.1), 'kettle', verts=10)
    for i, c in enumerate(('#c83a2e', '#e8e4dc', '#2a6ac0', '#c83a2e')):
        k.cyl(x0 + 0.8 + i * 0.25, r1 + 0.12, 1.08, 1.18, 0.05, (c, 0.1), 'mug', verts=8)
    k.box(x0 + 0.1, r1 - 0.02, 1.25, x1 - 0.1, r1 + 0.02, 1.7, ('#f0e4c8', 0.1), 'menu_board')
    k.solid(x0, r0, x1, r1)


def signpost(k, cx, cr, cols=('#c83a2e', '#2a6ac0', '#e0b030')):
    k.cyl(cx, cr, 0, 1.6, 0.05, (LOG_D, 0.1), 'signpost', verts=6)
    for i, c in enumerate(cols):
        z = 1.35 - i * 0.28
        s = 1 if i % 2 == 0 else -1
        k.box(cx + (0.0 if s > 0 else -0.6), cr + 0.04, z, cx + (0.6 if s > 0 else 0.0), cr + 0.08, z + 0.18, (c, 0.1), 'sign_arm')
    k.cyl(cx, cr, 1.6, 1.68, 0.09, (ROOF_SNOW, 0.1), 'post_snow', verts=8)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def woodpile(k, x0, x1, cr):
    z = 0.0
    for j in range(3):
        x = x0 + (0.08 if j % 2 else 0.0)
        while x < x1 - 0.12:
            k.cyl_y(x + 0.08, cr - 0.25, cr + 0.25, z + 0.09, 0.09, 0.09, (shade(LOG_L, k.rng.uniform(0.85, 1.1)), 0.12), 'log_end', verts=7)
            x += 0.18
        z += 0.17
    k.box(x0 - 0.05, cr - 0.28, z, x1 + 0.05, cr + 0.28, z + 0.06, (ROOF_SNOW, 0.15), 'pile_snow')
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


# ---- the pistes (scenes/hoarfell_piste.py) -------------------------------------------------------------------
RUN_COL = {'green': '#2a9a5a', 'blue': '#2a6ac0', 'black': '#1e1e26'}


def piste_pole(k, cx, cr, col, h=1.0):
    """An edge marker: a slim pole, the top third in the run's colour."""
    k.cyl(cx, cr, 0, h * 0.66, 0.035, ('#e8e4dc', 0.1), 'piste_pole', verts=6)
    k.cyl(cx, cr, h * 0.66, h, 0.04, (col, 0.1), 'piste_pole_top', verts=6)


def trail_marker(k, cx, cr, kind, h=1.5):
    """The run's sign on a post: a green circle, a blue square, a black diamond."""
    col = RUN_COL[kind]
    k.cyl(cx, cr, 0, h, 0.045, (LOG_D, 0.1), 'marker_post', verts=6)
    z = h - 0.22
    if kind == 'green':
        k.cyl_y(cx, cr + 0.04, cr + 0.1, z, 0.26, 0.26, (col, 0.1), 'marker', verts=16)
        k.cyl_y(cx, cr + 0.02, cr + 0.04, z, 0.31, 0.31, ('#f2f0ea', 0.1), 'marker_rim', verts=16)
    elif kind == 'blue':
        k.box(cx - 0.24, cr + 0.04, z - 0.24, cx + 0.24, cr + 0.1, z + 0.24, (col, 0.1), 'marker')
        k.box(cx - 0.29, cr + 0.02, z - 0.29, cx + 0.29, cr + 0.04, z + 0.29, ('#f2f0ea', 0.1), 'marker_rim')
    else:
        for (dx, s) in ((-0.17, 0.2), (0.17, 0.2)):
            k.poly([(cx + dx, cr + 0.1, z + s * 1.25), (cx + dx + s, cr + 0.1, z), (cx + dx, cr + 0.1, z - s * 1.25), (cx + dx - s, cr + 0.1, z)],
                   (col, 0.1), 'marker')
        k.box(cx - 0.44, cr + 0.02, z - 0.3, cx + 0.44, cr + 0.06, z + 0.3, ('#f2f0ea', 0.1), 'marker_rim')
    k.cyl(cx, cr, h, h + 0.06, 0.07, (ROOF_SNOW, 0.1), 'post_snow', verts=8)


def start_house(k, cx, r_front, kind, name):
    """A run's start: a little timber hut, the start wand between two posts in
    front of it, the run's name on a board over the gate."""
    col = RUN_COL[kind]
    x0, x1 = cx - 1.5, cx + 1.5
    rm, zr = chalet(k, x0, x1, r_front - 1.5, r_front, wall_h=1.5, rise=0.9, door_x=None,
                    windows=[(cx - 0.75, 0.75), (cx + 0.75, 0.75)])
    gr = r_front + 1.3                                       # the start line
    for s in (-1, 1):
        k.box(cx + s * 0.9 - 0.06, gr - 0.06, 0, cx + s * 0.9 + 0.06, gr + 0.06, 1.65, (col, 0.1), 'gate_post')
        k.box(cx + s * 0.9 - 0.1, gr - 0.1, 1.65, cx + s * 0.9 + 0.1, gr + 0.1, 1.72, (ROOF_SNOW, 0.1), 'gate_cap')
    k.box(cx - 0.84, gr - 0.02, 0.42, cx + 0.84, gr + 0.02, 0.46, ('#e8c040', 0.1), 'start_wand')
    k.box(cx - 1.0, gr - 0.03, 1.2, cx + 1.0, gr + 0.03, 1.6, (col, 0.1), 'start_board')
    import assets_signs as G
    G.letters(k, name, 'Righteous', cx, gr + 0.03, 1.27, size=0.22, col='#f4f0e6', lit=False)
    k.box(cx - 1.2, gr + 0.05, -0.01, cx + 1.2, gr + 0.25, 0.012, ('#d83a2e', 0.1), 'start_line')
    k.solid(cx + 0.7, gr - 0.3, cx + 1.1, gr + 0.3)
    k.solid(cx - 1.1, gr - 0.3, cx - 0.7, gr + 0.3)
    return gr


def net_fence(k, a, b, h=0.8, col='#ff7a2a'):
    """An orange safety net on poles."""
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    n = max(1, int(L / 1.2))
    for i in range(n + 1):
        t = i / n
        x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        k.cyl(x, r, 0, h + 0.08, 0.03, ('#3a3a42', 0.1), 'net_pole', verts=6)
    for z in (h * 0.35, h * 0.7, h):
        k.bar(a[0], a[1], b[0], b[1], z - 0.06, z, 0.03, (col, 0.15), 'net')
    k.bar(a[0], a[1], b[0], b[1], 0.05, h, 0.012, (shade(col, 0.8), 0.2), 'net_mesh')


def finish_arch(k, x0, x1, cr, h=2.6):
    """The finish: two padded towers, a red banner across with FINISH on it."""
    import assets_signs as G
    for x in (x0, x1):
        k.box(x - 0.35, cr - 0.35, 0, x + 0.35, cr + 0.35, h + 0.4, ('#d83a2e', 0.12), 'finish_tower', bevel=0.04)
        k.box(x - 0.4, cr - 0.4, h + 0.4, x + 0.4, cr + 0.4, h + 0.5, (ROOF_SNOW, 0.1), 'tower_snow')
        k.box(x - 0.3, cr + 0.35, 0.5, x + 0.3, cr + 0.37, 1.4, ('#f4f0e6', 0.1), 'tower_pad')
        k.solid(x - 0.4, cr - 0.4, x + 0.4, cr + 0.4)
    k.box(x0 + 0.35, cr - 0.04, h - 0.25, x1 - 0.35, cr + 0.04, h + 0.35, ('#c8302a', 0.12), 'finish_banner')
    x = x0 + 0.5
    i = 0
    while x < x1 - 0.5:                                     # chequered strip along the bottom of the banner
        k.box(x, cr + 0.04, h - 0.25, x + 0.2, cr + 0.06, h - 0.13, ('#f4f0e6' if i % 2 else '#1e1e26', 0.1), 'chequer')
        x += 0.2
        i += 1
    G.letters(k, 'FINISH', 'Righteous', (x0 + x1) / 2, cr + 0.04, h - 0.06, size=0.36, col='#f4f0e6', lit=False)
    k.box(x0, cr - 0.08, -0.01, x1, cr + 0.08, 0.012, ('#c8302a', 0.1), 'finish_line')


def piste_tree(k, cx, cr, h=2.6, tone=PINE):
    """A lighter fir for forests of hundreds: three snowy tiers."""
    k.cyl(cx, cr, 0, h * 0.25, 0.07, (LOG_D, 0.12), 'trunk', verts=6)
    with k.foliage('needle'):
        for i in range(3):
            z0 = h * (0.14 + i * 0.25)
            rad = 0.6 * (1 - i * 0.26) * k.rng.uniform(0.9, 1.1)
            k.cone(cx, cr, z0, z0 + h * 0.42, rad, 0.02, (shade(tone, 1 + i * 0.08), 0.18), 'pine', verts=9)
            k.cone(cx, cr, z0 + h * 0.17, z0 + h * 0.38, rad * 0.62, 0.04, (ROOF_SNOW, 0.2), 'pine_snow', verts=9)


def hanging_sign(k, x, r_face, z, icon, board='#5a3a1e', side=1):
    """A painted shop sign hung from an iron bracket off a wall: a board on two
    chains, its icon in paint on the face (`skis`, `axe` (ice axe and a coil of
    rope), `mug`, `bed`). The bracket juts out toward the camera from r_face."""
    r = r_face + 0.42
    k.bar(x, r_face, x, r + 0.04, z + 0.52, z + 0.57, 0.06, IRON, 'sign_bracket')
    k.tube((x, r_face, z + 0.3), (x, r_face + 0.3, z + 0.53), 0.018, IRON, 'sign_brace', verts=5)
    for dx in (-0.2, 0.2):
        k.cyl(x + dx, r, z + 0.42, z + 0.53, 0.012, IRON, 'sign_chain', verts=4)
    k.box(x - 0.3, r - 0.03, z, x + 0.3, r + 0.03, z + 0.42, ('#2a1808', 0.1), 'sign_frame')
    k.box(x - 0.26, r + 0.03, z + 0.04, x + 0.26, r + 0.035, z + 0.38, (board, 0.1), 'sign_board')
    f = r + 0.04
    if icon == 'skis':
        k.tube((x - 0.17, f, z + 0.08), (x + 0.15, f, z + 0.34), 0.025, (RED, 0.1), 'sign_paint', verts=4)
        k.tube((x + 0.17, f, z + 0.08), (x - 0.15, f, z + 0.34), 0.025, ('#2a6ac0', 0.1), 'sign_paint', verts=4)
        k.box(x - 0.02, f - 0.005, z + 0.06, x + 0.02, f + 0.005, z + 0.36, ('#e8e8f0', 0.1), 'sign_paint')
    elif icon == 'axe':
        k.tube((x - 0.12, f, z + 0.07), (x - 0.02, f, z + 0.34), 0.018, ('#c8a060', 0.1), 'sign_paint', verts=4)
        k.box(x - 0.13, f - 0.005, z + 0.31, x + 0.07, f + 0.005, z + 0.35, ('#c8ccd8', 0.1), 'sign_paint')
        for i in range(10):                                            # the coil of rope
            a = i * math.tau / 10
            k.box(x + 0.13 + math.cos(a) * 0.08 - 0.02, f - 0.005, z + 0.2 + math.sin(a) * 0.08 - 0.02,
                  x + 0.13 + math.cos(a) * 0.08 + 0.02, f + 0.005, z + 0.2 + math.sin(a) * 0.08 + 0.02, ('#e0b030', 0.1), 'sign_paint')
    elif icon == 'mug':
        k.box(x - 0.11, f - 0.005, z + 0.07, x + 0.07, f + 0.005, z + 0.25, ('#c83a2e', 0.1), 'sign_paint')
        k.box(x + 0.07, f - 0.005, z + 0.11, x + 0.13, f + 0.005, z + 0.21, ('#c83a2e', 0.1), 'sign_paint')
        k.box(x - 0.1, f - 0.004, z + 0.23, x + 0.06, f + 0.006, z + 0.25, ('#6a3a1a', 0.1), 'sign_paint')
        for (dx, dz) in ((-0.05, 0.29), (0.02, 0.32), (-0.02, 0.35)):
            k.box(x + dx, f - 0.005, z + dz, x + dx + 0.03, f + 0.005, z + dz + 0.03, ('#f4f0e8', 0.1), 'sign_paint')
    elif icon == 'bed':
        k.box(x - 0.18, f - 0.005, z + 0.1, x + 0.18, f + 0.005, z + 0.18, ('#e8e0c8', 0.1), 'sign_paint')
        k.box(x - 0.18, f - 0.005, z + 0.1, x - 0.14, f + 0.005, z + 0.3, ('#8a5a30', 0.1), 'sign_paint')
        k.box(x - 0.13, f - 0.005, z + 0.18, x - 0.04, f + 0.005, z + 0.24, ('#f4f0e8', 0.1), 'sign_paint')
        k.box(x - 0.04, f - 0.005, z + 0.18, x + 0.18, f + 0.005, z + 0.22, ('#3a6ac0', 0.1), 'sign_paint')
