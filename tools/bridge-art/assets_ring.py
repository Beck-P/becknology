"""Enigma's ring and crew quarters (scenekit, bpy): the curved corridor
round the station's ring, its windows onto the ringed giant, and the berths
the Wren's crew left behind. Tile units: x = column, r = row (toward the
camera), z = height.
"""
import math

from scenekit import shade
import assets_station as T

W = T.ST_WALL


def _arc(cx, cr, rad, a):
    return cx + math.cos(a) * rad, cr - math.sin(a) * rad


# ---- the ring corridor ------------------------------------------------------------------------------
def ring_floor(k, cx, cr, r_in, r_out, a0, a1, n=64, tones=T.ST_FLOOR):
    """Deck plates laid round an arc (centre (cx, cr) below the map, angles
    a0..a1 from the +x axis, counter-clockwise, rows running down), a lit
    guide strip down the middle."""
    for i in range(n):
        t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        p = [_arc(cx, cr, r_in, t0), _arc(cx, cr, r_out, t0), _arc(cx, cr, r_out, t1), _arc(cx, cr, r_in, t1)]
        col = (shade(tones[i % 2], k.rng.uniform(0.92, 1.06)), 0.1)
        k.poly([(p[0][0], p[0][1], 0.0), (p[1][0], p[1][1], 0.0), (p[2][0], p[2][1], 0.0), (p[3][0], p[3][1], 0.0)], col, 'floor')
        k.bar(p[0][0], p[0][1], p[1][0], p[1][1], 0.0, 0.004, 0.025, '#0c1218', 'floor_seam')
    mid = (r_in + r_out) / 2
    m = n * 2
    for i in range(m):
        if i % 2:
            continue
        t0, t1 = a0 + (a1 - a0) * i / m, a0 + (a1 - a0) * (i + 0.7) / m
        p, q = _arc(cx, cr, mid, t0), _arc(cx, cr, mid, t1)
        k.bar(p[0], p[1], q[0], q[1], 0.0, 0.006, 0.05, '#0c2a30', 'guide', emit=(T.TEAL, 0.55))


def ring_outer_wall(k, cx, cr, rad, a0, a1, height, windows=(), doors=(), n=48):
    """The outer wall, facing in (toward the camera along the arc): panels
    between ribs; windows = [(ta, tb)] angle spans cut as HOLDOUT; doors =
    [(ta, tb)] spans left open (frames built by door_frame_arc)."""
    def inside(t, spans):
        return any(min(a, b) <= t <= max(a, b) for a, b in spans)
    for i in range(n):
        t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        tm = (t0 + t1) / 2
        p, q = _arc(cx, cr, rad, t0), _arc(cx, cr, rad, t1)
        po, qo = _arc(cx, cr, rad + 0.45, t0), _arc(cx, cr, rad + 0.45, t1)
        if inside(tm, doors):
            k.bar(p[0], p[1], q[0], q[1], 2.3, height, 0.45, (W[1], 0.06), 'lintel')
            continue
        if inside(tm, windows):
            k.bar(p[0], p[1], q[0], q[1], 0.0, 0.85, 0.45, (W[1], 0.06), 'wall')
            k.bar(p[0], p[1], q[0], q[1], 2.35, height, 0.45, (W[1], 0.06), 'wall')
            k.bar(p[0], p[1], q[0], q[1], 0.85, 2.35, 0.05, 'HOLDOUT', 'viewport')
            k.bar(p[0], p[1], q[0], q[1], 0.75, 0.86, 0.6, (W[0], 0.05), 'sill')
        else:
            k.bar(p[0], p[1], q[0], q[1], 0.0, height, 0.45, (W[1], 0.06), 'wall')
            k.bar(p[0], p[1], q[0], q[1], 0.3, height - 0.35, 0.48, (W[2], 0.06), 'wall_panel')
        k.bar(po[0], po[1], qo[0], qo[1], height, height + 0.05, 0.9, W[0], 'wall_cap')
        if i % 4 == 0:           # ribs
            k.bar(p[0], p[1], p[0] + (q[0] - p[0]) * 0.12, p[1] + (q[1] - p[1]) * 0.12, 0.0, height, 0.55, (W[3], 0.06), 'rib')
    # a strip light along the top of the wall, half of it dead
    for i in range(n):
        if i % 3 == 1:
            continue
        t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 0.8) / n
        p, q = _arc(cx, cr, rad - 0.24, t0), _arc(cx, cr, rad - 0.24, t1)
        k.bar(p[0], p[1], q[0], q[1], height - 0.3, height - 0.26, 0.03, '#0c2a30', 'strip',
              emit=(T.TEAL, 0.8 if i % 7 else 0.0))


def ring_inner_wall(k, cx, cr, rad, a0, a1, h=0.38, gaps=(), n=48):
    """The low (cut-away) wall on the hub side, with gaps for doors."""
    for i in range(n):
        t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        if any(min(a, b) <= (t0 + t1) / 2 <= max(a, b) for a, b in gaps):
            continue
        p, q = _arc(cx, cr, rad - 0.3, t0), _arc(cx, cr, rad - 0.3, t1)
        k.bar(p[0], p[1], q[0], q[1], 0.0, h, 0.6, (W[1], 0.06), 'inner_wall')
        k.bar(p[0], p[1], q[0], q[1], h, h + 0.05, 0.62, W[0], 'wall_cap')
        k.bar(p[0], p[1], q[0], q[1], h - 0.07, h - 0.04, 0.63, '#103038', 'inner_led', emit=(T.TEAL, 0.5))


def bulkhead(k, x, r0, r1, height, sealed=True):
    """A sealed pressure door across the corridor: yellow-black chevrons, a
    red light, NO ATMOSPHERE stencilled across it (as stripes)."""
    k.box(x - 0.2, r0, 0, x + 0.2, r1, height, (W[2], 0.06), 'bulkhead')
    k.box(x + 0.2, r0 + 0.2, 0.2, x + 0.24, r1 - 0.2, height - 0.3, (W[3], 0.06), 'bulkhead_door')
    rr = r0 + 0.3
    while rr < r1 - 0.4:
        k.bar(x + 0.245, rr, x + 0.245, rr + 0.18, 0.3, 0.6, 0.006, T.WARN_Y, 'chevron')
        rr += 0.35
    k.box(x + 0.24, (r0 + r1) / 2 - 0.1, height - 0.6, x + 0.27, (r0 + r1) / 2 + 0.1, height - 0.45, '#200808', 'bulkhead_light',
          emit=(T.WARN_R, 1.0))
    k.point_light(x + 0.8, (r0 + r1) / 2, height - 0.5, T.WARN_R, 12, radius=0.1, group='flicker')


def door_frame_arc(k, cx, cr, rad, ta, tb, height, col=T.LED_G):
    """A lit frame round an opening in the outer wall (crew quarters)."""
    for t in (ta, tb):
        p = _arc(cx, cr, rad, t)
        k.box(p[0] - 0.12, p[1] - 0.2, 0, p[0] + 0.12, p[1] + 0.25, 2.4, (W[3], 0.06), 'door_post')
        k.box(p[0] - 0.04, p[1] + 0.25, 1.3, p[0] + 0.04, p[1] + 0.27, 1.6, '#082010', 'door_led', emit=(col, 0.9))
    p, q = _arc(cx, cr, rad - 0.2, ta), _arc(cx, cr, rad - 0.2, tb)
    k.bar(p[0], p[1], q[0], q[1], -0.01, 0.02, 0.5, '#1e2830', 'threshold')
    k.bar(p[0], p[1], q[0], q[1], 0.0, 2.3, 0.04, '#081014', 'door_dark')


def window_bench(k, x0, r0, x1, r1):
    k.bar(x0, r0, x1, r1, 0.38, 0.46, 0.45, ('#3a4a58', 0.06), 'bench_seat')
    for t in (0.1, 0.9):
        x, r = x0 + (x1 - x0) * t, r0 + (r1 - r0) * t
        k.box(x - 0.05, r - 0.15, 0, x + 0.05, r + 0.15, 0.38, '#1a2530', 'bench_leg')
    k.solid(min(x0, x1), min(r0, r1) - 0.2, max(x0, x1), max(r0, r1) + 0.2)


def notice_board(k, cx, cr, ang, z0=1.0):
    """A cork board on the outer wall at angle `ang` (tangent), papers on it."""
    dx, dr = math.cos(ang) * 0.45, -math.sin(ang) * 0.45
    k.bar(cx - dx, cr - dr, cx + dx, cr + dr, z0, z0 + 0.7, 0.04, ('#8a6a40', 0.12), 'cork')
    for i in range(5):
        t = -0.8 + i * 0.4
        k.bar(cx + dx * t - dx * 0.15, cr + dr * t - dr * 0.15 + 0.03, cx + dx * t + dx * 0.15, cr + dr * t + dr * 0.15 + 0.03,
              z0 + 0.12 + (i % 2) * 0.25, z0 + 0.4 + (i % 2) * 0.25, 0.01, ('#e8e4d8', 0.05), 'paper')


def maintenance_cart(k, cx, cr):
    k.box(cx - 0.4, cr - 0.25, 0.15, cx + 0.4, cr + 0.25, 0.55, ('#c8a020', 0.08), 'cart')
    for dx in (-0.3, 0.3):
        for dr in (-0.18, 0.18):
            k.cyl(cx + dx, cr + dr, 0.0, 0.12, 0.06, '#1a1a1a', 'wheel', verts=8)
    k.box(cx - 0.35, cr - 0.2, 0.55, cx - 0.05, cr + 0.1, 0.75, '#3a4a58', 'toolbox')
    k.cyl(cx + 0.2, cr, 0.55, 0.9, 0.08, '#4a5a68', 'canister', verts=10)
    k.solid(cx - 0.4, cr - 0.25, cx + 0.4, cr + 0.25)


def dead_plant(k, cx, cr):
    k.cyl(cx, cr, 0, 0.4, 0.2, ('#3a4a58', 0.08), 'planter', verts=12)
    for i in range(6):
        a = i * 1.05
        k.tube((cx, cr, 0.4), (cx + math.cos(a) * 0.25, cr + math.sin(a) * 0.15, 0.75 + (i % 2) * 0.15), 0.012, '#5a4a2a',
               'dead_stem', verts=4)
    k.solid(cx - 0.22, cr - 0.22, cx + 0.22, cr + 0.22)


# ---- crew quarters -----------------------------------------------------------------------------------
def berth(k, x0, r_face, name_col='#e8c040', blanket='#3a5a7a', keepsake=None, made=True):
    """A berth against the back wall: a bunk along x, a reading light, a
    shelf with a name plate and something of theirs on it, a locker."""
    k.box(x0, r_face, 0, x0 + 2.1, r_face + 0.85, 0.42, (W[2], 0.06), 'bunk_frame')
    k.box(x0 + 0.05, r_face + 0.05, 0.42, x0 + 2.05, r_face + 0.8, 0.55, ('#c8c8d0', 0.1), 'mattress')
    if made:
        k.box(x0 + 0.5, r_face + 0.04, 0.55, x0 + 2.06, r_face + 0.81, 0.6, (blanket, 0.12), 'blanket')
    else:
        k.blob(x0 + 1.3, r_face + 0.45, 0.6, 0.55, 0.3, 0.08, (blanket, 0.15), 'blanket', segs=10)
    k.box(x0 + 0.1, r_face + 0.15, 0.55, x0 + 0.5, r_face + 0.7, 0.66, ('#e8e8f0', 0.08), 'pillow', bevel=0.03)
    k.box(x0, r_face, 1.05, x0 + 2.1, r_face + 0.3, 1.1, (W[3], 0.06), 'berth_shelf')
    k.box(x0 + 0.85, r_face + 0.3, 1.0, x0 + 1.25, r_face + 0.31, 1.06, '#101010', 'name_plate', emit=(name_col, 0.7))
    k.box(x0 + 0.05, r_face, 1.6, x0 + 0.25, r_face + 0.2, 1.7, '#2a3a48', 'reading_light')
    k.box(x0 + 0.07, r_face + 0.18, 1.58, x0 + 0.23, r_face + 0.2, 1.6, '#1a1408', 'reading_light_glow', emit=('#ffd890', 0.9))
    # the locker
    k.box(x0 + 2.2, r_face, 0, x0 + 2.9, r_face + 0.6, 1.9, (W[2], 0.06), 'locker', bevel=0.01)
    for z in (0.3, 1.0, 1.7):
        k.box(x0 + 2.3, r_face + 0.6, z, x0 + 2.8, r_face + 0.61, z + 0.04, W[0], 'locker_vent')
    k.box(x0 + 2.75, r_face + 0.6, 0.9, x0 + 2.79, r_face + 0.63, 1.05, '#8a8a94', 'locker_handle')
    if keepsake:
        keepsake(k, x0 + 1.6, r_face + 0.16, 1.1)
    k.solid(x0, r_face, x0 + 2.9, r_face + 0.85)


def harmonica(k, x, r, z):
    k.box(x - 0.12, r - 0.03, z, x + 0.12, r + 0.03, z + 0.05, '#c8c8d0', 'harmonica')
    k.box(x - 0.11, r + 0.03, z + 0.015, x + 0.11, r + 0.035, z + 0.035, '#2a2a2a', 'harmonica_holes')


def cards(k, x, r, z):
    for i in range(4):
        k.box(x - 0.07 + i * 0.03, r - 0.05, z + i * 0.004, x + 0.03 + i * 0.03, r + 0.05, z + 0.004 + i * 0.004, '#e8e4d8', 'card')
    k.box(x + 0.08, r - 0.05, z, x + 0.18, r + 0.05, z + 0.01, '#c02020', 'card_back')


def pressed_flower(k, x, r, z):
    k.box(x - 0.1, r - 0.02, z, x + 0.1, r + 0.02, z + 0.24, '#8a6a40', 'frame')
    k.box(x - 0.08, r + 0.02, z + 0.02, x + 0.08, r + 0.025, z + 0.22, '#e8e0d0', 'frame_card')
    k.sphere(x, r + 0.03, z + 0.15, 0.035, 0.035, '#c060a0', 'flower', emit=('#60f0c0', 0.4), segs=6)
    k.tube((x, r + 0.03, z + 0.04), (x, r + 0.03, z + 0.13), 0.005, '#3a7a4a', 'stem', verts=3)


def unfinished_letter(k, x, r, z):
    k.box(x - 0.12, r - 0.08, z, x + 0.12, r + 0.08, z + 0.004, '#f0ece0', 'letter')
    for i in range(4):
        k.box(x - 0.1, r - 0.06 + i * 0.03, z + 0.004, x + 0.1 - (0.08 if i == 3 else 0), r - 0.05 + i * 0.03, z + 0.006, '#2a2a3a',
              'ink')
    k.tube((x + 0.05, r + 0.06, z + 0.01), (x + 0.18, r - 0.02, z + 0.01), 0.008, '#2a4a8a', 'pen', verts=4)


def childs_drawing(k, x, r, z):
    k.box(x - 0.13, r - 0.02, z, x + 0.13, r + 0.0, z + 0.2, '#f0ece0', 'drawing')
    k.box(x - 0.08, r + 0.0, z + 0.06, x + 0.06, r + 0.005, z + 0.1, '#e07020', 'crayon_ship')
    k.box(x - 0.1, r + 0.0, z + 0.14, x + 0.1, r + 0.005, z + 0.16, '#3060e0', 'crayon_sky')
    k.box(x + 0.06, r + 0.0, z + 0.04, x + 0.1, r + 0.005, z + 0.12, '#e0c020', 'crayon_star')


def mess_table(k, cx, cr, w=2.4, d=1.2):
    x0, x1, r0, r1 = cx - w / 2, cx + w / 2, cr - d / 2, cr + d / 2
    k.box(x0, r0, 0.72, x1, r1, 0.78, (W[3], 0.06), 'table_top', bevel=0.01)
    k.box(cx - 0.15, cr - 0.15, 0, cx + 0.15, cr + 0.15, 0.72, W[1], 'table_post')
    k.box(cx - 0.6, cr - 0.4, 0, cx + 0.6, cr + 0.4, 0.04, W[1], 'table_foot')
    for i, (dx, dr) in enumerate(((-0.8, -0.3), (-0.2, -0.35), (0.5, -0.25), (-0.6, 0.3), (0.2, 0.32), (0.85, 0.2))):
        k.cyl(cx + dx, cr + dr, 0.78, 0.88, 0.045, '#e8e4d8', 'mug', verts=8)
    for i in range(7):
        k.box(cx - 0.3 + i * 0.09, cr - 0.05 + (i % 3) * 0.04, 0.78, cx - 0.22 + i * 0.09, cr + 0.06 + (i % 3) * 0.04, 0.785,
              '#e8e4d8' if i % 2 else '#c02020', 'card')
    k.solid(x0, r0, x1, r1)


def crew_chair(k, cx, cr, facing='down', toppled=False):
    if toppled:
        k.box(cx - 0.25, cr - 0.45, 0, cx + 0.25, cr + 0.25, 0.08, ('#3a4a58', 0.06), 'chair_seat')
        k.box(cx - 0.25, cr + 0.25, 0, cx + 0.25, cr + 0.32, 0.5, ('#3a4a58', 0.06), 'chair_back')
        k.solid(cx - 0.25, cr - 0.45, cx + 0.25, cr + 0.3)
        return
    k.box(cx - 0.22, cr - 0.22, 0.42, cx + 0.22, cr + 0.22, 0.48, ('#3a4a58', 0.06), 'chair_seat')
    for dx in (-0.18, 0.15):
        for dr in (-0.18, 0.15):
            k.box(cx + dx, cr + dr, 0, cx + dx + 0.03, cr + dr + 0.03, 0.42, '#1a2530', 'chair_leg')
    br = cr - 0.22 if facing == 'down' else cr + 0.18
    k.box(cx - 0.22, br, 0.48, cx + 0.22, br + 0.05, 0.95, ('#3a4a58', 0.06), 'chair_back')
    k.solid(cx - 0.22, cr - 0.22, cx + 0.22, cr + 0.22)


def galley(k, x0, x1, r0, r1, h=0.9):
    """A galley counter along the east wall: kettle, ration packs, a sink."""
    k.box(x0, r0, 0, x1, r1, h, (W[2], 0.06), 'galley')
    k.box(x0 - 0.03, r0, h, x1 + 0.02, r1, h + 0.05, (W[3], 0.06), 'galley_top')
    k.box(x0 + 0.1, r0 + 0.3, h + 0.05, x1 - 0.1, r0 + 0.9, h + 0.051, '#101820', 'sink')
    k.cyl((x0 + x1) / 2, r1 - 0.5, h + 0.05, h + 0.3, 0.1, '#c8c8d0', 'kettle', verts=10)
    for i in range(3):
        k.box(x0 + 0.1, r0 + 1.1 + i * 0.25, h + 0.05, x1 - 0.1, r0 + 1.3 + i * 0.25, h + 0.15, '#6a7a4a', 'ration_pack')
    k.solid(x0, r0, x1, r1)


def shower(k, x0, x1, r0, r1, h=2.1):
    k.box(x0, r0, 0, x0 + 0.08, r1, h, (W[2], 0.06), 'shower_wall')
    k.box(x0, r0, 0, x1, r0 + 0.08, h, (W[2], 0.06), 'shower_wall')
    k.box(x0, r1 - 0.06, 0.1, x1 - 0.3, r1, h - 0.1, ('#8aa8b8', 0.05), 'shower_door')
    k.box(x0 + 0.08, r0 + 0.08, -0.01, x1, r1, 0.01, '#1a2a38', 'shower_tray')
    k.solid(x0, r0, x1, r1)


def crew_photo(k, cx, r_face, z0, w=0.7, h=0.45):
    k.box(cx - w / 2 - 0.04, r_face, z0 - 0.04, cx + w / 2 + 0.04, r_face + 0.03, z0 + h + 0.04, '#2a2a30', 'photo_frame')
    k.box(cx - w / 2, r_face + 0.03, z0, cx + w / 2, r_face + 0.035, z0 + h, '#5a7a9a', 'photo')
    for i in range(5):
        x = cx - w / 2 + 0.1 + i * (w - 0.2) / 4
        k.box(x - 0.04, r_face + 0.035, z0 + 0.08, x + 0.04, r_face + 0.04, z0 + 0.25, '#e07020', 'photo_suit')
        k.box(x - 0.025, r_face + 0.035, z0 + 0.25, x + 0.025, r_face + 0.04, z0 + 0.31, '#d8a07a', 'photo_face')
